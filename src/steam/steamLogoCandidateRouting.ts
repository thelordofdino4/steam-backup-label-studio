import type { RemoteLogoCandidateFileType } from './steamLogoCandidateUrls.ts'

export type RemoteImageCandidateWorkflow = 'branding-logo' | 'artwork'
export type RemoteImageCandidateKind = 'logo' | 'artwork'

export type RemoteLogoCandidateSourceKind =
  | 'steam-avatar'
  | 'steam-meta-image'
  | 'steam-img'
  | 'official-img'
  | 'official-srcset'
  | 'official-css-background'
  | 'official-meta-image'
  | 'favicon'

export type LogoCandidateRoutingSeed = {
  sourceKind: RemoteLogoCandidateSourceKind
  sourcePageUrl: string
}

export type LogoCandidateRoutingResult = {
  targetWorkflow: RemoteImageCandidateWorkflow
  contentKind: RemoteImageCandidateKind
  routingReasons: string[]
}

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

function includesAny(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term))
}

export function isSteamSourceKind(sourceKind: RemoteLogoCandidateSourceKind) {
  return sourceKind.startsWith('steam-')
}

export function isOfficialSourceKind(sourceKind: RemoteLogoCandidateSourceKind) {
  return !isSteamSourceKind(sourceKind)
}

function isSteamCreatorPageUrl(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return pathname.includes('/developer/')
      || pathname.includes('/publisher/')
      || pathname.includes('/curator/')
  } catch {
    return false
  }
}

export function getCandidateRoutingSignals(
  seed: LogoCandidateRoutingSeed,
  fileType: RemoteLogoCandidateFileType,
  haystack: string,
  candidateSignalText: string,
) {
  const hasLogoTerm = includesAny(haystack, LOGO_TERMS)
  const hasHeaderLogoTerm = includesAny(haystack, HEADER_LOGO_TERMS)
  const hasCreatorLogoSignal = seed.sourceKind === 'steam-avatar' || includesAny(candidateSignalText, ['avatar'])
  const hasArtworkSignal = includesAny(haystack, ARTWORK_TERMS)
    || seed.sourceKind === 'official-meta-image' && !hasLogoTerm
    || fileType === 'jpg' && !hasLogoTerm
  const isLogoLike = hasLogoTerm || hasHeaderLogoTerm || hasCreatorLogoSignal
  const isArtworkLike = hasArtworkSignal && !isLogoLike

  return {
    isLogoLike,
    isArtworkLike,
  }
}

export function isNonLogoSteamCreatorMetadataImage(seed: LogoCandidateRoutingSeed, isLogoLike: boolean) {
  return seed.sourceKind === 'steam-meta-image'
    && isSteamCreatorPageUrl(seed.sourcePageUrl)
    && !isLogoLike
}

export function getCandidateRouting(
  seed: LogoCandidateRoutingSeed,
  fileType: RemoteLogoCandidateFileType,
  haystack: string,
  candidateSignalText: string,
): LogoCandidateRoutingResult {
  const routingReasons: string[] = []
  const { isLogoLike, isArtworkLike } = getCandidateRoutingSignals(
    seed,
    fileType,
    haystack,
    candidateSignalText,
  )

  if (isArtworkLike) {
    routingReasons.push('Artwork-like image routed to Artwork')
    return {
      targetWorkflow: 'artwork',
      contentKind: 'artwork',
      routingReasons,
    }
  }

  if (!isLogoLike && seed.sourceKind === 'steam-meta-image') {
    routingReasons.push('Steam metadata image lacks logo signals and is routed to Artwork')
    return {
      targetWorkflow: 'artwork',
      contentKind: 'artwork',
      routingReasons,
    }
  }

  if (!isLogoLike && isOfficialSourceKind(seed.sourceKind)) {
    routingReasons.push('Official-site image lacks logo signals and is routed to Artwork')
    return {
      targetWorkflow: 'artwork',
      contentKind: 'artwork',
      routingReasons,
    }
  }

  if (!isLogoLike && isSteamSourceKind(seed.sourceKind) && includesAny(candidateSignalText, ARTWORK_TERMS)) {
    routingReasons.push('Steam artwork image routed to Artwork')
    return {
      targetWorkflow: 'artwork',
      contentKind: 'artwork',
      routingReasons,
    }
  }

  routingReasons.push('Logo-like image routed to Branding')
  return {
    targetWorkflow: 'branding-logo',
    contentKind: 'logo',
    routingReasons,
  }
}
