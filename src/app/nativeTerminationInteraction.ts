import { flushSync } from 'react-dom'
import { hasApplicationModal } from '../editor/applicationModalState.ts'

const activePreparations = new WeakMap<HTMLElement, object>()

/** Adapter for the brief final native handoff; never owns project/dirty state. */
export function prepareNativeTerminationInteraction(): () => void {
  flushSync(() => {})
  if (hasApplicationModal()) throw new Error('An application modal still owns interaction.')
  const root = document.getElementById('root')
  if (!root) throw new Error('The application interaction root is unavailable.')
  if (activePreparations.has(root)) throw new Error('A native handoff already owns interaction.')
  const previous = root.inert
  const lease = {}
  activePreparations.set(root, lease)
  root.inert = true
  return () => {
    if (activePreparations.get(root) !== lease) return
    activePreparations.delete(root)
    root.inert = previous
  }
}
