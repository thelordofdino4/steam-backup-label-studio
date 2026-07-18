import type { DiscGuidedSlotId } from '../guidedPresets/discGuidedSlots.ts'
import {
  DISC_PRESET_PLACEMENT_TARGETS,
  type DiscPresetPlacementIntentV1,
  type DiscPresetPlacementTarget,
} from './discPresetDefinition.ts'
import type {
  DiscPresetTemplateResolutionInput,
  ResolvedDiscPresetSlot,
} from './discPresetResolution.ts'

export type DiscPresetOwnerFamily =
  | 'title-artwork'
  | 'disc-text'
  | 'background'
  | 'rating'
  | 'media-format'
  | 'platform-marks'
  | 'logo-assets'

export const DISC_PRESET_OWNER_FAMILY_BY_TARGET = Object.freeze({
  'game-title.artwork': 'title-artwork',
  'game-title.text': 'disc-text',
  'background.primary': 'background',
  'rating.primary': 'rating',
  'media-format.primary': 'media-format',
  'operating-system-marks.enabled': 'platform-marks',
  'developer-logo.primary': 'logo-assets',
  'publisher-logo.primary': 'logo-assets',
  'legal.copyright': 'disc-text',
} as const satisfies Readonly<
  Record<DiscPresetPlacementTarget, DiscPresetOwnerFamily>
>)

export type DiscPresetOwnerStateCatalog = Readonly<
  Partial<Record<DiscPresetPlacementTarget, unknown>>
>

export type DiscPresetOwnerUpdate = Readonly<{
  kind: 'semantic-placement'
  owner: DiscPresetOwnerFamily
  slotId: DiscGuidedSlotId
  target: DiscPresetPlacementTarget
}>

export type DiscPresetAdapterWarningReason =
  | 'owner-state-unavailable'
  | 'placement-not-applicable'
  | 'placement-impossible'
  | 'owner-state-unsupported'

export type DiscPresetAdapterWarning = Readonly<{
  kind: 'placement-skipped' | 'placement-unsupported'
  slotId: DiscGuidedSlotId
  target: DiscPresetPlacementTarget
  reason: DiscPresetAdapterWarningReason
}>

export type DiscPresetOwnerPlacementContext<
  TTarget extends DiscPresetPlacementTarget = DiscPresetPlacementTarget,
> = Readonly<{
  slot: ResolvedDiscPresetSlot
  placement: Extract<DiscPresetPlacementIntentV1, { target: TTarget }>
  ownerState: unknown
  template: DiscPresetTemplateResolutionInput
}>

type NonEmptyAdapterWarnings = readonly [
  DiscPresetAdapterWarning,
  ...DiscPresetAdapterWarning[],
]

export type DiscPresetOwnerPlacementResult =
  | Readonly<{
      status: 'applied'
      updates: readonly DiscPresetOwnerUpdate[]
      warnings: readonly DiscPresetAdapterWarning[]
    }>
  | Readonly<{
      status: 'skipped' | 'unsupported'
      updates: readonly []
      warnings: NonEmptyAdapterWarnings
    }>

export type DiscPresetPlacementAdapter<
  TTarget extends DiscPresetPlacementTarget = DiscPresetPlacementTarget,
> = Readonly<{
  target: TTarget
  supportedIntentKinds: readonly DiscPresetPlacementIntentV1['kind'][]
  buildUpdate: (
    context: DiscPresetOwnerPlacementContext<TTarget>,
  ) => DiscPresetOwnerPlacementResult
}>

export interface DiscPresetPlacementAdapterRegistry {
  get(target: DiscPresetPlacementTarget): DiscPresetPlacementAdapter | null
  has(target: DiscPresetPlacementTarget): boolean
  listTargets(): readonly DiscPresetPlacementTarget[]
  listMissingTargets(): readonly DiscPresetPlacementTarget[]
}

export type DiscPresetPlacementAdapterRegistryCreateResult =
  | Readonly<{
      ok: true
      registry: DiscPresetPlacementAdapterRegistry
    }>
  | Readonly<{
      ok: false
      error: Readonly<{
        code: 'duplicate-target'
        target: DiscPresetPlacementTarget
      }>
    }>

export function createDiscPresetPlacementAdapterRegistry(
  adapters: readonly DiscPresetPlacementAdapter[],
): DiscPresetPlacementAdapterRegistryCreateResult {
  const registrations: DiscPresetPlacementAdapter[] = []
  const adaptersByTarget = new Map<
    DiscPresetPlacementTarget,
    DiscPresetPlacementAdapter
  >()

  for (const adapter of adapters) {
    if (adaptersByTarget.has(adapter.target)) {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: 'duplicate-target',
          target: adapter.target,
        }),
      })
    }

    const frozenAdapter = Object.freeze({
      ...adapter,
      supportedIntentKinds: Object.freeze([...adapter.supportedIntentKinds]),
    })
    registrations.push(frozenAdapter)
    adaptersByTarget.set(adapter.target, frozenAdapter)
  }

  const targets = Object.freeze(registrations.map(({ target }) => target))
  const missingTargets = Object.freeze(
    DISC_PRESET_PLACEMENT_TARGETS.filter(
      (target) => !adaptersByTarget.has(target),
    ),
  )
  const registry: DiscPresetPlacementAdapterRegistry = Object.freeze({
    get(target: DiscPresetPlacementTarget) {
      return adaptersByTarget.get(target) ?? null
    },
    has(target: DiscPresetPlacementTarget) {
      return adaptersByTarget.has(target)
    },
    listTargets() {
      return targets
    },
    listMissingTargets() {
      return missingTargets
    },
  })

  return Object.freeze({ ok: true, registry })
}
