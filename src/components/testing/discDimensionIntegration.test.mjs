import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
let browser, page, server, url
test.before(async () => {
  server = await createServer({ logLevel: 'silent', cacheDir: 'node_modules/.vite-dimension-tests',
    server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  url = 'http://127.0.0.1:' + server.httpServer.address().port + '/src/components/testing/disc-dimension-integration.html'
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage({ viewport: { width: 1000, height: 720 } })
})
test.after(async () => { await page?.close(); await browser?.close(); await server?.close() })
async function open() {
  await page.goto(url)
  await page.getByText('Template', { exact: true }).click()
  await page.getByLabel('Disc type').selectOption('custom')
}
async function committed() { return JSON.parse(await page.getByTestId('committed').textContent()) }
const field = label => page.getByLabel(new RegExp('^' + label))
test('empty invalid draft remains editable without committing or clamping', async () => {
  await open()
  const before = await committed()
  const input = field('Outer diameter')
  await input.fill('')
  assert.equal(await input.inputValue(), '')
  assert.equal(await input.getAttribute('aria-invalid'), 'true')
  assert.deepEqual(await committed(), before)
})
test('cross-field conflict remains visible and associated with both controls', async () => {
  await open()
  const before = await committed()
  const input = field('Safe zone')
  await input.fill('119')
  assert.equal(await input.inputValue(), '119')
  assert.equal(await input.getAttribute('aria-invalid'), 'true')
  assert.equal(await field('Outer print boundary').getAttribute('aria-invalid'), 'true')
  const description = await input.getAttribute('aria-describedby')
  assert.ok(description)
  assert.match(await page.locator('[id="' + description + '"]').textContent(), /printable|print boundary/i)
  assert.deepEqual(await committed(), before)
})
test('valid edit retains the established commit and clamp behavior', async () => {
  await open()
  const before = await committed()
  await field('Safe zone').fill('110')
  const after = await committed()
  assert.equal(after.custom.safeDiameterMm, 110)
  assert.equal(after.selected.safeDiameterMm, 110)
  assert.equal(after.clamps, before.clamps + 1)
})

test('partial, nonnumeric, nonfinite and out-of-range drafts preserve focus and committed consumers', async () => {
  await open()
  const before = await committed()
  const input = field('Outer diameter')
  for (const raw of ['-', '1.', '1e', 'NaN', 'Infinity', '306', '0x80', '-20']) {
    await input.fill(raw)
    assert.equal(await input.inputValue(), raw)
    assert.equal(await input.getAttribute('aria-invalid'), 'true')
    assert.equal(await input.evaluate(element => element === document.activeElement), true)
    assert.deepEqual(await committed(), before)
  }
  await input.fill('125.5')
  assert.equal(await input.getAttribute('aria-invalid'), null)
  assert.equal(await input.getAttribute('aria-describedby'), null)
  const after = await committed()
  assert.equal(after.custom.outerDiameterMm, 125.5)
  assert.equal(after.exportSize, Math.round(125.5 / 25.4 * 300))
  assert.equal(after.clamps, before.clamps + 1)
})

test('correcting the other field commits the complete draft once and clears both associations', async () => {
  await open()
  const before = await committed()
  await field('Safe zone').fill('119')
  await field('Outer print boundary').fill('120')
  const after = await committed()
  assert.equal(after.custom.safeDiameterMm, 119)
  assert.equal(after.custom.printableDiameterMm, 120)
  assert.equal(after.clamps, before.clamps + 1)
  for (const label of ['Safe zone', 'Outer print boundary']) {
    assert.equal(await field(label).getAttribute('aria-invalid'), null)
    assert.equal(await field(label).getAttribute('aria-describedby'), null)
  }
})

test('real content guardrail keeps the draft and last valid geometry until correction', async () => {
  await open()
  await page.getByRole('button', { name: 'Toggle badge guardrail' }).click()
  const before = await committed()
  await field('Inner print boundary').fill('100')
  const rejected = await committed()
  assert.equal(await field('Inner print boundary').inputValue(), '100')
  assert.equal(await field('Inner print boundary').getAttribute('aria-invalid'), 'true')
  assert.match(rejected.status, /rating badge/)
  assert.deepEqual({ ...rejected, status: before.status }, before)
  await field('Inner print boundary').fill('40')
  const recovered = await committed()
  assert.equal(recovered.custom.innerHoleDiameterMm, 40)
  assert.equal(recovered.clamps, before.clamps + 1)
  assert.equal(await field('Inner print boundary').getAttribute('aria-invalid'), null)
})

test('selection change, project reset and restore discard only the transient draft', async () => {
  await open()
  await field('Safe zone').fill('110')
  await field('Safe zone').fill('-')
  await page.getByLabel('Disc type').selectOption('standardPrintableDisc')
  await page.getByLabel('Disc type').selectOption('custom')
  assert.equal(await field('Safe zone').inputValue(), '110')
  assert.equal(await field('Safe zone').getAttribute('aria-invalid'), null)
  await field('Safe zone').fill('-')
  await page.getByRole('button', { name: 'Restore saved dimensions' }).click()
  assert.equal(await field('Safe zone').inputValue(), '100')
  assert.equal(await field('Safe zone').getAttribute('aria-invalid'), null)
  await field('Safe zone').fill('-')
  await page.getByRole('button', { name: 'Reset project', exact: true }).click()
  await page.getByLabel('Disc type').selectOption('custom')
  assert.equal(await field('Safe zone').inputValue(), '112')
  assert.equal(await field('Safe zone').getAttribute('aria-invalid'), null)
})

test('inline errors wrap within the mounted narrow panel without displacing keyboard navigation', async () => {
  await open()
  await page.setViewportSize({ width: 360, height: 720 })
  try {
    const input = field('Safe zone')
    await input.fill('119')
    const errorId = await input.getAttribute('aria-describedby')
    const error = page.locator('[id="' + errorId + '"]')
    const box = await error.boundingBox()
    assert.ok(box && box.width > 200 && box.x + box.width <= 360)
    assert.equal(await error.evaluate(element => element.scrollWidth <= element.clientWidth), true)
    await input.press('Shift+Tab')
    assert.equal(await field('Outer print boundary').evaluate(element => element === document.activeElement), true)
    await field('Outer print boundary').press('Tab')
    assert.equal(await input.evaluate(element => element === document.activeElement), true)
  } finally { await page.setViewportSize({ width: 1000, height: 720 }) }
})