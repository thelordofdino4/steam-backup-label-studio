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
  const [expanded, setExpanded] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [opacity, setOpacity] = useState(0.75)
  const [tab, setTab] = useState('art')
  const [curved, setCurved] = useState(false)
  const [measurementsOnly, setMeasurementsOnly] = useState(false)
  const [spacing, setSpacing] = useState(1.25)
  const [sourceDraft, setSourceDraft] = useState('<p>Example text</p>')
  window.__contrast = {
    setMeasurementsOnly, setSpacing, setWidth, setMixed, setExpanded, setEnabled, setOpacity, setTab, setCurved, options: DISC_TEXT_CONTRAST_OPTIONS,
    caseOptions: CASE_INSERT_TEXT_CONTRAST_OPTIONS, value: () => value,
    calls: window.__calls ??= [],
  }
  const selectControl = (label, values) => ({ label, value: values[0], options: values.map(value => ({ value, label: value })), onChange: noop })
  const rangeControl = (label, min, max, value, step = 0.01) => ({ label, min, max, value, step, onChange: noop })
  const toggleControl = label => ({ label, pressed: false, onChange: noop })
  const controls = {
    presets: { style: selectControl('Style preset', ['High contrast', 'Clean']), layout: selectControl('Layout preset', ['Centered', 'Bottom']), onReset: noop },
    text: { fontFamily: selectControl('Font family', ['Times New Roman', 'Arial']),
      size: { label: 'Font size', min: 6, max: 480, value: 32, step: 1, options: [12, 24, 32, 48], onChange: noop },
      alignment: selectControl('Alignment', ['Center', 'Justified']), bold: toggleControl('Bold'), italic: toggleControl('Italic'), underline: toggleControl('Underline'), bulletedList: toggleControl('Bulleted list') },
    utilities: { x: rangeControl('X', -1000, 1000, 0), y: rangeControl('Y', -1000, 1000, 0),
      ...(curved ? { lineSpacing: rangeControl('Line spacing', -100, 100, spacing), arcDegrees: rangeControl('Arc', 0, 360, 180) }
        : { width: rangeControl('Width', 0, 1000, 100) }),
      ...(!measurementsOnly ? { respectVisualElements: { label: 'Respect visual elements', checked: true, onChange: noop } } : {}),
      mode: selectControl('Layout mode', ['Automatic', 'Manual']), arcSide: selectControl('Arc side', ['Inside', 'Outside']),
      metadataSource: { label: 'Text source', status: 'manual', statusLabel: 'Manual text', actionLabel: 'Use metadata', onAction: noop } },
    html: { source: { label: 'Edit HTML source', checked: true, onChange: noop } },
    art: {
    ...(expanded ? {
      backgroundEnabled: { label: 'Background', checked: enabled, onChange: setEnabled },
      backgroundColor: { label: 'Background color', value: '#ffffff', onChange: noop, disabled: !enabled },
      backgroundPadding: { label: 'Padding', value: 4, min: 0, max: 100, step: 0.1, onChange: noop },
      backgroundOpacity: { label: 'Opacity', value: opacity, min: 0, max: 1, step: 0.01, onChange: setOpacity, disabled: !enabled },
      borderEnabled: { label: 'Border', checked: enabled, onChange: setEnabled },
      borderColor: { label: 'Border color', value: '#ffffff', onChange: noop, disabled: !enabled },
      borderRadius: { label: 'Radius', value: 5, min: 0, max: 100, step: 1, unit: 'px', onChange: noop, disabled: !enabled },
    } : {}),
    color: { label: 'Text color', value: '#ffffff', onChange: noop },
    contrast: { label: 'Contrast', value, options: DISC_TEXT_CONTRAST_OPTIONS,
      getSelectionValue: () => mixed ? { state: 'mixed' } : { state: 'active', value },
      onChange: (next, range) => { window.__calls.push({ value: next, selection: range }); setValue(next); setMixed(false) } },
  } }
  return h('div', { className: 'preview-area', style: { display: 'block', width: width + 110, padding: 0 } },
    h('div', { className: 'preview-header', style: { gridTemplateColumns: '110px minmax(0, 1fr)' } },
      h('div', { className: 'preview-pane-label', style: { width: 110 } }, 'Live Preview'),
      h(ContextualTextRibbonHost, { active: true }, h(InlinePreviewTextEditorRibbon, {
        activeTab: tab, controls, selection, getCommandSelection: () => selection,
        isCurvedText: curved, sourceDraft, tabsRef: null, onDone: noop,
        onRibbonControlInteraction: noop, onRibbonKeyboardInteraction: noop, onRibbonMenuRef: noop,
        onRibbonPointerDown: noop, onRetainTextareaSelectionForCommands: noop, onSelectionChange: noop,
        onSourceDraftChange: setSourceDraft, onTabChange: setTab,
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


async function cardGeometry() {
  return page.evaluate(() => {
    const row = document.querySelector('.contextual-text-ribbon-control-row')
    const cards = [...row.querySelectorAll(':scope > [data-ribbon-group]')].map(card => {
      const rect = card.getBoundingClientRect()
      const body = card.querySelector('.contextual-text-ribbon-group-body').getBoundingClientRect()
      return { id: card.dataset.ribbonGroup, column: card.dataset.ribbonColumnIndex,
        width: rect.width, x: rect.x, y: rect.y, height: rect.height, bodyWidth: body.width }
    })
    return { cards, available: row.clientWidth, scroll: row.scrollLeft,
      previewY: document.getElementById('preview-sentinel').getBoundingClientRect().top }
  })
}
test('peer columns fill available width while stacked cards and control caps remain stable', async () => {
  await page.evaluate(() => { document.activeElement.blur(); window.__contrast.setExpanded(true); window.__contrast.setWidth(1200) })
  await page.waitForFunction(() => document.querySelectorAll('[data-ribbon-column-index]').length === 4)
  await page.waitForFunction(() => document.querySelector('[data-ribbon-group="border"]').style.width !== '')
  const first = await cardGeometry()
  assert.equal(new Set(first.cards.map(card => card.width)).size, 1)
  assert.ok(Math.abs(first.cards[0].width * 3 + 8 - first.available) < 1)
  assert.equal(first.cards[0].x, first.cards[1].x)
  await page.evaluate(() => window.__contrast.setWidth(1600))
  await page.waitForFunction(() => document.querySelector('.contextual-text-ribbon-host').getBoundingClientRect().width > 1598)
  const wide = await cardGeometry()
  assert.ok(wide.cards[0].width > first.cards[0].width)
  assert.deepEqual(wide.cards.map(card => card.bodyWidth), first.cards.map(card => card.bodyWidth))
  assert.equal(wide.previewY, first.previewY)
  await page.evaluate(() => { window.__contrast.setEnabled(false); window.__contrast.setOpacity(1) })
  assert.deepEqual(await cardGeometry(), wide)
})
test('active numeric editing freezes geometry and scroll until focus leaves the control', async () => {
  await page.evaluate(() => { window.__contrast.setEnabled(true); window.__contrast.setWidth(1200) })
  await page.waitForFunction(() => document.querySelector('.contextual-text-ribbon-host').getBoundingClientRect().width < 1202)
  await page.waitForFunction(() => parseFloat(document.querySelector('[data-ribbon-group="contrast"]').style.width) < 400)
  const number = page.getByRole('spinbutton', { name: /^Opacity:/ })
  await number.focus()
  await number.press('ArrowDown')
  await page.waitForFunction(() => document.querySelector('[data-ribbon-layout-frozen="true"]'))
  const frozen = await cardGeometry()
  await page.evaluate(() => { window.__contrast.setWidth(1600); window.__contrast.setOpacity(0.42) })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const during = await cardGeometry()
  assert.deepEqual(during.cards.map(card => [card.width, card.bodyWidth, card.column]), frozen.cards.map(card => [card.width, card.bodyWidth, card.column]))
  assert.equal(during.scroll, frozen.scroll)
  await page.getByRole('button', { name: 'Done', exact: true }).focus()
  await page.waitForFunction(() => document.querySelector('.contextual-text-ribbon-host').getBoundingClientRect().width > 1598)
  await page.waitForFunction(width => document.querySelector('[data-ribbon-group="contrast"]').getBoundingClientRect().width > width, frozen.cards[0].width)
  assert.ok((await cardGeometry()).cards[0].width > frozen.cards[0].width)
  assert.deepEqual(errors, [])
})

test('overflow exposes complete columns and numeric interaction retains the scroll offset', async () => {
  await page.evaluate(() => { document.activeElement.blur(); window.__contrast.setWidth(650) })
  await page.waitForFunction(() => document.querySelector('.contextual-text-ribbon-control-row').clientWidth === 444)
  const row = await cardGeometry()
  assert.deepEqual(row.cards.map(card => card.width), [220, 220, 220, 220])
  await page.evaluate(() => {
    const input = document.querySelector('[data-smoke-id="inline-text-value-opacity"]')
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  const locked = await cardGeometry()
  await page.evaluate(() => { document.querySelector('.contextual-text-ribbon-control-row').scrollLeft += 80 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal((await cardGeometry()).scroll, locked.scroll)
  await page.getByRole('button', { name: 'Done', exact: true }).focus()
})


for (const width of [519, 719, 1200, 1600]) {
for (const [tab, curved] of [['presets', false], ['text', false], ['art', false], ['utilities', false], ['utilities', true], ['html', false]]) {
  test(`complete ${tab} controls (${curved ? 'curved' : 'straight'}) retain usable card bounds at ${width}`, async () => {
    await page.evaluate(({ tab, curved, width }) => { document.activeElement.blur(); window.__contrast.setExpanded(true); window.__contrast.setTab(tab); window.__contrast.setCurved(curved); window.__contrast.setWidth(width) }, { tab, curved, width })
    await page.waitForFunction(tab => document.querySelector(`.contextual-text-ribbon-control-row--${tab === 'art' ? 'artistic' : tab}`), tab)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const geometry = await page.evaluate(() => [...document.querySelectorAll('[data-ribbon-group]')].map(card => {
      const box = card.getBoundingClientRect()
      const body = card.querySelector('.contextual-text-ribbon-group-body')
      const controls = [...card.querySelectorAll('input,select,button,textarea')].filter(node => getComputedStyle(node).display !== 'none' && !node.dataset.smokeId?.startsWith('inline-text-number-options-'))
      const overlaps = controls.flatMap((first, index) => controls.slice(index + 1).filter(second => {
        const a = first.getBoundingClientRect(), b = second.getBoundingClientRect()
        return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
      }).map(second => [first.dataset.smokeId, second.dataset.smokeId]))
      return { id: card.dataset.ribbonGroup, overlaps, width: box.width, bodyWidth: body?.getBoundingClientRect().width,
        groups: body ? [...body.children].map(node => ({ classes: node.className, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, top: node.getBoundingClientRect().top - box.top, scroll: node.scrollWidth })) : [],
        outside: controls.filter(node => { const r = node.getBoundingClientRect(); return r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) }).map(node => ({ name: node.getAttribute('aria-label') ?? node.dataset.smokeId, width: node.getBoundingClientRect().width, top: node.getBoundingClientRect().top - box.top, bottom: node.getBoundingClientRect().bottom - box.bottom, cardHeight: box.height, bodyHeight: body?.getBoundingClientRect().height })) }
    }))
    assert.deepEqual(geometry.flatMap(card => card.outside), [], JSON.stringify(geometry))
    assert.deepEqual(geometry.flatMap(card => card.overlaps), [], JSON.stringify(geometry))
    assert.deepEqual(errors, [])
  })
}

}

test('utility subgroups grow smaller-first, cap, and center; bound-based number capacity is stable', async () => {
  await page.evaluate(() => { document.activeElement.blur(); window.__contrast.setTab('utilities'); window.__contrast.setCurved(false); window.__contrast.setMeasurementsOnly(true) })
  const snapshots = []
  for (const width of [1360, 1390, 1430, 1600]) {
    await page.evaluate(width => window.__contrast.setWidth(width), width)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    snapshots.push(await page.evaluate(() => {
      const card = document.querySelector('[data-ribbon-group="layout"]')
      const body = card.querySelector('.contextual-text-ribbon-group-body').getBoundingClientRect()
      const groups = [...card.querySelectorAll('[data-ribbon-inner-allocated]')].map(group => {
        const rect = group.getBoundingClientRect()
        return { width: rect.width, min: Number(group.dataset.ribbonInnerMin), max: Number(group.dataset.ribbonInnerMax), x: rect.x, right: rect.right }
      })
      return { groups, leftSpace: groups[0].x - body.x, rightSpace: body.right - groups.at(-1).right }
    }))
  }
  for (const snapshot of snapshots) {
    const [ranges, options] = snapshot.groups
    for (const group of snapshot.groups) assert.ok(group.width >= group.min - 0.1 && group.width <= group.max + 0.1, JSON.stringify(snapshot))
    // An eligible larger group cannot grow while the smaller one trails it.
    if (ranges.width > ranges.min + 0.1 && options.width < options.max - 0.1) assert.ok(options.width >= ranges.width - 0.1, JSON.stringify(snapshot))
    assert.ok(Math.abs(snapshot.leftSpace - snapshot.rightSpace) < 1, JSON.stringify(snapshot))
  }
  assert.ok(snapshots[0].groups[1].width < snapshots.at(-1).groups[1].width)
  for (const group of snapshots.at(-1).groups) assert.ok(Math.abs(group.width - group.max) < 0.1)
  await page.evaluate(() => { window.__contrast.setCurved(true); window.__contrast.setMeasurementsOnly(false) })
  await page.waitForFunction(() => document.querySelector('.contextual-text-ribbon-control-stack--utility-curved-layout-ranges'))
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const field = page.locator('[data-smoke-id="inline-text-value-line-spacing"]')
  const initialWidth = await field.evaluate(node => node.getBoundingClientRect().width)
  for (const value of [-99.99, 0, 99.99, 100]) {
    await page.evaluate(value => window.__contrast.setSpacing(value), value)
    assert.equal(await field.evaluate(node => node.getBoundingClientRect().width), initialWidth)
    assert.ok(await field.evaluate(node => {
      const style = getComputedStyle(node), context = document.createElement('canvas').getContext('2d')
      context.font = style.font
      return context.measureText(node.value).width <= node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    }))
  }
})
