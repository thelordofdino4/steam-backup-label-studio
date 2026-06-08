import { getDefaultTechnicalMarkLayoutForTemplate } from '../layout/discTemplateLayoutDefaults.ts'
import {
  isOptionalVisualFeatureEnabled,
  setOptionalVisualFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import type { DiscTemplate } from '../types/template'
import type {
  BackgroundImageSize,
  ProjectTechnicalMarkAsset,
  ProjectTechnicalMarks,
  ProjectTechnicalMarksInput,
  TechnicalMarkLayout,
  TechnicalMarkSource,
  TechnicalMarkValue,
} from './projectTypes'
import {
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeImageSize,
  normalizeNullableString,
  normalizePositiveNumber,
  normalizeString,
} from './savedProjectNormalization.ts'

export type TechnicalMarkLayoutField = keyof TechnicalMarkLayout

export type ProjectTechnicalMarkAssetEntry = {
  value: TechnicalMarkValue
  asset: ProjectTechnicalMarkAsset
  assetId: string | null
  index: number
  isPrimary: boolean
}

type MarkLayoutPoint = {
  x: number
  y: number
}

let technicalMarkAssetIdCounter = 0

const FALLBACK_ADDITIONAL_TECHNICAL_MARK_X_OFFSET_PERCENT = 8
const FALLBACK_ADDITIONAL_TECHNICAL_MARK_Y_OFFSET_PERCENT = 6

export const TECHNICAL_MARK_OPTIONS: Array<{ value: TechnicalMarkValue; label: string }> = [
  { value: 'audio', label: 'Audio' },
  { value: 'surround', label: 'Surround' },
  { value: 'codec', label: 'Codec' },
  { value: 'middleware', label: 'Middleware' },
  { value: 'technology', label: 'Technology' },
]

export const DEFAULT_TECHNICAL_MARK_LAYOUT: TechnicalMarkLayout = {
  enabled: false,
  scale: 1,
  x: 63,
  y: 70,
}

const DEFAULT_TECHNICAL_MARK_LAYOUTS: Record<TechnicalMarkValue, TechnicalMarkLayout> = {
  audio: { enabled: true, scale: 1, x: 63, y: 70 },
  surround: { enabled: true, scale: 1, x: 76, y: 70 },
  codec: { enabled: true, scale: 1, x: 63, y: 80 },
  middleware: { enabled: true, scale: 1, x: 76, y: 80 },
  technology: { enabled: true, scale: 1, x: 63, y: 60 },
}

export function getTechnicalMarkLabel(value: TechnicalMarkValue) {
  return TECHNICAL_MARK_OPTIONS.find((option) => option.value === value)?.label ?? 'Audio'
}

function getDefaultTechnicalMarkAssetLabel(value: TechnicalMarkValue) {
  return value
}

function createTechnicalMarkAssetId(value: TechnicalMarkValue) {
  const randomId = globalThis.crypto?.randomUUID?.()

  if (randomId) {
    return `technical-${value}-${randomId}`
  }

  technicalMarkAssetIdCounter += 1

  return `technical-${value}-${Date.now().toString(36)}-${technicalMarkAssetIdCounter}`
}

function normalizeElementLabel(label: unknown, fallbackLabel: string) {
  return normalizeString(label, fallbackLabel)
}

export function createDefaultProjectTechnicalMarks(): ProjectTechnicalMarks {
  return {
    values: [],
    assets: {},
    additionalAssets: {},
  }
}

export function createDefaultProjectTechnicalMarkAsset(
  value: TechnicalMarkValue,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarkAsset {
  return {
    label: getDefaultTechnicalMarkAssetLabel(value),
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
    layout: selectedDiscTemplate
      ? getDefaultTechnicalMarkLayoutForTemplate(selectedDiscTemplate, value)
      : DEFAULT_TECHNICAL_MARK_LAYOUTS[value],
  }
}

function createAdditionalProjectTechnicalMarkAsset(
  value: TechnicalMarkValue,
  selectedDiscTemplate?: DiscTemplate,
  referenceLayout?: TechnicalMarkLayout,
): ProjectTechnicalMarkAsset {
  const defaultAsset = createDefaultProjectTechnicalMarkAsset(
    value,
    selectedDiscTemplate,
  )
  const layout = referenceLayout
    ? {
        ...referenceLayout,
        enabled: true,
        x: referenceLayout.x +
          FALLBACK_ADDITIONAL_TECHNICAL_MARK_X_OFFSET_PERCENT,
        y: referenceLayout.y +
          FALLBACK_ADDITIONAL_TECHNICAL_MARK_Y_OFFSET_PERCENT,
      }
    : defaultAsset.layout

  return {
    ...defaultAsset,
    id: createTechnicalMarkAssetId(value),
    label: getDefaultTechnicalMarkAssetLabel(value),
    layout: {
      ...layout,
      enabled: true,
      x: Math.max(0, Math.min(100, layout.x)),
      y: Math.max(0, Math.min(100, layout.y)),
    },
  }
}

function getProjectTechnicalMarkAdditionalAssets(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
) {
  return technicalMarks.additionalAssets?.[value] ?? []
}

export function getProjectTechnicalMarkAssetEntries(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarkAssetEntry[] {
  if (!technicalMarks.values.includes(value)) {
    return []
  }

  const primaryAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    selectedDiscTemplate,
  )
  const additionalAssets = getProjectTechnicalMarkAdditionalAssets(
    technicalMarks,
    value,
  )

  return [
    {
      value,
      asset: primaryAsset,
      assetId: null,
      index: 0,
      isPrimary: true,
    },
    ...additionalAssets.map((asset, index) => ({
      value,
      asset,
      assetId: asset.id ?? null,
      index: index + 1,
      isPrimary: false,
    })),
  ]
}

export function getAllProjectTechnicalMarkAssetEntries(
  technicalMarks: ProjectTechnicalMarks,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarkAssetEntry[] {
  return technicalMarks.values.flatMap((value) =>
    getProjectTechnicalMarkAssetEntries(
      technicalMarks,
      value,
      selectedDiscTemplate,
    ))
}

export function getProjectTechnicalMarkAsset(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  selectedDiscTemplate?: DiscTemplate,
  assetId?: string | null,
) {
  if (assetId) {
    const additionalAsset = getProjectTechnicalMarkAdditionalAssets(
      technicalMarks,
      value,
    ).find((asset) => asset.id === assetId)

    if (additionalAsset) {
      return additionalAsset
    }
  }

  return technicalMarks.assets[value] ??
    createDefaultProjectTechnicalMarkAsset(value, selectedDiscTemplate)
}

function setProjectTechnicalMarkAsset(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  asset: ProjectTechnicalMarkAsset,
  assetId?: string | null,
): ProjectTechnicalMarks {
  if (assetId) {
    const additionalAssets = getProjectTechnicalMarkAdditionalAssets(
      technicalMarks,
      value,
    )
    const nextAssets = additionalAssets.some((currentAsset) =>
      currentAsset.id === assetId)
      ? additionalAssets.map((currentAsset) =>
          currentAsset.id === assetId
            ? { ...asset, id: assetId }
            : currentAsset)
      : [
          ...additionalAssets,
          { ...asset, id: assetId },
        ]

    return {
      ...technicalMarks,
      additionalAssets: {
        ...technicalMarks.additionalAssets,
        [value]: nextAssets,
      },
    }
  }

  return {
    ...technicalMarks,
    assets: {
      ...technicalMarks.assets,
      [value]: asset,
    },
  }
}

export function updateTechnicalMarkToggle(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  enabled: boolean,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarks {
  const values = enabled
    ? Array.from(new Set([...technicalMarks.values, value]))
    : technicalMarks.values.filter((currentValue) => currentValue !== value)
  const currentAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    selectedDiscTemplate,
  )

  const nextTechnicalMarks = setProjectTechnicalMarkAsset(
    {
      ...technicalMarks,
      values,
    },
    value,
    {
      ...currentAsset,
      layout: setOptionalVisualFeatureEnabled(currentAsset.layout, enabled),
    },
  )

  if (enabled) {
    return nextTechnicalMarks
  }

  const additionalAssets = getProjectTechnicalMarkAdditionalAssets(
    nextTechnicalMarks,
    value,
  )

  if (additionalAssets.length === 0) {
    return nextTechnicalMarks
  }

  return {
    ...nextTechnicalMarks,
    additionalAssets: {
      ...nextTechnicalMarks.additionalAssets,
      [value]: additionalAssets.map((asset) => ({
        ...asset,
        layout: setOptionalVisualFeatureEnabled(asset.layout, false),
      })),
    },
  }
}

export function getEnabledTechnicalMarkValues(
  technicalMarks: ProjectTechnicalMarks,
): TechnicalMarkValue[] {
  return technicalMarks.values.filter(
    (value) => {
      const primaryEnabled =
        isOptionalVisualFeatureEnabled(
          getProjectTechnicalMarkAsset(technicalMarks, value).layout,
        )
      const additionalEnabled = getProjectTechnicalMarkAdditionalAssets(
        technicalMarks,
        value,
      ).some((asset) => isOptionalVisualFeatureEnabled(asset.layout))

      return primaryEnabled || additionalEnabled
    },
  )
}

export function getTechnicalMarkValuesForRestore(
  technicalMarks: ProjectTechnicalMarks,
  rememberedValues: TechnicalMarkValue[],
): TechnicalMarkValue[] {
  if (technicalMarks.values.length > 0) {
    return technicalMarks.values
  }

  if (rememberedValues.length > 0) {
    return rememberedValues
  }

  return ['audio']
}

export function getTechnicalMarkValuesForRemember(
  technicalMarks: ProjectTechnicalMarks,
): TechnicalMarkValue[] {
  return technicalMarks.values
}

export function setTechnicalMarkCustomImage(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  imageDataUrl: string,
  imageSize: BackgroundImageSize,
  selectedDiscTemplate?: DiscTemplate,
  assetId?: string | null,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    selectedDiscTemplate,
    assetId,
  )

  return setProjectTechnicalMarkAsset(
    {
      ...technicalMarks,
      values: Array.from(new Set([...technicalMarks.values, value])),
    },
    value,
    {
      ...currentAsset,
      source: 'custom',
      customImageDataUrl: imageDataUrl,
      customImageSize: imageSize,
      layout: setOptionalVisualFeatureEnabled(currentAsset.layout, true),
    },
    assetId,
  )
}

export function updateTechnicalMarkSource(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  source: TechnicalMarkSource,
  assetId?: string | null,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    undefined,
    assetId,
  )

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    source,
  }, assetId)
}

export function updateTechnicalMarkLabel(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  label: string,
  assetId?: string | null,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    undefined,
    assetId,
  )

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    label,
  }, assetId)
}

export function updateTechnicalMarkLayoutField(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  field: TechnicalMarkLayoutField,
  layoutValue: boolean | number,
  assetId?: string | null,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    undefined,
    assetId,
  )

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    layout: {
      ...currentAsset.layout,
      [field]: layoutValue,
    },
  }, assetId)
}

export function updateTechnicalMarkLayoutPosition(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  point: MarkLayoutPoint,
  assetId?: string | null,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    undefined,
    assetId,
  )

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    layout: {
      ...currentAsset.layout,
      x: point.x,
      y: point.y,
    },
  }, assetId)
}

export function clearTechnicalMarkImage(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  assetId?: string | null,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    undefined,
    assetId,
  )

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
  }, assetId)
}

export function resetProjectTechnicalMarkLayout(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  selectedDiscTemplate?: DiscTemplate,
  assetId?: string | null,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    selectedDiscTemplate,
    assetId,
  )
  const defaultLayout = selectedDiscTemplate
    ? getDefaultTechnicalMarkLayoutForTemplate(
        selectedDiscTemplate,
        value,
        currentAsset,
      )
    : createDefaultProjectTechnicalMarkAsset(value).layout

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    layout: {
      ...defaultLayout,
      enabled: currentAsset.layout.enabled,
    },
  }, assetId)
}

export function addTechnicalMarkAsset(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarks {
  const additionalAssets = getProjectTechnicalMarkAdditionalAssets(
    technicalMarks,
    value,
  )
  const primaryAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    selectedDiscTemplate,
  )
  const previousAsset = additionalAssets[additionalAssets.length - 1] ??
    primaryAsset
  const nextAsset = createAdditionalProjectTechnicalMarkAsset(
    value,
    selectedDiscTemplate,
    previousAsset.layout,
  )

  return {
    ...technicalMarks,
    values: Array.from(new Set([...technicalMarks.values, value])),
    additionalAssets: {
      ...technicalMarks.additionalAssets,
      [value]: [...additionalAssets, nextAsset],
    },
  }
}

export function removeTechnicalMarkAsset(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  assetId: string,
): ProjectTechnicalMarks {
  const additionalAssets = getProjectTechnicalMarkAdditionalAssets(
    technicalMarks,
    value,
  )
  const nextAssets = additionalAssets.filter((asset) => asset.id !== assetId)

  return {
    ...technicalMarks,
    additionalAssets: {
      ...technicalMarks.additionalAssets,
      [value]: nextAssets,
    },
  }
}

function isTechnicalMarkValue(value: unknown): value is TechnicalMarkValue {
  return TECHNICAL_MARK_OPTIONS.some((option) => option.value === value)
}

function normalizeTechnicalMarkLayout(
  layout: Partial<TechnicalMarkLayout> | undefined,
  defaultLayout: TechnicalMarkLayout = DEFAULT_TECHNICAL_MARK_LAYOUT,
): TechnicalMarkLayout {
  return {
    enabled: normalizeBoolean(layout?.enabled, defaultLayout.enabled),
    scale: normalizePositiveNumber(layout?.scale, defaultLayout.scale),
    x: normalizeFiniteNumber(layout?.x, defaultLayout.x),
    y: normalizeFiniteNumber(layout?.y, defaultLayout.y),
  }
}

function normalizeTechnicalMarkAsset(
  value: TechnicalMarkValue,
  asset: Partial<ProjectTechnicalMarkAsset> | undefined,
  selectedDiscTemplate?: DiscTemplate,
  fallbackId?: string,
): ProjectTechnicalMarkAsset {
  const source = asset?.source === 'custom' ? 'custom' : 'placeholder'
  const customImageSize = normalizeImageSize(asset?.customImageSize)
  const defaults = createDefaultProjectTechnicalMarkAsset(value, selectedDiscTemplate)
  const defaultLayout = selectedDiscTemplate
    ? getDefaultTechnicalMarkLayoutForTemplate(selectedDiscTemplate, value, {
        source,
        customImageSize,
      })
    : defaults.layout

  return {
    ...(fallbackId || asset?.id ? {
      id: typeof asset?.id === 'string' && asset.id.trim()
        ? asset.id
        : fallbackId,
    } : {}),
    label: normalizeElementLabel(
      asset?.label,
      getDefaultTechnicalMarkAssetLabel(value),
    ),
    source,
    customImageDataUrl: normalizeNullableString(asset?.customImageDataUrl),
    customImageSize,
    layout: normalizeTechnicalMarkLayout(asset?.layout, defaultLayout),
  }
}

function normalizeAdditionalTechnicalMarkAssets(
  value: TechnicalMarkValue,
  assets: Array<Partial<ProjectTechnicalMarkAsset>> | undefined,
  selectedDiscTemplate?: DiscTemplate,
) {
  if (!Array.isArray(assets)) {
    return []
  }

  return assets.map((asset) =>
    normalizeTechnicalMarkAsset(
      value,
      asset,
      selectedDiscTemplate,
      createTechnicalMarkAssetId(value),
    ))
}

export function normalizeProjectTechnicalMarks(
  technicalMarks: ProjectTechnicalMarksInput | undefined,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarks {
  const defaults = createDefaultProjectTechnicalMarks()
  const rawValues = Array.isArray(technicalMarks?.values) ? technicalMarks.values : null
  const values = rawValues
    ? Array.from(new Set(rawValues.filter(isTechnicalMarkValue)))
    : defaults.values
  const rawAssets = technicalMarks?.assets
  const rawAdditionalAssets = technicalMarks?.additionalAssets

  if (!technicalMarks) {
    return defaults
  }

  return {
    values,
    assets: Object.fromEntries(
      values.map((value) => [
        value,
        normalizeTechnicalMarkAsset(
          value,
          rawAssets && typeof rawAssets === 'object' ? rawAssets[value] : undefined,
          selectedDiscTemplate,
        ),
      ]),
    ) as ProjectTechnicalMarks['assets'],
    additionalAssets: Object.fromEntries(
      TECHNICAL_MARK_OPTIONS.map(({ value }) => [
        value,
        normalizeAdditionalTechnicalMarkAssets(
          value,
          rawAdditionalAssets && typeof rawAdditionalAssets === 'object'
            ? rawAdditionalAssets[value]
            : undefined,
          selectedDiscTemplate,
        ),
      ]).filter(([, assets]) => assets.length > 0),
    ) as ProjectTechnicalMarks['additionalAssets'],
  }
}
