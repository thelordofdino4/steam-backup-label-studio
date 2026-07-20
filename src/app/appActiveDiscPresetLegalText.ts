import type {
  DiscLegalTextPresetOwnerState,
  DiscPresetOwnerUpdate,
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

type LegalLayoutUpdate = Extract<
  DiscPresetOwnerUpdate,
  { kind: 'disc-text-layout' }
>

export type ActiveDiscPresetLegalTextResult = Readonly<{
  legalText: DiscLegalTextPresetOwnerState
  application: DiscPresetTargetedApplicationResult | null
}>

export function applyActiveDiscPresetToLegalTextState({
  presetState,
  selectedDiscTemplate,
  legalText,
  registry = DISC_PRESET_REGISTRY,
}: Readonly<{
  presetState: ActiveDiscPresetState | null
  selectedDiscTemplate: DiscTemplate
  legalText: DiscLegalTextPresetOwnerState
  registry?: DiscPresetRegistry
}>): ActiveDiscPresetLegalTextResult {
  if (!presetState) {
    return Object.freeze({ legalText, application: null })
  }

  const application = resolveDiscPresetPlacementForTarget({
    presetRef: presetState.ref,
    resolvedPreset: presetState.resolvedDefinition,
    registry,
    template: createDiscPresetTemplateResolutionInput(
      selectedDiscTemplate,
    ),
    target: 'legal.copyright',
    ownerState: {
      'legal.copyright': legalText,
    },
    adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
    services: DISC_PRESET_PRODUCTION_APPLICATION_SERVICES,
  })

  if (application.status !== 'applied' &&
      application.status !== 'partial') {
    return Object.freeze({ legalText, application })
  }

  const update = application.updates.find(
    (candidate): candidate is LegalLayoutUpdate =>
      candidate.kind === 'disc-text-layout' &&
      candidate.target === 'legal.copyright' &&
      candidate.key === 'copyright',
  )

  if (!update) {
    return Object.freeze({ legalText, application })
  }

  return Object.freeze({
    legalText: Object.freeze({
      ...legalText,
      layout: Object.freeze({
        ...legalText.layout,
        ...update.layout,
      }),
    }),
    application,
  })
}
