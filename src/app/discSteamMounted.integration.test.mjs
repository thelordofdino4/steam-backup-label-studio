// Actual Disc App and controls in sandboxed Chromium. Native substitutes are limited
// to fixture Steam transport and validation of the two generated PNGs.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { makeDiscSteamPngFixtures } from './testing/discSteamPngFixtures.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const route = '/__disc-steam-366'
const entryURL = '/__disc-steam-366-entry.mjs'
const entryModule = '\0sbls-366-mounted-entry'
const steamModule = '\0sbls-366-steam-transport'
const pngProbeModule = '\0sbls-366-observe-png'
const saveProbeModule = '\0sbls-366-observe-save'
const pngProbe = `
export * from '/src/app/appPngExportInputs.ts'
import { createDiscPngExportInput as real } from '/src/app/appPngExportInputs.ts'
export function createDiscPngExportInput(input) {
  const captured = real(input)
  window.noteDiscCommandCapture('export.png', {
    title: captured.exportInput.discTextLayout?.title,
    legal: captured.exportInput.discTextLayout?.copyright,
    rating: captured.exportInput.projectRatingBadge?.layout,
    uskRating: captured.exportInput.projectRatingBadge?.uskBadge?.layout,
    settings: captured.exportInput.discTextSettings,
  })
  return captured
}`
const saveProbe = `
export * from '/src/lifecycle/projectSession.ts'
import { projectPinnedDiscSave as real } from '/src/lifecycle/projectSession.ts'
export function projectPinnedDiscSave(pin) {
  const p = real(pin)
  window.noteDiscCommandCapture('project.save', {
    title: p.discText?.layout?.title, legal: p.discText?.layout?.copyright, rating: p.ratingBadge?.layout,
    uskRating: p.ratingBadge?.uskBadge?.layout, settings: p.discText?.settings,
  }, pin.revision)
  return p
}`
const entry = await readFile(new URL('./testing/discSteamMountedFixture.mjs', import.meta.url), 'utf8')
const retiredAppId = 920010001
const incomingAppId = 920010002
const legal = 'Fixture Game © Fixture Studio. Fixture Game is a trademark of Fixture Studio. All rights reserved.'
const { older, newer } = makeDiscSteamPngFixtures(retiredAppId, incomingAppId)
const imageValidationModule = '\0sbls-366-fixture-image-validation'
const titleArtworkProbeModule = '\0sbls-366-observe-title-artwork'
const imageValidationProbe = `
const fixtures = ${JSON.stringify([older, newer].map(({ id, width, height, dataUrl }) => ({ id, width, height, dataUrl })))}
const calls = []
window.readDiscSteamImageValidation = () => [...calls]
export async function invoke(command, data) {
  if (command !== 'validate_imported_image_asset' || !(data instanceof Uint8Array))
    throw Error('Unexpected fixture image validation request')
  const fixture = fixtures.find(candidate => {
    const expected = new TextEncoder().encode(candidate.dataUrl)
    return data.length === expected.length && data.every((byte, i) => byte === expected[i])
  })
  if (!fixture || calls.includes(fixture.id))
    throw Error('Unknown or duplicate canonical fixture PNG')
  calls.push(fixture.id)
  return { status: 'success', mimeType: 'image/png', width: fixture.width, height: fixture.height }
}`
const titleArtworkProbe = `
export * from '/src/steam/steamTitleArtworkImport.ts'
import { createSteamTitleArtworkImport as real } from '/src/steam/steamTitleArtworkImport.ts'
const completed = []
window.readDiscSteamArtworkPreparation = () => [...completed]
export function createSteamTitleArtworkImport(game, ...args) {
  const pending = real(game, ...args)
  // Observe the existing decode/bounds result; return the same Promise.
  void pending.then(result => {
    const size = result.titleArtwork.imageSize
    completed.push({ id: game.appId, status: result.status, width: size?.width,
      height: size?.height, bounds: size?.contentBounds })
  }, () => completed.push({ id: game.appId, status: 'rejected' }))
  return pending
}`
const syntheticTransport = `
const testGames = new Map(${JSON.stringify([[retiredAppId, 'Retired Fixture Game'], [incomingAppId, 'Incoming Fixture Game']])})
const fixturePngBytes = new Map(${JSON.stringify([older, newer].map(({ id, bytes }) => [id, bytes]))})
const pending = new Map()
let requested = 0
const legal = ${JSON.stringify(legal)}
function expectApp(id) {
  if (!testGames.has(id)) throw Error('Unknown synthetic app ID')
  return testGames.get(id)
}
export async function invoke(command, args) {
  switch (command) {
    case 'search_steam_store': {
      const id = Number(args.term)
      return JSON.stringify({ items: [{ id, name: expectApp(id) }] })
    }
    case 'fetch_steam_app_details': {
      const name = expectApp(args.appid)
      return JSON.stringify({ [args.appid]: { success:true, data: {
        name, developers:['Fixture Studio'], publishers:['Fixture Publisher'],
        release_date:{ date:'2001-02-03' },
        platforms:{ windows:true, linux:true, mac:false },
        ratings:{ esrb:{ rating:'m', descriptors:'Violence' } }, legal_notice:legal,
      } } })
    }
    case 'fetch_steam_store_items': expectApp(args.appid); return '{"response":{"store_items":[]}}'
    case 'find_steam_library_cache_assets': expectApp(args.appid); return []
    case 'download_steam_artwork': {
      const url = new URL(args.url)
      const pieces = url.pathname.split('/')
      if (url.origin !== 'https://cdn.akamai.steamstatic.com' || url.search || url.hash ||
          pieces.length !== 5 || pieces[1] !== 'steam' || pieces[2] !== 'apps' || pieces[4] !== 'logo.png')
        throw Error('Unexpected synthetic logo URL')
      const id = Number(pieces[3])
      expectApp(id)
      if (pending.has(id)) throw Error('Duplicate synthetic logo request')
      requested++
      return new Promise((resolve,reject) => pending.set(id,{ resolve, reject }))
    }
    default: throw Error('Unexpected Steam fixture transport command')
  }
}
window.discSteamTransportFixture = Object.freeze({
  pending: id => pending.has(id),
  requested: () => requested,
  rejectLogo(id) {
    const request = pending.get(id)
    if (!request) throw Error('Expected a requested synthetic logo')
    pending.delete(id)
    request.reject(new Error('Synthetic logo unavailable'))
  },
  resolveLogo(id) {
    const request = pending.get(id)
    const bytes = fixturePngBytes.get(id)
    if (!request || !bytes) throw Error('Expected a requested fixture PNG')
    pending.delete(id)
    request.resolve({ bytes, content_type: 'image/png' })
  },
})
`
const fixtureHtml = `<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="${entryURL}"></script></body></html>`

let server, browser, cacheDir, origin

test.before(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'sbls-disc-steam-366-'))
  server = await createServer({
    root, cacheDir, logLevel: 'error',
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client'],
      exclude: ['@tauri-apps/api/core'] },
    server: { host: '127.0.0.1', port: 0, strictPort: false },
    plugins: [{
      name: 'private-366-mounted',
      enforce: 'pre',
      configureServer(vite) {
        vite.middlewares.use(async (request, response, next) => {
          if (request.url !== route) return next()
          try {
            const html = await vite.transformIndexHtml(route, fixtureHtml)
            response.setHeader('Content-Type', 'text/html')
            response.end(html)
          } catch (error) { next(error) }
        })
      },
      resolveId(id, importer) {
        if (id === entryURL) return entryModule
        const caller = importer?.replaceAll('\\', '/')
        if (id === '@tauri-apps/api/core' && caller?.endsWith('/src/steam/steamApi.ts')) return steamModule
        if (id === '@tauri-apps/api/core' && caller?.endsWith('/src/tauri/importedImageValidation.ts')) return imageValidationModule
        if (id === '../steam/steamTitleArtworkImport' && caller?.endsWith('/src/hooks/useTitleArtwork.ts')) return titleArtworkProbeModule
        if (id === './appPngExportInputs' && caller?.endsWith('/src/app/App.tsx')) return pngProbeModule
        if (id === '../lifecycle/projectSession.ts' && caller?.endsWith('/src/app/appProjectSaveCommand.ts')) return saveProbeModule
      },
      load(id) {
        if (id === entryModule) return entry
        if (id === steamModule) return syntheticTransport
        if (id === imageValidationModule) return imageValidationProbe
        if (id === titleArtworkProbeModule) return titleArtworkProbe
        if (id === pngProbeModule) return pngProbe
        if (id === saveProbeModule) return saveProbe
      },
    }],
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.equal(typeof address, 'object')
  origin = `http://127.0.0.1:${address.port}`
  browser = await chromium.launch({ headless: true, chromiumSandbox: true })
})
test.after(async () => {
  try { await browser?.close() }
  finally {
    try { await server?.close() }
    finally { if (cacheDir) await rm(cacheDir, { recursive: true, force: true }) }
  }
})

async function reveal(page, label) {
  const summary = page.getByText(label, { exact: true }).and(page.locator('details > summary > span'))
  assert.equal(await summary.count(), 1, `unique ${label} disclosure`)
  const details = summary.locator('xpath=../..')
  assert.equal(await details.count(), 1)
  if (!await details.evaluate(node => node.open)) await summary.click()
  assert.equal(await details.evaluate(node => node.open), true)
}
const receipt = page => page.evaluate(() => window.readDiscSteamReceipt())
const drain = page => page.evaluate(() =>
  new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function start(page, id) {
  await page.getByLabel('Steam search', { exact: true }).fill(String(id))
  await page.getByRole('button', { name: 'Search Steam', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`App ID ${id}`) }).click()
  await page.waitForFunction(appId => window.discSteamTransportFixture.pending(appId), id)
}
const rejectLogo = (page, id) => page.evaluate(
  appId => window.discSteamTransportFixture.rejectLogo(appId), id)

test('real Disc App: deferred Steam edit fence, one complete revision, Save and PNG requests', { timeout: 90_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  const pageErrors = [], unexpectedOrigins = []
  page.on('pageerror', error => pageErrors.push(error.message))
  // Prevent fixture metadata from ever causing live outbound resource requests.
  await page.route('**/*', request => {
    const url = request.request().url()
    if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:'))
      return request.continue()
    const external = new URL(url)
    // A browser may enqueue lazy picker thumbnail requests from synthesized
    // Steam URLs. Abort them too, without confusing them with a live IPC call.
    const knownBlockedThumbnail = request.request().resourceType() === 'image' &&
      external.origin === 'https://cdn.akamai.steamstatic.com' &&
      [retiredAppId, incomingAppId].some(id => external.pathname.startsWith(`/steam/apps/${id}/`))
    if (!knownBlockedThumbnail) unexpectedOrigins.push(external.origin)
    return request.abort('blockedbyclient')
  })
  try {
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Layout Presets')
    await page.getByLabel('Preset', { exact: true }).selectOption('classic-top-title')
    await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.guided.id ===
      'disc:guided-layout:classic-top-title')
    await reveal(page, 'Game')
    await reveal(page, 'Additional metadata')

    const subtitle = 'Keep this separate, deliberate edit'
    await start(page, retiredAppId)
    await page.getByRole('textbox', { name: 'Subtitle / edition', exact: true }).fill(subtitle)
    await page.waitForFunction(value => window.readDiscSteamReceipt().revisions.at(-1)?.metadata.subtitle === value, subtitle)
    const editRevision = (await receipt(page)).revisions.at(-1).revision
    await rejectLogo(page, retiredAppId)
    await drain(page)
    assert.equal(await page.getByRole('textbox', { name: 'Subtitle / edition', exact: true }).inputValue(), subtitle)
    assert.equal((await receipt(page)).revisions.at(-1).revision, editRevision)

    await start(page, incomingAppId)
    await rejectLogo(page, incomingAppId)
    await page.waitForFunction(id => window.readDiscSteamReceipt().revisions.some(event => event.game.appId === id), incomingAppId)
    await drain(page)
    const observed = await receipt(page)
    assert.equal(await page.evaluate(() => window.discSteamTransportFixture.requested()), 2)
    assert.equal(observed.overflow, false)
    assert.ok(!observed.revisions.some(event => event.game.appId === retiredAppId), 'retired request did not publish')
    const accepted = observed.revisions.filter(event => event.revision > editRevision)
    assert.equal(accepted.length, 1, 'fresh import must publish one complete document revision')
    const [r] = accepted
    assert.deepEqual(r.game, { manualTitle: 'Incoming Fixture Game', appId: incomingAppId })
    assert.equal(r.title, 'Incoming Fixture Game')
    assert.equal(r.metadata.title, 'Incoming Fixture Game')
    assert.equal(r.metadata.legacyAppId, String(incomingAppId))
    assert.equal(r.metadata.subtitle, subtitle, 'disjoint authored Subtitle survives')
    assert.equal(r.metadata.publisher, 'Fixture Publisher')
    assert.equal(r.metadata.developer, 'Fixture Studio')
    assert.equal(r.metadata.legal, legal)
    assert.deepEqual(r.artwork, { hasActive:false, hasDefault:false }, 'unavailable native artwork is not invented')
    assert.equal(r.rating, true)
    assert.equal(r.metadata.ratingSystem, 'ESRB')
    assert.equal(r.metadata.ratingValue, 'M')
    assert.deepEqual(r.platform, { source:'steam-appdetails', values:['windows','linux'] })
    assert.equal(r.text.appId, String(incomingAppId))
    assert.equal(r.text.legalEnabled, true)
    assert.equal(r.text.copyrightSource, 'metadata')
    assert.ok(r.guided.completed.includes('disc:guided:operating-system-marks:group'))
    assert.ok(r.guided.completed.includes('disc:guided:rating-badge:primary'))
    assert.ok(r.guided.completed.includes('disc:guided:legal-text:copyright'))

    await reveal(page, 'Project File')
    for (const [label, command] of [['Save Project', 'project.save'], ['Export PNG', 'export.png']]) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await page.waitForFunction(boundary => window.readDiscSteamReceipt().commands.samples.some(sample =>
        sample.boundary === boundary), command)
      const after = await receipt(page)
      const terminal = after.commands.samples.filter(sample => sample.boundary === command)
      assert.equal(terminal.length, 1, 'one real App request enters the command owner')
      assert.notEqual(terminal[0].outcome, 'not-executed')
      assert.notEqual(terminal[0].outcome, 'success', 'ordinary Chromium cannot perform real Tauri dialogs or write')
      assert.equal(after.revisions.at(-1).revision, r.revision, 'failed native boundary did not advance document')
    }
    const final = await receipt(page)
    assert.ok(final.scopes.some(event => event.revision === r.revision &&
      event.activeScopes.includes('dialog.project-file')), 'real Save acquired project-file scope at accepted revision')
    assert.ok(final.scopes.some(event => event.revision === r.revision &&
      event.activeScopes.some(scope => scope === 'dialog.export-warning' || scope === 'dialog.export-destination')),
    'real export reached preflight/destination after capture')
    assert.deepEqual(pageErrors, [])
    assert.deepEqual(unexpectedOrigins, [], 'unexpected off-origin request was blocked')
  } catch (error) {
    if (pageErrors.length) throw new Error('Full App failed to mount/settle: ' + pageErrors.join('; '), { cause:error })
    throw error
  } finally { await page.close() }
})


test('real Disc App: newer Steam PNG publishes active and remembered artwork; older successful PNG stays retired', { timeout: 90_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.route('**/*', request => {
    const url = request.request().url()
    return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
      ? request.continue() : request.abort('blockedbyclient')
  })
  const resolveLogo = id => page.evaluate(appId => window.discSteamTransportFixture.resolveLogo(appId), id)
  const prepared = id => page.waitForFunction(appId =>
    window.readDiscSteamArtworkPreparation().some(result => result.id === appId), id)
  const requireDecoded = async fixture => {
    const outputs = await page.evaluate(() => window.readDiscSteamArtworkPreparation())
    assert.deepEqual(outputs.filter(result => result.id === fixture.id), [{
      id: fixture.id, status: 'seeded', width: fixture.width, height: fixture.height, bounds: fixture.bounds,
    }], 'actual Chromium decode and alpha inspection must succeed for the fixture')
  }
  try {
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Layout Presets')
    await page.getByLabel('Preset', { exact: true }).selectOption('classic-top-title')
    await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.guided.id ===
      'disc:guided-layout:classic-top-title')
    await reveal(page, 'Game')
    await reveal(page, 'Additional metadata')

    const subtitle = 'Keep this edit while Steam artwork is pending'
    const subtitleInput = page.getByRole('textbox', { name: 'Subtitle / edition', exact: true })
    await start(page, older.id)
    await subtitleInput.fill(subtitle)
    await page.waitForFunction(value => window.readDiscSteamReceipt().revisions.at(-1)?.metadata.subtitle === value,
      subtitle)
    const authored = (await receipt(page)).revisions.at(-1)
    await start(page, newer.id)
    assert.equal(await page.evaluate(id => window.discSteamTransportFixture.pending(id), older.id), true)
    await resolveLogo(newer.id)
    await prepared(newer.id)
    await requireDecoded(newer)
    await page.waitForFunction(id => window.readDiscSteamReceipt().revisions.at(-1)?.game.appId === id, newer.id)
    const accepted = (await receipt(page)).revisions.filter(event => event.revision > authored.revision)
    assert.equal(accepted.length, 1, 'fresh game and both art roles publish on one revision')
    const [r] = accepted
    assert.equal(r.revision, authored.revision + 1)
    assert.equal(r.title, 'Incoming Fixture Game')
    assert.deepEqual(r.game, { manualTitle: 'Incoming Fixture Game', appId: newer.id })
    assert.equal(r.metadata.subtitle, subtitle)
    assert.equal(r.metadata.legacyAppId, String(newer.id))
    assert.equal(r.metadata.legal, legal)
    assert.equal(r.metadata.ratingSystem, 'ESRB')
    assert.equal(r.metadata.ratingValue, 'M')
    assert.equal(r.rating, true)
    assert.deepEqual(r.platform, { source: 'steam-appdetails', values: ['windows','linux'] })
    assert.equal(r.text.appId, String(newer.id))
    assert.equal(r.text.copyrightSource, 'metadata')
    assert.ok(r.guided.completed.includes('disc:guided:game-title:primary'))
    assert.ok(r.guided.completed.includes('disc:guided:rating-badge:primary'))
    assert.ok(r.guided.completed.includes('disc:guided:legal-text:copyright'))
    assert.ok(r.guided.completed.includes('disc:guided:operating-system-marks:group'))
    const art = r.artworkData
    assert.equal(art.source, 'steam')
    assert.equal(art.enabled, true)
    const expectedLogo = {
      dataUrl: newer.dataUrl, width: newer.width, height: newer.height, bounds: newer.bounds, id: 'cdn-logo',
    }
    assert.deepEqual(art.active, expectedLogo)
    assert.deepEqual(art.remembered, expectedLogo)
    assert.deepEqual(await page.evaluate(() => window.readDiscSteamImageValidation()), [newer.id])

    await reveal(page, 'Project File')
    const save = page.getByRole('button', { name: 'Save Project', exact: true })
    const status = save.locator('xpath=../..').locator('p.hint')
    const acceptedStatus = await status.innerText()
    assert.match(acceptedStatus, /^Auto-applied .+ rating badge and curved copyright\/legal text\.$/, 'current import must reach visible success feedback')
    await resolveLogo(older.id)
    await prepared(older.id)
    await requireDecoded(older)
    // The observer only fires after real decode; the remaining import flow
    // is synchronous bookkeeping before its stale request check.
    await drain(page)
    const afterOlder = await receipt(page)
    assert.deepEqual(await page.evaluate(() => window.readDiscSteamImageValidation()), [newer.id, older.id])
    assert.equal(await page.evaluate(() => window.discSteamTransportFixture.requested()), 2)
    assert.equal(afterOlder.overflow, false)
    assert.ok(!afterOlder.revisions.some(event => event.game.appId === older.id ||
      event.artworkData.active.dataUrl === older.dataUrl || event.artworkData.remembered.dataUrl === older.dataUrl))
    assert.deepEqual(afterOlder.revisions.at(-1), r)
    assert.equal(await subtitleInput.inputValue(), subtitle)
    assert.equal(await status.innerText(), acceptedStatus, 'stale successful artwork cannot replace later feedback')

    for (const [button, command] of [[save, 'project.save'],
      [page.getByRole('button', { name: 'Export PNG', exact: true }), 'export.png']]) {
      await button.click()
      await page.waitForFunction(boundary => window.readDiscSteamReceipt().commands.samples.some(sample =>
        sample.boundary === boundary), command)
      const observed = await receipt(page)
      const terminal = observed.commands.samples.filter(sample => sample.boundary === command)
      assert.equal(terminal.length, 1)
      assert.notEqual(terminal[0].outcome, 'not-executed')
      assert.notEqual(terminal[0].outcome, 'success', 'no native output in browser')
      assert.deepEqual(observed.revisions.at(-1), r, 'request must not change accepted artwork or revision')
    }
    const final = await receipt(page)
    assert.ok(final.scopes.some(event => event.revision === r.revision &&
      event.activeScopes.includes('dialog.project-file')))
    assert.ok(final.scopes.some(event => event.revision === r.revision &&
      event.activeScopes.some(scope => scope === 'dialog.export-warning' || scope === 'dialog.export-destination')))
    assert.deepEqual(pageErrors, [])
  } catch (error) {
    if (pageErrors.length) throw new Error('Full App artwork case failed: ' + pageErrors.join('; '), { cause:error })
    throw error
  } finally { await page.close() }
})

// Reentry is a deterministic stress of the same registered commands, not a
// physical interaction or a claim that an ordinary user click runs in this stack.
for (const command of ['project.save', 'export.png']) {
  test('Disc preset accepted revision: reentrant ' + command + ' should capture matching persisted layout', { timeout: 60_000 }, async () => {
    const page = await browser.newPage()
    try {
      await page.route('**/*', request => {
        const url = request.request().url()
        return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
          ? request.continue() : request.abort('blockedbyclient')
      })
      await page.goto(origin + route)
      await page.locator('[data-smoke-id="home-new-disc"]').click()
      await reveal(page, 'Layout Presets')
      await page.getByLabel('Preset', { exact: true }).selectOption('classic-top-title')
      await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
      await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.guided.id ===
        'disc:guided-layout:classic-top-title')
      await drain(page)
      await page.getByLabel('Preset', { exact: true }).selectOption('centered-logo-archive')
      await page.evaluate(name => window.armDiscPresetReadback(name), command)
      await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
      await page.waitForFunction(() => Boolean(window.readDiscPresetReadback()?.terminal))
      const trial = await page.evaluate(() => window.readDiscPresetReadback())
      assert.equal(trial.synchronousCapture, true, 'readout must happen within the document publication stack')
      assert.notDeepEqual(trial.accepted, trial.previous, 'actual preset must change inherited renderer input applicable to the race')
      assert.notEqual(trial.terminal, 'not-executed')
      assert.notEqual(trial.terminal, 'success', 'browser does not support native output')
      if (command === 'project.save') assert.equal(trial.capture.revision, trial.revision)
      assert.deepEqual(trial.capture.input, trial.accepted, command + ' must use accepted R, not previous mirrored layout')
      if (command === 'export.png') {
        await reveal(page, 'Project File')
        const exportButton = page.getByRole('button', { name: 'Export PNG', exact: true })
        const captureOrdinary = async () => {
          await drain(page)
          await page.evaluate(() => window.observeOrdinaryDiscExport())
          const before = (await receipt(page)).commands.samples.length
          await exportButton.click()
          await page.waitForFunction(previous => window.readDiscSteamReceipt().commands.samples.length === previous + 1,
            before)
          const observed = await page.evaluate(() => window.readDiscPresetReadback())
          assert.deepEqual(observed.capture.input, observed.accepted, 'ordinary settled export uses accepted layout')
          return observed
        }
        const ordinary = await captureOrdinary()
        assert.equal(ordinary.revision, trial.revision)
        assert.deepEqual(ordinary.capture.input, trial.capture.input)
        assert.equal(ordinary.capture.input.rating.enabled, false, 'retained disabled rating stays disabled')

        await reveal(page, 'Layout Presets')
        await page.getByLabel('Preset', { exact: true }).selectOption('classic-top-title')
        await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
        await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.guided.id ===
          'disc:guided-layout:classic-top-title')
        const guided = await captureOrdinary()
        assert.ok(guided.revision > trial.revision)
        assert.equal(guided.capture.input.rating.enabled, false, 'Guided does not enable dormant rating')
      }
    } finally { await page.close() }
  })
}
