import type {
  DiscNormalizedRegion,
  DiscTextPresetTarget,
} from '../discPresetDefinition.ts'
import {
  fitStraightDiscTextToRegion,
} from '../../discText/fitStraightTextToRegion.ts'
import {
  getDefaultDiscTextPointSize,
} from '../../discText/pointSize.ts'
import type {
  DiscLegalTextPresetOwnerState,
  DiscPresetOwnerUpdate,
  DiscTextLayoutPresetUpdate,
  DiscTitleTextPresetOwnerState,
} from '../discPresetOwnerPlacement.ts'
import type {
  DiscPresetOwnerPlacementContext,
  DiscPresetOwnerPlacementResult,
  DiscPresetPlacementAdapter,
} from '../discPresetPlacementAdapters.ts'

export const DISC_PRESET_TITLE_TEXT_MINIMUM_POINT_SIZE = 8
export const DISC_PRESET_TITLE_TEXT_POINT_SIZE_STEP = 0.25
export const DISC_PRESET_LEGAL_TEXT_PREFERRED_POINT_SIZE = 7
export const DISC_PRESET_LEGAL_TEXT_MINIMUM_POINT_SIZE = 3
export const DISC_PRESET_LEGAL_TEXT_POINT_SIZE_STEP = 0.25

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

      if (context.placement.fit === 'region') {
        const measuredOwnerState = context.ownerState as
          | DiscTitleTextPresetOwnerState
          | DiscLegalTextPresetOwnerState
        const measureText = context.services.textMeasurement?.measureText
        const preferredPointSize = target === 'game-title.text'
          ? getDefaultDiscTextPointSize(
              'title',
              1,
              measuredOwnerState.template,
              'straight',
            )
          : DISC_PRESET_LEGAL_TEXT_PREFERRED_POINT_SIZE
        const minimumPointSize = target === 'game-title.text'
          ? DISC_PRESET_TITLE_TEXT_MINIMUM_POINT_SIZE
          : DISC_PRESET_LEGAL_TEXT_MINIMUM_POINT_SIZE
        const pointSizeStep = target === 'game-title.text'
          ? DISC_PRESET_TITLE_TEXT_POINT_SIZE_STEP
          : DISC_PRESET_LEGAL_TEXT_POINT_SIZE_STEP

        if (!measureText) {
          const update: DiscPresetOwnerUpdate = Object.freeze({
            kind: 'disc-text-layout',
            slotId: context.slot.id,
            target,
            key,
            layout: Object.freeze({
              ...layout,
              fontSizePt: preferredPointSize,
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
          key,
          includeRenderedBoxBounds: true,
          includeRenderedPaintBounds: true,
          content: measuredOwnerState.enabled
            ? measuredOwnerState.content.plainText
            : '',
          currentLayout: measuredOwnerState.layout,
          measureText,
          minimumPointSize,
          pointSizeStep,
          preferredPointSize,
          region: context.slot.resolvedContentRegion,
          richText: measuredOwnerState.enabled
            ? measuredOwnerState.content.richText
            : undefined,
          styles: target === 'game-title.text'
            ? { title: measuredOwnerState.style }
            : { copyright: measuredOwnerState.style },
          template: measuredOwnerState.template,
        })

        if (fit.status === 'impossible') {
          const warning = target === 'game-title.text'
            ? Object.freeze({
                kind: 'text-fit-impossible' as const,
                slotId: 'disc:guided:game-title:primary' as const,
                target: 'game-title.text' as const,
              })
            : Object.freeze({
                kind: 'text-fit-impossible' as const,
                slotId: 'disc:guided:legal-text:copyright' as const,
                target: 'legal.copyright' as const,
              })

          return Object.freeze({
            status: 'partial',
            updates: Object.freeze([]),
            ...(target === 'legal.copyright'
              ? {
                  resolvedSlotPatch: Object.freeze({
                    slotId: context.slot.id,
                    status: 'unsupported' as const,
                  }),
                }
              : {}),
            warnings: Object.freeze([warning]),
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
        const warnings = Object.freeze(fit.warnings.map((kind) =>
          target === 'game-title.text'
            ? Object.freeze({
                kind,
                slotId: 'disc:guided:game-title:primary' as const,
                target: 'game-title.text' as const,
              })
            : Object.freeze({
                kind,
                slotId: 'disc:guided:legal-text:copyright' as const,
                target: 'legal.copyright' as const,
              })))

        return Object.freeze({
          status: 'applied',
          updates: Object.freeze([fittedUpdate]),
          ...(target === 'legal.copyright'
            ? {
                resolvedSlotPatch: Object.freeze({
                  slotId: context.slot.id,
                  resolvedContentRegion: fittedRegion,
                  resolvedActionRegion: fittedRegion,
                  status: fit.warnings.length > 0
                    ? 'adjusted' as const
                    : context.slot.status,
                }),
              }
            : {}),
          warnings,
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
