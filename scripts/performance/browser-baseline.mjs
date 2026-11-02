import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fixtureIds } from './fixtures.mjs'

if (process.argv.length !== 3) throw new Error('Usage: node --experimental-strip-types scripts/performance/browser-baseline.mjs <generated-run-directory>')
const directory = resolve(process.argv[2])
let server, browser
try {
  server = await createServer({
    logLevel: 'silent', server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'performance-fixture', configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        const id = fixtureIds.find(id => request.url === `/__performance/${id}.json`)
        if (request.url === '/__performance') {
          response.setHeader('Content-Type', 'text/html')
          response.end('<!doctype html><title>Headless benchmark fixture</title>')
        } else if (id) {
          try {
            response.setHeader('Content-Type', 'application/json')
            response.end(await readFile(join(directory, id, 'project.json')))
          } catch (error) { next(error) }
        } else next()
      })
    } }],
  })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('Missing benchmark port')
  browser = await chromium.launch({ headless: true })
  const results = []
  for (const id of fixtureIds) {
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${address.port}/__performance`)
    const result = await page.evaluate(async id => {
      const [canvas, bounds, restore, blank, discExport, caseExport] = await Promise.all([
        import('/src/export/canvasImage.ts'), import('/src/image/imageContentBounds.ts'),
        import('/src/project/restoreProjectState.ts'), import('/src/project/blankDiscProject.ts'),
        import('/src/export/exportPng.ts'), import('/src/export/exportCaseInsertPng.ts'),
      ])
      const project = await (await fetch(`/__performance/${id}.json`)).json()
      const isDisc = project.projectType === 'disc'
      const background = isDisc ? project.background : project.caseInsert.templates.cover.background
      async function measure(run) {
        const durations = []
        let last
        for (let i = 0; i <= 5; i++) {
          const start = performance.now()
          last = await run()
          if (i) durations.push(performance.now() - start)
        }
        return { durations, last }
      }
      const decoded = await measure(() => canvas.loadImage(background.imageDataUrl))
      const analyzed = await measure(() => bounds.createImageSizeWithDetectedContentBounds(decoded.last))
      const state = await restore.restoreProjectStateFromContents(JSON.stringify(
        isDisc ? project : blank.createBlankDiscSavedProject()))
      const exportResults = {}
      const targets = isDisc ? ['disc'] : ['cover', 'tray']
      for (const target of targets) {
        const rendered = await measure(async () => {
          if (isDisc) return discExport.exportDiscLabelPngBytes({ ...state,
            selectedDiscTemplate: state.template.selectedDiscTemplate, previewSize: 600,
            exportGuides: { centerHole: false, outerEdge: false, printableArea: false, safeZone: false },
          })
          project.caseInsert.export.guideIds = []
          return caseExport.exportCaseInsertPngBytes({ caseInsert: project.caseInsert,
            activeTemplatePane: target, brandingSources: state })
        })
        exportResults[target] = { durationMs: rendered.durations,
          width: rendered.last.width, height: rendered.last.height,
          pngBytes: rendered.last.bytes.length }
      }
      return { id, imageDecodeMs: decoded.durations, activePixelAnalysisMs: analyzed.durations,
        decodedDimensions: [decoded.last.naturalWidth, decoded.last.naturalHeight],
        analyzedDimensions: [analyzed.last.width, analyzed.last.height], exportResults }
    }, id)
    assert.deepEqual(result.decodedDimensions, result.analyzedDimensions)
    for (const exported of Object.values(result.exportResults)) assert.ok(exported.pngBytes > 8)
    results.push(result)
    await page.close()
  }
  await writeFile(join(directory, 'browser-baseline.json'), JSON.stringify({
    formatVersion: 1, browserVersion: browser.version(), warmup: 1, samples: 5, results,
    limitations: ['Headless Chromium diagnostics only; not native Tauri/WebView acceptance',
      'Warm URL/image caches; no cold decoder claim', 'No UI input or whole-app memory measurement',
      'Wall time includes awaited image/PNG work; not a main-thread CPU profile'],
  }, null, 2), { flag: 'wx' })
  console.log('Measured browser image decode, active-pixel analysis and real Disc/Cover/Tray export paths for six fixtures.')
} finally {
  await browser?.close()
  await server?.close()
}
