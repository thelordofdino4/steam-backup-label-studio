import {
  encodeCaseInsertPresetDeterministicIdentity,
} from './caseInsertPresetDeterministicIdentity.ts'

type AddressIdentityInput = Readonly<{
  region: string
  featureOwnerId: string
  bindingKind: string
  bindingId: string
  runtimeObjectId: string
  fieldId: string
}>

type SourceIdentityInput = Readonly<{
  region: string
  slotId: string
  assignmentId: string
}>

type ReleaseIdentityInput = Readonly<{
  address: AddressIdentityInput
  sources: readonly SourceIdentityInput[]
}>

type PreservationIdentityInput = Readonly<{
  address: AddressIdentityInput
}>

type DetachPlanContentIdentityInput = Readonly<{
  resolvedRegions: readonly string[]
  releaseFootprint: readonly ReleaseIdentityInput[]
  aggregatePreservations: readonly PreservationIdentityInput[]
  warnings: readonly Readonly<{ kind: string }>[]
  materialConsentRequirements: readonly unknown[]
  preconditions: Readonly<{
    resolvedRegions: readonly string[]
    fields: readonly Readonly<{ address: AddressIdentityInput }>[]
  }>
}>

export const CASE_INSERT_PRESET_DETACH_PLAN_KIND =
  'sbls/case-insert-preset-detach-plan' as const
export const CASE_INSERT_PRESET_DETACH_PLAN_FORMAT_VERSION = 2 as const
export const CASE_INSERT_PRESET_TYPED_DETACH_PLAN_FORMAT_VERSION = 3 as const
export const CASE_INSERT_PRESET_DETACH_OWNERSHIP_PROJECTION_KIND =
  'sbls/case-insert-preset-detach-ownership-projection' as const

export const CASE_INSERT_PRESET_DETACH_RELEASE_IDENTITY_PREFIX =
  'case:preset-detach-release:v1:' as const
export const CASE_INSERT_PRESET_TYPED_DETACH_RELEASE_IDENTITY_PREFIX =
  'case:preset-detach-release:v2:' as const
export const CASE_INSERT_PRESET_DETACH_PRESERVATION_IDENTITY_PREFIX =
  'case:preset-detach-preservation:v1:' as const
export const CASE_INSERT_PRESET_TYPED_DETACH_PRESERVATION_IDENTITY_PREFIX =
  'case:preset-detach-preservation:v2:' as const
export const CASE_INSERT_PRESET_DETACH_WARNING_IDENTITY_PREFIX =
  'case:preset-detach-warning:v1:' as const
export const CASE_INSERT_PRESET_DETACH_REVIEW_IDENTITY_PREFIX =
  'case:preset-detach-review:v2:' as const
export const CASE_INSERT_PRESET_TYPED_DETACH_REVIEW_IDENTITY_PREFIX =
  'case:preset-detach-review:v3:' as const
export const CASE_INSERT_PRESET_DETACH_PLAN_IDENTITY_PREFIX =
  'case:preset-detach-plan:v2:' as const
export const CASE_INSERT_PRESET_TYPED_DETACH_PLAN_IDENTITY_PREFIX =
  'case:preset-detach-plan:v3:' as const
export const CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_IDENTITY_PREFIX =
  'case:preset-detach-review-acceptance:v1:' as const
export const CASE_INSERT_PRESET_DETACH_CONSENT_ACCEPTANCE_IDENTITY_PREFIX =
  'case:preset-detach-consent-acceptance:v1:' as const
export const CASE_INSERT_PRESET_DETACH_TRANSITION_IDENTITY_PREFIX =
  'case:preset-detach-transition:v1:' as const
export const CASE_INSERT_PRESET_DETACH_CONFIGURATION_RELEASE_IDENTITY_PREFIX =
  'case:preset-detach-configuration-release:v1:' as const

const REGION_ORDER = new Map([
  ['front-cover', 0],
  ['tray-card', 1],
  ['back-panel', 2],
  ['left-spine', 3],
  ['right-spine', 4],
])
const FIELD_ORDER = new Map([
  ['object-presence', 0],
  ['layout-x', 1],
  ['layout-y', 2],
  ['layout-scale', 3],
  ['layout-width', 4],
  ['image-fit', 5],
  ['reserved-artwork-viewport', 6],
])

function cloneValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(cloneValue) as T
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => [key, cloneValue(child)]),
  ) as T
}

function addressSort(
  left: AddressIdentityInput,
  right: AddressIdentityInput,
) {
  return (REGION_ORDER.get(left.region) ?? 99) -
      (REGION_ORDER.get(right.region) ?? 99) ||
    left.featureOwnerId.localeCompare(right.featureOwnerId) ||
    left.runtimeObjectId.localeCompare(right.runtimeObjectId) ||
    (FIELD_ORDER.get(left.fieldId) ?? 99) -
      (FIELD_ORDER.get(right.fieldId) ?? 99) ||
    left.bindingKind.localeCompare(right.bindingKind) ||
    left.bindingId.localeCompare(right.bindingId)
}

function sourceSort(
  left: SourceIdentityInput,
  right: SourceIdentityInput,
) {
  return (REGION_ORDER.get(left.region) ?? 99) -
      (REGION_ORDER.get(right.region) ?? 99) ||
    left.slotId.localeCompare(right.slotId) ||
    left.assignmentId.localeCompare(right.assignmentId)
}

function canonicalSources<T extends SourceIdentityInput>(
  sources: readonly T[],
) {
  return sources.map(cloneValue).sort(sourceSort)
}

export function createCaseInsertPresetDetachReleaseIdentity<
  T extends ReleaseIdentityInput,
>(release: T) {
  const canonical = {
    ...cloneValue(release),
    sources: canonicalSources(release.sources),
  }
  const prefix = typeof (release as Readonly<{ currentValue?: unknown }>)
    .currentValue === 'object'
    ? CASE_INSERT_PRESET_TYPED_DETACH_RELEASE_IDENTITY_PREFIX
    : CASE_INSERT_PRESET_DETACH_RELEASE_IDENTITY_PREFIX
  return `${prefix}${
    encodeCaseInsertPresetDeterministicIdentity(canonical)
  }`
}

export function createCaseInsertPresetDetachPreservationIdentity<
  T extends PreservationIdentityInput,
>(preservation: T) {
  const prefix = typeof (preservation as Readonly<{ currentValue?: unknown }>)
    .currentValue === 'object'
    ? CASE_INSERT_PRESET_TYPED_DETACH_PRESERVATION_IDENTITY_PREFIX
    : CASE_INSERT_PRESET_DETACH_PRESERVATION_IDENTITY_PREFIX
  return `${prefix}${
    encodeCaseInsertPresetDeterministicIdentity(cloneValue(preservation))
  }`
}

export function createCaseInsertPresetDetachWarningIdentity<
  T extends Readonly<{ kind: string }>,
>(warning: T) {
  const record = cloneValue(warning) as T & Readonly<{
    resolvedRegions?: readonly string[]
  }>
  const canonical = record.resolvedRegions
    ? {
        ...record,
        resolvedRegions: [...record.resolvedRegions].sort((left, right) =>
          (REGION_ORDER.get(left) ?? 99) - (REGION_ORDER.get(right) ?? 99)),
      }
    : record
  return `${CASE_INSERT_PRESET_DETACH_WARNING_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(canonical)
  }`
}

export function canonicalizeCaseInsertPresetDetachPlanContent<
  T extends DetachPlanContentIdentityInput,
>(plan: T): T {
  const canonical = {
    ...cloneValue(plan),
    resolvedRegions: [...plan.resolvedRegions].sort((left, right) =>
      (REGION_ORDER.get(left) ?? 99) - (REGION_ORDER.get(right) ?? 99)),
    releaseFootprint: plan.releaseFootprint.map((release) => ({
      ...cloneValue(release),
      sources: canonicalSources(release.sources),
    })).sort((left, right) => addressSort(left.address, right.address)),
    aggregatePreservations: plan.aggregatePreservations.map(cloneValue)
      .sort((left, right) => addressSort(left.address, right.address)),
    warnings: plan.warnings.map(cloneValue).sort((left, right) =>
      left.kind.localeCompare(right.kind) ||
      encodeCaseInsertPresetDeterministicIdentity(left).localeCompare(
        encodeCaseInsertPresetDeterministicIdentity(right),
      )),
    materialConsentRequirements: plan.materialConsentRequirements
      .map(cloneValue).sort((left, right) =>
        encodeCaseInsertPresetDeterministicIdentity(left).localeCompare(
          encodeCaseInsertPresetDeterministicIdentity(right),
        )),
    preconditions: {
      ...cloneValue(plan.preconditions),
      resolvedRegions: [...plan.preconditions.resolvedRegions]
        .sort((left, right) =>
          (REGION_ORDER.get(left) ?? 99) - (REGION_ORDER.get(right) ?? 99)),
      fields: plan.preconditions.fields.map(cloneValue)
        .sort((left, right) => addressSort(left.address, right.address)),
    },
  }
  return canonical as T
}

export function createCaseInsertPresetDetachReviewIdentity<
  T extends DetachPlanContentIdentityInput,
>(plan: T) {
  const prefix = (plan as Readonly<{ formatVersion?: unknown }>).formatVersion ===
      CASE_INSERT_PRESET_TYPED_DETACH_PLAN_FORMAT_VERSION
    ? CASE_INSERT_PRESET_TYPED_DETACH_REVIEW_IDENTITY_PREFIX
    : CASE_INSERT_PRESET_DETACH_REVIEW_IDENTITY_PREFIX
  return `${prefix}${
    encodeCaseInsertPresetDeterministicIdentity(
      canonicalizeCaseInsertPresetDetachPlanContent(plan),
    )
  }`
}

export function createCaseInsertPresetDetachPlanIdentity<
  T extends DetachPlanContentIdentityInput & Readonly<{
    reviewIdentity: string
  }>,
>(plan: T) {
  const { reviewIdentity, ...content } = plan
  const prefix = (plan as Readonly<{ formatVersion?: unknown }>).formatVersion ===
      CASE_INSERT_PRESET_TYPED_DETACH_PLAN_FORMAT_VERSION
    ? CASE_INSERT_PRESET_TYPED_DETACH_PLAN_IDENTITY_PREFIX
    : CASE_INSERT_PRESET_DETACH_PLAN_IDENTITY_PREFIX
  return `${prefix}${
    encodeCaseInsertPresetDeterministicIdentity({
      ...canonicalizeCaseInsertPresetDetachPlanContent(content),
      reviewIdentity,
    })
  }`
}

export function createCaseInsertPresetDetachReviewAcceptanceIdentity(
  acceptance: Readonly<Record<string, unknown>>,
) {
  return `${CASE_INSERT_PRESET_DETACH_REVIEW_ACCEPTANCE_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(cloneValue(acceptance))
  }`
}

export function createCaseInsertPresetDetachConsentAcceptanceIdentity(
  acceptance: Readonly<Record<string, unknown>>,
) {
  return `${CASE_INSERT_PRESET_DETACH_CONSENT_ACCEPTANCE_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(cloneValue(acceptance))
  }`
}

export function createCaseInsertPresetDetachTransitionIdentity(
  transition: Readonly<Record<string, unknown>>,
) {
  return `${CASE_INSERT_PRESET_DETACH_TRANSITION_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(cloneValue(transition))
  }`
}

export function createCaseInsertPresetDetachConfigurationReleaseIdentity(
  release: Readonly<Record<string, unknown>>,
) {
  return `${CASE_INSERT_PRESET_DETACH_CONFIGURATION_RELEASE_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(cloneValue(release))
  }`
}
