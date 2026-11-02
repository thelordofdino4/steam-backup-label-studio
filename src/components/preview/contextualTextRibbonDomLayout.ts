import { getContextualTextRibbonContrastMinWidth } from './contextualTextRibbonSelectSizing'
import { getContextualRibbonInnerGroupWidths, ribbonInnerGroupProfile } from './contextualTextRibbonInnerGroups'
import {
  getContextualTextRibbonColumnWidths,
  getContextualTextRibbonColumnViewportWidth,
  packContextualTextRibbonColumns,
  type ContextualTextRibbonWidthProfile,
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

export function getFixedWidthProfile(width: number): ContextualTextRibbonWidthProfile {
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

// Only horizontal utility subgroups use this allocation. Artistic rows and
// intrinsic text/button groups retain their existing layout owners.
function getUtilityInnerGroups(element: HTMLElement) {
  const body = element.querySelector<HTMLElement>(':scope > .contextual-text-ribbon-group-body')
  if (!body || !['position', 'layout'].includes(element.dataset.ribbonGroup ?? '')) return []
  return Array.from(body.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
    .map(group => {
      if (group.dataset.ribbonInnerAllocated) {
        group.style.removeProperty('width')
        group.style.removeProperty('max-width')
        group.style.removeProperty('flex')
      }
      const style = window.getComputedStyle(group)
      const margin = (Number.parseFloat(style.marginLeft) || 0) + (Number.parseFloat(style.marginRight) || 0)
      if (!group.classList.contains('contextual-text-ribbon-control-stack')) {
        return { group, margin, profile: ribbonInnerGroupProfile(Math.max(group.scrollWidth, group.getBoundingClientRect().width)) }
      }
      const options = group.classList.contains('contextual-text-ribbon-control-stack--utility-layout-options')
      if (options) {
        // Preserve the established option-stack floor; a modest useful cap
        // lets select fields expand without separating them from their labels.
        const min = group.classList.contains('contextual-text-ribbon-control-stack--utility-curved-layout-options') ? 160 : 154
        return { group, margin, profile: ribbonInnerGroupProfile(min, 220, min) }
      }
      const rows = Array.from(group.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
      const profiles = rows.map(row => {
        const children = Array.from(row.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
        const slider = row.querySelector<HTMLInputElement>('input[type="range"]')
        const fixed = children.filter(child => child !== slider).reduce((width, child) =>
          width + child.getBoundingClientRect().width, 0)
        const tracks = slider ? window.getComputedStyle(row).gridTemplateColumns.split(/\s+/).length : children.length
        const chrome = getHorizontalChrome(row) + getHorizontalGap(row) * Math.max(0, tracks - 1)
        const sliderStyle = slider ? window.getComputedStyle(slider) : null
        const min = sliderStyle ? Number.parseFloat(sliderStyle.minWidth) : 0
        const max = sliderStyle ? Number.parseFloat(sliderStyle.maxWidth) : 0
        return ribbonInnerGroupProfile(fixed + chrome + min, fixed + chrome + max)
      })
      const chrome = getHorizontalChrome(group)
      return { group, margin, profile: ribbonInnerGroupProfile(
        chrome + Math.max(0, ...profiles.map(profile => profile.min)),
        chrome + Math.max(0, ...profiles.map(profile => profile.max)),
      ) }
    })
}

function getUtilityRequiredCardWidth(element: HTMLElement, bound: 'min' | 'max' = 'min') {
  const groups = getUtilityInnerGroups(element)
  if (!groups.length) return 0
  const body = element.querySelector<HTMLElement>(':scope > .contextual-text-ribbon-group-body')
  const header = element.querySelector<HTMLElement>(':scope > .contextual-text-ribbon-group-header')
  return getHorizontalChrome(element) + (header?.getBoundingClientRect().width ?? 0)
    + getHorizontalGap(element) + getHorizontalChrome(body)
    + groups.reduce((width, { profile, margin }) => width + profile[bound] + margin, 0)
    + getHorizontalGap(body) * Math.max(0, groups.length - 1)
}

function applyUtilityInnerGroups(element: HTMLElement, body: HTMLElement, availableWidth: number) {
  const groups = getUtilityInnerGroups(element)
  if (!groups.length) return
  const widths = getContextualRibbonInnerGroupWidths(groups.map(({ profile }) => profile),
    availableWidth - getHorizontalChrome(body) - groups.reduce((sum, { margin }) => sum + margin, 0), getHorizontalGap(body))
  groups.forEach(({ group, profile }, index) => {
    group.style.width = `${widths[index]}px`
    group.style.maxWidth = `${widths[index]}px`
    group.style.flex = `0 0 ${widths[index]}px`
    group.dataset.ribbonInnerAllocated = 'true'
    group.dataset.ribbonInnerMin = String(profile.min)
    group.dataset.ribbonInnerMax = String(profile.max)
    group.dataset.ribbonInnerPreferred = String(profile.preferred)
    group.dataset.ribbonInnerGrowthWeight = String(profile.growthWeight)
    group.dataset.ribbonInnerGrowthPriority = String(profile.growthPriority)
  })
}

function getRibbonDeclaredWidthProfile(
  element: HTMLElement,
): ContextualTextRibbonWidthProfile | null {
  const requiredMin = Math.max(getUtilityRequiredCardWidth(element),
    getContextualTextRibbonContrastMinWidth(element))
  const min = Math.max(requiredMin, getFiniteDataNumber(element.dataset.ribbonGroupMinWidth))
  const preferred = Math.max(min,
    getFiniteDataNumber(element.dataset.ribbonGroupPreferredWidth))
  const max = Math.max(preferred, getUtilityRequiredCardWidth(element, 'max'),
    getFiniteDataNumber(element.dataset.ribbonGroupMaxWidth))

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
        rowSpan: getRibbonElementRowSpan(element),
      }
    }

    return {
      grows: element.dataset.ribbonGroupGrows === 'true',
      max,
      min,
      preferred,
      rowSpan: getRibbonElementRowSpan(element),
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

  const declaredProfile = getRibbonDeclaredWidthProfile(element)
  if (declaredProfile) return declaredProfile

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

function applyRibbonControlWidthCap(element: HTMLElement, cardWidth: number) {
  if (element.dataset.ribbonFillRow === 'true') return
  const max = Math.max(getUtilityRequiredCardWidth(element, 'max'),
    getContextualTextRibbonContrastMinWidth(element),
    getFiniteDataNumber(element.dataset.ribbonGroupMaxWidth))
  const body = element.querySelector<HTMLElement>(':scope > .contextual-text-ribbon-group-body')
  const header = element.querySelector<HTMLElement>(':scope > .contextual-text-ribbon-group-header')
  if (!body || max <= 0) return

  const verticalHeader = window.getComputedStyle(element).display === 'grid'
  const headerWidth = verticalHeader ? 0 : (header?.getBoundingClientRect().width ?? 0)
  const chrome = getHorizontalChrome(element) + headerWidth
    + (verticalHeader ? 0 : getHorizontalGap(element))
  const bodyWidth = Math.max(0, Math.min(cardWidth, max) - chrome)
  body.style.width = `${bodyWidth}px`
  body.style.maxWidth = `${bodyWidth}px`
  body.style.marginInline = 'auto'
  if (!verticalHeader) body.style.justifyContent = 'center'
  applyUtilityInnerGroups(element, body, bodyWidth)
  if (verticalHeader && header) {
    header.style.width = '100%'
    header.style.maxWidth = `${Math.max(0, max - getHorizontalChrome(element))}px`
    header.style.justifySelf = 'center'
  }
}

export function applyColumnPackedGroupWidths(element: Element | null) {
  if (!(element instanceof HTMLElement)) return

  const { columns, gap, rowCount } = getColumnPackedChildrenLayout(element)

  if (rowCount <= 1 || columns.length === 0) {
    clearColumnPackedGroupWidths(element)
    return
  }

  const controls = element.parentElement
  const actions = controls?.querySelector<HTMLElement>('.contextual-text-ribbon-actions')
  const availableWidth = controls
    ? Math.max(0, controls.clientWidth - getHorizontalChrome(controls)
      - (actions?.getBoundingClientRect().width ?? 0) - (actions ? getHorizontalGap(controls) : 0))
    : element.clientWidth
  const input = { availableWidth, columns: columns.map(column => column.profile), gap }
  const viewportWidth = getContextualTextRibbonColumnViewportWidth(input)
  element.style.width = `${viewportWidth}px`
  element.style.maxWidth = `${viewportWidth}px`
  element.style.scrollSnapType = 'x mandatory'
  element.style.scrollPaddingInline = '0'
  const columnWidths = getContextualTextRibbonColumnWidths(input)

  columns.forEach((column, columnIndex) => {
    const width = columnWidths[columnIndex]

    column.elements.forEach(({ element, rowSpan, rowStart }) => {
      const fillsRow = element.dataset.ribbonFillRow === 'true'
      const widthValue = fillsRow ? '100%' : `${width}px`

      element.style.setProperty(
        '--contextual-text-ribbon-column-width',
        widthValue,
      )
      element.style.width = widthValue
      element.style.maxWidth = widthValue
      element.style.scrollSnapAlign = 'start'
      element.style.gridColumn = fillsRow ? '1 / -1' : String(columnIndex + 1)
      element.style.gridRow = rowSpan === 2
        ? `${rowStart} / span ${rowSpan}`
        : String(rowStart)
      element.dataset.ribbonColumnIndex = String(columnIndex)
      element.dataset.ribbonRowStart = String(rowStart)
      element.dataset.ribbonRowSpan = String(rowSpan)
      if (!fillsRow) applyRibbonControlWidthCap(element, width)
    })
  })
}

export function getRibbonWidthProfile(host: HTMLElement) {
  // React can reuse a card/header node across tabs. Drop only our measured
  // overrides before reading the new semantic card's intrinsic dimensions.
  host.querySelectorAll<HTMLElement>('.contextual-text-ribbon-group-header').forEach(header => {
    header.style.removeProperty('width')
    header.style.removeProperty('max-width')
    header.style.removeProperty('justify-self')
  })
  host.querySelectorAll<HTMLElement>('[data-ribbon-inner-allocated]').forEach(group => {
    group.style.removeProperty('width')
    group.style.removeProperty('max-width')
    group.style.removeProperty('flex')
    for (const key of ['ribbonInnerAllocated', 'ribbonInnerMin', 'ribbonInnerMax', 'ribbonInnerPreferred', 'ribbonInnerGrowthWeight', 'ribbonInnerGrowthPriority']) delete group.dataset[key]
  })
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
