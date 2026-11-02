import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Headless source/CSS diagnostics, not native DPI or visual acceptance.
const route = '/__ribbon-contrast'
const html = `<!doctype html><div id="root"></div><script type="module">
import { act, createElement as h, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ContextualTextRibbonHost } from '/src/components/preview/ContextualTextRibbon.tsx'
import { InlinePreviewTextEditorRibbon } from '/src/components/preview/inlinePreviewTextEditorRibbon.tsx'
import { DISC_TEXT_CONTRAST_OPTIONS } from '/src/discText/styles.ts'
import { CASE_INSERT_TEXT_CONTRAST_OPTIONS } from '/src/caseInsert/textStyles.ts'
import '/src/styles/App.css'
const selection = { start: 0, end: 4 }
const noop = () => {}
function Fixture() {
  const [value, setValue] = useState('strokeShadow')
  const [mixed, setMixed] = useState(false)
  const [width, setWidth] = useState(720)
  window.__contrast = {
    setWidth, setMixed, options: DISC_TEXT_CONTRAST_OPTIONS,
    caseOptions: CASE_INSERT_TEXT_CONTRAST_OPTIONS, value: () => value,
    calls: window.__calls ??= [],
  }
  const controls = { art: {
    color: { label: 'Text color', value: '#ffffff', onChange: noop },
    contrast: { label: 'Contrast', value, options: DISC_TEXT_CONTRAST_OPTIONS,
      getSelectionValue: () => mixed ? { state: 'mixed' } : { state: 'active', value },
      onChange: (next, range) => { window.__calls.push({ value: next, selection: range }); setValue(next); setMixed(false) } },
  } }
  return h('div', { className: 'preview-area', style: { display: 'block', width: width + 110, padding: 0 } },
    h('div', { className: 'preview-header', style: { gridTemplateColumns: '110px minmax(0, 1fr)' } },
      h('div', { className: 'preview-pane-label', style: { width: 110 } }, 'Live Preview'),
      h(ContextualTextRibbonHost, { active: true }, h(InlinePreviewTextEditorRibbon, {
        activeTab: 'art', controls, selection, getCommandSelection: () => selection,
        isCurvedText: false, sourceDraft: '', tabsRef: null, onDone: noop,
        onRibbonControlInteraction: noop, onRibbonKeyboardInteraction: noop, onRibbonMenuRef: noop,
        onRibbonPointerDown: noop, onRetainTextareaSelectionForCommands: noop, onSelectionChange: noop,
        onSourceDraftChange: noop, onTabChange: noop,
      }))), h('div', { id: 'preview-sentinel' }, 'Preview'))
}
await act(() => createRoot(document.getElementById('root')).render(h(Fixture)))
</script>`
let server, browser, page, cacheDir, url
const errors = []
test.before(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'sbls-contrast-vite-'))
  server = await createServer({ cacheDir, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client'] }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'ribbon-contrast', configureServer(vite) {
    vite.middlewares.use(async (request, response, next) => {
      if (request.url !== route) return next()
      try { response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml(route, html)) }
      catch (error) { next(error) }
    })
  } }] })
  await server.listen()
  url = `http://127.0.0.1:${server.httpServer.address().port}${route}`
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url)
  try { await page.waitForFunction(() => Boolean(window.__contrast)) }
  catch (error) { throw new Error(`Contrast fixture failed: ${errors.join('; ')}`, { cause: error }) }
})
test.after(async () => { await page?.close(); await browser?.close(); await server?.close(); if (cacheDir) await rm(cacheDir, { recursive: true, force: true }) })
const select = () => page.getByRole('combobox', { name: 'Contrast', exact: true })
async function bounds() {
  return select().evaluate(element => {
    const style = getComputedStyle(element)
    const card = element.closest('[data-ribbon-group="contrast"]')
    const colorCard = document.querySelector('[data-ribbon-group="text-color"]')
    const header = card.querySelector('.contextual-text-ribbon-group-header').getBoundingClientRect()
    const box = element.getBoundingClientRect()
    const cardBox = card.getBoundingClientRect()
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.font = style.font
    return {
      text: element.selectedOptions[0].textContent,
      color: style.color,
      textWidth: ctx.measureText(element.selectedOptions[0].textContent).width,
      usableWidth: box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth),
      fits: box.left >= header.right && box.right <= cardBox.right && box.top >= cardBox.top && box.bottom <= cardBox.bottom,
      cardWidth: cardBox.width, colorWidth: colorCard.getBoundingClientRect().width,
      previewY: document.getElementById('preview-sentinel').getBoundingClientRect().top,
    }
  })
}
for (const width of [320, 519, 719, 1200]) {
  test(`all shared Disc/Case contrast values remain readable at ${width} ribbon pixels`, async () => {
    await page.evaluate(width => window.__contrast.setWidth(width), width)
    await page.waitForFunction(width => Math.abs(document.querySelector('.contextual-text-ribbon-host').getBoundingClientRect().width - width) < 2, width)
    const { options, caseOptions } = await page.evaluate(() => window.__contrast)
    assert.deepEqual(caseOptions, options)
    let first
    for (const option of options) {
      await select().selectOption(option.value)
      const box = await bounds()
      assert.notEqual(box.color, 'rgba(0, 0, 0, 0)', JSON.stringify(box))
      assert.equal(box.text, option.label)
      assert.ok(box.usableWidth >= box.textWidth, JSON.stringify(box))
      assert.equal(box.fits, true, JSON.stringify(box))
      assert.equal(box.cardWidth, box.colorWidth)
      if (first) assert.deepEqual([box.cardWidth, box.previewY], [first.cardWidth, first.previewY])
      first = box
    }
  })
}
test('mixed selection stays visible and choosing a mode dispatches the original selection', async () => {
  await page.evaluate(() => window.__contrast.setMixed(true))
  assert.equal((await bounds()).text, 'Mixed')
  await select().selectOption('stroke')
  assert.deepEqual(await page.evaluate(() => window.__calls.at(-1)), { value: 'stroke', selection: { start: 0, end: 4 } })
  assert.equal(await page.evaluate(() => window.__contrast.value()), 'stroke')
  assert.deepEqual(errors, [])
})
