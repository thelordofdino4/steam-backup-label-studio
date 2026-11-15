import {
  createApplicationLifecycleCompositionRoot,
  type ApplicationLifecycleCompositionRoot,
  type ApplicationLifecycleCompositionRootOptions,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createApplicationProjectOpenCommandOwner,
  type ApplicationProjectOpenRuntimeDependencies,
} from './appProjectOpenCommand.ts'
import {
  createApplicationProjectSaveCommandOwners,
  type ApplicationProjectSaveRuntimeDependencies,
} from './appProjectSaveCommand.ts'
import {
  createProjectReplacementGuard,
  type ApplicationProjectReplacementRuntimeDependencies,
} from './appProjectReplacementGuard.ts'
import {
  createApplicationProjectNewCommandOwners,
  type ApplicationProjectNewRuntimeDependencies,
} from './appProjectNewCommand.ts'
import {
  createApplicationWorkspaceNavigationCommandOwners,
  type ApplicationWorkspaceNavigationRuntimeDependencies,
} from './appWorkspaceNavigationCommand.ts'
import {
  createApplicationPngExportCommandOwner,
  type ApplicationPngExportRuntimeDependencies,
} from './appPngExportCommand.ts'
import type {
  CaseInsertPresetSessionEditorApplyPort,
} from '../lifecycle/caseInsertPresetSessionApplicationCommand.ts'
import type {
  ApplicationCaseInsertContinuousEditPort,
} from './applicationCaseInsertContinuousEditPort.ts'

export type ApplicationLifecycleRuntime = Readonly<{
  root: ApplicationLifecycleCompositionRoot
  updateProjectOpenDependencies(
    dependencies: ApplicationProjectOpenRuntimeDependencies,
  ): void
  updateProjectSaveDependencies(
    dependencies: ApplicationProjectSaveRuntimeDependencies,
  ): void
  updateProjectReplacementDependencies(
    dependencies: ApplicationProjectReplacementRuntimeDependencies,
  ): void
  updateProjectNewDependencies(
    dependencies: ApplicationProjectNewRuntimeDependencies,
  ): void
  updateWorkspaceNavigationDependencies(
    dependencies: ApplicationWorkspaceNavigationRuntimeDependencies,
  ): void
  updatePngExportDependencies(
    dependencies: ApplicationPngExportRuntimeDependencies,
  ): void
  updateCaseInsertPresetEditorApply(
    editorApply: CaseInsertPresetSessionEditorApplyPort,
  ): void
  updateCaseInsertContinuousEditPort(
    port: ApplicationCaseInsertContinuousEditPort | null,
  ): void
  dispose(): void
}>

export type ApplicationLifecycleRuntimeOptions = Readonly<{
  createRoot?: (
    options: ApplicationLifecycleCompositionRootOptions,
  ) => ApplicationLifecycleCompositionRoot
}>

/**
 * Owns one lifecycle composition root for one mounted application. Runtime
 * adapters update the dependency reference without recreating the root or its
 * store, registry, dispatcher, busy coordinator, or session-ID boundary.
 */
export function createApplicationLifecycleRuntime(
  options: ApplicationLifecycleRuntimeOptions = {},
): ApplicationLifecycleRuntime {
  let projectOpenDependencies: ApplicationProjectOpenRuntimeDependencies | null =
    null
  let projectSaveDependencies: ApplicationProjectSaveRuntimeDependencies | null = null
  let projectReplacementDependencies:
    ApplicationProjectReplacementRuntimeDependencies | null = null
  let projectNewDependencies: ApplicationProjectNewRuntimeDependencies | null = null
  let workspaceNavigationDependencies:
    ApplicationWorkspaceNavigationRuntimeDependencies | null = null
  let pngExportDependencies: ApplicationPngExportRuntimeDependencies | null = null
  let caseInsertPresetEditorApply:
    CaseInsertPresetSessionEditorApplyPort | null = null
  let caseInsertContinuousEditPort:
    ApplicationCaseInsertContinuousEditPort | null = null
  let disposed = false
  const createRoot = options.createRoot ??
    createApplicationLifecycleCompositionRoot
  const saveOwners = createApplicationProjectSaveCommandOwners(
    () => projectSaveDependencies,
    () => caseInsertContinuousEditPort,
  )
  const replacementGuard = createProjectReplacementGuard(
    () => projectReplacementDependencies,
    saveOwners.saveProjectWithinOperation,
    () => caseInsertContinuousEditPort,
  )
  const newOwners = createApplicationProjectNewCommandOwners(
    () => projectNewDependencies,
    replacementGuard,
  )
  const workspaceNavigationOwners =
    createApplicationWorkspaceNavigationCommandOwners(
      () => workspaceNavigationDependencies,
      () => caseInsertContinuousEditPort,
    )
  const pngExportOwner = createApplicationPngExportCommandOwner(
    () => pngExportDependencies,
    () => caseInsertContinuousEditPort,
  )
  const root = createRoot({
    ports: {
      newDisc: newOwners.newDisc,
      newCase: newOwners.newCase,
      openProject: createApplicationProjectOpenCommandOwner(
        () => projectOpenDependencies,
        replacementGuard,
      ),
      saveProject: saveOwners.saveProject,
      saveProjectAs: saveOwners.saveProjectAs,
      returnHome: workspaceNavigationOwners.returnHome,
      resumeProject: workspaceNavigationOwners.resumeProject,
    },
    exportPng: pngExportOwner,
    caseInsertPresetEditorApply: {
      commitLifecycleAndApply(commitLifecycle) {
        if (!caseInsertPresetEditorApply) {
          throw new Error(
            'The Case preset editor apply adapter is not configured.',
          )
        }
        return caseInsertPresetEditorApply.commitLifecycleAndApply(
          commitLifecycle,
        )
      },
    },
  })

  return Object.freeze({
    root,
    updateProjectOpenDependencies(dependencies) {
      if (disposed) {
        throw new Error('The application lifecycle runtime is disposed.')
      }
      projectOpenDependencies = dependencies
    },
    updateProjectSaveDependencies(dependencies) {
      if (disposed) {
        throw new Error('The application lifecycle runtime is disposed.')
      }
      projectSaveDependencies = dependencies
    },
    updateProjectReplacementDependencies(dependencies) {
      if (disposed) {
        throw new Error('The application lifecycle runtime is disposed.')
      }
      projectReplacementDependencies = dependencies
    },
    updateProjectNewDependencies(dependencies) {
      if (disposed) {
        throw new Error('The application lifecycle runtime is disposed.')
      }
      projectNewDependencies = dependencies
    },
    updateWorkspaceNavigationDependencies(dependencies) {
      if (disposed) {
        throw new Error('The application lifecycle runtime is disposed.')
      }
      workspaceNavigationDependencies = dependencies
    },
    updatePngExportDependencies(dependencies) {
      if (disposed) {
        throw new Error('The application lifecycle runtime is disposed.')
      }
      const before = root.getApplicationCommandCapabilities()['export.png']
      pngExportDependencies = dependencies
      const after = root.getApplicationCommandCapabilities()['export.png']
      if (
        before.canExecute !== after.canExecute ||
        (!before.canExecute && !after.canExecute &&
          (before.reasonCode !== after.reasonCode ||
            before.userMessage !== after.userMessage))
      ) {
        root.refreshCommandCapabilities()
      }
    },
    updateCaseInsertPresetEditorApply(editorApply) {
      if (disposed) {
        throw new Error('The application lifecycle runtime is disposed.')
      }
      caseInsertPresetEditorApply = editorApply
    },
    updateCaseInsertContinuousEditPort(port) {
      if (disposed) {
        throw new Error('The application lifecycle runtime is disposed.')
      }
      caseInsertContinuousEditPort = port
    },
    dispose() {
      if (disposed) return
      disposed = true
      projectOpenDependencies = null
      projectSaveDependencies = null
      projectReplacementDependencies = null
      projectNewDependencies = null
      workspaceNavigationDependencies = null
      pngExportDependencies = null
      caseInsertPresetEditorApply = null
      caseInsertContinuousEditPort = null
      root.dispose()
    },
  })
}
