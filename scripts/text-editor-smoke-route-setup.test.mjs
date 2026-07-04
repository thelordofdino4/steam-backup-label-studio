import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createTextEditorSmokeRouteSetup,
} from './text-editor-smoke-route-setup.mjs'

function createFakeLocator(calls, selector, attributes = {}) {
  return {
    selector,
    count: async () => attributes.count ?? 1,
    evaluate: async () => calls.push(['evaluate', selector]),
    first() {
      calls.push(['first', selector])
      return this
    },
    getAttribute: async (name) => attributes[name] ?? null,
    click: async (options) => calls.push(['locator-click', selector, options]),
    waitFor: async (options) => calls.push(['waitFor', selector, options]),
  }
}

function createFakePage(calls) {
  return {
    goto: async (url, options) => calls.push(['goto', url, options]),
    locator: (selector) => createFakeLocator(calls, selector),
    waitForTimeout: async (ms) => calls.push(['wait', ms]),
  }
}

function createRouteSetupHarness(options = {}) {
  const calls = []
  const smokeLocators = new Map(
    Object.entries(options.smokeLocators ?? {}),
  )
  const setup = createTextEditorSmokeRouteSetup({
    baseUrl: 'http://127.0.0.1:4173',
    clickSmoke: async (_page, id) => calls.push(['clickSmoke', id]),
    done: async () => calls.push(['done']),
    ensureChecked: async (_page, id, checked) =>
      calls.push(['ensureChecked', id, checked]),
    expectContextualShell: async () => calls.push(['expectContextualShell']),
    expectDiscRibbonEditor: async () => calls.push(['expectDiscRibbonEditor']),
    expectInlineEditor: async () => calls.push(['expectInlineEditor']),
    expectVisible: async (_page, id) => calls.push(['expectVisible', id]),
    hideHtmlSource: async () => calls.push(['hideHtmlSource']),
    openInlineEditorFromTarget: async (_page, id) =>
      calls.push(['openInlineEditorFromTarget', id]),
    replaceInlineTextWithKeyboard: async (_page, value) =>
      calls.push(['replaceInlineTextWithKeyboard', value]),
    setNativeInputValue: async (locator, value) =>
      calls.push(['setNativeInputValue', locator.selector, value]),
    setSelectValue: async (locator, value) =>
      calls.push(['setSelectValue', locator.selector, value]),
    smoke: (_page, id) =>
      smokeLocators.get(id) ?? createFakeLocator(calls, `smoke:${id}`, {
        count: 0,
      }),
  })

  return {
    calls,
    page: createFakePage(calls),
    setup,
  }
}

test('text editor smoke route setup opens the cover title editor in order', async () => {
  const { calls, page, setup } = createRouteSetupHarness()

  await setup.setupCoverTitle(page)

  assert.deepEqual(calls, [
    ['clickSmoke', 'home-new-case-insert'],
    ['expectVisible', 'case-insert-editor'],
    ['setNativeInputValue', '#game-title', 'Smoke Fixture Game'],
    ['wait', 100],
    ['setSelectValue', 'smoke:case-template-pane-select', 'cover'],
    ['expectVisible', 'case-preview-cover'],
    ['ensureChecked', 'case-sidebar-text-block-cover-cover-title-text', true],
    ['clickSmoke', 'case-sidebar-edit-text-block-cover-cover-title-text'],
    ['expectInlineEditor'],
    ['replaceInlineTextWithKeyboard', 'Untitled Smoke Title'],
    ['done'],
    ['openInlineEditorFromTarget', 'case-text-block-cover-cover-title-text'],
  ])
})

test('text editor smoke route setup preserves disc route initialization', async () => {
  const { calls, page, setup } = createRouteSetupHarness()

  await setup.setupDisc(page)

  assert.deepEqual(calls, [
    ['goto', 'http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' }],
    ['clickSmoke', 'home-new-disc'],
    ['expectVisible', 'disc-preview'],
    ['setNativeInputValue', '#game-title', 'Disc Smoke Title'],
    ['wait', 100],
    [
      'setNativeInputValue',
      '#game-metadata-copyright',
      'Copyright 2026 Smoke',
    ],
    ['wait', 100],
  ])
})

test('text editor smoke route setup opens curved copyright through the SVG text path', async () => {
  const { calls, page, setup } = createRouteSetupHarness()

  await setup.openCurvedDiscCopyright(page)

  assert.deepEqual(calls, [
    ['ensureChecked', 'disc-sidebar-text-copyright', true],
    ['setSelectValue', 'smoke:disc-sidebar-mode-copyright', 'curved'],
    ['wait', 150],
    [
      'setNativeInputValue',
      '#game-metadata-copyright',
      'Copyright 2026 Smoke',
    ],
    ['wait', 100],
    [
      'first',
      '[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="copyright"] textPath',
    ],
    [
      'waitFor',
      '[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="copyright"] textPath',
      { state: 'attached', timeout: 5_000 },
    ],
    [
      'locator-click',
      '[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="copyright"] textPath',
      { force: true },
    ],
    ['expectInlineEditor'],
    ['expectDiscRibbonEditor'],
  ])
})
