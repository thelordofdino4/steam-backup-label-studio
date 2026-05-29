import { getDefaultTechnicalMarkLayoutForTemplate } from '../layout/discTemplateLayoutDefaults.ts'
import type { DiscTemplate } from '../types/template'
import type {
  BackgroundImageSize,
  ProjectTechnicalMarkAsset,
  ProjectTechnicalMarks,
  TechnicalMarkLayout,
  TechnicalMarkSource,
  TechnicalMarkValue,
} from './projectTypes'

export type TechnicalMarkLayoutField = keyof TechnicalMarkLayout

type MarkLayoutPoint = {
  x: number
  y: number
}

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

export function createDefaultProjectTechnicalMarks(): ProjectTechnicalMarks {
  return {
    values: [],
    assets: {},
  }
}

export function createDefaultProjectTechnicalMarkAsset(
  value: TechnicalMarkValue,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarkAsset {
  return {
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
    layout: selectedDiscTemplate
      ? getDefaultTechnicalMarkLayoutForTemplate(selectedDiscTemplate, value)
      : DEFAULT_TECHNICAL_MARK_LAYOUTS[value],
  }
}

export function getProjectTechnicalMarkAsset(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  selectedDiscTemplate?: DiscTemplate,
) {
  return technicalMarks.assets[value] ??
    createDefaultProjectTechnicalMarkAsset(value, selectedDiscTemplate)
}

function setProjectTechnicalMarkAsset(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  asset: ProjectTechnicalMarkAsset,
): ProjectTechnicalMarks {
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

  return setProjectTechnicalMarkAsset(
    {
      ...technicalMarks,
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

export function getEnabledTechnicalMarkValues(
  technicalMarks: ProjectTechnicalMarks,
): TechnicalMarkValue[] {
  return technicalMarks.values.filter(
    (value) => getProjectTechnicalMarkAsset(technicalMarks, value).layout.enabled,
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
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(
    technicalMarks,
    value,
    selectedDiscTemplate,
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
      layout: {
        ...currentAsset.layout,
        enabled: true,
      },
    },
  )
}

export function updateTechnicalMarkSource(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  source: TechnicalMarkSource,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(technicalMarks, value)

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    source,
  })
}

export function updateTechnicalMarkLayoutField(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  field: TechnicalMarkLayoutField,
  layoutValue: boolean | number,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(technicalMarks, value)

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    layout: {
      ...currentAsset.layout,
      [field]: layoutValue,
    },
  })
}

export function updateTechnicalMarkLayoutPosition(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  point: MarkLayoutPoint,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(technicalMarks, value)

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    layout: {
      ...currentAsset.layout,
      x: point.x,
      y: point.y,
    },
  })
}

export function clearTechnicalMarkImage(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(technicalMarks, value)

  return setProjectTechnicalMarkAsset(technicalMarks, value, {
    ...currentAsset,
    source: 'placeholder',
    customImageDataUrl: null,
    customImageSize: null,
  })
}

export function resetProjectTechnicalMarkLayout(
  technicalMarks: ProjectTechnicalMarks,
  value: TechnicalMarkValue,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarks {
  const currentAsset = getProjectTechnicalMarkAsset(technicalMarks, value)
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
  })
}

function isTechnicalMarkValue(value: unknown): value is TechnicalMarkValue {
  return TECHNICAL_MARK_OPTIONS.some((option) => option.value === value)
}

function normalizeTechnicalMarkLayout(
  layout: Partial<TechnicalMarkLayout> | undefined,
  defaultLayout: TechnicalMarkLayout = DEFAULT_TECHNICAL_MARK_LAYOUT,
): TechnicalMarkLayout {
  return {
    enabled: layout?.enabled ?? defaultLayout.enabled,
    scale: layout?.scale ?? defaultLayout.scale,
    x: layout?.x ?? defaultLayout.x,
    y: layout?.y ?? defaultLayout.y,
  }
}

function normalizeTechnicalMarkAsset(
  value: TechnicalMarkValue,
  asset: Partial<ProjectTechnicalMarkAsset> | undefined,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarkAsset {
  const source = asset?.source === 'custom' ? 'custom' : 'placeholder'
  const customImageSize = asset?.customImageSize ?? null
  const defaults = createDefaultProjectTechnicalMarkAsset(value, selectedDiscTemplate)
  const defaultLayout = selectedDiscTemplate
    ? getDefaultTechnicalMarkLayoutForTemplate(selectedDiscTemplate, value, {
        source,
        customImageSize,
      })
    : defaults.layout

  return {
    source,
    customImageDataUrl: asset?.customImageDataUrl ?? null,
    customImageSize,
    layout: normalizeTechnicalMarkLayout(asset?.layout, defaultLayout),
  }
}

export function normalizeProjectTechnicalMarks(
  technicalMarks: Partial<ProjectTechnicalMarks> | undefined,
  selectedDiscTemplate?: DiscTemplate,
): ProjectTechnicalMarks {
  const defaults = createDefaultProjectTechnicalMarks()
  const rawValues = Array.isArray(technicalMarks?.values) ? technicalMarks.values : null
  const values = rawValues
    ? Array.from(new Set(rawValues.filter(isTechnicalMarkValue)))
    : defaults.values
  const rawAssets = technicalMarks?.assets

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
  }
}
