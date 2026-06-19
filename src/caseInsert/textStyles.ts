import {
  DISC_TEXT_CONTRAST_OPTIONS,
  DISC_TEXT_FONT_OPTIONS,
  DISC_TEXT_RENDER_STYLES,
  DISC_TEXT_STYLE_PRESETS,
  createDefaultDiscTextStyle,
  getDiscTextDecoration,
  getDiscTextEffectiveFontWeight,
  getDiscTextFontFamilyCanvas,
  getDiscTextFontFamilyCss,
  getDiscTextFontStyle,
  normalizeDiscTextStyle,
  type DiscTextContrastMode,
  type DiscTextFontFamily,
  type DiscTextStyle,
  type DiscTextStyleField,
  type DiscTextStyleValue,
} from '../discText/styles.ts'
import type {
  ProjectCaseInsertTextSource,
} from '../project/projectTypes.ts'
import {
  getCaseInsertTextBlockDiscKey,
} from './textContent.ts'

export type CaseInsertTextStyle = DiscTextStyle
export type CaseInsertTextStyleField = DiscTextStyleField
export type CaseInsertTextStyleValue = DiscTextStyleValue
export type CaseInsertTextFontFamily = DiscTextFontFamily
export type CaseInsertTextContrastMode = DiscTextContrastMode

export type CaseInsertTextStyleRole =
  | 'title'
  | 'subtitle'
  | 'discNumber'
  | 'backupDate'
  | 'appId'
  | 'developer'
  | 'publisher'
  | 'installNotes'
  | 'customNote'
  | 'description'
  | 'features'
  | 'requirements'
  | 'legal'
  | 'spine'

export const CASE_INSERT_TEXT_FONT_OPTIONS = DISC_TEXT_FONT_OPTIONS
export const CASE_INSERT_TEXT_CONTRAST_OPTIONS = DISC_TEXT_CONTRAST_OPTIONS
export const CASE_INSERT_TEXT_STYLE_PRESETS = DISC_TEXT_STYLE_PRESETS
export const getCaseInsertTextDecoration = getDiscTextDecoration
export const getCaseInsertTextEffectiveFontWeight = getDiscTextEffectiveFontWeight
export const getCaseInsertTextFontFamilyCss = getDiscTextFontFamilyCss
export const getCaseInsertTextFontFamilyCanvas = getDiscTextFontFamilyCanvas
export const getCaseInsertTextFontStyle = getDiscTextFontStyle

const ROLE_TO_DISC_TEXT_KEY = {
  title: 'title',
  subtitle: 'subtitle',
  discNumber: 'discNumber',
  backupDate: 'backupDate',
  appId: 'appId',
  developer: 'developer',
  publisher: 'publisher',
  installNotes: 'installNotes',
  customNote: 'customNote',
  description: 'installNotes',
  features: 'customNote',
  requirements: 'installNotes',
  legal: 'copyright',
  spine: 'title',
} as const

const ROLE_STYLE_OVERRIDES: Partial<
  Record<CaseInsertTextStyleRole, Partial<CaseInsertTextStyle>>
> = {
  title: {
    bold: false,
    color: '#ffffff',
    contrast: 'strokeShadow',
    backgroundEnabled: false,
  },
  subtitle: {
    color: '#f8fafc',
    contrast: 'strokeShadow',
    backgroundEnabled: false,
  },
  discNumber: {
    color: '#f8fafc',
    contrast: 'strokeShadow',
    backgroundEnabled: false,
  },
  backupDate: {
    color: '#e5e7eb',
    contrast: 'shadow',
    backgroundEnabled: false,
  },
  appId: {
    color: '#d1d5db',
    contrast: 'shadow',
    backgroundEnabled: false,
  },
  developer: {
    color: '#e5e7eb',
    contrast: 'shadow',
    backgroundEnabled: false,
  },
  publisher: {
    color: '#e5e7eb',
    contrast: 'shadow',
    backgroundEnabled: false,
  },
  installNotes: {
    color: '#f8fafc',
    contrast: 'shadow',
    backgroundEnabled: false,
  },
  customNote: {
    color: '#ffffff',
    contrast: 'strokeShadow',
    backgroundEnabled: false,
  },
  description: {
    color: '#f8fafc',
    contrast: 'shadow',
    backgroundEnabled: true,
    backgroundColor: '#0f172a',
    backgroundOpacity: 0.58,
    backgroundPadding: 0.8,
    borderEnabled: true,
    borderColor: '#ffffff',
    borderRadius: 0.45,
  },
  features: {
    color: '#f8fafc',
    contrast: 'shadow',
    backgroundEnabled: true,
    backgroundColor: '#0f172a',
    backgroundOpacity: 0.58,
    backgroundPadding: 0.8,
    borderEnabled: true,
    borderColor: '#ffffff',
    borderRadius: 0.45,
  },
  requirements: {
    color: '#f8fafc',
    contrast: 'shadow',
    backgroundEnabled: true,
    backgroundColor: '#0f172a',
    backgroundOpacity: 0.68,
    backgroundPadding: 0.78,
    borderEnabled: true,
    borderColor: '#ffffff',
    borderRadius: 0.45,
  },
  legal: {
    color: '#d1d5db',
    contrast: 'shadow',
    backgroundEnabled: true,
    backgroundColor: '#0f172a',
    backgroundOpacity: 0.68,
    backgroundPadding: 0.65,
    borderEnabled: true,
    borderColor: '#ffffff',
    borderRadius: 0.35,
  },
  spine: {
    bold: false,
    color: '#ffffff',
    contrast: 'strokeShadow',
    backgroundEnabled: false,
  },
}

export function getCaseInsertTextBlockStyleRole(textBlock: { id: string }):
CaseInsertTextStyleRole {
  const discKey = getCaseInsertTextBlockDiscKey(textBlock)

  if (discKey === 'title') return 'title'
  if (discKey === 'subtitle') return 'subtitle'
  if (discKey === 'discNumber') return 'discNumber'
  if (discKey === 'backupDate') return 'backupDate'
  if (discKey === 'appId') return 'appId'
  if (discKey === 'developer') return 'developer'
  if (discKey === 'publisher') return 'publisher'
  if (discKey === 'installNotes') return 'installNotes'
  if (discKey === 'customNote') return 'customNote'
  if (discKey === 'copyright') return 'legal'
  if (textBlock.id.includes('minimum') || textBlock.id.includes('recommended')) {
    return 'requirements'
  }
  if (textBlock.id.includes('legal') || textBlock.id.includes('copyright')) {
    return 'legal'
  }
  if (textBlock.id.includes('description')) return 'description'
  if (textBlock.id.includes('spine')) return 'spine'

  return 'title'
}

export function getCaseInsertTextListStyleRole(textList: { id: string }):
CaseInsertTextStyleRole {
  if (textList.id.includes('feature')) return 'features'

  return 'features'
}

export function createDefaultCaseInsertTextStyle(
  role: CaseInsertTextStyleRole,
): CaseInsertTextStyle {
  const discTextKey = ROLE_TO_DISC_TEXT_KEY[role]

  return {
    ...createDefaultDiscTextStyle(discTextKey),
    ...ROLE_STYLE_OVERRIDES[role],
  }
}

export function normalizeCaseInsertTextStyle(
  role: CaseInsertTextStyleRole,
  style?: Partial<CaseInsertTextStyle>,
): CaseInsertTextStyle {
  return normalizeDiscTextStyle(ROLE_TO_DISC_TEXT_KEY[role], {
    ...createDefaultCaseInsertTextStyle(role),
    ...(style ?? {}),
  })
}

export function updateCaseInsertTextStyleField(
  role: CaseInsertTextStyleRole,
  style: CaseInsertTextStyle,
  field: CaseInsertTextStyleField,
  value: CaseInsertTextStyleValue,
): CaseInsertTextStyle {
  return normalizeCaseInsertTextStyle(role, {
    ...style,
    [field]: value,
  })
}

export function resetCaseInsertTextStyle(
  role: CaseInsertTextStyleRole,
): CaseInsertTextStyle {
  return createDefaultCaseInsertTextStyle(role)
}

export function applyCaseInsertTextStylePreset(
  role: CaseInsertTextStyleRole,
  style: CaseInsertTextStyle,
  presetId: string,
): CaseInsertTextStyle {
  const preset = CASE_INSERT_TEXT_STYLE_PRESETS.find(
    (candidate) => candidate.id === presetId,
  )

  return preset
    ? normalizeCaseInsertTextStyle(role, { ...style, ...preset.style })
    : normalizeCaseInsertTextStyle(role, style)
}

export function getCaseInsertTextSourceLabel(
  source: ProjectCaseInsertTextSource,
) {
  switch (source) {
    case 'steam':
      return 'Using Steam import text'
    case 'metadata':
      return 'Using Game metadata/default'
    case 'manual':
    default:
      return 'Manual text'
  }
}

export function getCaseInsertTextStyleRoleMaxLines(
  role: CaseInsertTextStyleRole,
) {
  return DISC_TEXT_RENDER_STYLES[ROLE_TO_DISC_TEXT_KEY[role]].maxLines
}

export function getCaseInsertTextStyleRoleBaseFontWeight(
  role: CaseInsertTextStyleRole,
) {
  return DISC_TEXT_RENDER_STYLES[ROLE_TO_DISC_TEXT_KEY[role]].fontWeight
}

export function hexToRgba(hexColor: string, opacity: number) {
  const normalizedHex = hexColor.trim().replace(/^#/, '')

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return `rgba(15, 23, 42, ${Math.min(Math.max(opacity, 0), 1)})`
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16)
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16)
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${Math.min(Math.max(opacity, 0), 1)})`
}
