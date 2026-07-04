import {
  discTextLayerHitTargetSelector,
} from './text-editor-smoke-selectors.mjs'

export function createTextEditorSmokeRouteSetup({
  baseUrl,
  clickSmoke,
  done,
  ensureChecked,
  expectContextualShell,
  expectDiscRibbonEditor,
  expectInlineEditor,
  expectVisible,
  hideHtmlSource,
  openInlineEditorFromTarget,
  replaceInlineTextWithKeyboard,
  setNativeInputValue,
  setSelectValue,
  smoke,
}) {
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

  async function openStraightDiscTitle(page) {
    await ensureChecked(page, 'disc-sidebar-text-title', true)
    const hitTarget = page.locator(
      discTextLayerHitTargetSelector('[data-disc-text-key="title"]'),
    ).first()
    await hitTarget.waitFor({ state: 'attached', timeout: 5_000 })
    await hitTarget.click({ force: true })
    await expectInlineEditor(page)
    await expectVisible(page, 'disc-text-layer-image')
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

  async function openCurvedDiscCopyright(page) {
    await ensureChecked(page, 'disc-sidebar-text-copyright', true)
    await setDiscTextMode(page, 'copyright', 'curved')
    await setCopyrightText(page, 'Copyright 2026 Smoke')
    const curvedPath = page.locator(
      discTextLayerHitTargetSelector('text[data-disc-text-key="copyright"] textPath'),
    ).first()
    await curvedPath.waitFor({ state: 'attached', timeout: 5_000 })
    await curvedPath.click({ force: true })
    await expectInlineEditor(page)
    await expectDiscRibbonEditor(page)
  }

  return {
    ensureStraightDiscContextualShell,
    openCurvedDiscCopyright,
    openSpineTitle,
    openStraightDiscTitle,
    setCasePane,
    setCopyrightText,
    setDiscTextMode,
    setGameTitle,
    setupCoverTitle,
    setupDisc,
    setupTrayTitle,
    turnOffSpineMirroringIfNeeded,
  }
}
