import type {
  MediaMarkValue,
  PlatformMarkTheme,
  PlatformMarkValue,
  ProjectCaseInsertImageSlot,
  ProjectImageAssetProvenance,
  SavedCaseInsertProject,
  SavedDiscProject,
  SavedProject,
  TechnicalMarkValue,
} from '../project/projectTypes.ts'

export const PROJECT_PACKAGE_CAPTURE_PLAN_VERSION = 1 as const

const PLATFORM_VALUES = Object.freeze([
  'pc',
  'windows',
  'linux',
  'steamDeck',
  'macos',
] as const satisfies readonly PlatformMarkValue[])

const TECHNICAL_VALUES = Object.freeze([
  'audio',
  'surround',
  'codec',
  'middleware',
  'technology',
] as const satisfies readonly TechnicalMarkValue[])

const CASE_SURFACES = Object.freeze([
  'cover',
  'tray',
  'spine-left',
  'spine-right',
] as const)

type LogoRole = 'developer' | 'publisher'
type CaseSurface = typeof CASE_SURFACES[number]

export type ProjectPackageAssetOwnerId =
  | 'disc.background'
  | 'disc.steam-banner'
  | `disc.logo.${LogoRole}`
  | `disc.logo.${LogoRole}.additional.${number}`
  | 'disc.title.current'
  | 'disc.title.default'
  | `disc.artwork.additional.${number}`
  | 'disc.rating.custom'
  | 'disc.media.custom'
  | `disc.platform.${PlatformMarkValue}`
  | `disc.technical.${TechnicalMarkValue}`
  | `disc.technical.${TechnicalMarkValue}.additional.${number}`
  | `case.${CaseSurface}.banner`
  | `case.${CaseSurface}.background`
  | `case.${CaseSurface}.title.current`
  | `case.${CaseSurface}.title.default`
  | `case.${CaseSurface}.artwork.${number}`
  | `case.${CaseSurface}.logo.${number}`
  | `case.${CaseSurface}.mark.${number}`

export type ProjectPackageAssetCaptureDecision =
  | Readonly<{ kind: 'no-accepted-asset' }>
  | Readonly<{ kind: 'project-owned-data-url' }>
  | Readonly<{
      kind: 'qualified-built-in'
      compatibilityId: string
    }>
  | Readonly<{ kind: 'unsupported-nonportable-asset' }>

export type ProjectPackageAssetCapture = Readonly<{
  ownerId: ProjectPackageAssetOwnerId
  decision: ProjectPackageAssetCaptureDecision
}>

export type ProjectPackageCapturePlanV1 = Readonly<{
  version: typeof PROJECT_PACKAGE_CAPTURE_PLAN_VERSION
  captures: readonly ProjectPackageAssetCapture[]
}>

const NO_ASSET = Object.freeze({ kind: 'no-accepted-asset' } as const)
const PROJECT_DATA = Object.freeze({ kind: 'project-owned-data-url' } as const)
const UNSUPPORTED = Object.freeze({
  kind: 'unsupported-nonportable-asset',
} as const)

const MEDIA_VALUES = new Set<MediaMarkValue>([
  'bluRay', 'dvd', 'dvdRom', 'cdRom', 'dataDisc', 'installDisc',
])

const PLATFORM_THEMES: Readonly<Record<PlatformMarkValue, ReadonlySet<PlatformMarkTheme>>> =
  Object.freeze({
    pc: new Set<PlatformMarkTheme>(['pcPlatform', 'pcSimplified', 'pcSimplifiedDark']),
    windows: new Set<PlatformMarkTheme>([
      'retro', 'xp', 'vista', 'windows7', 'windows10', 'windows11',
    ]),
    linux: new Set<PlatformMarkTheme>(['color', 'light', 'dark']),
    steamDeck: new Set<PlatformMarkTheme>(['color', 'light', 'dark']),
    macos: new Set<PlatformMarkTheme>([
      'macos1988', 'macos1995', 'macos2001', 'macos2003',
      'macos2012', 'macos2016', 'macos2017',
    ]),
  })

const DEFAULT_PLATFORM_THEME: Readonly<Record<PlatformMarkValue, PlatformMarkTheme>> =
  Object.freeze({
    pc: 'pcPlatform',
    windows: 'windows11',
    linux: 'color',
    steamDeck: 'color',
    macos: 'macos1988',
  })

const RATING_VALUES = Object.freeze({
  ESRB: new Set(['E', 'E10+', 'T', 'M', 'AO', 'RP', 'RP17+']),
  PEGI: new Set(['3', '7', '12', '16', '18']),
  USK: new Set(['0', '6', '12', '16', '18']),
} as const)

function qualifiedBuiltIn(
  compatibilityId: string,
): ProjectPackageAssetCaptureDecision {
  return Object.freeze({ kind: 'qualified-built-in', compatibilityId })
}

function hasAcceptedEvidence(...values: readonly unknown[]): boolean {
  return values.some((value) => value !== null && value !== undefined)
}

function classifyLeaf(
  value: unknown,
  builtInId: string | null,
  acceptedEvidence: boolean,
  allowBuiltInReference = false,
): ProjectPackageAssetCaptureDecision {
  if (typeof value === 'string') {
    if (value.startsWith('data:')) return PROJECT_DATA
    return builtInId && allowBuiltInReference
      ? qualifiedBuiltIn(builtInId)
      : UNSUPPORTED
  }
  if (value !== null && value !== undefined) return UNSUPPORTED
  if (builtInId) return qualifiedBuiltIn(builtInId)
  return acceptedEvidence ? UNSUPPORTED : NO_ASSET
}

function provenanceBuiltInId(
  provenance: ProjectImageAssetProvenance | null | undefined,
): string | null {
  if (!provenance || !['built-in', 'placeholder'].includes(provenance.source)) {
    return null
  }
  return typeof provenance.sourceId === 'string' && provenance.sourceId
    ? provenance.sourceId
    : null
}

function ratingBuiltInId(project: SavedDiscProject): string | null {
  const system = project.metadata?.ratingSystem
  const value = project.metadata?.ratingValue
  if (system === 'ESRB' || system === 'PEGI' || system === 'USK') {
    if (typeof value === 'string' && RATING_VALUES[system].has(value)) {
      return `rating:${system}:${value}`
    }
  }
  return null
}

function mediaBuiltInId(
  value: unknown,
  theme: unknown,
): string | null {
  if (typeof value !== 'string' || !MEDIA_VALUES.has(value as MediaMarkValue)) {
    return null
  }
  if (value === 'bluRay') return 'media:bluRay'
  return theme === 'light' || theme === 'dark'
    ? `media:${value}:${theme}`
    : null
}

function platformBuiltInId(
  platform: PlatformMarkValue,
  theme: unknown,
): string | null {
  const resolved = theme === null || theme === undefined
    ? DEFAULT_PLATFORM_THEME[platform]
    : typeof theme === 'string' && PLATFORM_THEMES[platform].has(
      theme as PlatformMarkTheme,
    )
      ? theme as PlatformMarkTheme
      : null
  if (!resolved) return null
  return `platform:${platform}:${resolved}`
}

function technicalBuiltInId(value: TechnicalMarkValue): string {
  return `technical:${value}`
}

function caseSlotBuiltInId(
  slot: ProjectCaseInsertImageSlot | undefined,
  owner: 'background' | 'title' | 'artwork' | 'logo' | 'mark',
): string | null {
  const sourceId = provenanceBuiltInId(slot?.imageSource)
  if (!sourceId) return null

  if (owner === 'logo') {
    if (sourceId === 'case-logo:developer' ||
      sourceId.startsWith('case-logo:developer:')) return 'logo:developer'
    if (sourceId === 'case-logo:publisher' ||
      sourceId.startsWith('case-logo:publisher:')) return 'logo:publisher'
    return null
  }

  if (owner === 'mark') {
    if (sourceId.startsWith('case-rating:')) {
      const [, system, value] = sourceId.split(':')
      if ((system === 'ESRB' || system === 'PEGI' || system === 'USK') &&
        value && RATING_VALUES[system].has(value)) {
        return `rating:${system}:${value}`
      }
      return null
    }
    if (sourceId.startsWith('case-media:')) {
      const [, value, theme] = sourceId.split(':')
      return mediaBuiltInId(value, theme)
    }
    if (sourceId.startsWith('case-platform:')) {
      const [, value, theme] = sourceId.split(':')
      return PLATFORM_VALUES.includes(value as PlatformMarkValue)
        ? platformBuiltInId(value as PlatformMarkValue, theme)
        : null
    }
    if (sourceId.startsWith('case-technical:')) {
      const [, value, assetId = 'primary'] = sourceId.split(':')
      return TECHNICAL_VALUES.includes(value as TechnicalMarkValue) &&
        assetId === 'primary'
        ? technicalBuiltInId(value as TechnicalMarkValue)
        : null
    }
    return null
  }

  // Package v1 publishes no compatibility tuple for arbitrary built-in
  // backgrounds, title art, or additional artwork.
  return null
}

function capture(
  ownerId: ProjectPackageAssetOwnerId,
  decision: ProjectPackageAssetCaptureDecision,
): ProjectPackageAssetCapture {
  return Object.freeze({ ownerId, decision })
}

function pushDiscPlan(
  captures: ProjectPackageAssetCapture[],
  project: SavedDiscProject,
) {
  captures.push(capture(
    'disc.background',
    classifyLeaf(
      project.background.imageDataUrl,
      null,
      hasAcceptedEvidence(project.background.imageSource, project.background.imageSize),
    ),
  ))

  const banner = project.steamBackupLogo
  captures.push(capture(
    'disc.steam-banner',
    classifyLeaf(
      banner.lockupImageDataUrl,
      banner.lockupImageSource?.source === 'built-in' ||
        banner.lockupImageDataUrl == null
        ? 'steam-banner:banner-lockup'
        : null,
      hasAcceptedEvidence(banner.lockupImageSource, banner.lockupImageSize),
      true,
    ),
  ))

  const logos = project.logoAssets
  for (const role of ['developer', 'publisher'] as const) {
    const data = role === 'developer'
      ? logos?.developerLogoDataUrl
      : logos?.publisherLogoDataUrl
    const source = role === 'developer'
      ? logos?.developerLogoSource
      : logos?.publisherLogoSource
    const size = role === 'developer'
      ? logos?.developerLogoSize
      : logos?.publisherLogoSize
    captures.push(capture(
      `disc.logo.${role}`,
      classifyLeaf(
        data,
        `logo:${role}`,
        hasAcceptedEvidence(source, size),
        source?.source === 'built-in' ||
          source?.source === 'placeholder' ||
          (!source && !size),
      ),
    ))
    const additional = role === 'developer'
      ? logos?.additionalDeveloperLogos ?? []
      : logos?.additionalPublisherLogos ?? []
    additional.forEach((item, index) => captures.push(capture(
      `disc.logo.${role}.additional.${index}`,
      classifyLeaf(
        item.imageDataUrl,
        item.imageSource?.source === 'built-in' ||
          item.imageSource?.source === 'placeholder'
          ? `logo:${role}`
          : null,
        hasAcceptedEvidence(item.imageSource, item.imageSize),
        item.imageSource?.source === 'built-in' ||
          item.imageSource?.source === 'placeholder',
      ),
    )))
  }

  const title = project.titleArtwork
  captures.push(capture(
    'disc.title.current',
    classifyLeaf(
      title?.imageDataUrl,
      null,
      hasAcceptedEvidence(title?.imageSize, title?.steamArtworkAssetId),
    ),
  ))
  captures.push(capture(
    'disc.title.default',
    classifyLeaf(
      title?.defaultSteamLogo?.imageDataUrl,
      null,
      hasAcceptedEvidence(
        title?.defaultSteamLogo?.imageSize,
        title?.defaultSteamLogo?.steamArtworkAssetId,
      ),
    ),
  ))

  ;(project.additionalArtwork?.elements ?? []).forEach((item, index) => {
    captures.push(capture(
      `disc.artwork.additional.${index}`,
      classifyLeaf(
        item.imageDataUrl,
        null,
        hasAcceptedEvidence(item.imageSize, item.sourceId),
      ),
    ))
  })

  const rating = project.ratingBadge
  captures.push(capture(
    'disc.rating.custom',
    classifyLeaf(
      rating?.customImageDataUrl,
      rating?.source === 'custom' && rating.customImageSize
        ? null
        : ratingBuiltInId(project),
      hasAcceptedEvidence(rating, rating?.customImageSize),
    ),
  ))

  const media = project.mediaMark
  captures.push(capture(
    'disc.media.custom',
    classifyLeaf(
      media?.customImageDataUrl,
      !media
        ? null
        : media.source === 'custom' && media.customImageSize
        ? null
        : mediaBuiltInId(media.value, media.theme ?? 'light'),
      hasAcceptedEvidence(media, media?.customImageSize),
    ),
  ))

  for (const platform of PLATFORM_VALUES) {
    const asset = project.platformMarks?.assets?.[platform]
    const selected = project.platformMarks?.values?.includes(platform) ?? false
    captures.push(capture(
      `disc.platform.${platform}`,
      classifyLeaf(
        asset?.customImageDataUrl,
        asset?.source === 'custom' && asset.customImageSize
          ? null
          : asset || selected
            ? platformBuiltInId(platform, asset?.theme)
            : null,
        hasAcceptedEvidence(asset, selected ? true : null, asset?.customImageSize),
      ),
    ))
  }

  for (const technical of TECHNICAL_VALUES) {
    const asset = project.technicalMarks?.assets?.[technical]
    const selected = project.technicalMarks?.values?.includes(technical) ?? false
    captures.push(capture(
      `disc.technical.${technical}`,
      classifyLeaf(
        asset?.customImageDataUrl,
        asset?.source === 'custom' && asset.customImageSize
          ? null
          : asset || selected
            ? technicalBuiltInId(technical)
            : null,
        hasAcceptedEvidence(asset, selected ? true : null, asset?.customImageSize),
      ),
    ))
    ;(project.technicalMarks?.additionalAssets?.[technical] ?? [])
      .forEach((additional, index) => captures.push(capture(
        `disc.technical.${technical}.additional.${index}`,
        classifyLeaf(
          additional.customImageDataUrl,
          additional.source === 'placeholder'
            ? technicalBuiltInId(technical)
            : null,
          hasAcceptedEvidence(additional, additional.customImageSize),
        ),
      )))
  }
}

function caseSurface(
  project: SavedCaseInsertProject,
  surface: CaseSurface,
) {
  if (surface === 'cover') return project.caseInsert.templates.cover
  if (surface === 'tray') return project.caseInsert.templates.tray
  if (surface === 'spine-left') return project.caseInsert.spine.left
  return project.caseInsert.spine.right
}

function pushCaseSlot(
  captures: ProjectPackageAssetCapture[],
  ownerId: ProjectPackageAssetOwnerId,
  slot: ProjectCaseInsertImageSlot | undefined,
  kind: 'background' | 'title' | 'artwork' | 'logo' | 'mark',
) {
  const builtInId = caseSlotBuiltInId(slot, kind)
  captures.push(capture(
    ownerId,
    classifyLeaf(
      slot?.imageDataUrl,
      builtInId,
      hasAcceptedEvidence(slot?.imageSource, slot?.imageSize),
      builtInId !== null,
    ),
  ))
}

function pushCasePlan(
  captures: ProjectPackageAssetCapture[],
  project: SavedCaseInsertProject,
) {
  for (const surfaceId of CASE_SURFACES) {
    const surface = caseSurface(project, surfaceId)
    captures.push(capture(
      `case.${surfaceId}.banner`,
      classifyLeaf(
        surface.steamBanner.lockupImageDataUrl,
        surface.steamBanner.lockupImageSource?.source === 'built-in' ||
          surface.steamBanner.lockupImageDataUrl == null
          ? surfaceId === 'cover' || surfaceId === 'tray'
            ? 'steam-banner:banner-lockup'
            : 'steam-banner:spine-icon'
          : null,
        hasAcceptedEvidence(
          surface.steamBanner.lockupImageSource,
          surface.steamBanner.lockupImageSize,
        ),
        true,
      ),
    ))
    pushCaseSlot(
      captures,
      `case.${surfaceId}.background`,
      surface.background,
      'background',
    )
    pushCaseSlot(
      captures,
      `case.${surfaceId}.title.current`,
      surface.titleArtwork,
      'title',
    )
    captures.push(capture(
      `case.${surfaceId}.title.default`,
      classifyLeaf(
        surface.titleArtwork.defaultSteamLogo?.imageDataUrl,
        null,
        hasAcceptedEvidence(
          surface.titleArtwork.defaultSteamLogo?.imageSize,
          surface.titleArtwork.defaultSteamLogo?.steamArtworkAssetId,
        ),
      ),
    ))
    surface.artworkSlots.forEach((slot, index) => pushCaseSlot(
      captures,
      `case.${surfaceId}.artwork.${index}`,
      slot,
      'artwork',
    ))
    surface.logoSlots.forEach((slot, index) => pushCaseSlot(
      captures,
      `case.${surfaceId}.logo.${index}`,
      slot,
      'logo',
    ))
    surface.markSlots.forEach((slot, index) => pushCaseSlot(
      captures,
      `case.${surfaceId}.mark.${index}`,
      slot,
      'mark',
    ))
  }
}

/**
 * Produces one closed owner-aware capture decision for every package-v1
 * registry location in the immutable normalized project. It never fetches,
 * dereferences, mutates, or recursively discovers asset-like property names.
 */
export function createProjectPackageCapturePlan(
  project: SavedProject,
): ProjectPackageCapturePlanV1 {
  const captures: ProjectPackageAssetCapture[] = []
  if (project.projectType === 'caseInsert') {
    pushCasePlan(captures, project)
  } else {
    pushDiscPlan(captures, project)
  }
  return Object.freeze({
    version: PROJECT_PACKAGE_CAPTURE_PLAN_VERSION,
    captures: Object.freeze(captures),
  })
}
