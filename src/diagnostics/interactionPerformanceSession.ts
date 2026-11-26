import type { ApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { observeInteraction, type InteractionPerformanceObserver } from './interactionPerformanceObserver.ts'
/** Session identity is compared transiently; never included in diagnostic records. */
export function bindInteractionSession(observer: InteractionPerformanceObserver | undefined,
  root: Pick<ApplicationLifecycleCompositionRoot, 'getLifecycleState' | 'subscribe'>) {
  if (!observer) return () => {}
  let id = root.getLifecycleState().activeSession?.id
  let workspace = root.getLifecycleState().visibleWorkspace
  const unsubscribe = root.subscribe(() => {
    const state = root.getLifecycleState()
    if (id !== state.activeSession?.id || workspace !== state.visibleWorkspace) {
      observeInteraction(() => observer.invalidateSession())
      id = state.activeSession?.id
      workspace = state.visibleWorkspace
    }
  })
  return () => { unsubscribe(); observeInteraction(() => observer.unmount()) }
}
