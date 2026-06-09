import {
  DISC_LAYOUT_CENTER_PERCENT,
  clampLayoutPointToSafeZone,
  clampNumber,
  getAdditionalArtworkBoundsPercent,
  getImageContentShapeFootprintPercent,
  getLogoAssetBoundsPercent,
  getMediaMarkBoundsPercent,
  getPlatformMarkBoundsPercent,
  getRatingBadgeBoundsPercent,
  getSafeZoneRadiusPercent,
  getTechnicalMarkBoundsPercent,
  getTitleArtworkBoundsPercent,
  type RenderBoundsPercent,
  type RenderShapeFootprintPercent,
} from '../disc/geometry.ts'
import {
  getMediaMarkPlaceholderImageSize,
  getPlatformMarkPlaceholderImageSize,
  getRatingBadgePlaceholderImageSize,
  getTechnicalMarkPlaceholderImageSize,
} from '../assets/assetManifest.ts'
import type {
  DiscTextKey,
  DiscTextLayout,
  DiscTextLayoutSettings,
  SteamLogoPlacement,
} from '../discText/types'
import type {
  AdditionalArtworkLayout,
  BackgroundImageSize,
  LogoAssetLayout,
  MediaMarkLayout,
  PlatformMarkLayout,
  PlatformMarkValue,
  ProjectMetadata,
  ProjectMediaMark,
  ProjectPlatformMarkAsset,
  ProjectTechnicalMarkAsset,
  ProjectRatingBadge,
  TitleArtworkLayout,
  RatingBadgeLayout,
  TechnicalMarkLayout,
  TechnicalMarkValue,
} from '../project/projectTypes'
import type { DiscTemplate } from '../types/template'

type DiscLayoutPoint = {
  x: number
  y: number
}

type RadialAnchor = {
  angleRadians: number
  radialFraction: number
}

type DiscTemplateLayoutMetrics = {
  innerPrintRadiusPercent: number
  safeRadiusPercent: number
  printableRadiusPercent: number
  safeRingWidthPercent: number
}

const STANDARD_REFERENCE_OUTER_DIAMETER_MM = 120
const STANDARD_REFERENCE_INNER_HOLE_DIAMETER_MM = 22
const STANDARD_REFERENCE_PRINTABLE_DIAMETER_MM = 118
const STANDARD_REFERENCE_SAFE_DIAMETER_MM = 112

const REFERENCE_LAYOUT_METRICS: DiscTemplateLayoutMetrics = {
  innerPrintRadiusPercent:
    (STANDARD_REFERENCE_INNER_HOLE_DIAMETER_MM /
      STANDARD_REFERENCE_OUTER_DIAMETER_MM) *
    DISC_LAYOUT_CENTER_PERCENT,
  safeRadiusPercent:
    (STANDARD_REFERENCE_SAFE_DIAMETER_MM /
      STANDARD_REFERENCE_OUTER_DIAMETER_MM) *
    DISC_LAYOUT_CENTER_PERCENT,
  printableRadiusPercent:
    (STANDARD_REFERENCE_PRINTABLE_DIAMETER_MM /
      STANDARD_REFERENCE_OUTER_DIAMETER_MM) *
    DISC_LAYOUT_CENTER_PERCENT,
  safeRingWidthPercent:
    ((STANDARD_REFERENCE_SAFE_DIAMETER_MM -
      STANDARD_REFERENCE_INNER_HOLE_DIAMETER_MM) /
      STANDARD_REFERENCE_OUTER_DIAMETER_MM) *
    DISC_LAYOUT_CENTER_PERCENT,
}

const DEFAULT_TEXT_WIDTHS_FALLBACK: Record<DiscTextKey, number> = {
  title: 58,
  subtitle: 54,
  discNumber: 42,
  backupDate: 48,
  appId: 48,
  developer: 48,
  publisher: 48,
  installNotes: 58,
  customNote: 58,
  copyright: 68,
}

const DISC_TEXT_ANCHORS = {
  titleTop: createReferenceAnchor({ x: 50, y: 19.5 }),
  titleBottom: createReferenceAnchor({ x: 50, y: 81.5 }),
  subtitleTop: createReferenceAnchor({ x: 50, y: 24 }),
  subtitleBottom: createReferenceAnchor({ x: 50, y: 86 }),
  discNumber: createReferenceAnchor({ x: 50, y: 63.5 }),
  backupDate: createReferenceAnchor({ x: 50, y: 68 }),
  appId: createReferenceAnchor({ x: 50, y: 72 }),
  developer: createReferenceAnchor({ x: 32, y: 56 }),
  publisher: createReferenceAnchor({ x: 32, y: 60 }),
  installNotesTopBanner: createReferenceAnchor({ x: 50, y: 76 }),
  installNotesBottomBanner: createReferenceAnchor({ x: 50, y: 72 }),
  customNoteTopBanner: createReferenceAnchor({ x: 50, y: 78 }),
  customNoteBottomBanner: createReferenceAnchor({ x: 50, y: 76 }),
  copyrightStraightTop: createReferenceAnchor({ x: 50, y: 16 }),
  copyrightStraightBottom: createReferenceAnchor({ x: 50, y: 86 }),
}

const LOGO_ANCHORS = {
  developer: createReferenceAnchor({ x: 22, y: 62 }),
  publisher: createReferenceAnchor({ x: 22, y: 72 }),
} satisfies Record<'developer' | 'publisher', RadialAnchor>

const TITLE_ARTWORK_ANCHORS = {
  top: createReferenceAnchor({ x: 50, y: 19.5 }),
  bottom: createReferenceAnchor({ x: 50, y: 81.5 }),
} satisfies Record<'top' | 'bottom', RadialAnchor>

const ADDITIONAL_ARTWORK_ANCHORS = [
  createReferenceAnchor({ x: 68, y: 42 }),
  createReferenceAnchor({ x: 32, y: 42 }),
  createReferenceAnchor({ x: 68, y: 58 }),
  createReferenceAnchor({ x: 32, y: 58 }),
  createReferenceAnchor({ x: 50, y: 50 }),
] as const

const ADDITIONAL_LOGO_X_OFFSET_PERCENT = 20
const ADDITIONAL_ARTWORK_X_OFFSET_PERCENT = 9
const ADDITIONAL_ARTWORK_Y_OFFSET_PERCENT = 7

const RATING_BADGE_ANCHOR = createReferenceAnchor({ x: 78, y: 50 })
const MEDIA_MARK_ANCHOR = createReferenceAnchor({ x: 74, y: 72 })

const PLATFORM_MARK_ANCHORS = {
  pc: createReferenceAnchor({ x: 24, y: 70 }),
  windows: createReferenceAnchor({ x: 37, y: 70 }),
  linux: createReferenceAnchor({ x: 50, y: 70 }),
  steamDeck: createReferenceAnchor({ x: 24, y: 80 }),
  macos: createReferenceAnchor({ x: 37, y: 80 }),
} satisfies Record<PlatformMarkValue, RadialAnchor>

const TECHNICAL_MARK_ANCHORS = {
  audio: createReferenceAnchor({ x: 63, y: 70 }),
  surround: createReferenceAnchor({ x: 76, y: 70 }),
  codec: createReferenceAnchor({ x: 63, y: 80 }),
  middleware: createReferenceAnchor({ x: 76, y: 80 }),
  technology: createReferenceAnchor({ x: 63, y: 60 }),
} satisfies Record<TechnicalMarkValue, RadialAnchor>

export function getDiscTemplateLayoutMetrics(
  template: DiscTemplate,
): DiscTemplateLayoutMetrics {
  const outerDiameterMm = Math.max(1, template.outerDiameterMm)
  const physicalCenterHoleRadiusPercent =
    (Math.max(0, template.physicalCenterHoleDiameterMm) / outerDiameterMm) *
    DISC_LAYOUT_CENTER_PERCENT
  const innerHoleRadiusPercent =
    (Math.max(0, template.innerHoleDiameterMm) / outerDiameterMm) *
    DISC_LAYOUT_CENTER_PERCENT
  const printableRadiusPercent = clampNumber(
    (Math.max(0, template.printableDiameterMm) / outerDiameterMm) *
      DISC_LAYOUT_CENTER_PERCENT,
    0,
    DISC_LAYOUT_CENTER_PERCENT,
  )
  const safeRadiusPercent = clampNumber(
    getSafeZoneRadiusPercent(template),
    0,
    printableRadiusPercent,
  )
  const innerPrintRadiusPercent = clampNumber(
    Math.max(physicalCenterHoleRadiusPercent, innerHoleRadiusPercent),
    0,
    safeRadiusPercent,
  )

  return {
    innerPrintRadiusPercent,
    safeRadiusPercent,
    printableRadiusPercent,
    safeRingWidthPercent: Math.max(
      0,
      safeRadiusPercent - innerPrintRadiusPercent,
    ),
  }
}

function createReferenceAnchor(point: DiscLayoutPoint): RadialAnchor {
  const deltaX = point.x - DISC_LAYOUT_CENTER_PERCENT
  const deltaY = point.y - DISC_LAYOUT_CENTER_PERCENT
  const radius = Math.hypot(deltaX, deltaY)
  const radialFraction =
    REFERENCE_LAYOUT_METRICS.safeRingWidthPercent > 0
      ? (radius - REFERENCE_LAYOUT_METRICS.innerPrintRadiusPercent) /
        REFERENCE_LAYOUT_METRICS.safeRingWidthPercent
      : 0

  return {
    angleRadians: Math.atan2(deltaY, deltaX),
    radialFraction,
  }
}

function getPointFromAnchor(
  template: DiscTemplate,
  anchor: RadialAnchor,
): DiscLayoutPoint {
  const metrics = getDiscTemplateLayoutMetrics(template)
  const radius =
    metrics.innerPrintRadiusPercent +
    metrics.safeRingWidthPercent * clampNumber(anchor.radialFraction, 0, 1)

  return {
    x: DISC_LAYOUT_CENTER_PERCENT + Math.cos(anchor.angleRadians) * radius,
    y: DISC_LAYOUT_CENTER_PERCENT + Math.sin(anchor.angleRadians) * radius,
  }
}

function getTemplateAwarePoint(
  template: DiscTemplate,
  anchor: RadialAnchor,
  bounds?: RenderBoundsPercent,
  shapeFootprint: RenderShapeFootprintPercent | null = null,
) {
  return clampLayoutPointToSafeZone(
    getPointFromAnchor(template, anchor),
    template,
    bounds,
    shapeFootprint,
  )
}

function getTemplateAwareImagePoint(
  template: DiscTemplate,
  anchor: RadialAnchor,
  imageSize: BackgroundImageSize | null,
  bounds: RenderBoundsPercent,
) {
  return getTemplateAwarePoint(
    template,
    anchor,
    bounds,
    getImageContentShapeFootprintPercent(imageSize, bounds),
  )
}

function textLayoutFromPoint(
  point: DiscLayoutPoint,
  layout: Omit<DiscTextLayout, 'x' | 'y'>,
): DiscTextLayout {
  return {
    ...layout,
    x: point.x - DISC_LAYOUT_CENTER_PERCENT,
    y: point.y,
  }
}

function getDiscTextWidths(widths?: Partial<Record<DiscTextKey, number>>) {
  return {
    ...DEFAULT_TEXT_WIDTHS_FALLBACK,
    ...(widths ?? {}),
  }
}

export function getDefaultCopyrightStraightLayoutForTemplate(
  template: DiscTemplate,
  placement: SteamLogoPlacement,
  widths?: Partial<Record<DiscTextKey, number>>,
): DiscTextLayout {
  const resolvedWidths = getDiscTextWidths(widths)
  const hasBottomBanner = placement === 'bottom'
  const point = getTemplateAwarePoint(
    template,
    hasBottomBanner
      ? DISC_TEXT_ANCHORS.copyrightStraightTop
      : DISC_TEXT_ANCHORS.copyrightStraightBottom,
  )

  return textLayoutFromPoint(point, {
    width: resolvedWidths.copyright,
    scale: 1,
    align: 'center',
    mode: 'straight',
    arcDegrees: 210,
    arcSide: hasBottomBanner ? 'top' : 'bottom',
    avoidVisualElements: false,
  })
}

export function getDefaultCopyrightCurvedLayoutForTemplate(
  _template: DiscTemplate,
  placement: SteamLogoPlacement,
  widths?: Partial<Record<DiscTextKey, number>>,
): DiscTextLayout {
  const resolvedWidths = getDiscTextWidths(widths)
  const hasBottomBanner = placement === 'bottom'

  return {
    x: 0,
    y: 0,
    width: resolvedWidths.copyright,
    scale: 1,
    align: 'center',
    mode: 'curved',
    arcDegrees: 210,
    arcSide: hasBottomBanner ? 'top' : 'bottom',
    avoidVisualElements: false,
  }
}

export function createDefaultDiscTextLayoutForTemplate(
  template: DiscTemplate,
  placement: SteamLogoPlacement,
  widths?: Partial<Record<DiscTextKey, number>>,
): DiscTextLayoutSettings {
  const resolvedWidths = getDiscTextWidths(widths)
  const hasBottomBanner = placement === 'bottom'
  const getPoint = (anchor: RadialAnchor) => getTemplateAwarePoint(template, anchor)

  return {
    title: textLayoutFromPoint(
      getPoint(hasBottomBanner ? DISC_TEXT_ANCHORS.titleBottom : DISC_TEXT_ANCHORS.titleTop),
      {
        width: resolvedWidths.title,
        scale: 1,
        align: 'center',
        mode: 'straight',
        arcDegrees: 210,
        arcSide: 'bottom',
        avoidVisualElements: false,
      },
    ),
    subtitle: textLayoutFromPoint(
      getPoint(
        hasBottomBanner
          ? DISC_TEXT_ANCHORS.subtitleBottom
          : DISC_TEXT_ANCHORS.subtitleTop,
      ),
      {
        width: resolvedWidths.subtitle,
        scale: 0.92,
        align: 'center',
        mode: 'straight',
        arcDegrees: 210,
        arcSide: 'bottom',
        avoidVisualElements: false,
      },
    ),
    discNumber: textLayoutFromPoint(getPoint(DISC_TEXT_ANCHORS.discNumber), {
      width: resolvedWidths.discNumber,
      scale: 1,
      align: 'center',
      mode: 'straight',
      arcDegrees: 210,
      arcSide: 'bottom',
      avoidVisualElements: false,
    }),
    backupDate: textLayoutFromPoint(getPoint(DISC_TEXT_ANCHORS.backupDate), {
      width: resolvedWidths.backupDate,
      scale: 1,
      align: 'center',
      mode: 'straight',
      arcDegrees: 210,
      arcSide: 'bottom',
      avoidVisualElements: false,
    }),
    appId: textLayoutFromPoint(getPoint(DISC_TEXT_ANCHORS.appId), {
      width: resolvedWidths.appId,
      scale: 1,
      align: 'center',
      mode: 'straight',
      arcDegrees: 210,
      arcSide: 'bottom',
      avoidVisualElements: false,
    }),
    developer: textLayoutFromPoint(getPoint(DISC_TEXT_ANCHORS.developer), {
      width: resolvedWidths.developer,
      scale: 0.86,
      align: 'left',
      mode: 'straight',
      arcDegrees: 210,
      arcSide: 'bottom',
      avoidVisualElements: false,
    }),
    publisher: textLayoutFromPoint(getPoint(DISC_TEXT_ANCHORS.publisher), {
      width: resolvedWidths.publisher,
      scale: 0.86,
      align: 'left',
      mode: 'straight',
      arcDegrees: 210,
      arcSide: 'bottom',
      avoidVisualElements: false,
    }),
    installNotes: textLayoutFromPoint(
      getPoint(
        hasBottomBanner
          ? DISC_TEXT_ANCHORS.installNotesBottomBanner
          : DISC_TEXT_ANCHORS.installNotesTopBanner,
      ),
      {
        width: resolvedWidths.installNotes,
        scale: 0.86,
        align: 'center',
        mode: 'straight',
        arcDegrees: 210,
        arcSide: 'bottom',
        avoidVisualElements: false,
      },
    ),
    customNote: textLayoutFromPoint(
      getPoint(
        hasBottomBanner
          ? DISC_TEXT_ANCHORS.customNoteBottomBanner
          : DISC_TEXT_ANCHORS.customNoteTopBanner,
      ),
      {
        width: resolvedWidths.customNote,
        scale: 1,
        align: 'center',
        mode: 'straight',
        arcDegrees: 210,
        arcSide: 'bottom',
        avoidVisualElements: false,
      },
    ),
    copyright: getDefaultCopyrightCurvedLayoutForTemplate(
      template,
      placement,
      resolvedWidths,
    ),
  }
}

export function getDefaultLogoAssetLayoutForTemplate(
  template: DiscTemplate,
  logoKey: 'developer' | 'publisher',
  imageSize: BackgroundImageSize | null = null,
): LogoAssetLayout {
  const scale = 1
  const bounds = getLogoAssetBoundsPercent(imageSize, scale)
  const point = getTemplateAwareImagePoint(
    template,
    LOGO_ANCHORS[logoKey],
    imageSize,
    bounds,
  )

  return {
    enabled: false,
    scale,
    x: point.x,
    y: point.y,
  }
}

export function getDefaultAdditionalLogoAssetLayoutForTemplate(
  template: DiscTemplate,
  logoKey: 'developer' | 'publisher',
  additionalLogoIndex: number,
  imageSize: BackgroundImageSize | null = null,
): LogoAssetLayout {
  const baseLayout = getDefaultLogoAssetLayoutForTemplate(template, logoKey, imageSize)
  const scale = baseLayout.scale
  const bounds = getLogoAssetBoundsPercent(imageSize, scale)
  const point = clampLayoutPointToSafeZone(
    {
      x: baseLayout.x + ADDITIONAL_LOGO_X_OFFSET_PERCENT * (additionalLogoIndex + 1),
      y: baseLayout.y,
    },
    template,
    bounds,
    getImageContentShapeFootprintPercent(imageSize, bounds),
  )

  return {
    enabled: false,
    scale,
    x: point.x,
    y: point.y,
  }
}

export function getNextAdditionalLogoAssetLayoutForTemplate(
  template: DiscTemplate,
  referenceLayout: LogoAssetLayout,
  imageSize: BackgroundImageSize | null = null,
): LogoAssetLayout {
  const bounds = getLogoAssetBoundsPercent(imageSize, referenceLayout.scale)
  const point = clampLayoutPointToSafeZone(
    {
      x: referenceLayout.x + ADDITIONAL_LOGO_X_OFFSET_PERCENT,
      y: referenceLayout.y,
    },
    template,
    bounds,
    getImageContentShapeFootprintPercent(imageSize, bounds),
  )

  return {
    ...referenceLayout,
    enabled: true,
    x: point.x,
    y: point.y,
  }
}

export function getDefaultTitleArtworkLayoutForTemplate(
  template: DiscTemplate,
  placement: SteamLogoPlacement,
  imageSize: BackgroundImageSize | null = null,
): TitleArtworkLayout {
  const scale = 1
  const bounds = getTitleArtworkBoundsPercent(imageSize, scale)
  const point = getTemplateAwareImagePoint(
    template,
    placement === 'bottom'
      ? TITLE_ARTWORK_ANCHORS.bottom
      : TITLE_ARTWORK_ANCHORS.top,
    imageSize,
    bounds,
  )

  return {
    enabled: false,
    scale,
    x: point.x,
    y: point.y,
  }
}

export function getDefaultAdditionalArtworkLayoutForTemplate(
  template: DiscTemplate,
  additionalArtworkIndex: number,
  imageSize: BackgroundImageSize | null = null,
): AdditionalArtworkLayout {
  const scale = 1
  const anchor =
    ADDITIONAL_ARTWORK_ANCHORS[
      additionalArtworkIndex % ADDITIONAL_ARTWORK_ANCHORS.length
    ]
  const bounds = getAdditionalArtworkBoundsPercent(imageSize, scale)
  const point = getTemplateAwareImagePoint(
    template,
    anchor,
    imageSize,
    bounds,
  )

  return {
    enabled: true,
    scale,
    x: point.x,
    y: point.y,
  }
}

export function getNextAdditionalArtworkLayoutForTemplate(
  template: DiscTemplate,
  referenceLayout: AdditionalArtworkLayout,
  imageSize: BackgroundImageSize | null = null,
): AdditionalArtworkLayout {
  const bounds = getAdditionalArtworkBoundsPercent(
    imageSize,
    referenceLayout.scale,
  )
  const point = clampLayoutPointToSafeZone(
    {
      x: referenceLayout.x + ADDITIONAL_ARTWORK_X_OFFSET_PERCENT,
      y: referenceLayout.y + ADDITIONAL_ARTWORK_Y_OFFSET_PERCENT,
    },
    template,
    bounds,
    getImageContentShapeFootprintPercent(imageSize, bounds),
  )

  return {
    ...referenceLayout,
    enabled: true,
    x: point.x,
    y: point.y,
  }
}

export function getDefaultRatingBadgeLayoutForTemplate(
  template: DiscTemplate,
  ratingBadge?: Pick<ProjectRatingBadge, 'source' | 'customImageSize'> & {
    metadata?: Pick<ProjectMetadata, 'ratingSystem' | 'ratingValue'> | null
  },
): RatingBadgeLayout {
  const scale = 1
  const imageSize =
    ratingBadge?.source === 'custom' && ratingBadge.customImageSize
      ? ratingBadge.customImageSize
      : getRatingBadgePlaceholderImageSize(
          ratingBadge?.metadata ?? {
            ratingSystem: 'ESRB',
            ratingValue: 'RP',
          },
        )
  const bounds = getRatingBadgeBoundsPercent(imageSize, scale)
  const point = getTemplateAwareImagePoint(
    template,
    RATING_BADGE_ANCHOR,
    imageSize,
    bounds,
  )

  return {
    enabled: false,
    scale,
    x: point.x,
    y: point.y,
  }
}

export function getDefaultMediaMarkLayoutForTemplate(
  template: DiscTemplate,
  mediaMark?: Pick<ProjectMediaMark, 'source' | 'customImageSize'> &
    Partial<Pick<ProjectMediaMark, 'value' | 'theme'>>,
): MediaMarkLayout {
  const scale = 1
  const imageSize =
    mediaMark?.source === 'custom' && mediaMark.customImageSize
      ? mediaMark.customImageSize
      : getMediaMarkPlaceholderImageSize(
          mediaMark?.value ?? 'dataDisc',
          mediaMark?.theme ?? 'light',
        )
  const bounds = getMediaMarkBoundsPercent(imageSize, scale)
  const point = getTemplateAwareImagePoint(
    template,
    MEDIA_MARK_ANCHOR,
    imageSize,
    bounds,
  )

  return {
    enabled: false,
    scale,
    x: point.x,
    y: point.y,
  }
}

export function getDefaultPlatformMarkLayoutForTemplate(
  template: DiscTemplate,
  value: PlatformMarkValue,
  platformMark?: Pick<ProjectPlatformMarkAsset, 'source' | 'customImageSize'> &
    Partial<Pick<ProjectPlatformMarkAsset, 'theme'>>,
): PlatformMarkLayout {
  const scale = 1
  const imageSize =
    platformMark?.source === 'custom' && platformMark.customImageSize
      ? platformMark.customImageSize
      : getPlatformMarkPlaceholderImageSize(value, platformMark?.theme)
  const bounds = getPlatformMarkBoundsPercent(imageSize, scale)
  const point = getTemplateAwareImagePoint(
    template,
    PLATFORM_MARK_ANCHORS[value],
    imageSize,
    bounds,
  )

  return {
    enabled: true,
    scale,
    x: point.x,
    y: point.y,
  }
}

export function getDefaultTechnicalMarkLayoutForTemplate(
  template: DiscTemplate,
  value: TechnicalMarkValue,
  technicalMark?: Pick<ProjectTechnicalMarkAsset, 'source' | 'customImageSize'>,
): TechnicalMarkLayout {
  const scale = 1
  const imageSize =
    technicalMark?.source === 'custom' && technicalMark.customImageSize
      ? technicalMark.customImageSize
      : getTechnicalMarkPlaceholderImageSize(value)
  const bounds = getTechnicalMarkBoundsPercent(imageSize, scale)
  const point = getTemplateAwareImagePoint(
    template,
    TECHNICAL_MARK_ANCHORS[value],
    imageSize,
    bounds,
  )

  return {
    enabled: true,
    scale,
    x: point.x,
    y: point.y,
  }
}
