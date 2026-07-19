import type { DiscGuidedSlotId } from '../guidedPresets/discGuidedSlots.ts'
import type {
  DiscPresetPlacementIntentV1,
  DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'
import type {
  DiscPresetAdapterWarning,
  DiscPresetOwnerStateCatalog,
  DiscPresetOwnerUpdate,
  DiscPresetPlacementAdapter,
  DiscPresetPlacementAdapterRegistry,
} from './discPresetPlacementAdapters.ts'
import type {
  DiscPresetResolutionResult,
  DiscPresetResolutionWarning,
  DiscPresetTemplateResolutionInput,
  ResolvedDiscPresetDefinition,
  ResolvedDiscPresetSlot,
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
  template: DiscPresetTemplateResolutionInput,
) {
  return adapter.buildUpdate({
    slot,
    placement,
    ownerState: ownerState[placement.target],
    template,
  })
}

export function buildDiscPresetApplicationPlan({
  resolution,
  adapterRegistry,
  ownerState = {},
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
        template,
      )
      updates.push(...result.updates.map((update) =>
        Object.freeze({ ...update })))
      warnings.push(...result.warnings.map((warning) =>
        Object.freeze({ ...warning })))

      if (result.status === 'partial' || result.status === 'unsupported') {
        partial = true
      }
    }
  }

  return Object.freeze({
    status: partial ? 'partial' : 'applied',
    resolvedPreset: resolution.preset,
    updates: Object.freeze(updates),
    warnings: Object.freeze(warnings),
  })
}
