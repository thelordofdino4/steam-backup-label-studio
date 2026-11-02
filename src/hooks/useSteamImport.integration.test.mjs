import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Headless behavioral diagnostics of the real hook + Steam transport adapter.
// Deferred native-invoke responses make races deterministic; no live Steam
// requests or native-window/visual acceptance are involved.
const fixturePath = '/__steam-search-hook-fixture'
const fixtureHtml = `<!doctype html><div id="root"></div><script type="module">
import { act, createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useSteamImport } from '/src/hooks/useSteamImport.ts'
import { createApplicationLifecycleRuntime } from '/src/app/applicationLifecycleRuntime.ts'
import { ApplicationLifecycleRuntimeContext } from '/src/app/applicationLifecycleRuntimeContext.ts'
import { createApplicationLifecycleCompositionRoot } from '/src/lifecycle/applicationLifecycleCompositionRoot.ts'
import { createNewProjectSession } from '/src/lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '/src/project/blankDiscProject.ts'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let api
const requests = [], statuses = [], applied = [], commands = []
let importFailure = false, deferImports = false, failApply = false
const imports = [], preparations = []
window.__TAURI_INTERNALS__ = {
  invoke(command, args) {
    commands.push({ command, args })
    if (command === 'search_steam_store') {
      return new Promise((resolve, reject) => requests.push({ resolve, reject, term: args.term }))
    }
    if (command === 'fetch_steam_app_details') {
      if (deferImports) return new Promise((resolve, reject) => imports.push({ resolve, reject, appId: args.appid }))
      if (importFailure) return Promise.reject('details unavailable')
      return Promise.resolve(JSON.stringify({ 42: { success: true, data: {
        name: 'Imported game', developers: ['Developer'], publishers: ['Publisher'],
      } } }))
    }
    if (command === 'fetch_steam_store_items') return Promise.resolve('{}')
    if (command === 'find_steam_library_cache_assets') return Promise.resolve([])
    return Promise.reject(new Error('Unexpected command: ' + command))
  },
}
function Owner() {
  api = useSteamImport({ announceStatus: message => statuses.push(message) })
  return null
}
const runtime = createApplicationLifecycleRuntime({ createRoot: options => createApplicationLifecycleCompositionRoot({ ...options, initialState: createNewProjectSession({ sessionId: 'test-session', project: createBlankDiscSavedProject() }) }) })
const root = createRoot(document.getElementById('root'))
await act(async () => { root.render(createElement(StrictMode, null, createElement(ApplicationLifecycleRuntimeContext.Provider, { value: runtime }, createElement(Owner)))) })
window.searchHarness = {
  async start(query) {
    await act(async () => { api.setGameSearchQuery(query) })
    await act(async () => {
      const completion = api.handleSteamSearch()
      if (query.trim()) requests.at(-1).completion = completion
    })
    return requests.length - 1
  },
  async settle(index, outcome) {
    await act(async () => {
      const request = requests[index]
      if ('error' in outcome) request.reject(outcome.error)
      else request.resolve('raw' in outcome ? outcome.raw : JSON.stringify({ items: outcome.items }))
      await request.completion
    })
  },
  async invalidate(action) {
    if (action === 'empty') return this.start('   ')
    await act(async () => { api[action]() })
  },
  async edit(query) { await act(async () => { api.setGameSearchQuery(query) }) },
  async startImport(appId, stage = false) {
    deferImports = true
    await act(async () => {
      const completion = api.runSteamImport(appId, async result => {
        if (stage) await new Promise((resolve, reject) => preparations.push({ resolve, reject }))
        return () => {
          if (failApply) throw new Error('private-apply-path')
          applied.push(result)
          api.setSelectedSteamGame(result.importedGame)
          statuses.push('Imported ' + result.importedGame.title)
        }
      })
      imports.at(-1).completion = completion
    })
  },
  async settleImport(index, fail, staged = false) {
    await act(async () => {
      const request = imports[index]
      if (fail) request.reject('old import failed')
      else request.resolve(JSON.stringify({ [request.appId]: { success: true, data: { name: 'Game ' + request.appId, developers: ['D'], publishers: ['P'] } } }))
      if (!staged) await request.completion
    })
  },
  async settlePreparation(index, fail) {
    await act(async () => {
      if (fail) preparations[index].reject('artwork failed')
      else preparations[index].resolve()
    })
  },
  async changeProject() {
    await act(async () => {
      const session = runtime.root.getLifecycleState().activeSession
      const project = { ...session.project, title: 'Edited while pending' }
      runtime.root.synchronizeCurrentProject({ sessionId: session.id, kind: session.kind, project })
    })
  },
  async importGame(fail) {
    importFailure = fail
    await act(async () => {
      await api.runSteamImport(42, result => () => {
        applied.push(result)
        api.setSelectedSteamGame(result.importedGame)
        api.clearSteamSearchResults()
      })
    })
  },
  diagnostics() { return JSON.parse(runtime.diagnostics.toJson()) },
  failApplication() { failApply = true },
  snapshot() {
    return {
      query: api.gameSearchQuery, results: api.steamSearchResults,
      loading: api.isSteamSearchLoading, importLoading: api.isSteamImportLoading,
      selected: api.selectedSteamGame, statuses: [...statuses], applied: [...applied],
      requests: requests.map(({ term }) => term), commands: [...commands],
    }
  },
}
</script>`

let server, browser, page, url

test.before(async () => {
  server = await createServer({
    // Parallel fixture servers must not mutate one shared Vite dependency cache.
    cacheDir: 'node_modules/.vite-test-steam-import',
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{
      name: 'steam-search-hook-fixture',
      configureServer(vite) {
        vite.middlewares.use(async (request, response, next) => {
          if (request.url !== fixturePath) return next()
          try {
            const html = await vite.transformIndexHtml(fixturePath, fixtureHtml)
            response.setHeader('Content-Type', 'text/html')
            response.end(html)
          } catch (error) { next(error) }
        })
      },
    }],
  })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('Missing fixture server address')
  url = `http://127.0.0.1:${address.port}${fixturePath}`
  browser = await chromium.launch({ headless: true })
})
test.beforeEach(async () => {
  page = await browser.newPage()
  await page.goto(url)
  await page.waitForFunction(() => Boolean(window.searchHarness))
})
test.afterEach(async () => { await page?.close() })
test.after(async () => { await browser?.close(); await server?.close() })

const start = query => page.evaluate(query => window.searchHarness.start(query), query)
const settle = (index, outcome) => page.evaluate(
  ([index, outcome]) => window.searchHarness.settle(index, outcome), [index, outcome],
)
const snapshot = () => page.evaluate(() => window.searchHarness.snapshot())
const item = (id, name) => ({ id, name })
const successA = { items: [item(1, 'Older')] }

for (const outcome of [successA, { error: 'older failure' }]) {
  test(`older ${'error' in outcome ? 'failure' : 'success'} cannot replace B success`, async () => {
    await start('A')
    await start('B')
    await settle(1, { items: [item(2, 'Newest')] })
    const accepted = await snapshot()
    assert.equal(accepted.results[0].title, 'Newest')
    assert.equal(accepted.loading, false)
    await settle(0, outcome)
    assert.deepEqual(await snapshot(), accepted)
  })
  test(`older ${'error' in outcome ? 'failure' : 'success'} publishes nothing while B is pending`, async () => {
    await start('A')
    await start('B')
    const pending = await snapshot()
    await settle(0, outcome)
    assert.deepEqual(await snapshot(), pending)
    assert.equal(pending.loading, true)
    await settle(1, { items: [item(2, 'Newest')] })
    assert.equal((await snapshot()).loading, false)
  })
  for (const action of ['resetSteamImportState', 'clearSteamSearchResults', 'empty']) {
    test(`${action} invalidates pending ${'error' in outcome ? 'failure' : 'success'} and releases loading`, async () => {
      await start('A')
      await page.evaluate(action => window.searchHarness.invalidate(action), action)
      const invalidated = await snapshot()
      assert.equal(invalidated.loading, false)
      assert.deepEqual(invalidated.results, [])
      if (action === 'empty') assert.equal(invalidated.statuses.at(-1), 'Enter a Steam game title or App ID to search.')
      await settle(0, outcome)
      assert.deepEqual(await snapshot(), invalidated)
      await start('After invalidation')
      await settle(1, { items: [item(3, 'Current')] })
      assert.equal((await snapshot()).results[0].title, 'Current')
    })
  }
}

test('identical normalized query submissions receive distinct generations', async () => {
  await start(' Same ')
  await start('Same')
  await settle(1, { items: [item(2, 'Newer same query')] })
  const accepted = await snapshot()
  assert.deepEqual(accepted.requests, ['Same', 'Same'])
  await settle(0, successA)
  assert.deepEqual(await snapshot(), accepted)
})

test('editing text without submitting does not invalidate the accepted request', async () => {
  await start('A')
  await page.evaluate(() => window.searchHarness.edit('Unsubmitted draft'))
  await settle(0, successA)
  const state = await snapshot()
  assert.equal(state.query, 'Unsubmitted draft')
  assert.equal(state.results[0].title, 'Older')
  assert.equal(state.loading, false)
})

for (const [outcome, expectedStatus, resultCount] of [
  [{ items: [item(1, 'One')] }, 'Found 1 Steam result.', 1],
  [{ items: [item(1, 'One'), item(2, 'Two')] }, 'Found 2 Steam results.', 2],
  [{ items: [] }, 'Steam returned no results. Manual title entry is still available.', 0],
  [{ error: 'network unavailable' }, 'Steam search could not be completed. Check your connection and try again.', 0],
]) {
  test(`current request publishes: ${expectedStatus}`, async () => {
    await start(' Current ')
    await settle(0, outcome)
    const state = await snapshot()
    assert.equal(state.loading, false)
    assert.equal(state.results.length, resultCount)
    assert.deepEqual(state.statuses, ['Searching Steam for "Current"...', expectedStatus])
  })
}

test('malformed current transport response reports failure and releases loading', async () => {
  await start('A')
  await settle(0, { raw: '{' })
  const state = await snapshot()
  assert.equal(state.statuses.at(-1), 'Steam search could not be completed. Check your connection and try again.')
  assert.equal(state.loading, false)
})

test('Steam import still applies real normalized metadata and its clear invalidates pending search', async () => {
  await start('A')
  await page.evaluate(() => window.searchHarness.importGame(false))
  const imported = await snapshot()
  assert.equal(imported.applied.length, 1)
  assert.equal(imported.applied[0].manualGameTitle, 'Imported game')
  assert.equal(imported.selected.appId, 42)
  assert.deepEqual(imported.selected.developer, ['Developer'])
  assert.equal(imported.importLoading, false)
  assert.equal(imported.loading, false)
  await settle(0, successA)
  assert.deepEqual(await snapshot(), imported)
})

test('Steam import failure still reports without applying state', async () => {
  await page.evaluate(() => window.searchHarness.importGame(true))
  const state = await snapshot()
  assert.deepEqual(state.applied, [])
  assert.equal(state.selected, null)
  assert.equal(state.importLoading, false)
  assert.equal(state.statuses.at(-1), 'Steam game details could not be loaded. Check your connection and try again.')
})

for (const fail of [false, true]) {
  test(`older game import ${fail ? 'failure' : 'success'} cannot overwrite a newer import`, async () => {
    await page.evaluate(() => window.searchHarness.startImport(1))
    await page.evaluate(() => window.searchHarness.startImport(2))
    await page.evaluate(() => window.searchHarness.settleImport(1, false))
    const accepted = await snapshot()
    assert.equal(accepted.selected.appId, 2)
    assert.equal(accepted.importLoading, false)
    await page.evaluate(fail => window.searchHarness.settleImport(0, fail), fail)
    assert.deepEqual(await snapshot(), accepted)
  })
  for (const action of ['reset', 'edit']) {
    test(`${action} revokes pending game import ${fail ? 'failure' : 'success'}`, async () => {
      await page.evaluate(() => window.searchHarness.startImport(1))
      await page.evaluate(async action => {
        if (action === 'reset') await window.searchHarness.invalidate('resetSteamImportState')
        else await window.searchHarness.changeProject()
      }, action)
      const current = await snapshot()
      assert.equal(current.importLoading, false)
      await page.evaluate(fail => window.searchHarness.settleImport(0, fail), fail)
      assert.deepEqual(await snapshot(), current)
      assert.deepEqual(current.applied, [])
    })
  }
  test(`reset during artwork preparation suppresses ${fail ? 'failure' : 'application'}`, async () => {
    await page.evaluate(() => window.searchHarness.startImport(1, true))
    await page.evaluate(() => window.searchHarness.settleImport(0, false, true))
    assert.deepEqual((await snapshot()).applied, [])
    await page.evaluate(() => window.searchHarness.invalidate('resetSteamImportState'))
    const current = await snapshot()
    await page.evaluate(fail => window.searchHarness.settlePreparation(0, fail), fail)
    assert.deepEqual(await snapshot(), current)
  })
}

test('current prepared game import commits once after its final wait', async () => {
  await page.evaluate(() => window.searchHarness.startImport(1, true))
  await page.evaluate(() => window.searchHarness.settleImport(0, false, true))
  assert.deepEqual((await snapshot()).applied, [])
  assert.equal((await snapshot()).importLoading, true)
  await page.evaluate(() => window.searchHarness.settlePreparation(0, false))
  const accepted = await snapshot()
  assert.equal(accepted.selected.appId, 1)
  assert.equal(accepted.applied.length, 1)
  assert.equal(accepted.importLoading, false)
})


test('search report excludes query/error/results, and stale completion remains cancelled without replacing accepted UI', async () => {
  await start('private-query-A')
  await start('private-query-B')
  await settle(1, { items: [item(2, 'private-game-name')] })
  const accepted = await snapshot()
  await settle(0, { error: 'private-path-token' })
  assert.deepEqual(await snapshot(), accepted)
  const report = await page.evaluate(() => window.searchHarness.diagnostics())
  const records = report.records.filter(record => record.workflowId === 'steam.search')
  assert.deepEqual(records.map(record => [record.requestId, record.status, record.stage]), [[1, 'cancelled', 'fetch-and-normalize'], [2, 'success', 'fetch-and-normalize']])
  assert.doesNotMatch(JSON.stringify(report), /private|query|cause|title|bytes/)
  assert.ok(records.every(record => record.elapsedMs >= 0))
})

test('current search failure records its safe category without raw native content', async () => {
  await start('private-query')
  await settle(0, { error: 'private-native-path-token' })
  const record = (await page.evaluate(() => window.searchHarness.diagnostics())).records.at(-1)
  assert.equal(record.workflowId, 'steam.search')
  assert.equal(record.status, 'failure')
  assert.equal(record.failureCode, 'steam.search-failed')
  assert.equal(record.stage, 'fetch-and-normalize')
  assert.doesNotMatch((await snapshot()).statuses.at(-1), /private/)
})

for (const stage of ['fetch-and-normalize', 'prepare', 'apply']) {
  test(`Steam import reports current ${stage} failure through the existing request owner`, async () => {
    if (stage === 'apply') await page.evaluate(() => window.searchHarness.failApplication())
    await page.evaluate(() => window.searchHarness.startImport(1, true))
    if (stage === 'fetch-and-normalize') await page.evaluate(() => window.searchHarness.settleImport(0, true))
    else {
      await page.evaluate(() => window.searchHarness.settleImport(0, false, true))
      const pending = (await page.evaluate(() => window.searchHarness.diagnostics())).records.at(-1)
      assert.equal(pending.status, 'running')
      assert.equal(pending.stage, 'prepare')
      await page.evaluate(fail => window.searchHarness.settlePreparation(0, fail), stage === 'prepare')
    }
    const report = await page.evaluate(() => window.searchHarness.diagnostics())
    const record = report.records.at(-1)
    assert.equal(record.workflowId, 'steam.import')
    assert.equal(record.requestId, 1)
    assert.equal(record.status, 'failure')
    assert.equal(record.stage, stage)
    assert.equal(record.failureCode, stage === 'fetch-and-normalize' ? 'steam.import-fetch-failed' : `steam.import-${stage}-failed`)
    assert.deepEqual((await snapshot()).applied, [])
    assert.doesNotMatch(JSON.stringify(report), /private|cause|title|bytes|appId|session/)
    assert.doesNotMatch((await snapshot()).statuses.at(-1), /private|old import failed|artwork failed/)
  })
}

test('retired import preparation records cancellation and never success or a current failure', async () => {
  await page.evaluate(() => window.searchHarness.startImport(1, true))
  await page.evaluate(() => window.searchHarness.settleImport(0, false, true))
  await page.evaluate(() => window.searchHarness.invalidate('resetSteamImportState'))
  const current = await snapshot()
  await page.evaluate(() => window.searchHarness.settlePreparation(0, true))
  assert.deepEqual(await snapshot(), current)
  const record = (await page.evaluate(() => window.searchHarness.diagnostics())).records.at(-1)
  assert.equal(record.status, 'cancelled')
  assert.equal(record.failureCode, undefined)
  assert.equal(record.stage, 'prepare')
})
