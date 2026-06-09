import {
  DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_SIZE,
  DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
  DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_SIZE,
  DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_URL,
} from '../assets/assetManifest.ts'
import {
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  getCustomSteamBannerLockupSourceLabel,
  getDefaultSteamBannerLockupSourceLabel,
  normalizeSteamBannerFallbackText,
  type SteamBannerLockupImageKind,
} from '../branding/steamBannerDefaults.ts'
import {
  createEmbeddedProjectImageAssetProvenance,
  createProjectImageAssetProvenance,
  normalizeProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import {
  asRecord,
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeImageSize,
  normalizeNullableString,
  normalizePositiveNumber,
} from '../project/savedProjectNormalization.ts'
import { setOptionalVisualFeatureEnabled } from '../editor/optionalVisualFeature.ts'
import type {
  BackgroundImageSize,
  ProjectCaseInsertLayout,
  ProjectCaseInsertSteamBanner,
  ProjectImageAssetProvenance,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type { CaseInsertTemplatePaneId } from './templateSurfaces.ts'
import type { JewelCaseSpineSide } from './types.ts'

export type CaseInsertSteamBannerTargetKind = 'cover' | 'spine'
export type CaseInsertSteamBannerColorField =
  keyof ProjectCaseInsertSteamBanner['colors']
export type CaseInsertSteamBannerLayoutField =
  keyof ProjectCaseInsertSteamBanner['lockupLayout']

export type ProjectCaseInsertSteamBannerInput =
  Partial<
    Omit<
      ProjectCaseInsertSteamBanner,
      'colors' | 'lockupImageSource' | 'lockupImageSize' | 'lockupLayout'
    >
  > & {
    colors?: Partial<ProjectCaseInsertSteamBanner['colors']>
    bannerColors?: Partial<ProjectCaseInsertSteamBanner['colors']>
    lockupImageSource?: Partial<ProjectImageAssetProvenance> | null
    lockupImageSize?: Partial<BackgroundImageSize> | null
    lockupLayout?: Partial<ProjectCaseInsertLayout>
    layout?: Partial<ProjectCaseInsertLayout>
  }

export const DEFAULT_CASE_INSERT_STEAM_BANNER_COLORS:
ProjectCaseInsertSteamBanner['colors'] = {
  gradientStart: '#2a475f',
  gradientEnd: '#1a2838',
  accent: '#2aabe2',
}

export const DEFAULT_CASE_INSERT_COVER_STEAM_BANNER_LOCKUP_LAYOUT:
ProjectCaseInsertLayout = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
}

export const DEFAULT_CASE_INSERT_SPINE_STEAM_BANNER_LOCKUP_LAYOUT:
ProjectCaseInsertLayout = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 90,
}

function normalizeColor(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback
}

function createBuiltInCaseInsertSteamBannerSource(
  kind: CaseInsertSteamBannerTargetKind,
) {
  const lockupKind = getCaseInsertSteamBannerLockupImageKind(kind)

  return createProjectImageAssetProvenance({
    source: 'built-in',
    sourceId: kind === 'cover'
      ? 'case-steam-banner:cover-lockup'
      : 'case-steam-banner:spine-icon',
    sourceLabel: getDefaultSteamBannerLockupSourceLabel(lockupKind),
  })
}

function getCaseInsertSteamBannerLockupImageKind(
  kind: CaseInsertSteamBannerTargetKind,
): SteamBannerLockupImageKind {
  return kind === 'spine' ? 'spine-icon' : 'banner-lockup'
}

function getDefaultCaseInsertSteamBannerImageUrl(
  kind: CaseInsertSteamBannerTargetKind,
) {
  return kind === 'cover'
    ? DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL
    : DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_URL
}

function getDefaultCaseInsertSteamBannerImageSize(
  kind: CaseInsertSteamBannerTargetKind,
) {
  return kind === 'cover'
    ? DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_SIZE
    : DEFAULT_STEAM_BANNER_SPINE_ICON_IMAGE_SIZE
}

function getDefaultCaseInsertSteamBannerLockupLayout(
  kind: CaseInsertSteamBannerTargetKind,
): ProjectCaseInsertLayout {
  return {
    ...(kind === 'cover'
      ? DEFAULT_CASE_INSERT_COVER_STEAM_BANNER_LOCKUP_LAYOUT
      : DEFAULT_CASE_INSERT_SPINE_STEAM_BANNER_LOCKUP_LAYOUT),
  }
}

export function createDefaultCaseInsertSteamBanner(
  kind: CaseInsertSteamBannerTargetKind,
  options: { enabled?: boolean } = {},
): ProjectCaseInsertSteamBanner {
  return {
    enabled: options.enabled ?? true,
    colors: { ...DEFAULT_CASE_INSERT_STEAM_BANNER_COLORS },
    lockupImageDataUrl: getDefaultCaseInsertSteamBannerImageUrl(kind),
    lockupImageSource: createBuiltInCaseInsertSteamBannerSource(kind),
    lockupImageSize: getDefaultCaseInsertSteamBannerImageSize(kind),
    lockupLayout: getDefaultCaseInsertSteamBannerLockupLayout(kind),
    useTextFallback: false,
    fallbackText: DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  }
}

export function normalizeCaseInsertSteamBanner(
  value: unknown,
  kind: CaseInsertSteamBannerTargetKind,
  options: { enabled?: boolean } = {},
): ProjectCaseInsertSteamBanner {
  const defaults = createDefaultCaseInsertSteamBanner(kind, options)
  const record = asRecord(value)

  if (!record) {
    return defaults
  }

  const colorsRecord = asRecord(record.colors ?? record.bannerColors)
  const layoutRecord = asRecord(record.lockupLayout ?? record.layout)
  const lockupImageDataUrl =
    normalizeNullableString(record.lockupImageDataUrl) ??
    normalizeNullableString(record.lockupImageUrl) ??
    defaults.lockupImageDataUrl
  const fallbackImageSource = lockupImageDataUrl
    ? (
        lockupImageDataUrl === defaults.lockupImageDataUrl
          ? defaults.lockupImageSource ?? null
          : createEmbeddedProjectImageAssetProvenance(
              getCustomSteamBannerLockupSourceLabel(
                getCaseInsertSteamBannerLockupImageKind(kind),
              ),
            )
      )
    : null

  return {
    enabled: normalizeBoolean(record.enabled, defaults.enabled),
    colors: {
      gradientStart: normalizeColor(
        colorsRecord?.gradientStart,
        defaults.colors.gradientStart,
      ),
      gradientEnd: normalizeColor(
        colorsRecord?.gradientEnd,
        defaults.colors.gradientEnd,
      ),
      accent: normalizeColor(colorsRecord?.accent, defaults.colors.accent),
    },
    lockupImageDataUrl,
    lockupImageSource: normalizeProjectImageAssetProvenance(
      asRecord(record.lockupImageSource) as
        | Partial<ProjectImageAssetProvenance>
        | null,
      fallbackImageSource,
    ),
    lockupImageSize:
      normalizeImageSize(record.lockupImageSize) ?? defaults.lockupImageSize,
    lockupLayout: {
      scale: normalizePositiveNumber(
        layoutRecord?.scale,
        defaults.lockupLayout.scale,
      ),
      x: normalizeFiniteNumber(layoutRecord?.x, defaults.lockupLayout.x),
      y: normalizeFiniteNumber(layoutRecord?.y, defaults.lockupLayout.y),
      rotation: normalizeFiniteNumber(
        layoutRecord?.rotation,
        defaults.lockupLayout.rotation,
      ),
    },
    useTextFallback: normalizeBoolean(
      record.useTextFallback,
      defaults.useTextFallback,
    ),
    fallbackText: normalizeSteamBannerFallbackText(record.fallbackText),
  }
}

export function setCaseInsertSteamBannerEnabled(
  banner: ProjectCaseInsertSteamBanner,
  enabled: boolean,
): ProjectCaseInsertSteamBanner {
  return setOptionalVisualFeatureEnabled(banner, enabled)
}

export function updateCaseInsertSteamBannerColor(
  banner: ProjectCaseInsertSteamBanner,
  field: CaseInsertSteamBannerColorField,
  value: string,
): ProjectCaseInsertSteamBanner {
  return {
    ...banner,
    colors: {
      ...banner.colors,
      [field]: value,
    },
  }
}

export function resetCaseInsertSteamBannerColors(
  banner: ProjectCaseInsertSteamBanner,
): ProjectCaseInsertSteamBanner {
  return {
    ...banner,
    colors: { ...DEFAULT_CASE_INSERT_STEAM_BANNER_COLORS },
  }
}

export function updateCaseInsertSteamBannerLockupLayoutField(
  banner: ProjectCaseInsertSteamBanner,
  field: CaseInsertSteamBannerLayoutField,
  value: number,
): ProjectCaseInsertSteamBanner {
  return {
    ...banner,
    lockupLayout: {
      ...banner.lockupLayout,
      [field]: value,
    },
  }
}

export function resetCaseInsertSteamBannerLockupLayout(
  banner: ProjectCaseInsertSteamBanner,
  kind: CaseInsertSteamBannerTargetKind,
): ProjectCaseInsertSteamBanner {
  return {
    ...banner,
    lockupLayout: getDefaultCaseInsertSteamBannerLockupLayout(kind),
  }
}

export function setCaseInsertSteamBannerUseTextFallback(
  banner: ProjectCaseInsertSteamBanner,
  useTextFallback: boolean,
): ProjectCaseInsertSteamBanner {
  return {
    ...banner,
    useTextFallback,
  }
}

export function updateCaseInsertSteamBannerFallbackText(
  banner: ProjectCaseInsertSteamBanner,
  fallbackText: string,
): ProjectCaseInsertSteamBanner {
  return {
    ...banner,
    fallbackText,
  }
}

export function setCustomCaseInsertSteamBannerLockupImage(
  banner: ProjectCaseInsertSteamBanner,
  image: {
    imageDataUrl: string
    imageSize: BackgroundImageSize
    imageSource?: Partial<ProjectImageAssetProvenance> | null
  },
  kind: CaseInsertSteamBannerTargetKind = 'cover',
): ProjectCaseInsertSteamBanner {
  return {
    ...banner,
    lockupImageDataUrl: image.imageDataUrl,
    lockupImageSize: image.imageSize,
    lockupImageSource: normalizeProjectImageAssetProvenance(
      image.imageSource,
      createEmbeddedProjectImageAssetProvenance(
        getCustomSteamBannerLockupSourceLabel(
          getCaseInsertSteamBannerLockupImageKind(kind),
        ),
      ),
    ),
    useTextFallback: false,
  }
}

export function resetCaseInsertSteamBannerLockupImage(
  banner: ProjectCaseInsertSteamBanner,
  kind: CaseInsertSteamBannerTargetKind,
): ProjectCaseInsertSteamBanner {
  return {
    ...banner,
    lockupImageDataUrl: getDefaultCaseInsertSteamBannerImageUrl(kind),
    lockupImageSource: createBuiltInCaseInsertSteamBannerSource(kind),
    lockupImageSize: getDefaultCaseInsertSteamBannerImageSize(kind),
  }
}

export function updateCaseInsertTemplateSteamBanner(
  state: ProjectJewelCaseState,
  paneId: CaseInsertTemplatePaneId,
  updater: (
    banner: ProjectCaseInsertSteamBanner,
  ) => ProjectCaseInsertSteamBanner,
): ProjectJewelCaseState {
  return {
    ...state,
    templates: {
      ...state.templates,
      [paneId]: {
        ...state.templates[paneId],
        steamBanner: updater(state.templates[paneId].steamBanner),
      },
    },
  }
}

export function updateJewelCaseSpineSteamBanner(
  state: ProjectJewelCaseState,
  side: JewelCaseSpineSide,
  updater: (
    banner: ProjectCaseInsertSteamBanner,
  ) => ProjectCaseInsertSteamBanner,
): ProjectJewelCaseState {
  return {
    ...state,
    spine: {
      ...state.spine,
      [side]: {
        ...state.spine[side],
        steamBanner: updater(state.spine[side].steamBanner),
      },
    },
  }
}
