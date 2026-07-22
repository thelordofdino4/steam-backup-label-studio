import type {
  DiscPresetOwnerPlacementContext,
  DiscPresetOwnerPlacementResult,
  DiscPresetPlacementAdapter,
} from '../discPresetPlacementAdapters.ts'

function unsupportedBackgroundPlacement(
  context: DiscPresetOwnerPlacementContext<'background.primary'>,
  reason:
    | 'owner-state-unavailable'
    | 'owner-state-unsupported'
    | 'invalid-scale'
    | 'non-centered-background-region',
): DiscPresetOwnerPlacementResult {
  return Object.freeze({
    status: 'unsupported',
    updates: Object.freeze([] as const),
    warnings: Object.freeze([Object.freeze({
      kind: 'placement-unsupported',
      slotId: context.slot.id,
      target: context.placement.target,
      reason,
    })] as const),
  })
}

function hasBackgroundOwnerState(
  value: unknown,
): value is NonNullable<
  DiscPresetOwnerPlacementContext<'background.primary'>['ownerState']
> {
  if (typeof value !== 'object' || value === null) return false

  const state = value as Record<string, unknown>
  const offset = state.offset as Record<string, unknown> | null
  return typeof state.enabled === 'boolean' &&
    (state.imageDataUrl === null || typeof state.imageDataUrl === 'string') &&
    Number.isFinite(state.scale) &&
    typeof offset === 'object' &&
    offset !== null &&
    Number.isFinite(offset.x) &&
    Number.isFinite(offset.y)
}

export const DISC_BACKGROUND_PRESET_ADAPTER:
  DiscPresetPlacementAdapter<'background.primary'> = Object.freeze({
    target: 'background.primary',
    supportedIntentKinds: Object.freeze(['background'] as const),
    buildUpdate(
      context: DiscPresetOwnerPlacementContext<'background.primary'>,
    ): DiscPresetOwnerPlacementResult {
      if (context.ownerState === undefined) {
        return unsupportedBackgroundPlacement(
          context,
          'owner-state-unavailable',
        )
      }

      if (!hasBackgroundOwnerState(context.ownerState)) {
        return unsupportedBackgroundPlacement(
          context,
          'owner-state-unsupported',
        )
      }

      if (!Number.isFinite(context.placement.scale) ||
          context.placement.scale <= 0) {
        return unsupportedBackgroundPlacement(context, 'invalid-scale')
      }

      const region = context.slot.resolvedContentRegion
      if (region.centerXPercent !== 50 || region.centerYPercent !== 50) {
        return unsupportedBackgroundPlacement(
          context,
          'non-centered-background-region',
        )
      }

      const update = Object.freeze({
        kind: 'background-layout' as const,
        slotId: context.slot.id,
        target: 'background.primary' as const,
        layout: Object.freeze({
          scale: context.placement.scale,
          offset: Object.freeze({ x: 0, y: 0 }),
        }),
      })

      return Object.freeze({
        status: 'applied',
        updates: Object.freeze([update]),
        warnings: Object.freeze([]),
      })
    },
  })
