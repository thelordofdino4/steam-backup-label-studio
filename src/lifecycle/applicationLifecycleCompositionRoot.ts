import {
  type ApplicationCommandCapability,
  type ApplicationCommandDispatchResult,
  type ApplicationCommandId,
  type ApplicationLifecycleCommandId,
  type CaseInsertPresetApplicationCommandId,
} from './applicationCommandTypes.ts'
import {
  ApplicationCommandDispatcher,
  ApplicationCommandRegistry,
} from './applicationCommandRegistry.ts'
import {
  createApplicationLifecycleCommandDefinitions,
  type ApplicationLifecycleDefinitionContext,
} from './applicationLifecycleCommandDefinitions.ts'
import {
  createApplicationPngExportCommandDefinition,
  getApplicationPngExportCapability,
  type ApplicationPngExportCommandOwner,
} from './applicationPngExportCommand.ts'
import {
  getApplicationLifecycleCommandOwnerAvailability,
  type ApplicationLifecycleCommandContext,
  type ApplicationLifecycleCommandPorts,
} from './applicationLifecycleCommandPorts.ts'
import {
  createCaseInsertPresetSessionApplicationCommandDefinitions,
  getCaseInsertPresetSessionApplicationCommandCapability,
} from './caseInsertPresetSessionApplicationCommand.ts'
import {
  createApplicationLifecycleStateStore,
  type ApplicationLifecycleStateSnapshot,
} from './applicationLifecycleStateStore.ts'
import {
  CommandBusyScopeCoordinator,
  type CommandBusyState,
} from './commandBusyScopes.ts'
import {
  executableProjectLifecycleCommandCapabilities,
  type ApplicationTerminationCapabilities,
} from './lifecycleCommandCapabilities.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import {
  synchronizeActiveProjectContent,
  synchronizeActiveProjectRoute,
  type ApplicationLifecycleState,
  type ProjectSessionEditorRoute,
  type ProjectSessionId,
} from './projectSession.ts'
import type { EditorProjectType } from '../editor/editorTypes.ts'
import {
  captureNormalizedProjectSnapshot,
  getNormalizedProjectKind,
} from './canonicalProject.ts'

const UNIMPLEMENTED_TERMINATION = Object.freeze({
  closeWindow: 'unimplemented',
  quit: 'unimplemented',
} as const satisfies ApplicationTerminationCapabilities)

export type ApplicationLifecycleCompositionSnapshot = Readonly<{
  generation: number
  stateGeneration: number
  lifecycle: ApplicationLifecycleState
  busy: CommandBusyState
  capabilities: Readonly<Record<
    ApplicationCommandId,
    ApplicationCommandCapability
  >>
}>

export type ApplicationLifecycleCompositionSubscriber = (
  snapshot: ApplicationLifecycleCompositionSnapshot,
) => void

export type ApplicationLifecycleCompositionRootOptions = Readonly<{
  initialState?: ApplicationLifecycleState
  ports?: ApplicationLifecycleCommandPorts
  exportPng?: ApplicationPngExportCommandOwner
  termination?: ApplicationTerminationCapabilities
  createOperationId?: () => string
  createSessionId?: () => string
  onSubscriberError?: (error: unknown) => void
}>

export interface ApplicationLifecycleCompositionRoot {
  getLifecycleState(): ApplicationLifecycleState
  getStateSnapshot(): ApplicationLifecycleStateSnapshot
  getBusyState(): CommandBusyState
  getLifecycleCommandCapabilities(): Readonly<Record<
    ApplicationLifecycleCommandId,
    ApplicationCommandCapability
  >>
  getApplicationCommandCapabilities(): Readonly<Record<
    ApplicationCommandId,
    ApplicationCommandCapability
  >>
  getSnapshot(): ApplicationLifecycleCompositionSnapshot
  dispatch<Value = void>(
    commandId: ApplicationCommandId,
    input?: unknown,
  ): Promise<ApplicationCommandDispatchResult<Value>>
  dispatch<Value = void>(
    commandId: string,
    input?: unknown,
  ): Promise<ApplicationCommandDispatchResult<Value>>
  synchronizeCurrentProject(input: Readonly<{
    sessionId: ProjectSessionId
    kind: EditorProjectType
    project: SavedProject
  }>): 'synchronized' | 'no-op' | 'stale-session' | 'wrong-kind' | 'invalid'
  synchronizeCurrentEditorRoute(input: Readonly<{
    sessionId: ProjectSessionId
    kind: EditorProjectType
    route: ProjectSessionEditorRoute
  }>): 'synchronized' | 'no-op' | 'stale-session' | 'wrong-kind' | 'invalid'
  subscribe(subscriber: ApplicationLifecycleCompositionSubscriber): () => void
  listRegisteredCommandIds(): readonly ApplicationCommandId[]
  refreshCommandCapabilities(): void
  dispose(): void
}

function createDefaultIdGenerator(prefix: string): () => string {
  let nextId = 1
  return () => {
    if (!Number.isSafeInteger(nextId) || nextId <= 0) {
      throw new RangeError(`${prefix} IDs are exhausted.`)
    }
    const id = `${prefix}-${nextId}`
    nextId += 1
    return id
  }
}

function capturePorts(
  ports: ApplicationLifecycleCommandPorts | undefined,
): ApplicationLifecycleCommandPorts {
  return Object.freeze({ ...(ports ?? {}) })
}

export function createApplicationLifecycleCompositionRoot(
  options: ApplicationLifecycleCompositionRootOptions = {},
): ApplicationLifecycleCompositionRoot {
  const ports = capturePorts(options.ports)
  const termination = Object.freeze({
    ...(options.termination ?? UNIMPLEMENTED_TERMINATION),
  })
  const ownerAvailability =
    getApplicationLifecycleCommandOwnerAvailability(ports)
  const createSessionId = options.createSessionId ??
    createDefaultIdGenerator('project-session')
  const stateStore = createApplicationLifecycleStateStore({
    ...(options.initialState ? { initialState: options.initialState } : {}),
    ...(options.onSubscriberError
      ? { onSubscriberError: options.onSubscriberError }
      : {}),
  })
  const busyCoordinator = new CommandBusyScopeCoordinator()
  const registry = new ApplicationCommandRegistry<
    ApplicationLifecycleDefinitionContext
  >()
  const dispatcher = new ApplicationCommandDispatcher(registry, {
    busyScopes: busyCoordinator,
    createOperationId: options.createOperationId ??
      createDefaultIdGenerator('application-command'),
  })
  const subscribers = new Set<ApplicationLifecycleCompositionSubscriber>()
  let generation = 0
  let disposed = false

  function capabilitiesFor(
    stateSnapshot: ApplicationLifecycleStateSnapshot,
    busy: CommandBusyState,
  ) {
    const lifecycleCapabilities = lifecycleCapabilitiesFor(stateSnapshot, busy)
    const caseInsertPresetCapability =
      getCaseInsertPresetSessionApplicationCommandCapability({
        stateSnapshot,
        busy,
      })
    const caseInsertPresetCapabilities = Object.freeze({
      'case.layoutPreset.apply': caseInsertPresetCapability,
      'case.layoutPreset.reapply': caseInsertPresetCapability,
      'case.layoutPreset.detach': caseInsertPresetCapability,
    }) satisfies Readonly<Record<
      CaseInsertPresetApplicationCommandId,
      ApplicationCommandCapability
    >>
    return Object.freeze({
      ...lifecycleCapabilities,
      'export.png': getApplicationPngExportCapability(options.exportPng, {
        stateSnapshot,
        busy,
      }),
      ...caseInsertPresetCapabilities,
    })
  }

  function lifecycleCapabilitiesFor(
    stateSnapshot: ApplicationLifecycleStateSnapshot,
    busy: CommandBusyState,
  ) {
    return executableProjectLifecycleCommandCapabilities({
      lifecycle: stateSnapshot.state,
      busy,
      termination,
      owners: ownerAvailability,
    })
  }

  function captureSnapshot(
    stateSnapshot: ApplicationLifecycleStateSnapshot,
    busy: CommandBusyState,
  ): ApplicationLifecycleCompositionSnapshot {
    return Object.freeze({
      generation,
      stateGeneration: stateSnapshot.generation,
      lifecycle: stateSnapshot.state,
      busy,
      capabilities: capabilitiesFor(stateSnapshot, busy),
    })
  }

  let cachedSnapshot = captureSnapshot(
    stateStore.getSnapshot(),
    busyCoordinator.getState(),
  )

  function reportSubscriberError(error: unknown) {
    try {
      options.onSubscriberError?.(error)
    } catch {
      // Observer diagnostics cannot interrupt root notification.
    }
  }

  function notifySubscribers(
    stateSnapshot = stateStore.getSnapshot(),
    busy = busyCoordinator.getState(),
  ) {
    generation += 1
    cachedSnapshot = captureSnapshot(stateSnapshot, busy)
    for (const subscriber of [...subscribers]) {
      try {
        subscriber(cachedSnapshot)
      } catch (error) {
        reportSubscriberError(error)
      }
    }
  }

  const unsubscribeState = stateStore.subscribe((stateSnapshot) => {
    notifySubscribers(stateSnapshot, busyCoordinator.getState())
  })
  const unsubscribeBusy = busyCoordinator.subscribe((busy) => {
    notifySubscribers(stateStore.getSnapshot(), busy)
  })

  for (const definition of createApplicationLifecycleCommandDefinitions(ports)) {
    registry.register(definition)
  }
  registry.register(createApplicationPngExportCommandDefinition(options.exportPng))
  for (const definition of
    createCaseInsertPresetSessionApplicationCommandDefinitions()) {
    registry.register(definition)
  }

  function createCommandContext(
    commandId: ApplicationCommandId,
  ): ApplicationLifecycleDefinitionContext {
    const stateSnapshot = stateStore.getSnapshot()
    const busy = busyCoordinator.getState()
    const baseContext: ApplicationLifecycleCommandContext = Object.freeze({
      commandId,
      stateSnapshot,
      getCurrentStateSnapshot: () => stateStore.getSnapshot(),
      commitState: (expectedGeneration, transition) =>
        stateStore.commitTransition(expectedGeneration, transition),
      createSessionId,
    })

    return Object.freeze({
      ...baseContext,
      busy,
      capabilities: capabilitiesFor(stateSnapshot, busy),
    })
  }

  const root: ApplicationLifecycleCompositionRoot = Object.freeze({
    getLifecycleState: () => stateStore.getSnapshot().state,
    getStateSnapshot: () => stateStore.getSnapshot(),
    getBusyState: () => busyCoordinator.getState(),
    getLifecycleCommandCapabilities: () => {
      const stateSnapshot = stateStore.getSnapshot()
      return lifecycleCapabilitiesFor(
        stateSnapshot,
        busyCoordinator.getState(),
      )
    },
    getApplicationCommandCapabilities: () => {
      const stateSnapshot = stateStore.getSnapshot()
      return capabilitiesFor(stateSnapshot, busyCoordinator.getState())
    },
    getSnapshot: () => cachedSnapshot,
    async dispatch(commandId: string, input?: unknown) {
      if (disposed) {
        throw new Error('The application lifecycle composition root is disposed.')
      }
      const definition = registry.resolve(commandId)
      if (!definition) {
        return Object.freeze({
          disposition: 'not-executed',
          reason: 'unknown-command',
          commandId,
        })
      }
      return dispatcher.dispatch(
        commandId,
        createCommandContext(definition.id),
        input,
      )
    },
    synchronizeCurrentProject(input: Readonly<{
      sessionId: ProjectSessionId
      kind: EditorProjectType
      project: SavedProject
    }>) {
      if (disposed) return 'invalid'

      const snapshot = stateStore.getSnapshot()
      const session = snapshot.state.activeSession
      if (!session || session.id !== input.sessionId) return 'stale-session'
      if (session.kind !== input.kind) return 'wrong-kind'

      let result
      try {
        const project = captureNormalizedProjectSnapshot(input.project)
        if (getNormalizedProjectKind(project) !== input.kind) return 'wrong-kind'
        result = stateStore.commitTransition(snapshot.generation, (state) =>
          synchronizeActiveProjectContent(state, {
            ...input,
            project: project as unknown as SavedProject,
          }))
      } catch {
        return 'invalid'
      }

      if (result.status === 'committed') return 'synchronized'
      if (result.status === 'no-op') return 'no-op'
      return 'stale-session'
    },
    synchronizeCurrentEditorRoute(input: Readonly<{
      sessionId: ProjectSessionId
      kind: EditorProjectType
      route: ProjectSessionEditorRoute
    }>) {
      if (disposed) return 'invalid'

      const snapshot = stateStore.getSnapshot()
      const session = snapshot.state.activeSession
      if (!session || session.id !== input.sessionId) return 'stale-session'
      if (
        session.kind !== input.kind ||
        input.route.workspace !== input.kind
      ) {
        return 'wrong-kind'
      }

      let result
      try {
        result = stateStore.commitTransition(snapshot.generation, (state) =>
          synchronizeActiveProjectRoute(state, input))
      } catch {
        return 'invalid'
      }

      if (result.status === 'committed') return 'synchronized'
      if (result.status === 'no-op') return 'no-op'
      return 'stale-session'
    },
    subscribe(subscriber: ApplicationLifecycleCompositionSubscriber) {
      if (disposed) {
        throw new Error('The application lifecycle composition root is disposed.')
      }
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
    listRegisteredCommandIds: () => registry.listIds(),
    refreshCommandCapabilities() {
      if (disposed) return
      notifySubscribers()
    },
    dispose() {
      if (disposed) return
      disposed = true
      unsubscribeState()
      unsubscribeBusy()
      subscribers.clear()
      stateStore.dispose()
      busyCoordinator.disposeSubscriptions()
    },
  })

  return root
}
