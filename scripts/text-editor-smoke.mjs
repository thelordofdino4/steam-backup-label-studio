import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

async function setDiscSidebarTextValue(page, key, value) {
  await setNativeInputValue(page.locator(`#disc-text-value-${key}`), value)
  await page.waitForTimeout(150)
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
  await clickInlineTab(page, 'utilities')
  await setNativeInputValue(
    smoke(page, `inline-text-number-${labelToken}`).first(),
    String(value),
  )
  await page.waitForTimeout(250)
}

async function getInlineNumberControlValue(page, labelToken) {
  await clickInlineTab(page, 'utilities')
  const value = await smoke(page, `inline-text-number-${labelToken}`).first()
    .inputValue()
  return Number(value)
}

async function getInlineNumberControlMax(page, labelToken) {
  await clickInlineTab(page, 'utilities')
  const max = await smoke(page, `inline-text-number-${labelToken}`).first()
    .getAttribute('max')
  return Number(max)
}

async function showHtmlSource(page) {
  await clickInlineTab(page, 'utilities')
  await ensureChecked(page, 'inline-text-checkbox-html-source', true)
  await expectVisible(page, 'inline-text-html-source')
}

async function hideHtmlSource(page) {
  await clickInlineTab(page, 'utilities')
  await ensureChecked(page, 'inline-text-checkbox-html-source', false)
  await expectAttached(page, 'inline-text-input')
  await clickInlineTab(page, 'text')
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
  await setDiscSidebarTextValue(page, 'copyright', 'Copyright 2026 Smoke')
  const curvedPath = page.locator('[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="copyright"] textPath').first()
  await curvedPath.waitFor({ state: 'attached', timeout: 5_000 })
  await curvedPath.click({ force: true })
  await page.waitForTimeout(200)
  const copyrightEditorCount = await smoke(page, 'disc-inline-text-copyright').count()
  if (copyrightEditorCount !== 0) {
    fail('Curved copyright opened a rectangular inline editor.')
  }
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

  await runCheck(page, 'cover initial bottom placement moves menu above tabs', async () => {
    const yMax = await getInlineNumberControlMax(page, 'y')
    await setInlineNumberControl(page, 'y', yMax)
    await done(page)
    await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
    const tabs = await getRect(page, 'inline-text-tabs')
    const menu = await getRect(page, 'inline-text-menu')
    if (menu.bottom > tabs.top + 1) {
      fail('Initial menu placement near the bottom overlapped or stayed below tabs.')
    }
  })

  await runCheck(page, 'tray, left spine, and right spine open inline editors', async () => {
    await done(page)
    await setupTrayTitle(page)
    await assertTextIncludes(page, 'case-text-block-tray-tray-title-text', 'Tray Smoke Title')
    await done(page)
    await openSpineTitle(page, 'left')
    await assertTextIncludes(page, 'case-spine-title-left', 'LEFT SPINE SMOKE')
    await done(page)
    await openSpineTitle(page, 'right')
    await assertTextIncludes(page, 'case-spine-title-right', 'RIGHT SPINE SMOKE')
    await done(page)
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

  await runCheck(page, 'straight disc selection formatting and LMB drag selection work', async () => {
    await done(page)
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

  await runCheck(page, 'curved copyright remains SVG textPath without rectangular editor', async () => {
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
