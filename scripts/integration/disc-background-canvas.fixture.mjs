// Isolated browser fixture only. Mount the real App and resume a retained,
// generated project; the test does not inject a native bridge or replace a store.
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../../src/app/App.tsx'
import { ApplicationLifecycleBoundary } from '../../src/app/ApplicationLifecycleBoundary.tsx'
import { ApplicationMenuBoundary } from '../../src/app/ApplicationMenuBoundary.tsx'
import { createApplicationLifecycleRuntime } from '../../src/app/applicationLifecycleRuntime.ts'
import { createApplicationMenuRuntime } from '../../src/applicationMenu/applicationMenuRuntime.ts'
import { createApplicationLifecycleCompositionRoot } from '../../src/lifecycle/applicationLifecycleCompositionRoot.ts'
import { createNewProjectSession, returnProjectSessionHome } from '../../src/lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../../src/project/blankDiscProject.ts'
import '../../src/styles/index.css'
import '../../src/styles/layoutFix.css'

const artwork = document.createElement('canvas')
artwork.width = artwork.height = 128
const ctx = artwork.getContext('2d')
ctx.fillStyle = '#274051'
ctx.fillRect(0, 0, 128, 128)
ctx.fillStyle = '#ff00ff'
ctx.fillRect(32, 38, 11, 13)
ctx.fillStyle = '#00ffff'
ctx.fillRect(84, 79, 15, 9)

const project = createBlankDiscSavedProject()
project.background = {
  ...project.background, enabled: true, imageDataUrl: artwork.toDataURL('image/png'),
  imageSize: { width: 128, height: 128 }, offset: { x: 0, y: 0 }, scale: 1.5,
}
const initialState = returnProjectSessionHome(createNewProjectSession({
  sessionId: 'generated-disc-canvas', project,
}))
const lifecycle = createApplicationLifecycleRuntime({
  createRoot: options => createApplicationLifecycleCompositionRoot({ ...options, initialState }),
})
const menu = createApplicationMenuRuntime(lifecycle.root)
const selector = '.background-image-layer[aria-label="Uploaded background image layer"]'
let active = null
function current() {
  const { activeSession: s } = lifecycle.root.getLifecycleState()
  const { offset, scale } = s.project.background
  return { id: s.id, revision: s.revision, offset, scale }
}
lifecycle.root.subscribe(() => {
  if (!active) return
  const state = current()
  const prev = active.last
  if (prev.id !== state.id || prev.revision !== state.revision) {
    active.transitions.push({ from: prev, to: state })
    active.last = state
  }
})
for (const type of ['pointerdown','gotpointercapture','pointermove','pointerup','pointercancel','lostpointercapture']) {
  document.addEventListener(type, event => {
    if (active && event.target instanceof Element && event.target.closest(selector)) {
      if (active.events.length >= 64) throw Error('Canvas event receipt overflow')
      active.events.push({ type, pointerId: event.pointerId, trusted: event.isTrusted, pointerType: event.pointerType })
    }
  }, { capture: true, passive: true })
}

globalThis.discCanvasFixture = {
  arm() {
    if (active) throw Error('Canvas event receipt already armed')
    active = { events: [], transitions: [], last: current() }
  },
  drain() {
    const result = active
    active = null
    return { events: result.events, transitions: result.transitions }
  },
  read() {
    const layer = document.querySelector(selector)
    const first = layer?.firstElementChild
    const surface = layer?.closest('.disc-preview')
    const transform = first ? getComputedStyle(first).transform : 'none'
    const m = transform === 'none' ? null : new DOMMatrixReadOnly(transform)
    const pointerId = active?.events.find(e => e.type === 'pointerdown')?.pointerId
    return {
      ...current(), transform,
      translation: m ? { x: m.m41, y: m.m42 } : null,
      ratio: surface ? surface.getBoundingClientRect().width / surface.offsetWidth : null,
      artLoaded: !!layer?.querySelector('img')?.naturalWidth,
      captured: pointerId !== undefined && layer?.hasPointerCapture(pointerId),
    }
  },
}

createRoot(document.getElementById('root')).render(
  createElement(ApplicationLifecycleBoundary, { runtime: lifecycle },
    createElement(ApplicationMenuBoundary, { runtime: menu }, createElement(App))),
)
