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
  let disposed = false
  const createRoot = options.createRoot ??
    createApplicationLifecycleCompositionRoot
  const saveOwners = createApplicationProjectSaveCommandOwners(
    () => projectSaveDependencies,
  )
  const replacementGuard = createProjectReplacementGuard(
    () => projectReplacementDependencies,
    saveOwners.saveProjectWithinOperation,
  )
  const newOwners = createApplicationProjectNewCommandOwners(
    () => projectNewDependencies,
    replacementGuard,
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
    dispose() {
      if (disposed) return
      disposed = true
      projectOpenDependencies = null
      projectSaveDependencies = null
      projectReplacementDependencies = null
      projectNewDependencies = null
      root.dispose()
    },
  })
}
