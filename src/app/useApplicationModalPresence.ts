import { useLayoutEffect, useState } from 'react'
import { hasApplicationModal } from '../editor/applicationModalState'

/**
 * Projects the existing accessible modal presentations into application-level
 * capability state without moving their focus or decision ownership.
 */
export function useApplicationModalPresence(): boolean {
  const [active, setActive] = useState(hasApplicationModal)

  useLayoutEffect(() => {
    const update = () => setActive(hasApplicationModal())
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-modal'],
      childList: true,
      subtree: true,
    })
    return () => observer.disconnect()
  }, [])

  return active
}
