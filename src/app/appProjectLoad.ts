import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
} from '../guidedPresets/discGuidedWorkflow.ts'
import type { ActiveDiscPresetState } from '../presets/discPresetTargetedApplication.ts'
import {
  syncProjectJewelCaseBrandingMarkSlots,
} from '../caseInsert/brandingMarkSlots.ts'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import {
  captureNormalizedProjectSnapshot,
  type DeepReadonly,
  type NormalizedPersistableProject,
} from '../lifecycle/canonicalProject.ts'
import type { ProjectSessionEditorRoute } from '../lifecycle/projectSession.ts'
import {
  normalizeSavedCaseInsertProject,
  restoreCaseInsertProjectState,
} from '../project/caseInsertProjectAdapters.ts'
import {
  parseSavedProjectContents,
  ProjectSchemaError,
} from '../project/projectSchema.ts'
import { resolveSavedProjectType } from '../project/projectRouting.ts'
import type {
  SavedCaseInsertProject,
  SavedDiscProject,
} from '../project/projectTypes.ts'
import type {
  RestoredCaseInsertProjectState,
} from '../project/projectCaseInsert.ts'
import {
  restoreSavedProjectState,
  type RestoredProjectState,
} from '../project/restoreProjectState.ts'
import {
  reconstructActiveDiscPresetState,
} from './appRegisteredDiscPresetApplication.ts'
import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'

type DialogFilter = Readonly<{
  name: string
  extensions: readonly string[]
}>

export type OpenProjectDialog = (options: Readonly<{
  filters?: readonly DialogFilter[]
  multiple?: boolean
}>) => Promise<string | string[] | null>

export type ReadProjectFileCommand = (path: string) => Promise<string>

export type StagedDiscProjectOpenCandidate = Readonly<{
  projectType: 'disc'
  selectedPath: string
  normalizedProject: NormalizedPersistableProject
  editorRoute: Readonly<{ workspace: 'disc' }>
  restoredProject: DeepReadonly<RestoredProjectState>
  activeDiscPresetState: DeepReadonly<ActiveDiscPresetState> | null
  successMessage: string
}>

export type StagedCaseInsertProjectOpenCandidate = Readonly<{
  projectType: 'caseInsert'
  selectedPath: string
  normalizedProject: NormalizedPersistableProject
  editorRoute: Extract<ProjectSessionEditorRoute, { workspace: 'caseInsert' }>
  restoredProject: DeepReadonly<RestoredCaseInsertProjectState>
  activeDiscPresetState: null
  successMessage: string
}>

export type StagedProjectOpenCandidate =
  | StagedDiscProjectOpenCandidate
  | StagedCaseInsertProjectOpenCandidate

export type StageAppProjectOpenParams = Readonly<{
  openDialog: OpenProjectDialog
  readProjectFileCommand: ReadProjectFileCommand
  defaultSteamBannerLockupImageUrl?: string | null
  resolveBackgroundImageSize?: (
    imageDataUrl: string,
  ) => Promise<RestoredProjectState['backgroundImageSize']>
  caseInsertBrandingSources: CaseInsertBrandingSourceCatalog
}>

const PROJECT_FILE_FILTERS = Object.freeze([
  Object.freeze({
    name: 'Steam Backup Label Studio Project',
    extensions: Object.freeze(['json']),
  }),
] as const satisfies readonly DialogFilter[])

class ProjectOpenBackgroundImageResolutionError extends Error {
  override readonly cause: unknown

  constructor(cause: unknown) {
    super('Disc background image inspection failed during Open staging.')
    this.name = 'ProjectOpenBackgroundImageResolutionError'
    this.cause = cause
  }
}

function deepFreeze<Value>(value: Value): Value {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested)
  }

  return Object.freeze(value)
}

function captureCandidate(
  candidate: StagedProjectOpenCandidate,
): StagedProjectOpenCandidate {
  return deepFreeze(structuredClone(candidate))
}

function failure(
  code: string,
  userMessage: string,
  cause: unknown,
): ApplicationCommandResult<never> {
  return commandFailed({
    code,
    userMessage,
    diagnosticMessage: cause instanceof Error ? cause.message : String(cause),
    cause,
    recoverable: true,
  })
}

function schemaFailure(error: ProjectSchemaError): ApplicationCommandResult<never> {
  if (error.message.includes('not valid JSON')) {
    return failure(
      'project.parse-failed',
      'The selected file is not valid project JSON.',
      error,
    )
  }

  if (error.message.includes('migration') || error.message.includes('schema version')) {
    return failure(
      'project.migration-failed',
      'The selected project version could not be opened.',
      error,
    )
  }

  return failure(
    'project.validation-failed',
    'The selected file is not a valid Steam Backup Label Studio project.',
    error,
  )
}

function routeForCaseInsertProject(
  project: SavedCaseInsertProject,
): Extract<ProjectSessionEditorRoute, { workspace: 'caseInsert' }> {
  return Object.freeze({
    workspace: 'caseInsert',
    surface: project.editor?.activeCaseInsertTemplatePane === 'tray'
      ? 'back'
      : 'front',
  })
}

async function stageDiscProject(
  selectedPath: string,
  project: SavedDiscProject,
  params: StageAppProjectOpenParams,
): Promise<ApplicationCommandResult<StagedProjectOpenCandidate>> {
  const normalizedProject = captureNormalizedProjectSnapshot(project)
  let restoredProject: RestoredProjectState

  try {
    restoredProject = await restoreSavedProjectState(project, {
      defaultSteamBannerLockupImageUrl:
        params.defaultSteamBannerLockupImageUrl ?? null,
      rejectBackgroundImageSizeFailure: true,
      ...(params.resolveBackgroundImageSize
        ? {
            resolveBackgroundImageSize: async (imageDataUrl: string) => {
              try {
                return await params.resolveBackgroundImageSize!(imageDataUrl)
              } catch (error) {
                throw new ProjectOpenBackgroundImageResolutionError(error)
              }
            },
          }
        : {}),
    })
  } catch (error) {
    if (error instanceof ProjectOpenBackgroundImageResolutionError) {
      return failure(
        'project.background-image-resolution-failed',
        'The project background image could not be inspected.',
        error.cause,
      )
    }
    return failure(
      'project.disc-restore-failed',
      'The Disc project could not be restored.',
      error,
    )
  }

  let activeDiscPresetState: ActiveDiscPresetState | null
  try {
    activeDiscPresetState = reconstructActiveDiscPresetState({
      workflow: restoredProject.discGuidedWorkflow,
      currentState: {
        background: {
          enabled: restoredProject.isBackgroundArtworkEnabled,
          scale: restoredProject.backgroundScale,
          offset: restoredProject.backgroundOffset,
          imageDataUrl: restoredProject.backgroundImageUrl,
          imageSource: restoredProject.backgroundImageSource,
          imageSize: restoredProject.backgroundImageSize,
        },
        titleArtwork: restoredProject.projectTitleArtwork,
        discTextSettings: restoredProject.discTextSettings,
        discTextValues: restoredProject.discTextValues,
        discTextValueSources: restoredProject.discTextValueSources,
        discTextTitleValue: restoredProject.discTextTitleValue,
        discTextHtmlSources: restoredProject.discTextHtmlSources,
        discTextLayout: restoredProject.discTextLayout,
        discTextStyles: restoredProject.discTextStyles,
        logoAssets: restoredProject.projectLogoAssets,
        ratingBadge: restoredProject.projectRatingBadge,
        mediaMark: restoredProject.projectMediaMark,
        platformMarks: restoredProject.projectPlatformMarks,
        metadata: restoredProject.projectMetadata,
      },
      selectedDiscTemplate: restoredProject.template.selectedDiscTemplate,
    })
  } catch (error) {
    return failure(
      'project.disc-restore-failed',
      'The Disc project could not be restored.',
      error,
    )
  }

  if (
    restoredProject.discGuidedWorkflow.activeLayout &&
    !activeDiscPresetState
  ) {
    restoredProject = {
      ...restoredProject,
      discGuidedWorkflow: INITIAL_DISC_GUIDED_WORKFLOW_STATE,
    }
  }

  try {
    return commandSucceeded(captureCandidate({
      projectType: 'disc',
      selectedPath,
      normalizedProject,
      editorRoute: Object.freeze({ workspace: 'disc' }),
      restoredProject,
      activeDiscPresetState,
      successMessage: restoredProject.backgroundImageUrl
        ? 'Loaded project layout, game metadata, embedded background image, and template geometry.'
        : 'Loaded project layout, game metadata, and template geometry. No embedded background image was found.',
    }))
  } catch (error) {
    return failure(
      'project.staging-capture-failed',
      'The Disc project could not be prepared for opening.',
      error,
    )
  }
}

function stageCaseInsertProject(
  selectedPath: string,
  project: SavedCaseInsertProject,
  params: StageAppProjectOpenParams,
): ApplicationCommandResult<StagedProjectOpenCandidate> {
  try {
    const normalizedProject = normalizeSavedCaseInsertProject(project)
    const restoredProject = restoreCaseInsertProjectState(normalizedProject)
    const caseInsert = syncProjectJewelCaseBrandingMarkSlots(
      restoredProject.caseInsert,
      {
        ...params.caseInsertBrandingSources,
        projectMetadata: restoredProject.projectMetadata,
      },
    )
    const acceptedProject = captureNormalizedProjectSnapshot({
      ...normalizedProject,
      caseInsert,
    })

    return commandSucceeded(captureCandidate({
      projectType: 'caseInsert',
      selectedPath,
      normalizedProject: acceptedProject,
      editorRoute: routeForCaseInsertProject(normalizedProject),
      restoredProject: {
        ...restoredProject,
        caseInsert,
      },
      activeDiscPresetState: null,
      successMessage:
        'Loaded case insert project template, metadata, and preview geometry.',
    }))
  } catch (error) {
    return failure(
      'project.case-restore-failed',
      'The Case Insert project could not be restored.',
      error,
    )
  }
}

/**
 * Performs every dialog, persistence, schema, normalization, restoration, and
 * derived-state step without changing lifecycle or live editor state.
 */
export async function stageAppProjectOpen(
  params: StageAppProjectOpenParams,
): Promise<ApplicationCommandResult<StagedProjectOpenCandidate>> {
  let selected: string | string[] | null

  try {
    selected = await params.openDialog({
      multiple: false,
      filters: PROJECT_FILE_FILTERS,
    })
  } catch (error) {
    return failure(
      'dialog.project-file-failed',
      'The project-file chooser could not be opened.',
      error,
    )
  }

  if (selected === null) {
    return Object.freeze({
      status: 'cancelled',
      reason: 'file-dialog-dismissed',
    })
  }

  if (Array.isArray(selected) || typeof selected !== 'string' || !selected) {
    return failure(
      'dialog.project-file-invalid-selection',
      'The project-file chooser returned an invalid selection.',
      selected,
    )
  }

  let contents: string
  try {
    contents = await params.readProjectFileCommand(selected)
  } catch (error) {
    return failure(
      'project.read-failed',
      'The selected project file could not be read.',
      error,
    )
  }

  let project: SavedDiscProject | SavedCaseInsertProject
  try {
    project = parseSavedProjectContents(contents)
  } catch (error) {
    return error instanceof ProjectSchemaError
      ? schemaFailure(error)
      : failure(
          'project.validation-failed',
          'The selected file is not a valid Steam Backup Label Studio project.',
          error,
        )
  }

  let projectType: 'disc' | 'caseInsert'
  try {
    projectType = resolveSavedProjectType(project)
  } catch (error) {
    return failure(
      'project.route-failed',
      'The selected project editor could not be determined.',
      error,
    )
  }

  return projectType === 'caseInsert'
    ? stageCaseInsertProject(
        selected,
        project as SavedCaseInsertProject,
        params,
      )
    : stageDiscProject(selected, project as SavedDiscProject, params)
}
