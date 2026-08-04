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
  getNormalizedProjectKind,
  type DeepReadonly,
  type NormalizedPersistableProject,
} from '../lifecycle/canonicalProject.ts'
import type { ProjectSessionEditorRoute } from '../lifecycle/projectSession.ts'
import type { ProjectPersistenceFormat } from '../lifecycle/projectSession.ts'
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
import {
  prepareCaseInsertPresetProjectRecovery,
  type PreparedCaseInsertPresetProjectRecovery,
} from '../project/caseInsertPresetProjectPersistence.ts'
import {
  CASE_INSERT_PRESET_CATALOG,
  type CaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
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
import {
  createProjectFileCommandFailure,
  isProjectFileCommandFailure,
  type ProjectFileCommandFailure,
} from '../tauri/projectFileFailure.ts'
import {
  createProjectPackageCommandFailure,
  isProjectPackageCommandFailure,
  type ProjectPackageCommandFailure,
} from '../tauri/packageProjectFile.ts'
import {
  isProjectFormatRecognitionFailure,
  type ProjectFormatRecognitionFailure,
  type ProjectRecognizedFileFormat,
} from '../tauri/projectFileFormat.ts'

type DialogFilter = Readonly<{
  name: string
  extensions: readonly string[]
}>

export type OpenProjectDialog = (options: Readonly<{
  filters?: readonly DialogFilter[]
  multiple?: boolean
}>) => Promise<string | string[] | null>

export type ReadProjectFileCommand = (path: string) => Promise<string>
export type RecognizeProjectFileFormatCommand =
  (path: string) => Promise<ProjectRecognizedFileFormat>

export type StagedDiscProjectOpenCandidate = Readonly<{
  projectType: 'disc'
  selectedPath: string
  persistenceFormat: ProjectPersistenceFormat
  normalizedProject: NormalizedPersistableProject
  editorRoute: Readonly<{ workspace: 'disc' }>
  restoredProject: DeepReadonly<RestoredProjectState>
  activeDiscPresetState: DeepReadonly<ActiveDiscPresetState> | null
  successMessage: string
}>

export type StagedCaseInsertProjectOpenCandidate = Readonly<{
  projectType: 'caseInsert'
  selectedPath: string
  persistenceFormat: ProjectPersistenceFormat
  normalizedProject: NormalizedPersistableProject
  editorRoute: Extract<ProjectSessionEditorRoute, { workspace: 'caseInsert' }>
  restoredProject: DeepReadonly<RestoredCaseInsertProjectState>
  activeDiscPresetState: null
  caseInsertPresetRecovery: PreparedCaseInsertPresetProjectRecovery
  successMessage: string
}>

export type StagedProjectOpenCandidate =
  | StagedDiscProjectOpenCandidate
  | StagedCaseInsertProjectOpenCandidate

export type ProjectOpenRestorationDependencies = Readonly<{
  defaultSteamBannerLockupImageUrl?: string | null
  resolveBackgroundImageSize?: (
    imageDataUrl: string,
  ) => Promise<RestoredProjectState['backgroundImageSize']>
  caseInsertBrandingSources: CaseInsertBrandingSourceCatalog
  caseInsertPresetCatalog?: CaseInsertPresetCatalog
}>

export type StageAppProjectOpenParams = ProjectOpenRestorationDependencies &
  Readonly<{
    openDialog: OpenProjectDialog
    readProjectFileCommand: ReadProjectFileCommand
    recognizeProjectFileFormatCommand: RecognizeProjectFileFormatCommand
    decodeProjectPackageFileCommand: DecodeProjectPackageFileCommand
  }>

export type DecodeProjectPackageFileCommand =
  (path: string) => Promise<Uint8Array>

export type StageProjectPackageOpenParams =
  ProjectOpenRestorationDependencies & Readonly<{
    selectedPath: string
    decodeProjectPackageFileCommand: DecodeProjectPackageFileCommand
  }>

export type StageProjectOpenContentsParams =
  ProjectOpenRestorationDependencies & Readonly<{
    selectedPath: string
    contents: string
    persistenceFormat: ProjectPersistenceFormat
  }>

const PROJECT_FILE_FILTERS = Object.freeze([
  Object.freeze({
    name: 'Steam Backup Label Studio Project',
    extensions: Object.freeze(['sbls', 'json']),
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

function structuredReadFailure(
  error: ProjectFileCommandFailure | ProjectPackageCommandFailure |
    ProjectFormatRecognitionFailure,
): ApplicationCommandResult<never> {
  const stage = isProjectPackageCommandFailure(error)
    ? ` at ${error.cause.stage}`
    : ''
  return commandFailed({
    code: error.code,
    userMessage: error.message,
    diagnosticMessage: `${error.code}${stage}`,
    cause: error.cause,
    recoverable: error.recoverable,
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
  params: StageProjectOpenContentsParams,
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
      persistenceFormat: params.persistenceFormat,
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
  params: StageProjectOpenContentsParams,
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
    if (getNormalizedProjectKind(acceptedProject) !== 'caseInsert') {
      throw new Error('Normalized Case project kind was not retained.')
    }
    const recovery = prepareCaseInsertPresetProjectRecovery({
      persistedState: project.caseInsertLayoutPreset,
      project: acceptedProject as Extract<
        typeof acceptedProject,
        Readonly<{ projectType: 'caseInsert' }>
      >,
      catalog: params.caseInsertPresetCatalog ?? CASE_INSERT_PRESET_CATALOG,
    })
    if (!recovery.ok) {
      throw new Error(`Case preset recovery failed: ${recovery.code}.`)
    }

    return commandSucceeded(captureCandidate({
      projectType: 'caseInsert',
      selectedPath,
      persistenceFormat: params.persistenceFormat,
      normalizedProject: acceptedProject,
      editorRoute: routeForCaseInsertProject(normalizedProject),
      restoredProject: {
        ...restoredProject,
        caseInsert,
      },
      activeDiscPresetState: null,
      caseInsertPresetRecovery: recovery.recovery,
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
 * Runs the one shared parse, migrate, normalize, route, restore, and immutable
 * candidate-capture path after a transport has produced project JSON text.
 */
export async function stageProjectOpenContents(
  params: StageProjectOpenContentsParams,
): Promise<ApplicationCommandResult<StagedProjectOpenCandidate>> {
  let project: SavedDiscProject | SavedCaseInsertProject
  try {
    project = parseSavedProjectContents(params.contents)
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
        params.selectedPath,
        project as SavedCaseInsertProject,
        params,
      )
    : stageDiscProject(
        params.selectedPath,
        project as SavedDiscProject,
        params,
      )
}

/**
 * `.sbls` package staging entry. It owns no dialog, lifecycle state,
 * replacement guard, or live editor mutation. Production Open calls it only
 * after the native recognition boundary identifies package content.
 */
export async function stageProjectPackageOpen(
  params: StageProjectPackageOpenParams,
): Promise<ApplicationCommandResult<StagedProjectOpenCandidate>> {
  let hydratedBytes: Uint8Array
  try {
    hydratedBytes = await params.decodeProjectPackageFileCommand(
      params.selectedPath,
    )
    if (!(hydratedBytes instanceof Uint8Array)) {
      throw createProjectFileCommandFailure(
        'project.read-failed',
        'raw-response-required',
        'project-package-stage-response',
      )
    }
  } catch (error) {
    const structured = isProjectFileCommandFailure(error) ||
      isProjectPackageCommandFailure(error)
      ? error
      : createProjectFileCommandFailure(
          'project.read-failed',
          'transport-rejection-invalid',
          'project-package-stage-decode',
        )
    return structuredReadFailure(structured)
  }

  let contents: string
  try {
    contents = new TextDecoder('utf-8', { fatal: true }).decode(hydratedBytes)
  } catch {
    return structuredReadFailure(createProjectPackageCommandFailure(
      'project.package.hydrated-json-invalid',
      'binding-hydration',
    ))
  }

  return stageProjectOpenContents({
    ...params,
    contents,
    persistenceFormat: 'sbls-package-v1',
  })
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

  let recognizedFormat: ProjectRecognizedFileFormat
  try {
    recognizedFormat = await params.recognizeProjectFileFormatCommand(selected)
  } catch (error) {
    const structured = isProjectFileCommandFailure(error) ||
      isProjectFormatRecognitionFailure(error)
      ? error
      : createProjectFileCommandFailure(
          'project.read-failed',
          'transport-rejection-invalid',
          'project-format-recognition-stage',
        )
    return structuredReadFailure(structured)
  }

  if (recognizedFormat === 'sbls-package-v1') {
    return stageProjectPackageOpen({
      ...params,
      selectedPath: selected,
    })
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

  return stageProjectOpenContents({
    ...params,
    selectedPath: selected,
    contents: contents.startsWith('\uFEFF') ? contents.slice(1) : contents,
    persistenceFormat: 'legacy-json',
  })
}
