import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createEmptyApplicationLifecycleState,
  createLoadedProjectSession,
  createNewProjectSession,
  hasEligibleSblsPath,
  selectIsActiveProjectDirty,
  type ApplicationLifecycleState,
  type ProjectPersistenceFormat,
} from '../lifecycle/projectSession.ts'
import {
  type ProjectFileCommandSuccess,
} from '../tauri/binaryProjectFile.ts'
import {
  createProjectFileCommandFailure,
} from '../tauri/projectFileFailure.ts'
import type { ProjectPackageWritePort } from '../tauri/projectPackageWrite.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import type { SavedDiscProject, SavedProject } from '../project/projectTypes.ts'
import {
  createApplicationProjectSaveCommandOwners,
  getDefaultPackageFileName,
  type ApplicationProjectSaveRuntimeDependencies,
} from './appProjectSaveCommand.ts'

function discProject(
  title = 'Save Disc',
  savedAt = '2026-07-29T00:00:00.000Z',
): SavedDiscProject {
  return {
    schemaVersion: '0.2.0',
    projectType: 'disc',
    title,
    savedAt,
    game: { manualTitle: title, selectedSteamGame: null },
    template: {
      type: 'disc',
      variant: 'standardPrintableDisc',
      customDimensions: null,
    },
    steamBackupLogo: { placement: 'top' },
    background: {
      scale: 1,
      offset: { x: 0, y: 0 },
      imageDataUrl: null,
      note: 'package save fixture',
    },
  }
}

function stateFor(
  project: SavedProject,
  format: ProjectPersistenceFormat | null,
  path: string | null,
): ApplicationLifecycleState {
  return format === null || path === null
    ? createNewProjectSession({ sessionId: 'stable-session', project })
    : createLoadedProjectSession({
        sessionId: 'stable-session',
        project,
        currentPath: path,
        persistenceFormat: format,
      })
}

type WriteInput = Parameters<ProjectPackageWritePort['encodeAndWrite']>[0]

function createHarness(options: Readonly<{
  state: ApplicationLifecycleState
  currentProject?: SavedProject
  dialogResult?: string | null
  write?: (input: WriteInput) => Promise<ProjectFileCommandSuccess>
}>) {
  let currentProject = options.currentProject ??
    options.state.activeSession!.project as SavedProject
  const dialogCalls: Array<Parameters<
    ApplicationProjectSaveRuntimeDependencies['saveDialog']
  >[0]> = []
  const writeCalls: WriteInput[] = []
  const dependencies: ApplicationProjectSaveRuntimeDependencies = {
    captureCurrentProject: () => currentProject,
    saveDialog: async (dialogOptions) => {
      dialogCalls.push(dialogOptions)
      return options.dialogResult ?? null
    },
    packageWrite: {
      async encodeAndWrite(input) {
        writeCalls.push(input)
        return options.write
          ? options.write(input)
          : Object.freeze({ status: 'success' })
      },
    },
  }
  const owners = createApplicationProjectSaveCommandOwners(() => dependencies)
  const root = createApplicationLifecycleCompositionRoot({
    initialState: options.state,
    ports: {
      saveProject: owners.saveProject,
      saveProjectAs: owners.saveProjectAs,
    },
  })
  return {
    root,
    dialogCalls,
    writeCalls,
    setCurrentProject(project: SavedProject) {
      currentProject = project
    },
  }
}

test('Save routing uses a direct write only for truthful package sessions', async () => {
  const cases = [
    { format: null, path: null, dialog: 1, legacy: null },
    { format: 'legacy-json', path: 'legacy.json', dialog: 1, legacy: 'legacy.json' },
    {
      format: 'legacy-json',
      path: 'legacy.sbls.json',
      dialog: 1,
      legacy: 'legacy.sbls.json',
    },
    {
      format: 'legacy-json',
      path: 'legacy.sbls',
      dialog: 1,
      legacy: 'legacy.sbls',
    },
    {
      format: 'sbls-package-v1',
      path: null,
      dialog: 1,
      legacy: null,
    },
    {
      format: 'sbls-package-v1',
      path: 'wrong.json',
      dialog: 1,
      legacy: null,
    },
    {
      format: 'sbls-package-v1',
      path: 'direct.sbls',
      dialog: 0,
      legacy: null,
    },
    {
      format: 'sbls-package-v1',
      path: 'mixed.SbLs',
      dialog: 0,
      legacy: null,
    },
  ] as const

  for (const item of cases) {
    const harness = createHarness({
      state: stateFor(discProject(), item.format, item.path),
      dialogResult: 'converted.sbls',
    })
    const result = await harness.root.dispatch('project.save')
    assert.equal(result.disposition, 'executed')
    assert.equal(harness.dialogCalls.length, item.dialog)
    assert.equal(harness.writeCalls.length, 1)
    assert.equal(
      harness.writeCalls[0].destinationPath,
      item.dialog ? 'converted.sbls' : item.path,
    )
    assert.equal(harness.writeCalls[0].legacySourcePath, item.legacy)
    assert.equal(harness.root.getLifecycleState().activeSession?.id, 'stable-session')
    assert.equal(
      harness.root.getLifecycleState().activeSession?.persistenceFormat,
      'sbls-package-v1',
    )
  }
})

test('Save and Save As are unavailable without an active session', async () => {
  const harness = createHarness({
    state: createEmptyApplicationLifecycleState(),
    currentProject: discProject(),
  })
  for (const commandId of ['project.save', 'project.save-as']) {
    const result = await harness.root.dispatch(commandId)
    assert.equal(result.disposition, 'not-executed')
    assert.equal(harness.dialogCalls.length, 0)
    assert.equal(harness.writeCalls.length, 0)
  }
})

test('Save As exposes only .sbls and exact kind-specific default names', async () => {
  assert.equal(getDefaultPackageFileName('disc'), 'steam-backup-label.sbls')
  assert.equal(
    getDefaultPackageFileName('caseInsert'),
    'steam-backup-case-insert.sbls',
  )
  for (const project of [
    discProject(),
    createBlankJewelCaseSavedProject('Save Case'),
  ]) {
    const harness = createHarness({
      state: stateFor(project, null, null),
      dialogResult: 'chosen.sbls',
    })
    await harness.root.dispatch('project.save-as')
    assert.deepEqual(harness.dialogCalls[0].filters, [{
      name: 'Steam Backup Label Studio Package',
      extensions: ['sbls'],
    }])
    assert.equal(harness.dialogCalls[0].defaultPath.endsWith('.sbls'), true)
  }
})

test('wrong suffix and cancellation perform no write or lifecycle adoption', async () => {
  for (const dialogResult of ['chosen.json', 'chosen.sbls.json', null]) {
    const initial = stateFor(discProject(), 'legacy-json', 'legacy.json')
    const harness = createHarness({ state: initial, dialogResult })
    const before = harness.root.getStateSnapshot()
    const result = await harness.root.dispatch('project.save-as')

    assert.equal(result.disposition, 'executed')
    assert.equal(harness.writeCalls.length, 0)
    assert.equal(harness.root.getStateSnapshot(), before)
    assert.equal(
      result.disposition === 'executed' ? result.result.status : null,
      dialogResult === null ? 'cancelled' : 'failure',
    )
  }
})

test('a mismatched editor aggregate is rejected before package writing', async () => {
  const initial = stateFor(
    discProject('Authorized Disc'),
    'sbls-package-v1',
    'authorized.sbls',
  )
  const harness = createHarness({
    state: initial,
    currentProject: createBlankJewelCaseSavedProject('Wrong Case'),
  })
  const before = harness.root.getStateSnapshot()
  const result = await harness.root.dispatch('project.save')

  assert.equal(harness.writeCalls.length, 0)
  assert.equal(harness.root.getStateSnapshot(), before)
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'failure')
    if (result.result.status === 'failure') {
      assert.equal(result.result.error.code, 'project.save-stale-session')
    }
  }
})

test('a replacement editor aggregate after commit cannot adopt the written baseline', async () => {
  let resolveWrite!: () => void
  const writeGate = new Promise<void>((resolve) => {
    resolveWrite = resolve
  })
  const initial = stateFor(
    discProject('Authorized Disc'),
    'sbls-package-v1',
    'authorized.sbls',
  )
  const harness = createHarness({
    state: initial,
    write: async () => {
      await writeGate
      return { status: 'success' }
    },
  })
  const before = harness.root.getStateSnapshot()
  const save = harness.root.dispatch('project.save')
  await new Promise((resolve) => setImmediate(resolve))
  harness.setCurrentProject(createBlankJewelCaseSavedProject('Replacement Case'))
  resolveWrite()
  const result = await save

  assert.equal(harness.writeCalls.length, 1)
  assert.equal(harness.root.getStateSnapshot(), before)
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'failure')
    if (result.result.status === 'failure') {
      assert.equal(result.result.error.code, 'project.save-stale-session')
    }
  }
})

test('successful Save As adopts path, format, and exact written baseline after commit', async () => {
  let resolveWrite!: () => void
  const writeGate = new Promise<void>((resolve) => {
    resolveWrite = resolve
  })
  const written = discProject('Written R')
  const harness = createHarness({
    state: stateFor(discProject('Legacy'), 'legacy-json', 'legacy.json'),
    currentProject: written,
    dialogResult: 'converted.SBLS',
    write: async () => {
      await writeGate
      return { status: 'success' }
    },
  })
  const save = harness.root.dispatch('project.save-as')
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(
    harness.root.getLifecycleState().activeSession?.currentPath,
    'legacy.json',
  )
  assert.equal(
    harness.root.getLifecycleState().activeSession?.persistenceFormat,
    'legacy-json',
  )

  resolveWrite()
  await save
  const session = harness.root.getLifecycleState().activeSession!
  assert.equal(session.id, 'stable-session')
  assert.equal(session.currentPath, 'converted.SBLS')
  assert.equal(session.persistenceFormat, 'sbls-package-v1')
  assert.deepEqual(session.cleanBaseline?.exactSnapshot, session.project)
  assert.equal(selectIsActiveProjectDirty(harness.root.getLifecycleState()), false)
})

test('an edit made while snapshot R writes remains current and dirty', async () => {
  let resolveWrite!: () => void
  const writeGate = new Promise<void>((resolve) => {
    resolveWrite = resolve
  })
  const writtenR = discProject('Revision R')
  const latestR1 = discProject('Revision R+1', '2026-07-29T00:01:00.000Z')
  const harness = createHarness({
    state: stateFor(writtenR, 'sbls-package-v1', 'direct.sbls'),
    currentProject: writtenR,
    write: async () => {
      await writeGate
      return { status: 'success' }
    },
  })

  const first = harness.root.dispatch('project.save')
  await new Promise((resolve) => setImmediate(resolve))
  harness.setCurrentProject(latestR1)
  const repeated = await harness.root.dispatch('project.save')
  assert.equal(repeated.disposition, 'not-executed')
  assert.equal(harness.writeCalls.length, 1)
  resolveWrite()
  await first

  const session = harness.root.getLifecycleState().activeSession!
  assert.equal(session.project.title, 'Revision R+1')
  assert.equal(session.cleanBaseline?.exactSnapshot.title, 'Revision R')
  assert.equal(session.revision, 1)
  assert.equal(selectIsActiveProjectDirty(harness.root.getLifecycleState()), true)
})

test('failed writes preserve the complete prior session and safe taxonomy', async () => {
  const initial = stateFor(
    discProject('Failure Baseline'),
    'sbls-package-v1',
    'existing.sbls',
  )
  const expected = createProjectFileCommandFailure(
    'project.atomic-write.replace-destination',
    'permission-denied',
    'project.atomic-write.replace-destination',
  )
  const harness = createHarness({
    state: initial,
    write: async () => {
      throw expected
    },
  })
  const before = harness.root.getStateSnapshot()
  const result = await harness.root.dispatch('project.save')
  assert.equal(harness.root.getStateSnapshot(), before)
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'failure')
    if (result.result.status === 'failure') {
      assert.equal(
        result.result.error.code,
        'project.atomic-write.replace-destination',
      )
      assert.equal(result.result.error.cause, expected)
    }
  }
})

test('ASCII case-insensitive .sbls eligibility is exact and never rewrites names', () => {
  for (const path of [
    'a.sbls',
    'a.SBLS',
    'folder/name.SbLs',
    'C:\\Project\\name.sBlS',
  ]) assert.equal(hasEligibleSblsPath(path), true, path)
  for (const path of [
    null,
    '',
    '.sbls',
    'name.sbls.json',
    'name.sbls ',
    'name',
  ]) assert.equal(hasEligibleSblsPath(path), false, String(path))
})
