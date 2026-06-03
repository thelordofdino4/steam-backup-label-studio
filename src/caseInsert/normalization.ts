import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  type SupportedCaseInsertTemplateType,
} from '../editor/editorTypes.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
  normalizeProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import type {
  BackgroundImageSize,
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectCaseInsertTextSource,
  ProjectImageAssetProvenance,
  ProjectJewelCaseBackState,
  ProjectJewelCaseExportSettings,
  ProjectJewelCaseFrontState,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type {
  JewelCaseGuideId,
  JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates.ts'
import {
  DEFAULT_CASE_INSERT_SURFACES,
  DEFAULT_JEWEL_CASE_GUIDE_IDS,
  JEWEL_CASE_GUIDE_IDS,
  createDefaultCaseInsertImageSlot,
  createDefaultCaseInsertTextBlock,
  createDefaultJewelCaseBackState,
  createDefaultJewelCaseFrontState,
  createDefaultJewelCaseSpineState,
} from './defaults.ts'

export type JsonRecord = Record<string, unknown>

export function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

export function normalizeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function normalizeTextValue(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function normalizeNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback
}

export function normalizeCaseInsertTemplateType(
  value: unknown,
): SupportedCaseInsertTemplateType {
  return value === DEFAULT_CASE_INSERT_TEMPLATE_TYPE
    ? DEFAULT_CASE_INSERT_TEMPLATE_TYPE
    : DEFAULT_CASE_INSERT_TEMPLATE_TYPE
}

function normalizeCaseInsertImageFit(
  value: unknown,
  fallback: ProjectCaseInsertImageFit,
): ProjectCaseInsertImageFit {
  return value === 'cover' ||
    value === 'contain' ||
    value === 'scale' ||
    value === 'crop'
    ? value
    : fallback
}

function normalizeCaseInsertTextSource(
  value: unknown,
  fallback: ProjectCaseInsertTextSource,
): ProjectCaseInsertTextSource {
  return value === 'manual' || value === 'metadata' || value === 'steam'
    ? value
    : fallback
}

function normalizeCaseInsertTextAlign(
  value: unknown,
  fallback: ProjectCaseInsertTextAlign,
): ProjectCaseInsertTextAlign {
  return value === 'left' || value === 'center' || value === 'right'
    ? value
    : fallback
}

function normalizeImageSize(value: unknown): BackgroundImageSize | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const width = normalizePositiveNumber(record.width, 0)
  const height = normalizePositiveNumber(record.height, 0)

  return width > 0 && height > 0 ? { width, height } : null
}

function normalizeCaseInsertLayout(
  value: unknown,
  defaults: ProjectCaseInsertLayout,
): ProjectCaseInsertLayout {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    scale: normalizePositiveNumber(record.scale, defaults.scale),
    x: normalizeFiniteNumber(record.x, defaults.x),
    y: normalizeFiniteNumber(record.y, defaults.y),
    rotation: normalizeFiniteNumber(record.rotation, defaults.rotation),
  }
}

function normalizeCaseInsertImageSlot(
  value: unknown,
  defaults: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  const imageDataUrl = normalizeNullableString(record.imageDataUrl)
  const rawImageSource = asRecord(record.imageSource)
  const fallbackImageSource = imageDataUrl
    ? createEmbeddedProjectImageAssetProvenance(defaults.label)
    : defaults.imageSource ?? null

  return {
    id: normalizeString(record.id, defaults.id),
    label: normalizeString(record.label, defaults.label),
    enabled: normalizeBoolean(record.enabled, defaults.enabled),
    imageDataUrl,
    imageSource: normalizeProjectImageAssetProvenance(
      rawImageSource as Partial<ProjectImageAssetProvenance> | null,
      fallbackImageSource,
    ),
    imageSize: normalizeImageSize(record.imageSize) ?? defaults.imageSize,
    fit: normalizeCaseInsertImageFit(record.fit, defaults.fit),
    layout: normalizeCaseInsertLayout(record.layout, defaults.layout),
  }
}

function normalizeCaseInsertImageSlotArray(
  value: unknown,
  idPrefix: string,
  labelPrefix: string,
) {
  return (asArray(value) ?? []).map((slot, index) =>
    normalizeCaseInsertImageSlot(
      slot,
      createDefaultCaseInsertImageSlot(
        `${idPrefix}-${index + 1}`,
        `${labelPrefix} ${index + 1}`,
      ),
    ),
  )
}

function normalizeCaseInsertTextBlock(
  value: unknown,
  defaults: ProjectCaseInsertTextBlock,
): ProjectCaseInsertTextBlock {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    id: normalizeString(record.id, defaults.id),
    label: normalizeString(record.label, defaults.label),
    enabled: normalizeBoolean(record.enabled, defaults.enabled),
    value: normalizeTextValue(record.value ?? record.text, defaults.value),
    source: normalizeCaseInsertTextSource(record.source, defaults.source),
    align: normalizeCaseInsertTextAlign(record.align, defaults.align),
    layout: normalizeCaseInsertLayout(record.layout, defaults.layout),
  }
}

function normalizeCaseInsertTextBlockArray(
  value: unknown,
  idPrefix: string,
  labelPrefix: string,
) {
  return (asArray(value) ?? []).map((textBlock, index) =>
    normalizeCaseInsertTextBlock(
      textBlock,
      createDefaultCaseInsertTextBlock(
        `${idPrefix}-${index + 1}`,
        `${labelPrefix} ${index + 1}`,
      ),
    ),
  )
}

export function normalizeTextListItems(value: unknown, fallbackItems: string[]) {
  const items = asArray(value)

  if (!items) {
    return fallbackItems
  }

  return items.flatMap((item) =>
    typeof item === 'string' && item.trim() ? [item.trim()] : [],
  )
}

function normalizeCaseInsertTextList(
  value: unknown,
  defaults: ProjectCaseInsertTextList,
): ProjectCaseInsertTextList {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    id: normalizeString(record.id, defaults.id),
    label: normalizeString(record.label, defaults.label),
    enabled: normalizeBoolean(record.enabled, defaults.enabled),
    items: normalizeTextListItems(record.items ?? record.values, defaults.items),
    source: normalizeCaseInsertTextSource(record.source, defaults.source),
    layout: normalizeCaseInsertLayout(record.layout, defaults.layout),
  }
}

function normalizeCaseInsertSurfaceState(
  value: unknown,
  defaults: ProjectCaseInsertSurfaceState,
  idPrefix: string,
  labelPrefix: string,
): ProjectCaseInsertSurfaceState {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    background: normalizeCaseInsertImageSlot(record.background, defaults.background),
    titleArtwork: normalizeCaseInsertImageSlot(
      record.titleArtwork,
      defaults.titleArtwork,
    ),
    artworkSlots: normalizeCaseInsertImageSlotArray(
      record.artworkSlots ?? record.artwork,
      `${idPrefix}-artwork`,
      `${labelPrefix} artwork`,
    ),
    logoSlots: normalizeCaseInsertImageSlotArray(
      record.logoSlots ?? record.logos,
      `${idPrefix}-logo`,
      `${labelPrefix} logo`,
    ),
    markSlots: normalizeCaseInsertImageSlotArray(
      record.markSlots ?? record.marks,
      `${idPrefix}-mark`,
      `${labelPrefix} mark`,
    ),
    textBlocks: normalizeCaseInsertTextBlockArray(
      record.textBlocks ?? record.text,
      `${idPrefix}-text`,
      `${labelPrefix} text`,
    ),
  }
}

function normalizeJewelCaseFrontState(value: unknown): ProjectJewelCaseFrontState {
  const defaults = createDefaultJewelCaseFrontState()
  const record = asRecord(value)
  const surfaceState = normalizeCaseInsertSurfaceState(
    record,
    defaults,
    'front',
    'Front',
  )

  return {
    ...surfaceState,
    calloutArtwork: normalizeCaseInsertImageSlot(
      record?.calloutArtwork,
      defaults.calloutArtwork,
    ),
    calloutText: normalizeCaseInsertTextBlock(
      record?.calloutText ?? record?.callout,
      defaults.calloutText,
    ),
  }
}

function normalizeJewelCaseBackState(value: unknown): ProjectJewelCaseBackState {
  const defaults = createDefaultJewelCaseBackState()
  const record = asRecord(value)
  const surfaceState = normalizeCaseInsertSurfaceState(
    record,
    defaults,
    'back',
    'Back',
  )

  return {
    ...surfaceState,
    screenshotSlots: record
      ? normalizeCaseInsertImageSlotArray(
          record.screenshotSlots ?? record.screenshots,
          'back-screenshot',
          'Back screenshot',
        )
      : defaults.screenshotSlots,
    description: normalizeCaseInsertTextBlock(
      record?.description,
      defaults.description,
    ),
    featureBullets: normalizeCaseInsertTextList(
      record?.featureBullets ?? record?.features,
      defaults.featureBullets,
    ),
    minimumRequirements: normalizeCaseInsertTextBlock(
      record?.minimumRequirements ?? record?.minimumSystemRequirements,
      defaults.minimumRequirements,
    ),
    recommendedRequirements: normalizeCaseInsertTextBlock(
      record?.recommendedRequirements ?? record?.recommendedSystemRequirements,
      defaults.recommendedRequirements,
    ),
    legalText: normalizeCaseInsertTextBlock(
      record?.legalText ?? record?.legal,
      defaults.legalText,
    ),
  }
}

function normalizeJewelCaseSpineSideState(
  value: unknown,
  defaults: ProjectJewelCaseSpineSideState,
): ProjectJewelCaseSpineSideState {
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    background: normalizeCaseInsertImageSlot(record.background, defaults.background),
    title: normalizeCaseInsertTextBlock(record.title ?? record.titleText, defaults.title),
    steamBackupBranding: normalizeCaseInsertImageSlot(
      record.steamBackupBranding ?? record.steamBackupLogo,
      defaults.steamBackupBranding,
    ),
    logo: normalizeCaseInsertImageSlot(record.logo, defaults.logo),
  }
}

function normalizeJewelCaseSpineState(
  value: unknown,
  title: string,
): ProjectJewelCaseSpineState {
  const defaults = createDefaultJewelCaseSpineState(title)
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  return {
    left: normalizeJewelCaseSpineSideState(record.left, defaults.left),
    right: normalizeJewelCaseSpineSideState(record.right, defaults.right),
  }
}

function isJewelCaseSurfaceId(value: unknown): value is JewelCaseSurfaceId {
  return value === 'front' || value === 'back'
}

function isJewelCaseGuideId(value: unknown): value is JewelCaseGuideId {
  return typeof value === 'string' &&
    JEWEL_CASE_GUIDE_IDS.includes(value as JewelCaseGuideId)
}

export function normalizeCaseInsertSurfaceIds(value: unknown): JewelCaseSurfaceId[] {
  const surfaceIds = (asArray(value) ?? []).filter(isJewelCaseSurfaceId)

  return surfaceIds.length > 0
    ? Array.from(new Set(surfaceIds))
    : [...DEFAULT_CASE_INSERT_SURFACES]
}

export function normalizeJewelCaseGuideIds(value: unknown): JewelCaseGuideId[] {
  const record = asRecord(value)

  if (record) {
    return JEWEL_CASE_GUIDE_IDS.filter((guideId) => record[guideId] === true)
  }

  const guideIds = asArray(value)

  if (guideIds) {
    return Array.from(new Set(guideIds.filter(isJewelCaseGuideId)))
  }

  return [...DEFAULT_JEWEL_CASE_GUIDE_IDS]
}

function normalizeJewelCaseExportSettings(
  value: unknown,
): ProjectJewelCaseExportSettings {
  const record = asRecord(value)

  if (!record) {
    return {
      surfaces: [...DEFAULT_CASE_INSERT_SURFACES],
      guideIds: [...DEFAULT_JEWEL_CASE_GUIDE_IDS],
    }
  }

  return {
    surfaces: normalizeCaseInsertSurfaceIds(record.surfaces),
    guideIds: normalizeJewelCaseGuideIds(record.guideIds ?? record.guides),
  }
}

export function normalizeProjectJewelCaseState(
  value: unknown,
  title = '',
  templateType: SupportedCaseInsertTemplateType = DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
): ProjectJewelCaseState {
  const record = asRecord(value)
  const normalizedTemplateType = normalizeCaseInsertTemplateType(
    record?.templateType ?? templateType,
  )

  return {
    templateType: normalizedTemplateType,
    front: normalizeJewelCaseFrontState(record?.front),
    back: normalizeJewelCaseBackState(record?.back),
    spine: normalizeJewelCaseSpineState(record?.spine, title),
    export: normalizeJewelCaseExportSettings(record?.export),
  }
}
