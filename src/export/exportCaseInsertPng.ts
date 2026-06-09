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
  getCaseInsertBackTextBlockRole,
} from '../caseInsert/textReadability'
import {
  CASE_INSERT_TEXT_STROKE_COLOR,
  caseInsertTextUsesShadow,
  caseInsertTextUsesStroke,
  getCaseInsertTextBackgroundColor,
  getCaseInsertTextBorderColor,
  getCaseInsertTextLayoutPaddingRatio,
} from '../caseInsert/textRenderStyles'
import {
  getCaseInsertTextFontFamilyCanvas,
  type CaseInsertTextStyle,
} from '../caseInsert/textStyles'
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
  createCaseInsertTemplateTextAvoidanceRegions,
  type CaseInsertTextAvoidanceRegion,
} from '../layout/caseInsertTextOccupiedRegions'
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
import type { JewelCaseImageFitResult, JewelCasePixelRect } from '../layout/jewelCaseLayout'
import {
  getJewelCaseSpineBackgroundFit,
  getJewelCaseSpineImageSlotPreviewLayout,
  getJewelCaseSpineTitlePreviewLayout,
  type JewelCaseSpineBoxLayout,
} from '../layout/jewelCaseSpineLayout'
import {
  getCanvasTextAlign,
} from '../layout/caseInsertTextVisualLayout'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectMetadata,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import {
  createBoxPositionedImageRenderArtifact,
  createRectPositionedImageRenderArtifact,
  type RectPositionedImageRenderArtifact,
} from '../render/imageRenderArtifact'
import { DEFAULT_TEMPLATE_EXPORT_DPI } from '../templates/templateModel'
import {
  canvasToPngBytes,
  drawImageContent,
  getCanvasImageContentSize,
  loadCanvasSafeImage,
} from './canvasImage'
import { drawCaseInsertExportGuides } from './drawCaseInsertGuides'
import { drawCaseInsertSteamBanner } from './drawCaseInsertSteamBanner'

type CaseInsertExportLayerRenderer = Record<
  CaseInsertEditorExportLayerId,
  () => void | Promise<void>
>

type CaseInsertMarkLayerKind = 'rating' | 'media' | 'platform' | 'technical'

const FONT_STACK = '"Segoe UI", Arial, sans-serif'

function getTemplateState(
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
) {
  return caseInsert.templates[paneId]
}

function drawSurfaceBase(
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

async function drawImageFit(
  context: CanvasRenderingContext2D,
  fit: JewelCaseImageFitResult | null,
  imageDataUrl: string | null,
  description: string,
  beforeImage?: () => void,
  afterImage?: () => void,
) {
  if (!fit || !imageDataUrl) {
    return
  }

  const image = await loadCanvasSafeImage(imageDataUrl, description)

  context.save()
  beforeImage?.()
  context.beginPath()
  context.rect(
    fit.region.x,
    fit.region.y,
    fit.region.width,
    fit.region.height,
  )
  context.clip()

  if (fit.sourceRect.width <= 0 || fit.sourceRect.height <= 0) {
    context.restore()
    return
  }

  context.drawImage(
    image,
    fit.sourceRect.x,
    fit.sourceRect.y,
    fit.sourceRect.width,
    fit.sourceRect.height,
    fit.visibleRect.x,
    fit.visibleRect.y,
    fit.visibleRect.width,
    fit.visibleRect.height,
  )
  afterImage?.()
  context.restore()
}

async function drawImageArtifactInRect(
  context: CanvasRenderingContext2D,
  artifact: RectPositionedImageRenderArtifact | null,
) {
  if (!artifact) {
    return
  }

  const image = await loadCanvasSafeImage(artifact.imageDataUrl, artifact.label)

  drawImageContent(
    context,
    image,
    artifact.imageSize,
    artifact.rect,
  )
}

function createImageSlotFramePath(
  context: CanvasRenderingContext2D,
  slot: ProjectCaseInsertImageSlot,
  rect: JewelCasePixelRect,
  strokeWidth = 0,
) {
  const inset = strokeWidth / 2

  context.beginPath()

  if (slot.frame.shape === 'circle') {
    context.ellipse(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      Math.max(0, (rect.width - strokeWidth) / 2),
      Math.max(0, (rect.height - strokeWidth) / 2),
      0,
      0,
      Math.PI * 2,
    )
    return
  }

  context.rect(
    rect.x + inset,
    rect.y + inset,
    Math.max(0, rect.width - strokeWidth),
    Math.max(0, rect.height - strokeWidth),
  )
}

function drawImageSlotFrame(
  context: CanvasRenderingContext2D,
  slot: ProjectCaseInsertImageSlot,
  rect: JewelCasePixelRect,
) {
  if (!slot.frame.enabled) {
    return
  }

  const strokeWidth = Math.max(
    1,
    Math.min(rect.width, rect.height) * (slot.frame.width / 100),
  )

  context.save()
  context.strokeStyle = slot.frame.color
  context.lineWidth = strokeWidth
  createImageSlotFramePath(context, slot, rect, strokeWidth)
  context.stroke()
  context.restore()
}

async function drawImageSlotInRect(
  context: CanvasRenderingContext2D,
  slot: ProjectCaseInsertImageSlot,
  rect: JewelCasePixelRect | null,
  description: string,
) {
  if (!rect || !slot.imageDataUrl) {
    return
  }

  const image = await loadCanvasSafeImage(slot.imageDataUrl, description)

  context.save()
  if (slot.frame.enabled && slot.frame.shape === 'circle') {
    createImageSlotFramePath(context, slot, rect)
    context.clip()
  }
  drawImageContent(context, image, slot.imageSize, rect)
  context.restore()

  drawImageSlotFrame(context, slot, rect)
}

async function drawContainImageInLocalBox(
  context: CanvasRenderingContext2D,
  imageDataUrl: string,
  imageSize: ProjectCaseInsertImageSlot['imageSize'],
  width: number,
  height: number,
  description: string,
) {
  const image = await loadCanvasSafeImage(imageDataUrl, description)
  const contentSize = getCanvasImageContentSize(image, imageSize)

  if (!contentSize) {
    return
  }

  const scale = Math.min(width / contentSize.width, height / contentSize.height)
  const drawWidth = contentSize.width * scale
  const drawHeight = contentSize.height * scale

  drawImageContent(
    context,
    image,
    imageSize,
    {
      x: -drawWidth / 2,
      y: -drawHeight / 2,
      width: drawWidth,
      height: drawHeight,
    },
  )
}

function drawWithTransformedBox(
  context: CanvasRenderingContext2D,
  box: JewelCaseSpineBoxLayout,
  draw: () => void | Promise<void>,
) {
  context.save()
  context.translate(box.center.x, box.center.y)
  context.rotate(box.rotationDegrees * Math.PI / 180)
  context.beginPath()
  context.rect(-box.width / 2, -box.height / 2, box.width, box.height)
  context.clip()

  const result = draw()

  if (result instanceof Promise) {
    return result.finally(() => context.restore())
  }

  context.restore()
  return undefined
}

function getCaseInsertTextCanvasOptions(style: CaseInsertTextStyle) {
  return {
    color: style.color,
    fontFamily: getCaseInsertTextFontFamilyCanvas(style.fontFamily),
    background: style.backgroundEnabled
      ? getCaseInsertTextBackgroundColor(style)
      : undefined,
    border: style.backgroundEnabled && style.borderEnabled
      ? getCaseInsertTextBorderColor(style)
      : undefined,
    shadow: caseInsertTextUsesShadow(style),
    stroke: caseInsertTextUsesStroke(style),
    paddingRatio: getCaseInsertTextLayoutPaddingRatio(style),
  }
}

function drawComputedTextLayout(
  context: CanvasRenderingContext2D,
  textLayout: {
    bounds: JewelCasePixelRect
    fontSizePx: number
    lineHeightPx: number
    lines: Array<{
      text: string
      x: number
      y: number
    }>
  },
  options: {
    align: ProjectCaseInsertTextAlign
    weight?: number
    color?: string
    fontFamily?: string
    background?: string
    border?: string
    shadow?: boolean
    stroke?: boolean
  },
) {
  context.save()
  context.font = `${options.weight ?? 600} ${textLayout.fontSizePx}px ${
    options.fontFamily ?? FONT_STACK
  }`
  context.textAlign = getCanvasTextAlign(options.align)
  context.textBaseline = 'top'

  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(
      textLayout.bounds.x,
      textLayout.bounds.y,
      textLayout.bounds.width,
      textLayout.bounds.height,
    )
  }

  if (options.border) {
    context.strokeStyle = options.border
    context.lineWidth = Math.max(1, Math.round(textLayout.fontSizePx * 0.08))
    context.strokeRect(
      textLayout.bounds.x,
      textLayout.bounds.y,
      textLayout.bounds.width,
      textLayout.bounds.height,
    )
  }

  context.beginPath()
  context.rect(
    textLayout.bounds.x,
    textLayout.bounds.y,
    textLayout.bounds.width,
    textLayout.bounds.height,
  )
  context.clip()
  context.fillStyle = options.color ?? '#f8fafc'

  if (options.shadow) {
    context.shadowColor = 'rgba(0, 0, 0, 0.8)'
    context.shadowBlur = Math.max(3, textLayout.fontSizePx * 0.18)
    context.shadowOffsetY = Math.max(1, textLayout.fontSizePx * 0.04)
  }

  textLayout.lines.forEach((line) => {
    if (options.stroke) {
      context.save()
      context.shadowColor = 'transparent'
      context.strokeStyle = CASE_INSERT_TEXT_STROKE_COLOR
      context.lineJoin = 'round'
      context.lineWidth = Math.max(1, textLayout.fontSizePx * 0.08)
      context.strokeText(line.text, line.x, line.y)
      context.restore()
    }

    context.fillText(line.text, line.x, line.y)
  })
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
      getJewelCaseFrontBackgroundFit(templateState.background, layout),
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

  await drawTemplateImageSlot(
    context,
    paneId,
    templateState.titleArtwork,
    layout,
    'titleArtwork',
  )

  for (const slot of getFeatureVisibleRepeatedArtworkItems(
    templateState,
    templateState.artworkSlots,
  )) {
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
      weight: 800,
      ...getCaseInsertTextCanvasOptions(renderedTextBlock.style),
    })
    return
  }

  drawComputedTextLayout(context, textLayout, {
    align: renderedTextBlock.align,
    weight: renderedTextBlock.id.includes('legal') ||
        renderedTextBlock.id.includes('copyright')
      ? 500
      : 600,
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
    weight: 600,
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
      weight: options.uppercase ? 800 : 600,
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
    getJewelCaseSpineBackgroundFit(side, state.background, layout),
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

    await drawWithTransformedBox(context, artifact.box, async () => {
      const localRect = {
        x: -artifact.box.width / 2,
        y: -artifact.box.height / 2,
        width: artifact.box.width,
        height: artifact.box.height,
      }

      if (role === 'artwork' && slot.frame.enabled && slot.frame.shape === 'circle') {
        createImageSlotFramePath(context, slot, localRect)
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
      if (role === 'artwork') {
        drawImageSlotFrame(context, slot, localRect)
      }
    })
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
  const activeTemplateState = getTemplateState(
    params.caseInsert,
    params.activeTemplatePane,
  )
  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const rawContext = canvas.getContext('2d')
  if (!rawContext) throw new Error('Could not create case insert PNG export canvas.')
  const context = rawContext

  const layerRenderers: CaseInsertExportLayerRenderer = {
    'case-surface-base': () => drawSurfaceBase(context, layout),
    'case-background-artwork': () =>
      drawTemplateBackgrounds(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
      ),
    'case-screenshot-artwork': () =>
      drawTemplateArtwork(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
      ),
    'case-steam-banner': () =>
      drawTemplateSteamBanner(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
      ),
    'case-artwork': () => undefined,
    'case-title-artwork': () => undefined,
    'case-logo-assets': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'logoSlots',
        params.brandingSources,
      ),
    'case-rating-badges': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'markSlots',
        params.brandingSources,
        'rating',
      ),
    'case-media-marks': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'markSlots',
        params.brandingSources,
        'media',
      ),
    'case-platform-marks': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'markSlots',
        params.brandingSources,
        'platform',
      ),
    'case-technical-marks': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'markSlots',
        params.brandingSources,
        'technical',
      ),
    'case-text': () =>
      drawTemplateText(
        context,
        activeTemplateState,
        params.activeTemplatePane,
        layout,
        params.brandingSources,
      ),
    'case-spine-content': () =>
      drawSpineContent(
        context,
        params.caseInsert,
        layout,
        params.brandingSources,
      ),
    'case-export-guides': () =>
      drawCaseInsertExportGuides(
        context,
        layout,
        params.caseInsert.export.guideIds,
      ),
  }

  context.clearRect(0, 0, layout.width, layout.height)

  for (const layerId of CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER) {
    await layerRenderers[layerId]()
  }

  const bytes = await canvasToPngBytes(canvas)
  return { bytes, width: layout.width, height: layout.height, dpi }
}
