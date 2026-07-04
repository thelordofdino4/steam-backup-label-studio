import {
  absolutizeUrl,
  canonicalizeUrl,
  isHttpsUrl,
} from './steamLogoCandidateUrls.ts'
import {
  extractOfficialCssUrls,
} from './steamOfficialSiteCss.ts'
import {
  getNumericDimension,
  getTagAttributes,
  uniqueStrings,
} from './steamLogoCandidateSignals.ts'

export type OfficialHtmlImageSeed = {
  url: string
  sourcePageUrl: string
  label: string
  sourceKind:
    | 'official-img'
    | 'official-srcset'
    | 'official-css-background'
    | 'official-meta-image'
    | 'favicon'
  width?: number
  height?: number
  alt?: string
  selector?: string
  context: string
}

export function getOfficialHtmlTagAttributes(tag: string) {
  return getTagAttributes(tag)
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9+]+/g, ' ').trim()
}

function getCssDisplayIdentifier(value: string) {
  return value
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 60) ?? ''
}

export function getOfficialHtmlDisplaySelector(
  tagName: string,
  attrs: Record<string, string>,
) {
  const id = getCssDisplayIdentifier(attrs.id ?? '')
  const classNames = (attrs.class ?? '')
    .split(/\s+/)
    .map(getCssDisplayIdentifier)
    .filter(Boolean)
    .slice(0, 4)
    .map((className) => `.${className}`)
    .join('')

  return `${tagName.toLowerCase()}${id ? `#${id}` : ''}${classNames}`
}

export function parseOfficialSrcsetEntries(
  srcset: string | undefined,
  sourcePageUrl: string,
) {
  if (!srcset) return []

  const entries: Array<{ url: string; width?: number }> = []

  srcset.split(',').forEach((entry) => {
    const [rawUrl, descriptor] = entry.trim().split(/\s+/, 2)
    const url = absolutizeUrl(rawUrl, sourcePageUrl)
    if (!url) return

    const width = descriptor?.endsWith('w')
      ? getNumericDimension(descriptor)
      : undefined
    entries.push(width ? { url, width } : { url })
  })

  return entries
}

function getIconDimensions(attrs: Record<string, string>) {
  const sizes = attrs.sizes ?? ''
  const sizeMatch = sizes.match(/(\d+)\s*x\s*(\d+)/i)

  return {
    width: getNumericDimension(attrs.width) ?? getNumericDimension(sizeMatch?.[1]),
    height: getNumericDimension(attrs.height) ?? getNumericDimension(sizeMatch?.[2]),
  }
}

function isIconRel(rel: string | undefined) {
  const normalizedRel = normalizeForMatch(rel ?? '')
  return /\bicon\b/.test(normalizedRel) ||
    normalizedRel.includes('mask icon') ||
    normalizedRel.includes('apple touch icon')
}

function isStylesheetLink(attrs: Record<string, string>) {
  const rel = normalizeForMatch(attrs.rel ?? '')
  const href = attrs.href ?? ''

  return rel.includes('stylesheet') ||
    attrs.type === 'text/css' ||
    /\.css(?:[?#]|$)/i.test(href)
}

export function extractOfficialStylesheetUrlsFromHtml(
  html: string,
  sourcePageUrl: string,
) {
  const urls: string[] = []
  const linkTagPattern = /<link\b[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = linkTagPattern.exec(html)) !== null) {
    const attrs = getOfficialHtmlTagAttributes(match[0])
    if (!isStylesheetLink(attrs)) continue

    const url = absolutizeUrl(attrs.href, sourcePageUrl)
    if (url && isHttpsUrl(url)) urls.push(canonicalizeUrl(url))
  }

  return uniqueStrings(urls)
}

export function parseOfficialHtmlImageSeeds(
  html: string,
  sourcePageUrl: string,
): OfficialHtmlImageSeed[] {
  const seeds: OfficialHtmlImageSeed[] = []
  const linkTagPattern = /<link\b[^>]*>/gi
  const metaTagPattern = /<meta\b[^>]*>/gi
  const imageTagPattern = /<img\b[^>]*>/gi
  const sourceTagPattern = /<source\b[^>]*>/gi
  const styledTagPattern = /<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = metaTagPattern.exec(html)) !== null) {
    const attrs = getOfficialHtmlTagAttributes(match[0])
    const property = (attrs.property ?? attrs.name ?? '').toLowerCase()
    if (property !== 'og:image' && property !== 'twitter:image' && property !== 'twitter:image:src') continue

    const url = absolutizeUrl(attrs.content, sourcePageUrl)
    if (!url) continue

    seeds.push({
      url,
      sourcePageUrl,
      label: property.startsWith('og:') ? 'Official Open Graph image' : 'Official Twitter image',
      sourceKind: 'official-meta-image',
      selector: property.startsWith('og:') ? 'meta[property="og:image"]' : `meta[name="${property}"]`,
      context: match[0],
    })
  }

  while ((match = linkTagPattern.exec(html)) !== null) {
    const attrs = getOfficialHtmlTagAttributes(match[0])
    if (!isIconRel(attrs.rel)) continue

    const url = absolutizeUrl(attrs.href, sourcePageUrl)
    if (!url) continue

    const dimensions = getIconDimensions(attrs)
    seeds.push({
      url,
      sourcePageUrl,
      label: attrs.title || attrs.rel || 'Official site icon',
      sourceKind: 'favicon',
      width: dimensions.width,
      height: dimensions.height,
      selector: `link[rel="${attrs.rel ?? 'icon'}"]`,
      context: match[0],
    })
  }

  while ((match = imageTagPattern.exec(html)) !== null) {
    const tag = match[0]
    const attrs = getOfficialHtmlTagAttributes(match[0])
    const selector = getOfficialHtmlDisplaySelector('img', attrs)
    const src = absolutizeUrl(
      attrs.src || attrs['data-src'] || attrs['data-lazy-src'],
      sourcePageUrl,
    )

    if (src) {
      seeds.push({
        url: src,
        sourcePageUrl,
        label: attrs.alt || attrs.title || attrs['aria-label'] || 'Official site image',
        sourceKind: 'official-img',
        width: getNumericDimension(attrs.width),
        height: getNumericDimension(attrs.height),
        alt: attrs.alt,
        selector,
        context: tag,
      })
    }

    parseOfficialSrcsetEntries(
      attrs.srcset || attrs['data-srcset'],
      sourcePageUrl,
    ).forEach((entry, srcsetIndex) => {
      seeds.push({
        url: entry.url,
        sourcePageUrl,
        label: attrs.alt || attrs.title || attrs['aria-label'] || `Official srcset image ${srcsetIndex + 1}`,
        sourceKind: 'official-srcset',
        width: entry.width,
        alt: attrs.alt,
        selector: `${selector}[srcset]`,
        context: tag,
      })
    })
  }

  while ((match = sourceTagPattern.exec(html)) !== null) {
    const tag = match[0]
    const attrs = getOfficialHtmlTagAttributes(tag)
    const selector = getOfficialHtmlDisplaySelector('source', attrs)

    parseOfficialSrcsetEntries(
      attrs.srcset || attrs['data-srcset'],
      sourcePageUrl,
    ).forEach((entry, srcsetIndex) => {
      seeds.push({
        url: entry.url,
        sourcePageUrl,
        label: attrs.title || attrs['aria-label'] || `Official picture source ${srcsetIndex + 1}`,
        sourceKind: 'official-srcset',
        width: entry.width,
        selector: `${selector}[srcset]`,
        context: tag,
      })
    })
  }

  while ((match = styledTagPattern.exec(html)) !== null) {
    const tag = match[0]
    const tagName = match[1]
    const attrs = getOfficialHtmlTagAttributes(tag)
    if (!attrs.style || !attrs.style.toLowerCase().includes('url(')) continue

    const selector = getOfficialHtmlDisplaySelector(tagName, attrs)
    extractOfficialCssUrls(attrs.style, sourcePageUrl).forEach((url) => {
      seeds.push({
        url,
        sourcePageUrl,
        label: `${selector} background image`,
        sourceKind: 'official-css-background',
        alt: attrs.alt,
        selector,
        context: tag,
      })
    })
  }

  return seeds
}
