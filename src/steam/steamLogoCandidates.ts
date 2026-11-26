import { invoke } from '@tauri-apps/api/core'
import type { LogoAssetKey } from '../project/projectLogoAssets'
import type { ProjectMetadata } from '../project/projectTypes'
import { bytesToBase64 } from '../utils/bytesToBase64.ts'
import type { SteamImportedGame } from './steamApi'
import {
  absolutizeUrl,
  canonicalizeUrl,
  getFileType,
  getHostLabel,
  isAllowedHost,
  isHttpsUrl,
  isLikelyNonImageUrl,
} from './steamLogoCandidateUrls.ts'
import {
  parseOfficialCssImageSeeds,
} from './steamOfficialSiteCss.ts'
import {
  extractOfficialStylesheetUrlsFromHtml,
  parseOfficialHtmlImageSeeds,
} from './steamOfficialSiteHtml.ts'
import {
  isOfficialSourceKind,
  isSteamSourceKind,
  type RemoteImageCandidateKind,
  type RemoteImageCandidateWorkflow,
} from './steamLogoCandidateRouting.ts'
import {
  compactForMatch,
  getNumericDimension,
  getTagAttributes,
  hasEntityMatch,
  includesAny,
  normalizeForMatch,
  stripTags,
  uniqueStrings,
} from './steamLogoCandidateSignals.ts'
import {
  scoreLogoCandidate,
} from './steamLogoCandidateScoring.ts'
import type {
  RemoteLogoCandidate,
  RemoteLogoCandidateSeed,
} from './steamLogoCandidateTypes.ts'

export type {
  RemoteImageCandidateKind,
  RemoteImageCandidateWorkflow,
} from './steamLogoCandidateRouting.ts'
export {
  extractOfficialStylesheetUrlsFromHtml,
} from './steamOfficialSiteHtml.ts'
export type { RemoteLogoCandidate } from './steamLogoCandidateTypes.ts'

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
const SOCIAL_HOST_TERMS = ['facebook', 'twitter', 'x', 'instagram', 'youtube', 'linkedin', 'discord', 'twitch', 'tiktok']
const OFFICIAL_LINK_CONTEXT_TERMS = ['official', 'website', 'homepage', 'home page', 'visit website', 'external link']
const STEAM_PAGE_HOST_PATTERNS = ['steampowered.com', 'steamcommunity.com']
const STEAM_IMAGE_HOST_PATTERNS = ['steamstatic.com', 'steampowered.com']

function fetchSteamPageHtml(url: string) {
  return invoke<string>('fetch_steam_page_html', { url })
}

function fetchOfficialSiteHtml(url: string) {
  return invoke<FetchedOfficialTextDocument>('fetch_official_logo_discovery_html', { url })
}

function fetchOfficialSiteCssFiles(urls: string[]) {
  return invoke<FetchedOfficialTextDocument[]>('fetch_official_logo_discovery_css_files', { urls })
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

function createCandidate(
  seed: RemoteLogoCandidateSeed,
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
  } = scoreLogoCandidate({ ...seed, url }, fileType, entityNames)

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
  const seeds: RemoteLogoCandidateSeed[] = []
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

export function parseOfficialLogoCandidatesFromHtml(
  html: string,
  sourcePageUrl: string,
  entityNames: string[] = [],
) {
  const candidates: RemoteLogoCandidate[] = []
  const seeds: RemoteLogoCandidateSeed[] = parseOfficialHtmlImageSeeds(
    html,
    sourcePageUrl,
  )

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
  const seeds: RemoteLogoCandidateSeed[] = parseOfficialCssImageSeeds(css, sourcePageUrl)

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
    return includesAny(host, SOCIAL_HOST_TERMS)
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
