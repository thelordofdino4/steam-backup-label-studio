import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  CaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
import type {
  AppCaseInsertPresetInspectionResult,
  AppCaseInsertPresetWorkflowOwner,
} from './appCaseInsertPresetWorkflow.ts'
import {
  createCaseInsertPresetPresentationController,
} from './caseInsertPresetPresentationController.ts'

const LATEST_PRESET = Object.freeze({
  id: 'builtin:case-preset:jewel-case-essentials',
  revision: 2,
})

function detachedInspection(
  sessionId = 'case-one',
  projectRevision = 0,
): AppCaseInsertPresetInspectionResult {
  return Object.freeze({
    ok: true,
    status: 'detached',
    sessionId,
    projectRevision,
    applicationRevision: 0,
    recoveryStatus: Object.freeze({ status: 'not-applicable' }),
  })
}

function catalog(): CaseInsertPresetCatalog {
  return Object.freeze({
    list: () => Object.freeze([{
      ...LATEST_PRESET,
      name: 'Jewel Case Essentials',
      surface: 'case-insert' as const,
      source: 'builtin' as const,
    }]),
    getExact: () => null,
    getLatest: () => null,
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

function successCompletion() {
  return Object.freeze({
    ok: true as const,
    status: 'dispatched' as const,
    operation: 'apply' as const,
    dispatch: Object.freeze({
      disposition: 'executed' as const,
      commandId: 'case.layoutPreset.apply' as const,
      result: Object.freeze({
        status: 'success' as const,
        value: Object.freeze({}),
      }),
    }),
  })
}

test('presentation starts neutral with exact catalog options and selection is inert', () => {
  const calls = { applySelected: 0 }
  const sourceInspection = detachedInspection()
  const workflow = {
    inspectCurrent: () => sourceInspection,
    applySelected: async () => {
      calls.applySelected += 1
      return successCompletion()
    },
  } as unknown as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(),
    publishDispatchFeedback: () => assert.fail('Selection has no feedback.'),
  })

  const initial = controller.getSnapshot()
  assert.equal(initial.selectedOptionValue, '')
  assert.equal(initial.pending, false)
  assert.equal(initial.notice, null)
  assert.deepEqual(initial.options.map(({ id, revision, name }) => ({
    id,
    revision,
    name,
  })), [{
    ...LATEST_PRESET,
    name: 'Jewel Case Essentials',
  }])

  const option = initial.options[0]!
  assert.equal(controller.selectOption(option.value).ok, true)
  assert.equal(controller.getSnapshot().selectedOptionValue, option.value)
  assert.equal(calls.applySelected, 0)
  assert.strictEqual(controller.getSnapshot().inspection, sourceInspection)

  assert.equal(controller.selectOption('not-a-catalog-option').ok, false)
  const rejected = controller.getSnapshot()
  assert.equal(rejected.selectedOptionValue, '')
  assert.equal(rejected.notice?.code,
    'case.layoutPreset.selection-unavailable')
  assert.equal(rejected.focusRequest?.target, 'error-summary')
  assert.equal(calls.applySelected, 0)
})

test('one Apply activation binds the exact selection and duplicate pending activation is inert', async () => {
  const calls = { applySelected: 0, feedback: 0 }
  let receivedInput: unknown
  let release: ((value: ReturnType<typeof successCompletion>) => void) | null =
    null
  const workflow = {
    inspectCurrent: () => detachedInspection(),
    applySelected: (input: unknown) => {
      calls.applySelected += 1
      receivedInput = input
      return new Promise<ReturnType<typeof successCompletion>>((resolve) => {
        release = resolve
      })
    },
  } as unknown as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(),
    publishDispatchFeedback: () => { calls.feedback += 1 },
  })
  const option = controller.getSnapshot().options[0]!
  controller.selectOption(option.value)

  const first = controller.applySelectedPreset()
  assert.equal(controller.getSnapshot().pending, true)
  assert.equal(calls.applySelected, 1)
  assert.deepEqual(receivedInput, {
    selectedPreset: LATEST_PRESET,
    requestedScope: { kind: 'complete' },
  })

  const duplicate = await controller.applySelectedPreset()
  assert.deepEqual(duplicate, {
    ok: false,
    code: 'case.layoutPreset.apply-pending',
  })
  assert.equal(calls.applySelected, 1)
  assert.equal(controller.selectOption('').ok, false)
  assert.equal(controller.getSnapshot().selectedOptionValue, option.value)

  release?.(successCompletion())
  const result = await first
  assert.deepEqual(result, {
    ok: true,
    code: 'case.layoutPreset.apply.completed',
  })
  assert.equal(calls.applySelected, 1)
  assert.equal(calls.feedback, 1)
  const completed = controller.getSnapshot()
  assert.equal(completed.pending, false)
  assert.equal(completed.selectedOptionValue, '')
  assert.equal(completed.notice?.message, 'Preset applied.')
  assert.equal(completed.focusRequest?.target, 'status')
})

test('selection is required and a typed failure remains concise and retryable', async () => {
  const calls = { applySelected: 0 }
  const workflow = {
    inspectCurrent: () => detachedInspection(),
    applySelected: async () => {
      calls.applySelected += 1
      return Object.freeze({
        ok: false as const,
        status: 'planning-failed' as const,
        code: 'case.layoutPreset.apply.blocked',
        operation: 'apply' as const,
      })
    },
  } as unknown as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(),
    publishDispatchFeedback: () => assert.fail('No dispatch was returned.'),
  })

  assert.equal((await controller.applySelectedPreset()).ok, false)
  assert.equal(calls.applySelected, 0)
  assert.equal(controller.getSnapshot().focusRequest?.target, 'selector')

  const option = controller.getSnapshot().options[0]!
  controller.selectOption(option.value)
  const result = await controller.applySelectedPreset()
  assert.deepEqual(result, {
    ok: false,
    code: 'case.layoutPreset.apply.blocked',
  })
  assert.equal(calls.applySelected, 1)
  const failed = controller.getSnapshot()
  assert.equal(failed.pending, false)
  assert.equal(failed.selectedOptionValue, option.value)
  assert.equal(failed.notice?.message,
    'The layout preset could not be prepared.')
  assert.equal(failed.focusRequest?.target, 'error-summary')
})

test('ordinary content changes preserve selection while session replacement clears it', () => {
  let inspection = detachedInspection('case-one', 0)
  const workflow = {
    inspectCurrent: () => inspection,
    applySelected: async () => successCompletion(),
  } as unknown as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(),
    publishDispatchFeedback: () => {},
  })
  const option = controller.getSnapshot().options[0]!
  controller.selectOption(option.value)

  inspection = detachedInspection('case-one', 1)
  controller.synchronize()
  assert.equal(controller.getSnapshot().selectedOptionValue, option.value)

  inspection = detachedInspection('case-two', 0)
  controller.synchronize()
  const replaced = controller.getSnapshot()
  assert.equal(replaced.selectedOptionValue, '')
  assert.equal(replaced.focusRequest?.target, 'selector')
})

test('session replacement retires a pending Apply without stale feedback, result, or focus', async () => {
  let inspection = detachedInspection('case-one', 0)
  const releases: Array<(
    value: ReturnType<typeof successCompletion>,
  ) => void> = []
  const calls = { applySelected: 0, feedback: 0 }
  const workflow = {
    inspectCurrent: () => inspection,
    applySelected: () => {
      calls.applySelected += 1
      return new Promise<ReturnType<typeof successCompletion>>((resolve) => {
        releases.push(resolve)
      })
    },
  } as unknown as AppCaseInsertPresetWorkflowOwner
  const controller = createCaseInsertPresetPresentationController({
    workflow,
    catalog: catalog(),
    publishDispatchFeedback: () => { calls.feedback += 1 },
  })
  const option = controller.getSnapshot().options[0]!
  controller.selectOption(option.value)
  const first = controller.applySelectedPreset()
  assert.equal(controller.getSnapshot().pending, true)

  inspection = detachedInspection('case-two', 0)
  controller.synchronize()
  const replacement = controller.getSnapshot()
  assert.equal(replacement.pending, false)
  assert.equal(replacement.selectedOptionValue, '')
  assert.equal(replacement.notice, null)
  assert.equal(replacement.focusRequest?.target, 'selector')
  const replacementFocus = replacement.focusRequest

  controller.selectOption(option.value)
  const second = controller.applySelectedPreset()
  assert.equal(controller.getSnapshot().pending, true)
  assert.equal(calls.applySelected, 2)

  releases[0]!(successCompletion())
  assert.deepEqual(await first, {
    ok: false,
    code: 'case.layoutPreset.presentation-session-replaced',
  })
  const afterRetiredCompletion = controller.getSnapshot()
  assert.equal(afterRetiredCompletion.pending, true)
  assert.equal(afterRetiredCompletion.notice, null)
  assert.strictEqual(afterRetiredCompletion.focusRequest, replacementFocus)
  assert.equal(calls.feedback, 0)

  releases[1]!(successCompletion())
  assert.deepEqual(await second, {
    ok: true,
    code: 'case.layoutPreset.apply.completed',
  })
  assert.equal(controller.getSnapshot().pending, false)
  assert.equal(controller.getSnapshot().notice?.message, 'Preset applied.')
  assert.equal(controller.getSnapshot().focusRequest?.target, 'status')
  assert.equal(calls.feedback, 1)
})
