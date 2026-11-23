import { beginLifecyclePerformanceSample, type LifecyclePerformanceObserver } from './lifecyclePerformanceObserver.ts'
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
import type { DiscLegacyProjectProjection } from '../project/createProjectSnapshot.ts'
import type { SavedDiscGuidedLayoutState, SavedDiscProject, SavedProject } from '../project/projectTypes.ts'
import {
  synchronizeActiveProjectContent,
  editDiscBackground,
  replaceActiveProjectContent,
  type DiscBackgroundEdit,
  type DiscProjectSession,
  synchronizeActiveProjectRoute,
  type ApplicationLifecycleState,
  type ProjectSessionEditorRoute,
  type ProjectSessionId,
} from './projectSession.ts'
import type { EditorProjectType } from '../editor/editorTypes.ts'
import {
  captureNormalizedProjectSnapshot,
  capturedDiscBackgroundsAreExactlyEqual,
  preserveCapturedDiscBackground,
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
  performanceObserver?: LifecyclePerformanceObserver
  initialState?: ApplicationLifecycleState
  ports?: ApplicationLifecycleCommandPorts
  exportPng?: ApplicationPngExportCommandOwner
  termination?: ApplicationTerminationCapabilities
  getTerminationCapabilities?: () => ApplicationTerminationCapabilities
  canAcceptCommands?: () => boolean
  createOperationId?: () => string
  createSessionId?: () => string
  onSubscriberError?: (error: unknown) => void
}>

const discPresetSiblingKeys = [
  'titleArtwork', 'logoAssets', 'ratingBadge', 'mediaMark',
  'platformMarks', 'technicalMarks', 'discText',
] as const

function hasClosedDataFootprint(input: object, allowed: readonly string[]): boolean {
  if (!input) return false
  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) return false
  const descriptors = Object.getOwnPropertyDescriptors(input)
  return Reflect.ownKeys(descriptors).every(key => typeof key === 'string' &&
    allowed.includes(key) && 'value' in descriptors[key]! &&
    descriptors[key]!.enumerable && descriptors[key]!.value !== undefined)
}

type DiscPresetTextFields = Pick<NonNullable<SavedDiscProject['discText']>, 'layout' | 'settings'>
export type DiscPresetSiblingFields = Partial<Pick<SavedDiscProject,
  Exclude<typeof discPresetSiblingKeys[number], 'discText'>>> & { discText?: DiscPresetTextFields }
export type DiscBackgroundCompoundCompanion =
  | Readonly<{ kind: 'preset'; fields: DiscPresetSiblingFields; guidedLayout?: SavedDiscGuidedLayoutState | null }>
  | Readonly<{ kind: 'guided'; guidedLayout: SavedDiscGuidedLayoutState }>

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
  canCommitDiscBackground(): boolean
  commitDiscBackground(edit: DiscBackgroundEdit): 'committed' | 'no-op' | 'stale' | 'unavailable' | 'invalid'
  commitDiscBackgroundCompound(
    edit: DiscBackgroundEdit,
    companion: DiscBackgroundCompoundCompanion,
  ): ReturnType<ApplicationLifecycleCompositionRoot['commitDiscBackground']>
  synchronizeDiscLegacyProject(input: Readonly<{
    sessionId: ProjectSessionId
    legacy: DiscLegacyProjectProjection
  }>): ReturnType<ApplicationLifecycleCompositionRoot['synchronizeCurrentProject']>
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

  const handoffBlocked: ApplicationCommandCapability = Object.freeze({
    canExecute: false,
    reasonCode: 'application.termination-pending',
    userMessage: 'The native close outcome is pending; project commands are paused.',
  })

  function applyCommandAdmission<Id extends string>(
    capabilities: Readonly<Record<Id, ApplicationCommandCapability>>,
  ): Readonly<Record<Id, ApplicationCommandCapability>> {
    if (options.canAcceptCommands?.() !== false) return capabilities
    return Object.freeze(Object.fromEntries(
      Object.keys(capabilities).map(id => [id, handoffBlocked]),
    )) as Readonly<Record<Id, ApplicationCommandCapability>>
  }

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
    return applyCommandAdmission(Object.freeze({
      ...lifecycleCapabilities,
      'export.png': getApplicationPngExportCapability(options.exportPng, {
        stateSnapshot,
        busy,
      }),
      ...caseInsertPresetCapabilities,
    }))
  }

  function lifecycleCapabilitiesFor(
    stateSnapshot: ApplicationLifecycleStateSnapshot,
    busy: CommandBusyState,
  ) {
    return applyCommandAdmission(executableProjectLifecycleCommandCapabilities({
      lifecycle: stateSnapshot.state,
      busy,
      termination: options.getTerminationCapabilities?.() ?? termination,
      owners: ownerAvailability,
    }))
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

  type SyncResult = ReturnType<ApplicationLifecycleCompositionRoot['synchronizeCurrentProject']>
  // Closed #372 compatibility write footprint. Unknown valid persisted fields
  // inherited from the active snapshot are not a legacy UI write target.
  const discLegacyKeys = new Set([
    'schemaVersion', 'projectType', 'editor', 'title', 'savedAt', 'game',
    'metadata', 'logoAssets', 'titleArtwork', 'discNumberArtwork',
    'additionalArtwork', 'ratingBadge', 'mediaMark', 'platformMarks',
    'technicalMarks', 'template', 'steamBackupLogo', 'export', 'discText',
  ])

  function synchronizeDiscLegacyProject(input: Parameters<ApplicationLifecycleCompositionRoot['synchronizeDiscLegacyProject']>[0]): SyncResult {
    if (disposed) return 'invalid'
    const snapshot = stateStore.getSnapshot()
    const session = snapshot.state.activeSession
    if (!session || session.id !== input.sessionId) return 'stale-session'
    if (session.kind !== 'disc') return 'wrong-kind'
    try {
      const legacy = input.legacy
      if (!legacy || (Object.getPrototypeOf(legacy) !== Object.prototype &&
                     Object.getPrototypeOf(legacy) !== null)) return 'invalid'
      const descriptors = Object.getOwnPropertyDescriptors(legacy)
      if (Reflect.ownKeys(descriptors).some((key) => {
        if (typeof key !== 'string' || !discLegacyKeys.has(key)) return true
        return !('value' in descriptors[key]!) || !descriptors[key]!.enumerable
      })) return 'invalid'
      // The editor controls presence of its known optional fields too.
      const project = { ...session.project }
      for (const key of discLegacyKeys) Reflect.deleteProperty(project, key)
      Object.assign(project, legacy)
      const validated = captureNormalizedProjectSnapshot(project as unknown as SavedProject)
      if (getNormalizedProjectKind(validated) !== 'disc') return 'wrong-kind'
      const result = stateStore.commitTransition(snapshot.generation, (state) =>
        synchronizeActiveProjectContent(state, { sessionId: session.id, kind: 'disc', project: validated as unknown as SavedProject }))
      return result.status === 'committed' ? 'synchronized' :
        result.status === 'no-op' ? 'no-op' : 'stale-session'
    } catch {
      return 'invalid'
    }
  }

  function synchronizeCurrentProject(input: Readonly<{
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
      // Compatibility callers may read/pass a full Disc projection, but do
      // not gain a second background writer through the old ingress.
      if (session.kind === 'disc' && !capturedDiscBackgroundsAreExactlyEqual(
        session.project.background, (project as DiscProjectSession['project']).background,
      )) return 'invalid'
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
  }

  function canCommitDiscBackground() {
    const { state } = stateStore.getSnapshot()
    return !disposed && options.canAcceptCommands?.() !== false &&
      !busyCoordinator.getState().occupiedScopes.includes('project.mutation') &&
      state.visibleWorkspace === 'disc' && state.activeSession?.kind === 'disc'
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
      // Native menus and programmatic callers are outside the inert DOM.
      // Retain semantic admission protection after command busy scopes release.
      if (options.canAcceptCommands?.() === false) {
        return Object.freeze({
          disposition: 'not-executed', reason: 'disabled', commandId,
          userMessage: handoffBlocked.userMessage,
        })
      }
      const measured = commandId === 'project.open' || commandId === 'project.save' ||
        commandId === 'project.save-as' || commandId === 'export.png'
      const finish = measured && options.performanceObserver ? beginLifecyclePerformanceSample(
        options.performanceObserver, commandId, stateStore.getSnapshot().generation,
      ) : undefined
      const pending = dispatcher.dispatch(
        commandId,
        createCommandContext(definition.id),
        input,
      )
      if (finish) {
        // Observe the existing promise; do not replace it or await an extra stage.
        void pending.then(
          result => finish(result.disposition === 'executed'
            ? result.result.status : 'not-executed', stateStore.getSnapshot().generation),
          () => finish('threw', stateStore.getSnapshot().generation),
        )
      }
      return pending
    },
    canCommitDiscBackground,
    commitDiscBackground(edit: DiscBackgroundEdit) {
      if (!canCommitDiscBackground()) return 'unavailable'
      const snapshot = stateStore.getSnapshot()
      const session = snapshot.state.activeSession
      if (!session || session.kind !== 'disc' || snapshot.state.visibleWorkspace !== 'disc') return 'unavailable'
      if (session.id !== edit.sessionId || session.revision !== edit.expectedRevision) return 'stale'
      try {
        return stateStore.commitTransition(snapshot.generation, state => editDiscBackground(state, edit)).status
      } catch {
        return 'invalid'
      }
    },
    commitDiscBackgroundCompound(edit: DiscBackgroundEdit, companion: DiscBackgroundCompoundCompanion) {
      if (!canCommitDiscBackground()) return 'unavailable'
      const snapshot = stateStore.getSnapshot()
      const session = snapshot.state.activeSession
      if (session?.kind !== 'disc') return 'unavailable'
      if (session.id !== edit.sessionId || session.revision !== edit.expectedRevision) return 'stale'
      try {
        if (edit.operation.kind !== 'asset' && edit.operation.kind !== 'visibility') return 'invalid'
        if (companion.kind !== 'preset' && companion.kind !== 'guided') return 'invalid'
        const prepared = editDiscBackground(snapshot.state, edit).activeSession
        if (prepared?.kind !== 'disc') return 'invalid'
        const draft = { ...session.project, background: prepared.project.background }
        if (companion.kind === 'preset') {
          const fields = companion.fields
          if (!hasClosedDataFootprint(fields, discPresetSiblingKeys)) return 'invalid'
          const { discText, ...directFields } = fields
          if (discText && !hasClosedDataFootprint(discText, ['layout', 'settings'])) return 'invalid'
          if (Object.hasOwn(fields, 'discText') && !discText) return 'invalid'
          Object.assign(draft, directFields)
          if (discText) draft.discText = { ...session.project.discText, ...discText }
        }
        if (companion.guidedLayout !== undefined) {
          if (companion.guidedLayout === null) {
            const editor = { ...session.project.editor }
            delete editor.guidedLayout
            if (Object.keys(editor).length) draft.editor = editor
            else delete draft.editor
          } else {
            draft.editor = { ...session.project.editor, guidedLayout: companion.guidedLayout }
          }
        }
        const validated = captureNormalizedProjectSnapshot(draft as unknown as SavedProject)
        if (getNormalizedProjectKind(validated) !== 'disc') return 'invalid'
        const project = preserveCapturedDiscBackground(validated as DiscProjectSession['project'], prepared.project)
        return stateStore.commitTransition(snapshot.generation, state =>
          replaceActiveProjectContent(state, project as unknown as SavedProject)).status
      } catch {
        return 'invalid'
      }
    },
    synchronizeDiscLegacyProject,
    synchronizeCurrentProject(input: Parameters<ApplicationLifecycleCompositionRoot['synchronizeCurrentProject']>[0]) {
      const observer = options.performanceObserver
      if (!observer) return synchronizeCurrentProject(input)
      const finish = beginLifecyclePerformanceSample(observer, 'synchronize-current-project', stateStore.getSnapshot().generation)
      const result = synchronizeCurrentProject(input)
      finish?.(result, stateStore.getSnapshot().generation)
      return result
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
