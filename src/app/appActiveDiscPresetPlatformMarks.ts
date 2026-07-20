import {
  resolveDiscPresetPlacementForTarget,
  type ActiveDiscPresetState,
  type ActiveDiscPresetRef,
  type DiscPresetTargetedApplicationResult,
} from '../presets/discPresetTargetedApplication.ts'
import type {
  DiscPresetOwnerUpdate,
} from '../presets/discPresetPlacementAdapters.ts'
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
  getProjectPlatformMarkAsset,
} from '../project/projectPlatformMarks.ts'
import type {
  ProjectPlatformMarks,
} from '../project/projectTypes.ts'
import type {
  DiscTemplate,
} from '../types/template.ts'

type PlatformMarkLayoutUpdate = Extract<
  DiscPresetOwnerUpdate,
  { kind: 'platform-mark-layout' }
>

export type ActiveDiscPresetPlatformMarksResult = Readonly<{
  platformMarks: ProjectPlatformMarks
  application: DiscPresetTargetedApplicationResult | null
}>

type ApplyActiveDiscPresetToPlatformMarkStateInput = Readonly<{
  presetState?: ActiveDiscPresetState | null
  presetRef?: ActiveDiscPresetRef | null
  selectedDiscTemplate: DiscTemplate
  platformMarks: ProjectPlatformMarks
  registry?: DiscPresetRegistry
}>

function applyPlatformMarkLayoutUpdates(
  platformMarks: ProjectPlatformMarks,
  updates: readonly PlatformMarkLayoutUpdate[],
  selectedDiscTemplate: DiscTemplate,
): ProjectPlatformMarks {
  if (updates.length === 0) return platformMarks

  const assets = { ...platformMarks.assets }

  for (const update of updates) {
    const asset = getProjectPlatformMarkAsset(
      platformMarks,
      update.markId,
      selectedDiscTemplate,
    )
    assets[update.markId] = {
      ...asset,
      layout: {
        ...asset.layout,
        x: update.layout.x,
        y: update.layout.y,
        scale: update.layout.scale,
      },
    }
  }

  return {
    ...platformMarks,
    assets,
  }
}

export function applyActiveDiscPresetToPlatformMarkState({
  presetState,
  presetRef,
  selectedDiscTemplate,
  platformMarks,
  registry = DISC_PRESET_REGISTRY,
}: ApplyActiveDiscPresetToPlatformMarkStateInput):
  ActiveDiscPresetPlatformMarksResult {
  const resolvedPresetRef = presetState?.ref ?? presetRef ?? null

  if (!resolvedPresetRef) {
    return Object.freeze({ platformMarks, application: null })
  }

  const template = createDiscPresetTemplateResolutionInput(
    selectedDiscTemplate,
  )
  const application = resolveDiscPresetPlacementForTarget({
    presetRef: resolvedPresetRef,
    resolvedPreset: presetState?.resolvedDefinition,
    registry,
    template,
    target: 'operating-system-marks.enabled',
    ownerState: {
      'operating-system-marks.enabled': {
        platformMarks,
        template: selectedDiscTemplate,
      },
    },
    adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
  })

  if (application.status !== 'applied') {
    return Object.freeze({ platformMarks, application })
  }

  const updates = application.updates.filter(
    (update): update is PlatformMarkLayoutUpdate =>
      update.kind === 'platform-mark-layout',
  )

  return Object.freeze({
    platformMarks: applyPlatformMarkLayoutUpdates(
      platformMarks,
      updates,
      selectedDiscTemplate,
    ),
    application,
  })
}
