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
