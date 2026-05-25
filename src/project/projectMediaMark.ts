import type { MediaMarkLayout, MediaMarkValue, ProjectMediaMark } from './projectTypes'

export const MEDIA_MARK_OPTIONS: Array<{ value: MediaMarkValue; label: string }> = [
  { value: 'dvd', label: 'DVD' },
  { value: 'dvdRom', label: 'DVD-ROM' },
  { value: 'cdRom', label: 'CD-ROM' },
  { value: 'pc', label: 'PC' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'steamBackup', label: 'Steam Backup' },
  { value: 'dataDisc', label: 'Data Disc' },
  { value: 'installDisc', label: 'Install Disc' },
]

export const DEFAULT_MEDIA_MARK_LAYOUT: MediaMarkLayout = {
  enabled: false,
  scale: 1,
  x: 74,
  y: 72,
}

export function getMediaMarkLabel(value: MediaMarkValue) {
  return MEDIA_MARK_OPTIONS.find((option) => option.value === value)?.label ?? 'Data Disc'
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

function isMediaMarkValue(value: unknown): value is MediaMarkValue {
  return MEDIA_MARK_OPTIONS.some((option) => option.value === value)
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

export function normalizeProjectMediaMark(
  mediaMark: Partial<ProjectMediaMark> | undefined,
): ProjectMediaMark {
  const defaults = createDefaultProjectMediaMark()

  return {
    value: isMediaMarkValue(mediaMark?.value) ? mediaMark.value : defaults.value,
    source: mediaMark?.source === 'custom' ? 'custom' : 'placeholder',
    customImageDataUrl: mediaMark?.customImageDataUrl ?? null,
    customImageSize: mediaMark?.customImageSize ?? null,
    layout: normalizeMediaMarkLayout(mediaMark?.layout),
  }
}
