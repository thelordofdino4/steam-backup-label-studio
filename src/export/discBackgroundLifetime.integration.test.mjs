// App-owned preview consumers and image load terminals only: not a cache, heap,
// full App lifecycle, native Windows, or print acceptance test.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { decodePngRgba } from '../../scripts/text-editor-smoke-png.mjs'

const repository = fileURLToPath(new URL('../../', import.meta.url))
const appModule = await readFile(new URL('./testing/discBackgroundLifetimeFixture.mjs', import.meta.url), 'utf8')
// Generated GIF89a, 128x128, two distinct fills and a shared transparent border
// and magenta marker; 60s dwell per frame. Samples cover the first frame only.
const gifBase64 = [
  'R0lGODlhgACAAIEAAC1CZAAAAP8A/wAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJcBcBACwAAAAAgACAAAAI/wADCBxIsKDBgwgT',
  'KlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJsqXLlzBjypxJs6bNmzhz6tzJs6fPnzABCB1KtKjRo0iTKl3K',
  'tGlRkE6jSp1KVSrUqlizam16davXr1q7gh1LlqnYsmjTCj2rti1Ytm7jZoUrt67Vj3bzVqWrt+9Rvn4Dr8UruLBRwIb1Ik5sdzFj',
  'uY4fu40sWS3lymgRC9jMufNmzHMJJ/VMWgBorJpLdz69VzRS1atZT00N27Tsux6X1v58Oypt2L19uz6623Zws8ONFj/ONXnR5cyX',
  '/lYdXbpzotCrI72sHXfH7mm5g9Jvnns8WfHmlaJPv/06e6rr3z91L194+fqh7+NvrX//bPr+qQdggO31RyB53x3oHUcKLrhRg/Yl',
  'CCFyBk7414AWxrefhvhxWJ+H8oH4nojskZieieahOJ6K4LHYnYvawVidjNHRyJyNx+EYnI698Xibj7IByZqQpxEJmpGYIVmZkpIx',
  '+ZiTjEGZmJSGUVmYlYJhGZiWfnHZl5eKYTghmHmR2ZiYEJpZl5qQodkgm3EBJeecdNZp55145qnnnnz26eefgAYq6KCEFmrooYgm',
  'qiifAQEAIfkECXAXAQAsAAAAAIAAgACBW0guAAAA/wD/AAAACP8AAwgcSLCgwYMIEypcyLChw4cQI0qcSLGixYsYM2rcyLGjx48g',
  'Q4ocSbKkyZMoU6pcybKly5cwY8qcSbOmzZs4c+rcybOnz58wAQgdSrSo0aNIkypdyrRpUZBOo0qdSlUq1KpYs2ptenWr169au4Id',
  'S5ap2LJo0wo9q7YtWLZu42aFK7eu1Y9281alq7fvUb5+A6/FK7iwUcCG9SJObHcxY7mOH7uNLFkt5cpoEQvYzLnzZsxzCSf1TFoA',
  'aKyaS3c+vVc0UtWrWU9NDdu07Lsel9b+fDsqbdi9fbs+utt2cLPDjRY/zjV50eXMl/5WHV26c6LQqyO9rB13x+5puYPSb557PFnx',
  '5pWiT7/9Onuq698/dS9fePn6oe/jb61//2z6/qkHYIDt9Ucged8d6B1HCi64UYP2JQghcgZO+NeAFsa3n4b4cVifh/KB+J6I7JGY',
  'nonmoTieiuCx2J2L2sFYnYzR0cicjcfhGJyOvfF4m4+yAcmakKcRCZqRmCFZmZKSMfmYk4xBmZiUhlFZmJWCYRmYln5x2ZeXimE4',
  'IZh5kdmYmBCaWZeakKHZIJtxASXnnHTWaeedeOap55589unnn4AGKuighBZq6KGIJqoonwEBADs=',
].join('')

let server, browser, cacheDir
test.before(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'sbls-disc-background-lifetime-'))
  server = await createServer({
    root: repository, cacheDir, logLevel: 'error',
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client'] },
    server: { host: '127.0.0.1', port: 0, strictPort: false },
    plugins: [{ name: 'private-background-lifetime',
      configureServer(instance) {
        instance.middlewares.use('/__lifetime', (_req, res) => {
          res.setHeader('Content-Type', 'text/html')
          res.end('<!doctype html><div id="fixture"></div><script type="module" src="/__lifetime-entry.js"></script>')
        })
      },
      resolveId(id) { return id === '/__lifetime-entry.js' ? '\0sbls-private-duration' : undefined },
      load(id) { return id === '\0sbls-private-duration' ? appModule : undefined },
    }],
  })
  await server.listen()
  browser = await chromium.launch({ headless: true, chromiumSandbox: true })
})
test.after(async () => {
  try { await browser?.close() }
  finally {
    try { await server?.close() }
    finally { if (cacheDir) await rm(cacheDir, { recursive: true, force: true }) }
  }
})

for (const size of [128, 512, 1400, 'animated']) {
  test(`actual Disc Background layer plus exporter resource lifetime: ${size}`, { timeout: 45000 }, async () => {
    const page = await browser.newPage()
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    try {
      const address = server.httpServer.address()
      assert.equal(typeof address, 'object')
      page.setDefaultTimeout(12_000)
      await page.goto(`http://127.0.0.1:${address.port}/__lifetime`)
      await page.waitForFunction(() => typeof window.runLifetimeRegression === 'function')
      const result = await page.evaluate(({ size, gifBase64 }) =>
        window.runLifetimeRegression({ size, gifBase64 }), { size, gifBase64 })
      assert.equal(result.fixture.width, size === 'animated' ? 128 : size)
      assert.equal(result.fixture.height, result.fixture.width)
      const expected = result.fixture.width / 8
      assert.deepEqual(result.fixture.bounds, { x: expected, y: expected, width: result.fixture.width - 2 * expected, height: result.fixture.width - 2 * expected })
      assert.deepEqual(result.counts, { afterAccept: 1, geometrySourceMutations: 0, importLoads: 2, enabledLoads: 1,
        disabledLoads: 0, clearLoads: 0, failedExportLoads: 1, restoredLoads: 1, retiredConnected: 0, finalPreview: 0,
        unknownTerminals: 0, pendingLoads: 0, urlsCreated: 0, urlsRevoked: 0 })
      assert.deepEqual(result.pinned, result.restored, 'asset lifetime exercise preserves output of captured R')
      assert.notDeepEqual(result.pinned, result.disabled, 'fixture covers real artwork rather than the blank control')
      const output = decodePngRgba(Buffer.from(result.pinned))
      assert.deepEqual([output.width, output.height], [1423, 1423])
      for (const [x, y] of [[0,0], [711,711]]) assert.equal(output.data[(y * output.width + x) * 4 + 3], 0)
      let magenta = 0
      for (let i = 0; i < output.data.length; i += 4) {
        if (output.data[i] === 255 && output.data[i + 1] === 0 &&
            output.data[i + 2] === 255 && output.data[i + 3] === 255) magenta++
      }
      assert.ok(magenta >= 20, 'both animation frames and all static sizes contain an opaque placement marker')
    } catch (error) {
      if (pageErrors.length) throw new Error('Private fixture page failed: ' + pageErrors.join('; '), { cause: error })
      throw error
    } finally { await page.close() }
  })
}
