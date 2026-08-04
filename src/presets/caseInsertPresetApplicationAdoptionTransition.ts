import {
  CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND,
  type CaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import {
  validateCaseInsertPresetAggregateContent,
} from '../caseInsert/presetAggregateIdentity.ts'
import {
  createCaseInsertPresetUnattachedEndpoint,
  type CaseInsertPresetAttachmentEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'
import {
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_KIND,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_VERSION,
  auditCaseInsertPresetApplicationAdoptionEvidence,
  createCaseInsertPresetApplicationSnapshot,
  createCaseInsertPresetAttachedState,
  createCaseInsertPresetUnattachedState,
  projectCaseInsertPresetApplicationAdoptionIdentity,
  projectCaseInsertPresetApplicationStateIdentity,
  validateCaseInsertPresetApplicationSnapshot,
  type CaseInsertPresetAdoptionModelFailure,
  type CaseInsertPresetAdoptionModelFailureStatus,
  type CaseInsertPresetAggregateEvidenceGap,
  type CaseInsertPresetApplicationAdoptionEvidence,
  type CaseInsertPresetApplicationAdoptionOperation,
  type CaseInsertPresetApplicationAdoptionReceipt,
  type CaseInsertPresetApplicationSnapshot,
  type CaseInsertPresetAttachedState,
  type CaseInsertPresetDetachApplicationAdoptionReceipt,
  type CaseInsertPresetReapplyApplicationAdoptionReceipt,
  type CaseInsertPresetApplyApplicationAdoptionReceipt,
  type CaseInsertPresetUnattachedState,
} from './caseInsertPresetConfigurationAdoptionModel.ts'
import {
  cloneCaseInsertPresetPlainInput,
  deepFreezeCaseInsertPresetValue,
  hasExactCaseInsertPresetKeys,
  sameCaseInsertPresetValue,
} from './caseInsertPresetSafeInput.ts'

export const CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND =
  'sbls/case-insert-preset-application-adoption-transition' as const
export const CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION =
  1 as const
export const CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND =
  'sbls/case-insert-preset-validated-adoption-success-bundle' as const
export const CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION =
  1 as const

export type CaseInsertPresetApplicationAdoptionTransitionInput = Readonly<{
  kind: typeof CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND
  formatVersion:
    typeof CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION
  operation: CaseInsertPresetApplicationAdoptionOperation
  current: CaseInsertPresetApplicationSnapshot
  evidence: CaseInsertPresetApplicationAdoptionEvidence
}>

export type CaseInsertPresetApplicationAdoptionTransitionFailureStatus =
  | CaseInsertPresetAdoptionModelFailureStatus
  | 'invalid-adoption-transition'
  | 'unsupported-adoption-transition-version'
  | 'adoption-operation-mismatch'
  | 'stale-application-snapshot'
  | 'source-aggregate-mismatch'
  | 'result-aggregate-mismatch'
  | 'successor-application-invalid'
  | 'invalid-adoption-success-bundle'
  | 'unsupported-adoption-success-bundle-version'
  | 'adoption-success-mismatch'

export type CaseInsertPresetApplicationAdoptionTransitionFailure = Readonly<{
  ok: false
  status: CaseInsertPresetApplicationAdoptionTransitionFailureStatus
  code: string
  operation?: CaseInsertPresetApplicationAdoptionOperation
  dimensions?: readonly string[]
  gaps?: readonly CaseInsertPresetAggregateEvidenceGap[]
}>

declare const CASE_INSERT_PRESET_COHERENT_APPLICATION_ADOPTION: unique symbol

type CoherentApplicationAdoption = Readonly<{
  [CASE_INSERT_PRESET_COHERENT_APPLICATION_ADOPTION]: true
}>

export type CaseInsertPresetApplicationAdoptionTransitionResult =
  | (Readonly<{
      ok: true
      status: 'adopted'
      operation: 'apply'
      state: Readonly<
        Omit<CaseInsertPresetApplicationSnapshot, 'attachment'> & {
          attachment: CaseInsertPresetAttachedState
        }
      >
      receipt: CaseInsertPresetApplyApplicationAdoptionReceipt
    }> & CoherentApplicationAdoption)
  | (Readonly<{
      ok: true
      status: 'adopted'
      operation: 'reapply'
      state: Readonly<
        Omit<CaseInsertPresetApplicationSnapshot, 'attachment'> & {
          attachment: CaseInsertPresetAttachedState
        }
      >
      receipt: CaseInsertPresetReapplyApplicationAdoptionReceipt
    }> & CoherentApplicationAdoption)
  | (Readonly<{
      ok: true
      status: 'adopted'
      operation: 'detach'
      state: Readonly<
        Omit<CaseInsertPresetApplicationSnapshot, 'attachment'> & {
          attachment: CaseInsertPresetUnattachedState
        }
      >
      receipt: CaseInsertPresetDetachApplicationAdoptionReceipt
    }> & CoherentApplicationAdoption)
  | CaseInsertPresetApplicationAdoptionTransitionFailure

type SuccessResult = Exclude<
  CaseInsertPresetApplicationAdoptionTransitionResult,
  { ok: false }
>

type ValidatedAdoptionSuccessBundleFor<
  Operation extends CaseInsertPresetApplicationAdoptionOperation,
> = Readonly<{
  kind: typeof CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND
  formatVersion:
    typeof CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION
  operation: Operation
  current: CaseInsertPresetApplicationSnapshot
  evidence: Extract<
    CaseInsertPresetApplicationAdoptionEvidence,
    { operation: Operation }
  >
  adoption: Extract<SuccessResult, { operation: Operation }>
}>

export type CaseInsertPresetValidatedAdoptionSuccessBundle =
  | ValidatedAdoptionSuccessBundleFor<'apply'>
  | ValidatedAdoptionSuccessBundleFor<'reapply'>
  | ValidatedAdoptionSuccessBundleFor<'detach'>

export type AuditCaseInsertPresetAdoptionSuccessBundleResult =
  | Readonly<{
      ok: true
      status: 'validated'
      bundle: CaseInsertPresetValidatedAdoptionSuccessBundle
    }>
  | CaseInsertPresetApplicationAdoptionTransitionFailure
type ApplyEvidence = Extract<
  CaseInsertPresetApplicationAdoptionEvidence,
  { operation: 'apply' }
>
type ReapplyEvidence = Extract<
  CaseInsertPresetApplicationAdoptionEvidence,
  { operation: 'reapply' }
>
type DetachEvidence = Extract<
  CaseInsertPresetApplicationAdoptionEvidence,
  { operation: 'detach' }
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTransitionFailure(
  value: unknown,
): value is CaseInsertPresetApplicationAdoptionTransitionFailure {
  return isRecord(value) && value.ok === false
}

function failure(
  status: CaseInsertPresetApplicationAdoptionTransitionFailureStatus,
  code: string,
  options: Readonly<{
    operation?: CaseInsertPresetApplicationAdoptionOperation
    dimensions?: readonly string[]
    gaps?: readonly CaseInsertPresetAggregateEvidenceGap[]
  }> = {},
): CaseInsertPresetApplicationAdoptionTransitionFailure {
  return deepFreezeCaseInsertPresetValue({
    ok: false as const,
    status,
    code,
    ...(options.operation ? { operation: options.operation } : {}),
    ...(options.dimensions ? { dimensions: [...options.dimensions] } : {}),
    ...(options.gaps ? { gaps: [...options.gaps] } : {}),
  })
}

function fromModelFailure(
  value: CaseInsertPresetAdoptionModelFailure,
  operation?: CaseInsertPresetApplicationAdoptionOperation,
): CaseInsertPresetApplicationAdoptionTransitionFailure {
  return failure(value.status, value.code, {
    operation: value.operation ?? operation,
    ...(value.dimensions ? { dimensions: value.dimensions } : {}),
    ...(value.gaps ? { gaps: value.gaps } : {}),
  })
}

function attachmentEndpoint(
  snapshot: CaseInsertPresetApplicationSnapshot,
): CaseInsertPresetAttachmentEndpoint {
  return snapshot.attachment.status === 'unattached'
    ? createCaseInsertPresetUnattachedEndpoint()
    : deepFreezeCaseInsertPresetValue({
        kind: snapshot.attachment.kind,
        formatVersion: snapshot.attachment.formatVersion,
        status: 'attached' as const,
        attachmentIdentity: snapshot.attachment.attachmentIdentity,
        configurationIdentity:
          snapshot.attachment.configuration.configurationIdentity,
      })
}

function receiptAttachment(
  endpoint: CaseInsertPresetAttachmentEndpoint,
) {
  return endpoint.status === 'unattached'
    ? deepFreezeCaseInsertPresetValue({
        status: 'unattached' as const,
        attachmentIdentity: endpoint.attachmentIdentity,
      })
    : deepFreezeCaseInsertPresetValue({
        status: 'attached' as const,
        attachmentIdentity: endpoint.attachmentIdentity,
        configurationIdentity: endpoint.configurationIdentity,
      })
}

function applicationContext(snapshot: CaseInsertPresetApplicationSnapshot) {
  return deepFreezeCaseInsertPresetValue({
    projectKind: snapshot.projectKind,
    sessionId: snapshot.snapshot.identity.sessionId,
    projectRevision: snapshot.snapshot.identity.projectRevision,
    template: {
      id: snapshot.snapshot.identity.template.id,
      revision: snapshot.snapshot.identity.template.revision,
    },
  })
}

function validateCurrentAgainstEvidence(
  current: CaseInsertPresetApplicationSnapshot,
  evidence: CaseInsertPresetApplicationAdoptionEvidence,
): CaseInsertPresetApplicationAdoptionTransitionFailure | null {
  const success = evidence.transitionResult
  const proof = success.successEvidence
  const identity = current.snapshot.identity
  const dimensions: string[] = []
  if (proof.context.projectKind !== current.projectKind) {
    dimensions.push('project-kind')
  }
  if (proof.context.sessionId !== identity.sessionId) {
    dimensions.push('session-id')
  }
  if (proof.context.projectRevision !== identity.projectRevision) {
    dimensions.push('project-revision')
  }
  if (!sameCaseInsertPresetValue(proof.context.template, identity.template)) {
    dimensions.push('template')
  }
  if (proof.context.snapshotAggregateContentIdentity !==
      identity.aggregateContentIdentity) {
    dimensions.push('snapshot-aggregate-content-identity')
  }
  if (proof.sourceAggregateContentIdentity !==
      identity.aggregateContentIdentity) {
    dimensions.push('source-aggregate-content-identity')
  }
  if (!sameCaseInsertPresetValue(success.sourceAggregate,
    current.snapshot.caseInsert)) {
    dimensions.push('source-aggregate')
  }
  if (dimensions.length > 0) {
    return failure(
      'stale-application-snapshot',
      'application-snapshot-not-transition-source',
      { operation: evidence.operation, dimensions },
    )
  }

  const currentEndpoint = attachmentEndpoint(current)
  if (!sameCaseInsertPresetValue(currentEndpoint, proof.sourceAttachment)) {
    return failure(
      'attachment-conflict',
      'current-attachment-not-transition-source',
      { operation: evidence.operation, dimensions: ['attachment'] },
    )
  }
  if (evidence.operation !== 'apply') {
    const configuredEvidence = evidence as ReapplyEvidence | DetachEvidence
    if (current.attachment.status !== 'attached' ||
        !sameCaseInsertPresetValue(
          current.attachment.configuration,
          configuredEvidence.transitionResult.sourceConfiguration,
        )) {
      return failure(
        'configuration-identity-mismatch',
        `${evidence.operation}-source-configuration-not-current`,
        { operation: evidence.operation, dimensions: ['configuration'] },
      )
    }
  }
  return null
}

function validateOperationSemantics(
  evidence: CaseInsertPresetApplicationAdoptionEvidence,
): CaseInsertPresetApplicationAdoptionTransitionFailure | null {
  const success = evidence.transitionResult
  const proof = success.successEvidence
  const sourceAggregate = validateCaseInsertPresetAggregateContent(
    success.sourceAggregate,
  )
  if (!sourceAggregate.ok || sourceAggregate.aggregateContentIdentity !==
      proof.sourceAggregateContentIdentity) {
    return failure(
      'source-aggregate-mismatch',
      'validated-source-aggregate-identity-mismatch',
      { operation: evidence.operation },
    )
  }
  const resultAggregate = validateCaseInsertPresetAggregateContent(
    success.aggregate,
  )
  if (!resultAggregate.ok || resultAggregate.aggregateContentIdentity !==
      proof.resultAggregateContentIdentity) {
    return failure(
      'result-aggregate-mismatch',
      'validated-result-aggregate-identity-mismatch',
      { operation: evidence.operation },
    )
  }
  if (evidence.operation === 'apply') {
    const apply = evidence as ApplyEvidence
    return proof.sourceConfigurationIdentity === null &&
        proof.successorConfigurationIdentity ===
          apply.transitionResult.successorConfiguration.configurationIdentity &&
        proof.configurationReleaseIdentity === null
      ? null
      : failure(
          'successor-attachment-mismatch',
          'apply-successor-configuration-evidence-mismatch',
          { operation: evidence.operation },
        )
  }
  if (evidence.operation === 'reapply') {
    const reapply = evidence as ReapplyEvidence
    return proof.sourceConfigurationIdentity ===
          reapply.transitionResult.sourceConfiguration.configurationIdentity &&
        proof.successorConfigurationIdentity ===
          reapply.transitionResult.nextConfiguration.configurationIdentity &&
        proof.sourceConfigurationIdentity !==
          proof.successorConfigurationIdentity &&
        proof.configurationReleaseIdentity === null
      ? null
      : failure(
          'successor-attachment-mismatch',
          'reapply-configuration-edge-mismatch',
          { operation: evidence.operation },
        )
  }
  const detach = evidence as DetachEvidence
  return proof.sourceConfigurationIdentity ===
        detach.transitionResult.sourceConfiguration.configurationIdentity &&
      proof.successorConfigurationIdentity === null &&
      typeof proof.configurationReleaseIdentity === 'string' &&
      proof.configurationReleaseIdentity ===
        detach.transitionResult.releaseResult.releaseIdentity &&
      proof.sourceAggregateContentIdentity ===
        proof.resultAggregateContentIdentity &&
      sameCaseInsertPresetValue(success.sourceAggregate, success.aggregate)
    ? null
    : failure(
        'invalid-release-evidence',
        'detach-release-or-aggregate-evidence-mismatch',
        { operation: evidence.operation },
      )
}

function successorAttachment(
  evidence: CaseInsertPresetApplicationAdoptionEvidence,
): CaseInsertPresetAttachedState | CaseInsertPresetUnattachedState |
  CaseInsertPresetApplicationAdoptionTransitionFailure {
  if (evidence.operation === 'detach') {
    return createCaseInsertPresetUnattachedState()
  }
  const configuration = evidence.operation === 'apply'
    ? (evidence as ApplyEvidence).transitionResult.successorConfiguration
    : (evidence as ReapplyEvidence).transitionResult.nextConfiguration
  const attached = createCaseInsertPresetAttachedState(configuration)
  return attached.ok
    ? attached.state
    : fromModelFailure(attached, evidence.operation)
}

function createSuccessorApplication(
  current: CaseInsertPresetApplicationSnapshot,
  evidence: CaseInsertPresetApplicationAdoptionEvidence,
): CaseInsertPresetApplicationSnapshot |
  CaseInsertPresetApplicationAdoptionTransitionFailure {
  const sourceRevision = current.snapshot.identity.projectRevision
  if (sourceRevision >= Number.MAX_SAFE_INTEGER) {
    return failure(
      'successor-application-invalid',
      'successor-project-revision-overflow',
      { operation: evidence.operation, dimensions: ['project-revision'] },
    )
  }
  const attachment = successorAttachment(evidence)
  if (isTransitionFailure(attachment)) return attachment
  const proof = evidence.transitionResult.successEvidence
  const successorSnapshot = deepFreezeCaseInsertPresetValue({
    kind: CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND,
    identity: {
      sessionId: current.snapshot.identity.sessionId,
      projectRevision: sourceRevision + 1,
      template: {
        id: current.snapshot.identity.template.id,
        revision: current.snapshot.identity.template.revision,
      },
      aggregateContentIdentity: proof.resultAggregateContentIdentity,
    },
    caseInsert: evidence.transitionResult.aggregate,
  } satisfies CaseInsertPresetAssignmentSnapshot)
  const created = createCaseInsertPresetApplicationSnapshot({
    snapshot: successorSnapshot,
    attachment,
  })
  return created.ok
    ? created.value
    : failure(
        'successor-application-invalid',
        created.code,
        {
          operation: evidence.operation,
          ...(created.dimensions
            ? { dimensions: created.dimensions }
            : {}),
        },
      )
}

function createReceipt(
  current: CaseInsertPresetApplicationSnapshot,
  successor: CaseInsertPresetApplicationSnapshot,
  evidence: CaseInsertPresetApplicationAdoptionEvidence,
): CaseInsertPresetApplicationAdoptionReceipt |
  CaseInsertPresetApplicationAdoptionTransitionFailure {
  const sourceStateIdentity =
    projectCaseInsertPresetApplicationStateIdentity(current)
  if (!sourceStateIdentity.ok) {
    return fromModelFailure(sourceStateIdentity, evidence.operation)
  }
  const successorStateIdentity =
    projectCaseInsertPresetApplicationStateIdentity(successor)
  if (!successorStateIdentity.ok) {
    return fromModelFailure(successorStateIdentity, evidence.operation)
  }
  const proof = evidence.transitionResult.successEvidence
  const previousAttachment = receiptAttachment(attachmentEndpoint(current))
  const nextAttachment = receiptAttachment(attachmentEndpoint(successor))
  const sourceContext = applicationContext(current)
  const nextContext = applicationContext(successor)
  const classification = evidence.operation === 'detach'
    ? 'exact-unchanged-semantic-transition-result' as const
    : 'exact-transition-result' as const
  const action = evidence.operation === 'apply'
    ? 'attached' as const
    : evidence.operation === 'reapply'
      ? 'replaced' as const
      : 'released' as const
  const identityInput = {
    operation: evidence.operation,
    consumedTransitionIdentity: proof.transitionIdentity,
    consumedWholeSuccessIdentity: proof.wholeSuccessIdentity,
    sourceApplicationStateIdentity:
      sourceStateIdentity.applicationStateIdentity,
    successorApplicationStateIdentity:
      successorStateIdentity.applicationStateIdentity,
    sourceAggregateIdentity: proof.sourceAggregateContentIdentity,
    resultAggregateIdentity: proof.resultAggregateContentIdentity,
    sourceConfigurationIdentity: proof.sourceConfigurationIdentity,
    successorConfigurationIdentity: proof.successorConfigurationIdentity,
    configurationReleaseIdentity: proof.configurationReleaseIdentity,
    source: { ...sourceContext, attachment: previousAttachment },
    successor: { ...nextContext, attachment: nextAttachment },
    aggregateAdoptionClassification: classification,
    attachmentAction: action,
  }
  const projected = projectCaseInsertPresetApplicationAdoptionIdentity(
    identityInput,
  )
  if (!projected.ok) return fromModelFailure(projected, evidence.operation)

  const common = {
    kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_KIND,
    formatVersion: CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_VERSION,
    adoptionIdentity: projected.adoptionIdentity,
    consumedTransitionIdentity: proof.transitionIdentity,
    consumedWholeSuccessIdentity: proof.wholeSuccessIdentity,
    sourceApplicationStateIdentity:
      sourceStateIdentity.applicationStateIdentity,
    successorApplicationStateIdentity:
      successorStateIdentity.applicationStateIdentity,
    sourceAggregateIdentity: proof.sourceAggregateContentIdentity,
    resultAggregateIdentity: proof.resultAggregateContentIdentity,
    sourceConfigurationIdentity: proof.sourceConfigurationIdentity,
    successorConfigurationIdentity: proof.successorConfigurationIdentity,
    configurationReleaseIdentity: proof.configurationReleaseIdentity,
    sourceApplicationContext: sourceContext,
    successorApplicationContext: nextContext,
    sourceProjectRevision: sourceContext.projectRevision,
    successorProjectRevision: nextContext.projectRevision,
    applicationAdoptionStatus: 'adopted' as const,
    atomicityProof: {
      aggregateAndAttachment:
        'one-coherent-application-domain-state' as const,
      partialSuccess: false as const,
    },
    persistence: { status: 'not-persisted' as const },
    exclusions: {
      projectSchema: 'not-changed' as const,
      saveLoad: 'not-integrated' as const,
      store: 'not-integrated' as const,
      ui: 'not-integrated' as const,
      catalog: 'not-installed' as const,
      runtime: 'not-integrated' as const,
    },
  }
  return deepFreezeCaseInsertPresetValue({
    ...common,
    operation: evidence.operation,
    previousAttachment,
    successorAttachment: nextAttachment,
    aggregateAdoptionClassification: classification,
    attachmentAction: action,
  } as CaseInsertPresetApplicationAdoptionReceipt)
}

function transitionValidatedRequest(
  value: unknown,
): CaseInsertPresetApplicationAdoptionTransitionResult {
  const cloned = cloneCaseInsertPresetPlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return failure(
      'invalid-adoption-transition',
      cloned.ok ? 'adoption-transition-root-invalid' : cloned.code,
    )
  }
  const input = cloned.value
  if (input.kind === CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND &&
      input.formatVersion !==
        CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION) {
    return failure(
      'unsupported-adoption-transition-version',
      'adoption-transition-version-unsupported',
    )
  }
  if (!hasExactCaseInsertPresetKeys(input, [
    'kind', 'formatVersion', 'operation', 'current', 'evidence',
  ]) || input.kind !==
      CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND ||
      input.formatVersion !==
        CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION) {
    return failure(
      'invalid-adoption-transition',
      'adoption-transition-shape-invalid',
    )
  }
  if (input.operation !== 'apply' && input.operation !== 'reapply' &&
      input.operation !== 'detach') {
    return failure(
      'unsupported-operation',
      'adoption-transition-operation-unsupported',
    )
  }
  const operation = input.operation
  if (isRecord(input.evidence) &&
      typeof input.evidence.operation === 'string' &&
      input.evidence.operation !== operation) {
    return failure(
      'adoption-operation-mismatch',
      'adoption-transition-evidence-operation-mismatch',
      { operation },
    )
  }
  const current = validateCaseInsertPresetApplicationSnapshot(input.current)
  if (!current.ok) return fromModelFailure(current, operation)
  const audited = auditCaseInsertPresetApplicationAdoptionEvidence(
    input.evidence,
  )
  if (!audited.ok) return fromModelFailure(audited, operation)
  if (audited.evidence.operation !== operation) {
    return failure(
      'adoption-operation-mismatch',
      'validated-evidence-operation-mismatch',
      { operation },
    )
  }
  const currentMismatch = validateCurrentAgainstEvidence(
    current.value,
    audited.evidence,
  )
  if (currentMismatch) return currentMismatch
  const operationMismatch = validateOperationSemantics(audited.evidence)
  if (operationMismatch) return operationMismatch
  const successor = createSuccessorApplication(
    current.value,
    audited.evidence,
  )
  if (isTransitionFailure(successor)) return successor
  const receipt = createReceipt(current.value, successor, audited.evidence)
  if (isTransitionFailure(receipt)) return receipt
  return deepFreezeCaseInsertPresetValue({
    ok: true,
    status: 'adopted' as const,
    operation,
    state: successor,
    receipt,
  }) as SuccessResult
}

/**
 * Atomically adopts one already-validated transition result into one detached
 * application snapshot. This pure boundary never executes a planner,
 * operation transition, catalog lookup, persistence write, store mutation, or
 * runtime side effect.
 */
export function transitionCaseInsertPresetApplicationAdoption(
  value: unknown,
): CaseInsertPresetApplicationAdoptionTransitionResult {
  try {
    return transitionValidatedRequest(value)
  } catch {
    return failure(
      'invalid-adoption-transition',
      'adoption-transition-validation-failed',
    )
  }
}

function auditValidatedAdoptionSuccessBundle(
  value: unknown,
): AuditCaseInsertPresetAdoptionSuccessBundleResult {
  const cloned = cloneCaseInsertPresetPlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return failure(
      'invalid-adoption-success-bundle',
      cloned.ok ? 'adoption-success-bundle-root-invalid' : cloned.code,
    )
  }
  const input = cloned.value
  if (input.kind ===
      CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND &&
      input.formatVersion !==
        CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION) {
    return failure(
      'unsupported-adoption-success-bundle-version',
      'adoption-success-bundle-version-unsupported',
    )
  }
  if (!hasExactCaseInsertPresetKeys(input, [
    'kind', 'formatVersion', 'operation', 'current', 'evidence', 'adoption',
  ]) || input.kind !==
      CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND ||
      input.formatVersion !==
        CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION) {
    return failure(
      'invalid-adoption-success-bundle',
      'adoption-success-bundle-shape-invalid',
    )
  }

  const current = validateCaseInsertPresetApplicationSnapshot(input.current)
  if (!current.ok) return fromModelFailure(current)
  const audited = auditCaseInsertPresetApplicationAdoptionEvidence(
    input.evidence,
  )
  if (!audited.ok) return fromModelFailure(audited)
  if (input.operation !== audited.evidence.operation) {
    return failure(
      'adoption-operation-mismatch',
      'adoption-success-bundle-operation-mismatch',
      { operation: audited.evidence.operation },
    )
  }
  const expected = transitionValidatedRequest({
    kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
    formatVersion:
      CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
    operation: audited.evidence.operation,
    current: current.value,
    evidence: audited.evidence,
  })
  if (!expected.ok) return expected
  if (!sameCaseInsertPresetValue(input.adoption, expected)) {
    return failure(
      'adoption-success-mismatch',
      'adoption-success-not-exact-evidence-result',
      { operation: audited.evidence.operation },
    )
  }
  return deepFreezeCaseInsertPresetValue({
    ok: true as const,
    status: 'validated' as const,
    bundle: {
      kind: CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND,
      formatVersion:
        CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION,
      operation: audited.evidence.operation,
      current: current.value,
      evidence: audited.evidence,
      adoption: expected,
    } as CaseInsertPresetValidatedAdoptionSuccessBundle,
  })
}

/**
 * Revalidates one complete source-owned adoption success bundle. The lifecycle
 * adapter consumes this bundle instead of accepting loose evidence, aggregate,
 * attachment, configuration, revision, or receipt fields.
 */
export function auditCaseInsertPresetValidatedAdoptionSuccessBundle(
  value: unknown,
): AuditCaseInsertPresetAdoptionSuccessBundleResult {
  try {
    return auditValidatedAdoptionSuccessBundle(value)
  } catch {
    return failure(
      'invalid-adoption-success-bundle',
      'adoption-success-bundle-validation-failed',
    )
  }
}
