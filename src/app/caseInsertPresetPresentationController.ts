import type {
  ApplicationCommandDispatchResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  CaseInsertPresetCatalog,
  CaseInsertPresetSummary,
} from '../presets/caseInsertPresetCatalog.ts'
import type {
  CaseInsertPresetCustomizationFieldRecord,
  CaseInsertPresetTypedCustomizationFieldRecord,
} from '../presets/caseInsertPresetAppliedConfiguration.ts'
import type {
  CaseInsertPresetCustomizedFieldPolicy,
  CaseInsertPresetCustomizedFieldPolicyRecord,
  CaseInsertPresetTypedCustomizedFieldPolicyRecord,
} from '../presets/caseInsertPresetReapplyPlanning.ts'
import {
  sameCaseInsertPresetValue,
} from '../presets/caseInsertPresetSafeInput.ts'
import type {
  AppCaseInsertPresetInspectionResult,
  AppCaseInsertPresetSelection,
  AppCaseInsertPresetWorkflowFailure,
  AppCaseInsertPresetWorkflowOwner,
  AppCaseInsertPresetWorkflowReview,
} from './appCaseInsertPresetWorkflow.ts'

export type CaseInsertPresetPresentationFocusTarget =
  | 'selector'
  | 'review-heading'
  | 'error-summary'
  | 'status'

export type CaseInsertPresetPresentationNotice = Readonly<{
  kind: 'status' | 'error'
  code: string
  message: string
}>

export type CaseInsertPresetPresentationOption = Readonly<{
  value: string
  id: string
  revision: number
  name: string
  source: CaseInsertPresetSummary['source']
}>

export type CaseInsertPresetReapplyPolicyChoice = Readonly<{
  key: string
  field:
    | CaseInsertPresetCustomizationFieldRecord
    | CaseInsertPresetTypedCustomizationFieldRecord
  policy: CaseInsertPresetCustomizedFieldPolicy | null
}>

export type CaseInsertPresetPresentationSnapshot = Readonly<{
  generation: number
  inspection: AppCaseInsertPresetInspectionResult
  options: readonly CaseInsertPresetPresentationOption[]
  selectedOptionValue: string
  review: AppCaseInsertPresetWorkflowReview | null
  acknowledgedWarningIds: readonly string[]
  acceptedMaterialConsentRequirementIds: readonly string[]
  reapplyPolicies: readonly CaseInsertPresetReapplyPolicyChoice[]
  pending: boolean
  notice: CaseInsertPresetPresentationNotice | null
  focusRequest: Readonly<{
    generation: number
    target: CaseInsertPresetPresentationFocusTarget
  }> | null
}>

export type CaseInsertPresetPresentationDecisionResult = Readonly<{
  ok: boolean
  code: string
}>

export interface CaseInsertPresetPresentationController {
  getSnapshot(): CaseInsertPresetPresentationSnapshot
  subscribe(subscriber: () => void): () => void
  synchronize(): void
  selectOption(value: string): CaseInsertPresetPresentationDecisionResult
  setReapplyPolicy(
    key: string,
    policy: CaseInsertPresetCustomizedFieldPolicy | null,
  ): CaseInsertPresetPresentationDecisionResult
  beginApplyReview(): CaseInsertPresetPresentationDecisionResult
  beginReapplyReview(): CaseInsertPresetPresentationDecisionResult
  beginDetachReview(): CaseInsertPresetPresentationDecisionResult
  setWarningAcknowledged(
    id: string,
    acknowledged: boolean,
  ): CaseInsertPresetPresentationDecisionResult
  setMaterialConsentAccepted(
    id: string,
    accepted: boolean,
  ): CaseInsertPresetPresentationDecisionResult
  cancelReview(): void
  confirmReview(): Promise<CaseInsertPresetPresentationDecisionResult>
}

type PresentationControllerDependencies = Readonly<{
  workflow: AppCaseInsertPresetWorkflowOwner
  catalog: CaseInsertPresetCatalog
  publishDispatchFeedback(
    dispatch: ApplicationCommandDispatchResult<unknown>,
  ): void
}>

function encodeOption(summary: CaseInsertPresetSummary): string {
  return JSON.stringify([summary.id, summary.revision])
}

function fieldKey(
  field:
    | CaseInsertPresetCustomizationFieldRecord
    | CaseInsertPresetTypedCustomizationFieldRecord,
): string {
  const { address } = field
  return JSON.stringify([
    address.region,
    address.featureOwnerId,
    address.bindingKind,
    address.bindingId,
    address.runtimeObjectId,
    address.fieldId,
  ])
}

function failureMessage(failure: AppCaseInsertPresetWorkflowFailure): string {
  switch (failure.status) {
    case 'no-active-session':
      return 'No Case project is active.'
    case 'incompatible-project-kind':
      return 'Case layout presets are available only in the Case editor.'
    case 'already-attached':
      return 'Detach the current Case layout preset before applying another.'
    case 'not-attached':
      return 'No Case layout preset is attached.'
    case 'preset-unavailable':
      return 'The exact saved preset definition is unavailable.'
    case 'customization-detection-failed':
      return 'Current preset-owned fields could not be inspected safely.'
    case 'planning-failed':
      return 'The Case layout preset review could not be prepared.'
    case 'invalid-decision':
      return 'Complete every required review decision before continuing.'
    case 'stale-review':
      return 'The Case project changed. Prepare a fresh review.'
    case 'transition-failed':
    case 'adoption-failed':
    case 'preparation-failed':
      return 'The reviewed Case layout preset change could not be prepared.'
    case 'dispatch-failed':
      return 'The reviewed Case layout preset change was not installed.'
    case 'invalid-request':
      return 'The Case layout preset request is invalid.'
  }
}

function sessionIdentity(
  inspection: AppCaseInsertPresetInspectionResult,
): string | null {
  return inspection.ok ? inspection.sessionId : null
}

function contentIdentity(
  inspection: AppCaseInsertPresetInspectionResult,
): string | null {
  return inspection.ok
    ? `${inspection.sessionId}:${inspection.projectRevision}:${inspection.applicationRevision}`
    : null
}

function createPolicyChoices(
  inspection: AppCaseInsertPresetInspectionResult,
  previous: readonly CaseInsertPresetReapplyPolicyChoice[] = [],
): readonly CaseInsertPresetReapplyPolicyChoice[] {
  if (
    !inspection.ok ||
    inspection.status !== 'attached' ||
    !inspection.customization.ok
  ) {
    return Object.freeze([])
  }
  const previousByKey = new Map(previous.map((choice) => [choice.key, choice]))
  return Object.freeze(inspection.customization.fields
    .filter(({ fieldStatus }) =>
      fieldStatus === 'value-diverged' || fieldStatus === 'object-absent')
    .map((field) => {
      const key = fieldKey(field)
      return Object.freeze({
        key,
        field,
        policy: previousByKey.get(key)?.policy ?? null,
      })
    }))
}

function selectedReference(
  option: CaseInsertPresetPresentationOption | undefined,
): AppCaseInsertPresetSelection | null {
  return option
    ? Object.freeze({ id: option.id, revision: option.revision })
    : null
}

export function createCaseInsertPresetPresentationController({
  workflow,
  catalog,
  publishDispatchFeedback,
}: PresentationControllerDependencies): CaseInsertPresetPresentationController {
  const options = Object.freeze(catalog.list().map((summary) => Object.freeze({
    value: encodeOption(summary),
    id: summary.id,
    revision: summary.revision,
    name: summary.name,
    source: summary.source,
  })))
  const optionByValue = new Map(options.map((option) => [option.value, option]))
  const subscribers = new Set<() => void>()
  let inspection = workflow.inspectCurrent()
  let selectedOptionValue = ''
  let review: AppCaseInsertPresetWorkflowReview | null = null
  let acknowledgedWarningIds = new Set<string>()
  let acceptedMaterialConsentRequirementIds = new Set<string>()
  let reapplyPolicies = createPolicyChoices(inspection)
  let pending = false
  let notice: CaseInsertPresetPresentationNotice | null = null
  let focusRequest: CaseInsertPresetPresentationSnapshot['focusRequest'] = null
  let generation = 0
  let focusGeneration = 0
  let snapshot: CaseInsertPresetPresentationSnapshot

  function captureSnapshot(): CaseInsertPresetPresentationSnapshot {
    return Object.freeze({
      generation,
      inspection,
      options,
      selectedOptionValue,
      review,
      acknowledgedWarningIds: Object.freeze([...acknowledgedWarningIds]),
      acceptedMaterialConsentRequirementIds: Object.freeze([
        ...acceptedMaterialConsentRequirementIds,
      ]),
      reapplyPolicies,
      pending,
      notice,
      focusRequest,
    })
  }

  snapshot = captureSnapshot()

  function publish() {
    generation += 1
    snapshot = captureSnapshot()
    for (const subscriber of subscribers) subscriber()
  }

  function requestFocus(target: CaseInsertPresetPresentationFocusTarget) {
    focusGeneration += 1
    focusRequest = Object.freeze({ generation: focusGeneration, target })
  }

  function setNotice(
    kind: CaseInsertPresetPresentationNotice['kind'],
    code: string,
    message: string,
    target: CaseInsertPresetPresentationFocusTarget,
  ) {
    notice = Object.freeze({ kind, code, message })
    requestFocus(target)
  }

  function clearReview() {
    review = null
    acknowledgedWarningIds = new Set()
    acceptedMaterialConsentRequirementIds = new Set()
    pending = false
  }

  function resetForSession(nextInspection: AppCaseInsertPresetInspectionResult) {
    inspection = nextInspection
    selectedOptionValue = ''
    clearReview()
    reapplyPolicies = createPolicyChoices(nextInspection)
    notice = null
  }

  function adoptPlanningResult(
    result: ReturnType<AppCaseInsertPresetWorkflowOwner[
      'beginApply'
    ]> | ReturnType<AppCaseInsertPresetWorkflowOwner[
      'beginReapply'
    ]> | ReturnType<AppCaseInsertPresetWorkflowOwner[
      'beginDetach'
    ]>,
  ): CaseInsertPresetPresentationDecisionResult {
    if (!result.ok) {
      setNotice('error', result.code, failureMessage(result), 'error-summary')
      publish()
      return Object.freeze({ ok: false, code: result.code })
    }
    review = result.review
    acknowledgedWarningIds = new Set()
    acceptedMaterialConsentRequirementIds = new Set()
    notice = null
    requestFocus('review-heading')
    publish()
    return Object.freeze({ ok: true, code: 'case.layoutPreset.review-ready' })
  }

  function rejectDecision(code: string, message: string) {
    setNotice('error', code, message, 'error-summary')
    publish()
    return Object.freeze({ ok: false, code })
  }

  const controller: CaseInsertPresetPresentationController = Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(subscriber: () => void) {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
    synchronize() {
      const nextInspection = workflow.inspectCurrent()
      if (sameCaseInsertPresetValue(nextInspection, inspection)) return
      const replaced = sessionIdentity(nextInspection) !== sessionIdentity(inspection)
      const reviewBecameStale = review !== null &&
        contentIdentity(nextInspection) !== contentIdentity(inspection)
      if (replaced || !nextInspection.ok) {
        resetForSession(nextInspection)
      } else {
        inspection = nextInspection
        reapplyPolicies = createPolicyChoices(nextInspection, reapplyPolicies)
        if (reviewBecameStale) {
          clearReview()
          setNotice(
            'error',
            'case.layoutPreset.review-stale',
            'The Case project changed. Prepare a fresh review.',
            'error-summary',
          )
        }
      }
      publish()
    },
    selectOption(value: string) {
      if (pending || review) {
        return rejectDecision(
          'case.layoutPreset.selection-review-active',
          'Cancel the current review before changing the preset selection.',
        )
      }
      if (value !== '' && !optionByValue.has(value)) {
        selectedOptionValue = ''
        return rejectDecision(
          'case.layoutPreset.selection-unavailable',
          'That preset selection is no longer available.',
        )
      }
      selectedOptionValue = value
      notice = null
      publish()
      return Object.freeze({ ok: true, code: value === ''
        ? 'case.layoutPreset.selection-cleared'
        : 'case.layoutPreset.selection-selected' })
    },
    setReapplyPolicy(
      key: string,
      policy: CaseInsertPresetCustomizedFieldPolicy | null,
    ) {
      if (review || pending) {
        return rejectDecision(
          'case.layoutPreset.policy-review-active',
          'Cancel the current review before changing customization choices.',
        )
      }
      if (
        policy !== null &&
        policy !== 'preserve-current-customization' &&
        policy !== 'overwrite-with-selected-preset'
      ) {
        return rejectDecision(
          'case.layoutPreset.policy-unsupported',
          'Choose Preserve or Overwrite for this customized field.',
        )
      }
      const index = reapplyPolicies.findIndex((choice) => choice.key === key)
      if (index < 0) {
        return rejectDecision(
          'case.layoutPreset.policy-unknown-field',
          'That customized field is no longer part of the current attachment.',
        )
      }
      reapplyPolicies = Object.freeze(reapplyPolicies.map((choice, choiceIndex) =>
        choiceIndex === index ? Object.freeze({ ...choice, policy }) : choice))
      notice = null
      publish()
      return Object.freeze({ ok: true, code: 'case.layoutPreset.policy-selected' })
    },
    beginApplyReview() {
      if (review || pending) {
        return rejectDecision(
          'case.layoutPreset.review-already-active',
          'A Case layout preset review is already active.',
        )
      }
      const selection = selectedReference(optionByValue.get(selectedOptionValue))
      if (!selection) {
        return rejectDecision(
          'case.layoutPreset.selection-required',
          'Choose a preset before preparing a complete-preset review.',
        )
      }
      return adoptPlanningResult(workflow.beginApply({
        selectedPreset: selection,
        requestedScope: Object.freeze({ kind: 'complete' }),
      }))
    },
    beginReapplyReview() {
      if (review || pending) {
        return rejectDecision(
          'case.layoutPreset.review-already-active',
          'A Case layout preset review is already active.',
        )
      }
      if (!inspection.ok || inspection.status !== 'attached' ||
          !inspection.customization.ok) {
        return rejectDecision(
          'case.layoutPreset.reapply-unavailable',
          'The current attachment cannot be reviewed for Reapply.',
        )
      }
      const currentInspection = inspection
      const currentCustomization = inspection.customization
      if (
        currentInspection.recoveryStatus.status !== 'current' &&
        currentInspection.recoveryStatus.status !== 'stale'
      ) {
        return rejectDecision(
          'case.layoutPreset.reapply-catalog-status-ineligible',
          'Reapply is unavailable for the saved catalog status. Detach remains available.',
        )
      }
      if (reapplyPolicies.some(({ policy }) => policy === null)) {
        return rejectDecision(
          'case.layoutPreset.policy-incomplete',
          'Choose Preserve or Overwrite for every customized field.',
        )
      }
      const selectedPreset = Object.freeze({
        id: inspection.configuration.preset.id,
        revision: inspection.configuration.preset.revision,
      })
      const customizedFieldPolicies = reapplyPolicies.map((choice) => {
        const { field, policy } = choice
        if (!('currentValue' in field)) {
          return Object.freeze({
            configurationIdentity:
              currentInspection.configuration.configurationIdentity,
            customizationReportIdentity:
              currentCustomization.reportIdentity,
            address: field.address,
            lastAppliedValue: field.lastAppliedValue,
            observation: field.observation,
            selectedPreset,
            policy: policy!,
          }) satisfies CaseInsertPresetTypedCustomizedFieldPolicyRecord
        }
        return Object.freeze({
          configurationIdentity:
            currentInspection.configuration.configurationIdentity,
          customizationReportIdentity:
            currentCustomization.reportIdentity,
          address: field.address,
          lastAppliedValue: field.lastAppliedValue,
          currentValue: field.currentValue,
          selectedPreset,
          // Reapply is bound to the exact saved definition revision. The
          // planner independently validates this value against that definition.
          selectedProposedValue: field.lastAppliedValue,
          policy: policy!,
        }) satisfies CaseInsertPresetCustomizedFieldPolicyRecord
      })
      return adoptPlanningResult(workflow.beginReapply({
        selectedPreset,
        customizedFieldPolicies,
      }))
    },
    beginDetachReview() {
      if (review || pending) {
        return rejectDecision(
          'case.layoutPreset.review-already-active',
          'A Case layout preset review is already active.',
        )
      }
      return adoptPlanningResult(workflow.beginDetach())
    },
    setWarningAcknowledged(id: string, acknowledged: boolean) {
      if (!review || !review.warningIds.includes(id)) {
        return rejectDecision(
          'case.layoutPreset.warning-unknown',
          'That warning is not part of the current immutable review.',
        )
      }
      acknowledgedWarningIds = new Set(acknowledgedWarningIds)
      if (acknowledged) acknowledgedWarningIds.add(id)
      else acknowledgedWarningIds.delete(id)
      notice = null
      publish()
      return Object.freeze({ ok: true, code: 'case.layoutPreset.warning-updated' })
    },
    setMaterialConsentAccepted(id: string, accepted: boolean) {
      if (!review || !review.materialConsentRequirementIds.includes(id)) {
        return rejectDecision(
          'case.layoutPreset.consent-unknown',
          'That consent requirement is not part of the current immutable review.',
        )
      }
      acceptedMaterialConsentRequirementIds = new Set(
        acceptedMaterialConsentRequirementIds,
      )
      if (accepted) acceptedMaterialConsentRequirementIds.add(id)
      else acceptedMaterialConsentRequirementIds.delete(id)
      notice = null
      publish()
      return Object.freeze({ ok: true, code: 'case.layoutPreset.consent-updated' })
    },
    cancelReview() {
      if (!review || pending) return
      clearReview()
      notice = Object.freeze({
        kind: 'status',
        code: 'case.layoutPreset.review-cancelled',
        message: 'Case layout preset review cancelled. No project changes were made.',
      })
      requestFocus(inspection.ok && inspection.status === 'detached'
        ? 'selector'
        : 'status')
      publish()
    },
    async confirmReview() {
      if (!review) {
        return rejectDecision(
          'case.layoutPreset.review-required',
          'Prepare a fresh review before confirming.',
        )
      }
      if (pending) {
        return Object.freeze({
          ok: false,
          code: 'case.layoutPreset.confirmation-pending',
        })
      }
      const warningComplete = review.warningIds.every((id) =>
        acknowledgedWarningIds.has(id))
      const consentComplete = review.materialConsentRequirementIds.every((id) =>
        acceptedMaterialConsentRequirementIds.has(id))
      if (!warningComplete || !consentComplete) {
        return rejectDecision(
          'case.layoutPreset.decision-incomplete',
          'Acknowledge every warning and accept every required material change.',
        )
      }

      pending = true
      notice = null
      publish()
      const currentReview = review
      try {
        const completion = await workflow.complete(currentReview, Object.freeze({
          decision: 'confirm' as const,
          operation: currentReview.operation,
          reviewIdentity: currentReview.reviewIdentity,
          selectedPreset: currentReview.selectedPreset,
          reviewedWarningIds: Object.freeze([...currentReview.warningIds]),
          acceptedMaterialConsentRequirementIds: Object.freeze([
            ...currentReview.materialConsentRequirementIds,
          ]),
        }))
        pending = false
        if ('dispatch' in completion) {
          publishDispatchFeedback(completion.dispatch)
        }
        if (!completion.ok) {
          if (completion.status === 'stale-review') clearReview()
          setNotice(
            'error',
            completion.code,
            failureMessage(completion),
            'error-summary',
          )
          publish()
          return Object.freeze({ ok: false, code: completion.code })
        }
        inspection = workflow.inspectCurrent()
        selectedOptionValue = ''
        clearReview()
        reapplyPolicies = createPolicyChoices(inspection)
        setNotice(
          'status',
          `case.layoutPreset.${completion.operation}.completed`,
          `Case layout preset ${completion.operation} completed.`,
          'status',
        )
        publish()
        return Object.freeze({
          ok: true,
          code: `case.layoutPreset.${completion.operation}.completed`,
        })
      } catch {
        pending = false
        setNotice(
          'error',
          'case.layoutPreset.presentation-unexpected-failure',
          'The Case layout preset operation ended unexpectedly. The project was not assumed changed.',
          'error-summary',
        )
        publish()
        return Object.freeze({
          ok: false,
          code: 'case.layoutPreset.presentation-unexpected-failure',
        })
      }
    },
  })

  return controller
}
