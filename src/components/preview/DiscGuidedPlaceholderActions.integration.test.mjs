import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const HARNESS_PATH =
  '/src/components/preview/testing/disc-guided-navigation-integration.html'

const routes = [
  {
    slotId: 'disc:guided:background-image:primary',
    roleId: 'background-artwork',
    nestedPanel: 'background-local-file',
    destination: 'disc:background-image:local-upload',
    activeId: 'integration-background-upload',
  },
  {
    slotId: 'disc:guided:rating-badge:primary',
    roleId: 'game-info-logos',
    nestedPanel: 'rating',
    destination: 'disc:rating:system',
    activeId: 'integration-rating-enable',
  },
  {
    slotId: 'disc:guided:media-format-mark:primary',
    roleId: 'game-info-logos',
    nestedPanel: 'media',
    destination: 'disc:media-format-mark:format',
    activeId: 'integration-media-enable',
  },
  {
    slotId: 'disc:guided:operating-system-marks:group',
    roleId: 'game-info-logos',
    nestedPanel: 'operating-system',
    destination: 'disc:operating-system-marks:enable',
    activeId: 'integration-operating-system-enable',
  },
  {
    slotId: 'disc:guided:developer-logo:primary',
    roleId: 'company-logos',
    nestedPanel: 'company-logos',
    destination: 'disc:company-logo:developer-upload',
    activeId: 'integration-developer-enable',
  },
  {
    slotId: 'disc:guided:publisher-logo:primary',
    roleId: 'company-logos',
    nestedPanel: 'company-logos',
    destination: 'disc:company-logo:publisher-upload',
    activeId: 'integration-publisher-enable',
  },
  {
    slotId: 'disc:guided:legal-text:copyright',
    roleId: 'legal-info',
    nestedPanel: null,
    destination: 'disc:legal-text:copyright',
    activeId: 'integration-copyright-enable',
  },
]

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
    throw new Error('Vite did not expose the guided integration test port.')
  }

  harnessUrl = `http://127.0.0.1:${address.port}${HARNESS_PATH}`
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage()
})

test.after(async () => {
  await page?.close()
  await browser?.close()
  await server?.close()
})

async function openHarness() {
  await page.goto(harnessUrl)
  await page.waitForFunction(() => Boolean(window.__discGuidedNavigationHarness))
}

async function clearEventLog() {
  await page.evaluate(() => {
    window.__guidedNavigationEvents.length = 0
  })
}

async function getEventLog() {
  return page.evaluate(() => structuredClone(window.__guidedNavigationEvents))
}

async function getFeatureSnapshot() {
  return page.evaluate(() =>
    window.__discGuidedNavigationHarness.getFeatureSnapshot())
}

async function setFeatureEnabled(feature, enabled) {
  await page.evaluate(({ feature, enabled }) => {
    window.__discGuidedNavigationHarness.setFeatureEnabled(feature, enabled)
  }, { feature, enabled })
  await page.waitForFunction(({ feature, enabled }) =>
    window.__discGuidedNavigationHarness
      .getFeatureSnapshot().enabled[feature] === enabled,
  { feature, enabled })
}

async function activateSlot(slotId, mode) {
  const button = page.locator(`[data-guided-slot-id="${slotId}"]`).last()

  if (mode === 'click') {
    await clearEventLog()
    await button.click()
    return
  }

  await button.focus()
  await clearEventLog()
  await button.press(mode)
}

async function waitForNavigation(activeId) {
  await page.waitForFunction((expectedId) =>
    document.activeElement?.id === expectedId &&
      window.__discGuidedNavigationHarness.getPendingRequest() === null,
  activeId)
}

async function assertRoleOpen(roleId) {
  assert.equal(
    await page.locator(`[data-role-id="${roleId}"] > details`)
      .evaluate((element) => element.open),
    true,
  )
}

async function assertNestedPanelOpen(panelId) {
  assert.equal(
    await page.locator(`[data-nested-panel="${panelId}"] > details`)
      .evaluate((element) => element.open),
    true,
  )
}

async function assertLatestRequest(roleId, focusTarget) {
  const requestLog = await page.evaluate(() => structuredClone(
    window.__discGuidedNavigationHarness.requestLog,
  ))
  assert.equal(requestLog.length, 1)
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(requestLog[0]).filter(([key]) => key !== 'requestId'),
    ),
    {
      surfaceId: 'disc-label',
      behavior: 'focus',
      scrollAlignment: 'role-start',
      destination: { roleId, focusTarget },
    },
  )
}

async function assertFocusAndRoleStart(activeId, roleId) {
  const events = await getEventLog()
  const focusIndex = events.findIndex((event) =>
    event.type === 'focus' && event.id === activeId)
  const summaryScrollIndex = events.findIndex((event) =>
    event.type === 'scroll' && event.isSummary && event.roleId === roleId)

  assert.ok(focusIndex >= 0, `missing focus event for ${activeId}`)
  assert.equal(events[focusIndex].preventScroll, true)
  assert.ok(
    summaryScrollIndex > focusIndex,
    `role summary for ${roleId} must scroll after target focus`,
  )
  assert.equal(events[summaryScrollIndex].block, 'start')
  assert.equal(events[summaryScrollIndex].behavior, 'auto')
  assert.equal(
    events.some((event) => event.type === 'scroll' && event.id === activeId),
    false,
  )
  assert.equal(
    events.some((event) => event.type === 'focus' && event.isSummary),
    false,
  )
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    activeId,
  )

  if (activeId.includes('upload')) {
    assert.equal(
      await page.locator(`#${activeId}`).evaluate((element) =>
        element.classList.contains('logo-file-input')),
      true,
    )
  }
}

async function assertRoute(route, mode = 'click') {
  const before = await getFeatureSnapshot()

  await activateSlot(route.slotId, mode)
  await waitForNavigation(route.activeId)
  await assertRoleOpen(route.roleId)
  if (route.nestedPanel) await assertNestedPanelOpen(route.nestedPanel)
  await assertLatestRequest(route.roleId, route.destination)
  await assertFocusAndRoleStart(route.activeId, route.roleId)
  assert.deepEqual(await getFeatureSnapshot(), before)
}

test('all eight mounted Classic Top Title actions open exact panels, focus exact controls, and isolate feature state', async () => {
  await openHarness()
  const titleBefore = await getFeatureSnapshot()

  await activateSlot('disc:guided:game-title:primary', 'click')
  const chooser = page.getByRole('dialog', { name: 'Choose Game Title setup' })
  await chooser.getByRole('button', { name: 'Image' }).click()
  await waitForNavigation('integration-title-artwork-enable')
  await assertRoleOpen('game-title')
  await assertLatestRequest('game-title', 'disc:game-title:artwork-upload')
  await assertFocusAndRoleStart('integration-title-artwork-enable', 'game-title')
  assert.deepEqual(await getFeatureSnapshot(), titleBefore)

  for (const route of routes) {
    await openHarness()
    await assertRoute(route)
  }
})

test('every direct slot preserves native click, Enter, and Space activation semantics', async () => {
  for (const route of routes) {
    for (const mode of ['click', 'Enter', 'Space']) {
      await openHarness()
      await assertRoute(route, mode)
    }
  }
})

test('Game Title chooser and both actions preserve pointer and keyboard behavior', async () => {
  for (const mode of ['click', 'Enter', 'Space']) {
    await openHarness()
    const before = await getFeatureSnapshot()
    await activateSlot('disc:guided:game-title:primary', mode)
    const chooser = page.getByRole('dialog', { name: 'Choose Game Title setup' })
    await chooser.waitFor()
    assert.equal(await chooser.getByRole('button', { name: 'Image' }).count(), 1)
    assert.equal(await chooser.getByRole('button', { name: 'Text' }).count(), 1)
    assert.equal(
      await page.evaluate(() => document.activeElement?.textContent),
      'Image',
    )
    assert.equal(
      await page.evaluate(() =>
        window.__discGuidedNavigationHarness.requestLog.length),
      0,
    )
    assert.deepEqual(await getFeatureSnapshot(), before)
  }

  await openHarness()
  const imageBefore = await getFeatureSnapshot()
  await activateSlot('disc:guided:game-title:primary', 'Enter')
  await clearEventLog()
  await page.getByRole('button', { name: 'Image', exact: true }).press('Enter')
  await waitForNavigation('integration-title-artwork-enable')
  await assertLatestRequest('game-title', 'disc:game-title:artwork-upload')
  await assertFocusAndRoleStart('integration-title-artwork-enable', 'game-title')
  assert.deepEqual(await getFeatureSnapshot(), imageBefore)

  await openHarness()
  const textBefore = await getFeatureSnapshot()
  await activateSlot('disc:guided:game-title:primary', 'Space')
  await clearEventLog()
  await page.getByRole('button', { name: 'Text', exact: true }).press('Space')
  await waitForNavigation('integration-title-text-enable')
  await assertLatestRequest('game-title', 'disc:game-title:text-fallback')
  await assertFocusAndRoleStart('integration-title-text-enable', 'game-title')
  assert.deepEqual(await getFeatureSnapshot(), textBefore)
})

test('enabled owners receive direct targets while disabled owners retain exact fallbacks', async () => {
  const enabledCases = [
    {
      feature: 'titleArtwork',
      slotId: 'disc:guided:game-title:primary',
      choice: 'Image',
      activeId: 'integration-title-artwork-upload',
      roleId: 'game-title',
      destination: 'disc:game-title:artwork-upload',
    },
    {
      feature: 'rating',
      slotId: 'disc:guided:rating-badge:primary',
      activeId: 'integration-rating-system',
      roleId: 'game-info-logos',
      destination: 'disc:rating:system',
    },
    {
      feature: 'media',
      slotId: 'disc:guided:media-format-mark:primary',
      activeId: 'integration-media-format',
      roleId: 'game-info-logos',
      destination: 'disc:media-format-mark:format',
    },
    {
      feature: 'developer',
      slotId: 'disc:guided:developer-logo:primary',
      activeId: 'integration-developer-upload',
      roleId: 'company-logos',
      destination: 'disc:company-logo:developer-upload',
    },
    {
      feature: 'publisher',
      slotId: 'disc:guided:publisher-logo:primary',
      activeId: 'integration-publisher-upload',
      roleId: 'company-logos',
      destination: 'disc:company-logo:publisher-upload',
    },
  ]

  for (const route of enabledCases) {
    await openHarness()
    await setFeatureEnabled(route.feature, true)
    const before = await getFeatureSnapshot()
    await activateSlot(route.slotId, 'click')
    if (route.choice) {
      await clearEventLog()
      await page.getByRole('button', { name: route.choice, exact: true }).click()
    }
    await waitForNavigation(route.activeId)
    await assertLatestRequest(route.roleId, route.destination)
    await assertFocusAndRoleStart(route.activeId, route.roleId)
    assert.deepEqual(await getFeatureSnapshot(), before)
  }
})

test('company logo routes never cross-focus developer and publisher controls', async () => {
  await openHarness()
  await assertRoute(routes.find(({ slotId }) => slotId.includes('developer-logo')))
  assert.notEqual(
    await page.evaluate(() => document.activeElement?.id),
    'integration-publisher-enable',
  )

  await openHarness()
  await assertRoute(routes.find(({ slotId }) => slotId.includes('publisher-logo')))
  assert.notEqual(
    await page.evaluate(() => document.activeElement?.id),
    'integration-developer-enable',
  )
})

test('controlled roles are non-accordion and repeated requests realign after manual scrolling', async () => {
  await openHarness()
  const unrelatedDetails = page.locator('[data-role-id="additional-artwork"] > details')
  await unrelatedDetails.locator(':scope > summary').click()
  assert.equal(await unrelatedDetails.evaluate((element) => element.open), true)

  const background = routes.find(({ slotId }) => slotId.includes('background-image'))
  await assertRoute(background)
  assert.equal(await unrelatedDetails.evaluate((element) => element.open), true)

  await page.evaluate(() => {
    document.querySelector('[data-role-id="background-artwork"] > details > summary')
      .scrollIntoView({ block: 'end', behavior: 'auto' })
    window.__guidedNavigationEvents.length = 0
  })
  await page.locator(`[data-guided-slot-id="${background.slotId}"]`).last().click()
  await waitForNavigation(background.activeId)
  await assertFocusAndRoleStart(background.activeId, background.roleId)
  assert.equal(
    await page.evaluate(() =>
      window.__discGuidedNavigationHarness.requestLog.length),
    2,
  )

  const rating = routes.find(({ slotId }) => slotId.includes('rating-badge'))
  await page.locator(`[data-guided-slot-id="${rating.slotId}"]`).last().click()
  await waitForNavigation(rating.activeId)
  await assertRoleOpen('background-artwork')
  await assertRoleOpen('game-info-logos')
  await assertNestedPanelOpen('background-local-file')
  await assertNestedPanelOpen('rating')
  assert.equal(await unrelatedDetails.evaluate((element) => element.open), true)
})
