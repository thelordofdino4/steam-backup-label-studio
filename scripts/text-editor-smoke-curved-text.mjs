import {
  discTextLayerHitTargetSelector,
} from './text-editor-smoke-selectors.mjs'
import {
  smoke,
} from './text-editor-smoke-interactions.mjs'

export function createTextEditorSmokeCurvedText({
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
}) {
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

  async function dragSelectCurvedText(page, smokeId) {
    const targetRect = await getRect(page, smokeId)
    const textRect = await page
      .locator(discTextLayerHitTargetSelector('text[data-disc-text-key="copyright"]'))
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
      .locator(discTextLayerHitTargetSelector(
        'text.disc-text-render-text[data-disc-text-key="copyright"]:not(.disc-text-curved-shadow)',
      ))
      .first()
    await text.waitFor({ state: 'attached', timeout: 5_000 })
    const inputState = await getInlineInputState(page)

    return text.evaluate((element, payload) => {
      const { offset, value } = payload
      const textElements = Array.from(
        element.ownerDocument.querySelectorAll(
          payload.renderedTextSelector,
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
    }, {
      offset: boundaryOffset,
      renderedTextSelector: discTextLayerHitTargetSelector(
        'text.disc-text-render-text[data-disc-text-key="copyright"]:not(.disc-text-curved-shadow)',
      ),
      value: inputState.value,
    })
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
        JSON.stringify({
          expected: removeCharacterBeforeOffset(largeText, largeBoundaryOffset),
          state,
        }),
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
        JSON.stringify({
          expected: removeCharacterAtOffset(largeText, largeBoundaryOffset),
          state,
        }),
      )
    }

    await setInlineTextNumberDraftWithKeyboard(
      page,
      'font-size-pt',
      originalPointSize || '12',
    )
    await replaceInlineTextWithKeyboard(page, 'Curved direct smoke')
  }

  async function assertCurvedCopyrightGuardrail(page) {
    await ensureChecked(page, 'disc-sidebar-text-copyright', true)
    await setDiscTextMode(page, 'copyright', 'curved')
    await setCopyrightText(page, 'Copyright 2026 Smoke')
    const curvedPath = page.locator(
      discTextLayerHitTargetSelector('text[data-disc-text-key="copyright"] textPath'),
    ).first()
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

  return {
    assertCurvedCaretMutationParity,
    assertCurvedCopyrightGuardrail,
    assertCurvedEditorUsesPathOverlays,
    assertCurvedSelectionVisualBoundaries,
    assertWarframeCurvedCopyrightPointSizeRibbonStability,
    clickCurvedTextBoundary,
    dragSelectCurvedText,
  }
}
