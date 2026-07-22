import type {
  DiscNormalizedRegion,
  DiscTextPresetTarget,
} from '../discPresetDefinition.ts'
import {
  fitStraightDiscTextToRegion,
} from '../../discText/fitStraightTextToRegion.ts'
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

      if (target === 'legal.copyright' && context.placement.fit === 'region') {
        const legalOwnerState = context.ownerState as
          import('../discPresetOwnerPlacement.ts').DiscLegalTextPresetOwnerState
        const measureText = context.services.textMeasurement?.measureText

        if (!measureText) {
          const update: DiscPresetOwnerUpdate = Object.freeze({
            kind: 'disc-text-layout',
            slotId: context.slot.id,
            target,
            key,
            layout: Object.freeze({
              ...layout,
              fontSizePt: 7,
              avoidVisualElements: false,
            }),
          })

          return Object.freeze({
            status: 'partial',
            updates: Object.freeze([update]),
            warnings: Object.freeze([Object.freeze({
              kind: 'placement-unsupported',
              slotId: context.slot.id,
              target,
              reason: 'text-measurement-unavailable',
            })]),
          })
        }

        const fit = fitStraightDiscTextToRegion({
          key: 'copyright',
          content: legalOwnerState.enabled
            ? legalOwnerState.content.plainText
            : '',
          currentLayout: legalOwnerState.layout,
          measureText,
          region: context.slot.resolvedContentRegion,
          richText: legalOwnerState.enabled
            ? legalOwnerState.content.richText
            : undefined,
          styles: { copyright: legalOwnerState.style },
          template: legalOwnerState.template,
        })

        if (fit.status === 'impossible') {
          return Object.freeze({
            status: 'partial',
            updates: Object.freeze([]),
            resolvedSlotPatch: Object.freeze({
              slotId: context.slot.id,
              status: 'unsupported',
            }),
            warnings: Object.freeze([Object.freeze({
              kind: 'text-fit-impossible',
              slotId: 'disc:guided:legal-text:copyright',
              target: 'legal.copyright',
            })]),
          })
        }

        const fittedUpdate: DiscPresetOwnerUpdate = Object.freeze({
          kind: 'disc-text-layout',
          slotId: context.slot.id,
          target,
          key,
          layout: Object.freeze({
            x: fit.layout.x,
            y: fit.layout.y,
            width: fit.layout.width,
            fontSizePt: fit.layout.fontSizePt,
            align: fit.layout.align,
            mode: fit.layout.mode,
            avoidVisualElements: fit.layout.avoidVisualElements,
          }),
        })
        const fittedRegion = Object.freeze({ ...fit.resolvedRegion })

        return Object.freeze({
          status: 'applied',
          updates: Object.freeze([fittedUpdate]),
          resolvedSlotPatch: Object.freeze({
            slotId: context.slot.id,
            resolvedContentRegion: fittedRegion,
            resolvedActionRegion: fittedRegion,
            status: fit.warnings.length > 0
              ? 'adjusted'
              : context.slot.status,
          }),
          warnings: Object.freeze(fit.warnings.map((kind) => Object.freeze({
            kind,
            slotId: 'disc:guided:legal-text:copyright' as const,
            target: 'legal.copyright' as const,
          }))),
        })
      }

      const update: DiscPresetOwnerUpdate = Object.freeze({
        kind: 'disc-text-layout',
        slotId: context.slot.id,
        target,
        key,
        layout,
      })

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
