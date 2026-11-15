import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

let browser, page, server, url
const errors = []
test.before(async () => {
  server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  url = `http://127.0.0.1:${server.httpServer.address().port}/src/components/testing/case-continuous-edit.html`
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
})
test.after(async () => { await page?.close(); await browser?.close(); await server?.close() })


const scaleSelector = '#cover-background-upload-local-file-scale'
const numberSelector = `${scaleSelector}-number`
async function snapshot() {
  return page.evaluate(() => window.__caseContinuousEdit.snapshot())
}
function background(state) { return state.activeSession.project.caseInsert.templates.cover.background }
async function openCase() {
  errors.length = 0
  await page.goto(url)
  await page.locator('[data-smoke-id="home-new-case-insert"]').click()
  await page.waitForFunction(() => window.__caseContinuousEdit.snapshot().activeSession?.kind === 'caseInsert')
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64; canvas.height = 64
    const context = canvas.getContext('2d')
    context.fillStyle = '#225588'; context.fillRect(0, 0, 64, 64)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('#cover-background-upload').setInputFiles({
    name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64'),
  })
  await page.waitForFunction(() => Boolean(window.__caseContinuousEdit.snapshot()
    .activeSession.project.caseInsert.templates.cover.background.imageDataUrl))
  await page.locator(scaleSelector).evaluate((element) => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true
    }
  })
  return snapshot()
}
async function pause() { await page.evaluate(() => window.__caseContinuousEdit.pauseFrames()) }
async function flush() { await page.evaluate(() => window.__caseContinuousEdit.flushFrames()) }
async function input(selector, value) {
  await page.locator(selector).evaluate((element, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(next))
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}
async function assertFinal(initial, scale) {
  const state = await snapshot()
  assert.equal(background(state).layout.scale, scale)
  assert.equal(state.activeSession.revision, initial.activeSession.revision + 1)
  await flush()
  assert.deepEqual(await snapshot(), state, 'canceled frame must not publish again')
  assert.deepEqual(errors, [])
}

for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur', 'keyup']) {
  test(`range ${event} publishes the pending final value once`, async () => {
    const initial = await openCase()
    if (event === 'blur') await page.locator(scaleSelector).focus()
    await pause()
    await input(scaleSelector, 1.73)
    assert.equal(background(await snapshot()).layout.scale, 1)
    if (event === 'blur') await page.locator(scaleSelector).evaluate((element) => element.blur())
    else await page.locator(scaleSelector).dispatchEvent(event, { key: 'ArrowRight', pointerId: 1 })
    await assertFinal(initial, 1.73)
    await page.locator(scaleSelector).dispatchEvent(event, { key: 'ArrowRight', pointerId: 1 })
    assert.equal((await snapshot()).activeSession.revision, initial.activeSession.revision + 1)
  })
}

test('painted range value stays transient until completion', async () => {
  const initial = await openCase()
  await pause()
  await input(scaleSelector, 1.73)
  await flush()
  assert.equal(await page.locator(numberSelector).inputValue(), '1.73')
  assert.equal(background(await snapshot()).layout.scale, 1)
  await page.locator(scaleSelector).dispatchEvent('pointerup', { pointerId: 1 })
  await assertFinal(initial, 1.73)
})

for (const key of ['Enter', 'Escape']) {
  test(`number ${key} finishes the latest accepted value before a frame`, async () => {
    const initial = await openCase()
    await page.locator(numberSelector).focus()
    await pause()
    await input(numberSelector, 1.73)
    await page.locator(numberSelector).dispatchEvent('keydown', { key })
    await assertFinal(initial, 1.73)
    assert.equal(await page.locator(numberSelector).inputValue(), '1.73')
  })
}

test('hiding range controls publishes a pending edit without losing saved state', async () => {
  const initial = await openCase()
  await pause()
  await input(scaleSelector, 1.73)
  await page.getByLabel('Show background image', { exact: true }).evaluate((element) => element.click())
  const state = await snapshot()
  assert.equal(background(state).layout.scale, 1.73)
  assert.equal(background(state).enabled, false)
  assert.equal(state.activeSession.revision, initial.activeSession.revision + 1)
  await flush()
  assert.deepEqual(await snapshot(), state)
  assert.deepEqual(errors, [])
})

test('Return Home captures a pending edit through the production command owner', async () => {
  const initial = await openCase()
  await pause()
  await input(scaleSelector, 1.73)
  await page.evaluate(() => window.__caseContinuousEdit.dispatch('workspace.return-home'))
  await assertFinal(initial, 1.73)
  assert.equal((await snapshot()).visibleWorkspace, 'home')
})


test('two keyboard increments before a frame retain both input steps', async () => {
  const initial = await openCase()
  await page.locator(scaleSelector).focus()
  await pause()
  await page.keyboard.down('ArrowRight')
  await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  await assertFinal(initial, 1.02)
})

const backgroundSelector = '[data-preview-editable-id="case:cover:background"]'
async function beginBackgroundDrag() {
  const target = page.locator(backgroundSelector)
  const box = await target.boundingBox()
  assert.ok(box)
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  const bounds = await page.locator('[data-smoke-id="case-preview-cover"]').boundingBox()
  assert.ok(bounds)
  return { target, x, y, box: bounds }
}

for (const end of ['pointerup', 'pointercancel', 'lostpointercapture', 'unmount']) {
  test(`Case preview drag ${end} finishes the pending point`, async () => {
    const initial = await openCase()
    const { target, x, y, box } = await beginBackgroundDrag()
    await pause()
    await page.mouse.move(x + 24, y + 12)
    assert.deepEqual(background(await snapshot()).layout, background(initial).layout)
    if (end === 'pointerup') await page.mouse.up()
    else if (end === 'unmount') {
      await page.getByLabel('Show background image', { exact: true }).evaluate((element) => element.click())
    } else if (end === 'lostpointercapture') {
      await target.evaluate((element) => element.releasePointerCapture(1))
      await page.mouse.move(x + 25, y + 12)
    } else await target.dispatchEvent('pointercancel', { pointerId: 1 })
    const final = await snapshot()
    assert.ok(Math.abs(background(final).layout.x - 2400 / box.width) < 0.0001)
    assert.ok(Math.abs(background(final).layout.y - 1200 / box.height) < 0.0001)
    assert.equal(final.activeSession.revision, initial.activeSession.revision + 1)
    await page.mouse.up()
    await flush()
    assert.deepEqual(await snapshot(), final)
    assert.deepEqual(errors, [])
  })
}


test('whole App unmount retires a pending edit without publishing to a dead session', async () => {
  const initial = await openCase()
  await pause()
  await input(scaleSelector, 1.73)
  await page.evaluate(() => window.__caseContinuousEdit.unmount())
  await flush()
  assert.deepEqual(await snapshot(), initial)
  assert.equal(await page.evaluate(() => window.__caseContinuousEdit.queuedFrames()), 0)
  assert.deepEqual(errors, [])
})

test('shared range retains immediate non-Case input and final change behavior', async () => {
  errors.length = 0
  await page.goto(`${url}?mode=neutral`)
  await page.locator('#neutral-range').focus()
  await page.keyboard.press('ArrowRight')
  assert.deepEqual(JSON.parse(await page.locator('#neutral-result').textContent()), {
    value: 11, live: 1, commits: 1,
  })
  assert.deepEqual(errors, [])
})


test('pointer release coordinates override the last move before the queued frame', async () => {
  const initial = await openCase()
  const { target, x, y, box } = await beginBackgroundDrag()
  await pause()
  await page.mouse.move(x + 24, y + 12)
  await target.dispatchEvent('pointerup', { pointerId: 1, clientX: x + 36, clientY: y + 18 })
  const final = await snapshot()
  assert.ok(Math.abs(background(final).layout.x - 3600 / box.width) < 0.0001)
  assert.ok(Math.abs(background(final).layout.y - 1800 / box.height) < 0.0001)
  assert.equal(final.activeSession.revision, initial.activeSession.revision + 1)
  await page.mouse.up()
  await flush()
  assert.deepEqual(await snapshot(), final)
  assert.deepEqual(errors, [])
})


test('clamping number control retains its existing empty-value normalization', async () => {
  const initial = await openCase()
  await page.locator(numberSelector).focus()
  await pause()
  await input(numberSelector, 1.73)
  await input(numberSelector, '')
  await page.locator(numberSelector).evaluate((element) => element.blur())
  await assertFinal(initial, 0.01)
  assert.equal(await page.locator(numberSelector).inputValue(), '0.01')
})
