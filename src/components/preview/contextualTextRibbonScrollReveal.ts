import {
  getContextualTextRibbonScrollDeltaToReveal,
  type ContextualTextRibbonAxisRect,
} from './contextualTextRibbonOverflow.ts'

const CONTEXTUAL_TEXT_RIBBON_ROW_SELECTOR =
  '.contextual-text-ribbon-control-row'
const CONTEXTUAL_TEXT_RIBBON_SCROLL_ITEM_SELECTOR =
  '.contextual-text-ribbon-group, .contextual-text-ribbon-command-button'

function getContextualTextRibbonScrollItem(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null

  return target.closest<HTMLElement>(
    CONTEXTUAL_TEXT_RIBBON_SCROLL_ITEM_SELECTOR,
  )
}

function getContextualTextRibbonScrollRow(item: HTMLElement | null) {
  return item?.closest<HTMLElement>(CONTEXTUAL_TEXT_RIBBON_ROW_SELECTOR) ?? null
}

function getContextualTextRibbonAxisRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect()

  return {
    left: rect.left,
    right: rect.right,
  }
}

export function getContextualTextRibbonScrollRevealDelta({
  itemRect,
  rowRect,
}: {
  itemRect: ContextualTextRibbonAxisRect
  rowRect: ContextualTextRibbonAxisRect
}) {
  const isFullyHidden =
    itemRect.right <= rowRect.left + 1 ||
    itemRect.left >= rowRect.right - 1

  if (!isFullyHidden) {
    return 0
  }

  return getContextualTextRibbonScrollDeltaToReveal({
    itemRect,
    rowRect,
  })
}

export function revealContextualTextRibbonScrollItem(target: EventTarget | null) {
  const item = getContextualTextRibbonScrollItem(target)
  const row = getContextualTextRibbonScrollRow(item)

  if (!item || !row) {
    return
  }

  const delta = getContextualTextRibbonScrollRevealDelta({
    itemRect: getContextualTextRibbonAxisRect(item),
    rowRect: getContextualTextRibbonAxisRect(row),
  })

  if (delta !== 0) {
    row.scrollLeft += delta
  }
}
