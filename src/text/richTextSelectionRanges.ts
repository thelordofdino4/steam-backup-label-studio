import type {
  RichTextDocument,
  RichTextLine,
} from './htmlText.ts'

export type PlainTextSelectionRange = {
  end: number
  start: number
}

export type NormalizedSelectionRange = PlainTextSelectionRange & {
  isCollapsed: boolean
}

export type RichTextLineRange = {
  end: number
  index: number
  start: number
}

export type RichTextLinePrefixChange = {
  lineStart: number
  newPrefixLength: number
  oldPrefixLength: number
}

export function clampPlainTextOffset(offset: number, plainTextLength: number) {
  return Math.max(0, Math.min(offset, plainTextLength))
}

export function normalizeSelection(
  selection: PlainTextSelectionRange | undefined,
  plainTextLength: number,
): NormalizedSelectionRange {
  const rawStart = selection?.start ?? plainTextLength
  const rawEnd = selection?.end ?? rawStart
  const start = clampPlainTextOffset(Math.min(rawStart, rawEnd), plainTextLength)
  const end = clampPlainTextOffset(Math.max(rawStart, rawEnd), plainTextLength)

  return {
    end,
    isCollapsed: start === end,
    start,
  }
}

export function getRichTextLineRanges(
  lines: readonly RichTextLine[],
): RichTextLineRange[] {
  let lineStart = 0

  return lines.map((line, index) => {
    const lineEnd = lineStart + line.text.length
    const range = {
      end: lineEnd,
      index,
      start: lineStart,
    }

    lineStart = lineEnd + (index < lines.length - 1 ? 1 : 0)
    return range
  })
}

export function getSelectedRichTextLineIndexes(
  document: RichTextDocument,
  selection: NormalizedSelectionRange,
) {
  const ranges = getRichTextLineRanges(document.lines)

  if (ranges.length === 0) return []

  if (selection.isCollapsed) {
    return [
      ranges.find((range) =>
        selection.start >= range.start && selection.start <= range.end,
      )?.index ?? ranges[ranges.length - 1].index,
    ]
  }

  const selectedIndexes = ranges
    .filter((range) =>
      selection.start <= range.end && selection.end >= range.start,
    )
    .map((range) => range.index)

  return selectedIndexes.length > 0
    ? selectedIndexes
    : [ranges[ranges.length - 1].index]
}

export function getRichTextLineRangeAtOffset(
  ranges: readonly RichTextLineRange[],
  offset: number,
) {
  if (ranges.length === 0) return null

  return ranges.find((range) => offset >= range.start && offset <= range.end) ??
    ranges[ranges.length - 1]
}

function adjustOffsetForPrefixChanges(
  offset: number,
  changes: readonly RichTextLinePrefixChange[],
) {
  return changes.reduce((nextOffset, change) => {
    const delta = change.newPrefixLength - change.oldPrefixLength

    if (delta > 0 && offset >= change.lineStart) {
      return nextOffset + delta
    }

    if (delta < 0) {
      const removedPrefixEnd = change.lineStart + change.oldPrefixLength

      if (offset > removedPrefixEnd) {
        return nextOffset + delta
      }

      if (offset > change.lineStart) {
        return nextOffset - (offset - change.lineStart)
      }
    }

    return nextOffset
  }, offset)
}

export function adjustSelectionForPrefixChanges(
  selection: PlainTextSelectionRange,
  changes: readonly RichTextLinePrefixChange[],
): PlainTextSelectionRange {
  return {
    end: adjustOffsetForPrefixChanges(selection.end, changes),
    start: adjustOffsetForPrefixChanges(selection.start, changes),
  }
}
