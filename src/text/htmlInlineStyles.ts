import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
  RICH_TEXT_NORMAL_FONT_WEIGHT,
} from './richTextWeights.ts'

export type HtmlInlineStyleRun = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
  backgroundColor?: string
  fontFamily?: string
  fontSizePt?: number
  fontSizePx?: number
  fontWeight?: number
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
}

const FONT_SIZE_MIN_PT = 1
const FONT_SIZE_MAX_PT = 96
const FONT_SIZE_MIN_PX = 6
const FONT_SIZE_MAX_PX = 144
const CSS_DECLARATION_SEPARATOR = /\s*;\s*/
const CSS_PROPERTY_SEPARATOR = /\s*:\s*/

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeColor(value: string | undefined) {
  if (!value) return undefined

  const trimmedValue = value.trim().toLowerCase()

  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?$/.test(trimmedValue)) {
    return trimmedValue
  }

  if (
    /^rgba?\(\s*(?:\d{1,3}%?\s*,\s*){2}\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(
      trimmedValue,
    )
  ) {
    return trimmedValue
  }

  if (/^[a-z]+$/.test(trimmedValue) && trimmedValue !== 'url') {
    return trimmedValue
  }

  return undefined
}

function normalizeFontFamily(value: string | undefined) {
  if (!value) return undefined

  const families = value
    .split(',')
    .map((family) => family.trim().replace(/^['"]|['"]$/g, ''))
    .filter((family) => /^[a-zA-Z0-9 _-]{1,48}$/.test(family))

  return families.length > 0 ? families.join(', ') : undefined
}

function normalizeFontSize(value: string | undefined) {
  if (!value) return undefined

  const match = value.trim().match(/^(\d+(?:\.\d+)?)(pt|px)$/i)

  if (!match) return undefined

  const numericValue = Number.parseFloat(match[1])
  const unit = match[2].toLowerCase()

  if (unit === 'pt') {
    return {
      fontSizePt: clampNumber(
        numericValue,
        FONT_SIZE_MIN_PT,
        FONT_SIZE_MAX_PT,
      ),
    }
  }

  return clampNumber(
    numericValue,
    FONT_SIZE_MIN_PX,
    FONT_SIZE_MAX_PX,
  )
}

function normalizeFontWeight(value: string | undefined) {
  if (!value) return undefined

  const trimmedValue = value.trim().toLowerCase()

  if (trimmedValue === 'normal') return RICH_TEXT_NORMAL_FONT_WEIGHT
  if (trimmedValue === 'bold') return RICH_TEXT_BOLD_FONT_WEIGHT

  const numericValue = Number.parseInt(trimmedValue, 10)

  if (!Number.isFinite(numericValue)) return undefined

  return clampNumber(Math.round(numericValue / 100) * 100, 100, 900)
}

function normalizeFontStyle(value: string | undefined) {
  const normalizedValue = value?.trim().toLowerCase()

  if (normalizedValue === 'italic') return 'italic'
  if (normalizedValue === 'normal') return 'normal'

  return undefined
}

function normalizeTextDecoration(value: string | undefined) {
  if (!value) return undefined

  const normalizedValue = value.trim().toLowerCase()

  if (normalizedValue === 'underline') return 'underline'
  if (normalizedValue === 'none') return 'none'

  return undefined
}

export function parseSafeInlineStyle(style: string | undefined): HtmlInlineStyleRun {
  const runStyle: HtmlInlineStyleRun = {}

  if (!style) return runStyle

  for (const declaration of style.split(CSS_DECLARATION_SEPARATOR)) {
    if (!declaration.trim()) continue

    const [rawProperty, rawValue] = declaration.split(CSS_PROPERTY_SEPARATOR, 2)
    const property = rawProperty?.trim().toLowerCase()
    const value = rawValue?.trim()

    if (!property || !value || /url\s*\(/i.test(value)) continue

    if (property === 'color') {
      runStyle.color = normalizeColor(value)
    } else if (property === 'background-color') {
      runStyle.backgroundColor = normalizeColor(value)
    } else if (property === 'font-family') {
      runStyle.fontFamily = normalizeFontFamily(value)
    } else if (property === 'font-size') {
      const fontSize = normalizeFontSize(value)
      if (typeof fontSize === 'number') {
        runStyle.fontSizePx = fontSize
      } else if (fontSize?.fontSizePt) {
        runStyle.fontSizePt = fontSize.fontSizePt
      }
    } else if (property === 'font-weight') {
      const fontWeight = normalizeFontWeight(value)
      if (fontWeight) {
        runStyle.fontWeight = fontWeight
        runStyle.bold = fontWeight >= RICH_TEXT_BOLD_FONT_WEIGHT || undefined
      }
    } else if (property === 'font-style') {
      const fontStyle = normalizeFontStyle(value)
      if (fontStyle) {
        runStyle.fontStyle = fontStyle
        runStyle.italic = fontStyle === 'italic' || undefined
      }
    } else if (property === 'text-decoration') {
      const textDecoration = normalizeTextDecoration(value)
      if (textDecoration) {
        runStyle.textDecoration = textDecoration
        runStyle.underline = textDecoration === 'underline' || undefined
      }
    }
  }

  return Object.fromEntries(
    Object.entries(runStyle).filter(([, value]) => value !== undefined),
  ) as HtmlInlineStyleRun
}

export function getSafeStyleDeclarations(run: HtmlInlineStyleRun) {
  const declarations = [
    run.color ? `color:${run.color}` : '',
    run.backgroundColor ? `background-color:${run.backgroundColor}` : '',
    run.fontFamily ? `font-family:${run.fontFamily}` : '',
    run.fontSizePt ? `font-size:${run.fontSizePt}pt` : '',
    run.fontSizePx ? `font-size:${run.fontSizePx}px` : '',
    run.fontWeight && !run.bold ? `font-weight:${run.fontWeight}` : '',
    run.fontStyle && !run.italic ? `font-style:${run.fontStyle}` : '',
    run.textDecoration === 'underline' && !run.underline
      ? 'text-decoration:underline'
      : run.textDecoration === 'none' && !run.underline
        ? 'text-decoration:none'
      : '',
  ].filter(Boolean)

  return declarations
}
