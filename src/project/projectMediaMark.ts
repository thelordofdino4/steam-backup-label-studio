import {
  getDefaultMediaMarkLayoutForTemplate,
  getDefaultPlatformMarkLayoutForTemplate,
} from '../layout/discTemplateLayoutDefaults.ts'
import type { DiscTemplate } from '../types/template'
import type {
  MediaMarkLayout,
  MediaMarkSource,
  MediaMarkValue,
  BackgroundImageSize,
  PlatformMarkLayout,
  PlatformMarkSource,
  PlatformMarkValue,
  ProjectMediaMark,
  ProjectPlatformMarkAsset,
  ProjectPlatformMarks,
} from './projectTypes'

export type MediaMarkLayoutField = keyof MediaMarkLayout
export type PlatformMarkLayoutField = keyof PlatformMarkLayout

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

export const PLATFORM_MARK_OPTIONS: Array<{ value: PlatformMarkValue; label: string }> = [
  { value: 'pc', label: 'PC' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'steamDeck', label: 'SteamOS' },
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

const DEFAULT_PLATFORM_MARK_LAYOUTS: Record<PlatformMarkValue, PlatformMarkLayout> = {
  pc: { enabled: true, scale: 1, x: 24, y: 70 },
  windows: { enabled: true, scale: 1, x: 37, y: 70 },
  linux: { enabled: true, scale: 1, x: 50, y: 70 },
  steamDeck: { enabled: true, scale: 1, x: 24, y: 80 },
  macos: { enabled: true, scale: 1, x: 37, y: 80 },
}

export function getMediaMarkLabel(value: MediaMarkValue) {
  return MEDIA_MARK_OPTIONS.find((option) => option.value === value)?.label ?? 'Data Disc'
}

export function getPlatformMarkLabel(value: PlatformMarkValue) {
  return PLATFORM_MARK_OPTIONS.find((option) => option.value === value)?.label ?? 'PC'
}

export function createDefaultProjectMediaMark(
  selectedDiscTemplate?: DiscTemplate,
): ProjectMediaMark {
  return {
    value: 'dataDisc',
    source: 'placeholder',
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
  return {
    ...mediaMark,
    source: 'custom',
    customImageDataUrl: imageDataUrl,
    customImageSize: imageSize,
    layout: {
      ...mediaMark.layout,
      enabled: true,
    },
  }
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

export function createDefaultProjectPlatformMarks(): ProjectPlatformMarks {
  return {
    values: [],
    assets: {},
  }
}

export function createDefaultProjectPlatformMarkAsset(
  value: PlatformMarkValue,
  selectedDiscTemplate?: DiscTemplate,
): ProjectPlatformMarkAsset {
  return {
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
    layout: selectedDiscTemplate
      ? getDefaultPlatformMarkLayoutForTemplate(selectedDiscTemplate, value)
      : DEFAULT_PLATFORM_MARK_LAYOUTS[value],
  }
}

export function getProjectPlatformMarkAsset(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  selectedDiscTemplate?: DiscTemplate,
) {
  return platformMarks.assets[value] ??
    createDefaultProjectPlatformMarkAsset(value, selectedDiscTemplate)
}

function setProjectPlatformMarkAsset(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  asset: ProjectPlatformMarkAsset,
): ProjectPlatformMarks {
  return {
    ...platformMarks,
    assets: {
      ...platformMarks.assets,
      [value]: asset,
    },
  }
}

export function updatePlatformMarkToggle(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  enabled: boolean,
  selectedDiscTemplate?: DiscTemplate,
): ProjectPlatformMarks {
  const values = enabled
    ? Array.from(new Set([...platformMarks.values, value]))
    : platformMarks.values.filter((currentValue) => currentValue !== value)
  const currentAsset = getProjectPlatformMarkAsset(
    platformMarks,
    value,
    selectedDiscTemplate,
  )

  return setProjectPlatformMarkAsset(
    {
      ...platformMarks,
      values,
    },
    value,
    {
      ...currentAsset,
      layout: {
        ...currentAsset.layout,
        enabled,
      },
    },
  )
}

export function getEnabledPlatformMarkValues(
  platformMarks: ProjectPlatformMarks,
): PlatformMarkValue[] {
  return platformMarks.values.filter(
    (value) => getProjectPlatformMarkAsset(platformMarks, value).layout.enabled,
  )
}

export function getPlatformMarkValuesForRestore(
  platformMarks: ProjectPlatformMarks,
  rememberedValues: PlatformMarkValue[],
): PlatformMarkValue[] {
  if (platformMarks.values.length > 0) {
    return platformMarks.values
  }

  if (rememberedValues.length > 0) {
    return rememberedValues
  }

  return ['pc']
}

export function getPlatformMarkValuesForRemember(
  platformMarks: ProjectPlatformMarks,
): PlatformMarkValue[] {
  return platformMarks.values
}

export function setPlatformMarkCustomImage(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  imageDataUrl: string,
  imageSize: ProjectPlatformMarkAsset['customImageSize'],
  selectedDiscTemplate?: DiscTemplate,
): ProjectPlatformMarks {
  const currentAsset = getProjectPlatformMarkAsset(
    platformMarks,
    value,
    selectedDiscTemplate,
  )

  return setProjectPlatformMarkAsset(
    {
      ...platformMarks,
      values: Array.from(new Set([...platformMarks.values, value])),
    },
    value,
    {
      ...currentAsset,
      source: 'custom',
      customImageDataUrl: imageDataUrl,
      customImageSize: imageSize,
      layout: {
        ...currentAsset.layout,
        enabled: true,
      },
    },
  )
}

export function updatePlatformMarkSource(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  source: PlatformMarkSource,
): ProjectPlatformMarks {
  const currentAsset = getProjectPlatformMarkAsset(platformMarks, value)

  return setProjectPlatformMarkAsset(platformMarks, value, {
    ...currentAsset,
    source,
  })
}

export function updatePlatformMarkLayoutField(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  field: PlatformMarkLayoutField,
  layoutValue: boolean | number,
): ProjectPlatformMarks {
  const currentAsset = getProjectPlatformMarkAsset(platformMarks, value)

  return setProjectPlatformMarkAsset(platformMarks, value, {
    ...currentAsset,
    layout: {
      ...currentAsset.layout,
      [field]: layoutValue,
    },
  })
}

export function updatePlatformMarkLayoutPosition(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  point: MarkLayoutPoint,
): ProjectPlatformMarks {
  const currentAsset = getProjectPlatformMarkAsset(platformMarks, value)

  return setProjectPlatformMarkAsset(platformMarks, value, {
    ...currentAsset,
    layout: {
      ...currentAsset.layout,
      x: point.x,
      y: point.y,
    },
  })
}

export function clearPlatformMarkImage(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
): ProjectPlatformMarks {
  const currentAsset = getProjectPlatformMarkAsset(platformMarks, value)

  return setProjectPlatformMarkAsset(platformMarks, value, {
    ...currentAsset,
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
  })
}

export function resetProjectPlatformMarkLayout(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  selectedDiscTemplate?: DiscTemplate,
): ProjectPlatformMarks {
  const currentAsset = getProjectPlatformMarkAsset(platformMarks, value)
  const defaultLayout = selectedDiscTemplate
    ? getDefaultPlatformMarkLayoutForTemplate(
        selectedDiscTemplate,
        value,
        currentAsset,
      )
    : createDefaultProjectPlatformMarkAsset(value).layout

  return setProjectPlatformMarkAsset(platformMarks, value, {
    ...currentAsset,
    layout: {
      ...defaultLayout,
      enabled: currentAsset.layout.enabled,
    },
  })
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
  defaults: MediaMarkLayout = DEFAULT_MEDIA_MARK_LAYOUT,
): MediaMarkLayout {
  return {
    enabled: layout?.enabled ?? defaults.enabled,
    scale: layout?.scale ?? defaults.scale,
    x: layout?.x ?? defaults.x,
    y: layout?.y ?? defaults.y,
  }
}

function normalizePlatformMarkLayout(
  layout: Partial<PlatformMarkLayout> | undefined,
  defaultLayout: PlatformMarkLayout = DEFAULT_PLATFORM_MARK_LAYOUT,
): PlatformMarkLayout {
  return {
    enabled: layout?.enabled ?? defaultLayout.enabled,
    scale: layout?.scale ?? defaultLayout.scale,
    x: layout?.x ?? defaultLayout.x,
    y: layout?.y ?? defaultLayout.y,
  }
}

function normalizePlatformMarkAsset(
  value: PlatformMarkValue,
  asset: Partial<ProjectPlatformMarkAsset> | undefined,
  selectedDiscTemplate?: DiscTemplate,
): ProjectPlatformMarkAsset {
  const source = asset?.source === 'custom' ? 'custom' : 'placeholder'
  const customImageSize = asset?.customImageSize ?? null
  const defaults = createDefaultProjectPlatformMarkAsset(value, selectedDiscTemplate)
  const defaultLayout = selectedDiscTemplate
    ? getDefaultPlatformMarkLayoutForTemplate(selectedDiscTemplate, value, {
        source,
        customImageSize,
      })
    : defaults.layout

  return {
    source,
    customImageDataUrl: asset?.customImageDataUrl ?? null,
    customImageSize,
    layout: normalizePlatformMarkLayout(asset?.layout, defaultLayout),
  }
}

function getLegacyPlatformMarkLayout(
  value: PlatformMarkValue,
  index: number,
  values: PlatformMarkValue[],
  legacyLayout: Partial<PlatformMarkLayout> | undefined,
  selectedDiscTemplate?: DiscTemplate,
): PlatformMarkLayout {
  const defaultAsset = createDefaultProjectPlatformMarkAsset(
    value,
    selectedDiscTemplate,
  )

  if (!legacyLayout) {
    return defaultAsset.layout
  }

  const baseLayout = normalizePlatformMarkLayout(
    legacyLayout,
    selectedDiscTemplate
      ? getDefaultPlatformMarkLayoutForTemplate(selectedDiscTemplate, value)
      : DEFAULT_PLATFORM_MARK_LAYOUT,
  )
  const columns = Math.min(3, Math.max(1, values.length))
  const column = index % 3
  const row = Math.floor(index / 3)
  const offsetX = (column - (columns - 1) / 2) * 13.2 * baseLayout.scale
  const offsetY = row * 9.2 * baseLayout.scale

  return {
    enabled: baseLayout.enabled,
    scale: baseLayout.scale,
    x: baseLayout.x + offsetX,
    y: baseLayout.y + offsetY,
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
  const customImageSize = mediaMark?.customImageSize ?? null
  const defaultLayout = selectedDiscTemplate
    ? getDefaultMediaMarkLayoutForTemplate(selectedDiscTemplate, {
        source,
        customImageSize,
      })
    : defaults.layout

  return {
    value: rawValue,
    source,
    customImageDataUrl: mediaMark?.customImageDataUrl ?? null,
    customImageSize,
    layout: normalizeMediaMarkLayout(mediaMark?.layout, defaultLayout),
  }
}

export function normalizeProjectPlatformMarks(
  platformMarks: Partial<ProjectPlatformMarks> | undefined,
  legacyMediaMark?: Partial<ProjectMediaMark>,
  selectedDiscTemplate?: DiscTemplate,
): ProjectPlatformMarks {
  const defaults = createDefaultProjectPlatformMarks()
  const rawValues = Array.isArray(platformMarks?.values) ? platformMarks.values : null
  const values = rawValues
    ? Array.from(new Set(rawValues.filter(isPlatformMarkValue)))
    : defaults.values

  if (platformMarks) {
    const rawPlatformMarks = platformMarks as Partial<ProjectPlatformMarks> & {
      source?: unknown
      customImageDataUrl?: string | null
      customImageSize?: ProjectPlatformMarkAsset['customImageSize']
      layout?: Partial<PlatformMarkLayout>
    }
    const rawAssets = rawPlatformMarks.assets
    const hasPerPlatformAssets = rawAssets && typeof rawAssets === 'object'

    if (hasPerPlatformAssets) {
      return {
        values,
        assets: Object.fromEntries(
          values.map((value) => [
            value,
            normalizePlatformMarkAsset(value, rawAssets[value], selectedDiscTemplate),
          ]),
        ) as ProjectPlatformMarks['assets'],
      }
    }

    const legacyLayout = normalizePlatformMarkLayout(
      rawPlatformMarks.layout,
      selectedDiscTemplate
        ? getDefaultPlatformMarkLayoutForTemplate(selectedDiscTemplate, 'pc')
        : DEFAULT_PLATFORM_MARK_LAYOUT,
    )
    const legacyValues = legacyLayout.enabled ? values : []

    return {
      values: legacyValues,
      assets: Object.fromEntries(
        values.map((value, index) => [
          value,
          {
            source:
              index === 0 && rawPlatformMarks.source === 'custom'
                ? 'custom'
                : 'placeholder',
            customImageDataUrl:
              index === 0 ? rawPlatformMarks.customImageDataUrl ?? null : null,
            customImageSize:
              index === 0 ? rawPlatformMarks.customImageSize ?? null : null,
            layout: getLegacyPlatformMarkLayout(
              value,
              index,
              values,
              legacyLayout,
              selectedDiscTemplate,
            ),
          },
        ]),
      ) as ProjectPlatformMarks['assets'],
    }
  }

  const legacyValue = mapLegacyPlatformMarkValue(
    (legacyMediaMark as { value?: unknown } | undefined)?.value,
  )

  if (!legacyValue) {
    return defaults
  }

  const legacyLayout = normalizePlatformMarkLayout(
    legacyMediaMark?.layout,
    createDefaultProjectPlatformMarkAsset(
      legacyValue,
      selectedDiscTemplate,
    ).layout,
  )

  return {
    values: legacyLayout.enabled ? [legacyValue] : [],
    assets: {
      [legacyValue]: {
        source: legacyMediaMark?.source === 'custom' ? 'custom' : 'placeholder',
        customImageDataUrl: legacyMediaMark?.customImageDataUrl ?? null,
        customImageSize: legacyMediaMark?.customImageSize ?? null,
        layout: legacyLayout,
      },
    },
  }
}
