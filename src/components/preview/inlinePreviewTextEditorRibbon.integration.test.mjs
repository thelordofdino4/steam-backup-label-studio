import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Headless accessibility/interaction diagnostics, not native visual acceptance.
const route = '/__ribbon-category-state'
const html = `<!doctype html><div id="root"></div><script type="module">
import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { InlinePreviewTextEditorRibbon } from '/src/components/preview/inlinePreviewTextEditorRibbon.tsx'
import '/src/styles/app-contextual-text-ribbon.css'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const selection = { start: 0, end: 0 }
const noop = () => {}
function Fixture() {
  const [activeTab, setActiveTab] = useState('presets')
  const [thickness, setThickness] = useState(0)
  window.__setRibbonCategory = tab => act(() => setActiveTab(tab))
  const controls = {
    art: {
      borderEnabled: { label: 'Border', checked: true, onChange: noop },
      borderRadius: { label: 'Radius', min: 0, max: 4, step: 0.1, value: 1, onChange: noop },
      borderThickness: { label: 'Line thickness', min: 0, max: 100, step: 1, value: thickness, onChange: setThickness },
    },
  }
  return createElement('div', { className: 'preview-area', style: { display: 'block' } },
    createElement('div', { id: 'ribbon-width', className: 'contextual-text-ribbon-host has-controls', style: { width: '450px' } },
      createElement(InlinePreviewTextEditorRibbon, {
    activeTab, onTabChange: setActiveTab, controls,
    getCommandSelection: () => selection, isCurvedText: false, selection,
    sourceDraft: '', tabsRef: null, onDone: noop, onRibbonControlInteraction: noop,
    onRibbonKeyboardInteraction: noop, onRibbonMenuRef: noop, onRibbonPointerDown: noop,
    onRetainTextareaSelectionForCommands: noop, onSelectionChange: noop,
    onSourceDraftChange: noop,
  })))
}
await act(() => createRoot(document.getElementById('root')).render(createElement(Fixture)))
</script>`
let server
let browser
let page
test.before(async () => {
  server = await createServer({
    cacheDir: 'node_modules/.vite-ribbon-category-state',
    logLevel: 'silent', server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'ribbon-category-state', configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        if (request.url !== route) return next()
        try {
          response.setHeader('Content-Type', 'text/html')
          response.end(await vite.transformIndexHtml(route, html))
        } catch (error) { next(error) }
      })
    } }],
  })
  await server.listen()
  const address = server.httpServer.address()
  browser = await chromium.launch({ headless: true, chromiumSandbox: true })
  page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${address.port}${route}`)
  await page.waitForFunction(() => Boolean(window.__setRibbonCategory))
})
test.after(async () => {
  await page?.close()
  await browser?.close()
  await server?.close()
})

const categories = ['presets', 'text', 'art', 'utilities', 'html']
const labels = ['Presets', 'Text', 'Artistic', 'Utilities', 'HTML']
const group = () => page.getByRole('group', { name: 'Text formatting categories' })
async function verifyCategory(active) {
  const buttons = await group().getByRole('button').evaluateAll((elements) => elements.map((element) => ({
    id: element.getAttribute('data-smoke-id'), label: element.textContent.trim(),
    pressed: element.getAttribute('aria-pressed'), active: element.classList.contains('is-active'),
    tag: element.tagName, type: element.getAttribute('type'), tabIndex: element.tabIndex,
  })))
  assert.deepEqual(buttons.map(({ label }) => label), labels)
  assert.deepEqual(buttons.map(({ id }) => id), categories.map((id) => `inline-text-tab-${id}`))
  assert.equal(buttons.filter(({ pressed }) => pressed === 'true').length, 1)
  for (const [index, button] of buttons.entries()) {
    assert.equal(button.pressed, String(categories[index] === active))
    assert.equal(button.active, categories[index] === active)
    assert.equal(button.tag, 'BUTTON')
    assert.equal(button.type, 'button')
    assert.equal(button.tabIndex, 0)
  }
}
for (const category of categories) {
  test(`controlled ${category} category is the only pressed button`, async () => {
    await page.evaluate((value) => window.__setRibbonCategory(value), category)
    await verifyCategory(category)
  })
}
for (const action of ['click', 'Enter', 'Space']) {
  test(`button ${action} updates category state without changing button semantics`, async () => {
    await page.evaluate(() => window.__setRibbonCategory('presets'))
    const button = group().getByRole('button', { name: 'Artistic', exact: true })
    if (action === 'click') await button.click()
    else { await button.focus(); await button.press(action) }
    await verifyCategory('art')
  })
}
test('activating the current category keeps exactly one category pressed', async () => {
  await page.evaluate(() => window.__setRibbonCategory('text'))
  await group().getByRole('button', { name: 'Text', exact: true }).click()
  await verifyCategory('text')
})

test('Artistic border ranges share track geometry and fully show Line thickness at 100%', async () => {
  await page.evaluate(() => window.__setRibbonCategory('art'))
  const thickness = page.getByRole('slider', { name: 'Line thickness', exact: true })
  await thickness.press('End')
  assert.equal(await thickness.inputValue(), '100')
  assert.equal(await page.getByRole('spinbutton', { name: /Line thickness: 100%/ }).inputValue(), '100')
  for (const width of [420, 680, 780]) {
    await page.evaluate(width => { document.querySelector('#ribbon-width').style.width = width + 'px' }, width)
    const g = await thickness.evaluate(node => {
      const card = node.closest('[data-ribbon-group="border"]')
      const radius = card.querySelector('[data-smoke-id="inline-text-range-radius"]')
      const label = node.parentElement.querySelector('.contextual-text-ribbon-control-label')
      const labelText = new Range()
      labelText.selectNodeContents(label)
      const track = node.getBoundingClientRect()
      const other = radius.getBoundingClientRect()
      return { trackLeft: track.left, trackWidth: track.width, otherLeft: other.left,
        otherWidth: other.width, labelRight: labelText.getBoundingClientRect().right }
    })
    assert.ok(g.labelRight <= g.trackLeft, JSON.stringify({ width, g }))
    assert.ok(g.trackWidth >= 58 && Math.abs(g.trackWidth - g.otherWidth) < 0.1, JSON.stringify({ width, g }))
    assert.ok(Math.abs(g.trackLeft - g.otherLeft) < 0.1, JSON.stringify({ width, g }))
  }
})
