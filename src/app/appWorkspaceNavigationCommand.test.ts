import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createApplicationLifecycleCompositionRoot,
} from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  createLoadedProjectSession,
  createNewProjectSession,
  replaceActiveProjectContent,
  selectIsActiveProjectDirty,
} from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import {
  createApplicationWorkspaceNavigationCommandOwners,
} from './appWorkspaceNavigationCommand.ts'
import type {
  ApplicationWorkspaceDestination,
} from './appWorkspaceNavigationApply.ts'

test('Return Home and Resume retain one exact clean Case session and route', async () => {
  const destinations: ApplicationWorkspaceDestination[] = []
  const owners = createApplicationWorkspaceNavigationCommandOwners(() => ({
    prepareWorkspaceApply(destination) {
      return {
        commitLifecycleAndApply(commitLifecycle) {
          const committed = commitLifecycle()
          if (committed.status === 'committed') destinations.push(destination)
          return committed
        },
      }
    },
  }))
  const initial = createLoadedProjectSession({
    sessionId: 'retained-case',
    project: createBlankJewelCaseSavedProject(),
    currentPath: 'C:\\projects\\retained-case.sbls',
    persistenceFormat: 'sbls-package-v1',
    lastEditorRoute: { workspace: 'caseInsert', surface: 'spine' },
  })
  const root = createApplicationLifecycleCompositionRoot({
    initialState: initial,
    ports: {
      returnHome: owners.returnHome,
      resumeProject: owners.resumeProject,
    },
  })

  const returned = await root.dispatch('workspace.return-home')
  assert.equal(returned.disposition, 'executed')
  assert.equal(root.getLifecycleState().visibleWorkspace, 'home')
  assert.deepEqual(root.getLifecycleState().activeSession, initial.activeSession)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), false)
  assert.deepEqual(destinations, [{ workspace: 'home' }])
  const repeatedReturn = await root.dispatch('workspace.return-home')
  assert.deepEqual(repeatedReturn, {
    disposition: 'not-executed',
    reason: 'disabled',
    commandId: 'workspace.return-home',
    userMessage: undefined,
  })

  const resumed = await root.dispatch('project.resume')
  assert.equal(resumed.disposition, 'executed')
  assert.equal(root.getLifecycleState().visibleWorkspace, 'caseInsert')
  assert.deepEqual(root.getLifecycleState().activeSession, initial.activeSession)
  assert.deepEqual(destinations, [
    { workspace: 'home' },
    { workspace: 'caseInsert', surface: 'spine' },
  ])
  root.dispose()
})

test('navigation owners fail safely without React dependencies', async () => {
  const owners = createApplicationWorkspaceNavigationCommandOwners(() => null)
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'retained-disc',
      project: {
        schemaVersion: '0.2.0',
        projectType: 'disc',
        title: 'Retained Disc',
        savedAt: '2026-07-30T12:00:00.000Z',
        game: { manualTitle: 'Retained Disc', selectedSteamGame: null },
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
        },
      },
      currentPath: 'retained-disc.sbls',
      persistenceFormat: 'sbls-package-v1',
    }),
    ports: { returnHome: owners.returnHome, resumeProject: owners.resumeProject },
  })
  const before = root.getLifecycleState()
  const result = await root.dispatch('workspace.return-home')
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') {
    assert.equal(result.result.status, 'failure')
  }
  assert.equal(root.getLifecycleState(), before)
  root.dispose()
})

test('Return and Resume preserve clean, dirty, and pathless Disc/Case sessions across every exact route', async () => {
  const scenarios = [
    { kind: 'disc' as const, state: 'clean' as const },
    { kind: 'disc' as const, state: 'dirty' as const },
    { kind: 'disc' as const, state: 'pathless' as const },
    { kind: 'caseInsert' as const, state: 'clean' as const, surface: 'front' as const },
    { kind: 'caseInsert' as const, state: 'dirty' as const, surface: 'back' as const },
    { kind: 'caseInsert' as const, state: 'pathless' as const, surface: 'spine' as const },
  ]

  for (const scenario of scenarios) {
    const project = scenario.kind === 'disc'
      ? createBlankDiscSavedProject()
      : createBlankJewelCaseSavedProject()
    const sessionId = `${scenario.kind}-${scenario.state}`
    const route = scenario.kind === 'disc'
      ? { workspace: 'disc' as const }
      : { workspace: 'caseInsert' as const, surface: scenario.surface }
    let initial = scenario.state === 'pathless'
      ? createNewProjectSession({ sessionId, project, lastEditorRoute: route })
      : createLoadedProjectSession({
          sessionId,
          project,
          currentPath: `C:\\projects\\${sessionId}.sbls`,
          persistenceFormat: 'sbls-package-v1',
          lastEditorRoute: route,
        })
    if (scenario.state === 'dirty') {
      initial = replaceActiveProjectContent(initial, {
        ...project,
        title: `${project.title} edited`,
        game: { ...project.game, manualTitle: `${project.title} edited` },
      })
    }
    const destinations: ApplicationWorkspaceDestination[] = []
    const owners = createApplicationWorkspaceNavigationCommandOwners(() => ({
      prepareWorkspaceApply(destination) {
        return {
          commitLifecycleAndApply(commitLifecycle) {
            const result = commitLifecycle()
            if (result.status === 'committed') destinations.push(destination)
            return result
          },
        }
      },
    }))
    const root = createApplicationLifecycleCompositionRoot({
      initialState: initial,
      ports: {
        returnHome: owners.returnHome,
        resumeProject: owners.resumeProject,
      },
    })
    const before = root.getLifecycleState()
    const expectedDirty = selectIsActiveProjectDirty(before)

    const returned = await root.dispatch('workspace.return-home')
    assert.equal(returned.disposition, 'executed', sessionId)
    const home = root.getLifecycleState()
    assert.equal(home.visibleWorkspace, 'home', sessionId)
    assert.deepEqual(home.activeSession, before.activeSession, sessionId)
    assert.equal(selectIsActiveProjectDirty(home), expectedDirty, sessionId)

    const resumed = await root.dispatch('project.resume')
    assert.equal(resumed.disposition, 'executed', sessionId)
    const editor = root.getLifecycleState()
    assert.equal(editor.visibleWorkspace, scenario.kind, sessionId)
    assert.deepEqual(editor.activeSession, before.activeSession, sessionId)
    assert.deepEqual(editor.activeSession?.lastEditorRoute, route, sessionId)
    assert.equal(selectIsActiveProjectDirty(editor), expectedDirty, sessionId)
    assert.deepEqual(destinations, [{ workspace: 'home' }, route], sessionId)
    root.dispose()
  }
})
