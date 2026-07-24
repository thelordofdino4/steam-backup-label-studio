import type { DiscTemplate } from '../types/template.ts'
import type { RichTextDocument } from '../text/htmlText.ts'
import {
  getStraightDiscTextRenderLayout,
  getStraightDiscTextVisualBounds,
  type TextMeasureFunction,
} from './renderLayout.ts'
import type { DiscTextStyleInput } from './styles.ts'
import type {
  DiscTextKey,
  DiscTextLayout,
} from './types.ts'

export const DISC_PRESET_TEXT_PREFERRED_POINT_SIZE = 7
export const DISC_PRESET_TEXT_MINIMUM_POINT_SIZE = 3
export const DISC_PRESET_TEXT_POINT_SIZE_STEP = 0.25

export type StraightDiscTextFitRegion = Readonly<{
  centerXPercent: number
  centerYPercent: number
  widthPercent: number
  heightPercent: number
}>

export type StraightDiscTextFitWarning =
  | 'text-fit-adjusted'
  | 'text-fit-minimum-reached'

export type StraightDiscTextFitResult =
  | Readonly<{
      status: 'fitted'
      layout: DiscTextLayout
      resolvedRegion: StraightDiscTextFitRegion
      warnings: readonly StraightDiscTextFitWarning[]
    }>
  | Readonly<{
      status: 'impossible'
      resolvedRegion: StraightDiscTextFitRegion
      warnings: readonly ['text-fit-impossible']
    }>

const FIT_EPSILON = 0.000001

function createRegionLayout(
  currentLayout: DiscTextLayout,
  region: StraightDiscTextFitRegion,
  fontSizePt: number,
): DiscTextLayout {
  return {
    ...currentLayout,
    x: region.centerXPercent - 50,
    y: region.centerYPercent,
    width: region.widthPercent,
    fontSizePt,
    align: 'center',
    mode: 'straight',
    avoidVisualElements: false,
  }
}

function fitsRegion(
  bounds: ReturnType<typeof getStraightDiscTextVisualBounds>,
  region: StraightDiscTextFitRegion,
) {
  const regionLeft = region.centerXPercent - region.widthPercent / 2
  const regionRight = region.centerXPercent + region.widthPercent / 2
  const regionTop = region.centerYPercent - region.heightPercent / 2
  const regionBottom = region.centerYPercent + region.heightPercent / 2

  return bounds.centerX - bounds.halfWidth >= regionLeft - FIT_EPSILON &&
    bounds.centerX + bounds.halfWidth <= regionRight + FIT_EPSILON &&
    bounds.centerY - bounds.halfHeight >= regionTop - FIT_EPSILON &&
    bounds.centerY + bounds.halfHeight <= regionBottom + FIT_EPSILON
}

function freezeRegion(
  region: StraightDiscTextFitRegion,
): StraightDiscTextFitRegion {
  return Object.freeze({ ...region })
}

export function fitStraightDiscTextToRegion({
  content,
  currentLayout,
  key,
  includeRenderedBoxBounds = false,
  includeRenderedPaintBounds = false,
  measureText,
  minimumPointSize = DISC_PRESET_TEXT_MINIMUM_POINT_SIZE,
  preferredPointSize = DISC_PRESET_TEXT_PREFERRED_POINT_SIZE,
  pointSizeStep = DISC_PRESET_TEXT_POINT_SIZE_STEP,
  region,
  richText,
  styles,
  template,
}: Readonly<{
  content: string
  currentLayout: DiscTextLayout
  key: DiscTextKey
  includeRenderedBoxBounds?: boolean
  includeRenderedPaintBounds?: boolean
  measureText: TextMeasureFunction
  minimumPointSize?: number
  preferredPointSize?: number
  pointSizeStep?: number
  region: StraightDiscTextFitRegion
  richText?: RichTextDocument
  styles?: DiscTextStyleInput
  template: DiscTemplate
}>): StraightDiscTextFitResult {
  const resolvedRegion = freezeRegion(region)
  const preferredLayout = createRegionLayout(
    currentLayout,
    resolvedRegion,
    preferredPointSize,
  )

  if (!content.trim()) {
    return Object.freeze({
      status: 'fitted',
      layout: Object.freeze(preferredLayout),
      resolvedRegion,
      warnings: Object.freeze([]),
    })
  }

  const normalizedStep =
    Number.isFinite(pointSizeStep) && pointSizeStep > 0
      ? pointSizeStep
      : DISC_PRESET_TEXT_POINT_SIZE_STEP
  const normalizedMinimum = Math.min(preferredPointSize, minimumPointSize)
  const stepCount = Math.ceil(
    (preferredPointSize - normalizedMinimum) / normalizedStep,
  )

  for (let index = 0; index <= stepCount; index += 1) {
    const fontSizePt = Math.max(
      normalizedMinimum,
      preferredPointSize - index * normalizedStep,
    )
    let layout = createRegionLayout(
      currentLayout,
      resolvedRegion,
      fontSizePt,
    )
    let renderLayout = getStraightDiscTextRenderLayout(
      key,
      content,
      layout,
      measureText,
      styles,
      {
        richText,
        template,
      },
    )
    let bounds = getStraightDiscTextVisualBounds(
      renderLayout,
      measureText,
      {
        includeRenderedBox: includeRenderedBoxBounds,
        includeRenderedPaint: includeRenderedPaintBounds,
      },
    )

    if (includeRenderedPaintBounds) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const logicalBounds = getStraightDiscTextVisualBounds(
          renderLayout,
          measureText,
        )
        const leftPaintInset = Math.max(
          0,
          logicalBounds.centerX - logicalBounds.halfWidth -
            (bounds.centerX - bounds.halfWidth),
        )
        const rightPaintInset = Math.max(
          0,
          bounds.centerX + bounds.halfWidth -
            (logicalBounds.centerX + logicalBounds.halfWidth),
        )
        const paintSafeWidth = Math.max(
          FIT_EPSILON,
          resolvedRegion.widthPercent - leftPaintInset - rightPaintInset,
        )

        if (layout.width <= paintSafeWidth + FIT_EPSILON) break

        layout = {
          ...layout,
          width: paintSafeWidth,
        }
        renderLayout = getStraightDiscTextRenderLayout(
          key,
          content,
          layout,
          measureText,
          styles,
          {
            richText,
            template,
          },
        )
        bounds = getStraightDiscTextVisualBounds(
          renderLayout,
          measureText,
          {
            includeRenderedBox: includeRenderedBoxBounds,
            includeRenderedPaint: true,
          },
        )
      }

      const centerOffsetX =
        resolvedRegion.centerXPercent - bounds.centerX
      const centerOffsetY =
        resolvedRegion.centerYPercent - bounds.centerY

      if (
        Math.abs(centerOffsetX) > FIT_EPSILON ||
        Math.abs(centerOffsetY) > FIT_EPSILON
      ) {
        layout = {
          ...layout,
          x: layout.x + centerOffsetX,
          y: layout.y + centerOffsetY,
        }
        renderLayout = getStraightDiscTextRenderLayout(
          key,
          content,
          layout,
          measureText,
          styles,
          {
            richText,
            template,
          },
        )
        bounds = getStraightDiscTextVisualBounds(
          renderLayout,
          measureText,
          {
            includeRenderedBox: includeRenderedBoxBounds,
            includeRenderedPaint: true,
          },
        )
      }
    }
    // Template compatibility belongs to preset resolution. Once a rectangle is
    // resolved, this fitter must preserve that exact box as the sole boundary.
    if (fitsRegion(bounds, resolvedRegion)) {
      const atMinimum =
        Math.abs(fontSizePt - normalizedMinimum) <= FIT_EPSILON
      const warnings: StraightDiscTextFitWarning[] = []

      if (fontSizePt < preferredPointSize - FIT_EPSILON) {
        warnings.push('text-fit-adjusted')
      }
      if (atMinimum) {
        warnings.push('text-fit-minimum-reached')
      }

      return Object.freeze({
        status: 'fitted',
        layout: Object.freeze(layout),
        resolvedRegion,
        warnings: Object.freeze(warnings),
      })
    }
  }

  return Object.freeze({
    status: 'impossible',
    resolvedRegion,
    warnings: Object.freeze(['text-fit-impossible'] as const),
  })
}
