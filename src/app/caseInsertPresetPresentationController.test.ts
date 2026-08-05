import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  CaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
import type {
  AppCaseInsertPresetInspectionResult,
  AppCaseInsertPresetWorkflowOwner,
  AppCaseInsertPresetWorkflowReview,
} from './appCaseInsertPresetWorkflow.ts'
import {
  createCaseInsertPresetPresentationController,
} from './caseInsertPresetPresentationController.ts'

const PRESET = Object.freeze({
  id: 'builtin:case-preset:jewel-case-essentials',
  revision: 1,
})

function applyReview(sessionId = 'case-one') {
  return Object.freeze({
    operation: 'apply',
    source: {
      sessionId,
      projectRevision: 0,
      applicationRevision: 0,
    },
    selectedPreset: PRESET,
    reviewIdentity: `review:${sessionId}`,
    warningIds: ['warning-one'],
    materialConsentRequirementIds: ['consent-one'],
    plan: { blockers: [], resolvedRegions: ['front-cover'] },
  }) as unknown as AppCaseInsertPresetWorkflowReview
}

function detachedInspection(
  sessionId = 'case-one',
): AppCaseInsertPresetInspectionResult {
  return Object.freeze({
    ok: true,
    status: 'detached',
    sessionId,
    projectRevision: 0,
    applicationRevision: 0,
    recoveryStatus: Object.freeze({ status: 'not-applicable' }),
  })
}

function restrictedAttachedInspection(
  recoveryStatus: 'unavailable' | 'incompatible' = 'unavailable',
): AppCaseInsertPresetInspectionResult {
  return Object.freeze({
    ok: true,
    status: 'attached',
    sessionId: 'case-unavailable',
    projectRevision: 4,
    applicationRevision: 2,
    configuration: {
      preset: { ...PRESET, source: 'builtin' },
      configurationIdentity: 'configuration-one',
    },
    recoveryStatus: recoveryStatus === 'unavailable'
      ? { status: 'unavailable', code: 'exact-definition-unavailable' }
      : { status: 'incompatible', code: 'preset-source-mismatch' },
    customization: {
      ok: true,
      status: 'clean',
      reportIdentity: 'customization-one',
      fields: [],
      summary: {
        fieldCount: 0,
        unchangedFieldCount: 0,
        customizedFieldCount: 0,
      },
    },
  }) as unknown as AppCaseInsertPresetInspectionResult
}

function catalog(calls: { getLatest: number }): CaseInsertPresetCatalog {
  return Object.freeze({
    list: () => Object.freeze([{
      ...PRESET,
      name: 'Jewel Case Essentials',
      surface: 'case-insert' as const,
      source: 'builtin' as const,
    }]),
    getExact: () => null,
    getLatest: () => { calls.getLatest += 1; return null },
    resolve: () => ({
      ok: false as const,
      error: { code: 'unknown-id' as const, id: PRESET.id, revision: 1 },
    }),
  })
}

test('selection and review stay transient; cancellation never completes or dispatches', () => {
  const calls = { beginApply: 0, complete: 0, getLatest: 0 }
  let inspection = detachedInspection()
  const workflow = {
    inspectCurrent: () => inspection,
    beginApply: () => {
      calls.beginApply += 1
      return { ok: true as const, status: 'review-required' as const,
        review: applyReview() }
    },
    beginReapply: () => ({ ok: false as const, status: 'not-attached' as const,
      code: 'not-attached' }),
    beginDetach: () => ({ ok: false as const, status: 'not-attached' as const,
      code: 'not-attached' }),
    complete: async () => {
      calls.complete += 1
      throw new Error('Cancellation must stay presentation-local.')
    },
  } as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(calls),
    publishDispatchFeedback: () => assert.fail('No command feedback expected.'),
  })
  const stateBefore = inspection
  const option = controller.getSnapshot().options[0]!
  assert.equal(controller.selectOption(option.value).ok, true)
  assert.strictEqual(inspection, stateBefore)
  assert.equal(calls.beginApply, 0)
  assert.equal(controller.beginApplyReview().ok, true)
  assert.equal(calls.beginApply, 1)
  controller.cancelReview()
  assert.equal(controller.getSnapshot().review, null)
  assert.equal(calls.complete, 0)

  inspection = detachedInspection('case-two')
  controller.selectOption(option.value)
  controller.beginApplyReview()
  assert.ok(controller.getSnapshot().review)
  controller.synchronize()
  assert.equal(controller.getSnapshot().review, null)
  assert.equal(controller.getSnapshot().selectedOptionValue, '')
})

for (const recoveryStatus of ['unavailable', 'incompatible'] as const) {
test(`${recoveryStatus} attachment keeps catalog-independent Detach and disables Reapply planning`, () => {
  const calls = { detach: 0, reapply: 0, getLatest: 0 }
  const detachReview = Object.freeze({
    operation: 'detach',
    source: {
      sessionId: 'case-unavailable',
      projectRevision: 4,
      applicationRevision: 2,
    },
    selectedPreset: PRESET,
    reviewIdentity: 'detach-review',
    warningIds: ['detach-warning'],
    materialConsentRequirementIds: [],
    plan: { resolvedRegions: ['front-cover'], warnings: [{}] },
  }) as unknown as AppCaseInsertPresetWorkflowReview
  const workflow = {
    inspectCurrent: () => restrictedAttachedInspection(recoveryStatus),
    beginApply: () => ({ ok: false as const, status: 'already-attached' as const,
      code: 'already-attached' }),
    beginReapply: () => {
      calls.reapply += 1
      return { ok: false as const, status: 'preset-unavailable' as const,
        code: 'preset-unavailable' }
    },
    beginDetach: () => {
      calls.detach += 1
      return { ok: true as const, status: 'review-required' as const,
        review: detachReview }
    },
    complete: async () => ({ ok: true as const, status: 'cancelled' as const,
      operation: 'detach' as const }),
  } as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(calls),
    publishDispatchFeedback: () => {},
  })

  assert.equal(controller.beginReapplyReview().ok, false)
  assert.equal(calls.reapply, 0)
  assert.equal(controller.beginDetachReview().ok, true)
  assert.equal(calls.detach, 1)
  assert.equal(calls.getLatest, 0)
})
}
