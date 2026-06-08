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
import type {
  CaseInsertTemplatePaneId,
} from '../caseInsert/templateSurfaces'
import {
  createCaseInsertPngExportLayout,
} from '../caseInsert/exportLayout'
import {
  CASE_INSERT_EDITOR_EXPORT_LAYER_ORDER,
  type CaseInsertEditorExportLayerId,
} from '../editor/layerOrder'
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
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertSurfaceState,
  ProjectCaseInsertTextAlign,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
  ProjectJewelCaseSpineSideState,
  ProjectJewelCaseState,
} from '../project/projectTypes'
import { DEFAULT_TEMPLATE_EXPORT_DPI } from '../templates/templateModel'
import { canvasToPngBytes, loadCanvasSafeImage } from './canvasImage'
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
  context.drawImage(
    image,
    fit.imageRect.x,
    fit.imageRect.y,
    fit.imageRect.width,
    fit.imageRect.height,
  )
  afterImage?.()
  context.restore()
}

async function drawImageInRect(
  context: CanvasRenderingContext2D,
  imageDataUrl: string | null,
  rect: JewelCasePixelRect | null,
  description: string,
) {
  if (!rect || !imageDataUrl) {
    return
  }

  const image = await loadCanvasSafeImage(imageDataUrl, description)

  context.drawImage(image, rect.x, rect.y, rect.width, rect.height)
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
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height)
  context.restore()

  drawImageSlotFrame(context, slot, rect)
}

async function drawContainImageInLocalBox(
  context: CanvasRenderingContext2D,
  imageDataUrl: string,
  width: number,
  height: number,
  description: string,
) {
  const image = await loadCanvasSafeImage(imageDataUrl, description)
  const scale = Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale

  context.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
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

function getTextAlignX(
  rect: JewelCasePixelRect,
  align: ProjectCaseInsertTextAlign,
  padding: number,
) {
  if (align === 'right') return rect.x + rect.width - padding
  if (align === 'center') return rect.x + rect.width / 2

  return rect.x + padding
}

function getCanvasTextAlign(align: ProjectCaseInsertTextAlign): CanvasTextAlign {
  if (align === 'right') return 'right'
  if (align === 'center') return 'center'

  return 'left'
}

function wrapLine(
  context: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
) {
  const words = line.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word

    if (
      currentLine &&
      context.measureText(candidate).width > maxWidth
    ) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = candidate
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : ['']
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .flatMap((line) => wrapLine(context, line, maxWidth))
}

function drawWrappedTextBox(
  context: CanvasRenderingContext2D,
  rect: JewelCasePixelRect,
  text: string,
  options: {
    align: ProjectCaseInsertTextAlign
    fontSizePx: number
    lineHeightPx: number
    weight?: number
    color?: string
    uppercase?: boolean
    paddingRatio?: number
    background?: string
    border?: string
    shadow?: boolean
    verticalAlign?: 'center' | 'top'
  },
) {
  const padding = Math.max(
    2,
    Math.round(options.fontSizePx * (options.paddingRatio ?? 0.55)),
  )
  const innerWidth = Math.max(1, rect.width - padding * 2)
  const innerHeight = Math.max(1, rect.height - padding * 2)
  const fontWeight = options.weight ?? 600
  const renderedText = options.uppercase ? textValueToUppercase(text) : text

  context.save()
  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(rect.x, rect.y, rect.width, rect.height)
  }
  if (options.border) {
    context.strokeStyle = options.border
    context.lineWidth = Math.max(1, Math.round(options.fontSizePx * 0.08))
    context.strokeRect(rect.x, rect.y, rect.width, rect.height)
  }

  context.beginPath()
  context.rect(rect.x, rect.y, rect.width, rect.height)
  context.clip()
  context.font = `${fontWeight} ${options.fontSizePx}px ${FONT_STACK}`
  context.fillStyle = options.color ?? '#f8fafc'
  context.textAlign = getCanvasTextAlign(options.align)
  context.textBaseline = 'top'

  if (options.shadow) {
    context.shadowColor = 'rgba(0, 0, 0, 0.8)'
    context.shadowBlur = Math.max(3, options.fontSizePx * 0.18)
    context.shadowOffsetY = Math.max(1, options.fontSizePx * 0.04)
  }

  const lines = wrapText(context, renderedText, innerWidth)
  const maxLineCount = Math.max(1, Math.floor(innerHeight / options.lineHeightPx))
  const visibleLines = lines.slice(0, maxLineCount)
  const contentHeight = visibleLines.length * options.lineHeightPx
  const startY = options.verticalAlign === 'top'
    ? rect.y + padding
    : rect.y + padding + Math.max(0, (innerHeight - contentHeight) / 2)
  const x = getTextAlignX(rect, options.align, padding)

  visibleLines.forEach((line, index) => {
    context.fillText(line, x, startY + index * options.lineHeightPx)
  })
  context.restore()
}

function textValueToUppercase(value: string) {
  return value.toLocaleUpperCase()
}

function drawListTextBox(
  context: CanvasRenderingContext2D,
  rect: JewelCasePixelRect,
  items: string[],
  fontSizePx: number,
  lineHeightPx: number,
) {
  drawWrappedTextBox(
    context,
    rect,
    items.map((item) => `• ${item}`).join('\n'),
    {
      align: 'left',
      fontSizePx,
      lineHeightPx,
      weight: 600,
      color: '#f8fafc',
      background: 'rgba(15, 23, 42, 0.58)',
      border: 'rgba(255, 255, 255, 0.18)',
      verticalAlign: 'center',
    },
  )
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

  await drawImageInRect(
    context,
    logoRenderInfo?.imageDataUrl ?? slot.imageDataUrl,
    getTemplateImageSlotRect(paneId, slot, layout, group),
    slot.label,
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

  if (!templateState.additionalArtworkEnabled) {
    return
  }

  for (const slot of templateState.artworkSlots) {
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
) {
  const textLayout = paneId === 'cover'
    ? getJewelCaseFrontTextBlockPreviewLayout(textBlock, layout)
    : getJewelCaseBackTextBlockPreviewLayout(
        textBlock,
        layout,
        getCaseInsertBackTextBlockRole(textBlock),
      )

  if (!textLayout) return

  if (paneId === 'cover') {
    drawWrappedTextBox(context, textLayout.bounds, textBlock.value, {
      align: textBlock.align,
      fontSizePx: textLayout.fontSizePx,
      lineHeightPx: textLayout.lineHeightPx,
      weight: 800,
      color: '#ffffff',
      uppercase: true,
      shadow: true,
      verticalAlign: 'center',
    })
    return
  }

  drawWrappedTextBox(context, textLayout.bounds, textBlock.value, {
    align: textBlock.align,
    fontSizePx: textLayout.fontSizePx,
    lineHeightPx: textLayout.lineHeightPx,
    weight: textBlock.id.includes('legal') ? 500 : 600,
    color: '#f8fafc',
    background: textBlock.id.includes('legal') ||
      textBlock.id.includes('requirements')
      ? 'rgba(15, 23, 42, 0.68)'
      : 'rgba(15, 23, 42, 0.58)',
    border: 'rgba(255, 255, 255, 0.18)',
    verticalAlign: 'center',
  })
}

function drawTemplateTextList(
  context: CanvasRenderingContext2D,
  textList: ProjectCaseInsertTextList,
  layout: CaseInsertPreviewLayout,
) {
  const textListLayout = getJewelCaseBackTextListPreviewLayout(textList, layout)

  if (!textListLayout) return

  drawListTextBox(
    context,
    textListLayout.bounds,
    textListLayout.items,
    textListLayout.fontSizePx,
    textListLayout.lineHeightPx,
  )
}

function drawTemplateText(
  context: CanvasRenderingContext2D,
  templateState: ProjectCaseInsertSurfaceState,
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
) {
  for (const textBlock of templateState.textBlocks) {
    drawTemplateTextBlock(context, paneId, textBlock, layout)
  }
  if (paneId === 'tray') {
    for (const textList of templateState.textLists) {
      drawTemplateTextList(context, textList, layout)
    }
  }
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
  const artworkSlots = state.additionalArtworkEnabled ? state.artworkSlots : []

  for (const [slot, role] of [
    [state.titleArtwork, 'titleArtwork'],
    ...artworkSlots.map((slot) => [slot, 'artwork'] as const),
  ] as const) {
    const slotLayout = getJewelCaseSpineImageSlotPreviewLayout(
      side,
      slot,
      layout,
      role,
    )

    const imageDataUrl = slot.imageDataUrl

    if (!slotLayout || !imageDataUrl) continue

    await drawWithTransformedBox(context, slotLayout, async () => {
      const localRect = {
        x: -slotLayout.width / 2,
        y: -slotLayout.height / 2,
        width: slotLayout.width,
        height: slotLayout.height,
      }

      if (role === 'artwork' && slot.frame.enabled && slot.frame.shape === 'circle') {
        createImageSlotFramePath(context, slot, localRect)
        context.clip()
      }
      await drawContainImageInLocalBox(
        context,
        imageDataUrl,
        slotLayout.width,
        slotLayout.height,
        slot.label,
      )
      if (role === 'artwork') {
        drawImageSlotFrame(context, slot, localRect)
      }
    })
  }

  const titleLayout = getJewelCaseSpineTitlePreviewLayout(
    side,
    state.title,
    layout,
  )
  if (titleLayout) {
    drawWithTransformedBox(context, titleLayout, () => {
      drawWrappedTextBox(
        context,
        {
          x: -titleLayout.width / 2,
          y: -titleLayout.height / 2,
          width: titleLayout.width,
          height: titleLayout.height,
        },
        state.title.value,
        {
          align: state.title.align,
          fontSizePx: titleLayout.fontSizePx,
          lineHeightPx: titleLayout.lineHeightPx,
          weight: 800,
          color: '#ffffff',
          uppercase: true,
          shadow: true,
          verticalAlign: 'center',
        },
      )
    })
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
    const slotLayout = getJewelCaseSpineImageSlotPreviewLayout(
      side,
      slot,
      layout,
      role,
    )

    if (!slotLayout) continue

    const logoRenderInfo = role === 'logo'
      ? getCaseInsertLogoSlotRenderInfo(slot)
      : null
    const imageDataUrl = logoRenderInfo?.imageDataUrl ?? slot.imageDataUrl

    await drawWithTransformedBox(context, slotLayout, async () => {
      if (imageDataUrl) {
        await drawContainImageInLocalBox(
          context,
          imageDataUrl,
          slotLayout.width,
          slotLayout.height,
          slot.label,
        )
      }
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
