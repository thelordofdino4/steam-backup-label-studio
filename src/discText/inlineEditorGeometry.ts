import type {
  StraightDiscTextRenderLayout,
  StraightDiscTextVisualBounds,
  TextMeasureFunction,
} from './renderLayout.ts'

export type DiscInlineTextEditorGeometryLine = {
  caretXRatios: number[]
  heightRatio: number
  text: string
  topRatio: number
}

function getLineLeft({
  lineWidth,
  renderLayout,
  x,
}: {
  lineWidth: number
  renderLayout: StraightDiscTextRenderLayout
  x: number
}) {
  if (renderLayout.textAnchor === 'start') return x
  if (renderLayout.textAnchor === 'end') return x - lineWidth
  return x - lineWidth / 2
}

function toHostRatio(value: number, hostStart: number, hostSize: number) {
  if (hostSize <= 0) return 0
  return (value - hostStart) / hostSize
}

export function getDiscInlineTextEditorGeometryLines({
  bounds,
  measureText,
  renderLayout,
}: {
  bounds: StraightDiscTextVisualBounds
  measureText: TextMeasureFunction
  renderLayout: StraightDiscTextRenderLayout
}): DiscInlineTextEditorGeometryLine[] {
  const hostLeft = bounds.centerX - bounds.halfWidth
  const hostTop = bounds.centerY - bounds.halfHeight
  const hostWidth = bounds.halfWidth * 2
  const hostHeight = bounds.halfHeight * 2

  if (hostWidth <= 0 || hostHeight <= 0) {
    return []
  }

  return renderLayout.lines.map((line) => {
    const lineWidth = Math.max(0, line.width ?? measureText(line.text, renderLayout.font))
    const lineLeft = getLineLeft({
      lineWidth,
      renderLayout,
      x: line.x,
    })
    const caretXRatios = Array.from(
      { length: line.text.length + 1 },
      (_, offset) =>
        toHostRatio(
          lineLeft +
            Math.max(
              0,
              measureText(line.text.slice(0, offset), renderLayout.font),
            ),
          hostLeft,
          hostWidth,
        ),
    )

    return {
      caretXRatios,
      heightRatio: renderLayout.lineHeight / hostHeight,
      text: line.text,
      topRatio: toHostRatio(
        line.y - renderLayout.lineHeight / 2,
        hostTop,
        hostHeight,
      ),
    }
  })
}
