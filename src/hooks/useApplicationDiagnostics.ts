import { useContext } from 'react'
import { ApplicationLifecycleRuntimeContext } from '../app/applicationLifecycleRuntimeContext.ts'

/** The existing runtime collector; it never subscribes to or snapshots project content. */
export function useApplicationDiagnostics() {
  const runtime = useContext(ApplicationLifecycleRuntimeContext)
  if (!runtime) throw new Error('ApplicationLifecycleBoundary is required.')
  return runtime.diagnostics
}
