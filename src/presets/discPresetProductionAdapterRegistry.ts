import {
  DISC_BACKGROUND_PRESET_ADAPTER,
} from './adapters/discBackgroundPresetAdapter.ts'
import {
  DISC_DEVELOPER_LOGO_PRESET_ADAPTER,
  DISC_MEDIA_MARK_PRESET_ADAPTER,
  DISC_PUBLISHER_LOGO_PRESET_ADAPTER,
  DISC_RATING_PRESET_ADAPTER,
  DISC_TITLE_ARTWORK_PRESET_ADAPTER,
} from './adapters/discPointPresetAdapters.ts'
import {
  DISC_GAME_TITLE_TEXT_PRESET_ADAPTER,
  DISC_LEGAL_TEXT_PRESET_ADAPTER,
} from './adapters/discTextPresetAdapters.ts'
import {
  DISC_PLATFORM_MARKS_PRESET_ADAPTER,
} from './adapters/discPlatformMarksPresetAdapter.ts'
import type {
  DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'
import {
  createDiscPresetPlacementAdapterRegistry,
} from './discPresetPlacementAdapters.ts'

export type ImplementedDiscPresetPlacementTarget =
  DiscPresetPlacementTarget

export const IMPLEMENTED_DISC_PRESET_PLACEMENT_TARGETS = Object.freeze([
  'game-title.artwork',
  'game-title.text',
  'background.primary',
  'rating.primary',
  'media-format.primary',
  'operating-system-marks.enabled',
  'developer-logo.primary',
  'publisher-logo.primary',
  'legal.copyright',
] as const satisfies readonly ImplementedDiscPresetPlacementTarget[])

export const IMPLEMENTED_DISC_PRESET_TARGET_COVERAGE = Object.freeze({
  'game-title.artwork': true,
  'game-title.text': true,
  'background.primary': true,
  'rating.primary': true,
  'media-format.primary': true,
  'operating-system-marks.enabled': true,
  'developer-logo.primary': true,
  'publisher-logo.primary': true,
  'legal.copyright': true,
} as const satisfies Readonly<Record<
  ImplementedDiscPresetPlacementTarget,
  true
>>)

export const DISC_PRESET_PRODUCTION_ADAPTERS = Object.freeze([
  DISC_TITLE_ARTWORK_PRESET_ADAPTER,
  DISC_GAME_TITLE_TEXT_PRESET_ADAPTER,
  DISC_BACKGROUND_PRESET_ADAPTER,
  DISC_RATING_PRESET_ADAPTER,
  DISC_MEDIA_MARK_PRESET_ADAPTER,
  DISC_PLATFORM_MARKS_PRESET_ADAPTER,
  DISC_DEVELOPER_LOGO_PRESET_ADAPTER,
  DISC_PUBLISHER_LOGO_PRESET_ADAPTER,
  DISC_LEGAL_TEXT_PRESET_ADAPTER,
] as const)

const registryResult = createDiscPresetPlacementAdapterRegistry(
  DISC_PRESET_PRODUCTION_ADAPTERS,
)

if (!registryResult.ok) {
  throw new Error(
    `Duplicate Disc preset production adapter: ${registryResult.error.target}`,
  )
}

export const DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY =
  registryResult.registry
