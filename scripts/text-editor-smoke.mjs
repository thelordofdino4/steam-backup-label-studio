import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const port = Number(process.env.TEXT_EDITOR_SMOKE_PORT ?? 5177)
const baseUrl = `http://127.0.0.1:${port}/`
const artifactDir = process.env.TEXT_EDITOR_SMOKE_ARTIFACT_DIR ??
  path.join(os.tmpdir(), 'steam-backup-label-studio-text-editor-smoke')
const startupTimeoutMs = 30_000

const results = []
let browser
let viteProcess = null

function log(message) {
  console.log(`[text-editor-smoke] ${message}`)
}

function fail(message) {
  throw new Error(message)
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function requestText(url, timeoutMs = 2_000) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        resolve({
          body,
          statusCode: response.statusCode ?? 0,
        })
      })
    })

    request.on('error', () => resolve(null))
    request.setTimeout(timeoutMs, () => {
      request.destroy()
      resolve(null)
    })
  })
}

async function isAppServing() {
  const response = await requestText(baseUrl)

  return Boolean(
    response?.statusCode &&
      response.statusCode >= 200 &&
      response.statusCode < 500 &&
      response.body.includes('<div id="root">'),
  )
}

async function waitForApp() {
  const start = Date.now()

  while (Date.now() - start < startupTimeoutMs) {
    if (await isAppServing()) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  fail(`Vite did not serve ${baseUrl} within ${startupTimeoutMs}ms.`)
}

async function ensureViteRuntime() {
  if (await isAppServing()) {
    log(`Reusing existing app runtime at ${baseUrl}`)
    return
  }

  const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!fs.existsSync(viteBin)) {
    fail(`Cannot find local Vite binary at ${viteBin}. Run npm install first.`)
  }

  log(`Starting Vite at ${baseUrl}`)
  viteProcess = spawn(
    process.execPath,
    [
      viteBin,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  viteProcess.stdout.on('data', (chunk) => {
    process.stdout.write(chunk)
  })
  viteProcess.stderr.on('data', (chunk) => {
    process.stderr.write(chunk)
  })
  viteProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      log(`Vite exited with code ${code}`)
    }
  })

  await waitForApp()
}

function findBrowserExecutable() {
  const candidates = [
    process.env.TEXT_EDITOR_SMOKE_BROWSER,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean)

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

async function launchBrowser() {
  const executablePath = findBrowserExecutable()
  const options = {
    headless: true,
    args: ['--disable-gpu'],
  }

  if (executablePath) {
    log(`Using browser executable ${executablePath}`)
    return chromium.launch({ ...options, executablePath })
  }

  log('Using Playwright bundled Chromium')
  return chromium.launch(options)
}

function smokeSelector(smokeId) {
  return `[data-smoke-id="${smokeId}"]`
}

function paethPredictor(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)

  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function decodePngRgba(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (!buffer.subarray(0, 8).equals(signature)) {
    fail('Screenshot was not a PNG.')
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    fail(`Unsupported screenshot PNG format: bitDepth=${bitDepth}, colorType=${colorType}.`)
  }

  const channels = colorType === 6 ? 4 : 3
  const rowLength = width * channels
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks))
  const rgba = new Uint8Array(width * height * 4)
  let sourceOffset = 0
  let previous = new Uint8Array(rowLength)

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset]
    sourceOffset += 1
    const raw = inflated.subarray(sourceOffset, sourceOffset + rowLength)
    sourceOffset += rowLength
    const row = new Uint8Array(rowLength)

    for (let x = 0; x < rowLength; x += 1) {
      const left = x >= channels ? row[x - channels] : 0
      const up = previous[x] ?? 0
      const upperLeft = x >= channels ? previous[x - channels] ?? 0 : 0
      const value = raw[x]

      if (filter === 0) row[x] = value
      else if (filter === 1) row[x] = (value + left) & 0xff
      else if (filter === 2) row[x] = (value + up) & 0xff
      else if (filter === 3) row[x] = (value + Math.floor((left + up) / 2)) & 0xff
      else if (filter === 4) row[x] = (value + paethPredictor(left, up, upperLeft)) & 0xff
      else fail(`Unsupported screenshot PNG filter ${filter}.`)
    }

    for (let x = 0; x < width; x += 1) {
      const source = x * channels
      const target = (y * width + x) * 4
      rgba[target] = row[source]
      rgba[target + 1] = row[source + 1]
      rgba[target + 2] = row[source + 2]
      rgba[target + 3] = channels === 4 ? row[source + 3] : 255
    }

    previous = row
  }

  return { data: rgba, height, width }
}

function getScreenshotPixel(image, x, y) {
  const offset = (y * image.width + x) * 4

  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
    image.data[offset + 3],
  ]
}

function colorDistance(first, second) {
  return Math.abs(first[0] - second[0]) +
    Math.abs(first[1] - second[1]) +
    Math.abs(first[2] - second[2])
}

function isGuideOverlayPixel(pixel) {
  const [red, green, blue] = pixel

  return blue > 145 && blue - red > 60 && blue - green > 35
}

function getPaintBoundsFromScreenshot(buffer) {
  const image = decodePngRgba(buffer)
  const background = getScreenshotPixel(
    image,
    Math.floor(image.width / 2),
    image.height - 1,
  )
  const verticalGuideInset = Math.min(12, Math.floor(image.height / 6))
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (
    let y = verticalGuideInset;
    y < image.height - verticalGuideInset;
    y += 1
  ) {
    for (let x = 1; x < image.width - 1; x += 1) {
      const pixel = getScreenshotPixel(image, x, y)
      if (
        pixel[3] < 24 ||
        colorDistance(pixel, background) <= 35 ||
        isGuideOverlayPixel(pixel)
      ) {
        continue
      }

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }

  if (!Number.isFinite(minX)) {
    fail('Screenshot analysis did not find visible text paint.')
  }

  return {
    height: image.height,
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    width: image.width,
  }
}

function smoke(page, smokeId) {
  return page.locator(smokeSelector(smokeId))
}

async function expectAttached(page, smokeId, message = smokeId) {
  await smoke(page, smokeId).waitFor({ state: 'attached', timeout: 5_000 })
  const count = await smoke(page, smokeId).count()
  if (count < 1) fail(`${message} was not attached.`)
}

async function expectVisible(page, smokeId, message = smokeId) {
  await smoke(page, smokeId).waitFor({ state: 'visible', timeout: 5_000 })
  const count = await smoke(page, smokeId).count()
  if (count < 1) fail(`${message} was not visible.`)
}

async function clickSmoke(page, smokeId) {
  await expectAttached(page, smokeId)
  await smoke(page, smokeId).first().evaluate((element) => {
    element.click()
  })
}

async function clickVisibleSmoke(page, smokeId) {
  await expectVisible(page, smokeId)
  await smoke(page, smokeId).first().click({ force: true })
}

async function ensureChecked(page, smokeId, checked = true) {
  await expectAttached(page, smokeId)
  await smoke(page, smokeId).first().evaluate(
    (element, nextChecked) => {
      const input = element instanceof HTMLInputElement
        ? element
        : element.querySelector('input[type="checkbox"]')
      if (!(input instanceof HTMLInputElement)) return
      if (input.checked === nextChecked) return
      input.click()
    },
    checked,
  )
}

async function setNativeInputValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
    descriptor?.set?.call(element, nextValue)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

async function setSelectValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    if (!(element instanceof HTMLSelectElement)) return
    element.value = nextValue
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

async function setGameTitle(page, title) {
  await setNativeInputValue(page.locator('#game-title'), title)
  await page.waitForTimeout(100)
}

async function setCopyrightText(page, text) {
  await setNativeInputValue(page.locator('#game-metadata-copyright'), text)
  await page.waitForTimeout(100)
}

async function setDiscTextMode(page, key, mode) {
  await setSelectValue(smoke(page, `disc-sidebar-mode-${key}`), mode)
  await page.waitForTimeout(150)
}

async function turnOffSpineMirroringIfNeeded(page) {
  const mirrorButton = smoke(page, 'case-spine-mirror-toggle')
  if ((await mirrorButton.count()) === 0) return
  const pressed = await mirrorButton.first().getAttribute('aria-pressed')
  if (pressed === 'true') {
    await mirrorButton.first().evaluate((button) => {
      button.click()
    })
    await page.waitForTimeout(200)
  }
}

async function setCasePane(page, paneId) {
  await setSelectValue(smoke(page, 'case-template-pane-select'), paneId)
  await expectVisible(page, `case-preview-${paneId}`)
}

async function openInlineEditorFromTarget(page, smokeId) {
  await clickVisibleSmoke(page, smokeId)
  await expectInlineEditor(page)
}

async function expectInlineEditor(page) {
  await expectVisible(page, 'inline-text-tabs', 'inline text tab strip')
  await expectVisible(page, 'inline-text-menu', 'inline text menu')
  await expectVisible(page, 'inline-text-move-handle', 'inline text move handle')
  await expectAttached(page, 'inline-text-input', 'inline text input')
}

async function expectContextualShell(page) {
  await expectVisible(page, 'inline-text-tabs', 'inline text tab strip')
  await expectVisible(page, 'inline-text-menu', 'inline text menu')
  await expectVisible(page, 'inline-text-move-handle', 'inline text move handle')
}

async function focusInlineInput(page) {
  await expectAttached(page, 'inline-text-input')
  await smoke(page, 'inline-text-input').first().evaluate((input) => {
    if (input instanceof HTMLTextAreaElement) input.focus()
  })
}

async function getInlineInputState(page) {
  return smoke(page, 'inline-text-input').first().evaluate((input) => {
    if (!(input instanceof HTMLTextAreaElement)) {
      return { value: '', selectionStart: 0, selectionEnd: 0 }
    }
    return {
      selectionEnd: input.selectionEnd,
      selectionStart: input.selectionStart,
      value: input.value,
    }
  })
}

async function replaceInlineTextWithKeyboard(page, value) {
  await focusInlineInput(page)
  await page.keyboard.press('Control+A')
  const lines = value.split('\n')
  for (const [index, line] of lines.entries()) {
    if (line) {
      await page.keyboard.type(line)
    }
    if (index < lines.length - 1) {
      await page.keyboard.press('Enter')
    }
  }
  await page.waitForTimeout(150)
}

async function setInlineTextValue(page, value) {
  await expectAttached(page, 'inline-text-input')
  await setNativeInputValue(smoke(page, 'inline-text-input').first(), value)
  await page.waitForTimeout(150)
}

async function selectAllInlineText(page) {
  await focusInlineInput(page)
  await page.keyboard.press('Control+A')
  await page.waitForTimeout(50)
}

async function getTextContent(page, smokeId) {
  await expectAttached(page, smokeId)
  return smoke(page, smokeId).first().evaluate((element) =>
    element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  )
}

async function clickInlineTab(page, tabId) {
  await clickVisibleSmoke(page, `inline-text-tab-${tabId}`)
  await page.waitForTimeout(100)
}

async function ensureInlineUtilitiesControl(page, smokeId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickInlineTab(page, 'utilities')
    const locator = smoke(page, smokeId).first()

    try {
      await locator.waitFor({ state: 'attached', timeout: 1_500 })
      return locator
    } catch (error) {
      if (attempt === 2) throw error
      await page.waitForTimeout(100)
    }
  }

  return smoke(page, smokeId).first()
}

async function clickInlineToggle(page, labelToken) {
  await clickVisibleSmoke(page, `inline-text-toggle-${labelToken}`)
  await page.waitForTimeout(150)
}

async function setInlineColor(page, labelToken, value) {
  await clickInlineTab(page, 'art')
  await setNativeInputValue(smoke(page, `inline-text-color-${labelToken}`).first(), value)
  await page.waitForTimeout(150)
}

async function setInlineNumberControl(page, labelToken, value) {
  const input = await ensureInlineUtilitiesControl(
    page,
    `inline-text-number-${labelToken}`,
  )
  await setNativeInputValue(
    input,
    String(value),
  )
  await page.waitForTimeout(250)
}

async function setInlineRangeControl(page, labelToken, value) {
  const input = await ensureInlineUtilitiesControl(
    page,
    `inline-text-range-${labelToken}`,
  )
  await setNativeInputValue(
    input,
    String(value),
  )
  await page.waitForTimeout(250)
}

async function setInlineSelectControl(page, labelToken, value) {
  const select = await ensureInlineUtilitiesControl(
    page,
    `inline-text-select-${labelToken}`,
  )
  await select.selectOption(value)
  await page.waitForTimeout(250)
}

async function getInlineNumberControlValue(page, labelToken) {
  const input = await ensureInlineUtilitiesControl(
    page,
    `inline-text-number-${labelToken}`,
  )
  const value = await input.inputValue()
  return Number(value)
}

async function getInlineNumberControlMax(page, labelToken) {
  const input = await ensureInlineUtilitiesControl(
    page,
    `inline-text-number-${labelToken}`,
  )
  const max = await input.getAttribute('max')
  return Number(max)
}

async function getInlineNumberControlMin(page, labelToken) {
  const input = await ensureInlineUtilitiesControl(
    page,
    `inline-text-number-${labelToken}`,
  )
  const min = await input.getAttribute('min')
  return Number(min)
}

async function waitForInlinePlacementLocked(page, expectedValue) {
  const start = Date.now()

  while (Date.now() - start < 2_000) {
    const actualValue = await smoke(page, 'inline-text-menu')
      .getAttribute('data-inline-placement-locked')
    if (actualValue === expectedValue) {
      return
    }
    await page.waitForTimeout(50)
  }

  const actualValue = await smoke(page, 'inline-text-menu')
    .getAttribute('data-inline-placement-locked')
  fail(
    `Inline placement lock expected ${expectedValue} but read ${actualValue}.`,
  )
}

async function assertInlineNumberControlLocksPlacement(page, labelToken, value) {
  await clickInlineTab(page, 'utilities')
  const input = smoke(page, `inline-text-number-${labelToken}`).first()
  await input.focus()
  await waitForInlinePlacementLocked(page, 'true')
  const beforeMenu = await getRect(page, 'inline-text-menu')
  await page.keyboard.press('Control+A')
  await page.keyboard.type(String(value))
  await page.waitForTimeout(150)
  const duringMenu = await getRect(page, 'inline-text-menu')

  if (
    Math.abs(duringMenu.left - beforeMenu.left) > 1 ||
    Math.abs(duringMenu.top - beforeMenu.top) > 1
  ) {
    fail(
      `${labelToken} interaction moved the contextual menu while locked: ` +
        `${JSON.stringify({ beforeMenu, duringMenu })}`,
    )
  }

  await page.keyboard.press('Enter')
  await waitForInlinePlacementLocked(page, 'false')
}

async function getInlineTextNumberDraft(page, labelToken) {
  await expectAttached(page, `inline-text-number-${labelToken}`)
  return smoke(page, `inline-text-number-${labelToken}`).first().inputValue()
}

async function setInlineTextNumberDraftWithKeyboard(page, labelToken, value) {
  await clickInlineTab(page, 'text')
  const input = smoke(page, `inline-text-number-${labelToken}`).first()
  await input.focus()
  await page.keyboard.press('Control+A')
  if (value) {
    await page.keyboard.type(value)
  } else {
    await page.keyboard.press('Backspace')
  }
  await page.waitForTimeout(150)
}

async function selectInlineTextNumberPreset(page, labelToken, value) {
  const optionsButton = smoke(page, `inline-text-number-options-${labelToken}`).first()
  await optionsButton.click({ force: true })
  await expectVisible(
    page,
    `inline-text-number-options-list-${labelToken}`,
    `${labelToken} preset list`,
  )
  await smoke(page, `inline-text-number-option-${labelToken}-${value}`)
    .first()
    .click({ force: true })
  await page.waitForTimeout(150)
}

async function wheelInlineTextNumberControl(page, labelToken, deltaY) {
  await clickInlineTab(page, 'text')
  const input = smoke(page, `inline-text-number-${labelToken}`).first()
  await input.focus()
  await input.dispatchEvent('wheel', {
    bubbles: true,
    cancelable: true,
    deltaY,
  })
  await page.waitForTimeout(100)
}

async function holdInlineTextNumberStepper(page, labelToken, direction) {
  await clickInlineTab(page, 'text')
  const smokeId = direction > 0
    ? `inline-text-number-step-up-${labelToken}`
    : `inline-text-number-step-down-${labelToken}`
  const rect = await getRect(page, smokeId)
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(520)
  await page.mouse.up()
  await page.waitForTimeout(150)
}

async function showHtmlSource(page) {
  await clickInlineTab(page, 'utilities')
  await ensureChecked(page, 'inline-text-checkbox-html-source', true)
  await expectVisible(page, 'inline-text-html-source')
}

async function hideHtmlSource(page) {
  await clickInlineTab(page, 'utilities')
  const htmlSourceToggle = smoke(page, 'inline-text-checkbox-html-source').first()
  await htmlSourceToggle.waitFor({ state: 'attached', timeout: 5_000 })
  if (await htmlSourceToggle.isChecked()) {
    await htmlSourceToggle.click({ force: true })
  }
  await smoke(page, 'inline-text-html-source').waitFor({ state: 'detached', timeout: 5_000 })
  await expectAttached(page, 'inline-text-input')
  await clickInlineTab(page, 'text')
}

async function ensureStraightDiscContextualShell(page) {
  if ((await smoke(page, 'inline-text-menu').count()) === 0) {
    await openStraightDiscTitle(page)
  }
  await expectContextualShell(page)
}

async function getHtmlSource(page) {
  await showHtmlSource(page)
  return smoke(page, 'inline-text-html-source').inputValue()
}

async function setHtmlSource(page, source) {
  await showHtmlSource(page)
  const sourceInput = smoke(page, 'inline-text-html-source')
  await sourceInput.fill(source)
  await page.waitForTimeout(250)
}

async function done(page) {
  await clickVisibleSmoke(page, 'inline-text-done')
  await smoke(page, 'inline-text-menu').waitFor({ state: 'detached', timeout: 5_000 })
}

async function getRect(page, smokeId) {
  await expectVisible(page, smokeId)
  return smoke(page, smokeId).first().evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      bottom: rect.bottom,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      width: rect.width,
    }
  })
}

async function waitForStableRect(page, smokeId) {
  let previous = await getRect(page, smokeId)

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(60)
    const current = await getRect(page, smokeId)

    if (
      Math.abs(previous.left - current.left) < 0.5 &&
      Math.abs(previous.top - current.top) < 0.5 &&
      Math.abs(previous.width - current.width) < 0.5 &&
      Math.abs(previous.height - current.height) < 0.5
    ) {
      return current
    }

    previous = current
  }

  return previous
}

async function waitForMeasuredCenterDock(page) {
  const start = Date.now()

  while (Date.now() - start < 2_500) {
    const mode = await smoke(page, 'inline-text-menu')
      .getAttribute('data-inline-placement-mode')
    const menu = await getRect(page, 'inline-text-menu')

    if (mode === 'center-docked' && menu.width >= 360) {
      await waitForStableRect(page, 'inline-text-menu')
      return
    }

    await page.waitForTimeout(60)
  }

  const mode = await smoke(page, 'inline-text-menu')
    .getAttribute('data-inline-placement-mode')
  const menu = await getRect(page, 'inline-text-menu')
  fail(`Center dock did not settle to measured dimensions: ${
    JSON.stringify({ menu, mode })
  }`)
}

async function assertCurvedContextualPlacementUsesPaintBounds(page, label) {
  const host = await getRect(page, 'disc-inline-text-copyright')
  const preview = await getRect(page, 'disc-preview')
  const tabs = await getRect(page, 'inline-text-tabs')
  const menu = await getRect(page, 'inline-text-menu')

  if (
    host.left < preview.left - 1 ||
    host.right > preview.right + 1 ||
    host.top < preview.top - 1 ||
    host.bottom > preview.bottom + 1
  ) {
    fail(`${label}: curved selection bounds escaped the disc preview: ${
      JSON.stringify({ host, preview })
    }`)
  }
  if (host.width > preview.width * 0.7) {
    fail(`${label}: curved selection bounds are too wide for the visible text: ${
      JSON.stringify({ host, preview })
    }`)
  }
  if (host.height > preview.height * 0.35) {
    fail(`${label}: curved selection bounds are too tall for the visible text: ${
      JSON.stringify({ host, preview })
    }`)
  }
  if (
    rectsOverlapMeaningfully(tabs, host) ||
    rectsOverlapMeaningfully(menu, host)
  ) {
    fail(`${label}: contextual controls overlap curved selection bounds: ${
      JSON.stringify({ host, menu, tabs })
    }`)
  }
}

async function assertCurvedEditorUsesPathOverlays(page, label, expectedOverlay) {
  const pathOverlaySmokeId = expectedOverlay === 'selection'
    ? 'inline-text-selection-path'
    : 'inline-text-caret-path'
  const pathOverlay = smoke(page, pathOverlaySmokeId).first()
  await pathOverlay.waitFor({ state: 'visible', timeout: 2_000 })

  const pathD = await pathOverlay.locator('path').first().getAttribute('d')
  if (!pathD) {
    fail(`${label}: curved ${expectedOverlay} path overlay did not expose SVG path geometry.`)
  }
  if (expectedOverlay === 'selection' && !pathD.includes(' A ')) {
    fail(`${label}: curved selection did not use an arc path: ${pathD}`)
  }
  if (expectedOverlay === 'caret' && !pathD.includes(' L ')) {
    fail(`${label}: curved caret did not use a path segment: ${pathD}`)
  }

  const rectangularSelectionCount = await page
    .locator('.inline-preview-text-selection:not(.inline-preview-text-selection--path)')
    .count()
  if (expectedOverlay === 'selection' && rectangularSelectionCount > 0) {
    fail(`${label}: curved selection fell back to rectangular editor bands.`)
  }
}

function getRectDelta(first, second) {
  return {
    left: second.left - first.left,
    top: second.top - first.top,
  }
}

async function dragInlineMoveHandleImmediately(
  page,
  targetSmokeId,
  deltaX = 28,
  deltaY = 18,
  options = {},
) {
  const expectMenuMovement = options.expectMenuMovement !== false
  const beforeTarget = await getRect(page, targetSmokeId)
  const beforeMenu = await getRect(page, 'inline-text-menu')
  const handle = await getRect(page, 'inline-text-move-handle')
  const startX = handle.left + handle.width / 2
  const startY = handle.top + handle.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 1 })
  await page.waitForTimeout(80)

  const duringTarget = await getRect(page, targetSmokeId)
  const duringHandleClass = await smoke(page, 'inline-text-move-handle')
    .first()
    .getAttribute('class')
  const targetDelta = getRectDelta(beforeTarget, duringTarget)

  if (
    Math.abs(targetDelta.left) < 2 &&
    Math.abs(targetDelta.top) < 2
  ) {
    await page.mouse.up().catch(() => {})
    fail(
      `Move handle did not move ${targetSmokeId} on the first pointermove: ` +
      JSON.stringify({ beforeTarget, duringTarget, targetDelta }),
    )
  }
  if (!duringHandleClass?.includes('is-dragging')) {
    await page.mouse.up().catch(() => {})
    fail('Move handle did not enter its immediate dragging state.')
  }

  await page.mouse.up()
  await page.waitForTimeout(150)

  const afterMenu = await getRect(page, 'inline-text-menu')
  const menuDelta = getRectDelta(beforeMenu, afterMenu)
  if (expectMenuMovement && (
    Math.abs(menuDelta.left) < 2 &&
    Math.abs(menuDelta.top) < 2
  )) {
    fail(
      `Contextual menu did not follow ${targetSmokeId} after Move-handle drag: ` +
      JSON.stringify({ beforeMenu, afterMenu, menuDelta }),
    )
  }
  if (!expectMenuMovement && (
    Math.abs(menuDelta.left) > 2 ||
    Math.abs(menuDelta.top) > 2
  )) {
    fail(
      `Docked contextual menu moved while dragging ${targetSmokeId}: ` +
      JSON.stringify({ beforeMenu, afterMenu, menuDelta }),
    )
  }
}

async function clickInlineMoveHandleWithoutMoving(page, targetSmokeId) {
  const beforeTarget = await getRect(page, targetSmokeId)
  const handle = await getRect(page, 'inline-text-move-handle')
  const startX = handle.left + handle.width / 2
  const startY = handle.top + handle.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(100)

  const afterTarget = await getRect(page, targetSmokeId)
  const delta = getRectDelta(beforeTarget, afterTarget)
  if (Math.abs(delta.left) > 1 || Math.abs(delta.top) > 1) {
    fail(
      `Move-handle click without movement changed ${targetSmokeId}: ` +
      JSON.stringify({ beforeTarget, afterTarget, delta }),
    )
  }
}

function rectsOverlap(first, second) {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  )
}

function getRectOverlap(first, second) {
  const width = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left),
  )
  const height = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  )

  return { height, width }
}

function getRectCenterX(rect) {
  return rect.left + rect.width / 2
}

function rectsOverlapMeaningfully(first, second, tolerance = 6) {
  const overlap = getRectOverlap(first, second)

  return overlap.width > tolerance && overlap.height > tolerance
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

async function waitForInlineMenuAndTabsToSeparate(page) {
  let tabs = await getRect(page, 'inline-text-tabs')
  let menu = await getRect(page, 'inline-text-menu')

  for (let attempt = 0; attempt < 8 && rectsOverlap(menu, tabs); attempt += 1) {
    await page.waitForTimeout(50)
    tabs = await getRect(page, 'inline-text-tabs')
    menu = await getRect(page, 'inline-text-menu')
  }

  return { menu, tabs }
}

async function assertScreenshotPaintDoesNotTouchHorizontalEdges(page, smokeId, label) {
  await expectVisible(page, smokeId)
  const buffer = await smoke(page, smokeId).first().screenshot()
  const bounds = getPaintBoundsFromScreenshot(buffer)
  const leftMargin = bounds.left
  const rightMargin = bounds.width - 1 - bounds.right

  if (leftMargin < 1 || rightMargin < 1) {
    fs.mkdirSync(artifactDir, { recursive: true })
    const elementScreenshotPath = path.join(
      artifactDir,
      `${slug(label)}-element.png`,
    )
    fs.writeFileSync(elementScreenshotPath, buffer)
    fail(
      `${label} paint touched screenshot edge: ` +
      `leftMargin=${leftMargin}, rightMargin=${rightMargin}, ` +
      `imageWidth=${bounds.width}, paintLeft=${bounds.left}, ` +
      `paintRight=${bounds.right}, elementScreenshot=${elementScreenshotPath}.`,
    )
  }
}

async function dragSelectVisibleText(page, smokeId) {
  const targetRect = await getRect(page, smokeId)
  const y = targetRect.top + targetRect.height / 2
  const startX = targetRect.left + Math.max(4, targetRect.width * 0.05)
  const endX = targetRect.left + Math.max(16, targetRect.width * 0.45)
  await page.mouse.move(startX, y)
  await page.mouse.down()
  await page.mouse.move(endX, y, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(100)
  const state = await getInlineInputState(page)
  if (state.selectionEnd <= state.selectionStart) {
    fail(`LMB drag did not create a visible selection on ${smokeId}.`)
  }
}

async function dragSelectCurvedText(page, smokeId) {
  const targetRect = await getRect(page, smokeId)
  const textRect = await page
    .locator('[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="copyright"]')
    .first()
    .evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      }
    })
  const y = targetRect.bottom - Math.max(4, targetRect.height * 0.18)
  const startX = targetRect.left + Math.max(4, targetRect.width * 0.12)
  const endX = targetRect.left + Math.max(16, targetRect.width * 0.68)
  await page.mouse.move(startX, y)
  await page.mouse.down()
  await page.mouse.move(endX, y, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(100)
  const state = await getInlineInputState(page)
  if (state.selectionEnd <= state.selectionStart) {
    fail(
      `Curved text drag did not create a visible selection on ${smokeId}: ` +
      JSON.stringify({ endX, startX, state, targetRect, textRect, y }),
    )
  }
}

async function getCurvedTextBoundaryClientPoint(page, boundaryOffset) {
  const text = page
    .locator('[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="copyright"]')
    .first()
  await text.waitFor({ state: 'attached', timeout: 5_000 })

  return text.evaluate((element, offset) => {
    const textElement = element
    const rawText = textElement.textContent ?? ''
    const visibleStart = rawText.search(/\S/)
    const visibleText = visibleStart >= 0 ? rawText.slice(visibleStart).trimEnd() : rawText
    const charCount = typeof textElement.getNumberOfChars === 'function'
      ? textElement.getNumberOfChars()
      : rawText.length

    if (
      charCount < 1 ||
      visibleStart < 0 ||
      typeof textElement.getStartPositionOfChar !== 'function' ||
      typeof textElement.getEndPositionOfChar !== 'function'
    ) {
      throw new Error('Curved SVG text does not expose measurable character positions.')
    }

    const normalizedOffset = Math.max(0, Math.min(offset, visibleText.length))
    const svgOffset = Math.max(
      0,
      Math.min(visibleStart + normalizedOffset, charCount),
    )
    const ctm = textElement.getScreenCTM()
    const svg = textElement.ownerSVGElement
    if (!ctm || !svg) {
      throw new Error('Curved SVG text does not expose a screen transform.')
    }

    const svgPoint = svg.createSVGPoint()
    const toScreen = (point) => {
      svgPoint.x = point.x
      svgPoint.y = point.y
      const screenPoint = svgPoint.matrixTransform(ctm)

      return { x: screenPoint.x, y: screenPoint.y }
    }

    if (normalizedOffset === 0) {
      return {
        ...toScreen(textElement.getStartPositionOfChar(visibleStart)),
        charCount: visibleText.length,
        offset: normalizedOffset,
        text: visibleText,
      }
    }

    if (normalizedOffset >= visibleText.length) {
      return {
        ...toScreen(textElement.getEndPositionOfChar(svgOffset - 1)),
        charCount: visibleText.length,
        offset: normalizedOffset,
        text: visibleText,
      }
    }

    const previousEnd = toScreen(textElement.getEndPositionOfChar(svgOffset - 1))
    const nextStart = toScreen(textElement.getStartPositionOfChar(svgOffset))

    return {
      charCount: visibleText.length,
      offset: normalizedOffset,
      text: visibleText,
      x: (previousEnd.x + nextStart.x) / 2,
      y: (previousEnd.y + nextStart.y) / 2,
    }
  }, boundaryOffset)
}

async function clickCurvedTextBoundary(page, boundaryOffset, label) {
  const point = await getCurvedTextBoundaryClientPoint(page, boundaryOffset)
  await page.mouse.click(point.x, point.y)
  await page.waitForTimeout(120)
  const state = await getInlineInputState(page)

  if (
    state.selectionStart !== boundaryOffset ||
    state.selectionEnd !== boundaryOffset
  ) {
    fail(
      `${label}: curved boundary click selected the wrong offset: ` +
      JSON.stringify({ boundaryOffset, point, state }),
    )
  }

  return point
}

async function assertCurvedCaretMutationParity(page) {
  await replaceInlineTextWithKeyboard(page, 'WIDE TEST')
  await clickCurvedTextBoundary(page, 1, 'Backspace parity')
  await assertCurvedEditorUsesPathOverlays(page, 'backspace boundary curved copyright', 'caret')
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(120)
  let state = await getInlineInputState(page)
  if (state.value !== 'IDE TEST') {
    fail(
      `Backspace did not delete the character before the curved caret: ` +
      JSON.stringify(state),
    )
  }

  await replaceInlineTextWithKeyboard(page, 'WIDE TEST')
  await clickCurvedTextBoundary(page, 1, 'Delete parity')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(120)
  state = await getInlineInputState(page)
  if (state.value !== 'WDE TEST') {
    fail(
      `Delete did not remove the character after the curved caret: ` +
      JSON.stringify(state),
    )
  }
}

async function dragSelectVisiblePrefix(page, smokeId) {
  const targetRect = await getRect(page, smokeId)
  const y = targetRect.top + targetRect.height / 2
  const startX = targetRect.left + Math.max(4, targetRect.width * 0.05)
  const endX = targetRect.left + Math.max(18, targetRect.width * 0.32)
  await page.mouse.move(startX, y)
  await page.mouse.down()
  await page.mouse.move(endX, y, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(100)
  const state = await getInlineInputState(page)
  if (state.selectionEnd <= state.selectionStart) {
    fail(`LMB prefix drag did not create a selection on ${smokeId}.`)
  }
}

async function dragSelectRotatedSpineText(page, smokeId, reverse = false) {
  const targetRect = await getRect(page, smokeId)
  const x = targetRect.left + targetRect.width / 2
  const startY = targetRect.top + targetRect.height * (reverse ? 0.62 : 0.38)
  const endY = targetRect.top + targetRect.height * (reverse ? 0.38 : 0.62)
  await page.mouse.move(x, startY)
  await page.mouse.down()
  await page.mouse.move(x, endY, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(100)
  const state = await getInlineInputState(page)
  if (state.selectionEnd <= state.selectionStart) {
    fail(`Rotated spine drag did not create a selection on ${smokeId}.`)
  }
  if (state.selectionStart === 0 || state.selectionEnd === state.value.length) {
    fail(
      `Rotated spine drag on ${smokeId} jumped to an edge instead of ` +
      `anchoring at the pointer: selectionStart=${state.selectionStart}, ` +
      `selectionEnd=${state.selectionEnd}, valueLength=${state.value.length}.`,
    )
  }
}

async function assertTextIncludes(page, smokeId, expected) {
  const text = await getTextContent(page, smokeId)
  if (!text.includes(expected)) {
    fail(`${smokeId} text "${text}" did not include "${expected}".`)
  }
}

async function assertSourceIncludes(page, expected) {
  const source = await getHtmlSource(page)
  if (!source.includes(expected)) {
    fail(`HTML source "${source}" did not include "${expected}".`)
  }
}

async function setupCoverTitle(page) {
  await clickSmoke(page, 'home-new-case-insert')
  await expectVisible(page, 'case-insert-editor')
  await setGameTitle(page, 'Smoke Fixture Game')
  await setCasePane(page, 'cover')
  await ensureChecked(page, 'case-sidebar-text-block-cover-cover-title-text', true)
  await clickSmoke(page, 'case-sidebar-edit-text-block-cover-cover-title-text')
  await expectInlineEditor(page)
  await replaceInlineTextWithKeyboard(page, 'Untitled Smoke Title')
  await done(page)
  await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
}

async function setupTrayTitle(page) {
  await setCasePane(page, 'tray')
  await ensureChecked(page, 'case-sidebar-text-block-tray-tray-title-text', true)
  await clickSmoke(page, 'case-sidebar-edit-text-block-tray-tray-title-text')
  await expectInlineEditor(page)
  await replaceInlineTextWithKeyboard(page, 'Tray Smoke Title')
  await done(page)
  await openInlineEditorFromTarget(page, 'case-text-block-tray-tray-title-text')
}

async function openSpineTitle(page, side) {
  await setCasePane(page, 'tray')
  await turnOffSpineMirroringIfNeeded(page)
  await ensureChecked(page, `case-sidebar-spine-title-${side}`, true)
  await clickSmoke(page, `case-sidebar-edit-spine-title-${side}`)
  await expectInlineEditor(page)
  await replaceInlineTextWithKeyboard(page, `${side} spine smoke`)
  await done(page)
  await openInlineEditorFromTarget(page, `case-spine-title-${side}`)
}

async function setupDisc(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await clickSmoke(page, 'home-new-disc')
  await expectVisible(page, 'disc-preview')
  await setGameTitle(page, 'Disc Smoke Title')
  await setCopyrightText(page, 'Copyright 2026 Smoke')
}

async function openStraightDiscTitle(page) {
  await ensureChecked(page, 'disc-sidebar-text-title', true)
  const hitTarget = page.locator('[data-smoke-id="disc-text-layer-hit-target"] [data-disc-text-key="title"]').first()
  await hitTarget.waitFor({ state: 'attached', timeout: 5_000 })
  await hitTarget.click({ force: true })
  await expectInlineEditor(page)
  await expectVisible(page, 'disc-text-layer-image')
}

async function assertCurvedCopyrightGuardrail(page) {
  await ensureChecked(page, 'disc-sidebar-text-copyright', true)
  await setDiscTextMode(page, 'copyright', 'curved')
  await setCopyrightText(page, 'Copyright 2026 Smoke')
  const curvedPath = page.locator('[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="copyright"] textPath').first()
  await curvedPath.waitFor({ state: 'attached', timeout: 5_000 })
  const beforeSrc = await smoke(page, 'disc-text-layer-image').first().getAttribute('src')
  await curvedPath.click({ force: true })
  await expectInlineEditor(page)
  await assertCurvedEditorUsesPathOverlays(page, 'initial curved copyright', 'caret')
  const copyrightEditorCount = await smoke(page, 'disc-inline-text-copyright').count()
  if (copyrightEditorCount !== 1) {
    fail(`Curved copyright did not open its contextual shell. Count: ${copyrightEditorCount}`)
  }
  const canvasTextareaCount = await smoke(page, 'disc-inline-text-copyright').locator('textarea').count()
  if (canvasTextareaCount !== 0) {
    fail('Curved copyright mounted a rectangular on-canvas textarea.')
  }
  const menuValueCount = await smoke(page, 'inline-text-menu-value').count()
  if (menuValueCount !== 0) {
    fail('Curved copyright still exposed a contextual menu Text Value field.')
  }
  const menuText = await smoke(page, 'inline-text-menu').first().textContent()
  if (/unsupported/i.test(menuText ?? '')) {
    fail(`Curved contextual menu displayed unsupported placeholder copy: ${menuText}`)
  }
  await assertCurvedContextualPlacementUsesPaintBounds(page, 'initial curved copyright')
  await replaceInlineTextWithKeyboard(page, 'Curved direct smoke')
  const inputState = await getInlineInputState(page)
  if (inputState.value !== 'Curved direct smoke') {
    fail(`Curved direct edit did not update the hidden input: ${JSON.stringify(inputState)}`)
  }
  const afterSrc = await smoke(page, 'disc-text-layer-image').first().getAttribute('src')
  if (!afterSrc || afterSrc === beforeSrc) {
    fail('Curved copyright SVG data URL did not update from direct text editing.')
  }
  const hitTargetMarkup = await smoke(page, 'disc-text-layer-hit-target').first().evaluate(
    (element) => element.innerHTML,
  )
  if (!hitTargetMarkup.includes('Curved direct smoke')) {
    fail('Curved copyright hit-target SVG did not receive the directly edited text.')
  }
  await assertCurvedCaretMutationParity(page)
  await dragSelectCurvedText(page, 'disc-inline-text-copyright')
  await assertCurvedEditorUsesPathOverlays(page, 'dragged curved copyright', 'selection')
  await page.keyboard.press('Control+A')
  const selectAllState = await getInlineInputState(page)
  if (
    selectAllState.selectionStart !== 0 ||
    selectAllState.selectionEnd !== selectAllState.value.length
  ) {
    fail(`Ctrl+A did not select all curved text: ${JSON.stringify(selectAllState)}`)
  }
  await assertCurvedContextualPlacementUsesPaintBounds(page, 'edited curved copyright')
  await setInlineSelectControl(page, 'arc-side', 'top')
  await setInlineNumberControl(page, 'arc', 220)
  await setInlineNumberControl(page, 'inset', 8)
  await setInlineRangeControl(page, 'line-spacing', 1.25)
  await assertCurvedContextualPlacementUsesPaintBounds(page, 'top arc curved copyright')
  await setInlineSelectControl(page, 'arc-side', 'bottom')
  await assertCurvedContextualPlacementUsesPaintBounds(page, 'bottom arc curved copyright')
}

async function runCheck(page, name, fn) {
  try {
    await fn()
    results.push({ name, status: 'pass' })
    log(`PASS ${name}`)
  } catch (error) {
    fs.mkdirSync(artifactDir, { recursive: true })
    const screenshotPath = path.join(
      artifactDir,
      `${String(results.length + 1).padStart(2, '0')}-${slug(name)}.png`,
    )
    await page.screenshot({ fullPage: true, path: screenshotPath }).catch(() => {})
    results.push({
      error: error instanceof Error ? error.message : String(error),
      name,
      screenshotPath,
      status: 'fail',
    })
    log(`FAIL ${name}`)
  }
}

async function runCaseChecks(page) {
  await runCheck(page, 'cover opens inline editor and preserves typed spaces', async () => {
    await setupCoverTitle(page)
    await replaceInlineTextWithKeyboard(page, 'hello hello')
    const state = await getInlineInputState(page)
    if (state.value !== 'hello hello') {
      fail(`Expected "hello hello" while editing, got "${state.value}".`)
    }
    await done(page)
    await assertTextIncludes(page, 'case-text-block-cover-cover-title-text', 'HELLO HELLO')
    await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
  })

  await runCheck(page, 'cover Ctrl+A and LMB drag selection work', async () => {
    await selectAllInlineText(page)
    const allState = await getInlineInputState(page)
    if (allState.selectionStart !== 0 || allState.selectionEnd !== allState.value.length) {
      fail('Ctrl+A did not select all inline text.')
    }
    await dragSelectVisibleText(page, 'case-text-block-cover-cover-title-text')
  })

  await runCheck(page, 'cover selected-range BIU and color update HTML source', async () => {
    await replaceInlineTextWithKeyboard(page, 'Word Rest')
    await dragSelectVisiblePrefix(page, 'case-text-block-cover-cover-title-text')
    await clickInlineTab(page, 'text')
    await clickInlineToggle(page, 'bold')
    await clickInlineToggle(page, 'italic')
    await clickInlineToggle(page, 'underline')
    await setInlineColor(page, 'color', '#ff0000')
    const source = await getHtmlSource(page)
    if (!source.includes('color:#ff0000')) {
      fail(`Range formatting did not reach canonical HTML: ${source}`)
    }
    if (!source.includes('<strong>') || !source.includes('<em>') || !source.includes('<u>')) {
      fail(`BIU formatting missing from source: ${source}`)
    }
    if (source.includes('Word Rest</span>')) {
      fail(`Range formatting colored the whole text instead of a selected range: ${source}`)
    }
    await done(page)
    await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
  })

  await runCheck(page, 'cover point-size control supports stable typing and repeated controls', async () => {
    await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '11.5')
    await expectInlineEditor(page)
    let draft = await getInlineTextNumberDraft(page, 'font-size-pt')
    if (draft !== '11.5') {
      fail(`Font size draft changed during typing: ${draft}`)
    }

    await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '')
    await expectInlineEditor(page)
    draft = await getInlineTextNumberDraft(page, 'font-size-pt')
    if (draft !== '') {
      fail(`Font size did not preserve empty draft while editing: ${draft}`)
    }
    await page.keyboard.type('13')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(150)
    draft = await getInlineTextNumberDraft(page, 'font-size-pt')
    if (draft !== '13') {
      fail(`Font size did not commit typed value: ${draft}`)
    }

    await selectInlineTextNumberPreset(page, 'font-size-pt', 24)
    await selectInlineTextNumberPreset(page, 'font-size-pt', 26)
    draft = await getInlineTextNumberDraft(page, 'font-size-pt')
    if (draft !== '26') {
      fail(`Font size preset did not reopen/select repeatedly: ${draft}`)
    }

    await wheelInlineTextNumberControl(page, 'font-size-pt', -100)
    draft = await getInlineTextNumberDraft(page, 'font-size-pt')
    if (Number(draft) <= 26) {
      fail(`Font size wheel step did not increase repeatedly: ${draft}`)
    }

    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)
    const afterKeyboard = Number(await getInlineTextNumberDraft(page, 'font-size-pt'))
    if (afterKeyboard <= Number(draft)) {
      fail(`Font size ArrowUp did not repeat: ${afterKeyboard}`)
    }

    await holdInlineTextNumberStepper(page, 'font-size-pt', 1)
    const afterHold = Number(await getInlineTextNumberDraft(page, 'font-size-pt'))
    if (afterHold <= afterKeyboard + 0.25) {
      fail(`Font size held stepper only changed once: ${afterHold}`)
    }
  })

  await runCheck(page, 'cover selected-range point size updates canonical HTML', async () => {
    await replaceInlineTextWithKeyboard(page, 'Word Rest')
    await dragSelectVisiblePrefix(page, 'case-text-block-cover-cover-title-text')
    await clickInlineTab(page, 'text')
    await selectInlineTextNumberPreset(page, 'font-size-pt', 36)
    const source = await getHtmlSource(page)
    if (!source.includes('font-size:36pt')) {
      fail(`Selected range point size did not reach canonical HTML: ${source}`)
    }
    if (source.includes('Word Rest</span>')) {
      fail(`Point size formatted the whole text instead of a selected range: ${source}`)
    }
    await hideHtmlSource(page)
  })

  await runCheck(page, 'cover bullets and bullet keyboard behavior are canonical', async () => {
    await setInlineTextValue(page, 'Alpha\nBeta')
    await selectAllInlineText(page)
    await clickInlineTab(page, 'text')
    await clickInlineToggle(page, 'bulleted-list')
    await assertSourceIncludes(page, '<ul><li>Alpha</li><li>Beta</li></ul>')
    await hideHtmlSource(page)
    await focusInlineInput(page)
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Gamma')
    await assertSourceIncludes(page, '<li>Gamma</li>')
    await hideHtmlSource(page)
    await replaceInlineTextWithKeyboard(page, 'Soft')
    await selectAllInlineText(page)
    await clickInlineToggle(page, 'bulleted-list')
    await focusInlineInput(page)
    await page.keyboard.press('End')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Break')
    await assertSourceIncludes(page, '<br>')
  })

  await runCheck(page, 'cover HTML source updates live preview and persists after Done/reopen', async () => {
    await setHtmlSource(page, '<p><span style="color:#00ff00">Green</span> live</p>')
    await assertTextIncludes(page, 'case-text-block-cover-cover-title-text', 'GREEN LIVE')
    await done(page)
    await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
    await assertSourceIncludes(page, 'color:#00ff00')
  })

  await runCheck(page, 'cover menu follows moved text and remains clamped', async () => {
    await hideHtmlSource(page)
    const beforeMenu = await getRect(page, 'inline-text-menu')
    const beforeTarget = await getRect(page, 'case-text-block-cover-cover-title-text')
    const currentY = await getInlineNumberControlValue(page, 'y')
    await setInlineNumberControl(page, 'y', currentY + 8)
    const afterMenu = await getRect(page, 'inline-text-menu')
    const afterTarget = await getRect(page, 'case-text-block-cover-cover-title-text')
    const preview = await getRect(page, 'case-preview-cover')
    if (Math.abs(afterTarget.top - beforeTarget.top) < 5) {
      fail('Selected text did not move after changing its Y control.')
    }
    if (Math.abs(afterMenu.top - beforeMenu.top) < 5) {
      fail('Menu did not move with the selected text.')
    }
    if (afterMenu.left < preview.left - 1 || afterMenu.right > preview.right + 1) {
      fail('Menu was not horizontally clamped inside the cover preview.')
    }
  })

  await runCheck(page, 'cover Move handle begins dragging immediately', async () => {
    await dragInlineMoveHandleImmediately(
      page,
      'case-text-block-cover-cover-title-text',
      30,
      18,
    )
    await clickInlineMoveHandleWithoutMoving(
      page,
      'case-text-block-cover-cover-title-text',
    )
  })

  await runCheck(page, 'cover Wrap width input locks contextual placement while editing', async () => {
    await assertInlineNumberControlLocksPlacement(page, 'wrap-width', 42)
  })

  await runCheck(page, 'cover initial top placement keeps menu below selected text', async () => {
    const yMin = await getInlineNumberControlMin(page, 'y')
    await setInlineNumberControl(page, 'y', yMin)
    await done(page)
    await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
    const { menu, tabs } = await waitForInlineMenuAndTabsToSeparate(page)
    const target = await getRect(page, 'case-text-block-cover-cover-title-text')
    const preview = await getRect(page, 'case-preview-cover')
    const mode = await smoke(page, 'inline-text-menu')
      .getAttribute('data-inline-placement-mode')
    if (mode !== 'anchored') {
      fail(`Top-edge text used detached contextual placement: ${mode}`)
    }
    if (rectsOverlap(menu, tabs)) {
      fail('Top-edge text opened with overlapping menu and tabs.')
    }
    if (menu.top < target.bottom - 1) {
      fail(
        `Top-edge text did not place the menu below the selected text: ${
          JSON.stringify({ menu, target })
        }`,
      )
    }
    if (menu.top < preview.top - 1 || menu.bottom > preview.bottom + 1) {
      fail(
        `Top-edge text opened controls outside the preview: ${
          JSON.stringify({ menu, preview })
        }`,
      )
    }
  })

  await runCheck(page, 'cover initial bottom placement keeps controls accessible', async () => {
    const yMax = await getInlineNumberControlMax(page, 'y')
    await setInlineNumberControl(page, 'y', yMax)
    await done(page)
    await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
    const { menu, tabs } = await waitForInlineMenuAndTabsToSeparate(page)
    const preview = await getRect(page, 'case-preview-cover')
    if (rectsOverlap(menu, tabs)) {
      fail('Initial menu placement near the bottom overlapped the tab strip.')
    }
    if (menu.height < 118) {
      fail(`Initial bottom menu height was not navigable: ${menu.height}`)
    }
    if (
      menu.right < preview.left ||
      menu.left > preview.right ||
      menu.bottom < preview.top ||
      menu.top > preview.bottom
    ) {
      const mode = await smoke(page, 'inline-text-menu').getAttribute('data-inline-placement-mode')
      if (mode !== 'detached') {
        fail(`Initial bottom menu was inaccessible without detached placement: ${mode}`)
      }
    }
  })

  await runCheck(page, 'cover oversized text uses emergency detached controls', async () => {
    await setInlineNumberControl(page, 'y', 50)
    await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '72')
    await page.keyboard.press('Enter')
    await setInlineTextValue(
      page,
      Array.from({ length: 24 }, (_, index) => `Oversized placement ${index + 1}`).join('\n'),
    )
    await page.waitForTimeout(120)
    const mode = await smoke(page, 'inline-text-menu').getAttribute('data-inline-placement-mode')
    if (mode !== 'detached') {
      fail(`Oversized text did not use detached contextual placement: ${mode}`)
    }
    const viewport = page.viewportSize()
    const tabs = await getRect(page, 'inline-text-tabs')
    const menu = await getRect(page, 'inline-text-menu')
    const moveHandle = await getRect(page, 'inline-text-move-handle')
    if (!viewport) {
      fail('Could not read viewport size for emergency placement check.')
    }
    for (const [label, rect] of [
      ['tabs', tabs],
      ['menu', menu],
      ['move handle', moveHandle],
    ]) {
      if (
        rect.right < 0 ||
        rect.left > viewport.width ||
        rect.bottom < 0 ||
        rect.top > viewport.height
      ) {
        fail(`Emergency ${label} was offscreen: ${JSON.stringify(rect)}`)
      }
    }
    if (rectsOverlap(moveHandle, menu) || rectsOverlap(moveHandle, tabs)) {
      fail('Emergency move handle was hidden behind the menu or tab strip.')
    }
  })

  await runCheck(page, 'tray, left spine, and right spine open inline editors', async () => {
    await done(page)
    await setupTrayTitle(page)
    await assertTextIncludes(page, 'case-text-block-tray-tray-title-text', 'Tray Smoke Title')
    await dragInlineMoveHandleImmediately(
      page,
      'case-text-block-tray-tray-title-text',
      22,
      -18,
    )
    const trayPlacementMode = await smoke(page, 'inline-text-menu')
      .getAttribute('data-inline-placement-mode')
    if (trayPlacementMode !== 'anchored') {
      fail(`Roomy tray title used detached contextual placement: ${trayPlacementMode}`)
    }
    const trayMenu = await getRect(page, 'inline-text-menu')
    const trayTabs = await getRect(page, 'inline-text-tabs')
    const trayPreview = await getRect(page, 'case-preview-tray')
    if (rectsOverlap(trayMenu, trayTabs)) {
      fail('Roomy tray title opened with overlapping menu and tabs.')
    }
    if (
      trayMenu.top < trayPreview.top - 1 ||
      trayMenu.bottom > trayPreview.bottom + 1
    ) {
      fail(
        `Roomy tray title opened controls outside the preview: ${
          JSON.stringify({ trayMenu, trayPreview })
        }`,
      )
    }
    await done(page)
    await openSpineTitle(page, 'left')
    await assertTextIncludes(page, 'case-spine-title-left', 'LEFT SPINE SMOKE')
    await dragInlineMoveHandleImmediately(page, 'case-spine-title-left', 0, 24)
    await done(page)
    await openSpineTitle(page, 'right')
    await assertTextIncludes(page, 'case-spine-title-right', 'RIGHT SPINE SMOKE')
    await dragInlineMoveHandleImmediately(page, 'case-spine-title-right', 0, -24)
    await done(page)
  })

  await runCheck(page, 'left and right rotated spine LMB drag selection work', async () => {
    await openSpineTitle(page, 'left')
    await dragSelectRotatedSpineText(page, 'case-spine-title-left')
    await dragSelectRotatedSpineText(page, 'case-spine-title-left', true)
    await done(page)

    await openSpineTitle(page, 'right')
    await dragSelectRotatedSpineText(page, 'case-spine-title-right')
    await dragSelectRotatedSpineText(page, 'case-spine-title-right', true)
    await done(page)
  })

  await runCheck(page, 'tray title paint is not clipped at 6pt default or 72pt', async () => {
    await setCasePane(page, 'tray')
    await ensureChecked(page, 'case-sidebar-text-block-tray-tray-title-text', true)
    await clickSmoke(page, 'case-sidebar-edit-text-block-tray-tray-title-text')
    await expectInlineEditor(page)
    await replaceInlineTextWithKeyboard(page, 'Untitled Steam Backup Label')
    const defaultSize = Number(await getInlineTextNumberDraft(page, 'font-size-pt'))

    for (const size of [6, defaultSize, 72]) {
      await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', String(size))
      await page.keyboard.press('Enter')
      await done(page)
      await assertScreenshotPaintDoesNotTouchHorizontalEdges(
        page,
        'case-text-block-tray-tray-title-text',
        `Tray title ${size}pt`,
      )
      await openInlineEditorFromTarget(page, 'case-text-block-tray-tray-title-text')
    }
  })
}

async function runDiscChecks(page) {
  await runCheck(page, 'straight disc opens inline editor with SVG renderer visible', async () => {
    await setupDisc(page)
    await openStraightDiscTitle(page)
    const imageSrc = await smoke(page, 'disc-text-layer-image').first().getAttribute('src')
    if (!imageSrc?.startsWith('data:image/svg+xml')) {
      fail('Straight disc visible text layer was not the SVG image renderer.')
    }
  })

  await runCheck(page, 'straight disc center workspace uses a stable side dock', async () => {
    await setInlineNumberControl(page, 'y', 50)
    await page.waitForTimeout(250)
    const mode = await smoke(page, 'inline-text-menu')
      .getAttribute('data-inline-placement-mode')
    const placement = await smoke(page, 'inline-text-menu')
      .getAttribute('data-inline-placement')
    if (mode !== 'side-docked' || !['left', 'right'].includes(placement ?? '')) {
      fail(`Straight disc center text did not use a stable side dock: ${
        JSON.stringify({ mode, placement })
      }`)
    }
  })

  await runCheck(page, 'outer straight disc text uses center-docked controls', async () => {
    await done(page)
    await openStraightDiscTitle(page)
    await setInlineNumberControl(page, 'y', 8)
    await clickInlineTab(page, 'text')
    await page.waitForTimeout(250)
    const mode = await smoke(page, 'inline-text-menu')
      .getAttribute('data-inline-placement-mode')
    if (mode !== 'center-docked') {
      fail(`Outer straight disc text did not use center-docked controls: ${mode}`)
    }
    await waitForMeasuredCenterDock(page)

    const preview = await getRect(page, 'disc-preview')
    const host = await getRect(page, 'disc-inline-text-title')
    const tabs = await waitForStableRect(page, 'inline-text-tabs')
    const menu = await waitForStableRect(page, 'inline-text-menu')
    const moveHandle = await waitForStableRect(page, 'inline-text-move-handle')
    if (
      tabs.left < preview.left - 1 ||
      tabs.right > preview.right + 1 ||
      menu.left < preview.left - 1 ||
      menu.right > preview.right + 1 ||
      menu.top < preview.top - 1 ||
      menu.bottom > preview.bottom + 1
    ) {
      fail(`Center-docked disc controls escaped the preview: ${
        JSON.stringify({ menu, preview, tabs })
      }`)
    }
    if (
      rectsOverlapMeaningfully(tabs, host) ||
      rectsOverlapMeaningfully(menu, host)
    ) {
      fail(`Center-docked disc controls overlapped selected text: ${
        JSON.stringify({ host, menu, tabs })
      }`)
    }

    await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '16')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(250)
    const resizedTabs = await waitForStableRect(page, 'inline-text-tabs')
    const resizedMenu = await waitForStableRect(page, 'inline-text-menu')
    const resizedMoveHandle = await waitForStableRect(
      page,
      'inline-text-move-handle',
    )
    for (const [label, before, after] of [
      ['tabs', tabs, resizedTabs],
      ['menu', menu, resizedMenu],
      ['Move handle', moveHandle, resizedMoveHandle],
    ]) {
      if (
        Math.abs(getRectCenterX(before) - getRectCenterX(after)) > 2 ||
        Math.abs(before.top - after.top) > 2
      ) {
        fail(`Center-docked ${label} moved during point-size editing: ${
          JSON.stringify({ after, before })
        }`)
      }
    }

    await clickInlineTab(page, 'art')
    const artMenu = await waitForStableRect(page, 'inline-text-menu')
    if (
      Math.abs(getRectCenterX(menu) - getRectCenterX(artMenu)) > 2 ||
      Math.abs(menu.top - artMenu.top) > 2
    ) {
      fail(`Center-docked menu moved when switching tabs: ${
        JSON.stringify({ artMenu, menu })
      }`)
    }
  })

  await runCheck(page, 'straight disc HTML source updates SVG before Done', async () => {
    const beforeSrc = await smoke(page, 'disc-text-layer-image').first().getAttribute('src')
    await setHtmlSource(page, '<p><span style="color:#ff0000">Disc</span> live</p>')
    const afterSrc = await smoke(page, 'disc-text-layer-image').first().getAttribute('src')
    if (!afterSrc || afterSrc === beforeSrc) {
      fail('Disc SVG data URL did not update during HTML source editing.')
    }
    await done(page)
    await openStraightDiscTitle(page)
    await assertSourceIncludes(page, 'color:#ff0000')
  })

  await runCheck(page, 'straight disc Move handle begins dragging immediately', async () => {
    await ensureStraightDiscContextualShell(page)
    await dragInlineMoveHandleImmediately(
      page,
      'disc-inline-text-title',
      24,
      18,
      { expectMenuMovement: false },
    )
    await clickInlineMoveHandleWithoutMoving(page, 'disc-inline-text-title')
  })

  await runCheck(page, 'straight disc selected-range color and LMB drag selection work', async () => {
    if ((await smoke(page, 'inline-text-menu').count()) > 0) {
      await done(page)
    }
    await openStraightDiscTitle(page)
    await setHtmlSource(page, '<p>Disc Selection Smoke</p>')
    await hideHtmlSource(page)
    await dragSelectVisiblePrefix(page, 'disc-inline-text-title')
    await clickInlineTab(page, 'text')
    await clickInlineToggle(page, 'bold')
    await setInlineColor(page, 'color', '#0000ff')
    const source = await getHtmlSource(page)
    if (!source.includes('color:#0000ff')) {
      fail(`Disc selected range did not receive color formatting: ${source}`)
    }
    if (source.includes('Disc Selection Smoke</span>')) {
      fail(`Disc range formatting colored the whole text instead of a selected range: ${source}`)
    }
    await hideHtmlSource(page)
    await dragSelectVisibleText(page, 'disc-inline-text-title')
  })

  await runCheck(page, 'curved copyright edits directly while staying SVG textPath', async () => {
    await done(page)
    await assertCurvedCopyrightGuardrail(page)
  })
}

function printSummary() {
  console.log('')
  console.log('Text editor smoke results:')
  for (const result of results) {
    const suffix = result.status === 'fail'
      ? ` - ${result.error} (${result.screenshotPath})`
      : ''
    console.log(`- ${result.status.toUpperCase()} ${result.name}${suffix}`)
  }
}

async function main() {
  await ensureViteRuntime()
  browser = await launchBrowser()
  const context = await browser.newContext({
    viewport: { height: 1500, width: 1800 },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(5_000)

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await runCaseChecks(page)
  await runDiscChecks(page)

  printSummary()
  const failed = results.filter((result) => result.status === 'fail')
  if (failed.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await browser?.close().catch(() => {})
  if (viteProcess) {
    viteProcess.kill()
  }
})
