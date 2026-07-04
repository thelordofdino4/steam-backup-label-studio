import {
  type CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources'
import {
  isCaseInsertMarkSlotVisible,
} from '../caseInsert/brandingVisibility'
import {
  getCaseInsertLogoSlotRenderInfo,
} from '../caseInsert/brandingLogoSlots'
import {
  getCaseInsertTextEffectiveFontWeight,
} from './caseInsertPngText'
import {
  getRenderedCaseInsertTextBlock,
} from '../caseInsert/textContent'
import type {
  CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces'
import {
  createCaseInsertPngExportLayout,
} from '../caseInsert/exportLayout'
import {
  createCaseInsertSpineTextAvoidanceRegions,
  type CaseInsertTextAvoidanceRegion,
} from '../layout/caseInsertTextOccupiedRegions'
import {
  CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER,
  type CaseInsertEditorExportLayerId,
} from '../editor/layerOrder'
import {
  getFeatureVisibleRepeatedArtworkItems,
} from '../editor/repeatedArtwork'
import { hasImageContentShape } from '../image/imageContentShape'
import type {
  CaseInsertPreviewLayout,
} from '../layout/caseInsertPreviewLayout'
import {
  getJewelCaseSpineImageSlotPreviewLayout,
  getJewelCaseSpineTitlePreviewLayout,
  getJewelCaseSpineBackgroundFit,
} from '../layout/jewelCaseSpineLayout'
import type {
  ProjectCaseInsertTextBlock,
  ProjectMetadata,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import {
  createBoxPositionedImageRenderArtifact,
} from '../render/imageRenderArtifact'
import { DEFAULT_TEMPLATE_EXPORT_DPI } from '../templates/templateModel'
import {
  canvasToPngBytes,
} from './canvasImage'
import { createArtworkFrameClipPath, drawArtworkFrame } from './drawArtworkFrame'
import { drawCaseInsertSteamBanner } from './drawCaseInsertSteamBanner'
import {
  createTemplateExportLayerRenderers,
} from './caseInsertTemplateExportLayers'
import {
  drawContainImageInLocalBox,
  drawImageFit,
  drawWithTransformedBox,
} from './caseInsertPngImage'
import {
  drawComputedTextLayout,
  getCaseInsertTextCanvasOptions,
} from './caseInsertPngText'

type CaseInsertExportLayerRenderer = Record<
  CaseInsertEditorExportLayerId,
  () => void | Promise<void>
>

function drawSpineTextBlock(
  context: CanvasRenderingContext2D,
  side: 'left' | 'right',
  textBlock: ProjectCaseInsertTextBlock,
  layout: CaseInsertPreviewLayout,
  metadata: ProjectMetadata,
  avoidanceRegions: CaseInsertTextAvoidanceRegion[],
  options: { uppercase?: boolean } = {},
) {
  const renderedTextBlock = getRenderedCaseInsertTextBlock(textBlock, metadata)
  const textLayout = getJewelCaseSpineTitlePreviewLayout(
    side,
    renderedTextBlock,
    layout,
    avoidanceRegions,
  )

  if (!textLayout) {
    return
  }

  drawWithTransformedBox(context, textLayout, () => {
    drawComputedTextLayout(context, {
      bounds: textLayout.textBounds,
      fontSizePx: textLayout.fontSizePx,
      lineHeightPx: textLayout.lineHeightPx,
      lines: textLayout.lines,
    }, {
      align: renderedTextBlock.align,
      weight: getCaseInsertTextEffectiveFontWeight(
        options.uppercase ? 800 : 600,
        renderedTextBlock.style,
      ),
      ...getCaseInsertTextCanvasOptions(renderedTextBlock.style),
    })
  })
}

async function drawSpineSide(
  context: CanvasRenderingContext2D,
  side: 'left' | 'right',
  state: ProjectJewelCaseSpineSideState,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  await drawImageFit(
    context,
    getJewelCaseSpineBackgroundFit(
      side,
      state.background,
      layout,
      state.steamBanner,
    ),
    state.background.imageDataUrl,
    state.background.label,
  )
  await drawCaseInsertSteamBanner(
    context,
    state.steamBanner,
    { kind: 'spine', side },
    layout,
  )
  const artworkSlots = getFeatureVisibleRepeatedArtworkItems(
    state,
    state.artworkSlots,
  )
  const avoidanceRegions = createCaseInsertSpineTextAvoidanceRegions({
    side,
    spineSide: state,
    layout,
    brandingSources,
  })

  for (const [slot, role] of [
    [state.titleArtwork, 'titleArtwork'],
    ...artworkSlots.map((slot) => [slot, 'artwork'] as const),
  ] as const) {
    const artifact = createBoxPositionedImageRenderArtifact({
      imageDataUrl: slot.imageDataUrl,
      imageSize: slot.imageSize,
      label: slot.label,
      box: getJewelCaseSpineImageSlotPreviewLayout(
        side,
        slot,
        layout,
        role,
      ),
    })

    if (!artifact) continue

    const localRect = {
      x: -artifact.box.width / 2,
      y: -artifact.box.height / 2,
      width: artifact.box.width,
      height: artifact.box.height,
    }

    await drawWithTransformedBox(context, artifact.box, async () => {
      if (
        role === 'artwork' &&
        slot.frame.enabled &&
        slot.frame.shape === 'circle' &&
        !hasImageContentShape(slot.imageSize)
      ) {
        createArtworkFrameClipPath(context, slot.frame, localRect)
        context.clip()
      }
      await drawContainImageInLocalBox(
        context,
        artifact.imageDataUrl,
        artifact.imageSize ?? null,
        artifact.box.width,
        artifact.box.height,
        artifact.label,
      )
    })

    if (role === 'artwork') {
      context.save()
      context.translate(artifact.box.center.x, artifact.box.center.y)
      context.rotate(artifact.box.rotationDegrees * Math.PI / 180)
      await drawArtworkFrame(context, slot.frame, localRect, slot.imageSize)
      context.restore()
    }
  }

  drawSpineTextBlock(
    context,
    side,
    state.title,
    layout,
    brandingSources.projectMetadata,
    avoidanceRegions,
    { uppercase: true },
  )

  for (const textBlock of state.textBlocks) {
    drawSpineTextBlock(
      context,
      side,
      textBlock,
      layout,
      brandingSources.projectMetadata,
      avoidanceRegions,
    )
  }

  for (const [slot, role] of [
    ...state.logoSlots.map((slot) => [slot, 'logo'] as const),
    ...(['rating', 'media', 'platform', 'technical'] as const).flatMap(
      (kind) => state.markSlots
        .filter((slot) =>
          isCaseInsertMarkSlotVisible(slot, kind, brandingSources))
        .map((slot) => [slot, 'mark'] as const),
    ),
  ] as const) {
    const logoRenderInfo = role === 'logo'
      ? getCaseInsertLogoSlotRenderInfo(slot)
      : null
    const artifact = createBoxPositionedImageRenderArtifact({
      imageDataUrl: logoRenderInfo?.imageDataUrl ?? slot.imageDataUrl,
      imageSize: logoRenderInfo?.imageSize ?? slot.imageSize,
      label: slot.label,
      box: getJewelCaseSpineImageSlotPreviewLayout(
        side,
        slot,
        layout,
        role,
      ),
    })

    if (!artifact) continue

    await drawWithTransformedBox(context, artifact.box, async () => {
      await drawContainImageInLocalBox(
        context,
        artifact.imageDataUrl,
        artifact.imageSize ?? null,
        artifact.box.width,
        artifact.box.height,
        artifact.label,
      )
    })
  }
}

async function drawSpineContent(
  context: CanvasRenderingContext2D,
  caseInsert: ProjectJewelCaseState,
  layout: CaseInsertPreviewLayout,
  brandingSources: CaseInsertBrandingSourceCatalog,
) {
  if (!layout.surfaces.some(({ surfaceId }) => surfaceId === 'back')) {
    return
  }

  await drawSpineSide(
    context,
    'left',
    caseInsert.spine.left,
    layout,
    brandingSources,
  )
  await drawSpineSide(
    context,
    'right',
    caseInsert.spine.right,
    layout,
    brandingSources,
  )
}

export async function exportCaseInsertPngBytes(params: {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
  brandingSources: CaseInsertBrandingSourceCatalog
  dpi?: number
}) {
  const dpi = params.dpi ?? DEFAULT_TEMPLATE_EXPORT_DPI
  const layout = createCaseInsertPngExportLayout(
    params.caseInsert,
    params.activeTemplatePane,
    { dpi },
  )
  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const rawContext = canvas.getContext('2d')
  if (!rawContext) throw new Error('Could not create case insert PNG export canvas.')
  const context = rawContext

  const layerRenderers: CaseInsertExportLayerRenderer = {
    ...createTemplateExportLayerRenderers({
      brandingSources: params.brandingSources,
      caseInsert: params.caseInsert,
      context,
      layout,
      paneId: params.activeTemplatePane,
    }),
    'case-spine-content': () =>
      drawSpineContent(
        context,
        params.caseInsert,
        layout,
        params.brandingSources,
      ),
  }

  context.clearRect(0, 0, layout.width, layout.height)

  for (const layerId of CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER) {
    await layerRenderers[layerId]()
  }

  const bytes = await canvasToPngBytes(canvas)
  return { bytes, width: layout.width, height: layout.height, dpi }
}
