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
}

export type DiscTextLayoutSettings = Record<DiscTextKey, DiscTextLayout>

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

export function getDefaultCopyrightStraightLayout(placement: SteamLogoPlacement): DiscTextLayout {
  const hasBottomBanner = placement === 'bottom'
  return { x: 0, y: hasBottomBanner ? 16 : 86, width: DEFAULT_DISC_TEXT_WIDTHS.copyright, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: hasBottomBanner ? 'top' : 'bottom' }
}

export function getDefaultCopyrightCurvedLayout(placement: SteamLogoPlacement): DiscTextLayout {
  const hasBottomBanner = placement === 'bottom'
  return { x: 0, y: 0, width: DEFAULT_DISC_TEXT_WIDTHS.copyright, scale: 1, align: 'center', mode: 'curved', arcDegrees: 210, arcSide: hasBottomBanner ? 'top' : 'bottom' }
}

export function createDefaultDiscTextLayout(placement: SteamLogoPlacement): DiscTextLayoutSettings {
  const hasBottomBanner = placement === 'bottom'
  return {
    title: { x: 0, y: hasBottomBanner ? 81.5 : 19.5, width: DEFAULT_DISC_TEXT_WIDTHS.title, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom' },
    subtitle: { x: 0, y: hasBottomBanner ? 86 : 24, width: DEFAULT_DISC_TEXT_WIDTHS.subtitle, scale: 0.92, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom' },
    discNumber: { x: 0, y: 63.5, width: DEFAULT_DISC_TEXT_WIDTHS.discNumber, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom' },
    backupDate: { x: 0, y: 68, width: DEFAULT_DISC_TEXT_WIDTHS.backupDate, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom' },
    appId: { x: 0, y: 72, width: DEFAULT_DISC_TEXT_WIDTHS.appId, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom' },
    developer: { x: -18, y: 56, width: DEFAULT_DISC_TEXT_WIDTHS.developer, scale: 0.86, align: 'left', mode: 'straight', arcDegrees: 210, arcSide: 'bottom' },
    publisher: { x: -18, y: 60, width: DEFAULT_DISC_TEXT_WIDTHS.publisher, scale: 0.86, align: 'left', mode: 'straight', arcDegrees: 210, arcSide: 'bottom' },
    installNotes: { x: 0, y: hasBottomBanner ? 72 : 76, width: DEFAULT_DISC_TEXT_WIDTHS.installNotes, scale: 0.86, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom' },
    customNote: { x: 0, y: hasBottomBanner ? 76 : 78, width: DEFAULT_DISC_TEXT_WIDTHS.customNote, scale: 1, align: 'center', mode: 'straight', arcDegrees: 210, arcSide: 'bottom' },
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

export function normalizeDiscTextLayout(
  layout: Partial<Record<DiscTextKey, Partial<DiscTextLayout>>> | undefined,
  placement: SteamLogoPlacement,
): DiscTextLayoutSettings {
  const defaults = createDefaultDiscTextLayout(placement)
  return DISC_TEXT_KEYS.reduce((normalizedLayout, key) => {
    const mergedLayout = { ...defaults[key], ...(layout?.[key] ?? {}) }
    normalizedLayout[key] = {
      ...mergedLayout,
      width: normalizeDiscTextWidth(mergedLayout.width, defaults[key].width),
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
