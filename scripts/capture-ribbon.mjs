#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import {
  REQUIRED_RIBBON_CAPTURE_SIZES,
  createHtmlContactSheet,
  createManifestEntry,
  rectInside,
  rectsOverlap,
  validateClientSize,
  validatePngScreenshot,
} from './ribbon-capture-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const port = Number(process.env.RIBBON_CAPTURE_PORT ?? 5178)
const baseUrl = `http://127.0.0.1:${port}/`
const artifactDir = process.env.RIBBON_CAPTURE_ARTIFACT_DIR ??
  path.join(os.tmpdir(), 'steam-backup-label-studio-ribbon-capture')
const startupTimeoutMs = 30_000
const tabs = [
  { id: 'presets', label: 'Presets' },
  { id: 'text', label: 'Text' },
  { id: 'art', label: 'Artistic' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'html', label: 'HTML' },
]
const surfaces = [
  {
    editorModule: 'case-insert',
    label: 'case-cover',
    previewSmokeId: 'case-preview-cover',
    selectedTextTarget: 'cover-title-text',
    setup: setupCaseCover,
  },
  {
    editorModule: 'disc',
    label: 'disc-straight-title',
    previewSmokeId: 'disc-preview',
    selectedTextTarget: 'straight-title',
    setup: setupDiscStraightTitle,
  },
  {
    editorModule: 'disc',
    label: 'disc-curved-copyright',
    previewSmokeId: 'disc-preview',
    selectedTextTarget: 'curved-copyright',
    setup: setupDiscCurvedCopyright,
  },
]

let viteProcess = null
let browser = null

function log(message) {
  console.log(`[capture-ribbon] ${message}`)
}

function fail(message) {
  throw new Error(message)
}

function smokeSelector(smokeId) {
  return `[data-smoke-id="${smokeId}"]`
}

function smoke(page, smokeId) {
  return page.locator(smokeSelector(smokeId))
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

  await waitForApp()
}

function findBrowserExecutable() {
  const candidates = [
    process.env.RIBBON_CAPTURE_BROWSER,
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
    args: [
      '--disable-gpu',
      '--force-device-scale-factor=1',
      '--hide-scrollbars=false',
    ],
    headless: true,
  }

  if (executablePath) {
    log(`Using browser executable ${executablePath}`)
    return chromium.launch({ ...options, executablePath })
  }

  log('Using Playwright bundled Chromium')
  return chromium.launch(options)
}

function readGitValue(args, fallback) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
  })

  return result.status === 0 ? result.stdout.trim() : fallback
}

async function expectVisible(page, smokeId, label = smokeId) {
  const locator = smoke(page, smokeId).first()
  await locator.waitFor({ state: 'visible', timeout: 8_000 })
  return locator
}

async function clickSmoke(page, smokeId) {
  await expectVisible(page, smokeId)
  await smoke(page, smokeId).first().click()
}

async function clickVisibleSmoke(page, smokeId) {
  await expectVisible(page, smokeId)
  await smoke(page, smokeId).first().click({ force: true })
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

async function ensureChecked(page, smokeId, checked) {
  const locator = smoke(page, smokeId).first()
  await locator.waitFor({ state: 'attached', timeout: 8_000 })
  await locator.evaluate((element, nextChecked) => {
    const input = element instanceof HTMLInputElement
      ? element
      : element.querySelector('input[type="checkbox"]')
    if (!(input instanceof HTMLInputElement) || input.checked === nextChecked) return
    input.click()
  }, checked)
  await page.waitForTimeout(120)
}

async function setGameTitle(page, title) {
  await setNativeInputValue(page.locator('#game-title'), title)
  await page.waitForTimeout(120)
}

async function setCopyrightText(page, text) {
  await setNativeInputValue(page.locator('#game-metadata-copyright'), text)
  await page.waitForTimeout(120)
}

async function setDiscTextMode(page, key, mode) {
  await setSelectValue(smoke(page, `disc-sidebar-mode-${key}`), mode)
  await page.waitForTimeout(180)
}

async function setCasePane(page, paneId) {
  await setSelectValue(smoke(page, 'case-template-pane-select'), paneId)
  await expectVisible(page, `case-preview-${paneId}`)
}

async function expectContextualRibbon(page) {
  await expectVisible(page, 'contextual-text-ribbon-host')
  await expectVisible(page, 'inline-text-tabs')
  await expectVisible(page, 'inline-text-menu')
}

async function openInlineEditorFromTarget(page, smokeId) {
  await clickVisibleSmoke(page, smokeId)
  await expectContextualRibbon(page)
}

async function clickInlineTab(page, tabId) {
  await clickVisibleSmoke(page, `inline-text-tab-${tabId}`)
  await waitForCaptureReadiness(page)
}

async function setupCaseCover(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await installCaptureStabilizers(page)
  await clickSmoke(page, 'home-new-case-insert')
  await expectVisible(page, 'case-insert-editor')
  await setGameTitle(page, 'Ribbon Capture Fixture')
  await setCasePane(page, 'cover')
  await ensureChecked(page, 'case-sidebar-text-block-cover-cover-title-text', true)
  await openInlineEditorFromTarget(page, 'case-text-block-cover-cover-title-text')
}

async function setupDiscBase(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await installCaptureStabilizers(page)
  await clickSmoke(page, 'home-new-disc')
  await expectVisible(page, 'disc-preview')
  await setGameTitle(page, 'Ribbon Capture Disc')
  await setCopyrightText(page, 'Ribbon Capture Legal Text 2026')
}

async function setupDiscStraightTitle(page) {
  await setupDiscBase(page)
  await ensureChecked(page, 'disc-sidebar-text-title', true)
  const hitTarget = page
    .locator('[data-smoke-id="disc-text-layer-hit-target"] [data-disc-text-key="title"]')
    .first()
  await hitTarget.waitFor({ state: 'attached', timeout: 8_000 })
  await hitTarget.click({ force: true })
  await expectContextualRibbon(page)
  await expectVisible(page, 'disc-text-layer-image')
}

async function setupDiscCurvedCopyright(page) {
  await setupDiscBase(page)
  await ensureChecked(page, 'disc-sidebar-text-copyright', true)
  await setDiscTextMode(page, 'copyright', 'curved')
  const curvedPath = page
    .locator('[data-smoke-id="disc-text-layer-hit-target"] text[data-disc-text-key="copyright"] textPath')
    .first()
  await curvedPath.waitFor({ state: 'attached', timeout: 8_000 })
  await curvedPath.click({ force: true })
  await expectContextualRibbon(page)
  await expectVisible(page, 'disc-text-layer-image')
}

async function installCaptureStabilizers(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0.001ms !important;
      }
    `,
  }).catch(() => {})
}

async function waitForCaptureReadiness(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
    await Promise.all(
      [...document.images].map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true })
              image.addEventListener('error', resolve, { once: true })
            }),
      ),
    )
    await new Promise((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise((resolve) => requestAnimationFrame(() => resolve()))
  })
  await page.waitForTimeout(80)
}

function toRect(rect) {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  }
}

async function getDomSnapshot(page, previewSmokeId) {
  return page.evaluate((targetPreviewSmokeId) => {
    const selectorForSmoke = (smokeId) => `[data-smoke-id="${smokeId}"]`
    const getElement = (selector) => document.querySelector(selector)
    const createRect = (element) => {
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
        Number(style.opacity) > 0.01
      )
    }
    const createOptionalRect = (selector) => {
      const element = getElement(selector)
      return element instanceof HTMLElement || element instanceof SVGElement
        ? createRect(element)
        : null
    }
    const createFocusableItems = (rootSelector) => {
      const root = getElement(rootSelector)
      if (!(root instanceof HTMLElement)) return []
      return [...root.querySelectorAll('button, input, select, textarea, [role="button"], [role="tab"]')]
        .filter((element) => element instanceof HTMLElement && isVisible(element))
        .map((element) => ({
          label:
            element.getAttribute('data-smoke-id') ??
            element.getAttribute('aria-label') ??
            element.textContent?.trim().slice(0, 32) ??
            element.tagName,
          rect: createRect(element),
        }))
    }

    const root = getElement('#root')
    const ribbon = getElement(selectorForSmoke('contextual-text-ribbon-host'))
    const tabs = getElement(selectorForSmoke('inline-text-tabs'))
    const menu = getElement(selectorForSmoke('inline-text-menu'))
    const previewArea = getElement('.preview-area')
    const previewHeader = getElement('.preview-header')
    const previewSurface = getElement(selectorForSmoke(targetPreviewSmokeId))
    const previewViewport = getElement(selectorForSmoke('preview-viewport'))
    const panZoomRail = getElement(selectorForSmoke('preview-viewport-controls'))
    const bottomControls = getElement('.preview-floating-controls')

    const rects = {
      appRoot: root instanceof HTMLElement ? createRect(root) : null,
      bottomControls: bottomControls instanceof HTMLElement ? createRect(bottomControls) : null,
      menu: menu instanceof HTMLElement ? createRect(menu) : null,
      panZoomRail: panZoomRail instanceof HTMLElement ? createRect(panZoomRail) : null,
      previewArea: previewArea instanceof HTMLElement ? createRect(previewArea) : null,
      previewHeader: previewHeader instanceof HTMLElement ? createRect(previewHeader) : null,
      previewSurface:
        previewSurface instanceof HTMLElement || previewSurface instanceof SVGElement
          ? createRect(previewSurface)
          : null,
      previewViewport: previewViewport instanceof HTMLElement ? createRect(previewViewport) : null,
      ribbon: ribbon instanceof HTMLElement ? createRect(ribbon) : null,
      tabs: tabs instanceof HTMLElement ? createRect(tabs) : null,
    }

    return {
      activeTab:
        [...document.querySelectorAll('[data-smoke-id^="inline-text-tab-"]')]
          .find((element) => element.getAttribute('aria-selected') === 'true')
          ?.getAttribute('data-smoke-id') ?? null,
      client: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
      devicePixelRatio: window.devicePixelRatio,
      focusableItems: [
        ...createFocusableItems(selectorForSmoke('inline-text-tabs')),
        ...createFocusableItems(selectorForSmoke('inline-text-menu')),
      ],
      optionalRects: {
        htmlSource: createOptionalRect(selectorForSmoke('inline-text-html-source')),
      },
      outerWindow: {
        height: window.outerHeight,
        width: window.outerWidth,
      },
      rects,
    }
  }, previewSmokeId)
}

function validateDomSnapshot(snapshot, expectedClient) {
  const failures = []
  const requiredRects = [
    'appRoot',
    'menu',
    'previewArea',
    'previewSurface',
    'previewViewport',
    'ribbon',
    'tabs',
  ]
  const viewport = {
    bottom: expectedClient.height,
    height: expectedClient.height,
    left: 0,
    right: expectedClient.width,
    top: 0,
    width: expectedClient.width,
  }

  for (const key of requiredRects) {
    if (!snapshot.rects[key]) {
      failures.push(`missing ${key} rectangle`)
    }
  }

  for (const key of ['appRoot', 'menu', 'previewSurface', 'previewViewport', 'ribbon', 'tabs']) {
    const rect = snapshot.rects[key]
    if (rect && !rectInside(rect, viewport, 1.5)) {
      failures.push(`${key} lies outside client area: ${JSON.stringify(rect)}`)
    }
  }

  const controls = snapshot.focusableItems
  for (let index = 0; index < controls.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < controls.length; nextIndex += 1) {
      const first = controls[index]
      const second = controls[nextIndex]
      if (rectsOverlap(first.rect, second.rect, 2)) {
        failures.push(`control overlap: ${first.label} / ${second.label}`)
      }
    }
  }

  if (snapshot.rects.previewSurface && snapshot.rects.ribbon) {
    if (rectsOverlap(snapshot.rects.previewSurface, snapshot.rects.ribbon, 1)) {
      failures.push('preview surface overlaps contextual ribbon')
    }
  }

  return { failures, passed: failures.length === 0 }
}

async function captureScenario(page, context, surface, scenario, tab) {
  await clickInlineTab(page, tab.id)
  await waitForCaptureReadiness(page)

  const domSnapshot = await getDomSnapshot(page, surface.previewSmokeId)
  const clientValidation = validateClientSize({
    actualHeight: domSnapshot.client.height,
    actualWidth: domSnapshot.client.width,
    requestedHeight: scenario.height,
    requestedWidth: scenario.width,
  })
  if (!clientValidation.passed) {
    fail(`Client size mismatch for ${surface.label}/${scenario.name}/${tab.id}: ${
      JSON.stringify(clientValidation)
    }`)
  }

  const filename = `ribbon-capture-browser-${surface.label}-${scenario.name}-${tab.id}.png`
  const screenshotPath = path.join(artifactDir, filename)
  const screenshot = await page.screenshot({
    animations: 'disabled',
    fullPage: false,
    path: screenshotPath,
  })
  const pngValidation = validatePngScreenshot(screenshot, {
    expectedHeight: scenario.height,
    expectedWidth: scenario.width,
    fullWindow: true,
  })
  const domValidation = validateDomSnapshot(domSnapshot, {
    height: scenario.height,
    width: scenario.width,
  })
  const failures = [...pngValidation.failures, ...domValidation.failures]

  return {
    ...createManifestEntry({
    activeRibbonTab: tab.label,
    actualClient: domSnapshot.client,
    branch: context.branch,
    commitSha: context.commitSha,
    devicePixelRatio: domSnapshot.devicePixelRatio,
    domValidation,
    editorModule: surface.editorModule,
    method: 'browser',
    outerWindow: domSnapshot.outerWindow,
    png: pngValidation,
    requestedClient: {
      height: scenario.height,
      width: scenario.width,
    },
    screenshotPath,
    screenshotPixels: {
      height: pngValidation.stats.height,
      width: pngValidation.stats.width,
    },
    selectedTextTarget: surface.selectedTextTarget,
    timestamp: new Date().toISOString(),
    }),
    validation: {
      failures,
      passed: failures.length === 0,
    },
  }
}

async function createBrowserContextForScenario(scenario) {
  return browser.newContext({
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    viewport: {
      height: scenario.height,
      width: scenario.width,
    },
  })
}

function createNativeCaptureStatus() {
  return {
    captureMethod: 'tauri',
    status: 'requires-any-app-pilot',
    reason:
      'Repository-owned npm scripts cannot invoke Any App / Computer Use. ' +
      'Required Tauri visual verification must be performed from npm run tauri dev ' +
      'against the native app window and recorded separately. Browser captures in ' +
      'this manifest are diagnostic-only.',
  }
}

async function run() {
  log('Browser diagnostic only; not Tauri visual verification.')
  fs.mkdirSync(artifactDir, { recursive: true })
  await ensureViteRuntime()
  browser = await launchBrowser()

  const contextInfo = {
    branch: readGitValue(['branch', '--show-current'], 'unknown'),
    commitSha: readGitValue(['rev-parse', 'HEAD'], 'unknown'),
  }
  const manifest = {
    artifactDir,
    browserBaseUrl: baseUrl,
    diagnosis: {
      currentSmokeScreenshots:
        'Existing text-editor smoke PNGs decoded as valid nonblack RGB PNGs during pre-edit diagnosis. ' +
        'Unreadable display in Codex should be treated as viewer/display-path evidence until this command fails PNG validation.',
      currentSmokeLimitations:
        'The older smoke path mixed assertions and screenshot side effects, wrote some crops, and did not emit a manifest proving exact client size, DPR, full-window capture, or PNG health for every screenshot.',
    },
    generatedAt: new Date().toISOString(),
    nativeCapture: createNativeCaptureStatus(),
    requiredClientSizes: REQUIRED_RIBBON_CAPTURE_SIZES,
    screenshots: [],
    version: 1,
  }

  for (const scenario of REQUIRED_RIBBON_CAPTURE_SIZES) {
    for (const surface of surfaces) {
      const context = await createBrowserContextForScenario(scenario)
      const page = await context.newPage()

      try {
        log(`Capturing ${surface.label} at ${scenario.width}x${scenario.height}`)
        await surface.setup(page)
        await waitForCaptureReadiness(page)

        for (const tab of tabs) {
          const entry = await captureScenario(page, contextInfo, surface, scenario, tab)
          manifest.screenshots.push(entry)
        }
      } finally {
        await context.close()
      }
    }
  }

  const manifestPath = path.join(artifactDir, 'ribbon-capture-manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  const contactSheetPath = path.join(artifactDir, 'ribbon-capture-contact-sheet.html')
  const contactSheet = createHtmlContactSheet({
    generatedAt: manifest.generatedAt,
    manifestPath,
    screenshots: manifest.screenshots.map((entry) => ({
      ...entry,
      label: `${entry.editorModule} ${entry.selectedTextTarget} ${entry.activeRibbonTab}`,
      relativePath: path.relative(artifactDir, entry.screenshotPath),
      sizeLabel: `${entry.requestedClient.width}x${entry.requestedClient.height}`,
    })),
    title: 'Contextual Text Ribbon Capture Contact Sheet',
  })
  fs.writeFileSync(contactSheetPath, contactSheet)

  log(`Wrote manifest: ${manifestPath}`)
  log(`Wrote contact sheet: ${contactSheetPath}`)
  log(`Captured ${manifest.screenshots.length} browser screenshots.`)
  log(`Native capture status: ${manifest.nativeCapture.status}`)

  const failures = manifest.screenshots
    .filter((entry) => !entry.validation?.passed)
    .map((entry) => ({
      activeRibbonTab: entry.activeRibbonTab,
      failures: entry.validation.failures,
      selectedTextTarget: entry.selectedTextTarget,
      size: `${entry.requestedClient.width}x${entry.requestedClient.height}`,
    }))
  if (failures.length > 0) {
    fail(`Ribbon capture validation failed for ${failures.length} screenshot(s): ${
      JSON.stringify(failures.slice(0, 8))
    }`)
  }
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await browser?.close().catch(() => {})
    if (viteProcess) {
      viteProcess.kill()
    }
  })
