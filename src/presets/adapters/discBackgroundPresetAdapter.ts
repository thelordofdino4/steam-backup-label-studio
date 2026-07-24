import { getBackgroundDrawSize } from '../../image/backgroundImage.ts'
import { getImageContentSize } from '../../image/imageContentBounds.ts'
import type {
  DiscPresetOwnerPlacementContext,
  DiscPresetOwnerPlacementResult,
  DiscPresetPlacementAdapter,
} from '../discPresetPlacementAdapters.ts'
import {
  fitVisualBoundsToDiscPresetRectangle,
  type DiscPresetContainFitWarning,
} from '../fitVisualBoundsToDiscPresetRegion.ts'

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

function getContainFitUnsupportedWarning(
  warnings: readonly DiscPresetContainFitWarning[],
) {
  return warnings.find((warning): warning is Extract<
    DiscPresetContainFitWarning,
    { kind: 'contain-fit-unsupported' }
  > => warning.kind === 'contain-fit-unsupported') ?? Object.freeze({
    kind: 'contain-fit-unsupported' as const,
    reason: 'calculation-invalid' as const,
  })
}

function impossibleBackgroundPlacement(
  context: DiscPresetOwnerPlacementContext<'background.primary'>,
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

function createBackgroundLayoutUpdate(
  context: DiscPresetOwnerPlacementContext<'background.primary'>,
  scale: number,
) {
  return Object.freeze({
    kind: 'background-layout' as const,
    slotId: context.slot.id,
    target: 'background.primary' as const,
    layout: Object.freeze({
      scale,
      offset: Object.freeze({ x: 0, y: 0 }),
    }),
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

      const region = context.slot.resolvedContentRegion
      if (region.centerXPercent !== 50 || region.centerYPercent !== 50) {
        return unsupportedBackgroundPlacement(
          context,
          'non-centered-background-region',
        )
      }

      if (context.placement.fit === 'cover') {
        if (!Number.isFinite(context.placement.scale) ||
            context.placement.scale <= 0) {
          return unsupportedBackgroundPlacement(context, 'invalid-scale')
        }

        return Object.freeze({
          status: 'applied',
          updates: Object.freeze([
            createBackgroundLayoutUpdate(context, context.placement.scale),
          ]),
          warnings: Object.freeze([]),
        })
      }

      const canonicalSize = context.ownerState.imageDataUrl?.trim() &&
        getImageContentSize(context.ownerState.imageSize)
        ? getBackgroundDrawSize(context.ownerState.imageSize, 1, 100)
        : null
      if (
        !canonicalSize ||
        !Number.isFinite(canonicalSize.width) ||
        !Number.isFinite(canonicalSize.height) ||
        canonicalSize.width <= 0 ||
        canonicalSize.height <= 0
      ) {
        return Object.freeze({
          status: 'applied',
          updates: Object.freeze([
            createBackgroundLayoutUpdate(context, context.ownerState.scale),
          ]),
          warnings: Object.freeze([Object.freeze({
            kind: 'placement-skipped' as const,
            slotId: context.slot.id,
            target: context.placement.target,
            reason: 'canonical-bounds-unavailable' as const,
          })]),
        })
      }

      const fit = fitVisualBoundsToDiscPresetRectangle({
        region,
        boundsAtScaleOne: {
          centerOffsetXPercent: 0,
          centerOffsetYPercent: 0,
          widthPercent: canonicalSize.width,
          heightPercent: canonicalSize.height,
        },
        policy: context.placement.size,
      })
      if (fit.status === 'unsupported') {
        return impossibleBackgroundPlacement(
          context,
          getContainFitUnsupportedWarning(fit.warnings),
        )
      }

      return Object.freeze({
        status: 'applied',
        updates: Object.freeze([
          createBackgroundLayoutUpdate(context, fit.scale),
        ]),
        warnings: Object.freeze([]),
      })
    },
  })
