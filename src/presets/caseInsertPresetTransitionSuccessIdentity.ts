import type {
  CaseInsertPresetAggregateContentIdentity,
} from '../caseInsert/presetAggregateIdentity.ts'
import type {
  CaseInsertPresetAttachmentEndpoint,
} from './caseInsertPresetAttachmentEndpoint.ts'
import {
  encodeCaseInsertPresetDeterministicIdentity,
} from './caseInsertPresetDeterministicIdentity.ts'
import {
  deepFreezeCaseInsertPresetValue,
} from './caseInsertPresetSafeInput.ts'
import {
  createCaseInsertPresetIdentityDigest,
} from './caseInsertPresetIdentityDigest.ts'

export const CASE_INSERT_PRESET_TRANSITION_SUCCESS_EVIDENCE_KIND =
  'sbls/case-insert-preset-transition-success-evidence' as const
export const CASE_INSERT_PRESET_TRANSITION_SUCCESS_EVIDENCE_VERSION = 1 as const
export const CASE_INSERT_PRESET_APPLY_TRANSITION_IDENTITY_PREFIX =
  'case:preset-apply-transition:v2:' as const
export const CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_V2_PREFIX =
  'case:preset-reapply-transition:v2:' as const
export const CASE_INSERT_PRESET_DETACH_TRANSITION_IDENTITY_V2_PREFIX =
  'case:preset-detach-transition:v2:' as const
export const CASE_INSERT_PRESET_WHOLE_SUCCESS_IDENTITY_PREFIX =
  'case:preset-transition-whole-success:v1:' as const

export type CaseInsertPresetTransitionEvidenceOperation =
  | 'apply'
  | 'reapply'
  | 'detach'

export type CaseInsertPresetTransitionSuccessContext = Readonly<{
  projectKind: 'caseInsert'
  sessionId: string
  projectRevision: number
  template: Readonly<{ id: string; revision: null }>
  snapshotAggregateContentIdentity: CaseInsertPresetAggregateContentIdentity
}>

export type CaseInsertPresetTransitionSuccessLineage = Readonly<{
  planIdentity: string
  planReviewIdentity: string
  reviewAcceptanceIdentity: string
  materialConsentAcceptanceIdentities: readonly string[]
  operationTransitionIdentity: string | null
}>

export type CaseInsertPresetTransitionSuccessEvidence = Readonly<{
  kind: typeof CASE_INSERT_PRESET_TRANSITION_SUCCESS_EVIDENCE_KIND
  formatVersion:
    typeof CASE_INSERT_PRESET_TRANSITION_SUCCESS_EVIDENCE_VERSION
  operation: CaseInsertPresetTransitionEvidenceOperation
  transitionResultVersion: 1
  transitionStatus: string
  context: CaseInsertPresetTransitionSuccessContext
  lineage: CaseInsertPresetTransitionSuccessLineage
  sourceAggregateContentIdentity: CaseInsertPresetAggregateContentIdentity
  resultAggregateContentIdentity: CaseInsertPresetAggregateContentIdentity
  sourceAttachment: CaseInsertPresetAttachmentEndpoint
  successorAttachment: CaseInsertPresetAttachmentEndpoint
  sourceConfigurationIdentity: string | null
  successorConfigurationIdentity: string | null
  configurationReleaseIdentity: string | null
  applicationAdoptionStatus: 'not-adopted'
  transitionIdentity: string
  wholeSuccessIdentity: string
}>

export type CreateCaseInsertPresetTransitionSuccessEvidenceInput = Readonly<
  Omit<
    CaseInsertPresetTransitionSuccessEvidence,
    | 'kind'
    | 'formatVersion'
    | 'transitionResultVersion'
    | 'transitionIdentity'
    | 'wholeSuccessIdentity'
  >
>

function transitionPrefix(operation: CaseInsertPresetTransitionEvidenceOperation) {
  switch (operation) {
    case 'apply': return CASE_INSERT_PRESET_APPLY_TRANSITION_IDENTITY_PREFIX
    case 'reapply':
      return CASE_INSERT_PRESET_REAPPLY_TRANSITION_IDENTITY_V2_PREFIX
    case 'detach': return CASE_INSERT_PRESET_DETACH_TRANSITION_IDENTITY_V2_PREFIX
  }
}

function canonicalInput(input: CreateCaseInsertPresetTransitionSuccessEvidenceInput) {
  return {
    ...input,
    context: {
      ...input.context,
      template: { ...input.context.template },
    },
    lineage: {
      ...input.lineage,
      materialConsentAcceptanceIdentities:
        [...input.lineage.materialConsentAcceptanceIdentities].sort(),
    },
    sourceAttachment: { ...input.sourceAttachment },
    successorAttachment: { ...input.successorAttachment },
  }
}

export function createCaseInsertPresetTransitionSuccessEvidence(
  input: CreateCaseInsertPresetTransitionSuccessEvidenceInput,
): CaseInsertPresetTransitionSuccessEvidence {
  const canonical = canonicalInput(input)
  const transitionProjection = {
    transitionResultVersion: 1 as const,
    ...canonical,
  }
  const transitionIdentity = `${transitionPrefix(input.operation)}${
    createCaseInsertPresetIdentityDigest(
      encodeCaseInsertPresetDeterministicIdentity(transitionProjection),
    )
  }`
  const wholeSuccessProjection = {
    kind: CASE_INSERT_PRESET_TRANSITION_SUCCESS_EVIDENCE_KIND,
    formatVersion: CASE_INSERT_PRESET_TRANSITION_SUCCESS_EVIDENCE_VERSION,
    ...transitionProjection,
    transitionIdentity,
  }
  const wholeSuccessIdentity = `${
    CASE_INSERT_PRESET_WHOLE_SUCCESS_IDENTITY_PREFIX
  }${createCaseInsertPresetIdentityDigest(
    encodeCaseInsertPresetDeterministicIdentity(wholeSuccessProjection),
  )}`

  return deepFreezeCaseInsertPresetValue({
    ...wholeSuccessProjection,
    wholeSuccessIdentity,
  })
}
