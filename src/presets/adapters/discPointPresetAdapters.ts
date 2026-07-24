import type { DiscGuidedSlotId } from '../../guidedPresets/discGuidedSlots.ts'
import type {
  DiscPointPresetTarget,
} from '../discPresetDefinition.ts'
import {
  fitVisualBoundsToDiscPresetRectangle,
  type DiscCanonicalVisualBounds,
  type DiscPresetContainFitWarning,
} from '../fitVisualBoundsToDiscPresetRegion.ts'
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

function getCanonicalVisualBounds(
  ownerState: unknown,
): DiscCanonicalVisualBounds | null | undefined {
  if (!isRecord(ownerState)) return undefined

  const bounds = ownerState.canonicalVisualBoundsAtScaleOne
  return bounds === null || isRecord(bounds)
    ? bounds as DiscCanonicalVisualBounds | null
    : undefined
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

function isContainFitUnsupportedWarning(
  warning: DiscPresetContainFitWarning,
): warning is Extract<
  DiscPresetContainFitWarning,
  { kind: 'contain-fit-unsupported' }
> {
  return warning.kind === 'contain-fit-unsupported'
}

function containFitImpossible(
  context: DiscPresetOwnerPlacementContext<DiscPointPresetTarget>,
  warning: Extract<
    DiscPresetContainFitWarning,
    { kind: 'contain-fit-unsupported' }
  >,
): DiscPresetOwnerPlacementResult {
  return Object.freeze({
    status: 'partial',
    updates: Object.freeze([] as const),
    resolvedSlotPatch: Object.freeze({
      slotId: context.slot.id,
      status: 'unsupported' as const,
    }),
    warnings: Object.freeze([Object.freeze({
      kind: 'placement-impossible' as const,
      slotId: context.slot.id,
      target: context.placement.target,
      reason: warning.reason,
    })]),
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

      if (context.placement.size.mode === 'fixed-scale') {
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
      }

      if (context.placement.size.mode !== 'contain-region') {
        return unsupportedPointPlacement(
          context as DiscPresetOwnerPlacementContext<DiscPointPresetTarget>,
          'unsupported-size-policy',
        )
      }

      const canonicalVisualBoundsAtScaleOne = getCanonicalVisualBounds(
        context.ownerState,
      )
      if (canonicalVisualBoundsAtScaleOne === undefined) {
        return unsupportedPointPlacement(
          context as DiscPresetOwnerPlacementContext<DiscPointPresetTarget>,
          'owner-state-unsupported',
        )
      }

      if (canonicalVisualBoundsAtScaleOne === null) {
        const layout = Object.freeze({
          x: context.slot.resolvedContentRegion.centerXPercent,
          y: context.slot.resolvedContentRegion.centerYPercent,
          scale: context.ownerState.layout.scale,
        })
        const update = Object.freeze(createUpdate(context.slot.id, layout))

        return Object.freeze({
          status: 'applied',
          updates: Object.freeze([update]),
          warnings: Object.freeze([Object.freeze({
            kind: 'placement-skipped' as const,
            slotId: context.slot.id,
            target,
            reason: 'canonical-bounds-unavailable' as const,
          })]),
        })
      }

      const fit = fitVisualBoundsToDiscPresetRectangle({
        region: context.slot.resolvedContentRegion,
        boundsAtScaleOne: canonicalVisualBoundsAtScaleOne,
        policy: context.placement.size,
      })

      if (fit.status === 'unsupported') {
        const warning = fit.warnings.find(isContainFitUnsupportedWarning) ??
          Object.freeze({
            kind: 'contain-fit-unsupported' as const,
            reason: 'calculation-invalid' as const,
          })
        return containFitImpossible(
          context as DiscPresetOwnerPlacementContext<DiscPointPresetTarget>,
          warning,
        )
      }

      const layout = Object.freeze({ x: fit.x, y: fit.y, scale: fit.scale })
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
