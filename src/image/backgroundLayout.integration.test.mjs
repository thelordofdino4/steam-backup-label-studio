import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Headless adapter diagnostics only. Native Tauri visual acceptance is separate.
let browser
let page
let server
const browserErrors = []
test.before(async () => {
  server = await createServer({
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'background-layout-test',
      resolveId(id) { if (id === '/__background-deps') return '\0background-test-deps' },
      load(id) {
        if (id === '\0background-test-deps') return "export { default as React } from 'react'; export { createRoot } from 'react-dom/client'; export { flushSync } from 'react-dom';"
      },
      configureServer(server) {
      server.middlewares.use('/__background-layout-test', async (_request, response) => {
        response.setHeader('Content-Type', 'text/html')
        response.end(await server.transformIndexHtml('/__background-layout-test', '<!doctype html><html><head></head><body><div id="root"></div></body></html>'))
      })
    } }],
  })
  await server.listen()
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  page.on('pageerror', (error) => browserErrors.push(error.stack ?? error.message))
  const address = server.httpServer.address()
  await page.goto(`http://127.0.0.1:${address.port}/__background-layout-test`)
  await page.evaluate(async () => {
    const { React, createRoot, flushSync } = await import('/__background-deps')
    const { BackgroundLayer } = await import('/src/components/preview/BackgroundLayer.tsx')
    const { PreviewElementOverlay } = await import('/src/components/preview/PreviewElementOverlay.tsx')
    const { useDiscPreviewPointerDrag } = await import('/src/interaction/useDiscPreviewPointerDrag.ts')
    const { useDiscPreviewSize } = await import('/src/hooks/useDiscPreviewSize.ts')
    const { getDiscPreviewCoordinateSize } = await import('/src/interaction/discPreviewCoordinates.ts')
    const { resolveBackgroundImageLayout } = await import('/src/image/backgroundImage.ts')
    const { drawBackgroundArtwork } = await import('/src/export/drawBackgroundArtwork.ts')
    const { exportDiscLabelPngBytes } = await import('/src/export/exportPng.ts')
    const { loadImage } = await import('/src/export/canvasImage.ts')
    const { discTemplates } = await import('/src/templates/discTemplates.ts')
    const { createBlankDiscSavedProject } = await import('/src/project/blankDiscProject.ts')
    await import('/src/styles/app-disc-surface.css')
    await import('/src/styles/app-disc-visual-layers.css')
    await import('/src/styles/app-preview-shell.css')
    const root = createRoot(document.getElementById('root'))
    let serial = 0
    function Component({ config }) {
      const previewRef = React.useRef(null)
      const [offset, setOffset] = React.useState(config.offset)
      const coordinateSize = useDiscPreviewSize({ activeWorkspace: 'disc', discPreviewRef: previewRef })
      const layout = resolveBackgroundImageLayout(config.imageSize, config.scale, offset, coordinateSize)
      const defaults = createBlankDiscSavedProject()
      const binding = (value) => ({ value, setValue: () => {} })
      const handlers = useDiscPreviewPointerDrag({
        preview: { discPreviewRef: previewRef, selectedDiscTemplate: discTemplates.standardPrintableDisc },
        background: { imageUrl: config.url, imageSize: config.imageSize, scale: config.scale, offset, setOffset },
        discText: { layout: defaults.discText.layout, styles: defaults.discText.styles, getTextContent: () => '', setLayout: () => {} },
        logoAssets: binding(defaults.logoAssets), titleArtwork: binding(defaults.titleArtwork),
        additionalArtwork: binding(defaults.additionalArtwork),
        ratingBadge: { ...binding(defaults.ratingBadge), projectMetadata: defaults.metadata },
        mediaMark: binding(defaults.mediaMark), platformMarks: binding(defaults.platformMarks),
        technicalMarks: binding(defaults.technicalMarks),
      })
      React.useLayoutEffect(() => {
        window.__backgroundState = { layout, offset, coordinateSize, element: previewRef.current, config }
      })
      return React.createElement('div', { id: 'viewport', style: {
        transform: `translate(${config.pan}px, 50px) scale(${config.zoom})`, transformOrigin: '0 0',
      } }, React.createElement('div', { id: 'disc', ref: previewRef, style: {
        position: 'relative', width: config.basis, height: config.basis, borderRadius: '50%', overflow: 'hidden',
      } }, React.createElement(BackgroundLayer, {
        backgroundImageUrl: config.url, backgroundImageSize: config.imageSize, layout,
        ...handlers.previewPointerHandlers.background,
      }), React.createElement(PreviewElementOverlay, { previewRef })))
    }
    window.__backgroundHarness = {
      mount(config) {
        const source = document.createElement('canvas')
        source.width = config.imageSize?.width ?? 120
        source.height = config.imageSize?.height ?? 60
        const content = config.imageSize?.contentBounds ?? { x: 0, y: 0, width: source.width, height: source.height }
        const context = source.getContext('2d')
        context.fillStyle = '#ff0000'
        context.fillRect(content.x, content.y, content.width / 2, content.height)
        context.fillStyle = '#0000ff'
        context.fillRect(content.x + content.width / 2, content.y, content.width / 2, content.height)
        flushSync(() => root.render(React.createElement(Component, {
          key: ++serial, config: { ...config, url: config.disabled ? null : source.toDataURL() },
        })))
      },
      snapshot() {
        const { layout, offset, coordinateSize, element } = window.__backgroundState
        const layer = element.querySelector('.background-image-layer')
        const content = layer?.querySelector(':scope > img, :scope > .content-bounded-image')
        const rect = element.getBoundingClientRect()
        const ratio = rect.width / element.offsetWidth
        const toLocal = (target) => {
          if (!target) return null
          const result = target.getBoundingClientRect()
          return { x: (result.x - rect.x) / ratio, y: (result.y - rect.y) / ratio,
            width: result.width / ratio, height: result.height / ratio }
        }
        return { layout, offset, coordinateSize, content: toLocal(content), interaction: toLocal(layer),
          exportBasis: getDiscPreviewCoordinateSize(element, 640) }
      },
      async exportPng() {
        const { config, element, offset } = window.__backgroundState
        const p = createBlankDiscSavedProject()
        const bytes = await exportDiscLabelPngBytes({
          selectedDiscTemplate: discTemplates.standardPrintableDisc,
          backgroundImageUrl: config.url, backgroundImageSize: config.imageSize,
          backgroundScale: config.scale, backgroundOffset: offset,
          previewSize: getDiscPreviewCoordinateSize(element, 640),
          steamLogoPlacement: 'none', steamBannerColors: p.steamBackupLogo.bannerColors,
          steamBannerLockupImageUrl: null, steamBannerLockupLayout: p.steamBackupLogo.lockupLayout,
          steamBannerUseTextFallback: false, steamBannerFallbackText: '',
          projectLogoAssets: p.logoAssets, projectTitleArtwork: p.titleArtwork,
          projectDiscNumberArtwork: p.discNumberArtwork, projectAdditionalArtwork: p.additionalArtwork,
          projectMetadata: p.metadata, projectRatingBadge: p.ratingBadge, projectMediaMark: p.mediaMark,
          projectPlatformMarks: p.platformMarks, projectTechnicalMarks: p.technicalMarks,
          discTextSettings: p.discText.settings, discTextValues: p.discText.values,
          discTextValueSources: p.discText.valueSources, discTextHtmlSources: p.discText.htmlSources,
          discTextStyles: p.discText.styles, discTextLayout: p.discText.layout,
          manualGameTitle: p.game.manualTitle, exportGuides: p.export.guides,
        })
        return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))))
      },
      async draw(preclipped = false) {
        const { config, element, offset } = window.__backgroundState
        const canvas = document.createElement('canvas')
        canvas.width = 406; canvas.height = 406
        const context = canvas.getContext('2d')
        const calls = []
        const draw = context.drawImage.bind(context)
        context.drawImage = (...args) => { calls.push(args.slice(1)); draw(...args) }
        if (preclipped) {
          context.beginPath(); context.arc(203, 203, 200, 0, Math.PI * 2); context.clip()
        }
        if (config.url) drawBackgroundArtwork(context, await loadImage(config.url), config.imageSize,
          config.scale, offset, getDiscPreviewCoordinateSize(element, 640), 400, 3, preclipped)
        const pixel = (x, y) => Array.from(context.getImageData(x, y, 1, 1).data)
        return { calls, red: pixel(100, 200), blue: pixel(300, 200), corner: pixel(3, 3),
          outsideContent: pixel(203, 30), png: canvas.toDataURL() }
      },
    }
  })
})
test.after(async () => {
  await page?.close()
  await browser?.close()
  await server?.close()
})

async function mount(overrides = {}) {
  browserErrors.length = 0
  await page.evaluate((config) => window.__backgroundHarness.mount(config), {
    imageSize: { width: 120, height: 120, contentBounds: { x: 20, y: 40, width: 80, height: 40 } },
    scale: 0.6, offset: { x: 12, y: -8 }, basis: 200, zoom: 1, pan: 50, ...overrides,
  })
  assert.deepEqual(browserErrors, [])
  await page.waitForFunction((basis) => window.__backgroundState?.coordinateSize === basis, overrides.basis ?? 200, { timeout: 5000 })
  await page.locator('.background-image-layer img').evaluateAll(async (images) => {
    await Promise.all(images.map((image) => image.decode()))
  })
}
const snapshot = () => page.evaluate(() => window.__backgroundHarness.snapshot())
const draw = () => page.evaluate(() => window.__backgroundHarness.draw())
function assertRect(actual, expected) {
  for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(actual[key] - expected[key]) < 0.02, `${key}: ${actual[key]} != ${expected[key]}`)
}

for (const imageSize of [{ width: 400, height: 200 }, { width: 200, height: 400 }, { width: 200, height: 200 },
  { width: 120, height: 120, contentBounds: { x: 20, y: 40, width: 80, height: 40 } }]) {
  test(`real preview and canvas consume the same geometry for ${JSON.stringify(imageSize)}`, async () => {
    await mount({ imageSize })
    const state = await snapshot()
    assertRect(state.content, state.layout.contentRect)
    assertRect(state.interaction, { x: 0, y: 0, width: 200, height: 200 })
    const output = await draw()
    const destination = output.calls[0].slice(-4)
    assert.deepEqual(destination, [3 + state.layout.contentRect.x * 2, 3 + state.layout.contentRect.y * 2,
      state.layout.contentRect.width * 2, state.layout.contentRect.height * 2])
  })
}

test('real canvas draws active source pixels, preserves colors, and clips the disc', async () => {
  await mount()
  const output = await draw()
  assert.deepEqual(output.calls, [[20, 40, 80, 40, -13, 67, 480, 240]])
  assert.deepEqual(output.red, [255, 0, 0, 255])
  assert.deepEqual(output.blue, [0, 0, 255, 255])
  assert.deepEqual(output.corner, [0, 0, 0, 0])
  assert.deepEqual(output.outsideContent, [0, 0, 0, 0])
})

test('a preclipped Disc layer stack keeps the same edge pixels as a single surface clip', async () => {
  await mount({ scale: 1 })
  const standalone = await draw()
  const preclipped = await page.evaluate(() => window.__backgroundHarness.draw(true))
  assert.equal(preclipped.png, standalone.png)
})

test('the complete Disc PNG exporter is invariant under preview zoom', async () => {
  await mount({ zoom: 1 })
  const first = await page.evaluate(() => window.__backgroundHarness.exportPng())
  await mount({ zoom: 2.5, pan: 80 })
  assert.deepEqual(await page.evaluate(() => window.__backgroundHarness.exportPng()), first)
})

test('pan and zoom cannot change saved offsets, resolved local bounds, or exported PNG bytes', async () => {
  let expected
  for (const zoom of [0.5, 1, 2, 4]) {
    await mount({ zoom, pan: 10 + zoom * 20 })
    const state = await snapshot()
    assert.equal(state.exportBasis, 200)
    assert.deepEqual(state.offset, { x: 12, y: -8 })
    assertRect(state.content, { x: -8, y: 32, width: 240, height: 120 })
    const output = await draw()
    expected ??= output.png
    assert.equal(output.png, expected)
  }
})

test('actual pointer hook converts screen deltas before shared clamping and selection measurement', async () => {
  await mount({ zoom: 2, pan: 50 })
  const box = await page.locator('#disc').boundingBox()
  await page.mouse.move(box.x + 200, box.y + 200)
  await page.mouse.down()
  await page.mouse.move(box.x + 240, box.y + 180)
  const state = await snapshot()
  assert.deepEqual(state.offset, { x: 32, y: -18 })
  assertRect(state.content, { x: 12, y: 22, width: 240, height: 120 })
  assertRect(state.interaction, { x: 0, y: 0, width: 200, height: 200 })
  await page.locator('.preview-element-outline--selected').waitFor({ timeout: 5000 })
  assert.deepEqual(await page.locator('.preview-element-outline--selected').evaluate((element) => ({
    x: parseFloat(element.style.left), y: parseFloat(element.style.top),
    width: parseFloat(element.style.width), height: parseFloat(element.style.height),
  })), { x: 0, y: 0, width: 200, height: 200 })
  await page.mouse.up()
  assert.equal(await page.locator('.preview-element-outline--selected').count(), 0)
})

for (const [name, options] of [
  ['disabled', { disabled: true }],
  ['empty', { imageSize: { width: 120, height: 120, contentBounds: { x: 0, y: 0, width: 0, height: 0 } } }],
]) {
  test(`${name} background has neither image hit target nor canvas draw`, async () => {
    await mount(options)
    assert.equal((await snapshot()).content, null)
    assert.equal((await snapshot()).interaction, null)
    assert.deepEqual((await draw()).calls, [])
  })
}

test('legacy missing image metadata retains loaded-size export fallback', async () => {
  await mount({ imageSize: null, scale: 1, offset: { x: 0, y: 0 } })
  assert.deepEqual((await draw()).calls, [[-197, 3, 800, 400]])
})
