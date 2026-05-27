import {
  DISC_TEXT_KEYS,
  getDiscTextContent,
  getReadableCurvedTextScale,
  type DiscTextKey,
  type DiscTextLayoutSettings,
  type DiscTextSettings,
  type DiscTextValues,
  type SteamLogoPlacement,
} from '../discText'
import { EXPORT_DPI, mmToPixels } from '../discGeometry'
import { getStraightDiscTextRenderLayout, type TextMeasureFunction } from '../discTextRenderLayout'
import { DISC_TEXT_RENDER_STYLES } from '../discTextStyles'
import { resolveMetadataBoundDiscTextValues } from '../project/metadataDiscText'
import type { ProjectMetadata } from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'

type BoxReport = {
  x: number
  y: number
  width: number
  height: number
}

type TextNodeReport = {
  index: number | null
  text: string
  className: string
  bboxViewBoxUnits: BoxReport | null
  rectPx: BoxReport
  rectPercentOfPreview: BoxReport | null
  computedStyle: {
    fill: string
    stroke: string
    strokeWidth: string
    fontFamily: string
    fontSize: string
    fontWeight: string
    filter: string
    textShadow: string
  }
}

type TextElementReport = {
  key: DiscTextKey
  enabled: boolean
  text: string
  mode: string
  sourceLayout: Record<string, unknown>
  renderStyle: Record<string, unknown>
  previewDom: {
    layerCount: number
    textNodeCount: number
    textNodes: TextNodeReport[]
    matchStrategy: string
  }
  straightLayout?: {
    previewMeasured: ReturnType<typeof getStraightDiscTextRenderLayout>
    exportMeasured: ReturnType<typeof getStraightDiscTextRenderLayout>
    lineTextMatches: boolean
    fontSizeMatches: boolean
  }
  curvedLayout?: {
    effectiveScale: number
    expectedFontSizeViewBoxUnits: number
    expectedLineStepViewBoxUnits: number
    expectedLetterSpacingViewBoxUnits: number
  }
}

export type TextParityDiagnosticsReport = {
  generatedAt: string
  app: {
    diagnostic: 'text-preview-export-parity'
    version: 1
  }
  environment: {
    devicePixelRatio: number
    exportDpi: number
    previewRectPx: BoxReport | null
    exportDiscContentSizePx: number
    previewPxPerViewBoxUnit: number | null
    exportPxPerViewBoxUnit: number
  }
  template: {
    id: string
    name: string
    outerDiameterMm: number
    safeDiameterMm: number
  }
  allPreviewTextNodes: TextNodeReport[]
  textElements: TextElementReport[]
}

function roundNumber(value: number, digits = 4) {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function boxToReport(box: DOMRect | SVGRect): BoxReport {
  return {
    x: roundNumber(box.x),
    y: roundNumber(box.y),
    width: roundNumber(box.width),
    height: roundNumber(box.height),
  }
}

function rectToPercentBox(rect: DOMRect, previewRect: DOMRect | null): BoxReport | null {
  if (!previewRect || previewRect.width <= 0 || previewRect.height <= 0) return null

  return {
    x: roundNumber(((rect.left - previewRect.left) / previewRect.width) * 100),
    y: roundNumber(((rect.top - previewRect.top) / previewRect.height) * 100),
    width: roundNumber((rect.width / previewRect.width) * 100),
    height: roundNumber((rect.height / previewRect.height) * 100),
  }
}

function createScaledCanvasMeasure(discSizePx: number): TextMeasureFunction {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  return (text, font) => {
    const scaledFont = font.replace(/(\d+(?:\.\d+)?)px/g, (_, fontSize: string) => {
      return `${(Number(fontSize) / 100) * discSizePx}px`
    })

    if (!context) {
      const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/)
      const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 1
      return Array.from(text).length * fontSize * 0.58
    }

    context.font = scaledFont
    return (context.measureText(text).width / discSizePx) * 100
  }
}

function getTextNodeReport(
  element: Element,
  index: number | null,
  previewRect: DOMRect | null,
): TextNodeReport {
  const rect = element.getBoundingClientRect()
  const computedStyle = window.getComputedStyle(element)
  const svgElement = element instanceof SVGGraphicsElement ? element : null
  let bboxViewBoxUnits: BoxReport | null = null

  if (svgElement) {
    try {
      bboxViewBoxUnits = boxToReport(svgElement.getBBox())
    } catch {
      bboxViewBoxUnits = null
    }
  }

  return {
    index,
    text: element.textContent?.trim() ?? '',
    className: element.getAttribute('class') ?? '',
    bboxViewBoxUnits,
    rectPx: boxToReport(rect),
    rectPercentOfPreview: rectToPercentBox(rect, previewRect),
    computedStyle: {
      fill: computedStyle.fill,
      stroke: computedStyle.stroke,
      strokeWidth: computedStyle.strokeWidth,
      fontFamily: computedStyle.fontFamily,
      fontSize: computedStyle.fontSize,
      fontWeight: computedStyle.fontWeight,
      filter: computedStyle.filter,
      textShadow: computedStyle.textShadow,
    },
  }
}

function getAllPreviewTextNodes(
  previewElement: HTMLElement | null,
  previewRect: DOMRect | null,
) {
  if (!previewElement) return []

  return Array.from(
    previewElement.querySelectorAll('.disc-straight-text, .disc-curved-text'),
  ).map((element, index) => getTextNodeReport(element, index, previewRect))
}

function getPreviewTextNodesForText(allNodes: TextNodeReport[], text: string) {
  if (!text) return []
  const normalizedText = text.trim()
  return allNodes.filter((node) => {
    const nodeText = node.text.trim()
    return nodeText === normalizedText || normalizedText.includes(nodeText) || nodeText.includes(normalizedText)
  })
}

function getLayerCount(previewElement: HTMLElement | null, mode: string) {
  if (!previewElement) return 0
  return previewElement.querySelectorAll(mode === 'curved' ? '.disc-curved-text-svg' : '.disc-straight-text-svg').length
}

export function buildTextParityDiagnostics(params: {
  previewElement: HTMLElement | null
  selectedDiscTemplate: DiscTemplate
  steamLogoPlacement: SteamLogoPlacement
  discTextSettings: DiscTextSettings
  discTextValues: DiscTextValues
  projectMetadata: ProjectMetadata
  manualGameTitle: string
  discTextLayout: DiscTextLayoutSettings
}): TextParityDiagnosticsReport {
  const previewRect = params.previewElement?.getBoundingClientRect() ?? null
  const allPreviewTextNodes = getAllPreviewTextNodes(params.previewElement, previewRect)
  const exportDiscContentSizePx = mmToPixels(params.selectedDiscTemplate.outerDiameterMm)
  const previewDiscSizePx = previewRect?.width && previewRect.width > 0
    ? previewRect.width
    : exportDiscContentSizePx
  const previewMeasure = createScaledCanvasMeasure(previewDiscSizePx)
  const exportMeasure = createScaledCanvasMeasure(exportDiscContentSizePx)
  const resolvedValues = resolveMetadataBoundDiscTextValues(
    params.discTextValues,
    params.projectMetadata,
  )

  const textElements = DISC_TEXT_KEYS.map((key) => {
    const enabled = params.discTextSettings[key]
    const text = enabled
      ? getDiscTextContent(key, resolvedValues, params.manualGameTitle).trim()
      : ''
    const layout = params.discTextLayout[key]
    const previewTextNodes = getPreviewTextNodesForText(allPreviewTextNodes, text)
    const baseReport: TextElementReport = {
      key,
      enabled,
      text,
      mode: layout.mode,
      sourceLayout: { ...layout },
      renderStyle: { ...DISC_TEXT_RENDER_STYLES[key] },
      previewDom: {
        layerCount: getLayerCount(params.previewElement, layout.mode),
        textNodeCount: previewTextNodes.length,
        textNodes: previewTextNodes,
        matchStrategy: 'matched by live SVG text content because preview nodes are not keyed yet',
      },
    }

    if (!enabled || !text) return baseReport

    if (key === 'copyright' && layout.mode === 'curved') {
      const effectiveScale = getReadableCurvedTextScale(layout.scale)

      return {
        ...baseReport,
        curvedLayout: {
          effectiveScale: roundNumber(effectiveScale),
          expectedFontSizeViewBoxUnits: roundNumber(1.55 * effectiveScale),
          expectedLineStepViewBoxUnits: roundNumber(2.2 * effectiveScale),
          expectedLetterSpacingViewBoxUnits: roundNumber(0.14 * effectiveScale),
        },
      }
    }

    const previewMeasured = getStraightDiscTextRenderLayout(key, text, layout, previewMeasure)
    const exportMeasured = getStraightDiscTextRenderLayout(key, text, layout, exportMeasure)

    return {
      ...baseReport,
      straightLayout: {
        previewMeasured,
        exportMeasured,
        lineTextMatches:
          previewMeasured.lines.map((line) => line.text).join('\n') ===
          exportMeasured.lines.map((line) => line.text).join('\n'),
        fontSizeMatches: previewMeasured.fontSize === exportMeasured.fontSize,
      },
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    app: {
      diagnostic: 'text-preview-export-parity',
      version: 1,
    },
    environment: {
      devicePixelRatio: window.devicePixelRatio,
      exportDpi: EXPORT_DPI,
      previewRectPx: previewRect ? boxToReport(previewRect) : null,
      exportDiscContentSizePx,
      previewPxPerViewBoxUnit: previewRect ? roundNumber(previewRect.width / 100) : null,
      exportPxPerViewBoxUnit: roundNumber(exportDiscContentSizePx / 100),
    },
    template: {
      id: params.selectedDiscTemplate.id,
      name: params.selectedDiscTemplate.name,
      outerDiameterMm: params.selectedDiscTemplate.outerDiameterMm,
      safeDiameterMm: params.selectedDiscTemplate.safeDiameterMm,
    },
    allPreviewTextNodes,
    textElements,
  }
}
