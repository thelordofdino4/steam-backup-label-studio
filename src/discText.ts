import {
  createDefaultDiscTextLayoutForTemplate,
  getDefaultCopyrightCurvedLayoutForTemplate,
  getDefaultCopyrightStraightLayoutForTemplate,
} from './layout/discTemplateLayoutDefaults.ts'
import type { DiscTemplate } from './types/template'

export type SteamLogoPlacement = 'top' | 'bottom' | 'none'

export type DiscTextKey =
  | 'title'
  | 'subtitle'
  | 'discNumber'
  | 'backupDate'
  | 'appId'
  | 'developer'
  | 'publisher'
  | 'installNotes'
  | 'customNote'
  | 'copyright'

export type DiscTextSettings = Record<DiscTextKey, boolean>

export type DiscTextValues = {
  subtitle: string
  discNumber: string
  backupDate: string
  appId: string
  developer: string
  publisher: string
  installNotes: string
  customNote: string
  copyright: string
}

export type DiscTextAlignment = 'left' | 'center' | 'right'
export type DiscTextMode = 'straight' | 'curved'
export type DiscTextArcSide = 'top' | 'bottom'

export type DiscTextLayout = {
  x: number
  y: number
  width: number
  scale: number
  align: DiscTextAlignment
  mode: DiscTextMode
  arcDegrees: number
  arcSide: DiscTextArcSide
  avoidVisualElements: boolean
}

export type DiscTextLayoutSettings = Record<DiscTextKey, DiscTextLayout>
export type DiscTextLayoutNumericField = 'x' | 'y' | 'width' | 'scale' | 'arcDegrees'

type DiscTextLayoutPoint = {
  x: number
  y: number
}

export const CURVED_COPYRIGHT_LAYOUT_X_MIN = -60
export const CURVED_COPYRIGHT_LAYOUT_X_MAX = 60
export const CURVED_COPYRIGHT_LAYOUT_Y_MIN = -8
export const CURVED_COPYRIGHT_LAYOUT_Y_MAX = 20

export const DISC_TEXT_KEYS: DiscTextKey[] = [
  'title',
  'subtitle',
  'discNumber',
  'backupDate',
  'appId',
  'developer',
  'publisher',
  'installNotes',
  'customNote',
  'copyright',
]

export const DEFAULT_DISC_TEXT_SETTINGS: DiscTextSettings = {
  title: false,
  subtitle: false,
  discNumber: false,
  backupDate: false,
  appId: false,
  developer: false,
  publisher: false,
  installNotes: false,
  customNote: false,
  copyright: false,
}

export const DISC_TEXT_WIDTH_MIN = 20
export const DISC_TEXT_WIDTH_MAX = 90

export const DEFAULT_DISC_TEXT_WIDTHS: Record<DiscTextKey, number> = {
  title: 58,
  subtitle: 54,
  discNumber: 42,
  backupDate: 48,
  appId: 48,
  developer: 48,
  publisher: 48,
  installNotes: 58,
  customNote: 58,
  copyright: 68,
}

export function normalizeDiscTextWidth(width: number | undefined, fallback: number) {
  if (typeof width !== 'number' || !Number.isFinite(width)) {
    return fallback
  }

  return Math.min(Math.max(width, DISC_TEXT_WIDTH_MIN), DISC_TEXT_WIDTH_MAX)
}

export function createDefaultDiscTextValues(appId?: number): DiscTextValues {
  return {
    subtitle: '',
    discNumber: 'Disc 1',
    backupDate: new Date().toISOString().slice(0, 10),
    appId: appId ? String(appId) : '',
    developer: '',
    publisher: '',
    installNotes: '',
    customNote: '',
    copyright: '',
  }
}

export function getDefaultCopyrightStraightLayout(
  placement: SteamLogoPlacement,
  template?: DiscTemplate,
): DiscTextLayout {
  if (template) {
    return getDefaultCopyrightStraightLayoutForTemplate(
      template,
      placement,
      DEFAULT_DISC_TEXT_WIDTHS,
    )
  }

  const hasBottomBanner = placement === 'bottom'
  return { x: 0, y: hasBottomBanner ? 16 : 86, width: DEFAULT_DISC_TEXT_WIDTHS.copyright, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: hasBottomBanner ? 'top' : 'bottom', avoidVisualElements: false }
}

export function getDefaultCopyrightCurvedLayout(
  placement: SteamLogoPlacement,
  template?: DiscTemplate,
): DiscTextLayout {
  if (template) {
    return getDefaultCopyrightCurvedLayoutForTemplate(
      template,
      placement,
      DEFAULT_DISC_TEXT_WIDTHS,
    )
  }

  const hasBottomBanner = placement === 'bottom'
  return { x: 0, y: 0, width: DEFAULT_DISC_TEXT_WIDTHS.copyright, scale: 1, align: 'center', mode: 'curved', arcDegrees: 210, arcSide: hasBottomBanner ? 'top' : 'bottom', avoidVisualElements: false }
}

export function createDefaultDiscTextLayout(
  placement: SteamLogoPlacement,
  template?: DiscTemplate,
): DiscTextLayoutSettings {
  if (template) {
    return createDefaultDiscTextLayoutForTemplate(
      template,
      placement,
      DEFAULT_DISC_TEXT_WIDTHS,
    )
  }

  const hasBottomBanner = placement === 'bottom'
  return {
    title: { x: 0, y: hasBottomBanner ? 81.5 : 19.5, width: DEFAULT_DISC_TEXT_WIDTHS.title, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom', avoidVisualElements: false },
    subtitle: { x: 0, y: hasBottomBanner ? 86 : 24, width: DEFAULT_DISC_TEXT_WIDTHS.subtitle, scale: 0.92, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom', avoidVisualElements: false },
    discNumber: { x: 0, y: 63.5, width: DEFAULT_DISC_TEXT_WIDTHS.discNumber, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom', avoidVisualElements: false },
    backupDate: { x: 0, y: 68, width: DEFAULT_DISC_TEXT_WIDTHS.backupDate, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom', avoidVisualElements: false },
    appId: { x: 0, y: 72, width: DEFAULT_DISC_TEXT_WIDTHS.appId, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom', avoidVisualElements: false },
    developer: { x: -18, y: 56, width: DEFAULT_DISC_TEXT_WIDTHS.developer, scale: 0.86, align: 'left', mode: 'straight', arcDegrees: 210, arcSide: 'bottom', avoidVisualElements: false },
    publisher: { x: -18, y: 60, width: DEFAULT_DISC_TEXT_WIDTHS.publisher, scale: 0.86, align: 'left', mode: 'straight', arcDegrees: 210, arcSide: 'bottom', avoidVisualElements: false },
    installNotes: { x: 0, y: hasBottomBanner ? 72 : 76, width: DEFAULT_DISC_TEXT_WIDTHS.installNotes, scale: 0.86, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom', avoidVisualElements: false },
    customNote: { x: 0, y: hasBottomBanner ? 76 : 78, width: DEFAULT_DISC_TEXT_WIDTHS.customNote, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom', avoidVisualElements: false },
    copyright: getDefaultCopyrightCurvedLayout(placement),
  }
}

export function normalizeDiscTextSettings(settings?: Partial<DiscTextSettings>): DiscTextSettings {
  return { ...DEFAULT_DISC_TEXT_SETTINGS, ...(settings ?? {}) }
}

export function updateDiscTextSetting(
  settings: DiscTextSettings,
  key: DiscTextKey,
  checked: boolean,
): DiscTextSettings {
  return {
    ...settings,
    [key]: checked,
  }
}

export function normalizeDiscTextValues(values?: Partial<DiscTextValues>, appId?: number): DiscTextValues {
  return { ...createDefaultDiscTextValues(appId), ...(values ?? {}) }
}

export function updateDiscTextValue(
  values: DiscTextValues,
  key: Exclude<DiscTextKey, 'title'>,
  value: string,
): DiscTextValues {
  return {
    ...values,
    [key]: value,
  }
}

export function updateDiscTextAlignment(
  layoutSettings: DiscTextLayoutSettings,
  key: DiscTextKey,
  align: DiscTextAlignment,
): DiscTextLayoutSettings {
  return {
    ...layoutSettings,
    [key]: {
      ...layoutSettings[key],
      align,
    },
  }
}

export function updateDiscTextArcSide(
  layoutSettings: DiscTextLayoutSettings,
  key: DiscTextKey,
  arcSide: DiscTextArcSide,
): DiscTextLayoutSettings {
  return {
    ...layoutSettings,
    [key]: {
      ...layoutSettings[key],
      arcSide,
    },
  }
}

export function updateDiscTextVisualAvoidance(
  layoutSettings: DiscTextLayoutSettings,
  key: DiscTextKey,
  avoidVisualElements: boolean,
): DiscTextLayoutSettings {
  return {
    ...layoutSettings,
    [key]: {
      ...layoutSettings[key],
      avoidVisualElements,
    },
  }
}

export function updateDiscTextLayoutField(
  layoutSettings: DiscTextLayoutSettings,
  key: DiscTextKey,
  field: DiscTextLayoutNumericField,
  value: number,
): DiscTextLayoutSettings {
  return {
    ...layoutSettings,
    [key]: {
      ...layoutSettings[key],
      [field]:
        field === 'width'
          ? normalizeDiscTextWidth(value, layoutSettings[key].width)
          : value,
    },
  }
}

function clampDiscTextDragCoordinate(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function isCurvedCopyrightDiscTextLayout(
  key: DiscTextKey,
  layout: DiscTextLayout,
) {
  return key === 'copyright' && layout.mode === 'curved'
}

export function updateDraggedDiscTextLayoutPosition(
  layoutSettings: DiscTextLayoutSettings,
  key: DiscTextKey,
  point: DiscTextLayoutPoint,
): DiscTextLayoutSettings {
  const currentTextLayout = layoutSettings[key]
  const isCurvedCopyright = isCurvedCopyrightDiscTextLayout(key, currentTextLayout)

  return {
    ...layoutSettings,
    [key]: {
      ...currentTextLayout,
      x: isCurvedCopyright
          ? clampDiscTextDragCoordinate(
            point.x,
            CURVED_COPYRIGHT_LAYOUT_X_MIN,
            CURVED_COPYRIGHT_LAYOUT_X_MAX,
          )
        : point.x,
      y: isCurvedCopyright
          ? clampDiscTextDragCoordinate(
            point.y,
            CURVED_COPYRIGHT_LAYOUT_Y_MIN,
            CURVED_COPYRIGHT_LAYOUT_Y_MAX,
          )
        : point.y,
    },
  }
}

export function updateDiscTextMode(
  layoutSettings: DiscTextLayoutSettings,
  key: DiscTextKey,
  mode: DiscTextMode,
  placement: SteamLogoPlacement,
  template?: DiscTemplate,
): DiscTextLayoutSettings {
  if (key === 'copyright') {
    const defaultLayout =
      mode === 'curved'
        ? getDefaultCopyrightCurvedLayout(placement, template)
        : getDefaultCopyrightStraightLayout(placement, template)

    return {
      ...layoutSettings,
      copyright: {
        ...layoutSettings.copyright,
        ...defaultLayout,
        mode,
      },
    }
  }

  return {
    ...layoutSettings,
    [key]: {
      ...layoutSettings[key],
      mode,
    },
  }
}

export function updateDiscTextLayoutForSteamLogoPlacement(
  layoutSettings: DiscTextLayoutSettings,
  placement: SteamLogoPlacement,
  template?: DiscTemplate,
): DiscTextLayoutSettings {
  const defaultLayout = createDefaultDiscTextLayout(placement, template)
  const currentCopyrightLayout = layoutSettings.copyright
  const defaultCopyrightLayout =
    currentCopyrightLayout.mode === 'curved'
      ? getDefaultCopyrightCurvedLayout(placement, template)
      : getDefaultCopyrightStraightLayout(placement, template)

  return {
    ...layoutSettings,
    title: defaultLayout.title,
    customNote: defaultLayout.customNote,
    copyright: {
      ...defaultCopyrightLayout,
      mode: currentCopyrightLayout.mode,
      scale: currentCopyrightLayout.scale,
      align: currentCopyrightLayout.align,
      arcDegrees: currentCopyrightLayout.arcDegrees,
      width: currentCopyrightLayout.width,
    },
  }
}

export function resetDiscTextLayout(
  layoutSettings: DiscTextLayoutSettings,
  key: DiscTextKey,
  placement: SteamLogoPlacement,
  template?: DiscTemplate,
): DiscTextLayoutSettings {
  if (key === 'copyright') {
    return {
      ...layoutSettings,
      copyright:
        layoutSettings.copyright.mode === 'curved'
          ? getDefaultCopyrightCurvedLayout(placement, template)
          : getDefaultCopyrightStraightLayout(placement, template),
    }
  }

  const defaultLayout = createDefaultDiscTextLayout(placement, template)
  return {
    ...layoutSettings,
    [key]: defaultLayout[key],
  }
}

export function normalizeDiscTextLayout(
  layout: Partial<Record<DiscTextKey, Partial<DiscTextLayout>>> | undefined,
  placement: SteamLogoPlacement,
  template?: DiscTemplate,
): DiscTextLayoutSettings {
  const defaults = createDefaultDiscTextLayout(placement, template)
  return DISC_TEXT_KEYS.reduce((normalizedLayout, key) => {
    const mergedLayout = { ...defaults[key], ...(layout?.[key] ?? {}) }
    normalizedLayout[key] = {
      ...mergedLayout,
      width: normalizeDiscTextWidth(mergedLayout.width, defaults[key].width),
      avoidVisualElements: mergedLayout.avoidVisualElements ?? defaults[key].avoidVisualElements,
    }
    return normalizedLayout
  }, {} as DiscTextLayoutSettings)
}

export function getDiscTextInputValue(
  key: DiscTextKey,
  values: DiscTextValues,
  title: string,
) {
  if (key === 'title') {
    return title
  }

  return values[key]
}

export function getDiscTextLabel(key: DiscTextKey) {
  switch (key) {
    case 'title': return 'Game title'
    case 'subtitle': return 'Subtitle / edition'
    case 'discNumber': return 'Disc number'
    case 'backupDate': return 'Backup date'
    case 'appId': return 'Steam App ID'
    case 'developer': return 'Developer text'
    case 'publisher': return 'Publisher text'
    case 'installNotes': return 'Install notes'
    case 'customNote': return 'Custom note'
    case 'copyright': return 'Copyright/legal text'
    default: return key
  }
}

export function getDiscTextContent(key: DiscTextKey, values: DiscTextValues, title: string) {
  switch (key) {
    case 'title': return title
    case 'subtitle': return values.subtitle
    case 'discNumber': return values.discNumber
    case 'backupDate': return values.backupDate ? `Backed up ${values.backupDate}` : ''
    case 'appId': return values.appId ? `Steam App ID ${values.appId}` : ''
    case 'developer': return values.developer ? `Developer: ${values.developer}` : ''
    case 'publisher': return values.publisher ? `Publisher: ${values.publisher}` : ''
    case 'installNotes': return values.installNotes
    case 'customNote': return values.customNote
    case 'copyright': return values.copyright
    default: return ''
  }
}

export function getDiscTextPreviewClassName(key: DiscTextKey) {
  return `disc-text-${key}`
}

export function getDiscTextPreviewTransform(_key: DiscTextKey, layout: DiscTextLayout) {
  if (layout.mode === 'straight') {
    return `translate(-50%, -50%) scale(${layout.scale})`
  }

  const horizontalTranslate =
    layout.align === 'left'
      ? '0'
      : layout.align === 'right'
        ? '-100%'
        : '-50%'

  return `translate(${horizontalTranslate}, -50%) scale(${layout.scale})`
}

export function getCopyrightArcSide(placement: SteamLogoPlacement, layout: DiscTextLayout): DiscTextArcSide {
  if (placement === 'bottom') return 'top'
  if (placement === 'top') return 'bottom'
  return layout.arcSide
}

function getSvgArcPoint(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const angleRadians = (angleDegrees * Math.PI) / 180
  return { x: centerX + Math.cos(angleRadians) * radius, y: centerY + Math.sin(angleRadians) * radius }
}

export function createSvgArcPath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngleDegrees: number,
  endAngleDegrees: number,
  sweepFlag: 0 | 1,
  largeArcFlag: 0 | 1 = 0,
) {
  const start = getSvgArcPoint(centerX, centerY, radius, startAngleDegrees)
  const end = getSvgArcPoint(centerX, centerY, radius, endAngleDegrees)
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius.toFixed(3)} ${radius.toFixed(3)} 0 ${largeArcFlag} ${sweepFlag} ${end.x.toFixed(3)} ${end.y.toFixed(3)}`
}

export function getLargeArcFlag(arcDegrees: number): 0 | 1 {
  return arcDegrees > 180 ? 1 : 0
}

export function getReadableCurvedTextScale(scale: number) {
  return Math.max(scale, 0.72)
}

export function getCurvedPreviewLetterSpacing(scale: number) {
  return Math.max(0.11, 0.14 * getReadableCurvedTextScale(scale))
}

function splitLongTokenForPreview(token: string, maxCharacters: number) {
  const chunks: string[] = []
  for (let index = 0; index < token.length; index += maxCharacters) chunks.push(token.slice(index, index + maxCharacters))
  return chunks
}

export function wrapPreviewTextByArcLength(text: string, radius: number, arcDegrees: number, scale: number) {
  const arcLength = radius * ((arcDegrees * Math.PI) / 180)
  const averageCharacterWidth = Math.max(0.92, 1.28 * scale)
  const maxCharacters = Math.max(6, Math.floor(arcLength / averageCharacterWidth))
  const tokens = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''
  for (const token of tokens) {
    const tokenParts = token.length > maxCharacters ? splitLongTokenForPreview(token, maxCharacters) : [token]
    for (const part of tokenParts) {
      const testLine = currentLine ? `${currentLine} ${part}` : part
      if (testLine.length <= maxCharacters || !currentLine) {
        currentLine = testLine
        continue
      }
      lines.push(currentLine)
      currentLine = part
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}
