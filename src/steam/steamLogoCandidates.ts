import { invoke } from '@tauri-apps/api/core'
import type { LogoAssetKey } from '../project/projectLogoAssets'
import type { ProjectMetadata } from '../project/projectTypes'
import type { SteamImportedGame } from './steamApi'

export type RemoteLogoCandidate = {
  id: string
  url: string
  sourcePageUrl: string
  label: string
  sourceKind: 'steam-avatar' | 'steam-meta-image' | 'steam-img'
  fileType: 'svg' | 'png' | 'webp' | 'jpg' | 'gif' | 'unknown'
  transparencyHint: boolean
  score: number
  width?: number
  height?: number
  alt?: string
  selector?: string
  reasons: string[]
}

type CandidateSeed = {
  url: string
  sourcePageUrl: string
  label: string
  sourceKind: RemoteLogoCandidate['sourceKind']
  width?: number
  height?: number
  alt?: string
  selector?: string
  context: string
}

export type SteamLogoCandidateDiscoveryInput = {
  logoKey: LogoAssetKey
  selectedSteamGame: SteamImportedGame | null
  projectMetadata: ProjectMetadata
}

const MAX_SOURCE_PAGES = 8
const POSITIVE_TERMS = ['logo', 'brand', 'wordmark', 'avatar', 'developer', 'publisher', 'curator', 'creator']
const SOCIAL_TERMS = ['facebook', 'twitter', 'instagram', 'youtube', 'linkedin', 'discord', 'twitch', 'tiktok']
const GENERIC_NEGATIVE_TERMS = ['favicon', 'sprite', 'pixel', 'tracking', 'analytics', 'apple', 'google-play', 'appstore']
const STEAM_PAGE_HOST_PATTERNS = ['steampowered.com', 'steamcommunity.com']
const STEAM_IMAGE_HOST_PATTERNS = ['steamstatic.com', 'steampowered.com']

function fetchSteamPageHtml(url: string) {
  return invoke<string>('fetch_steam_page_html', { url })
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function getTagAttributes(tag: string) {
  const attributes: Record<string, string> = {}
  const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(tag)) !== null) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[3] ?? match[4] ?? match[5] ?? '')
  }

  return attributes
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

function compactForMatch(value: string) {
  return normalizeForMatch(value).replace(/\s+/g, '')
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function getEntityNames(input: SteamLogoCandidateDiscoveryInput) {
  const steamNames = input.logoKey === 'developer'
    ? input.selectedSteamGame?.developer ?? []
    : input.selectedSteamGame?.publisher ?? []
  const metadataName = input.logoKey === 'developer'
    ? input.projectMetadata.developer
    : input.projectMetadata.publisher

  return uniqueStrings([
    ...steamNames,
    ...metadataName.split(/[,;/|]+/),
  ])
}

function getStoreUrl(input: SteamLogoCandidateDiscoveryInput) {
  if (input.selectedSteamGame?.storeUrl) {
    return input.selectedSteamGame.storeUrl
  }

  const appId = input.projectMetadata.steamAppId.trim()
  return /^\d+$/.test(appId) ? `https://store.steampowered.com/app/${appId}` : null
}

function isAllowedHost(url: string, hostPatterns: string[]) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return hostPatterns.some((pattern) => host === pattern || host.endsWith(`.${pattern}`))
  } catch {
    return false
  }
}

function absolutizeUrl(rawUrl: string | undefined, sourcePageUrl: string) {
  if (!rawUrl) return null

  const trimmedUrl = rawUrl.trim()
  if (!trimmedUrl || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('javascript:')) return null

  try {
    return new URL(trimmedUrl, sourcePageUrl).href
  } catch {
    return null
  }
}

function canonicalizeUrl(url: string) {
  const parsed = new URL(url)
  parsed.hash = ''
  return parsed.href
}

function getFileType(url: string): RemoteLogoCandidate['fileType'] {
  const extension = new URL(url).pathname.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'svg':
      return 'svg'
    case 'png':
      return 'png'
    case 'webp':
      return 'webp'
    case 'jpg':
    case 'jpeg':
      return 'jpg'
    case 'gif':
      return 'gif'
    default:
      return 'unknown'
  }
}

function getNumericDimension(value: string | undefined) {
  if (!value) return undefined

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function includesAny(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term))
}

function hasEntityMatch(haystack: string, entityNames: string[]) {
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

function scoreCandidate(
  seed: CandidateSeed,
  fileType: RemoteLogoCandidate['fileType'],
  entityNames: string[],
) {
  let score = 0
  const reasons: string[] = []
  const haystack = normalizeForMatch([
    seed.url,
    seed.sourcePageUrl,
    seed.label,
    seed.alt,
    seed.selector,
    seed.context,
  ].filter(Boolean).join(' '))

  if (seed.sourceKind === 'steam-avatar') {
    score += 80
    reasons.push('Steam curator avatar')
  } else if (seed.sourceKind === 'steam-meta-image') {
    score += 30
    reasons.push('Steam page metadata image')
  } else {
    score += 20
    reasons.push('Steam page image')
  }

  if (fileType === 'svg') {
    score += 24
    reasons.push('SVG')
  } else if (fileType === 'png') {
    score += 18
    reasons.push('PNG')
  } else if (fileType === 'webp') {
    score += 8
    reasons.push('WebP')
  } else if (fileType === 'jpg') {
    score += 4
    reasons.push('JPG')
  } else if (fileType === 'gif') {
    score -= 6
  }

  if (fileType === 'svg' || fileType === 'png' || fileType === 'webp') {
    score += 8
    reasons.push('Transparency-friendly file type')
  }

  if (hasEntityMatch(haystack, entityNames)) {
    score += 20
    reasons.push('Matches company name')
  }

  if (includesAny(haystack, ['logo', 'wordmark'])) {
    score += 28
    reasons.push('Logo-like filename or metadata')
  } else if (includesAny(haystack, ['brand'])) {
    score += 18
    reasons.push('Brand-like filename or metadata')
  }

  if (includesAny(haystack, ['avatar', 'curator'])) {
    score += 14
    reasons.push('Avatar or curator image')
  }

  if (includesAny(haystack, ['developer', 'publisher', 'creator'])) {
    score += 10
    reasons.push('Creator page context')
  }

  if (seed.width && seed.height) {
    const shortestSide = Math.min(seed.width, seed.height)
    const aspectRatio = seed.width / seed.height

    if (shortestSide <= 32) {
      score -= 40
      reasons.push('Very small image')
    } else if (shortestSide <= 64) {
      score -= 15
      reasons.push('Small image')
    }

    if (seed.sourceKind === 'steam-avatar' && aspectRatio > 0.8 && aspectRatio < 1.25) {
      score += 8
      reasons.push('Avatar-like dimensions')
    } else if (aspectRatio >= 1.2 && aspectRatio <= 6) {
      score += 8
      reasons.push('Logo-like aspect ratio')
    }
  }

  if (includesAny(haystack, SOCIAL_TERMS)) {
    score -= 40
    reasons.push('Social icon signal')
  }

  if (includesAny(haystack, GENERIC_NEGATIVE_TERMS)) {
    score -= 28
    reasons.push('Generic icon or tracking signal')
  }

  if (
    includesAny(haystack, ['capsule', 'header', 'hero', 'screenshot']) &&
    !includesAny(haystack, ['logo', 'avatar', 'curator'])
  ) {
    score -= 18
    reasons.push('Likely store art instead of company logo')
  }

  return { score, reasons }
}

function createCandidate(
  seed: CandidateSeed,
  entityNames: string[],
  index: number,
): RemoteLogoCandidate | null {
  if (!isAllowedHost(seed.url, STEAM_IMAGE_HOST_PATTERNS)) return null

  const url = canonicalizeUrl(seed.url)
  const fileType = getFileType(url)
  const { score, reasons } = scoreCandidate({ ...seed, url }, fileType, entityNames)

  return {
    id: `${seed.sourceKind}-${index}-${url}`,
    url,
    sourcePageUrl: seed.sourcePageUrl,
    label: seed.label,
    sourceKind: seed.sourceKind,
    fileType,
    transparencyHint: fileType === 'svg' || fileType === 'png' || fileType === 'webp',
    score,
    width: seed.width,
    height: seed.height,
    alt: seed.alt,
    selector: seed.selector,
    reasons,
  }
}

function mergeCandidateReasons(existing: RemoteLogoCandidate, candidate: RemoteLogoCandidate) {
  return {
    ...existing,
    score: Math.max(existing.score, candidate.score),
    reasons: uniqueStrings([...existing.reasons, ...candidate.reasons]),
  }
}

function dedupeCandidates(candidates: RemoteLogoCandidate[]) {
  const byUrl = new Map<string, RemoteLogoCandidate>()

  for (const candidate of candidates) {
    const existing = byUrl.get(candidate.url)
    byUrl.set(candidate.url, existing ? mergeCandidateReasons(existing, candidate) : candidate)
  }

  return [...byUrl.values()].sort((left, right) =>
    right.score - left.score || left.label.localeCompare(right.label),
  )
}

function isObviousSteamImage(attrs: Record<string, string>, absoluteUrl: string) {
  const haystack = normalizeForMatch([
    absoluteUrl,
    attrs.class,
    attrs.alt,
    attrs.title,
    attrs.id,
  ].filter(Boolean).join(' '))

  return includesAny(haystack, POSITIVE_TERMS)
}

export function parseSteamLogoCandidatesFromHtml(
  html: string,
  sourcePageUrl: string,
  entityNames: string[] = [],
) {
  const candidates: RemoteLogoCandidate[] = []
  const seeds: CandidateSeed[] = []
  const linkTagPattern = /<link\b[^>]*>/gi
  const metaTagPattern = /<meta\b[^>]*>/gi
  const imageTagPattern = /<img\b[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = linkTagPattern.exec(html)) !== null) {
    const attrs = getTagAttributes(match[0])
    if (!/\bimage_src\b/i.test(attrs.rel ?? '')) continue

    const url = absolutizeUrl(attrs.href, sourcePageUrl)
    if (!url) continue

    seeds.push({
      url,
      sourcePageUrl,
      label: attrs.title || 'Steam metadata image',
      sourceKind: 'steam-meta-image',
      selector: 'link[rel="image_src"]',
      context: match[0],
    })
  }

  while ((match = metaTagPattern.exec(html)) !== null) {
    const attrs = getTagAttributes(match[0])
    const property = (attrs.property ?? attrs.name ?? '').toLowerCase()
    if (property !== 'og:image' && property !== 'twitter:image') continue

    const url = absolutizeUrl(attrs.content, sourcePageUrl)
    if (!url) continue

    seeds.push({
      url,
      sourcePageUrl,
      label: property === 'og:image' ? 'Steam Open Graph image' : 'Steam Twitter image',
      sourceKind: 'steam-meta-image',
      selector: property === 'og:image' ? 'meta[property="og:image"]' : 'meta[name="twitter:image"]',
      context: match[0],
    })
  }

  while ((match = imageTagPattern.exec(html)) !== null) {
    const attrs = getTagAttributes(match[0])
    const url = absolutizeUrl(attrs.src || attrs['data-src'], sourcePageUrl)
    if (!url || !isAllowedHost(url, STEAM_IMAGE_HOST_PATTERNS)) continue

    const className = attrs.class ?? ''
    const isCuratorAvatar = /\bcurator_avatar\b/.test(className)
    if (!isCuratorAvatar && !isObviousSteamImage(attrs, url)) continue

    seeds.push({
      url,
      sourcePageUrl,
      label: attrs.alt || attrs.title || (isCuratorAvatar ? 'Steam curator avatar' : 'Steam page image'),
      sourceKind: isCuratorAvatar ? 'steam-avatar' : 'steam-img',
      width: getNumericDimension(attrs.width),
      height: getNumericDimension(attrs.height),
      alt: attrs.alt,
      selector: isCuratorAvatar ? 'img.curator_avatar' : 'img',
      context: match[0],
    })
  }

  seeds.forEach((seed, index) => {
    const candidate = createCandidate(seed, entityNames, index)
    if (candidate) candidates.push(candidate)
  })

  return dedupeCandidates(candidates)
}

function isSteamPageUrl(url: string) {
  return isAllowedHost(url, STEAM_PAGE_HOST_PATTERNS)
}

function isCreatorPathForLogoKey(pathname: string, logoKey: LogoAssetKey) {
  const normalizedPath = pathname.toLowerCase()

  if (logoKey === 'developer' && normalizedPath.includes('/developer/')) return true
  if (logoKey === 'publisher' && normalizedPath.includes('/publisher/')) return true

  return normalizedPath.includes('/curator/')
}

function getCompanySlug(name: string) {
  return compactForMatch(name)
}

function getFallbackCompanyPageUrls(entityNames: string[], logoKey: LogoAssetKey) {
  const pageKind = logoKey === 'developer' ? 'developer' : 'publisher'

  return entityNames
    .map(getCompanySlug)
    .filter(Boolean)
    .flatMap((slug) => [
      `https://store.steampowered.com/${pageKind}/${slug}`,
      `https://store.steampowered.com/curator/${slug}`,
    ])
}

export function extractSteamCreatorPageUrls(
  html: string,
  sourcePageUrl: string,
  entityNames: string[],
  logoKey: LogoAssetKey,
) {
  const urls: string[] = []
  const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = anchorPattern.exec(html)) !== null) {
    const anchor = match[0]
    const attrs = getTagAttributes(anchor)
    const url = absolutizeUrl(attrs.href, sourcePageUrl)
    if (!url || !isSteamPageUrl(url)) continue

    const parsedUrl = new URL(url)
    if (!isCreatorPathForLogoKey(parsedUrl.pathname, logoKey)) continue

    const anchorText = stripTags(anchor)
    const haystack = [url, anchorText, attrs.title].filter(Boolean).join(' ')
    if (entityNames.length > 0 && !hasEntityMatch(haystack, entityNames)) continue

    urls.push(canonicalizeUrl(url))
  }

  return uniqueStrings(urls)
}

export async function discoverSteamLogoCandidates(input: SteamLogoCandidateDiscoveryInput) {
  const entityNames = getEntityNames(input)
  const storeUrl = getStoreUrl(input)

  if (!storeUrl) {
    throw new Error('Import a Steam game or enter a Steam App ID before finding logo candidates.')
  }

  const sourcePageUrls = [storeUrl]
  const storeHtml = await fetchSteamPageHtml(storeUrl)
  const discoveredPageUrls = extractSteamCreatorPageUrls(
    storeHtml,
    storeUrl,
    entityNames,
    input.logoKey,
  )

  sourcePageUrls.push(
    ...discoveredPageUrls,
    ...getFallbackCompanyPageUrls(entityNames, input.logoKey),
  )

  const uniqueSourcePageUrls = uniqueStrings(sourcePageUrls).slice(0, MAX_SOURCE_PAGES)
  const pages = await Promise.allSettled(
    uniqueSourcePageUrls.map(async (url) => ({
      url,
      html: url === storeUrl ? storeHtml : await fetchSteamPageHtml(url),
    })),
  )

  const candidates = pages.flatMap((page) => {
    if (page.status !== 'fulfilled') return []

    return parseSteamLogoCandidatesFromHtml(page.value.html, page.value.url, entityNames)
  })

  return dedupeCandidates(candidates)
}
