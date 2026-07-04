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
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from './richTextWeights.ts'
import {
  applyEnterInsideBulletedLine,
  applySoftBreakInsideBulletedLine,
  getRichTextDocumentForListKeyboard,
  isEmptyBulletedLine,
  setRichTextLineBulleted,
  unsetRichTextLineBulleted,
  type RichTextListKeyboardCommand,
} from './richTextListKeyboard.ts'
import {
  createRichTextRun,
  getRichTextStyleAtLineOffset,
  normalizeRichTextLine,
  splitRichTextLineAtOffset,
} from './richTextRunRanges.ts'
import {
  adjustSelectionForPrefixChanges,
  getRichTextLineRangeAtOffset,
  getRichTextLineRanges,
  getSelectedRichTextLineIndexes,
  normalizeSelection,
  type NormalizedSelectionRange,
  type PlainTextSelectionRange,
  type RichTextLinePrefixChange,
} from './richTextSelectionRanges.ts'

export type { RichTextListKeyboardCommand } from './richTextListKeyboard.ts'
export type { PlainTextSelectionRange } from './richTextSelectionRanges.ts'

export type RichTextInlineToggleCommand = 'bold' | 'italic' | 'underline'
export type RichTextInlineCommand =
  | RichTextInlineToggleCommand
  | 'color'
  | 'fontFamily'
  | 'fontSizePt'
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

export type RichTextSelectionNumberState = {
  state: RichTextSelectionStyleState
  value?: number
}

export type RichTextSelectionStringState = {
  state: RichTextSelectionStyleState
  value?: string
}

export type RichTextAmbientInlineStyle = {
  bold?: boolean
  boldFontWeight?: number
  color?: string
  fontFamily?: string
  fontSizePt?: number
  italic?: boolean
  normalFontWeight?: number
  underline?: boolean
}

type RichTextSourceInput = {
  ambientStyle?: RichTextAmbientInlineStyle
  fallbackText: string
  htmlSource?: string | null
}

function getRichTextDocument({ fallbackText, htmlSource }: RichTextSourceInput) {
  return typeof htmlSource === 'string'
    ? parseHtmlText(htmlSource)
    : plainTextToRichTextDocument(fallbackText)
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
        ? ambientStyle?.boldFontWeight ?? RICH_TEXT_BOLD_FONT_WEIGHT
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

function fontSizeRun(run: RichTextRun, fontSizePt: number): RichTextRun {
  return {
    ...run,
    fontSizePt,
    fontSizePx: undefined,
  }
}

function fontFamilyRun(run: RichTextRun, fontFamily: string): RichTextRun {
  return {
    ...run,
    fontFamily,
  }
}

function splitRunForRange({
  command,
  color,
  fontFamily,
  fontSizePt,
  ambientStyle,
  rangeEnd,
  rangeStart,
  run,
  runStart,
  toggleActive,
}: {
  command: RichTextInlineCommand
  color?: string
  fontFamily?: string
  fontSizePt?: number
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
      : command === 'fontFamily'
        ? fontFamilyRun(selectedRun, fontFamily ?? run.fontFamily ?? ambientStyle?.fontFamily ?? 'Arial, sans-serif')
      : command === 'fontSizePt'
        ? fontSizeRun(selectedRun, fontSizePt ?? run.fontSizePt ?? ambientStyle?.fontSizePt ?? 12)
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
  fontFamily,
  fontSizePt,
  document,
  ambientStyle,
  selection,
  toggleActive,
}: {
  command: RichTextInlineCommand
  color?: string
  fontFamily?: string
  fontSizePt?: number
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
        fontFamily,
        fontSizePt,
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
    selection: {
      end: selection.end,
      start: selection.start,
    },
  }
}

function getCommonPrefixLength(left: string, right: string) {
  const maxLength = Math.min(left.length, right.length)
  let index = 0

  while (index < maxLength && left[index] === right[index]) {
    index += 1
  }

  return index
}

function getCommonSuffixLength(
  left: string,
  right: string,
  prefixLength: number,
) {
  const maxLength = Math.min(left.length, right.length) - prefixLength
  let index = 0

  while (
    index < maxLength &&
    left[left.length - 1 - index] === right[right.length - 1 - index]
  ) {
    index += 1
  }

  return index
}

function replaceSingleLineRichTextRange({
  document,
  insertedText,
  rangeEnd,
  rangeStart,
}: {
  document: RichTextDocument
  insertedText: string
  rangeEnd: number
  rangeStart: number
}) {
  const lineRanges = getRichTextLineRanges(document.lines)
  const startRange = getRichTextLineRangeAtOffset(lineRanges, rangeStart)
  const endRange = getRichTextLineRangeAtOffset(lineRanges, rangeEnd)

  if (!startRange || !endRange || startRange.index !== endRange.index) {
    return null
  }

  const line = document.lines[startRange.index]
  const startOffset = rangeStart - startRange.start
  const endOffset = rangeEnd - startRange.start
  const prefixSplit = splitRichTextLineAtOffset(line, startOffset)
  const suffixSplit = splitRichTextLineAtOffset(line, endOffset)
  const insertionStyle =
    getRichTextStyleAtLineOffset(line, startOffset) ??
    getRichTextStyleAtLineOffset(line, endOffset)
  const runs = [
    ...prefixSplit.beforeRuns,
    ...(insertedText ? [createRichTextRun(insertedText, insertionStyle)] : []),
    ...suffixSplit.afterRuns,
  ]

  return {
    ...document,
    lines: document.lines.map((candidate, index) =>
      index === startRange.index
        ? normalizeRichTextLine(candidate, runs)
        : candidate),
  } satisfies RichTextDocument
}

export function applyRichTextPlainTextMutation({
  fallbackText,
  htmlSource,
  nextPlainText,
}: RichTextSourceInput & {
  nextPlainText: string
}): RichTextCommandResult {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const oldPlainText = document.plainText

  if (oldPlainText === nextPlainText) {
    return createCommandResult(document, {
      end: nextPlainText.length,
      start: nextPlainText.length,
    })
  }

  const prefixLength = getCommonPrefixLength(oldPlainText, nextPlainText)
  const suffixLength = getCommonSuffixLength(
    oldPlainText,
    nextPlainText,
    prefixLength,
  )
  const oldRangeEnd = oldPlainText.length - suffixLength
  const nextRangeEnd = nextPlainText.length - suffixLength
  const insertedText = nextPlainText.slice(prefixLength, nextRangeEnd)
  const singleLineDocument = insertedText.includes('\n')
    ? null
    : replaceSingleLineRichTextRange({
        document,
        insertedText,
        rangeEnd: oldRangeEnd,
        rangeStart: prefixLength,
      })
  const nextDocument = singleLineDocument ??
    plainTextToRichTextDocument(nextPlainText)
  const selection = {
    end: prefixLength + insertedText.length,
    start: prefixLength + insertedText.length,
  }

  return createCommandResult(nextDocument, selection)
}

export function applyRichTextListKeyboardCommand({
  command,
  fallbackText,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  command: RichTextListKeyboardCommand
  selection?: PlainTextSelectionRange
}): RichTextCommandResult | null {
  const document = getRichTextDocumentForListKeyboard({
    fallbackText,
    htmlSource,
  })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)

  if (!normalizedSelection.isCollapsed) {
    return null
  }

  const lineRanges = getRichTextLineRanges(document.lines)
  const lineRange = getRichTextLineRangeAtOffset(
    lineRanges,
    normalizedSelection.start,
  )

  if (!lineRange) {
    return null
  }

  const line = document.lines[lineRange.index]

  if (line?.list?.type !== 'ul') {
    return null
  }

  const lineOffset = normalizedSelection.start - lineRange.start

  if (command === 'shiftEnter') {
    const mutation = applySoftBreakInsideBulletedLine({
      document,
      line,
      lineIndex: lineRange.index,
      lineOffset,
      lineStart: lineRange.start,
    })

    return createCommandResult(mutation.document, mutation.selection)
  }

  if (command === 'backspace' && !isEmptyBulletedLine(line)) {
    return null
  }

  const mutation = applyEnterInsideBulletedLine({
    document,
    line,
    lineIndex: lineRange.index,
    lineOffset,
    lineStart: lineRange.start,
  })

  return createCommandResult(mutation.document, mutation.selection)
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
        ? ambientStyle.boldFontWeight ?? RICH_TEXT_BOLD_FONT_WEIGHT
        : RICH_TEXT_BOLD_FONT_WEIGHT

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

export function applyRichTextInlineFontSizePtCommand({
  ambientStyle,
  fallbackText,
  fontSizePt,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  fontSizePt: number
  selection?: PlainTextSelectionRange
}): RichTextCommandResult | null {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)

  if (normalizedSelection.isCollapsed) {
    return null
  }

  const lines = transformLinesInSelection({
    command: 'fontSizePt',
    document,
    fontSizePt,
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

export function applyRichTextInlineFontFamilyCommand({
  ambientStyle,
  fallbackText,
  fontFamily,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  fontFamily: string
  selection?: PlainTextSelectionRange
}): RichTextCommandResult | null {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)

  if (normalizedSelection.isCollapsed) {
    return null
  }

  const lines = transformLinesInSelection({
    command: 'fontFamily',
    document,
    fontFamily,
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

export function getRichTextSelectionFontSizePtState({
  fallbackText,
  ambientStyle,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  selection?: PlainTextSelectionRange
}): RichTextSelectionNumberState {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)
  const runs = getRunsInSelection(document, normalizedSelection)

  if (runs.length === 0) {
    return { state: 'inactive' }
  }

  const sizes = new Set(
    runs.map((run) => run.fontSizePt ?? ambientStyle?.fontSizePt)
      .filter((value): value is number =>
        typeof value === 'number' && Number.isFinite(value)),
  )
  const unsizedRuns = runs.some((run) =>
    typeof (run.fontSizePt ?? ambientStyle?.fontSizePt) !== 'number')

  if (sizes.size === 0) {
    return { state: 'inactive' }
  }
  if (sizes.size === 1 && !unsizedRuns) {
    return { state: 'active', value: [...sizes][0] }
  }
  return { state: 'mixed', value: [...sizes][0] }
}

export function getRichTextSelectionFontFamilyState({
  fallbackText,
  ambientStyle,
  htmlSource,
  selection,
}: RichTextSourceInput & {
  selection?: PlainTextSelectionRange
}): RichTextSelectionStringState {
  const document = getRichTextDocument({ fallbackText, htmlSource })
  const normalizedSelection = normalizeSelection(selection, document.plainText.length)
  const runs = getRunsInSelection(document, normalizedSelection)

  if (runs.length === 0) {
    return { state: 'inactive' }
  }

  const families = new Set(
    runs.map((run) => run.fontFamily ?? ambientStyle?.fontFamily)
      .filter((value): value is string => Boolean(value)),
  )
  const unstyledRuns = runs.some((run) =>
    typeof (run.fontFamily ?? ambientStyle?.fontFamily) !== 'string')

  if (families.size === 0) {
    return { state: 'inactive' }
  }
  if (families.size === 1 && !unstyledRuns) {
    return { state: 'active', value: [...families][0] }
  }
  return { state: 'mixed', value: [...families][0] }
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
