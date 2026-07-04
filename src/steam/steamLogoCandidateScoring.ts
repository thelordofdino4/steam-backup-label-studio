import {
  getCandidateRouting,
  getCandidateRoutingSignals,
  isNonLogoSteamCreatorMetadataImage,
} from './steamLogoCandidateRouting.ts'
import {
  compactForMatch,
  getUrlSignalText,
  hasEntityMatch,
  includesAny,
  includesStandaloneTerm,
  normalizeForMatch,
} from './steamLogoCandidateSignals.ts'
import type {
  RemoteLogoCandidate,
  RemoteLogoCandidateSeed,
} from './steamLogoCandidateTypes.ts'

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
const RATING_BADGE_TERMS = [
  'age rating',
  'content rating',
  'rating badge',
  'rating icon',
  'rating logo',
  'ratings badge',
  'esrb',
  'pegi',
  'usk',
  'cero',
  'acb',
  'oflc',
  'grac',
  'classind',
  'classificacao indicativa',
  'bbfc',
  'mature 17',
  'everyone 10',
]
const ICON_TRASH_TERMS = [
  'apple touch icon',
  'app icon',
  'favicon',
  'icon sprite',
  'mask icon',
  'share icon',
  'social icon',
  'store badge',
  'touch icon',
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
  'logo steam',
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
const EXTREMELY_SMALL_MAX_DIMENSION = 64
const SMALL_SHORTEST_SIDE = 96

function getCandidateSignalText(seed: RemoteLogoCandidateSeed, url = seed.url) {
  return normalizeForMatch([
    getUrlSignalText(url),
    seed.label,
    seed.alt,
    seed.selector,
    seed.context,
  ].filter(Boolean).join(' '))
}

function getGuardSignalText(seed: RemoteLogoCandidateSeed, url = seed.url) {
  return normalizeForMatch([
    getUrlSignalText(url),
    seed.alt,
    seed.selector,
    seed.context,
  ].filter(Boolean).join(' '))
}

function getSocialSignalText(seed: RemoteLogoCandidateSeed, url = seed.url) {
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

function hasGenericSteamPlatformBrandingSignal(guardSignalText: string) {
  if (includesAny(guardSignalText, STEAM_PLATFORM_BRANDING_TERMS)) {
    return true
  }

  const hasSteamToken =
    includesStandaloneTerm(guardSignalText, 'steam') ||
    guardSignalText.includes('steampowered') ||
    guardSignalText.includes('steamworks')

  return hasSteamToken && includesAny(guardSignalText, [
    'brand',
    'deck',
    'home',
    'homepage',
    'icon',
    'logo',
    'platform',
    'powered',
    'wordmark',
  ])
}

function hasValveBrandingSignal(guardSignalText: string) {
  return includesAny(guardSignalText, VALVE_BRANDING_TERMS)
    || includesStandaloneTerm(guardSignalText, 'valve') && includesAny(guardSignalText, [
      'avatar',
      'brand',
      'corp',
      'corporation',
      'logo',
      'software',
      'wordmark',
    ])
}

function hasRatingBadgeSignal(guardSignalText: string) {
  return includesAny(guardSignalText, RATING_BADGE_TERMS)
}

function hasIconTrashSignal(
  seed: RemoteLogoCandidateSeed,
  guardSignalText: string,
) {
  return seed.sourceKind === 'favicon' || includesAny(guardSignalText, ICON_TRASH_TERMS)
}

export function scoreLogoCandidate(
  seed: RemoteLogoCandidateSeed,
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
  const guardSignalText = getGuardSignalText(seed)
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

  if (hasRatingBadgeSignal(guardSignalText)) {
    score -= 120
    reject = true
    reasons.push('Rating badge image is not a developer or publisher logo')
  }

  if (hasIconTrashSignal(seed, guardSignalText)) {
    score -= 90
    reject = true
    reasons.push('Icon-like image')
  }

  const { isLogoLike } = getCandidateRoutingSignals(seed, fileType, haystack, candidateSignalText)
  if (isNonLogoSteamCreatorMetadataImage(seed, isLogoLike)) {
    score -= 120
    reject = true
    reasons.push('Generic Steam creator-page metadata image')
  }

  if (includesAny(candidateSignalText, GENERIC_NEGATIVE_TERMS)) {
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

  if (hasGenericSteamPlatformBrandingSignal(guardSignalText)) {
    score -= 120
    reject = true
    reasons.push('Generic Steam platform branding')
  }

  if (hasValveBrandingSignal(guardSignalText) && !hasValveEntity(entityNames)) {
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
