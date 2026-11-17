import type { LifecyclePerformanceObserver } from '../lifecycle/lifecyclePerformanceObserver.ts'
import { createApplicationNativeTerminationCommandOwners } from './appNativeTerminationCommand.ts'
import { createApplicationTerminationRuntime, type ApplicationTerminationRuntimeDependencies, type NativeTerminationFeedback } from './applicationTerminationRuntime.ts'
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
import { createProjectAsyncWork, type ProjectAsyncWork } from '../lifecycle/projectAsyncWork.ts'
import { onceAsyncCleanup } from '../utils/onceAsyncCleanup.ts'
import type { ApplicationCaseInsertContinuousEditPort } from './applicationCaseInsertContinuousEditPort.ts'

export type ApplicationLifecycleRuntime = Readonly<{
  root: ApplicationLifecycleCompositionRoot
  projectAsyncWork: ProjectAsyncWork
  connectNativeTerminationIngress(feedback: NativeTerminationFeedback): () => void
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
  updateCaseInsertContinuousEditPort(port: ApplicationCaseInsertContinuousEditPort | null): void
  dispose(): Promise<void>
}>

export type ApplicationLifecycleRuntimeOptions = Readonly<{
  performanceObserver?: LifecyclePerformanceObserver
  nativeTermination?: ApplicationTerminationRuntimeDependencies
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
  let caseInsertContinuousEditPort: ApplicationCaseInsertContinuousEditPort | null = null
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
    )
  const pngExportOwner = createApplicationPngExportCommandOwner(
    () => pngExportDependencies,
  )
  const terminationRuntime = createApplicationTerminationRuntime(
    () => root, options.nativeTermination, () => projectAsyncWork.invalidateAll(),
  )
  const terminationOwners = createApplicationNativeTerminationCommandOwners(
    terminationRuntime.handoff, replacementGuard, () => caseInsertContinuousEditPort,
  )
  const root = createRoot({
    performanceObserver: options.performanceObserver,
    getTerminationCapabilities: terminationRuntime.capabilities,
    canAcceptCommands: () => !disposed && !terminationRuntime.isHandoffPending(),
    ports: {
      closeWindow: terminationOwners.closeWindow,
      quitApplication: terminationOwners.quitApplication,
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
  })

  const projectAsyncWork = createProjectAsyncWork(root.getStateSnapshot, {
    canAcceptWork: () => !disposed && !terminationRuntime.isHandoffPending(),
  })
  const unsubscribeAsyncWork = root.subscribe(() => projectAsyncWork.observeLifecycle())

  const dispose = onceAsyncCleanup(async () => {
    disposed = true
    projectOpenDependencies = null
    projectSaveDependencies = null
    projectReplacementDependencies = null
    projectNewDependencies = null
    workspaceNavigationDependencies = null
    pngExportDependencies = null
    caseInsertContinuousEditPort = null
    unsubscribeAsyncWork()
    projectAsyncWork.dispose()
    const pending = terminationRuntime.dispose()
    root.dispose()
    await pending
  })

  return Object.freeze({
    root,
    projectAsyncWork,
    connectNativeTerminationIngress: terminationRuntime.connect,
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
    updateCaseInsertContinuousEditPort(port) {
      if (disposed) throw new Error('The application lifecycle runtime is disposed.')
      caseInsertContinuousEditPort = port
    },
    dispose,
  })
}
