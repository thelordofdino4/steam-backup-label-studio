import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import {
  createCaseInsertProjectSaveSnapshot,
} from '../project/caseInsertPresetProjectPersistence.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  representCaseInsertPresetApplicationSnapshot,
} from '../lifecycle/caseInsertPresetSessionApplication.ts'
import {
  captureApplicationLifecycleState,
  createLoadedProjectSession,
  createNewProjectSession,
  selectIsActiveProjectDirty,
  type ApplicationLifecycleState,
  type CaseInsertProjectSession,
} from '../lifecycle/projectSession.ts'
import {
  buildCaseInsertPresetApplicationAdoptionFixture,
} from '../presets/caseInsertPresetApplicationAdoption.testFixture.test.ts'
import {
  transitionCaseInsertPresetApplicationAdoption,
} from '../presets/caseInsertPresetApplicationAdoptionTransition.ts'
import {
  auditCaseInsertPresetApplicationAdoptionEvidence,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'
import {
  createCaseInsertPresetCatalog,
  CASE_INSERT_PRESET_CATALOG,
  type CaseInsertPresetCatalog,
} from '../presets/caseInsertPresetCatalog.ts'
import {
  createCoordinatedCaseInsertPresetDefinition,
} from '../presets/caseInsertPresetTestFixtures.ts'
import {
  applyCaseInsertPresetFirstTime,
} from '../presets/caseInsertPresetApplyTransition.ts'
import {
  planCaseInsertPresetFirstApply,
} from '../presets/caseInsertPresetApplyPlanning.ts'
import {
  createCaseInsertPresetPlanWarningIdentity,
} from '../presets/caseInsertPresetApplyReviewIdentity.ts'
import {
  prepareCaseInsertPresetSessionAdoptionCommit,
} from '../lifecycle/caseInsertPresetSessionApplicationCommit.ts'
import {
  createAppCaseInsertPresetWorkflowOwner,
  type AppCaseInsertPresetWorkflowDecision,
  type AppCaseInsertPresetWorkflowReview,
} from './appCaseInsertPresetWorkflow.ts'
import { stageProjectOpenContents } from './appProjectLoad.ts'
import { createBrandingSources } from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'

const PRESET = Object.freeze({
  id: 'builtin:case-preset:coordinated-five-region',
  revision: 3,
})

function catalog(): CaseInsertPresetCatalog {
  const result = createCaseInsertPresetCatalog({
    builtins: [createCoordinatedCaseInsertPresetDefinition()],
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error(result.error.code)
  return result.catalog
}

function requireCaseSession(
  state: ApplicationLifecycleState,
): CaseInsertProjectSession {
  assert.ok(state.activeSession)
  assert.equal(state.activeSession.kind, 'caseInsert')
  if (!state.activeSession || state.activeSession.kind !== 'caseInsert') {
    throw new Error('Expected a Case project session.')
  }
  return state.activeSession
}

function sessionForApplication(
  application: ReturnType<
    typeof buildCaseInsertPresetApplicationAdoptionFixture
  >['sourceApplication'],
  contentRevision = 17,
  recoveryStatus?: CaseInsertProjectSession[
    'caseInsertPresetApplication'
  ]['recoveryStatus'],
): CaseInsertProjectSession {
  const project = createBlankJewelCaseSavedProject('Workflow Case')
  project.caseInsert = structuredClone(application.snapshot.caseInsert)
  const initial = requireCaseSession(createLoadedProjectSession({
    sessionId: application.snapshot.identity.sessionId,
    currentPath: 'C:\\projects\\case-workflow.sbls',
    persistenceFormat: 'sbls-package-v1',
    project,
  }))
  const represented = representCaseInsertPresetApplicationSnapshot({
    sessionId: initial.id,
    project: initial.project,
    snapshot: application,
  })
  assert.equal(represented.ok, true)
  if (!represented.ok) throw new Error(represented.detail)
  return requireCaseSession(captureApplicationLifecycleState({
    activeSession: {
      ...initial,
      revision: contentRevision,
      caseInsertPresetApplication: {
        ...represented.application,
        ...(recoveryStatus ? { recoveryStatus } : {}),
      },
    },
    visibleWorkspace: 'caseInsert',
  }))
}

function setup(operation: 'apply' | 'reapply' | 'detach') {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    `workflow-${operation}`,
  )
  const source = sessionForApplication(
    operation === 'apply'
      ? fixture.sourceApplication
      : fixture.firstApplication,
  )
  const root = createApplicationLifecycleCompositionRoot({
    initialState: captureApplicationLifecycleState({
      activeSession: source,
      visibleWorkspace: 'caseInsert',
    }),
  })
  const commandIds: string[] = []
  const lifecycle = {
    getLifecycleState: () => root.getLifecycleState(),
    dispatch: async <Value = void>(commandId: string, input?: unknown) => {
      commandIds.push(commandId)
      return root.dispatch<Value>(commandId, input)
    },
  }
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle,
    catalog: catalog(),
  })
  return { fixture, source, root, owner, commandIds }
}

function requireReview<Review extends AppCaseInsertPresetWorkflowReview>(
  result: Readonly<{
    ok: true
    status: 'review-required'
    review: Review
  }> | Readonly<{ ok: false; code: string }>,
): Review {
  assert.equal(result.ok, true, JSON.stringify(result))
  if (!result.ok) throw new Error(result.code)
  return result.review
}

function confirm(
  review: AppCaseInsertPresetWorkflowReview,
  overrides: Partial<Extract<
    AppCaseInsertPresetWorkflowDecision,
    { decision: 'confirm' }
  >> = {},
): Extract<AppCaseInsertPresetWorkflowDecision, { decision: 'confirm' }> {
  return {
    decision: 'confirm',
    operation: review.operation,
    reviewIdentity: review.reviewIdentity,
    selectedPreset: review.selectedPreset,
    reviewedWarningIds: [...review.warningIds],
    acceptedMaterialConsentRequirementIds: [
      ...review.materialConsentRequirementIds,
    ],
    ...overrides,
  }
}

function begin(
  operation: 'apply' | 'reapply' | 'detach',
  owner: ReturnType<typeof createAppCaseInsertPresetWorkflowOwner>,
) {
  switch (operation) {
    case 'apply':
      return owner.beginApply({
        selectedPreset: PRESET,
        requestedScope: { kind: 'complete' },
      })
    case 'reapply':
      return owner.beginReapply({
        selectedPreset: PRESET,
        customizedFieldPolicies: [],
      })
    case 'detach':
      return owner.beginDetach()
  }
}

test('Apply requires an explicit exact selection and plans deterministically without mutation', () => {
  const { owner, root, commandIds } = setup('apply')
  const before = root.getLifecycleState()
  const invalid = owner.beginApply({
    selectedPreset: { id: PRESET.id } as typeof PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.equal(invalid.ok, false)
  if (!invalid.ok) assert.equal(invalid.code, 'case.layoutPreset.selection-invalid')

  const first = owner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })
  const second = owner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.deepEqual(first, second)
  assert.strictEqual(root.getLifecycleState(), before)
  assert.deepEqual(commandIds, [])
  const review = requireReview(first)
  assert.equal(Object.isFrozen(review), true)
  assert.equal(review.operation, 'apply')
  assert.deepEqual(review.selectedPreset, PRESET)
  assert.deepEqual(
    review.warningIds,
    review.plan.warnings.map(createCaseInsertPresetPlanWarningIdentity),
  )
  assert.deepEqual(
    review.materialConsentRequirementIds,
    review.plan.materialConsentRequirements.map(({ id }) => id),
  )
})

for (const operation of ['apply', 'reapply', 'detach'] as const) {
  test(`fully reviewed ${operation} dispatches the exact existing command once and installs one successor`, async () => {
    const { owner, root, source, commandIds } = setup(operation)
    const review = requireReview(begin(operation, owner))
    const result = await owner.complete(review, confirm(review))

    assert.equal(result.ok, true, JSON.stringify(result))
    if (!result.ok || result.status !== 'dispatched') return
    assert.deepEqual(commandIds, [`case.layoutPreset.${operation}`])
    assert.equal(result.dispatch.disposition, 'executed')
    assert.notStrictEqual(root.getLifecycleState().activeSession, source)
    const installed = requireCaseSession(root.getLifecycleState())
    assert.equal(installed.id, source.id)
    assert.equal(
      installed.revision,
      operation === 'apply' ? source.revision + 1 : source.revision,
    )
    assert.equal(
      installed.caseInsertPresetApplication.applicationRevision,
      source.caseInsertPresetApplication.applicationRevision + 1,
    )
    assert.equal(
      installed.caseInsertPresetApplication.attachment.status,
      operation === 'detach' ? 'unattached' : 'attached',
    )
  })
}

test('incomplete warning, consent, preset, and cross-operation decisions are rejected before dispatch', async () => {
  const { owner, root, commandIds } = setup('apply')
  const review = requireReview(begin('apply', owner))
  const before = root.getLifecycleState()
  const decisions = [
    confirm(review, { reviewedWarningIds: ['unknown-warning'] }),
    confirm(review, {
      acceptedMaterialConsentRequirementIds: ['unknown-consent'],
    }),
    confirm(review, {
      selectedPreset: { id: PRESET.id, revision: PRESET.revision + 1 },
    }),
    confirm(review, { operation: 'detach' }),
  ]
  for (const decision of decisions) {
    const result = await owner.complete(review, decision)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.status, 'invalid-decision')
  }
  assert.deepEqual(commandIds, [])
  assert.strictEqual(root.getLifecycleState(), before)
})

test('cancellation performs no transition, adoption, preparation, dispatch, or state mutation', async () => {
  const calls = {
    planning: 0,
    transition: 0,
    evidence: 0,
    adoption: 0,
    preparation: 0,
    dispatch: 0,
  }
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    'workflow-cancel',
  )
  const source = sessionForApplication(fixture.sourceApplication)
  const root = createApplicationLifecycleCompositionRoot({
    initialState: captureApplicationLifecycleState({
      activeSession: source,
      visibleWorkspace: 'caseInsert',
    }),
  })
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: {
      getLifecycleState: () => root.getLifecycleState(),
      dispatch: async <Value = void>(commandId: string, input?: unknown) => {
        calls.dispatch += 1
        return root.dispatch<Value>(commandId, input)
      },
    },
    catalog: catalog(),
    owners: {
      planApply: (input) => {
        calls.planning += 1
        return planCaseInsertPresetFirstApply(input)
      },
      applyTransition: (input) => {
        calls.transition += 1
        return applyCaseInsertPresetFirstTime(input)
      },
      auditEvidence: (input) => {
        calls.evidence += 1
        return auditCaseInsertPresetApplicationAdoptionEvidence(input)
      },
      transitionAdoption: (input) => {
        calls.adoption += 1
        return transitionCaseInsertPresetApplicationAdoption(input)
      },
      prepareCommit: (input) => {
        calls.preparation += 1
        return prepareCaseInsertPresetSessionAdoptionCommit(input)
      },
    },
  })
  const review = requireReview(begin('apply', owner))
  const before = root.getLifecycleState()
  const dirtyBefore = selectIsActiveProjectDirty(before)
  const result = await owner.complete(review, {
    decision: 'cancel',
    operation: 'apply',
    reviewIdentity: review.reviewIdentity,
  })
  assert.deepEqual(result, { ok: true, status: 'cancelled', operation: 'apply' })
  assert.deepEqual(calls, {
    planning: 1,
    transition: 0,
    evidence: 0,
    adoption: 0,
    preparation: 0,
    dispatch: 0,
  })
  assert.strictEqual(root.getLifecycleState(), before)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), dirtyBefore)
})

test('a content edit after review makes authorization stale and replay cannot install twice', async () => {
  const staleSetup = setup('apply')
  const staleReview = requireReview(begin('apply', staleSetup.owner))
  const edited = structuredClone(staleSetup.source.project)
  edited.title = 'Edited after review'
  const sync = staleSetup.root.synchronizeCurrentProject({
    sessionId: staleSetup.source.id,
    kind: 'caseInsert',
    project: edited,
  })
  assert.equal(sync, 'synchronized')
  const staleCancel = await staleSetup.owner.complete(staleReview, {
    decision: 'cancel',
    operation: 'apply',
    reviewIdentity: staleReview.reviewIdentity,
  })
  assert.equal(staleCancel.ok, false)
  if (!staleCancel.ok) assert.equal(staleCancel.status, 'stale-review')
  const stale = await staleSetup.owner.complete(
    staleReview,
    confirm(staleReview),
  )
  assert.equal(stale.ok, false)
  if (!stale.ok) assert.equal(stale.status, 'stale-review')
  assert.deepEqual(staleSetup.commandIds, [])

  const replaySetup = setup('detach')
  const replayReview = requireReview(begin('detach', replaySetup.owner))
  const first = await replaySetup.owner.complete(
    replayReview,
    confirm(replayReview),
  )
  assert.equal(first.ok, true)
  const second = await replaySetup.owner.complete(
    replayReview,
    confirm(replayReview),
  )
  assert.equal(second.ok, false)
  if (!second.ok) assert.equal(second.status, 'stale-review')
  assert.deepEqual(replaySetup.commandIds, ['case.layoutPreset.detach'])
})

test('busy and lifecycle installation failures preserve exact typed dispatch outcomes', async () => {
  for (const mode of ['busy', 'failure'] as const) {
    const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
      `workflow-dispatch-${mode}`,
    )
    const source = sessionForApplication(fixture.sourceApplication)
    const state = captureApplicationLifecycleState({
      activeSession: source,
      visibleWorkspace: 'caseInsert',
    })
    let dispatchCount = 0
    const dispatchResult = mode === 'busy'
      ? {
          disposition: 'not-executed' as const,
          reason: 'busy' as const,
          commandId: 'case.layoutPreset.apply',
        }
      : {
          disposition: 'executed' as const,
          commandId: 'case.layoutPreset.apply' as const,
          result: {
            status: 'failure' as const,
            error: {
              code: 'case.layoutPreset.lifecycle-store-installation-failed',
              userMessage: 'failed',
              recoverable: true,
            },
          },
        }
    const owner = createAppCaseInsertPresetWorkflowOwner({
      lifecycle: {
        getLifecycleState: () => state,
        dispatch: async () => {
          dispatchCount += 1
          return dispatchResult
        },
      },
      catalog: catalog(),
    })
    const before = state.activeSession
    const review = requireReview(begin('apply', owner))
    const result = await owner.complete(review, confirm(review))
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.status, 'dispatch-failed')
      if (result.status !== 'dispatch-failed') return
      assert.strictEqual(result.dispatch, dispatchResult)
      assert.equal(
        result.code,
        mode === 'busy'
          ? 'application.command.busy'
          : 'case.layoutPreset.lifecycle-store-installation-failed',
      )
    }
    assert.equal(dispatchCount, 1)
    assert.strictEqual(state.activeSession, before)
  }
})

test('new Case is explicitly detached while Disc and absent sessions are rejected', () => {
  const newCaseRoot = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'new-case-workflow',
      project: createBlankJewelCaseSavedProject(),
    }),
  })
  const caseOwner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: newCaseRoot,
    catalog: catalog(),
  })
  const inspection = caseOwner.inspectCurrent()
  assert.equal(inspection.ok, true)
  if (inspection.ok) assert.equal(inspection.status, 'detached')
  const reapply = caseOwner.beginReapply({
    selectedPreset: PRESET,
    customizedFieldPolicies: [],
  })
  assert.equal(reapply.ok, false)
  if (!reapply.ok) assert.equal(reapply.status, 'not-attached')
  const detach = caseOwner.beginDetach()
  assert.equal(detach.ok, false)
  if (!detach.ok) assert.equal(detach.status, 'not-attached')

  const discOwner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: createApplicationLifecycleCompositionRoot({
      initialState: createNewProjectSession({
        sessionId: 'disc-workflow',
        project: createBlankDiscSavedProject(),
      }),
    }),
    catalog: catalog(),
  })
  const disc = discOwner.beginApply({
    selectedPreset: PRESET,
    requestedScope: { kind: 'complete' },
  })
  assert.equal(disc.ok, false)
  if (!disc.ok) assert.equal(disc.status, 'incompatible-project-kind')

  const absentOwner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: createApplicationLifecycleCompositionRoot(),
    catalog: catalog(),
  })
  const absent = absentOwner.inspectCurrent()
  assert.equal(absent.ok, false)
  if (!absent.ok) assert.equal(absent.status, 'no-active-session')
})

test('inspection preserves current, stale, incompatible, and unavailable recovery status without catalog substitution', () => {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    'workflow-recovery-status',
  )
  const statuses = [
    { status: 'current' as const, customization: 'clean' as const },
    {
      status: 'stale' as const,
      savedRevision: 3,
      latestAvailableRevision: 4,
      customization: 'clean' as const,
    },
    { status: 'incompatible' as const, code: 'template-mismatch' },
    {
      status: 'unavailable' as const,
      code: 'exact-definition-unavailable' as const,
    },
  ]
  let catalogCalls = 0
  const unavailableCatalog: CaseInsertPresetCatalog = {
    getExact: () => { catalogCalls += 1; return null },
    getLatest: () => { catalogCalls += 1; return null },
    resolve: () => {
      catalogCalls += 1
      return {
        ok: false,
        error: { code: 'unknown-id', id: PRESET.id, revision: 3 },
      }
    },
    list: () => { catalogCalls += 1; return [] },
  }
  for (const recoveryStatus of statuses) {
    const session = sessionForApplication(
      fixture.firstApplication,
      17,
      recoveryStatus,
    )
    const state = captureApplicationLifecycleState({
      activeSession: session,
      visibleWorkspace: 'caseInsert',
    })
    const owner = createAppCaseInsertPresetWorkflowOwner({
      lifecycle: {
        getLifecycleState: () => state,
        dispatch: async (commandId: string) => ({
          disposition: 'not-executed' as const,
          reason: 'unknown-command' as const,
          commandId,
        }),
      },
      catalog: unavailableCatalog,
    })
    const before = structuredClone(session.caseInsertPresetApplication)
    const inspection = owner.inspectCurrent()
    assert.equal(inspection.ok, true)
    if (inspection.ok) {
      assert.equal(inspection.status, 'attached')
      assert.deepEqual(inspection.recoveryStatus, recoveryStatus)
    }
    const detach = owner.beginDetach()
    assert.equal(detach.ok, true, JSON.stringify(detach))
    assert.deepEqual(session.caseInsertPresetApplication, before)
  }
  assert.equal(catalogCalls, 0)
})

test('a recovered Save/Open attachment is immediately inspectable, detachable, and eligible for exact Reapply', async () => {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    'workflow-persistence-source',
  )
  const source = sessionForApplication(fixture.firstApplication)
  const saved = createCaseInsertProjectSaveSnapshot(
    source.project,
    source.caseInsertPresetApplication,
  )
  const staged = await stageProjectOpenContents({
    selectedPath: 'C:\\projects\\workflow-recovered.sbls',
    contents: JSON.stringify(saved),
    persistenceFormat: 'sbls-package-v1',
    caseInsertBrandingSources: createBrandingSources(),
    caseInsertPresetCatalog: catalog(),
  })
  assert.equal(staged.status, 'success', JSON.stringify(staged))
  if (staged.status !== 'success' || staged.value.projectType !== 'caseInsert') {
    return
  }
  const recovered = createLoadedProjectSession({
    sessionId: 'workflow-persistence-recovered',
    project: staged.value.normalizedProject,
    currentPath: staged.value.selectedPath,
    persistenceFormat: staged.value.persistenceFormat,
    lastEditorRoute: staged.value.editorRoute,
    caseInsertPresetRecovery: staged.value.caseInsertPresetRecovery,
  })
  const root = createApplicationLifecycleCompositionRoot({
    initialState: recovered,
  })
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: root,
    catalog: catalog(),
  })
  const inspection = owner.inspectCurrent()
  assert.equal(inspection.ok, true)
  if (inspection.ok) assert.equal(inspection.status, 'attached')
  assert.equal(owner.beginReapply({
    selectedPreset: PRESET,
    customizedFieldPolicies: [],
  }).ok, true)
  assert.equal(owner.beginDetach().ok, true)
})

test('the production catalog remains exact, schema stays 0.4.0, and App injects one presentation owner', () => {
  assert.deepEqual(CASE_INSERT_PRESET_CATALOG.list(), [{
    id: 'builtin:case-preset:jewel-case-essentials',
    revision: 1,
    name: 'Jewel Case Essentials',
    surface: 'case-insert',
    source: 'builtin',
  }])
  assert.equal(CURRENT_PROJECT_SCHEMA_VERSION, '0.4.0')
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  assert.match(appSource, /createAppCaseInsertPresetWorkflowOwner/)
  assert.match(appSource, /createCaseInsertPresetPresentationController/)
  assert.match(appSource, /caseInsertPresetPresentation=/)
  const workflowSource = readFileSync(
    'src/app/appCaseInsertPresetWorkflow.ts',
    'utf8',
  )
  assert.doesNotMatch(workflowSource, /invoke\(|write_binary_file|saveProject|Tauri/)
  assert.match(workflowSource, /case\.layoutPreset\.apply/)
  assert.match(workflowSource, /case\.layoutPreset\.reapply/)
  assert.match(workflowSource, /case\.layoutPreset\.detach/)
})

test('customization lookup and planning failures remain typed and never dispatch', () => {
  const { root } = setup('reapply')
  const before = root.getLifecycleState().activeSession
  let dispatchCount = 0
  const owner = createAppCaseInsertPresetWorkflowOwner({
    lifecycle: {
      getLifecycleState: () => root.getLifecycleState(),
      dispatch: async (commandId: string) => {
        dispatchCount += 1
        return {
          disposition: 'not-executed' as const,
          reason: 'unknown-command' as const,
          commandId,
        }
      },
    },
    catalog: catalog(),
    owners: {
      planApply: (input) => planCaseInsertPresetFirstApply(input),
      detectCustomization: () => ({
        ok: false,
        status: 'attachment-context-mismatch',
        code: 'case.layoutPreset.customization-context-mismatch',
      }),
    },
  })
  const result = owner.beginReapply({
    selectedPreset: PRESET,
    customizedFieldPolicies: [],
  })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.status, 'customization-detection-failed')
    assert.equal(result.code,
      'case.layoutPreset.customization-context-mismatch')
  }
  assert.equal(dispatchCount, 0)
  assert.strictEqual(root.getLifecycleState().activeSession, before)
})
