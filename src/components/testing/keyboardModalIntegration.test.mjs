import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const HARNESS_PATH =
  '/src/components/testing/keyboard-modal-integration.html'

let browser
let page
let server
let harnessUrl

test.before(async () => {
  server = await createServer({
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') {
    throw new Error('Vite did not expose the keyboard/modal harness port.')
  }
  harnessUrl = `http://127.0.0.1:${address.port}${HARNESS_PATH}`
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage({ viewport: { width: 1000, height: 720 } })
})

test.after(async () => {
  await page?.close()
  await browser?.close()
  await server?.close()
})

async function openHarness() {
  await page.goto(harnessUrl)
  await page.waitForFunction(() => Boolean(window.__keyboardModalHarness))
}

async function activeSmokeId() {
  return page.evaluate(() =>
    document.activeElement?.getAttribute('data-smoke-id'))
}

async function assertViewportNotArmed() {
  assert.equal(
    await page.locator('[data-smoke-id="preview-viewport"]')
      .evaluate((element) => element.classList.contains('is-space-pan-armed')),
    false,
  )
}

test('native, custom, editable, and rail controls retain Space ownership', async () => {
  await openHarness()
  const viewport = page.locator('[data-smoke-id="preview-viewport"]')

  await page.locator('[data-smoke-id="ordinary-button"]').focus()
  await page.keyboard.press('Space')
  assert.equal(
    await page.locator('[data-smoke-id="button-activations"]').textContent(),
    '1',
  )
  await assertViewportNotArmed()

  await page.locator('[data-smoke-id="ordinary-link"]').focus()
  await page.keyboard.press('Space')
  await assertViewportNotArmed()

  const summary = page.locator('[data-smoke-id="ordinary-summary"]')
  await summary.focus()
  await page.keyboard.press('Space')
  assert.equal(await summary.evaluate((element) => element.parentElement.open), true)
  await assertViewportNotArmed()

  for (const smokeId of [
    'ordinary-input',
    'ordinary-textarea',
    'ordinary-select',
    'direct-contenteditable',
    'inherited-contenteditable',
  ]) {
    await page.locator(`[data-smoke-id="${smokeId}"]`).focus()
    await page.keyboard.press('Space')
    await assertViewportNotArmed()
  }

  for (const role of ['tab', 'menu', 'menuitem', 'switch']) {
    await page.locator(`[data-smoke-id="custom-role-${role}"]`).focus()
    await page.keyboard.press('Space')
    await assertViewportNotArmed()
  }
  assert.equal(
    await page.locator('[data-smoke-id="custom-activations"]').textContent(),
    '4',
  )

  const zoomIn = viewport.getByRole('button', { name: /Zoom in integration/ })
  await zoomIn.focus()
  await page.keyboard.press('Space')
  assert.equal(await viewport.getAttribute('data-preview-viewport-zoom'), '112')
  await assertViewportNotArmed()
})

test('Space arming respects default prevention, repeat, keyup, blur, and pointer origin', async () => {
  await openHarness()
  const viewport = page.locator('[data-smoke-id="preview-viewport"]')
  const stageOrigin = page.locator(
    '[data-smoke-id="noninteractive-preview-origin"]',
  )
  const interactive = page.locator(
    '[data-smoke-id="interactive-preview-descendant"]',
  )
  const stageBox = await stageOrigin.boundingBox()
  assert.ok(stageBox)
  await page.mouse.move(stageBox.x + 20, stageBox.y + 20)

  await page.keyboard.down('Space')
  assert.equal(await viewport.evaluate((element) =>
    element.classList.contains('is-space-pan-armed')), true)
  await viewport.dispatchEvent('pointercancel', { button: 0, pointerId: 47 })
  await assertViewportNotArmed()
  await page.keyboard.up('Space')

  await stageOrigin.focus()
  await page.mouse.move(stageBox.x + 20, stageBox.y + 20)
  await page.keyboard.down('Space')
  assert.equal(await viewport.evaluate((element) =>
    element.classList.contains('is-space-pan-armed')), true)
  await page.evaluate(() => window.__keyboardModalHarness.setViewportVisible(false))
  await page.keyboard.up('Space')
  await page.evaluate(() => window.__keyboardModalHarness.setViewportVisible(true))
  await page.locator('[data-smoke-id="preview-viewport"]').waitFor()
  await assertViewportNotArmed()

  const remountedViewport = page.locator('[data-smoke-id="preview-viewport"]')
  const remountedOrigin = page.locator(
    '[data-smoke-id="noninteractive-preview-origin"]',
  )
  const remountedBox = await remountedOrigin.boundingBox()
  assert.ok(remountedBox)
  await page.mouse.move(remountedBox.x + 20, remountedBox.y + 20)
  await remountedOrigin.focus()
  await page.keyboard.down('Space')
  assert.equal(await remountedViewport.evaluate((element) =>
    element.classList.contains('is-space-pan-armed')), true)
  await page.keyboard.up('Space')
  await assertViewportNotArmed()

  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true,
    code: 'Space',
    key: ' ',
    repeat: true,
  })))
  await assertViewportNotArmed()

  const prevented = page.locator('[data-smoke-id="default-prevented-space"]')
  await prevented.focus()
  await page.keyboard.down('Space')
  await assertViewportNotArmed()
  await page.keyboard.up('Space')

  await page.mouse.move(stageBox.x + 20, stageBox.y + 20)
  await stageOrigin.focus()
  await page.keyboard.down('Space')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await assertViewportNotArmed()
  await page.keyboard.up('Space')

  await page.mouse.move(stageBox.x + 20, stageBox.y + 20)
  await stageOrigin.focus()
  await page.keyboard.down('Space')
  const interactiveBox = await interactive.boundingBox()
  assert.ok(interactiveBox)
  await page.mouse.move(interactiveBox.x + 4, interactiveBox.y + 4)
  await page.mouse.down({ button: 'left' })
  assert.equal(await viewport.evaluate((element) =>
    element.classList.contains('is-panning')), false)
  await page.mouse.up({ button: 'left' })
  await page.keyboard.up('Space')

  await page.mouse.move(stageBox.x + 20, stageBox.y + 20)
  await stageOrigin.focus()
  await page.keyboard.down('Space')
  await page.mouse.down({ button: 'left' })
  assert.equal(await viewport.evaluate((element) =>
    element.classList.contains('is-panning')), true)
  await page.mouse.move(stageBox.x + 50, stageBox.y + 45)
  await page.mouse.up({ button: 'left' })
  await page.keyboard.up('Space')
  assert.equal(await viewport.evaluate((element) =>
    element.classList.contains('is-panning')), false)

  const currentStageBox = await stageOrigin.boundingBox()
  assert.ok(currentStageBox)
  await page.mouse.move(currentStageBox.x + 20, currentStageBox.y + 20)
  await page.mouse.down({ button: 'middle' })
  assert.equal(await viewport.evaluate((element) =>
    element.classList.contains('is-panning')), true)
  await page.mouse.move(stageBox.x + 70, stageBox.y + 55)
  await page.mouse.up({ button: 'middle' })
  assert.equal(await viewport.evaluate((element) =>
    element.classList.contains('is-panning')), false)

  const zoomBeforeWheel = await viewport.getAttribute('data-preview-viewport-zoom')
  await stageOrigin.evaluate((element, point) => {
    element.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: point.x,
      clientY: point.y,
      ctrlKey: true,
      deltaY: -120,
    }))
  }, { x: currentStageBox.x + 20, y: currentStageBox.y + 20 })
  await page.waitForFunction((before) =>
    document.querySelector('[data-smoke-id="preview-viewport"]')
      ?.getAttribute('data-preview-viewport-zoom') !== before,
  zoomBeforeWheel)
  assert.notEqual(
    await viewport.getAttribute('data-preview-viewport-zoom'),
    zoomBeforeWheel,
  )
  const fit = viewport.getByRole('button', { name: /Fit integration/ })
  await fit.focus()
  await page.keyboard.press('Space')
  assert.equal(await viewport.getAttribute('data-preview-viewport-zoom'), '100')
})

test('picker initial focus, wrapping, dismissal, and valid opener restoration are complete', async () => {
  await openHarness()
  const opener = page.locator('[data-smoke-id="image-candidate-picker-opener"]')
  await opener.focus()
  await page.keyboard.press('Space')
  await page.locator('[data-smoke-id="image-candidate-picker-dialog"]').waitFor()
  assert.equal(
    await page.locator('[role="dialog"]').getAttribute('aria-modal'),
    'true',
  )
  assert.equal(
    await page.locator('[role="dialog"]').getAttribute('aria-labelledby') !== null,
    true,
  )
  assert.equal(
    await page.locator('[data-image-candidate-item-id="selected"]')
      .evaluate((element) => element === document.activeElement),
    true,
  )
  await assertViewportNotArmed()

  await page.keyboard.press('Tab')
  assert.equal(await activeSmokeId(), 'image-candidate-picker-close')
  await page.keyboard.press('Shift+Tab')
  assert.equal(
    await page.locator('[data-image-candidate-item-id="selected"]')
      .evaluate((element) => element === document.activeElement),
    true,
  )

  await page.locator('[data-smoke-id="ordinary-button"]').evaluate((element) =>
    element.focus())
  assert.equal(
    await page.locator('[data-image-candidate-item-id="selected"]')
      .evaluate((element) => element === document.activeElement),
    true,
  )

  await page.keyboard.press('Escape')
  await page.locator('[role="dialog"]').waitFor({ state: 'detached' })
  assert.equal(await activeSmokeId(), 'image-candidate-picker-opener')

  await page.evaluate(() => window.__keyboardModalHarness.setSelectedCandidate(false))
  await opener.click()
  assert.equal(
    await page.locator('[data-image-candidate-item-id="first"]')
      .evaluate((element) => element === document.activeElement),
    true,
  )
  await page.locator('[data-smoke-id="image-candidate-picker-close"]').focus()
  await page.keyboard.press('Space')
  await page.locator('[role="dialog"]').waitFor({ state: 'detached' })
  assert.equal(await activeSmokeId(), 'image-candidate-picker-opener')

  await opener.click()
  await page.locator('.image-candidate-picker-backdrop')
    .dispatchEvent('mousedown')
  await page.locator('[role="dialog"]').waitFor({ state: 'detached' })
  assert.equal(await activeSmokeId(), 'image-candidate-picker-opener')
})

test('picker selection is single-shot and rejection leaves a usable contained dialog', async () => {
  await openHarness()
  const opener = page.locator('[data-smoke-id="image-candidate-picker-opener"]')
  await page.evaluate(() => window.__keyboardModalHarness.setPickerMode('slow'))
  await opener.click()
  const first = page.locator('[data-image-candidate-item-id="first"]')
  await first.focus()
  await page.keyboard.press('Space')
  await first.evaluate((element) => element.click())
  assert.equal(
    await page.locator('[role="dialog"]').getAttribute('aria-busy'),
    'true',
  )
  assert.equal(
    await page.locator('[role="dialog"]').evaluate((element) =>
      element === document.activeElement),
    true,
  )
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('[role="dialog"]').count(), 1)
  await page.keyboard.press('Tab')
  assert.equal(
    await page.locator('[role="dialog"]').evaluate((element) =>
      element === document.activeElement),
    true,
  )
  await page.locator('[role="dialog"]').waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => window.__keyboardModalHarness.getApplyCount()), 1)
  assert.equal(await activeSmokeId(), 'image-candidate-picker-opener')

  await page.evaluate(() => window.__keyboardModalHarness.setPickerMode('reject'))
  await opener.click()
  await page.locator('[data-image-candidate-item-id="first"]').click()
  await page.waitForFunction(() =>
    document.querySelector('[role="dialog"]')?.getAttribute('aria-busy') === 'false')
  assert.equal(await page.locator('[role="dialog"]').count(), 1)
  assert.equal(
    await page.locator('[data-image-candidate-item-id="first"]')
      .evaluate((element) => element === document.activeElement),
    true,
  )
  await page.keyboard.press('Escape')
})

test('invalid picker openers restore to a deterministic surviving fallback', async () => {
  await openHarness()
  let opener = page.locator('[data-smoke-id="image-candidate-picker-opener"]')
  await opener.click()
  await page.evaluate(() => window.__keyboardModalHarness.setOpenerDisabled(true))
  await page.keyboard.press('Escape')
  await page.locator('[role="dialog"]').waitFor({ state: 'detached' })
  assert.equal(await activeSmokeId(), 'picker-fallback')

  await page.evaluate(() => window.__keyboardModalHarness.setOpenerDisabled(false))
  opener = page.locator('[data-smoke-id="image-candidate-picker-opener"]')
  await opener.click()
  await page.evaluate(() => window.__keyboardModalHarness.setPickerVisible(false))
  await page.locator('[role="dialog"]').waitFor({ state: 'detached' })
  assert.equal(await activeSmokeId(), 'picker-fallback')
})
