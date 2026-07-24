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

function getLineCaretAdvances({
  line,
  measureText,
  renderLayout,
}: {
  line: StraightDiscTextRenderLayout['lines'][number]
  measureText: TextMeasureFunction
  renderLayout: StraightDiscTextRenderLayout
}) {
  if (!line.runs?.length) {
    return Array.from(
      { length: line.text.length + 1 },
      (_, offset) => Math.max(
        0,
        measureText(line.text.slice(0, offset), renderLayout.font),
      ),
    )
  }

  const joinedRunText = line.runs.map((run) => run.text).join('')

  if (joinedRunText !== line.text) {
    return Array.from(
      { length: line.text.length + 1 },
      (_, offset) => Math.max(
        0,
        measureText(line.text.slice(0, offset), renderLayout.font),
      ),
    )
  }

  const advances = Array.from({ length: line.text.length + 1 }, () => 0)
  let runStartOffset = 0
  let runStartAdvance = 0

  for (const run of line.runs) {
    const runFont = run.font || renderLayout.font
    const runWidth = Math.max(
      0,
      Number.isFinite(run.width)
        ? run.width
        : measureText(run.text, runFont),
    )

    for (let offset = 1; offset <= run.text.length; offset += 1) {
      advances[runStartOffset + offset] = runStartAdvance +
        Math.max(0, measureText(run.text.slice(0, offset), runFont))
    }

    runStartOffset += run.text.length
    runStartAdvance += runWidth
    advances[runStartOffset] = runStartAdvance
  }

  return advances
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
    const lineHeight = line.lineHeight ?? renderLayout.lineHeight
    const lineWidth = Math.max(0, line.width ?? measureText(line.text, renderLayout.font))
    const lineLeft = getLineLeft({
      lineWidth,
      renderLayout,
      x: line.x,
    })
    const caretXRatios = getLineCaretAdvances({
      line,
      measureText,
      renderLayout,
    }).map((advance) =>
      toHostRatio(lineLeft + advance, hostLeft, hostWidth))

    return {
      caretXRatios,
      heightRatio: lineHeight / hostHeight,
      text: line.text,
      topRatio: toHostRatio(
        line.y - lineHeight / 2,
        hostTop,
        hostHeight,
      ),
    }
  })
}
