import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  createCaseInsertPresetAssignmentSnapshot,
} from '../caseInsert/presetAssignmentSnapshot.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import type {
  ProjectJewelCaseState,
  SavedCaseInsertProject,
} from '../project/projectTypes.ts'
import {
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
  CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
  transitionCaseInsertPresetApplicationAdoption,
} from '../presets/caseInsertPresetApplicationAdoptionTransition.ts'
import {
  buildCaseInsertPresetApplicationAdoptionFixture,
} from '../presets/caseInsertPresetApplicationAdoption.testFixture.test.ts'
import { CASE_INSERT_PRESET_CATALOG } from '../presets/caseInsertPresetCatalog.ts'
import {
  createCaseInsertPresetApplicationSnapshot,
  createCaseInsertPresetUnattachedState,
} from '../presets/caseInsertPresetConfigurationAdoptionModel.ts'
import {
  cloneCaseInsertPresetPlainInput,
} from '../presets/caseInsertPresetSafeInput.ts'
import {
  applicationLifecycleStatesAreSemanticallyEqual,
  captureApplicationLifecycleState,
  createLoadedProjectSession,
  createNewProjectSession,
  replaceActiveProjectContent,
  selectIsActiveProjectDirty,
  synchronizeActiveProjectContent,
  type ApplicationLifecycleState,
  type CaseInsertProjectSession,
} from './projectSession.ts'
import { createApplicationLifecycleStateStore } from './applicationLifecycleStateStore.ts'
import {
  captureCaseInsertPresetSessionApplication,
  projectCaseInsertPresetSessionApplicationSnapshot,
  representCaseInsertPresetApplicationSnapshot,
} from './caseInsertPresetSessionApplication.ts'
import { captureNormalizedProjectSnapshot } from './canonicalProject.ts'

type MutableRecord = Record<string, unknown>

const CASE_APPLICATION_KEYS = Object.freeze([
  'applicationRevision',
  'applicationStateIdentity',
  'attachment',
  'formatVersion',
  'kind',
  'recoveryStatus',
  'snapshotIdentity',
])

test('plain Case preset capture rejects out-of-range array keys and excessive depth', () => {
  const nonIndexArray: unknown[] = []
  Object.defineProperty(nonIndexArray, '4294967295', {
    value: 'must-not-be-erased',
    enumerable: true,
    configurable: true,
    writable: true,
  })
  const arrayResult = cloneCaseInsertPresetPlainInput(nonIndexArray)
  assert.equal(arrayResult.ok, false)
  if (!arrayResult.ok) assert.equal(arrayResult.code, 'array-shape-invalid')

  let excessiveDepth: MutableRecord = {}
  for (let depth = 0; depth < 300; depth += 1) {
    excessiveDepth = { child: excessiveDepth }
  }
  const depthResult = cloneCaseInsertPresetPlainInput(excessiveDepth)
  assert.equal(depthResult.ok, false)
  if (!depthResult.ok) assert.equal(depthResult.code, 'maximum-depth-exceeded')
})

function isDeeplyFrozen(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== 'object') return true
  if (seen.has(value)) return true
  seen.add(value)
  return Object.isFrozen(value) && Object.values(value).every((child) =>
    isDeeplyFrozen(child, seen))
}

function requireCaseSession(
  state: ApplicationLifecycleState,
): CaseInsertProjectSession {
  const session = state.activeSession
  assert.ok(session)
  assert.equal(session.kind, 'caseInsert')
  if (!session || session.kind !== 'caseInsert') {
    throw new Error('Expected a Case Insert project session.')
  }
  return session
}

function caseProjectForApplication(
  application: Readonly<{
    snapshot: Readonly<{ caseInsert: Readonly<ProjectJewelCaseState> }>
  }>,
  title = 'Lifecycle Case',
): SavedCaseInsertProject {
  const project = createBlankJewelCaseSavedProject()
  project.title = title
  project.game.manualTitle = title
  project.caseInsert = structuredClone(application.snapshot.caseInsert)
  return project
}

function createAttachedState() {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    'lifecycle-attached-session',
  )
  const project = caseProjectForApplication(fixture.firstApplication)
  const loaded = createLoadedProjectSession({
    sessionId: fixture.firstApplication.snapshot.identity.sessionId,
    currentPath: 'C:\\projects\\attached-case.sbls',
    persistenceFormat: 'sbls-package-v1',
    project,
  })
  const represented = representCaseInsertPresetApplicationSnapshot({
    sessionId: fixture.firstApplication.snapshot.identity.sessionId,
    project,
    snapshot: fixture.firstApplication,
  })
  assert.equal(represented.ok, true)
  if (!represented.ok) throw new Error(represented.detail)
  const session = requireCaseSession(loaded)
  const state = captureApplicationLifecycleState({
    ...loaded,
    activeSession: {
      ...session,
      caseInsertPresetApplication: represented.application,
    },
  })
  return { fixture, project, state }
}

function applicationSnapshotAtRevision(
  session: CaseInsertProjectSession,
  revision: number,
  attachment: unknown,
) {
  const assignment = createCaseInsertPresetAssignmentSnapshot({
    sessionId: session.id,
    projectRevision: revision,
    project: captureNormalizedProjectSnapshot(
      session.project as unknown as SavedCaseInsertProject,
    ),
  })
  assert.equal(assignment.ok, true)
  if (!assignment.ok) throw new Error(assignment.error.code)
  const snapshot = createCaseInsertPresetApplicationSnapshot({
    snapshot: assignment.value,
    attachment,
  })
  assert.equal(snapshot.ok, true)
  if (!snapshot.ok) throw new Error(snapshot.code)
  return snapshot.value
}

test('New and Open Case construct one canonical unattached content-bound application unit', () => {
  const project = createBlankJewelCaseSavedProject()
  const fresh = createNewProjectSession({
    sessionId: 'new-case-application',
    project,
  })
  const loaded = createLoadedProjectSession({
    sessionId: 'opened-case-application',
    currentPath: 'C:\\projects\\opened-case.sbls',
    persistenceFormat: 'sbls-package-v1',
    project,
  })

  for (const state of [fresh, loaded]) {
    const session = requireCaseSession(state)
    const unit = session.caseInsertPresetApplication
    assert.equal(unit.applicationRevision, 0)
    assert.equal(unit.snapshotIdentity.projectRevision, 0)
    assert.equal(unit.snapshotIdentity.sessionId, session.id)
    assert.equal(unit.attachment.status, 'unattached')
    assert.equal('caseInsert' in unit, false)
    assert.equal('project' in unit, false)
    assert.deepEqual(Object.keys(unit).sort(), CASE_APPLICATION_KEYS)
    for (const forbidden of [
      'receipt', 'evidence', 'transitionResult', 'adoptionIdentity',
    ]) {
      assert.equal(forbidden in unit, false)
    }
    assert.equal(isDeeplyFrozen(unit), true)

    const projected = projectCaseInsertPresetSessionApplicationSnapshot({
      sessionId: session.id,
      project: session.project,
      application: unit,
    })
    assert.equal(projected.ok, true)
    if (!projected.ok) throw new Error(projected.detail)
    assert.deepEqual(projected.snapshot.snapshot.identity, unit.snapshotIdentity)
    assert.deepEqual(
      projected.snapshot.snapshot.caseInsert,
      session.project.caseInsert,
    )
    assert.equal(projected.snapshot.attachment.status, 'unattached')
  }

  assert.notEqual(
    requireCaseSession(fresh).caseInsertPresetApplication
      .applicationStateIdentity,
    requireCaseSession(loaded).caseInsertPresetApplication
      .applicationStateIdentity,
  )

  const disc = createNewProjectSession({
    sessionId: 'new-disc-without-case-state',
    project: createBlankDiscSavedProject(),
  })
  assert.equal(disc.activeSession?.kind, 'disc')
  assert.equal(
    'caseInsertPresetApplication' in (disc.activeSession ?? {}),
    false,
  )
  assert.equal(CASE_INSERT_PRESET_CATALOG.list().length, 1)
})

test('whole-unit capture rejects partial, forged, mismatched, and hostile values without touching callers', () => {
  const state = createNewProjectSession({
    sessionId: 'strict-case-application',
    project: createBlankJewelCaseSavedProject(),
  })
  const session = requireCaseSession(state)
  const validInput = {
    sessionId: session.id,
    project: structuredClone(session.project),
    application: structuredClone(session.caseInsertPresetApplication),
  }
  const captured = captureCaseInsertPresetSessionApplication(validInput)
  assert.equal(captured.ok, true)
  if (!captured.ok) throw new Error(captured.detail)
  assert.notEqual(captured.application, validInput.application)
  assert.equal(isDeeplyFrozen(captured.application), true)
  assert.equal(Object.isFrozen(validInput), false)
  assert.equal(Object.isFrozen(validInput.project), false)
  assert.equal(Object.isFrozen(validInput.application), false)

  const failures: unknown[] = []
  const prototypeKeyApplication = structuredClone(
    validInput.application,
  ) as MutableRecord
  Object.defineProperty(prototypeKeyApplication, '__proto__', {
    value: { polluted: true },
    enumerable: true,
    configurable: true,
    writable: true,
  })
  failures.push({
    ...validInput,
    application: prototypeKeyApplication,
  })

  let applicationOwnKeysCalls = 0
  const changingApplicationTarget = structuredClone(
    prototypeKeyApplication,
  ) as MutableRecord
  const changingApplication = new Proxy(changingApplicationTarget, {
    ownKeys(target) {
      applicationOwnKeysCalls += 1
      const keys = Reflect.ownKeys(target)
      return applicationOwnKeysCalls === 1
        ? keys
        : keys.filter((key) => key !== '__proto__')
    },
  })
  failures.push({
    ...validInput,
    application: changingApplication,
  })

  let deeplyNestedAttachment: MutableRecord = {}
  for (let depth = 0; depth < 300; depth += 1) {
    deeplyNestedAttachment = { child: deeplyNestedAttachment }
  }
  failures.push({
    ...validInput,
    application: {
      ...validInput.application,
      attachment: deeplyNestedAttachment,
    },
  })

  const revoked = Proxy.revocable({}, {})
  revoked.revoke()
  failures.push(revoked.proxy)
  const selfRevoking = Proxy.revocable({}, {
    isExtensible(target) {
      selfRevoking.revoke()
      return Reflect.isExtensible(target)
    },
  })
  failures.push({
    ...validInput,
    application: {
      ...validInput.application,
      attachment: selfRevoking.proxy,
    },
  })
  const missingAttachment = structuredClone(validInput.application) as MutableRecord
  delete missingAttachment.attachment
  failures.push({ ...validInput, application: missingAttachment })
  failures.push({ sessionId: session.id, application: validInput.application })

  const forgedAbsence = structuredClone(validInput.application) as MutableRecord
  ;(forgedAbsence.attachment as MutableRecord).attachmentIdentity = 'forged'
  failures.push({ ...validInput, application: forgedAbsence })

  const wrongRevision = structuredClone(validInput.application) as MutableRecord
  wrongRevision.applicationRevision = 8
  failures.push({ ...validInput, application: wrongRevision })

  const wrongIdentity = structuredClone(validInput.application) as MutableRecord
  wrongIdentity.applicationStateIdentity = 'case:preset-application-state:v1:forged'
  failures.push({ ...validInput, application: wrongIdentity })

  const wrongAssignment = structuredClone(validInput.application) as MutableRecord
  ;(wrongAssignment.snapshotIdentity as MutableRecord).sessionId =
    'forged-assignment-session'
  failures.push({ ...validInput, application: wrongAssignment })

  const wrongTemplate = structuredClone(validInput.application) as MutableRecord
  ;((wrongTemplate.snapshotIdentity as MutableRecord)
    .template as MutableRecord).id = 'dvdCase'
  failures.push({ ...validInput, application: wrongTemplate })

  const changedAggregate = structuredClone(
    validInput.project,
  ) as unknown as SavedCaseInsertProject
  changedAggregate.caseInsert.templates.cover.background.layout.x += 0.1
  failures.push({ ...validInput, project: changedAggregate })

  const wrongSession = { ...validInput, sessionId: 'other-session' }
  failures.push(wrongSession)
  failures.push({
    ...validInput,
    project: createBlankDiscSavedProject(),
  })
  failures.push({ ...validInput, application: Promise.resolve(validInput.application) })
  failures.push({ ...validInput, application: new Map() })
  failures.push({ ...validInput, application: new Set() })
  failures.push({ ...validInput, application: new WeakMap() })
  failures.push({ ...validInput, application: new WeakSet() })
  failures.push({
    ...validInput,
    application: { then() { return validInput.application } },
  })
  failures.push({ ...validInput, application: () => validInput.application })
  failures.push(null, 7, [], Promise.resolve(validInput))

  const unsupportedPrototype = Object.create({ inherited: true }) as
    MutableRecord
  Object.assign(unsupportedPrototype, validInput)
  failures.push(unsupportedPrototype)

  const symbolInput = { ...validInput } as MutableRecord & {
    [key: symbol]: unknown
  }
  symbolInput[Symbol('forged')] = true
  failures.push(symbolInput)

  const cyclic = structuredClone(validInput.application) as MutableRecord
  cyclic.self = cyclic
  failures.push({ ...validInput, application: cyclic })

  let getterCalls = 0
  const accessorApplication = Object.create(null) as MutableRecord
  for (const [key, value] of Object.entries(validInput.application)) {
    Object.defineProperty(accessorApplication, key, key === 'attachment'
      ? {
          enumerable: true,
          get() {
            getterCalls += 1
            return value
          },
        }
      : { enumerable: true, value })
  }
  failures.push({ ...validInput, application: accessorApplication })

  const authentic = createAttachedState()
  const authenticSession = requireCaseSession(authentic.state)
  const mixedProject = caseProjectForApplication(
    authentic.fixture.sourceApplication,
    'Mixed authentic aggregate',
  )
  failures.push({
    sessionId: authenticSession.id,
    project: mixedProject,
    application: structuredClone(
      authenticSession.caseInsertPresetApplication,
    ),
  })

  const crossDomainApplication = structuredClone(
    authenticSession.caseInsertPresetApplication,
  ) as MutableRecord
  const crossDomainAttachment = crossDomainApplication.attachment as
    MutableRecord
  const crossDomainConfiguration = crossDomainAttachment.configuration as
    MutableRecord
  crossDomainConfiguration.kind = 'sbls/disc-preset-configuration'
  failures.push({
    sessionId: authenticSession.id,
    project: authenticSession.project,
    application: crossDomainApplication,
  })

  for (const hostile of failures) {
    const result = captureCaseInsertPresetSessionApplication(hostile)
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.equal(isDeeplyFrozen(result), true)
    assert.equal('application' in result, false)
  }
  assert.equal(getterCalls, 0)
  assert.equal(applicationOwnKeysCalls, 1)

  const selfRevokingSnapshot = Proxy.revocable({}, {
    isExtensible(target) {
      selfRevokingSnapshot.revoke()
      return Reflect.isExtensible(target)
    },
  })
  const representedHostile = representCaseInsertPresetApplicationSnapshot({
    sessionId: session.id,
    project: session.project,
    snapshot: selfRevokingSnapshot.proxy,
  })
  assert.equal(representedHostile.ok, false)
  if (!representedHostile.ok) {
    assert.equal(representedHostile.code, 'invalid-application-snapshot')
    assert.equal(isDeeplyFrozen(representedHostile), true)
    assert.equal('application' in representedHostile, false)
  }

  const validSnapshot = projectCaseInsertPresetSessionApplicationSnapshot({
    sessionId: session.id,
    project: session.project,
    application: session.caseInsertPresetApplication,
  })
  assert.equal(validSnapshot.ok, true)
  if (!validSnapshot.ok) throw new Error(validSnapshot.detail)
  const prototypeKeySnapshot = structuredClone(
    validSnapshot.snapshot,
  ) as unknown as MutableRecord
  Object.defineProperty(prototypeKeySnapshot, '__proto__', {
    value: { polluted: true },
    enumerable: true,
    configurable: true,
    writable: true,
  })
  const representedPrototypeKey = representCaseInsertPresetApplicationSnapshot({
    sessionId: session.id,
    project: session.project,
    snapshot: prototypeKeySnapshot,
  })
  assert.equal(representedPrototypeKey.ok, false)
  if (!representedPrototypeKey.ok) {
    assert.equal(representedPrototypeKey.code, 'invalid-application-snapshot')
    assert.equal(isDeeplyFrozen(representedPrototypeKey), true)
    assert.equal('application' in representedPrototypeKey, false)
  }

  const nonIndexArraySnapshot = structuredClone(validSnapshot.snapshot)
  const pending: unknown[] = [nonIndexArraySnapshot]
  let nestedArray: unknown[] | null = null
  while (pending.length > 0 && !nestedArray) {
    const candidate = pending.pop()
    if (Array.isArray(candidate)) {
      nestedArray = candidate
    } else if (candidate && typeof candidate === 'object') {
      pending.push(...Object.values(candidate as Record<string, unknown>))
    }
  }
  assert.ok(nestedArray, 'the valid Case application snapshot contains an array')
  Object.defineProperty(nestedArray, '4294967295', {
    value: 'must-not-be-erased',
    enumerable: true,
    configurable: true,
    writable: true,
  })
  const representedNonIndexArray =
    representCaseInsertPresetApplicationSnapshot({
      sessionId: session.id,
      project: session.project,
      snapshot: nonIndexArraySnapshot,
    })
  assert.equal(representedNonIndexArray.ok, false)
  if (!representedNonIndexArray.ok) {
    assert.equal(representedNonIndexArray.code, 'invalid-application-snapshot')
    assert.equal(isDeeplyFrozen(representedNonIndexArray), true)
    assert.equal('application' in representedNonIndexArray, false)
  }

  const deeplyNestedSnapshot = structuredClone(
    validSnapshot.snapshot,
  ) as unknown as MutableRecord
  let deeplyNestedSnapshotValue: MutableRecord = {}
  for (let depth = 0; depth < 300; depth += 1) {
    deeplyNestedSnapshotValue = { child: deeplyNestedSnapshotValue }
  }
  deeplyNestedSnapshot.hostile = deeplyNestedSnapshotValue
  const representedDeepSnapshot = representCaseInsertPresetApplicationSnapshot({
    sessionId: session.id,
    project: session.project,
    snapshot: deeplyNestedSnapshot,
  })
  assert.equal(representedDeepSnapshot.ok, false)
  if (!representedDeepSnapshot.ok) {
    assert.equal(representedDeepSnapshot.code, 'invalid-application-snapshot')
    assert.equal(isDeeplyFrozen(representedDeepSnapshot), true)
    assert.equal('application' in representedDeepSnapshot, false)
  }

  const mutableInput = structuredClone(validInput)
  const detached = captureCaseInsertPresetSessionApplication(mutableInput)
  assert.equal(detached.ok, true)
  if (!detached.ok) throw new Error(detached.detail)
  const detachedBeforeMutation = structuredClone(detached.application)
  mutableInput.project.title = 'Caller mutation after capture'
  mutableInput.application.applicationStateIdentity = 'caller mutation'
  assert.deepEqual(detached.application, detachedBeforeMutation)
  assert.equal(Object.isFrozen(mutableInput.project), false)
  assert.equal(Object.isFrozen(mutableInput.application), false)

  const badState = structuredClone(state) as unknown as MutableRecord
  const badSession = badState.activeSession as MutableRecord
  badSession.caseInsertPresetApplication = wrongIdentity
  assert.throws(
    () => captureApplicationLifecycleState(
      badState as unknown as ApplicationLifecycleState,
    ),
    /Case preset application is invalid/,
  )
})

test('Case editor synchronization splits content and application revisions without detaching', () => {
  const { state: attached } = createAttachedState()
  const session = requireCaseSession(attached)
  const editedProject = structuredClone(
    session.project,
  ) as unknown as SavedCaseInsertProject
  editedProject.caseInsert.templates.cover.background.layout.x += 0.01

  const edited = replaceActiveProjectContent(attached, editedProject)
  const editedSession = requireCaseSession(edited)
  assert.equal(editedSession.revision, session.revision + 1)
  assert.equal(
    editedSession.caseInsertPresetApplication.applicationRevision,
    session.caseInsertPresetApplication.applicationRevision + 1,
  )
  assert.equal(
    editedSession.caseInsertPresetApplication.snapshotIdentity.projectRevision,
    editedSession.caseInsertPresetApplication.applicationRevision,
  )
  assert.deepEqual(
    editedSession.caseInsertPresetApplication.attachment,
    session.caseInsertPresetApplication.attachment,
  )
  assert.equal(
    editedSession.caseInsertPresetApplication.attachment.status,
    'attached',
  )
  assert.notEqual(
    editedSession.caseInsertPresetApplication.applicationStateIdentity,
    session.caseInsertPresetApplication.applicationStateIdentity,
  )
  assert.equal(
    applicationLifecycleStatesAreSemanticallyEqual(attached, edited),
    false,
  )
  assert.equal(selectIsActiveProjectDirty(edited), true)
  assert.equal(Object.isFrozen(editedProject), false)

  const outsideAggregate = structuredClone(
    session.project,
  ) as unknown as SavedCaseInsertProject
  outsideAggregate.title = 'Changed project title only'
  outsideAggregate.game.manualTitle = 'Changed project title only'
  const titleChanged = replaceActiveProjectContent(attached, outsideAggregate)
  const titleSession = requireCaseSession(titleChanged)
  assert.equal(titleSession.revision, session.revision + 1)
  assert.equal(
    titleSession.caseInsertPresetApplication,
    session.caseInsertPresetApplication,
  )
  assert.equal(
    titleSession.caseInsertPresetApplication.applicationRevision,
    session.caseInsertPresetApplication.applicationRevision,
  )

  const canonicalNoOp = replaceActiveProjectContent(attached, {
    ...session.project,
    savedAt: '2035-01-01T00:00:00.000Z',
    editor: { activeCaseInsertTemplatePane: 'tray' },
  } as unknown as SavedCaseInsertProject)
  assert.equal(canonicalNoOp, attached)

  let getterCalls = 0
  const hostileSynchronization = Object.create(null) as MutableRecord
  Object.defineProperties(hostileSynchronization, {
    sessionId: { enumerable: true, value: session.id },
    kind: { enumerable: true, value: 'caseInsert' },
    project: {
      enumerable: true,
      get() {
        getterCalls += 1
        return editedProject
      },
    },
  })
  assert.equal(synchronizeActiveProjectContent(
    attached,
    hostileSynchronization as unknown as Parameters<
      typeof synchronizeActiveProjectContent
    >[1],
  ), attached)
  assert.equal(getterCalls, 0)

  const cyclicProject = structuredClone(session.project) as MutableRecord
  cyclicProject.cycle = cyclicProject
  const accessorProject = structuredClone(
    session.project,
  ) as unknown as SavedCaseInsertProject
  let projectGetterCalls = 0
  Object.defineProperty(
    accessorProject.caseInsert.templates.cover.background.layout,
    'x',
    {
      enumerable: true,
      get() {
        projectGetterCalls += 1
        return 0
      },
    },
  )
  const thenableProject = structuredClone(session.project) as MutableRecord
  thenableProject.hostile = { then() { return undefined } }
  const mutableCollectionProject = structuredClone(
    session.project,
  ) as MutableRecord
  mutableCollectionProject.hostile = new Set()
  const functionProject = structuredClone(session.project) as MutableRecord
  functionProject.hostile = () => undefined
  const customPrototypeProject = Object.create({ inherited: true }) as
    MutableRecord
  Object.assign(customPrototypeProject, structuredClone(session.project))

  for (const project of [
    cyclicProject,
    accessorProject,
    thenableProject,
    mutableCollectionProject,
    functionProject,
    customPrototypeProject,
  ]) {
    assert.equal(synchronizeActiveProjectContent(attached, {
      sessionId: session.id,
      kind: 'caseInsert',
      project: project as unknown as SavedCaseInsertProject,
    }), attached)
  }
  for (const input of [null, 7, [], Promise.resolve()]) {
    assert.equal(synchronizeActiveProjectContent(
      attached,
      input as unknown as Parameters<typeof synchronizeActiveProjectContent>[1],
    ), attached)
  }
  assert.equal(projectGetterCalls, 0)
  assert.equal(requireCaseSession(attached).revision, session.revision)
  assert.equal(
    requireCaseSession(attached).caseInsertPresetApplication
      .applicationRevision,
    session.caseInsertPresetApplication.applicationRevision,
  )
})

test('lifecycle equality observes attachment and application revision while dirty and save projection do not', () => {
  const { fixture, project, state: attached } = createAttachedState()
  const attachedSession = requireCaseSession(attached)
  assert.equal(selectIsActiveProjectDirty(attached), false)

  const equivalent = captureApplicationLifecycleState(structuredClone(attached))
  assert.equal(
    applicationLifecycleStatesAreSemanticallyEqual(attached, equivalent),
    true,
  )

  const unattachedSameRevisionSnapshot = applicationSnapshotAtRevision(
    attachedSession,
    attachedSession.caseInsertPresetApplication.applicationRevision,
    createCaseInsertPresetUnattachedState(),
  )
  const unattachedSameRevision = representCaseInsertPresetApplicationSnapshot({
    sessionId: attachedSession.id,
    project: attachedSession.project,
    snapshot: unattachedSameRevisionSnapshot,
  })
  assert.equal(unattachedSameRevision.ok, true)
  if (!unattachedSameRevision.ok) throw new Error(unattachedSameRevision.detail)
  const attachmentOnlyState = captureApplicationLifecycleState({
    ...attached,
    activeSession: {
      ...attachedSession,
      caseInsertPresetApplication: unattachedSameRevision.application,
    },
  })
  assert.equal(
    applicationLifecycleStatesAreSemanticallyEqual(attached, attachmentOnlyState),
    false,
  )
  assert.notEqual(
    requireCaseSession(attachmentOnlyState).caseInsertPresetApplication
      .applicationStateIdentity,
    attachedSession.caseInsertPresetApplication.applicationStateIdentity,
  )
  assert.equal(selectIsActiveProjectDirty(attachmentOnlyState), false)

  const revisionOnlySnapshot = applicationSnapshotAtRevision(
    attachedSession,
    attachedSession.caseInsertPresetApplication.applicationRevision + 1,
    attachedSession.caseInsertPresetApplication.attachment,
  )
  const revisionOnly = representCaseInsertPresetApplicationSnapshot({
    sessionId: attachedSession.id,
    project: attachedSession.project,
    snapshot: revisionOnlySnapshot,
  })
  assert.equal(revisionOnly.ok, true)
  if (!revisionOnly.ok) throw new Error(revisionOnly.detail)
  const revisionOnlyState = captureApplicationLifecycleState({
    ...attached,
    activeSession: {
      ...attachedSession,
      caseInsertPresetApplication: revisionOnly.application,
    },
  })
  assert.equal(
    applicationLifecycleStatesAreSemanticallyEqual(attached, revisionOnlyState),
    false,
  )
  assert.notEqual(
    requireCaseSession(revisionOnlyState).caseInsertPresetApplication
      .applicationStateIdentity,
    attachedSession.caseInsertPresetApplication.applicationStateIdentity,
  )
  assert.equal(selectIsActiveProjectDirty(revisionOnlyState), false)

  const serializedProject = JSON.stringify(attachedSession.project)
  for (const name of [
    'caseInsertPresetApplication',
    'applicationRevision',
    'applicationStateIdentity',
    'attachmentIdentity',
  ]) {
    assert.equal(serializedProject.includes(name), false)
  }
  assert.equal(attachedSession.project.schemaVersion, '0.3.0')

  const reopened = createLoadedProjectSession({
    sessionId: 'reopened-without-inference',
    currentPath: 'C:\\projects\\reopened.sbls',
    persistenceFormat: 'sbls-package-v1',
    project: JSON.parse(JSON.stringify(project)) as SavedCaseInsertProject,
  })
  const reopenedSession = requireCaseSession(reopened)
  assert.equal(reopenedSession.caseInsertPresetApplication.attachment.status,
    'unattached')
  assert.equal(reopenedSession.caseInsertPresetApplication.applicationRevision, 0)
  assert.equal(fixture.firstApplication.attachment.status, 'attached')
})

test('store equality retains an aggregate-unchanged attachment and revision change', () => {
  const { state: attached } = createAttachedState()
  const session = requireCaseSession(attached)
  const detachShapedSnapshot = applicationSnapshotAtRevision(
    session,
    session.caseInsertPresetApplication.applicationRevision + 1,
    createCaseInsertPresetUnattachedState(),
  )
  const represented = representCaseInsertPresetApplicationSnapshot({
    sessionId: session.id,
    project: session.project,
    snapshot: detachShapedSnapshot,
  })
  assert.equal(represented.ok, true)
  if (!represented.ok) throw new Error(represented.detail)
  const detachShapedState = captureApplicationLifecycleState({
    ...attached,
    activeSession: {
      ...session,
      caseInsertPresetApplication: represented.application,
    },
  })

  assert.equal(requireCaseSession(detachShapedState).revision, session.revision)
  assert.deepEqual(
    requireCaseSession(detachShapedState).project,
    session.project,
  )
  assert.equal(selectIsActiveProjectDirty(attached), false)
  assert.equal(selectIsActiveProjectDirty(detachShapedState), false)
  assert.equal(
    applicationLifecycleStatesAreSemanticallyEqual(attached, detachShapedState),
    false,
  )

  const store = createApplicationLifecycleStateStore({ initialState: attached })
  let publications = 0
  store.subscribe(() => publications += 1)
  const equivalentState = captureApplicationLifecycleState(
    structuredClone(attached),
  )
  const noOp = store.commitTransition(0, () => equivalentState)
  assert.equal(noOp.status, 'no-op')
  assert.equal(noOp.snapshot.generation, 0)
  assert.equal(publications, 0)
  const committed = store.commitTransition(0, () => detachShapedState)
  assert.equal(committed.status, 'committed')
  assert.equal(committed.snapshot.generation, 1)
  assert.equal(publications, 1)
})

test('exact Apply, Reapply, and unchanged-aggregate Detach successors are representable without lifecycle installation', () => {
  const fixture = buildCaseInsertPresetApplicationAdoptionFixture(
    'lifecycle-successor-session',
  )
  const transitions = [
    transitionCaseInsertPresetApplicationAdoption({
      kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
      formatVersion: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
      operation: 'apply',
      current: fixture.sourceApplication,
      evidence: fixture.applyEvidence,
    }),
    transitionCaseInsertPresetApplicationAdoption({
      kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
      formatVersion: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
      operation: 'reapply',
      current: fixture.firstApplication,
      evidence: fixture.reapplyEvidence,
    }),
    transitionCaseInsertPresetApplicationAdoption({
      kind: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_KIND,
      formatVersion: CASE_INSERT_PRESET_APPLICATION_ADOPTION_TRANSITION_VERSION,
      operation: 'detach',
      current: fixture.firstApplication,
      evidence: fixture.detachEvidence,
    }),
  ]

  for (const transition of transitions) {
    assert.equal(transition.ok, true)
    if (!transition.ok) throw new Error(transition.code)
    const project = caseProjectForApplication(transition.state)
    const represented = representCaseInsertPresetApplicationSnapshot({
      sessionId: transition.state.snapshot.identity.sessionId,
      project,
      snapshot: transition.state,
    })
    assert.equal(represented.ok, true)
    if (!represented.ok) throw new Error(represented.detail)
    assert.equal(
      represented.application.applicationRevision,
      transition.state.snapshot.identity.projectRevision,
    )
    const projected = projectCaseInsertPresetSessionApplicationSnapshot({
      sessionId: transition.state.snapshot.identity.sessionId,
      project,
      application: represented.application,
    })
    assert.equal(projected.ok, true)
    if (!projected.ok) throw new Error(projected.detail)
    assert.deepEqual(projected.snapshot, transition.state)
    assert.deepEqual(
      Object.keys(represented.application).sort(),
      CASE_APPLICATION_KEYS,
    )
    for (const forbidden of [
      'receipt', 'evidence', 'transitionResult', 'adoptionIdentity',
    ]) {
      assert.equal(forbidden in represented.application, false)
    }
    // This receipt belongs to the already-merged pure transition. Merely
    // representing its successor performs no lifecycle adoption.
    assert.equal(transition.receipt.applicationAdoptionStatus, 'adopted')
    const consumedEvidence = transition.operation === 'apply'
      ? fixture.applyEvidence
      : transition.operation === 'reapply'
        ? fixture.reapplyEvidence
        : fixture.detachEvidence
    assert.equal(consumedEvidence.applicationAdoptionStatus, 'not-adopted')
  }

  const detach = transitions[2]!
  assert.equal(detach.ok, true)
  if (!detach.ok) throw new Error(detach.code)
  assert.deepEqual(
    detach.state.snapshot.caseInsert,
    fixture.firstApplication.snapshot.caseInsert,
  )
})

test('lifecycle model sources call no preset operation or runtime owner', () => {
  const sources = [
    './caseInsertPresetSessionApplication.ts',
    './projectSession.ts',
    './applicationLifecycleStateStore.ts',
  ].map((path) => ({
    path,
    source: readFileSync(new URL(path, import.meta.url), 'utf8'),
  }))
  const forbiddenPatterns = [
    /caseInsertPresetApplyPlanning/,
    /caseInsertPresetApplyTransition/,
    /caseInsertPresetReapplyPlanning/,
    /caseInsertPresetReapplyTransition/,
    /caseInsertPresetDetachPlanning/,
    /caseInsertPresetDetachTransition/,
    /caseInsertPresetApplicationAdoptionTransition/,
    /detectCaseInsertPresetCustomization/,
    /resolveCaseInsertPresetAssignments/,
    /evaluateCaseInsertPresetCompatibility/,
    /CASE_INSERT_PRESET_CATALOG/,
    /from ['"]react['"]/,
    /\b(?:document|window)\./,
    /from ['"].*(?:renderer|export)[/'"]/,
    /from ['"](?:node:fs|fs)['"]/,
    /from ['"].*(?:projectSchema|migration|projectPackage)[/'"]/,
    /\b(?:fetch|invoke|listen|emit|writeFile|localStorage|sessionStorage)\s*\(/,
    /tauri/i,
  ]
  for (const { path, source } of sources) {
    for (const forbidden of forbiddenPatterns) {
      assert.doesNotMatch(source, forbidden, `${path}: ${forbidden}`)
    }
  }

  for (const path of [
    '../app/applicationLifecycleRuntime.ts',
    './applicationLifecycleCompositionRoot.ts',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /representCaseInsertPresetApplicationSnapshot/)
    assert.doesNotMatch(source, /transitionCaseInsertPresetApplicationAdoption/)
    assert.doesNotMatch(source, /caseInsertPresetConfigurationAdoptionModel/)
  }
})
