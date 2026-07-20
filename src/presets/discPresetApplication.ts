import type { DiscGuidedSlotId } from '../guidedPresets/discGuidedSlots.ts'
import type {
  DiscPresetId,
  DiscPresetPlacementIntentV1,
  DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'
import type {
  DiscPresetApplicationServices,
} from './discPresetApplicationServices.ts'
import type {
  DiscPresetAdapterWarning,
  DiscPresetOwnerStateCatalog,
  DiscPresetOwnerUpdate,
  DiscPresetPlacementAdapter,
  DiscPresetPlacementAdapterRegistry,
} from './discPresetPlacementAdapters.ts'
import type {
  DiscPresetResolvedSlotPatch,
  DiscPresetResolutionResult,
  DiscPresetResolutionWarning,
  DiscPresetTemplateResolutionInput,
  ResolvedDiscPresetDefinition,
  ResolvedDiscPresetSlot,
} from './discPresetResolution.ts'
import {
  applyDiscPresetResolvedSlotPatches,
} from './discPresetResolution.ts'

export type DiscPresetApplicationStatus =
  | 'applied'
  | 'partial'
  | 'rejected'

export type DiscPresetApplicationWarning =
  | DiscPresetResolutionWarning
  | DiscPresetAdapterWarning
  | Readonly<{
      kind: 'missing-placement-adapter'
      slotId: DiscGuidedSlotId
      target: DiscPresetPlacementTarget
    }>
  | Readonly<{
      kind: 'intent-target-mismatch'
      slotId: DiscGuidedSlotId
      target: DiscPresetPlacementTarget
      intentKind: DiscPresetPlacementIntentV1['kind']
    }>
  | Readonly<{
      kind: 'preset-not-found'
      presetId: DiscPresetId
    }>
  | Readonly<{
      kind: 'preset-revision-not-found'
      presetId: DiscPresetId
      revision: number
    }>
  | Readonly<{
      kind: 'placement-target-absent'
      presetId: DiscPresetId
      target: DiscPresetPlacementTarget
    }>
  | Readonly<{
      kind: 'ambiguous-placement-target'
      presetId: DiscPresetId
      target: DiscPresetPlacementTarget
      slotIds: readonly DiscGuidedSlotId[]
    }>
  | Readonly<{
      kind: 'resolved-slot-patch-rejected'
      slotId: DiscGuidedSlotId
      target: DiscPresetPlacementTarget
      reason: 'slot-id-mismatch' | 'multiple-slot-patches'
    }>

export type DiscPresetApplicationResult = Readonly<{
  status: DiscPresetApplicationStatus
  resolvedPreset: ResolvedDiscPresetDefinition | null
  updates: readonly DiscPresetOwnerUpdate[]
  warnings: readonly DiscPresetApplicationWarning[]
}>

type BuildDiscPresetApplicationPlanInput = Readonly<{
  resolution: DiscPresetResolutionResult
  adapterRegistry: DiscPresetPlacementAdapterRegistry
  ownerState?: DiscPresetOwnerStateCatalog
  services?: DiscPresetApplicationServices
  template: DiscPresetTemplateResolutionInput
}>

function isIntentSupported(
  adapter: DiscPresetPlacementAdapter,
  placement: DiscPresetPlacementIntentV1,
) {
  return adapter.supportedIntentKinds.includes(placement.kind)
}

function invokeAdapter(
  adapter: DiscPresetPlacementAdapter,
  slot: ResolvedDiscPresetSlot,
  placement: DiscPresetPlacementIntentV1,
  ownerState: DiscPresetOwnerStateCatalog,
  services: DiscPresetApplicationServices,
  template: DiscPresetTemplateResolutionInput,
) {
  return adapter.buildUpdate({
    slot,
    placement,
    ownerState: ownerState[placement.target],
    services,
    template,
  })
}

export function buildDiscPresetApplicationPlan({
  resolution,
  adapterRegistry,
  ownerState = {},
  services = {},
  template,
}: BuildDiscPresetApplicationPlanInput): DiscPresetApplicationResult {
  if (resolution.status === 'rejected') {
    return Object.freeze({
      status: 'rejected',
      resolvedPreset: null,
      updates: Object.freeze([]),
      warnings: resolution.warnings,
    })
  }

  const updates: DiscPresetOwnerUpdate[] = []
  const warnings: DiscPresetApplicationWarning[] = [...resolution.warnings]
  const slotPatches = new Map<DiscGuidedSlotId, DiscPresetResolvedSlotPatch>()
  const conflictedSlotIds = new Set<DiscGuidedSlotId>()
  let partial = resolution.status === 'partial'

  for (const slot of resolution.preset.slots) {
    if (slot.status === 'unsupported') continue

    for (const placement of slot.placements) {
      const adapter = adapterRegistry.get(placement.target)

      if (!adapter) {
        warnings.push(Object.freeze({
          kind: 'missing-placement-adapter',
          slotId: slot.id,
          target: placement.target,
        }))
        partial = true
        continue
      }

      if (!isIntentSupported(adapter, placement)) {
        warnings.push(Object.freeze({
          kind: 'intent-target-mismatch',
          slotId: slot.id,
          target: placement.target,
          intentKind: placement.kind,
        }))
        partial = true
        continue
      }

      const result = invokeAdapter(
        adapter,
        slot,
        placement,
        ownerState,
        services,
        template,
      )
      updates.push(...result.updates.map((update) =>
        Object.freeze({ ...update })))
      warnings.push(...result.warnings.map((warning) =>
        Object.freeze({ ...warning })))

      if (result.resolvedSlotPatch) {
        const patch = result.resolvedSlotPatch

        if (patch.slotId !== slot.id) {
          warnings.push(Object.freeze({
            kind: 'resolved-slot-patch-rejected',
            slotId: slot.id,
            target: placement.target,
            reason: 'slot-id-mismatch',
          }))
          partial = true
        } else if (
          slotPatches.has(slot.id) ||
          conflictedSlotIds.has(slot.id)
        ) {
          slotPatches.delete(slot.id)
          conflictedSlotIds.add(slot.id)
          warnings.push(Object.freeze({
            kind: 'resolved-slot-patch-rejected',
            slotId: slot.id,
            target: placement.target,
            reason: 'multiple-slot-patches',
          }))
          partial = true
        } else {
          slotPatches.set(slot.id, patch)
        }
      }

      if (result.status === 'partial' || result.status === 'unsupported') {
        partial = true
      }
    }
  }

  return Object.freeze({
    status: partial ? 'partial' : 'applied',
    resolvedPreset: applyDiscPresetResolvedSlotPatches(
      resolution.preset,
      [...slotPatches.values()],
    ),
    updates: Object.freeze(updates),
    warnings: Object.freeze(warnings),
  })
}
