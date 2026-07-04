import {
  decodeHtmlEntities,
} from './htmlEntities.ts'

export function parseTagName(rawTag: string) {
  const match = rawTag.match(/^<\/?\s*([a-z0-9-]+)/i)
  return match ? match[1].toLowerCase() : ''
}

export function isClosingTag(rawTag: string) {
  return /^<\s*\//.test(rawTag)
}

export function parseTagAttributes(rawTag: string) {
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
