import type {
  RichTextDocument,
  RichTextLine,
  RichTextRun,
} from '../text/htmlText.ts'
import {
  measureRichTextRun,
  type CaseInsertRichTextMeasureOptions,
} from './caseInsertTextMeasurement.ts'
import type {
  CaseInsertTextLineSegment,
} from './caseInsertTextSegments.ts'

export type RichTextMeasuredRun = RichTextRun & {
  width: number
}

export type RichTextWrappedLine = {
  text: string
  runs: RichTextMeasuredRun[]
  width: number
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
  options: CaseInsertRichTextMeasureOptions,
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
  options: CaseInsertRichTextMeasureOptions,
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

function measureRichTextRuns(
  runs: RichTextRun[],
  options: CaseInsertRichTextMeasureOptions,
) {
  return runs.reduce(
    (width, run) => width + measureRichTextRun(run, options),
    0,
  )
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
  options: CaseInsertRichTextMeasureOptions
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
      const candidateRuns = [...currentRuns.map((run) => ({ ...run }))]
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
  options: CaseInsertRichTextMeasureOptions,
) {
  const lines: RichTextWrappedLine[] = []

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

  return lines.length > 0
    ? lines
    : [normalizeWrappedRichLine([], options)]
}

export function wrapRichTextDocumentLinesBySegments(
  document: RichTextDocument,
  lineSegments: CaseInsertTextLineSegment[],
  maxLines: number,
  options: CaseInsertRichTextMeasureOptions,
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

  return lines.length > 0
    ? lines
    : [normalizeWrappedRichLine([], options)]
}
