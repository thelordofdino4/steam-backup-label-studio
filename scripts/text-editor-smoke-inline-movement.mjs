export function getRectDelta(first, second) {
  return {
    left: second.left - first.left,
    top: second.top - first.top,
  }
}

export function rectsOverlap(first, second) {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  )
}

export function getRectOverlap(first, second) {
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

export function rectsOverlapMeaningfully(first, second, tolerance = 6) {
  const overlap = getRectOverlap(first, second)

  return overlap.width > tolerance && overlap.height > tolerance
}

export function getInlineEdgeDragStartPoint(edgeRect, edge) {
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

  return { x: startX, y: startY }
}

export function createTextEditorSmokeInlineMovement({
  expectVisible,
  fail,
  getRect,
  smoke,
}) {
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
    const { x: startX, y: startY } = getInlineEdgeDragStartPoint(edgeRect, edge)
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

  return {
    clickInlineMoveHandleWithoutMoving,
    dragInlineEdgeMoveImmediately,
    dragInlineMoveHandleImmediately,
    rectsOverlap,
    rectsOverlapMeaningfully,
  }
}
