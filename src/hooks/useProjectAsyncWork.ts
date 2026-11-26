import { useContext, useSyncExternalStore } from 'react'
import { ApplicationLifecycleRuntimeContext } from '../app/applicationLifecycleRuntimeContext.ts'

/** Shares the existing application runtime's session-bound request owner. */
export function useProjectAsyncWork() {
  const runtime = useContext(ApplicationLifecycleRuntimeContext)
  if (!runtime) throw new Error('ApplicationLifecycleBoundary is required.')
  const work = runtime.projectAsyncWork
  useSyncExternalStore(work.subscribe, work.getSnapshot, work.getSnapshot)
  return work
}
