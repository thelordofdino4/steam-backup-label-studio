import { prepareCaseSteamImport, type CaseSteamImport } from './caseSteamOperation.ts'
import { readClosedDataFootprint } from './closedDocumentFootprint.ts'
import { prepareDiscSteamImport, type DiscSteamImportAfterState } from './discSteamOperation.ts'
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
import type { DiscGuidedSlotId } from '../guidedPresets/discGuidedSlots.ts'
import { omitDiscGuidedSlot, resetDiscGuidedProgress, restoreCompletedDiscGuidedSlot, restoreDiscGuidedSlot } from '../guidedPresets/discGuidedWorkflow.ts'
import { createSavedDiscGuidedLayout, restoreSavedDiscGuidedWorkflow } from '../project/projectGuidedWorkflow.ts'
import type { DiscTextLayoutSettings } from '../discText/types.ts'
import { normalizeUskRatingValue } from '../project/projectMetadata.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import type { RatingBadgeLayout, SavedDiscGuidedLayoutState, SavedDiscProject, SavedProject, SavedCaseInsertProject, TitleArtworkLayout } from '../project/projectTypes.ts'
import {
  synchronizeActiveProjectContent,
  editDiscBackground,
  replaceActiveDiscRemainder,
  type DiscBackgroundEdit,
  type DiscProjectSession,
  synchronizeActiveProjectRoute,
  type ApplicationLifecycleState,
  type ProjectSessionEditorRoute,
  type ProjectSessionId,
} from './projectSession.ts'
import { reconcileDiscRatingLayouts, type DiscRatingLayoutSyncBasis } from './discRatingLayoutSync.ts'
import type { EditorProjectType } from '../editor/editorTypes.ts'
import {
  captureNormalizedProjectSnapshot,
  isCapturedSavedDiscProject,
  savedDiscBackgroundMatches,
  getNormalizedProjectKind,
  normalizedProjectValueMatches,
  projectContentsAreSemanticallyEqual,
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
  discHistoryLimit?: number
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


const presetCompanionKeys = new Set(['kind', 'fields', 'guidedLayout'])
const guidedCompanionKeys = new Set(['kind', 'guidedLayout'])
const optionalGuidedKey = new Set(['guidedLayout'])
const presetSiblingFootprint = new Set<string>(discPresetSiblingKeys)
const presetTextFootprint = new Set(['layout', 'settings'])
const presetRatingFootprint = new Set(['layout', 'uskLayout'])
const discPointLayoutFootprint = new Set(['enabled', 'scale', 'x', 'y'])

function readDiscPointLayout(input: unknown): DiscPresetRatingLayoutPatch | null {
  const layout = readClosedDataFootprint(input, discPointLayoutFootprint)
  if (!layout || (Object.hasOwn(layout, 'enabled') && typeof layout.enabled !== 'boolean') ||
      typeof layout.scale !== 'number' || !Number.isFinite(layout.scale) || layout.scale <= 0 ||
      typeof layout.x !== 'number' || !Number.isFinite(layout.x) ||
      typeof layout.y !== 'number' || !Number.isFinite(layout.y)) return null
  return {
    scale: layout.scale, x: layout.x, y: layout.y,
    ...(typeof layout.enabled === 'boolean' ? { enabled: layout.enabled } : {}),
  }
}

function discRemainderOf(project: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(project).filter(([key]) => key !== 'background'))
}

type DiscPresetTextFields = Pick<NonNullable<SavedDiscProject['discText']>, 'layout' | 'settings'>
type DiscPresetRatingLayoutPatch = Omit<RatingBadgeLayout, 'enabled'> & Partial<Pick<RatingBadgeLayout, 'enabled'>>
type DiscPresetRatingFields = Readonly<{ layout: DiscPresetRatingLayoutPatch; uskLayout: DiscPresetRatingLayoutPatch }>
type DiscSupplementalUskEdit = Readonly<{
  sessionId: ProjectSessionId
  expectedGeneration: number
  ratingValue: string
  placement?: Readonly<{ layout: RatingBadgeLayout; uskLayout: RatingBadgeLayout }>
}>
const discSupplementalUskEditKeys = new Set(['sessionId', 'expectedGeneration', 'ratingValue', 'placement'])

function prepareDiscRatingProjection(
  accepted: DiscProjectSession['project']['ratingBadge'],
  draft: Record<string, unknown>,
  basis?: DiscRatingLayoutSyncBasis,
) {
  if (draft.ratingBadge === undefined && !accepted?.uskBadge?.ratingValue) return draft
  if (draft.ratingBadge !== undefined && (!draft.ratingBadge ||
      typeof draft.ratingBadge !== 'object' || Array.isArray(draft.ratingBadge))) {
    throw new TypeError('Invalid Disc rating projection.')
  }
  const defaults = createDefaultProjectRatingBadge()
  const badge = (draft.ratingBadge ?? accepted ?? defaults) as NonNullable<SavedDiscProject['ratingBadge']>
  const withValue = {
    ...badge, uskBadge: {
      ...defaults.uskBadge, ...badge.uskBadge,
      ratingValue: accepted?.uskBadge?.ratingValue ?? defaults.uskBadge.ratingValue,
    },
  }
  if (!accepted?.layout || !accepted.uskBadge?.layout) return { ...draft, ratingBadge: withValue }
  if (basis) return { ...draft, ratingBadge: reconcileDiscRatingLayouts(basis, withValue, accepted) }
  // An unversioned compatibility projection can still update unrelated
  // content, but cannot claim that an older layout is a deliberate edit.
  return { ...draft, ratingBadge: {
    ...withValue, layout: accepted.layout,
    uskBadge: { ...withValue.uskBadge, layout: accepted.uskBadge.layout },
  } }
}
export type DiscPresetSiblingFields = Partial<Pick<SavedDiscProject,
  Exclude<typeof discPresetSiblingKeys[number], 'discText' | 'ratingBadge'>>> & {
    discText?: DiscPresetTextFields
    ratingBadge?: DiscPresetRatingFields
  }
export type DiscBackgroundCompoundCompanion =
  | Readonly<{ kind: 'preset'; fields: DiscPresetSiblingFields; guidedLayout?: SavedDiscGuidedLayoutState | null }>
  | Readonly<{ kind: 'guided'; guidedLayout: SavedDiscGuidedLayoutState }>

type DiscTemplateDocumentFields = Required<Pick<SavedDiscProject,
  'template' | 'titleArtwork' | 'additionalArtwork' | 'logoAssets' | 'ratingBadge' |
  'mediaMark' | 'platformMarks' | 'technicalMarks'>> & { discTextLayout: DiscTextLayoutSettings }
const discTemplateDocumentKeys = new Set([
  'template', 'titleArtwork', 'additionalArtwork', 'logoAssets', 'ratingBadge',
  'mediaMark', 'platformMarks', 'technicalMarks', 'discTextLayout',
])
type DiscEditorDocumentEdit = Readonly<{ sessionId: ProjectSessionId; expectedGeneration: number }> &
  (Readonly<{ kind: 'template'; fields: DiscTemplateDocumentFields }> |
   Readonly<{ kind: 'steam-import'; expectedRevision: number; after: DiscSteamImportAfterState }> |
   Readonly<{ kind: 'reset-title-artwork-layout'; layout: TitleArtworkLayout }> |
   Readonly<{ kind: 'reset-guided-progress' }> |
   Readonly<{ kind: 'edit-guided-slot'; action: 'omit' | 'include' | 'show-again'; slotId: DiscGuidedSlotId }>)

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
  commitDiscSupplementalUsk(edit: DiscSupplementalUskEdit): ReturnType<ApplicationLifecycleCompositionRoot['commitDiscBackground']>
  commitCaseSteamImport(edit: CaseSteamImport & Readonly<{ expectedGeneration: number }>): ReturnType<ApplicationLifecycleCompositionRoot['commitDiscBackground']>
  acknowledgeCaseSteamProjection(input: Readonly<{
    sessionId: ProjectSessionId; expectedGeneration: number; projection: SavedCaseInsertProject
  }>): 'committed' | 'no-op' | 'stale' | 'invalid'
  commitDiscEditorDocumentEdit(edit: DiscEditorDocumentEdit): ReturnType<ApplicationLifecycleCompositionRoot['commitDiscBackground']>
  stepDiscDocumentHistory(input: Readonly<{
    sessionId: ProjectSessionId
    expectedGeneration: number
    direction: 'undo' | 'redo'
  }>): ReturnType<ApplicationLifecycleCompositionRoot['commitDiscBackground']>
  canCommitDiscBackground(): boolean
  commitDiscBackground(edit: DiscBackgroundEdit): 'committed' | 'no-op' | 'stale' | 'unavailable' | 'invalid'
  commitDiscBackgroundCompound(
    edit: DiscBackgroundEdit,
    companion: DiscBackgroundCompoundCompanion,
  ): ReturnType<ApplicationLifecycleCompositionRoot['commitDiscBackground']>
  acknowledgeDiscHistoryProjection(input: Readonly<{
    sessionId: ProjectSessionId
    expectedGeneration: number
    projection: DiscLegacyProjectProjection
  }>): 'committed' | 'no-op' | 'stale' | 'invalid'
  synchronizeDiscLegacyProject(input: Readonly<{
    sessionId: ProjectSessionId
    legacy: DiscLegacyProjectProjection
    ratingBasis?: DiscRatingLayoutSyncBasis
  }>): ReturnType<ApplicationLifecycleCompositionRoot['synchronizeCurrentProject']>
  synchronizeCurrentProject(input: Readonly<{
    sessionId: ProjectSessionId
    kind: EditorProjectType
    project: SavedProject
    ratingBasis?: DiscRatingLayoutSyncBasis
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
    ...(options.discHistoryLimit === undefined ? {} : { discHistoryLimit: options.discHistoryLimit }),
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

  function prepareDiscLegacyRemainder(session: DiscProjectSession, legacy: Record<string, unknown>) {
    const remainder = discRemainderOf(session.project)
    for (const key of discLegacyKeys) Reflect.deleteProperty(remainder, key)
    return Object.assign(remainder, legacy)
  }

  function acknowledgeDiscHistoryProjection(
    input: Parameters<ApplicationLifecycleCompositionRoot['acknowledgeDiscHistoryProjection']>[0],
  ) {
    if (disposed) return 'invalid'
    const snapshot = stateStore.getSnapshot()
    const current = snapshot.state.activeSession
    if (!current || current.kind !== 'disc' || snapshot.state.visibleWorkspace !== 'disc' ||
        input.sessionId !== current.id || input.expectedGeneration !== snapshot.generation) return 'stale'
    if (!snapshot.discHistoryProjectionPending) return 'no-op'
    try {
      const legacy = readClosedDataFootprint(input.projection, discLegacyKeys, discLegacyKeys)
      if (!legacy || replaceActiveDiscRemainder(snapshot.state, current,
        prepareDiscLegacyRemainder(current, legacy)) !== snapshot.state) return 'invalid'
      return stateStore.acknowledgeDocumentProjection(snapshot.generation, 'disc').status
    } catch {
      return 'invalid'
    }
  }

  function synchronizeDiscLegacyProject(input: Parameters<ApplicationLifecycleCompositionRoot['synchronizeDiscLegacyProject']>[0]): SyncResult {
    if (disposed) return 'invalid'
    const snapshot = stateStore.getSnapshot()
    const session = snapshot.state.activeSession
    if (!session || session.id !== input.sessionId) return 'stale-session'
    if (session.kind !== 'disc') return 'wrong-kind'
    if (snapshot.discHistoryProjectionPending) return 'stale-session'
    try {
      const legacy = readClosedDataFootprint(input.legacy, discLegacyKeys, discLegacyKeys)
      if (!legacy) return 'invalid'
      // The editor controls the presence of its known optional fields, but
      // neither Background nor unknown retained fields belong to this writer.
      const remainder = prepareDiscLegacyRemainder(session, legacy)
      // Reflection/validation may run nested proxy traps. Prepare before the
      // generation check so a reentrant acceptance cannot be overwritten.
      const prepared = replaceActiveDiscRemainder(snapshot.state, session,
        prepareDiscRatingProjection(session.project.ratingBadge, remainder, input.ratingBasis))
      const result = stateStore.commitTransition(snapshot.generation, () => prepared)
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
    ratingBasis?: DiscRatingLayoutSyncBasis
  }>) {
    if (disposed) return 'invalid'

    const snapshot = stateStore.getSnapshot()
    const session = snapshot.state.activeSession
    if (!session || session.id !== input.sessionId) return 'stale-session'
    if (session.kind !== input.kind) return 'wrong-kind'
    if ((session.kind === 'disc' && snapshot.discHistoryProjectionPending) ||
        (session.kind === 'caseInsert' && snapshot.caseSteamProjectionPending)) return 'stale-session'

    let result
    try {
      const project = captureNormalizedProjectSnapshot(input.project)
      if (getNormalizedProjectKind(project) !== input.kind) return 'wrong-kind'
      // Compatibility callers may read/pass a full Disc projection, but do
      // not gain a second background writer through the old ingress.
      if (session.kind === 'disc' && (!isCapturedSavedDiscProject(project) ||
        !savedDiscBackgroundMatches(project.background, session.project.background))) return 'invalid'
      const prepared = session.kind === 'disc' && isCapturedSavedDiscProject(project)
        ? replaceActiveDiscRemainder(snapshot.state, session,
          prepareDiscRatingProjection(session.project.ratingBadge, discRemainderOf(project), input.ratingBasis))
        : synchronizeActiveProjectContent(snapshot.state, { sessionId: input.sessionId, kind: input.kind, project: project as unknown as SavedProject })
      result = stateStore.commitTransition(snapshot.generation, () => prepared)
    } catch {
      return 'invalid'
    }

    if (result.status === 'committed') return 'synchronized'
    if (result.status === 'no-op') return 'no-op'
    return 'stale-session'
  }

  function canCommitDiscBackground() {
    const { state, discHistoryProjectionPending } = stateStore.getSnapshot()
    return !discHistoryProjectionPending && !disposed && options.canAcceptCommands?.() !== false &&
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
    stepDiscDocumentHistory(input: Readonly<{
      sessionId: ProjectSessionId; expectedGeneration: number; direction: 'undo' | 'redo'
    }>) {
      if (options.discHistoryLimit === undefined || !canCommitDiscBackground()) return 'unavailable'
      const snapshot = stateStore.getSnapshot()
      if (input.sessionId !== snapshot.state.activeSession?.id ||
          input.expectedGeneration !== snapshot.generation) return 'stale'
      if (input.direction !== 'undo' && input.direction !== 'redo') return 'invalid'
      return stateStore.stepDiscHistory(snapshot.generation, input.direction).status
    },
    canCommitDiscBackground,
    commitCaseSteamImport({ expectedGeneration, ...edit }: Parameters<ApplicationLifecycleCompositionRoot['commitCaseSteamImport']>[0]) {
      const snapshot = stateStore.getSnapshot()
      if (disposed || options.canAcceptCommands?.() === false || snapshot.caseSteamProjectionPending ||
          busyCoordinator.getState().occupiedScopes.includes('project.mutation')) return 'unavailable'
      if (snapshot.generation !== expectedGeneration) return 'stale'
      const prepared = prepareCaseSteamImport(snapshot.state, edit)
      if (prepared.status !== 'prepared') return prepared.status
      return stateStore.commitTransition(snapshot.generation, () => prepared.state, 'case-steam-transaction-with-projection').status
    },
    acknowledgeCaseSteamProjection(input: Parameters<ApplicationLifecycleCompositionRoot['acknowledgeCaseSteamProjection']>[0]) {
      if (disposed) return 'invalid'
      const snapshot = stateStore.getSnapshot()
      const current = snapshot.state.activeSession
      if (snapshot.state.visibleWorkspace !== 'caseInsert' || current?.kind !== 'caseInsert' ||
          current.id !== input.sessionId || snapshot.generation !== input.expectedGeneration) return 'stale'
      if (!snapshot.caseSteamProjectionPending) return 'no-op'
      try {
        const projected = captureNormalizedProjectSnapshot(input.projection)
        if (projected.projectType !== 'caseInsert' ||
            !projectContentsAreSemanticallyEqual(projected, current.project)) return 'invalid'
        return stateStore.acknowledgeDocumentProjection(snapshot.generation, 'caseInsert').status
      } catch { return 'invalid' }
    },
    commitDiscEditorDocumentEdit(edit: DiscEditorDocumentEdit) {
      if (!canCommitDiscBackground()) return 'unavailable'
      const snapshot = stateStore.getSnapshot()
      const session = snapshot.state.activeSession
      if (session?.kind !== 'disc') return 'unavailable'
      try {
        if (edit.sessionId !== session.id || edit.expectedGeneration !== snapshot.generation) return 'stale'
        if (edit.kind === 'steam-import') {
          const prepared = prepareDiscSteamImport(snapshot.state, {
            sessionId: edit.sessionId, expectedRevision: edit.expectedRevision, after: edit.after,
          })
          if (prepared.status !== 'prepared') return prepared.status
          return stateStore.commitTransition(snapshot.generation, () => prepared.state,
            'record-disc-transaction-with-projection').status
        }
        const remainder = discRemainderOf(session.project)
        if (edit.kind === 'template') {
          const fields = readClosedDataFootprint(edit.fields, discTemplateDocumentKeys)
          if (!fields || Object.keys(fields).length !== discTemplateDocumentKeys.size || !session.project.discText) return 'invalid'
          if (normalizedProjectValueMatches(session.project.template, fields.template)) return 'no-op'
          const { discTextLayout, ...owners } = fields
          Object.assign(remainder, owners, { discText: { ...session.project.discText, layout: discTextLayout } })
        } else if (edit.kind === 'reset-title-artwork-layout') {
          const artwork = session.project.titleArtwork
          const layout = readDiscPointLayout(edit.layout)
          if (!artwork?.layout || !layout || typeof layout.enabled !== 'boolean' ||
              layout.enabled !== artwork.layout.enabled) return 'invalid'
          if (normalizedProjectValueMatches(artwork.layout, layout)) return 'no-op'
          Object.assign(remainder, { titleArtwork: { ...artwork, layout } })
        } else if (edit.kind === 'reset-guided-progress' || edit.kind === 'edit-guided-slot') {
          const workflow = restoreSavedDiscGuidedWorkflow(session.project.editor)
          const result = edit.kind === 'reset-guided-progress' ? resetDiscGuidedProgress(workflow) :
            edit.action === 'omit' ? omitDiscGuidedSlot(workflow, edit.slotId) :
            edit.action === 'include' ? restoreDiscGuidedSlot(workflow, edit.slotId) :
            edit.action === 'show-again' ? restoreCompletedDiscGuidedSlot(workflow, edit.slotId) : null
          if (!result) return 'invalid'
          if (result.state === workflow) return 'no-op'
          const guidedLayout = createSavedDiscGuidedLayout(result.state)
          if (!guidedLayout) return 'invalid'
          Object.assign(remainder, { editor: { ...session.project.editor, guidedLayout } })
        } else return 'invalid'
        const prepared = replaceActiveDiscRemainder(snapshot.state, session, remainder)
        return stateStore.commitTransition(snapshot.generation, () => prepared, 'record-disc-transaction-with-projection').status
      } catch {
        return 'invalid'
      }
    },
    commitDiscSupplementalUsk(edit: DiscSupplementalUskEdit) {
      if (!canCommitDiscBackground()) return 'unavailable'
      const snapshot = stateStore.getSnapshot()
      const session = snapshot.state.activeSession
      if (session?.kind !== 'disc') return 'unavailable'
      try {
        const fields = readClosedDataFootprint(edit, discSupplementalUskEditKeys)
        if (!fields || typeof fields.sessionId !== 'string' || typeof fields.expectedGeneration !== 'number' ||
            typeof fields.ratingValue !== 'string') return 'invalid'
        if (fields.sessionId !== session.id || fields.expectedGeneration !== snapshot.generation) return 'stale'
        const ratingValue = normalizeUskRatingValue(fields.ratingValue)
        if (ratingValue === null) return 'invalid'
        const defaults = createDefaultProjectRatingBadge()
        const current = session.project.ratingBadge
        if (ratingValue === (current?.uskBadge?.ratingValue ?? defaults.uskBadge.ratingValue) &&
            !Object.hasOwn(fields, 'placement')) return 'no-op'
        let primary = current?.layout ?? defaults.layout
        let supplemental = current?.uskBadge?.layout ?? defaults.uskBadge.layout
        if (Object.hasOwn(fields, 'placement')) {
          const patch = readClosedDataFootprint(fields.placement, presetRatingFootprint)
          const layout = readDiscPointLayout(patch?.layout)
          const uskLayout = readDiscPointLayout(patch?.uskLayout)
          if (!layout || !uskLayout || !layout.enabled || !uskLayout.enabled) return 'invalid'
          primary = { ...layout, enabled: true }
          supplemental = { ...uskLayout, enabled: true }
        }
        const remainder = discRemainderOf(session.project)
        Object.assign(remainder, { ratingBadge: {
          ...defaults, ...current, layout: primary,
          uskBadge: { ...defaults.uskBadge, ...current?.uskBadge, layout: supplemental, ratingValue },
        } })
        const prepared = replaceActiveDiscRemainder(snapshot.state, session, remainder)
        return stateStore.commitTransition(snapshot.generation, () => prepared, 'record-disc-transaction').status
      } catch {
        return 'invalid'
      }
    },
    commitDiscBackground(edit: DiscBackgroundEdit) {
      if (!canCommitDiscBackground()) return 'unavailable'
      const snapshot = stateStore.getSnapshot()
      const session = snapshot.state.activeSession
      if (!session || session.kind !== 'disc' || snapshot.state.visibleWorkspace !== 'disc') return 'unavailable'
      if (session.id !== edit.sessionId || session.revision !== edit.expectedRevision) return 'stale'
      try {
        const prepared = editDiscBackground(snapshot.state, edit)
        return stateStore.commitTransition(snapshot.generation, () => prepared, 'record-disc-transaction').status
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
        const envelope = readClosedDataFootprint(companion, presetCompanionKeys, optionalGuidedKey)
        if (!envelope || (envelope.kind !== 'preset' && envelope.kind !== 'guided')) return 'invalid'
        const remainder = discRemainderOf(session.project)
        if (envelope.kind === 'preset') {
          const fields = readClosedDataFootprint(envelope.fields, presetSiblingFootprint)
          if (!fields) return 'invalid'
          const { discText, ratingBadge, ...directFields } = fields
          if (Object.hasOwn(fields, 'discText')) {
            const text = readClosedDataFootprint(discText, presetTextFootprint)
            if (!text) return 'invalid'
            Object.assign(remainder, { discText: { ...session.project.discText, ...text } })
          }
          if (Object.hasOwn(fields, 'ratingBadge')) {
            const rating = readClosedDataFootprint(ratingBadge, presetRatingFootprint)
            const layout = readDiscPointLayout(rating?.layout)
            const uskLayout = readDiscPointLayout(rating?.uskLayout)
            if (!layout || !uskLayout) return 'invalid'
            const defaults = createDefaultProjectRatingBadge()
            const accepted = session.project.ratingBadge
            Object.assign(remainder, { ratingBadge: {
              ...defaults,
              ...accepted,
              layout: { ...(accepted?.layout ?? defaults.layout), ...layout },
              uskBadge: {
                ...defaults.uskBadge, ...accepted?.uskBadge,
                layout: { ...(accepted?.uskBadge?.layout ?? defaults.uskBadge.layout), ...uskLayout },
              },
            } })
          }
          Object.assign(remainder, directFields)
        } else if (Object.keys(envelope).some(key => !guidedCompanionKeys.has(key)) ||
                   envelope.guidedLayout === undefined || envelope.guidedLayout === null) {
          return 'invalid'
        }
        if (envelope.guidedLayout !== undefined) {
          if (envelope.guidedLayout === null) {
            const editor = { ...session.project.editor }
            delete editor.guidedLayout
            if (Object.keys(editor).length) remainder.editor = editor
            else delete remainder.editor
          } else {
            Object.assign(remainder, { editor: { ...session.project.editor, guidedLayout: envelope.guidedLayout } })
          }
        }
        const prepared = replaceActiveDiscRemainder(snapshot.state, session, remainder, edit)
        return stateStore.commitTransition(snapshot.generation, () => prepared, 'record-disc-transaction').status
      } catch {
        return 'invalid'
      }
    },
    acknowledgeDiscHistoryProjection,
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
