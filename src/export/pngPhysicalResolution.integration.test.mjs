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
