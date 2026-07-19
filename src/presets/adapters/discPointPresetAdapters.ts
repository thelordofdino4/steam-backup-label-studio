import type { DiscGuidedSlotId } from '../../guidedPresets/discGuidedSlots.ts'
import type {
  DiscPointPresetTarget,
} from '../discPresetDefinition.ts'
import type {
  DiscMediaMarkLayoutPresetUpdate,
  DiscPresetOwnerUpdate,
  DiscPrimaryLogoLayoutPresetUpdate,
  DiscRatingLayoutPresetUpdate,
  DiscTitleArtworkLayoutPresetUpdate,
} from '../discPresetOwnerPlacement.ts'
import type {
  DiscPresetOwnerPlacementContext,
  DiscPresetOwnerPlacementResult,
  DiscPresetPlacementAdapter,
} from '../discPresetPlacementAdapters.ts'

type DiscPointLayoutPresetUpdate =
  | DiscTitleArtworkLayoutPresetUpdate
  | DiscRatingLayoutPresetUpdate
  | DiscMediaMarkLayoutPresetUpdate
  | DiscPrimaryLogoLayoutPresetUpdate

type CreatePointUpdate<TTarget extends DiscPointPresetTarget> = (
  slotId: DiscGuidedSlotId,
  layout: DiscPointLayoutPresetUpdate,
) => Extract<DiscPresetOwnerUpdate, { target: TTarget }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasPointLayout(value: unknown) {
  if (!isRecord(value) || !isRecord(value.layout)) return false

  return typeof value.layout.enabled === 'boolean' &&
    Number.isFinite(value.layout.x) &&
    Number.isFinite(value.layout.y) &&
    Number.isFinite(value.layout.scale)
}

function hasExpectedPointOwnerState(
  target: DiscPointPresetTarget,
  ownerState: unknown,
) {
  if (!hasPointLayout(ownerState)) return false

  if (target === 'developer-logo.primary') {
    return (ownerState as Record<string, unknown>).logoKey === 'developer'
  }

  if (target === 'publisher-logo.primary') {
    return (ownerState as Record<string, unknown>).logoKey === 'publisher'
  }

  return true
}

function unsupportedPointPlacement(
  context: DiscPresetOwnerPlacementContext<DiscPointPresetTarget>,
  reason:
    | 'owner-state-unavailable'
    | 'owner-state-unsupported'
    | 'invalid-scale'
    | 'unsupported-size-policy',
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

function createDiscPointPresetAdapter<
  TTarget extends DiscPointPresetTarget,
>(
  target: TTarget,
  createUpdate: CreatePointUpdate<TTarget>,
): DiscPresetPlacementAdapter<TTarget> {
  return Object.freeze({
    target,
    supportedIntentKinds: Object.freeze(['point'] as const),
    buildUpdate(
      context: DiscPresetOwnerPlacementContext<TTarget>,
    ): DiscPresetOwnerPlacementResult {
      if (context.ownerState === undefined) {
        return unsupportedPointPlacement(
          context as DiscPresetOwnerPlacementContext<DiscPointPresetTarget>,
          'owner-state-unavailable',
        )
      }

      if (!hasExpectedPointOwnerState(target, context.ownerState)) {
        return unsupportedPointPlacement(
          context as DiscPresetOwnerPlacementContext<DiscPointPresetTarget>,
          'owner-state-unsupported',
        )
      }

      if (context.placement.size.mode !== 'fixed-scale') {
        return unsupportedPointPlacement(
          context as DiscPresetOwnerPlacementContext<DiscPointPresetTarget>,
          'unsupported-size-policy',
        )
      }

      const scale = context.placement.size.scale
      if (!Number.isFinite(scale) || scale <= 0) {
        return unsupportedPointPlacement(
          context as DiscPresetOwnerPlacementContext<DiscPointPresetTarget>,
          'invalid-scale',
        )
      }

      const layout = Object.freeze({
        x: context.slot.resolvedContentRegion.centerXPercent,
        y: context.slot.resolvedContentRegion.centerYPercent,
        scale,
      })
      const update = Object.freeze(createUpdate(context.slot.id, layout))

      return Object.freeze({
        status: 'applied',
        updates: Object.freeze([update]),
        warnings: Object.freeze([]),
      })
    },
  })
}

export const DISC_TITLE_ARTWORK_PRESET_ADAPTER =
  createDiscPointPresetAdapter(
    'game-title.artwork',
    (slotId, layout) => ({
      kind: 'title-artwork-layout',
      slotId,
      target: 'game-title.artwork',
      layout,
    }),
  )

export const DISC_RATING_PRESET_ADAPTER =
  createDiscPointPresetAdapter(
    'rating.primary',
    (slotId, layout) => ({
      kind: 'rating-layout',
      slotId,
      target: 'rating.primary',
      layout,
    }),
  )

export const DISC_MEDIA_MARK_PRESET_ADAPTER =
  createDiscPointPresetAdapter(
    'media-format.primary',
    (slotId, layout) => ({
      kind: 'media-mark-layout',
      slotId,
      target: 'media-format.primary',
      layout,
    }),
  )

export const DISC_DEVELOPER_LOGO_PRESET_ADAPTER =
  createDiscPointPresetAdapter(
    'developer-logo.primary',
    (slotId, layout) => ({
      kind: 'primary-logo-layout',
      slotId,
      target: 'developer-logo.primary',
      logoKey: 'developer',
      layout,
    }),
  )

export const DISC_PUBLISHER_LOGO_PRESET_ADAPTER =
  createDiscPointPresetAdapter(
    'publisher-logo.primary',
    (slotId, layout) => ({
      kind: 'primary-logo-layout',
      slotId,
      target: 'publisher-logo.primary',
      logoKey: 'publisher',
      layout,
    }),
  )

export const DISC_POINT_PRESET_ADAPTERS = Object.freeze([
  DISC_TITLE_ARTWORK_PRESET_ADAPTER,
  DISC_RATING_PRESET_ADAPTER,
  DISC_MEDIA_MARK_PRESET_ADAPTER,
  DISC_DEVELOPER_LOGO_PRESET_ADAPTER,
  DISC_PUBLISHER_LOGO_PRESET_ADAPTER,
] as const)
