import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT,
  getContextualTextRibbonLayoutMode,
  getContextualTextRibbonReservedHeight,
  type ContextualTextRibbonMode,
} from './contextualTextRibbonModel'

function getInlineSize(element: Element | null) {
  if (!(element instanceof HTMLElement)) return 0

  return element.getBoundingClientRect().width
}

function getHorizontalGap(element: Element | null) {
  if (!(element instanceof HTMLElement)) return 0

  const style = window.getComputedStyle(element)
  const columnGap = Number.parseFloat(style.columnGap || style.gap || '0')

  return Number.isFinite(columnGap) ? columnGap : 0
}

function getHorizontalChrome(element: Element | null) {
  if (!(element instanceof HTMLElement)) return 0

  const style = window.getComputedStyle(element)
  const values = [
    style.paddingLeft,
    style.paddingRight,
    style.borderLeftWidth,
    style.borderRightWidth,
  ].map((value) => Number.parseFloat(value || '0'))

  return values.reduce((sum, value) => (
    sum + (Number.isFinite(value) ? value : 0)
  ), 0)
}

function getRibbonItemPreferredWidth(element: HTMLElement) {
  if (element.classList.contains('contextual-text-ribbon-tab')) {
    const labelLength = element.textContent?.trim().length ?? 0

    return Math.max(62, Math.ceil(labelLength * 8 + 28))
  }

  if (!element.classList.contains('contextual-text-ribbon-group')) {
    return element.scrollWidth || element.getBoundingClientRect().width
  }

  const cardWidth = element.getBoundingClientRect().width
  if (cardWidth > 0) {
    return Math.ceil(cardWidth)
  }

  const children = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )

  if (children.length === 0) {
    return element.scrollWidth || element.getBoundingClientRect().width
  }

  const gap = getHorizontalGap(element)

  return Math.ceil(
    getHorizontalChrome(element)
    + children.reduce((width, child, index) => (
      width + (() => {
        const scrollWidth = child.scrollWidth
        const rectWidth = child.getBoundingClientRect().width

        if (scrollWidth > 0 && rectWidth > 0) {
          return Math.min(scrollWidth, rectWidth)
        }

        return Math.max(scrollWidth, rectWidth, 0)
      })() + (index > 0 ? gap : 0)
    ), 0),
  )
}

function getChildrenInlineWidth(element: Element | null) {
  if (!(element instanceof HTMLElement)) return 0

  const children = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )
  const gap = getHorizontalGap(element)

  return children.reduce((width, child, index) => (
    width + getRibbonItemPreferredWidth(child) + (index > 0 ? gap : 0)
  ), 0)
}

function getColumnPackedChildrenInlineWidth(element: Element | null) {
  if (!(element instanceof HTMLElement)) return 0

  const children = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )

  if (children.length === 0) return 0

  const style = window.getComputedStyle(element)
  const gridRows = style.gridTemplateRows
    .split(/\s+/)
    .filter((track) => track.trim().length > 0)
  const rowCount = Math.max(1, gridRows.length)

  if (rowCount <= 1) {
    return getChildrenInlineWidth(element)
  }

  const gap = getHorizontalGap(element)
  const columnWidths: number[] = []

  children.forEach((child, index) => {
    const columnIndex = Math.floor(index / rowCount)
    columnWidths[columnIndex] = Math.max(
      columnWidths[columnIndex] ?? 0,
      getRibbonItemPreferredWidth(child),
    )
  })

  return columnWidths.reduce((width, columnWidth, index) => (
    width + columnWidth + (index > 0 ? gap : 0)
  ), 0)
}

function getRibbonPreferredWidth(host: HTMLElement) {
  const shell = host.querySelector<HTMLElement>('.contextual-text-ribbon-shell')
  const tabs = host.querySelector<HTMLElement>('.contextual-text-ribbon-tabs')
  const controls = host.querySelector<HTMLElement>(
    '.contextual-text-ribbon-controls',
  )
  const controlRow = host.querySelector<HTMLElement>(
    '.contextual-text-ribbon-control-row',
  )
  const actions = host.querySelector<HTMLElement>(
    '.contextual-text-ribbon-actions',
  )

  const shellChrome = getHorizontalChrome(shell)
  const controlsGap = getHorizontalGap(controls)
  const tabWidth = getChildrenInlineWidth(tabs) || tabs?.scrollWidth || 0
  const controlWidth =
    (getColumnPackedChildrenInlineWidth(controlRow)
      || controlRow?.scrollWidth
      || 0)
    + getInlineSize(actions)
    + (actions ? controlsGap : 0)

  return Math.ceil(Math.max(tabWidth, controlWidth) + shellChrome)
}

export type ContextualTextRibbonHostProps = {
  active?: boolean
  children?: ReactNode
  label?: string
}

export function ContextualTextRibbonHost({
  active = false,
  children,
  label = 'Contextual text controls',
}: ContextualTextRibbonHostProps) {
  const isVisible = active && Boolean(children)
  const hostRef = useRef<HTMLElement | null>(null)
  const [mode, setMode] = useState<ContextualTextRibbonMode>('wide')
  const reservedHeight = getContextualTextRibbonReservedHeight(mode)

  useLayoutEffect(() => {
    const host = hostRef.current

    if (!host) return undefined

    const previewArea = host.closest<HTMLElement>('.preview-area')
    const header = host.closest<HTMLElement>('.preview-header')
    const label = header?.querySelector<HTMLElement>('.preview-pane-label')
    let animationFrame: number | null = null

    const applyMeasuredMode = () => {
      animationFrame = null
      const headerRect = header?.getBoundingClientRect()
      const labelRect = label?.getBoundingClientRect()
      const availableWidth = Math.max(
        0,
        headerRect
          ? headerRect.right - (labelRect?.right ?? headerRect.left)
          : host.getBoundingClientRect().width,
      )
      const measuredMode = getContextualTextRibbonLayoutMode(
        availableWidth,
      )
      const nextMode = measuredMode
      const nextReservedHeight =
        getContextualTextRibbonReservedHeight(nextMode)
      const preferredWidth = isVisible
        ? getRibbonPreferredWidth(host)
        : availableWidth
      const nextActiveWidth = Math.min(
        availableWidth,
        nextMode === 'wide' ? preferredWidth : availableWidth,
      )

      host.style.setProperty(
        '--contextual-text-ribbon-reserved-height',
        `${nextReservedHeight}px`,
      )
      host.style.setProperty(
        '--contextual-text-ribbon-active-width',
        `${Math.ceil(nextActiveWidth)}px`,
      )
      previewArea?.style.setProperty(
        '--contextual-text-ribbon-reserved-height',
        `${nextReservedHeight}px`,
      )
      setMode((currentMode) =>
        currentMode === nextMode ? currentMode : nextMode)
    }

    const scheduleMeasuredMode = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(applyMeasuredMode)
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(scheduleMeasuredMode)
    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(scheduleMeasuredMode)

    applyMeasuredMode()
    if (header) resizeObserver?.observe(header)
    if (label) resizeObserver?.observe(label)
    resizeObserver?.observe(host)
    mutationObserver?.observe(host, {
      childList: true,
      subtree: true,
    })

    return () => {
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      previewArea?.style.removeProperty(
        '--contextual-text-ribbon-reserved-height',
      )

      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
      }
    }
  }, [isVisible, mode])

  return (
    <section
      ref={hostRef}
      aria-hidden={!isVisible}
      aria-label={label}
      className={[
        'contextual-text-ribbon-host',
        active ? 'is-active' : '',
        isVisible ? 'has-controls' : '',
      ].filter(Boolean).join(' ')}
      data-contextual-text-ribbon-active={active}
      data-contextual-text-ribbon-mode={mode}
      data-contextual-text-ribbon-visible={isVisible}
      data-smoke-id="contextual-text-ribbon-host"
      style={{
        '--contextual-text-ribbon-reserved-height':
          `${reservedHeight || CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT}px`,
      } as CSSProperties}
    >
      <div className="contextual-text-ribbon-shell">
        {children}
      </div>
    </section>
  )
}
