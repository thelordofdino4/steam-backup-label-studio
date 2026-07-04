import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createTextEditorSmokeConfig,
  getTextEditorSmokeBrowserCandidates,
  TEXT_EDITOR_SMOKE_DIAGNOSTIC_NOTICE,
  TEXT_EDITOR_SMOKE_LOG_PREFIX,
} from './text-editor-smoke-config.mjs'
import {
  createTextEditorSmokeLogger,
  createTextEditorSmokeReporter,
  fail,
  slugDiagnosticLabel,
} from './text-editor-smoke-reporting.mjs'
import {
  clickSmoke,
  ensureChecked,
  expectAttached,
  expectVisible,
  setNativeInputValue,
  setSelectValue,
  smoke,
  visibleSmoke,
} from './text-editor-smoke-interactions.mjs'
import { createTextEditorSmokeCurvedText } from './text-editor-smoke-curved-text.mjs'
import { createTextEditorSmokeGeometry } from './text-editor-smoke-geometry.mjs'
import { createTextEditorSmokeRouteSetup } from './text-editor-smoke-route-setup.mjs'
import { createTextEditorSmokeSelection } from './text-editor-smoke-selection.mjs'
import {
  createTextEditorSmokeInlineMovement,
  getRectDelta,
} from './text-editor-smoke-inline-movement.mjs'
import { createTextEditorSmokeAttachedRibbon } from './text-editor-smoke-attached-ribbon.mjs'
import { createTextEditorSmokeInlineControls } from './text-editor-smoke-inline-controls.mjs'
import {
  getPaintBoundsFromScreenshot,
} from './text-editor-smoke-png.mjs'
import { createTextEditorSmokeRibbonGeometry } from './text-editor-smoke-ribbon-geometry.mjs'
import {
  ensureTextEditorSmokeViteRuntime,
  launchTextEditorSmokeBrowser,
  stopTextEditorSmokeViteRuntime,
} from './text-editor-smoke-runtime.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const {
  artifactDir,
  baseUrl,
  port,
  startupTimeoutMs,
} = createTextEditorSmokeConfig()
const log = createTextEditorSmokeLogger(TEXT_EDITOR_SMOKE_LOG_PREFIX)
const {
  hasFailures,
  printSummary,
  runCheck,
} = createTextEditorSmokeReporter({ artifactDir, log })
let browser
let viteProcess = null
const {
  assertScreenshotPaintDoesNotTouchHorizontalEdges,
  getRect,
  waitForStableRect,
} = createTextEditorSmokeGeometry({
  artifactDir,
  expectVisible,
  fail,
  getPaintBoundsFromScreenshot,
  slugDiagnosticLabel,
  smoke,
  visibleSmoke,
})
const {
  clickInlineTab,
  clickInlineToggle,
  done,
  expectCaseRibbonEditor,
  expectContextualShell,
  expectDiscRibbonEditor,
  expectInlineEditor,
  focusInlineInput,
  getHtmlSource,
  getInlineInputState,
  getInlineNumberControlMax,
  getInlineNumberControlMin,
  getInlineNumberControlValue,
  getInlineTextNumberDraft,
  getInlineTogglePressed,
  getTextContent,
  hideHtmlSource,
  holdInlineTextNumberStepper,
  openInlineEditorFromTarget,
  replaceInlineTextWithKeyboard,
  selectAllInlineText,
  selectInlineTextNumberPreset,
  setHtmlSource,
  setInlineColor,
  setInlineNumberControl,
  setInlineRangeControl,
  setInlineSelectControl,
  setInlineTextNumberDraftWithKeyboard,
  setInlineTextValue,
  showHtmlSource,
  wheelInlineTextNumberControl,
} = createTextEditorSmokeInlineControls({
  getRect,
  waitForStableRect,
})
const {
  assertSourceIncludes,
  assertTextIncludes,
  dragSelectRotatedSpineText,
  dragSelectVisiblePrefix,
  dragSelectVisibleText,
} = createTextEditorSmokeSelection({
  fail,
  getHtmlSource,
  getInlineInputState,
  getRect,
  getTextContent,
})
const {
  ensureStraightDiscContextualShell,
  openCurvedDiscCopyright,
  openSpineTitle,
  openStraightDiscTitle,
  setCasePane,
  setCopyrightText,
  setDiscTextMode,
  setupCoverTitle,
  setupDisc,
  setupTrayTitle,
} = createTextEditorSmokeRouteSetup({
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
})
const {
  assertCurvedCopyrightGuardrail,
} = createTextEditorSmokeCurvedText({
  clickInlineTab,
  ensureChecked,
  expectDiscRibbonEditor,
  expectInlineEditor,
  fail,
  getInlineInputState,
  getInlineTextNumberDraft,
  getRect,
  hideHtmlSource,
  replaceInlineTextWithKeyboard,
  setCopyrightText,
  setDiscTextMode,
  setHtmlSource,
  setInlineNumberControl,
  setInlineRangeControl,
  setInlineSelectControl,
  setInlineTextNumberDraftWithKeyboard,
})
const {
  assertResponsiveContextualShell,
  captureContextualRibbonTabScreenshots,
} = createTextEditorSmokeRibbonGeometry({
  artifactDir,
  clickInlineTab,
  expectContextualShell,
  fail,
})
const {
  assertAttachedRibbonLayoutAtViewports,
} = createTextEditorSmokeAttachedRibbon({
  artifactDir,
  clickInlineTab,
  done,
  expectContextualShell,
  fail,
  getRectDelta,
  openInlineEditorFromTarget,
})
const {
  clickInlineMoveHandleWithoutMoving,
  dragInlineEdgeMoveImmediately,
  dragInlineMoveHandleImmediately,
  rectsOverlap,
  rectsOverlapMeaningfully,
} = createTextEditorSmokeInlineMovement({
  expectVisible,
  fail,
  getRect,
  smoke,
})

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

async function main() {
  log(TEXT_EDITOR_SMOKE_DIAGNOSTIC_NOTICE)
  viteProcess = await ensureTextEditorSmokeViteRuntime({
    baseUrl,
    fail,
    log,
    port,
    repoRoot,
    startupTimeoutMs,
  })
  browser = await launchTextEditorSmokeBrowser({
    browserCandidates: getTextEditorSmokeBrowserCandidates(),
    log,
  })
  const context = await browser.newContext({
    viewport: { height: 1500, width: 1800 },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(5_000)

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await runCaseChecks(page)
  await runDiscChecks(page)

  printSummary()
  if (hasFailures()) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await browser?.close().catch(() => {})
  stopTextEditorSmokeViteRuntime(viteProcess)
})
