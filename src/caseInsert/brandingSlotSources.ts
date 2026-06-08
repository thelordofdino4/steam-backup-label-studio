import {
  getMediaMarkPlaceholderImageUrl,
  getPlatformMarkPlaceholderImageUrl,
  getRatingBadgePlaceholderRenderModel,
} from '../assets/assetManifest.ts'
import { loadImage } from '../export/canvasImage.ts'
import {
  getAdditionalLogoAssets,
} from '../project/projectLogoAssets.ts'
import {
  createAdditionalLogoAssetLabel,
  getPrimaryLogoAssetLabel,
  normalizeLogoAssetLabel,
} from '../editor/logoAsset.ts'
import {
  getMediaMarkLabel,
} from '../project/projectMediaMark.ts'
import {
  getEnabledPlatformMarkValues,
  getPlatformMarkLabel,
  getProjectPlatformMarkAsset,
} from '../project/projectPlatformMarks.ts'
import {
  getTechnicalMarkLabel,
} from '../project/projectTechnicalMarks.ts'
import {
  createTechnicalMarkRenderModels,
} from '../render/technicalMarkRenderModel.ts'
import {
  shouldRenderRatingBadge,
  shouldRenderSupplementalUskRatingBadge,
} from '../project/projectRatingBadge.ts'
import {
  isOptionalLayoutFeatureEnabled,
} from '../editor/optionalVisualFeature.ts'
import {
  resolveMarkImageSource,
} from '../editor/markImageSource.ts'
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
  imageDataUrl: string
  imageSize: BackgroundImageSize | null
  imageSource: Partial<ProjectImageAssetProvenance>
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
    imageDataUrl,
    imageSize,
    imageSource,
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
    label: getPrimaryLogoAssetLabel('developer'),
    imageDataUrl: projectLogoAssets.developerLogoDataUrl,
    imageSize: projectLogoAssets.developerLogoSize,
    imageSource: projectLogoAssets.developerLogoSource,
    sourceId: 'case-logo:developer',
  })
  const publisherLogo = createLogoSourceItem({
    label: getPrimaryLogoAssetLabel('publisher'),
    imageDataUrl: projectLogoAssets.publisherLogoDataUrl,
    imageSize: projectLogoAssets.publisherLogoSize,
    imageSource: projectLogoAssets.publisherLogoSource,
    sourceId: 'case-logo:publisher',
  })

  if (developerLogo) items.push(developerLogo)
  if (publisherLogo) items.push(publisherLogo)

  ;(['developer', 'publisher'] as const).forEach((logoKey) => {
    getAdditionalLogoAssets(projectLogoAssets, logoKey).forEach((
      logoAsset,
      index,
    ) => {
      const label = normalizeLogoAssetLabel(
        logoAsset.label,
        createAdditionalLogoAssetLabel(logoKey, index),
      )
      const item = createBrandingSourceItem({
        id: `case-logo:${logoKey}:${logoAsset.id}`,
        slotKey: 'logoSlots',
        label,
        sourceTypeLabel: 'Additional logo',
        imageDataUrl: logoAsset.imageDataUrl,
        imageSize: logoAsset.imageSize,
        imageSource: logoAsset.imageSource ?? createSourceProvenance(
          'embedded',
          `case-logo:${logoKey}:${logoAsset.id}`,
          label,
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
  if (!shouldRenderRatingBadge(projectMetadata, projectRatingBadge)) {
    return []
  }

  const renderModel = getRatingBadgePlaceholderRenderModel(projectMetadata)
  const resolvedImage = resolveMarkImageSource({
    source: projectRatingBadge.source,
    customImageDataUrl: projectRatingBadge.customImageDataUrl,
    customImageSize: projectRatingBadge.customImageSize,
    builtInImageDataUrl: renderModel.imageUrl,
  })
  const sourceId = `case-rating:${projectMetadata.ratingSystem}:${
    projectMetadata.ratingValue.trim() || 'default'
  }`
  const item = createBrandingSourceItem({
    id: sourceId,
    slotKey: 'markSlots',
    label: renderModel.altLabel,
    sourceTypeLabel: 'Rating badge',
    imageDataUrl: resolvedImage.imageDataUrl,
    imageSize: resolvedImage.imageSize,
    imageSource: createSourceProvenance(
      resolvedImage.provenanceSource,
      sourceId,
      renderModel.altLabel,
    ),
  })

  const supplementalUskItem =
    shouldRenderSupplementalUskRatingBadge(projectMetadata, projectRatingBadge)
      ? createBrandingSourceItem({
          id: `case-rating:USK:${projectRatingBadge.uskBadge.ratingValue}:supplemental`,
          slotKey: 'markSlots',
          label: getRatingBadgePlaceholderRenderModel({
            ratingSystem: 'USK',
            ratingValue: projectRatingBadge.uskBadge.ratingValue,
          }).altLabel,
          sourceTypeLabel: 'Rating badge',
          imageDataUrl: getRatingBadgePlaceholderRenderModel({
            ratingSystem: 'USK',
            ratingValue: projectRatingBadge.uskBadge.ratingValue,
          }).imageUrl,
          imageSize: null,
          imageSource: createSourceProvenance(
            'placeholder',
            `case-rating:USK:${projectRatingBadge.uskBadge.ratingValue}:supplemental`,
            getRatingBadgePlaceholderRenderModel({
              ratingSystem: 'USK',
              ratingValue: projectRatingBadge.uskBadge.ratingValue,
            }).altLabel,
          ),
        })
      : null

  return [item, supplementalUskItem].filter(
    (source): source is CaseInsertBrandingSlotSourceItem => Boolean(source),
  )
}

function createMediaMarkSourceItems(projectMediaMark: ProjectMediaMark) {
  if (!isOptionalLayoutFeatureEnabled(projectMediaMark)) {
    return []
  }

  const theme = projectMediaMark.theme
  const sourceId = `case-media:${projectMediaMark.value}:${theme}`
  const label = getMediaMarkLabel(projectMediaMark.value)
  const resolvedImage = resolveMarkImageSource({
    source: projectMediaMark.source,
    customImageDataUrl: projectMediaMark.customImageDataUrl,
    customImageSize: projectMediaMark.customImageSize,
    builtInImageDataUrl: getMediaMarkPlaceholderImageUrl(
      projectMediaMark.value,
      theme,
    ),
  })
  const item = createBrandingSourceItem({
    id: sourceId,
    slotKey: 'markSlots',
    label,
    sourceTypeLabel: 'Media mark',
    imageDataUrl: resolvedImage.imageDataUrl,
    imageSize: resolvedImage.imageSize,
    imageSource: createSourceProvenance(
      resolvedImage.provenanceSource,
      sourceId,
      `${label}${resolvedImage.isCustomImage ? '' : ` ${theme}`} media mark`,
    ),
  })

  return item ? [item] : []
}

function createPlatformMarkSourceItems(projectPlatformMarks: ProjectPlatformMarks) {
  return getEnabledPlatformMarkValues(projectPlatformMarks).flatMap((value) => {
    const asset = getProjectPlatformMarkAsset(projectPlatformMarks, value)
    const label = getPlatformMarkLabel(value)
    const sourceId = `case-platform:${value}:${asset.theme}`
    const resolvedImage = resolveMarkImageSource({
      source: asset.source,
      customImageDataUrl: asset.customImageDataUrl,
      customImageSize: asset.customImageSize,
      builtInImageDataUrl: getPlatformMarkPlaceholderImageUrl(
        value,
        asset.theme,
      ),
    })
    const item = createBrandingSourceItem({
      id: sourceId,
      slotKey: 'markSlots',
      label,
      sourceTypeLabel: 'Operating-system mark',
      imageDataUrl: resolvedImage.imageDataUrl,
      imageSize: resolvedImage.imageSize,
      imageSource: createSourceProvenance(
        resolvedImage.provenanceSource,
        sourceId,
        `${label}${resolvedImage.isCustomImage ? '' : ` ${asset.theme}`} operating-system mark`,
      ),
    })

    return item ? [item] : []
  })
}

function createTechnicalMarkSourceItems(projectTechnicalMarks: ProjectTechnicalMarks) {
  return createTechnicalMarkRenderModels(projectTechnicalMarks).flatMap((model) => {
    const defaultLabel = getTechnicalMarkLabel(model.value)
    const label = model.label.trim() || defaultLabel
    const sourceId = `case-technical:${model.value}:${model.assetId ?? 'primary'}`
    const item = createBrandingSourceItem({
      id: sourceId,
      slotKey: 'markSlots',
      label,
      sourceTypeLabel: 'Technical mark',
      imageDataUrl: model.imageDataUrl,
      imageSize: model.isPlaceholderImage ? null : model.asset.customImageSize,
      imageSource: createSourceProvenance(
        model.isPlaceholderImage ? 'placeholder' : 'custom',
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
