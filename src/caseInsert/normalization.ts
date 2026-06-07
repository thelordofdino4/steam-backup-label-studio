import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  type SupportedCaseInsertTemplateType,
} from '../editor/editorTypes.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
  normalizeProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import {
  normalizeAdditionalArtworkFrame,
} from '../project/additionalArtworkFrame.ts'
import type {
  BackgroundImageSize,
  ProjectCaseInsertImageFit,
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTitleArtworkDefaultAsset,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectCaseInsertTextSource,
  ProjectImageAssetProvenance,
  ProjectJewelCaseExportSettings,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseSpineState,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import {
  type CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'
import type {
  JewelCaseGuideId,
  JewelCaseSurfaceId,
} from '../templates/caseInsertTemplates.ts'
import {
  DEFAULT_CASE_INSERT_SURFACES,
  DEFAULT_JEWEL_CASE_EXPORT_GUIDE_IDS,
  JEWEL_CASE_GUIDE_IDS,
  createDefaultCaseInsertImageSlot,
  createDefaultCaseInsertTextBlock,
  createDefaultCaseInsertTextList,
  createDefaultCaseInsertCoverTemplateState,
  createDefaultCaseInsertTrayTemplateState,
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

function normalizeCaseInsertTitleArtworkDefaultSteamLogo(
  value: unknown,
): ProjectCaseInsertTitleArtworkDefaultAsset | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const steamArtworkAssetId = normalizeNullableString(
    record.steamArtworkAssetId,
  )
  const imageDataUrl = normalizeNullableString(record.imageDataUrl)
  const imageSize = normalizeImageSize(record.imageSize)

  if (!steamArtworkAssetId || !imageDataUrl || !imageSize) {
    return null
  }

  return {
    steamArtworkAssetId,
    sourceLabel: normalizeString(record.sourceLabel, 'Steam CDN logo'),
    sourceUrl: normalizeNullableString(record.sourceUrl),
    imageDataUrl,
    imageSize,
  }
}

function inferCaseInsertTitleArtworkDefaultSteamLogo(
  imageDataUrl: string | null,
  imageSize: BackgroundImageSize | null,
  imageSource: ProjectImageAssetProvenance | null,
): ProjectCaseInsertTitleArtworkDefaultAsset | null {
  if (
    !imageDataUrl ||
    !imageSize ||
    imageSource?.source !== 'steam-artwork' ||
    !imageSource.sourceId
  ) {
    return null
  }

  return {
    steamArtworkAssetId: imageSource.sourceId,
    sourceLabel: imageSource.sourceLabel,
    sourceUrl: imageSource.sourceUrl ?? null,
    imageDataUrl,
    imageSize,
  }
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
  options: { supportsSteamDefaultLogo?: boolean } = {},
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
  const imageSource = normalizeProjectImageAssetProvenance(
    rawImageSource as Partial<ProjectImageAssetProvenance> | null,
    fallbackImageSource,
  )
  const defaultSteamLogo = options.supportsSteamDefaultLogo
    ? normalizeCaseInsertTitleArtworkDefaultSteamLogo(record.defaultSteamLogo) ??
      inferCaseInsertTitleArtworkDefaultSteamLogo(
        imageDataUrl,
        normalizeImageSize(record.imageSize) ?? defaults.imageSize,
        imageSource,
      ) ??
      defaults.defaultSteamLogo
    : null

  return {
    id: normalizeString(record.id, defaults.id),
    label: normalizeString(record.label, defaults.label),
    enabled: normalizeBoolean(record.enabled, defaults.enabled),
    imageDataUrl,
    imageSource,
    imageSize: normalizeImageSize(record.imageSize) ?? defaults.imageSize,
    defaultSteamLogo,
    fit: normalizeCaseInsertImageFit(record.fit, defaults.fit),
    layout: normalizeCaseInsertLayout(record.layout, defaults.layout),
    frame: normalizeAdditionalArtworkFrame(record.frame, defaults.frame),
  }
}

function normalizeCaseInsertImageSlotArray(
  value: unknown,
  idPrefix: string,
  labelPrefix: string,
  defaults: ProjectCaseInsertImageSlot[] = [],
) {
  const slots = asArray(value)

  if (!slots) {
    return defaults
  }

  return slots.map((slot, index) =>
    normalizeCaseInsertImageSlot(
      slot,
      defaults[index] ??
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
  defaults: ProjectCaseInsertTextBlock[] = [],
) {
  const textBlocks = asArray(value)

  if (!textBlocks) {
    return defaults
  }

  return textBlocks.map((textBlock, index) =>
    normalizeCaseInsertTextBlock(
      textBlock,
      defaults[index] ??
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

function normalizeCaseInsertTextListArray(
  value: unknown,
  idPrefix: string,
  labelPrefix: string,
  defaults: ProjectCaseInsertTextList[] = [],
) {
  const textLists = asArray(value)

  if (!textLists) {
    return defaults
  }

  return textLists.map((textList, index) =>
    normalizeCaseInsertTextList(
      textList,
      defaults[index] ??
        createDefaultCaseInsertTextList(
          `${idPrefix}-${index + 1}`,
          `${labelPrefix} ${index + 1}`,
        ),
    ),
  )
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
  const rawArtworkSlots = record.artworkSlots ?? record.artwork
  const artworkSlots = normalizeCaseInsertImageSlotArray(
    rawArtworkSlots,
    `${idPrefix}-artwork`,
    'Artwork',
    defaults.artworkSlots,
  )
  const savedArtworkSlots = asArray(rawArtworkSlots)
  const inferredAdditionalArtworkEnabled = savedArtworkSlots
    ? artworkSlots.length > 0
    : defaults.additionalArtworkEnabled

  return {
    background: normalizeCaseInsertImageSlot(record.background, defaults.background),
    titleArtwork: normalizeCaseInsertImageSlot(
      record.titleArtwork,
      defaults.titleArtwork,
      { supportsSteamDefaultLogo: true },
    ),
    additionalArtworkEnabled: normalizeBoolean(
      record.additionalArtworkEnabled ?? record.artworkEnabled,
      inferredAdditionalArtworkEnabled,
    ),
    artworkSlots,
    logoSlots: normalizeCaseInsertImageSlotArray(
      record.logoSlots ?? record.logos,
      `${idPrefix}-logo`,
      `${labelPrefix} logo`,
      defaults.logoSlots,
    ),
    markSlots: normalizeCaseInsertImageSlotArray(
      record.markSlots ?? record.marks,
      `${idPrefix}-mark`,
      `${labelPrefix} mark`,
      defaults.markSlots,
    ),
    textBlocks: normalizeCaseInsertTextBlockArray(
      record.textBlocks ?? record.text,
      `${idPrefix}-text`,
      `${labelPrefix} text`,
      defaults.textBlocks,
    ),
    textLists: normalizeCaseInsertTextListArray(
      record.textLists ?? record.lists,
      `${idPrefix}-list`,
      `${labelPrefix} list`,
      defaults.textLists,
    ),
  }
}

function normalizeCaseInsertCoverTemplateState(value: unknown):
ProjectCaseInsertSurfaceState {
  const defaults = createDefaultCaseInsertCoverTemplateState()
  const record = asRecord(value)
  const artworkSlotsValue = record?.artworkSlots ??
    record?.artwork ??
    (record?.calloutArtwork ? [record.calloutArtwork] : undefined)
  const textBlocksValue = record?.textBlocks ??
    record?.text ??
    (record?.calloutText || record?.callout
      ? [record.calloutText ?? record.callout]
      : undefined)

  return normalizeCaseInsertSurfaceState(
    record
      ? {
          ...record,
          artworkSlots: artworkSlotsValue,
          textBlocks: textBlocksValue,
        }
      : record,
    defaults,
    'cover',
    'Cover sheet',
  )
}

function normalizeCaseInsertTrayTemplateState(value: unknown):
ProjectCaseInsertSurfaceState {
  const defaults = createDefaultCaseInsertTrayTemplateState()
  const record = asRecord(value)
  const textBlockAliases = record
    ? [
        record.description,
        record.minimumRequirements ?? record.minimumSystemRequirements,
        record.recommendedRequirements ?? record.recommendedSystemRequirements,
        record.legalText ?? record.legal,
      ]
    : []
  const textBlocksValue = record?.textBlocks ??
    record?.text ??
    (textBlockAliases.some(Boolean) ? textBlockAliases : undefined)
  const textListsValue = record?.textLists ??
    record?.lists ??
    (record?.featureBullets || record?.features
      ? [record.featureBullets ?? record.features]
      : undefined)

  return normalizeCaseInsertSurfaceState(
    record
      ? {
          ...record,
          artworkSlots: record.artworkSlots ??
            record.artwork ??
            record.screenshotSlots ??
            record.screenshots,
          textBlocks: textBlocksValue,
          textLists: textListsValue,
        }
      : record,
    defaults,
    'tray',
    'Tray card',
  )
}

function normalizeCaseInsertTemplateStates(value: unknown):
Record<CaseInsertTemplatePaneId, ProjectCaseInsertSurfaceState> {
  const record = asRecord(value)

  return {
    cover: normalizeCaseInsertCoverTemplateState(record?.cover),
    tray: normalizeCaseInsertTrayTemplateState(record?.tray),
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
  const rawArtworkSlots = record.artworkSlots ?? record.artwork
  const artworkSlots = normalizeCaseInsertImageSlotArray(
    rawArtworkSlots,
    `${defaults.background.id.replace('-background', '')}-artwork`,
    'Artwork',
    defaults.artworkSlots,
  )
  const savedArtworkSlots = asArray(rawArtworkSlots)
  const inferredAdditionalArtworkEnabled = savedArtworkSlots
    ? artworkSlots.length > 0
    : defaults.additionalArtworkEnabled

  return {
    background: normalizeCaseInsertImageSlot(record.background, defaults.background),
    titleArtwork: normalizeCaseInsertImageSlot(
      record.titleArtwork,
      defaults.titleArtwork,
      { supportsSteamDefaultLogo: true },
    ),
    additionalArtworkEnabled: normalizeBoolean(
      record.additionalArtworkEnabled ?? record.artworkEnabled,
      inferredAdditionalArtworkEnabled,
    ),
    artworkSlots,
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

  return [...DEFAULT_JEWEL_CASE_EXPORT_GUIDE_IDS]
}

function normalizeJewelCaseExportSettings(
  value: unknown,
): ProjectJewelCaseExportSettings {
  const record = asRecord(value)

  if (!record) {
    return {
      surfaces: [...DEFAULT_CASE_INSERT_SURFACES],
      guideIds: [...DEFAULT_JEWEL_CASE_EXPORT_GUIDE_IDS],
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
  const templateRecord = asRecord(record?.templates)
  const templates = templateRecord
    ? normalizeCaseInsertTemplateStates(templateRecord)
    : {
        cover: normalizeCaseInsertCoverTemplateState(record?.front),
        tray: normalizeCaseInsertTrayTemplateState(record?.back),
      }

  return {
    templateType: normalizedTemplateType,
    templates,
    spine: normalizeJewelCaseSpineState(record?.spine, title),
    export: normalizeJewelCaseExportSettings(record?.export),
  }
}
