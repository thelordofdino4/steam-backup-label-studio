import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const HARNESS_PATH =
  '/src/components/preview/testing/disc-guided-navigation-integration.html'

const routes = [
  ['disc:guided:game-title:primary', 'Game Title', 'Image', 'game-title', 'disc:game-title:artwork-upload', 'integration-title-artwork-enable'],
  ['disc:guided:background-image:primary', 'Background Image', 'Set up Background Image', 'background-artwork', 'disc:background-image:local-upload', 'integration-background-upload'],
  ['disc:guided:rating-badge:primary', 'Rating Badge', 'Set up Rating Badge', 'game-info-logos', 'disc:rating:system', 'integration-rating-enable'],
  ['disc:guided:media-format-mark:primary', 'Media Format Mark', 'Set up Media Format Mark', 'game-info-logos', 'disc:media-format-mark:format', 'integration-media-enable'],
  ['disc:guided:operating-system-marks:group', 'Operating System Marks', 'Set up Operating System Marks', 'game-info-logos', 'disc:operating-system-marks:enable', 'integration-operating-system-enable'],
  ['disc:guided:developer-logo:primary', 'Developer Logo', 'Set up Developer Logo', 'company-logos', 'disc:company-logo:developer-upload', 'integration-developer-enable'],
  ['disc:guided:publisher-logo:primary', 'Publisher Logo', 'Set up Publisher Logo', 'company-logos', 'disc:company-logo:publisher-upload', 'integration-publisher-enable'],
  ['disc:guided:legal-text:copyright', 'Copyright / Legal Text', 'Set up Copyright / Legal Text', 'legal-info', 'disc:legal-text:copyright', 'integration-copyright-enable'],
].map(([slotId, label, setupLabel, roleId, destination, activeId]) => ({
  slotId, label, setupLabel, roleId, destination, activeId,
}))

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

function slotButton(slotId) {
  return page.locator(`[data-guided-slot-id="${slotId}"]`).last()
}

async function activateSlot(route, mode = 'click') {
  const button = slotButton(route.slotId)
  if (mode === 'click') await button.click()
  else {
    await button.focus()
    await button.press(mode)
  }
  return page.getByRole('menu', { name: `${route.label} setup menu` })
}

async function featureSnapshot() {
  return page.evaluate(() =>
    window.__discGuidedNavigationHarness.getFeatureSnapshot())
}

async function workflowSnapshot() {
  return page.evaluate(() =>
    window.__discGuidedNavigationHarness.getWorkflowSnapshot())
}

async function requestLog() {
  return page.evaluate(() => structuredClone(
    window.__discGuidedNavigationHarness.requestLog,
  ))
}

function layoutPresetPanel() {
  return page.locator('details').filter({
    has: page.locator('#disc-layout-preset'),
  })
}

async function openLayoutPresetPanel() {
  const panel = layoutPresetPanel()
  if (!await panel.evaluate((element) => element.open)) {
    await panel.locator(':scope > summary').click()
  }
  return panel
}

async function omitSlots(slotIds) {
  await page.evaluate((ids) =>
    window.__discGuidedNavigationHarness.omitSlots(ids), slotIds)
  await page.waitForFunction((ids) => ids.every((id) =>
    window.__discGuidedNavigationHarness
      .getWorkflowSnapshot().omittedSlotIds.includes(id)), slotIds)
}

async function setFilledSlotId(slotId) {
  await page.evaluate((id) =>
    window.__discGuidedNavigationHarness.setFilledSlotId(id), slotId)
}

async function setSuggestedSlotId(slotId) {
  await page.evaluate((id) =>
    window.__discGuidedNavigationHarness.setSuggestedSlotId(id), slotId)
}

async function savedEditor() {
  return page.evaluate(() => structuredClone(
    window.__discGuidedNavigationHarness.getSavedEditor(),
  ))
}

async function assertRequest(route) {
  await page.waitForFunction((activeId) =>
    document.activeElement?.id === activeId &&
      window.__discGuidedNavigationHarness.getPendingRequest() === null,
  route.activeId)
  const requests = await requestLog()
  assert.equal(requests.length, 1)
  delete requests[0].requestId
  assert.deepEqual(requests[0], {
    surfaceId: 'disc-label',
    behavior: 'focus',
    scrollAlignment: 'role-start',
    destination: {
      roleId: route.roleId,
      focusTarget: route.destination,
    },
  })
}

test('all eight placeholders open one exact menu by pointer, Enter, and Space without navigation', async () => {
  for (const route of routes) {
    for (const mode of ['click', 'Enter', 'Space']) {
      await openHarness()
      const before = await featureSnapshot()
      const menu = await activateSlot(route, mode)
      await menu.waitFor()
      assert.equal(await page.getByRole('menu').count(), 1)
      assert.equal(await menu.getByRole('menuitem', { name: route.setupLabel, exact: true }).count(), 1)
      assert.equal(await menu.getByRole('menuitem', { name: 'Remove from preset', exact: true }).count(), 1)
      assert.equal((await requestLog()).length, 0)
      assert.deepEqual(await featureSnapshot(), before)
      assert.equal(await menu.getByRole('menuitem').first().evaluate((element) =>
        element === document.activeElement), true)
    }
  }
})

test('Game Title exposes Image and Text while every setup action dispatches its exact route', async () => {
  for (const route of routes) {
    await openHarness()
    const before = await featureSnapshot()
    const menu = await activateSlot(route)
    if (route.slotId.includes('game-title')) {
      assert.equal(await menu.getByRole('menuitem', { name: 'Text', exact: true }).count(), 1)
    }
    await menu.getByRole('menuitem', { name: route.setupLabel, exact: true }).click()
    await assertRequest(route)
    assert.equal(await page.getByRole('menu').count(), 0)
    assert.deepEqual(await featureSnapshot(), before)
  }

  await openHarness()
  const title = routes[0]
  const menu = await activateSlot(title, 'Enter')
  await menu.getByRole('menuitem', { name: 'Text', exact: true }).press('Space')
  await assertRequest({
    ...title,
    destination: 'disc:game-title:text-fallback',
    activeId: 'integration-title-text-enable',
  })
})

test('opening another placeholder replaces the menu and Escape returns focus to its origin', async () => {
  await openHarness()
  await activateSlot(routes[0])
  const secondMenu = await activateSlot(routes[1])
  assert.equal(await page.getByRole('menu').count(), 1)
  assert.equal(await secondMenu.count(), 1)
  await secondMenu.press('Escape')
  assert.equal(await page.getByRole('menu').count(), 0)
  assert.equal(await slotButton(routes[1].slotId).evaluate((element) =>
    element === document.activeElement), true)
})

test('Remove from preset omits only the exact slot, preserves owner state, and focuses next then previous', async () => {
  await openHarness()
  const before = await featureSnapshot()
  const rating = routes[2]
  const menu = await activateSlot(rating)
  await menu.getByRole('menuitem', { name: 'Remove from preset' }).click()
  await slotButton(routes[3].slotId).waitFor()
  assert.equal(await slotButton(rating.slotId).count(), 0)
  assert.equal(await slotButton(routes[3].slotId).evaluate((element) =>
    element === document.activeElement), true)
  assert.deepEqual((await workflowSnapshot()).omittedSlotIds, [rating.slotId])
  assert.deepEqual(await featureSnapshot(), before)
  assert.equal((await requestLog()).length, 0)

  await openHarness()
  const legal = routes.at(-1)
  const legalMenu = await activateSlot(legal)
  await legalMenu.getByRole('menuitem', { name: 'Remove from preset' }).click()
  assert.equal(await slotButton(routes.at(-2).slotId).evaluate((element) =>
    element === document.activeElement), true)
})

test('Title, Rating, OS, and Publisher omissions each preserve owner state independently', async () => {
  for (const route of [routes[0], routes[2], routes[4], routes[6]]) {
    await openHarness()
    const before = await featureSnapshot()
    const menu = await activateSlot(route)
    await menu.getByRole('menuitem', { name: 'Remove from preset' }).click()
    assert.equal(await slotButton(route.slotId).count(), 0)
    assert.deepEqual((await workflowSnapshot()).omittedSlotIds, [route.slotId])
    assert.deepEqual(await featureSnapshot(), before)
    assert.equal((await requestLog()).length, 0)
  }
})

test('removing every slot uses canonical order and ends on the stable preview fallback', async () => {
  await openHarness()
  for (const route of routes) {
    const menu = await activateSlot(route)
    await menu.getByRole('menuitem', { name: 'Remove from preset' }).click()
  }
  assert.equal(await page.locator('[data-guided-slot-id]').count(), 0)
  assert.deepEqual((await workflowSnapshot()).omittedSlotIds, routes.map(({ slotId }) => slotId))
  assert.equal(await page.locator('[data-guided-preview-fallback]').evaluate((element) =>
    element === document.activeElement), true)
})

test('suggested guidance keeps the same menu and can be omitted without accepting content', async () => {
  await openHarness()
  const publisher = routes[6]
  const before = await featureSnapshot()
  await page.evaluate((slotId) =>
    window.__discGuidedNavigationHarness.setSuggestedSlotId(slotId),
  publisher.slotId)
  await page.waitForFunction((slotId) =>
    document.querySelector(`[data-guided-slot-id="${slotId}"]`)
      ?.getAttribute('data-guided-lifecycle') === 'suggested',
  publisher.slotId)
  assert.equal(await slotButton(publisher.slotId).getAttribute('data-guided-lifecycle'), 'suggested')
  assert.match(await slotButton(publisher.slotId).getAttribute('aria-describedby'), /suggested/)
  const menu = await activateSlot(publisher)
  await menu.getByRole('menuitem', { name: 'Remove from preset' }).click()
  assert.equal(await slotButton(publisher.slotId).count(), 0)
  assert.deepEqual(await featureSnapshot(), before)
  assert.equal((await requestLog()).length, 0)
})

test('Removed preset items is conditional and lists exact labels in canonical order', async () => {
  await openHarness()
  await openLayoutPresetPanel()
  assert.equal(await page.getByRole('region', { name: 'Removed preset items' }).count(), 0)

  await omitSlots([routes[6].slotId, routes[0].slotId, routes[4].slotId])
  const section = page.getByRole('region', { name: 'Removed preset items' })
  await section.waitFor()
  assert.deepEqual(
    await section.locator('.disc-guided-restore-row > span').allTextContents(),
    ['Game Title', 'Operating System Marks', 'Publisher Logo'],
  )
  assert.equal((await section.textContent()).includes('disc:guided:'), false)
  assert.equal(await section.getByRole('button', { name: 'Restore Game Title' }).count(), 1)

  await page.evaluate(() =>
    window.__discGuidedNavigationHarness.resetGuidedWorkflow())
  await section.waitFor({ state: 'detached' })
  assert.equal(await page.getByRole('region', { name: 'Removed preset items' }).count(), 0)
})

test('Restore one preserves other omissions and focuses next, previous, then the preset control', async () => {
  await openHarness()
  const before = await featureSnapshot()
  await omitSlots([routes[2].slotId, routes[4].slotId, routes[6].slotId])
  const section = page.getByRole('region', { name: 'Removed preset items' })
  await openLayoutPresetPanel()

  await section.getByRole('button', { name: 'Restore Rating Badge' }).press('Enter')
  assert.deepEqual((await workflowSnapshot()).omittedSlotIds, [
    routes[4].slotId,
    routes[6].slotId,
  ])
  assert.equal(await section.getByRole('button', {
    name: 'Restore Operating System Marks',
  }).evaluate((element) => element === document.activeElement), true)
  assert.equal(await slotButton(routes[2].slotId).count(), 1)

  await section.getByRole('button', { name: 'Restore Publisher Logo' }).press('Space')
  assert.deepEqual((await workflowSnapshot()).omittedSlotIds, [routes[4].slotId])
  assert.equal(await section.getByRole('button', {
    name: 'Restore Operating System Marks',
  }).evaluate((element) => element === document.activeElement), true)

  await section.getByRole('button', { name: 'Restore Operating System Marks' }).click()
  await section.waitFor({ state: 'detached' })
  assert.equal(await page.locator('#disc-layout-preset').evaluate((element) =>
    element === document.activeElement), true)
  assert.deepEqual(await featureSnapshot(), before)
  assert.equal((await requestLog()).length, 0)
})

test('Restore all clears only omissions, preserves layout identity, and returns focus to Preset', async () => {
  await openHarness()
  const before = await featureSnapshot()
  await omitSlots([routes[0].slotId, routes[2].slotId, routes[7].slotId])
  const section = page.getByRole('region', { name: 'Removed preset items' })
  await openLayoutPresetPanel()
  const activeLayout = (await workflowSnapshot()).activeLayout

  await section.getByRole('button', { name: 'Restore all', exact: true }).press('Space')
  await section.waitFor({ state: 'detached' })
  assert.deepEqual(await workflowSnapshot(), {
    activeLayout,
    omittedSlotIds: [],
  })
  assert.equal(await page.locator('#disc-layout-preset').evaluate((element) =>
    element === document.activeElement), true)
  assert.deepEqual(await featureSnapshot(), before)
  assert.equal((await requestLog()).length, 0)
})

test('restored guidance follows unfilled, suggested, and filled lifecycle state', async () => {
  await openHarness()
  await openLayoutPresetPanel()

  const publisher = routes[6]
  await setSuggestedSlotId(publisher.slotId)
  await omitSlots([publisher.slotId])
  await page.getByRole('button', { name: 'Restore Publisher Logo' }).click()
  assert.equal(await slotButton(publisher.slotId).getAttribute('data-guided-lifecycle'), 'suggested')

  const rating = routes[2]
  await setFilledSlotId(rating.slotId)
  await omitSlots([rating.slotId])
  await page.getByRole('button', { name: 'Restore Rating Badge' }).click()
  assert.equal(await slotButton(rating.slotId).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Restore Rating Badge' }).count(), 0)
})

test('preview omission and sidebar restoration form a repeatable guidance-only loop', async () => {
  await openHarness()
  const title = routes[0]
  const before = await featureSnapshot()
  const menu = await activateSlot(title)
  await menu.getByRole('menuitem', { name: 'Remove from preset' }).click()

  await openLayoutPresetPanel()
  await page.getByRole('button', { name: 'Restore Game Title' }).click()
  assert.equal(await slotButton(title.slotId).count(), 1)
  assert.deepEqual((await workflowSnapshot()).omittedSlotIds, [])

  const reopenedMenu = await activateSlot(title, 'Enter')
  await reopenedMenu.getByRole('menuitem', { name: 'Remove from preset' }).click()
  assert.deepEqual((await workflowSnapshot()).omittedSlotIds, [title.slotId])
  assert.equal(await page.getByRole('button', { name: 'Restore Game Title' }).count(), 1)
  assert.deepEqual(await featureSnapshot(), before)
  assert.equal((await requestLog()).length, 0)
})

test('saved omissions repopulate restore rows and restored metadata survives reload safely', async () => {
  await openHarness()
  await omitSlots([routes[2].slotId, routes[6].slotId])
  const saved = await savedEditor()

  await page.evaluate(() =>
    window.__discGuidedNavigationHarness.resetGuidedWorkflow())
  await openLayoutPresetPanel()
  assert.equal(await page.getByRole('region', { name: 'Removed preset items' }).count(), 0)

  await page.evaluate((editor) =>
    window.__discGuidedNavigationHarness.loadSavedEditor(editor), saved)
  const restoredSection = page.getByRole('region', { name: 'Removed preset items' })
  await restoredSection.waitFor()
  assert.deepEqual(
    await restoredSection.locator('.disc-guided-restore-row > span').allTextContents(),
    ['Rating Badge', 'Publisher Logo'],
  )
  await page.getByRole('button', { name: 'Restore Rating Badge' }).click()
  assert.deepEqual((await savedEditor()).guidedLayout.omittedSlotIds, [routes[6].slotId])

  await page.evaluate((editor) =>
    window.__discGuidedNavigationHarness.loadSavedEditor(editor), {
      guidedLayout: { id: 'unknown', version: 1, omittedSlotIds: [routes[0].slotId] },
    })
  await restoredSection.waitFor({ state: 'detached' })
  assert.equal((await workflowSnapshot()).activeLayout, null)
})

test('same preset reapplication preserves omissions while another preset clears them', async () => {
  await openHarness()
  await omitSlots([routes[6].slotId])
  await openLayoutPresetPanel()
  const select = page.locator('#disc-layout-preset')

  await select.selectOption('classic-top-title')
  await page.getByRole('button', { name: 'Apply preset' }).click()
  assert.deepEqual((await workflowSnapshot()).omittedSlotIds, [routes[6].slotId])
  assert.equal(await page.getByRole('button', { name: 'Restore Publisher Logo' }).count(), 1)

  await select.selectOption('centered-logo-archive')
  await page.getByRole('button', { name: 'Apply preset' }).click()
  assert.deepEqual(await workflowSnapshot(), {
    activeLayout: null,
    omittedSlotIds: [],
  })
  assert.equal(await page.getByRole('region', { name: 'Removed preset items' }).count(), 0)
})
