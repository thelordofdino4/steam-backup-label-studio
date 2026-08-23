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

const LATEST_PRESET = Object.freeze({
  ...PRESET,
  revision: 2,
})

function applyReview(sessionId = 'case-one') {
  return Object.freeze({
    operation: 'apply',
    source: {
      sessionId,
      projectRevision: 0,
      applicationRevision: 0,
    },
    selectedPreset: LATEST_PRESET,
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

function staleRevisionOneInspection(): AppCaseInsertPresetInspectionResult {
  return Object.freeze({
    ok: true,
    status: 'attached',
    sessionId: 'case-stale-revision-one',
    projectRevision: 7,
    applicationRevision: 3,
    configuration: {
      preset: { ...PRESET, source: 'builtin' },
      configurationIdentity: 'configuration-revision-one',
    },
    recoveryStatus: {
      status: 'stale',
      savedRevision: 1,
      latestAvailableRevision: 2,
      customization: 'clean',
    },
    customization: {
      ok: true,
      status: 'clean',
      reportIdentity: 'customization-revision-one',
      fields: [],
      summary: {
        fieldCount: 0,
        unchangedFieldCount: 0,
        customizedFieldCount: 0,
      },
    },
  }) as unknown as AppCaseInsertPresetInspectionResult
}

function missingRevisionTwoScreenshotInspection():
  AppCaseInsertPresetInspectionResult {
  return Object.freeze({
    ok: true,
    status: 'attached',
    sessionId: 'case-missing-revision-two-screenshot',
    projectRevision: 9,
    applicationRevision: 4,
    configuration: {
      formatVersion: 3,
      preset: { ...LATEST_PRESET, source: 'builtin' },
      configurationIdentity: 'configuration-revision-two',
    },
    recoveryStatus: {
      status: 'current',
      customization: 'customized',
    },
    customization: {
      ok: true,
      status: 'customized',
      formatVersion: 2,
      reportIdentity: 'typed-customization-revision-two',
      configurationIdentity: 'configuration-revision-two',
      fields: [{
        address: {
          region: 'tray-card',
          featureOwnerId: 'case.tray.artwork-slots',
          bindingKind: 'repeated',
          bindingId: 'tray-artwork-1',
          runtimeObjectId: 'tray-artwork-1',
          fieldId: 'object-presence',
        },
        lastAppliedValue: { kind: 'object-presence', value: 'present' },
        observation: { status: 'absent-owned-object' },
        fieldStatus: 'object-absent',
        sources: [],
      }, {
        address: {
          region: 'tray-card',
          featureOwnerId: 'case.tray.artwork-slots',
          bindingKind: 'repeated',
          bindingId: 'tray-artwork-1',
          runtimeObjectId: 'tray-artwork-1',
          fieldId: 'layout-x',
        },
        lastAppliedValue: { kind: 'number', value: 17 },
        observation: { status: 'unavailable-object-absent' },
        fieldStatus: 'target-unavailable',
        sources: [],
      }],
      summary: {
        fieldCount: 2,
        unchangedFieldCount: 0,
        customizedFieldCount: 2,
        unavailableFieldCount: 1,
      },
    },
  }) as unknown as AppCaseInsertPresetInspectionResult
}

function catalog(calls: { getLatest: number }): CaseInsertPresetCatalog {
  return Object.freeze({
    list: () => Object.freeze([{
      ...LATEST_PRESET,
      name: 'Jewel Case Essentials',
      surface: 'case-insert' as const,
      source: 'builtin' as const,
    }]),
    getExact: () => null,
    getLatest: () => { calls.getLatest += 1; return null },
    resolve: () => ({
      ok: false as const,
      error: {
        code: 'unknown-id' as const,
        id: LATEST_PRESET.id,
        revision: LATEST_PRESET.revision,
      },
    }),
  })
}

test('detached presentation starts neutral with one exact latest revision-2 option', () => {
  const calls = { getLatest: 0 }
  const workflow = {
    inspectCurrent: () => detachedInspection(),
    beginApply: () => assert.fail('Selection alone must not begin Apply.'),
    beginReapply: () => assert.fail('Detached presentation cannot Reapply.'),
    beginDetach: () => assert.fail('Detached presentation cannot Detach.'),
    complete: async () => assert.fail('Selection alone must not complete.'),
  } as unknown as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(calls),
    publishDispatchFeedback: () => assert.fail('No feedback is expected.'),
  })

  const before = controller.getSnapshot()
  assert.equal(before.selectedOptionValue, '')
  assert.deepEqual(before.options.map(({ id, revision, name }) => ({
    id,
    revision,
    name,
  })), [{
    id: LATEST_PRESET.id,
    revision: 2,
    name: 'Jewel Case Essentials',
  }])

  assert.equal(controller.selectOption(before.options[0]!.value).ok, true)
  assert.notEqual(controller.getSnapshot().selectedOptionValue, '')
  assert.equal(calls.getLatest, 0)
})

test('stale revision-1 attachment Reapply remains bound to exact revision 1', () => {
  const calls = { getLatest: 0, reapply: 0 }
  let selectedPreset: unknown
  const workflow = {
    inspectCurrent: () => staleRevisionOneInspection(),
    beginApply: () => assert.fail('An attached preset cannot Apply.'),
    beginReapply: (input: unknown) => {
      calls.reapply += 1
      selectedPreset = (input as { selectedPreset: unknown }).selectedPreset
      return {
        ok: false as const,
        status: 'planning-failed' as const,
        code: 'planned-test-stop',
        operation: 'reapply' as const,
      }
    },
    beginDetach: () => assert.fail('Detach is not exercised here.'),
    complete: async () => assert.fail('No review is completed.'),
  } as unknown as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(calls),
    publishDispatchFeedback: () => assert.fail('No feedback is expected.'),
  })

  const result = controller.beginReapplyReview()
  assert.equal(result.ok, false)
  assert.equal(calls.reapply, 1)
  assert.deepEqual(selectedPreset, PRESET)
  assert.equal(calls.getLatest, 0)
  assert.equal(controller.getSnapshot().selectedOptionValue, '')
})

test('typed missing object prompts once and forwards observation without dependent unavailable-field prompts', () => {
  const calls = { getLatest: 0, reapply: 0 }
  let policies: readonly Record<string, unknown>[] = []
  const workflow = {
    inspectCurrent: () => missingRevisionTwoScreenshotInspection(),
    beginApply: () => assert.fail('An attached preset cannot Apply.'),
    beginReapply: (input: unknown) => {
      calls.reapply += 1
      policies = (input as {
        customizedFieldPolicies: readonly Record<string, unknown>[]
      }).customizedFieldPolicies
      return {
        ok: false as const,
        status: 'planning-failed' as const,
        code: 'planned-test-stop',
        operation: 'reapply' as const,
      }
    },
    beginDetach: () => assert.fail('Detach is not exercised here.'),
    complete: async () => assert.fail('No review is completed.'),
  } as unknown as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(calls),
    publishDispatchFeedback: () => assert.fail('No feedback is expected.'),
  })

  const snapshot = controller.getSnapshot()
  assert.equal(snapshot.reapplyPolicies.length, 1)
  const choice = snapshot.reapplyPolicies[0]!
  assert.equal(choice.field.fieldStatus, 'object-absent')
  assert.equal(controller.setReapplyPolicy(
    choice.key,
    'overwrite-with-selected-preset',
  ).ok, true)
  const result = controller.beginReapplyReview()
  assert.equal(result.ok, false)
  assert.equal(calls.reapply, 1)
  assert.equal(policies.length, 1)
  assert.deepEqual(policies[0]?.observation, {
    status: 'absent-owned-object',
  })
  assert.equal('currentValue' in policies[0]!, false)
  assert.deepEqual(policies[0]?.selectedPreset, LATEST_PRESET)
  assert.equal(calls.getLatest, 0)
})

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

test('repeated confirmation while pending completes and publishes feedback once', async () => {
  const calls = { complete: 0, feedback: 0, getLatest: 0 }
  let release: ((value: unknown) => void) | undefined
  const review = Object.freeze({
    ...applyReview(),
    warningIds: Object.freeze([]),
    materialConsentRequirementIds: Object.freeze([]),
  }) as unknown as AppCaseInsertPresetWorkflowReview
  const workflow = {
    inspectCurrent: () => detachedInspection(),
    beginApply: () => ({
      ok: true as const,
      status: 'review-required' as const,
      review,
    }),
    beginReapply: () => assert.fail('Detached presentation cannot Reapply.'),
    beginDetach: () => assert.fail('Detached presentation cannot Detach.'),
    complete: () => {
      calls.complete += 1
      return new Promise((resolve) => { release = resolve })
    },
  } as unknown as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(calls),
    publishDispatchFeedback: () => { calls.feedback += 1 },
  })
  const option = controller.getSnapshot().options[0]!
  controller.selectOption(option.value)
  assert.equal(controller.beginApplyReview().ok, true)

  const first = controller.confirmReview()
  assert.equal(controller.getSnapshot().pending, true)
  const repeated = await controller.confirmReview()
  assert.deepEqual(repeated, {
    ok: false,
    code: 'case.layoutPreset.confirmation-pending',
  })
  assert.equal(calls.complete, 1)

  release?.({
    ok: true,
    status: 'dispatched',
    operation: 'apply',
    dispatch: Object.freeze({}),
  })
  const completed = await first
  assert.equal(completed.ok, true)
  assert.equal(calls.complete, 1)
  assert.equal(calls.feedback, 1)
  assert.equal(controller.getSnapshot().review, null)
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
