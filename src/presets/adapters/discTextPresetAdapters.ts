import type {
  DiscNormalizedRegion,
  DiscTextPresetTarget,
} from '../discPresetDefinition.ts'
import type {
  DiscPresetOwnerUpdate,
  DiscTextLayoutPresetUpdate,
} from '../discPresetOwnerPlacement.ts'
import type {
  DiscPresetOwnerPlacementContext,
  DiscPresetOwnerPlacementResult,
  DiscPresetPlacementAdapter,
} from '../discPresetPlacementAdapters.ts'

export type DiscTextPresetPosition = Readonly<{
  x: number
  y: number
}>

export function getDiscTextPresetPosition(
  region: DiscNormalizedRegion,
): DiscTextPresetPosition {
  return Object.freeze({
    x: region.centerXPercent - 50,
    y: region.centerYPercent,
  })
}

function unsupportedTextPlacement(
  context: DiscPresetOwnerPlacementContext<DiscTextPresetTarget>,
  reason:
    | 'owner-state-unavailable'
    | 'owner-state-unsupported'
    | 'unsupported-text-mode',
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

function createDiscTextPresetAdapter<TTarget extends DiscTextPresetTarget>(
  target: TTarget,
  key: TTarget extends 'game-title.text' ? 'title' : 'copyright',
): DiscPresetPlacementAdapter<TTarget> {
  return Object.freeze({
    target,
    supportedIntentKinds: Object.freeze(['text'] as const),
    buildUpdate(
      context: DiscPresetOwnerPlacementContext<TTarget>,
    ): DiscPresetOwnerPlacementResult {
      if (context.ownerState === undefined) {
        return unsupportedTextPlacement(
          context as DiscPresetOwnerPlacementContext<DiscTextPresetTarget>,
          'owner-state-unavailable',
        )
      }

      if (
        context.ownerState.key !== key ||
        typeof context.ownerState.enabled !== 'boolean' ||
        !context.ownerState.layout
      ) {
        return unsupportedTextPlacement(
          context as DiscPresetOwnerPlacementContext<DiscTextPresetTarget>,
          'owner-state-unsupported',
        )
      }

      if (context.placement.mode !== 'straight') {
        return unsupportedTextPlacement(
          context as DiscPresetOwnerPlacementContext<DiscTextPresetTarget>,
          'unsupported-text-mode',
        )
      }

      const position = getDiscTextPresetPosition(
        context.slot.resolvedContentRegion,
      )
      const layout: DiscTextLayoutPresetUpdate = Object.freeze({
        ...position,
        width: context.slot.resolvedContentRegion.widthPercent,
        align: context.placement.align,
        mode: 'straight',
        ...(context.placement.fontSizePt === undefined
          ? {}
          : { fontSizePt: context.placement.fontSizePt }),
      })
      const update: DiscPresetOwnerUpdate = Object.freeze({
        kind: 'disc-text-layout',
        slotId: context.slot.id,
        target,
        key,
        layout,
      })

      if (target === 'legal.copyright' && context.placement.fit === 'region') {
        return Object.freeze({
          status: 'partial',
          updates: Object.freeze([update]),
          warnings: Object.freeze([Object.freeze({
            kind: 'content-measurement-required',
            slotId: 'disc:guided:legal-text:copyright',
            target: 'legal.copyright',
          })]),
        })
      }

      return Object.freeze({
        status: 'applied',
        updates: Object.freeze([update]),
        warnings: Object.freeze([]),
      })
    },
  })
}

export const DISC_GAME_TITLE_TEXT_PRESET_ADAPTER =
  createDiscTextPresetAdapter('game-title.text', 'title')

export const DISC_LEGAL_TEXT_PRESET_ADAPTER =
  createDiscTextPresetAdapter('legal.copyright', 'copyright')

export const DISC_TEXT_PRESET_ADAPTERS = Object.freeze([
  DISC_GAME_TITLE_TEXT_PRESET_ADAPTER,
  DISC_LEGAL_TEXT_PRESET_ADAPTER,
] as const)
