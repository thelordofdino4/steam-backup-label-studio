export type TextContentMode = 'plain' | 'markdown'

export type MarkdownTextFields = {
  contentMode?: TextContentMode
  markdownSource?: string | null
}

export type RichTextRun = {
  text: string
  bold?: boolean
  italic?: boolean
}

export type RichTextLine = {
  text: string
  runs: RichTextRun[]
}

export type RichTextDocument = {
  lines: RichTextLine[]
  plainText: string
  source: string
}

type RichTextRunStyle = Omit<RichTextRun, 'text'>

const BULLET_LINE_PATTERN = /^(\s*)[-*]\s+(.+)$/

function normalizeMarkdownSource(source: string) {
  return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\0/g, '')
}

function richRunStylesMatch(first: RichTextRun, second: RichTextRun) {
  return Boolean(first.bold) === Boolean(second.bold) &&
    Boolean(first.italic) === Boolean(second.italic)
}

export function mergeAdjacentRichTextRuns(runs: RichTextRun[]): RichTextRun[] {
  const mergedRuns: RichTextRun[] = []

  for (const run of runs) {
    if (!run.text) continue

    const previousRun = mergedRuns[mergedRuns.length - 1]

    if (previousRun && richRunStylesMatch(previousRun, run)) {
      previousRun.text += run.text
      continue
    }

    mergedRuns.push({ ...run })
  }

  return mergedRuns
}

function findClosingSingleAsterisk(text: string, startIndex: number) {
  for (let index = startIndex; index < text.length; index += 1) {
    if (text[index] !== '*') continue
    if (text[index - 1] === '*' || text[index + 1] === '*') continue

    return index
  }

  return -1
}

function parseInlineMarkdown(
  text: string,
  inheritedStyle: RichTextRunStyle = {},
): RichTextRun[] {
  const runs: RichTextRun[] = []
  let index = 0

  while (index < text.length) {
    if (text.startsWith('**', index)) {
      const closingIndex = text.indexOf('**', index + 2)

      if (closingIndex > index + 2) {
        runs.push(...parseInlineMarkdown(
          text.slice(index + 2, closingIndex),
          { ...inheritedStyle, bold: true },
        ))
        index = closingIndex + 2
        continue
      }
    }

    if (text[index] === '*' && text[index + 1] !== '*') {
      const closingIndex = findClosingSingleAsterisk(text, index + 1)

      if (closingIndex > index + 1) {
        runs.push(...parseInlineMarkdown(
          text.slice(index + 1, closingIndex),
          { ...inheritedStyle, italic: true },
        ))
        index = closingIndex + 1
        continue
      }
    }

    const nextBoldIndex = text.indexOf('**', index + 1)
    const nextItalicIndex = findClosingSingleAsterisk(text, index + 1)
    const nextMarkerIndex = [nextBoldIndex, nextItalicIndex]
      .filter((candidate) => candidate > index)
      .reduce(
        (closest, candidate) => Math.min(closest, candidate),
        text.length,
      )
    const literalEndIndex = nextMarkerIndex === text.length
      ? text.length
      : nextMarkerIndex

    runs.push({
      ...inheritedStyle,
      text: text.slice(index, literalEndIndex),
    })
    index = literalEndIndex
  }

  return mergeAdjacentRichTextRuns(runs)
}

function parseMarkdownLine(sourceLine: string): RichTextLine {
  const bulletMatch = sourceLine.match(BULLET_LINE_PATTERN)
  const runs = bulletMatch
    ? [
        { text: `${bulletMatch[1]}• ` },
        ...parseInlineMarkdown(bulletMatch[2] ?? ''),
      ]
    : parseInlineMarkdown(sourceLine)
  const mergedRuns = mergeAdjacentRichTextRuns(runs)
  const text = mergedRuns.map((run) => run.text).join('')

  return {
    text,
    runs: text ? mergedRuns : [],
  }
}

export function parseMarkdownText(source: string): RichTextDocument {
  const normalizedSource = normalizeMarkdownSource(source)
  const lines = normalizedSource.split('\n').map(parseMarkdownLine)

  return {
    lines,
    plainText: lines.map((line) => line.text).join('\n'),
    source: normalizedSource,
  }
}

export function plainTextToRichTextDocument(text: string): RichTextDocument {
  const normalizedText = normalizeMarkdownSource(text)
  const lines = normalizedText.split('\n').map((line) => ({
    text: line,
    runs: line ? [{ text: line }] : [],
  }))

  return {
    lines,
    plainText: normalizedText,
    source: normalizedText,
  }
}

export function transformRichTextDocument(
  document: RichTextDocument,
  transform: (text: string) => string,
): RichTextDocument {
  const lines = document.lines.map((line) => {
    const runs = line.runs.map((run) => ({
      ...run,
      text: transform(run.text),
    }))
    const text = runs.map((run) => run.text).join('')

    return { text, runs }
  })

  return {
    lines,
    plainText: lines.map((line) => line.text).join('\n'),
    source: document.source,
  }
}

export function isMarkdownTextEnabled(
  text: MarkdownTextFields | null | undefined,
) {
  return text?.contentMode === 'markdown'
}

export function getMarkdownSource(
  text: MarkdownTextFields | null | undefined,
  fallback: string,
) {
  return isMarkdownTextEnabled(text) && typeof text?.markdownSource === 'string'
    ? text.markdownSource
    : fallback
}

export function getRenderableRichTextDocument(
  text: MarkdownTextFields | null | undefined,
  fallback: string,
) {
  return isMarkdownTextEnabled(text)
    ? parseMarkdownText(getMarkdownSource(text, fallback))
    : plainTextToRichTextDocument(fallback)
}

export function getRenderablePlainText(
  text: MarkdownTextFields | null | undefined,
  fallback: string,
) {
  return getRenderableRichTextDocument(text, fallback).plainText
}
