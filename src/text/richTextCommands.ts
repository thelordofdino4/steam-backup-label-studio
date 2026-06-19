import {
  mergeAdjacentRichTextRuns,
  parseHtmlText,
  plainTextToRichTextDocument,
  richTextDocumentToHtmlSource,
  type RichTextDocument,
  type RichTextLine,
  type RichTextRun,
} from './htmlText.ts'

export type PlainTextSelectionRange = {
  end: number
  start: number
}

export type RichTextInlineToggleCommand = 'bold' | 'italic' | 'underline'
export type RichTextInlineCommand = RichTextInlineToggleCommand | 'color'
export type RichTextListCommand = 'bulletedList'
export type RichTextSelectionStyleState = 'active' | 'inactive' | 'mixed'

export type RichTextCommandResult = {
  htmlSource: string
  plainText: string
  selection: PlainTextSelectionRange
}

export type RichTextSelectionColorState = {
  state: RichTextSelectionStyleState
  value?: string
}

export type RichTextAmbientInlineStyle = {
  bold?: boolean
  boldFontWeight?: number
  color?: string
  italic?: boolean
  normalFontWeight?: number
  underline?: boolean
}

type NormalizedSelectionRange = PlainTextSelectionRange & {
  isCollapsed: boolean
}

type RichTextSourceInput = {
  ambientStyle?: RichTextAmbientInlineStyle
  fallbackText: string
  htmlSource?: string | null
}

type RichTextLineRange = {
  end: number
  index: number
  start: number
}

type RichTextLinePrefixChange = {
  lineStart: number
  newPrefixLength: number
  oldPrefixLength: number
}

const BULLETED_LIST_PREFIX = '• '

function normalizeSelection(
  selection: PlainTextSelectionRange | undefined,
  plainTextLength: number,
): NormalizedSelectionRange {
  const rawStart = selection?.start ?? plainTextLength
  const rawEnd = selection?.end ?? rawStart
  const start = Math.max(0, Math.min(Math.min(rawStart, rawEnd), plainTextLength))
  const end = Math.max(0, Math.min(Math.max(rawStart, rawEnd), plainTextLength))

  return {
    end,
    isCollapsed: start === end,
    start,
  }
}

function getRichTextDocument({ fallbackText, htmlSource }: RichTextSourceInput) {
  return typeof htmlSource === 'string'
    ? parseHtmlText(htmlSource)
    : plainTextToRichTextDocument(fallbackText)
}

function getRichTextLineRanges(
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

function getSelectedRichTextLineIndexes(
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

function removeRichTextLinePrefix(
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

function setRichTextLineBulleted(line: RichTextLine): RichTextLine {
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

function unsetRichTextLineBulleted(line: RichTextLine): RichTextLine {
  if (line.list?.type !== 'ul') {
    return line
  }

  const content = removeRichTextLinePrefix(line, line.list.prefix)

  return {
    runs: content.runs,
    text: content.text,
  }
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

function adjustSelectionForPrefixChanges(
  selection: PlainTextSelectionRange,
  changes: readonly RichTextLinePrefixChange[],
): PlainTextSelectionRange {
  return {
    end: adjustOffsetForPrefixChanges(selection.end, changes),
    start: adjustOffsetForPrefixChanges(selection.start, changes),
  }
}

function styleRun(
  ambientStyle: RichTextAmbientInlineStyle | undefined,
  run: RichTextRun,
  command: RichTextInlineToggleCommand,
  active: boolean,
): RichTextRun {
  if (command === 'bold') {
    return {
      ...run,
      bold: active || undefined,
      fontWeight: active
        ? ambientStyle?.boldFontWeight ?? 900
        : ambientStyle?.bold
          ? ambientStyle.normalFontWeight
          : undefined,
    }
  }

  if (command === 'italic') {
    return {
      ...run,
      fontStyle: active
        ? 'italic'
        : ambientStyle?.italic
          ? 'normal'
          : undefined,
      italic: active || undefined,
    }
  }

  return {
    ...run,
    textDecoration: active
      ? 'underline'
      : ambientStyle?.underline
        ? 'none'
        : undefined,
    underline: active || undefined,
  }
}

function colorRun(run: RichTextRun, color: string): RichTextRun {
  return {
    ...run,
    color,
  }
}

function splitRunForRange({
  command,
  color,
  ambientStyle,
  rangeEnd,
  rangeStart,
  run,
  runStart,
  toggleActive,
}: {
  command: RichTextInlineCommand
  color?: string
  ambientStyle?: RichTextAmbientInlineStyle
  rangeEnd: number
  rangeStart: number
  run: RichTextRun
  runStart: number
  toggleActive?: boolean
}): RichTextRun[] {
  const runEnd = runStart + run.text.length
  const intersectionStart = Math.max(runStart, rangeStart)
  const intersectionEnd = Math.min(runEnd, rangeEnd)

  if (intersectionStart >= intersectionEnd) {
    return [run]
  }

  const parts: RichTextRun[] = []
  const prefixLength = intersectionStart - runStart
  const selectedLength = intersectionEnd - intersectionStart
  const suffixStart = prefixLength + selectedLength

  if (prefixLength > 0) {
    parts.push({ ...run, text: run.text.slice(0, prefixLength) })
  }

  const selectedRun = {
    ...run,
    text: run.text.slice(prefixLength, suffixStart),
  }
  parts.push(
    command === 'color'
      ? colorRun(selectedRun, color ?? run.color ?? '#ffffff')
      : styleRun(ambientStyle, selectedRun, command, Boolean(toggleActive)),
  )

  if (suffixStart < run.text.length) {
    parts.push({ ...run, text: run.text.slice(suffixStart) })
  }

  return parts
}

function transformLinesInSelection({
  command,
  color,
  document,
  ambientStyle,
  selection,
  toggleActive,
}: {
  command: RichTextInlineCommand
  color?: string
  document: RichTextDocument
  ambientStyle?: RichTextAmbientInlineStyle
  selection: PlainTextSelectionRange
  toggleActive?: boolean
}): RichTextLine[] {
  let lineStart = 0

  return document.lines.map((line, lineIndex) => {
    const lineEnd = lineStart + line.text.length
    let runStart = lineStart
    const runs = line.runs.flatMap((run) => {
      const transformedRuns = splitRunForRange({
        command,
        color,
        ambientStyle,
        rangeEnd: selection.end,
        rangeStart: selection.start,
        run,
        runStart,
        toggleActive,
      })
      runStart += run.text.length
      return transformedRuns
    })
    const nextLineStart = lineEnd + (lineIndex < document.lines.length - 1 ? 1 : 0)
    lineStart = nextLineStart

    return {
      ...line,
      runs: mergeAdjacentRichTextRuns(runs),
      text: runs.map((run) => run.text).join(''),
    }
  })
}

function createCommandResult(
  document: RichTextDocument,
  selection: PlainTextSelectionRange,
): RichTextCommandResult {
  const plainText = document.lines.map((line) => line.text).join('\n')
  const normalizedDocument = {
    ...document,
    plainText,
    source: richTextDocumentToHtmlSource({
      ...document,
      plainText,
    }),
  }

  return {
    htmlSource: normalizedDocument.source,
    plainText,
    selection,
  }
}

function getRunsInSelection(
  document: RichTextDocument,
  selection: NormalizedSelectionRange,
) {
  if (selection.isCollapsed) {
    return []
  }

  const selectedRuns: RichTextRun[] = []
  let lineStart = 0

  for (const [lineIndex, line] of document.lines.entries()) {
    const lineEnd = lineStart + line.text.length
    let runStart = lineStart

    for (const run of line.runs) {
      const runEnd = runStart + run.text.length
      if (Math.max(runStart, selection.start) < Math.min(runEnd, selection.end)) {
        selectedRuns.push(run)
      }
      runStart = runEnd
    }

    lineStart = lineEnd + (lineIndex < document.lines.length - 1 ? 1 : 0)
  }

  return selectedRuns
}

function runHasToggleStyle(
  ambientStyle: RichTextAmbientInlineStyle | undefined,
  run: RichTextRun,
  command: RichTextInlineToggleCommand,
) {
  if (command === 'bold') {
    if (run.bold) return true
    if (typeof run.fontWeight === 'number') {
      const activeThreshold = ambientStyle?.bold
        ? ambientStyle.boldFontWeight ?? 900
        : 700

      return run.fontWeight >= activeThreshold
    }

    return Boolean(ambientStyle?.bold)
  }
  if (command === 'italic') {
    if (run.fontStyle) return run.fontStyle === 'italic'
    return Boolean(run.italic || ambientStyle?.italic)
  }
  if (run.textDecoration) return run.textDecoration === 'underline'
  return Boolean(run.underline || ambientStyle?.underline)
}

function getStateFromBooleans(values: boolean[]): RichTextSelectionStyleState {
  if (values.length === 0) return 'inactive'
  const activeCount = values.filter(Boolean).length

  if (activeCount === 0) return 'inactive'
  if (activeCount === values.length) return 'active'
  return 'mixed'
}

export function applyRichTextInlineToggleCommand({
  active,
  ambientStyle,
  command,
  fallbackText,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  active: boolean
  command: RichTextInlineToggleCommand
  selection?: PlainTextSelectionRange
}): RichTextCommandResult | null {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)

  if (normalizedSelection.isCollapsed) {
    return null
  }

  const lines = transformLinesInSelection({
    command,
    document,
    ambientStyle,
    selection: normalizedSelection,
    toggleActive: active,
  })

  return createCommandResult(
    {
      ...document,
      lines,
    },
    normalizedSelection,
  )
}

export function applyRichTextInlineColorCommand({
  color,
  ambientStyle,
  fallbackText,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  color: string
  selection?: PlainTextSelectionRange
}): RichTextCommandResult | null {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)

  if (normalizedSelection.isCollapsed) {
    return null
  }

  const lines = transformLinesInSelection({
    color,
    command: 'color',
    document,
    ambientStyle,
    selection: normalizedSelection,
  })

  return createCommandResult(
    {
      ...document,
      lines,
    },
    normalizedSelection,
  )
}

export function applyRichTextBulletedListCommand({
  active,
  fallbackText,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  active: boolean
  selection?: PlainTextSelectionRange
}): RichTextCommandResult | null {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)
  const selectedLineIndexes = new Set(
    getSelectedRichTextLineIndexes(document, normalizedSelection),
  )
  const lineRanges = getRichTextLineRanges(document.lines)
  const prefixChanges: RichTextLinePrefixChange[] = []
  const lines = document.lines.map((line, index) => {
    if (!selectedLineIndexes.has(index)) {
      return line
    }

    const nextLine = active
      ? setRichTextLineBulleted(line)
      : unsetRichTextLineBulleted(line)
    const oldPrefixLength = line.list?.prefix.length ?? 0
    const newPrefixLength = nextLine.list?.prefix.length ?? 0

    if (oldPrefixLength !== newPrefixLength) {
      prefixChanges.push({
        lineStart: lineRanges[index]?.start ?? 0,
        newPrefixLength,
        oldPrefixLength,
      })
    }

    return nextLine
  })

  return createCommandResult(
    {
      ...document,
      lines,
    },
    adjustSelectionForPrefixChanges(normalizedSelection, prefixChanges),
  )
}

export function getRichTextInlineToggleState({
  command,
  ambientStyle,
  fallbackText,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  command: RichTextInlineToggleCommand
  selection?: PlainTextSelectionRange
}): RichTextSelectionStyleState {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)
  const runs = getRunsInSelection(document, normalizedSelection)

  return getStateFromBooleans(
    runs.map((run) => runHasToggleStyle(ambientStyle, run, command)),
  )
}

export function getRichTextSelectionColorState({
  fallbackText,
  ambientStyle,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  selection?: PlainTextSelectionRange
}): RichTextSelectionColorState {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)
  const runs = getRunsInSelection(document, normalizedSelection)

  if (runs.length === 0) {
    return { state: 'inactive' }
  }

  const colors = new Set(
    runs.map((run) => run.color ?? ambientStyle?.color).filter(Boolean),
  )
  const uncoloredRuns = runs.some((run) => !(run.color ?? ambientStyle?.color))

  if (colors.size === 0) {
    return { state: 'inactive' }
  }
  if (colors.size === 1 && !uncoloredRuns) {
    return { state: 'active', value: [...colors][0] }
  }
  return { state: 'mixed', value: [...colors][0] }
}

export function getRichTextBulletedListState({
  fallbackText,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  selection?: PlainTextSelectionRange
}): RichTextSelectionStyleState {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)
  const selectedLineIndexes = getSelectedRichTextLineIndexes(
    document,
    normalizedSelection,
  )

  return getStateFromBooleans(
    selectedLineIndexes.map((index) =>
      document.lines[index]?.list?.type === 'ul',
    ),
  )
}
