import assert from 'node:assert/strict'
import test from 'node:test'
import { createCaseInsertProjectSnapshot } from '../project/caseInsertProjectAdapters.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import type { SavedDiscProject } from '../project/projectTypes.ts'
import {
  APPLICATION_LIFECYCLE_COMMAND_IDS,
  commandSucceeded,
  type ApplicationCommandDefinition,
  type ApplicationCommandFeedbackPolicy,
  type ApplicationCommandId,
  type ApplicationCommandResult,
} from './applicationCommandTypes.ts'
import {
  ApplicationCommandDispatcher,
  ApplicationCommandRegistry,
} from './applicationCommandRegistry.ts'
import {
  CommandBusyScopeCoordinator,
} from './commandBusyScopes.ts'
import {
  getLifecycleCommandCapability,
  projectLifecycleCommandCapabilities,
  type LifecycleCommandCapabilityContext,
} from './lifecycleCommandCapabilities.ts'
import {
  createEmptyApplicationLifecycleState,
  createNewProjectSession,
} from './projectSession.ts'

const RETURN_ONLY_FEEDBACK: ApplicationCommandFeedbackPolicy = Object.freeze({
  success: 'return-only',
  cancelled: 'return-only',
  declined: 'return-only',
  failure: 'return-only',
})

function createDiscProject(): SavedDiscProject {
  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'disc',
    title: 'Command Disc',
    savedAt: '2026-07-26T12:00:00.000Z',
    game: { manualTitle: 'Command Disc', selectedSteamGame: null },
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
      note: 'command fixture',
    },
  }
}

function definition(
  id: ApplicationCommandId,
  execute: ApplicationCommandDefinition<object, unknown, string>['execute'],
  overrides: Partial<ApplicationCommandDefinition<object, unknown, string>> = {},
): ApplicationCommandDefinition<object, unknown, string> {
  return {
    id,
    canExecute: () => ({ canExecute: true }),
    acquireScopes: () => [],
    repeatPolicy: 'reject-while-busy',
    execute,
    feedbackPolicy: RETURN_ONLY_FEEDBACK,
    ...overrides,
  }
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

test('lifecycle command catalog is exact and the registry rejects duplicate IDs', () => {
  assert.deepEqual(APPLICATION_LIFECYCLE_COMMAND_IDS, [
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
  ])

  const registry = new ApplicationCommandRegistry<object>()
  const registered = definition(
    'project.open',
    () => commandSucceeded('opened'),
  )
  registry.register(registered)

  assert.equal(registry.resolve('project.open'), registered)
  assert.equal(registry.resolve('menu.file.open'), null)
  assert.throws(() => registry.register(registered), /Duplicate application command ID/)
})

test('busy scopes acquire atomically in stable order and release without leaks', () => {
  const coordinator = new CommandBusyScopeCoordinator()
  const navigation = coordinator.beginOperation({
    operationId: 'navigation',
    commandId: 'workspace.return-home',
    scopes: ['workspace.navigation'],
  })
  assert.equal(navigation.acquired, true)

  const blocked = coordinator.beginOperation({
    operationId: 'blocked',
    commandId: 'project.save',
    scopes: ['persistence.write', 'lifecycle.transition'],
  })
  assert.deepEqual(blocked, {
    acquired: false,
    conflictingScopes: ['lifecycle.transition'],
  })
  assert.deepEqual(coordinator.getState().occupiedScopes, ['workspace.navigation'])

  if (navigation.acquired) navigation.release()
  assert.deepEqual(coordinator.getState().occupiedScopes, [])

  const save = coordinator.beginOperation({
    operationId: 'save',
    commandId: 'project.save',
    scopes: ['persistence.write', 'lifecycle.transition', 'dialog.project-file'],
  })
  assert.equal(save.acquired, true)
  if (save.acquired) {
    assert.deepEqual(save.operation.rootScopes, [
      'lifecycle.transition',
      'dialog.project-file',
      'persistence.write',
    ])
    save.release()
  }
  assert.deepEqual(coordinator.getState().occupiedScopes, [])

  const presetMutation = coordinator.beginOperation({
    operationId: 'case-preset-mutation',
    commandId: 'case.layoutPreset.apply',
    scopes: ['project.mutation'],
  })
  assert.equal(presetMutation.acquired, true)
  const lifecycleWhilePresetActive = coordinator.beginOperation({
    operationId: 'lifecycle-while-preset-active',
    commandId: 'project.open',
    scopes: ['lifecycle.transition'],
  })
  assert.deepEqual(lifecycleWhilePresetActive, {
    acquired: false,
    conflictingScopes: ['lifecycle.transition'],
  })
  const secondPreset = coordinator.beginOperation({
    operationId: 'second-case-preset-mutation',
    commandId: 'case.layoutPreset.detach',
    scopes: ['project.mutation'],
  })
  assert.deepEqual(secondPreset, {
    acquired: false,
    conflictingScopes: ['project.mutation'],
  })
  if (presetMutation.acquired) presetMutation.release()
  assert.deepEqual(coordinator.getState().occupiedScopes, [])
})

test('operation tokens support nested child scopes without reacquiring the root', async () => {
  const coordinator = new CommandBusyScopeCoordinator()
  const parent = coordinator.beginOperation({
    operationId: 'parent',
    commandId: 'project.open',
    scopes: ['lifecycle.transition'],
  })
  assert.equal(parent.acquired, true)
  if (!parent.acquired) return

  await parent.operation.withScopes(
    ['persistence.write', 'lifecycle.transition'],
    () => {
      assert.equal(parent.operation.ownsScope('lifecycle.transition'), true)
      assert.equal(parent.operation.ownsScope('persistence.write'), true)
    },
  )
  assert.equal(parent.operation.ownsScope('lifecycle.transition'), true)
  assert.equal(parent.operation.ownsScope('persistence.write'), false)

  const reentrant = coordinator.beginOperation({
    operationId: 'unrelated-root',
    commandId: 'project.save',
    scopes: ['lifecycle.transition'],
  })
  assert.equal(reentrant.acquired, false)
  parent.release()
})

test('dispatcher rechecks capabilities and distinguishes unknown, disabled, and busy', async () => {
  const registry = new ApplicationCommandRegistry<object>()
  let enabled = false
  registry.register(definition(
    'project.open',
    () => commandSucceeded('opened'),
    {
      canExecute: () => enabled
        ? { canExecute: true }
        : { canExecute: false, reasonCode: 'test.disabled' },
      acquireScopes: () => ['lifecycle.transition'],
    },
  ))
  const coordinator = new CommandBusyScopeCoordinator()
  const dispatcher = new ApplicationCommandDispatcher(registry, {
    busyScopes: coordinator,
  })

  assert.deepEqual(await dispatcher.dispatch('unknown.command', {}, undefined), {
    disposition: 'not-executed',
    reason: 'unknown-command',
    commandId: 'unknown.command',
  })
  assert.equal(
    (await dispatcher.dispatch('project.open', {}, undefined)).reason,
    'disabled',
  )

  enabled = true
  const blocker = coordinator.beginOperation({
    operationId: 'blocker',
    commandId: 'project.save',
    scopes: ['lifecycle.transition'],
  })
  assert.equal(blocker.acquired, true)
  assert.equal(
    (await dispatcher.dispatch('project.open', {}, undefined)).reason,
    'busy',
  )
  if (blocker.acquired) blocker.release()

  assert.equal(
    (await dispatcher.dispatch('project.open', {}, undefined)).disposition,
    'executed',
  )
})

test('dispatcher enforces repeat policy while allowing nonconflicting commands', async () => {
  const gate = deferred()
  const registry = new ApplicationCommandRegistry<object>()
  let openExecutions = 0
  registry.register(definition(
    'project.open',
    async () => {
      openExecutions += 1
      await gate.promise
      return commandSucceeded('opened')
    },
  ))
  registry.register(definition(
    'project.new-disc',
    () => commandSucceeded('new'),
  ))
  const dispatcher = new ApplicationCommandDispatcher(registry)

  const first = dispatcher.dispatch('project.open', {}, undefined)
  const repeated = await dispatcher.dispatch('project.open', {}, undefined)
  const nonconflicting = await dispatcher.dispatch(
    'project.new-disc',
    {},
    undefined,
  )

  assert.equal(repeated.disposition, 'not-executed')
  assert.equal(repeated.reason, 'busy')
  assert.equal(nonconflicting.disposition, 'executed')
  gate.resolve()
  await first
  assert.equal(openExecutions, 1)
})

test('join-identical shares one execution and thrown errors become failures with release', async () => {
  const gate = deferred()
  const registry = new ApplicationCommandRegistry<object>()
  let executions = 0
  registry.register(definition(
    'project.open',
    async () => {
      executions += 1
      await gate.promise
      return commandSucceeded('joined', {
        kind: 'success',
        message: 'Opened.',
        deduplicationKey: 'open-success',
      })
    },
    {
      repeatPolicy: 'join-identical',
      getRepeatKey: () => 'same-input',
      acquireScopes: () => ['lifecycle.transition'],
    },
  ))
  registry.register(definition(
    'project.save',
    () => {
      throw new Error('write exploded')
    },
    { acquireScopes: () => ['lifecycle.transition', 'persistence.write'] },
  ))
  const coordinator = new CommandBusyScopeCoordinator()
  const dispatcher = new ApplicationCommandDispatcher(registry, {
    busyScopes: coordinator,
  })

  const first = dispatcher.dispatch('project.open', {}, undefined)
  const second = dispatcher.dispatch('project.open', {}, undefined)
  gate.resolve()
  const [firstResult, secondResult] = await Promise.all([first, second])

  assert.deepEqual(firstResult, secondResult)
  assert.equal(executions, 1)
  assert.deepEqual(coordinator.getState().occupiedScopes, [])

  const failure = await dispatcher.dispatch('project.save', {}, undefined)
  assert.equal(failure.disposition, 'executed')
  if (failure.disposition === 'executed') {
    assert.equal(failure.result.status, 'failure')
    if (failure.result.status === 'failure') {
      assert.equal(failure.result.error.code, 'application.command-threw')
      assert.match(failure.result.error.diagnosticMessage ?? '', /write exploded/)
    }
  }
  assert.deepEqual(coordinator.getState().occupiedScopes, [])
})

test('dispatcher releases lifecycle ownership for every typed command outcome', async () => {
  const outcomes: readonly ApplicationCommandResult<string>[] = [
    { status: 'success', value: 'saved' },
    { status: 'cancelled', reason: 'operation-cancelled' },
    { status: 'declined', reason: 'replacement-not-authorized' },
    {
      status: 'failure',
      error: {
        code: 'test.failure',
        userMessage: 'The test command failed.',
        recoverable: true,
      },
    },
  ]

  for (const outcome of outcomes) {
    const coordinator = new CommandBusyScopeCoordinator()
    const registry = new ApplicationCommandRegistry<object>()
    registry.register(definition(
      'project.save',
      () => outcome,
      { acquireScopes: () => ['lifecycle.transition', 'persistence.write'] },
    ))
    const dispatcher = new ApplicationCommandDispatcher(registry, {
      busyScopes: coordinator,
    })

    const dispatched = await dispatcher.dispatch('project.save', {}, undefined)
    assert.equal(dispatched.disposition, 'executed')
    assert.deepEqual(coordinator.getState().occupiedScopes, [])
  }
})

function capabilityContext(
  lifecycle: LifecycleCommandCapabilityContext['lifecycle'],
  overrides: Partial<LifecycleCommandCapabilityContext> = {},
): LifecycleCommandCapabilityContext {
  return {
    lifecycle,
    busy: { occupiedScopes: [] },
    termination: { closeWindow: 'unimplemented', quit: 'unimplemented' },
    ...overrides,
  }
}

test('capability projection covers the exact catalog across Home, Disc, busy, and native states', () => {
  const empty = createEmptyApplicationLifecycleState()
  const disc = createNewProjectSession({
    sessionId: 'capability-disc',
    project: createDiscProject(),
  })
  const caseInsert = createNewProjectSession({
    sessionId: 'capability-case',
    project: createCaseInsertProjectSnapshot({ manualGameTitle: 'Command Case' }),
  })
  const homeWithDisc = { ...disc, visibleWorkspace: 'home' as const }

  const emptyCapabilities = projectLifecycleCommandCapabilities(
    capabilityContext(empty),
  )
  assert.deepEqual(Object.keys(emptyCapabilities), APPLICATION_LIFECYCLE_COMMAND_IDS)
  assert.equal(emptyCapabilities['project.new-case'].canExecute, true)
  assert.equal(emptyCapabilities['project.save'].canExecute, false)
  assert.equal(emptyCapabilities['project.resume'].canExecute, false)
  assert.equal(emptyCapabilities['application.quit'].canExecute, false)

  assert.equal(
    getLifecycleCommandCapability(
      capabilityContext(disc),
      'workspace.return-home',
    ).canExecute,
    true,
  )
  assert.equal(
    getLifecycleCommandCapability(
      capabilityContext(disc),
      'project.save',
    ).canExecute,
    true,
  )
  assert.equal(
    getLifecycleCommandCapability(
      capabilityContext(caseInsert),
      'project.save-as',
    ).canExecute,
    true,
  )
  assert.equal(
    getLifecycleCommandCapability(
      capabilityContext(disc),
      'project.resume',
    ).canExecute,
    false,
  )
  assert.equal(
    getLifecycleCommandCapability(
      capabilityContext(homeWithDisc),
      'project.resume',
    ).canExecute,
    true,
  )
  assert.equal(
    getLifecycleCommandCapability(
      capabilityContext(disc, {
        busy: { occupiedScopes: ['lifecycle.transition'] },
      }),
      'project.save',
    ).canExecute,
    false,
  )
  assert.equal(
    getLifecycleCommandCapability(
      capabilityContext(empty, {
        termination: { closeWindow: 'available', quit: 'available' },
      }),
      'application.close-window',
    ).canExecute,
    true,
  )
})
