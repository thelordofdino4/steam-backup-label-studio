import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

let server
let browser
let page
let url

test.before(async () => {
  server = await createServer({
    logLevel: 'silent',
    cacheDir: fileURLToPath(new URL('../../../logs/title-upload-test-cache', import.meta.url)),
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.ok(address && typeof address !== 'string')
  url = `http://127.0.0.1:${address.port}/src/hooks/testing/title-artwork-upload.html`
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage()
})
test.after(async () => {
  await page?.close()
  await browser?.close()
  await server?.close()
})

async function seed(enabled) {
  await page.goto(url)
  await page.waitForFunction(() => Boolean(window.__titleUploadHarness))
  await page.evaluate((enabled) => window.__titleUploadHarness.seed(enabled), enabled)
  return page.evaluate(() => window.__titleUploadHarness.snapshot().artwork)
}

for (const enabled of [false, true]) {
  for (const kind of ['unsupported', 'oversized']) {
    test(`${kind} title upload retains actionable guidance and ${enabled ? 'enabled' : 'disabled'} accepted artwork`, async () => {
      const before = await seed(enabled)
      const inputValue = await page.evaluate(async (kind) => {
        const file = kind === 'unsupported'
          ? new File(['<svg/>'], 'unsupported.svg', { type: 'image/svg+xml' })
          : new File(['small fixture'], 'oversized.png', { type: 'image/png' })
        // Exercise the production size preflight without allocating 64 MiB.
        if (kind === 'oversized') Object.defineProperty(file, 'size', { value: 67_108_865 })
        const result = await window.__titleUploadHarness.upload(file)
        await new Promise(requestAnimationFrame)
        return result
      }, kind)
      const after = await page.evaluate(() => window.__titleUploadHarness.snapshot())
      assert.equal(inputValue, '')
      assert.deepEqual(after.artwork, before)
      assert.equal(after.placements, 0)
      assert.equal(after.completions, 0)
      assert.deepEqual(after.messages, [kind === 'unsupported'
        ? 'Choose PNG, JPEG, WebP, GIF, or BMP. Convert SVG or other formats to PNG before importing.'
        : 'This image is too large. Choose a file at most 64 MiB before importing.'])
    })
  }
}

test('unexpected title file-read failure keeps the existing fallback and accepted state', async () => {
  const before = await seed(true)
  await page.evaluate(async () => {
    // A non-Blob object reaches FileReader's real type check and rejects.
    await window.__titleUploadHarness.upload({ type: 'image/png', size: 5, name: 'unreadable.png' })
    await new Promise(requestAnimationFrame)
  })
  const after = await page.evaluate(() => window.__titleUploadHarness.snapshot())
  assert.deepEqual(after.artwork, before)
  assert.deepEqual(after.messages, ['Game logo image could not be read.'])
  assert.equal(after.placements, 0)
  assert.equal(after.completions, 0)
})

const BMP_BASE64 = 'Qk06AAAAAAAAADYAAAAoAAAAAQAAAAEAAAABABgAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

test('unsupported title raster profile retains codec guidance and accepted state', async () => {
  const before = await seed(true)
  await page.evaluate(async (encoded) => {
    window.__TAURI_INTERNALS__ = { invoke: async (command) => {
      if (command !== 'validate_imported_image_asset') throw Error('Unexpected command')
      throw { code: 'project.package.asset-bmp-profile-unsupported' }
    } }
    const bytes = Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0))
    await window.__titleUploadHarness.upload(new File([bytes], 'profile.bmp', { type: 'image/bmp' }))
    await new Promise(requestAnimationFrame)
  }, BMP_BASE64)
  const after = await page.evaluate(() => window.__titleUploadHarness.snapshot())
  assert.deepEqual(after.artwork, before)
  assert.deepEqual(after.messages, ['This image format or profile cannot be saved in a project. Choose PNG, JPEG, WebP, GIF, or BMP. Convert SVG or other formats to PNG before importing.'])
  assert.equal(after.placements, 0)
  assert.equal(after.completions, 0)
})

test('accepted title upload still adopts exact bytes and retains the Steam default', async () => {
  const before = await seed(false)
  const validationCalls = await page.evaluate(async (encoded) => {
    let calls = 0
    // Only the native codec response is stubbed; FileReader, image decode,
    // content bounds, hook state and placement/completion are production paths.
    window.__TAURI_INTERNALS__ = { invoke: async (command, bytes) => {
      if (command !== 'validate_imported_image_asset' || !(bytes instanceof Uint8Array)) {
        throw Error('Unexpected validation transport')
      }
      calls++
      return { status: 'success', mimeType: 'image/bmp', width: 1, height: 1 }
    } }
    const bytes = Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0))
    await window.__titleUploadHarness.upload(new File([bytes], 'accepted.bmp', { type: 'image/bmp' }))
    return calls
  }, BMP_BASE64)
  await page.waitForFunction(() => window.__titleUploadHarness.snapshot().artwork.sourceLabel === 'Custom game logo artwork')
  const after = await page.evaluate(() => window.__titleUploadHarness.snapshot())
  assert.equal(validationCalls, 1)
  assert.equal(after.artwork.imageDataUrl, `data:image/bmp;base64,${BMP_BASE64}`)
  assert.equal(after.artwork.source, 'custom')
  assert.equal(after.artwork.imageSize.width, 1)
  assert.equal(after.artwork.imageSize.height, 1)
  assert.equal(after.artwork.layout.enabled, true)
  assert.deepEqual(after.artwork.defaultSteamLogo, before.defaultSteamLogo)
  assert.deepEqual(after.messages, ['Custom game logo artwork selected.'])
  assert.equal(after.placements, 1)
  assert.equal(after.completions, 1)
})
