import {
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS,
  CASE_INSERT_PRESET_OWNER_IDS,
  getCaseInsertPresetApplicationScopeKey,
  isCaseInsertPresetEmptyTargetCreationCompatibleV2,
  isCaseInsertPresetCoordinateBasis,
  isCaseInsertPresetConcreteRegionId,
  parseCaseInsertPresetApplicationScope,
  parseCaseInsertPresetDefinition,
  type CaseInsertPresetApplicationScope,
  type CaseInsertPresetConcreteRegionId,
  type CaseInsertPresetCoordinateBasis,
  type CaseInsertPresetDefinition,
  type CaseInsertPresetOwnerId,
} from './caseInsertPresetDefinition.ts'

export type CaseInsertPresetCompatibilityReasonCode =
  | 'definition-invalid'
  | 'project-kind-incompatible'
  | 'template-id-incompatible'
  | 'scope-invalid'
  | 'scope-unsupported'
  | 'region-unavailable'
  | 'coordinate-basis-unavailable'
  | 'owner-unavailable'
  | 'repeated-object-unavailable'

export type CaseInsertPresetCompatibilityReason = Readonly<{
  code: CaseInsertPresetCompatibilityReasonCode
  path: string
  severity: 'warning' | 'error'
}>

export type CaseInsertPresetCompatibilityStatus =
  | 'compatible'
  | 'compatible-with-warnings'
  | 'incompatible'

export type CaseInsertPresetTemplateCapability = Readonly<{
  region: CaseInsertPresetConcreteRegionId
  coordinateBases: readonly CaseInsertPresetCoordinateBasis[]
}>

export type CaseInsertPresetOwnerCapability = Readonly<{
  ownerId: CaseInsertPresetOwnerId
  repeatedObjectIds: readonly string[]
}>

export type CaseInsertPresetCompatibilityContext = Readonly<{
  projectKind: string
  templateId: string
  templateCapabilities: readonly CaseInsertPresetTemplateCapability[]
  ownerCapabilities: readonly CaseInsertPresetOwnerCapability[]
  requestedScope: unknown
}>

export type CaseInsertPresetCompatibilityResult = Readonly<{
  status: CaseInsertPresetCompatibilityStatus
  reasons: readonly CaseInsertPresetCompatibilityReason[]
  definition: CaseInsertPresetDefinition | null
  requestedScope: CaseInsertPresetApplicationScope | null
}>

const OWNER_ID_SET = new Set<string>(CASE_INSERT_PRESET_OWNER_IDS)
const REGION_ORDER = new Map(
  CASE_INSERT_PRESET_CONCRETE_REGION_IDS.map((region, index) => [region, index]),
)

function reason(
  code: CaseInsertPresetCompatibilityReasonCode,
  path: string,
): CaseInsertPresetCompatibilityReason {
  return Object.freeze({
    code,
    path,
    severity: code === 'repeated-object-unavailable' ? 'warning' : 'error',
  })
}

function finish(
  reasons: CaseInsertPresetCompatibilityReason[],
  definition: CaseInsertPresetDefinition | null,
  requestedScope: CaseInsertPresetApplicationScope | null,
): CaseInsertPresetCompatibilityResult {
  return Object.freeze({
    status: reasons.some(({ severity }) => severity === 'error')
      ? 'incompatible'
      : reasons.length > 0
        ? 'compatible-with-warnings'
        : 'compatible',
    reasons: Object.freeze(reasons),
    definition,
    requestedScope,
  })
}

function collectTemplateCapabilities(
  capabilities: readonly CaseInsertPresetTemplateCapability[],
) {
  const byRegion = new Map<
    CaseInsertPresetConcreteRegionId,
    ReadonlySet<CaseInsertPresetCoordinateBasis>
  >()

  for (const capability of capabilities) {
    if (!isCaseInsertPresetConcreteRegionId(capability.region)) continue
    const bases = new Set<CaseInsertPresetCoordinateBasis>()
    for (const basis of capability.coordinateBases) {
      if (isCaseInsertPresetCoordinateBasis(basis)) bases.add(basis)
    }
    byRegion.set(capability.region, bases)
  }
  return byRegion
}

function collectOwnerCapabilities(
  capabilities: readonly CaseInsertPresetOwnerCapability[],
) {
  const byOwner = new Map<CaseInsertPresetOwnerId, ReadonlySet<string>>()
  for (const capability of capabilities) {
    if (!OWNER_ID_SET.has(capability.ownerId)) continue
    byOwner.set(
      capability.ownerId,
      new Set(capability.repeatedObjectIds.filter((id) => typeof id === 'string')),
    )
  }
  return byOwner
}

export function evaluateCaseInsertPresetCompatibility(
  rawDefinition: unknown,
  context: CaseInsertPresetCompatibilityContext,
): CaseInsertPresetCompatibilityResult {
  const parsedDefinition = parseCaseInsertPresetDefinition(rawDefinition)
  if (!parsedDefinition.ok) {
    return finish([
      reason(
        'definition-invalid',
        `definition.${parsedDefinition.error.path}`,
      ),
    ], null, null)
  }
  const definition = parsedDefinition.value

  const parsedScope = parseCaseInsertPresetApplicationScope(
    context.requestedScope,
    'requestedScope',
  )
  const requestedScope = parsedScope.ok ? parsedScope.value : null
  const reasons: CaseInsertPresetCompatibilityReason[] = []

  if (context.projectKind !== 'caseInsert') {
    reasons.push(reason('project-kind-incompatible', 'projectKind'))
  }

  if (definition.compatibility.mode === 'specific-template' &&
      definition.compatibility.templateId !== context.templateId) {
    reasons.push(reason('template-id-incompatible', 'templateId'))
  }

  if (!requestedScope) {
    reasons.push(reason('scope-invalid', 'requestedScope'))
  } else {
    const requestedKey = getCaseInsertPresetApplicationScopeKey(requestedScope)
    const supported = definition.applicationScopes.some((scope) =>
      getCaseInsertPresetApplicationScopeKey(scope) === requestedKey)
    if (!supported) reasons.push(reason('scope-unsupported', 'requestedScope'))
  }

  const templateCapabilities = collectTemplateCapabilities(
    context.templateCapabilities,
  )
  const ownerCapabilities = collectOwnerCapabilities(context.ownerCapabilities)
  const checkedRegions = new Set<CaseInsertPresetConcreteRegionId>()
  const checkedBases = new Set<string>()
  const checkedOwners = new Set<CaseInsertPresetOwnerId>()
  const checkedRepeatedObjects = new Set<string>()

  for (const slot of definition.slots) {
    for (const assignment of slot.assignments) {
      if (!checkedRegions.has(assignment.region)) {
        checkedRegions.add(assignment.region)
        if (!templateCapabilities.has(assignment.region)) {
          reasons.push(reason(
            'region-unavailable',
            `regions.${assignment.region}`,
          ))
        }
      }

      const basisKey = `${assignment.region}\u0000${assignment.coordinateBasis}`
      if (!checkedBases.has(basisKey)) {
        checkedBases.add(basisKey)
        const supportedBases = templateCapabilities.get(assignment.region)
        if (supportedBases && !supportedBases.has(assignment.coordinateBasis)) {
          reasons.push(reason(
            'coordinate-basis-unavailable',
            `regions.${assignment.region}.${assignment.coordinateBasis}`,
          ))
        }
      }

      if (!checkedOwners.has(assignment.ownerId)) {
        checkedOwners.add(assignment.ownerId)
        if (!ownerCapabilities.has(assignment.ownerId)) {
          reasons.push(reason(
            'owner-unavailable',
            `owners.${assignment.ownerId}`,
          ))
        }
      }

      if (assignment.object.kind === 'repeated') {
        const objectKey = `${assignment.ownerId}\u0000${assignment.object.id}`
        if (!checkedRepeatedObjects.has(objectKey)) {
          checkedRepeatedObjects.add(objectKey)
          const availableObjects = ownerCapabilities.get(assignment.ownerId)
          const createsReviewedEmptyTarget =
            'missingTargetPolicy' in assignment &&
            assignment.missingTargetPolicy === 'create-empty' &&
            isCaseInsertPresetEmptyTargetCreationCompatibleV2({
              definitionId: definition.id,
              definitionRevision: definition.revision,
              compatibility: definition.compatibility,
              assignmentId: assignment.id,
              region: assignment.region,
              coordinateBasis: assignment.coordinateBasis,
              roleId: slot.roleId,
              ownerId: assignment.ownerId,
              object: assignment.object,
              targetPresence: assignment.targetPresence,
              contentRegion: assignment.contentRegion,
              actionRegion: assignment.actionRegion,
              artworkViewport: assignment.artworkViewport,
            })
          if (availableObjects && !availableObjects.has(assignment.object.id) &&
              !createsReviewedEmptyTarget) {
            reasons.push(reason(
              'repeated-object-unavailable',
              `owners.${assignment.ownerId}.objects.${assignment.object.id}`,
            ))
          }
        }
      }
    }
  }

  reasons.sort((left, right) => {
    const leftRegion = left.path.split('.')[1] ?? ''
    const rightRegion = right.path.split('.')[1] ?? ''
    const regionDifference =
      (REGION_ORDER.get(leftRegion as CaseInsertPresetConcreteRegionId) ?? 99) -
      (REGION_ORDER.get(rightRegion as CaseInsertPresetConcreteRegionId) ?? 99)
    return regionDifference ||
      left.code.localeCompare(right.code) ||
      left.path.localeCompare(right.path)
  })

  return finish(reasons, definition, requestedScope)
}
