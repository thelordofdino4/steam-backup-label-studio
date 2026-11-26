import {
  CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND,
  isCaseInsertPresetAssignmentSnapshot,
  isOwnedCaseInsertPresetAssignmentSnapshot,
  type CaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { normalizeProjectJewelCaseState } from '../caseInsert/normalization.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  canonicalizeCaseInsertAppliedPresetConfigurationOrdering,
  validateCaseInsertAppliedPresetConfiguration,
  validateCaseInsertAppliedPresetConfigurationCandidate,
  type CaseInsertAppliedPresetConfiguration,
} from './caseInsertPresetAppliedConfiguration.ts'
import {
  CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
  CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION,
  CASE_INSERT_PRESET_UNATTACHED_IDENTITY,
  createCaseInsertPresetAttachedEndpoint,
  createCaseInsertPresetUnattachedEndpoint,
  type CaseInsertPresetUnattachedEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'
import {
  validateCaseInsertPresetApplyTransitionSuccess,
  type CaseInsertPresetApplyTransitionResult,
  type ValidatedCaseInsertPresetApplyTransitionSuccess,
} from './caseInsertPresetApplyTransition.ts'
import {
  validateCaseInsertPresetDetachTransitionSuccess,
  type CaseInsertPresetDetachTransitionResult,
  type ValidatedCaseInsertPresetDetachTransitionSuccess,
} from './caseInsertPresetDetachTransition.ts'
import {
  validateCaseInsertPresetReapplyTransitionSuccess,
  type CaseInsertPresetReapplyTransitionResult,
  type ValidatedCaseInsertPresetReapplyTransitionSuccess,
} from './caseInsertPresetReapplyTransition.ts'
import {
  CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_PREFIX,
} from './caseInsertPresetReapplyIdentity.ts'
import {
  encodeCaseInsertPresetDeterministicIdentity,
} from './caseInsertPresetDeterministicIdentity.ts'
import {
  CASE_INSERT_PRESET_DETACH_CONFIGURATION_RELEASE_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_DETACH_TRANSITION_IDENTITY_PREFIX,
  createCaseInsertPresetDetachReleaseIdentity,
  createCaseInsertPresetDetachTransitionIdentity,
} from './caseInsertPresetDetachIdentity.ts'
import {
  CASE_INSERT_PRESET_APPLY_TRANSITION_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_DETACH_TRANSITION_IDENTITY_V2_PREFIX,
  CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_V2_PREFIX,
  CASE_INSERT_PRESET_WHOLE_SUCCESS_IDENTITY_PREFIX,
} from './caseInsertPresetTransitionSuccessIdentity.ts'
import {
  createCaseInsertPresetIdentityDigest,
} from './caseInsertPresetIdentityDigest.ts'

export {
  CASE_INSERT_PRESET_ATTACHED_IDENTITY_PREFIX,
  CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
  CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION,
  CASE_INSERT_PRESET_UNATTACHED_IDENTITY,
} from './caseInsertPresetAttachmentEndpoint.ts'

export const CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_KIND =
  'sbls/case-insert-preset-application-snapshot' as const
export const CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_VERSION = 1 as const

export const CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND =
  'sbls/case-insert-preset-adoption-evidence-candidate' as const
export const CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION = 2 as const

export const CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_KIND =
  'sbls/case-insert-preset-application-adoption-receipt' as const
export const CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_VERSION = 1 as const
export const CASE_INSERT_PRESET_APPLICATION_ADOPTION_IDENTITY_PREFIX =
  'case:preset-application-adoption:v1:' as const
export const CASE_INSERT_PRESET_APPLICATION_STATE_IDENTITY_PREFIX =
  'case:preset-application-state:v1:' as const
const CASE_INSERT_PRESET_CONFIGURATION_IDENTITY_PREFIX =
  'case:preset-applied-configuration:v1:' as const
const CASE_INSERT_PRESET_TYPED_CONFIGURATION_IDENTITY_PREFIX =
  'case:preset-applied-configuration:v2:' as const

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T

export type CaseInsertPresetApplicationAdoptionOperation =
  | 'apply'
  | 'reapply'
  | 'detach'

export type CaseInsertPresetUnattachedState = CaseInsertPresetUnattachedEndpoint

export type CaseInsertPresetAttachedState = Readonly<{
  kind: typeof CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND
  formatVersion: typeof CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION
  status: 'attached'
  attachmentIdentity: string
  configuration: CaseInsertAppliedPresetConfiguration
}>

export type CaseInsertPresetAttachmentState =
  | CaseInsertPresetUnattachedState
  | CaseInsertPresetAttachedState

export type CaseInsertPresetApplicationSnapshot = Readonly<{
  kind: typeof CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_KIND
  formatVersion: typeof CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_VERSION
  projectKind: 'caseInsert'
  snapshot: CaseInsertPresetAssignmentSnapshot
  attachment: CaseInsertPresetAttachmentState
}>

export type CaseInsertPresetAdoptionModelFailureStatus =
  | 'invalid-adoption-model'
  | 'unsupported-adoption-model-version'
  | 'invalid-attachment-state'
  | 'unsupported-operation'
  | 'invalid-transition-evidence'
  | 'unsupported-transition-version'
  | 'transition-evidence-mismatch'
  | 'transition-already-adopted'
  | 'invalid-source-configuration'
  | 'configuration-identity-mismatch'
  | 'configuration-domain-mismatch'
  | 'attachment-conflict'
  | 'missing-source-attachment'
  | 'unexpected-source-attachment'
  | 'successor-attachment-mismatch'
  | 'invalid-release-evidence'
  | 'release-configuration-mismatch'
  | 'aggregate-evidence-insufficient'
  | 'application-context-mismatch'
  | 'unsupported-state-transition'

export type CaseInsertPresetAdoptionModelFailure = Readonly<{
  ok: false
  status: CaseInsertPresetAdoptionModelFailureStatus
  code: string
  operation?: CaseInsertPresetApplicationAdoptionOperation
  dimensions?: readonly string[]
  gaps?: readonly CaseInsertPresetAggregateEvidenceGap[]
}>

export type CaseInsertPresetAttachmentStateValidationResult =
  | Readonly<{
      ok: true
      status: 'validated'
      state: CaseInsertPresetAttachmentState
    }>
  | CaseInsertPresetAdoptionModelFailure

export type CaseInsertPresetApplicationSnapshotValidationResult =
  | Readonly<{
      ok: true
      status: 'validated'
      value: CaseInsertPresetApplicationSnapshot
    }>
  | CaseInsertPresetAdoptionModelFailure

const validatedAttachmentStates = new WeakMap<
  object,
  CaseInsertPresetAttachmentStateValidationResult
>()
const validatedApplicationSnapshots = new WeakMap<
  object,
  CaseInsertPresetApplicationSnapshotValidationResult
>()

export type CaseInsertPresetAggregateEvidenceGap =
  | 'source-aggregate-content-identity-missing'
  | 'result-aggregate-content-identity-missing'
  | 'whole-success-bundle-identity-missing'
  | 'whole-success-validator-missing'
  | 'transition-identity-missing'
  | 'source-attachment-edge-missing'
  | 'successor-configuration-identity-missing'
  | 'application-adoption-status-not-transition-bound'
  | 'plan-identity-not-exposed'
  | 'review-acceptance-identity-not-exposed'

type CaseInsertPresetAdoptionEvidenceCandidateCommon = Readonly<{
  kind: typeof CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND
  formatVersion:
    typeof CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION
  applicationAdoptionStatus: 'not-adopted'
}>

export type CaseInsertPresetAdoptionEvidenceCandidate =
  CaseInsertPresetAdoptionEvidenceCandidateCommon & (
    | Readonly<{
        operation: 'apply'
        transitionResult: Extract<
          CaseInsertPresetApplyTransitionResult,
          { ok: true }
        >
      }>
    | Readonly<{
        operation: 'reapply'
        transitionResult: Extract<
          CaseInsertPresetReapplyTransitionResult,
          { ok: true }
        >
      }>
    | Readonly<{
        operation: 'detach'
        transitionResult: Extract<
          CaseInsertPresetDetachTransitionResult,
          { ok: true }
        >
      }>
  )

declare const CASE_INSERT_PRESET_VALIDATED_APPLICATION_ADOPTION_EVIDENCE:
  unique symbol

export type CaseInsertPresetApplicationAdoptionEvidence =
  CaseInsertPresetAdoptionEvidenceCandidateCommon & (
    | Readonly<{
        operation: 'apply'
        transitionResult: ValidatedCaseInsertPresetApplyTransitionSuccess
      }>
    | Readonly<{
        operation: 'reapply'
        transitionResult: ValidatedCaseInsertPresetReapplyTransitionSuccess
      }>
    | Readonly<{
        operation: 'detach'
        transitionResult: ValidatedCaseInsertPresetDetachTransitionSuccess
      }>
  ) & Readonly<{
    [CASE_INSERT_PRESET_VALIDATED_APPLICATION_ADOPTION_EVIDENCE]: true
  }>

export type CaseInsertPresetApplicationAdoptionEvidenceAuditResult =
  | Readonly<{
      ok: true
      status: 'validated-inert-evidence'
      evidence: CaseInsertPresetApplicationAdoptionEvidence
    }>
  | CaseInsertPresetAdoptionModelFailure

export type CaseInsertPresetApplicationAdoptionRelationshipRule = Readonly<{
  operation: CaseInsertPresetApplicationAdoptionOperation
  requiredCurrentAttachment:
    | 'authoritative-absence'
    | 'exact-source-configuration'
  sourceConfigurationIdentity:
    | 'must-be-absent'
    | 'must-match-current-attachment-exactly'
  aggregateResult:
    | 'exact-transition-result'
    | 'exact-unchanged-semantic-transition-result'
  successorAttachment:
    | 'exact-successor-configuration'
    | 'authoritative-absence'
  attachmentAction: 'attached' | 'replaced' | 'released'
  replayRule: 'changed-source-state-is-conflict'
  outOfOrderRule: 'session-revision-template-or-attachment-mismatch-is-conflict'
  currentEvidenceReadiness:
    'validated-evidence-pure-adoption-transition-required'
}>

export const CASE_INSERT_PRESET_APPLICATION_ADOPTION_RELATIONSHIPS =
  Object.freeze({
    apply: Object.freeze({
      operation: 'apply',
      requiredCurrentAttachment: 'authoritative-absence',
      sourceConfigurationIdentity: 'must-be-absent',
      aggregateResult: 'exact-transition-result',
      successorAttachment: 'exact-successor-configuration',
      attachmentAction: 'attached',
      replayRule: 'changed-source-state-is-conflict',
      outOfOrderRule:
        'session-revision-template-or-attachment-mismatch-is-conflict',
      currentEvidenceReadiness:
        'validated-evidence-pure-adoption-transition-required',
    }),
    reapply: Object.freeze({
      operation: 'reapply',
      requiredCurrentAttachment: 'exact-source-configuration',
      sourceConfigurationIdentity: 'must-match-current-attachment-exactly',
      aggregateResult: 'exact-transition-result',
      successorAttachment: 'exact-successor-configuration',
      attachmentAction: 'replaced',
      replayRule: 'changed-source-state-is-conflict',
      outOfOrderRule:
        'session-revision-template-or-attachment-mismatch-is-conflict',
      currentEvidenceReadiness:
        'validated-evidence-pure-adoption-transition-required',
    }),
    detach: Object.freeze({
      operation: 'detach',
      requiredCurrentAttachment: 'exact-source-configuration',
      sourceConfigurationIdentity: 'must-match-current-attachment-exactly',
      aggregateResult: 'exact-unchanged-semantic-transition-result',
      successorAttachment: 'authoritative-absence',
      attachmentAction: 'released',
      replayRule: 'changed-source-state-is-conflict',
      outOfOrderRule:
        'session-revision-template-or-attachment-mismatch-is-conflict',
      currentEvidenceReadiness:
        'validated-evidence-pure-adoption-transition-required',
    }),
  } satisfies Readonly<Record<
    CaseInsertPresetApplicationAdoptionOperation,
    CaseInsertPresetApplicationAdoptionRelationshipRule
  >>)

export const CASE_INSERT_PRESET_AGGREGATE_EVIDENCE_GAPS = Object.freeze({
  apply: Object.freeze([
    'source-aggregate-content-identity-missing',
    'result-aggregate-content-identity-missing',
    'whole-success-bundle-identity-missing',
    'whole-success-validator-missing',
    'transition-identity-missing',
    'source-attachment-edge-missing',
    'successor-configuration-identity-missing',
    'application-adoption-status-not-transition-bound',
    'plan-identity-not-exposed',
    'review-acceptance-identity-not-exposed',
  ] satisfies readonly CaseInsertPresetAggregateEvidenceGap[]),
  reapply: Object.freeze([
    'source-aggregate-content-identity-missing',
    'result-aggregate-content-identity-missing',
    'whole-success-bundle-identity-missing',
    'whole-success-validator-missing',
    'successor-configuration-identity-missing',
    'application-adoption-status-not-transition-bound',
    'plan-identity-not-exposed',
  ] satisfies readonly CaseInsertPresetAggregateEvidenceGap[]),
  detach: Object.freeze([
    'source-aggregate-content-identity-missing',
    'result-aggregate-content-identity-missing',
    'whole-success-bundle-identity-missing',
    'whole-success-validator-missing',
  ] satisfies readonly CaseInsertPresetAggregateEvidenceGap[]),
} satisfies Readonly<Record<
  CaseInsertPresetApplicationAdoptionOperation,
  readonly CaseInsertPresetAggregateEvidenceGap[]
>>)

export type CaseInsertPresetApplicationAdoptionRelationshipInput = Readonly<{
  operation: unknown
  currentAttachment: unknown
  evidenceEdge: unknown
}>

export type CaseInsertPresetApplicationAdoptionRelationshipResult =
  | Readonly<{
      ok: true
      status: 'attachment-edge-valid'
      operation: CaseInsertPresetApplicationAdoptionOperation
      attachmentAction: 'attached' | 'replaced' | 'released'
      currentAttachmentIdentity: string
      sourceConfigurationIdentity: string | null
      successorConfigurationIdentity: string | null
      adoptionReadiness:
        'evidence-validated-pure-adoption-transition-required'
    }>
  | CaseInsertPresetAdoptionModelFailure

export type CaseInsertPresetUnattachedIdentityReference = Readonly<{
  status: 'unattached'
  attachmentIdentity: typeof CASE_INSERT_PRESET_UNATTACHED_IDENTITY
}>

export type CaseInsertPresetAttachedIdentityReference = Readonly<{
  status: 'attached'
  attachmentIdentity: string
  configurationIdentity: string
}>

export type CaseInsertPresetAttachmentIdentityReference =
  | CaseInsertPresetUnattachedIdentityReference
  | CaseInsertPresetAttachedIdentityReference

type CaseInsertPresetApplicationAdoptionIdentityContext<
  Attachment extends CaseInsertPresetAttachmentIdentityReference,
> = Readonly<{
  projectKind: 'caseInsert'
  sessionId: string
  projectRevision: number
  template: Readonly<{ id: string; revision: null }>
  attachment: Attachment
}>

type CaseInsertPresetApplicationAdoptionIdentityInputCommon = Readonly<{
  consumedTransitionIdentity: string
  consumedWholeSuccessIdentity: string
  sourceApplicationStateIdentity: string
  successorApplicationStateIdentity: string
  sourceAggregateIdentity: string
  resultAggregateIdentity: string
  sourceConfigurationIdentity: string | null
  successorConfigurationIdentity: string | null
  configurationReleaseIdentity: string | null
}>

export type CaseInsertPresetApplicationAdoptionIdentityInput =
  CaseInsertPresetApplicationAdoptionIdentityInputCommon & (
    | Readonly<{
        operation: 'apply'
        source: CaseInsertPresetApplicationAdoptionIdentityContext<
          CaseInsertPresetUnattachedIdentityReference
        >
        successor: CaseInsertPresetApplicationAdoptionIdentityContext<
          CaseInsertPresetAttachedIdentityReference
        >
        aggregateAdoptionClassification: 'exact-transition-result'
        attachmentAction: 'attached'
      }>
    | Readonly<{
        operation: 'reapply'
        source: CaseInsertPresetApplicationAdoptionIdentityContext<
          CaseInsertPresetAttachedIdentityReference
        >
        successor: CaseInsertPresetApplicationAdoptionIdentityContext<
          CaseInsertPresetAttachedIdentityReference
        >
        aggregateAdoptionClassification: 'exact-transition-result'
        attachmentAction: 'replaced'
      }>
    | Readonly<{
        operation: 'detach'
        source: CaseInsertPresetApplicationAdoptionIdentityContext<
          CaseInsertPresetAttachedIdentityReference
        >
        successor: CaseInsertPresetApplicationAdoptionIdentityContext<
          CaseInsertPresetUnattachedIdentityReference
        >
        aggregateAdoptionClassification:
          'exact-unchanged-semantic-transition-result'
        attachmentAction: 'released'
      }>
  )

export type CaseInsertPresetApplicationAdoptionIdentityProjectionResult =
  | Readonly<{
      ok: true
      status: 'projected'
      adoptionIdentity: string
    }>
  | CaseInsertPresetAdoptionModelFailure

export type CaseInsertPresetApplicationStateIdentityProjectionResult =
  | Readonly<{
      ok: true
      status: 'projected'
      applicationStateIdentity: string
    }>
  | CaseInsertPresetAdoptionModelFailure

export type CaseInsertPresetApplicationAdoptionReceiptContext = Readonly<{
  projectKind: 'caseInsert'
  sessionId: string
  projectRevision: number
  template: Readonly<{ id: string; revision: null }>
}>

type CaseInsertPresetApplicationAdoptionReceiptCommon = Readonly<{
  kind: typeof CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_KIND
  formatVersion:
    typeof CASE_INSERT_PRESET_APPLICATION_ADOPTION_RECEIPT_VERSION
  adoptionIdentity: string
  consumedTransitionIdentity: string
  consumedWholeSuccessIdentity: string
  sourceApplicationStateIdentity: string
  successorApplicationStateIdentity: string
  sourceAggregateIdentity: string
  resultAggregateIdentity: string
  sourceConfigurationIdentity: string | null
  successorConfigurationIdentity: string | null
  configurationReleaseIdentity: string | null
  sourceApplicationContext: CaseInsertPresetApplicationAdoptionReceiptContext
  successorApplicationContext:
    CaseInsertPresetApplicationAdoptionReceiptContext
  sourceProjectRevision: number
  successorProjectRevision: number
  applicationAdoptionStatus: 'adopted'
  atomicityProof: Readonly<{
    aggregateAndAttachment: 'one-coherent-application-domain-state'
    partialSuccess: false
  }>
  persistence: Readonly<{
    status: 'not-persisted'
  }>
  exclusions: Readonly<{
    projectSchema: 'not-changed'
    saveLoad: 'not-integrated'
    store: 'not-integrated'
    ui: 'not-integrated'
    catalog: 'not-installed'
    runtime: 'not-integrated'
  }>
}>

export type CaseInsertPresetApplyApplicationAdoptionReceipt =
  CaseInsertPresetApplicationAdoptionReceiptCommon & Readonly<{
    operation: 'apply'
    previousAttachment: CaseInsertPresetUnattachedIdentityReference
    successorAttachment: CaseInsertPresetAttachedIdentityReference
    aggregateAdoptionClassification: 'exact-transition-result'
    attachmentAction: 'attached'
  }>

export type CaseInsertPresetReapplyApplicationAdoptionReceipt =
  CaseInsertPresetApplicationAdoptionReceiptCommon & Readonly<{
    operation: 'reapply'
    previousAttachment: CaseInsertPresetAttachedIdentityReference
    successorAttachment: CaseInsertPresetAttachedIdentityReference
    aggregateAdoptionClassification: 'exact-transition-result'
    attachmentAction: 'replaced'
  }>

export type CaseInsertPresetDetachApplicationAdoptionReceipt =
  CaseInsertPresetApplicationAdoptionReceiptCommon & Readonly<{
    operation: 'detach'
    previousAttachment: CaseInsertPresetAttachedIdentityReference
    successorAttachment: CaseInsertPresetUnattachedIdentityReference
    aggregateAdoptionClassification:
      'exact-unchanged-semantic-transition-result'
    attachmentAction: 'released'
  }>

export type CaseInsertPresetApplicationAdoptionReceipt =
  | CaseInsertPresetApplyApplicationAdoptionReceipt
  | CaseInsertPresetReapplyApplicationAdoptionReceipt
  | CaseInsertPresetDetachApplicationAdoptionReceipt

export type CaseInsertPresetApplicationAdoptionRequest = Readonly<{
  current: CaseInsertPresetApplicationSnapshot
  evidence: CaseInsertPresetApplicationAdoptionEvidence
}>

/** @deprecated Use CaseInsertPresetApplicationAdoptionRequest. */
export type CaseInsertPresetFutureApplicationAdoptionRequest =
  CaseInsertPresetApplicationAdoptionRequest

type CaseInsertPresetApplicationSnapshotWithAttachment<
  Attachment extends CaseInsertPresetAttachmentState,
> = Readonly<
  Omit<CaseInsertPresetApplicationSnapshot, 'attachment'> & {
    attachment: Attachment
  }
>

declare const CASE_INSERT_PRESET_COHERENT_ADOPTION_SUCCESS:
  unique symbol

type CaseInsertPresetCoherentAdoptionSuccessProof = Readonly<{
  [CASE_INSERT_PRESET_COHERENT_ADOPTION_SUCCESS]:
    'whole-success-validator-required'
}>

export type CaseInsertPresetApplicationAdoptionResult =
  | (Readonly<{
      ok: true
      status: 'adopted'
      operation: 'apply'
      state: CaseInsertPresetApplicationSnapshotWithAttachment<
        CaseInsertPresetAttachedState
      >
      receipt: CaseInsertPresetApplyApplicationAdoptionReceipt
    }> & CaseInsertPresetCoherentAdoptionSuccessProof)
  | (Readonly<{
      ok: true
      status: 'adopted'
      operation: 'reapply'
      state: CaseInsertPresetApplicationSnapshotWithAttachment<
        CaseInsertPresetAttachedState
      >
      receipt: CaseInsertPresetReapplyApplicationAdoptionReceipt
    }> & CaseInsertPresetCoherentAdoptionSuccessProof)
  | (Readonly<{
      ok: true
      status: 'adopted'
      operation: 'detach'
      state: CaseInsertPresetApplicationSnapshotWithAttachment<
        CaseInsertPresetUnattachedState
      >
      receipt: CaseInsertPresetDetachApplicationAdoptionReceipt
    }> & CaseInsertPresetCoherentAdoptionSuccessProof)
  | CaseInsertPresetAdoptionModelFailure

/** @deprecated Use CaseInsertPresetApplicationAdoptionResult. */
export type CaseInsertPresetFutureApplicationAdoptionResult =
  CaseInsertPresetApplicationAdoptionResult

type PlainValue = null | boolean | number | string | PlainValue[] | PlainRecord
type PlainRecord = { [key: string]: PlainValue }

type PlainCloneResult =
  | Readonly<{ ok: true; value: PlainValue; deeplyFrozen: boolean }>
  | Readonly<{ ok: false; code: string }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const actual = Object.keys(value)
  return actual.length === expected.length &&
    actual.every((key) => expected.includes(key))
}

const CASE_INSERT_PRESET_PLAIN_INPUT_MAX_DEPTH = 256

function clonePlainInput(value: unknown): PlainCloneResult {
  const visited = new WeakSet<object>()

  function clone(current: unknown, depth = 0): PlainCloneResult {
    if (depth > CASE_INSERT_PRESET_PLAIN_INPUT_MAX_DEPTH) {
      return { ok: false, code: 'maximum-depth-exceeded' }
    }
    if (current === null || typeof current === 'string' ||
        typeof current === 'boolean') {
      return { ok: true, value: current, deeplyFrozen: true }
    }
    if (typeof current === 'number') {
      return Number.isFinite(current)
        ? { ok: true, value: current, deeplyFrozen: true }
        : { ok: false, code: 'non-finite-number' }
    }
    if (typeof current !== 'object') {
      return { ok: false, code: 'non-plain-value' }
    }

    if (visited.has(current)) {
      return { ok: false, code: 'cyclic-or-aliased-input' }
    }
    visited.add(current)

    let prototype: object | null
    let descriptors: PropertyDescriptorMap
    let keys: (string | symbol)[]
    let isArray: boolean
    let deeplyFrozen: boolean
    try {
      prototype = Object.getPrototypeOf(current) as object | null
      descriptors = Object.getOwnPropertyDescriptors(current)
      keys = Reflect.ownKeys(descriptors)
      isArray = Array.isArray(current)
      deeplyFrozen = Object.isFrozen(current)
    } catch {
      return { ok: false, code: 'input-introspection-failed' }
    }

    if (isArray) {
      if (prototype !== Array.prototype ||
          keys.some((key) => typeof key !== 'string' ||
            (key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key)))) {
        return { ok: false, code: 'array-shape-invalid' }
      }
      const lengthDescriptor = descriptors.length
      if (!lengthDescriptor || !('value' in lengthDescriptor) ||
          !Number.isSafeInteger(lengthDescriptor.value) ||
          lengthDescriptor.value < 0) {
        return { ok: false, code: 'array-length-invalid' }
      }
      const arrayLength = lengthDescriptor.value as number
      if (keys.length !== arrayLength + 1) {
        return { ok: false, code: 'array-shape-invalid' }
      }
      const result: PlainValue[] = []
      let childrenFrozen = true
      for (let index = 0; index < arrayLength; index += 1) {
        const descriptor = descriptors[String(index)]
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
          return { ok: false, code: 'sparse-or-accessor-array' }
        }
        const child = clone(descriptor.value, depth + 1)
        if (!child.ok) return child
        result.push(child.value)
        childrenFrozen = childrenFrozen && child.deeplyFrozen
      }
      return {
        ok: true,
        value: result,
        deeplyFrozen: deeplyFrozen && childrenFrozen,
      }
    }

    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false, code: 'record-prototype-unsupported' }
    }
    if (keys.some((key) => typeof key !== 'string')) {
      return { ok: false, code: 'symbol-key-unsupported' }
    }
    const result: PlainRecord = {}
    let childrenFrozen = true
    for (const key of keys as string[]) {
      const descriptor = descriptors[key]
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
        return { ok: false, code: 'record-accessor-unsupported' }
      }
      const child = clone(descriptor.value, depth + 1)
      if (!child.ok) return child
      Object.defineProperty(result, key, {
        value: child.value,
        enumerable: true,
        configurable: true,
        writable: true,
      })
      childrenFrozen = childrenFrozen && child.deeplyFrozen
    }
    return {
      ok: true,
      value: result,
      deeplyFrozen: deeplyFrozen && childrenFrozen,
    }
  }

  return clone(value)
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child, seen)
  }
  return Object.freeze(value)
}

function rememberValidatedAttachment(
  result: Extract<
    CaseInsertPresetAttachmentStateValidationResult,
    { ok: true }
  >,
): CaseInsertPresetAttachmentStateValidationResult {
  validatedAttachmentStates.set(result.state as object, result)
  return result
}

function rememberValidatedApplicationSnapshot(
  result: Extract<
    CaseInsertPresetApplicationSnapshotValidationResult,
    { ok: true }
  >,
): CaseInsertPresetApplicationSnapshotValidationResult {
  validatedApplicationSnapshots.set(result.value as object, result)
  return result
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
  }
  if (!isRecord(left) || !isRecord(right)) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(right, key) &&
    sameValue(left[key], right[key]))
}

function failure(
  status: CaseInsertPresetAdoptionModelFailureStatus,
  code: string,
  options: Readonly<{
    operation?: CaseInsertPresetApplicationAdoptionOperation
    dimensions?: readonly string[]
    gaps?: readonly CaseInsertPresetAggregateEvidenceGap[]
  }> = {},
): CaseInsertPresetAdoptionModelFailure {
  return deepFreeze({
    ok: false as const,
    status,
    code,
    ...(options.operation ? { operation: options.operation } : {}),
    ...(options.dimensions ? { dimensions: [...options.dimensions] } : {}),
    ...(options.gaps ? { gaps: [...options.gaps] } : {}),
  })
}

function validateConfiguration(
  value: unknown,
): Readonly<{ ok: true; configuration: CaseInsertAppliedPresetConfiguration }> |
  CaseInsertPresetAdoptionModelFailure {
  const cloned = clonePlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return failure(
      'invalid-source-configuration',
      cloned.ok ? 'configuration-root-invalid' : cloned.code,
    )
  }
  let ordered: unknown
  try {
    ordered = canonicalizeCaseInsertAppliedPresetConfigurationOrdering(
      cloned.value,
    )
  } catch {
    return failure(
      'invalid-source-configuration',
      'configuration-canonicalization-failed',
    )
  }
  const orderedClone = clonePlainInput(ordered)
  if (!orderedClone.ok) {
    return failure('invalid-source-configuration', orderedClone.code)
  }
  const validated = validateCaseInsertAppliedPresetConfiguration(
    deepFreeze(orderedClone.value),
  )
  if (!validated.ok) {
    if (validated.status === 'unsupported-configuration-version') {
      return failure(
        'invalid-source-configuration',
        'configuration-version-unsupported',
      )
    }
    const status = validated.code === 'identity-invalid'
      ? 'configuration-identity-mismatch'
      : validated.code === 'shape-invalid' &&
          isRecord(cloned.value) &&
          cloned.value.kind !== undefined &&
          cloned.value.kind !== 'sbls/case-insert-applied-preset-configuration'
        ? 'configuration-domain-mismatch'
        : 'invalid-source-configuration'
    return failure(status, validated.code)
  }
  return { ok: true, configuration: validated.configuration }
}

export function createCaseInsertPresetUnattachedState():
CaseInsertPresetUnattachedState {
  const state = createCaseInsertPresetUnattachedEndpoint()
  if (!validatedAttachmentStates.has(state as object)) {
    rememberValidatedAttachment(deepFreeze({
      ok: true as const,
      status: 'validated' as const,
      state,
    }))
  }
  return state
}

export function createCaseInsertPresetAttachedState(
  configuration: unknown,
): CaseInsertPresetAttachmentStateValidationResult {
  const validated = validateConfiguration(configuration)
  if (!validated.ok) return validated
  return rememberValidatedAttachment(deepFreeze({
    ok: true,
    status: 'validated' as const,
    state: {
      kind: CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
      formatVersion: CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION,
      status: 'attached' as const,
      attachmentIdentity: createCaseInsertPresetAttachedEndpoint(
        validated.configuration.configurationIdentity,
      ).attachmentIdentity,
      configuration: validated.configuration,
    },
  }))
}

export function validateCaseInsertPresetAttachmentState(
  value: unknown,
): CaseInsertPresetAttachmentStateValidationResult {
  if (typeof value === 'object' && value !== null) {
    const cached = validatedAttachmentStates.get(value)
    if (cached !== undefined) return cached
  }
  const cloned = clonePlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return failure(
      'invalid-attachment-state',
      cloned.ok ? 'attachment-root-invalid' : cloned.code,
    )
  }
  const state = cloned.value
  if (state.kind === CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND &&
      state.formatVersion !== CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION) {
    return failure(
      'unsupported-adoption-model-version',
      'attachment-state-version-unsupported',
    )
  }
  if (state.kind !== CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND ||
      state.formatVersion !== CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION ||
      (state.status !== 'unattached' && state.status !== 'attached')) {
    return failure('invalid-attachment-state', 'attachment-state-shape-invalid')
  }
  if (state.status === 'unattached') {
    if (!hasExactKeys(state, [
      'kind', 'formatVersion', 'status', 'attachmentIdentity',
    ]) || state.attachmentIdentity !== CASE_INSERT_PRESET_UNATTACHED_IDENTITY) {
      return failure(
        'invalid-attachment-state',
        'unattached-state-not-canonical',
      )
    }
    return rememberValidatedAttachment(deepFreeze({
      ok: true,
      status: 'validated' as const,
      state: createCaseInsertPresetUnattachedEndpoint(),
    }))
  }
  if (!hasExactKeys(state, [
    'kind', 'formatVersion', 'status', 'attachmentIdentity', 'configuration',
  ])) {
    return failure('invalid-attachment-state', 'attached-state-shape-invalid')
  }
  const validated = validateConfiguration(state.configuration)
  if (!validated.ok) return validated
  const expectedIdentity = createCaseInsertPresetAttachedEndpoint(
    validated.configuration.configurationIdentity,
  ).attachmentIdentity
  if (state.attachmentIdentity !== expectedIdentity) {
    return failure(
      'configuration-identity-mismatch',
      'attachment-identity-invalid',
    )
  }
  return rememberValidatedAttachment(deepFreeze({
    ok: true,
    status: 'validated' as const,
    state: {
      kind: CASE_INSERT_PRESET_ATTACHMENT_STATE_KIND,
      formatVersion: CASE_INSERT_PRESET_ATTACHMENT_STATE_VERSION,
      status: 'attached' as const,
      attachmentIdentity: expectedIdentity,
      configuration: validated.configuration,
    },
  }))
}

/**
 * Classifies only the attachment edge. A valid classification is still blocked
 * from adoption until the transition owners expose whole-aggregate evidence.
 */
export function classifyCaseInsertPresetApplicationAdoptionRelationship(
  value: unknown,
): CaseInsertPresetApplicationAdoptionRelationshipResult {
  const cloned = clonePlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value) || !hasExactKeys(cloned.value, [
    'operation', 'currentAttachment', 'evidenceEdge',
  ])) {
    return failure(
      'invalid-adoption-model',
      cloned.ok ? 'relationship-input-invalid' : cloned.code,
    )
  }
  const input = cloned.value
  if (input.operation !== 'apply' && input.operation !== 'reapply' &&
      input.operation !== 'detach') {
    return failure('unsupported-operation', 'relationship-operation-unsupported')
  }
  const operation = input.operation
  const attachment = validateCaseInsertPresetAttachmentState(
    input.currentAttachment,
  )
  if (!attachment.ok) return attachment
  if (!isRecord(input.evidenceEdge) || !hasExactKeys(input.evidenceEdge, [
    'sourceConfigurationIdentity', 'successorConfigurationIdentity',
  ])) {
    return failure(
      'invalid-transition-evidence',
      'attachment-edge-evidence-invalid',
      { operation },
    )
  }
  const sourceIdentity = input.evidenceEdge.sourceConfigurationIdentity
  const successorIdentity = input.evidenceEdge.successorConfigurationIdentity

  if (operation === 'apply') {
    if (sourceIdentity !== null ||
        !validConfigurationIdentity(successorIdentity)) {
      return failure(
        'successor-attachment-mismatch',
        'apply-attachment-edge-invalid',
        { operation },
      )
    }
    if (attachment.state.status !== 'unattached') {
      return failure(
        'unexpected-source-attachment',
        'apply-requires-authoritative-absence',
        { operation },
      )
    }
    return deepFreeze({
      ok: true as const,
      status: 'attachment-edge-valid' as const,
      operation,
      attachmentAction: 'attached' as const,
      currentAttachmentIdentity: attachment.state.attachmentIdentity,
      sourceConfigurationIdentity: null,
      successorConfigurationIdentity: successorIdentity,
      adoptionReadiness:
        'evidence-validated-pure-adoption-transition-required' as const,
    })
  }

  if (!validConfigurationIdentity(sourceIdentity)) {
    return failure(
      'invalid-source-configuration',
      `${operation}-source-configuration-identity-invalid`,
      { operation },
    )
  }
  if (attachment.state.status !== 'attached') {
    return failure(
      'missing-source-attachment',
      `${operation}-requires-source-attachment`,
      { operation },
    )
  }
  if (attachment.state.configuration.configurationIdentity !== sourceIdentity) {
    return failure(
      'configuration-identity-mismatch',
      `${operation}-source-configuration-not-current`,
      { operation },
    )
  }

  if (operation === 'reapply') {
    if (!validConfigurationIdentity(successorIdentity) ||
        successorIdentity === sourceIdentity) {
      return failure(
        'successor-attachment-mismatch',
        'reapply-successor-configuration-identity-invalid',
        { operation },
      )
    }
    return deepFreeze({
      ok: true as const,
      status: 'attachment-edge-valid' as const,
      operation,
      attachmentAction: 'replaced' as const,
      currentAttachmentIdentity: attachment.state.attachmentIdentity,
      sourceConfigurationIdentity: sourceIdentity,
      successorConfigurationIdentity: successorIdentity,
      adoptionReadiness:
        'evidence-validated-pure-adoption-transition-required' as const,
    })
  }

  if (successorIdentity !== null) {
    return failure(
      'successor-attachment-mismatch',
      'detach-successor-must-be-authoritative-absence',
      { operation },
    )
  }
  return deepFreeze({
    ok: true as const,
    status: 'attachment-edge-valid' as const,
    operation,
    attachmentAction: 'released' as const,
    currentAttachmentIdentity: attachment.state.attachmentIdentity,
    sourceConfigurationIdentity: sourceIdentity,
    successorConfigurationIdentity: null,
    adoptionReadiness:
      'evidence-validated-pure-adoption-transition-required' as const,
  })
}

function validateSnapshot(
  value: unknown,
): Readonly<{ ok: true; snapshot: CaseInsertPresetAssignmentSnapshot }> |
  CaseInsertPresetAdoptionModelFailure {
  const cloned = clonePlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return failure(
      'application-context-mismatch',
      cloned.ok ? 'snapshot-root-invalid' : cloned.code,
    )
  }
  const frozen = deepFreeze(cloned.value)
  if (!hasExactKeys(frozen, ['kind', 'identity', 'caseInsert']) ||
      !isRecord(frozen.identity) || !hasExactKeys(frozen.identity, [
        'sessionId', 'projectRevision', 'template',
        'aggregateContentIdentity',
      ]) || !isRecord(frozen.identity.template) || !hasExactKeys(
        frozen.identity.template,
        ['id', 'revision'],
      ) || !isCaseInsertPresetAssignmentSnapshot(frozen) ||
      frozen.kind !== CASE_INSERT_PRESET_ASSIGNMENT_SNAPSHOT_KIND) {
    return failure('application-context-mismatch', 'snapshot-invalid')
  }
  let normalized: ProjectJewelCaseState
  try {
    normalized = normalizeProjectJewelCaseState(
      frozen.caseInsert as ProjectJewelCaseState,
    )
  } catch {
    return failure('application-context-mismatch', 'snapshot-aggregate-invalid')
  }
  if (!sameValue(frozen.caseInsert, normalized) ||
      normalized.templateType !== frozen.identity.template.id) {
    return failure(
      'application-context-mismatch',
      'snapshot-aggregate-context-mismatch',
    )
  }
  return { ok: true, snapshot: frozen }
}

function captureOwnedApplicationSnapshotInput(value: unknown): Readonly<{
  snapshot: CaseInsertPresetAssignmentSnapshot
  attachment: unknown
}> | null {
  if (typeof value !== 'object' || value === null) return null
  let prototype: object | null
  let descriptors: PropertyDescriptorMap
  let isArray: boolean
  try {
    prototype = Object.getPrototypeOf(value) as object | null
    descriptors = Object.getOwnPropertyDescriptors(value)
    isArray = Array.isArray(value)
  } catch {
    return null
  }
  const keys = Reflect.ownKeys(descriptors)
  if (isArray || (prototype !== Object.prototype && prototype !== null) ||
      keys.length !== 2 || keys.some((key) => typeof key !== 'string') ||
      !keys.includes('snapshot') || !keys.includes('attachment')) {
    return null
  }
  const snapshot = descriptors.snapshot
  const attachment = descriptors.attachment
  if (!snapshot || !('value' in snapshot) || !snapshot.enumerable ||
      !attachment || !('value' in attachment) || !attachment.enumerable ||
      !isOwnedCaseInsertPresetAssignmentSnapshot(snapshot.value)) {
    return null
  }
  return Object.freeze({
    snapshot: snapshot.value,
    attachment: attachment.value,
  })
}

export function createCaseInsertPresetApplicationSnapshot(
  input: unknown,
): CaseInsertPresetApplicationSnapshotValidationResult {
  const ownedInput = captureOwnedApplicationSnapshotInput(input)
  if (ownedInput) {
    const attachment = validateCaseInsertPresetAttachmentState(
      ownedInput.attachment,
    )
    if (!attachment.ok) return attachment
    return createValidatedApplicationSnapshot(
      ownedInput.snapshot,
      attachment.state,
    )
  }
  const cloned = clonePlainInput(input)
  if (!cloned.ok || !isRecord(cloned.value) || !hasExactKeys(cloned.value, [
    'snapshot', 'attachment',
  ])) {
    return failure(
      'invalid-adoption-model',
      cloned.ok ? 'application-snapshot-input-invalid' : cloned.code,
    )
  }
  const snapshot = validateSnapshot(cloned.value.snapshot)
  if (!snapshot.ok) return snapshot
  const attachment = validateCaseInsertPresetAttachmentState(
    cloned.value.attachment,
  )
  if (!attachment.ok) return attachment
  return createValidatedApplicationSnapshot(
    snapshot.snapshot,
    attachment.state,
  )
}

function createValidatedApplicationSnapshot(
  snapshot: CaseInsertPresetAssignmentSnapshot,
  attachment: CaseInsertPresetAttachmentState,
): CaseInsertPresetApplicationSnapshotValidationResult {
  if (attachment.status === 'attached') {
    const configuration = attachment.configuration
    const mismatches: string[] = []
    if (configuration.source.snapshotIdentity.sessionId !==
        snapshot.identity.sessionId) mismatches.push('session-id')
    if (configuration.template.id !== snapshot.identity.template.id ||
        configuration.template.revision !==
          snapshot.identity.template.revision) {
      mismatches.push('template')
    }
    if (configuration.source.snapshotIdentity.projectRevision >=
        snapshot.identity.projectRevision) {
      mismatches.push('project-revision')
    }
    if (mismatches.length > 0) {
      return failure(
        'application-context-mismatch',
        'attachment-snapshot-context-mismatch',
        { dimensions: mismatches },
      )
    }
  }
  return rememberValidatedApplicationSnapshot(deepFreeze({
    ok: true,
    status: 'validated' as const,
    value: {
      kind: CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_KIND,
      formatVersion: CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_VERSION,
      projectKind: 'caseInsert' as const,
      snapshot,
      attachment,
    },
  }))
}

export function validateCaseInsertPresetApplicationSnapshot(
  value: unknown,
): CaseInsertPresetApplicationSnapshotValidationResult {
  if (typeof value === 'object' && value !== null) {
    const cached = validatedApplicationSnapshots.get(value)
    if (cached !== undefined) return cached
  }
  const cloned = clonePlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return failure(
      'invalid-adoption-model',
      cloned.ok ? 'application-snapshot-root-invalid' : cloned.code,
    )
  }
  const input = cloned.value
  if (input.kind === CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_KIND &&
      input.formatVersion !== CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_VERSION) {
    return failure(
      'unsupported-adoption-model-version',
      'application-snapshot-version-unsupported',
    )
  }
  if (!hasExactKeys(input, [
    'kind', 'formatVersion', 'projectKind', 'snapshot', 'attachment',
  ]) || input.kind !== CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_KIND ||
      input.formatVersion !== CASE_INSERT_PRESET_APPLICATION_SNAPSHOT_VERSION ||
      input.projectKind !== 'caseInsert') {
    return failure('invalid-adoption-model', 'application-snapshot-shape-invalid')
  }
  return createCaseInsertPresetApplicationSnapshot({
    snapshot: input.snapshot,
    attachment: input.attachment,
  })
}

function applicationAttachmentIdentityReference(
  attachment: CaseInsertPresetAttachmentState,
): CaseInsertPresetAttachmentIdentityReference {
  return attachment.status === 'unattached'
    ? deepFreeze({
        status: 'unattached' as const,
        attachmentIdentity: attachment.attachmentIdentity,
      })
    : deepFreeze({
        status: 'attached' as const,
        attachmentIdentity: attachment.attachmentIdentity,
        configurationIdentity: attachment.configuration.configurationIdentity,
      })
}

/**
 * Projects one validated application snapshot into a compact deterministic
 * identity. The projection binds the complete aggregate through its content
 * identity and an attached configuration through its validated identity.
 */
export function projectCaseInsertPresetApplicationStateIdentity(
  value: unknown,
): CaseInsertPresetApplicationStateIdentityProjectionResult {
  const validated = validateCaseInsertPresetApplicationSnapshot(value)
  if (!validated.ok) return validated
  const snapshot = validated.value
  const projection = {
    kind: snapshot.kind,
    formatVersion: snapshot.formatVersion,
    projectKind: snapshot.projectKind,
    snapshotIdentity: snapshot.snapshot.identity,
    attachment: applicationAttachmentIdentityReference(snapshot.attachment),
  }
  let applicationStateIdentity: string
  try {
    applicationStateIdentity =
      `${CASE_INSERT_PRESET_APPLICATION_STATE_IDENTITY_PREFIX}${
        createCaseInsertPresetIdentityDigest(
          encodeCaseInsertPresetDeterministicIdentity(projection),
        )
      }`
  } catch {
    return failure(
      'invalid-adoption-model',
      'application-state-identity-unavailable',
    )
  }
  return deepFreeze({
    ok: true,
    status: 'projected' as const,
    applicationStateIdentity,
  })
}

function isNormalizedCaseAggregate(value: unknown) {
  if (!isRecord(value)) return false
  try {
    return sameValue(value, normalizeProjectJewelCaseState(
      value as ProjectJewelCaseState,
    ))
  } catch {
    return false
  }
}

function isCanonicalIdentityArray(value: unknown) {
  return Array.isArray(value) && value.every(validIdentityString) &&
    new Set(value).size === value.length &&
    value.every((entry, index) => index === 0 || value[index - 1] <= entry)
}

function isDetachAddress(value: unknown) {
  return isRecord(value) && hasExactKeys(value, [
    'region', 'featureOwnerId', 'bindingKind', 'bindingId', 'runtimeObjectId',
    'fieldId',
  ]) && Object.values(value).every(validIdentityString)
}

function isDetachSource(value: unknown) {
  return isRecord(value) && hasExactKeys(value, [
    'presetId', 'presetRevision', 'slotId', 'assignmentId', 'roleId', 'region',
    'coordinateBasis', 'ownerId', 'object', 'declaredPolicy',
  ]) && validIdentityString(value.presetId) &&
    Number.isSafeInteger(value.presetRevision) &&
    (value.presetRevision as number) > 0 && validIdentityString(value.slotId) &&
    validIdentityString(value.assignmentId) && validIdentityString(value.roleId) &&
    validIdentityString(value.region) &&
    validIdentityString(value.coordinateBasis) &&
    validIdentityString(value.ownerId) && isRecord(value.object) &&
    hasExactKeys(value.object, ['bindingKind', 'bindingId', 'runtimeId']) &&
    (value.object.bindingKind === 'fixed' ||
      value.object.bindingKind === 'repeated') &&
    validIdentityString(value.object.bindingId) &&
    validIdentityString(value.object.runtimeId) &&
    value.declaredPolicy === 'normalized-content-region-direct-layout-v1'
}

function isDetachEnablement(value: unknown) {
  return isRecord(value) && hasExactKeys(value, [
    'objectEnabled', 'ownerEnabled', 'effectiveEnabled',
  ]) && typeof value.objectEnabled === 'boolean' &&
    (typeof value.ownerEnabled === 'boolean' || value.ownerEnabled === null) &&
    typeof value.effectiveEnabled === 'boolean'
}

function isDetachReleaseRecord(value: unknown) {
  if (!isRecord(value) || !hasExactKeys(value, [
    'id', 'address', 'currentValue', 'previousLastAppliedValue', 'sources',
    'enablement', 'ownershipDisposition', 'aggregateDisposition',
  ]) || !validIdentityString(value.id) || !isDetachAddress(value.address) ||
      typeof value.currentValue !== 'number' ||
      !Number.isFinite(value.currentValue) ||
      typeof value.previousLastAppliedValue !== 'number' ||
      !Number.isFinite(value.previousLastAppliedValue) ||
      !Array.isArray(value.sources) || !value.sources.every(isDetachSource) ||
      !isDetachEnablement(value.enablement) ||
      value.ownershipDisposition !==
        'release-complete-configuration-ownership' ||
      value.aggregateDisposition !== 'preserve-exact-current-value') {
    return false
  }
  const expectedIdentity = createCaseInsertPresetDetachReleaseIdentity({
    address: value.address as {
      region: string
      featureOwnerId: string
      bindingKind: string
      bindingId: string
      runtimeObjectId: string
      fieldId: string
    },
    currentValue: value.currentValue,
    previousLastAppliedValue: value.previousLastAppliedValue,
    sources: value.sources as readonly {
      region: string
      slotId: string
      assignmentId: string
    }[],
    enablement: value.enablement,
    ownershipDisposition: value.ownershipDisposition,
    aggregateDisposition: value.aggregateDisposition,
  })
  return value.id === expectedIdentity
}

function isDetachReleaseResult(
  value: unknown,
  transitionIdentity: string,
) {
  if (!isRecord(value) || !hasExactKeys(value, [
    'kind', 'formatVersion', 'domainStatus', 'operation',
    'transitionIdentity', 'transitionClassification',
    'sourceConfigurationIdentity', 'sourceConfigurationFormatVersion',
    'preset', 'planIdentity', 'planReviewIdentity',
    'reviewAcceptanceIdentity', 'reviewedWarningIds',
    'acceptedMaterialConsentRequirementIds', 'context', 'releasedFootprint',
    'proof', 'nextAppliedPresetConfiguration', 'applicationAdoptionStatus',
  ]) || value.kind !== 'sbls/case-insert-preset-detach-release-result' ||
      value.formatVersion !== 1 || value.domainStatus !==
        'validated-authoritative-transition-evidence' ||
      value.operation !== 'detach' || value.transitionIdentity !==
        transitionIdentity || !transitionIdentity.startsWith(
        CASE_INSERT_PRESET_DETACH_TRANSITION_IDENTITY_PREFIX) ||
      value.transitionClassification !==
        'meaningful-configuration-ownership-release' ||
      !validIdentityString(value.sourceConfigurationIdentity) ||
      (value.sourceConfigurationFormatVersion !== 1 &&
        value.sourceConfigurationFormatVersion !== 2 &&
        value.sourceConfigurationFormatVersion !== 3) ||
      !validIdentityString(value.planIdentity) ||
      !validIdentityString(value.planReviewIdentity) ||
      !validIdentityString(value.reviewAcceptanceIdentity) ||
      !isCanonicalIdentityArray(value.reviewedWarningIds) ||
      !Array.isArray(value.acceptedMaterialConsentRequirementIds) ||
      value.acceptedMaterialConsentRequirementIds.length !== 0 ||
      value.nextAppliedPresetConfiguration !== null ||
      value.applicationAdoptionStatus !== 'not-adopted') {
    return false
  }
  if (!isRecord(value.preset) || !hasExactKeys(value.preset, [
    'id', 'revision', 'source',
  ]) || !validIdentityString(value.preset.id) ||
      !Number.isSafeInteger(value.preset.revision) ||
      (value.preset.revision as number) <= 0 ||
      (value.preset.source !== 'builtin' && value.preset.source !== 'user')) {
    return false
  }
  if (!isRecord(value.context) || !hasExactKeys(value.context, [
    'projectKind', 'sessionId', 'projectRevision', 'template',
  ]) || value.context.projectKind !== 'caseInsert' ||
      !validIdentityString(value.context.sessionId) ||
      !Number.isSafeInteger(value.context.projectRevision) ||
      (value.context.projectRevision as number) < 0 ||
      !isRecord(value.context.template) || !hasExactKeys(
        value.context.template,
        ['id', 'revision'],
      ) || !validIdentityString(value.context.template.id) ||
      value.context.template.revision !== null) {
    return false
  }
  if (!Array.isArray(value.releasedFootprint) ||
      !value.releasedFootprint.every(isDetachReleaseRecord) ||
      new Set(value.releasedFootprint.map((record) => record.id)).size !==
        value.releasedFootprint.length || !isRecord(value.proof) ||
      !hasExactKeys(value.proof, [
        'sourceOwnedFieldCount', 'releasedOwnedFieldCount',
        'releasesCompleteConfiguration', 'aggregateWriteCount',
        'aggregateClassification', 'preservesEveryAggregateValue',
      ]) || !Number.isSafeInteger(value.proof.sourceOwnedFieldCount) ||
      value.proof.sourceOwnedFieldCount !== value.releasedFootprint.length ||
      !Number.isSafeInteger(value.proof.releasedOwnedFieldCount) ||
      value.proof.releasedOwnedFieldCount !== value.releasedFootprint.length ||
      value.proof.releasesCompleteConfiguration !== true ||
      value.proof.aggregateWriteCount !== 0 ||
      value.proof.aggregateClassification !== 'aggregate-semantic-no-write' ||
      value.proof.preservesEveryAggregateValue !== true) {
    return false
  }
  const expectedTransitionIdentity =
    createCaseInsertPresetDetachTransitionIdentity({
      operation: 'detach',
      status: 'detached-aggregate-semantic-no-op',
      planIdentity: value.planIdentity,
      planReviewIdentity: value.planReviewIdentity,
      sourceConfigurationIdentity: value.sourceConfigurationIdentity,
      reviewAcceptanceIdentity: value.reviewAcceptanceIdentity,
      reviewedWarningIds: value.reviewedWarningIds,
      acceptedMaterialConsentRequirementIds:
        value.acceptedMaterialConsentRequirementIds,
      current: value.context,
      releasedFootprint: value.releasedFootprint,
      aggregateWriteCount: 0,
      nextAppliedPresetConfiguration: null,
      applicationAdoptionStatus: 'not-adopted',
    })
  return transitionIdentity === expectedTransitionIdentity
}

function recognizedTransitionOperation(
  value: unknown,
): CaseInsertPresetApplicationAdoptionOperation | null {
  if (!isRecord(value) || value.ok !== true) return null
  if ((value.status === 'applied' ||
      value.status === 'applied-semantic-no-op') &&
      hasExactKeys(value, [
        'ok', 'status', 'aggregate', 'configurationCandidate',
      ])) {
    const candidate = validateCaseInsertAppliedPresetConfigurationCandidate(
      deepFreeze(value) as unknown as Parameters<
        typeof validateCaseInsertAppliedPresetConfigurationCandidate
      >[0],
    )
    return candidate.ok ? 'apply' : null
  }
  if ((value.status === 'reapplied' ||
      value.status === 'reapplied-aggregate-semantic-no-op' ||
      value.status === 'reapplied-semantic-no-op') &&
      hasExactKeys(value, [
        'ok', 'status', 'transitionIdentity', 'aggregate', 'nextConfiguration',
      ]) && typeof value.transitionIdentity === 'string' &&
      value.transitionIdentity.startsWith(
        CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_PREFIX,
      ) &&
      isNormalizedCaseAggregate(value.aggregate)) {
    const configuration = validateConfiguration(value.nextConfiguration)
    return configuration.ok &&
        (configuration.configuration.formatVersion === 2 ||
          configuration.configuration.formatVersion === 3) &&
        configuration.configuration.reapply !== null &&
        configuration.configuration.reapply.transitionIdentity ===
          value.transitionIdentity &&
        configuration.configuration.reapply.transitionStatus === value.status
      ? 'reapply'
      : null
  }
  if (value.status === 'detached-aggregate-semantic-no-op' &&
      hasExactKeys(value, [
        'ok', 'status', 'transitionIdentity', 'aggregate', 'releaseResult',
      ]) && typeof value.transitionIdentity === 'string' &&
      isNormalizedCaseAggregate(value.aggregate) &&
      isDetachReleaseResult(value.releaseResult, value.transitionIdentity)) {
    return 'detach'
  }
  return null
}

/**
 * Strictly validates one complete operation success and returns only inert,
 * opaque evidence. This function never adopts aggregate or attachment state.
 */
export function auditCaseInsertPresetApplicationAdoptionEvidence(
  value: unknown,
): CaseInsertPresetApplicationAdoptionEvidenceAuditResult {
  const cloned = clonePlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return failure(
      'invalid-transition-evidence',
      cloned.ok ? 'evidence-root-invalid' : cloned.code,
    )
  }
  const evidence = cloned.value
  if (evidence.kind === CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND &&
      evidence.formatVersion !==
        CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION) {
    return failure(
      'unsupported-transition-version',
      'evidence-candidate-version-unsupported',
    )
  }
  if (!hasExactKeys(evidence, [
    'kind', 'formatVersion', 'operation', 'applicationAdoptionStatus',
    'transitionResult',
  ]) || evidence.kind !==
      CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND ||
      evidence.formatVersion !==
        CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION) {
    return failure('invalid-transition-evidence', 'evidence-candidate-invalid')
  }
  if (evidence.applicationAdoptionStatus === 'adopted') {
    return failure(
      'transition-already-adopted',
      'evidence-claims-prior-adoption',
    )
  }
  if (evidence.applicationAdoptionStatus !== 'not-adopted') {
    return failure(
      'invalid-transition-evidence',
      'evidence-adoption-status-invalid',
    )
  }
  if (evidence.operation !== 'apply' && evidence.operation !== 'reapply' &&
      evidence.operation !== 'detach') {
    return failure('unsupported-operation', 'evidence-operation-unsupported')
  }
  const operation = evidence.operation
  if (isRecord(evidence.transitionResult) &&
      (evidence.transitionResult.operation === 'apply' ||
        evidence.transitionResult.operation === 'reapply' ||
        evidence.transitionResult.operation === 'detach') &&
      evidence.transitionResult.operation !== operation) {
    return failure(
      'transition-evidence-mismatch',
      'evidence-operation-result-mismatch',
      { operation },
    )
  }
  const validated = operation === 'apply'
    ? validateCaseInsertPresetApplyTransitionSuccess(evidence.transitionResult)
    : operation === 'reapply'
      ? validateCaseInsertPresetReapplyTransitionSuccess(
          evidence.transitionResult,
        )
      : validateCaseInsertPresetDetachTransitionSuccess(
          evidence.transitionResult,
        )
  if (!validated.ok) {
    const legacyOperation = recognizedTransitionOperation(
      evidence.transitionResult,
    )
    if (legacyOperation === operation ||
        validated.status === 'unsupported-transition-success-version') {
      return failure(
        'aggregate-evidence-insufficient',
        `${operation}-transition-evidence-insufficient`,
        {
          operation,
          gaps: CASE_INSERT_PRESET_AGGREGATE_EVIDENCE_GAPS[operation],
        },
      )
    }
    return failure(
      'invalid-transition-evidence',
      validated.code,
      { operation },
    )
  }
  const inertEvidence = deepFreeze({
    kind: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
    formatVersion: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
    operation,
    applicationAdoptionStatus: 'not-adopted' as const,
    transitionResult: validated.success,
  }) as unknown as CaseInsertPresetApplicationAdoptionEvidence
  return deepFreeze({
    ok: true,
    status: 'validated-inert-evidence' as const,
    evidence: inertEvidence,
  })
}

function validIdentityString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validConfigurationIdentity(value: unknown): value is string {
  return validIdentityString(value) && (
    value.startsWith(CASE_INSERT_PRESET_CONFIGURATION_IDENTITY_PREFIX) ||
    value.startsWith(CASE_INSERT_PRESET_TYPED_CONFIGURATION_IDENTITY_PREFIX)
  )
}

function validOperationTransitionIdentity(
  operation: CaseInsertPresetApplicationAdoptionOperation,
  value: unknown,
) {
  const prefix = operation === 'apply'
    ? CASE_INSERT_PRESET_APPLY_TRANSITION_IDENTITY_PREFIX
    : operation === 'reapply'
      ? CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_V2_PREFIX
      : CASE_INSERT_PRESET_DETACH_TRANSITION_IDENTITY_V2_PREFIX
  return validIdentityString(value) && value.startsWith(prefix)
}

function validAttachmentReference(
  value: unknown,
): value is CaseInsertPresetAttachmentIdentityReference {
  if (!isRecord(value)) return false
  if (value.status === 'unattached') {
    return hasExactKeys(value, ['status', 'attachmentIdentity']) &&
      value.attachmentIdentity === CASE_INSERT_PRESET_UNATTACHED_IDENTITY
  }
  return value.status === 'attached' && hasExactKeys(value, [
    'status', 'attachmentIdentity', 'configurationIdentity',
  ]) && validIdentityString(value.attachmentIdentity) &&
    validConfigurationIdentity(value.configurationIdentity) &&
    value.attachmentIdentity === createCaseInsertPresetAttachedEndpoint(
      value.configurationIdentity,
    ).attachmentIdentity
}

type ValidIdentityContext = Readonly<{
  projectKind: 'caseInsert'
  sessionId: string
  projectRevision: number
  template: Readonly<{ id: string; revision: null }>
  attachment: CaseInsertPresetAttachmentIdentityReference
}>

function validIdentityContext(value: unknown): value is ValidIdentityContext {
  return isRecord(value) && hasExactKeys(value, [
    'projectKind', 'sessionId', 'projectRevision', 'template', 'attachment',
  ]) && value.projectKind === 'caseInsert' &&
    validIdentityString(value.sessionId) &&
    typeof value.projectRevision === 'number' &&
    Number.isSafeInteger(value.projectRevision) && value.projectRevision >= 0 &&
    isRecord(value.template) && hasExactKeys(value.template, [
      'id', 'revision',
    ]) && validIdentityString(value.template.id) &&
    value.template.revision === null && validAttachmentReference(value.attachment)
}

export function projectCaseInsertPresetApplicationAdoptionIdentity(
  value: unknown,
): CaseInsertPresetApplicationAdoptionIdentityProjectionResult {
  const cloned = clonePlainInput(value)
  if (!cloned.ok || !isRecord(cloned.value)) {
    return failure(
      'invalid-adoption-model',
      cloned.ok ? 'adoption-identity-input-invalid' : cloned.code,
    )
  }
  const input = cloned.value
  if (!hasExactKeys(input, [
    'operation', 'consumedTransitionIdentity', 'consumedWholeSuccessIdentity',
    'sourceApplicationStateIdentity', 'successorApplicationStateIdentity',
    'sourceAggregateIdentity', 'resultAggregateIdentity',
    'sourceConfigurationIdentity', 'successorConfigurationIdentity',
    'configurationReleaseIdentity', 'source', 'successor',
    'aggregateAdoptionClassification', 'attachmentAction',
  ]) || (input.operation !== 'apply' && input.operation !== 'reapply' &&
      input.operation !== 'detach')) {
    return failure('invalid-adoption-model', 'adoption-identity-shape-invalid')
  }
  const operation = input.operation
  if (!validOperationTransitionIdentity(
        operation,
        input.consumedTransitionIdentity,
      ) || !validIdentityString(input.consumedWholeSuccessIdentity) ||
      !input.consumedWholeSuccessIdentity.startsWith(
        CASE_INSERT_PRESET_WHOLE_SUCCESS_IDENTITY_PREFIX,
      ) || !validIdentityString(input.sourceApplicationStateIdentity) ||
      !input.sourceApplicationStateIdentity.startsWith(
        CASE_INSERT_PRESET_APPLICATION_STATE_IDENTITY_PREFIX,
      ) || !validIdentityString(input.successorApplicationStateIdentity) ||
      !input.successorApplicationStateIdentity.startsWith(
        CASE_INSERT_PRESET_APPLICATION_STATE_IDENTITY_PREFIX,
      ) ||
      input.sourceApplicationStateIdentity ===
        input.successorApplicationStateIdentity ||
      !validIdentityString(input.sourceAggregateIdentity) ||
      !validIdentityString(input.resultAggregateIdentity) ||
      !validIdentityContext(input.source) ||
      !validIdentityContext(input.successor)) {
    return failure(
      'invalid-adoption-model',
      'adoption-identity-facts-invalid',
      { operation },
    )
  }
  const source = input.source
  const successor = input.successor
  const contextMatches = source.sessionId === successor.sessionId &&
    sameValue(source.template, successor.template) &&
    successor.projectRevision === source.projectRevision + 1 &&
    (operation !== 'detach' ||
      input.sourceAggregateIdentity === input.resultAggregateIdentity)
  if (!contextMatches) {
    return failure(
      'application-context-mismatch',
      'adoption-identity-context-incoherent',
      { operation },
    )
  }
  const sourceAttachment = source.attachment
  const successorAttachment = successor.attachment
  const relationshipMatches = operation === 'apply'
    ? input.attachmentAction === 'attached' &&
      input.aggregateAdoptionClassification === 'exact-transition-result' &&
      sourceAttachment.status === 'unattached' &&
      successorAttachment.status === 'attached' &&
      input.sourceConfigurationIdentity === null &&
      input.successorConfigurationIdentity ===
        successorAttachment.configurationIdentity &&
      input.configurationReleaseIdentity === null
    : operation === 'reapply'
      ? input.attachmentAction === 'replaced' &&
        input.aggregateAdoptionClassification === 'exact-transition-result' &&
        sourceAttachment.status === 'attached' &&
        successorAttachment.status === 'attached' &&
        sourceAttachment.configurationIdentity !==
          successorAttachment.configurationIdentity &&
        input.sourceConfigurationIdentity ===
          sourceAttachment.configurationIdentity &&
        input.successorConfigurationIdentity ===
          successorAttachment.configurationIdentity &&
        input.configurationReleaseIdentity === null
      : input.attachmentAction === 'released' &&
        input.aggregateAdoptionClassification ===
          'exact-unchanged-semantic-transition-result' &&
        sourceAttachment.status === 'attached' &&
        successorAttachment.status === 'unattached' &&
        input.sourceConfigurationIdentity ===
          sourceAttachment.configurationIdentity &&
        input.successorConfigurationIdentity === null &&
        validIdentityString(input.configurationReleaseIdentity) &&
        input.configurationReleaseIdentity.startsWith(
          CASE_INSERT_PRESET_DETACH_CONFIGURATION_RELEASE_IDENTITY_PREFIX,
        )
  if (!relationshipMatches) {
    return failure(
      'unsupported-state-transition',
      'adoption-identity-relationship-incoherent',
      { operation },
    )
  }
  const adoptionIdentity =
    `${CASE_INSERT_PRESET_APPLICATION_ADOPTION_IDENTITY_PREFIX}${
      encodeCaseInsertPresetDeterministicIdentity(input)
    }`
  return deepFreeze({
    ok: true,
    status: 'projected' as const,
    adoptionIdentity,
  })
}

export type ImmutableCaseInsertPresetApplicationAggregate =
  DeepReadonly<ProjectJewelCaseState>
