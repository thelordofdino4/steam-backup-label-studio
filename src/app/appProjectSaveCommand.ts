import {
  commandFailed,
  commandSucceeded,
  type ApplicationCommandOperationToken,
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
} from '../lifecycle/canonicalProject.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import {
  createCaseInsertProjectSaveSnapshot,
} from '../project/caseInsertPresetProjectPersistence.ts'
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
  operation: ApplicationCommandOperationToken,
): Promise<ApplicationCommandResult<void>> {
  const session = context.getCurrentStateSnapshot().state.activeSession
  if (!session) {
    return failure(
      'project.no-active-session',
      'There is no active project to save.',
      'The Save owner was invoked without an active lifecycle session.',
    )
  }

  // R is the immutable lifecycle-owned aggregate accepted by this operation.
  // Later editor synchronization may advance the same session to R+1 without
  // changing the bytes or baseline associated with this write.
  let writtenProject: ReturnType<typeof captureNormalizedProjectSnapshot>
  let persistedProject: SavedProject
  let capturePlan: ReturnType<typeof createProjectPackageCapturePlan>
  try {
    writtenProject = captureNormalizedProjectSnapshot(
      session.project as unknown as SavedProject,
    )
    persistedProject = session.kind === 'caseInsert'
      ? createCaseInsertProjectSaveSnapshot(
          writtenProject as Extract<
            typeof writtenProject,
            Readonly<{ projectType: 'caseInsert' }>
          >,
          session.caseInsertPresetApplication,
        )
      : writtenProject as unknown as SavedProject
    capturePlan = createProjectPackageCapturePlan(
      persistedProject,
    )
  } catch {
    return failure(
      'project.package.asset-capture-failed',
      'A required project asset could not be captured safely.',
      'Canonical package snapshot or capture-plan construction failed.',
    )
  }

  const route = forceSaveAs ? 'save-as' : selectProjectSaveRoute(session)
  const scopes = route === 'save-as'
    ? ['dialog.project-file', 'persistence.write'] as const
    : ['persistence.write'] as const

  return operation.withScopes(scopes, async () => {
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

    const beforeWrite = context.getCurrentStateSnapshot()
    if (beforeWrite.state.activeSession?.id !== session.id) {
      return failure(
        'project.save-stale-session',
        'The active project changed before it could be saved.',
        'The lifecycle session identity changed before package writing.',
      )
    }

    try {
      await dependencies.packageWrite.encodeAndWrite({
        destinationPath: destination,
        legacySourcePath: session.persistenceFormat === 'legacy-json'
          ? session.currentPath
          : null,
        normalizedProject: persistedProject,
        capturePlan,
      })
    } catch (error) {
      return writeFailure(error)
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
        currentPath: destination,
        persistenceFormat: 'sbls-package-v1',
      })
    })
    if (adoption.status === 'stale') {
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
  })
}

export type SaveProjectWithinOperation = (
  context: ApplicationLifecycleCommandContext,
  operation: ApplicationCommandOperationToken,
) => Promise<ApplicationCommandResult<void>>

export function createApplicationProjectSaveCommandOwners(
  getRuntimeDependencies: GetRuntimeDependencies,
): Readonly<{
  saveProject: SaveProjectCommandOwner
  saveProjectAs: SaveProjectAsCommandOwner
  saveProjectWithinOperation: SaveProjectWithinOperation
}> {
  const unavailable = () => failure(
    'project.save-runtime-unavailable',
    'Save is not available yet.',
    'The React application boundary has not supplied Save dependencies.',
  )
  const saveProject: SaveProjectCommandOwner = Object.freeze({
    availability: 'implemented' as const,
    executeSaveProject(context, _input, operation) {
      const dependencies = getRuntimeDependencies()
      return dependencies
        ? runSave(context, dependencies, false, operation)
        : unavailable()
    },
  })
  const saveProjectAs: SaveProjectAsCommandOwner = Object.freeze({
    availability: 'implemented' as const,
    executeSaveProjectAs(context, _input, operation) {
      const dependencies = getRuntimeDependencies()
      return dependencies
        ? runSave(context, dependencies, true, operation)
        : unavailable()
    },
  })
  const saveProjectWithinOperation: SaveProjectWithinOperation = async (
    context,
    operation,
  ) => {
    const dependencies = getRuntimeDependencies()
    return dependencies
      ? runSave(context, dependencies, false, operation)
      : unavailable()
  }

  return Object.freeze({
    saveProject,
    saveProjectAs,
    saveProjectWithinOperation,
  })
}
