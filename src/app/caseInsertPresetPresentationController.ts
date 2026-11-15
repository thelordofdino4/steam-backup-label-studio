import type {
  ApplicationCommandDispatchResult,
} from '../lifecycle/applicationCommandTypes.ts'
import type {
  CaseInsertPresetCatalog,
  CaseInsertPresetSummary,
} from '../presets/caseInsertPresetCatalog.ts'
import {
  sameCaseInsertPresetValue,
} from '../presets/caseInsertPresetSafeInput.ts'
import type {
  AppCaseInsertPresetInspectionResult,
  AppCaseInsertPresetSelection,
  AppCaseInsertPresetWorkflowFailure,
  AppCaseInsertPresetWorkflowOwner,
} from './appCaseInsertPresetWorkflow.ts'

export type CaseInsertPresetPresentationFocusTarget =
  | 'selector'
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

export type CaseInsertPresetPresentationSnapshot = Readonly<{
  generation: number
  inspection: AppCaseInsertPresetInspectionResult
  options: readonly CaseInsertPresetPresentationOption[]
  selectedOptionValue: string
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
  applySelectedPreset(): Promise<CaseInsertPresetPresentationDecisionResult>
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

function failureMessage(failure: AppCaseInsertPresetWorkflowFailure): string {
  switch (failure.status) {
    case 'no-active-session':
      return 'No Case project is active.'
    case 'incompatible-project-kind':
      return 'Case layout presets are available only in the Case editor.'
    case 'already-attached':
    case 'not-attached':
      return 'The layout preset could not be applied.'
    case 'preset-unavailable':
      return 'The selected layout preset is unavailable.'
    case 'customization-detection-failed':
      return 'The project could not be inspected safely.'
    case 'planning-failed':
      return 'The layout preset could not be prepared.'
    case 'invalid-decision':
      return 'The layout preset request is no longer valid.'
    case 'stale-review':
      return 'The project changed before the layout preset could be applied.'
    case 'transition-failed':
    case 'adoption-failed':
    case 'preparation-failed':
      return 'The layout preset change could not be prepared.'
    case 'dispatch-failed':
      return 'The layout preset change was not installed.'
    case 'invalid-request':
      return 'The layout preset request is invalid.'
  }
}

function sessionIdentity(
  inspection: AppCaseInsertPresetInspectionResult,
): string | null {
  return inspection.ok ? inspection.sessionId : null
}

function selectedReference(
  option: CaseInsertPresetPresentationOption | undefined,
): AppCaseInsertPresetSelection | null {
  return option
    ? Object.freeze({ id: option.id, revision: option.revision })
    : null
}

type PresentationApplyActivation = Readonly<{
  id: number
  sessionId: string | null
}>

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
  let pending = false
  let notice: CaseInsertPresetPresentationNotice | null = null
  let focusRequest: CaseInsertPresetPresentationSnapshot['focusRequest'] = null
  let generation = 0
  let focusGeneration = 0
  let nextActivationId = 1
  let activeActivation: PresentationApplyActivation | null = null
  let snapshot: CaseInsertPresetPresentationSnapshot

  function captureSnapshot(): CaseInsertPresetPresentationSnapshot {
    return Object.freeze({
      generation,
      inspection,
      options,
      selectedOptionValue,
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

  function rejectDecision(
    code: string,
    message: string,
    target: CaseInsertPresetPresentationFocusTarget,
  ) {
    setNotice('error', code, message, target)
    publish()
    return Object.freeze({ ok: false, code })
  }

  function claimCompletion(activation: PresentationApplyActivation): boolean {
    if (activeActivation?.id !== activation.id) return false
    const latestInspection = workflow.inspectCurrent()
    if (sessionIdentity(latestInspection) !== activation.sessionId) {
      activeActivation = null
      pending = false
      inspection = latestInspection
      selectedOptionValue = ''
      notice = null
      requestFocus(latestInspection.ok ? 'selector' : 'error-summary')
      publish()
      return false
    }
    activeActivation = null
    pending = false
    inspection = latestInspection
    return true
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
      inspection = nextInspection
      if (replaced) {
        activeActivation = null
        pending = false
        selectedOptionValue = ''
        notice = null
        requestFocus(nextInspection.ok ? 'selector' : 'error-summary')
      }
      publish()
    },
    selectOption(value: string) {
      if (pending) {
        return Object.freeze({
          ok: false,
          code: 'case.layoutPreset.apply-pending',
        })
      }
      if (value !== '' && !optionByValue.has(value)) {
        selectedOptionValue = ''
        return rejectDecision(
          'case.layoutPreset.selection-unavailable',
          'That layout preset is no longer available.',
          'error-summary',
        )
      }
      selectedOptionValue = value
      notice = null
      publish()
      return Object.freeze({
        ok: true,
        code: value === ''
          ? 'case.layoutPreset.selection-cleared'
          : 'case.layoutPreset.selection-selected',
      })
    },
    async applySelectedPreset() {
      if (pending) {
        return Object.freeze({
          ok: false,
          code: 'case.layoutPreset.apply-pending',
        })
      }
      const selection = selectedReference(optionByValue.get(selectedOptionValue))
      if (!selection) {
        return rejectDecision(
          'case.layoutPreset.selection-required',
          'Choose a layout preset before applying it.',
          'selector',
        )
      }

      pending = true
      notice = null
      const activation = Object.freeze({
        id: nextActivationId,
        sessionId: sessionIdentity(inspection),
      })
      nextActivationId += 1
      activeActivation = activation
      publish()
      let completionClaimed = false
      try {
        const completion = await workflow.applySelected({
          selectedPreset: selection,
          requestedScope: Object.freeze({ kind: 'complete' }),
        })
        if (!claimCompletion(activation)) {
          return Object.freeze({
            ok: false,
            code: 'case.layoutPreset.presentation-session-replaced',
          })
        }
        completionClaimed = true
        if ('dispatch' in completion) {
          publishDispatchFeedback(completion.dispatch)
        }
        if (!completion.ok) {
          setNotice(
            'error',
            completion.code,
            failureMessage(completion),
            'error-summary',
          )
          publish()
          return Object.freeze({ ok: false, code: completion.code })
        }
        if (completion.status === 'cancelled') {
          setNotice(
            'status',
            'case.layoutPreset.apply.cancelled',
            'Preset application cancelled.',
            'status',
          )
          publish()
          return Object.freeze({
            ok: true,
            code: 'case.layoutPreset.apply.cancelled',
          })
        }

        selectedOptionValue = ''
        setNotice(
          'status',
          'case.layoutPreset.apply.completed',
          'Preset applied.',
          'status',
        )
        publish()
        return Object.freeze({
          ok: true,
          code: 'case.layoutPreset.apply.completed',
        })
      } catch {
        if (!completionClaimed && !claimCompletion(activation)) {
          return Object.freeze({
            ok: false,
            code: 'case.layoutPreset.presentation-session-replaced',
          })
        }
        setNotice(
          'error',
          'case.layoutPreset.presentation-unexpected-failure',
          'The layout preset could not be applied.',
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
