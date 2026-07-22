import {
  placeGroupedPlatformMarks,
  type GroupedPlatformMarkPlacementIgnoredMark,
} from '../../layout/groupedPlatformMarkPlacement.ts'
import {
  createDiscPresetTemplateResolutionInput,
} from '../discPresetResolution.ts'
import type {
  DiscPresetAdapterWarning,
  DiscPresetOwnerPlacementContext,
  DiscPresetOwnerPlacementResult,
  DiscPresetPlacementAdapter,
} from '../discPresetPlacementAdapters.ts'

type PlatformMarksContext =
  DiscPresetOwnerPlacementContext<'operating-system-marks.enabled'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasPlatformMarksOwnerState(
  value: unknown,
): value is NonNullable<PlatformMarksContext['ownerState']> {
  if (!isRecord(value) ||
      !isRecord(value.platformMarks) ||
      !isRecord(value.platformMarks.assets) ||
      !Array.isArray(value.platformMarks.values) ||
      !isRecord(value.template)) {
    return false
  }

  return value.template.type === 'disc' &&
    typeof value.template.id === 'string' &&
    Number.isFinite(value.template.outerDiameterMm) &&
    Number.isFinite(value.template.physicalCenterHoleDiameterMm) &&
    Number.isFinite(value.template.safeDiameterMm)
}

function placementUnsupported(
  context: PlatformMarksContext,
  reason:
    | 'owner-state-unavailable'
    | 'owner-state-unsupported'
    | 'invalid-scale',
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

function ownerTemplateMatchesContext(
  context: PlatformMarksContext,
  ownerState: NonNullable<PlatformMarksContext['ownerState']>,
) {
  const ownerTemplate = createDiscPresetTemplateResolutionInput(
    ownerState.template,
  )

  return ownerTemplate.templateId === context.template.templateId &&
    ownerTemplate.outerDiameterPercent ===
      context.template.outerDiameterPercent &&
    ownerTemplate.physicalCenterHolePercent ===
      context.template.physicalCenterHolePercent &&
    ownerTemplate.safeDiameterPercent === context.template.safeDiameterPercent
}

function ignoredMarkToWarning(
  ignoredMark: GroupedPlatformMarkPlacementIgnoredMark,
): DiscPresetAdapterWarning | null {
  if (ignoredMark.reason === 'disabled') return null

  if (ignoredMark.reason === 'unrenderable') {
    return Object.freeze({
      kind: 'platform-mark-asset-missing',
      slotId: 'disc:guided:operating-system-marks:group',
      target: 'operating-system-marks.enabled',
      markId: ignoredMark.value,
    })
  }

  return Object.freeze({
    kind: 'platform-mark-ignored',
    slotId: 'disc:guided:operating-system-marks:group',
    target: 'operating-system-marks.enabled',
    markId: ignoredMark.value,
    reason: ignoredMark.reason,
  })
}

function createIgnoredMarkWarnings(
  ignoredMarks: readonly GroupedPlatformMarkPlacementIgnoredMark[],
) {
  return Object.freeze(
    ignoredMarks
      .map(ignoredMarkToWarning)
      .filter((warning): warning is DiscPresetAdapterWarning =>
        warning !== null),
  )
}

export const DISC_PLATFORM_MARKS_PRESET_ADAPTER:
  DiscPresetPlacementAdapter<'operating-system-marks.enabled'> = Object.freeze({
    target: 'operating-system-marks.enabled',
    supportedIntentKinds: Object.freeze(['group'] as const),
    buildUpdate(context): DiscPresetOwnerPlacementResult {
      if (context.ownerState === undefined) {
        return placementUnsupported(context, 'owner-state-unavailable')
      }

      if (
        !hasPlatformMarksOwnerState(context.ownerState) ||
        !ownerTemplateMatchesContext(context, context.ownerState)
      ) {
        return placementUnsupported(context, 'owner-state-unsupported')
      }

      const preferredScale = context.placement.preferredScale
      if (
        preferredScale !== undefined &&
        (!Number.isFinite(preferredScale) || preferredScale <= 0)
      ) {
        return placementUnsupported(context, 'invalid-scale')
      }

      const placement = placeGroupedPlatformMarks({
        platformMarks: context.ownerState.platformMarks,
        region: context.slot.resolvedContentRegion,
        template: context.ownerState.template,
        ...(preferredScale === undefined ? {} : { preferredScale }),
      })
      const ignoredWarnings = createIgnoredMarkWarnings(
        placement.ignoredMarks,
      )

      if (placement.status === 'invalid-region') {
        return Object.freeze({
          status: 'unsupported',
          updates: Object.freeze([] as const),
          warnings: Object.freeze([Object.freeze({
            kind: 'invalid-group-region',
            slotId: 'disc:guided:operating-system-marks:group',
            target: 'operating-system-marks.enabled',
          })] as const),
        })
      }

      if (placement.status === 'cannot-fit') {
        return Object.freeze({
          status: 'unsupported',
          updates: Object.freeze([] as const),
          warnings: Object.freeze([Object.freeze({
            kind: 'grouped-placement-impossible',
            slotId: 'disc:guided:operating-system-marks:group',
            target: 'operating-system-marks.enabled',
          })] as const),
        })
      }

      const updates = Object.freeze(placement.updates.map((update) =>
        Object.freeze({
          kind: 'platform-mark-layout' as const,
          slotId: 'disc:guided:operating-system-marks:group' as const,
          target: 'operating-system-marks.enabled' as const,
          markId: update.value,
          layout: Object.freeze({
            x: update.x,
            y: update.y,
            scale: update.scale,
          }),
        })))

      return Object.freeze({
        status: ignoredWarnings.length > 0 ? 'partial' : 'applied',
        updates,
        warnings: ignoredWarnings,
      })
    },
  })
