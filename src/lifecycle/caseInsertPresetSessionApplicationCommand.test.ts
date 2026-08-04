import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import {
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
  CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND,
  CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION,
  auditCaseInsertPresetValidatedAdoptionSuccessBundle,
  transitionCaseInsertPresetApplicationAdoption,
} from '../presets/caseInsertPresetApplicationAdoptionTransition.ts'
import {
  buildCaseInsertPresetApplicationAdoptionFixture,
} from '../presets/caseInsertPresetApplicationAdoption.testFixture.test.ts'
import type {
  CaseInsertPresetApplicationAdoptionEvidence,
  CaseInsertPresetApplicationAdoptionOperation,
  CaseInsertPresetApplicationSnapshot,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'
import {
  CASE_INSERT_PRESET_APPLICATION_COMMAND_IDS,
  commandSucceeded,
  type CaseInsertPresetApplicationCommandId,
} from './applicationCommandTypes.ts'
import {
  createApplicationLifecycleCompositionRoot,
  type ApplicationLifecycleCompositionSnapshot,
} from './applicationLifecycleCompositionRoot.ts'
import {
  prepareCaseInsertPresetSessionAdoptionCommit,
} from './caseInsertPresetSessionApplicationCommit.ts'
import {
  representCaseInsertPresetApplicationSnapshot,
} from './caseInsertPresetSessionApplication.ts'
import {
  applicationLifecycleStatesAreSemanticallyEqual,
  captureApplicationLifecycleState,
  createLoadedProjectSession,
  isProjectSessionDirty,
  type ApplicationLifecycleState,
  type CaseInsertProjectSession,
} from './projectSession.ts'

const COMMAND_BY_OPERATION = Object.freeze({
  apply: 'case.layoutPreset.apply',
  reapply: 'case.layoutPreset.reapply',
  detach: 'case.layoutPreset.detach',
} as const satisfies Readonly<Record<
  CaseInsertPresetApplicationAdoptionOperation,
  CaseInsertPresetApplicationCommandId
>>)

function requireCaseSession(
  state: ApplicationLifecycleState,
): CaseInsertProjectSession {
  assert.ok(state.activeSession)
  assert.equal(state.activeSession.kind, 'caseInsert')
  if (!state.activeSession || state.activeSession.kind !== 'caseInsert') {
    throw new Error('Expected an active Case project session.')
  }
  return state.activeSession
}

function sessionForApplication(
  application: CaseInsertPresetApplicationSnapshot,
  contentRevision = 17,
): CaseInsertProjectSession {
  const project = createBlankJewelCaseSavedProject()
  project.title = 'Case preset store adoption'
  project.game.manualTitle = project.title
  project.caseInsert = structuredClone(application.snapshot.caseInsert)
  const initial = requireCaseSession(createLoadedProjectSession({
    sessionId: application.snapshot.identity.sessionId,
    currentPath: 'C:\\projects\\case-preset-store-adoption.sbls',
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
      caseInsertPresetApplication: represented.application,
    },
    visibleWorkspace: 'caseInsert',
  }))
}

function authorizationFor(
  operation: CaseInsertPresetApplicationAdoptionOperation,
  suffix = operation,
) {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    `store-adoption-${suffix}`,
  )
  const current = operation === 'apply'
    ? fixture.sourceApplication
    : fixture.firstApplication
  const evidence: CaseInsertPresetApplicationAdoptionEvidence =
    operation === 'apply'
      ? fixture.applyEvidence
      : operation === 'reapply'
        ? fixture.reapplyEvidence
        : fixture.detachEvidence
  const adoption = transitionCaseInsertPresetApplicationAdoption({
    kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
    formatVersion:
      CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
    operation,
    current,
    evidence,
  })
  assert.equal(adoption.ok, true, JSON.stringify(adoption))
  if (!adoption.ok) throw new Error(`${adoption.status}:${adoption.code}`)
  const bundle = auditCaseInsertPresetValidatedAdoptionSuccessBundle({
    kind: CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_KIND,
    formatVersion:
      CASE_INSERT_PRESET_VALIDATED_ADOPTION_SUCCESS_BUNDLE_VERSION,
    operation,
    current,
    evidence,
    adoption,
  })
  assert.equal(bundle.ok, true, JSON.stringify(bundle))
  if (!bundle.ok) throw new Error(`${bundle.status}:${bundle.code}`)
  const source = sessionForApplication(current)
  const prepared = prepareCaseInsertPresetSessionAdoptionCommit({
    sourceSession: source,
    adoptionBundle: bundle.bundle,
  })
  assert.equal(prepared.ok, true, JSON.stringify(prepared))
  if (!prepared.ok) throw new Error(`${prepared.status}:${prepared.code}`)
  return {
    source,
    successor: prepared.snapshot.successorSession,
    snapshot: prepared.snapshot,
  }
}

function rootFor(source: CaseInsertProjectSession) {
  return createApplicationLifecycleCompositionRoot({
    initialState: captureApplicationLifecycleState({
      activeSession: source,
      visibleWorkspace: 'caseInsert',
    }),
  })
}

function installedStateChanges(
  observations: readonly ApplicationLifecycleCompositionSnapshot[],
) {
  let priorGeneration = 0
  return observations.filter((observation) => {
    if (observation.stateGeneration === priorGeneration) return false
    priorGeneration = observation.stateGeneration
    return true
  })
}

for (const operation of [
  'apply',
  'reapply',
  'detach',
] as const) {
  test(`authorized ${operation} installs one complete successor session exactly once`, async () => {
    const authorization = authorizationFor(operation)
    const root = rootFor(authorization.source)
    const observations: ApplicationLifecycleCompositionSnapshot[] = []
    root.subscribe((snapshot) => observations.push(snapshot))

    const result = await root.dispatch(
      COMMAND_BY_OPERATION[operation],
      authorization.snapshot,
    )

    assert.equal(result.disposition, 'executed')
    if (result.disposition !== 'executed') throw new Error(result.reason)
    assert.equal(result.result.status, 'success')
    if (result.result.status !== 'success') {
      throw new Error(result.result.status)
    }
    assert.equal(result.result.value.operation, operation)
    assert.equal(
      result.result.value.status,
      operation === 'apply'
        ? 'applied'
        : operation === 'reapply'
          ? 'reapplied'
          : 'detached',
    )
    assert.equal(root.getStateSnapshot().generation, 1)
    assert.equal(installedStateChanges(observations).length, 1)
    assert.deepEqual(
      root.getLifecycleState().activeSession,
      authorization.successor,
    )
    assert.deepEqual(root.getBusyState().occupiedScopes, [])

    const replay = await root.dispatch(
      COMMAND_BY_OPERATION[operation],
      authorization.snapshot,
    )
    assert.equal(replay.disposition, 'executed')
    if (replay.disposition === 'executed') {
      assert.equal(replay.result.status, 'failure')
    }
    assert.equal(root.getStateSnapshot().generation, 1)
    assert.deepEqual(
      root.getLifecycleState().activeSession,
      authorization.successor,
    )
    root.dispose()
  })
}

test('combined aggregate and attachment adoption has no externally observable partial state', async () => {
  const authorization = authorizationFor('apply', 'combined-atomic')
  assert.notDeepEqual(
    authorization.source.project.caseInsert,
    authorization.successor.project.caseInsert,
  )
  assert.notDeepEqual(
    authorization.source.caseInsertPresetApplication.attachment,
    authorization.successor.caseInsertPresetApplication.attachment,
  )
  const root = rootFor(authorization.source)
  const observedSessions: CaseInsertProjectSession[] = []
  root.subscribe(({ lifecycle }) => {
    if (lifecycle.activeSession?.kind === 'caseInsert') {
      observedSessions.push(lifecycle.activeSession)
    }
  })

  const result = await root.dispatch(
    'case.layoutPreset.apply',
    authorization.snapshot,
  )
  assert.equal(result.disposition, 'executed')
  assert.ok(observedSessions.length >= 1)
  for (const observed of observedSessions) {
    const observedState = captureApplicationLifecycleState({
      activeSession: observed,
      visibleWorkspace: 'caseInsert',
    })
    const isSource = applicationLifecycleStatesAreSemanticallyEqual(
      observedState,
      captureApplicationLifecycleState({
        activeSession: authorization.source,
        visibleWorkspace: 'caseInsert',
      }),
    )
    const isSuccessor = applicationLifecycleStatesAreSemanticallyEqual(
      observedState,
      captureApplicationLifecycleState({
        activeSession: authorization.successor,
        visibleWorkspace: 'caseInsert',
      }),
    )
    assert.equal(isSource || isSuccessor, true)
  }
  root.dispose()
})

test('attachment-only Detach is one atomic observable session transition without content dirtiness', async () => {
  const authorization = authorizationFor('detach', 'attachment-only')
  assert.deepEqual(
    authorization.source.project,
    authorization.successor.project,
  )
  assert.equal(
    authorization.source.revision,
    authorization.successor.revision,
  )
  assert.notDeepEqual(
    authorization.source.caseInsertPresetApplication.attachment,
    authorization.successor.caseInsertPresetApplication.attachment,
  )
  assert.equal(
    isProjectSessionDirty(authorization.successor),
    isProjectSessionDirty(authorization.source),
  )
  const root = rootFor(authorization.source)
  const result = await root.dispatch(
    'case.layoutPreset.detach',
    authorization.snapshot,
  )
  assert.equal(result.disposition, 'executed')
  assert.equal(root.getStateSnapshot().generation, 1)
  assert.deepEqual(
    root.getLifecycleState().activeSession,
    authorization.successor,
  )
  root.dispose()
})

test('stale session ID and stale project revision are rejected without changing either application unit', async () => {
  const authorization = authorizationFor('apply', 'stale-source')
  const different = authorizationFor('apply', 'different-session').source
  const staleRevision = requireCaseSession(captureApplicationLifecycleState({
    activeSession: {
      ...authorization.source,
      revision: authorization.source.revision + 1,
    },
    visibleWorkspace: 'caseInsert',
  }))

  for (const [name, current, expectedCode] of [
    ['session', different, 'source-session-id-stale'],
    ['revision', staleRevision, 'source-content-revision-stale'],
  ] as const) {
    const root = rootFor(current)
    const before = root.getStateSnapshot()
    const result = await root.dispatch(
      'case.layoutPreset.apply',
      authorization.snapshot,
    )
    assert.equal(result.disposition, 'executed', name)
    if (result.disposition === 'executed') {
      assert.equal(result.result.status, 'failure', name)
      if (result.result.status === 'failure') {
        assert.equal(result.result.error.code, expectedCode, name)
      }
    }
    assert.equal(root.getStateSnapshot().generation, before.generation, name)
    assert.deepEqual(root.getLifecycleState().activeSession, current, name)
    assert.deepEqual(root.getBusyState().occupiedScopes, [], name)
    root.dispose()
  }
})

test('an authorization cannot be installed through a different operation command', async () => {
  const authorization = authorizationFor('apply', 'operation-mismatch')
  const root = rootFor(authorization.source)
  const result = await root.dispatch(
    'case.layoutPreset.reapply',
    authorization.snapshot,
  )
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'failure')
    if (result.result.status === 'failure') {
      assert.equal(
        result.result.error.code,
        'case.layoutPreset.operation-mismatch',
      )
    }
  }
  assert.equal(root.getStateSnapshot().generation, 0)
  assert.deepEqual(
    root.getLifecycleState().activeSession,
    authorization.source,
  )
  assert.deepEqual(root.getBusyState().occupiedScopes, [])
  root.dispose()
})

test('an incompatible lifecycle mutation scope rejects before installation and both operations clean up', async () => {
  const authorization = authorizationFor('apply', 'busy')
  let releaseLifecycle!: () => void
  const lifecycleBlocked = new Promise<void>((resolve) => {
    releaseLifecycle = resolve
  })
  const root = createApplicationLifecycleCompositionRoot({
    initialState: captureApplicationLifecycleState({
      activeSession: authorization.source,
      visibleWorkspace: 'caseInsert',
    }),
    ports: {
      newCase: {
        availability: 'implemented',
        executeNewCase: async () => {
          await lifecycleBlocked
          return commandSucceeded(undefined)
        },
      },
    },
  })

  const lifecycle = root.dispatch('project.new-case')
  assert.deepEqual(root.getBusyState().occupiedScopes, ['lifecycle.transition'])
  const blocked = await root.dispatch(
    'case.layoutPreset.apply',
    authorization.snapshot,
  )
  assert.equal(blocked.disposition, 'not-executed')
  if (blocked.disposition === 'not-executed') {
    assert.equal(blocked.reason, 'disabled')
  }
  assert.equal(root.getStateSnapshot().generation, 0)
  assert.deepEqual(
    root.getLifecycleState().activeSession,
    authorization.source,
  )

  releaseLifecycle()
  await lifecycle
  assert.deepEqual(root.getBusyState().occupiedScopes, [])

  const malformed = await root.dispatch(
    'case.layoutPreset.apply',
    { operation: 'apply' },
  )
  assert.equal(malformed.disposition, 'executed')
  if (malformed.disposition === 'executed') {
    assert.equal(malformed.result.status, 'failure')
  }
  assert.equal(root.getStateSnapshot().generation, 0)
  assert.deepEqual(
    root.getLifecycleState().activeSession,
    authorization.source,
  )
  assert.deepEqual(root.getBusyState().occupiedScopes, [])
  root.dispose()
})

test('command capabilities remain isolated to active Case sessions and existing lifecycle capabilities remain intact', () => {
  const authorization = authorizationFor('apply', 'capabilities')
  const caseRoot = rootFor(authorization.source)
  const caseCapabilities = caseRoot.getApplicationCommandCapabilities()
  for (const id of CASE_INSERT_PRESET_APPLICATION_COMMAND_IDS) {
    assert.equal(caseCapabilities[id].canExecute, true, id)
  }
  assert.equal(
    caseRoot.getLifecycleCommandCapabilities()['project.save'].canExecute,
    false,
  )

  const emptyRoot = createApplicationLifecycleCompositionRoot()
  const emptyCapabilities = emptyRoot.getApplicationCommandCapabilities()
  for (const id of CASE_INSERT_PRESET_APPLICATION_COMMAND_IDS) {
    assert.equal(emptyCapabilities[id].canExecute, false, id)
  }
  assert.equal(
    emptyRoot.getLifecycleCommandCapabilities()['project.new-disc'].canExecute,
    false,
  )
  caseRoot.dispose()
  emptyRoot.dispose()
})

test('installation command imports no planner, operation transition, catalog, UI, schema, persistence, preview, or export owner', () => {
  const source = readFileSync(new URL(
    './caseInsertPresetSessionApplicationCommand.ts',
    import.meta.url,
  ), 'utf8')
  for (const pattern of [
    /caseInsertPresetApplyPlanning/,
    /caseInsertPresetApplyTransition/,
    /caseInsertPresetReapplyPlanning/,
    /caseInsertPresetReapplyTransition/,
    /caseInsertPresetDetachPlanning/,
    /caseInsertPresetDetachTransition/,
    /transitionCaseInsertPresetApplicationAdoption/,
    /CASE_INSERT_PRESET_CATALOG/,
    /from ['"][^'"]*(?:\.\.\/app\/|components?\/|projectSchema|package|render|preview|export)/i,
    /from ['"]react['"]/,
    /\b(?:document|window|fetch|invoke|listen|emit|writeFile)\b/,
  ]) {
    assert.doesNotMatch(source, pattern, String(pattern))
  }

  const app = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8')
  for (const id of CASE_INSERT_PRESET_APPLICATION_COMMAND_IDS) {
    assert.doesNotMatch(app, new RegExp(id.replace('.', '\\.')))
  }
  const catalog = readFileSync(new URL(
    '../presets/caseInsertPresetCatalog.ts',
    import.meta.url,
  ), 'utf8')
  assert.match(catalog, /createCaseInsertPresetCatalog\(\)/)
})
