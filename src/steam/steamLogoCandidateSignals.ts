export function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

export function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

export function getTagAttributes(tag: string) {
  const attributes: Record<string, string> = {}
  const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(tag)) !== null) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[3] ?? match[4] ?? match[5] ?? '')
  }

  return attributes
}

export function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function compactForMatch(value: string) {
  return normalizeForMatch(value).replace(/\s+/g, '')
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export function getNumericDimension(value: string | undefined) {
  if (!value) return undefined

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export function includesAny(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term))
}

export function includesStandaloneTerm(haystack: string, term: string) {
  const normalizedTerm = normalizeForMatch(term)
  return Boolean(normalizedTerm) && ` ${haystack} `.includes(` ${normalizedTerm} `)
}

export function hasEntityMatch(haystack: string, entityNames: string[]) {
  const compactHaystack = compactForMatch(haystack)

  return entityNames.some((name) => {
    const normalizedName = normalizeForMatch(name)
    const compactName = compactForMatch(name)
    const tokens = normalizedName.split(/\s+/).filter((token) => token.length > 2)

    return Boolean(
      compactName && compactHaystack.includes(compactName)
      || tokens.length > 0 && tokens.every((token) => compactHaystack.includes(token)),
    )
  })
}

export function getUrlSignalText(url: string) {
  try {
    const parsedUrl = new URL(url)
    return decodeURIComponent(`${parsedUrl.pathname} ${parsedUrl.search}`)
  } catch {
    return url
  }
}
