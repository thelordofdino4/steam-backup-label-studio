import assert from 'node:assert/strict'
import test from 'node:test'
import { createCaseInsertProjectSnapshot } from '../project/caseInsertProjectAdapters.ts'
import type { SavedDiscProject } from '../project/projectTypes.ts'
import {
  APPLICATION_COMMAND_IDS,
  APPLICATION_LIFECYCLE_COMMAND_IDS,
  commandSucceeded,
  type ApplicationLifecycleCommandId,
  type ApplicationCommandResult,
} from './applicationCommandTypes.ts'
import {
  createApplicationLifecycleCompositionRoot,
} from './applicationLifecycleCompositionRoot.ts'
import type {
  ApplicationLifecycleCommandContext,
  ApplicationLifecycleCommandPorts,
} from './applicationLifecycleCommandPorts.ts'
import {
  adoptSavedProjectBaseline,
  closeProjectSession,
  createLoadedProjectSession,
  createNewProjectSession,
  resumeProjectSession,
  returnProjectSessionHome,
} from './projectSession.ts'

function createDiscProject(title = 'Composition Disc'): SavedDiscProject {
  return {
    schemaVersion: '0.2.0',
    projectType: 'disc',
    title,
    savedAt: '2026-07-26T12:00:00.000Z',
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
      note: 'composition-root fixture',
    },
  }
}

function commit(
  context: ApplicationLifecycleCommandContext,
  transition: Parameters<ApplicationLifecycleCommandContext['commitState']>[1],
) {
  const result = context.commitState(
    context.stateSnapshot.generation,
    transition,
  )
  assert.equal(result.status, 'committed')
  return result
}

function implementedNoOpPorts(): ApplicationLifecycleCommandPorts {
  return {
    newDisc: {
      availability: 'implemented',
      executeNewDisc: () => commandSucceeded(undefined),
    },
    newCase: {
      availability: 'implemented',
      executeNewCase: () => commandSucceeded(undefined),
    },
    openProject: {
      availability: 'implemented',
      executeOpenProject: () => commandSucceeded(undefined),
    },
    saveProject: {
      availability: 'implemented',
      executeSaveProject: () => commandSucceeded(undefined),
    },
    saveProjectAs: {
      availability: 'implemented',
      executeSaveProjectAs: () => commandSucceeded(undefined),
    },
    returnHome: {
      availability: 'implemented',
      executeReturnHome: () => commandSucceeded(undefined),
    },
    resumeProject: {
      availability: 'implemented',
      executeResumeProject: () => commandSucceeded(undefined),
    },
    closeProject: {
      availability: 'implemented',
      executeCloseProject: () => commandSucceeded(undefined),
    },
    closeWindow: {
      availability: 'implemented',
      executeCloseWindow: () => commandSucceeded(undefined),
    },
    quitApplication: {
      availability: 'implemented',
      executeQuitApplication: () => commandSucceeded(undefined),
    },
  }
}

function disabledReason(
  capabilities: ReturnType<
    ReturnType<typeof createApplicationLifecycleCompositionRoot>[
      'getLifecycleCommandCapabilities'
    ]
  >,
  commandId: ApplicationLifecycleCommandId,
) {
  const capability = capabilities[commandId]
  assert.equal(capability.canExecute, false)
  return capability.canExecute ? null : capability.reasonCode
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

test('one root registers the exact catalog and separate roots own isolated state', async () => {
  const createRoot = (sessionId: string) =>
    createApplicationLifecycleCompositionRoot({
      createSessionId: () => sessionId,
      ports: {
        newDisc: {
          availability: 'implemented',
          executeNewDisc: (context) => {
            commit(context, () => createNewProjectSession({
              sessionId: context.createSessionId(),
              project: createDiscProject(sessionId),
            }))
            return commandSucceeded(undefined)
          },
        },
      },
    })

  const first = createRoot('first-session')
  const second = createRoot('second-session')

  assert.deepEqual(
    first.listRegisteredCommandIds(),
    APPLICATION_COMMAND_IDS,
  )
  assert.equal(
    first.listRegisteredCommandIds().some((id) => id.startsWith('menu.')),
    false,
  )
  assert.equal(Object.isFrozen(first.getLifecycleState()), true)
  assert.equal(Object.isFrozen(first.getStateSnapshot()), true)

  const result = await first.dispatch('project.new-disc')
  assert.equal(result.disposition, 'executed')
  assert.equal(first.getLifecycleState().activeSession?.id, 'first-session')
  assert.equal(second.getLifecycleState().activeSession, null)

  assert.deepEqual(await first.dispatch('menu.file.new-disc'), {
    disposition: 'not-executed',
    reason: 'unknown-command',
    commandId: 'menu.file.new-disc',
  })
})

test('capabilities combine H0, H1, Disc, Case, owner, and termination state', async () => {
  const ports = implementedNoOpPorts()
  const h0 = createApplicationLifecycleCompositionRoot({
    ports,
    termination: { closeWindow: 'available', quit: 'available' },
  })
  const h0Capabilities = h0.getLifecycleCommandCapabilities()
  assert.deepEqual(Object.keys(h0Capabilities), APPLICATION_LIFECYCLE_COMMAND_IDS)
  assert.equal(h0Capabilities['project.new-disc'].canExecute, true)
  assert.equal(disabledReason(h0Capabilities, 'project.save'),
    'project.no-active-session')
  assert.equal(disabledReason(h0Capabilities, 'project.resume'),
    'project.no-active-session')
  assert.equal(h0Capabilities['application.quit'].canExecute, true)

  const disc = createNewProjectSession({
    sessionId: 'disc-session',
    project: createDiscProject(),
  })
  const discRoot = createApplicationLifecycleCompositionRoot({
    initialState: disc,
    ports,
  })
  assert.equal(
    discRoot.getLifecycleCommandCapabilities()['project.save'].canExecute,
    true,
  )
  assert.equal(
    discRoot.getLifecycleCommandCapabilities()['workspace.return-home']
      .canExecute,
    true,
  )
  assert.equal(disabledReason(
    discRoot.getLifecycleCommandCapabilities(),
    'project.resume',
  ), 'workspace.editor-already-visible')

  const h1Root = createApplicationLifecycleCompositionRoot({
    initialState: returnProjectSessionHome(disc),
    ports,
  })
  assert.equal(
    h1Root.getLifecycleCommandCapabilities()['project.resume'].canExecute,
    true,
  )
  assert.equal(disabledReason(
    h1Root.getLifecycleCommandCapabilities(),
    'workspace.return-home',
  ), 'workspace.already-home')

  const caseRoot = createApplicationLifecycleCompositionRoot({
    initialState: createNewProjectSession({
      sessionId: 'case-session',
      project: createCaseInsertProjectSnapshot({
        manualGameTitle: 'Composition Case',
      }),
    }),
    ports,
  })
  assert.equal(
    caseRoot.getLifecycleCommandCapabilities()['project.save-as'].canExecute,
    true,
  )

  const missing = createApplicationLifecycleCompositionRoot()
  assert.equal(disabledReason(
    missing.getLifecycleCommandCapabilities(),
    'project.new-disc',
  ), 'application.command-owner-unimplemented')
  assert.equal(disabledReason(
    missing.getLifecycleCommandCapabilities(),
    'project.save',
  ), 'project.no-active-session')

  const unavailable = createApplicationLifecycleCompositionRoot({
    ports: { newDisc: { availability: 'unavailable' } },
  })
  assert.equal(disabledReason(
    unavailable.getLifecycleCommandCapabilities(),
    'project.new-disc',
  ), 'application.command-owner-unavailable')

  let blockedTerminationCalls = 0
  const terminationOwnerOnly = createApplicationLifecycleCompositionRoot({
    ports: {
      closeWindow: {
        availability: 'implemented',
        executeCloseWindow: () => {
          blockedTerminationCalls += 1
          return commandSucceeded(undefined)
        },
      },
    },
  })
  assert.equal(disabledReason(
    terminationOwnerOnly.getLifecycleCommandCapabilities(),
    'application.close-window',
  ), 'application.termination-not-implemented')
  assert.equal(
    (await terminationOwnerOnly.dispatch('application.close-window'))
      .disposition,
    'not-executed',
  )
  assert.equal(blockedTerminationCalls, 0)

  const terminationHandoffOnly = createApplicationLifecycleCompositionRoot({
    termination: { closeWindow: 'available', quit: 'available' },
  })
  assert.equal(disabledReason(
    terminationHandoffOnly.getLifecycleCommandCapabilities(),
    'application.close-window',
  ), 'application.command-owner-unimplemented')
})

test('every command invokes only its named port and shares root scopes and state', async () => {
  const calls: ApplicationCommandId[] = []
  let nestedOperationId: string | null = null
  let nextSessionNumber = 1
  const ports: ApplicationLifecycleCommandPorts = {
    newDisc: {
      availability: 'implemented',
      executeNewDisc: (context) => {
        calls.push('project.new-disc')
        assert.equal(Object.isFrozen(context), true)
        assert.equal(Object.isFrozen(context.stateSnapshot), true)
        commit(context, () => createNewProjectSession({
          sessionId: context.createSessionId(),
          project: createDiscProject('New Disc'),
        }))
        return commandSucceeded(undefined)
      },
    },
    newCase: {
      availability: 'implemented',
      executeNewCase: (context) => {
        calls.push('project.new-case')
        commit(context, () => createNewProjectSession({
          sessionId: context.createSessionId(),
          project: createCaseInsertProjectSnapshot({ manualGameTitle: 'New Case' }),
        }))
        return commandSucceeded(undefined)
      },
    },
    openProject: {
      availability: 'implemented',
      executeOpenProject: async (context, _input, operation) => {
        calls.push('project.open')
        assert.deepEqual(operation.rootScopes, [
          'lifecycle.transition',
          'dialog.project-file',
          'persistence.read',
        ])
        await operation.withScopes(['persistence.read'], () => {
          assert.equal(operation.ownsScope('persistence.read'), true)
          nestedOperationId = operation.id
        })
        commit(context, () => createLoadedProjectSession({
          sessionId: context.createSessionId(),
          project: createDiscProject('Loaded Disc'),
          currentPath: 'C:\\projects\\loaded.sbls.json',
          persistenceFormat: 'legacy-json',
        }))
        return commandSucceeded(undefined)
      },
    },
    saveProject: {
      availability: 'implemented',
      executeSaveProject: (context, _input, operation) => {
        calls.push('project.save')
        assert.deepEqual(operation.rootScopes, [
          'lifecycle.transition',
          'dialog.project-file',
          'persistence.write',
        ])
        commit(context, (state) => adoptSavedProjectBaseline(state, {
          acceptedSnapshot: state.activeSession!.project as SavedDiscProject,
          displayName: 'Saved Disc',
        }))
        return commandSucceeded(undefined)
      },
    },
    saveProjectAs: {
      availability: 'implemented',
      executeSaveProjectAs: (context, _input, operation) => {
        calls.push('project.save-as')
        assert.deepEqual(operation.rootScopes, [
          'lifecycle.transition',
          'dialog.project-file',
          'persistence.write',
        ])
        commit(context, (state) => adoptSavedProjectBaseline(state, {
          acceptedSnapshot: state.activeSession!.project as SavedDiscProject,
          currentPath: 'C:\\projects\\saved-as.sbls.json',
        }))
        return commandSucceeded(undefined)
      },
    },
    returnHome: {
      availability: 'implemented',
      executeReturnHome: (context) => {
        calls.push('workspace.return-home')
        commit(context, returnProjectSessionHome)
        return commandSucceeded(undefined)
      },
    },
    resumeProject: {
      availability: 'implemented',
      executeResumeProject: (context) => {
        calls.push('project.resume')
        commit(context, resumeProjectSession)
        return commandSucceeded(undefined)
      },
    },
    closeProject: {
      availability: 'implemented',
      executeCloseProject: (context) => {
        calls.push('project.close')
        commit(context, closeProjectSession)
        return commandSucceeded(undefined)
      },
    },
    closeWindow: {
      availability: 'implemented',
      executeCloseWindow: (_context, _input, operation) => {
        calls.push('application.close-window')
        assert.equal(operation.ownsScope('application.termination'), true)
        return commandSucceeded(undefined)
      },
    },
    quitApplication: {
      availability: 'implemented',
      executeQuitApplication: (_context, _input, operation) => {
        calls.push('application.quit')
        assert.equal(operation.ownsScope('application.termination'), true)
        return commandSucceeded(undefined)
      },
    },
  }
  const root = createApplicationLifecycleCompositionRoot({
    ports,
    termination: { closeWindow: 'available', quit: 'available' },
    createSessionId: () => `session-${nextSessionNumber++}`,
  })
  const observedGenerations: number[] = []
  root.subscribe((snapshot) => observedGenerations.push(snapshot.generation))

  assert.equal(disabledReason(
    root.getLifecycleCommandCapabilities(),
    'project.save',
  ), 'project.no-active-session')
  for (const commandId of [
    'project.new-disc',
    'project.new-case',
    'project.open',
    'project.save',
    'project.save-as',
    'workspace.return-home',
    'project.resume',
    'project.close',
    'application.close-window',
    'application.quit',
  ] as const) {
    const result = await root.dispatch(commandId)
    assert.equal(result.disposition, 'executed', commandId)
    if (result.disposition === 'executed') {
      assert.equal(result.result.status, 'success', commandId)
    }
  }

  assert.deepEqual(calls, APPLICATION_LIFECYCLE_COMMAND_IDS)
  assert.match(nestedOperationId ?? '', /^application-command-/)
  assert.equal(root.getLifecycleState().activeSession, null)
  assert.equal(root.getStateSnapshot().generation, 8)
  assert.deepEqual(root.getBusyState().occupiedScopes, [])
  assert.ok(observedGenerations.length > APPLICATION_LIFECYCLE_COMMAND_IDS.length)
  assert.ok(observedGenerations.every((value, index) =>
    index === 0 || value > observedGenerations[index - 1]))
})

test('dispatch reads current state and the shared coordinator projects busy conflicts', async () => {
  const gate = deferred()
  let executions = 0
  const root = createApplicationLifecycleCompositionRoot({
    ports: {
      newDisc: {
        availability: 'implemented',
        executeNewDisc: async () => {
          executions += 1
          await gate.promise
          return commandSucceeded(undefined)
        },
      },
      newCase: {
        availability: 'implemented',
        executeNewCase: () => commandSucceeded(undefined),
      },
    },
  })

  assert.equal(
    root.getLifecycleCommandCapabilities()['project.new-disc'].canExecute,
    true,
  )
  const first = root.dispatch('project.new-disc')
  assert.deepEqual(root.getBusyState().occupiedScopes, ['lifecycle.transition'])
  assert.equal(disabledReason(
    root.getLifecycleCommandCapabilities(),
    'project.new-disc',
  ), 'application.command-busy')
  assert.equal(disabledReason(
    root.getLifecycleCommandCapabilities(),
    'project.new-case',
  ), 'application.command-busy')

  const repeated = await root.dispatch('project.new-disc')
  const conflicting = await root.dispatch('project.new-case')
  assert.equal(repeated.disposition, 'not-executed')
  assert.equal(repeated.reason, 'disabled')
  assert.equal(conflicting.disposition, 'not-executed')
  assert.equal(conflicting.reason, 'disabled')
  assert.equal(executions, 1)

  gate.resolve()
  await first
  assert.deepEqual(root.getBusyState().occupiedScopes, [])
  assert.equal(
    root.getLifecycleCommandCapabilities()['project.new-case'].canExecute,
    true,
  )
})

test('thrown and typed non-success outcomes preserve state and release scopes', async () => {
  const outcomes: readonly ApplicationCommandResult<void>[] = [
    { status: 'cancelled', reason: 'operation-cancelled' },
    { status: 'declined', reason: 'replacement-not-authorized' },
    {
      status: 'failure',
      error: {
        code: 'test.failure',
        userMessage: 'Test failure.',
        recoverable: true,
      },
    },
  ]

  for (const outcome of outcomes) {
    const root = createApplicationLifecycleCompositionRoot({
      ports: {
        newDisc: {
          availability: 'implemented',
          executeNewDisc: () => outcome,
        },
      },
    })
    const before = root.getStateSnapshot()
    const result = await root.dispatch('project.new-disc')
    assert.equal(result.disposition, 'executed')
    assert.equal(root.getStateSnapshot(), before)
    assert.deepEqual(root.getBusyState().occupiedScopes, [])
  }

  const throwing = createApplicationLifecycleCompositionRoot({
    ports: {
      newDisc: {
        availability: 'implemented',
        executeNewDisc: () => {
          throw new Error('owner exploded')
        },
      },
    },
  })
  const thrownResult = await throwing.dispatch('project.new-disc')
  assert.equal(thrownResult.disposition, 'executed')
  if (thrownResult.disposition === 'executed') {
    assert.equal(thrownResult.result.status, 'failure')
    if (thrownResult.result.status === 'failure') {
      assert.equal(thrownResult.result.error.code, 'application.command-threw')
      assert.match(
        thrownResult.result.error.diagnosticMessage ?? '',
        /owner exploded/,
      )
    }
  }
  assert.deepEqual(throwing.getBusyState().occupiedScopes, [])
})

test('compare-and-swap rejects a stale second transition after one commit', async () => {
  let staleStatus: string | null = null
  const root = createApplicationLifecycleCompositionRoot({
    ports: {
      newDisc: {
        availability: 'implemented',
        executeNewDisc: (context) => {
          const expected = context.stateSnapshot.generation
          const first = context.commitState(expected, () =>
            createNewProjectSession({
              sessionId: 'cas-disc',
              project: createDiscProject('CAS Disc'),
            }))
          assert.equal(first.status, 'committed')
          staleStatus = context.commitState(expected, () =>
            createNewProjectSession({
              sessionId: 'cas-case',
              project: createCaseInsertProjectSnapshot({
                manualGameTitle: 'CAS Case',
              }),
            })).status
          return commandSucceeded(undefined)
        },
      },
    },
  })

  await root.dispatch('project.new-disc')
  assert.equal(staleStatus, 'stale')
  assert.equal(root.getLifecycleState().activeSession?.kind, 'disc')
  assert.equal(root.getStateSnapshot().generation, 1)
})

test('composition snapshots are referentially stable until a real notification', async () => {
  const root = createApplicationLifecycleCompositionRoot({
    ports: {
      newDisc: {
        availability: 'implemented',
        executeNewDisc: (context) => {
          const current = context.getCurrentStateSnapshot()
          const commit = context.commitState(current.generation, () =>
            createNewProjectSession({
              sessionId: context.createSessionId(),
              project: createDiscProject('Stable Snapshot Disc'),
            }))
          assert.equal(commit.status, 'committed')
          return commandSucceeded(undefined)
        },
      },
    },
  })

  const initial = root.getSnapshot()
  assert.equal(root.getSnapshot(), initial)
  let notifications = 0
  root.subscribe(() => notifications += 1)

  await root.dispatch('project.new-disc')

  const after = root.getSnapshot()
  assert.notEqual(after, initial)
  assert.equal(root.getSnapshot(), after)
  assert.ok(notifications > 0)
  assert.equal(after.stateGeneration, 1)
})

test('root disposal removes owned subscriptions and rejects later dispatch', async () => {
  const root = createApplicationLifecycleCompositionRoot({
    ports: implementedNoOpPorts(),
  })
  let notifications = 0
  root.subscribe(() => notifications += 1)
  root.dispose()

  await assert.rejects(
    () => root.dispatch('project.new-disc'),
    /disposed/,
  )
  assert.throws(() => root.subscribe(() => {}), /disposed/)
  assert.equal(notifications, 0)
})
