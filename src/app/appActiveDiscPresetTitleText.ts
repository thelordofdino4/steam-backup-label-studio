import type {
  DiscPresetOwnerUpdate,
  DiscTitleTextPresetOwnerState,
} from '../presets/discPresetOwnerPlacement.ts'
import {
  DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
} from '../presets/discPresetProductionAdapterRegistry.ts'
import {
  DISC_PRESET_REGISTRY,
  type DiscPresetRegistry,
} from '../presets/discPresetRegistry.ts'
import {
  createDiscPresetTemplateResolutionInput,
} from '../presets/discPresetResolution.ts'
import {
  resolveDiscPresetPlacementForTarget,
  type ActiveDiscPresetState,
  type DiscPresetTargetedApplicationResult,
} from '../presets/discPresetTargetedApplication.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  DISC_PRESET_PRODUCTION_APPLICATION_SERVICES,
} from './appDiscPresetMeasurementService.ts'

type TitleTextLayoutUpdate = Extract<
  DiscPresetOwnerUpdate,
  { kind: 'disc-text-layout' }
>

export type ActiveDiscPresetTitleTextResult = Readonly<{
  titleText: DiscTitleTextPresetOwnerState
  application: DiscPresetTargetedApplicationResult | null
}>

export const ACTIVE_DISC_PRESET_TITLE_FIT_IMPOSSIBLE_MESSAGE =
  'Could not fit the game title inside the active layout. Shorten the title or reduce rich-text sizing; the content remains editable.'

export function hasDiscPresetTitleFitImpossibleWarning(
  warnings: readonly Readonly<{
    kind: string
    target?: string
  }>[],
) {
  return warnings.some(({ kind, target }) =>
    kind === 'text-fit-impossible' && target === 'game-title.text')
}

export function isActiveDiscPresetTitleFitImpossible(
  application: DiscPresetTargetedApplicationResult | null,
) {
  return application
    ? hasDiscPresetTitleFitImpossibleWarning(application.warnings)
    : false
}

export function applyActiveDiscPresetToTitleTextState({
  presetState,
  selectedDiscTemplate,
  titleText,
  registry = DISC_PRESET_REGISTRY,
}: Readonly<{
  presetState: ActiveDiscPresetState | null
  selectedDiscTemplate: DiscTemplate
  titleText: DiscTitleTextPresetOwnerState
  registry?: DiscPresetRegistry
}>): ActiveDiscPresetTitleTextResult {
  if (!presetState) {
    return Object.freeze({ titleText, application: null })
  }

  const application = resolveDiscPresetPlacementForTarget({
    presetRef: presetState.ref,
    resolvedPreset: presetState.resolvedDefinition,
    registry,
    template: createDiscPresetTemplateResolutionInput(
      selectedDiscTemplate,
    ),
    target: 'game-title.text',
    ownerState: {
      'game-title.text': titleText,
    },
    adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
    services: DISC_PRESET_PRODUCTION_APPLICATION_SERVICES,
  })

  if (application.status !== 'applied' &&
      application.status !== 'partial') {
    return Object.freeze({ titleText, application })
  }

  const update = application.updates.find(
    (candidate): candidate is TitleTextLayoutUpdate =>
      candidate.kind === 'disc-text-layout' &&
      candidate.target === 'game-title.text' &&
      candidate.key === 'title',
  )

  if (!update) {
    return Object.freeze({ titleText, application })
  }

  return Object.freeze({
    titleText: Object.freeze({
      ...titleText,
      layout: Object.freeze({
        ...titleText.layout,
        ...update.layout,
      }),
    }),
    application,
  })
}
