// Loaded solely by the headless integration test, not by the application.
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { BackgroundLayer } from '/src/components/preview/BackgroundLayer.tsx'
import { createBlankDiscSavedProject } from '/src/project/blankDiscProject.ts'
import { restoreProjectStateFromContents } from '/src/project/restoreProjectState.ts'
import { createUploadedBackgroundImageImport } from '/src/image/backgroundImageImport.ts'
import { resolveBackgroundImageLayout } from '/src/image/backgroundImage.ts'
import { DiscBackgroundRaster, readDiscBackgroundAsset } from '/src/image/discBackgroundAsset.ts'
import { createApplicationLifecycleCompositionRoot } from '/src/lifecycle/applicationLifecycleCompositionRoot.ts'
import { createNewProjectSession } from '/src/lifecycle/projectSession.ts'
import { captureDiscBackgroundExportInput, materializeDiscProject } from '/src/lifecycle/canonicalProject.ts'
import { exportDiscLabelPngBytes } from '/src/export/exportPng.ts'

function check(condition, label) { if (!condition) throw Error(label) }

async function makeFixture(size, gifBase64, variant) {
  if (size === 'animated' && variant === 0) {
    const bytes = Uint8Array.from(atob(gifBase64), c => c.charCodeAt(0))
    return { file: new File([bytes], 'background-animation.gif', { type: 'image/gif' }),
      source: 'data:image/gif;base64,' + gifBase64, width: 128, height: 128 }
  }
  const edge = size === 'animated' ? 128 : size
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = edge
  const ctx = canvas.getContext('2d')
  check(ctx, 'fixture missing canvas')
  const margin = edge / 8
  ctx.fillStyle = variant ? '#47726e' : '#274051'
  ctx.fillRect(margin, margin, edge - margin * 2, edge - margin * 2)
  ctx.fillStyle = '#ff00ff'
  ctx.fillRect(Math.round(edge * .22), Math.round(edge * .27), Math.round(edge * .08), Math.round(edge * .08))
  const source = canvas.toDataURL('image/png')
  // Decode our exact generated source into the File: no second encoder or external fetch.
  const bytes = Uint8Array.from(atob(source.slice('data:image/png;base64,'.length)), c => c.charCodeAt(0))
  return { file: new File([bytes], 'background-raster.png', { type: 'image/png' }), source, width: edge, height: edge }
}

window.runLifetimeRegression = async ({ size, gifBase64 }) => {
  const [a, b] = await Promise.all([makeFixture(size, gifBase64, 0), makeFixture(size, gifBase64, 1)])
  const tracked = new Map([[a.source, a], [b.source, b]])
  const saved = createBlankDiscSavedProject()
  const state = await restoreProjectStateFromContents(JSON.stringify(saved))
  const createLifecycle = id => createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({ sessionId: id, project: saved }),
  })
  const lifecycle = createLifecycle('lifetime-first-disc')
  const replaceProject = createLifecycle('lifetime-replacement-disc')
  const current = (app = lifecycle) => app.getLifecycleState().activeSession
  const fixture = document.getElementById('fixture')
  const mounted = createRoot(fixture)
  const preview = () => fixture.querySelectorAll('.background-image-layer img')
  const noop = () => {}
  const paint = ({ background }) => {
    const input = captureDiscBackgroundExportInput(background)
    flushSync(() => mounted.render(createElement(BackgroundLayer, {
      ...input, layout: resolveBackgroundImageLayout(
        input.backgroundImageSize, input.backgroundScale, input.backgroundOffset, 600,
      ),
      handleBackgroundPointerDown: noop, handleBackgroundPointerMove: noop, handleBackgroundPointerUp: noop,
    })))
  }
  const advance = operation => {
    const session = current()
    check(lifecycle.commitDiscBackground({ sessionId: session.id, expectedRevision: session.revision, operation }) === 'committed', 'expected Background commit')
    return current()
  }
  let codecCalls = 0
  const existingTauri = Object.getOwnPropertyDescriptor(window, '__TAURI_INTERNALS__')
  Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {
    async invoke(command, body) {
      check(command === 'validate_imported_image_asset' && body instanceof Uint8Array, 'wrong validation transport')
      const found = tracked.get(new TextDecoder().decode(body))
      check(found, 'native seam received unrecognized bytes')
      codecCalls++
      return { status: 'success', mimeType: found.file.type, width: found.width, height: found.height }
    },
  } })
  const counts = {}
  const imageEvents = [], imageStarts = []
  const sourceDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')
  // Observe JS-owned new Image() load/error terminals without holding any image object.
  // Parser/React-created preview img is deliberately measured through DOM instead.
  const originalImage = window.Image
  const createUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL
  let urlsCreated = 0, urlsRevoked = 0
  window.Image = new Proxy(originalImage, { construct(target, args) {
    const image = Reflect.construct(target, args)
    Object.defineProperty(image, 'src', {
      configurable: true,
      get() { return sourceDescriptor.get.call(this) },
      set(value) {
        if (tracked.has(value)) imageStarts.push(1)
        sourceDescriptor.set.call(this, value)
      },
    })
    function terminal(event) {
      const source = image.getAttribute('src')
      if (tracked.has(source)) imageEvents.push(event.type)
      image.removeEventListener('load', terminal); image.removeEventListener('error', terminal)
    }
    image.addEventListener('load', terminal); image.addEventListener('error', terminal)
    return image
  } })
  URL.createObjectURL = (...args) => { urlsCreated++; return createUrl.apply(URL, args) }
  URL.revokeObjectURL = (...args) => { urlsRevoked++; return revokeUrl.apply(URL, args) }
  const resources = await Promise.resolve().then(async () => {
    const render = async input => Array.from((await exportDiscLabelPngBytes({
      ...state, selectedDiscTemplate: state.template.selectedDiscTemplate, steamLogoPlacement: 'none',
      ...input, previewSize: 600,
      exportGuides: { centerHole: false, outerEdge: false, printableArea: false, safeZone: false },
    })).bytes)
    const importAsset = async data => {
      const imported = await createUploadedBackgroundImageImport(data.file)
      check(DiscBackgroundRaster.owns(imported.stagedAsset), 'real raster ref not staged')
      return advance({ kind: 'asset', stagedAsset: imported.stagedAsset, background: {
        ...materializeDiscProject(current().project).background, enabled: true,
        imageDataUrl: imported.background.imageUrl, imageSize: imported.background.imageSize, imageSource: imported.imageSource,
      } })
    }
    const r = await importAsset(a)
    const rInput = captureDiscBackgroundExportInput(r.project.background)
    paint(r.project)
    counts.afterAccept = preview().length
    const rImage = preview()[0]
    check(rImage?.getAttribute('src') === a.source, 'mounted asset did not reach real preview element')
    await rImage.decode()
    const mutations = new MutationObserver(noop)
    mutations.observe(fixture, { attributes: true, attributeFilter: ['src'], subtree: true })
    try {
      paint(advance({ kind: 'transform', scale: 1.25, offset: { x: 22, y: -7 } }).project)
      const session = current()
      const compatibility = materializeDiscProject(session.project)
      check(lifecycle.synchronizeCurrentProject({ sessionId: session.id, kind: 'disc', project: {
        ...compatibility, title: 'A genuine unrelated compatibility title edit',
      } }) === 'synchronized', 'title edit did not advance existing lifecycle')
      paint(current().project)
      check(current().project.background.asset === r.project.background.asset, 'stable asset identity lost')
      check(preview()[0] === rImage && preview().length === 1, 'edit replaced preview consumer')
      counts.geometrySourceMutations = mutations.takeRecords().length
    } finally { mutations.disconnect() }
    // Encode after R+1 to exercise the existing pinned export input, not a concurrent command claim.
    const atStart = imageEvents.length
    const pinned = await render(rInput)
    counts.enabledLoads = imageEvents.length - atStart
    const setVisible = enabled => {
      const { scale, offset } = current().project.background
      paint(advance({ kind: 'visibility', enabled, scale, offset }).project)
    }
    setVisible(false)
    check(preview().length === 0 && !rImage.isConnected, 'disabled old preview still connected')
    check(readDiscBackgroundAsset(current().project.background.asset) === a.source, 'disabled source was lost')
    let before = imageEvents.length
    const disabled = await render(captureDiscBackgroundExportInput(current().project.background))
    counts.disabledLoads = imageEvents.length - before
    setVisible(true)
    const reenabledImage = preview()[0]
    check(reenabledImage?.getAttribute('src') === a.source, 'reenable changed asset')
    await reenabledImage.decode()
    before = imageEvents.length
    const replaced = await importAsset(b)
    counts.importLoads = atStart + (imageEvents.length - before)
    paint(replaced.project)
    const bImage = preview()[0]
    check(bImage?.getAttribute('src') === b.source, 'replacement source not published')
    await bImage.decode()
    const beforeFailure = imageEvents.length
    const encode = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (callback) { queueMicrotask(() => callback(null)) }
    try {
      let rejected = false
      try { await render(captureDiscBackgroundExportInput(replaced.project.background)) }
      catch (error) { rejected = error.message === 'Could not create PNG blob.' }
      check(rejected, 'negative control did not fail at real PNG terminal')
    } finally { HTMLCanvasElement.prototype.toBlob = encode }
    counts.failedExportLoads = imageEvents.length - beforeFailure
    check(preview()[0] === bImage && bImage.isConnected, 'export failure disturbed current preview')
    paint(advance({ kind: 'asset', stagedAsset: null, background: {
      ...materializeDiscProject(current().project).background, imageDataUrl: null, imageSource: null, imageSize: null,
    } }).project)
    before = imageEvents.length
    await render(captureDiscBackgroundExportInput(current().project.background))
    counts.clearLoads = imageEvents.length - before
    check(preview().length === 0 && !bImage.isConnected, 'clear failed to retire B')
    // Remount prior committed view, then replace by distinct blank session and unmount.
    paint(r.project)
    const beforeReplacement = preview()[0]
    check(beforeReplacement?.getAttribute('src') === a.source, 'saved readback did not show A')
    await beforeReplacement.decode()
    before = imageEvents.length
    const restored = await render(rInput)
    counts.restoredLoads = imageEvents.length - before
    paint(current(replaceProject).project)
    check(preview().length === 0 && !beforeReplacement.isConnected, 'replacement active lane kept old preview')
    counts.retiredConnected = [rImage, reenabledImage, bImage, beforeReplacement].filter(node => node.isConnected).length
    counts.finalPreview = preview().length
    counts.unknownTerminals = imageEvents.filter(event => event !== 'load').length
    counts.pendingLoads = imageStarts.length - imageEvents.length
    check(codecCalls === 2, 'expected one real validation seam call per upload')
    return { pinned, disabled, restored, bounds: rInput.backgroundImageSize?.contentBounds }
  }).finally(() => {
    mounted.unmount(); lifecycle.dispose(); replaceProject.dispose()
    window.Image = originalImage; URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl
    if (existingTauri) Object.defineProperty(window, '__TAURI_INTERNALS__', existingTauri)
    else Reflect.deleteProperty(window, '__TAURI_INTERNALS__')
  })
  return { ...resources, counts: { ...counts, urlsCreated, urlsRevoked },
    fixture: { width: a.width, height: a.height, bounds: resources.bounds } }
}
