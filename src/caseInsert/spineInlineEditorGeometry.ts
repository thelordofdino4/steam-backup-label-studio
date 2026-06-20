import type {
  CaseInsertTextMeasureFunction,
  CaseInsertTextVisualLine,
  CaseInsertTextVisualRun,
} from '../layout/caseInsertTextVisualLayout.ts'
import {
  measureCaseInsertTextWithBrowserCanvas,
} from '../layout/caseInsertTextVisualLayout.ts'
import type {
  JewelCasePixelRect,
} from '../layout/jewelCaseLayout.ts'
import type {
  InlinePreviewTextEditorGeometryLine,
} from '../components/preview/inlinePreviewTextEditorContract.ts'

type SpineInlineEditorGeometryOptions = {
  baseFontFamily: string
  baseFontSizePx: number
  baseFontStyle: 'italic' | 'normal'
  baseFontWeight: number
  lineHeightPx: number
  lines: CaseInsertTextVisualLine[]
  measureText?: CaseInsertTextMeasureFunction
  textBounds: JewelCasePixelRect
}

function getCanvasFont({
  fontFamily,
  fontSizePx,
  fontStyle,
  fontWeight,
}: {
  fontFamily: string
  fontSizePx: number
  fontStyle: 'italic' | 'normal'
  fontWeight: number
}) {
  return `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`
}

function getRunCanvasFont({
  baseFontFamily,
  baseFontSizePx,
  baseFontStyle,
  baseFontWeight,
  run,
}: {
  baseFontFamily: string
  baseFontSizePx: number
  baseFontStyle: 'italic' | 'normal'
  baseFontWeight: number
  run?: CaseInsertTextVisualRun
}) {
  return getCanvasFont({
    fontFamily: run?.fontFamily ?? baseFontFamily,
    fontSizePx: run?.fontSizePx ?? baseFontSizePx,
    fontStyle: run?.fontStyle ?? baseFontStyle,
    fontWeight: run?.fontWeight ?? baseFontWeight,
  })
}

function toHostRatio(value: number, hostStart: number, hostSize: number) {
  if (hostSize <= 0) return 0

  return (value - hostStart) / hostSize
}

function getPlainLineCaretPositions({
  font,
  line,
  measureText,
}: {
  font: string
  line: CaseInsertTextVisualLine
  measureText: CaseInsertTextMeasureFunction
}) {
  return Array.from(
    { length: line.text.length + 1 },
    (_, offset) => line.left + Math.max(0, measureText(line.text.slice(0, offset), font)),
  )
}

function getRichLineCaretPositions({
  baseFontFamily,
  baseFontSizePx,
  baseFontStyle,
  baseFontWeight,
  line,
  measureText,
}: {
  baseFontFamily: string
  baseFontSizePx: number
  baseFontStyle: 'italic' | 'normal'
  baseFontWeight: number
  line: CaseInsertTextVisualLine
  measureText: CaseInsertTextMeasureFunction
}) {
  const positions: number[] = []

  for (const run of line.runs ?? []) {
    const font = getRunCanvasFont({
      baseFontFamily,
      baseFontSizePx,
      baseFontStyle,
      baseFontWeight,
      run,
    })

    if (positions.length === 0) {
      positions.push(run.left)
    }

    for (let offset = 1; offset <= run.text.length; offset += 1) {
      positions.push(
        run.left + Math.max(0, measureText(run.text.slice(0, offset), font)),
      )
    }
  }

  return positions.length > 0
    ? positions
    : getPlainLineCaretPositions({
        font: getRunCanvasFont({
          baseFontFamily,
          baseFontSizePx,
          baseFontStyle,
          baseFontWeight,
        }),
        line,
        measureText,
      })
}

export function getSpineInlineTextEditorGeometryLines({
  baseFontFamily,
  baseFontSizePx,
  baseFontStyle,
  baseFontWeight,
  lineHeightPx,
  lines,
  measureText = measureCaseInsertTextWithBrowserCanvas,
  textBounds,
}: SpineInlineEditorGeometryOptions): InlinePreviewTextEditorGeometryLine[] {
  if (textBounds.width <= 0 || textBounds.height <= 0) {
    return []
  }

  const baseFont = getCanvasFont({
    fontFamily: baseFontFamily,
    fontSizePx: baseFontSizePx,
    fontStyle: baseFontStyle,
    fontWeight: baseFontWeight,
  })

  return lines.map((line) => {
    const caretXs = line.runs
      ? getRichLineCaretPositions({
          baseFontFamily,
          baseFontSizePx,
          baseFontStyle,
          baseFontWeight,
          line,
          measureText,
        })
      : getPlainLineCaretPositions({
          font: baseFont,
          line,
          measureText,
        })

    return {
      caretXRatios: caretXs.map((caretX) =>
        toHostRatio(caretX, textBounds.x, textBounds.width)),
      heightRatio: lineHeightPx / textBounds.height,
      text: line.text,
      topRatio: toHostRatio(line.y, textBounds.y, textBounds.height),
    }
  })
}
