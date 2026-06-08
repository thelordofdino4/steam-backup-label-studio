import {
  getCaseInsertLogoSlotRenderInfo,
} from '../caseInsert/brandingLogoSlots.ts'
import {
  getCaseInsertBackTextBlockRole,
} from '../caseInsert/textReadability.ts'
import {
  getRenderedCaseInsertTextBlock,
} from '../caseInsert/textContent.ts'
import {
  getCaseInsertMarkLayerKind,
  type CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import {
  isCaseInsertMarkSlotVisible,
} from '../caseInsert/brandingVisibility.ts'
import type {
  CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseSpineSideState,
} from '../project/projectTypes.ts'
import {
  createCaseInsertTextAvoidanceRegionFromRect,
  type CaseInsertTextAvoidanceRegion,
} from './caseInsertTextAvoidance.ts'
import type { CaseInsertPreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseBackImageSlotPreviewRect,
  getJewelCaseBackTextBlockPreviewLayout,
  getJewelCaseBackTextListPreviewLayout,
} from './jewelCaseBackLayout.ts'
import {
  getJewelCaseFrontImageSlotPreviewRect,
  getJewelCaseFrontTextBlockPreviewLayout,
} from './jewelCaseFrontLayout.ts'
import type {
  JewelCasePixelRect,
  JewelCaseSpineSideId,
} from './jewelCaseLayout.ts'
import {
  getJewelCaseSpineImageSlotPreviewLayout,
  type JewelCaseSpineOverlayRole,
} from './jewelCaseSpineLayout.ts'

export type { CaseInsertTextAvoidanceRegion } from './caseInsertTextAvoidance.ts'

type TemplateSlotRole = 'titleArtwork' | 'artwork' | 'logo' | 'mark'

function createRegion(
  id: string,
  label: string,
  rect: JewelCasePixelRect | null,
) {
  return rect
    ? createCaseInsertTextAvoidanceRegionFromRect(id, label, rect)
    : null
}

function createTextBlockRegion(
  paneId: CaseInsertTemplatePaneId,
  textBlock: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const renderedTextBlock = getRenderedCaseInsertTextBlock(
    textBlock,
    brandingSources.projectMetadata,
  )
  const textLayout = paneId === 'cover'
    ? getJewelCaseFrontTextBlockPreviewLayout(renderedTextBlock, layout)
    : getJewelCaseBackTextBlockPreviewLayout(
        renderedTextBlock,
        layout,
        getCaseInsertBackTextBlockRole(renderedTextBlock),
      )

  return textLayout
    ? {
        ...createCaseInsertTextAvoidanceRegionFromRect(
          `${paneId}-text-${renderedTextBlock.id}`,
          renderedTextBlock.label,
          textLayout.bounds,
        ),
        sourceTextBlockId: renderedTextBlock.id,
      }
    : null
}

function createTextListRegion(
  textList: ProjectCaseInsertTextList,
  layout: CaseInsertPreviewLayout,
) {
  const textLayout = getJewelCaseBackTextListPreviewLayout(textList, layout)

  return textLayout
    ? {
        ...createCaseInsertTextAvoidanceRegionFromRect(
          `tray-text-list-${textList.id}`,
          textList.label,
          textLayout.bounds,
        ),
        sourceTextListId: textList.id,
      }
    : null
}

function getRenderableLogoSlot(
  slot: ProjectCaseInsertImageSlot,
): ProjectCaseInsertImageSlot {
  const renderInfo = getCaseInsertLogoSlotRenderInfo(slot)

  return renderInfo
    ? {
        ...slot,
        imageDataUrl: renderInfo.imageDataUrl,
        imageSize: renderInfo.imageSize,
      }
    : slot
}

function getTemplateImageSlotPreviewRect(
  paneId: CaseInsertTemplatePaneId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  role: TemplateSlotRole,
) {
  const renderableSlot = role === 'logo' ? getRenderableLogoSlot(slot) : slot

  return paneId === 'cover'
    ? getJewelCaseFrontImageSlotPreviewRect(
        renderableSlot,
        layout,
        role === 'titleArtwork'
          ? 'titleArtwork'
          : role === 'artwork'
            ? 'calloutArtwork'
            : role,
      )
    : getJewelCaseBackImageSlotPreviewRect(
        renderableSlot,
        layout,
        role === 'artwork' ? 'artwork' : role === 'mark' ? 'mark' : 'logo',
      )
}

function getVisibleMarkSlots(
  slots: ProjectCaseInsertImageSlot[],
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  return slots.filter((slot) =>
    isCaseInsertMarkSlotVisible(
      slot,
      getCaseInsertMarkLayerKind(slot.imageSource?.sourceId),
      brandingSources,
    ))
}

function compactRegions(
  regions: Array<CaseInsertTextAvoidanceRegion | null>,
) {
  return regions.filter(
    (region): region is CaseInsertTextAvoidanceRegion => Boolean(region),
  )
}

export function createCaseInsertTemplateTextAvoidanceRegions({
  paneId,
  templateState,
  layout,
  brandingSources,
}: {
  paneId: CaseInsertTemplatePaneId
  templateState: ProjectCaseInsertSurfaceState
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
}): CaseInsertTextAvoidanceRegion[] {
  const artworkSlots = templateState.additionalArtworkEnabled
    ? templateState.artworkSlots
    : []

  return compactRegions([
    createRegion(
      `${paneId}-title-artwork`,
      templateState.titleArtwork.label,
      getTemplateImageSlotPreviewRect(
        paneId,
        templateState.titleArtwork,
        layout,
        'titleArtwork',
      ),
    ),
    ...artworkSlots.map((slot) =>
      createRegion(
        `${paneId}-artwork-${slot.id}`,
        slot.label,
        getTemplateImageSlotPreviewRect(paneId, slot, layout, 'artwork'),
      )),
    ...templateState.logoSlots.map((slot) =>
      createRegion(
        `${paneId}-logo-${slot.id}`,
        slot.label,
        getTemplateImageSlotPreviewRect(paneId, slot, layout, 'logo'),
      )),
    ...getVisibleMarkSlots(templateState.markSlots, brandingSources).map((slot) =>
      createRegion(
        `${paneId}-mark-${slot.id}`,
        slot.label,
        getTemplateImageSlotPreviewRect(paneId, slot, layout, 'mark'),
      )),
    ...templateState.textBlocks.map((textBlock) =>
      createTextBlockRegion(
        paneId,
        textBlock,
        layout,
        brandingSources,
      )),
    ...(
      paneId === 'tray'
        ? templateState.textLists.map((textList) =>
            createTextListRegion(textList, layout))
        : []
    ),
  ])
}

function getSpineImageSlotPreviewRect(
  side: JewelCaseSpineSideId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  role: JewelCaseSpineOverlayRole,
) {
  const renderableSlot = role === 'logo' ? getRenderableLogoSlot(slot) : slot

  return getJewelCaseSpineImageSlotPreviewLayout(
    side,
    renderableSlot,
    layout,
    role,
  )?.boundingRect ?? null
}

export function createCaseInsertSpineTextAvoidanceRegions({
  side,
  spineSide,
  layout,
  brandingSources,
}: {
  side: JewelCaseSpineSideId
  spineSide: ProjectJewelCaseSpineSideState
  layout: CaseInsertPreviewLayout
  brandingSources: CaseInsertBrandingSourceCatalog
}): CaseInsertTextAvoidanceRegion[] {
  const artworkSlots = spineSide.additionalArtworkEnabled
    ? spineSide.artworkSlots
    : []

  return compactRegions([
    createRegion(
      `${side}-spine-title-artwork`,
      spineSide.titleArtwork.label,
      getSpineImageSlotPreviewRect(
        side,
        spineSide.titleArtwork,
        layout,
        'titleArtwork',
      ),
    ),
    ...artworkSlots.map((slot) =>
      createRegion(
        `${side}-spine-artwork-${slot.id}`,
        slot.label,
        getSpineImageSlotPreviewRect(side, slot, layout, 'artwork'),
      )),
    ...spineSide.logoSlots.map((slot) =>
      createRegion(
        `${side}-spine-logo-${slot.id}`,
        slot.label,
        getSpineImageSlotPreviewRect(side, slot, layout, 'logo'),
      )),
    ...getVisibleMarkSlots(spineSide.markSlots, brandingSources).map((slot) =>
      createRegion(
        `${side}-spine-mark-${slot.id}`,
        slot.label,
        getSpineImageSlotPreviewRect(side, slot, layout, 'mark'),
      )),
  ])
}
