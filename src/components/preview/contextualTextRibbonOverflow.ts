export type ContextualTextRibbonAxisRect = {
  left: number
  right: number
}

export const CONTEXTUAL_TEXT_RIBBON_REVEAL_GAP_PX = 4

export function getContextualTextRibbonScrollDeltaToReveal({
  gapPx = CONTEXTUAL_TEXT_RIBBON_REVEAL_GAP_PX,
  itemRect,
  rowRect,
  tolerancePx = 1,
}: {
  gapPx?: number
  itemRect: ContextualTextRibbonAxisRect
  rowRect: ContextualTextRibbonAxisRect
  tolerancePx?: number
}) {
  const rowWidth = rowRect.right - rowRect.left
  const itemWidth = itemRect.right - itemRect.left

  if (itemWidth >= rowWidth - gapPx * 2) {
    if (itemRect.left < rowRect.left - tolerancePx) {
      return itemRect.left - rowRect.left - gapPx
    }

    if (itemRect.right > rowRect.right + tolerancePx) {
      return itemRect.right - rowRect.right + gapPx
    }

    return 0
  }

  const leftOverflow = itemRect.left - (rowRect.left + gapPx)
  const rightOverflow = itemRect.right - (rowRect.right - gapPx)

  if (leftOverflow < -tolerancePx) {
    return leftOverflow
  }

  if (rightOverflow > tolerancePx) {
    return rightOverflow
  }

  return 0
}
