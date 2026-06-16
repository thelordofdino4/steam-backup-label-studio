export type InlinePreviewTextLine = {
  text: string
}

export type InlinePreviewTextCaretLineOffset = {
  lineIndex: number
  offset: number
}

type InlinePreviewTextLineRange = {
  end: number
  lineIndex: number
  start: number
  text: string
}

export type InlinePreviewTextSelectionLineOffset = {
  endOffset: number
  lineIndex: number
  startOffset: number
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function getInlinePreviewTextLineRanges({
  caretValue,
  lines,
}: {
  caretValue: string
  lines: InlinePreviewTextLine[]
}): InlinePreviewTextLineRange[] {
  let searchStart = 0

  return lines.map((line, lineIndex) => {
    const lineText = line?.text ?? ''
    const exactLineStart = lineText
      ? caretValue.indexOf(lineText, searchStart)
      : searchStart
    const lineStart = exactLineStart >= 0 ? exactLineStart : searchStart
    const lineEnd = clampNumber(
      lineStart + lineText.length,
      lineStart,
      caretValue.length,
    )
    const range = {
      end: lineEnd,
      lineIndex,
      start: clampNumber(lineStart, 0, caretValue.length),
      text: lineText,
    }

    searchStart = lineEnd
    while (
      searchStart < caretValue.length &&
      /\s/.test(caretValue.charAt(searchStart))
    ) {
      searchStart += 1
    }

    return range
  })
}

export function getInlinePreviewTextCaretLineOffset({
  caretIndex,
  caretValue,
  lines,
}: {
  caretIndex: number
  caretValue: string
  lines: InlinePreviewTextLine[]
}): InlinePreviewTextCaretLineOffset {
  const ranges = getInlinePreviewTextLineRanges({ caretValue, lines })

  if (ranges.length === 0) {
    return {
      lineIndex: 0,
      offset: 0,
    }
  }

  const normalizedCaretIndex = clampNumber(caretIndex, 0, caretValue.length)

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]
    const nextRange = ranges[index + 1]

    if (normalizedCaretIndex <= range.end) {
      return {
        lineIndex: range.lineIndex,
        offset: clampNumber(
          normalizedCaretIndex - range.start,
          0,
          range.text.length,
        ),
      }
    }

    if (nextRange && normalizedCaretIndex < nextRange.start) {
      return {
        lineIndex: range.lineIndex,
        offset: range.text.length,
      }
    }
  }

  const fallbackRange = ranges[ranges.length - 1]

  return {
    lineIndex: fallbackRange.lineIndex,
    offset: fallbackRange.text.length,
  }
}

export function getInlinePreviewTextCaretIndexForLineOffset({
  caretValue,
  lineIndex,
  lines,
  offset,
}: {
  caretValue: string
  lineIndex: number
  lines: InlinePreviewTextLine[]
  offset: number
}) {
  const ranges = getInlinePreviewTextLineRanges({ caretValue, lines })
  const range = ranges.find((candidate) => candidate.lineIndex === lineIndex)

  if (!range) {
    return clampNumber(caretValue.length, 0, caretValue.length)
  }

  return clampNumber(
    range.start + clampNumber(offset, 0, range.text.length),
    range.start,
    range.end,
  )
}

export function getInlinePreviewTextSelectionLineOffsets({
  caretValue,
  lines,
  selectionEnd,
  selectionStart,
}: {
  caretValue: string
  lines: InlinePreviewTextLine[]
  selectionEnd: number
  selectionStart: number
}): InlinePreviewTextSelectionLineOffset[] {
  const normalizedStart = clampNumber(
    Math.min(selectionStart, selectionEnd),
    0,
    caretValue.length,
  )
  const normalizedEnd = clampNumber(
    Math.max(selectionStart, selectionEnd),
    0,
    caretValue.length,
  )

  if (normalizedStart === normalizedEnd) {
    return []
  }

  return getInlinePreviewTextLineRanges({ caretValue, lines })
    .map((range) => {
      const start = Math.max(normalizedStart, range.start)
      const end = Math.min(normalizedEnd, range.end)

      if (start >= end) {
        return null
      }

      return {
        endOffset: clampNumber(end - range.start, 0, range.text.length),
        lineIndex: range.lineIndex,
        startOffset: clampNumber(start - range.start, 0, range.text.length),
      } satisfies InlinePreviewTextSelectionLineOffset
    })
    .filter((range): range is InlinePreviewTextSelectionLineOffset =>
      range !== null,
    )
}
