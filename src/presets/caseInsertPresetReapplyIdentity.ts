import {
  createCaseInsertPresetIdentityDigest,
  createCaseInsertPresetIdentityDigestFromChunks,
} from './caseInsertPresetIdentityDigest.ts'

type AddressIdentityInput = Readonly<{
  region: string
  featureOwnerId: string
  runtimeObjectId: string
  fieldId: string
  bindingId: string
}>

type SourceIdentityInput = Readonly<{
  region: string
  slotId: string
  assignmentId: string
}>

type FieldEffectIdentityInput = Readonly<{
  address: AddressIdentityInput
  disposition: string
  previousSources: readonly SourceIdentityInput[]
  selectedSources: readonly SourceIdentityInput[]
  projectedSources: readonly SourceIdentityInput[]
}>

type ConsentRequirementIdentityInput = Readonly<{
  kind: string
  address: AddressIdentityInput | null
  sources: readonly SourceIdentityInput[]
  assignmentIds: readonly string[]
  regions: readonly string[]
}>

type ReapplyPlanContentIdentityInput = Readonly<{
  resolvedRegions: readonly string[]
  resolvedAssignments: readonly Readonly<{
    region: string
    ownerId: string
    bindingId: string
    assignmentId: string
  }>[]
  selectedFootprint: readonly Readonly<{
    address: AddressIdentityInput
    sources: readonly SourceIdentityInput[]
  }>[]
  fieldEffects: readonly FieldEffectIdentityInput[]
  aggregateWrites: readonly Readonly<{
    address: AddressIdentityInput
    sources: readonly SourceIdentityInput[]
    materialConsentRequirementIds: readonly string[]
  }>[]
  preservedCustomizedFields: readonly FieldEffectIdentityInput[]
  newlyClaimedFields: readonly FieldEffectIdentityInput[]
  retiredFields: readonly FieldEffectIdentityInput[]
  projectedConfiguration: Readonly<{
    resolvedRegions: readonly string[]
    ownedFields: readonly Readonly<{
      address: AddressIdentityInput
      sources: readonly SourceIdentityInput[]
    }>[]
  }>
  preservationDecisions: readonly unknown[]
  skips: readonly unknown[]
  warnings: readonly Readonly<{ kind: string }>[]
  materialConsentRequirements:
    readonly (ConsentRequirementIdentityInput & Readonly<{ id: string }>)[]
  preconditions: Readonly<{
    resolvedRegions: readonly string[]
    fields: readonly Readonly<{ address: AddressIdentityInput }>[]
  }>
}>

export const CASE_INSERT_PRESET_REAPPLY_PLAN_KIND =
  'sbls/case-insert-preset-reapply-plan' as const
export const CASE_INSERT_PRESET_REAPPLY_PLAN_FORMAT_VERSION = 2 as const
export const CASE_INSERT_PRESET_REAPPLY_CONFIGURATION_PROJECTION_KIND =
  'sbls/case-insert-preset-reapply-configuration-projection' as const

export const CASE_INSERT_PRESET_REAPPLY_REVIEW_IDENTITY_PREFIX =
  'case:preset-reapply-review:v2:' as const
export const CASE_INSERT_PRESET_REAPPLY_PLAN_IDENTITY_PREFIX =
  'case:preset-reapply-plan:v2:' as const
export const CASE_INSERT_PRESET_REAPPLY_CONSENT_IDENTITY_PREFIX =
  'case:preset-reapply-consent:v1:' as const
export const CASE_INSERT_PRESET_REAPPLY_WARNING_IDENTITY_PREFIX =
  'case:preset-reapply-warning:v1:' as const
export const CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_IDENTITY_PREFIX =
  'case:preset-reapply-review-acceptance:v1:' as const
export const CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_IDENTITY_PREFIX =
  'case:preset-reapply-consent-acceptance:v1:' as const
export const CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_PREFIX =
  'case:preset-reapply-transition:v1:' as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const REGION_ORDER = new Map([
  ['front-cover', 0],
  ['tray-card', 1],
  ['back-panel', 2],
  ['left-spine', 3],
  ['right-spine', 4],
])
const FIELD_ORDER = new Map([
  ['layout-x', 0],
  ['layout-y', 1],
  ['layout-scale', 2],
  ['layout-width', 3],
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

function canonicalSources<T extends SourceIdentityInput>(sources: readonly T[]) {
  return sources.map(cloneValue).sort(sourceSort)
}

function canonicalEffect<T extends FieldEffectIdentityInput>(effect: T): T {
  return {
    ...cloneValue(effect),
    previousSources: canonicalSources(effect.previousSources),
    selectedSources: canonicalSources(effect.selectedSources),
    projectedSources: canonicalSources(effect.projectedSources),
  } as T
}

function canonicalRequirement<T extends ConsentRequirementIdentityInput>(
  requirement: T,
): T {
  return {
    ...cloneValue(requirement),
    sources: canonicalSources(requirement.sources),
    assignmentIds: [...requirement.assignmentIds].sort(),
    regions: [...requirement.regions].sort((left, right) =>
      (REGION_ORDER.get(left) ?? 99) - (REGION_ORDER.get(right) ?? 99)),
  } as T
}

type DeterministicIdentityEncodingPlan =
  | Readonly<{
      kind: 'literal'
      encodedLength: number
      literal: string
    }>
  | Readonly<{
      kind: 'string'
      encodedLength: number
      prefix: string
      value: string
    }>
  | Readonly<{
      kind: 'container'
      encodedLength: number
      prefix: string
      children: readonly (DeterministicIdentityEncodingPlan | undefined)[]
    }>

const DETERMINISTIC_IDENTITY_MAX_DEPTH = 256

function addDeterministicIdentityLength(left: number, right: number) {
  const result = left + right
  if (!Number.isSafeInteger(result)) {
    throw new Error('Deterministic identity encoding is too large.')
  }
  return result
}

function createDeterministicIdentityEncodingPlan(
  value: unknown,
  ancestors = new WeakSet<object>(),
  depth = 0,
): DeterministicIdentityEncodingPlan {
  if (depth > DETERMINISTIC_IDENTITY_MAX_DEPTH) {
    throw new Error('Deterministic identity encoding is too deep.')
  }
  if (value === null) {
    return { kind: 'literal', encodedLength: 3, literal: 'n0:' }
  }
  if (typeof value === 'boolean') {
    const literal = `b1:${value ? '1' : '0'}`
    return { kind: 'literal', encodedLength: literal.length, literal }
  }
  if (typeof value === 'number') {
    const encoded = Object.is(value, -0) ? '-0' : String(value)
    const literal = `d${encoded.length}:${encoded}`
    return { kind: 'literal', encodedLength: literal.length, literal }
  }
  if (typeof value === 'string') {
    const prefix = `s${value.length}:`
    return {
      kind: 'string',
      encodedLength: addDeterministicIdentityLength(
        prefix.length,
        value.length,
      ),
      prefix,
      value,
    }
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new Error('Cyclic deterministic identity value.')
    }
    ancestors.add(value)
    try {
      const children = value.map((child) =>
        createDeterministicIdentityEncodingPlan(
          child,
          ancestors,
          depth + 1,
        ))
      let bodyLength = 0
      children.forEach((child) => {
        bodyLength = addDeterministicIdentityLength(
          bodyLength,
          child.encodedLength,
        )
      })
      const prefix = `a${value.length}:${bodyLength}:`
      return {
        kind: 'container',
        encodedLength: addDeterministicIdentityLength(
          prefix.length,
          bodyLength,
        ),
        prefix,
        children,
      }
    } finally {
      ancestors.delete(value)
    }
  }
  if (isRecord(value)) {
    if (ancestors.has(value)) {
      throw new Error('Cyclic deterministic identity value.')
    }
    ancestors.add(value)
    try {
      const children: DeterministicIdentityEncodingPlan[] = []
      for (const key of Object.keys(value).sort()) {
        children.push(
          createDeterministicIdentityEncodingPlan(
            key,
            ancestors,
            depth + 1,
          ),
          createDeterministicIdentityEncodingPlan(
            value[key],
            ancestors,
            depth + 1,
          ),
        )
      }
      let bodyLength = 0
      for (const child of children) {
        bodyLength = addDeterministicIdentityLength(
          bodyLength,
          child.encodedLength,
        )
      }
      const prefix = `o${children.length / 2}:${bodyLength}:`
      return {
        kind: 'container',
        encodedLength: addDeterministicIdentityLength(
          prefix.length,
          bodyLength,
        ),
        prefix,
        children,
      }
    } finally {
      ancestors.delete(value)
    }
  }
  throw new Error('Unsupported deterministic identity value.')
}

function* emitDeterministicIdentityEncoding(
  plan: DeterministicIdentityEncodingPlan,
): Generator<string> {
  if (plan.kind === 'literal') {
    yield plan.literal
    return
  }
  yield plan.prefix
  if (plan.kind === 'string') {
    yield plan.value
    return
  }
  for (let index = 0; index < plan.children.length; index += 1) {
    if (!(index in plan.children)) continue
    const child = plan.children[index]
    if (child) yield* emitDeterministicIdentityEncoding(child)
  }
}

export function encodeCaseInsertPresetDeterministicIdentity(
  value: unknown,
): string {
  return [...emitDeterministicIdentityEncoding(
    createDeterministicIdentityEncodingPlan(value),
  )].join('')
}

export function createCaseInsertPresetDeterministicIdentityDigest(
  value: unknown,
) {
  return createCaseInsertPresetIdentityDigestFromChunks(
    emitDeterministicIdentityEncoding(
      createDeterministicIdentityEncodingPlan(value),
    ),
  )
}

export function createCaseInsertPresetReapplyReviewIdentity<
  T extends ReapplyPlanContentIdentityInput,
>(plan: T) {
  const canonical = canonicalizeCaseInsertPresetReapplyPlanContent(plan)
  return `${CASE_INSERT_PRESET_REAPPLY_REVIEW_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(canonical)
  }`
}

export function createCaseInsertPresetReapplyPlanIdentity<
  T extends ReapplyPlanContentIdentityInput & Readonly<{
    reviewIdentity: string
  }>,
>(plan: T) {
  const { reviewIdentity, ...content } = plan
  return `${CASE_INSERT_PRESET_REAPPLY_PLAN_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity({
      ...canonicalizeCaseInsertPresetReapplyPlanContent(content),
      reviewIdentity,
    })
  }`
}

export function createCaseInsertPresetReapplyConsentRequirementId<
  T extends ConsentRequirementIdentityInput,
>(requirement: T) {
  const canonical = canonicalRequirement(requirement)
  return `${CASE_INSERT_PRESET_REAPPLY_CONSENT_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(canonical)
  }`
}

export function canonicalizeCaseInsertPresetReapplyConsentRequirement<
  T extends ConsentRequirementIdentityInput,
>(requirement: T): T & Readonly<{ id: string }> {
  const canonical = canonicalRequirement(requirement)
  return {
    id: createCaseInsertPresetReapplyConsentRequirementId(canonical),
    ...canonical,
  }
}

export function createCaseInsertPresetReapplyWarningIdentity<
  T extends Readonly<{ kind: string }>,
>(warning: T) {
  const record = warning as Readonly<Record<string, unknown>>
  const nested = isRecord(record.warning) ? record.warning : null
  const canonical = warning.kind === 'selected-layout-warning' && nested &&
      nested.kind === 'multiple-concrete-regions' &&
      Array.isArray(nested.regions) && Array.isArray(nested.assignmentIds)
    ? {
        ...cloneValue(warning),
        warning: {
          ...cloneValue(nested),
          regions: [...nested.regions as string[]].sort((left, right) =>
            (REGION_ORDER.get(left) ?? 99) -
              (REGION_ORDER.get(right) ?? 99)),
          assignmentIds: [...nested.assignmentIds as string[]].sort(),
        },
      }
    : cloneValue(warning)
  return `${CASE_INSERT_PRESET_REAPPLY_WARNING_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(canonical)
  }`
}

export function canonicalizeCaseInsertPresetReapplyPlanContent<
  T extends ReapplyPlanContentIdentityInput,
>(plan: T): T {
  const effects = plan.fieldEffects.map(canonicalEffect).sort((left, right) =>
    addressSort(left.address, right.address))
  const requirements = plan.materialConsentRequirements.map((requirement) => {
    const content = Object.fromEntries(
      Object.entries(requirement).filter(([key]) => key !== 'id'),
    ) as ConsentRequirementIdentityInput
    const canonical = canonicalRequirement(content)
    return canonicalizeCaseInsertPresetReapplyConsentRequirement(canonical)
  }).sort((left, right) =>
    left.kind.localeCompare(right.kind) ||
    (left.address && right.address
      ? addressSort(left.address, right.address)
      : left.address ? 1 : right.address ? -1 : 0) ||
    left.id.localeCompare(right.id))
  const warnings = plan.warnings.map(cloneValue).sort((left, right) =>
    left.kind.localeCompare(right.kind) ||
    encodeCaseInsertPresetDeterministicIdentity(left).localeCompare(
      encodeCaseInsertPresetDeterministicIdentity(right),
    ))
  const canonical = {
    ...cloneValue(plan),
    resolvedRegions: [...plan.resolvedRegions].sort((left, right) =>
      (REGION_ORDER.get(left) ?? 99) - (REGION_ORDER.get(right) ?? 99)),
    resolvedAssignments: plan.resolvedAssignments.map(cloneValue).sort(
      (left, right) =>
        (REGION_ORDER.get(left.region) ?? 99) -
          (REGION_ORDER.get(right.region) ?? 99) ||
        left.ownerId.localeCompare(right.ownerId) ||
        left.bindingId.localeCompare(right.bindingId) ||
        left.assignmentId.localeCompare(right.assignmentId),
    ),
    selectedFootprint: plan.selectedFootprint.map((field) => ({
      ...cloneValue(field),
      sources: canonicalSources(field.sources),
    })).sort((left, right) => addressSort(left.address, right.address)),
    fieldEffects: effects,
    aggregateWrites: plan.aggregateWrites.map((write) => ({
      ...cloneValue(write),
      sources: canonicalSources(write.sources),
      materialConsentRequirementIds:
        [...write.materialConsentRequirementIds].sort(),
    })).sort((left, right) => addressSort(left.address, right.address)),
    preservedCustomizedFields: effects.filter(({ disposition }) =>
      disposition === 'retained-customized-preserve'),
    newlyClaimedFields: effects.filter(({ disposition }) =>
      disposition === 'new-claim'),
    retiredFields: effects.filter(({ disposition }) => disposition === 'retired'),
    projectedConfiguration: {
      ...cloneValue(plan.projectedConfiguration),
      resolvedRegions: [...plan.projectedConfiguration.resolvedRegions].sort(
        (left, right) =>
          (REGION_ORDER.get(left) ?? 99) - (REGION_ORDER.get(right) ?? 99),
      ),
      ownedFields: plan.projectedConfiguration.ownedFields.map((field) => ({
        ...cloneValue(field),
        sources: canonicalSources(field.sources),
      })).sort((left, right) => addressSort(left.address, right.address)),
    },
    preservationDecisions: plan.preservationDecisions.map(cloneValue).sort(
      (left, right) =>
        encodeCaseInsertPresetDeterministicIdentity(left).localeCompare(
          encodeCaseInsertPresetDeterministicIdentity(right),
        ),
    ),
    skips: plan.skips.map(cloneValue).sort((left, right) =>
      encodeCaseInsertPresetDeterministicIdentity(left).localeCompare(
        encodeCaseInsertPresetDeterministicIdentity(right),
      )),
    warnings,
    materialConsentRequirements: requirements,
    preconditions: {
      ...cloneValue(plan.preconditions),
      resolvedRegions: [...plan.preconditions.resolvedRegions].sort(
        (left, right) =>
          (REGION_ORDER.get(left) ?? 99) - (REGION_ORDER.get(right) ?? 99),
      ),
      fields: plan.preconditions.fields.map(cloneValue).sort((left, right) =>
        addressSort(left.address, right.address)),
    },
  }
  return canonical as T
}

export function createCaseInsertPresetReapplyReviewAcceptanceIdentity(
  acceptance: Readonly<Record<string, unknown>>,
) {
  return `${CASE_INSERT_PRESET_REAPPLY_REVIEW_ACCEPTANCE_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(acceptance)
  }`
}

export function createCaseInsertPresetReapplyConsentAcceptanceIdentity(
  acceptance: Readonly<Record<string, unknown>>,
) {
  return `${CASE_INSERT_PRESET_REAPPLY_CONSENT_ACCEPTANCE_IDENTITY_PREFIX}${
    encodeCaseInsertPresetDeterministicIdentity(acceptance)
  }`
}

export function createCaseInsertPresetReapplyTransitionIdentity(
  transition: Readonly<Record<string, unknown>>,
) {
  return `${CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_PREFIX}${
    createCaseInsertPresetIdentityDigest(
      encodeCaseInsertPresetDeterministicIdentity(transition),
    )
  }`
}
