import { flushSync } from 'react-dom'
import { hasApplicationModal } from '../editor/applicationModalState.ts'

/** Adapter for the brief final native handoff; never owns project/dirty state. */
export function prepareNativeTerminationInteraction(): () => void {
  flushSync(() => {})
  if (hasApplicationModal()) throw new Error('An application modal still owns interaction.')
  const root = document.getElementById('root')
  if (!root) throw new Error('The application interaction root is unavailable.')
  const previous = root.inert
  root.inert = true
  return () => { root.inert = previous }
}
