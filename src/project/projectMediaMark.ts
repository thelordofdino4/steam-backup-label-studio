import { getDefaultMediaMarkLayoutForTemplate } from '../layout/discTemplateLayoutDefaults.ts'
import { setOptionalLayoutFeatureEnabled } from '../editor/optionalVisualFeature.ts'
import type { DiscTemplate } from '../types/template'
import type {
  BackgroundImageSize,
  MediaMarkLayout,
  MediaMarkSource,
  MediaMarkTheme,
  MediaMarkValue,
  ProjectMediaMark,
} from './projectTypes'
import {
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeImageSize,
  normalizeNullableString,
  normalizePositiveNumber,
} from './savedProjectNormalization.ts'

export type MediaMarkLayoutField = keyof MediaMarkLayout

type MarkLayoutPoint = {
  x: number
  y: number
}

export const MEDIA_MARK_OPTIONS: Array<{ value: MediaMarkValue; label: string }> = [
  { value: 'bluRay', label: 'Blu-ray' },
  { value: 'dvd', label: 'DVD' },
  { value: 'dvdRom', label: 'DVD-ROM' },
  { value: 'cdRom', label: 'CD-ROM' },
  { value: 'dataDisc', label: 'Data Disc' },
  { value: 'installDisc', label: 'Install Disc' },
]

export const MEDIA_MARK_THEME_OPTIONS: Array<{ value: MediaMarkTheme; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const DEFAULT_MEDIA_MARK_THEME: MediaMarkTheme = 'light'

export const DEFAULT_MEDIA_MARK_LAYOUT: MediaMarkLayout = {
  enabled: false,
  scale: 1,
  x: 74,
  y: 72,
}

export function getMediaMarkLabel(value: MediaMarkValue) {
  return MEDIA_MARK_OPTIONS.find((option) => option.value === value)?.label ?? 'Data Disc'
}

export function mediaMarkSupportsTheme(value: MediaMarkValue) {
  return (
    value === 'cdRom' ||
    value === 'dataDisc' ||
    value === 'dvd' ||
    value === 'dvdRom' ||
    value === 'installDisc'
  )
}

export function createDefaultProjectMediaMark(
  selectedDiscTemplate?: DiscTemplate,
): ProjectMediaMark {
  return {
    value: 'dataDisc',
    source: 'placeholder',
    theme: DEFAULT_MEDIA_MARK_THEME,
    customImageDataUrl: null,
    customImageSize: null,
    layout: selectedDiscTemplate
      ? getDefaultMediaMarkLayoutForTemplate(selectedDiscTemplate)
      : DEFAULT_MEDIA_MARK_LAYOUT,
  }
}

export function updateMediaMarkValue(
  mediaMark: ProjectMediaMark,
  value: MediaMarkValue,
): ProjectMediaMark {
  return {
    ...mediaMark,
    value,
  }
}

export function updateMediaMarkSource(
  mediaMark: ProjectMediaMark,
  source: MediaMarkSource,
): ProjectMediaMark {
  return {
    ...mediaMark,
    source,
  }
}

export function updateMediaMarkTheme(
  mediaMark: ProjectMediaMark,
  theme: MediaMarkTheme,
): ProjectMediaMark {
  return {
    ...mediaMark,
    theme,
  }
}
export function updateMediaMarkLayoutField(
  mediaMark: ProjectMediaMark,
  field: MediaMarkLayoutField,
  value: boolean | number,
): ProjectMediaMark {
  return {
    ...mediaMark,
    layout: {
      ...mediaMark.layout,
      [field]: value,
    },
  }
}

export function updateMediaMarkLayoutPosition(
  mediaMark: ProjectMediaMark,
  point: MarkLayoutPoint,
): ProjectMediaMark {
  return {
    ...mediaMark,
    layout: {
      ...mediaMark.layout,
      x: point.x,
      y: point.y,
    },
  }
}

export function setMediaMarkCustomImage(
  mediaMark: ProjectMediaMark,
  imageDataUrl: string,
  imageSize: BackgroundImageSize,
): ProjectMediaMark {
  return setOptionalLayoutFeatureEnabled({
    ...mediaMark,
    source: 'custom',
    customImageDataUrl: imageDataUrl,
    customImageSize: imageSize,
  }, true)
}

export function clearMediaMarkImage(
  mediaMark: ProjectMediaMark,
): ProjectMediaMark {
  return {
    ...mediaMark,
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
  }
}

export function resetProjectMediaMarkLayout(
  mediaMark: ProjectMediaMark,
  selectedDiscTemplate?: DiscTemplate,
): ProjectMediaMark {
  const defaults = createDefaultProjectMediaMark(selectedDiscTemplate)
  const defaultLayout = selectedDiscTemplate
    ? getDefaultMediaMarkLayoutForTemplate(selectedDiscTemplate, mediaMark)
    : defaults.layout

  return {
    ...mediaMark,
    layout: {
      ...defaultLayout,
      enabled: mediaMark.layout.enabled,
    },
  }
}

function isMediaMarkValue(value: unknown): value is MediaMarkValue {
  return MEDIA_MARK_OPTIONS.some((option) => option.value === value)
}

function isMediaMarkTheme(value: unknown): value is MediaMarkTheme {
  return MEDIA_MARK_THEME_OPTIONS.some((option) => option.value === value)
}

function normalizeMediaMarkLayout(
  layout: Partial<MediaMarkLayout> | undefined,
  defaults: MediaMarkLayout = DEFAULT_MEDIA_MARK_LAYOUT,
): MediaMarkLayout {
  return {
    enabled: normalizeBoolean(layout?.enabled, defaults.enabled),
    scale: normalizePositiveNumber(layout?.scale, defaults.scale),
    x: normalizeFiniteNumber(layout?.x, defaults.x),
    y: normalizeFiniteNumber(layout?.y, defaults.y),
  }
}

export function normalizeProjectMediaMark(
  mediaMark: Partial<ProjectMediaMark> | undefined,
  selectedDiscTemplate?: DiscTemplate,
): ProjectMediaMark {
  const defaults = createDefaultProjectMediaMark(selectedDiscTemplate)
  const rawValue = (mediaMark as { value?: unknown } | undefined)?.value

  if (!isMediaMarkValue(rawValue)) {
    return defaults
  }
  const source = mediaMark?.source === 'custom' ? 'custom' : 'placeholder'
  const rawTheme = (mediaMark as { theme?: unknown } | undefined)?.theme
  const theme = isMediaMarkTheme(rawTheme)
    ? rawTheme
    : DEFAULT_MEDIA_MARK_THEME
  const customImageSize = normalizeImageSize(mediaMark?.customImageSize)
  const defaultLayout = selectedDiscTemplate
    ? getDefaultMediaMarkLayoutForTemplate(selectedDiscTemplate, {
        source,
        customImageSize,
      })
    : defaults.layout

  return {
    value: rawValue,
    source,
    theme,
    customImageDataUrl: normalizeNullableString(mediaMark?.customImageDataUrl),
    customImageSize,
    layout: normalizeMediaMarkLayout(mediaMark?.layout, defaultLayout),
  }
}
