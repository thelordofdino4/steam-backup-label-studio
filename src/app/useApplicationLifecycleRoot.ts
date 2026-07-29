import { useContext, useLayoutEffect } from 'react'
import type {
  ApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import type {
  ApplicationProjectOpenRuntimeDependencies,
} from './appProjectOpenCommand.ts'
import type {
  ApplicationProjectSaveRuntimeDependencies,
} from './appProjectSaveCommand.ts'
import {
  ApplicationLifecycleRuntimeContext,
} from './applicationLifecycleRuntimeContext.ts'

/**
 * Supplies committed-render dependencies through a ref owned outside React.
 * The lifecycle root stays stable while the Open owner observes the newest
 * committed callbacks and owner state.
 */
export function useApplicationLifecycleRoot(
  dependencies: Readonly<{
    open: ApplicationProjectOpenRuntimeDependencies
    save: ApplicationProjectSaveRuntimeDependencies
  }>,
): ApplicationLifecycleCompositionRoot {
  const runtime = useContext(ApplicationLifecycleRuntimeContext)
  if (!runtime) {
    throw new Error('ApplicationLifecycleBoundary is required.')
  }

  useLayoutEffect(() => {
    runtime.updateProjectOpenDependencies(dependencies.open)
    runtime.updateProjectSaveDependencies(dependencies.save)
  }, [dependencies, runtime])

  return runtime.root
}
