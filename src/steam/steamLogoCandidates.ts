import { invoke } from '@tauri-apps/api/core'
import type { LogoAssetKey } from '../project/projectLogoAssets'
import type { ProjectMetadata } from '../project/projectTypes'
import { bytesToBase64 } from '../utils/bytesToBase64.ts'
import type { SteamImportedGame } from './steamApi'

export type RemoteImageCandidateWorkflow = 'branding-logo' | 'artwork'
export type RemoteImageCandidateKind = 'logo' | 'artwork'

export type RemoteLogoCandidate = {
  id: string
  url: string
  previewUrl?: string
  sourcePageUrl: string
  label: string
  sourceKind:
    | 'steam-avatar'
    | 'steam-meta-image'
    | 'steam-img'
    | 'official-img'
    | 'official-srcset'
    | 'official-css-background'
    | 'official-meta-image'
    | 'favicon'
  fileType: 'svg' | 'png' | 'webp' | 'jpg' | 'gif' | 'unknown'
  transparencyHint: boolean
  score: number
  width?: number
  height?: number
  alt?: string
  selector?: string
  targetWorkflow: RemoteImageCandidateWorkflow
  contentKind: RemoteImageCandidateKind
  routingReasons: string[]
  reasons: string[]
}

export type LogoCandidateSourceStatus = {
  source: 'steam' | 'official-site'
  label: string
  status: 'searched' | 'unavailable' | 'error'
  candidateCount?: number
  detail?: string
}

export type LogoCandidateDiscoveryResult = {
  candidates: RemoteLogoCandidate[]
  artworkCandidates: RemoteLogoCandidate[]
  sourceStatuses: LogoCandidateSourceStatus[]
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

type FetchedOfficialTextDocument = {
  final_url: string
  contents: string
}

type DownloadedArtwork = {
  content_type: string
  bytes: number[]
}

const MAX_SOURCE_PAGES = 8
const MAX_OFFICIAL_SITE_URLS = 4
const MAX_OFFICIAL_CSS_FILES = 6
const MAX_RETURNED_CANDIDATES = 80
const POSITIVE_TERMS = ['logo', 'brand', 'wordmark', 'avatar', 'developer', 'publisher', 'curator', 'creator']
const LOGO_TERMS = ['logo', 'wordmark', 'brandmark', 'logotype']
const HEADER_LOGO_TERMS = ['nav logo', 'navbar logo', 'site logo', 'brand logo', 'logo video', 'nav brand']
const ARTWORK_TERMS = [
  'background',
  'hero',
  'key art',
  'keyart',
  'screenshot',
  'capsule',
  'header',
  'header image',
  'store header',
  'library',
  'poster',
  'cover',
  'wallpaper',
  'gallery',
  'carousel',
  'promo',
  'social share',
]
const SOCIAL_TERMS = [
  'facebook',
  'twitter',
  'x twitter',
  'x icon',
  'instagram',
  'youtube',
  'linkedin',
  'discord',
  'twitch',
  'tiktok',
]
const HARD_REJECT_TERMS = [
  'tracking pixel',
  'analytics pixel',
  'tracking gif',
  'analytics gif',
  'beacon',
  'spacer gif',
  '1x1',
  'sprite',
]
const GENERIC_NEGATIVE_TERMS = [
  'favicon',
  'tracking',
  'analytics',
  'apple',
  'google play',
  'appstore',
  'app store',
  'play store',
  'store button',
  'store badge',
  'badge',
]
const STEAM_PLATFORM_BRANDING_TERMS = [
  'steam logo',
  'steam wordmark',
  'steam icon',
  'steam homepage',
  'steam home page',
  'steam store homepage',
  'steam store home',
  'steam platform',
  'steampowered logo',
  'steam powered',
  'powered by steam',
  'steamworks',
  'steam deck',
]
const VALVE_BRANDING_TERMS = [
  'valve logo',
  'valve wordmark',
  'valve avatar',
  'valve corporation',
  'valve corp',
]
const OFFICIAL_LINK_CONTEXT_TERMS = ['official', 'website', 'homepage', 'home page', 'visit website', 'external link']
const NON_IMAGE_EXTENSIONS = ['css', 'js', 'json', 'map', 'txt', 'pdf', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'mp4', 'webm', 'mov']
const STEAM_PAGE_HOST_PATTERNS = ['steampowered.com', 'steamcommunity.com']
const STEAM_IMAGE_HOST_PATTERNS = ['steamstatic.com', 'steampowered.com']
const EXTREMELY_SMALL_MAX_DIMENSION = 64
const SMALL_SHORTEST_SIDE = 96

function fetchSteamPageHtml(url: string) {
  return invoke<string>('fetch_steam_page_html', { url })
}

function fetchOfficialSiteHtml(url: string) {
  return invoke<FetchedOfficialTextDocument>('fetch_official_logo_discovery_html', { url })
}

function fetchOfficialSiteCssFiles(urls: string[]) {
  return invoke<FetchedOfficialTextDocument[]>('fetch_official_logo_discovery_css_files', { urls })
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

function getHostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getPathExtension(url: string) {
  return new URL(url).pathname.split('.').pop()?.toLowerCase() ?? ''
}

function getFileType(url: string): RemoteLogoCandidate['fileType'] {
  const extension = getPathExtension(url)

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

function isSteamSourceKind(sourceKind: RemoteLogoCandidate['sourceKind']) {
  return sourceKind.startsWith('steam-')
}

function isOfficialSourceKind(sourceKind: RemoteLogoCandidate['sourceKind']) {
  return !isSteamSourceKind(sourceKind)
}

function isHttpsUrl(url: string) {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

function isLikelyNonImageUrl(url: string) {
  const extension = getPathExtension(url)
  return NON_IMAGE_EXTENSIONS.includes(extension)
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

function getUrlSignalText(url: string) {
  try {
    const parsedUrl = new URL(url)
    return decodeURIComponent(`${parsedUrl.pathname} ${parsedUrl.search}`)
  } catch {
    return url
  }
}

function getCandidateSignalText(seed: CandidateSeed, url = seed.url) {
  return normalizeForMatch([
    getUrlSignalText(url),
    seed.label,
    seed.alt,
    seed.selector,
    seed.context,
  ].filter(Boolean).join(' '))
}

function getSocialSignalText(seed: CandidateSeed, url = seed.url) {
  const isMetadataImage = seed.sourceKind === 'steam-meta-image' || seed.sourceKind === 'official-meta-image'

  return normalizeForMatch([
    getUrlSignalText(url),
    seed.alt,
    seed.selector && !seed.selector.includes('twitter:image') ? seed.selector : '',
    isMetadataImage ? '' : seed.label,
    isMetadataImage ? '' : seed.context,
  ].filter(Boolean).join(' '))
}

function hasValveEntity(entityNames: string[]) {
  return entityNames.some((name) => {
    const compactName = compactForMatch(name)
    return compactName === 'valve' || compactName === 'valvecorporation' || compactName === 'valvesoftware'
  })
}

function getCandidateRouting(
  seed: CandidateSeed,
  fileType: RemoteLogoCandidate['fileType'],
  haystack: string,
  candidateSignalText: string,
) {
  const routingReasons: string[] = []
  const hasLogoTerm = includesAny(haystack, LOGO_TERMS)
  const hasHeaderLogoTerm = includesAny(haystack, HEADER_LOGO_TERMS)
  const hasCreatorLogoSignal = seed.sourceKind === 'steam-avatar' || includesAny(haystack, ['avatar', 'curator'])
  const hasArtworkSignal = includesAny(haystack, ARTWORK_TERMS)
    || seed.sourceKind === 'official-meta-image' && !hasLogoTerm
    || fileType === 'jpg' && !hasLogoTerm
  const isLogoLike = hasLogoTerm || hasHeaderLogoTerm || hasCreatorLogoSignal
  const isArtworkLike = hasArtworkSignal && !isLogoLike

  if (isArtworkLike) {
    routingReasons.push('Artwork-like image routed to Artwork')
    return {
      targetWorkflow: 'artwork' as const,
      contentKind: 'artwork' as const,
      routingReasons,
    }
  }

  if (!isLogoLike && isOfficialSourceKind(seed.sourceKind)) {
    routingReasons.push('Official-site image lacks logo signals and is routed to Artwork')
    return {
      targetWorkflow: 'artwork' as const,
      contentKind: 'artwork' as const,
      routingReasons,
    }
  }

  if (!isLogoLike && isSteamSourceKind(seed.sourceKind) && includesAny(candidateSignalText, ARTWORK_TERMS)) {
    routingReasons.push('Steam artwork image routed to Artwork')
    return {
      targetWorkflow: 'artwork' as const,
      contentKind: 'artwork' as const,
      routingReasons,
    }
  }

  routingReasons.push('Logo-like image routed to Branding')
  return {
    targetWorkflow: 'branding-logo' as const,
    contentKind: 'logo' as const,
    routingReasons,
  }
}

function scoreCandidate(
  seed: CandidateSeed,
  fileType: RemoteLogoCandidate['fileType'],
  entityNames: string[],
) {
  let score = 0
  let reject = false
  const reasons: string[] = []
  const haystack = normalizeForMatch([
    seed.url,
    seed.sourcePageUrl,
    seed.label,
    seed.alt,
    seed.selector,
    seed.context,
  ].filter(Boolean).join(' '))
  const candidateSignalText = getCandidateSignalText(seed)
  const socialSignalText = getSocialSignalText(seed)

  if (seed.sourceKind === 'steam-avatar') {
    score += 60
    reasons.push('Steam curator avatar')
  } else if (seed.sourceKind === 'steam-meta-image') {
    score += 30
    reasons.push('Steam page metadata image')
  } else if (seed.sourceKind === 'steam-img') {
    score += 20
    reasons.push('Steam page image')
  } else if (seed.sourceKind === 'official-img') {
    score += 42
    reasons.push('Official site image')
  } else if (seed.sourceKind === 'official-srcset') {
    score += 38
    reasons.push('Official site srcset image')
  } else if (seed.sourceKind === 'official-css-background') {
    score += 42
    reasons.push('Official site CSS image')
  } else if (seed.sourceKind === 'official-meta-image') {
    score += 24
    reasons.push('Official site metadata image')
  } else if (seed.sourceKind === 'favicon') {
    score += 4
    reasons.push('Official site icon')
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

  if (includesAny(haystack, ['header', 'nav', 'navbar', 'masthead', 'site logo', 'brand logo', 'logo video'])) {
    score += 18
    reasons.push('Header, nav, or logo selector')
  }

  if (seed.width && seed.height) {
    const shortestSide = Math.min(seed.width, seed.height)
    const aspectRatio = seed.width / seed.height

    if (seed.width <= EXTREMELY_SMALL_MAX_DIMENSION && seed.height <= EXTREMELY_SMALL_MAX_DIMENSION) {
      score -= 120
      reject = true
      reasons.push('Extremely small image')
    } else if (shortestSide <= SMALL_SHORTEST_SIDE) {
      score -= 22
      reasons.push('Small image')
    }

    if (seed.sourceKind === 'steam-avatar' && aspectRatio > 0.8 && aspectRatio < 1.25) {
      score += 8
      reasons.push('Avatar-like dimensions')
    } else if (aspectRatio >= 1.2 && aspectRatio <= 6) {
      score += 8
      reasons.push('Logo-like aspect ratio')
    }
  } else {
    score -= 6
    reasons.push('Unknown dimensions')
  }

  if (includesAny(socialSignalText, SOCIAL_TERMS)) {
    score -= 90
    reject = true
    reasons.push('Social icon signal')
  }

  if (includesAny(candidateSignalText, HARD_REJECT_TERMS)) {
    score -= 120
    reject = true
    reasons.push('Tracking, sprite, or analytics image')
  }

  if (includesAny(candidateSignalText, GENERIC_NEGATIVE_TERMS)) {
    score -= 28
    reasons.push('Generic icon or tracking signal')
  }

  if (seed.sourceKind === 'favicon') {
    score -= 22
    reasons.push('Favicon fallback')
  }

  if (
    includesAny(haystack, ['capsule', 'header', 'hero', 'screenshot']) &&
    !includesAny(haystack, ['logo', 'avatar', 'curator'])
  ) {
    score -= 18
    reasons.push('Likely store art instead of company logo')
  }

  if (includesAny(candidateSignalText, STEAM_PLATFORM_BRANDING_TERMS)) {
    score -= 120
    reject = true
    reasons.push('Generic Steam platform branding')
  }

  if (includesAny(candidateSignalText, VALVE_BRANDING_TERMS) && !hasValveEntity(entityNames)) {
    score -= 120
    reject = true
    reasons.push('Valve branding does not match selected developer or publisher')
  }

  const routing = getCandidateRouting(seed, fileType, haystack, candidateSignalText)

  if (routing.targetWorkflow === 'artwork') {
    score -= 12
  }

  return { score, reasons, reject, ...routing }
}

function createCandidate(
  seed: CandidateSeed,
  entityNames: string[],
  index: number,
): RemoteLogoCandidate | null {
  if (isSteamSourceKind(seed.sourceKind) && !isAllowedHost(seed.url, STEAM_IMAGE_HOST_PATTERNS)) return null
  if (isOfficialSourceKind(seed.sourceKind) && (!isHttpsUrl(seed.url) || isLikelyNonImageUrl(seed.url))) return null

  const url = canonicalizeUrl(seed.url)
  const fileType = getFileType(url)
  const {
    score,
    reasons,
    reject,
    targetWorkflow,
    contentKind,
    routingReasons,
  } = scoreCandidate({ ...seed, url }, fileType, entityNames)

  if (reject) return null

  return {
    id: `${seed.sourceKind}-${index}-${url}`,
    url,
    previewUrl: url,
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
    targetWorkflow,
    contentKind,
    routingReasons,
    reasons: uniqueStrings([...reasons, ...routingReasons]),
  }
}

function mergeCandidateReasons(existing: RemoteLogoCandidate, candidate: RemoteLogoCandidate): RemoteLogoCandidate {
  const targetWorkflow: RemoteImageCandidateWorkflow = existing.targetWorkflow === 'branding-logo' || candidate.targetWorkflow === 'branding-logo'
    ? 'branding-logo'
    : 'artwork'
  const contentKind: RemoteImageCandidateKind = targetWorkflow === 'branding-logo' ? 'logo' : 'artwork'

  return {
    ...existing,
    targetWorkflow,
    contentKind,
    score: Math.max(existing.score, candidate.score),
    routingReasons: uniqueStrings([...existing.routingReasons, ...candidate.routingReasons]),
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

function getLogoRoutedCandidates(candidates: RemoteLogoCandidate[]) {
  return dedupeCandidates(candidates.filter((candidate) => candidate.targetWorkflow === 'branding-logo'))
}

function getArtworkRoutedCandidates(candidates: RemoteLogoCandidate[]) {
  return dedupeCandidates(candidates.filter((candidate) => candidate.targetWorkflow === 'artwork'))
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

function getCssDisplayIdentifier(value: string) {
  return value
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 60) ?? ''
}

function getDisplaySelector(tagName: string, attrs: Record<string, string>) {
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

function parseSrcsetEntries(srcset: string | undefined, sourcePageUrl: string) {
  if (!srcset) return []

  const entries: Array<{ url: string; width?: number }> = []

  srcset.split(',').forEach((entry) => {
    const [rawUrl, descriptor] = entry.trim().split(/\s+/, 2)
    const url = absolutizeUrl(rawUrl, sourcePageUrl)
    if (!url) return

    const width = descriptor?.endsWith('w') ? getNumericDimension(descriptor) : undefined
    entries.push(width ? { url, width } : { url })
  })

  return entries
}

function extractCssUrls(value: string | undefined, sourcePageUrl: string) {
  if (!value) return []

  const urls: string[] = []
  const urlPattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi
  let match: RegExpExecArray | null

  while ((match = urlPattern.exec(value)) !== null) {
    const url = absolutizeUrl(match[2], sourcePageUrl)
    if (url) urls.push(url)
  }

  return uniqueStrings(urls)
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
  return /\bicon\b/.test(normalizedRel) || normalizedRel.includes('mask icon') || normalizedRel.includes('apple touch icon')
}

function isStylesheetLink(attrs: Record<string, string>) {
  const rel = normalizeForMatch(attrs.rel ?? '')
  const href = attrs.href ?? ''

  return rel.includes('stylesheet') || attrs.type === 'text/css' || /\.css(?:[?#]|$)/i.test(href)
}

export function extractOfficialStylesheetUrlsFromHtml(html: string, sourcePageUrl: string) {
  const urls: string[] = []
  const linkTagPattern = /<link\b[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = linkTagPattern.exec(html)) !== null) {
    const attrs = getTagAttributes(match[0])
    if (!isStylesheetLink(attrs)) continue

    const url = absolutizeUrl(attrs.href, sourcePageUrl)
    if (url && isHttpsUrl(url)) urls.push(canonicalizeUrl(url))
  }

  return uniqueStrings(urls)
}

export function parseOfficialLogoCandidatesFromHtml(
  html: string,
  sourcePageUrl: string,
  entityNames: string[] = [],
) {
  const candidates: RemoteLogoCandidate[] = []
  const seeds: CandidateSeed[] = []
  const linkTagPattern = /<link\b[^>]*>/gi
  const metaTagPattern = /<meta\b[^>]*>/gi
  const imageTagPattern = /<img\b[^>]*>/gi
  const sourceTagPattern = /<source\b[^>]*>/gi
  const styledTagPattern = /<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = metaTagPattern.exec(html)) !== null) {
    const attrs = getTagAttributes(match[0])
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
    const attrs = getTagAttributes(match[0])
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
    const attrs = getTagAttributes(match[0])
    const selector = getDisplaySelector('img', attrs)
    const src = absolutizeUrl(attrs.src || attrs['data-src'] || attrs['data-lazy-src'], sourcePageUrl)

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

    parseSrcsetEntries(attrs.srcset || attrs['data-srcset'], sourcePageUrl).forEach((entry, srcsetIndex) => {
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
    const attrs = getTagAttributes(tag)
    const selector = getDisplaySelector('source', attrs)

    parseSrcsetEntries(attrs.srcset || attrs['data-srcset'], sourcePageUrl).forEach((entry, srcsetIndex) => {
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
    const attrs = getTagAttributes(tag)
    if (!attrs.style || !attrs.style.toLowerCase().includes('url(')) continue

    const selector = getDisplaySelector(tagName, attrs)
    extractCssUrls(attrs.style, sourcePageUrl).forEach((url) => {
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

  seeds.forEach((seed, index) => {
    const candidate = createCandidate(seed, entityNames, index)
    if (candidate) candidates.push(candidate)
  })

  return dedupeCandidates(candidates)
}

export function parseOfficialLogoCandidatesFromCss(
  css: string,
  sourcePageUrl: string,
  entityNames: string[] = [],
) {
  const candidates: RemoteLogoCandidate[] = []
  const seeds: CandidateSeed[] = []
  const rulePattern = /([^{}]+)\{([^{}]*url\([^{}]+)\}/gi
  let match: RegExpExecArray | null

  while ((match = rulePattern.exec(css)) !== null) {
    const selector = match[1].replace(/\s+/g, ' ').trim().slice(0, 180)
    const declarationBlock = match[2]

    extractCssUrls(declarationBlock, sourcePageUrl).forEach((url) => {
      seeds.push({
        url,
        sourcePageUrl,
        label: selector ? `${selector} CSS image` : 'Official stylesheet image',
        sourceKind: 'official-css-background',
        selector: selector || 'stylesheet',
        context: `${selector} { ${declarationBlock} }`,
      })
    })
  }

  if (seeds.length === 0) {
    extractCssUrls(css, sourcePageUrl).forEach((url) => {
      seeds.push({
        url,
        sourcePageUrl,
        label: 'Official stylesheet image',
        sourceKind: 'official-css-background',
        selector: 'stylesheet',
        context: css.slice(0, 240),
      })
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

function getSteamLinkfilterTarget(url: string) {
  try {
    const parsedUrl = new URL(url)
    if (!isSteamPageUrl(parsedUrl.href) || !parsedUrl.pathname.toLowerCase().includes('linkfilter')) {
      return null
    }

    return parsedUrl.searchParams.get('url')
      ?? parsedUrl.searchParams.get('u')
      ?? parsedUrl.searchParams.get('target')
  } catch {
    return null
  }
}

function isLikelySocialUrl(url: string) {
  try {
    const rawHost = new URL(url).hostname.toLowerCase()
    if (rawHost === 'x.com' || rawHost.endsWith('.x.com')) return true

    const host = normalizeForMatch(rawHost)
    return includesAny(host, SOCIAL_TERMS)
  } catch {
    return false
  }
}

export function extractOfficialSiteUrlsFromSteamHtml(html: string, sourcePageUrl: string) {
  const urls: string[] = []
  const anchorPattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = anchorPattern.exec(html)) !== null) {
    const anchor = match[0]
    const attrs = getTagAttributes(anchor)
    const href = absolutizeUrl(attrs.href, sourcePageUrl)
    if (!href) continue

    const linkfilterTarget = getSteamLinkfilterTarget(href)
    const candidateUrl = linkfilterTarget ? absolutizeUrl(linkfilterTarget, sourcePageUrl) : href
    if (!candidateUrl || !isHttpsUrl(candidateUrl) || isSteamPageUrl(candidateUrl) || isLikelySocialUrl(candidateUrl)) {
      continue
    }

    const anchorText = stripTags(anchor)
    const context = normalizeForMatch([href, anchorText, attrs.title, attrs.class, attrs.id].filter(Boolean).join(' '))
    if (!linkfilterTarget && !includesAny(context, OFFICIAL_LINK_CONTEXT_TERMS)) continue

    urls.push(canonicalizeUrl(candidateUrl))
  }

  return uniqueStrings(urls).slice(0, MAX_OFFICIAL_SITE_URLS)
}

async function discoverSteamLogoCandidateSources(input: SteamLogoCandidateDiscoveryInput) {
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

  const fulfilledPages = pages.flatMap((page) => page.status === 'fulfilled' ? [page.value] : [])
  const candidates = fulfilledPages.flatMap((page) =>
    parseSteamLogoCandidatesFromHtml(page.html, page.url, entityNames),
  )
  const officialSiteUrls = uniqueStrings(
    fulfilledPages.flatMap((page) => extractOfficialSiteUrlsFromSteamHtml(page.html, page.url)),
  ).slice(0, MAX_OFFICIAL_SITE_URLS)

  return {
    entityNames,
    candidates: getLogoRoutedCandidates(candidates),
    artworkCandidates: getArtworkRoutedCandidates(candidates),
    officialSiteUrls,
  }
}

async function discoverOfficialLogoCandidates(officialSiteUrls: string[], entityNames: string[]) {
  const candidates: RemoteLogoCandidate[] = []
  const artworkCandidates: RemoteLogoCandidate[] = []
  const sourceStatuses: LogoCandidateSourceStatus[] = []

  if (officialSiteUrls.length === 0) {
    return {
      candidates,
      artworkCandidates,
      sourceStatuses: [
        {
          source: 'official-site' as const,
          label: 'Official website',
          status: 'unavailable' as const,
          detail: 'No official website link was found on the Steam creator pages.',
        },
      ],
    }
  }

  for (const officialSiteUrl of officialSiteUrls.slice(0, MAX_OFFICIAL_SITE_URLS)) {
    const label = getHostLabel(officialSiteUrl)

    try {
      const document = await fetchOfficialSiteHtml(officialSiteUrl)
      const pageUrl = document.final_url || officialSiteUrl
      const pageCandidates = parseOfficialLogoCandidatesFromHtml(
        document.contents,
        pageUrl,
        entityNames,
      )
      const stylesheetUrls = extractOfficialStylesheetUrlsFromHtml(document.contents, pageUrl)
        .slice(0, MAX_OFFICIAL_CSS_FILES)
      const stylesheetDocuments = await fetchOfficialSiteCssFiles(stylesheetUrls)
      const cssCandidates = stylesheetDocuments.flatMap((stylesheetDocument) =>
        parseOfficialLogoCandidatesFromCss(
          stylesheetDocument.contents,
          stylesheetDocument.final_url,
          entityNames,
        ),
      )
      const siteCandidates = dedupeCandidates([...pageCandidates, ...cssCandidates])
      const siteLogoCandidates = getLogoRoutedCandidates(siteCandidates)
      const siteArtworkCandidates = getArtworkRoutedCandidates(siteCandidates)

      candidates.push(...siteLogoCandidates)
      artworkCandidates.push(...siteArtworkCandidates)
      sourceStatuses.push({
        source: 'official-site',
        label,
        status: 'searched',
        candidateCount: siteLogoCandidates.length,
        detail: stylesheetUrls.length > 0
          ? `Checked static HTML and ${stylesheetUrls.length} linked CSS file${stylesheetUrls.length === 1 ? '' : 's'}.`
          : 'Checked static HTML; no linked CSS files were available.',
      })
    } catch (error) {
      sourceStatuses.push({
        source: 'official-site',
        label,
        status: 'error',
        detail: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    candidates: dedupeCandidates(candidates),
    artworkCandidates: dedupeCandidates(artworkCandidates),
    sourceStatuses,
  }
}

export async function discoverSteamLogoCandidates(input: SteamLogoCandidateDiscoveryInput) {
  return (await discoverSteamLogoCandidateSources(input)).candidates
}

export async function discoverLogoCandidates(input: SteamLogoCandidateDiscoveryInput): Promise<LogoCandidateDiscoveryResult> {
  const steamSources = await discoverSteamLogoCandidateSources(input)
  const officialSources = await discoverOfficialLogoCandidates(
    steamSources.officialSiteUrls,
    steamSources.entityNames,
  )
  const candidates = dedupeCandidates([
    ...officialSources.candidates,
    ...steamSources.candidates,
  ]).slice(0, MAX_RETURNED_CANDIDATES)
  const artworkCandidates = dedupeCandidates([
    ...officialSources.artworkCandidates,
    ...steamSources.artworkCandidates,
  ]).slice(0, MAX_RETURNED_CANDIDATES)

  return {
    candidates,
    artworkCandidates,
    sourceStatuses: [
      {
        source: 'steam',
        label: 'Steam page fallback',
        status: 'searched',
        candidateCount: steamSources.candidates.length,
        detail: 'Checked Steam store and creator pages for logo candidates.',
      },
      ...officialSources.sourceStatuses,
    ],
  }
}

export async function downloadRemoteLogoCandidateAsDataUrl(candidate: RemoteLogoCandidate) {
  const command = isSteamSourceKind(candidate.sourceKind)
    ? 'download_steam_artwork'
    : 'download_official_logo_candidate_image'
  const downloadedArtwork = await invoke<DownloadedArtwork>(command, {
    url: candidate.url,
  })
  const base64 = bytesToBase64(downloadedArtwork.bytes)

  return `data:${downloadedArtwork.content_type};base64,${base64}`
}
