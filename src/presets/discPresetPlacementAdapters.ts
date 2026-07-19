import {
  DISC_PRESET_PLACEMENT_TARGETS,
  type DiscBackgroundPlacementIntentV1,
  type DiscGroupPlacementIntentV1,
  type DiscPointPlacementIntentV1,
  type DiscPointPresetTarget,
  type DiscPresetPlacementIntentV1,
  type DiscPresetPlacementTarget,
  type DiscTextPlacementIntentV1,
  type DiscTextPresetTarget,
} from './discPresetDefinition.ts'
import type {
  DiscPresetFocusedOwnerState,
  DiscPresetOwnerUpdate,
} from './discPresetOwnerPlacement.ts'
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

export type {
  DiscPresetOwnerStateCatalog,
  DiscPresetOwnerUpdate,
} from './discPresetOwnerPlacement.ts'

export type DiscPresetAdapterWarningReason =
  | 'owner-state-unavailable'
  | 'placement-not-applicable'
  | 'placement-impossible'
  | 'owner-state-unsupported'
  | 'invalid-scale'
  | 'unsupported-size-policy'
  | 'unsupported-text-mode'
  | 'non-centered-background-region'

export type DiscPresetAdapterWarning =
  | Readonly<{
      kind: 'placement-skipped' | 'placement-unsupported'
      slotId: import('../guidedPresets/discGuidedSlots.ts').DiscGuidedSlotId
      target: DiscPresetPlacementTarget
      reason: DiscPresetAdapterWarningReason
    }>
  | Readonly<{
      kind: 'content-measurement-required'
      slotId: 'disc:guided:legal-text:copyright'
      target: 'legal.copyright'
    }>

type DiscPresetPlacementIntentForTarget<
  TTarget extends DiscPresetPlacementTarget,
> = TTarget extends DiscPointPresetTarget
  ? DiscPointPlacementIntentV1 & Readonly<{ target: TTarget }>
  : TTarget extends DiscTextPresetTarget
    ? DiscTextPlacementIntentV1 & Readonly<{ target: TTarget }>
    : TTarget extends 'background.primary'
      ? DiscBackgroundPlacementIntentV1
      : TTarget extends 'operating-system-marks.enabled'
        ? DiscGroupPlacementIntentV1
        : never

export type DiscPresetOwnerPlacementContext<
  TTarget extends DiscPresetPlacementTarget = DiscPresetPlacementTarget,
> = Readonly<{
  slot: ResolvedDiscPresetSlot
  placement: DiscPresetPlacementIntentForTarget<TTarget>
  ownerState: DiscPresetFocusedOwnerState<TTarget> | undefined
  template: DiscPresetTemplateResolutionInput
}>

type NonEmptyAdapterWarnings = readonly [
  DiscPresetAdapterWarning,
  ...DiscPresetAdapterWarning[],
]

export type DiscPresetOwnerPlacementResult =
  | Readonly<{
      status: 'applied' | 'partial'
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

export type AnyDiscPresetPlacementAdapter = {
  [TTarget in DiscPresetPlacementTarget]:
    DiscPresetPlacementAdapter<TTarget>
}[DiscPresetPlacementTarget]

export interface DiscPresetPlacementAdapterRegistry {
  get<TTarget extends DiscPresetPlacementTarget>(
    target: TTarget,
  ): DiscPresetPlacementAdapter<TTarget> | null
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
  adapters: readonly AnyDiscPresetPlacementAdapter[],
): DiscPresetPlacementAdapterRegistryCreateResult {
  const registrations: AnyDiscPresetPlacementAdapter[] = []
  const adaptersByTarget = new Map<
    DiscPresetPlacementTarget,
    AnyDiscPresetPlacementAdapter
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
    get<TTarget extends DiscPresetPlacementTarget>(target: TTarget) {
      return (adaptersByTarget.get(target) as
        DiscPresetPlacementAdapter<TTarget> | undefined) ?? null
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
