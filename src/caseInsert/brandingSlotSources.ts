import {
  getMediaMarkPlaceholderImageUrl,
  getPlatformMarkPlaceholderImageUrl,
  getRatingBadgePlaceholderRenderModel,
  getTechnicalMarkPlaceholderImageUrl,
} from '../assets/assetManifest.ts'
import { loadImage } from '../export/canvasImage.ts'
import {
  getAdditionalLogoAssets,
} from '../project/projectLogoAssets.ts'
import {
  MEDIA_MARK_OPTIONS,
  getMediaMarkLabel,
} from '../project/projectMediaMark.ts'
import {
  PLATFORM_MARK_OPTIONS,
  getPlatformMarkLabel,
  getProjectPlatformMarkAsset,
} from '../project/projectPlatformMarks.ts'
import {
  TECHNICAL_MARK_OPTIONS,
  getProjectTechnicalMarkAsset,
  getTechnicalMarkLabel,
} from '../project/projectTechnicalMarks.ts'
import type {
  BackgroundImageSize,
  ProjectImageAssetProvenance,
  ProjectImageAssetSource,
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectMetadata,
  ProjectPlatformMarks,
  ProjectRatingBadge,
  ProjectTechnicalMarks,
} from '../project/projectTypes.ts'
import { getNaturalImageSize } from '../utils/imageFile.ts'
import type { CaseInsertImageSlotGroupKey } from './templateSurfaces.ts'
import type { CaseInsertImageSlotImageInput } from './types.ts'

export type CaseInsertBrandingSourceCatalog = {
  projectMetadata: ProjectMetadata
  projectLogoAssets: ProjectLogoAssets
  projectRatingBadge: ProjectRatingBadge
  projectMediaMark: ProjectMediaMark
  projectPlatformMarks: ProjectPlatformMarks
  projectTechnicalMarks: ProjectTechnicalMarks
}

export type CaseInsertBrandingSlotSourceItem = {
  id: string
  slotKey: Extract<CaseInsertImageSlotGroupKey, 'logoSlots' | 'markSlots'>
  label: string
  sourceTypeLabel: string
  sourceId: string
  resolveImage: () => Promise<CaseInsertImageSlotImageInput>
}

export type CaseInsertMarkLayerKind =
  | 'rating'
  | 'media'
  | 'platform'
  | 'technical'

export type CaseInsertBrandingSourceSection = {
  id: string
  title: string
  emptyHint: string
  items: CaseInsertBrandingSlotSourceItem[]
}

type BrandingImageSourceInput = {
  id: string
  slotKey: CaseInsertBrandingSlotSourceItem['slotKey']
  label: string
  sourceTypeLabel: string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  imageSource: Partial<ProjectImageAssetProvenance>
}

function createSourceProvenance(
  source: ProjectImageAssetSource,
  sourceId: string,
  sourceLabel: string,
): Partial<ProjectImageAssetProvenance> {
  return {
    source,
    sourceId,
    sourceLabel,
  }
}

async function resolveImageSize(
  imageDataUrl: string,
  fallbackSize: BackgroundImageSize | null,
  label: string,
) {
  if (fallbackSize) {
    return fallbackSize
  }

  return getNaturalImageSize(await loadImage(imageDataUrl, label))
}

function createBrandingSourceItem({
  id,
  slotKey,
  label,
  sourceTypeLabel,
  imageDataUrl,
  imageSize,
  imageSource,
}: BrandingImageSourceInput): CaseInsertBrandingSlotSourceItem | null {
  if (!imageDataUrl) {
    return null
  }

  return {
    id,
    slotKey,
    label,
    sourceTypeLabel,
    sourceId: imageSource.sourceId ?? id,
    resolveImage: async () => ({
      imageDataUrl,
      imageSize: await resolveImageSize(imageDataUrl, imageSize, label),
      imageSource,
    }),
  }
}

function createLogoSourceItem({
  label,
  imageDataUrl,
  imageSize,
  imageSource,
  sourceId,
}: {
  label: string
  imageDataUrl: string | null
  imageSize: BackgroundImageSize | null
  imageSource: ProjectImageAssetProvenance | null | undefined
  sourceId: string
}) {
  return createBrandingSourceItem({
    id: sourceId,
    slotKey: 'logoSlots',
    label,
    sourceTypeLabel: 'Logo',
    imageDataUrl,
    imageSize,
    imageSource: imageSource ?? createSourceProvenance(
      'embedded',
      sourceId,
      label,
    ),
  })
}

function createLogoSourceItems(projectLogoAssets: ProjectLogoAssets) {
  const items: CaseInsertBrandingSlotSourceItem[] = []

  const developerLogo = createLogoSourceItem({
    label: 'Developer logo',
    imageDataUrl: projectLogoAssets.developerLogoDataUrl,
    imageSize: projectLogoAssets.developerLogoSize,
    imageSource: projectLogoAssets.developerLogoSource,
    sourceId: 'case-logo:developer',
  })
  const publisherLogo = createLogoSourceItem({
    label: 'Publisher logo',
    imageDataUrl: projectLogoAssets.publisherLogoDataUrl,
    imageSize: projectLogoAssets.publisherLogoSize,
    imageSource: projectLogoAssets.publisherLogoSource,
    sourceId: 'case-logo:publisher',
  })

  if (developerLogo) items.push(developerLogo)
  if (publisherLogo) items.push(publisherLogo)

  ;(['developer', 'publisher'] as const).forEach((logoKey) => {
    getAdditionalLogoAssets(projectLogoAssets, logoKey).forEach((logoAsset) => {
      const item = createBrandingSourceItem({
        id: `case-logo:${logoKey}:${logoAsset.id}`,
        slotKey: 'logoSlots',
        label: logoAsset.label,
        sourceTypeLabel: 'Additional logo',
        imageDataUrl: logoAsset.imageDataUrl,
        imageSize: logoAsset.imageSize,
        imageSource: logoAsset.imageSource ?? createSourceProvenance(
          'embedded',
          `case-logo:${logoKey}:${logoAsset.id}`,
          logoAsset.label,
        ),
      })

      if (item) items.push(item)
    })
  })

  return items
}

function createRatingSourceItems(
  projectMetadata: ProjectMetadata,
  projectRatingBadge: ProjectRatingBadge,
) {
  if (projectMetadata.ratingSystem === 'none') {
    return []
  }

  const customImageDataUrl = projectRatingBadge.source === 'custom'
    ? projectRatingBadge.customImageDataUrl
    : null
  const renderModel = getRatingBadgePlaceholderRenderModel(projectMetadata)
  const sourceId = `case-rating:${projectMetadata.ratingSystem}:${
    projectMetadata.ratingValue.trim() || 'default'
  }`
  const item = createBrandingSourceItem({
    id: sourceId,
    slotKey: 'markSlots',
    label: renderModel.altLabel,
    sourceTypeLabel: 'Rating badge',
    imageDataUrl: customImageDataUrl ?? renderModel.imageUrl,
    imageSize: customImageDataUrl ? projectRatingBadge.customImageSize : null,
    imageSource: createSourceProvenance(
      customImageDataUrl ? 'custom' : 'placeholder',
      sourceId,
      renderModel.altLabel,
    ),
  })

  return item ? [item] : []
}

function createMediaMarkSourceItems(projectMediaMark: ProjectMediaMark) {
  return MEDIA_MARK_OPTIONS.flatMap((option) => {
    const isSelected = projectMediaMark.value === option.value
    const isCustom =
      isSelected &&
      projectMediaMark.source === 'custom' &&
      Boolean(projectMediaMark.customImageDataUrl)
    const theme = isSelected ? projectMediaMark.theme : 'light'
    const sourceId = `case-media:${option.value}:${theme}`
    const label = getMediaMarkLabel(option.value)
    const item = createBrandingSourceItem({
      id: sourceId,
      slotKey: 'markSlots',
      label,
      sourceTypeLabel: 'Media mark',
      imageDataUrl: isCustom
        ? projectMediaMark.customImageDataUrl
        : getMediaMarkPlaceholderImageUrl(option.value, theme),
      imageSize: isCustom ? projectMediaMark.customImageSize : null,
      imageSource: createSourceProvenance(
        isCustom ? 'custom' : 'placeholder',
        sourceId,
        `${label}${isCustom ? '' : ` ${theme}`} media mark`,
      ),
    })

    return item ? [item] : []
  })
}

function createPlatformMarkSourceItems(projectPlatformMarks: ProjectPlatformMarks) {
  return PLATFORM_MARK_OPTIONS.flatMap((option) => {
    const asset = getProjectPlatformMarkAsset(projectPlatformMarks, option.value)
    const isCustom = asset.source === 'custom' && Boolean(asset.customImageDataUrl)
    const label = getPlatformMarkLabel(option.value)
    const sourceId = `case-platform:${option.value}:${asset.theme}`
    const item = createBrandingSourceItem({
      id: sourceId,
      slotKey: 'markSlots',
      label,
      sourceTypeLabel: 'Operating-system mark',
      imageDataUrl: isCustom
        ? asset.customImageDataUrl
        : getPlatformMarkPlaceholderImageUrl(option.value, asset.theme),
      imageSize: isCustom ? asset.customImageSize : null,
      imageSource: createSourceProvenance(
        isCustom ? 'custom' : 'placeholder',
        sourceId,
        `${label}${isCustom ? '' : ` ${asset.theme}`} operating-system mark`,
      ),
    })

    return item ? [item] : []
  })
}

function createTechnicalMarkSourceItems(projectTechnicalMarks: ProjectTechnicalMarks) {
  return TECHNICAL_MARK_OPTIONS.flatMap((option) => {
    const asset = getProjectTechnicalMarkAsset(projectTechnicalMarks, option.value)
    const defaultLabel = getTechnicalMarkLabel(option.value)
    const label = asset.label.trim() || defaultLabel
    const isCustom = asset.source === 'custom' && Boolean(asset.customImageDataUrl)
    const sourceId = `case-technical:${option.value}`
    const item = createBrandingSourceItem({
      id: sourceId,
      slotKey: 'markSlots',
      label,
      sourceTypeLabel: 'Technical mark',
      imageDataUrl: isCustom
        ? asset.customImageDataUrl
        : getTechnicalMarkPlaceholderImageUrl(option.value),
      imageSize: isCustom ? asset.customImageSize : null,
      imageSource: createSourceProvenance(
        isCustom ? 'custom' : 'placeholder',
        sourceId,
        `${label} technical mark`,
      ),
    })

    return item ? [item] : []
  })
}

export function createCaseInsertBrandingSourceSections({
  projectMetadata,
  projectLogoAssets,
  projectRatingBadge,
  projectMediaMark,
  projectPlatformMarks,
  projectTechnicalMarks,
}: CaseInsertBrandingSourceCatalog): CaseInsertBrandingSourceSection[] {
  return [
    {
      id: 'logos',
      title: 'Shared logos',
      emptyHint: 'No shared logos are available.',
      items: createLogoSourceItems(projectLogoAssets),
    },
    {
      id: 'rating',
      title: 'Rating badge',
      emptyHint: 'No rating metadata is selected.',
      items: createRatingSourceItems(projectMetadata, projectRatingBadge),
    },
    {
      id: 'media',
      title: 'Media marks',
      emptyHint: 'No media marks are available.',
      items: createMediaMarkSourceItems(projectMediaMark),
    },
    {
      id: 'platform',
      title: 'Operating-system marks',
      emptyHint: 'No operating-system marks are available.',
      items: createPlatformMarkSourceItems(projectPlatformMarks),
    },
    {
      id: 'technical',
      title: 'Technical marks',
      emptyHint: 'No technical marks are available.',
      items: createTechnicalMarkSourceItems(projectTechnicalMarks),
    },
  ]
}

export function getCaseInsertMarkLayerKind(
  sourceId: string | null | undefined,
): CaseInsertMarkLayerKind {
  if (sourceId?.startsWith('case-media:')) return 'media'
  if (sourceId?.startsWith('case-platform:')) return 'platform'
  if (sourceId?.startsWith('case-technical:')) return 'technical'

  return 'rating'
}

export function getCaseInsertManualMarkSourceId(
  kind: CaseInsertMarkLayerKind,
  id: string,
) {
  return `case-${kind}:manual:${id}`
}
