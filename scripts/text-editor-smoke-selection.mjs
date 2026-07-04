export function createTextEditorSmokeSelection({
  fail,
  getHtmlSource,
  getInlineInputState,
  getRect,
  getTextContent,
}) {
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

  return {
    assertSourceIncludes,
    assertTextIncludes,
    dragSelectRotatedSpineText,
    dragSelectVisiblePrefix,
    dragSelectVisibleText,
  }
}
