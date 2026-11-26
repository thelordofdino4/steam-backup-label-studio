// Actual Disc App and controls in sandboxed Chromium. Native substitutes are limited
// to fixture Steam transport, PNG validation, and Save/export destinations.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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
const uskAppId = 920010003
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
const testGames = new Map(${JSON.stringify([[retiredAppId, 'Retired Fixture Game'], [incomingAppId, 'Incoming Fixture Game'], [uskAppId, 'USK Fixture Game']])})
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
        ratings:args.appid === ${uskAppId} ? { usk:{ rating:'16' } } : { esrb:{ rating:'m', descriptors:'Violence' } },
        legal_notice:legal,
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
const fixtureOutputCoreModule = '\0sbls-history-output-core'
const fixtureOutputDialogModule = '\0sbls-history-output-dialog'
const fixtureOutputCore = `
import { invoke as realInvoke } from '@tauri-apps/api/core'
export function invoke(command, body, options) {
  return window.captureDiscHistoryOutput(command, body) ?? realInvoke(command, body, options)
}
`
const fixtureOutputDialog = `
import { save as realSave, confirm as realConfirm, open } from '@tauri-apps/plugin-dialog'
export { open }
export async function save(options) {
  return window.discHistoryFixtureDialog(options) ?? realSave(options)
}
export async function confirm(...args) {
  return window.discHistoryFixtureMayConfirm() ? true : realConfirm(...args)
}
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
        if (id === '@tauri-apps/api/core' && (caller?.endsWith('/src/tauri/projectPackageWrite.ts') ||
            caller?.endsWith('/src/tauri/pngFile.ts'))) return fixtureOutputCoreModule
        if (id === '@tauri-apps/plugin-dialog' && caller?.endsWith('/src/app/App.tsx')) return fixtureOutputDialogModule
        if (id === '@tauri-apps/api/core' && caller?.endsWith('/src/steam/steamApi.ts')) return steamModule
        if (id === '@tauri-apps/api/core' && caller?.endsWith('/src/tauri/importedImageValidation.ts')) return imageValidationModule
        if (id === '../steam/steamTitleArtworkImport' && caller?.endsWith('/src/hooks/useTitleArtwork.ts')) return titleArtworkProbeModule
        if (id === './appPngExportInputs' && caller?.endsWith('/src/app/App.tsx')) return pngProbeModule
        if (id === '../lifecycle/projectSession.ts' && caller?.endsWith('/src/app/appProjectSaveCommand.ts')) return saveProbeModule
      },
      load(id) {
        if (id === fixtureOutputCoreModule) return fixtureOutputCore
        if (id === fixtureOutputDialogModule) return fixtureOutputDialog
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

test('real Disc preset applies layout without changing a selected PEGI/USK rating', { timeout: 60_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    await page.route('**/*', request => {
      const url = request.request().url()
      return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
        ? request.continue() : request.abort('blockedbyclient')
    })
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Game Info Logos')
    await reveal(page, 'Rating badge')
    await page.getByLabel('Show rating badge', { exact: true }).check()
    await page.getByLabel('Rating system', { exact: true }).and(page.locator('#branding-rating-system')).selectOption('PEGI')
    await page.getByLabel('Rating value', { exact: true }).and(page.locator('#branding-rating-value')).selectOption('12')
    await page.getByLabel('Show additional USK badge', { exact: true }).check()
    const uskValue = page.getByLabel('USK rating value', { exact: true })
    await uskValue.selectOption('16')
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.usk?.value === '16')
    await reveal(page, 'Layout Presets')
    await page.getByLabel('Preset', { exact: true }).selectOption('centered-logo-archive')
    const before = (await receipt(page)).revisions.at(-1)
    await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
    await page.waitForFunction(revision => window.readDiscSteamReceipt().revisions.at(-1)?.revision > revision, before.revision)
    await drain(page)
    const after = (await receipt(page)).revisions.at(-1)
    assert.equal(after.revision, before.revision + 1)
    assert.equal(after.metadata.ratingSystem, 'PEGI')
    assert.equal(after.metadata.ratingValue, '12')
    assert.deepEqual(after.usk, { enabled: true, value: '16' })
    assert.notDeepEqual(after.ratingLayout, before.ratingLayout)
    await reveal(page, 'Game Info Logos')
    await reveal(page, 'Rating badge')
    assert.equal(await uskValue.inputValue(), '16')
  } finally { await page.close() }
})

test('real Disc suggested USK and manual USK edits retain PEGI and publish whole revisions', { timeout: 90_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    await page.route('**/*', request => {
      const url = request.request().url()
      return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
        ? request.continue() : request.abort('blockedbyclient')
    })
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Game')
    await start(page, uskAppId)
    await rejectLogo(page, uskAppId)
    await page.waitForFunction(appId => window.readDiscSteamReceipt().revisions.at(-1)?.game.appId === appId, uskAppId)
    await reveal(page, 'Additional metadata')
    await page.locator('#game-metadata-rating-system').selectOption('PEGI')
    await page.getByRole('button', { name: 'Find rating/legal candidates' }).click()
    const suggested = page.getByRole('button', { name: 'Use USK 16', exact: true })
    await suggested.waitFor()
    await drain(page)
    const before = (await receipt(page)).revisions.at(-1)
    assert.equal(before.metadata.ratingSystem, 'PEGI')
    assert.equal(before.rating, false)
    assert.equal(before.usk.enabled, false)
    await page.evaluate(() => window.armDiscStaleRatingReplay())
    await suggested.click()
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.usk.value === '16')
    await drain(page)
    const accepted = (await receipt(page)).revisions.at(-1)
    assert.equal(accepted.revision, before.revision + 1)
    assert.deepEqual(await page.evaluate(() => window.readDiscStaleRatingReplay()), {
      projected: 'no-op', full: 'no-op',
    }, 'neither old projection may publish after the genuine Apply')
    assert.equal(accepted.metadata.ratingValue, before.metadata.ratingValue)
    assert.equal(accepted.metadata.ratingSystem, 'PEGI')
    assert.equal(accepted.rating, true)
    assert.deepEqual(accepted.usk, { enabled: true, value: '16' })
    await reveal(page, 'Game Info Logos')
    await reveal(page, 'Rating badge')
    await page.getByLabel('USK rating value', { exact: true }).selectOption('0')
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.usk.value === '0')
    await drain(page)
    const edited = (await receipt(page)).revisions.at(-1)
    assert.equal(edited.revision, accepted.revision + 1)
    assert.deepEqual(edited.ratingLayout, accepted.ratingLayout)
    assert.deepEqual(edited.usk, { enabled: true, value: '0' })
    const toggle = page.getByRole('checkbox', { name: 'Show additional USK badge', exact: true })
    await toggle.uncheck()
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.usk.enabled === false)
    await drain(page)
    const disabled = (await receipt(page)).revisions.at(-1)
    assert.equal(disabled.revision, edited.revision + 1)
    assert.deepEqual(disabled.usk, { enabled: false, value: '0' })
    assert.equal(disabled.rating, true, 'supplemental toggle leaves primary rating enabled')
    await toggle.check()
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.usk.enabled === true)
    await drain(page)
    const restored = (await receipt(page)).revisions.at(-1)
    assert.equal(restored.revision, disabled.revision + 1)
    assert.deepEqual(restored.usk, edited.usk, 'toggle restores the deliberately chosen value')

  } finally { await page.close() }
})

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

test('mounted Disc history restores the real USK controls and acknowledges the committed render', { timeout: 90_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    await page.route('**/*', request => {
      const url = request.request().url()
      return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
        ? request.continue() : request.abort('blockedbyclient')
    })
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Game')
    await start(page, uskAppId)
    await rejectLogo(page, uskAppId)
    await page.waitForFunction(appId => window.readDiscSteamReceipt().revisions.at(-1)?.game.appId === appId, uskAppId)
    await reveal(page, 'Additional metadata')
    await page.locator('#game-metadata-rating-system').selectOption('PEGI')
    await page.getByRole('button', { name: 'Find rating/legal candidates' }).click()
    const useUsk = page.getByRole('button', { name: 'Use USK 16', exact: true })
    await useUsk.waitFor()
    await drain(page)
    const before = (await receipt(page)).revisions.at(-1)
    await useUsk.click()
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.usk.value === '16')
    await drain(page)
    const edited = (await receipt(page)).revisions.at(-1)
    await reveal(page, 'Game Info Logos')
    await reveal(page, 'Rating badge')
    assert.equal(await page.getByLabel('USK rating value', { exact: true }).inputValue(), '16')
    const accepted = async (direction, revision) => {
      assert.equal(await page.evaluate(step => window.stepDiscHistoryDiagnostic(step), direction), 'committed')
      await page.waitForFunction(revision => {
        const state = window.readDiscHistoryDiagnostic()
        return state.revision === revision && !state.pending
      }, revision)
      return (await receipt(page)).revisions.at(-1)
    }
    const undone = await accepted('undo', edited.revision + 1)
    assert.deepEqual(undone.usk, before.usk)
    assert.deepEqual(undone.ratingLayout, before.ratingLayout)
    const redone = await accepted('redo', edited.revision + 2)
    assert.deepEqual(redone.usk, edited.usk)
    assert.deepEqual(redone.ratingLayout, edited.ratingLayout)
    assert.equal(await page.getByLabel('USK rating value', { exact: true }).inputValue(), '16')
  } finally { await page.close() }
})

test('mounted Guided Classic history restores fitted placeholder geometry and slot identity', { timeout: 90_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    await page.route('**/*', request => {
      const url = request.request().url()
      return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
        ? request.continue() : request.abort('blockedbyclient')
    })
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Layout Presets')
    const preset = page.getByLabel('Preset', { exact: true })
    await preset.selectOption('classic-top-title')
    await drain(page)
    const before = (await receipt(page)).revisions.at(-1)
    const slots = page.locator('g[data-guided-slot-id] > foreignObject')
    const geometry = () => slots.evaluateAll(items => items.map(node => ({
      id: node.parentElement.getAttribute('data-guided-slot-id'),
      x: node.getAttribute('x'), y: node.getAttribute('y'),
      width: node.getAttribute('width'), height: node.getAttribute('height'),
      rotation: node.getAttribute('transform'),
    })))
    assert.deepEqual(await geometry(), [])
    await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.guided.id ===
      'disc:guided-layout:classic-top-title')
    await slots.first().waitFor({ state: 'attached' })
    await drain(page)
    const applied = (await receipt(page)).revisions.at(-1)
    const appliedGeometry = await geometry()
    assert.ok(appliedGeometry.some(slot => slot.id === 'disc:guided:game-title:primary'))
    assert.equal(await preset.inputValue(), '', 'successful Apply clears the picker')
    await preset.selectOption('centered-logo-archive')
    assert.equal(await page.evaluate(() => window.readDiscHistoryDiagnostic().revision), applied.revision)
    const step = async (direction, revision) => {
      assert.equal(await page.evaluate(direction => window.stepDiscHistoryDiagnostic(direction), direction), 'committed')
      await page.waitForFunction(revision => {
        const state = window.readDiscHistoryDiagnostic()
        return state.revision === revision && !state.pending
      }, revision)
      return (await receipt(page)).revisions.at(-1)
    }
    const undone = await step('undo', applied.revision + 1)
    assert.deepEqual(undone.guided, before.guided)
    assert.deepEqual(undone.ratingLayout, before.ratingLayout)
    assert.deepEqual(await geometry(), [])
    // The local preset picker is UI state, not history content.
    assert.equal(await preset.inputValue(), 'centered-logo-archive')

    const redone = await step('redo', applied.revision + 2)
    assert.deepEqual(redone.guided, applied.guided)
    assert.deepEqual(redone.ratingLayout, applied.ratingLayout)
    assert.deepEqual(await geometry(), appliedGeometry)
    assert.equal(await preset.inputValue(), 'centered-logo-archive')
  } finally { await page.close() }
})

test('authored Classic preset output matches Undo and Redo at the real Save and PNG seams', { timeout: 120_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    await page.route('**/*', request => {
      const url = request.request().url()
      return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
        ? request.continue() : request.abort('blockedbyclient')
    })
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Game')
    await reveal(page, 'Additional metadata')
    const title = 'Artwork Backup Test'
    await page.getByRole('textbox', { name: 'Label title', exact: true }).fill(title)
    await reveal(page, 'Game Title')
    await page.locator('[data-smoke-id="disc-sidebar-text-title"] input[type="checkbox"]').check()
    await reveal(page, 'Layout Presets')
    await page.getByLabel('Preset', { exact: true }).selectOption('classic-top-title')
    await reveal(page, 'Project File')
    await drain(page)
    const capture = async label => {
      const past = (await receipt(page)).commands.samples
        .filter(sample => sample.boundary === 'export.png' && sample.outcome === 'success').length
      await page.evaluate(label => window.armDiscHistoryOutput(label), label)
      await page.getByRole('button', { name: 'Save Project', exact: true }).click()
      await page.waitForFunction(label => window.readDiscHistoryOutput(label)?.project, label)
      await page.getByRole('button', { name: 'Export PNG', exact: true }).click()
      await page.waitForFunction(label => window.readDiscHistoryOutput(label)?.png, label)
      await page.waitForFunction(past => window.readDiscSteamReceipt().commands.samples
        .filter(sample => sample.boundary === 'export.png' && sample.outcome === 'success').length === past + 1, past)
      await page.evaluate(label => window.finishDiscHistoryOutput(label), label)
      const result = await page.evaluate(label => window.readDiscHistoryOutput(label), label)
      assert.equal(result.project.project.game.manualTitle, title)
      assert.equal(result.project.project.discText.settings.title, true)
      assert.ok(result.png.width > 100 && result.png.height > 100 && result.png.bytes > 1000)
      return result
    }
    const before = await capture('before')
    await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
    await page.waitForFunction(() => window.readDiscSteamReceipt().revisions.at(-1)?.guided.id ===
      'disc:guided-layout:classic-top-title')
    await drain(page)
    const applied = await capture('applied')
    assert.notDeepEqual(before.project, applied.project, 'preset must produce a distinct project')
    assert.notEqual(before.png.pixels, applied.png.pixels, 'authored title layout must produce different rendered pixels')
    const step = async direction => {
      const previous = await page.evaluate(() => window.readDiscHistoryDiagnostic().revision)
      assert.equal(await page.evaluate(direction => window.stepDiscHistoryDiagnostic(direction), direction), 'committed')
      await page.waitForFunction(revision => {
        const state = window.readDiscHistoryDiagnostic()
        return state.revision === revision && !state.pending
      }, previous + 1)
    }
    await step('undo')
    const undone = await capture('undo')
    assert.deepEqual(undone.project, before.project)
    assert.equal(undone.png.pixels, before.png.pixels)
    await step('redo')
    const redone = await capture('redo')
    assert.deepEqual(redone.project, applied.project)
    assert.equal(redone.png.pixels, applied.png.pixels)
  } finally { await page.close() }
})

test('template and reset keep every earlier Disc operation reachable in the mounted editor', { timeout: 90_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    await page.route('**/*', request => {
      const url = request.request().url()
      return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
        ? request.continue() : request.abort('blockedbyclient')
    })
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Layout Presets')
    await reveal(page, 'Template')
    const template = page.getByLabel('Disc type', { exact: true })
    const titleId = 'disc:guided:game-title:primary'
    const titleSlot = page.locator(`[data-guided-slot-id="${titleId}"]`).last()
    const selectablePreset = page.getByLabel('Preset', { exact: true })
    const capture = async () => page.evaluate(() => ({
      history: window.readDiscHistoryDiagnostic(), project: window.readDiscHistoryProject(),
    }))
    const settle = async (previous, past, future = 0) => {
      await page.waitForFunction(revision => {
        const state = window.readDiscHistoryDiagnostic()
        return state.revision === revision && !state.pending
      }, previous.history.revision + 1, { timeout: 8_000 })
      await drain(page)
      const observed = await capture()
      assert.equal(observed.history.revision, previous.history.revision + 1)
      assert.equal(observed.history.past, past)
      assert.equal(observed.history.future, future)
      return observed
    }
    await selectablePreset.selectOption('classic-top-title')
    await drain(page)
    const blank = await capture()
    await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
    const applied = await settle(blank, 1)
    assert.equal(applied.project.template.variant, 'standardPrintableDisc')
    await titleSlot.waitFor()
    await template.selectOption('stickyLabelDisc')
    const switched = await settle(applied, 2)
    assert.equal(switched.project.template.variant, 'stickyLabelDisc')
    assert.deepEqual(switched.project.editor, applied.project.editor)
    assert.equal(await template.inputValue(), 'stickyLabelDisc')
    await titleSlot.click()
    await page.getByRole('menuitem', { name: 'Remove Game Title from layout', exact: true }).click()
    const omitted = await settle(switched, 3)
    assert.deepEqual(omitted.project.editor.guidedLayout.omittedSlotIds, [titleId])
    await titleSlot.waitFor({ state: 'detached' })
    const resetControl = page.getByRole('button', { name: 'Reset guided progress', exact: true })
    await resetControl.click()
    const reset = await settle(omitted, 4)
    assert.deepEqual(reset.project, switched.project)
    await titleSlot.waitFor()
    await resetControl.waitFor({ state: 'detached', timeout: 8_000 })
    await drain(page)
    assert.deepEqual(await capture(), reset, 'clearing the progress controls publishes no additional edit')

    const step = async (previous, expected, direction, past, future) => {
      assert.equal(await page.evaluate(step => window.stepDiscHistoryDiagnostic(step), direction), 'committed')
      const result = await settle(previous, past, future)
      assert.deepEqual(result.project, expected.project)
      assert.equal(await template.inputValue(), expected.project.template.variant)
      const workflow = expected.project.editor?.guidedLayout
      await titleSlot.waitFor({ state: workflow && !workflow.omittedSlotIds.includes(titleId) ? 'visible' : 'detached' })
      return result
    }
    let current = reset
    const entries = [blank, applied, switched, omitted, reset]
    for (let past = 3; past >= 0; past--) current = await step(current, entries[past], 'undo', past, 4 - past)
    for (let past = 1; past <= 4; past++) current = await step(current, entries[past], 'redo', past, 4 - past)
  } finally { await page.close() }
})

test('Steam import after same-content Save As is one exact undoable edit', { timeout: 90_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
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
    await page.waitForFunction(() => window.readDiscHistoryProject().editor?.guidedLayout)
    await reveal(page, 'Game')
    await reveal(page, 'Project File')
    const read = () => page.evaluate(() => ({
      state: window.readDiscHistoryDiagnostic(), project: window.readDiscHistoryProject(),
    }))
    const prior = await read()
    assert.equal(prior.state.path, null)
    assert.equal(prior.state.past, 1)
    await start(page, newer.id)
    await page.evaluate(() => window.armDiscHistoryOutput('before'))
    await page.getByRole('button', { name: 'Save Project', exact: true }).click()
    await page.waitForFunction(() => Boolean(window.readDiscHistoryDiagnostic().path) &&
      !window.readDiscHistoryDiagnostic().dirty)
    const saved = await read()
    assert.equal(saved.state.revision, prior.state.revision)
    assert.deepEqual(saved.project, prior.project)
    assert.equal(await page.evaluate(id => window.discSteamTransportFixture.pending(id), newer.id), true)
    await page.evaluate(id => window.discSteamTransportFixture.resolveLogo(id), newer.id)
    await page.waitForFunction(({ id, revision }) => {
      const state = window.readDiscHistoryDiagnostic()
      return !state.pending && state.revision === revision && window.readDiscHistoryProject().game.selectedSteamGame?.appId === id
    }, { id: newer.id, revision: saved.state.revision + 1 }, { timeout: 12_000 })
    const imported = await read()
    assert.equal(imported.state.past, 2)
    assert.equal(imported.state.path, saved.state.path)
    assert.equal(imported.state.dirty, true)
    assert.equal(imported.project.titleArtwork.imageDataUrl, newer.dataUrl)
    assert.equal(imported.project.titleArtwork.defaultSteamLogo.imageDataUrl, newer.dataUrl)
    assert.equal(imported.project.discText.values.appId, String(newer.id))
    assert.equal(imported.project.discText.valueSources.copyright, 'metadata')
    assert.ok(imported.project.editor.guidedLayout.completedSlotIds.includes('disc:guided:game-title:primary'))
    const step = async (direction, expected, revision) => {
      assert.equal(await page.evaluate(direction => window.stepDiscHistoryDiagnostic(direction), direction), 'committed')
      await page.waitForFunction(revision => {
        const state = window.readDiscHistoryDiagnostic()
        return !state.pending && state.revision === revision
      }, revision, { timeout: 8_000 })
      const observed = await read()
      assert.equal(observed.state.path, saved.state.path)
      assert.equal(observed.state.dirty, expected.state.dirty)
      assert.deepEqual(observed.project, expected.project)
    }
    await step('undo', saved, imported.state.revision + 1)
    await step('redo', imported, imported.state.revision + 2)
    assert.equal(await page.evaluate(() => window.discSteamTransportFixture.requested()), 1)
  } finally { await page.close() }
})

test('imported artwork preview, package write, and PNG agree through Undo and Redo', { timeout: 120_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    await page.route('**/*', request => {
      const url = request.request().url()
      return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
        ? request.continue() : request.abort('blockedbyclient')
    })
    await page.goto(origin + route)
    const relayDirectory = process.env.SBLS_DISC_HISTORY_PACKAGE_RELAY
    if (relayDirectory) {
      await page.waitForFunction(() => typeof window.enableDiscHistoryPackageRelay === 'function')
      await page.evaluate(() => window.enableDiscHistoryPackageRelay())
    }
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Layout Presets')
    await page.getByLabel('Preset', { exact: true }).selectOption('classic-top-title')
    await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
    await page.waitForFunction(() => {
      const state = window.readDiscHistoryDiagnostic()
      return state.past === 1 && !state.pending
    })
    await reveal(page, 'Game')
    await reveal(page, 'Project File')
    const art = page.locator('[data-smoke-id="disc-preview"]')
      .getByRole('img', { name: 'Game title artwork', exact: true })
    const capture = async (label, expectedArtwork) => {
      if (expectedArtwork) {
        await art.waitFor({ timeout: 8_000 })
        assert.deepEqual(await art.evaluate(async element => {
          const image = element instanceof HTMLImageElement ? element : element.querySelector('img')
          await image.decode()
          return { source: image.getAttribute('src'), width: image.naturalWidth }
        }), { source: expectedArtwork, width: newer.width })
      } else await art.waitFor({ state: 'detached', timeout: 8_000 })
      const priorExports = (await receipt(page)).commands.samples
        .filter(sample => sample.boundary === 'export.png' && sample.outcome === 'success').length
      await page.evaluate(label => window.armDiscHistoryOutput(label), label)
      await page.getByRole('button', { name: 'Save Project', exact: true }).click()
      await page.waitForFunction(label => window.readDiscHistoryOutput(label)?.project &&
        !window.readDiscHistoryDiagnostic().dirty, label, { timeout: 12_000 })
      await page.getByRole('button', { name: 'Export PNG', exact: true }).click()
      await page.waitForFunction(({ label, priorExports }) => window.readDiscHistoryOutput(label)?.png &&
        window.readDiscSteamReceipt().commands.samples
          .filter(sample => sample.boundary === 'export.png' && sample.outcome === 'success').length === priorExports + 1,
      { label, priorExports }, { timeout: 12_000 })
      await page.evaluate(label => window.finishDiscHistoryOutput(label), label)
      return page.evaluate(label => window.readDiscHistoryOutput(label), label)
    }
    const before = await capture('before', null)
    await start(page, newer.id)
    await page.evaluate(id => window.discSteamTransportFixture.resolveLogo(id), newer.id)
    await page.waitForFunction(id => {
      const state = window.readDiscHistoryDiagnostic()
      return !state.pending && state.past === 2 && window.readDiscHistoryProject().game.selectedSteamGame?.appId === id
    }, newer.id, { timeout: 12_000 })
    const imported = await capture('applied', newer.dataUrl)
    assert.equal(imported.project.project.game.selectedSteamGame.appId, newer.id)
    assert.equal(imported.project.assetUrls.filter(url => url === newer.dataUrl).length, 1,
      'both title roles share one asset in the encoded write request')
    assert.ok(!before.project.assetUrls.includes(newer.dataUrl))
    const assetIndex = imported.project.assetUrls.indexOf(newer.dataUrl)
    for (const ownerId of ['disc.title.current', 'disc.title.default']) {
      const [binding, extra] = imported.project.plan.captures.filter(item => item.ownerId === ownerId)
      assert.equal(extra, undefined)
      assert.equal(binding?.decision.dataUrlIndex, assetIndex)
    }
    assert.notEqual(imported.png.pixels, before.png.pixels)
    const step = async direction => {
      const previous = await page.evaluate(() => window.readDiscHistoryDiagnostic().revision)
      assert.equal(await page.evaluate(direction => window.stepDiscHistoryDiagnostic(direction), direction), 'committed')
      await page.waitForFunction(revision => {
        const current = window.readDiscHistoryDiagnostic()
        return current.revision === revision && !current.pending
      }, previous + 1, { timeout: 8_000 })
    }
    await step('undo')
    const undone = await capture('undo', null)
    assert.deepEqual(undone.project, before.project)
    assert.equal(undone.png.pixels, before.png.pixels)
    await step('redo')
    const redone = await capture('redo', newer.dataUrl)
    assert.deepEqual(redone.project, imported.project)
    assert.equal(redone.png.pixels, imported.png.pixels)
    if (relayDirectory) {
      for (const label of ['before', 'applied', 'undo', 'redo']) {
        const raw = await page.evaluate(label => window.readDiscHistoryPackageRequest(label), label)
        assert.ok(raw.length > 20, 'the production Save command emitted a complete native request')
        await writeFile(join(relayDirectory, label + '.request'), Uint8Array.from(raw), { flag: 'wx' })
      }
    }
  } finally { await page.close() }
})

test('mounted logo layout Reset preserves the import and preset Undo steps', { timeout: 90_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    await page.route('**/*', request => {
      const url = request.request().url()
      return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
        ? request.continue() : request.abort('blockedbyclient')
    })
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-disc"]').click()
    await reveal(page, 'Game')
    await reveal(page, 'Layout Presets')
    await reveal(page, 'Game Title')
    const current = () => page.evaluate(() => window.readDiscHistoryProject())
    const settle = (past, future) => page.waitForFunction(({ past, future }) => {
      const state = window.readDiscHistoryDiagnostic()
      return !state.pending && state.past === past && state.future === future
    }, { past, future }, { timeout: 8_000 })
    const original = await current()
    await start(page, newer.id)
    await page.evaluate(id => window.discSteamTransportFixture.resolveLogo(id), newer.id)
    await settle(1, 0)
    const imported = await current()
    assert.equal(imported.game.selectedSteamGame?.appId, newer.id)
    await page.getByLabel('Preset', { exact: true }).selectOption('centered-logo-archive')
    await page.getByRole('button', { name: 'Apply preset', exact: true }).click()
    await settle(2, 0)
    const applied = await current()
    await page.getByRole('button', { name: 'Reset game logo layout', exact: true }).click()
    await settle(3, 0)
    const reset = await current()
    assert.notDeepEqual(reset.titleArtwork.layout, applied.titleArtwork.layout)
    assert.equal(reset.titleArtwork.imageDataUrl, newer.dataUrl)
    assert.deepEqual(reset, { ...applied, titleArtwork: { ...applied.titleArtwork, layout: reset.titleArtwork.layout } })
    for (const [index, expected] of [applied, imported, original].entries()) {
      assert.equal(await page.evaluate(() => window.stepDiscHistoryDiagnostic('undo')), 'committed')
      await settle(2 - index, index + 1)
      assert.deepEqual(await current(), expected)
    }
    for (const [index, expected] of [imported, applied, reset].entries()) {
      assert.equal(await page.evaluate(() => window.stepDiscHistoryDiagnostic('redo')), 'committed')
      await settle(index + 1, 2 - index)
      assert.deepEqual(await current(), expected)
    }
  } finally { await page.close() }
})

test('Case Steam import publishes game, artwork, and back-cover in one accepted revision', { timeout: 90_000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    await page.route('**/*', request => {
      const url = request.request().url()
      return url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')
        ? request.continue() : request.abort('blockedbyclient')
    })
    await page.goto(origin + route)
    await page.locator('[data-smoke-id="home-new-case-insert"]').click()
    await reveal(page, 'Game')
    await reveal(page, 'Additional metadata')
    const title = page.getByRole('textbox', { name: 'Label title', exact: true })
    await title.waitFor({ timeout: 5_000 })
    const visibleBefore = await title.inputValue()
    const before = await page.evaluate(() => window.readCaseSteamDiagnostic())
    await start(page, newer.id)
    assert.deepEqual(await page.evaluate(() => window.readCaseSteamDiagnostic()), before,
      'external artwork has not yet completed, so no project owner changes')
    await page.evaluate(id => window.discSteamTransportFixture.resolveLogo(id), newer.id)
    await page.waitForFunction(({ appId, prior }) => {
      const state = window.readCaseSteamDiagnostic()
      return state && !state.pending && state.revision === prior + 1 && state.project.game.selectedSteamGame?.appId === appId
    }, { appId: newer.id, prior: before.revision }, { timeout: 12_000 })
    await drain(page)
    const after = await page.evaluate(() => window.readCaseSteamDiagnostic())
    assert.equal(after.revision, before.revision + 1)
    assert.equal(after.sessionId, before.sessionId)
    assert.equal(after.project.metadata.steamAppId, String(newer.id))
    assert.equal(after.project.caseInsert.templates.cover.titleArtwork.imageDataUrl, newer.dataUrl)
    assert.equal(after.project.caseInsert.templates.tray.titleArtwork.defaultSteamLogo.imageDataUrl, newer.dataUrl)
    const legalBlock = after.project.caseInsert.templates.tray.textBlocks.find(block => block.id === 'tray-copyright-text')
    assert.equal(legalBlock?.value, legal)
    assert.deepEqual(after.project.caseInsert.export, before.project.caseInsert.export)
    assert.equal(await title.inputValue(), 'Incoming Fixture Game')
    const step = async (direction, expected, revision, past, future, visibleTitle) => {
      assert.equal(await page.evaluate(direction => window.stepCaseHistoryDiagnostic(direction), direction), 'committed')
      await page.waitForFunction(revision => {
        const settled = window.readCaseSteamDiagnostic()
        return settled && !settled.pending && settled.revision === revision
      }, revision, { timeout: 8_000 })
      const observed = await page.evaluate(() => window.readCaseSteamDiagnostic())
      assert.deepEqual(observed.project, expected.project)
      assert.equal(observed.past, past)
      assert.equal(observed.future, future)
      assert.equal(observed.applicationRevision, after.applicationRevision + revision - after.revision)
      assert.equal(await title.inputValue(), visibleTitle)
    }
    await step('undo', before, after.revision + 1, 0, 1, visibleBefore)
    await step('redo', after, after.revision + 2, 1, 0, 'Incoming Fixture Game')
  } finally { await page.close() }
})
