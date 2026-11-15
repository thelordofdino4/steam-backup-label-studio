// Mounted event diagnostics only; this harness does not establish native acceptance.
import { StrictMode, useState } from 'react'
import { EditorRangeField } from '../editor/EditorRangeField'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import App from '../../app/App'
import { ApplicationLifecycleBoundary } from '../../app/ApplicationLifecycleBoundary'
import { ApplicationMenuBoundary } from '../../app/ApplicationMenuBoundary'
import { createApplicationLifecycleRuntime } from '../../app/applicationLifecycleRuntime'
import { createApplicationMenuRuntime } from '../../applicationMenu/applicationMenuRuntime'
import type { ApplicationCommandId } from '../../lifecycle/applicationCommandTypes'
import '../../styles/index.css'
import '../../styles/layoutFix.css'

const lifecycle = createApplicationLifecycleRuntime()
const menu = createApplicationMenuRuntime(lifecycle.root, { nativeAvailable: () => false })
const root = createRoot(document.getElementById('root')!)
const requestFrame = window.requestAnimationFrame.bind(window)
const cancelFrame = window.cancelAnimationFrame.bind(window)
let paused = false
let nextHandle = -1
const frames = new Map<number, FrameRequestCallback>()
window.requestAnimationFrame = (callback) => {
  if (!paused) return requestFrame(callback)
  const handle = nextHandle--
  frames.set(handle, callback)
  return handle
}
window.cancelAnimationFrame = (handle) => {
  if (handle < 0) frames.delete(handle)
  else cancelFrame(handle)
}
const publications: unknown[] = []
let revision: number | undefined
lifecycle.root.subscribe(({ lifecycle: state }) => {
  const session = state.activeSession
  if (session?.revision !== revision) {
    revision = session?.revision
    publications.push(structuredClone(session))
  }
})
const harness = {
  snapshot: () => structuredClone(lifecycle.root.getLifecycleState()),
  publications: () => structuredClone(publications),
  pauseFrames: () => { paused = true },
  flushFrames: () => {
    const pending = [...frames.values()]
    frames.clear()
    flushSync(() => pending.forEach((callback) => callback(performance.now())))
  },
  queuedFrames: () => frames.size,
  dispatch: (command: ApplicationCommandId) => lifecycle.root.dispatch(command),
  unmount: () => flushSync(() => root.unmount()),
}
declare global { interface Window { __caseContinuousEdit: typeof harness } }
window.__caseContinuousEdit = harness
export function NeutralRangeProbe() {
  const [result, setResult] = useState({ value: 10, live: 0, commits: 0 })
  return <>
    <EditorRangeField id="neutral-range" label="Neutral" min={0} max={100} step={1}
      value={result.value}
      onInput={(value) => setResult((current) => ({ ...current, value, live: current.live + 1 }))}
      onChange={(value) => setResult((current) => ({ ...current, value, commits: current.commits + 1 }))}
    />
    <output id="neutral-result">{JSON.stringify(result)}</output>
  </>
}
root.render(new URLSearchParams(location.search).get('mode') === 'neutral'
  ? <NeutralRangeProbe />
  : <ApplicationLifecycleBoundary runtime={lifecycle}>
    <ApplicationMenuBoundary runtime={menu}>
      <StrictMode><App /></StrictMode>
    </ApplicationMenuBoundary>
  </ApplicationLifecycleBoundary>,
)
