import {
  createApplicationLifecycleCompositionRoot,
  type ApplicationLifecycleCompositionRoot,
  type ApplicationLifecycleCompositionRootOptions,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createApplicationProjectOpenCommandOwner,
  type ApplicationProjectOpenRuntimeDependencies,
} from './appProjectOpenCommand.ts'

export type ApplicationLifecycleRuntime = Readonly<{
  root: ApplicationLifecycleCompositionRoot
  updateProjectOpenDependencies(
    dependencies: ApplicationProjectOpenRuntimeDependencies,
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
  let disposed = false
  const createRoot = options.createRoot ??
    createApplicationLifecycleCompositionRoot
  const root = createRoot({
    ports: {
      openProject: createApplicationProjectOpenCommandOwner(
        () => projectOpenDependencies,
      ),
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
    dispose() {
      if (disposed) return
      disposed = true
      projectOpenDependencies = null
      root.dispose()
    },
  })
}
