import type {
  RichTextDocument,
  RichTextLine,
  RichTextRun,
} from '../text/htmlText.ts'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from '../text/richTextWeights.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  discTextPointSizeToSvgPercent,
} from './pointSize.ts'

export type TextMeasureFunction = (text: string, font: string) => number

export type DiscTextLineSegmentWidth = {
  left: number
  right: number
}

export type RichTextMeasuredRun = RichTextRun & {
  width: number
}

export type RichTextWrappedLine = {
  text: string
  runs: RichTextMeasuredRun[]
  width: number
}

type RichTextMeasureOptions = {
  baseFontStyle: string
  baseFontWeight: number
  fontFamily: string
  fontSize: number
  measureText: TextMeasureFunction
  template?: DiscTemplate
}

export function getDiscTextFontString(
  fontWeight: number,
  fontSize: number,
  fontFamily = 'Arial, sans-serif',
  fontStyle = 'normal',
) {
  const fontStylePrefix = fontStyle === 'italic' ? 'italic ' : ''

  return `${fontStylePrefix}${fontWeight} ${fontSize}px ${fontFamily}`
}

export function getDiscTextRunFontString({
  baseFontStyle,
  baseFontWeight,
  fontFamily,
  fontSize,
  run,
  template,
}: {
  baseFontStyle: string
  baseFontWeight: number
  fontFamily: string
  fontSize: number
  run: RichTextRun
  template?: DiscTemplate
}) {
  const runFontSize = getDiscTextRunFontSize({ fontSize, run, template })

  return getDiscTextFontString(
    run.bold
      ? RICH_TEXT_BOLD_FONT_WEIGHT
      : run.fontWeight ?? baseFontWeight,
    runFontSize,
    run.fontFamily ?? fontFamily,
    run.italic ? 'italic' : run.fontStyle ?? baseFontStyle,
  )
}

export function getDiscTextRunFontSize({
  fontSize,
  run,
  template,
}: {
  fontSize: number
  run: RichTextRun
  template?: DiscTemplate
}) {
  return typeof run.fontSizePx === 'number'
    ? run.fontSizePx
    : typeof run.fontSizePt === 'number'
      ? discTextPointSizeToSvgPercent(run.fontSizePt, template)
      : fontSize
}

function measureRichTextRun(
  run: RichTextRun,
  options: RichTextMeasureOptions,
) {
  return options.measureText(
    run.text,
    getDiscTextRunFontString({
      baseFontStyle: options.baseFontStyle,
      baseFontWeight: options.baseFontWeight,
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      run,
      template: options.template,
    }),
  )
}

function measureRichTextRuns(
  runs: RichTextRun[],
  options: RichTextMeasureOptions,
) {
  return runs.reduce(
    (width, run) => width + measureRichTextRun(run, options),
    0,
  )
}

function splitLineIntoMeasuredTokens(line: string) {
  return line.match(/\s+|\S+/g) ?? []
}

function splitLongTokenByMeasuredWidth(
  token: string,
  maxWidth: number,
  font: string,
  measureText: TextMeasureFunction,
) {
  const chunks: string[] = []
  let currentChunk = ''

  for (const character of Array.from(token)) {
    const testChunk = `${currentChunk}${character}`

    if (measureText(testChunk, font) <= maxWidth || !currentChunk) {
      currentChunk = testChunk
      continue
    }

    chunks.push(currentChunk)
    currentChunk = character
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

function richRunStylesMatch(first: RichTextRun, second: RichTextRun) {
  return Boolean(first.bold) === Boolean(second.bold) &&
    Boolean(first.italic) === Boolean(second.italic) &&
    Boolean(first.underline) === Boolean(second.underline) &&
    first.color === second.color &&
    first.backgroundColor === second.backgroundColor &&
    first.fontFamily === second.fontFamily &&
    first.fontSizePt === second.fontSizePt &&
    first.fontSizePx === second.fontSizePx &&
    first.fontWeight === second.fontWeight &&
    first.fontStyle === second.fontStyle &&
    first.textDecoration === second.textDecoration
}

function appendRichTextRun(runs: RichTextRun[], run: RichTextRun) {
  if (!run.text) return runs

  const previousRun = runs[runs.length - 1]

  if (previousRun && richRunStylesMatch(previousRun, run)) {
    previousRun.text += run.text
    return runs
  }

  runs.push({ ...run })
  return runs
}

function splitRichTextLineIntoTokens(line: RichTextLine): RichTextRun[] {
  return line.runs.flatMap((run) =>
    (run.text.match(/\s+|\S+/g) ?? []).map((text) => ({
      ...run,
      text,
    })))
}

function splitRichTextRunByMeasuredWidth(
  run: RichTextRun,
  maxWidth: number,
  options: RichTextMeasureOptions,
) {
  const chunks: RichTextRun[] = []
  let currentChunk = ''

  for (const character of Array.from(run.text)) {
    const testChunk = `${currentChunk}${character}`
    const testRun = { ...run, text: testChunk }

    if (
      measureRichTextRun(testRun, options) <= maxWidth ||
      !currentChunk
    ) {
      currentChunk = testChunk
      continue
    }

    chunks.push({ ...run, text: currentChunk })
    currentChunk = character
  }

  if (currentChunk) chunks.push({ ...run, text: currentChunk })
  return chunks
}

function trimTrailingWhitespaceFromRichRuns(runs: RichTextRun[]) {
  const trimmedRuns = runs.map((run) => ({ ...run }))

  while (trimmedRuns.length > 0) {
    const lastRun = trimmedRuns[trimmedRuns.length - 1]
    const nextText = lastRun.text.replace(/\s+$/, '')

    if (nextText) {
      lastRun.text = nextText
      break
    }

    trimmedRuns.pop()
  }

  return trimmedRuns.length > 0 ? trimmedRuns : runs
}

function normalizeWrappedRichLine(
  runs: RichTextRun[],
  options: RichTextMeasureOptions,
): RichTextWrappedLine {
  const measuredRuns = runs.map((run) => ({
    ...run,
    width: measureRichTextRun(run, options),
  }))
  const text = measuredRuns.map((run) => run.text).join('')
  const width = measuredRuns.reduce((total, run) => total + run.width, 0)

  return { text, runs: measuredRuns, width }
}

function getNextRichLineAfterWrap(run: RichTextRun) {
  return /^\s+$/.test(run.text) ? [] : [{ ...run }]
}

function appendWrappedRichTextLine({
  line,
  lines,
  maxWidth,
  maxLines,
  options,
}: {
  line: RichTextLine
  lines: RichTextWrappedLine[]
  maxWidth: number
  maxLines: number
  options: RichTextMeasureOptions
}) {
  const tokens = splitRichTextLineIntoTokens(line)
  let currentRuns: RichTextRun[] = []

  if (tokens.length === 0) {
    if (lines.length < maxLines) {
      lines.push(normalizeWrappedRichLine([], options))
    }
    return
  }

  for (const token of tokens) {
    const tokenParts = measureRichTextRun(token, options) > maxWidth
      ? splitRichTextRunByMeasuredWidth(token, maxWidth, options)
      : [token]

    for (const tokenPart of tokenParts) {
      const candidateRuns = currentRuns.map((run) => ({ ...run }))
      appendRichTextRun(candidateRuns, tokenPart)

      if (
        measureRichTextRuns(candidateRuns, options) <= maxWidth ||
        currentRuns.length === 0
      ) {
        currentRuns = candidateRuns
        continue
      }

      lines.push(
        normalizeWrappedRichLine(
          /\S/.test(tokenPart.text)
            ? trimTrailingWhitespaceFromRichRuns(currentRuns)
            : currentRuns,
          options,
        ),
      )
      currentRuns = getNextRichLineAfterWrap(tokenPart)

      if (lines.length >= maxLines) return
    }
  }

  if (currentRuns.length > 0 && lines.length < maxLines) {
    lines.push(normalizeWrappedRichLine(currentRuns, options))
  }
}

export function wrapRichTextDocumentLines(
  document: RichTextDocument,
  maxWidth: number,
  maxLines: number,
  options: RichTextMeasureOptions,
) {
  const lines: RichTextWrappedLine[] = []

  if (document.lines.length === 0) {
    return lines
  }

  for (const sourceLine of document.lines) {
    appendWrappedRichTextLine({
      line: sourceLine,
      lines,
      maxWidth,
      maxLines,
      options,
    })

    if (lines.length >= maxLines) break
  }

  return lines
}

export function wrapRichTextDocumentLinesBySegments(
  document: RichTextDocument,
  lineSegments: DiscTextLineSegmentWidth[],
  maxLines: number,
  options: RichTextMeasureOptions,
) {
  const lines: RichTextWrappedLine[] = []

  for (const sourceLine of document.lines) {
    const currentSegment = lineSegments[Math.min(lines.length, lineSegments.length - 1)]
    appendWrappedRichTextLine({
      line: sourceLine,
      lines,
      maxWidth: currentSegment ? currentSegment.right - currentSegment.left : 1,
      maxLines,
      options,
    })

    if (lines.length >= maxLines) break
  }

  return lines
}

function getLineBeforeWrappedToken(currentLine: string, nextTokenPart: string) {
  if (!/\S/.test(nextTokenPart)) return currentLine

  const withoutTrailingWhitespace = currentLine.replace(/\s+$/, '')
  return withoutTrailingWhitespace || currentLine
}

function getLineAfterWrappedTokenPart(tokenPart: string) {
  return /^\s+$/.test(tokenPart) ? '' : tokenPart
}

function appendTokenPartToLine(currentLine: string, tokenPart: string) {
  return `${currentLine}${tokenPart}`
}

export function wrapMeasuredTextLines(
  text: string,
  maxWidth: number,
  font: string,
  maxLines: number,
  measureText: TextMeasureFunction,
) {
  const lines: string[] = []

  if (text.length === 0) {
    return lines
  }

  for (const sourceLine of text.replace(/\r\n/g, '\n').split('\n')) {
    appendWrappedMeasuredTextSourceLine({
      sourceLine,
      lines,
      maxWidth,
      font,
      maxLines,
      measureText,
    })

    if (lines.length >= maxLines) {
      break
    }
  }

  return lines
}

function appendWrappedMeasuredTextSourceLine({
  sourceLine,
  lines,
  maxWidth,
  font,
  maxLines,
  measureText,
}: {
  sourceLine: string
  lines: string[]
  maxWidth: number
  font: string
  maxLines: number
  measureText: TextMeasureFunction
}) {
  const tokens = splitLineIntoMeasuredTokens(sourceLine)
  let currentLine = ''

  if (tokens.length === 0) {
    if (lines.length < maxLines) {
      lines.push('')
    }

    return
  }

  for (const token of tokens) {
    const tokenParts = measureText(token, font) > maxWidth
      ? splitLongTokenByMeasuredWidth(token, maxWidth, font, measureText)
      : [token]

    for (const part of tokenParts) {
      const testLine = appendTokenPartToLine(currentLine, part)

      if (measureText(testLine, font) <= maxWidth || !currentLine) {
        currentLine = testLine
        continue
      }

      lines.push(getLineBeforeWrappedToken(currentLine, part))
      currentLine = getLineAfterWrappedTokenPart(part)

      if (lines.length >= maxLines) {
        return
      }
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine)
}

function splitLongTokenByLineSegments(
  token: string,
  lineSegments: DiscTextLineSegmentWidth[],
  currentLineIndex: number,
  font: string,
  measureText: TextMeasureFunction,
) {
  const chunks: string[] = []
  let currentChunk = ''
  let lineIndex = currentLineIndex

  for (const character of Array.from(token)) {
    const segment = lineSegments[Math.min(lineIndex, lineSegments.length - 1)]
    const maxWidth = segment ? segment.right - segment.left : 1
    const testChunk = `${currentChunk}${character}`

    if (measureText(testChunk, font) <= maxWidth || !currentChunk) {
      currentChunk = testChunk
      continue
    }

    chunks.push(currentChunk)
    currentChunk = character
    lineIndex += 1
  }

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

export function wrapMeasuredTextLinesBySegments(
  text: string,
  lineSegments: DiscTextLineSegmentWidth[],
  font: string,
  maxLines: number,
  measureText: TextMeasureFunction,
) {
  const lines: string[] = []

  if (text.length === 0) {
    return lines
  }

  for (const sourceLine of text.replace(/\r\n/g, '\n').split('\n')) {
    appendWrappedMeasuredTextSourceLineBySegments({
      sourceLine,
      lines,
      lineSegments,
      font,
      maxLines,
      measureText,
    })

    if (lines.length >= maxLines) {
      break
    }
  }

  return lines
}

function appendWrappedMeasuredTextSourceLineBySegments({
  sourceLine,
  lines,
  lineSegments,
  font,
  maxLines,
  measureText,
}: {
  sourceLine: string
  lines: string[]
  lineSegments: DiscTextLineSegmentWidth[]
  font: string
  maxLines: number
  measureText: TextMeasureFunction
}) {
  const tokens = splitLineIntoMeasuredTokens(sourceLine)
  let currentLine = ''

  if (tokens.length === 0) {
    if (lines.length < maxLines) {
      lines.push('')
    }

    return
  }

  for (const token of tokens) {
    const currentSegment = lineSegments[Math.min(lines.length, lineSegments.length - 1)]
    const currentMaxWidth = currentSegment ? currentSegment.right - currentSegment.left : 1
    const tokenParts = measureText(token, font) > currentMaxWidth
      ? splitLongTokenByLineSegments(
          token,
          lineSegments,
          lines.length,
          font,
          measureText,
        )
      : [token]

    for (const part of tokenParts) {
      const lineSegment = lineSegments[Math.min(lines.length, lineSegments.length - 1)]
      const maxWidth = lineSegment ? lineSegment.right - lineSegment.left : 1
      const testLine = appendTokenPartToLine(currentLine, part)

      if (measureText(testLine, font) <= maxWidth || !currentLine) {
        currentLine = testLine
        continue
      }

      lines.push(getLineBeforeWrappedToken(currentLine, part))
      currentLine = getLineAfterWrappedTokenPart(part)

      if (lines.length >= maxLines) {
        return
      }
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine)
}
