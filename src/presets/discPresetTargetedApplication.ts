import type { DiscGuidedSlotId } from '../guidedPresets/discGuidedSlots.ts'
import type {
  DiscPresetId,
  DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'
import type {
  DiscPresetApplicationServices,
} from './discPresetApplicationServices.ts'
import type {
  DiscPresetApplicationWarning,
} from './discPresetApplication.ts'
import type {
  DiscPresetOwnerStateCatalog,
  DiscPresetOwnerUpdate,
  DiscPresetPlacementAdapterRegistry,
} from './discPresetPlacementAdapters.ts'
import type {
  DiscPresetRegistry,
} from './discPresetRegistry.ts'
import {
  applyDiscPresetResolvedSlotPatches,
  resolveDiscPresetDefinition,
  type DiscPresetResolutionResult,
  type DiscPresetTemplateResolutionInput,
  type ResolvedDiscPresetDefinition,
} from './discPresetResolution.ts'

export type ActiveDiscPresetRef = Readonly<{
  id: DiscPresetId
  revision: number
}>

export type ActiveDiscPresetState = Readonly<{
  ref: ActiveDiscPresetRef
  resolvedDefinition: ResolvedDiscPresetDefinition
}>

export type DiscPresetTargetedApplicationResult =
  | Readonly<{
      status: 'applied' | 'partial'
      presetRef: ActiveDiscPresetRef
      resolvedPreset: ResolvedDiscPresetDefinition
      slotId: DiscGuidedSlotId
      target: DiscPresetPlacementTarget
      updates: readonly DiscPresetOwnerUpdate[]
      warnings: readonly DiscPresetApplicationWarning[]
    }>
  | Readonly<{
      status: 'skipped' | 'unsupported' | 'rejected'
      presetRef: ActiveDiscPresetRef
      slotId?: DiscGuidedSlotId
      target: DiscPresetPlacementTarget
      updates: readonly []
      warnings: readonly DiscPresetApplicationWarning[]
    }>

type ResolveDiscPresetPlacementForTargetInput = Readonly<{
  presetRef: ActiveDiscPresetRef
  registry: DiscPresetRegistry
  template: DiscPresetTemplateResolutionInput
  target: DiscPresetPlacementTarget
  ownerState?: DiscPresetOwnerStateCatalog
  adapterRegistry: DiscPresetPlacementAdapterRegistry
  services?: DiscPresetApplicationServices
  resolvedPreset?: ResolvedDiscPresetDefinition
}>

function freezeWarnings(
  warnings: readonly DiscPresetApplicationWarning[],
) {
  return Object.freeze(warnings.map((warning) => Object.freeze({ ...warning })))
}

function findTargetClaims(
  definition: NonNullable<ReturnType<DiscPresetRegistry['get']>>,
  target: DiscPresetPlacementTarget,
) {
  return definition.slots.flatMap((slot) =>
    slot.placements
      .filter((placement) => placement.target === target)
      .map((placement) => Object.freeze({ slotId: slot.id, placement })))
}

function getTargetResolutionWarnings(
  resolution: DiscPresetResolutionResult,
  slotId: DiscGuidedSlotId,
) {
  return resolution.warnings.filter((warning) =>
    !('slotId' in warning) || warning.slotId === slotId)
}

function isMatchingResolvedPreset(
  preset: ResolvedDiscPresetDefinition | undefined,
  presetRef: ActiveDiscPresetRef,
  template: DiscPresetTemplateResolutionInput,
): preset is ResolvedDiscPresetDefinition {
  return preset?.sourcePresetId === presetRef.id &&
    preset.sourceRevision === presetRef.revision &&
    preset.templateId === template.templateId
}

function refreshResolvedSlotFromCurrentResolution(
  activePreset: ResolvedDiscPresetDefinition,
  resolvedSlot: ResolvedDiscPresetDefinition['slots'][number],
): ResolvedDiscPresetDefinition {
  return Object.freeze({
    ...activePreset,
    slots: Object.freeze(activePreset.slots.map((slot) =>
      slot.id === resolvedSlot.id ? resolvedSlot : slot)),
  })
}

function targetedWithoutUpdates(
  status: 'skipped' | 'unsupported' | 'rejected',
  presetRef: ActiveDiscPresetRef,
  target: DiscPresetPlacementTarget,
  warnings: readonly DiscPresetApplicationWarning[],
  slotId?: DiscGuidedSlotId,
): DiscPresetTargetedApplicationResult {
  return Object.freeze({
    status,
    presetRef,
    ...(slotId === undefined ? {} : { slotId }),
    target,
    updates: Object.freeze([] as const),
    warnings: freezeWarnings(warnings),
  })
}

export function resolveDiscPresetPlacementForTarget({
  presetRef,
  registry,
  template,
  target,
  ownerState = {},
  adapterRegistry,
  services = {},
  resolvedPreset: activeResolvedPreset,
}: ResolveDiscPresetPlacementForTargetInput):
  DiscPresetTargetedApplicationResult {
  const definition = registry.get(presetRef.id, presetRef.revision)

  if (!definition) {
    const latestDefinition = registry.get(presetRef.id)
    return targetedWithoutUpdates(
      'rejected',
      presetRef,
      target,
      [latestDefinition
        ? {
            kind: 'preset-revision-not-found',
            presetId: presetRef.id,
            revision: presetRef.revision,
          }
        : {
            kind: 'preset-not-found',
            presetId: presetRef.id,
          }],
    )
  }

  const claims = findTargetClaims(definition, target)

  if (claims.length === 0) {
    return targetedWithoutUpdates(
      'skipped',
      presetRef,
      target,
      [{
        kind: 'placement-target-absent',
        presetId: presetRef.id,
        target,
      }],
    )
  }

  if (claims.length > 1) {
    return targetedWithoutUpdates(
      'rejected',
      presetRef,
      target,
      [{
        kind: 'ambiguous-placement-target',
        presetId: presetRef.id,
        target,
        slotIds: Object.freeze(claims.map(({ slotId }) => slotId)),
      }],
    )
  }

  const claim = claims[0]
  const resolution = resolveDiscPresetDefinition({ definition, template })
  const resolutionWarnings = getTargetResolutionWarnings(
    resolution,
    claim.slotId,
  )

  if (resolution.status === 'rejected') {
    return targetedWithoutUpdates(
      'rejected',
      presetRef,
      target,
      resolutionWarnings,
      claim.slotId,
    )
  }

  const slot = resolution.preset.slots.find(({ id }) => id === claim.slotId)

  if (!slot || slot.status === 'unsupported') {
    return targetedWithoutUpdates(
      'unsupported',
      presetRef,
      target,
      slot?.warnings ?? resolutionWarnings,
      claim.slotId,
    )
  }

  const placement = slot.placements.find((candidate) =>
    candidate.target === target)

  if (!placement) {
    return targetedWithoutUpdates(
      'unsupported',
      presetRef,
      target,
      resolutionWarnings,
      claim.slotId,
    )
  }

  const adapter = adapterRegistry.get(target)

  if (!adapter) {
    return targetedWithoutUpdates(
      'unsupported',
      presetRef,
      target,
      [...resolutionWarnings, {
        kind: 'missing-placement-adapter',
        slotId: slot.id,
        target,
      }],
      slot.id,
    )
  }

  if (!adapter.supportedIntentKinds.includes(placement.kind)) {
    return targetedWithoutUpdates(
      'unsupported',
      presetRef,
      target,
      [...resolutionWarnings, {
        kind: 'intent-target-mismatch',
        slotId: slot.id,
        target,
        intentKind: placement.kind,
      }],
      slot.id,
    )
  }

  const result = adapter.buildUpdate({
    slot,
    placement,
    ownerState: ownerState[target],
    services,
    template,
  })
  const warnings = freezeWarnings([
    ...resolutionWarnings,
    ...result.warnings,
  ])

  if (result.status === 'skipped' || result.status === 'unsupported') {
    return targetedWithoutUpdates(
      result.status,
      presetRef,
      target,
      warnings,
      slot.id,
    )
  }

  const baseResolvedPreset = isMatchingResolvedPreset(
    activeResolvedPreset,
    presetRef,
    template,
  )
    ? refreshResolvedSlotFromCurrentResolution(activeResolvedPreset, slot)
    : resolution.preset
  const patch = result.resolvedSlotPatch

  if (patch && patch.slotId !== slot.id) {
    return targetedWithoutUpdates(
      'unsupported',
      presetRef,
      target,
      [...warnings, {
        kind: 'resolved-slot-patch-rejected',
        slotId: slot.id,
        target,
        reason: 'slot-id-mismatch',
      }],
      slot.id,
    )
  }
  const finalResolvedPreset = patch
    ? applyDiscPresetResolvedSlotPatches(baseResolvedPreset, [patch])
    : baseResolvedPreset

  return Object.freeze({
    status: result.status,
    presetRef,
    resolvedPreset: finalResolvedPreset,
    slotId: slot.id,
    target,
    updates: Object.freeze(result.updates.map((update) =>
      Object.freeze({ ...update }))),
    warnings,
  })
}
