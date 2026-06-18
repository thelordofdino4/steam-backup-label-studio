import {
  DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
  type SupportedCaseInsertTemplateType,
} from '../editor/editorTypes.ts'
import {
  createRepeatedArtworkLabel,
  createRepeatedArtworkSlotId,
} from '../editor/repeatedArtwork.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
  normalizeProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import {
  asArray,
  asRecord,
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeImageSize,
  normalizeNullableString,
  normalizePositiveNumber,
  normalizeString,
  normalizeTextValue,
} from '../project/savedProjectNormalization.ts'
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
import type { TextContentMode } from '../text/htmlText.ts'
import {
  getRenderablePlainText,
  markdownToHtmlSource,
  sanitizeHtmlSource,
} from '../text/htmlText.ts'
import {
  type CaseInsertTemplatePaneId,
} from './templateSurfaces.ts'
import {
  normalizeCaseInsertSteamBanner,
} from './steamBanner.ts'
import {
  getCaseInsertTextBlockStyleRole,
  getCaseInsertTextListStyleRole,
  normalizeCaseInsertTextStyle,
  type CaseInsertTextStyle,
} from './textStyles.ts'
import {
  getCanonicalCaseInsertTextBlockId,
} from './textContent.ts'
import {
  normalizeCaseInsertTextWidth,
} from './textLayout.ts'
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

export {
  asRecord,
  normalizeString,
  type JsonRecord,
} from '../project/savedProjectNormalization.ts'

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

function normalizeTextContentMode(value: unknown): TextContentMode | undefined {
  return value === 'html' || value === 'markdown' ? 'html' : undefined
}

function getNormalizedHtmlTextFields(record: Record<string, unknown>) {
  const contentMode = normalizeTextContentMode(record.contentMode)
  const htmlSource = typeof record.htmlSource === 'string'
    ? sanitizeHtmlSource(record.htmlSource)
    : undefined
  const markdownSource = typeof record.markdownSource === 'string'
    ? markdownToHtmlSource(record.markdownSource)
    : undefined

  return contentMode === 'html'
    ? {
        contentMode,
        htmlSource: htmlSource ?? markdownSource ?? '<p></p>',
      }
    : {}
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

  const rawWidth = record.width
  const hasWidth = defaults.width !== undefined ||
    (typeof rawWidth === 'number' && Number.isFinite(rawWidth))

  return {
    scale: normalizePositiveNumber(record.scale, defaults.scale),
    ...(hasWidth
      ? {
          width: normalizeCaseInsertTextWidth(rawWidth, defaults.width),
        }
      : {}),
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
    id: getCanonicalCaseInsertTextBlockId(
      normalizeString(record.id, defaults.id),
      defaults.id,
    ),
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
          labelPrefix === 'Artwork'
            ? createRepeatedArtworkSlotId(idPrefix, index + 1)
            : `${idPrefix}-${index + 1}`,
          labelPrefix === 'Artwork'
            ? createRepeatedArtworkLabel(index + 1)
            : `${labelPrefix} ${index + 1}`,
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
  const id = getCanonicalCaseInsertTextBlockId(
    normalizeString(record.id, defaults.id),
    defaults.id,
  )

  const htmlFields = getNormalizedHtmlTextFields(record)
  const fallbackValue = normalizeTextValue(record.value ?? record.text, defaults.value)

  return {
    id,
    label: normalizeString(record.label, defaults.label),
    enabled: normalizeBoolean(record.enabled, defaults.enabled),
    value: htmlFields.contentMode === 'html'
      ? getRenderablePlainText(htmlFields, fallbackValue)
      : fallbackValue,
    ...htmlFields,
    source: normalizeCaseInsertTextSource(record.source, defaults.source),
    avoidVisualElements: normalizeBoolean(
      record.avoidVisualElements,
      defaults.avoidVisualElements,
    ),
    align: normalizeCaseInsertTextAlign(record.align, defaults.align),
    layout: normalizeCaseInsertLayout(record.layout, defaults.layout),
    style: normalizeCaseInsertTextStyle(
      getCaseInsertTextBlockStyleRole({
        id,
      }),
      (asRecord(record.style) as Partial<CaseInsertTextStyle> | null) ??
        defaults.style,
    ),
  }
}

function normalizeCaseInsertTextBlockArray(
  value: unknown,
  idPrefix: string,
  labelPrefix: string,
  defaults: ProjectCaseInsertTextBlock[] = [],
): ProjectCaseInsertTextBlock[] {
  const textBlocks = asArray(value)

  if (!textBlocks) {
    return defaults
  }

  const defaultsById = new Map(defaults.map((defaultTextBlock) => [
    defaultTextBlock.id,
    defaultTextBlock,
  ]))
  const savedById = new Map<string, unknown>()
  const unknownTextBlocks: Array<{ value: unknown; index: number }> = []

  textBlocks.forEach((textBlock, index) => {
    const record = asRecord(textBlock)
    const savedId = typeof record?.id === 'string' && record.id.trim()
      ? getCanonicalCaseInsertTextBlockId(record.id.trim())
      : null

    if (savedId && defaultsById.has(savedId)) {
      savedById.set(savedId, textBlock)
      return
    }

    unknownTextBlocks.push({ value: textBlock, index })
  })
  const normalizedTextBlocks = defaults.map((defaultTextBlock) =>
    normalizeCaseInsertTextBlock(
      savedById.get(defaultTextBlock.id),
      defaultTextBlock,
    ))
  const normalizedUnknownTextBlocks = unknownTextBlocks.map(({ value, index }) =>
    normalizeCaseInsertTextBlock(
      value,
      createDefaultCaseInsertTextBlock(
        `${idPrefix}-${index + 1}`,
        `${labelPrefix} ${index + 1}`,
      ),
    ))

  return [...normalizedTextBlocks, ...normalizedUnknownTextBlocks]
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

  const htmlFields = getNormalizedHtmlTextFields(record)
  const fallbackItems = normalizeTextListItems(
    record.items ?? record.values,
    defaults.items,
  )

  return {
    id: normalizeString(record.id, defaults.id),
    label: normalizeString(record.label, defaults.label),
    enabled: normalizeBoolean(record.enabled, defaults.enabled),
    items: htmlFields.contentMode === 'html'
      ? normalizeTextListItems(
          getRenderablePlainText(
            htmlFields,
            fallbackItems.map((item) => `• ${item}`).join('\n'),
          ).split('\n'),
          fallbackItems,
        )
      : fallbackItems,
    ...htmlFields,
    source: normalizeCaseInsertTextSource(record.source, defaults.source),
    avoidVisualElements: normalizeBoolean(
      record.avoidVisualElements,
      defaults.avoidVisualElements,
    ),
    layout: normalizeCaseInsertLayout(record.layout, defaults.layout),
    style: normalizeCaseInsertTextStyle(
      getCaseInsertTextListStyleRole({
        id: normalizeString(record.id, defaults.id),
      }),
      (asRecord(record.style) as Partial<CaseInsertTextStyle> | null) ??
        defaults.style,
    ),
  }
}

function normalizeCaseInsertTextListArray(
  value: unknown,
  idPrefix: string,
  labelPrefix: string,
  defaults: ProjectCaseInsertTextList[] = [],
): ProjectCaseInsertTextList[] {
  const textLists = asArray(value)

  if (!textLists) {
    return defaults
  }

  const defaultsById = new Map(defaults.map((defaultTextList) => [
    defaultTextList.id,
    defaultTextList,
  ]))
  const normalizedTextLists = textLists.map((textList, index) => {
    const record = asRecord(textList)
    const savedId = typeof record?.id === 'string' && record.id.trim()
      ? record.id.trim()
      : null
    const defaultTextList = savedId
      ? defaultsById.get(savedId) ?? defaults[index]
      : defaults[index]

    return normalizeCaseInsertTextList(
      textList,
      defaultTextList ??
        createDefaultCaseInsertTextList(
          `${idPrefix}-${index + 1}`,
          `${labelPrefix} ${index + 1}`,
        ),
    )
  })
  const normalizedIds = new Set(normalizedTextLists.map(({ id }) => id))
  const missingDefaults = defaults.filter(({ id }) => !normalizedIds.has(id))

  return [...normalizedTextLists, ...missingDefaults]
}

function withTextBlockAliasId(value: unknown, id: string) {
  const record = asRecord(value)

  return record ? { id, ...record } : value
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
    steamBanner: normalizeCaseInsertSteamBanner(
      record.steamBanner,
      'cover',
      { enabled: defaults.steamBanner.enabled },
    ),
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

function normalizeCaseInsertCoverTemplateState(
  value: unknown,
  title = '',
):
ProjectCaseInsertSurfaceState {
  const defaults = createDefaultCaseInsertCoverTemplateState(title)
  const record = asRecord(value)
  const artworkSlotsValue = record?.artworkSlots ??
    record?.artwork ??
    (record?.calloutArtwork ? [record.calloutArtwork] : undefined)
  const textBlocksValue = record?.textBlocks ??
    record?.text ??
    (record?.calloutText || record?.callout
      ? [
          withTextBlockAliasId(
            record.calloutText ?? record.callout,
            'cover-custom-note',
          ),
        ]
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
        withTextBlockAliasId(record.description, 'tray-description'),
        withTextBlockAliasId(
          record.minimumRequirements ?? record.minimumSystemRequirements,
          'tray-minimum-requirements',
        ),
        withTextBlockAliasId(
          record.recommendedRequirements ?? record.recommendedSystemRequirements,
          'tray-recommended-requirements',
        ),
        withTextBlockAliasId(
          record.legalText ?? record.legal,
          'tray-copyright-text',
        ),
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

function normalizeCaseInsertTemplateStates(
  value: unknown,
  title = '',
):
Record<CaseInsertTemplatePaneId, ProjectCaseInsertSurfaceState> {
  const record = asRecord(value)

  return {
    cover: normalizeCaseInsertCoverTemplateState(record?.cover, title),
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
  const logoSlotsValue = record.logoSlots ??
    record.logos ??
    (record.logo ? [record.logo] : undefined)

  return {
    steamBanner: normalizeCaseInsertSteamBanner(
      record.steamBanner,
      'spine',
      { enabled: defaults.steamBanner.enabled },
    ),
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
      logoSlotsValue,
      `${defaults.background.id.replace('-background', '')}-logo`,
      'Logo',
      defaults.logoSlots,
    ),
    markSlots: normalizeCaseInsertImageSlotArray(
      record.markSlots ?? record.marks,
      `${defaults.background.id.replace('-background', '')}-mark`,
      'Mark',
      defaults.markSlots,
    ),
    title: normalizeCaseInsertTextBlock(record.title ?? record.titleText, defaults.title),
    textBlocks: normalizeCaseInsertTextBlockArray(
      record.textBlocks ?? record.text,
      `${defaults.background.id.replace('-background', '')}-text`,
      'Spine text',
      defaults.textBlocks,
    ),
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
    mirrored: normalizeBoolean(
      record.mirrored ?? record.mirror,
      defaults.mirrored,
    ),
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
    ? normalizeCaseInsertTemplateStates(templateRecord, title)
    : {
        cover: normalizeCaseInsertCoverTemplateState(record?.front, title),
        tray: normalizeCaseInsertTrayTemplateState(record?.back),
      }

  return {
    templateType: normalizedTemplateType,
    templates,
    spine: normalizeJewelCaseSpineState(record?.spine, title),
    export: normalizeJewelCaseExportSettings(record?.export),
  }
}
