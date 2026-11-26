import { useContext, useLayoutEffect } from 'react'
import { InteractionPerformanceContext } from './InteractionPerformanceContext.ts'
import { observeInteraction } from './interactionPerformanceObserver.ts'
/** First subsequent DiscPreview layout observation, not paint or document commit. */
export function useDiscInteractionCommit(artwork: object, textValues: object, artworkVisible: boolean, textVisible: boolean) {
  const observer = useContext(InteractionPerformanceContext)
  useLayoutEffect(() => {
    if (!observer) return
    observeInteraction(() => observer.commit('disc-title-artwork-scale', artwork, artworkVisible))
    observeInteraction(() => observer.commit('disc-custom-note-plain', textValues, textVisible))
  })
  useLayoutEffect(() => () => {
    if (observer) observeInteraction(() => observer.unmount())
  }, [observer])
}
