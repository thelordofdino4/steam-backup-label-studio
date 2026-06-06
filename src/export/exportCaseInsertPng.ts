import {
  getCaseInsertMarkLayerKind,
} from '../caseInsert/brandingSlotSources'
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
  getJewelCaseBackScreenshotFit,
  getJewelCaseBackTextBlockPreviewLayout,
  getJewelCaseBackTextListPreviewLayout,
  type JewelCaseBackTextBlockRole,
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

function getTrayTextRole(textBlock: ProjectCaseInsertTextBlock):
JewelCaseBackTextBlockRole {
  if (textBlock.id.includes('minimum')) return 'minimumRequirements'
  if (textBlock.id.includes('recommended')) return 'recommendedRequirements'
  if (textBlock.id.includes('legal')) return 'legalText'

  return 'description'
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
        group === 'mark' ? 'mark' : 'logo',
      )
}

async function drawTemplateImageSlot(
  context: CanvasRenderingContext2D,
  paneId: CaseInsertTemplatePaneId,
  slot: ProjectCaseInsertImageSlot,
  layout: CaseInsertPreviewLayout,
  group: 'titleArtwork' | 'artwork' | 'logo' | 'mark',
) {
  await drawImageInRect(
    context,
    slot.imageDataUrl,
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

  if (paneId === 'cover') {
    await drawTemplateImageSlot(
      context,
      'cover',
      templateState.titleArtwork,
      layout,
      'titleArtwork',
    )

    for (const slot of templateState.artworkSlots) {
      await drawTemplateImageSlot(context, 'cover', slot, layout, 'artwork')
    }
    return
  }

  for (const [index, slot] of templateState.artworkSlots.entries()) {
    const screenshotFit = getJewelCaseBackScreenshotFit(
      slot,
      layout,
      index,
      templateState.artworkSlots.length,
    )

    await drawImageFit(
      context,
      screenshotFit,
      slot.imageDataUrl,
      slot.label,
      () => {
        if (!screenshotFit) return
        context.fillStyle = 'rgba(15, 23, 42, 0.54)'
        context.fillRect(
          screenshotFit.region.x,
          screenshotFit.region.y,
          screenshotFit.region.width,
          screenshotFit.region.height,
        )
        context.strokeStyle = 'rgba(255, 255, 255, 0.64)'
        context.lineWidth = 2
        context.strokeRect(
          screenshotFit.region.x + 1,
          screenshotFit.region.y + 1,
          Math.max(0, screenshotFit.region.width - 2),
          Math.max(0, screenshotFit.region.height - 2),
        )
      },
      () => {
        if (!screenshotFit) return
        context.strokeStyle = 'rgba(255, 255, 255, 0.64)'
        context.lineWidth = 2
        context.strokeRect(
          screenshotFit.region.x + 1,
          screenshotFit.region.y + 1,
          Math.max(0, screenshotFit.region.width - 2),
          Math.max(0, screenshotFit.region.height - 2),
        )
      },
    )
  }
}

async function drawTemplateSlotGroup(
  context: CanvasRenderingContext2D,
  caseInsert: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  layout: CaseInsertPreviewLayout,
  slotKey: 'logoSlots' | 'markSlots',
  kind?: CaseInsertMarkLayerKind,
) {
  const templateState = getTemplateState(caseInsert, paneId)
  const slots = templateState[slotKey].filter((slot) =>
    slotKey === 'logoSlots' ||
    getCaseInsertMarkLayerKind(slot.imageSource?.sourceId) === kind)

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
        getTrayTextRole(textBlock),
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
) {
  await drawImageFit(
    context,
    getJewelCaseSpineBackgroundFit(side, state.background, layout),
    state.background.imageDataUrl,
    state.background.label,
  )

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
    [state.steamBackupBranding, 'branding'],
    [state.logo, 'logo'],
  ] as const) {
    const slotLayout = getJewelCaseSpineImageSlotPreviewLayout(
      side,
      slot,
      layout,
      role,
    )

    if (!slotLayout) continue

    await drawWithTransformedBox(context, slotLayout, async () => {
      if (slot.imageDataUrl) {
        await drawContainImageInLocalBox(
          context,
          slot.imageDataUrl,
          slotLayout.width,
          slotLayout.height,
          slot.label,
        )
        return
      }

      if (role === 'branding') {
        drawWrappedTextBox(
          context,
          {
            x: -slotLayout.width / 2,
            y: -slotLayout.height / 2,
            width: slotLayout.width,
            height: slotLayout.height,
          },
          'Steam Backup',
          {
            align: 'center',
            fontSizePx: Math.max(8, slotLayout.height * 0.38),
            lineHeightPx: Math.max(9, slotLayout.height * 0.44),
            weight: 800,
            color: '#f8fafc',
            background: 'rgba(15, 23, 42, 0.72)',
            border: 'rgba(255, 255, 255, 0.28)',
            uppercase: true,
            verticalAlign: 'center',
          },
        )
      }
    })
  }
}

async function drawSpineContent(
  context: CanvasRenderingContext2D,
  caseInsert: ProjectJewelCaseState,
  layout: CaseInsertPreviewLayout,
) {
  if (!layout.surfaces.some(({ surfaceId }) => surfaceId === 'back')) {
    return
  }

  await drawSpineSide(context, 'left', caseInsert.spine.left, layout)
  await drawSpineSide(context, 'right', caseInsert.spine.right, layout)
}

export async function exportCaseInsertPngBytes(params: {
  caseInsert: ProjectJewelCaseState
  activeTemplatePane: CaseInsertTemplatePaneId
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
    'case-callout-artwork': () => undefined,
    'case-title-artwork': () => undefined,
    'case-logo-assets': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'logoSlots',
      ),
    'case-rating-badges': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'markSlots',
        'rating',
      ),
    'case-media-marks': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'markSlots',
        'media',
      ),
    'case-platform-marks': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'markSlots',
        'platform',
      ),
    'case-technical-marks': () =>
      drawTemplateSlotGroup(
        context,
        params.caseInsert,
        params.activeTemplatePane,
        layout,
        'markSlots',
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
      drawSpineContent(context, params.caseInsert, layout),
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
