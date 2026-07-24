import type { DiscTextKey } from './types'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
  RICH_TEXT_NORMAL_FONT_WEIGHT,
} from '../text/richTextWeights.ts'

export type DiscTextRenderStyle = {
  fontSizePercent: number
  fontWeight: number
  color: string
  maxLines: number
}

export type DiscTextFontFamily =
  | 'arial'
  | 'system'
  | 'trebuchet'
  | 'verdana'
  | 'georgia'
  | 'courier'

export type DiscTextContrastMode =
  | 'none'
  | 'shadow'
  | 'stroke'
  | 'strokeShadow'

export type DiscTextStyle = {
  fontFamily: DiscTextFontFamily
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  contrast: DiscTextContrastMode
  backgroundEnabled: boolean
  backgroundColor: string
  backgroundOpacity: number
  backgroundPadding: number
  borderEnabled: boolean
  borderColor: string
  borderRadius: number
}

export type DiscTextStyleSettings = Record<DiscTextKey, DiscTextStyle>
export type DiscTextStyleInput = Partial<Record<DiscTextKey, Partial<DiscTextStyle>>>
export type DiscTextStyleField = keyof DiscTextStyle
export type DiscTextStyleValue = DiscTextStyle[DiscTextStyleField]
export type DiscTextMeasurementStyle = Pick<
  DiscTextStyle,
  'bold' | 'fontFamily' | 'italic'
>

export type DiscTextFontOption = {
  value: DiscTextFontFamily
  label: string
  cssFamily: string
  canvasFamily: string
}

export type DiscTextContrastOption = {
  value: DiscTextContrastMode
  label: string
}

export type DiscTextStylePreset = {
  id: string
  label: string
  style: DiscTextStyle
}

export const DISC_TEXT_RENDER_STYLES: Record<DiscTextKey, DiscTextRenderStyle> = {
  title: { fontSizePercent: 3.6, fontWeight: 800, color: '#f9fafb', maxLines: 2 },
  subtitle: { fontSizePercent: 2.2, fontWeight: 800, color: '#f9fafb', maxLines: 1 },
  discNumber: { fontSizePercent: 1.9, fontWeight: 800, color: '#f9fafb', maxLines: 1 },
  backupDate: { fontSizePercent: 1.55, fontWeight: 700, color: '#e5e7eb', maxLines: 1 },
  appId: { fontSizePercent: 1.45, fontWeight: 700, color: '#d1d5db', maxLines: 1 },
  developer: { fontSizePercent: 1.45, fontWeight: 700, color: '#e5e7eb', maxLines: 1 },
  publisher: { fontSizePercent: 1.45, fontWeight: 700, color: '#e5e7eb', maxLines: 1 },
  installNotes: { fontSizePercent: 1.45, fontWeight: 700, color: '#f9fafb', maxLines: 2 },
  customNote: { fontSizePercent: 1.45, fontWeight: 700, color: '#f9fafb', maxLines: 2 },
  copyright: { fontSizePercent: 1.08, fontWeight: 650, color: '#d1d5db', maxLines: 3 },
}

export const DISC_TEXT_FONT_OPTIONS: readonly DiscTextFontOption[] = [
  {
    value: 'arial',
    label: 'Arial',
    cssFamily: 'Arial, sans-serif',
    canvasFamily: 'Arial, sans-serif',
  },
  {
    value: 'system',
    label: 'System UI',
    cssFamily: '"Segoe UI", Arial, sans-serif',
    canvasFamily: '"Segoe UI", Arial, sans-serif',
  },
  {
    value: 'trebuchet',
    label: 'Trebuchet MS',
    cssFamily: '"Trebuchet MS", Arial, sans-serif',
    canvasFamily: '"Trebuchet MS", Arial, sans-serif',
  },
  {
    value: 'verdana',
    label: 'Verdana',
    cssFamily: 'Verdana, Arial, sans-serif',
    canvasFamily: 'Verdana, Arial, sans-serif',
  },
  {
    value: 'georgia',
    label: 'Georgia',
    cssFamily: 'Georgia, "Times New Roman", serif',
    canvasFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    value: 'courier',
    label: 'Courier New',
    cssFamily: '"Courier New", Consolas, monospace',
    canvasFamily: '"Courier New", Consolas, monospace',
  },
]

export const DISC_TEXT_CONTRAST_OPTIONS: readonly DiscTextContrastOption[] = [
  { value: 'strokeShadow', label: 'Stroke + shadow' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'stroke', label: 'Stroke' },
  { value: 'none', label: 'None' },
]

export function areDiscTextStylesMeasurementEquivalent(
  first: DiscTextMeasurementStyle,
  second: DiscTextMeasurementStyle,
) {
  return first.bold === second.bold &&
    first.fontFamily === second.fontFamily &&
    first.italic === second.italic
}

export function areDiscTitlePresetFitStylesEquivalent(
  first: DiscTextStyle,
  second: DiscTextStyle,
) {
  if (!areDiscTextStylesMeasurementEquivalent(first, second)) return false
  if (first.contrast !== second.contrast) return false

  const firstRendersBox = first.backgroundEnabled || first.borderEnabled
  const secondRendersBox = second.backgroundEnabled || second.borderEnabled

  return firstRendersBox === secondRendersBox &&
    (!firstRendersBox || (
      first.backgroundPadding === second.backgroundPadding &&
      first.borderEnabled === second.borderEnabled
    ))
}

export const DISC_TEXT_STYLE_PRESETS: readonly DiscTextStylePreset[] = [
  {
    id: 'metallic',
    label: 'Metallic silver',
    style: {
      fontFamily: 'trebuchet',
      color: '#f8fafc',
      bold: false,
      italic: false,
      underline: false,
      contrast: 'strokeShadow',
      backgroundEnabled: true,
      backgroundColor: '#1e293b',
      backgroundOpacity: 0.54,
      backgroundPadding: 0.75,
      borderEnabled: true,
      borderColor: '#cbd5e1',
      borderRadius: 0.45,
    },
  },
  {
    id: 'futuristic',
    label: 'Futuristic cyan',
    style: {
      fontFamily: 'system',
      color: '#67e8f9',
      bold: false,
      italic: false,
      underline: false,
      contrast: 'shadow',
      backgroundEnabled: true,
      backgroundColor: '#031b2d',
      backgroundOpacity: 0.72,
      backgroundPadding: 0.85,
      borderEnabled: true,
      borderColor: '#22d3ee',
      borderRadius: 1.2,
    },
  },
  {
    id: 'horror',
    label: 'Horror crimson',
    style: {
      fontFamily: 'georgia',
      color: '#fecaca',
      bold: false,
      italic: false,
      underline: false,
      contrast: 'strokeShadow',
      backgroundEnabled: true,
      backgroundColor: '#1f0507',
      backgroundOpacity: 0.78,
      backgroundPadding: 0.9,
      borderEnabled: true,
      borderColor: '#dc2626',
      borderRadius: 0.15,
    },
  },
  {
    id: 'gritty',
    label: 'Gritty amber',
    style: {
      fontFamily: 'courier',
      color: '#fde68a',
      bold: false,
      italic: false,
      underline: false,
      contrast: 'stroke',
      backgroundEnabled: true,
      backgroundColor: '#1c1917',
      backgroundOpacity: 0.74,
      backgroundPadding: 0.7,
      borderEnabled: true,
      borderColor: '#a16207',
      borderRadius: 0.2,
    },
  },
]

const DISC_TEXT_FONT_FAMILY_VALUES = new Set<DiscTextFontFamily>(
  DISC_TEXT_FONT_OPTIONS.map((option) => option.value),
)
const DISC_TEXT_CONTRAST_VALUES = new Set<DiscTextContrastMode>(
  DISC_TEXT_CONTRAST_OPTIONS.map((option) => option.value),
)
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const DEFAULT_DISC_TEXT_FONT_FAMILY: DiscTextFontFamily = 'arial'
const DEFAULT_DISC_TEXT_CONTRAST: DiscTextContrastMode = 'strokeShadow'
const DEFAULT_DISC_TEXT_BACKGROUND_COLOR = '#111827'
const DEFAULT_DISC_TEXT_BACKGROUND_OPACITY = 0.68
const DEFAULT_DISC_TEXT_BACKGROUND_PADDING = 0.8
const DEFAULT_DISC_TEXT_BORDER_COLOR = '#f9fafb'
const DEFAULT_DISC_TEXT_BORDER_RADIUS = 0.6
const NORMAL_DISC_TEXT_FONT_WEIGHT = RICH_TEXT_NORMAL_FONT_WEIGHT
const BOLD_DISC_TEXT_FONT_WEIGHT = RICH_TEXT_BOLD_FONT_WEIGHT

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback

  const trimmedValue = value.trim()
  return HEX_COLOR_PATTERN.test(trimmedValue) ? trimmedValue.toLowerCase() : fallback
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback

  return Math.min(Math.max(value, min), max)
}

export function getDiscTextFontFamilyCss(fontFamily: DiscTextFontFamily) {
  return DISC_TEXT_FONT_OPTIONS.find((option) => option.value === fontFamily)?.cssFamily
    ?? DISC_TEXT_FONT_OPTIONS[0].cssFamily
}

export function getDiscTextFontFamilyCanvas(fontFamily: DiscTextFontFamily) {
  return DISC_TEXT_FONT_OPTIONS.find((option) => option.value === fontFamily)?.canvasFamily
    ?? DISC_TEXT_FONT_OPTIONS[0].canvasFamily
}

export function createDefaultDiscTextStyle(key: DiscTextKey): DiscTextStyle {
  return {
    fontFamily: DEFAULT_DISC_TEXT_FONT_FAMILY,
    color: DISC_TEXT_RENDER_STYLES[key].color,
    bold: false,
    italic: false,
    underline: false,
    contrast: DEFAULT_DISC_TEXT_CONTRAST,
    backgroundEnabled: false,
    backgroundColor: DEFAULT_DISC_TEXT_BACKGROUND_COLOR,
    backgroundOpacity: DEFAULT_DISC_TEXT_BACKGROUND_OPACITY,
    backgroundPadding: DEFAULT_DISC_TEXT_BACKGROUND_PADDING,
    borderEnabled: false,
    borderColor: DEFAULT_DISC_TEXT_BORDER_COLOR,
    borderRadius: DEFAULT_DISC_TEXT_BORDER_RADIUS,
  }
}

export function createDefaultDiscTextStyles(): DiscTextStyleSettings {
  return Object.keys(DISC_TEXT_RENDER_STYLES).reduce((styles, key) => {
    const discTextKey = key as DiscTextKey
    styles[discTextKey] = createDefaultDiscTextStyle(discTextKey)
    return styles
  }, {} as DiscTextStyleSettings)
}

export function normalizeDiscTextStyle(
  key: DiscTextKey,
  style?: Partial<DiscTextStyle>,
): DiscTextStyle {
  const defaults = createDefaultDiscTextStyle(key)
  const fontFamily = style?.fontFamily
  const contrast = style?.contrast

  return {
    fontFamily:
      typeof fontFamily === 'string' && DISC_TEXT_FONT_FAMILY_VALUES.has(fontFamily)
        ? fontFamily
        : defaults.fontFamily,
    color: normalizeHexColor(style?.color, defaults.color),
    bold: normalizeBoolean(style?.bold, defaults.bold),
    italic: normalizeBoolean(style?.italic, defaults.italic),
    underline: normalizeBoolean(style?.underline, defaults.underline),
    contrast:
      typeof contrast === 'string' && DISC_TEXT_CONTRAST_VALUES.has(contrast)
        ? contrast
        : defaults.contrast,
    backgroundEnabled: normalizeBoolean(
      style?.backgroundEnabled,
      defaults.backgroundEnabled,
    ),
    backgroundColor: normalizeHexColor(style?.backgroundColor, defaults.backgroundColor),
    backgroundOpacity: normalizeNumber(
      style?.backgroundOpacity,
      defaults.backgroundOpacity,
      0,
      1,
    ),
    backgroundPadding: normalizeNumber(
      style?.backgroundPadding,
      defaults.backgroundPadding,
      0,
      4,
    ),
    borderEnabled: normalizeBoolean(style?.borderEnabled, defaults.borderEnabled),
    borderColor: normalizeHexColor(style?.borderColor, defaults.borderColor),
    borderRadius: normalizeNumber(
      style?.borderRadius,
      defaults.borderRadius,
      0,
      4,
    ),
  }
}

export function normalizeDiscTextStyles(styles?: DiscTextStyleInput): DiscTextStyleSettings {
  return Object.keys(DISC_TEXT_RENDER_STYLES).reduce((normalizedStyles, key) => {
    const discTextKey = key as DiscTextKey
    normalizedStyles[discTextKey] = normalizeDiscTextStyle(
      discTextKey,
      styles?.[discTextKey],
    )
    return normalizedStyles
  }, {} as DiscTextStyleSettings)
}

export function updateDiscTextStyleField(
  styles: DiscTextStyleSettings,
  key: DiscTextKey,
  field: DiscTextStyleField,
  value: DiscTextStyleValue,
): DiscTextStyleSettings {
  return {
    ...styles,
    [key]: normalizeDiscTextStyle(key, {
      ...styles[key],
      [field]: value,
    }),
  }
}

export function resetDiscTextStyle(
  styles: DiscTextStyleSettings,
  key: DiscTextKey,
): DiscTextStyleSettings {
  return {
    ...styles,
    [key]: createDefaultDiscTextStyle(key),
  }
}

export function applyDiscTextStylePreset(
  styles: DiscTextStyleSettings,
  key: DiscTextKey,
  presetId: string,
): DiscTextStyleSettings {
  const preset = DISC_TEXT_STYLE_PRESETS.find((candidate) => candidate.id === presetId)

  if (!preset) {
    return styles
  }

  return {
    ...styles,
    [key]: normalizeDiscTextStyle(key, {
      ...styles[key],
      ...preset.style,
    }),
  }
}

export function getResolvedDiscTextRenderStyle(
  key: DiscTextKey,
  styles?: DiscTextStyleInput,
) {
  const baseRenderStyle = DISC_TEXT_RENDER_STYLES[key]
  const style = normalizeDiscTextStyle(key, styles?.[key])

  return {
    ...baseRenderStyle,
    ...style,
    fontWeight: getDiscTextEffectiveFontWeight(baseRenderStyle.fontWeight, style),
    fontFamilyCss: getDiscTextFontFamilyCss(style.fontFamily),
    fontFamilyCanvas: getDiscTextFontFamilyCanvas(style.fontFamily),
  }
}

export function getDiscTextEffectiveFontWeight(
  baseFontWeight: number,
  style: Pick<DiscTextStyle, 'bold'>,
) {
  if (!style.bold) {
    return Math.min(baseFontWeight, NORMAL_DISC_TEXT_FONT_WEIGHT)
  }

  return BOLD_DISC_TEXT_FONT_WEIGHT
}

export function getDiscTextFontStyle(style: Pick<DiscTextStyle, 'italic'>) {
  return style.italic ? 'italic' : 'normal'
}

export function getDiscTextDecoration(style: Pick<DiscTextStyle, 'underline'>) {
  return style.underline ? 'underline' : 'none'
}
