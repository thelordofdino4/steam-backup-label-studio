import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT,
  getContextualTextRibbonActiveWidth,
  getContextualTextRibbonColumnWidths,
  getContextualTextRibbonLayoutMode,
  getContextualTextRibbonReservedHeight,
  packContextualTextRibbonColumns,
  type ContextualTextRibbonWidthProfile,
  type ContextualTextRibbonMode,
} from './contextualTextRibbonModel'

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

function getFiniteDataNumber(value: string | undefined) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

function getFixedWidthProfile(width: number): ContextualTextRibbonWidthProfile {
  const finiteWidth = Number.isFinite(width) ? Math.max(0, width) : 0

  return {
    max: finiteWidth,
    min: finiteWidth,
    preferred: finiteWidth,
  }
}

function clampWidth(width: number, min: number, max: number) {
  const finiteWidth = Number.isFinite(width) ? width : min

  return Math.min(max, Math.max(min, finiteWidth))
}

function getRibbonElementRowSpan(element: HTMLElement): 1 | 2 {
  return element.dataset.ribbonGroupRowSpan === '2' ? 2 : 1
}

function withRibbonElementRowSpan(
  element: HTMLElement,
  profile: ContextualTextRibbonWidthProfile,
): ContextualTextRibbonWidthProfile {
  return {
    ...profile,
    rowSpan: getRibbonElementRowSpan(element),
  }
}

function addWidthProfiles(
  first: ContextualTextRibbonWidthProfile,
  second: ContextualTextRibbonWidthProfile,
  gap = 0,
): ContextualTextRibbonWidthProfile {
  return {
    max: first.max + second.max + gap,
    min: first.min + second.min + gap,
    preferred: first.preferred + second.preferred + gap,
  }
}

function maxWidthProfiles(
  first: ContextualTextRibbonWidthProfile,
  second: ContextualTextRibbonWidthProfile,
): ContextualTextRibbonWidthProfile {
  return {
    max: Math.max(first.max, second.max),
    min: Math.max(first.min, second.min),
    preferred: Math.max(first.preferred, second.preferred),
  }
}

function getRibbonGroupContentWidth(element: HTMLElement) {
  const children = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )

  if (children.length === 0) {
    return element.scrollWidth || element.getBoundingClientRect().width
  }

  const gap = getHorizontalGap(element)

  return Math.ceil(
    getHorizontalChrome(element)
    + children.reduce((width, child, index) => {
      const scrollWidth = child.scrollWidth
      const rectWidth = child.getBoundingClientRect().width
      const contentWidth = Math.max(scrollWidth, rectWidth, 0)

      return width + contentWidth + (index > 0 ? gap : 0)
    }, 0),
  )
}

function getRibbonGroupWidthProfile(
  element: HTMLElement,
): ContextualTextRibbonWidthProfile | null {
  if (!element.classList.contains('contextual-text-ribbon-group')) {
    return null
  }

  const min = getFiniteDataNumber(element.dataset.ribbonGroupMinWidth)
  const preferred =
    getFiniteDataNumber(element.dataset.ribbonGroupPreferredWidth)
  const max = getFiniteDataNumber(element.dataset.ribbonGroupMaxWidth)

  if (min > 0 && preferred >= min && max >= preferred) {
    if (element.dataset.ribbonGroupFit === 'content') {
      const contentWidth = clampWidth(
        getRibbonGroupContentWidth(element),
        min,
        max,
      )

      return {
        max: contentWidth,
        min: contentWidth,
        preferred: contentWidth,
        rowSpan: element.dataset.ribbonGroupRowSpan === '2' ? 2 : 1,
      }
    }

    return {
      grows: element.dataset.ribbonGroupGrows === 'true',
      max,
      min,
      preferred,
      rowSpan: element.dataset.ribbonGroupRowSpan === '2' ? 2 : 1,
    }
  }

  return null
}

function getRibbonItemWidthProfile(
  element: HTMLElement,
): ContextualTextRibbonWidthProfile {
  if (element.classList.contains('contextual-text-ribbon-tab')) {
    const labelLength = element.textContent?.trim().length ?? 0

    return withRibbonElementRowSpan(
      element,
      getFixedWidthProfile(Math.max(62, Math.ceil(labelLength * 8 + 28))),
    )
  }

  const groupProfile = getRibbonGroupWidthProfile(element)
  if (groupProfile) return groupProfile

  if (!element.classList.contains('contextual-text-ribbon-group')) {
    return withRibbonElementRowSpan(
      element,
      getFixedWidthProfile(
        element.scrollWidth || element.getBoundingClientRect().width,
      ),
    )
  }

  const children = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )

  if (children.length === 0) {
    return withRibbonElementRowSpan(
      element,
      getFixedWidthProfile(
        element.scrollWidth || element.getBoundingClientRect().width,
      ),
    )
  }

  const gap = getHorizontalGap(element)

  return withRibbonElementRowSpan(
    element,
    getFixedWidthProfile(Math.ceil(
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
    )),
  )
}

function getChildrenInlineWidthProfile(element: Element | null) {
  if (!(element instanceof HTMLElement)) return getFixedWidthProfile(0)

  const children = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )
  const gap = getHorizontalGap(element)

  return children.reduce(
    (profile, child, index) => addWidthProfiles(
      profile,
      getRibbonItemWidthProfile(child),
      index > 0 ? gap : 0,
    ),
    getFixedWidthProfile(0),
  )
}

function getActionWidthProfile(element: Element | null) {
  if (!(element instanceof HTMLElement)) return getFixedWidthProfile(0)

  const children = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )
  const gap = getHorizontalGap(element)
  const chrome = getHorizontalChrome(element)
  const style = window.getComputedStyle(element)
  const isColumn = style.flexDirection.startsWith('column')
  const childWidths = children.map((child) => (
    child.scrollWidth || child.getBoundingClientRect().width
  ))
  const contentWidth = isColumn
    ? Math.max(0, ...childWidths)
    : childWidths.reduce((sum, width, index) => (
      sum + width + (index > 0 ? gap : 0)
    ), 0)

  return getFixedWidthProfile(Math.ceil(chrome + contentWidth))
}

type ContextualTextRibbonColumnLayout = {
  columns: Array<{
    elements: Array<{
      element: HTMLElement
      rowSpan: 1 | 2
      rowStart: number
    }>
    profile: ContextualTextRibbonWidthProfile
  }>
  gap: number
  rowCount: number
}

function getColumnPackedChildrenLayout(
  element: Element | null,
): ContextualTextRibbonColumnLayout {
  if (!(element instanceof HTMLElement)) {
    return { columns: [], gap: 0, rowCount: 1 }
  }

  const children = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )

  const style = window.getComputedStyle(element)
  const gridRows = style.gridTemplateRows
    .split(/\s+/)
    .filter((track) => track.trim().length > 0)
  const rowCount = Math.max(1, gridRows.length)
  const gap = getHorizontalGap(element)

  if (children.length === 0) {
    return { columns: [], gap, rowCount }
  }

  const columns = packContextualTextRibbonColumns({
    rowCount,
    items: children.map((child, index) => ({
      id: String(index),
      payload: child,
      profile: getRibbonItemWidthProfile(child),
    })),
  }).map((column) => ({
    elements: column.items.map((item) => ({
      element: item.payload,
      rowSpan: item.rowSpan,
      rowStart: item.rowStart,
    })),
    profile: column.profile,
  }))

  return { columns, gap, rowCount }
}

function getColumnPackedChildrenInlineWidthProfile(element: Element | null) {
  if (!(element instanceof HTMLElement)) return getFixedWidthProfile(0)

  const { columns, gap, rowCount } = getColumnPackedChildrenLayout(element)

  if (rowCount <= 1) {
    return getChildrenInlineWidthProfile(element)
  }

  return columns.reduce(
    (profile, column, index) => addWidthProfiles(
      profile,
      column.profile,
      index > 0 ? gap : 0,
    ),
    getFixedWidthProfile(0),
  )
}

function clearColumnPackedGroupWidths(element: Element | null) {
  if (!(element instanceof HTMLElement)) return

  Array.from(element.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return

    child.style.removeProperty('width')
    child.style.removeProperty('max-width')
    child.style.removeProperty('--contextual-text-ribbon-column-width')
    child.style.removeProperty('grid-column')
    child.style.removeProperty('grid-row')
    child.removeAttribute('data-ribbon-column-index')
    child.removeAttribute('data-ribbon-row-start')
    child.removeAttribute('data-ribbon-row-span')
  })
}

function applyColumnPackedGroupWidths(element: Element | null) {
  if (!(element instanceof HTMLElement)) return

  const { columns, gap, rowCount } = getColumnPackedChildrenLayout(element)

  if (rowCount <= 1 || columns.length === 0) {
    clearColumnPackedGroupWidths(element)
    return
  }

  const availableWidth =
    element.clientWidth || element.getBoundingClientRect().width
  const columnWidths = getContextualTextRibbonColumnWidths({
    availableWidth,
    columns: columns.map((column) => column.profile),
    gap,
  })

  columns.forEach((column, columnIndex) => {
    const width = columnWidths[columnIndex]

    column.elements.forEach(({ element, rowSpan, rowStart }) => {
      const widthValue = `${Math.ceil(width)}px`

      element.style.setProperty(
        '--contextual-text-ribbon-column-width',
        widthValue,
      )
      element.style.width = widthValue
      element.style.maxWidth = widthValue
      element.style.gridColumn = String(columnIndex + 1)
      element.style.gridRow = rowSpan === 2
        ? `${rowStart} / span ${rowSpan}`
        : String(rowStart)
      element.dataset.ribbonColumnIndex = String(columnIndex)
      element.dataset.ribbonRowStart = String(rowStart)
      element.dataset.ribbonRowSpan = String(rowSpan)
    })
  })
}

function getRibbonWidthProfile(host: HTMLElement) {
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
  const tabsProfile = getChildrenInlineWidthProfile(tabs)
  const controlRowProfile =
    getColumnPackedChildrenInlineWidthProfile(controlRow)
  const actionProfile = getActionWidthProfile(actions)
  const controlsProfile = addWidthProfiles(
    controlRowProfile,
    actionProfile,
    actions ? controlsGap : 0,
  )
  const contentProfile = maxWidthProfiles(tabsProfile, controlsProfile)

  return {
    max: Math.ceil(contentProfile.max + shellChrome),
    min: Math.ceil(contentProfile.min + shellChrome),
    preferred: Math.ceil(contentProfile.preferred + shellChrome),
  }
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
      const controlRow = host.querySelector<HTMLElement>(
        '.contextual-text-ribbon-control-row',
      )
      const measuredMode = getContextualTextRibbonLayoutMode(
        availableWidth,
      )
      const nextMode = measuredMode
      const nextReservedHeight =
        getContextualTextRibbonReservedHeight(nextMode)
      const widthProfile = isVisible
        ? getRibbonWidthProfile(host)
        : getFixedWidthProfile(availableWidth)
      const nextActiveWidth = Math.min(
        availableWidth,
        isVisible
          ? getContextualTextRibbonActiveWidth(availableWidth, widthProfile)
          : availableWidth,
      )

      host.style.setProperty(
        '--contextual-text-ribbon-reserved-height',
        `${nextReservedHeight}px`,
      )
      host.style.setProperty(
        '--contextual-text-ribbon-active-width',
        `${Math.ceil(nextActiveWidth)}px`,
      )
      host.style.setProperty(
        '--contextual-text-ribbon-min-width',
        `${Math.ceil(widthProfile.min)}px`,
      )
      host.style.setProperty(
        '--contextual-text-ribbon-preferred-width',
        `${Math.ceil(widthProfile.preferred)}px`,
      )
      host.style.setProperty(
        '--contextual-text-ribbon-max-width',
        `${Math.ceil(widthProfile.max)}px`,
      )
      previewArea?.style.setProperty(
        '--contextual-text-ribbon-reserved-height',
        `${nextReservedHeight}px`,
      )
      applyColumnPackedGroupWidths(controlRow)
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
