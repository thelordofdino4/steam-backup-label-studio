export const DISC_TEXT_BOX_BORDER_WIDTH = 0.18
export const DISC_TEXT_STRAIGHT_STROKE_COLOR = 'rgba(0, 0, 0, 0.58)'
export const DISC_TEXT_STRAIGHT_STROKE_WIDTH = 0.28

export const DISC_TEXT_STRAIGHT_SHADOW_STRONG = Object.freeze({
  offsetX: 0,
  offsetY: 0.32,
  standardDeviation: 0.62,
})

export const DISC_TEXT_STRAIGHT_SHADOW_TIGHT = Object.freeze({
  offsetX: 0,
  offsetY: 0,
  standardDeviation: 0.22,
})

// SVG Gaussian blur has no finite mathematical edge. Three standard
// deviations defines the canonical paint-safe boundary for these shared
// renderer parameters.
export const DISC_TEXT_STRAIGHT_SHADOW_SIGMA_EXTENT = 3
export const DISC_TEXT_STRAIGHT_ITALIC_OVERHANG_FACTOR = 0.22

type StraightDiscTextPaintStyle = Readonly<{
  contrast: string
}>

export type StraightDiscTextPaintInsets = Readonly<{
  bottom: number
  left: number
  right: number
  top: number
}>

export function hasStraightDiscTextShadow(
  style: StraightDiscTextPaintStyle,
) {
  return style.contrast === 'shadow' || style.contrast === 'strokeShadow'
}

export function hasStraightDiscTextStroke(
  style: StraightDiscTextPaintStyle,
) {
  return style.contrast === 'stroke' || style.contrast === 'strokeShadow'
}

function getShadowInsets(
  shadow: Readonly<{
    offsetX: number
    offsetY: number
    standardDeviation: number
  }>,
) {
  const blurExtent =
    shadow.standardDeviation * DISC_TEXT_STRAIGHT_SHADOW_SIGMA_EXTENT

  return {
    bottom: Math.max(0, blurExtent + shadow.offsetY),
    left: Math.max(0, blurExtent - shadow.offsetX),
    right: Math.max(0, blurExtent + shadow.offsetX),
    top: Math.max(0, blurExtent - shadow.offsetY),
  }
}

function unionPaintInsets(
  first: StraightDiscTextPaintInsets,
  second: StraightDiscTextPaintInsets,
): StraightDiscTextPaintInsets {
  return {
    bottom: Math.max(first.bottom, second.bottom),
    left: Math.max(first.left, second.left),
    right: Math.max(first.right, second.right),
    top: Math.max(first.top, second.top),
  }
}

export function getStraightDiscTextPaintInsets({
  fontSize,
  italic,
  style,
}: Readonly<{
  fontSize: number
  italic: boolean
  style: StraightDiscTextPaintStyle
}>): StraightDiscTextPaintInsets {
  const normalizedFontSize = Number.isFinite(fontSize)
    ? Math.max(0, fontSize)
    : 0
  const italicOverhang = italic
    ? normalizedFontSize * DISC_TEXT_STRAIGHT_ITALIC_OVERHANG_FACTOR
    : 0
  const strokeExtent = hasStraightDiscTextStroke(style)
    ? DISC_TEXT_STRAIGHT_STROKE_WIDTH / 2
    : 0
  const shadowInsets = hasStraightDiscTextShadow(style)
    ? unionPaintInsets(
        getShadowInsets(DISC_TEXT_STRAIGHT_SHADOW_STRONG),
        getShadowInsets(DISC_TEXT_STRAIGHT_SHADOW_TIGHT),
      )
    : { bottom: 0, left: 0, right: 0, top: 0 }

  return Object.freeze({
    bottom: strokeExtent + shadowInsets.bottom,
    left: italicOverhang + strokeExtent + shadowInsets.left,
    right: italicOverhang + strokeExtent + shadowInsets.right,
    top: strokeExtent + shadowInsets.top,
  })
}
