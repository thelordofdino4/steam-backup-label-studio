export type TextContentMode = 'plain' | 'html'
export type LegacyTextContentMode = TextContentMode | 'markdown'

export type HtmlTextFields = {
  contentMode?: LegacyTextContentMode
  htmlSource?: string | null
  markdownSource?: string | null
}

import {
  RICH_TEXT_BOLD_FONT_WEIGHT,
  RICH_TEXT_NORMAL_FONT_WEIGHT,
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
const FONT_SIZE_MIN_PT = 1
const FONT_SIZE_MAX_PT = 96
const FONT_SIZE_MIN_PX = 6
const FONT_SIZE_MAX_PX = 144
const CSS_DECLARATION_SEPARATOR = /\s*;\s*/
const CSS_PROPERTY_SEPARATOR = /\s*:\s*/

function normalizeSourceText(source: string) {
  return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\0/g, '')
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function escapeHtmlText(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlAttribute(text: string) {
  return escapeHtmlText(text).replace(/"/g, '&quot;')
}

function decodeHtmlEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity: string) => {
    const normalizedEntity = entity.toLowerCase()

    if (normalizedEntity === 'amp') return '&'
    if (normalizedEntity === 'lt') return '<'
    if (normalizedEntity === 'gt') return '>'
    if (normalizedEntity === 'quot') return '"'
    if (normalizedEntity === 'apos') return "'"
    if (normalizedEntity === 'nbsp') return ' '
    if (normalizedEntity.startsWith('#x')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(2), 16)
      try {
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ''
      } catch {
        return ''
      }
    }
    if (normalizedEntity.startsWith('#')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(1), 10)
      try {
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ''
      } catch {
        return ''
      }
    }

    return ''
  })
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

function parseTagName(rawTag: string) {
  const match = rawTag.match(/^<\/?\s*([a-z0-9-]+)/i)
  return match ? match[1].toLowerCase() : ''
}

function isClosingTag(rawTag: string) {
  return /^<\s*\//.test(rawTag)
}

function parseTagAttributes(rawTag: string) {
  const attributes: Record<string, string> = {}
  const attributeSource = rawTag
    .replace(/^<\/?\s*[a-z0-9-]+/i, '')
    .replace(/\/?\s*>$/, '')
  const attributePattern = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(attributeSource)) !== null) {
    attributes[match[1].toLowerCase()] = decodeHtmlEntities(
      match[2] ?? match[3] ?? match[4] ?? '',
    )
  }

  return attributes
}

function normalizeColor(value: string | undefined) {
  if (!value) return undefined

  const trimmedValue = value.trim().toLowerCase()

  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?$/.test(trimmedValue)) {
    return trimmedValue
  }

  if (
    /^rgba?\(\s*(?:\d{1,3}%?\s*,\s*){2}\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(
      trimmedValue,
    )
  ) {
    return trimmedValue
  }

  if (/^[a-z]+$/.test(trimmedValue) && trimmedValue !== 'url') {
    return trimmedValue
  }

  return undefined
}

function normalizeFontFamily(value: string | undefined) {
  if (!value) return undefined

  const families = value
    .split(',')
    .map((family) => family.trim().replace(/^['"]|['"]$/g, ''))
    .filter((family) => /^[a-zA-Z0-9 _-]{1,48}$/.test(family))

  return families.length > 0 ? families.join(', ') : undefined
}

function normalizeFontSize(value: string | undefined) {
  if (!value) return undefined

  const match = value.trim().match(/^(\d+(?:\.\d+)?)(pt|px)$/i)

  if (!match) return undefined

  const numericValue = Number.parseFloat(match[1])
  const unit = match[2].toLowerCase()

  if (unit === 'pt') {
    return {
      fontSizePt: clampNumber(
        numericValue,
        FONT_SIZE_MIN_PT,
        FONT_SIZE_MAX_PT,
      ),
    }
  }

  return clampNumber(
    numericValue,
    FONT_SIZE_MIN_PX,
    FONT_SIZE_MAX_PX,
  )
}

function normalizeFontWeight(value: string | undefined) {
  if (!value) return undefined

  const trimmedValue = value.trim().toLowerCase()

  if (trimmedValue === 'normal') return RICH_TEXT_NORMAL_FONT_WEIGHT
  if (trimmedValue === 'bold') return RICH_TEXT_BOLD_FONT_WEIGHT

  const numericValue = Number.parseInt(trimmedValue, 10)

  if (!Number.isFinite(numericValue)) return undefined

  return clampNumber(Math.round(numericValue / 100) * 100, 100, 900)
}

function normalizeFontStyle(value: string | undefined) {
  const normalizedValue = value?.trim().toLowerCase()

  if (normalizedValue === 'italic') return 'italic'
  if (normalizedValue === 'normal') return 'normal'

  return undefined
}

function normalizeTextDecoration(value: string | undefined) {
  if (!value) return undefined

  const normalizedValue = value.trim().toLowerCase()

  if (normalizedValue === 'underline') return 'underline'
  if (normalizedValue === 'none') return 'none'

  return undefined
}

function parseSafeInlineStyle(style: string | undefined): RichTextRunStyle {
  const runStyle: RichTextRunStyle = {}

  if (!style) return runStyle

  for (const declaration of style.split(CSS_DECLARATION_SEPARATOR)) {
    if (!declaration.trim()) continue

    const [rawProperty, rawValue] = declaration.split(CSS_PROPERTY_SEPARATOR, 2)
    const property = rawProperty?.trim().toLowerCase()
    const value = rawValue?.trim()

    if (!property || !value || /url\s*\(/i.test(value)) continue

    if (property === 'color') {
      runStyle.color = normalizeColor(value)
    } else if (property === 'background-color') {
      runStyle.backgroundColor = normalizeColor(value)
    } else if (property === 'font-family') {
      runStyle.fontFamily = normalizeFontFamily(value)
    } else if (property === 'font-size') {
      const fontSize = normalizeFontSize(value)
      if (typeof fontSize === 'number') {
        runStyle.fontSizePx = fontSize
      } else if (fontSize?.fontSizePt) {
        runStyle.fontSizePt = fontSize.fontSizePt
      }
    } else if (property === 'font-weight') {
      const fontWeight = normalizeFontWeight(value)
      if (fontWeight) {
        runStyle.fontWeight = fontWeight
        runStyle.bold = fontWeight >= RICH_TEXT_BOLD_FONT_WEIGHT || undefined
      }
    } else if (property === 'font-style') {
      const fontStyle = normalizeFontStyle(value)
      if (fontStyle) {
        runStyle.fontStyle = fontStyle
        runStyle.italic = fontStyle === 'italic' || undefined
      }
    } else if (property === 'text-decoration') {
      const textDecoration = normalizeTextDecoration(value)
      if (textDecoration) {
        runStyle.textDecoration = textDecoration
        runStyle.underline = textDecoration === 'underline' || undefined
      }
    }
  }

  return Object.fromEntries(
    Object.entries(runStyle).filter(([, value]) => value !== undefined),
  ) as RichTextRunStyle
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

function getSafeStyleDeclarations(run: RichTextRun) {
  const declarations = [
    run.color ? `color:${run.color}` : '',
    run.backgroundColor ? `background-color:${run.backgroundColor}` : '',
    run.fontFamily ? `font-family:${run.fontFamily}` : '',
    run.fontSizePt ? `font-size:${run.fontSizePt}pt` : '',
    run.fontSizePx ? `font-size:${run.fontSizePx}px` : '',
    run.fontWeight && !run.bold ? `font-weight:${run.fontWeight}` : '',
    run.fontStyle && !run.italic ? `font-style:${run.fontStyle}` : '',
    run.textDecoration === 'underline' && !run.underline
      ? 'text-decoration:underline'
      : run.textDecoration === 'none' && !run.underline
        ? 'text-decoration:none'
      : '',
  ].filter(Boolean)

  return declarations
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
