import { getDefaultPlatformMarkLayoutForTemplate } from '../layout/discTemplateLayoutDefaults.ts'
import type { DiscTemplate } from '../types/template'
import type {
  PlatformMarkLayout,
  PlatformMarkSource,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectMediaMark,
  ProjectPlatformMarkAsset,
  ProjectPlatformMarkInference,
  ProjectPlatformMarks,
} from './projectTypes'

export type PlatformMarkLayoutField = keyof PlatformMarkLayout

type MarkLayoutPoint = {
  x: number
  y: number
}

export const PLATFORM_MARK_OPTIONS: Array<{ value: PlatformMarkValue; label: string }> = [
  { value: 'pc', label: 'PC' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'steamDeck', label: 'SteamOS' },
  { value: 'macos', label: 'macOS' },
]

export const PLATFORM_MARK_THEME_OPTIONS: Array<{ value: PlatformMarkTheme; label: string }> = [
  { value: 'color', label: 'Color' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'macos1988', label: '1988' },
  { value: 'macos1995', label: '1995' },
  { value: 'macos2001', label: '2001' },
  { value: 'macos2003', label: '2003' },
  { value: 'macos2012', label: '2012' },
  { value: 'macos2016', label: '2016' },
  { value: 'macos2017', label: '2017' },
  { value: 'retro', label: 'Retro' },
  { value: 'xp', label: 'XP' },
  { value: 'vista', label: 'Vista' },
  { value: 'windows7', label: '7' },
  { value: 'windows10', label: '10' },
  { value: 'windows11', label: '11' },
  { value: 'pcPlatform', label: 'PC Platform' },
  { value: 'pcSimplified', label: 'PC Simplified' },
  { value: 'pcSimplifiedDark', label: 'PC Simplified Dark' },
]

const LINUX_PLATFORM_MARK_THEME_OPTIONS = PLATFORM_MARK_THEME_OPTIONS.filter(
  (option) => option.value === 'color' || option.value === 'light' || option.value === 'dark',
)

const MACOS_PLATFORM_MARK_THEME_OPTIONS = PLATFORM_MARK_THEME_OPTIONS.filter(
  (option) =>
    option.value === 'macos1988' ||
    option.value === 'macos1995' ||
    option.value === 'macos2001' ||
    option.value === 'macos2003' ||
    option.value === 'macos2012' ||
    option.value === 'macos2016' ||
    option.value === 'macos2017',
)

const WINDOWS_PLATFORM_MARK_THEME_OPTIONS = PLATFORM_MARK_THEME_OPTIONS.filter(
  (option) =>
    option.value === 'retro' ||
    option.value === 'xp' ||
    option.value === 'vista' ||
    option.value === 'windows7' ||
    option.value === 'windows10' ||
    option.value === 'windows11',
)

const PC_PLATFORM_MARK_THEME_OPTIONS = PLATFORM_MARK_THEME_OPTIONS.filter(
  (option) =>
    option.value === 'pcPlatform' ||
    option.value === 'pcSimplified' ||
    option.value === 'pcSimplifiedDark',
)

const PLATFORM_MARK_THEME_OPTIONS_BY_VALUE: Record<PlatformMarkValue, Array<{ value: PlatformMarkTheme; label: string }>> = {
  linux: LINUX_PLATFORM_MARK_THEME_OPTIONS,
  macos: MACOS_PLATFORM_MARK_THEME_OPTIONS,
  pc: PC_PLATFORM_MARK_THEME_OPTIONS,
  steamDeck: LINUX_PLATFORM_MARK_THEME_OPTIONS,
  windows: WINDOWS_PLATFORM_MARK_THEME_OPTIONS,
}

const PLATFORM_MARK_VALUES = PLATFORM_MARK_OPTIONS.map((option) => option.value)

const DEFAULT_PLATFORM_MARK_INFERENCE: ProjectPlatformMarkInference = {
  source: 'none',
  status: 'not-applied',
  steamAppId: null,
  values: [],
  message: 'No Steam platform metadata has been applied.',
}

const FALLBACK_PLATFORM_MARK_THEME: PlatformMarkTheme = 'color'
const DEFAULT_PLATFORM_MARK_THEME_BY_VALUE: Partial<Record<PlatformMarkValue, PlatformMarkTheme>> = {
  windows: 'windows11',
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

export function getPlatformMarkLabel(value: PlatformMarkValue) {
  return PLATFORM_MARK_OPTIONS.find((option) => option.value === value)?.label ?? 'PC'
}

export function getPlatformMarkThemeOptions(value: PlatformMarkValue) {
  return PLATFORM_MARK_THEME_OPTIONS_BY_VALUE[value]
}

export function getDefaultPlatformMarkTheme(value: PlatformMarkValue) {
  return DEFAULT_PLATFORM_MARK_THEME_BY_VALUE[value] ??
    getPlatformMarkThemeOptions(value)[0]?.value ??
    FALLBACK_PLATFORM_MARK_THEME
}

export function platformMarkSupportsTheme(value: PlatformMarkValue) {
  return getPlatformMarkThemeOptions(value).length > 0
}

export function createDefaultProjectPlatformMarks(): ProjectPlatformMarks {
  return {
    values: [],
    assets: {},
    inference: DEFAULT_PLATFORM_MARK_INFERENCE,
  }
}

export function createDefaultProjectPlatformMarkAsset(
  value: PlatformMarkValue,
  selectedDiscTemplate?: DiscTemplate,
): ProjectPlatformMarkAsset {
  return {
    source: 'placeholder',
    theme: getDefaultPlatformMarkTheme(value),
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

export function createProjectPlatformMarkInference(
  inference: Partial<ProjectPlatformMarkInference> = {},
): ProjectPlatformMarkInference {
  return {
    source: inference.source ?? DEFAULT_PLATFORM_MARK_INFERENCE.source,
    status: inference.status ?? DEFAULT_PLATFORM_MARK_INFERENCE.status,
    steamAppId: inference.steamAppId ?? DEFAULT_PLATFORM_MARK_INFERENCE.steamAppId,
    values: inference.values ? Array.from(new Set(inference.values)) : [],
    message: inference.message ?? DEFAULT_PLATFORM_MARK_INFERENCE.message,
  }
}

export function getProjectPlatformMarkInference(
  platformMarks: ProjectPlatformMarks,
): ProjectPlatformMarkInference {
  return platformMarks.inference ?? DEFAULT_PLATFORM_MARK_INFERENCE
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

export function setProjectPlatformMarkValues(
  platformMarks: ProjectPlatformMarks,
  values: PlatformMarkValue[],
  selectedDiscTemplate?: DiscTemplate,
  inference?: ProjectPlatformMarkInference,
): ProjectPlatformMarks {
  const nextValues = Array.from(new Set(values))
  const selectedValues = new Set(nextValues)
  const touchedValues = Array.from(
    new Set([
      ...platformMarks.values,
      ...Object.keys(platformMarks.assets).filter(isPlatformMarkValue),
      ...nextValues,
    ]),
  )
  const assets = { ...platformMarks.assets }

  touchedValues.forEach((value) => {
    const currentAsset = getProjectPlatformMarkAsset(
      platformMarks,
      value,
      selectedDiscTemplate,
    )

    assets[value] = {
      ...currentAsset,
      layout: {
        ...currentAsset.layout,
        enabled: selectedValues.has(value),
      },
    }
  })

  return {
    ...platformMarks,
    values: nextValues,
    assets,
    ...(inference ? { inference } : {}),
  }
}

export function markProjectPlatformMarksManual(
  platformMarks: ProjectPlatformMarks,
  steamAppId: number | null = getProjectPlatformMarkInference(platformMarks).steamAppId,
): ProjectPlatformMarks {
  return {
    ...platformMarks,
    inference: createProjectPlatformMarkInference({
      source: 'manual',
      status: 'manual',
      steamAppId,
      values: platformMarks.values,
      message:
        'Operating system marks were manually edited and will remain editable.',
    }),
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

export function updatePlatformMarkTheme(
  platformMarks: ProjectPlatformMarks,
  value: PlatformMarkValue,
  theme: PlatformMarkTheme,
  selectedDiscTemplate?: DiscTemplate,
): ProjectPlatformMarks {
  const currentAsset = getProjectPlatformMarkAsset(
    platformMarks,
    value,
    selectedDiscTemplate,
  )

  return setProjectPlatformMarkAsset(platformMarks, value, {
    ...currentAsset,
    theme: normalizePlatformMarkTheme(value, theme),
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

function isPlatformMarkValue(value: unknown): value is PlatformMarkValue {
  return PLATFORM_MARK_VALUES.includes(value as PlatformMarkValue)
}

function isPlatformMarkTheme(value: unknown): value is PlatformMarkTheme {
  return PLATFORM_MARK_THEME_OPTIONS.some((option) => option.value === value)
}

function isPlatformMarkThemeForValue(
  value: PlatformMarkValue,
  theme: PlatformMarkTheme,
) {
  return getPlatformMarkThemeOptions(value).some((option) => option.value === theme)
}

function normalizePlatformMarkTheme(
  value: PlatformMarkValue,
  theme: PlatformMarkTheme,
) {
  return isPlatformMarkThemeForValue(value, theme)
    ? theme
    : getDefaultPlatformMarkTheme(value)
}

function isPlatformMarkInferenceSource(
  value: unknown,
): value is ProjectPlatformMarkInference['source'] {
  return value === 'none' || value === 'manual' || value === 'steam-appdetails'
}

function isPlatformMarkInferenceStatus(
  value: unknown,
): value is ProjectPlatformMarkInference['status'] {
  return (
    value === 'not-applied' ||
    value === 'manual' ||
    value === 'applied' ||
    value === 'no-data'
  )
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
  const theme = isPlatformMarkTheme(asset?.theme)
    ? normalizePlatformMarkTheme(value, asset.theme)
    : getDefaultPlatformMarkTheme(value)
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
    theme,
    customImageDataUrl: asset?.customImageDataUrl ?? null,
    customImageSize,
    layout: normalizePlatformMarkLayout(asset?.layout, defaultLayout),
  }
}

function normalizeProjectPlatformMarkInference(
  inference: unknown,
  values: PlatformMarkValue[],
  manualSteamAppId?: number | null,
): ProjectPlatformMarkInference {
  if (!inference || typeof inference !== 'object') {
    if (values.length > 0) {
      return createProjectPlatformMarkInference({
        source: 'manual',
        status: 'manual',
        steamAppId: manualSteamAppId ?? null,
        values,
        message:
          'Existing project operating system marks are treated as manual selections.',
      })
    }

    return DEFAULT_PLATFORM_MARK_INFERENCE
  }

  const rawInference = inference as Partial<ProjectPlatformMarkInference>
  const source = isPlatformMarkInferenceSource(rawInference.source)
    ? rawInference.source
    : DEFAULT_PLATFORM_MARK_INFERENCE.source
  const status = isPlatformMarkInferenceStatus(rawInference.status)
    ? rawInference.status
    : DEFAULT_PLATFORM_MARK_INFERENCE.status
  const rawValues = Array.isArray(rawInference.values) ? rawInference.values : values
  const inferenceValues = Array.from(
    new Set(rawValues.filter(isPlatformMarkValue)),
  )

  return createProjectPlatformMarkInference({
    source,
    status,
    steamAppId:
      typeof rawInference.steamAppId === 'number'
        ? rawInference.steamAppId
        : null,
    values: inferenceValues,
    message:
      typeof rawInference.message === 'string' && rawInference.message.trim()
        ? rawInference.message
        : DEFAULT_PLATFORM_MARK_INFERENCE.message,
  })
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

export function normalizeProjectPlatformMarks(
  platformMarks: Partial<ProjectPlatformMarks> | undefined,
  legacyMediaMark?: Partial<ProjectMediaMark>,
  selectedDiscTemplate?: DiscTemplate,
  manualSteamAppId?: number | null,
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
        inference: normalizeProjectPlatformMarkInference(
          rawPlatformMarks.inference,
          values,
          manualSteamAppId,
        ),
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
      inference: normalizeProjectPlatformMarkInference(
        rawPlatformMarks.inference,
        legacyValues,
        manualSteamAppId,
      ),
      assets: Object.fromEntries(
        values.map((value, index) => [
          value,
          {
            source:
              index === 0 && rawPlatformMarks.source === 'custom'
                ? 'custom'
                : 'placeholder',
            theme: getDefaultPlatformMarkTheme(value),
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
    inference: createProjectPlatformMarkInference({
      source: 'manual',
      status: 'manual',
      steamAppId: manualSteamAppId ?? null,
      values: legacyLayout.enabled ? [legacyValue] : [],
      message:
        'Legacy operating system mark data is treated as a manual selection.',
    }),
    assets: {
      [legacyValue]: {
        source: legacyMediaMark?.source === 'custom' ? 'custom' : 'placeholder',
        theme: getDefaultPlatformMarkTheme(legacyValue),
        customImageDataUrl: legacyMediaMark?.customImageDataUrl ?? null,
        customImageSize: legacyMediaMark?.customImageSize ?? null,
        layout: legacyLayout,
      },
    },
  }
}
