import {
  type CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources'
import {
  getCaseInsertLogoSlotRenderInfo,
} from '../caseInsert/brandingLogoSlots'
import {
  isCaseInsertMarkSlotVisible,
} from '../caseInsert/brandingVisibility'
import {
  getRenderedCaseInsertTextBlock,
} from '../caseInsert/textContent'
import {
  getCaseInsertBackTextBlockRole,
} from '../caseInsert/textReadability'
import type {
  CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces'
import {
  CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER,
  type CaseInsertEditorExportLayerId,
} from '../editor/layerOrder'
import {
  getFeatureVisibleRepeatedArtworkItems,
} from '../editor/repeatedArtwork'
import type {
  CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout'
import {
  createCaseInsertTemplateTextAvoidanceRegions,
  type CaseInsertTextAvoidanceRegion,
} from '../layout/caseInsertTextOccupiedRegions'
import {
  getJewelCaseBackBackgroundFit,
  getJewelCaseBackImageSlotPreviewRect,
  getJewelCaseBackTextBlockPreviewLayout,
  getJewelCaseBackTextListPreviewLayout,
} from '../layout/jewelCaseBackLayout'
import {
  getJewelCaseFrontBackgroundFit,
  getJewelCaseFrontImageSlotPreviewRect,
  getJewelCaseFrontTextBlockPreviewLayout,
} from '../layout/jewelCaseFrontLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseState,
  ProjectMetadata,
} from '../project/projectTypes'
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
} from '../render/caseInsertArtworkViewportRenderArtifact'
import {
  createRectPositionedImageRenderArtifact,
} from '../render/imageRenderArtifact'
import { drawCaseInsertArtworkViewportArtifact } from './caseInsertArtworkViewportCanvas'
import {
  partitionCaseInsertArtworkViewportSlots,
} from '../caseInsert/artworkViewportLayerOrder'
import { drawCaseInsertExportGuides } from './drawCaseInsertGuides'
import { drawCaseInsertSteamBanner } from './drawCaseInsertSteamBanner'
import {
  drawImageArtifactInRect,
  drawImageFit,
  drawImageSlotInRect,
} from './caseInsertPngImage'
import {
  drawComputedTextLayout,
  getCaseInsertTextCanvasOptions,
  getCaseInsertTextEffectiveFontWeight,
} from './caseInsertPngText'

type CaseInsertExportLayerRenderer = Record<
  CaseInsertEditorExportLayerId,
  () => void | Promise<void>
>

type CaseInsertMarkLayerKind = 'rating' | 'media' | 'platform' | 'technical'

function getTemplateState(
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
) {
  return caseInsert.templates[paneId]
}

export function drawSurfaceBase(
  context: CanvasRenderingContext2D,
  layout: CaseInsertPreviewLayout,
) {
  context.save()

  for (const surface of layout.surfaces) {
    context.fillStyle = '#ffffff'
    context.fillRect(
      surface.bounds.x,
      surface.bounds.y,
      surface.bounds.width,
      surface.bounds.height,
    )
  }

  context.restore()
}

function getTemplateImageSlotRect(
  paneId: CaseInsertTemplatePaneId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  group: 'titleArtwork' | 'artwork' | 'logo' | 'mark',
) {
  return paneId === 'cover'
    ? getJewelCaseFrontImageSlotPreviewRect(
        slot,
        layout,
        group === 'titleArtwork' ? 'titleArtwork' :
          group === 'artwork' ? 'calloutArtwork' : group,
      )
    : getJewelCaseBackImageSlotPreviewRect(
        slot,
        layout,
        group === 'artwork' ? 'artwork' : group === 'mark' ? 'mark' : 'logo',
      )
}

async function drawTemplateImageSlot(
  context: CanvasRenderingContext2D,
  paneId: CaseInsertTemplatePaneId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  group: 'titleArtwork' | 'artwork' | 'logo' | 'mark',
) {
  if (group === 'artwork') {
    const viewportResult = resolveCaseInsertArtworkViewportRenderArtifact({
      owner: paneId,
      slot,
      layout,
    })
    if (viewportResult.status === 'resolved') {
      await drawCaseInsertArtworkViewportArtifact(
        context,
        viewportResult.artifact,
        slot.frame,
      )
      return
    }
    if (viewportResult.status !== 'legacy') return

    await drawImageSlotInRect(
      context,
      slot,
      getTemplateImageSlotRect(paneId, slot, layout, group),
      slot.label,
    )
    return
  }

  const logoRenderInfo = group === 'logo'
    ? getCaseInsertLogoSlotRenderInfo(slot)
    : null

  await drawImageArtifactInRect(
    context,
    createRectPositionedImageRenderArtifact({
      imageDataUrl: logoRenderInfo?.imageDataUrl ?? slot.imageDataUrl,
      imageSize: logoRenderInfo?.imageSize ?? slot.imageSize,
      label: slot.label,
      rect: getTemplateImageSlotRect(paneId, slot, layout, group),
    }),
  )
}

async function drawTemplateBackgrounds(
  context: CanvasRenderingContext2D,
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
) {
  const templateState = getTemplateState(caseInsert, paneId)

  if (paneId === 'cover') {
    await drawImageFit(
      context,
      getJewelCaseFrontBackgroundFit(
        templateState.background,
        layout,
        templateState.steamBanner,
      ),
      templateState.background.imageDataUrl,
      templateState.background.label,
    )
    return
  }

  await drawImageFit(
    context,
    getJewelCaseBackBackgroundFit(templateState.background, layout),
    templateState.background.imageDataUrl,
    templateState.background.label,
  )
}

async function drawTemplateArtwork(
  context: CanvasRenderingContext2D,
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
) {
  const templateState = getTemplateState(caseInsert, paneId)
  const visibleArtworkSlots = getFeatureVisibleRepeatedArtworkItems(
    templateState,
    templateState.artworkSlots,
  )
  const {
    activeViewportSlots,
    legacySlots,
  } = partitionCaseInsertArtworkViewportSlots(visibleArtworkSlots)

  for (const slot of activeViewportSlots) {
    await drawTemplateImageSlot(context, paneId, slot, layout, 'artwork')
  }

  await drawTemplateImageSlot(
    context,
    paneId,
    templateState.titleArtwork,
    layout,
    'titleArtwork',
  )

  for (const slot of legacySlots) {
    await drawTemplateImageSlot(context, paneId, slot, layout, 'artwork')
  }
}

async function drawTemplateSteamBanner(
  context: CanvasRenderingContext2D,
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
) {
  if (paneId !== 'cover') {
    return
  }

  await drawCaseInsertSteamBanner(
    context,
    getTemplateState(caseInsert, paneId).steamBanner,
    { kind: 'cover' },
    layout,
  )
}

async function drawTemplateSlotGroup(
  context: CanvasRenderingContext2D,
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
  slotKey: 'logoSlots' | 'markSlots',
  brandingSources: CaseInsertBrandingSourceCatalog,
  kind?: CaseInsertMarkLayerKind,
) {
  const templateState = getTemplateState(caseInsert, paneId)
  const slots = templateState[slotKey].filter((slot) =>
    slotKey === 'logoSlots' ||
    Boolean(kind && isCaseInsertMarkSlotVisible(slot, kind, brandingSources)))

  for (const slot of slots) {
    await drawTemplateImageSlot(
      context,
      paneId,
      slot,
      layout,
      slotKey === 'logoSlots' ? 'logo' : 'mark',
    )
  }
}

function drawTemplateTextBlock(
  context: CanvasRenderingContext2D,
  paneId: CaseInsertTemplatePaneId,
  textBlock: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
  metadata: ProjectMetadata,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[],
) {
  const renderedTextBlock = getRenderedCaseInsertTextBlock(textBlock, metadata)
  const textAvoidanceRegions = avoidanceRegions.filter(
    (region) => region.sourceTextBlockId !== renderedTextBlock.id,
  )
  const textLayout = paneId === 'cover'
    ? getJewelCaseFrontTextBlockPreviewLayout(
        renderedTextBlock,
        layout,
        textAvoidanceRegions,
      )
    : getJewelCaseBackTextBlockPreviewLayout(
        renderedTextBlock,
        layout,
        getCaseInsertBackTextBlockRole(renderedTextBlock),
        textAvoidanceRegions,
      )

  if (!textLayout) return

  if (paneId === 'cover') {
    drawComputedTextLayout(context, textLayout, {
      align: renderedTextBlock.align,
      weight: getCaseInsertTextEffectiveFontWeight(
        800,
        renderedTextBlock.style,
      ),
      ...getCaseInsertTextCanvasOptions(renderedTextBlock.style),
    })
    return
  }

  drawComputedTextLayout(context, textLayout, {
    align: renderedTextBlock.align,
    weight: getCaseInsertTextEffectiveFontWeight(
      renderedTextBlock.id.includes('legal') ||
        renderedTextBlock.id.includes('copyright')
        ? 500
        : 600,
      renderedTextBlock.style,
    ),
    ...getCaseInsertTextCanvasOptions(renderedTextBlock.style),
  })
}

function drawTemplateTextList(
  context: CanvasRenderingContext2D,
  textList: ProjectCaseInsertTextList,
  layout: CaseInsertPreviewLayout,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[],
) {
  const textAvoidanceRegions = avoidanceRegions.filter(
    (region) => region.sourceTextListId !== textList.id,
  )
  const textListLayout = getJewelCaseBackTextListPreviewLayout(
    textList,
    layout,
    textAvoidanceRegions,
  )

  if (!textListLayout) return

  drawComputedTextLayout(context, textListLayout, {
    align: 'left',
    weight: getCaseInsertTextEffectiveFontWeight(600, textList.style),
    ...getCaseInsertTextCanvasOptions(textList.style),
  })
}

function drawTemplateText(
  context: CanvasRenderingContext2D,
  templateState: ProjectCaseInsertSurfaceState,
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  const avoidanceRegions = createCaseInsertTemplateTextAvoidanceRegions({
    paneId,
    templateState,
    layout,
    brandingSources,
  })

  for (const textBlock of templateState.textBlocks) {
    drawTemplateTextBlock(
      context,
      paneId,
      textBlock,
      layout,
      brandingSources.projectMetadata,
      avoidanceRegions,
    )
  }
  if (paneId === 'tray') {
    for (const textList of templateState.textLists) {
      drawTemplateTextList(context, textList, layout, avoidanceRegions)
    }
  }
}

export function createTemplateExportLayerRenderers({
  brandingSources,
  caseInsert,
  context,
  layout,
  paneId,
}: {
  brandingSources: CaseInsertBrandingSourceCatalog
  caseInsert: ProjectJewelCaseState
  context: CanvasRenderingContext2D
  layout: CaseInsertPreviewLayout
  paneId: CaseInsertTemplatePaneId
}): Pick<
  CaseInsertExportLayerRenderer,
  Exclude<CaseInsertEditorExportLayerId, 'case-spine-content'>
> {
  const activeTemplateState = getTemplateState(caseInsert, paneId)

  return {
    'case-surface-base': () => drawSurfaceBase(context, layout),
    'case-background-artwork': () =>
      drawTemplateBackgrounds(context, caseInsert, paneId, layout),
    'case-screenshot-artwork': () =>
      drawTemplateArtwork(context, caseInsert, paneId, layout),
    'case-steam-banner': () =>
      drawTemplateSteamBanner(context, caseInsert, paneId, layout),
    'case-artwork': () => undefined,
    'case-title-artwork': () => undefined,
    'case-logo-assets': () =>
      drawTemplateSlotGroup(
        context,
        caseInsert,
        paneId,
        layout,
        'logoSlots',
        brandingSources,
      ),
    'case-rating-badges': () =>
      drawTemplateSlotGroup(
        context,
        caseInsert,
        paneId,
        layout,
        'markSlots',
        brandingSources,
        'rating',
      ),
    'case-media-marks': () =>
      drawTemplateSlotGroup(
        context,
        caseInsert,
        paneId,
        layout,
        'markSlots',
        brandingSources,
        'media',
      ),
    'case-platform-marks': () =>
      drawTemplateSlotGroup(
        context,
        caseInsert,
        paneId,
        layout,
        'markSlots',
        brandingSources,
        'platform',
      ),
    'case-technical-marks': () =>
      drawTemplateSlotGroup(
        context,
        caseInsert,
        paneId,
        layout,
        'markSlots',
        brandingSources,
        'technical',
      ),
    'case-text': () =>
      drawTemplateText(
        context,
        activeTemplateState,
        paneId,
        layout,
        brandingSources,
      ),
    'case-export-guides': () =>
      drawCaseInsertExportGuides(
        context,
        layout,
        caseInsert.export.guideIds,
      ),
  }
}

export { CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER }
