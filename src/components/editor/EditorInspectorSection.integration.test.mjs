import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Mounted DOM/keyboard/CSS diagnostics only; native size/DPI acceptance is separate.
const route = '/__inspector-sections'
const html = `<!doctype html><div id="root"></div><script type="module">
import { act, createElement as h, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EditorNavigationRolePanel } from '/src/components/editor/EditorNavigationShell.tsx'
import { EditorFeaturePanel } from '/src/components/editor/EditorPanel.tsx'
import { OptionalFeatureSection } from '/src/components/editor/OptionalFeatureSection.tsx'
import { RepeatedVisualElementCard } from '/src/components/sidebar/RepeatedVisualElementCard.tsx'
import { CaseInsertSpineControlSections } from '/src/components/caseInsert/CaseInsertSpineControlSections.tsx'
import { createDefaultJewelCaseSpineState } from '/src/caseInsert/defaults.ts'
import '/src/styles/App.css'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const initial = { enabled: false, label: 'Saved label', customImage: 'saved-image', x: 27, scale: 1.3 }
const saved = Object.fromEntries(['Disc', 'Front', 'Back', 'left', 'right'].map(id => [id, { ...initial }]))
function Fixture() {
  const [owners, setOwners] = useState(saved)
  const [mirrored, setMirrored] = useState(false)
  const [legacyOpen, setLegacyOpen] = useState(false)
  const sectionRef = useRef(null)
  const detailsRef = useRef(null)
  const summaryRef = useRef(null)
  window.__inspector = {
    snapshot: () => structuredClone(owners),
    setMirrored: value => act(() => setMirrored(value)),
    refs: () => ({ section: sectionRef.current?.tagName, details: detailsRef.current?.tagName, summary: summaryRef.current?.tagName }),
    legacyOpen: () => legacyOpen,
    focusSection: () => sectionRef.current.querySelector('input').focus(),
  }
  const update = (id, patch) => setOwners(current => ({ ...current, [id]: { ...current[id], ...patch } }))
  const controls = id => h(EditorFeaturePanel, { title: id + ' feature', open: false, inspectorSectionRef: id === 'Disc' ? sectionRef : undefined },
    h(OptionalFeatureSection, { enabled: owners[id].enabled, enableLabel: 'Show ' + id, onEnabledChange: enabled => update(id, { enabled }) },
      h('label', null, id + ' value', h('input', { value: owners[id].label, onChange: event => update(id, { label: event.target.value }) }))))
  return h('div', { className: 'sidebar', style: { width: '100%', maxWidth: 480, padding: 12, overflow: 'auto', height: '100vh' } },
    ...['Disc', 'Front', 'Back'].map(id => h(EditorNavigationRolePanel, { key: id, label: id + ' role', smokeId: id }, controls(id))),
    h(EditorNavigationRolePanel, { label: 'Spine role', smokeId: 'spine' },
      h(CaseInsertSpineControlSections, { spine: { ...createDefaultJewelCaseSpineState('Saved title'), mirrored }, renderControls: ({ side }) => controls(side) })),
    h(EditorNavigationRolePanel, { label: 'Repeated role', smokeId: 'repeated' },
      h(EditorFeaturePanel, { title: 'Additional artwork' },
        h(RepeatedVisualElementCard, { title: 'Artwork item', label: 'Saved card', labelInputId: 'card-label', enabled: true, enableLabel: 'Show card', summary: 'Saved image', onEnabledChange: () => {}, onLabelChange: () => {} },
          h(EditorFeaturePanel, { title: 'Local file' }, h('button', { type: 'button' }, 'Choose saved-card artwork'))))),
    h(EditorFeaturePanel, { title: 'Standalone workflow', open: legacyOpen, onOpenChange: setLegacyOpen, detailsRef, summaryRef },
      h('button', { type: 'button' }, 'Workflow action')))
}
await act(() => createRoot(document.getElementById('root')).render(h(Fixture)))
</script>`
let server
let browser
let page
let url
let cacheDir
const pageErrors = []
test.before(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'sbls-inspector-vite-'))
  server = await createServer({ cacheDir, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client'] }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'inspector-sections', configureServer(vite) {
    vite.middlewares.use(async (request, response, next) => {
      if (request.url !== route) return next()
      try { response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml(route, html)) }
      catch (error) { next(error) }
    })
  } }] })
  await server.listen()
  url = `http://127.0.0.1:${server.httpServer.address().port}${route}`
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage()
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()) })
})
test.after(async () => {
  await page?.close(); await browser?.close(); await server?.close()
  // Only the exact directory created by this fixture is removed.
  if (cacheDir) await rm(cacheDir, { recursive: true, force: true })
})
test.beforeEach(async () => {
  pageErrors.length = 0
  await page.goto(url)
  try { await page.waitForFunction(() => Boolean(window.__inspector)) }
  catch (error) { throw new Error(`Inspector fixture failed: ${pageErrors.join('; ')}`, { cause: error }) }
  assert.deepEqual(pageErrors, [])
})
const snapshot = () => page.evaluate(() => window.__inspector.snapshot())
const role = label => page.locator('details').filter({ has: page.locator(':scope > summary').filter({ hasText: label + ' role' }) })
async function openRole(label) { const panel = role(label); await panel.locator(':scope > summary').click(); return panel }

for (const surface of ['Disc', 'Front', 'Back', 'Spine']) {
  test(`${surface} role exposes primary controls after one expansion without changing saved owners`, async () => {
    const before = await snapshot()
    const panel = await openRole(surface)
    assert.equal(await panel.locator('details').count(), 0)
    assert.equal(await panel.getByRole('heading', { name: surface + ' role', level: 2 }).count(), 1)
    const owners = surface === 'Spine' ? ['left', 'right'] : [surface]
    for (const owner of owners) assert.equal(await panel.getByRole('checkbox', { name: 'Show ' + owner, exact: true }).isVisible(), true)
    assert.deepEqual(await snapshot(), before)
  })
}

test('optional disabled controls preserve values across enablement and role collapse', async () => {
  const panel = await openRole('Front')
  const before = await snapshot()
  assert.equal(await panel.getByRole('textbox').count(), 0)
  const enable = panel.getByRole('checkbox', { name: 'Show Front', exact: true })
  await enable.check()
  await panel.getByRole('textbox', { name: 'Front value' }).fill('User title')
  await enable.uncheck()
  assert.equal(await panel.getByRole('textbox').count(), 0)
  await panel.locator(':scope > summary').click()
  await panel.locator(':scope > summary').click()
  await enable.check()
  assert.equal(await panel.getByRole('textbox', { name: 'Front value' }).inputValue(), 'User title')
  assert.deepEqual((await snapshot()).Front, { ...before.Front, enabled: true, label: 'User title' })
  for (const other of ['Disc', 'Back', 'left', 'right']) assert.deepEqual((await snapshot())[other], before[other])
})

test('spine side headings remain separate and mirroring preserves both owners', async () => {
  const panel = await openRole('Spine')
  const before = await snapshot()
  assert.equal(await panel.getByRole('heading', { name: 'Left Spine', level: 3 }).count(), 1)
  assert.equal(await panel.getByRole('heading', { name: 'Right Spine', level: 3 }).count(), 1)
  assert.equal(await panel.getByRole('heading', { name: 'left feature', level: 4 }).count(), 1)
  await page.evaluate(() => window.__inspector.setMirrored(true))
  assert.equal(await panel.getByRole('checkbox', { name: 'Show left', exact: true }).count(), 1)
  assert.equal(await panel.getByRole('checkbox', { name: 'Show right', exact: true }).count(), 0)
  assert.equal(await panel.getByRole('heading', { name: 'left feature', level: 3 }).count(), 1)
  assert.deepEqual(await snapshot(), before)
})

test('real repeated asset owner retains its disclosure while inner source grouping is shallow', async () => {
  const panel = await openRole('Repeated')
  assert.equal(await panel.locator('details').count(), 1)
  const card = panel.locator('details')
  assert.equal(await card.evaluate(element => element.open), true)
  assert.equal(await card.getByRole('button', { name: 'Choose saved-card artwork' }).isVisible(), true)
  await card.locator(':scope > summary').click()
  assert.equal(await card.getByRole('button', { name: 'Choose saved-card artwork' }).isVisible(), false)
})

test('keyboard order reaches the enable control directly and the section ref is real', async () => {
  const panel = role('Disc')
  await panel.locator(':scope > summary').focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  assert.equal(await panel.getByRole('checkbox', { name: 'Show Disc', exact: true }).evaluate(element => element === document.activeElement), true)
  assert.deepEqual(await page.evaluate(() => window.__inspector.refs()), { section: 'SECTION', details: 'DETAILS', summary: 'SUMMARY' })
  await page.evaluate(() => window.__inspector.focusSection())
  assert.equal(await panel.getByRole('checkbox', { name: 'Show Disc', exact: true }).evaluate(element => element === document.activeElement), true)
})

test('standalone workflow retains native disclosure, controlled toggle and direct refs', async () => {
  const panel = page.locator('details').filter({ has: page.getByRole('button', { name: 'Workflow action', includeHidden: true }) })
  assert.equal(await panel.evaluate(element => element.open), false)
  await panel.locator(':scope > summary').click()
  await page.waitForFunction(() => window.__inspector.legacyOpen())
  assert.equal(await panel.getByRole('button', { name: 'Workflow action' }).isVisible(), true)
})

for (const width of [240, 380, 720]) {
  test(`nested groups do not progressively narrow controls at ${width} CSS pixels`, async () => {
    await page.setViewportSize({ width, height: 900 })
    const panel = await openRole('Spine')
    const bounds = await panel.locator('.editor-inspector-section').evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect(); return { x: box.x, width: box.width }
    }))
    assert.equal(bounds.length, 4)
    for (const box of bounds) assert.deepEqual(box, bounds[0])
  })
}
