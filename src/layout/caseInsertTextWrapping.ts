import {
  measureCaseInsertTextWithBrowserCanvas,
  type CaseInsertTextMeasureFunction,
} from './caseInsertTextMeasurement.ts'
import type {
  CaseInsertTextLineSegment,
} from './caseInsertTextSegments.ts'

function splitLongTokenByMeasuredWidth(
  token: string,
  maxWidth: number,
  font: string,
  measureText: CaseInsertTextMeasureFunction,
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

function splitLineIntoMeasuredTokens(line: string) {
  return line.match(/\s+|\S+/g) ?? []
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

function wrapLine(
  line: string,
  maxWidth: number,
  font: string,
  measureText: CaseInsertTextMeasureFunction,
) {
  const tokens = splitLineIntoMeasuredTokens(line)
  const lines: string[] = []
  let currentLine = ''

  for (const token of tokens) {
    const tokenParts = measureText(token, font) > maxWidth
      ? splitLongTokenByMeasuredWidth(token, maxWidth, font, measureText)
      : [token]

    for (const tokenPart of tokenParts) {
      const candidate = appendTokenPartToLine(currentLine, tokenPart)

      if (
        currentLine &&
        measureText(candidate, font) > maxWidth
      ) {
        lines.push(getLineBeforeWrappedToken(currentLine, tokenPart))
        currentLine = getLineAfterWrappedTokenPart(tokenPart)
      } else {
        currentLine = candidate
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : ['']
}

export function wrapCaseInsertTextLines(
  text: string,
  maxWidth: number,
  font: string,
  measureText: CaseInsertTextMeasureFunction = measureCaseInsertTextWithBrowserCanvas,
) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .flatMap((line) => wrapLine(line, maxWidth, font, measureText))
}

function splitLongTokenByLineSegments(
  token: string,
  lineSegments: CaseInsertTextLineSegment[],
  currentLineIndex: number,
  font: string,
  measureText: CaseInsertTextMeasureFunction,
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

function appendWrappedSourceLineBySegments({
  sourceLine,
  lines,
  lineSegments,
  font,
  maxLines,
  measureText,
}: {
  sourceLine: string
  lines: string[]
  lineSegments: CaseInsertTextLineSegment[]
  font: string
  maxLines: number
  measureText: CaseInsertTextMeasureFunction
}) {
  const tokens = splitLineIntoMeasuredTokens(sourceLine)
  let currentLine = ''

  if (tokens.length === 0) {
    if (lines.length < maxLines) lines.push('')
    return
  }

  for (const token of tokens) {
    const currentSegment = lineSegments[
      Math.min(lines.length, lineSegments.length - 1)
    ]
    const currentMaxWidth = currentSegment
      ? currentSegment.right - currentSegment.left
      : 1
    const tokenParts = measureText(token, font) > currentMaxWidth
      ? splitLongTokenByLineSegments(
          token,
          lineSegments,
          lines.length,
          font,
          measureText,
        )
      : [token]

    for (const tokenPart of tokenParts) {
      const lineSegment = lineSegments[
        Math.min(lines.length, lineSegments.length - 1)
      ]
      const maxWidth = lineSegment ? lineSegment.right - lineSegment.left : 1
      const candidate = appendTokenPartToLine(currentLine, tokenPart)

      if (measureText(candidate, font) <= maxWidth || !currentLine) {
        currentLine = candidate
        continue
      }

      lines.push(getLineBeforeWrappedToken(currentLine, tokenPart))
      currentLine = getLineAfterWrappedTokenPart(tokenPart)

      if (lines.length >= maxLines) {
        return
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine)
  }
}

export function wrapCaseInsertTextLinesBySegments(
  text: string,
  lineSegments: CaseInsertTextLineSegment[],
  font: string,
  maxLines: number,
  measureText: CaseInsertTextMeasureFunction,
) {
  const lines: string[] = []

  for (const sourceLine of text.replace(/\r\n/g, '\n').split('\n')) {
    appendWrappedSourceLineBySegments({
      sourceLine,
      lines,
      lineSegments,
      font,
      maxLines,
      measureText,
    })

    if (lines.length >= maxLines) break
  }

  return lines.length > 0 ? lines : ['']
}
