import { fail } from './text-editor-smoke-reporting.mjs'
import {
  clickVisibleSmoke,
  expectAttached,
  expectVisible,
  setNativeInputValue,
  smoke,
  visibleSmoke,
} from './text-editor-smoke-interactions.mjs'

export function createTextEditorSmokeInlineControls({
  getRect,
  waitForStableRect,
}) {
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

  return {
    clickInlineTab,
    clickInlineToggle,
    done,
    expectCaseRibbonEditor,
    expectContextualShell,
    expectDiscRibbonEditor,
    expectInlineEditor,
    expectRibbonEditor,
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
  }
}
