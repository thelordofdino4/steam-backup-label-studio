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

const expectedContextualRibbonGroupsByTab = {
  art: ['Text Color', 'Contrast', 'Background', 'Border'],
  html: ['HTML'],
  presets: ['Style', 'Layout', 'Reset'],
  text: ['Font', 'Paragraph'],
  utilities: ['Position', 'Layout', 'Reset'],
}

function smoke(page, smokeId) {
  return page.locator(smokeSelector(smokeId))
}

function visibleSmoke(page, smokeId) {
  return page.locator(`${smokeSelector(smokeId)}:visible`)
}

async function expectAttached(page, smokeId, message = smokeId) {
  await smoke(page, smokeId).waitFor({ state: 'attached', timeout: 5_000 })
  const count = await smoke(page, smokeId).count()
  if (count < 1) fail(`${message} was not attached.`)
}

async function expectVisible(page, smokeId, message = smokeId) {
  await visibleSmoke(page, smokeId).first().waitFor({ state: 'visible', timeout: 5_000 })
  const count = await visibleSmoke(page, smokeId).count()
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
  await visibleSmoke(page, smokeId).first().click({ force: true })
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

async function expectRibbonEditor(page, label = 'Text') {
  await expectInlineEditor(page)
  await expectVisible(page, 'contextual-text-ribbon-host', 'contextual text ribbon host')

  const result = await page.evaluate(() => {
    const host = document.querySelector('[data-smoke-id="contextual-text-ribbon-host"]')
    const tabs = document.querySelector('[data-smoke-id="inline-text-tabs"]')
    const menu = document.querySelector('[data-smoke-id="inline-text-menu"]')
    const moveHandle = document.querySelector('[data-smoke-id="inline-text-move-handle"]')
    const oldFloatingTabs =
      tabs instanceof HTMLElement && tabs.classList.contains('inline-preview-text-tabs')
    const oldFloatingMenu =
      menu instanceof HTMLElement && menu.classList.contains('inline-preview-text-menu')

    return {
      hostActive: host instanceof HTMLElement
        ? host.getAttribute('data-contextual-text-ribbon-active')
        : null,
      menuInsideRibbon: Boolean(host && menu && host.contains(menu)),
      moveHandleInsideRibbon: Boolean(host && moveHandle && host.contains(moveHandle)),
      oldFloatingMenu,
      oldFloatingTabs,
      tabsInsideRibbon: Boolean(host && tabs && host.contains(tabs)),
    }
  })

  if (result.hostActive !== 'true') {
    fail(`${label} did not activate the contextual ribbon: ${JSON.stringify(result)}`)
  }
  if (!result.tabsInsideRibbon || !result.menuInsideRibbon) {
    fail(`${label} controls were not mounted in the ribbon: ${JSON.stringify(result)}`)
  }
  if (result.moveHandleInsideRibbon) {
    fail(`${label} Move handle should stay as a local preview affordance: ${JSON.stringify(result)}`)
  }
  if (result.oldFloatingTabs || result.oldFloatingMenu) {
    fail(`${label} still rendered the old floating full menu: ${JSON.stringify(result)}`)
  }
}

async function expectCaseRibbonEditor(page) {
  await expectRibbonEditor(page, 'Case text')
}

async function expectDiscRibbonEditor(page) {
  await expectRibbonEditor(page, 'Disc text')
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

async function getInlineTogglePressed(page, labelToken) {
  await expectVisible(page, `inline-text-toggle-${labelToken}`)
  const value = await visibleSmoke(page, `inline-text-toggle-${labelToken}`)
    .first()
    .getAttribute('aria-pressed')

  return value === 'true' || value === 'mixed'
}

async function setInlineColor(page, labelToken, value) {
  await clickInlineTab(page, 'art')
  await setNativeInputValue(
    visibleSmoke(page, `inline-text-color-${labelToken}`).first(),
    value,
  )
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

async function getInlineTextNumberDraft(page, labelToken) {
  await expectAttached(page, `inline-text-number-${labelToken}`)
  return visibleSmoke(page, `inline-text-number-${labelToken}`).first().inputValue()
}

async function setInlineTextNumberDraftWithKeyboard(page, labelToken, value) {
  await clickInlineTab(page, 'text')
  const input = visibleSmoke(page, `inline-text-number-${labelToken}`).first()
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
  const optionsButton = visibleSmoke(page, `inline-text-number-options-${labelToken}`).first()
  const beforeRibbon = await getRect(page, 'contextual-text-ribbon-host')
  const tagName = await optionsButton.evaluate((element) =>
    element.tagName.toLowerCase())

  if (tagName === 'select') {
    await optionsButton.selectOption(String(value))
    const afterNativeSelectRibbon = await getRect(page, 'contextual-text-ribbon-host')

    if (
      Math.abs(beforeRibbon.width - afterNativeSelectRibbon.width) > 1.5 ||
      Math.abs(beforeRibbon.height - afterNativeSelectRibbon.height) > 1.5
    ) {
      fail(
        `${labelToken} native preset select resized the contextual ribbon: ` +
        JSON.stringify({ afterNativeSelectRibbon, beforeRibbon }),
      )
    }
    return
  }

  await optionsButton.click({ force: true })
  await expectVisible(
    page,
    `inline-text-number-options-list-${labelToken}`,
    `${labelToken} preset list`,
  )
  const afterOpenRibbon = await getRect(page, 'contextual-text-ribbon-host')
  const optionListLayout = await visibleSmoke(
    page,
    `inline-text-number-options-list-${labelToken}`,
  ).first().evaluate((element) => {
    const style = window.getComputedStyle(element)

    return {
      display: style.display,
      flexDirection: style.flexDirection,
      height: element.getBoundingClientRect().height,
      width: element.getBoundingClientRect().width,
    }
  })

  if (
    Math.abs(beforeRibbon.width - afterOpenRibbon.width) > 1.5 ||
    Math.abs(beforeRibbon.height - afterOpenRibbon.height) > 1.5
  ) {
    fail(
      `${labelToken} preset list resized the contextual ribbon: ` +
      JSON.stringify({ afterOpenRibbon, beforeRibbon }),
    )
  }

  if (
    optionListLayout.display !== 'flex' ||
    optionListLayout.flexDirection !== 'column'
  ) {
    fail(
      `${labelToken} presets rendered as a button cloud instead of a listbox: ` +
      JSON.stringify(optionListLayout),
    )
  }

  await visibleSmoke(page, `inline-text-number-option-${labelToken}-${value}`)
    .first()
    .click({ force: true })
  await page.waitForTimeout(150)
}

async function wheelInlineTextNumberControl(page, labelToken, deltaY) {
  await clickInlineTab(page, 'text')
  const input = visibleSmoke(page, `inline-text-number-${labelToken}`).first()
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
  await expectVisible(page, smokeId)
  const { candidates, controls, hit, rect } = await visibleSmoke(page, smokeId).evaluateAll((elements) => {
    const controlsElement = document.querySelector('[data-smoke-id="inline-text-menu"]')
    const controlsRect = controlsElement?.getBoundingClientRect()
    const candidates = elements.map((element) => {
      const rect = element.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const hitElement = document.elementFromPoint(x, y)
      const hitInfo = hitElement
        ? {
            className: typeof hitElement.className === 'string' ? hitElement.className : '',
            smokeId: hitElement.getAttribute('data-smoke-id'),
            tagName: hitElement.tagName,
            text: hitElement.textContent?.trim().slice(0, 24) ?? '',
          }
        : null
      return {
        isHit: hitElement === element || Boolean(hitElement && element.contains(hitElement)),
        hit: hitInfo,
        rect: {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        },
      }
    })

    return {
      candidates,
      controls: controlsRect
        ? {
            bottom: controlsRect.bottom,
            height: controlsRect.height,
            left: controlsRect.left,
            right: controlsRect.right,
            scrollHeight: controlsElement.scrollHeight,
            scrollTop: controlsElement.scrollTop,
            top: controlsRect.top,
            width: controlsRect.width,
          }
        : null,
      ...(candidates.find((candidate) => candidate.isHit) ?? candidates[0]),
    }
  })
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  if (hit?.smokeId !== smokeId) {
    fail(`Font size stepper hit-test missed ${smokeId}: ${
      JSON.stringify({ candidates, controls, hit, rect })
    }`)
  }
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(520)
  await page.mouse.up()
  await page.waitForTimeout(150)
}

async function showHtmlSource(page) {
  await clickInlineTab(page, 'html')
  await expectVisible(page, 'inline-text-html-source')
  await page.waitForFunction(() =>
    Boolean(document.querySelector('.inline-preview-text-host.is-html-source')),
  )
}

async function hideHtmlSource(page) {
  await clickInlineTab(page, 'text')
  await smoke(page, 'inline-text-html-source').waitFor({ state: 'detached', timeout: 5_000 })
  await expectAttached(page, 'inline-text-input')
}

async function ensureStraightDiscContextualShell(page) {
  if ((await smoke(page, 'inline-text-menu').count()) === 0) {
    await openStraightDiscTitle(page)
  }
  if ((await smoke(page, 'inline-text-html-source').count()) > 0) {
    await hideHtmlSource(page)
  }
  await expectContextualShell(page)
  await expectDiscRibbonEditor(page)
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
  await waitForStableRect(page, 'inline-text-menu')
  await clickVisibleSmoke(page, 'inline-text-done')
  await smoke(page, 'inline-text-menu').waitFor({ state: 'detached', timeout: 5_000 })
}

async function getRect(page, smokeId) {
  await expectVisible(page, smokeId)
  return visibleSmoke(page, smokeId).first().evaluate((element) => {
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

async function assertCurvedEditorUsesPathOverlays(page, label, expectedOverlay) {
  const pathOverlaySmokeId = expectedOverlay === 'selection'
    ? 'inline-text-selection-path'
    : 'inline-text-caret-path'
  const pathOverlay = smoke(page, pathOverlaySmokeId).first()
  await pathOverlay.waitFor({ state: 'visible', timeout: 2_000 })

  const path = pathOverlay.locator('path').first()
  const pathD = await path.getAttribute('d')
  if (!pathD) {
    fail(`${label}: curved ${expectedOverlay} path overlay did not expose SVG path geometry.`)
  }
  if (expectedOverlay === 'selection' && !pathD.includes(' A ')) {
    fail(`${label}: curved selection did not use an arc path: ${pathD}`)
  }
  if (expectedOverlay === 'caret' && !pathD.includes(' L ')) {
    fail(`${label}: curved caret did not use a path segment: ${pathD}`)
  }
  if (expectedOverlay === 'selection') {
    const strokeLinecap = await path.evaluate(
      (element) => getComputedStyle(element).strokeLinecap,
    )
    if (strokeLinecap !== 'butt') {
      fail(
        `${label}: curved selection used ${strokeLinecap} caps, which visually ` +
        `extends the highlight beyond the selected boundaries.`,
      )
    }
  }

  const rectangularSelectionCount = await page
    .locator('.inline-preview-text-selection:not(.inline-preview-text-selection--path)')
    .count()
  if (expectedOverlay === 'selection' && rectangularSelectionCount > 0) {
    fail(`${label}: curved selection fell back to rectangular editor bands.`)
  }
}

function getPointDistance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function assertNearbyPoint(actual, expected, label, tolerance = 3) {
  const distance = getPointDistance(actual, expected)
  if (distance > tolerance) {
    fail(`${label}: point mismatch ${JSON.stringify({ actual, distance, expected })}`)
  }
}

async function getCurvedSelectionPathClientEndpoints(page) {
  await assertCurvedEditorUsesPathOverlays(page, 'curved selection visual boundary', 'selection')
  const path = smoke(page, 'inline-text-selection-path').first().locator('path').first()

  return path.evaluate((element) => {
    const svg = element.ownerSVGElement
    const ctm = element.getScreenCTM()
    if (!svg || !ctm || typeof element.getPointAtLength !== 'function') {
      throw new Error('Curved selection path does not expose screen geometry.')
    }
    const totalLength = element.getTotalLength()
    const start = element.getPointAtLength(0)
    const end = element.getPointAtLength(totalLength)
    const svgPoint = svg.createSVGPoint()
    const toScreen = (point) => {
      svgPoint.x = point.x
      svgPoint.y = point.y
      const screenPoint = svgPoint.matrixTransform(ctm)

      return { x: screenPoint.x, y: screenPoint.y }
    }

    return {
      end: toScreen(end),
      start: toScreen(start),
      strokeLinecap: getComputedStyle(element).strokeLinecap,
    }
  })
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
  await page.waitForTimeout(180)

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

async function dragInlineEdgeMoveImmediately(
  page,
  targetSmokeId,
  edge = 'right',
  deltaX = 28,
  deltaY = 18,
) {
  await expectVisible(page, `inline-text-edge-move-${edge}`)
  const beforeTarget = await getRect(page, targetSmokeId)
  const beforeRibbon = await getRect(page, 'contextual-text-ribbon-host')
  const edgeRect = await getRect(page, `inline-text-edge-move-${edge}`)
  const edgeInsetPx = 1
  const isCorner = edge.includes('-')
  const startX = edge.includes('right')
    ? isCorner
      ? edgeRect.right - edgeInsetPx
      : edgeRect.left + edgeInsetPx
    : edge.includes('left')
      ? isCorner
        ? edgeRect.left + edgeInsetPx
        : edgeRect.right - edgeInsetPx
      : edgeRect.left + edgeRect.width / 2
  const startY = edge.includes('bottom')
    ? isCorner
      ? edgeRect.bottom - edgeInsetPx
      : edgeRect.top + edgeInsetPx
    : edge.includes('top')
      ? isCorner
        ? edgeRect.top + edgeInsetPx
        : edgeRect.bottom - edgeInsetPx
      : edgeRect.top + edgeRect.height / 2
  const topElement = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y)
    return {
      className: element instanceof HTMLElement ? element.className : null,
      smokeId: element instanceof HTMLElement
        ? element.getAttribute('data-smoke-id')
        : null,
      tagName: element?.nodeName ?? null,
    }
  }, { x: startX, y: startY })
  if (!topElement.smokeId?.startsWith('inline-text-edge-move-')) {
    fail(
      `Selection edge ${edge} is not the top hit target: ${
        JSON.stringify({ edgeRect, topElement })
      }`,
    )
  }

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  const ringClassAfterDown = await smoke(page, 'inline-text-edge-move-ring')
    .first()
    .getAttribute('class')
  if (!ringClassAfterDown?.includes('is-dragging')) {
    await page.mouse.up().catch(() => {})
    fail(
      `Selection edge ${edge} did not arm dragging on pointer-down: ${
        JSON.stringify({ edgeRect, ringClassAfterDown, topElement })
      }`,
    )
  }
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 1 })
  await page.waitForTimeout(80)

  const duringTarget = await getRect(page, targetSmokeId)
  const targetDelta = getRectDelta(beforeTarget, duringTarget)

  if (
    Math.abs(targetDelta.left) < 2 &&
    Math.abs(targetDelta.top) < 2
  ) {
    await page.mouse.up().catch(() => {})
    fail(
      `Selection edge did not move ${targetSmokeId} on the first pointermove: ` +
      JSON.stringify({ beforeTarget, duringTarget, edge, targetDelta }),
    )
  }

  await page.mouse.up()
  await page.waitForTimeout(150)

  const afterRibbon = await getRect(page, 'contextual-text-ribbon-host')
  if (
    Math.abs(beforeRibbon.left - afterRibbon.left) > 1 ||
    Math.abs(beforeRibbon.top - afterRibbon.top) > 1 ||
    Math.abs(beforeRibbon.width - afterRibbon.width) > 1 ||
    Math.abs(beforeRibbon.height - afterRibbon.height) > 1
  ) {
    fail(
      `Selection-edge movement changed the contextual ribbon: ` +
      JSON.stringify({ afterRibbon, beforeRibbon, edge }),
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

async function getContextualRibbonGeometrySnapshot(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-smoke-id="contextual-text-ribbon-host"]')
    const menu = document.querySelector('[data-smoke-id="inline-text-menu"]')
    const tabs = document.querySelector('[data-smoke-id="inline-text-tabs"]')
    const row = document.querySelector('.contextual-text-ribbon-control-row')

    const toRect = (element) => {
      const rect = element.getBoundingClientRect()

      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      }
    }
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) >= 0.01
      )
    }

    if (
      !(host instanceof HTMLElement) ||
      !(menu instanceof HTMLElement) ||
      !(tabs instanceof HTMLElement) ||
      !(row instanceof HTMLElement)
    ) {
      return { error: 'missing contextual ribbon geometry nodes' }
    }

    const rowStyle = window.getComputedStyle(row)
    const rowRect = toRect(row)
    const scrollbarSpace = Number.parseFloat(rowStyle.paddingBottom) || 0
    const rowUsableBottom = rowRect.bottom - scrollbarSpace
    const groups = Array.from(row.querySelectorAll(':scope > .contextual-text-ribbon-group'))
      .filter((element) => element instanceof HTMLElement && isVisible(element))
      .map((element) => {
        const label = element.querySelector('.contextual-text-ribbon-group-label')
        const body = element.querySelector('.contextual-text-ribbon-group-body')
        const rect = toRect(element)
        const visibleWidth = Math.max(
          0,
          Math.min(rect.right, rowRect.right) -
            Math.max(rect.left, rowRect.left),
        )
        const redundantInnerLabels = Array.from(
          element.querySelectorAll('.contextual-text-ribbon-control-label'),
        )
          .filter((innerLabel) => innerLabel instanceof HTMLElement)
          .map((innerLabel) => {
            const innerRect = innerLabel.getBoundingClientRect()

            return {
              rect: {
                height: innerRect.height,
                width: innerRect.width,
              },
              text: innerLabel.textContent?.trim() ?? '',
            }
          })
          .filter((innerLabel) =>
            innerLabel.text &&
            innerLabel.rect.width > 1 &&
            innerLabel.rect.height > 1)

        return {
          bodyChildCount: body instanceof HTMLElement
            ? Array.from(body.children).filter((child) =>
                child instanceof HTMLElement && isVisible(child)).length
            : 0,
          controlSummary: body instanceof HTMLElement
            ? {
                checkboxCount: body.querySelectorAll('input[type="checkbox"]').length,
                colorCount: body.querySelectorAll('input[type="color"]').length,
                comboboxCount: body.querySelectorAll('[role="combobox"]').length,
                iconButtonCount: body.querySelectorAll('.contextual-text-ribbon-icon-button').length,
                rangeCount: body.querySelectorAll('input[type="range"]').length,
                selectCount: body.querySelectorAll('select').length,
              }
            : {
                checkboxCount: 0,
                colorCount: 0,
                comboboxCount: 0,
                iconButtonCount: 0,
                rangeCount: 0,
                selectCount: 0,
              },
          id: element.getAttribute('data-ribbon-group') ?? '',
          label: label?.textContent?.trim() ?? '',
          rect,
          redundantInnerLabels,
          rowIndex: Math.round(
            (rect.top - rowRect.top) /
              Math.max(1, Number.parseFloat(rowStyle.rowGap) || 1),
          ),
          text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          visibleWidth,
        }
      })
    const topGroups = groups
      .filter((group) => group.rect.top <= rowRect.top + 3)
      .map((group) => group.label)
    const bottomGroups = groups
      .filter((group) => group.rect.top > rowRect.top + 3)
      .map((group) => group.label)
    const rowTwoCovered = groups
      .filter((group) => group.rect.top > rowRect.top + 3)
      .filter((group) => group.rect.bottom > rowUsableBottom + 1.5)
      .map((group) => ({
        bottom: group.rect.bottom,
        label: group.label,
        rowUsableBottom,
      }))
    const clippedGroups = groups
      .filter((group) =>
        group.visibleWidth > 0 &&
        group.visibleWidth < group.rect.width - 1.5)
      .map((group) => ({
        label: group.label,
        visibleWidth: group.visibleWidth,
        width: group.rect.width,
      }))
    const emptyGroups = groups
      .filter((group) => group.bodyChildCount < 1)
      .map((group) => group.label)

    return {
      groups,
      host: toRect(host),
      menu: toRect(menu),
      mode: host.getAttribute('data-contextual-text-ribbon-mode'),
      row: {
        clientWidth: row.clientWidth,
        rect: rowRect,
        scrollLeft: row.scrollLeft,
        scrollWidth: row.scrollWidth,
        scrollbarSpace,
        rowUsableBottom,
      },
      tabs: toRect(tabs),
      topGroups,
      bottomGroups,
      clippedGroups,
      emptyGroups,
      rowTwoCovered,
    }
  })
}

function validateContextualRibbonSemanticGeometry(snapshot, tab, contextLabel) {
  if (snapshot.error) {
    fail(`${contextLabel}: ${snapshot.error}`)
  }

  const expectedLabels = expectedContextualRibbonGroupsByTab[tab]
  const actualLabels = snapshot.groups.map((group) => group.label)
  const unexpectedLabels = expectedLabels
    ? actualLabels.filter((label) => !expectedLabels.includes(label))
    : []
  const redundantLabels = snapshot.groups
    .flatMap((group) =>
      group.redundantInnerLabels.map((innerLabel) =>
        `${group.label}/${innerLabel.text}`))
  const expectedOrder = expectedLabels
    ? expectedLabels.filter((label) => actualLabels.includes(label))
    : []
  const wrongOrder = expectedOrder.some((label, index) =>
    actualLabels[index] !== label)
  const hasTwoRows = snapshot.groups
    .some((group) => group.rect.top > snapshot.row.rect.top + 3)
  const columnFirstBroken = hasTwoRows && snapshot.groups.length >= 3 &&
    (
      Math.abs(snapshot.groups[0].rect.left - snapshot.groups[1].rect.left) > 2 ||
      snapshot.groups[1].rect.top <= snapshot.groups[0].rect.top + 3 ||
      snapshot.groups[2].rect.left <= snapshot.groups[0].rect.left + 2
    )

  if (unexpectedLabels.length > 0) {
    fail(
      `${contextLabel}: semantic ribbon groups did not match ${tab}: ` +
      JSON.stringify({ actualLabels, expectedLabels, unexpectedLabels }),
    )
  }

  if (wrongOrder) {
    fail(
      `${contextLabel}: ribbon groups are not in semantic order: ` +
      JSON.stringify({ actualLabels, expectedOrder }),
    )
  }

  if (redundantLabels.length > 0) {
    fail(
      `${contextLabel}: redundant visible labels remain inside groups: ` +
      JSON.stringify({ redundantLabels }),
    )
  }

  if (snapshot.emptyGroups.length > 0) {
    fail(
      `${contextLabel}: empty ribbon group wrappers are visible: ` +
      JSON.stringify(snapshot.emptyGroups),
    )
  }

  if (snapshot.clippedGroups.length > 0) {
    fail(
      `${contextLabel}: ribbon exposed clipped group slivers: ` +
      JSON.stringify(snapshot.clippedGroups),
    )
  }

  if (snapshot.rowTwoCovered.length > 0) {
    fail(
      `${contextLabel}: horizontal scrollbar covered row-two groups: ` +
      JSON.stringify(snapshot.rowTwoCovered),
    )
  }

  if (columnFirstBroken) {
    fail(
      `${contextLabel}: ribbon did not pack groups column-first: ` +
      JSON.stringify({
        groups: snapshot.groups.map((group) => ({
          label: group.label,
          rect: group.rect,
        })),
      }),
    )
  }

  if (tab === 'text') {
    const fontGroup = snapshot.groups.find((group) => group.label === 'Font')
    const paragraphGroup = snapshot.groups.find((group) => group.label === 'Paragraph')

    if (!fontGroup || fontGroup.controlSummary.selectCount < 1) {
      fail(`${contextLabel}: Font group did not expose a native font dropdown.`)
    }

    if (!fontGroup || fontGroup.controlSummary.comboboxCount < 1) {
      fail(`${contextLabel}: Font group did not expose the point-size combobox.`)
    }

    if (!fontGroup || fontGroup.controlSummary.iconButtonCount < 3) {
      fail(`${contextLabel}: Font group did not own BIU buttons.`)
    }

    if (!paragraphGroup ||
      paragraphGroup.controlSummary.selectCount +
        paragraphGroup.controlSummary.comboboxCount < 1) {
      fail(`${contextLabel}: Paragraph group did not expose a native alignment dropdown.`)
    }
  }
}

async function assertHtmlSourceEditorUsable(page, contextLabel) {
  await expectVisible(page, 'inline-text-html-source', `${contextLabel} HTML source`)
  const result = await smoke(page, 'inline-text-html-source').first().evaluate((textarea) => {
    const style = window.getComputedStyle(textarea)
    const rect = textarea.getBoundingClientRect()
    const lineHeight = Number.parseFloat(style.lineHeight) || 14
    const paddingTop = Number.parseFloat(style.paddingTop) || 0
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0
    const visibleRows = (textarea.clientHeight - paddingTop - paddingBottom) / lineHeight

    return {
      clientHeight: textarea.clientHeight,
      clientWidth: textarea.clientWidth,
      height: rect.height,
      lineHeight,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      scrollHeight: textarea.scrollHeight,
      scrollWidth: textarea.scrollWidth,
      valueLength: textarea.value.length,
      visibleRows,
      whiteSpace: style.whiteSpace,
      width: rect.width,
      wrap: textarea.getAttribute('wrap'),
    }
  })

  if (result.visibleRows < 1.9) {
    fail(`${contextLabel}: HTML source editor collapsed below two rows: ${
      JSON.stringify(result)
    }`)
  }
  if (result.whiteSpace !== 'pre' || result.wrap !== 'off') {
    fail(`${contextLabel}: HTML source editor is not configured for raw source scrolling: ${
      JSON.stringify(result)
    }`)
  }
  if (!['auto', 'scroll'].includes(result.overflowX) ||
    !['auto', 'scroll'].includes(result.overflowY)) {
    fail(`${contextLabel}: HTML source editor does not own both scroll axes: ${
      JSON.stringify(result)
    }`)
  }
}

async function assertResponsiveContextualShell(page) {
  await expectContextualShell(page)

  const scenarios = [
    { name: 'wide', viewportWidth: 2200 },
    { name: 'compact', viewportWidth: 1040 },
    { name: 'narrow', viewportWidth: 760 },
  ]
  const originalViewport = page.viewportSize() ?? { height: 900, width: 1440 }

  for (const scenario of scenarios) {
    let failureMessage = null

    try {
      await page.setViewportSize({
        height: originalViewport.height,
        width: scenario.viewportWidth,
      })
      await page.waitForTimeout(180)
      await expectContextualShell(page)
      fs.mkdirSync(artifactDir, { recursive: true })
      fs.writeFileSync(
        path.join(artifactDir, `responsive-ribbon-${scenario.name}.png`),
        await smoke(page, 'contextual-text-ribbon-host').first().screenshot(),
      )

      const result = await page.evaluate(() => {
        const host = document.querySelector('[data-smoke-id="contextual-text-ribbon-host"]')
        const menu = document.querySelector('[data-smoke-id="inline-text-menu"]')
        const tabs = document.querySelector('[data-smoke-id="inline-text-tabs"]')
        const actions = document.querySelector('.contextual-text-ribbon-actions')

        if (
          !(host instanceof HTMLElement) ||
          !(menu instanceof HTMLElement) ||
          !(tabs instanceof HTMLElement) ||
          !(actions instanceof HTMLElement)
        ) {
          return { error: 'missing shell nodes' }
        }

        const toRect = (element) => {
          const rect = element.getBoundingClientRect()

          return {
            bottom: rect.bottom,
            height: rect.height,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width,
          }
        }
        const rectsOverlapLocal = (first, second) =>
          first.left < second.right &&
          first.right > second.left &&
          first.top < second.bottom &&
          first.bottom > second.top
        const isVisible = (element) => {
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)

          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
          )
        }
        const inside = (child, parent, tolerance = 1.5) =>
          child.left >= parent.left - tolerance &&
          child.right <= parent.right + tolerance &&
          child.top >= parent.top - tolerance &&
          child.bottom <= parent.bottom + tolerance
        const horizontallyInside = (child, parent, tolerance = 1.5) =>
          child.left >= parent.left - tolerance &&
          child.right <= parent.right + tolerance
        const centerInside = (child, parent) => {
          const centerX = child.left + child.width / 2
          const centerY = child.top + child.height / 2

          return (
            centerX >= parent.left &&
            centerX <= parent.right &&
            centerY >= parent.top &&
            centerY <= parent.bottom
          )
        }
        const intersectRect = (first, second) => {
          const left = Math.max(first.left, second.left)
          const right = Math.min(first.right, second.right)
          const top = Math.max(first.top, second.top)
          const bottom = Math.min(first.bottom, second.bottom)

          return {
            bottom,
            height: Math.max(0, bottom - top),
            left,
            right,
            top,
            width: Math.max(0, right - left),
          }
        }

        const menuRect = toRect(menu)
        const tabsRect = toRect(tabs)
        const hostRect = toRect(host)
        const actionsRect = toRect(actions)
        const focusableSelector = [
          'button',
          'input',
          'select',
          'textarea',
        ].join(',')
        const menuFocusables = Array.from(menu.querySelectorAll(focusableSelector))
          .filter((element) => element instanceof HTMLElement && isVisible(element))
          .map((element) => {
            const scrollItem = element.closest(
              '.contextual-text-ribbon-group, .contextual-text-ribbon-command-button',
            )
            const scrollItemStyle = scrollItem instanceof HTMLElement
              ? window.getComputedStyle(scrollItem)
              : null
            const controlShell =
              element.closest('.contextual-text-ribbon-control-row') ||
              element.closest('.contextual-text-ribbon-group')
            const rawRect = toRect(element)
            const clipRect = controlShell instanceof HTMLElement
              ? toRect(controlShell)
              : toRect(menu)
            const visibleRect = intersectRect(
              intersectRect(rawRect, clipRect),
              menuRect,
            )

            return {
              clipRect,
              inputType: element instanceof HTMLInputElement
                ? element.type
                : '',
              label: element.getAttribute('data-smoke-id') ||
                element.getAttribute('aria-label') ||
                element.textContent?.trim() ||
                element.tagName,
              rawRect,
              rect: visibleRect,
              scrollItemHidden: scrollItemStyle
                ? Number(scrollItemStyle.opacity) < 0.01 ||
                  scrollItemStyle.pointerEvents === 'none'
                : false,
            }
          })
        const ribbonScrollItems = Array.from(menu.querySelectorAll(
          '.contextual-text-ribbon-control-row > .contextual-text-ribbon-group, ' +
            '.contextual-text-ribbon-control-row > .contextual-text-ribbon-command-button',
        ))
          .filter((element) => element instanceof HTMLElement && isVisible(element))
          .map((element) => {
            const row = element.closest('.contextual-text-ribbon-control-row')
            const rowRect = row instanceof HTMLElement ? toRect(row) : menuRect
            const rect = toRect(element)
            const visibleWidth = Math.max(
              0,
              Math.min(rect.right, rowRect.right) -
                Math.max(rect.left, rowRect.left),
            )
            const style = window.getComputedStyle(element)

            return {
              label: Array.from(element.querySelectorAll('[data-smoke-id]'))
                .map((child) => child.getAttribute('data-smoke-id'))
                .filter(Boolean)
                .join(',') ||
                element.textContent?.trim() ||
                element.className,
              itemWidth: rect.width,
              opacity: Number(style.opacity),
              pointerEvents: style.pointerEvents,
              rect,
              rowWidth: rowRect.width,
              rowRect,
              visibleWidth,
            }
          })
        const tabButtons = Array.from(tabs.querySelectorAll('button'))
          .filter((element) => element instanceof HTMLElement && isVisible(element))
          .map((element) => ({
            label: element.getAttribute('data-smoke-id') ||
              element.textContent?.trim(),
            rect: toRect(element),
          }))
        const visibleMenuFocusables = menuFocusables
          .filter((item) => !item.scrollItemHidden)
          .filter((item) =>
            centerInside(item.rawRect, item.clipRect) &&
            centerInside(item.rawRect, menuRect))
        const visiblePartialItems = ribbonScrollItems
          .filter((item) =>
            item.itemWidth <= item.rowWidth + 1.5 &&
            item.visibleWidth > 0 &&
            !horizontallyInside(item.rect, item.rowRect) &&
            item.opacity >= 0.01 &&
            item.pointerEvents !== 'none')
          .map((item) => `${item.label}:${Math.round(item.visibleWidth)}px`)
        const outside = [
          ...(!inside(tabsRect, hostRect) ? ['tabs'] : []),
          ...(!inside(menuRect, hostRect) ? ['menu'] : []),
          ...(!inside(actionsRect, hostRect) ? ['actions'] : []),
          ...visibleMenuFocusables
            .filter((item) => !horizontallyInside(item.rect, menuRect))
            .map((item) => `menu:${item.label}`),
          ...tabButtons
            .filter((item) => !inside(item.rect, tabsRect))
            .map((item) => `tabs:${item.label}`),
        ]
        const tooSmall = visibleMenuFocusables
          .filter((item) =>
            item.inputType !== 'checkbox' &&
            (item.rect.width < 24 || item.rect.height < 24))
          .map((item) =>
            `${item.label}:${Math.round(item.rect.width)}x${Math.round(item.rect.height)}`)
        const overlaps = []

        for (let index = 0; index < visibleMenuFocusables.length; index += 1) {
          for (
            let nextIndex = index + 1;
            nextIndex < visibleMenuFocusables.length;
            nextIndex += 1
          ) {
            const first = visibleMenuFocusables[index]
            const second = visibleMenuFocusables[nextIndex]

            if (rectsOverlapLocal(first.rect, second.rect)) {
              overlaps.push(`${first.label}/${second.label}`)
            }
          }
        }

        for (let index = 0; index < tabButtons.length; index += 1) {
          for (
            let nextIndex = index + 1;
            nextIndex < tabButtons.length;
            nextIndex += 1
          ) {
            const first = tabButtons[index]
            const second = tabButtons[nextIndex]

            if (rectsOverlapLocal(first.rect, second.rect)) {
              overlaps.push(`${first.label}/${second.label}`)
            }
          }
        }

        return {
          actionsInside: inside(actionsRect, hostRect),
          host: {
            height: Math.round(hostRect.height),
            width: Math.round(hostRect.width),
          },
          outside,
          overlaps,
          partialItems: visiblePartialItems,
          tabCount: tabButtons.length,
          tooSmall,
          width: Math.round(menuRect.width),
        }
      }, scenario)

      if (result.error) {
        failureMessage = `Responsive ribbon ${scenario.name} check failed: ${
          result.error
        }`
      } else if (result.outside.length > 0) {
        failureMessage =
          `Responsive ribbon ${scenario.name} controls escaped their containers: ${
            JSON.stringify(result)
          }`
      } else if (result.overlaps.length > 0) {
        failureMessage = `Responsive ribbon ${scenario.name} controls overlapped: ${
          JSON.stringify(result)
        }`
      } else if (result.partialItems.length > 0) {
        failureMessage =
          `Responsive ribbon ${scenario.name} exposed clipped control groups: ${
            JSON.stringify(result)
          }`
      } else if (result.tooSmall.length > 0) {
        failureMessage =
          `Responsive ribbon ${scenario.name} controls became too small: ${
            JSON.stringify(result)
          }`
      } else if (!result.actionsInside) {
        failureMessage =
          `Responsive ribbon ${scenario.name} actions were not visible: ${
            JSON.stringify(result)
          }`
      } else if (result.tabCount !== 5) {
        failureMessage = `Responsive ribbon ${scenario.name} lost tabs: ${
          JSON.stringify(result)
        }`
      }
    } finally {
      await page.setViewportSize(originalViewport)
      await page.waitForTimeout(120)
      await expectContextualShell(page)
    }

    if (failureMessage) {
      fail(failureMessage)
    }
  }
}

async function getAttachedRibbonLayoutSnapshot(page, previewSmokeId) {
  return page.evaluate((targetPreviewSmokeId) => {
    const previewArea = document.querySelector('.preview-area')
    const header = document.querySelector('.preview-header')
    const label = document.querySelector('.preview-pane-label')
    const ribbon = document.querySelector('[data-smoke-id="contextual-text-ribbon-host"]')
    const shell = document.querySelector('.contextual-text-ribbon-shell')
    const preview = document.querySelector(`[data-smoke-id="${targetPreviewSmokeId}"]`)
    const toastStack = document.querySelector('.preview-toast-stack')

    const toRect = (element) => {
      const rect = element.getBoundingClientRect()

      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      }
    }

    if (
      !(previewArea instanceof HTMLElement) ||
      !(header instanceof HTMLElement) ||
      !(label instanceof HTMLElement) ||
      !(ribbon instanceof HTMLElement) ||
      !(shell instanceof HTMLElement) ||
      !(preview instanceof HTMLElement) ||
      !(toastStack instanceof HTMLElement)
    ) {
      return { error: 'missing attached ribbon layout nodes' }
    }

    const toast = document.createElement('div')
    toast.className = 'preview-toast preview-toast-info'
    toast.setAttribute('data-smoke-id', 'synthetic-preview-toast')
    toast.innerHTML = [
      '<span class="preview-toast-action">Smoke</span>',
      '<span class="preview-toast-icon" aria-hidden="true"></span>',
      '<span class="preview-toast-description">Ribbon offset</span>',
    ].join('')
    toastStack.append(toast)

    const toastStackStyle = window.getComputedStyle(toastStack)
    const previewAreaStyle = window.getComputedStyle(previewArea)
    const snapshot = {
      active: previewArea.classList.contains('has-contextual-text-ribbon-active'),
      header: toRect(header),
      label: toRect(label),
      preview: toRect(preview),
      previewArea: toRect(previewArea),
      ribbon: toRect(ribbon),
      shell: toRect(shell),
      toast: toRect(toast),
      toastStack: toRect(toastStack),
      toastStackTop: Number.parseFloat(toastStackStyle.top),
      availableHeaderWidth: Math.max(
        0,
        toRect(header).right - toRect(label).right,
      ),
      variables: {
        padding: previewAreaStyle.getPropertyValue('--preview-area-padding').trim(),
        ribbonHeight: previewAreaStyle
          .getPropertyValue('--contextual-text-ribbon-reserved-height')
          .trim(),
        ribbonMode: ribbon.getAttribute('data-contextual-text-ribbon-mode'),
        toastGap: previewAreaStyle
          .getPropertyValue('--contextual-text-ribbon-toast-gap')
          .trim(),
      },
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
    }

    toast.remove()

    return snapshot
  }, previewSmokeId)
}

async function assertAttachedRibbonLayoutAtViewports(page) {
  const originalViewport = page.viewportSize() ?? { height: 1500, width: 1800 }
  const previewSmokeId = 'case-preview-cover'
  const textSmokeId = 'case-text-block-cover-cover-title-text'
  const scenarios = [
    { height: 720, name: 'default-tauri', width: 1000 },
    { height: 650, name: 'minimum-tauri', width: 900 },
    { height: 1009, name: 'maximum-client', width: 1920 },
  ]

  try {
    for (const scenario of scenarios) {
      let failureMessage = null

      try {
        await done(page).catch(() => {})
        await page.setViewportSize({
          height: scenario.height,
          width: scenario.width,
        })
        await page.waitForTimeout(180)

        const inactive = await getAttachedRibbonLayoutSnapshot(
          page,
          previewSmokeId,
        )
        if (inactive.error) {
          failureMessage = `${scenario.name}: ${inactive.error}`
        } else {
          await openInlineEditorFromTarget(page, textSmokeId)
          await expectContextualShell(page)
          await clickInlineTab(page, 'presets')
          await page.waitForTimeout(120)
          const active = await getAttachedRibbonLayoutSnapshot(
            page,
            previewSmokeId,
          )

          if (active.error) {
            failureMessage = `${scenario.name}: ${active.error}`
          } else {
            const previewDelta = getRectDelta(inactive.preview, active.preview)
            const expectedInactiveToastTop = scenario.width <= 1000 ? 12 : 18
            const activeToastGap = active.toast.top - active.header.bottom
            const ribbonTopDelta = Math.abs(active.shell.top - active.header.top)
            const ribbonRightDelta = Math.abs(active.shell.right - active.header.right)
            const headerTopDelta = Math.abs(active.header.top - active.previewArea.top)
            const headerRightDelta = Math.abs(active.header.right - active.previewArea.right)
            const shellTopDelta = Math.abs(active.shell.top - active.previewArea.top)
            const shellRightDelta = Math.abs(active.shell.right - active.previewArea.right)
            const reservedRibbonHeight = Number.parseFloat(
              active.variables.ribbonHeight,
            )
            const availableHeaderWidth = active.availableHeaderWidth
            const expectedRibbonHeight = 148
            const surfaceOffsetFromLabel = active.preview.top - active.label.top

            if (
              active.shell.left < active.label.right - 1 ||
              active.ribbon.left < active.label.right - 1
            ) {
              failureMessage = `${scenario.name}: ribbon crossed the Live Preview label column: ${
                JSON.stringify({ label: active.label, ribbon: active.ribbon, shell: active.shell })
              }`
            } else if (active.ribbon.width > availableHeaderWidth + 1.5) {
              failureMessage = `${scenario.name}: ribbon exceeded the header width available after Live Preview: ${
                JSON.stringify({
                  availableHeaderWidth,
                  label: active.label,
                  ribbon: active.ribbon,
                  shell: active.shell,
                })
              }`
            } else if (
              headerTopDelta > 1.5 ||
              headerRightDelta > 1.5 ||
              shellTopDelta > 1.5 ||
              shellRightDelta > 1.5
            ) {
              failureMessage = `${scenario.name}: ribbon did not use the preview top-right app-shell corner: ${
                JSON.stringify({
                  header: active.header,
                  headerRightDelta,
                  headerTopDelta,
                  previewArea: active.previewArea,
                  shell: active.shell,
                  shellRightDelta,
                  shellTopDelta,
                })
              }`
            } else if (ribbonTopDelta > 1.5 || ribbonRightDelta > 1.5) {
              failureMessage = `${scenario.name}: ribbon is not attached to the header top-right: ${
                JSON.stringify({
                  header: active.header,
                  ribbonRightDelta,
                  ribbonTopDelta,
                  shell: active.shell,
                })
              }`
            } else if (
              Math.abs(reservedRibbonHeight - expectedRibbonHeight) > 1 ||
              Math.abs(active.header.height - expectedRibbonHeight) > 1.5
            ) {
              failureMessage = `${scenario.name}: ribbon did not reserve the expected responsive toolbar height: ${
                JSON.stringify({
                  expectedRibbonHeight,
                  header: active.header,
                  reservedRibbonHeight,
                  shell: active.shell,
                  variables: active.variables,
                })
              }`
            } else if (
              surfaceOffsetFromLabel < expectedRibbonHeight - 1 ||
              surfaceOffsetFromLabel > expectedRibbonHeight + 2
            ) {
              failureMessage = `${scenario.name}: editable surface is not close enough under Live Preview text: ${
                JSON.stringify({
                  expectedRibbonHeight,
                  label: active.label,
                  preview: active.preview,
                  shell: active.shell,
                  surfaceOffsetFromLabel,
                })
              }`
            } else if (
              active.preview.bottom > scenario.height + 1 ||
              active.preview.right > scenario.width + 1 ||
              active.preview.top < -1 ||
              active.preview.left < -1
            ) {
              failureMessage = `${scenario.name}: preview escaped the viewport: ${
                JSON.stringify({ preview: active.preview, viewport: active.viewport })
              }`
            } else if (active.preview.top < active.header.bottom - 1) {
              failureMessage = `${scenario.name}: preview underlapped the header/ribbon: ${
                JSON.stringify({ header: active.header, preview: active.preview })
              }`
            } else if (
              Math.abs(previewDelta.left) > 1.5 ||
              Math.abs(previewDelta.top) > 1.5 ||
              Math.abs(previewDelta.width) > 1.5 ||
              Math.abs(previewDelta.height) > 1.5
            ) {
              failureMessage = `${scenario.name}: text activation moved the preview: ${
                JSON.stringify({ active: active.preview, inactive: inactive.preview, previewDelta })
              }`
            } else if (
              Math.abs(inactive.toastStackTop - expectedInactiveToastTop) > 1
            ) {
              failureMessage = `${scenario.name}: inactive toast did not keep its normal top offset: ${
                JSON.stringify({
                  expectedInactiveToastTop,
                  inactiveToastStackTop: inactive.toastStackTop,
                })
              }`
            } else if (activeToastGap < 8) {
              failureMessage = `${scenario.name}: active toast overlapped or clipped into the ribbon: ${
                JSON.stringify({
                  activeToastGap,
                  header: active.header,
                  toast: active.toast,
                  toastStackTop: active.toastStackTop,
                  variables: active.variables,
                })
              }`
            } else if (active.toast.top <= inactive.toast.top + 20) {
              failureMessage = `${scenario.name}: active ribbon did not push toast stack below the header: ${
                JSON.stringify({
                  activeToast: active.toast,
                  inactiveToast: inactive.toast,
                })
              }`
            }
          }
        }
      } finally {
        if (failureMessage) {
          fs.mkdirSync(artifactDir, { recursive: true })
          await page.screenshot({
            fullPage: true,
            path: path.join(
              artifactDir,
              `attached-ribbon-${scenario.name}.png`,
            ),
          })
        }
      }

      if (failureMessage) {
        fail(failureMessage)
      }
    }
  } finally {
    await page.setViewportSize(originalViewport)
    await page.waitForTimeout(160)
    await openInlineEditorFromTarget(page, textSmokeId)
    await expectContextualShell(page)
  }
}

async function captureContextualRibbonTabScreenshots(page, surfaceName, openEditor) {
  const originalViewport = page.viewportSize() ?? { height: 1500, width: 1800 }
  const scenarios = [
    { height: 720, name: 'default-tauri', width: 1000 },
    { height: 650, name: 'minimum-tauri', width: 900 },
    { height: 1009, name: 'maximum-client', width: 1920 },
  ]
  const tabs = ['presets', 'text', 'art', 'utilities', 'html']
  const geometryReports = []

  fs.mkdirSync(artifactDir, { recursive: true })

  try {
    for (const scenario of scenarios) {
      await page.setViewportSize({
        height: scenario.height,
        width: scenario.width,
      })
      await page.waitForTimeout(180)
      await openEditor()
      await expectContextualShell(page)

      for (const tab of tabs) {
        await clickInlineTab(page, tab)
        await expectContextualShell(page)
        await page.waitForTimeout(100)
        const geometry = await getContextualRibbonGeometrySnapshot(page)
        validateContextualRibbonSemanticGeometry(
          geometry,
          tab,
          `${surfaceName} ${scenario.name} ${tab}`,
        )
        if (tab === 'html') {
          await assertHtmlSourceEditorUsable(
            page,
            `${surfaceName} ${scenario.name} ${tab}`,
          )
        }
        geometryReports.push({
          scenario,
          surfaceName,
          tab,
          geometry,
        })
        await smoke(page, 'contextual-text-ribbon-host').first().screenshot({
          path: path.join(
            artifactDir,
            `native-ribbon-${surfaceName}-${scenario.name}-${tab}.png`,
          ),
        })
        if (tab === 'html') {
          await page.screenshot({
            fullPage: true,
            path: path.join(
              artifactDir,
              `native-ribbon-full-${surfaceName}-${scenario.name}-${tab}.png`,
            ),
          })
        }
      }
    }

    fs.writeFileSync(
      path.join(artifactDir, `native-ribbon-${surfaceName}-geometry.json`),
      JSON.stringify(geometryReports, null, 2),
    )
  } finally {
    await page.setViewportSize(originalViewport)
    await page.waitForTimeout(160)
    await openEditor()
    await expectContextualShell(page)
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
    .locator('[data-smoke-id="disc-text-layer-hit-target"] text.disc-text-render-text[data-disc-text-key="copyright"]:not(.disc-text-curved-shadow)')
    .first()
  await text.waitFor({ state: 'attached', timeout: 5_000 })
  const inputState = await getInlineInputState(page)

  return text.evaluate((element, payload) => {
    const { offset, value } = payload
    const textElements = Array.from(
      element.ownerDocument.querySelectorAll(
        '[data-smoke-id="disc-text-layer-hit-target"] text.disc-text-render-text[data-disc-text-key="copyright"]:not(.disc-text-curved-shadow)',
      ),
    )
    const getVisibleText = (textElement) => {
      const rawText = textElement.textContent ?? ''
      const visibleStart = rawText.search(/\S/)

      return visibleStart >= 0 ? rawText.slice(visibleStart).trimEnd() : rawText
    }
    let searchStart = 0
    let selectedTextElement = textElements[0]
    let selectedLineStart = 0
    let selectedLineText = getVisibleText(selectedTextElement)

    for (const candidateElement of textElements) {
      const candidateLineText = getVisibleText(candidateElement)
      const exactLineStart = candidateLineText
        ? value.indexOf(candidateLineText, searchStart)
        : searchStart
      const lineStart = exactLineStart >= 0 ? exactLineStart : searchStart
      const lineEnd = Math.max(lineStart, lineStart + candidateLineText.length)

      if (offset <= lineEnd || candidateElement === textElements[textElements.length - 1]) {
        selectedTextElement = candidateElement
        selectedLineStart = lineStart
        selectedLineText = candidateLineText
        break
      }

      searchStart = lineEnd
      while (searchStart < value.length && /\s/.test(value.charAt(searchStart))) {
        searchStart += 1
      }
    }

    const textElement = selectedTextElement
    const rawText = textElement.textContent ?? ''
    const visibleStart = rawText.indexOf(selectedLineText)
    const visibleText = selectedLineText
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

    const normalizedOffset = Math.max(
      0,
      Math.min(offset - selectedLineStart, visibleText.length),
    )
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
        lineOffset: normalizedOffset,
        offset,
        text: visibleText,
      }
    }

    if (normalizedOffset >= visibleText.length) {
      return {
        ...toScreen(textElement.getEndPositionOfChar(svgOffset - 1)),
        charCount: visibleText.length,
        lineOffset: normalizedOffset,
        offset,
        text: visibleText,
      }
    }

    const previousEnd = toScreen(textElement.getEndPositionOfChar(svgOffset - 1))
    const nextStart = toScreen(textElement.getStartPositionOfChar(svgOffset))

    return {
      charCount: visibleText.length,
      lineOffset: normalizedOffset,
      offset,
      text: visibleText,
      x: (previousEnd.x + nextStart.x) / 2,
      y: (previousEnd.y + nextStart.y) / 2,
    }
  }, { offset: boundaryOffset, value: inputState.value })
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

async function dragSelectCurvedTextBoundaries(page, startOffset, endOffset, label) {
  const startPoint = await getCurvedTextBoundaryClientPoint(page, startOffset)
  const endPoint = await getCurvedTextBoundaryClientPoint(page, endOffset)
  await page.mouse.move(startPoint.x, startPoint.y)
  await page.mouse.down()
  await page.mouse.move(endPoint.x, endPoint.y, { steps: 14 })
  await page.mouse.up()
  await page.waitForTimeout(140)
  const state = await getInlineInputState(page)
  const expectedStart = Math.min(startOffset, endOffset)
  const expectedEnd = Math.max(startOffset, endOffset)

  if (
    state.selectionStart !== expectedStart ||
    state.selectionEnd !== expectedEnd
  ) {
    fail(
      `${label}: curved boundary drag selected the wrong range: ` +
      JSON.stringify({
        endOffset,
        endPoint,
        expectedEnd,
        expectedStart,
        startOffset,
        startPoint,
        state,
      }),
    )
  }

  return {
    endPoint: await getCurvedTextBoundaryClientPoint(page, expectedEnd),
    startPoint: await getCurvedTextBoundaryClientPoint(page, expectedStart),
  }
}

async function assertCurvedSelectionVisualBoundaryRange(
  page,
  startOffset,
  endOffset,
  label,
) {
  const { endPoint, startPoint } = await dragSelectCurvedTextBoundaries(
    page,
    startOffset,
    endOffset,
    label,
  )
  const endpoints = await getCurvedSelectionPathClientEndpoints(page)

  if (endpoints.strokeLinecap !== 'butt') {
    fail(`${label}: curved selection path used ${endpoints.strokeLinecap} caps.`)
  }
  assertNearbyPoint(
    endpoints.start,
    startPoint,
    `${label}: selection start should match rendered insertion boundary`,
  )
  assertNearbyPoint(
    endpoints.end,
    endPoint,
    `${label}: selection end should match rendered insertion boundary`,
  )
}

async function assertCurvedRenderedBoundarySelections(page, textValue, offsets, label) {
  await replaceInlineTextWithKeyboard(page, textValue)

  for (const offset of offsets) {
    await clickCurvedTextBoundary(page, offset, `${label} offset ${offset}`)
  }
}

async function assertCurvedSelectionVisualBoundaries(page) {
  await clickInlineTab(page, 'text')
  const originalPointSize = await getInlineTextNumberDraft(page, 'font-size-pt')

  await setInlineSelectControl(page, 'arc-side', 'top')
  await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '12')
  await replaceInlineTextWithKeyboard(page, 'BOUNDARY TEST')
  await assertCurvedSelectionVisualBoundaryRange(
    page,
    0,
    1,
    'top arc single-character curved selection',
  )
  await assertCurvedSelectionVisualBoundaryRange(
    page,
    0,
    'BOUNDARY'.length,
    'top arc whole-word curved selection',
  )
  await assertCurvedSelectionVisualBoundaryRange(
    page,
    'BOUNDARY'.length,
    0,
    'top arc reverse whole-word curved selection',
  )

  await setInlineSelectControl(page, 'arc-side', 'bottom')
  await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '6')
  await replaceInlineTextWithKeyboard(page, 'SMALL')
  await assertCurvedSelectionVisualBoundaryRange(
    page,
    2,
    3,
    'bottom arc 6pt single-character curved selection',
  )

  await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '72')
  await replaceInlineTextWithKeyboard(page, 'LARGE CURVED RANGE')
  await assertCurvedSelectionVisualBoundaryRange(
    page,
    6,
    12,
    'bottom arc 72pt word curved selection',
  )

  await setInlineTextNumberDraftWithKeyboard(
    page,
    'font-size-pt',
    originalPointSize || '12',
  )
  await replaceInlineTextWithKeyboard(page, 'Curved direct smoke')
}

async function assertWarframeCurvedCopyrightPointSizeRibbonStability(page) {
  await clickInlineTab(page, 'text')
  const originalPointSize = await getInlineTextNumberDraft(page, 'font-size-pt')
  const warframeLegalText =
    'Warframe App ID 230410 © Digital Extremes Ltd. All rights reserved.'

  await setInlineSelectControl(page, 'arc-side', 'bottom')
  await replaceInlineTextWithKeyboard(page, warframeLegalText)
  await expectDiscRibbonEditor(page)
  const beforeRibbon = await getRect(page, 'contextual-text-ribbon-host')

  await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '15.02')
  await expectDiscRibbonEditor(page)
  const duringRibbon = await getRect(page, 'contextual-text-ribbon-host')
  if (
    Math.abs(beforeRibbon.left - duringRibbon.left) > 1 ||
    Math.abs(beforeRibbon.top - duringRibbon.top) > 1 ||
    Math.abs(beforeRibbon.width - duringRibbon.width) > 1 ||
    Math.abs(beforeRibbon.height - duringRibbon.height) > 1
  ) {
    fail(`Warframe curved copyright ribbon moved while typing 15.02pt: ${
      JSON.stringify({ beforeRibbon, duringRibbon })
    }`)
  }

  await page.keyboard.press('Enter')
  await page.waitForTimeout(160)
  await expectDiscRibbonEditor(page)
  const afterRibbon = await getRect(page, 'contextual-text-ribbon-host')
  if (
    Math.abs(beforeRibbon.left - afterRibbon.left) > 1 ||
    Math.abs(beforeRibbon.top - afterRibbon.top) > 1 ||
    Math.abs(beforeRibbon.width - afterRibbon.width) > 1 ||
    Math.abs(beforeRibbon.height - afterRibbon.height) > 1
  ) {
    fail(`Warframe curved copyright ribbon moved after committing 15.02pt: ${
      JSON.stringify({ afterRibbon, beforeRibbon })
    }`)
  }

  await setInlineTextNumberDraftWithKeyboard(
    page,
    'font-size-pt',
    originalPointSize || '12',
  )
  await replaceInlineTextWithKeyboard(page, 'Curved direct smoke')
}

function removeCharacterBeforeOffset(text, offset) {
  return text.slice(0, Math.max(0, offset - 1)) + text.slice(offset)
}

function removeCharacterAtOffset(text, offset) {
  return text.slice(0, offset) + text.slice(offset + 1)
}

async function assertCurvedCaretMutationParity(page) {
  await clickInlineTab(page, 'text')
  const originalPointSize = await getInlineTextNumberDraft(page, 'font-size-pt')

  await assertCurvedRenderedBoundarySelections(
    page,
    'WIDE TEST',
    [1, 4, 8],
    'ASCII rendered boundary',
  )

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

  await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '72')
  const largeText = 'CURVED RENDERED BOUNDARY PARITY'
  const largeBoundaryOffset = 23
  await assertCurvedRenderedBoundarySelections(
    page,
    largeText,
    [1, 8, largeBoundaryOffset, largeText.length - 1],
    'large point rendered boundary',
  )
  await clickCurvedTextBoundary(
    page,
    largeBoundaryOffset,
    'large point Backspace parity',
  )
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(120)
  state = await getInlineInputState(page)
  if (state.value !== removeCharacterBeforeOffset(largeText, largeBoundaryOffset)) {
    fail(
      `Large point Backspace did not delete the visible character before the curved caret: ` +
      JSON.stringify({ expected: removeCharacterBeforeOffset(largeText, largeBoundaryOffset), state }),
    )
  }

  await replaceInlineTextWithKeyboard(page, largeText)
  await clickCurvedTextBoundary(
    page,
    largeBoundaryOffset,
    'large point Delete parity',
  )
  await page.keyboard.press('Delete')
  await page.waitForTimeout(120)
  state = await getInlineInputState(page)
  if (state.value !== removeCharacterAtOffset(largeText, largeBoundaryOffset)) {
    fail(
      `Large point Delete did not delete the visible character after the curved caret: ` +
      JSON.stringify({ expected: removeCharacterAtOffset(largeText, largeBoundaryOffset), state }),
    )
  }

  await setInlineTextNumberDraftWithKeyboard(
    page,
    'font-size-pt',
    originalPointSize || '12',
  )
  await replaceInlineTextWithKeyboard(page, 'Curved direct smoke')
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

async function openCurvedDiscCopyright(page) {
  await ensureChecked(page, 'disc-sidebar-text-copyright', true)
  await setDiscTextMode(page, 'copyright', 'curved')
  await setCopyrightText(page, 'Copyright 2026 Smoke')
  const curvedPath = page.locator('[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="copyright"] textPath').first()
  await curvedPath.waitFor({ state: 'attached', timeout: 5_000 })
  await curvedPath.click({ force: true })
  await expectInlineEditor(page)
  await expectDiscRibbonEditor(page)
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
  await expectDiscRibbonEditor(page)
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
  const initialRibbon = await getRect(page, 'contextual-text-ribbon-host')
  await replaceInlineTextWithKeyboard(page, 'Curved direct smoke')
  await expectDiscRibbonEditor(page)
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
  await setHtmlSource(page, 'Curved direct smoke')
  await hideHtmlSource(page)
  await assertCurvedEditorUsesPathOverlays(
    page,
    'curved copyright after plain HTML source edit',
    'caret',
  )
  await clickCurvedTextBoundary(page, 6, 'curved after HTML direct edit')
  await page.keyboard.type('X')
  await page.waitForTimeout(120)
  const afterHtmlDirectEditState = await getInlineInputState(page)
  if (afterHtmlDirectEditState.value !== 'CurvedX direct smoke') {
    fail(
      'Curved copyright direct editing did not recover after HTML source editing: ' +
      JSON.stringify(afterHtmlDirectEditState),
    )
  }
  await assertCurvedCaretMutationParity(page)
  await assertWarframeCurvedCopyrightPointSizeRibbonStability(page)
  await dragSelectCurvedText(page, 'disc-inline-text-copyright')
  await assertCurvedEditorUsesPathOverlays(page, 'dragged curved copyright', 'selection')
  await assertCurvedSelectionVisualBoundaries(page)
  await page.keyboard.press('Control+A')
  const selectAllState = await getInlineInputState(page)
  if (
    selectAllState.selectionStart !== 0 ||
    selectAllState.selectionEnd !== selectAllState.value.length
  ) {
    fail(`Ctrl+A did not select all curved text: ${JSON.stringify(selectAllState)}`)
  }
  await setInlineSelectControl(page, 'arc-side', 'top')
  await setInlineNumberControl(page, 'arc', 220)
  await setInlineNumberControl(page, 'inset', 8)
  await setInlineRangeControl(page, 'line-spacing', 1.25)
  await expectDiscRibbonEditor(page)
  const editedRibbon = await getRect(page, 'contextual-text-ribbon-host')
  if (
    Math.abs(initialRibbon.left - editedRibbon.left) > 1 ||
    Math.abs(initialRibbon.top - editedRibbon.top) > 1 ||
    Math.abs(initialRibbon.width - editedRibbon.width) > 1 ||
    Math.abs(initialRibbon.height - editedRibbon.height) > 1
  ) {
    fail(`Disc ribbon moved during curved arc/inset edits: ${
      JSON.stringify({ editedRibbon, initialRibbon })
    }`)
  }
  await setInlineSelectControl(page, 'arc-side', 'bottom')
  await expectDiscRibbonEditor(page)
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
    await selectAllInlineText(page)
    await clickInlineTab(page, 'text')
    if (await getInlineTogglePressed(page, 'bold')) {
      await clickInlineToggle(page, 'bold')
    }
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
      fail(
        `Font size held stepper only changed once: ${
          JSON.stringify({ afterHold, afterKeyboard })
        }`,
      )
    }
  })

  await runCheck(page, 'contextual shell reflows at wide compact and narrow sizes', async () => {
    let sourceShown = false

    try {
      await clickInlineTab(page, 'text')
      await assertResponsiveContextualShell(page)
      await clickInlineTab(page, 'utilities')
      await showHtmlSource(page)
      sourceShown = true
      await assertResponsiveContextualShell(page)
    } finally {
      if (sourceShown) {
        await hideHtmlSource(page).catch(() => {})
      }
    }
  })

  await runCheck(page, 'attached ribbon fits default minimum and large preview headers', async () => {
    await assertAttachedRibbonLayoutAtViewports(page)
  })

  await runCheck(page, 'case native ribbon screenshots cover every tab and viewport', async () => {
    await captureContextualRibbonTabScreenshots(page, 'case-cover', async () => {
      await done(page).catch(() => {})
      await setCasePane(page, 'cover')
      await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
      await expectCaseRibbonEditor(page)
    })
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

  await runCheck(page, 'cover case text uses ribbon controls without floating menu', async () => {
    await hideHtmlSource(page)
    await expectCaseRibbonEditor(page)
    const beforeRibbon = await getRect(page, 'contextual-text-ribbon-host')
    const beforeTarget = await getRect(page, 'case-text-block-cover-cover-title-text')
    const currentY = await getInlineNumberControlValue(page, 'y')
    await setInlineNumberControl(page, 'y', currentY + 8)
    await expectCaseRibbonEditor(page)
    const afterRibbon = await getRect(page, 'contextual-text-ribbon-host')
    const afterTarget = await getRect(page, 'case-text-block-cover-cover-title-text')
    if (Math.abs(afterTarget.top - beforeTarget.top) < 5) {
      fail('Selected text did not move after changing its Y control.')
    }
    if (
      Math.abs(afterRibbon.left - beforeRibbon.left) > 1 ||
      Math.abs(afterRibbon.top - beforeRibbon.top) > 1 ||
      Math.abs(afterRibbon.width - beforeRibbon.width) > 1 ||
      Math.abs(afterRibbon.height - beforeRibbon.height) > 1
    ) {
      fail(
        `Ribbon moved or resized when selected text moved: ${
          JSON.stringify({ beforeRibbon, afterRibbon })
        }`,
      )
    }
  })

  await runCheck(page, 'cover local Move handle remains available', async () => {
    await setInlineTextValue(page, 'Move handle smoke')
    await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '24')
    await page.keyboard.press('Enter')
    await setInlineNumberControl(page, 'wrap-width', 70)
    await setInlineNumberControl(page, 'x', 45)
    await setInlineNumberControl(page, 'y', 45)
    await expectCaseRibbonEditor(page)
    await page.waitForTimeout(250)
    await expectVisible(page, 'inline-text-move-handle')
    await clickInlineMoveHandleWithoutMoving(
      page,
      'case-text-block-cover-cover-title-text',
    )
  })

  await runCheck(page, 'cover selection edge moves text while interior still selects', async () => {
    await dragInlineEdgeMoveImmediately(
      page,
      'case-text-block-cover-cover-title-text',
      'right',
      28,
      16,
    )
    await dragSelectVisibleText(page, 'case-text-block-cover-cover-title-text')
    const selectionState = await getInlineInputState(page)
    if (selectionState.selectionStart === selectionState.selectionEnd) {
      fail(`Interior drag did not preserve text selection: ${JSON.stringify(selectionState)}`)
    }
  })

  await runCheck(page, 'cover Wrap width input keeps ribbon stable while editing', async () => {
    await clickInlineTab(page, 'utilities')
    const beforeRibbon = await getRect(page, 'contextual-text-ribbon-host')
    const input = smoke(page, 'inline-text-number-wrap-width').first()
    await input.focus()
    const focusedWrapWidthVisibility = await page.evaluate(() => {
      const inputElement = document.querySelector(
        '[data-smoke-id="inline-text-number-wrap-width"]',
      )
      const group = inputElement?.closest('.contextual-text-ribbon-group')
      const row = group?.closest('.contextual-text-ribbon-control-row')

      if (
        !(inputElement instanceof HTMLElement) ||
        !(group instanceof HTMLElement) ||
        !(row instanceof HTMLElement)
      ) {
        return { error: 'missing Wrap width ribbon group' }
      }

      const toRect = (element) => {
        const rect = element.getBoundingClientRect()

        return {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        }
      }
      const groupRect = toRect(group)
      const rowRect = toRect(row)
      const style = window.getComputedStyle(group)
      const fullyVisible =
        groupRect.left >= rowRect.left - 1.5 &&
        groupRect.right <= rowRect.right + 1.5

      return {
        fullyVisible,
        groupRect,
        opacity: Number(style.opacity),
        pointerEvents: style.pointerEvents,
        rowRect,
      }
    })

    if (
      focusedWrapWidthVisibility.error ||
      !focusedWrapWidthVisibility.fullyVisible ||
      focusedWrapWidthVisibility.opacity < 0.99 ||
      focusedWrapWidthVisibility.pointerEvents === 'none'
    ) {
      fail(
        `Focused Wrap width group was not fully visible and usable: ${
          JSON.stringify(focusedWrapWidthVisibility)
        }`,
      )
    }
    const manualScrollBeforeEdit = await page.evaluate(() => {
      const inputElement = document.querySelector(
        '[data-smoke-id="inline-text-number-wrap-width"]',
      )
      const group = inputElement?.closest('.contextual-text-ribbon-group')
      const row = group?.closest('.contextual-text-ribbon-control-row')

      if (!(row instanceof HTMLElement)) {
        return { error: 'missing Wrap width ribbon row before edit' }
      }

      row.scrollLeft = row.scrollWidth

      return {
        maxScrollLeft: Math.max(0, row.scrollWidth - row.clientWidth),
        scrollLeft: row.scrollLeft,
      }
    })
    await page.keyboard.press('Control+A')
    await page.keyboard.type('42')
    await page.waitForTimeout(150)
    const duringRibbon = await getRect(page, 'contextual-text-ribbon-host')
    const manualScrollAfterEdit = await page.evaluate(() => {
      const inputElement = document.querySelector(
        '[data-smoke-id="inline-text-number-wrap-width"]',
      )
      const group = inputElement?.closest('.contextual-text-ribbon-group')
      const row = group?.closest('.contextual-text-ribbon-control-row')

      if (!(row instanceof HTMLElement)) {
        return { error: 'missing Wrap width ribbon row after edit' }
      }

      return {
        maxScrollLeft: Math.max(0, row.scrollWidth - row.clientWidth),
        scrollLeft: row.scrollLeft,
      }
    })
    const editedWrapWidthVisibility = await page.evaluate(() => {
      const inputElement = document.querySelector(
        '[data-smoke-id="inline-text-number-wrap-width"]',
      )
      const group = inputElement?.closest('.contextual-text-ribbon-group')
      const row = group?.closest('.contextual-text-ribbon-control-row')

      if (
        !(inputElement instanceof HTMLElement) ||
        !(group instanceof HTMLElement) ||
        !(row instanceof HTMLElement)
      ) {
        return { error: 'missing Wrap width ribbon group after edit' }
      }

      const groupRect = group.getBoundingClientRect()
      const rowRect = row.getBoundingClientRect()

      return {
        fullyVisible:
          groupRect.left >= rowRect.left - 1.5 &&
          groupRect.right <= rowRect.right + 1.5,
        groupRect: {
          left: groupRect.left,
          right: groupRect.right,
        },
        rowRect: {
          left: rowRect.left,
          right: rowRect.right,
        },
      }
    })

    if (editedWrapWidthVisibility.error || !editedWrapWidthVisibility.fullyVisible) {
      fail(
        `Edited Wrap width group did not remain fully visible: ${
          JSON.stringify(editedWrapWidthVisibility)
        }`,
      )
    }

    if (
      manualScrollBeforeEdit.error ||
      manualScrollAfterEdit.error ||
      (
        manualScrollBeforeEdit.maxScrollLeft > 4 &&
        manualScrollAfterEdit.scrollLeft <
          Math.min(
            manualScrollBeforeEdit.scrollLeft,
            manualScrollAfterEdit.maxScrollLeft,
          ) - 2
      )
    ) {
      fail(
        `Wrap width editing reset manual ribbon scroll position: ${
          JSON.stringify({ manualScrollAfterEdit, manualScrollBeforeEdit })
        }`,
      )
    }

    if (
      Math.abs(duringRibbon.left - beforeRibbon.left) > 1 ||
      Math.abs(duringRibbon.top - beforeRibbon.top) > 1 ||
      Math.abs(duringRibbon.width - beforeRibbon.width) > 1 ||
      Math.abs(duringRibbon.height - beforeRibbon.height) > 1
    ) {
      fail(
        `Wrap width editing moved or resized the ribbon: ${
          JSON.stringify({ beforeRibbon, duringRibbon })
        }`,
      )
    }
    await page.keyboard.press('Enter')
  })

  await runCheck(page, 'cover top-edge text opens in the stable ribbon', async () => {
    const yMin = await getInlineNumberControlMin(page, 'y')
    await setInlineNumberControl(page, 'y', yMin)
    await done(page)
    await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
    await expectCaseRibbonEditor(page)
  })

  await runCheck(page, 'cover bottom-edge text opens in the stable ribbon', async () => {
    const yMax = await getInlineNumberControlMax(page, 'y')
    await setInlineNumberControl(page, 'y', yMax)
    await done(page)
    await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
    await expectCaseRibbonEditor(page)
  })

  await runCheck(page, 'cover oversized text keeps ribbon controls accessible', async () => {
    await setInlineNumberControl(page, 'y', 50)
    await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '72')
    await page.keyboard.press('Enter')
    await setInlineTextValue(
      page,
      Array.from({ length: 24 }, (_, index) => `Oversized placement ${index + 1}`).join('\n'),
    )
    await page.waitForTimeout(120)
    await expectCaseRibbonEditor(page)
    const viewport = page.viewportSize()
    const tabs = await getRect(page, 'inline-text-tabs')
    const menu = await getRect(page, 'inline-text-menu')
    const moveHandle = await getRect(page, 'inline-text-move-handle')
    if (!viewport) {
      fail('Could not read viewport size for oversized ribbon check.')
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
        fail(`Ribbon ${label} was offscreen: ${JSON.stringify(rect)}`)
      }
    }
    if (rectsOverlap(moveHandle, menu) || rectsOverlap(moveHandle, tabs)) {
      fail('Move handle was hidden behind the ribbon controls.')
    }
  })

  await runCheck(page, 'tray, left spine, and right spine open inline editors', async () => {
    await done(page)
    await setupTrayTitle(page)
    await assertTextIncludes(page, 'case-text-block-tray-tray-title-text', 'Tray Smoke Title')
    await expectCaseRibbonEditor(page)
    await dragInlineEdgeMoveImmediately(
      page,
      'case-text-block-tray-tray-title-text',
      'bottom-right',
      18,
      16,
    )
    await dragSelectVisibleText(page, 'case-text-block-tray-tray-title-text')
    await done(page)
    await openSpineTitle(page, 'left')
    await assertTextIncludes(page, 'case-spine-title-left', 'LEFT SPINE SMOKE')
    await expectCaseRibbonEditor(page)
    await dragInlineEdgeMoveImmediately(
      page,
      'case-spine-title-left',
      'top',
      0,
      18,
    )
    await done(page)
    await openSpineTitle(page, 'right')
    await assertTextIncludes(page, 'case-spine-title-right', 'RIGHT SPINE SMOKE')
    await expectCaseRibbonEditor(page)
    await dragInlineEdgeMoveImmediately(
      page,
      'case-spine-title-right',
      'bottom',
      0,
      18,
    )
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
    await expectDiscRibbonEditor(page)
    const imageSrc = await smoke(page, 'disc-text-layer-image').first().getAttribute('src')
    if (!imageSrc?.startsWith('data:image/svg+xml')) {
      fail('Straight disc visible text layer was not the SVG image renderer.')
    }
  })

  await runCheck(page, 'straight disc ribbon remains stable when text moves', async () => {
    await ensureStraightDiscContextualShell(page)
    const beforeRibbon = await getRect(page, 'contextual-text-ribbon-host')
    const beforeTarget = await getRect(page, 'disc-inline-text-title')
    await setInlineNumberControl(page, 'y', 50)
    await page.waitForTimeout(250)
    await expectDiscRibbonEditor(page)
    const afterRibbon = await getRect(page, 'contextual-text-ribbon-host')
    const afterTarget = await getRect(page, 'disc-inline-text-title')
    if (Math.abs(afterTarget.top - beforeTarget.top) < 5) {
      fail('Straight disc selected text did not move after changing its Y control.')
    }
    if (
      Math.abs(afterRibbon.left - beforeRibbon.left) > 1 ||
      Math.abs(afterRibbon.top - beforeRibbon.top) > 1 ||
      Math.abs(afterRibbon.width - beforeRibbon.width) > 1 ||
      Math.abs(afterRibbon.height - beforeRibbon.height) > 1
    ) {
      fail(`Disc ribbon moved or resized when selected text moved: ${
        JSON.stringify({ afterRibbon, beforeRibbon })
      }`)
    }
  })

  await runCheck(page, 'outer straight disc uses ribbon controls without floating dock', async () => {
    await done(page)
    await openStraightDiscTitle(page)
    await setInlineNumberControl(page, 'y', 8)
    await done(page)
    await openStraightDiscTitle(page)
    await clickInlineTab(page, 'text')
    await expectDiscRibbonEditor(page)
    const ribbon = await getRect(page, 'contextual-text-ribbon-host')
    const moveHandle = await getRect(page, 'inline-text-move-handle')
    const tabs = await getRect(page, 'inline-text-tabs')
    const menu = await getRect(page, 'inline-text-menu')
    if (!rectsOverlapMeaningfully(tabs, ribbon) || !rectsOverlapMeaningfully(menu, ribbon)) {
      fail(`Straight disc tabs/menu were not mounted in the ribbon: ${
        JSON.stringify({ menu, ribbon, tabs })
      }`)
    }
    if (rectsOverlapMeaningfully(moveHandle, ribbon)) {
      fail(`Straight disc Move handle was mounted inside or behind the ribbon: ${
        JSON.stringify({ moveHandle, ribbon })
      }`)
    }

    const beforeRibbon = await getRect(page, 'contextual-text-ribbon-host')
    await setInlineTextNumberDraftWithKeyboard(page, 'font-size-pt', '16')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(250)
    await expectDiscRibbonEditor(page)
    const resizedRibbon = await getRect(page, 'contextual-text-ribbon-host')
    if (
      Math.abs(beforeRibbon.left - resizedRibbon.left) > 1 ||
      Math.abs(beforeRibbon.top - resizedRibbon.top) > 1 ||
      Math.abs(beforeRibbon.width - resizedRibbon.width) > 1 ||
      Math.abs(beforeRibbon.height - resizedRibbon.height) > 1
    ) {
      fail(`Disc ribbon moved during point-size editing: ${
        JSON.stringify({ beforeRibbon, resizedRibbon })
      }`)
    }

    await clickInlineTab(page, 'art')
    await expectDiscRibbonEditor(page)
  })

  await runCheck(page, 'disc native ribbon screenshots cover every tab and viewport', async () => {
    await captureContextualRibbonTabScreenshots(page, 'disc-straight', async () => {
      await done(page).catch(() => {})
      await openStraightDiscTitle(page)
      await expectDiscRibbonEditor(page)
    })
    await captureContextualRibbonTabScreenshots(page, 'disc-curved', async () => {
      await done(page).catch(() => {})
      await openCurvedDiscCopyright(page)
      await expectDiscRibbonEditor(page)
    })
  })

  await runCheck(page, 'straight disc HTML source updates SVG before Done', async () => {
    if ((await smoke(page, 'inline-text-menu').count()) > 0) {
      await done(page)
    }
    await openStraightDiscTitle(page)
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

  await runCheck(page, 'straight disc selection edge moves text immediately', async () => {
    await ensureStraightDiscContextualShell(page)
    await dragInlineEdgeMoveImmediately(
      page,
      'disc-inline-text-title',
      'left',
      -22,
      14,
    )
  })

  await runCheck(page, 'straight disc selected-range color and LMB drag selection work', async () => {
    if ((await smoke(page, 'inline-text-menu').count()) > 0) {
      await done(page)
    }
    await openStraightDiscTitle(page)
    await setHtmlSource(page, '<p>Disc Selection Smoke</p>')
    await hideHtmlSource(page)
    await dragSelectVisiblePrefix(page, 'disc-inline-text-title')
    const selectionAfterDrag = await getInlineInputState(page)
    await clickInlineTab(page, 'text')
    await clickInlineToggle(page, 'bold')
    const selectionAfterBold = await getInlineInputState(page)
    await setInlineColor(page, 'color', '#0000ff')
    const selectionAfterColor = await getInlineInputState(page)
    const source = await getHtmlSource(page)
    if (!source.includes('color:#0000ff')) {
      fail(
        `Disc selected range did not receive color formatting: ${source}; ` +
        `selectionAfterDrag=${JSON.stringify(selectionAfterDrag)}, ` +
        `selectionAfterBold=${JSON.stringify(selectionAfterBold)}, ` +
        `selectionAfterColor=${JSON.stringify(selectionAfterColor)}`,
      )
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
    await dragInlineEdgeMoveImmediately(
      page,
      'disc-inline-text-copyright',
      'bottom-left',
      -18,
      16,
    )
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
  log('Browser diagnostic only; not Tauri visual verification.')
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
