export type TextContentMode = 'plain' | 'html'
export type LegacyTextContentMode = TextContentMode | 'markdown'

export type HtmlTextFields = {
  contentMode?: LegacyTextContentMode
  htmlSource?: string | null
  markdownSource?: string | null
}

import {
  decodeHtmlEntities,
  escapeHtmlAttribute,
  escapeHtmlText,
} from './htmlEntities.ts'
import {
  getSafeStyleDeclarations,
  parseSafeInlineStyle,
} from './htmlInlineStyles.ts'
import {
  isClosingTag,
  parseTagAttributes,
  parseTagName,
} from './htmlTags.ts'
import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
} from './richTextWeights.ts'

export type RichTextRun = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
  backgroundColor?: string
  fontFamily?: string
  fontSizePt?: number
  fontSizePx?: number
  fontWeight?: number
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
}

export type RichTextLine = {
  text: string
  runs: RichTextRun[]
  list?: {
    continuation?: boolean
    type: 'ul' | 'ol'
    ordinal?: number
    prefix: string
  }
}

export type RichTextDocument = {
  lines: RichTextLine[]
  plainText: string
  source: string
}

type RichTextRunStyle = Omit<RichTextRun, 'text'>
type ListContext = { type: 'ul' | 'ol'; nextOrdinal: number }

const ALLOWED_TAGS = new Set([
  'b',
  'br',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'u',
  'ul',
])
const BLOCK_TAGS = new Set(['p', 'li'])
const STRIPPED_CONTENT_TAGS = new Set(['script', 'style'])
const TOKEN_PATTERN = /<!--[\s\S]*?-->|<![^>]*>|<\/?[^>]+>/g
const BULLET_LINE_PATTERN = /^(\s*)[-*]\s+(.+)$/
function normalizeSourceText(source: string) {
  return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\0/g, '')
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

function mergeRunStyles(
  first: RichTextRunStyle,
  second: RichTextRunStyle,
): RichTextRunStyle {
  return {
    ...first,
    ...second,
    bold: first.bold || second.bold ||
      (typeof second.fontWeight === 'number' &&
        second.fontWeight >= RICH_TEXT_BOLD_FONT_WEIGHT) ||
      undefined,
    italic: first.italic || second.italic || second.fontStyle === 'italic' ||
      undefined,
    underline: first.underline || second.underline ||
      second.textDecoration === 'underline' || undefined,
  }
}

function getCurrentStyle(styleStack: RichTextRunStyle[]) {
  return styleStack.reduce<RichTextRunStyle>(
    (style, nextStyle) => mergeRunStyles(style, nextStyle),
    {},
  )
}

function createEmptyLine(list?: RichTextLine['list']): RichTextLine {
  return {
    text: '',
    runs: [],
    ...(list ? { list } : {}),
  }
}

function appendRunToLine(line: RichTextLine, run: RichTextRun) {
  if (!run.text) return

  const nextRuns = mergeAdjacentRichTextRuns([...line.runs, run])
  line.runs = nextRuns
  line.text = nextRuns.map((candidate) => candidate.text).join('')
}

function getLastLine(lines: RichTextLine[]) {
  if (lines.length === 0) {
    lines.push(createEmptyLine())
  }

  return lines[lines.length - 1]
}

function appendText(
  lines: RichTextLine[],
  text: string,
  styleStack: RichTextRunStyle[],
) {
  if (!text) return

  appendRunToLine(getLastLine(lines), {
    ...getCurrentStyle(styleStack),
    text,
  })
}

function appendHtmlLiteralText(
  lines: RichTextLine[],
  literalText: string,
  styleStack: RichTextRunStyle[],
  hasOpenTag: boolean,
) {
  if (!literalText) return

  if (!hasOpenTag && /^\s+$/.test(literalText)) {
    return
  }

  appendText(lines, decodeHtmlEntities(literalText), styleStack)
}

function appendLineBreak(lines: RichTextLine[], list?: RichTextLine['list']) {
  const lastLine = getLastLine(lines)

  if (lastLine.text || lines.length > 1) {
    lines.push(createEmptyLine(list))
  }
}

function startBlock(lines: RichTextLine[]) {
  const lastLine = getLastLine(lines)

  if (lastLine.text) {
    lines.push(createEmptyLine())
  }
}

function startListItem(
  lines: RichTextLine[],
  listContext: ListContext | undefined,
  styleStack: RichTextRunStyle[],
) {
  const list = listContext
    ? {
        type: listContext.type,
        ordinal: listContext.type === 'ol' ? listContext.nextOrdinal : undefined,
        prefix: listContext.type === 'ol' ? `${listContext.nextOrdinal}. ` : '• ',
      } satisfies RichTextLine['list']
    : {
        type: 'ul',
        prefix: '• ',
      } satisfies RichTextLine['list']

  if (listContext?.type === 'ol') {
    listContext.nextOrdinal += 1
  }

  const lastLine = getLastLine(lines)
  if (lastLine.text) {
    lines.push(createEmptyLine(list))
  } else {
    lastLine.list = list
  }
  appendText(lines, list.prefix, styleStack)
}

function endListItem(lines: RichTextLine[]) {
  const lastLine = getLastLine(lines)

  if (lastLine.text) {
    lines.push(createEmptyLine())
  }
}

function trimTrailingEmptyLines(lines: RichTextLine[]) {
  while (
    lines.length > 1 &&
    lines[lines.length - 1].text === '' &&
    !lines[lines.length - 1].list?.continuation
  ) {
    lines.pop()
  }

  return lines
}

function getTagStyle(tagName: string, rawTag: string): RichTextRunStyle {
  if (tagName === 'strong' || tagName === 'b') {
    return { bold: true, fontWeight: RICH_TEXT_BOLD_FONT_WEIGHT }
  }
  if (tagName === 'em' || tagName === 'i') return { italic: true, fontStyle: 'italic' }
  if (tagName === 'u') return { underline: true, textDecoration: 'underline' }
  if (tagName === 'span') {
    return parseSafeInlineStyle(parseTagAttributes(rawTag).style)
  }

  return {}
}

function serializeRun(run: RichTextRun) {
  let serializedText = escapeHtmlText(run.text)
  const styleDeclarations = getSafeStyleDeclarations(run)

  if (styleDeclarations.length > 0) {
    serializedText = `<span style="${escapeHtmlAttribute(
      styleDeclarations.join('; '),
    )}">${serializedText}</span>`
  }
  if (run.underline) serializedText = `<u>${serializedText}</u>`
  if (run.italic) serializedText = `<em>${serializedText}</em>`
  if (run.bold) serializedText = `<strong>${serializedText}</strong>`

  return serializedText
}

function getLineContentRuns(line: RichTextLine) {
  if (!line.list?.prefix || line.list.continuation || line.runs.length === 0) {
    return line.runs
  }

  const runs = line.runs.map((run) => ({ ...run }))
  let prefixRemaining = line.list.prefix.length

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

  return runs
}

export function richTextDocumentToHtmlSource(document: RichTextDocument) {
  const parts: string[] = []
  let openListType: 'ul' | 'ol' | null = null
  let openListItem = false

  function closeList() {
    if (openListItem) {
      parts.push('</li>')
      openListItem = false
    }
    if (openListType) {
      parts.push(`</${openListType}>`)
      openListType = null
    }
  }

  function closeListItem() {
    if (openListItem) {
      parts.push('</li>')
      openListItem = false
    }
  }

  for (const line of document.lines) {
    const serializedRuns = (line.list ? getLineContentRuns(line) : line.runs)
      .map(serializeRun)
      .join('')

    if (line.list) {
      if (openListType !== line.list.type) {
        closeList()
        openListType = line.list.type
        parts.push(`<${openListType}>`)
      }
      if (line.list.continuation) {
        if (!openListItem) {
          parts.push('<li>')
          openListItem = true
        }
        parts.push(`<br>${serializedRuns}`)
        continue
      }
      closeListItem()
      parts.push(`<li>${serializedRuns}`)
      openListItem = true
      continue
    }

    closeList()
    parts.push(`<p>${serializedRuns}</p>`)
  }

  closeList()
  return parts.join('')
}

export function parseHtmlText(source: string): RichTextDocument {
  const normalizedSource = normalizeSourceText(source)
  const lines: RichTextLine[] = [createEmptyLine()]
  const styleStack: RichTextRunStyle[] = []
  const tagStack: Array<{ tagName: string; style?: RichTextRunStyle }> = []
  const listStack: ListContext[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = TOKEN_PATTERN.exec(normalizedSource)) !== null) {
    const literalText = normalizedSource.slice(lastIndex, match.index)
    appendHtmlLiteralText(
      lines,
      literalText,
      styleStack,
      tagStack.length > 0,
    )

    const rawTag = match[0]
    const tagName = parseTagName(rawTag)
    const closingTag = isClosingTag(rawTag)

    if (!tagName || !ALLOWED_TAGS.has(tagName)) {
      if (!closingTag && STRIPPED_CONTENT_TAGS.has(tagName)) {
        const closingPattern = new RegExp(`<\\/\\s*${tagName}\\s*>`, 'ig')
        closingPattern.lastIndex = TOKEN_PATTERN.lastIndex
        const closingMatch = closingPattern.exec(normalizedSource)

        if (closingMatch) {
          TOKEN_PATTERN.lastIndex = closingPattern.lastIndex
        } else {
          TOKEN_PATTERN.lastIndex = normalizedSource.length
        }
      }

      lastIndex = TOKEN_PATTERN.lastIndex
      continue
    }

    if (closingTag) {
      if (tagName === 'li') {
        endListItem(lines)
      } else if (tagName === 'p') {
        appendLineBreak(lines)
      } else if (tagName === 'ul' || tagName === 'ol') {
        listStack.pop()
      }

      let stackIndex = -1
      for (let index = tagStack.length - 1; index >= 0; index -= 1) {
        if (tagStack[index].tagName === tagName) {
          stackIndex = index
          break
        }
      }
      if (stackIndex >= 0) {
        const removedTags = tagStack.splice(stackIndex)
        for (const tag of removedTags.reverse()) {
          if (tag.style) {
            styleStack.pop()
          }
        }
      }

      lastIndex = TOKEN_PATTERN.lastIndex
      continue
    }

    if (tagName === 'br') {
      const currentList = listStack[listStack.length - 1]
      const insideListItem = tagStack.some((tag) => tag.tagName === 'li')

      appendLineBreak(
        lines,
        currentList && insideListItem
          ? {
              continuation: true,
              prefix: '',
              type: currentList.type,
            }
          : undefined,
      )
      lastIndex = TOKEN_PATTERN.lastIndex
      continue
    }

    if (tagName === 'ul' || tagName === 'ol') {
      listStack.push({ type: tagName, nextOrdinal: 1 })
      lastIndex = TOKEN_PATTERN.lastIndex
      continue
    }

    if (BLOCK_TAGS.has(tagName)) {
      if (tagName === 'li') {
        startListItem(lines, listStack[listStack.length - 1], styleStack)
      } else {
        startBlock(lines)
      }
    }

    const tagStyle = getTagStyle(tagName, rawTag)
    tagStack.push({ tagName, style: tagStyle })
    if (Object.keys(tagStyle).length > 0) {
      styleStack.push(tagStyle)
    }

    lastIndex = TOKEN_PATTERN.lastIndex
  }

  appendHtmlLiteralText(
    lines,
    normalizedSource.slice(lastIndex),
    styleStack,
    tagStack.length > 0,
  )

  const normalizedLines = trimTrailingEmptyLines(lines).map((line) => ({
    ...line,
    runs: mergeAdjacentRichTextRuns(line.runs),
  }))
  const plainText = normalizedLines.map((line) => line.text).join('\n')

  return {
    lines: normalizedLines,
    plainText,
    source: richTextDocumentToHtmlSource({
      lines: normalizedLines,
      plainText,
      source: normalizedSource,
    }),
  }
}

export function sanitizeHtmlSource(source: string) {
  return parseHtmlText(source).source
}

export function plainTextToRichTextDocument(text: string): RichTextDocument {
  const normalizedText = normalizeSourceText(text)
  const lines = normalizedText.split('\n').map((line) => ({
    text: line,
    runs: line ? [{ text: line }] : [],
  }))

  return {
    lines,
    plainText: normalizedText,
    source: richTextDocumentToHtmlSource({
      lines,
      plainText: normalizedText,
      source: normalizedText,
    }),
  }
}

export function plainTextToHtmlSource(text: string) {
  return plainTextToRichTextDocument(text).source
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

    return { ...line, text, runs }
  })
  const plainText = lines.map((line) => line.text).join('\n')

  return {
    lines,
    plainText,
    source: richTextDocumentToHtmlSource({
      lines,
      plainText,
      source: document.source,
    }),
  }
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
          {
            ...inheritedStyle,
            bold: true,
            fontWeight: RICH_TEXT_BOLD_FONT_WEIGHT,
          },
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
          { ...inheritedStyle, italic: true, fontStyle: 'italic' },
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
  const list = bulletMatch
    ? { type: 'ul' as const, prefix: `${bulletMatch[1]}• ` }
    : undefined
  const runs = bulletMatch
    ? [
        { text: list?.prefix ?? '• ' },
        ...parseInlineMarkdown(bulletMatch[2] ?? ''),
      ]
    : parseInlineMarkdown(sourceLine)
  const mergedRuns = mergeAdjacentRichTextRuns(runs)
  const text = mergedRuns.map((run) => run.text).join('')

  return {
    text,
    runs: text ? mergedRuns : [],
    ...(list ? { list } : {}),
  }
}

export function parseLegacyMarkdownText(source: string): RichTextDocument {
  const normalizedSource = normalizeSourceText(source)
  const lines = normalizedSource.split('\n').map(parseMarkdownLine)
  const plainText = lines.map((line) => line.text).join('\n')

  return {
    lines,
    plainText,
    source: normalizedSource,
  }
}

export function markdownToHtmlSource(source: string) {
  return richTextDocumentToHtmlSource(parseLegacyMarkdownText(source))
}

export function isHtmlTextEnabled(
  text: HtmlTextFields | null | undefined,
) {
  if (text?.contentMode === 'plain') {
    return false
  }

  return text?.contentMode === 'html' ||
    text?.contentMode === 'markdown' ||
    (typeof text?.htmlSource === 'string' && text.htmlSource.length > 0)
}

export function getHtmlSource(
  text: HtmlTextFields | null | undefined,
  fallback: string,
) {
  if (typeof text?.htmlSource === 'string') {
    return sanitizeHtmlSource(text.htmlSource)
  }

  if (typeof text?.markdownSource === 'string') {
    return markdownToHtmlSource(text.markdownSource)
  }

  return plainTextToHtmlSource(fallback)
}

export function getRenderableRichTextDocument(
  text: HtmlTextFields | null | undefined,
  fallback: string,
) {
  return isHtmlTextEnabled(text)
    ? parseHtmlText(getHtmlSource(text, fallback))
    : plainTextToRichTextDocument(fallback)
}

export function getRenderablePlainText(
  text: HtmlTextFields | null | undefined,
  fallback: string,
) {
  return getRenderableRichTextDocument(text, fallback).plainText
}
