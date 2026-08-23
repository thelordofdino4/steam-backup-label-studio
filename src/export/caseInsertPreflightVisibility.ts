import {
  getCaseInsertLogoSlotRenderInfo,
} from '../caseInsert/brandingLogoSlots.ts'
import {
  getCaseInsertMarkLayerKind,
  type CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import {
  isCaseInsertMarkSlotVisible,
} from '../caseInsert/brandingVisibility.ts'
import {
  getRenderedCaseInsertTextBlock,
} from '../caseInsert/textContent.ts'
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
  type CaseInsertArtworkViewportLayout,
  type CaseInsertArtworkViewportRenderOwner,
} from '../caseInsert/artworkViewportRenderArtifact.ts'
import {
  isOptionalVisualFeatureEnabled,
  shouldRenderOptionalVisualFeature,
} from '../editor/optionalVisualFeature.ts'
import { hasActiveImageContent } from '../image/imageContentBounds.ts'
import {
  getFeatureVisibleRepeatedArtworkItems,
} from '../editor/repeatedArtwork.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSteamBanner,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
  ProjectMetadata,
} from '../project/projectTypes.ts'

export function slotHasEnabledImageContent(slot: ProjectCaseInsertImageSlot) {
  return shouldRenderOptionalVisualFeature(
    slot,
    Boolean(
      slot.imageDataUrl &&
      slot.imageSize &&
      hasActiveImageContent(slot.imageSize),
    ),
  )
}

export type CaseInsertArtworkViewportVisibilityContext = Readonly<{
  owner: CaseInsertArtworkViewportRenderOwner
  layout: CaseInsertArtworkViewportLayout
}>

export function slotWillRender(
  slot: ProjectCaseInsertImageSlot,
  viewportContext?: CaseInsertArtworkViewportVisibilityContext,
) {
  if (!slotHasEnabledImageContent(slot)) return false
  if (slot.reservedArtworkViewport == null) return true
  if (!viewportContext) return false

  return resolveCaseInsertArtworkViewportRenderArtifact({
    owner: viewportContext.owner,
    slot,
    layout: viewportContext.layout,
  }).status === 'resolved'
}

export function logoSlotWillRender(slot: ProjectCaseInsertImageSlot) {
  return slot.reservedArtworkViewport == null &&
    Boolean(getCaseInsertLogoSlotRenderInfo(slot))
}

export function steamBannerWillRender(banner: ProjectCaseInsertSteamBanner) {
  return shouldRenderOptionalVisualFeature(
    banner,
    Boolean(banner.useTextFallback || banner.lockupImageDataUrl),
  )
}

export function getVisibleMarkSlots(
  surface: ProjectCaseInsertSurfaceState,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return surface.markSlots.filter((slot) => {
    const kind = getCaseInsertMarkLayerKind(slot.imageSource?.sourceId)

    return isCaseInsertMarkSlotVisible(slot, kind, brandingSources)
  })
}

export function markSlotWillRender(
  slot: ProjectCaseInsertImageSlot,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const kind = getCaseInsertMarkLayerKind(slot.imageSource?.sourceId)

  return slotWillRender(slot) &&
    isCaseInsertMarkSlotVisible(slot, kind, brandingSources)
}

export function textBlockWillRender(
  textBlock: ProjectCaseInsertTextBlock,
  metadata: ProjectMetadata,
) {
  return Boolean(
    isOptionalVisualFeatureEnabled(textBlock) &&
      getRenderedCaseInsertTextBlock(textBlock, metadata).value.trim(),
  )
}

export function textListWillRender(textList: ProjectCaseInsertTextList) {
  return Boolean(
    isOptionalVisualFeatureEnabled(textList) &&
    textList.items.some((item) => item.trim()),
  )
}

export function surfaceHasVisibleContent(
  surface: ProjectCaseInsertSurfaceState,
  brandingSources: CaseInsertBrandingSourceCatalog,
  viewportContext?: CaseInsertArtworkViewportVisibilityContext & Readonly<{
    owner: 'cover' | 'tray'
  }>,
) {
  return (
    slotWillRender(surface.background) ||
    steamBannerWillRender(surface.steamBanner) ||
    slotWillRender(surface.titleArtwork) ||
    getFeatureVisibleRepeatedArtworkItems(
      surface,
      surface.artworkSlots,
    ).some((slot) => slotWillRender(slot, viewportContext)) ||
    surface.logoSlots.some(logoSlotWillRender) ||
    surface.markSlots.some((slot) => markSlotWillRender(slot, brandingSources)) ||
    surface.textBlocks.some((textBlock) =>
      textBlockWillRender(textBlock, brandingSources.projectMetadata)) ||
    surface.textLists.some(textListWillRender)
  )
}

export function getVisibleSpineMarkSlots(
  spineSide: ProjectJewelCaseSpineSideState,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return spineSide.markSlots.filter((slot) => {
    const kind = getCaseInsertMarkLayerKind(slot.imageSource?.sourceId)

    return isCaseInsertMarkSlotVisible(slot, kind, brandingSources)
  })
}

export function spineSideHasVisibleContent(
  spineSide: ProjectJewelCaseSpineSideState,
  brandingSources: CaseInsertBrandingSourceCatalog,
  viewportContext?: CaseInsertArtworkViewportVisibilityContext & Readonly<{
    owner: 'left-spine' | 'right-spine'
  }>,
) {
  return (
    slotWillRender(spineSide.background) ||
    steamBannerWillRender(spineSide.steamBanner) ||
    slotWillRender(spineSide.titleArtwork) ||
    getFeatureVisibleRepeatedArtworkItems(
      spineSide,
      spineSide.artworkSlots,
    ).some((slot) => slotWillRender(slot, viewportContext)) ||
    textBlockWillRender(spineSide.title, brandingSources.projectMetadata) ||
    spineSide.textBlocks.some((textBlock) =>
      textBlockWillRender(textBlock, brandingSources.projectMetadata)) ||
    spineSide.logoSlots.some(logoSlotWillRender) ||
    getVisibleSpineMarkSlots(
      spineSide,
      brandingSources,
    ).some((slot) => slotWillRender(slot))
  )
}

export function formatVisibleElementStatus(
  surface: ProjectCaseInsertSurfaceState,
  spine: ProjectJewelCaseState['spine'] | null,
  brandingSources: CaseInsertBrandingSourceCatalog,
  viewportContext?: CaseInsertArtworkViewportVisibilityContext & Readonly<{
    owner: 'cover' | 'tray'
  }>,
) {
  const visibleCount =
    Number(slotWillRender(surface.background)) +
    Number(steamBannerWillRender(surface.steamBanner)) +
    Number(slotWillRender(surface.titleArtwork)) +
    getFeatureVisibleRepeatedArtworkItems(
      surface,
      surface.artworkSlots,
    ).filter((slot) => slotWillRender(slot, viewportContext)).length +
    surface.logoSlots.filter(logoSlotWillRender).length +
    surface.markSlots.filter((slot) =>
      markSlotWillRender(slot, brandingSources)).length +
    surface.textBlocks.filter((textBlock) =>
      textBlockWillRender(textBlock, brandingSources.projectMetadata)).length +
    surface.textLists.filter(textListWillRender).length +
    (spine
      ? (['left', 'right'] as const).reduce(
          (count, side) =>
            count + (
              spineSideHasVisibleContent(
                spine[side],
                brandingSources,
                viewportContext
                  ? {
                      owner: side === 'left' ? 'left-spine' : 'right-spine',
                      layout: viewportContext.layout,
                    }
                  : undefined,
              )
                ? 1
                : 0
            ),
          0,
        )
      : 0)

  return visibleCount > 0 ? String(visibleCount) : 'None'
}

export function formatImageSlotStatus(slot: ProjectCaseInsertImageSlot) {
  if (!isOptionalVisualFeatureEnabled(slot)) return 'Disabled'
  if (!slot.imageDataUrl) return 'None'
  if (!slot.imageSize) return 'Present'
  if (!hasActiveImageContent(slot.imageSize)) return 'None'

  return `Present (${slot.imageSize.width} x ${slot.imageSize.height}px)`
}
