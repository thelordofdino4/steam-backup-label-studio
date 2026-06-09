import type {
  DiscTextLayoutSettings,
  DiscTextSettings,
  DiscTextValues,
} from './index.ts'
import { getDiscTextContent } from './index.ts'
import {
  DISC_NUMBER_BADGE_IMAGE_URLS,
  getDiscNumberBadgeImageSize,
} from '../assets/assetManifest.ts'
import type {
  BackgroundImageSize,
  ProjectDiscNumberArtwork,
} from '../project/projectTypes.ts'

export type DiscNumberArtworkMode = ProjectDiscNumberArtwork['mode']
export type DiscNumberBadgeSet = ProjectDiscNumberArtwork['badgeSet']

export type DiscNumberBadgeSetOption = {
  value: DiscNumberBadgeSet
  label: string
}

export type DiscNumberBadgeRenderModel = {
  imageDataUrl: string
  imageSize: BackgroundImageSize
  text: string
  label: string
  layout: DiscTextLayoutSettings['discNumber']
  widthPercent: number
  heightPercent: number
}

export const DISC_NUMBER_BADGE_SET_OPTIONS: readonly DiscNumberBadgeSetOption[] = [
  { value: 'starterRing', label: 'Starter ring badge' },
]

export const DISC_NUMBER_BADGE_WIDTH_PERCENT = 18
export const DISC_NUMBER_BADGE_HEIGHT_PERCENT = 9.6

export function createDefaultProjectDiscNumberArtwork(): ProjectDiscNumberArtwork {
  return {
    mode: 'text',
    badgeSet: 'starterRing',
  }
}

export function normalizeProjectDiscNumberArtwork(
  discNumberArtwork: Partial<ProjectDiscNumberArtwork> | undefined,
): ProjectDiscNumberArtwork {
  return {
    mode: discNumberArtwork?.mode === 'badge' ? 'badge' : 'text',
    badgeSet:
      discNumberArtwork?.badgeSet === 'starterRing'
        ? 'starterRing'
        : 'starterRing',
  }
}

export function updateDiscNumberArtworkMode(
  discNumberArtwork: ProjectDiscNumberArtwork,
  mode: DiscNumberArtworkMode,
): ProjectDiscNumberArtwork {
  return {
    ...discNumberArtwork,
    mode,
  }
}

export function updateDiscNumberArtworkBadgeSet(
  discNumberArtwork: ProjectDiscNumberArtwork,
  badgeSet: DiscNumberBadgeSet,
): ProjectDiscNumberArtwork {
  return {
    ...discNumberArtwork,
    badgeSet,
  }
}

export function getEffectiveDiscTextSettingsForDiscNumberArtwork(
  settings: DiscTextSettings,
  discNumberArtwork: ProjectDiscNumberArtwork,
): DiscTextSettings {
  if (discNumberArtwork.mode !== 'badge') {
    return settings
  }

  return {
    ...settings,
    discNumber: false,
  }
}

export function createDiscNumberBadgeRenderModel(
  discNumberArtwork: ProjectDiscNumberArtwork,
  settings: DiscTextSettings,
  values: DiscTextValues,
  layoutSettings: DiscTextLayoutSettings,
): DiscNumberBadgeRenderModel | null {
  if (discNumberArtwork.mode !== 'badge' || !settings.discNumber) {
    return null
  }

  const text = getDiscTextContent('discNumber', values, '').trim()

  if (!text) {
    return null
  }

  return {
    imageDataUrl: DISC_NUMBER_BADGE_IMAGE_URLS[discNumberArtwork.badgeSet],
    imageSize: getDiscNumberBadgeImageSize(discNumberArtwork.badgeSet),
    text,
    label: DISC_NUMBER_BADGE_SET_OPTIONS.find(
      (option) => option.value === discNumberArtwork.badgeSet,
    )?.label ?? 'Starter ring badge',
    layout: layoutSettings.discNumber,
    widthPercent: DISC_NUMBER_BADGE_WIDTH_PERCENT,
    heightPercent: DISC_NUMBER_BADGE_HEIGHT_PERCENT,
  }
}
