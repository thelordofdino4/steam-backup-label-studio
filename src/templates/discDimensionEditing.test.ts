import assert from 'node:assert/strict'
import test from 'node:test'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createProjectSnapshot } from '../project/createProjectSnapshot.ts'
import { restoreSavedProjectState } from '../project/restoreProjectState.ts'
import { DISC_GEOMETRY_FIELDS } from './discGeometryDraft.ts'
import { createDefaultDiscTemplateState, updateCustomDiscTemplateDimension } from './discTemplateStateModel.ts'
import { createDiscDimensionEditingState, updateDiscDimensionDraft, getDiscDimensionFieldViews } from './discDimensionEditing.ts'

const runtime = await restoreSavedProjectState(createBlankDiscSavedProject())
const guardrail = { ...runtime, discTextTitle: runtime.discTextTitleValue }
function initial() {
  return createDiscDimensionEditingState({ ...createDefaultDiscTemplateState(), selectedDiscTemplateId: 'custom' })
}

test('valid positive field commits match the pre-existing normalization and clamp result', () => {
  const values = ['125.5', '16', '30', '116', '110']
  DISC_GEOMETRY_FIELDS.forEach((field, index) => {
    const before = initial()
    const legacy = updateCustomDiscTemplateDimension({
      state: before.templateState, field, value: values[index], geometryGuardrailState: guardrail,
    })
    const result = updateDiscDimensionDraft(before, field, values[index], guardrail)
    assert.equal(result.changed, true)
    assert.deepEqual(result.state.templateState, legacy.state)
    assert.deepEqual(result.selectedTemplateToClamp, legacy.selectedTemplateToClamp)
    assert.equal(result.statusMessage, legacy.statusMessage)
    assert.deepEqual(result.state.diagnostics, [])
  })
})

test('zero edit keeps the legacy gate while existing loaded zeros remain compatible', () => {
  const before = initial()
  const zero = updateDiscDimensionDraft(before, 'physicalCenterHoleDiameterMm', '0', guardrail)
  assert.equal(zero.changed, false)
  assert.equal(zero.state.templateState, before.templateState)
  assert.equal(zero.state.diagnostics.length, 1)
  assert.match(zero.state.diagnostics[0].message, /greater than 0/)
  const outer = updateDiscDimensionDraft(before, 'outerDiameterMm', '0', guardrail)
  assert.equal(outer.state.diagnostics.filter(item => item.field === 'outerDiameterMm').length, 1)
  const loaded = createDiscDimensionEditingState({
    ...before.templateState, customDiscTemplate: { ...before.templateState.customDiscTemplate, physicalCenterHoleDiameterMm: 0 },
  })
  const result = updateDiscDimensionDraft(loaded, 'safeDiameterMm', '110', guardrail)
  assert.equal(result.changed, true)
  assert.equal(result.state.templateState.customDiscTemplate.physicalCenterHoleDiameterMm, 0)
})

test('several pending dimensions commit together only after all constraints pass', () => {
  const before = initial()
  const first = updateDiscDimensionDraft(before, 'innerHoleDiameterMm', '119', guardrail)
  assert.equal(first.changed, false)
  const second = updateDiscDimensionDraft(first.state, 'safeDiameterMm', '119', guardrail)
  assert.equal(second.changed, false)
  assert.equal(second.state.templateState, before.templateState)
  const third = updateDiscDimensionDraft(second.state, 'printableDiameterMm', '120', guardrail)
  assert.equal(third.changed, true)
  assert.equal(third.state.templateState.customDiscTemplate.innerHoleDiameterMm, 119)
  assert.equal(third.state.templateState.customDiscTemplate.safeDiameterMm, 119)
  assert.equal(third.state.templateState.customDiscTemplate.printableDiameterMm, 120)
  assert.equal(third.selectedTemplateToClamp, third.state.templateState.customDiscTemplate)
})

test('cross-field views associate errors to both inputs without mutating source metadata', () => {
  const before = initial()
  const source = structuredClone(before)
  const result = updateDiscDimensionDraft(before, 'safeDiameterMm', '119', guardrail)
  const views = getDiscDimensionFieldViews(result.state)
  for (const key of ['safeDiameterMm', 'printableDiameterMm']) {
    const view = views.find(item => item.key === key)!
    assert.equal(view.messages.length, 1)
    assert.ok(view.inputId && view.errorId)
  }
  assert.deepEqual(before, source)
  assert.equal(result.state.templateState, before.templateState)
})

test('save snapshot and restore consume only last committed dimensions, never raw invalid text', async () => {
  const before = initial()
  const savedBefore = createProjectSnapshot({ ...runtime, ...before.templateState })
  const invalid = updateDiscDimensionDraft(before, 'outerDiameterMm', '1e', guardrail)
  const invalidSnapshot = createProjectSnapshot({ ...runtime, ...invalid.state.templateState })
  assert.deepEqual(invalidSnapshot.template, savedBefore.template)
  assert.equal(JSON.stringify(invalidSnapshot).includes('"rawDraft"'), false)
  const valid = updateDiscDimensionDraft(invalid.state, 'outerDiameterMm', '125.5', guardrail)
  const saved = createProjectSnapshot({ ...runtime, ...valid.state.templateState })
  const restored = await restoreSavedProjectState(JSON.parse(JSON.stringify(saved)))
  for (const field of DISC_GEOMETRY_FIELDS) {
    assert.equal(restored.template.selectedDiscTemplate[field], valid.state.templateState.customDiscTemplate[field])
  }
  assert.equal(saved.template.customDimensions?.units, 'mm')
})

test('inactive Custom editing retains the legacy deferred clamp behavior', () => {
  const state = createDiscDimensionEditingState(createDefaultDiscTemplateState())
  const result = updateDiscDimensionDraft(state, 'safeDiameterMm', '110', guardrail)
  assert.equal(result.changed, true)
  assert.equal(result.selectedTemplateToClamp, null)
  assert.equal(result.state.templateState.selectedDiscTemplateId, state.templateState.selectedDiscTemplateId)
})