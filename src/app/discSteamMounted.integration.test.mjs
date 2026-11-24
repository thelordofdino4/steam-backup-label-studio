// Actual Disc App and controls in sandboxed Chromium. No native mocks outside Steam.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../../', import.meta.url))
const route = '/__disc-steam-366'
const entryURL = '/__disc-steam-366-entry.mjs'
const entryModule = '\0sbls-366-mounted-entry'
const steamModule = '\0sbls-366-steam-transport'
const entry = await readFile(new URL('./testing/discSteamMountedFixture.mjs', import.meta.url), 'utf8')
const retiredAppId = 920010001
const incomingAppId = 920010002
const legal = 'Fixture Game © Fixture Studio. Fixture Game is a trademark of Fixture Studio. All rights reserved.'
const syntheticTransport = `
const testGames = new Map(${JSON.stringify([[retiredAppId, 'Retired Fixture Game'], [incomingAppId, 'Incoming Fixture Game']])})
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
      return new Promise((resolve,reject) => pending.set(id,reject))
    }
    default: throw Error('Unexpected Steam fixture transport command')
  }
}
window.discSteamTransportFixture = Object.freeze({
  pending: id => pending.has(id),
  requested: () => requested,
  rejectLogo(id) {
    const reject = pending.get(id)
    if (!reject) throw Error('Expected a requested synthetic logo')
    pending.delete(id)
    reject(new Error('Synthetic logo unavailable'))
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
        const fromSteam = importer?.replaceAll('\\', '/').endsWith('/src/steam/steamApi.ts')
        if (id === '@tauri-apps/api/core' && fromSteam) return steamModule
      },
      load(id) {
        if (id === entryModule) return entry
        if (id === steamModule) return syntheticTransport
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
    await page.getByLabel('Subtitle / edition', { exact: true }).fill(subtitle)
    await page.waitForFunction(value => window.readDiscSteamReceipt().revisions.at(-1)?.metadata.subtitle === value, subtitle)
    const editRevision = (await receipt(page)).revisions.at(-1).revision
    await rejectLogo(page, retiredAppId)
    await drain(page)
    assert.equal(await page.getByLabel('Subtitle / edition', { exact: true }).inputValue(), subtitle)
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
