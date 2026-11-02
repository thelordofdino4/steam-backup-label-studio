// Contrast uses a bounded card body, but its platform font can need more than
// the baseline floor. Measure every option, never the selected value, so choosing
// another mode cannot resize the card or displace the user's controls.
export function getContextualTextRibbonContrastMinWidth(card: HTMLElement) {
  if (card.dataset.ribbonGroup !== 'contrast') return 0
  const select = card.querySelector('select')
  const header = card.querySelector<HTMLElement>(':scope > .contextual-text-ribbon-group-header')
  const body = card.querySelector<HTMLElement>(':scope > .contextual-text-ribbon-group-body')
  const control = select?.closest<HTMLElement>('.contextual-text-ribbon-control')
  const context = card.ownerDocument.createElement('canvas').getContext('2d')
  if (!select || !header || !body || !control || !context) return 0

  const style = window.getComputedStyle(select)
  context.font = style.font
  const letterSpacing = Number.parseFloat(style.letterSpacing) || 0
  const textWidth = Math.max(0, ...Array.from(select.options, option =>
    context.measureText(option.label).width + option.label.length * letterSpacing))
  const cardStyle = window.getComputedStyle(card)
  const gap = Number.parseFloat(cardStyle.columnGap) || 0
  return Math.ceil(textWidth + horizontalChrome(select) + horizontalChrome(control)
    + horizontalChrome(body) + header.getBoundingClientRect().width
    + gap + horizontalChrome(card))
}

function horizontalChrome(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  return [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth]
    .reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0)
}
