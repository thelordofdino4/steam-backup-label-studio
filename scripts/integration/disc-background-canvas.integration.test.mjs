// Headless Chromium coverage of actual Disc canvas behavior; not native acceptance.
import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const selector = '.background-image-layer[aria-label="Uploaded background image layer"]'
const read = page => page.evaluate(() => globalThis.discCanvasFixture.read())
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
const near = (a, b, detail) => assert.ok(Number.isFinite(a) && Math.abs(a - b) <= 1, detail)

function assertTrustedGesture(events, terminal) {
  assert.ok(events.length >= 5 && events.length < 64)
  const id = events[0].pointerId
  assert.ok(events.every(e => e.trusted && e.pointerType === 'touch' && e.pointerId === id))
  const types = events.map(e => e.type)
  assert.deepEqual(types.slice(0, 2), ['pointerdown','gotpointercapture'])
  assert.deepEqual(types.slice(-2), [terminal,'lostpointercapture'])
  assert.ok(types.slice(2,-2).every(type => type === 'pointermove'))
}

test('trusted Disc background canvas cancellation restores placement; release commits once', { timeout: 60000 }, async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'sbls-canvas-test-'))
  let server, browser
  try {
    server = await createServer({
      logLevel: 'silent', cacheDir, server: { host: '127.0.0.1', port: 0, hmr: false },
      plugins: [{
        name: 'sbls-disc-background-canvas-test',
        configureServer(vite) {
          vite.middlewares.use('/__sbls-disc-canvas-test', (_request, response) => {
            response.setHeader('Content-Type', 'text/html')
            response.end('<!doctype html><div id="root"></div><script type="module" src="/scripts/integration/disc-background-canvas.fixture.mjs"></script>')
          })
        },
      }],
    })
    await server.listen()
    const url = 'http://127.0.0.1:'+server.httpServer.address().port
    browser = await chromium.launch({ headless: true, chromiumSandbox: true })
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
    await context.route('**/*', route =>
      route.request().url().startsWith(url+'/') || route.request().url().startsWith('data:')
        ? route.continue() : route.abort())
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(url+'/__sbls-disc-canvas-test')
    await page.locator('[data-smoke-id="home-resume-project"]').click()
    const layer = page.locator(selector)
    await layer.waitFor({ state: 'visible' })
    assert.equal(await layer.count(), 1)
    await page.waitForFunction(() => {
      const v = globalThis.discCanvasFixture.read()
      return v.artLoaded && v.placement !== null && v.ratio > 0
    })
    await settle(page)

    const before = await read(page)
    assert.equal(before.id, 'generated-disc-canvas')
    assert.equal(before.scale, 1.5)
    assert.deepEqual(before.offset, { x: 0, y: 0 })
    const client = await context.newCDPSession(page)
    const dx = 26, dy = -17
    const point = (x, y) => ({ x, y, id: 1, radiusX: 1, radiusY: 1 })
    const touch = (type, touchPoints) => client.send('Input.dispatchTouchEvent', { type, touchPoints })
    try {
      for (const [terminal, gestureEnd, delta] of [['pointercancel','touchCancel',0],['pointerup','touchEnd',1]]) {
        const start = await layer.evaluate((node, { dx, dy }) => {
          const r = node.getBoundingClientRect()
          for (const fy of [.32,.42,.58,.68]) for (const fx of [.32,.44,.56,.68]) {
            const x = Math.round(r.left+r.width*fx), y = Math.round(r.top+r.height*fy)
            const hit = document.elementFromPoint(x,y)
            if (x+dx>0 && y+dy>0 && x+dx<innerWidth && y+dy<innerHeight &&
                hit instanceof Element && (hit===node || node.contains(hit))) return { x, y }
          }
          return null
        }, { dx, dy })
        assert.ok(start, 'expected an actual visible hit on the Disc background layer')
        await page.evaluate(() => globalThis.discCanvasFixture.arm())
        await touch('touchStart',[point(start.x,start.y)])
        await touch('touchMove',[point(start.x+dx,start.y+dy)])
        await page.waitForFunction(old=>{
          const v=globalThis.discCanvasFixture.read()
          return v.captured && v.placement && v.placement.x!==old.x && v.placement.y!==old.y
        },before.placement)
        const held = await read(page)
        assert.equal(held.id,before.id)
        assert.equal(held.revision,before.revision)
        assert.deepEqual(held.offset,before.offset)
        assert.equal(held.ratio,before.ratio)
        near(held.placement.width,before.placement.width,'held width')
        near(held.placement.height,before.placement.height,'held height')
        const expected={x:dx/before.ratio,y:dy/before.ratio}
        for (const axis of ['x','y']) near(held.placement[axis]-before.placement[axis],expected[axis],`held ${axis}`)
        await touch(gestureEnd,[])
        await page.waitForFunction(({ rev, restoring, placement })=>{
          const v=globalThis.discCanvasFixture.read()
          return v.revision===rev && !v.captured && (!restoring || v.placement && ['x','y','width','height'].every(key => v.placement[key]===placement[key]))
        },{rev:before.revision+delta,restoring:delta===0,placement:before.placement})
        await settle(page)
        const end = await read(page)
        const proof = await page.evaluate(() => globalThis.discCanvasFixture.drain())
        assertTrustedGesture(proof.events,terminal)
        assert.equal(proof.transitions.length,delta)
        assert.equal(end.id,before.id)
        assert.equal(end.revision,before.revision+delta)
        assert.equal(end.scale,before.scale)
        if (!delta) {
          assert.deepEqual(end.offset,before.offset)
          assert.deepEqual(end.placement,before.placement)
        } else {
          const [{from,to}] = proof.transitions
          assert.equal(from.id,before.id)
          assert.equal(from.revision,before.revision)
          assert.equal(to.id,before.id)
          assert.equal(to.revision,before.revision+1)
          for (const axis of ['x','y']) {
            near(end.offset[axis]-before.offset[axis],expected[axis],`committed offset ${axis}`)
            near(end.placement[axis]-before.placement[axis],expected[axis],`retained preview ${axis}`)
          }
        }
      }
    } finally {
      await client.detach()
    }
    const committed = await read(page)
    await page.locator('#background-upload').setInputFiles({
      name: 'private-artwork-sample.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    })
    await page.waitForFunction(() => globalThis.discCanvasFixture.diagnostics().at(-1)?.status === 'failure')
    const failures = await page.evaluate(() => globalThis.discCanvasFixture.diagnostics())
    assert.equal(failures.length,1)
    assert.equal(failures[0].stage,'validate')
    assert.equal(failures[0].failureCode,'image.validation-failed')
    assert.doesNotMatch(JSON.stringify(failures),/private-artwork|image\/svg|base64/)
    const afterRejectedUpload = await read(page)
    assert.equal(afterRejectedUpload.revision,committed.revision)
    assert.deepEqual(afterRejectedUpload.offset,committed.offset)
    assert.deepEqual(errors,[])
  } finally {
    await browser?.close()
    await server?.close()
    await rm(cacheDir, { recursive: true, force: true })
  }
})
