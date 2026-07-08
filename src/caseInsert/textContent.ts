import {
  DISC_TEXT_KEYS,
  getDiscTextLabel,
  type DiscTextKey,
} from '../discText/index.ts'
import {
  getProjectMetadataDiscTextValue,
  isMetadataBoundDiscTextKey,
} from '../project/metadataDiscText.ts'
import type {
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectCaseInsertTextSource,
  ProjectMetadata,
} from '../project/projectTypes.ts'
import {
  getRenderablePlainText,
  isHtmlTextEnabled,
} from '../text/htmlText.ts'

export type CaseInsertTextSurfaceId = 'cover' | 'tray' | 'spine'

export type CaseInsertTextInputState = {
  value: string
  placeholder: string
  isMetadataBacked: boolean
  isManualOverride: boolean
}

const DISC_TEXT_ID_SUFFIXES: Record<DiscTextKey, string> = {
  title: 'title-text',
  subtitle: 'subtitle-text',
  discNumber: 'disc-number',
  backupDate: 'backup-date',
  appId: 'steam-app-id',
  developer: 'developer-text',
  publisher: 'publisher-text',
  installNotes: 'install-notes',
  customNote: 'custom-note',
  copyright: 'copyright-text',
}

const DISC_TEXT_KEY_BY_SUFFIX = new Map(
  DISC_TEXT_KEYS.map((key) => [DISC_TEXT_ID_SUFFIXES[key], key]),
)

const LEGACY_TEXT_BLOCK_ID_ALIASES: Record<string, string> = {
  'cover-callout-text': 'cover-custom-note',
  'cover-legal-text': 'cover-copyright-text',
  'tray-legal-text': 'tray-copyright-text',
}

const CASE_INSERT_ADDITIONAL_TEXT_KEYS = new Set<DiscTextKey>([
  'subtitle',
  'discNumber',
  'backupDate',
  'appId',
  'developer',
  'publisher',
  'installNotes',
  'customNote',
])

function normalizeText(value: string | undefined) {
  return value?.trim() ?? ''
}

export function getCaseInsertDiscTextKeys() {
  return DISC_TEXT_KEYS
}

export function getCaseInsertDiscTextBlockId(
  idPrefix: string,
  key: DiscTextKey,
) {
  return `${idPrefix}-${DISC_TEXT_ID_SUFFIXES[key]}`
}

export function getCaseInsertDiscTextBlockLabel(key: DiscTextKey) {
  return getDiscTextLabel(key)
}

export function getCanonicalCaseInsertTextBlockId(
  id: string,
  fallback = id,
) {
  const normalizedId = normalizeText(id)

  if (!normalizedId) {
    return fallback
  }

  if (normalizedId.endsWith('-spine-title')) {
    return `${normalizedId}-text`
  }

  return LEGACY_TEXT_BLOCK_ID_ALIASES[normalizedId] ?? normalizedId
}

export function getCaseInsertTextBlockDiscKey(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
): DiscTextKey | null {
  const canonicalId = getCanonicalCaseInsertTextBlockId(textBlock.id)

  for (const [suffix, key] of DISC_TEXT_KEY_BY_SUFFIX) {
    if (canonicalId.endsWith(`-${suffix}`)) {
      return key
    }
  }

  if (canonicalId.includes('callout')) return 'customNote'
  if (canonicalId.includes('legal')) return 'copyright'

  return null
}

export function isCaseInsertLegalTextBlock(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
) {
  return getCaseInsertTextBlockDiscKey(textBlock) === 'copyright'
}

export function isCaseInsertGameDescriptionTextBlock(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
) {
  return getCanonicalCaseInsertTextBlockId(textBlock.id) === 'tray-description'
}

export function isCaseInsertSystemRequirementsTextBlock(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
) {
  const canonicalId = getCanonicalCaseInsertTextBlockId(textBlock.id)

  return canonicalId === 'tray-minimum-requirements' ||
    canonicalId === 'tray-recommended-requirements'
}

export function isCaseInsertBackRoleTextBlock(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
) {
  return isCaseInsertGameDescriptionTextBlock(textBlock) ||
    isCaseInsertSystemRequirementsTextBlock(textBlock)
}

export function isCaseInsertFeatureBulletsTextList(
  textList: Pick<ProjectCaseInsertTextList, 'id'>,
) {
  return textList.id === 'tray-feature-bullets'
}

export function isCaseInsertAdditionalTextBlock(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
) {
  const discKey = getCaseInsertTextBlockDiscKey(textBlock)

  return Boolean(discKey && CASE_INSERT_ADDITIONAL_TEXT_KEYS.has(discKey))
}

export function isCaseInsertMetadataTextBlock(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
) {
  const discKey = getCaseInsertTextBlockDiscKey(textBlock)

  return Boolean(discKey && isMetadataBoundDiscTextKey(discKey))
}

export function getCaseInsertTextBlockPriority(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
) {
  const discKey = getCaseInsertTextBlockDiscKey(textBlock)

  if (discKey) {
    const index = DISC_TEXT_KEYS.indexOf(discKey)
    return index >= 0 ? index * 10 : 900
  }

  if (textBlock.id.includes('description')) return 110
  if (textBlock.id.includes('feature')) return 120
  if (textBlock.id.includes('minimum')) return 130
  if (textBlock.id.includes('recommended')) return 140

  return 900
}

export function getCaseInsertTextBlockMetadataInputValue(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
  metadata: ProjectMetadata,
) {
  const discKey = getCaseInsertTextBlockDiscKey(textBlock)

  return discKey && isMetadataBoundDiscTextKey(discKey)
    ? getProjectMetadataDiscTextValue(discKey, metadata)
    : ''
}

export function formatCaseInsertDiscTextValue(
  key: DiscTextKey,
  value: string,
) {
  const normalizedValue = normalizeText(value)

  if (!normalizedValue) {
    return ''
  }

  switch (key) {
    case 'backupDate':
      return `Backed up ${normalizedValue}`
    case 'appId':
      return `Steam App ID ${normalizedValue}`
    case 'developer':
      return `Developer: ${normalizedValue}`
    case 'publisher':
      return `Publisher: ${normalizedValue}`
    default:
      return normalizedValue
  }
}

export function getCaseInsertTextBlockRenderValue(
  textBlock: ProjectCaseInsertTextBlock,
  metadata?: ProjectMetadata,
) {
  const discKey = getCaseInsertTextBlockDiscKey(textBlock)

  if (
    metadata &&
    textBlock.source === 'metadata' &&
    discKey &&
    isMetadataBoundDiscTextKey(discKey)
  ) {
    return formatCaseInsertDiscTextValue(
      discKey,
      getProjectMetadataDiscTextValue(discKey, metadata) || textBlock.value,
    )
  }

  if (isHtmlTextEnabled(textBlock)) {
    return getRenderablePlainText(
      textBlock,
      textBlock.value,
    )
  }

  return discKey
    ? formatCaseInsertDiscTextValue(discKey, textBlock.value)
    : textBlock.value
}

export function getRenderedCaseInsertTextBlock(
  textBlock: ProjectCaseInsertTextBlock,
  metadata?: ProjectMetadata,
): ProjectCaseInsertTextBlock {
  const value = getCaseInsertTextBlockRenderValue(textBlock, metadata)

  return value === textBlock.value ? textBlock : { ...textBlock, value }
}

export function getCaseInsertTextBlockInputState(
  textBlock: ProjectCaseInsertTextBlock,
  metadata: ProjectMetadata,
): CaseInsertTextInputState {
  const isMetadataBacked = isCaseInsertMetadataTextBlock(textBlock)
  const metadataValue = isMetadataBacked
    ? getCaseInsertTextBlockMetadataInputValue(textBlock, metadata)
    : ''
  const isManualOverride = isMetadataBacked && textBlock.source !== 'metadata'

  if (!isMetadataBacked) {
    return {
      value: textBlock.value,
      placeholder: '',
      isMetadataBacked: false,
      isManualOverride: false,
    }
  }

  return {
    value: isManualOverride ? textBlock.value : '',
    placeholder: isManualOverride ? '' : metadataValue,
    isMetadataBacked,
    isManualOverride,
  }
}

export function getNextCaseInsertTextSource(
  textBlock: ProjectCaseInsertTextBlock,
  value: string,
): ProjectCaseInsertTextSource {
  return isCaseInsertMetadataTextBlock(textBlock) && !value.trim()
    ? 'metadata'
    : 'manual'
}
