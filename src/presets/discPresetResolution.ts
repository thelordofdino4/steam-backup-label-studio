import type { DiscGuidedSlotId } from '../guidedPresets/discGuidedSlots.ts'
import type { DiscTemplate } from '../types/template.ts'
import type {
  DiscNormalizedRegion,
  DiscPresetDefinitionV1,
  DiscPresetId,
  DiscPresetPlacementIntentV1,
} from './discPresetDefinition.ts'

export type DiscPresetSlotResolutionStatus =
  | 'resolved'
  | 'adjusted'
  | 'unsupported'

export type DiscPresetResolutionAdjustmentReason =
  | 'outer-disc-bounds'
  | 'action-region-outside-safe-annulus'

export type DiscPresetUnsupportedReason =
  | 'template-incompatible'
  | 'outside-safe-annulus'

export type DiscPresetResolutionWarning =
  | Readonly<{
      kind: 'slot-adjusted'
      slotId: DiscGuidedSlotId
      reason: DiscPresetResolutionAdjustmentReason
    }>
  | Readonly<{
      kind: 'slot-unsupported'
      slotId: DiscGuidedSlotId
      reason: DiscPresetUnsupportedReason
    }>
  | Readonly<{
      kind: 'template-incompatible'
      expectedTemplateId: string
      actualTemplateId: string
    }>
  | Readonly<{
      kind: 'invalid-template-geometry'
      templateId: string
    }>

export type ResolvedDiscPresetSlot = Readonly<{
  id: DiscGuidedSlotId
  nominalContentRegion: DiscNormalizedRegion
  resolvedContentRegion: DiscNormalizedRegion
  nominalActionRegion: DiscNormalizedRegion
  resolvedActionRegion: DiscNormalizedRegion
  visualLayer: 'background' | 'foreground'
  placements: readonly DiscPresetPlacementIntentV1[]
  status: DiscPresetSlotResolutionStatus
  warnings: readonly DiscPresetResolutionWarning[]
}>

export type ResolvedDiscPresetDefinition = Readonly<{
  sourcePresetId: DiscPresetId
  sourceRevision: number
  templateId: string
  slots: readonly ResolvedDiscPresetSlot[]
  warnings: readonly DiscPresetResolutionWarning[]
}>

export type DiscPresetTemplateResolutionInput = Readonly<{
  templateId: string
  outerDiameterPercent: number
  physicalCenterHolePercent: number
  safeDiameterPercent: number
}>

export type DiscPresetResolutionResult =
  | Readonly<{
      status: 'resolved' | 'partial'
      preset: ResolvedDiscPresetDefinition
      warnings: readonly DiscPresetResolutionWarning[]
    }>
  | Readonly<{
      status: 'rejected'
      preset: null
      warnings: readonly DiscPresetResolutionWarning[]
    }>

type ResolveDiscPresetDefinitionInput = Readonly<{
  definition: DiscPresetDefinitionV1
  template: DiscPresetTemplateResolutionInput
}>

type RegionBounds = Readonly<{
  left: number
  right: number
  top: number
  bottom: number
}>

const DISC_CENTER_PERCENT = 50

function freezeWarning<T extends DiscPresetResolutionWarning>(warning: T): T {
  return Object.freeze(warning)
}

function freezeRegion(region: DiscNormalizedRegion): DiscNormalizedRegion {
  return Object.freeze({ ...region })
}

function getRegionBounds(region: DiscNormalizedRegion): RegionBounds {
  return {
    left: region.centerXPercent - region.widthPercent / 2,
    right: region.centerXPercent + region.widthPercent / 2,
    top: region.centerYPercent - region.heightPercent / 2,
    bottom: region.centerYPercent + region.heightPercent / 2,
  }
}

function regionFromBounds(bounds: RegionBounds): DiscNormalizedRegion {
  return freezeRegion({
    centerXPercent: (bounds.left + bounds.right) / 2,
    centerYPercent: (bounds.top + bounds.bottom) / 2,
    widthPercent: bounds.right - bounds.left,
    heightPercent: bounds.bottom - bounds.top,
  })
}

function regionsEqual(
  first: DiscNormalizedRegion,
  second: DiscNormalizedRegion,
) {
  return first.centerXPercent === second.centerXPercent &&
    first.centerYPercent === second.centerYPercent &&
    first.widthPercent === second.widthPercent &&
    first.heightPercent === second.heightPercent
}

function clipRegionToOuterDiscBounds(
  region: DiscNormalizedRegion,
  outerDiameterPercent: number,
): DiscNormalizedRegion | null {
  const radius = outerDiameterPercent / 2
  const minimum = DISC_CENTER_PERCENT - radius
  const maximum = DISC_CENTER_PERCENT + radius
  const bounds = getRegionBounds(region)
  const clipped = {
    left: Math.max(minimum, bounds.left),
    right: Math.min(maximum, bounds.right),
    top: Math.max(minimum, bounds.top),
    bottom: Math.min(maximum, bounds.bottom),
  }

  return clipped.right > clipped.left && clipped.bottom > clipped.top
    ? regionFromBounds(clipped)
    : null
}

function getMinimumDistanceFromDiscCenter(bounds: RegionBounds) {
  const x = DISC_CENTER_PERCENT < bounds.left
    ? bounds.left - DISC_CENTER_PERCENT
    : DISC_CENTER_PERCENT > bounds.right
      ? DISC_CENTER_PERCENT - bounds.right
      : 0
  const y = DISC_CENTER_PERCENT < bounds.top
    ? bounds.top - DISC_CENTER_PERCENT
    : DISC_CENTER_PERCENT > bounds.bottom
      ? DISC_CENTER_PERCENT - bounds.bottom
      : 0

  return Math.hypot(x, y)
}

function getMaximumDistanceFromDiscCenter(bounds: RegionBounds) {
  return Math.max(
    Math.hypot(bounds.left - DISC_CENTER_PERCENT, bounds.top - DISC_CENTER_PERCENT),
    Math.hypot(bounds.right - DISC_CENTER_PERCENT, bounds.top - DISC_CENTER_PERCENT),
    Math.hypot(bounds.left - DISC_CENTER_PERCENT, bounds.bottom - DISC_CENTER_PERCENT),
    Math.hypot(bounds.right - DISC_CENTER_PERCENT, bounds.bottom - DISC_CENTER_PERCENT),
  )
}

function intersectsSafeAnnulus(
  region: DiscNormalizedRegion,
  template: DiscPresetTemplateResolutionInput,
) {
  const bounds = getRegionBounds(region)
  return getMinimumDistanceFromDiscCenter(bounds) <=
      template.safeDiameterPercent / 2 &&
    getMaximumDistanceFromDiscCenter(bounds) >=
      template.physicalCenterHolePercent / 2
}

function hasValidTemplateGeometry(
  template: DiscPresetTemplateResolutionInput,
) {
  return template.templateId.trim().length > 0 &&
    Number.isFinite(template.outerDiameterPercent) &&
    Number.isFinite(template.physicalCenterHolePercent) &&
    Number.isFinite(template.safeDiameterPercent) &&
    template.outerDiameterPercent > 0 &&
    template.outerDiameterPercent <= 100 &&
    template.physicalCenterHolePercent >= 0 &&
    template.physicalCenterHolePercent < template.safeDiameterPercent &&
    template.safeDiameterPercent <= template.outerDiameterPercent
}

function resolveSlot(
  slot: DiscPresetDefinitionV1['slots'][number],
  template: DiscPresetTemplateResolutionInput,
  incompatibleTemplate: boolean,
): ResolvedDiscPresetSlot {
  const nominalContentRegion = freezeRegion(slot.contentRegion)
  const nominalActionRegion = freezeRegion(
    slot.actionRegion ?? slot.contentRegion,
  )
  const warnings: DiscPresetResolutionWarning[] = []

  if (incompatibleTemplate) {
    warnings.push(freezeWarning({
      kind: 'slot-unsupported',
      slotId: slot.id,
      reason: 'template-incompatible',
    }))
  }

  const resolvedContentRegion = clipRegionToOuterDiscBounds(
    nominalContentRegion,
    template.outerDiameterPercent,
  )
  let resolvedActionRegion = slot.actionRegion
    ? clipRegionToOuterDiscBounds(
        nominalActionRegion,
        template.outerDiameterPercent,
      )
    : resolvedContentRegion

  if (
    !resolvedContentRegion ||
    !intersectsSafeAnnulus(resolvedContentRegion, template)
  ) {
    if (!incompatibleTemplate) {
      warnings.push(freezeWarning({
        kind: 'slot-unsupported',
        slotId: slot.id,
        reason: 'outside-safe-annulus',
      }))
    }

    return Object.freeze({
      id: slot.id,
      nominalContentRegion,
      resolvedContentRegion: resolvedContentRegion ?? nominalContentRegion,
      nominalActionRegion,
      resolvedActionRegion: resolvedActionRegion ?? nominalActionRegion,
      visualLayer: slot.visualLayer,
      placements: slot.placements,
      status: 'unsupported',
      warnings: Object.freeze(warnings),
    })
  }

  if (!regionsEqual(nominalContentRegion, resolvedContentRegion)) {
    warnings.push(freezeWarning({
      kind: 'slot-adjusted',
      slotId: slot.id,
      reason: 'outer-disc-bounds',
    }))
  }

  if (
    !resolvedActionRegion ||
    !intersectsSafeAnnulus(resolvedActionRegion, template)
  ) {
    resolvedActionRegion = resolvedContentRegion
    warnings.push(freezeWarning({
      kind: 'slot-adjusted',
      slotId: slot.id,
      reason: 'action-region-outside-safe-annulus',
    }))
  } else if (!regionsEqual(nominalActionRegion, resolvedActionRegion)) {
    warnings.push(freezeWarning({
      kind: 'slot-adjusted',
      slotId: slot.id,
      reason: 'outer-disc-bounds',
    }))
  }

  return Object.freeze({
    id: slot.id,
    nominalContentRegion,
    resolvedContentRegion,
    nominalActionRegion,
    resolvedActionRegion,
    visualLayer: slot.visualLayer,
    placements: slot.placements,
    status: incompatibleTemplate
      ? 'unsupported'
      : warnings.length > 0
        ? 'adjusted'
        : 'resolved',
    warnings: Object.freeze(warnings),
  })
}

export function createDiscPresetTemplateResolutionInput(
  template: Pick<
    DiscTemplate,
    | 'id'
    | 'outerDiameterMm'
    | 'physicalCenterHoleDiameterMm'
    | 'safeDiameterMm'
  >,
): DiscPresetTemplateResolutionInput {
  return Object.freeze({
    templateId: template.id,
    outerDiameterPercent: 100,
    physicalCenterHolePercent:
      template.physicalCenterHoleDiameterMm / template.outerDiameterMm * 100,
    safeDiameterPercent:
      template.safeDiameterMm / template.outerDiameterMm * 100,
  })
}

export function resolveDiscPresetDefinition({
  definition,
  template,
}: ResolveDiscPresetDefinitionInput): DiscPresetResolutionResult {
  if (!hasValidTemplateGeometry(template)) {
    const warnings = Object.freeze([
      freezeWarning({
        kind: 'invalid-template-geometry',
        templateId: template.templateId,
      }),
    ])
    return Object.freeze({ status: 'rejected', preset: null, warnings })
  }

  const incompatibleTemplate =
    definition.compatibility.mode === 'specific-template' &&
    definition.compatibility.templateId !== template.templateId
  const definitionWarnings: DiscPresetResolutionWarning[] = []

  if (incompatibleTemplate) {
    definitionWarnings.push(freezeWarning({
      kind: 'template-incompatible',
      expectedTemplateId: definition.compatibility.templateId,
      actualTemplateId: template.templateId,
    }))
  }

  const slots = Object.freeze(definition.slots.map((slot) =>
    resolveSlot(slot, template, incompatibleTemplate)))
  const slotWarnings = slots.flatMap(({ warnings }) => warnings)
  const warnings = Object.freeze([...definitionWarnings, ...slotWarnings])
  const hasUnsupportedSlot = slots.some(({ status }) => status === 'unsupported')

  if (
    (incompatibleTemplate || hasUnsupportedSlot) &&
    definition.compatibility.onConflict === 'reject'
  ) {
    return Object.freeze({ status: 'rejected', preset: null, warnings })
  }

  const preset = Object.freeze({
    sourcePresetId: definition.id,
    sourceRevision: definition.revision,
    templateId: template.templateId,
    slots,
    warnings,
  })

  return Object.freeze({
    status: hasUnsupportedSlot ? 'partial' : 'resolved',
    preset,
    warnings,
  })
}
