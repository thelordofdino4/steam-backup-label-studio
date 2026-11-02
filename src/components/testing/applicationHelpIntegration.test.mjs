import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

let server, browser, page, url
const loadErrors = []
test.before(async () => {
  server = await createServer({
    // Parallel fixture servers must not mutate one shared Vite dependency cache.
    cacheDir: 'node_modules/.vite-test-application-help', logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  url = `http://127.0.0.1:${server.httpServer.address().port}/src/components/testing/application-help-integration.html`
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage({ viewport: { width: 1000, height: 720 } })
  page.on('pageerror', error => { if (loadErrors.length < 12) loadErrors.push(error.message) })
  page.on('response', response => { if (response.status() >= 400 && loadErrors.length < 12) loadErrors.push(`${response.status()} ${new URL(response.url()).pathname}`) })
})
test.after(async () => { await page?.close(); await browser?.close(); await server?.close() })
async function load() {
  loadErrors.length = 0
  await page.goto(url)
  try { await page.waitForFunction(() => Boolean(window.__applicationHelpHarness)) }
  catch (cause) { throw new Error(`Help fixture did not mount: ${JSON.stringify(loadErrors)}`, { cause }) }
}
async function focusId() { return page.evaluate(() => document.activeElement?.id) }
const opener = () => page.getByRole('button', { name: 'Help and local diagnostics' })
const panel = () => page.getByRole('region', { name: 'Steam Backup Label Studio Help' })

test('Home can open offline Help without a native menu; select/refresh keeps a private local snapshot and project unchanged', async () => {
  await load()
  const before = await page.evaluate(() => window.__applicationHelpHarness.getLifecycle())
  await opener().click()
  assert.equal(await focusId(), 'application-help-heading')
  assert.equal(await panel().count(), 1)
  const report = page.getByLabel('Diagnostic report', { exact: true })
  const original = await report.inputValue()
  assert.doesNotMatch(original, /private|token|path/)
  assert.equal(JSON.parse(original).records.length, 1)
  assert.equal(await report.getAttribute('readonly'), '')
  assert.equal(await panel().locator('a').count(), 0)
  await page.getByRole('button', { name: 'Select report', exact: true }).click()
  const selection = await report.evaluate(element => [element.selectionStart, element.selectionEnd])
  assert.deepEqual(selection, [0, original.length])
  await page.evaluate(() => window.__applicationHelpHarness.addCommand())
  assert.equal(await report.inputValue(), original)
  await page.getByRole('button', { name: 'Refresh report', exact: true }).click()
  assert.equal(JSON.parse(await report.inputValue()).records.length, 2)
  assert.equal(await panel().getByRole('status').textContent(), 'Report refreshed.')
  assert.deepEqual(await page.evaluate(() => window.__applicationHelpHarness.getLifecycle()), before)
  await page.getByRole('button', { name: 'Close Help', exact: true }).click()
  assert.equal(await panel().count(), 0)
  assert.equal(await opener().evaluate(element => element === document.activeElement), true)
})

test('Help rechecks application and native modal ownership before direct/menu activation', async () => {
  await load()
  await page.evaluate(() => window.__applicationHelpHarness.setModal(true))
  await page.waitForFunction(() => document.querySelector('[aria-modal="true"]'))
  assert.equal(await page.evaluate(() => window.__applicationHelpHarness.invoke()), false)
  assert.equal(await panel().count(), 0)
  assert.equal(await opener().isDisabled(), true)
  await page.evaluate(() => window.__applicationHelpHarness.setModal(false))
  await page.waitForFunction(() => !document.querySelector('[aria-modal="true"]'))
  await page.evaluate(() => window.__applicationHelpHarness.setBusy(true))
  assert.equal(await page.evaluate(() => window.__applicationHelpHarness.invoke()), false)
  await page.evaluate(() => window.__applicationHelpHarness.setBusy(false))
  assert.equal(await page.evaluate(() => window.__applicationHelpHarness.invoke()), true)
  await page.waitForSelector('#application-help-heading')
})

test('Escape closes only from Help and restores a surviving registered fallback when the opener disappears', async () => {
  await load()
  await opener().click()
  await page.evaluate(() => window.__applicationHelpHarness.removeOpener())
  await page.waitForFunction(() => !document.querySelector('.home-shell'))
  await page.getByLabel('Diagnostic report', { exact: true }).press('Escape')
  assert.equal(await panel().count(), 0)
  assert.equal(await focusId(), 'help-fallback')
})

test('report creation/refresh failures use safe copy without leaking raw errors or losing the current report', async () => {
  await load()
  await page.evaluate(() => window.__applicationHelpHarness.setReportFailure(true))
  await opener().click()
  assert.equal(await panel().count(), 0)
  assert.deepEqual(await page.evaluate(() => window.__applicationHelpHarness.getMessages()), ['Help could not be opened. Try again.'])
  assert.equal(await opener().evaluate(element => element === document.activeElement), true)
  await page.evaluate(() => window.__applicationHelpHarness.setReportFailure(false))
  await opener().click()
  const report = page.getByLabel('Diagnostic report', { exact: true })
  const original = await report.inputValue()
  await page.evaluate(() => window.__applicationHelpHarness.setReportFailure(true))
  await page.getByRole('button', { name: 'Refresh report', exact: true }).click()
  assert.equal(await report.inputValue(), original)
  assert.equal(await panel().getByRole('status').textContent(), 'The report could not be refreshed. Try again.')
  assert.doesNotMatch(await panel().textContent(), /private/)
})

test('reopening focuses one Help heading, and a remounted presentation retains its report and focus', async () => {
  await load()
  await opener().click()
  await page.getByLabel('Diagnostic report', { exact: true }).focus()
  await page.evaluate(() => window.__applicationHelpHarness.invoke())
  await page.waitForFunction(() => document.activeElement?.id === 'application-help-heading')
  assert.equal(await panel().count(), 1)
  const report = await page.getByLabel('Diagnostic report', { exact: true }).inputValue()
  await page.evaluate(() => window.__applicationHelpHarness.moveSurface())
  await page.waitForFunction(() => document.activeElement?.id === 'application-help-heading')
  assert.equal(await page.getByLabel('Diagnostic report', { exact: true }).inputValue(), report)
  await page.getByRole('button', { name: 'Close Help', exact: true }).click()
  assert.equal(await opener().evaluate(element => element === document.activeElement), true)
})


test('a failed presentation handoff restores its opener and uses shared safe failure feedback', async () => {
  await load()
  await page.evaluate(() => window.__applicationHelpHarness.setCloseFailure(true))
  await opener().click()
  assert.equal(await panel().count(), 0)
  assert.equal(await opener().evaluate(element => element === document.activeElement), true)
  assert.deepEqual(await page.evaluate(() => window.__applicationHelpHarness.getMessages()), ['Help could not be opened. Try again.'])
})
