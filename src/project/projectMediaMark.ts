import type {
  MediaMarkLayout,
  MediaMarkValue,
  PlatformMarkLayout,
  PlatformMarkValue,
  ProjectMediaMark,
  ProjectPlatformMarks,
} from './projectTypes'

export const MEDIA_MARK_OPTIONS: Array<{ value: MediaMarkValue; label: string }> = [
  { value: 'dvd', label: 'DVD' },
  { value: 'dvdRom', label: 'DVD-ROM' },
  { value: 'cdRom', label: 'CD-ROM' },
  { value: 'dataDisc', label: 'Data Disc' },
  { value: 'installDisc', label: 'Install Disc' },
]

export const PLATFORM_MARK_OPTIONS: Array<{ value: PlatformMarkValue; label: string }> = [
  { value: 'pc', label: 'PC' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'steamDeck', label: 'Steam Deck' },
  { value: 'macos', label: 'macOS' },
]

export const DEFAULT_MEDIA_MARK_LAYOUT: MediaMarkLayout = {
  enabled: false,
  scale: 1,
  x: 74,
  y: 72,
}

export const DEFAULT_PLATFORM_MARK_LAYOUT: PlatformMarkLayout = {
  enabled: false,
  scale: 1,
  x: 31,
  y: 70,
}

export function getMediaMarkLabel(value: MediaMarkValue) {
  return MEDIA_MARK_OPTIONS.find((option) => option.value === value)?.label ?? 'Data Disc'
}

export function getPlatformMarkLabel(value: PlatformMarkValue) {
  return PLATFORM_MARK_OPTIONS.find((option) => option.value === value)?.label ?? 'PC'
}

export function createDefaultProjectMediaMark(): ProjectMediaMark {
  return {
    value: 'dataDisc',
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
    layout: DEFAULT_MEDIA_MARK_LAYOUT,
  }
}

export function createDefaultProjectPlatformMarks(): ProjectPlatformMarks {
  return {
    values: ['pc'],
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
    layout: DEFAULT_PLATFORM_MARK_LAYOUT,
  }
}

function isMediaMarkValue(value: unknown): value is MediaMarkValue {
  return MEDIA_MARK_OPTIONS.some((option) => option.value === value)
}

function isPlatformMarkValue(value: unknown): value is PlatformMarkValue {
  return PLATFORM_MARK_OPTIONS.some((option) => option.value === value)
}

function mapLegacyPlatformMarkValue(value: unknown): PlatformMarkValue | null {
  if (isPlatformMarkValue(value)) {
    return value
  }

  if (value === 'steamBackup') {
    return 'pc'
  }

  return null
}

function normalizeMediaMarkLayout(
  layout: Partial<MediaMarkLayout> | undefined,
): MediaMarkLayout {
  return {
    enabled: layout?.enabled ?? DEFAULT_MEDIA_MARK_LAYOUT.enabled,
    scale: layout?.scale ?? DEFAULT_MEDIA_MARK_LAYOUT.scale,
    x: layout?.x ?? DEFAULT_MEDIA_MARK_LAYOUT.x,
    y: layout?.y ?? DEFAULT_MEDIA_MARK_LAYOUT.y,
  }
}

function normalizePlatformMarkLayout(
  layout: Partial<PlatformMarkLayout> | undefined,
): PlatformMarkLayout {
  return {
    enabled: layout?.enabled ?? DEFAULT_PLATFORM_MARK_LAYOUT.enabled,
    scale: layout?.scale ?? DEFAULT_PLATFORM_MARK_LAYOUT.scale,
    x: layout?.x ?? DEFAULT_PLATFORM_MARK_LAYOUT.x,
    y: layout?.y ?? DEFAULT_PLATFORM_MARK_LAYOUT.y,
  }
}

export function normalizeProjectMediaMark(
  mediaMark: Partial<ProjectMediaMark> | undefined,
): ProjectMediaMark {
  const defaults = createDefaultProjectMediaMark()
  const rawValue = (mediaMark as { value?: unknown } | undefined)?.value

  if (!isMediaMarkValue(rawValue)) {
    return defaults
  }

  return {
    value: rawValue,
    source: mediaMark?.source === 'custom' ? 'custom' : 'placeholder',
    customImageDataUrl: mediaMark?.customImageDataUrl ?? null,
    customImageSize: mediaMark?.customImageSize ?? null,
    layout: normalizeMediaMarkLayout(mediaMark?.layout),
  }
}

export function normalizeProjectPlatformMarks(
  platformMarks: Partial<ProjectPlatformMarks> | undefined,
  legacyMediaMark?: Partial<ProjectMediaMark>,
): ProjectPlatformMarks {
  const defaults = createDefaultProjectPlatformMarks()
  const rawValues = Array.isArray(platformMarks?.values) ? platformMarks.values : null
  const values = rawValues
    ? Array.from(new Set(rawValues.filter(isPlatformMarkValue)))
    : defaults.values

  if (platformMarks) {
    return {
      values,
      source: platformMarks.source === 'custom' ? 'custom' : 'placeholder',
      customImageDataUrl: platformMarks.customImageDataUrl ?? null,
      customImageSize: platformMarks.customImageSize ?? null,
      layout: normalizePlatformMarkLayout(platformMarks.layout),
    }
  }

  const legacyValue = mapLegacyPlatformMarkValue(
    (legacyMediaMark as { value?: unknown } | undefined)?.value,
  )

  if (!legacyValue) {
    return defaults
  }

  return {
    values: [legacyValue],
    source: legacyMediaMark?.source === 'custom' ? 'custom' : 'placeholder',
    customImageDataUrl: legacyMediaMark?.customImageDataUrl ?? null,
    customImageSize: legacyMediaMark?.customImageSize ?? null,
    layout: normalizePlatformMarkLayout(legacyMediaMark?.layout),
  }
}
