import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import {
  type ApplicationCommandDispatchResult,
  type CaseInsertPresetApplicationCommandId,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  ApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  prepareCaseInsertPresetSessionAdoptionCommit,
} from '../lifecycle/caseInsertPresetSessionApplicationCommit.ts'
import {
  projectCaseInsertPresetSessionApplicationSnapshot,
} from '../lifecycle/caseInsertPresetSessionApplication.ts'
import type {
  CaseInsertProjectSession,
} from '../lifecycle/projectSession.ts'
import {
  detectCaseInsertPresetCustomization,
  type CaseInsertAppliedPresetConfiguration,
  type CaseInsertPresetCustomizationDetectionResult,
  type CaseInsertPresetCustomizationReport,
} from '../presets/caseInsertPresetAppliedConfiguration.ts'
import {
  auditCaseInsertPresetValidatedAdoptionSuccessBundle,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
  CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND,
  CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION,
  transitionCaseInsertPresetApplicationAdoption,
} from '../presets/caseInsertPresetApplicationAdoptionTransition.ts'
import {
  resolveCaseInsertPresetAssignments,
} from '../presets/caseInsertPresetAssignmentResolution.ts'
import {
  createCaseInsertPresetUnattachedEndpoint,
} from '../presets/caseInsertPresetAttachmentEndpoint.ts'
import {
  planCaseInsertPresetFirstApply,
  type CaseInsertPresetApplyPlan,
} from '../presets/caseInsertPresetApplyPlanning.ts'
import {
  createCaseInsertPresetPlanWarningIdentity,
} from '../presets/caseInsertPresetApplyReviewIdentity.ts'
import {
  applyCaseInsertPresetFirstTime,
  createCaseInsertPresetApplyReviewApproval,
  createCaseInsertPresetMaterialConsentAcceptance,
  type CaseInsertPresetApplyTransitionResult,
  type CaseInsertPresetMaterialConsentAcceptance,
} from '../presets/caseInsertPresetApplyTransition.ts'
import type {
  CaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
import {
  CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
  CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
  auditCaseInsertPresetApplicationAdoptionEvidence,
  type CaseInsertPresetApplicationAdoptionOperation,
  type CaseInsertPresetApplicationSnapshot,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'
import type {
  CaseInsertPresetApplicationScope,
} from '../presets/caseInsertPresetDefinition.ts'
import {
  planCaseInsertPresetDetach,
  type CaseInsertPresetDetachPlan,
} from '../presets/caseInsertPresetDetachPlanning.ts'
import {
  createCaseInsertPresetDetachReviewAcceptance,
  transitionCaseInsertPresetDetach,
  type CaseInsertPresetDetachTransitionResult,
} from '../presets/caseInsertPresetDetachTransition.ts'
import {
  createCaseInsertPresetReapplyWarningIdentity,
} from '../presets/caseInsertPresetReapplyIdentity.ts'
import {
  planCaseInsertPresetReapply,
  type CaseInsertPresetCustomizedFieldPolicyRecord,
  type CaseInsertPresetReapplyPlan,
} from '../presets/caseInsertPresetReapplyPlanning.ts'
import {
  createCaseInsertPresetReapplyConsentAcceptance,
  createCaseInsertPresetReapplyReviewAcceptance,
  transitionCaseInsertPresetReapply,
  type CaseInsertPresetReapplyConsentAcceptance,
  type CaseInsertPresetReapplyTransitionResult,
} from '../presets/caseInsertPresetReapplyTransition.ts'
import {
  deepFreezeCaseInsertPresetValue,
  sameCaseInsertPresetValue,
} from '../presets/caseInsertPresetSafeInput.ts'
import type {
  CaseInsertPresetSessionApplicationCommandSuccess,
} from '../lifecycle/caseInsertPresetSessionApplicationCommand.ts'

export const APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_KIND =
  'sbls/app-case-insert-preset-workflow-review' as const
export const APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_VERSION = 1 as const

export type AppCaseInsertPresetSelection = Readonly<{
  id: string
  revision: number
}>

type ReviewSource = Readonly<{
  sessionId: string
  projectRevision: number
  applicationRevision: number
  applicationStateIdentity: string
  snapshotIdentity: CaseInsertPresetApplicationSnapshot['snapshot']['identity']
}>

type ReviewCommon<Operation extends CaseInsertPresetApplicationAdoptionOperation> =
  Readonly<{
    kind: typeof APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_KIND
    formatVersion: typeof APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_VERSION
    operation: Operation
    source: ReviewSource
    selectedPreset: AppCaseInsertPresetSelection | null
    reviewIdentity: string
    warningIds: readonly string[]
    materialConsentRequirementIds: readonly string[]
  }>

export type AppCaseInsertPresetApplyReview = ReviewCommon<'apply'> & Readonly<{
  planningStatus: 'planned' | 'semantic-no-op'
  plan: CaseInsertPresetApplyPlan
}>

export type AppCaseInsertPresetReapplyReview =
  ReviewCommon<'reapply'> & Readonly<{
    plan: CaseInsertPresetReapplyPlan
    sourceConfiguration: CaseInsertAppliedPresetConfiguration
    customizationReport: CaseInsertPresetCustomizationReport
  }>

export type AppCaseInsertPresetDetachReview =
  ReviewCommon<'detach'> & Readonly<{
    plan: CaseInsertPresetDetachPlan
    sourceConfiguration: CaseInsertAppliedPresetConfiguration
  }>

export type AppCaseInsertPresetWorkflowReview =
  | AppCaseInsertPresetApplyReview
  | AppCaseInsertPresetReapplyReview
  | AppCaseInsertPresetDetachReview

type AppCaseInsertPresetCommandDispatchResult =
  ApplicationCommandDispatchResult<
    CaseInsertPresetSessionApplicationCommandSuccess
  >

export type AppCaseInsertPresetWorkflowFailure =
  | Readonly<{
      ok: false
      status:
    | 'invalid-request'
    | 'no-active-session'
    | 'incompatible-project-kind'
    | 'already-attached'
    | 'not-attached'
    | 'preset-unavailable'
    | 'customization-detection-failed'
    | 'planning-failed'
    | 'invalid-decision'
    | 'stale-review'
    | 'transition-failed'
    | 'adoption-failed'
    | 'preparation-failed'
      code: string
      operation?: CaseInsertPresetApplicationAdoptionOperation
      cause?: unknown
    }>
  | Readonly<{
      ok: false
      status: 'dispatch-failed'
      code: string
      operation: CaseInsertPresetApplicationAdoptionOperation
      dispatch: AppCaseInsertPresetCommandDispatchResult
    }>

export type AppCaseInsertPresetWorkflowPlanningResult<Review> =
  | Readonly<{ ok: true; status: 'review-required'; review: Review }>
  | AppCaseInsertPresetWorkflowFailure

export type AppCaseInsertPresetWorkflowDecision =
  | Readonly<{
      decision: 'cancel'
      operation: CaseInsertPresetApplicationAdoptionOperation
      reviewIdentity: string
    }>
  | Readonly<{
      decision: 'confirm'
      operation: CaseInsertPresetApplicationAdoptionOperation
      reviewIdentity: string
      selectedPreset: AppCaseInsertPresetSelection | null
      reviewedWarningIds: readonly string[]
      acceptedMaterialConsentRequirementIds: readonly string[]
    }>

export type AppCaseInsertPresetWorkflowCompletionResult =
  | Readonly<{
      ok: true
      status: 'cancelled'
      operation: CaseInsertPresetApplicationAdoptionOperation
    }>
  | Readonly<{
      ok: true
      status: 'dispatched'
      operation: CaseInsertPresetApplicationAdoptionOperation
      dispatch: AppCaseInsertPresetCommandDispatchResult
    }>
  | AppCaseInsertPresetWorkflowFailure

export type AppCaseInsertPresetInspectionResult =
  | Readonly<{
      ok: true
      status: 'detached'
      sessionId: string
      projectRevision: number
      applicationRevision: number
      recoveryStatus: CaseInsertProjectSession[
        'caseInsertPresetApplication'
      ]['recoveryStatus']
    }>
  | Readonly<{
      ok: true
      status: 'attached'
      sessionId: string
      projectRevision: number
      applicationRevision: number
      configuration: CaseInsertAppliedPresetConfiguration
      recoveryStatus: CaseInsertProjectSession[
        'caseInsertPresetApplication'
      ]['recoveryStatus']
      customization: CaseInsertPresetCustomizationDetectionResult
    }>
  | AppCaseInsertPresetWorkflowFailure

export type AppCaseInsertPresetWorkflowDomainOwners = Readonly<{
  projectApplicationSnapshot:
    typeof projectCaseInsertPresetSessionApplicationSnapshot
  resolveAssignments: typeof resolveCaseInsertPresetAssignments
  planApply: typeof planCaseInsertPresetFirstApply
  applyTransition: typeof applyCaseInsertPresetFirstTime
  detectCustomization: typeof detectCaseInsertPresetCustomization
  planReapply: typeof planCaseInsertPresetReapply
  reapplyTransition: typeof transitionCaseInsertPresetReapply
  planDetach: typeof planCaseInsertPresetDetach
  detachTransition: typeof transitionCaseInsertPresetDetach
  auditEvidence: typeof auditCaseInsertPresetApplicationAdoptionEvidence
  transitionAdoption: typeof transitionCaseInsertPresetApplicationAdoption
  auditAdoptionBundle:
    typeof auditCaseInsertPresetValidatedAdoptionSuccessBundle
  prepareCommit: typeof prepareCaseInsertPresetSessionAdoptionCommit
}>

export type AppCaseInsertPresetWorkflowDependencies = Readonly<{
  lifecycle: Pick<
    ApplicationLifecycleCompositionRoot,
    'getLifecycleState' | 'dispatch'
  >
  catalog: CaseInsertPresetCatalog
  owners?: Partial<AppCaseInsertPresetWorkflowDomainOwners>
}>

export interface AppCaseInsertPresetWorkflowOwner {
  inspectCurrent(): AppCaseInsertPresetInspectionResult
  beginApply(input: Readonly<{
    selectedPreset: AppCaseInsertPresetSelection
    requestedScope: CaseInsertPresetApplicationScope
  }>): AppCaseInsertPresetWorkflowPlanningResult<
    AppCaseInsertPresetApplyReview
  >
  beginReapply(input: Readonly<{
    selectedPreset: AppCaseInsertPresetSelection
    customizedFieldPolicies:
      readonly CaseInsertPresetCustomizedFieldPolicyRecord[]
  }>): AppCaseInsertPresetWorkflowPlanningResult<
    AppCaseInsertPresetReapplyReview
  >
  beginDetach(): AppCaseInsertPresetWorkflowPlanningResult<
    AppCaseInsertPresetDetachReview
  >
  complete(
    review: AppCaseInsertPresetWorkflowReview,
    decision: AppCaseInsertPresetWorkflowDecision,
  ): Promise<AppCaseInsertPresetWorkflowCompletionResult>
}

const DEFAULT_OWNERS: AppCaseInsertPresetWorkflowDomainOwners = Object.freeze({
  projectApplicationSnapshot:
    projectCaseInsertPresetSessionApplicationSnapshot,
  resolveAssignments: resolveCaseInsertPresetAssignments,
  planApply: planCaseInsertPresetFirstApply,
  applyTransition: applyCaseInsertPresetFirstTime,
  detectCustomization: detectCaseInsertPresetCustomization,
  planReapply: planCaseInsertPresetReapply,
  reapplyTransition: transitionCaseInsertPresetReapply,
  planDetach: planCaseInsertPresetDetach,
  detachTransition: transitionCaseInsertPresetDetach,
  auditEvidence: auditCaseInsertPresetApplicationAdoptionEvidence,
  transitionAdoption: transitionCaseInsertPresetApplicationAdoption,
  auditAdoptionBundle: auditCaseInsertPresetValidatedAdoptionSuccessBundle,
  prepareCommit: prepareCaseInsertPresetSessionAdoptionCommit,
})

const COMMAND_BY_OPERATION = Object.freeze({
  apply: 'case.layoutPreset.apply',
  reapply: 'case.layoutPreset.reapply',
  detach: 'case.layoutPreset.detach',
} as const satisfies Readonly<Record<
  CaseInsertPresetApplicationAdoptionOperation,
  CaseInsertPresetApplicationCommandId
>>)

function failure(
  status: Exclude<
    AppCaseInsertPresetWorkflowFailure['status'],
    'dispatch-failed'
  >,
  code: string,
  operation?: CaseInsertPresetApplicationAdoptionOperation,
  cause?: unknown,
): AppCaseInsertPresetWorkflowFailure {
  return Object.freeze({
    ok: false as const,
    status,
    code,
    ...(operation ? { operation } : {}),
    ...(cause !== undefined ? { cause } : {}),
  })
}

function dispatchFailure(
  code: string,
  operation: CaseInsertPresetApplicationAdoptionOperation,
  dispatch: AppCaseInsertPresetCommandDispatchResult,
): AppCaseInsertPresetWorkflowFailure {
  return Object.freeze({
    ok: false as const,
    status: 'dispatch-failed' as const,
    code,
    operation,
    dispatch,
  })
}

function captureCurrentCaseSession(
  lifecycle: AppCaseInsertPresetWorkflowDependencies['lifecycle'],
  operation?: CaseInsertPresetApplicationAdoptionOperation,
): CaseInsertProjectSession | AppCaseInsertPresetWorkflowFailure {
  const session = lifecycle.getLifecycleState().activeSession
  if (!session) {
    return failure(
      'no-active-session',
      'case.layoutPreset.no-active-session',
      operation,
    )
  }
  if (session.kind !== 'caseInsert') {
    return failure(
      'incompatible-project-kind',
      'case.layoutPreset.incompatible-project-kind',
      operation,
    )
  }
  return session
}

function isWorkflowFailure(
  value: unknown,
): value is AppCaseInsertPresetWorkflowFailure {
  return typeof value === 'object' && value !== null &&
    (value as { ok?: unknown }).ok === false
}

function projectApplication(
  session: CaseInsertProjectSession,
  owners: AppCaseInsertPresetWorkflowDomainOwners,
  operation?: CaseInsertPresetApplicationAdoptionOperation,
): CaseInsertPresetApplicationSnapshot |
  AppCaseInsertPresetWorkflowFailure {
  const projected = owners.projectApplicationSnapshot({
    sessionId: session.id,
    project: session.project,
    application: session.caseInsertPresetApplication,
  })
  if (!projected.ok) {
    return failure(
      'invalid-request',
      `case.layoutPreset.application-snapshot.${projected.code}`,
      operation,
      projected,
    )
  }
  return projected.snapshot
}

function createSource(
  session: CaseInsertProjectSession,
  application: CaseInsertPresetApplicationSnapshot,
): ReviewSource {
  return deepFreezeCaseInsertPresetValue({
    sessionId: session.id,
    projectRevision: session.revision,
    applicationRevision:
      session.caseInsertPresetApplication.applicationRevision,
    applicationStateIdentity:
      session.caseInsertPresetApplication.applicationStateIdentity,
    snapshotIdentity: application.snapshot.identity,
  })
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function validSelection(
  value: unknown,
): value is AppCaseInsertPresetSelection {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const selection = value as Record<string, unknown>
  return Object.keys(selection).length === 2 &&
    typeof selection.id === 'string' && selection.id.length > 0 &&
    isPositiveSafeInteger(selection.revision)
}

function exactSetMatch(
  expected: readonly string[],
  actual: readonly string[],
): boolean {
  return Array.isArray(expected) && Array.isArray(actual) &&
    actual.every((id) => typeof id === 'string') &&
    new Set(actual).size === actual.length &&
    expected.length === actual.length &&
    [...expected].sort().every((id, index) => id === [...actual].sort()[index])
}

function selectedPresetMatches(
  expected: AppCaseInsertPresetSelection | null,
  actual: AppCaseInsertPresetSelection | null,
): boolean {
  return expected === null
    ? actual === null
    : actual !== null && expected.id === actual.id &&
      expected.revision === actual.revision
}

function reviewIsCurrent(
  review: AppCaseInsertPresetWorkflowReview,
  session: CaseInsertProjectSession,
  application: CaseInsertPresetApplicationSnapshot,
): boolean {
  return review.source.sessionId === session.id &&
    review.source.projectRevision === session.revision &&
    review.source.applicationRevision ===
      session.caseInsertPresetApplication.applicationRevision &&
    review.source.applicationStateIdentity ===
      session.caseInsertPresetApplication.applicationStateIdentity &&
    sameCaseInsertPresetValue(
      review.source.snapshotIdentity,
      application.snapshot.identity,
    )
}

function currentContext(
  session: CaseInsertProjectSession,
  application: CaseInsertPresetApplicationSnapshot,
) {
  return deepFreezeCaseInsertPresetValue({
    projectKind: 'caseInsert' as const,
    aggregate: structuredClone(
      application.snapshot.caseInsert,
    ) as ProjectJewelCaseState,
    sessionId: session.id,
    projectRevision: application.snapshot.identity.projectRevision,
    template: application.snapshot.identity.template,
  })
}

function planningCurrent(
  session: CaseInsertProjectSession,
  application: CaseInsertPresetApplicationSnapshot,
) {
  return deepFreezeCaseInsertPresetValue({
    ...currentContext(session, application),
    snapshot: application.snapshot,
  })
}

function resolveExactSelection(
  catalog: CaseInsertPresetCatalog,
  selectedPreset: unknown,
  operation: 'apply' | 'reapply',
) {
  if (!validSelection(selectedPreset)) {
    return failure(
      'invalid-request',
      'case.layoutPreset.selection-invalid',
      operation,
    )
  }
  const resolved = catalog.resolve(selectedPreset)
  if (!resolved.ok) {
    return failure(
      'preset-unavailable',
      `case.layoutPreset.${resolved.error.code}`,
      operation,
      resolved,
    )
  }
  return resolved.value
}

function transitionFailure(
  operation: CaseInsertPresetApplicationAdoptionOperation,
  result: { status: string; code?: string },
) {
  return failure(
    'transition-failed',
    result.code ?? `case.layoutPreset.${operation}.transition-failed`,
    operation,
    result,
  )
}

export function createAppCaseInsertPresetWorkflowOwner(
  dependencies: AppCaseInsertPresetWorkflowDependencies,
): AppCaseInsertPresetWorkflowOwner {
  const owners = Object.freeze({
    ...DEFAULT_OWNERS,
    ...dependencies.owners,
  })

  function inspectCurrent(): AppCaseInsertPresetInspectionResult {
    const session = captureCurrentCaseSession(dependencies.lifecycle)
    if (isWorkflowFailure(session)) return session
    const application = projectApplication(session, owners)
    if (isWorkflowFailure(application)) return application
    const common = {
      sessionId: session.id,
      projectRevision: session.revision,
      applicationRevision:
        session.caseInsertPresetApplication.applicationRevision,
      recoveryStatus: session.caseInsertPresetApplication.recoveryStatus,
    }
    if (application.attachment.status === 'unattached') {
      return deepFreezeCaseInsertPresetValue({
        ok: true as const,
        status: 'detached' as const,
        ...common,
      })
    }
    return deepFreezeCaseInsertPresetValue({
      ok: true as const,
      status: 'attached' as const,
      ...common,
      configuration: application.attachment.configuration,
      customization: owners.detectCustomization({
        configuration: application.attachment.configuration,
        current: currentContext(session, application),
      }),
    })
  }

  function beginApply(input: Readonly<{
    selectedPreset: AppCaseInsertPresetSelection
    requestedScope: CaseInsertPresetApplicationScope
  }>): AppCaseInsertPresetWorkflowPlanningResult<
    AppCaseInsertPresetApplyReview
  > {
    const operation = 'apply' as const
    const session = captureCurrentCaseSession(dependencies.lifecycle, operation)
    if (isWorkflowFailure(session)) return session
    const application = projectApplication(session, owners, operation)
    if (isWorkflowFailure(application)) return application
    if (application.attachment.status !== 'unattached') {
      return failure(
        'already-attached',
        'case.layoutPreset.apply.already-attached',
        operation,
      )
    }
    if (!validSelection(input?.selectedPreset)) {
      return failure(
        'invalid-request',
        'case.layoutPreset.selection-invalid',
        operation,
      )
    }
    const resolution = owners.resolveAssignments({
      catalog: dependencies.catalog,
      reference: input.selectedPreset,
      requestedScope: input.requestedScope,
      snapshot: application.snapshot,
      expectedSnapshotIdentity: application.snapshot.identity,
    })
    if (!resolution.ok && resolution.status === 'invalid-reference') {
      return failure(
        'preset-unavailable',
        `case.layoutPreset.${resolution.error.code}`,
        operation,
        resolution,
      )
    }
    const planning = owners.planApply({
      operation,
      resolution,
      expected: {
        projectKind: 'caseInsert',
        preset: input.selectedPreset,
        requestedScope: input.requestedScope,
        snapshotIdentity: application.snapshot.identity,
      },
    })
    if (!planning.ok) {
      return failure(
        'planning-failed',
        `case.layoutPreset.apply.${planning.status}`,
        operation,
        planning,
      )
    }
    const review = deepFreezeCaseInsertPresetValue({
      kind: APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_KIND,
      formatVersion: APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_VERSION,
      operation,
      source: createSource(session, application),
      selectedPreset: {
        id: planning.plan.preset.id,
        revision: planning.plan.preset.revision,
      },
      reviewIdentity: planning.plan.reviewIdentity,
      warningIds: planning.plan.warnings.map(
        createCaseInsertPresetPlanWarningIdentity,
      ),
      materialConsentRequirementIds:
        planning.plan.materialConsentRequirements.map(({ id }) => id),
      planningStatus: planning.status,
      plan: planning.plan,
    })
    return deepFreezeCaseInsertPresetValue({
      ok: true as const,
      status: 'review-required' as const,
      review,
    })
  }

  function beginReapply(input: Readonly<{
    selectedPreset: AppCaseInsertPresetSelection
    customizedFieldPolicies:
      readonly CaseInsertPresetCustomizedFieldPolicyRecord[]
  }>): AppCaseInsertPresetWorkflowPlanningResult<
    AppCaseInsertPresetReapplyReview
  > {
    const operation = 'reapply' as const
    const session = captureCurrentCaseSession(dependencies.lifecycle, operation)
    if (isWorkflowFailure(session)) return session
    const application = projectApplication(session, owners, operation)
    if (isWorkflowFailure(application)) return application
    if (application.attachment.status !== 'attached') {
      return failure(
        'not-attached',
        'case.layoutPreset.reapply.not-attached',
        operation,
      )
    }
    const selection = resolveExactSelection(
      dependencies.catalog,
      input?.selectedPreset,
      operation,
    )
    if (isWorkflowFailure(selection)) return selection
    const current = currentContext(session, application)
    const customization = owners.detectCustomization({
      configuration: application.attachment.configuration,
      current,
    })
    if (!customization.ok) {
      return failure(
        'customization-detection-failed',
        customization.code,
        operation,
        customization,
      )
    }
    const planning = owners.planReapply({
      operation,
      configuration: application.attachment.configuration,
      customizationReport: customization,
      current: planningCurrent(session, application),
      selectedDefinition: selection.definition,
      customizedFieldPolicies: input.customizedFieldPolicies,
    })
    if (!planning.ok) {
      return failure(
        'planning-failed',
        planning.code,
        operation,
        planning,
      )
    }
    const review = deepFreezeCaseInsertPresetValue({
      kind: APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_KIND,
      formatVersion: APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_VERSION,
      operation,
      source: createSource(session, application),
      selectedPreset: {
        id: planning.plan.preset.id,
        revision: planning.plan.preset.selectedRevision,
      },
      reviewIdentity: planning.plan.reviewIdentity,
      warningIds: planning.plan.warnings.map(
        createCaseInsertPresetReapplyWarningIdentity,
      ),
      materialConsentRequirementIds:
        planning.plan.materialConsentRequirements.map(({ id }) => id),
      plan: planning.plan,
      sourceConfiguration: application.attachment.configuration,
      customizationReport: customization,
    })
    return deepFreezeCaseInsertPresetValue({
      ok: true as const,
      status: 'review-required' as const,
      review,
    })
  }

  function beginDetach(): AppCaseInsertPresetWorkflowPlanningResult<
    AppCaseInsertPresetDetachReview
  > {
    const operation = 'detach' as const
    const session = captureCurrentCaseSession(dependencies.lifecycle, operation)
    if (isWorkflowFailure(session)) return session
    const application = projectApplication(session, owners, operation)
    if (isWorkflowFailure(application)) return application
    if (application.attachment.status !== 'attached') {
      return failure(
        'not-attached',
        'case.layoutPreset.detach.not-attached',
        operation,
      )
    }
    const planning = owners.planDetach({
      operation,
      configuration: application.attachment.configuration,
      current: planningCurrent(session, application),
    })
    if (!planning.ok) {
      return failure(
        'planning-failed',
        planning.code,
        operation,
        planning,
      )
    }
    const review = deepFreezeCaseInsertPresetValue({
      kind: APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_KIND,
      formatVersion: APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_VERSION,
      operation,
      source: createSource(session, application),
      selectedPreset: {
        id: planning.plan.preset.id,
        revision: planning.plan.preset.revision,
      },
      reviewIdentity: planning.plan.reviewIdentity,
      warningIds: planning.plan.warnings.map(({ id }) => id),
      materialConsentRequirementIds: [],
      plan: planning.plan,
      sourceConfiguration: application.attachment.configuration,
    })
    return deepFreezeCaseInsertPresetValue({
      ok: true as const,
      status: 'review-required' as const,
      review,
    })
  }

  async function complete(
    review: AppCaseInsertPresetWorkflowReview,
    decision: AppCaseInsertPresetWorkflowDecision,
  ): Promise<AppCaseInsertPresetWorkflowCompletionResult> {
    const operation = review?.operation
    if (operation !== 'apply' && operation !== 'reapply' &&
        operation !== 'detach') {
      return failure(
        'invalid-decision',
        'case.layoutPreset.review-invalid',
      )
    }
    if (review.kind !== APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_KIND ||
        review.formatVersion !== APP_CASE_INSERT_PRESET_WORKFLOW_REVIEW_VERSION) {
      return failure(
        'invalid-decision',
        'case.layoutPreset.review-invalid',
        operation,
      )
    }
    if (!decision || decision.operation !== operation ||
        decision.reviewIdentity !== review.reviewIdentity) {
      return failure(
        'invalid-decision',
        'case.layoutPreset.decision-review-mismatch',
        operation,
      )
    }
    if (decision.decision !== 'cancel' && decision.decision !== 'confirm') {
      return failure(
        'invalid-decision',
        'case.layoutPreset.decision-incomplete-or-mismatched',
        operation,
      )
    }
    if (decision.decision === 'confirm' &&
        (!selectedPresetMatches(
          review.selectedPreset,
          decision.selectedPreset,
        ) ||
        !exactSetMatch(review.warningIds, decision.reviewedWarningIds) ||
        !exactSetMatch(
          review.materialConsentRequirementIds,
          decision.acceptedMaterialConsentRequirementIds,
        ))) {
      return failure(
        'invalid-decision',
        'case.layoutPreset.decision-incomplete-or-mismatched',
        operation,
      )
    }

    const session = captureCurrentCaseSession(dependencies.lifecycle, operation)
    if (isWorkflowFailure(session)) {
      return failure(
        'stale-review',
        'case.layoutPreset.review-session-changed',
        operation,
        session,
      )
    }
    const application = projectApplication(session, owners, operation)
    if (isWorkflowFailure(application) ||
        !reviewIsCurrent(review, session, application)) {
      return failure(
        'stale-review',
        'case.layoutPreset.review-stale',
        operation,
        application,
      )
    }
    if (decision.decision === 'cancel') {
      return deepFreezeCaseInsertPresetValue({
        ok: true as const,
        status: 'cancelled' as const,
        operation,
      })
    }

    const current = currentContext(session, application)
    let transition:
      | CaseInsertPresetApplyTransitionResult
      | CaseInsertPresetReapplyTransitionResult
      | CaseInsertPresetDetachTransitionResult
    if (review.operation === 'apply') {
      const acceptances = review.plan.materialConsentRequirements.map(
        ({ id }) =>
          createCaseInsertPresetMaterialConsentAcceptance(review.plan, id),
      ).filter((value): value is CaseInsertPresetMaterialConsentAcceptance =>
        value !== null)
      transition = owners.applyTransition({
        planningResult: deepFreezeCaseInsertPresetValue({
          ok: true,
          status: review.planningStatus,
          plan: review.plan,
        }),
        source: {
          projectKind: 'caseInsert',
          aggregate: current.aggregate,
          snapshotIdentity: application.snapshot.identity,
          preset: {
            id: review.plan.preset.id,
            revision: review.plan.preset.revision,
          },
          requestedScope: review.plan.requestedScope,
        },
        attachment: createCaseInsertPresetUnattachedEndpoint(),
        reviewApproval:
          createCaseInsertPresetApplyReviewApproval(review.plan),
        materialConsentAcceptances: acceptances,
      })
    } else if (review.operation === 'reapply') {
      const acceptances = review.plan.materialConsentRequirements.map(
        ({ id }) => createCaseInsertPresetReapplyConsentAcceptance(
          review.plan,
          id,
        ),
      ).filter((value): value is CaseInsertPresetReapplyConsentAcceptance =>
        value !== null)
      transition = owners.reapplyTransition({
        operation: 'reapply',
        plan: review.plan,
        sourceConfiguration: review.sourceConfiguration,
        customizationReport: review.customizationReport,
        reviewAcceptance:
          createCaseInsertPresetReapplyReviewAcceptance(review.plan),
        materialConsentAcceptances: acceptances,
        current,
      })
    } else {
      transition = owners.detachTransition({
        operation,
        plan: review.plan,
        sourceConfiguration: review.sourceConfiguration,
        reviewAcceptance:
          createCaseInsertPresetDetachReviewAcceptance(review.plan),
        materialConsentAcceptances: [],
        current: planningCurrent(session, application),
      })
    }
    if (!transition.ok) return transitionFailure(operation, transition)

    const evidence = owners.auditEvidence({
      kind: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_KIND,
      formatVersion: CASE_INSERT_PRESET_ADOPTION_EVIDENCE_CANDIDATE_VERSION,
      operation,
      transitionResult: transition,
      applicationAdoptionStatus: 'not-adopted',
    })
    if (!evidence.ok) {
      return failure(
        'adoption-failed',
        evidence.code,
        operation,
        evidence,
      )
    }
    const adoption = owners.transitionAdoption({
      kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
      formatVersion:
        CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
      operation,
      current: application,
      evidence: evidence.evidence,
    })
    if (!adoption.ok) {
      return failure(
        'adoption-failed',
        adoption.code,
        operation,
        adoption,
      )
    }
    const bundle = owners.auditAdoptionBundle({
      kind: CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND,
      formatVersion:
        CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION,
      operation,
      current: application,
      evidence: evidence.evidence,
      adoption,
    })
    if (!bundle.ok) {
      return failure(
        'adoption-failed',
        bundle.code,
        operation,
        bundle,
      )
    }
    const prepared = owners.prepareCommit({
      sourceSession: session,
      adoptionBundle: bundle.bundle,
    })
    if (!prepared.ok) {
      return failure(
        'preparation-failed',
        prepared.code,
        operation,
        prepared,
      )
    }

    const dispatch = await dependencies.lifecycle.dispatch<
      CaseInsertPresetSessionApplicationCommandSuccess
    >(COMMAND_BY_OPERATION[operation], prepared.snapshot)
    if (dispatch.disposition !== 'executed' ||
        dispatch.result.status !== 'success') {
      const code = dispatch.disposition === 'not-executed'
        ? `application.command.${dispatch.reason}`
        : dispatch.result.status === 'failure'
          ? dispatch.result.error.code
          : `application.command.${dispatch.result.status}`
      return dispatchFailure(code, operation, dispatch)
    }
    return deepFreezeCaseInsertPresetValue({
      ok: true as const,
      status: 'dispatched' as const,
      operation,
      dispatch,
    })
  }

  return Object.freeze({
    inspectCurrent,
    beginApply,
    beginReapply,
    beginDetach,
    complete,
  })
}
