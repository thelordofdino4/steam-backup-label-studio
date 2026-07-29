import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ApplicationLifecycleCommandContext,
  SaveProjectAsCommandOwner,
  SaveProjectCommandOwner,
} from '../lifecycle/applicationLifecycleCommandPorts.ts'
import {
  adoptSavedProjectBaseline,
  canSaveProjectSessionDirectly,
  hasEligibleSblsPath,
} from '../lifecycle/projectSession.ts'
import {
  captureNormalizedProjectSnapshot,
  getNormalizedProjectKind,
} from '../lifecycle/canonicalProject.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import {
  createProjectPackageCapturePlan,
} from '../package/projectPackageCapturePlan.ts'
import {
  createProjectPackageDestinationFailure,
  isProjectPackageDestinationFailure,
  type ProjectPackageWritePort,
} from '../tauri/projectPackageWrite.ts'
import { isProjectFileCommandFailure } from '../tauri/projectFileFailure.ts'
import { isProjectPackageCommandFailure } from '../tauri/packageProjectFile.ts'

type DialogFilter = Readonly<{
  name: string
  extensions: readonly string[]
}>

export type ProjectPackageSaveDialog = (options: Readonly<{
  defaultPath: string
  filters: readonly DialogFilter[]
}>) => Promise<string | null>

export type ApplicationProjectSaveRuntimeDependencies = Readonly<{
  captureCurrentProject(): SavedProject
  saveDialog: ProjectPackageSaveDialog
  packageWrite: ProjectPackageWritePort
}>

type GetRuntimeDependencies =
  () => ApplicationProjectSaveRuntimeDependencies | null

const PACKAGE_FILTERS = Object.freeze([
  Object.freeze({
    name: 'Steam Backup Label Studio Package',
    extensions: Object.freeze(['sbls']),
  }),
] as const)

export function getDefaultPackageFileName(kind: 'disc' | 'caseInsert'): string {
  return kind === 'caseInsert'
    ? 'steam-backup-case-insert.sbls'
    : 'steam-backup-label.sbls'
}

export type ProjectSaveRoute = 'direct-package-save' | 'save-as'

export function selectProjectSaveRoute(
  session: Parameters<typeof canSaveProjectSessionDirectly>[0],
): ProjectSaveRoute {
  return canSaveProjectSessionDirectly(session)
    ? 'direct-package-save'
    : 'save-as'
}

function cancelled(): ApplicationCommandResult<void> {
  return Object.freeze({ status: 'cancelled', reason: 'file-dialog-dismissed' })
}

function failure(
  code: string,
  userMessage: string,
  diagnosticMessage: string,
  cause?: unknown,
): ApplicationCommandResult<never> {
  return commandFailed({
    code,
    userMessage,
    diagnosticMessage,
    cause,
    recoverable: true,
  }, {
    kind: 'error',
    message: userMessage,
    deduplicationKey: `project.save:${code}`,
  })
}

function writeFailure(error: unknown): ApplicationCommandResult<never> {
  if (isProjectFileCommandFailure(error) ||
    isProjectPackageCommandFailure(error) ||
    isProjectPackageDestinationFailure(error)) {
    return failure(
      error.code,
      error.message,
      `The package write boundary returned ${error.code}.`,
      error,
    )
  }
  return failure(
    'project.write-failed',
    'The project file could not be written.',
    'The package write boundary returned an invalid or unexpected rejection.',
  )
}

async function runSave(
  context: ApplicationLifecycleCommandContext,
  dependencies: ApplicationProjectSaveRuntimeDependencies,
  forceSaveAs: boolean,
): Promise<ApplicationCommandResult<void>> {
  const initial = context.stateSnapshot
  const session = initial.state.activeSession
  if (!session) {
    return failure(
      'project.no-active-session',
      'There is no active project to save.',
      'The Save owner was invoked without an active lifecycle session.',
    )
  }
  const route = forceSaveAs ? 'save-as' : selectProjectSaveRoute(session)
  let destination = route === 'direct-package-save' ? session.currentPath : null
  if (route === 'save-as') {
    destination = await dependencies.saveDialog({
      defaultPath: getDefaultPackageFileName(session.kind),
      filters: PACKAGE_FILTERS,
    })
    if (destination === null) return cancelled()
  }
  if (!hasEligibleSblsPath(destination)) {
    return writeFailure(createProjectPackageDestinationFailure(
      'project.package.destination-extension-invalid',
    ))
  }

  const beforeCapture = context.getCurrentStateSnapshot()
  if (beforeCapture.state.activeSession?.id !== session.id) {
    return failure(
      'project.save-stale-session',
      'The active project changed before it could be saved.',
      'The lifecycle session identity changed before snapshot capture.',
    )
  }

  let writtenProject: ReturnType<typeof captureNormalizedProjectSnapshot>
  let capturePlan: ReturnType<typeof createProjectPackageCapturePlan>
  try {
    writtenProject = captureNormalizedProjectSnapshot(
      dependencies.captureCurrentProject(),
    )
    if (getNormalizedProjectKind(writtenProject) !== session.kind) {
      return failure(
        'project.save-stale-session',
        'The active project changed before it could be saved.',
        'The captured editor aggregate does not match the authorized session kind.',
      )
    }
    capturePlan = createProjectPackageCapturePlan(
      writtenProject as unknown as SavedProject,
    )
  } catch {
    return failure(
      'project.package.asset-capture-failed',
      'A required project asset could not be captured safely.',
      'Canonical package snapshot or capture-plan construction failed.',
    )
  }

  try {
    await dependencies.packageWrite.encodeAndWrite({
      destinationPath: destination,
      legacySourcePath: session.persistenceFormat === 'legacy-json'
        ? session.currentPath
        : null,
      normalizedProject: writtenProject as unknown as SavedProject,
      capturePlan,
    })
  } catch (error) {
    return writeFailure(error)
  }

  let latestProject: ReturnType<typeof captureNormalizedProjectSnapshot>
  try {
    latestProject = captureNormalizedProjectSnapshot(
      dependencies.captureCurrentProject(),
    )
    if (getNormalizedProjectKind(latestProject) !== session.kind) {
      return failure(
        'project.save-stale-session',
        'The project was written, but a replacement editor is now active.',
        'The post-commit editor aggregate does not match the authorized session kind.',
      )
    }
  } catch {
    return failure(
      'project.save-post-commit-capture-failed',
      'The package was written, but the current editor state could not be reconciled.',
      'Post-commit canonical snapshot capture failed; no lifecycle baseline was adopted.',
    )
  }
  const beforeAdoption = context.getCurrentStateSnapshot()
  if (beforeAdoption.state.activeSession?.id !== session.id) {
    return failure(
      'project.save-stale-session',
      'The project was written, but a replacement session is now active.',
      'The lifecycle session identity changed before baseline adoption.',
    )
  }
  const adoption = context.commitState(beforeAdoption.generation, (state) => {
    if (state.activeSession?.id !== session.id) return state
    return adoptSavedProjectBaseline(state, {
      acceptedSnapshot: writtenProject as unknown as SavedProject,
      currentProject: latestProject as unknown as SavedProject,
      currentPath: destination,
      persistenceFormat: 'sbls-package-v1',
    })
  })
  if (adoption.status !== 'committed') {
    return failure(
      'project.save-stale-session',
      'The project was written, but its lifecycle baseline could not be adopted.',
      `The lifecycle transition returned ${adoption.status}.`,
    )
  }
  return commandSucceeded(undefined, {
    kind: 'success',
    message: 'Project saved.',
    deduplicationKey: `project.save:${session.id}:${adoption.snapshot.generation}`,
  })
}

export function createApplicationProjectSaveCommandOwners(
  getRuntimeDependencies: GetRuntimeDependencies,
): Readonly<{
  saveProject: SaveProjectCommandOwner
  saveProjectAs: SaveProjectAsCommandOwner
}> {
  const unavailable = () => failure(
    'project.save-runtime-unavailable',
    'Save is not available yet.',
    'The React application boundary has not supplied Save dependencies.',
  )
  const saveProject: SaveProjectCommandOwner = Object.freeze({
    availability: 'implemented' as const,
    executeSaveProject(context) {
      const dependencies = getRuntimeDependencies()
      return dependencies ? runSave(context, dependencies, false) : unavailable()
    },
  })
  const saveProjectAs: SaveProjectAsCommandOwner = Object.freeze({
    availability: 'implemented' as const,
    executeSaveProjectAs(context) {
      const dependencies = getRuntimeDependencies()
      return dependencies ? runSave(context, dependencies, true) : unavailable()
    },
  })
  return Object.freeze({
    saveProject,
    saveProjectAs,
  })
}
