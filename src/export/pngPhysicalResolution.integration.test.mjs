// Headless renderer/encoded-byte diagnostics only; never native visual or print acceptance.
import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { decodePngRgba } from '../../scripts/text-editor-smoke-png.mjs'

let server, browser, page
function chunks(input) {
  const bytes = Buffer.from(input), result = []
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), end = offset + length + 12
    assert.ok(end <= bytes.length)
    result.push({ type: bytes.toString('ascii', offset + 4, offset + 8), data: bytes.subarray(offset + 8, end - 4), bytes: bytes.subarray(offset, end) })
    offset = end
  }
  return result
}
test.before(async () => {
  server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'png-density-fixture', configureServer(instance) {
      instance.middlewares.use('/__png-density-fixture', (_request, response) => {
        response.setHeader('Content-Type', 'text/html')
        response.end('<!doctype html><title>PNG byte fixture</title>')
      })
    } }],
  })
  await server.listen()
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__png-density-fixture`)
})
test.after(async () => { await page?.close(); await browser?.close(); await server?.close() })

for (const [target, dimensions] of [['disc', [1423, 1423]], ['cover', [1414, 1414]], ['tray', [1780, 1390]]]) {
  test(`real ${target} exporter writes explicit density without pixel changes, guides on and off`, async () => {
    for (const guides of [false, true]) {
      const result = await page.evaluate(async ({ target, guides }) => {
        const [{ createBlankDiscSavedProject }, { restoreProjectStateFromContents }, { createBlankJewelCaseSavedProject }, { exportDiscLabelPngBytes }, { exportCaseInsertPngBytes }, { JEWEL_CASE_GUIDE_IDS }] = await Promise.all([
          import('/src/project/blankDiscProject.ts'), import('/src/project/restoreProjectState.ts'),
          import('/src/project/caseInsertProjectAdapters.ts'), import('/src/export/exportPng.ts'),
          import('/src/export/exportCaseInsertPng.ts'), import('/src/caseInsert/defaults.ts'),
        ])
        const state = await restoreProjectStateFromContents(JSON.stringify(createBlankDiscSavedProject()))
        const original = HTMLCanvasElement.prototype.toBlob
        let rawBytes
        HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
          original.call(this, (blob) => {
            if (!blob) { callback(blob); return }
            void blob.arrayBuffer().then((buffer) => { rawBytes = Array.from(new Uint8Array(buffer)); callback(blob) })
          }, type, quality)
        }
        try {
          let output
          if (target === 'disc') {
            output = await exportDiscLabelPngBytes({ ...state, selectedDiscTemplate: state.template.selectedDiscTemplate,
              previewSize: 600, exportGuides: { centerHole: guides, outerEdge: guides, printableArea: guides, safeZone: guides } })
          } else {
            const caseInsert = createBlankJewelCaseSavedProject().caseInsert
            caseInsert.export.guideIds = guides ? [...JEWEL_CASE_GUIDE_IDS] : []
            output = await exportCaseInsertPngBytes({ caseInsert, activeTemplatePane: target, brandingSources: state })
          }
          return { ...output, rawBytes }
        } finally { HTMLCanvasElement.prototype.toBlob = original }
      }, { target, guides })
      assert.deepEqual([result.width, result.height], dimensions)
      const parsed = chunks(result.bytes), density = parsed.filter(({ type }) => type === 'pHYs')
      assert.equal(density.length, 1)
      assert.equal(density[0].bytes.toString('hex'), '000000097048597300002e2300002e230178a53f76')
      assert.deepEqual(parsed.filter(({ type }) => type !== 'pHYs').map(({ bytes }) => bytes),
        chunks(result.rawBytes).filter(({ type }) => type !== 'pHYs').map(({ bytes }) => bytes))
      const decoded = decodePngRgba(Buffer.from(result.bytes))
      assert.deepEqual([decoded.width, decoded.height], dimensions)
      assert.deepEqual(decoded.data, decodePngRgba(Buffer.from(result.rawBytes)).data)
    }
  })
}

test('real Disc PNG pixels ignore viewport zoom and pan at a fixed local preview width', async () => {
  const variants = await page.evaluate(async () => {
    const [{ createBlankDiscSavedProject }, { restoreProjectStateFromContents },
      { getDiscPngExportPreviewWidth }, { exportDiscLabelPngBytes }] = await Promise.all([
      import('/src/project/blankDiscProject.ts'), import('/src/project/restoreProjectState.ts'),
      import('/src/app/appPngExportInputs.ts'), import('/src/export/exportPng.ts'),
    ])
    const state = await restoreProjectStateFromContents(JSON.stringify(createBlankDiscSavedProject()))
    const stage = document.createElement('div')
    const preview = document.createElement('div')
    preview.style.width = '600px'
    stage.append(preview)
    document.body.append(stage)
    try {
      const artwork = document.createElement('canvas')
      artwork.width = artwork.height = 152
      const context = artwork.getContext('2d')
      context.fillStyle = '#274051'
      context.fillRect(16, 16, 120, 120)
      context.fillStyle = '#ff00ff'
      context.fillRect(55, 49, 13, 13)
      context.fillStyle = '#00ffff'
      context.fillRect(87, 88, 11, 11)
      const params = {
        ...state, selectedDiscTemplate: state.template.selectedDiscTemplate,
        steamLogoPlacement: 'none', backgroundImageUrl: artwork.toDataURL('image/png'),
        backgroundImageSize: { width: 152, height: 152,
          contentBounds: { x: 16, y: 16, width: 120, height: 120 } },
        backgroundScale: 1.5, backgroundOffset: { x: 33, y: -7 },
        exportGuides: { centerHole: false, outerEdge: false, printableArea: false, safeZone: false },
      }
      const result = []
      for (const [zoom, panX, panY, localWidth] of [
        [1, 0, 0, 600], [0.5, -41, 62, 600], [1.12, 19, -27, 600],
        [2, -60, 29, 600], [1, 0, 0, 480],
      ]) {
        stage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
        preview.style.width = `${localWidth}px`
        const rect = preview.getBoundingClientRect()
        const previewSize = getDiscPngExportPreviewWidth(preview, 640)
        const output = await exportDiscLabelPngBytes({ ...params, previewSize })
        result.push({ localWidth, previewSize, renderedWidth: rect.width, x: rect.x, bytes: Array.from(output.bytes) })
      }
      return result
    } finally {
      stage.remove()
    }
  })
  const reference = Buffer.from(variants[0].bytes)
  const shifted = Buffer.from(variants[4].bytes)
  for (const variant of variants.slice(0, 4)) {
    assert.equal(variant.previewSize, 600)
    assert.equal(variant.localWidth, 600)
    assert.deepEqual(Buffer.from(variant.bytes), reference)
  }
  assert.deepEqual([variants[1].renderedWidth, variants[3].renderedWidth], [300, 1200])
  assert.notEqual(variants[3].x, variants[0].x)
  assert.equal(variants[4].previewSize, 480)
  assert.notDeepEqual(shifted, reference, 'negative control: a real layout-width change moves the pixels')
})
