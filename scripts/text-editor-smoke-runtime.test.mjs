import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import {
  findTextEditorSmokeBrowserExecutable,
  isTextEditorSmokeAppServing,
  launchTextEditorSmokeBrowser,
  requestText,
  waitForTextEditorSmokeApp,
} from './text-editor-smoke-runtime.mjs'

function createServer(body, statusCode = 200) {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      response.writeHead(statusCode, { 'Content-Type': 'text/html' })
      response.end(body)
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({
        close: () => new Promise((closeResolve) => server.close(closeResolve)),
        url: `http://127.0.0.1:${address.port}/`,
      })
    })
  })
}

test('text editor smoke runtime request helper returns status and body', async () => {
  const server = await createServer('<div id="root"></div>', 202)

  try {
    const response = await requestText(server.url)

    assert.deepEqual(response, {
      body: '<div id="root"></div>',
      statusCode: 202,
    })
  } finally {
    await server.close()
  }
})

test('text editor smoke runtime serving probe requires the app root', async () => {
  const appServer = await createServer('<html><div id="root"></div></html>')
  const nonAppServer = await createServer('<html><main>not this app</main></html>')

  try {
    assert.equal(await isTextEditorSmokeAppServing(appServer.url), true)
    assert.equal(await isTextEditorSmokeAppServing(nonAppServer.url), false)
  } finally {
    await appServer.close()
    await nonAppServer.close()
  }
})

test('text editor smoke runtime browser lookup uses the first existing candidate', () => {
  const executable = findTextEditorSmokeBrowserExecutable(
    ['missing-browser', 'existing-browser', 'later-browser'],
    (candidate) => candidate === 'existing-browser',
  )

  assert.equal(executable, 'existing-browser')
})

test('text editor smoke runtime browser launch keeps default and custom args explicit', async () => {
  const launchedOptions = []
  const chromiumLauncher = {
    launch: async (options) => {
      launchedOptions.push(options)
      return { close: async () => {} }
    },
  }
  const log = () => {}

  await launchTextEditorSmokeBrowser({
    browserCandidates: [],
    chromiumLauncher,
    log,
  })
  await launchTextEditorSmokeBrowser({
    args: ['--disable-gpu', '--force-device-scale-factor=1'],
    browserCandidates: ['capture-browser'],
    chromiumLauncher,
    existsSync: (candidate) => candidate === 'capture-browser',
    log,
  })

  assert.deepEqual(launchedOptions, [
    {
      args: ['--disable-gpu'],
      headless: true,
    },
    {
      args: ['--disable-gpu', '--force-device-scale-factor=1'],
      executablePath: 'capture-browser',
      headless: true,
    },
  ])
})

test('text editor smoke runtime timeout preserves failure wording', async () => {
  let message = ''

  await assert.rejects(
    () => waitForTextEditorSmokeApp({
      baseUrl: 'http://127.0.0.1:59999/',
      fail(nextMessage) {
        message = nextMessage
        throw new Error(nextMessage)
      },
      isAppServing: async () => false,
      startupTimeoutMs: 0,
    }),
    /Vite did not serve http:\/\/127\.0\.0\.1:59999\/ within 0ms\./,
  )
  assert.equal(
    message,
    'Vite did not serve http://127.0.0.1:59999/ within 0ms.',
  )
})
