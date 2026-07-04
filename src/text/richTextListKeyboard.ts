import {
  mergeAdjacentRichTextRuns,
  parseHtmlText,
  plainTextToRichTextDocument,
  richTextDocumentToHtmlSource,
  type RichTextDocument,
  type RichTextLine,
  type RichTextRun,
} from './htmlText.ts'
import {
  normalizeRichTextLine,
  splitRichTextLineAtOffset,
} from './richTextRunRanges.ts'

export type RichTextListKeyboardCommand = 'enter' | 'shiftEnter' | 'backspace'

export type RichTextListKeyboardMutation = {
  document: RichTextDocument
  selection: {
    end: number
    start: number
  }
}

export const BULLETED_LIST_PREFIX = '• '

function plainBulletTextToRichTextDocument(text: string): RichTextDocument {
  const baseDocument = plainTextToRichTextDocument(text)
  const lines = baseDocument.lines.map((line) => {
    if (!line.text.startsWith(BULLETED_LIST_PREFIX)) {
      return line
    }

    return {
      ...line,
      list: {
        prefix: BULLETED_LIST_PREFIX,
        type: 'ul' as const,
      },
    }
  })
  const plainText = lines.map((line) => line.text).join('\n')

  return {
    lines,
    plainText,
    source: richTextDocumentToHtmlSource({
      lines,
      plainText,
      source: text,
    }),
  }
}

export function getRichTextDocumentForListKeyboard({
  fallbackText,
  htmlSource,
}: {
  fallbackText: string
  htmlSource?: string | null
}) {
  if (typeof htmlSource === 'string') {
    return parseHtmlText(htmlSource)
  }

  return fallbackText
    .split('\n')
    .some((line) => line.startsWith(BULLETED_LIST_PREFIX))
    ? plainBulletTextToRichTextDocument(fallbackText)
    : plainTextToRichTextDocument(fallbackText)
}

export function removeRichTextLinePrefix(
  line: RichTextLine,
  prefix: string | undefined,
) {
  if (!prefix) {
    return {
      runs: mergeAdjacentRichTextRuns(line.runs),
      text: line.text,
    }
  }

  const runs = (
    line.runs.length > 0
      ? line.runs
      : line.text
        ? [{ text: line.text }]
        : []
  ).map((run) => ({ ...run }))
  let prefixRemaining = prefix.length

  while (prefixRemaining > 0 && runs.length > 0) {
    const firstRun = runs[0]

    if (firstRun.text.length <= prefixRemaining) {
      prefixRemaining -= firstRun.text.length
      runs.shift()
      continue
    }

    firstRun.text = firstRun.text.slice(prefixRemaining)
    prefixRemaining = 0
  }

  const nextRuns = mergeAdjacentRichTextRuns(runs)

  return {
    runs: nextRuns,
    text: nextRuns.map((run) => run.text).join(''),
  }
}

export function setRichTextLineBulleted(line: RichTextLine): RichTextLine {
  const content = removeRichTextLinePrefix(line, line.list?.prefix)
  const runs = mergeAdjacentRichTextRuns([
    { text: BULLETED_LIST_PREFIX },
    ...content.runs,
  ])

  return {
    ...line,
    list: {
      prefix: BULLETED_LIST_PREFIX,
      type: 'ul',
    },
    runs,
    text: runs.map((run) => run.text).join(''),
  }
}

export function unsetRichTextLineBulleted(line: RichTextLine): RichTextLine {
  if (line.list?.type !== 'ul') {
    return line
  }

  const content = removeRichTextLinePrefix(line, line.list.prefix)

  return {
    runs: content.runs,
    text: content.text,
  }
}

function getRichTextLineContentOffset(line: RichTextLine) {
  return line.list?.prefix.length ?? 0
}

function createBulletedListLineFromRuns(runs: RichTextRun[]): RichTextLine {
  return normalizeRichTextLine(
    {
      list: {
        prefix: BULLETED_LIST_PREFIX,
        type: 'ul',
      },
      runs: [],
      text: '',
    },
    [
      { text: BULLETED_LIST_PREFIX },
      ...runs,
    ],
  )
}

function createListContinuationLineFromRuns(runs: RichTextRun[]): RichTextLine {
  return normalizeRichTextLine(
    {
      list: {
        continuation: true,
        prefix: '',
        type: 'ul',
      },
      runs: [],
      text: '',
    },
    runs,
  )
}

export function isEmptyBulletedLine(line: RichTextLine) {
  if (line.list?.type !== 'ul') return false

  const content = removeRichTextLinePrefix(line, line.list.prefix)
  return content.text.trim().length === 0
}

export function applyEnterInsideBulletedLine({
  document,
  line,
  lineIndex,
  lineOffset,
  lineStart,
}: {
  document: RichTextDocument
  line: RichTextLine
  lineIndex: number
  lineOffset: number
  lineStart: number
}): RichTextListKeyboardMutation {
  const contentOffset = getRichTextLineContentOffset(line)

  if (isEmptyBulletedLine(line)) {
    const nextLine = normalizeRichTextLine(
      {
        runs: [],
        text: '',
      },
      [],
    )

    return {
      document: {
        ...document,
        lines: document.lines.map((candidate, index) =>
          index === lineIndex ? nextLine : candidate),
      },
      selection: {
        end: lineStart,
        start: lineStart,
      },
    }
  }

  const splitOffset = Math.max(contentOffset, lineOffset)
  const { afterRuns, beforeRuns } = splitRichTextLineAtOffset(line, splitOffset)
  const currentLine = normalizeRichTextLine(line, beforeRuns)
  const contentAfterRuns = removeRichTextLinePrefix(
    normalizeRichTextLine(line, afterRuns),
    '',
  ).runs
  const nextLine = createBulletedListLineFromRuns(contentAfterRuns)
  const nextSelectionStart =
    lineStart + currentLine.text.length + 1 + BULLETED_LIST_PREFIX.length

  return {
    document: {
      ...document,
      lines: [
        ...document.lines.slice(0, lineIndex),
        currentLine,
        nextLine,
        ...document.lines.slice(lineIndex + 1),
      ],
    },
    selection: {
      end: nextSelectionStart,
      start: nextSelectionStart,
    },
  }
}

export function applySoftBreakInsideBulletedLine({
  document,
  line,
  lineIndex,
  lineOffset,
  lineStart,
}: {
  document: RichTextDocument
  line: RichTextLine
  lineIndex: number
  lineOffset: number
  lineStart: number
}): RichTextListKeyboardMutation {
  const contentOffset = getRichTextLineContentOffset(line)
  const splitOffset = Math.max(contentOffset, lineOffset)
  const { afterRuns, beforeRuns } = splitRichTextLineAtOffset(line, splitOffset)
  const currentLine = normalizeRichTextLine(line, beforeRuns)
  const nextLine = createListContinuationLineFromRuns(afterRuns)
  const nextSelectionStart = lineStart + currentLine.text.length + 1

  return {
    document: {
      ...document,
      lines: [
        ...document.lines.slice(0, lineIndex),
        currentLine,
        nextLine,
        ...document.lines.slice(lineIndex + 1),
      ],
    },
    selection: {
      end: nextSelectionStart,
      start: nextSelectionStart,
    },
  }
}
