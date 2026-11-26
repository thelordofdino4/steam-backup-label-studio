import { isDiscBackgroundAsset, legacyDiscBackgroundAsset, readDiscBackgroundAsset, reuseDiscBackgroundAsset, type DiscBackgroundAsset } from '../image/discBackgroundAsset.ts'
import type {
  EditorProjectType,
  EditorWorkspace,
} from '../editor/editorTypes.ts'
import type { SavedDiscProject, SavedProject } from '../project/projectTypes.ts'
import {
  captureDiscRemainderWithOwnedBackground,
  captureLifecycleProjectSnapshot,
  materializeDiscProject,
  createCanonicalProjectComparisonValue,
  getNormalizedProjectKind,
  normalizedProjectSnapshotsAreExactlyEqual,
  projectContentsAreSemanticallyEqual,
  preserveCapturedDiscBackground,
  replaceCapturedDiscBackground,
  type CanonicalProjectComparisonValue,
  type CapturedLifecycleProject,
  type CapturedSavedDiscBackground,
  type CommittedDiscProject,
} from './canonicalProject.ts'
import {
  caseInsertPresetSessionApplicationsAreEqual,
  captureCaseInsertPresetSessionApplication,
  createInitialCaseInsertPresetSessionApplication,
  createRecoveredCaseInsertPresetSessionApplication,
  synchronizeCaseInsertPresetSessionApplication,
  type CaseInsertPresetSessionApplication,
} from './caseInsertPresetSessionApplication.ts'
import {
  recoverCaseInsertPresetProjectApplication,
  type PreparedCaseInsertPresetProjectRecovery,
} from '../project/caseInsertPresetProjectPersistence.ts'

export type ProjectSessionId = string

export type ProjectPersistenceFormat =
  | 'legacy-json'
  | 'sbls-package-v1'

export type DiscEditorRoute = Readonly<{
  workspace: 'disc'
}>

export type CaseInsertEditorRoute = Readonly<{
  workspace: 'caseInsert'
  surface: 'front' | 'back' | 'spine'
}>

export type ProjectSessionEditorRoute =
  | DiscEditorRoute
  | CaseInsertEditorRoute

export type ProjectCleanBaseline = Readonly<{
  exactSnapshot: CapturedLifecycleProject
  comparisonValue: CanonicalProjectComparisonValue
}>

type NormalizedDiscProject = CommittedDiscProject

type NormalizedCaseInsertProject = Extract<
  CapturedLifecycleProject,
  Readonly<{ projectType: 'caseInsert' }>
>

type ProjectSessionBase<
  Kind extends EditorProjectType,
  Project extends CapturedLifecycleProject,
  Route extends ProjectSessionEditorRoute,
> = Readonly<{
  id: ProjectSessionId
  kind: Kind
  currentPath: string | null
  persistenceFormat: ProjectPersistenceFormat | null
  displayName: string
  project: Project
  cleanBaseline: ProjectCleanBaseline | null
  /** Revision of canonical persisted project content only. */
  revision: number
  lastEditorRoute: Route
}>

export type DiscProjectSession = ProjectSessionBase<
  'disc',
  NormalizedDiscProject,
  DiscEditorRoute
>

/**
 * The aggregate lives only at project.caseInsert. The required companion binds
 * its session-only attachment and application revision to that aggregate.
 */
export type CaseInsertProjectSession = ProjectSessionBase<
  'caseInsert',
  NormalizedCaseInsertProject,
  CaseInsertEditorRoute
> & Readonly<{
  caseInsertPresetApplication: CaseInsertPresetSessionApplication
}>

export type ProjectSession = DiscProjectSession | CaseInsertProjectSession

export type ApplicationLifecycleState = Readonly<{
  activeSession: ProjectSession | null
  visibleWorkspace: EditorWorkspace
}>

const capturedLifecycleStates = new WeakSet<object>()

function rememberCapturedLifecycleState(
  state: ApplicationLifecycleState,
): ApplicationLifecycleState {
  capturedLifecycleStates.add(state as object)
  return state
}

type ProjectSessionSeed = Readonly<{
  sessionId: ProjectSessionId
  project: SavedProject
  displayName?: string
  lastEditorRoute?: ProjectSessionEditorRoute
}>

export type NewProjectSessionInput = ProjectSessionSeed

export type LoadedProjectSessionInput = ProjectSessionSeed & Readonly<{
  currentPath: string
  persistenceFormat: ProjectPersistenceFormat
  caseInsertPresetRecovery?: PreparedCaseInsertPresetProjectRecovery
  stagedDiscBackground?: DiscBackgroundAsset
}>

export type AdoptSavedBaselineInput = Readonly<{
  acceptedSnapshot: SavedProject
  currentProject?: SavedProject
  currentPath?: string | null
  persistenceFormat?: ProjectPersistenceFormat | null
  displayName?: string
}>

export type SynchronizeProjectContentInput = Readonly<{
  sessionId: ProjectSessionId
  kind: EditorProjectType
  project: SavedProject
}>

export type SynchronizeProjectRouteInput = Readonly<{
  sessionId: ProjectSessionId
  kind: EditorProjectType
  route: ProjectSessionEditorRoute
}>

function captureRecord(
  value: unknown,
  path: string,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(`${path} must be a plain record.`)
  }

  let isArray: boolean
  try {
    isArray = Array.isArray(value)
  } catch {
    throw new TypeError(`${path} could not be safely inspected.`)
  }
  if (isArray) throw new TypeError(`${path} must be a plain record.`)

  let prototype: object | null
  let descriptors: PropertyDescriptorMap
  try {
    prototype = Object.getPrototypeOf(value) as object | null
    descriptors = Object.getOwnPropertyDescriptors(value)
  } catch {
    throw new TypeError(`${path} could not be safely inspected.`)
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain record.`)
  }

  const keys = Reflect.ownKeys(descriptors)
  const allowed = new Set([...requiredKeys, ...optionalKeys])
  if (keys.some((key) => typeof key !== 'string' || !allowed.has(key)) ||
      requiredKeys.some((key) => !keys.includes(key))) {
    throw new TypeError(`${path} has an invalid shape.`)
  }

  const captured: Record<string, unknown> = {}
  for (const key of keys as string[]) {
    const descriptor = descriptors[key]
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${path}.${key} must be an enumerable data property.`)
    }
    captured[key] = descriptor.value
  }
  return captured
}

function requireSessionId(value: unknown): ProjectSessionId {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError('Project session ID must be a non-empty string.')
  }
  return value
}

function requireRevision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('Project content revision must be a non-negative safe integer.')
  }
  return value
}

function requirePersistenceFormat(
  value: unknown,
): ProjectPersistenceFormat | null {
  if (value === null || value === 'legacy-json' || value === 'sbls-package-v1') {
    return value
  }
  throw new TypeError('Project persistence format is invalid.')
}

function requirePath(value: unknown): string | null {
  if (value === null || typeof value === 'string') return value
  throw new TypeError('Project path must be a string or null.')
}

function requireDisplayName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('Project display name must be a string.')
  }
  return value
}

function defaultEditorRoute(kind: 'disc'): DiscEditorRoute
function defaultEditorRoute(kind: 'caseInsert'): CaseInsertEditorRoute
function defaultEditorRoute(kind: EditorProjectType): ProjectSessionEditorRoute {
  return kind === 'disc'
    ? Object.freeze({ workspace: 'disc' })
    : Object.freeze({ workspace: 'caseInsert', surface: 'front' })
}

function captureEditorRoute(
  kind: 'disc',
  route: unknown,
): DiscEditorRoute
function captureEditorRoute(
  kind: 'caseInsert',
  route: unknown,
): CaseInsertEditorRoute
function captureEditorRoute(
  kind: EditorProjectType,
  route: unknown,
): ProjectSessionEditorRoute {
  if (route === undefined) {
    return kind === 'disc'
      ? defaultEditorRoute('disc')
      : defaultEditorRoute('caseInsert')
  }
  const captured = kind === 'disc'
    ? captureRecord(route, 'session.lastEditorRoute', ['workspace'])
    : captureRecord(
        route,
        'session.lastEditorRoute',
        ['workspace', 'surface'],
      )

  if (kind === 'disc') {
    if (captured.workspace !== 'disc') {
      throw new Error('Editor route does not match Disc project kind.')
    }
    return Object.freeze({ workspace: 'disc' })
  }
  if (captured.workspace !== 'caseInsert' ||
      (captured.surface !== 'front' && captured.surface !== 'back' &&
        captured.surface !== 'spine')) {
    throw new Error('Editor route does not match Case project kind.')
  }
  return Object.freeze({
    workspace: 'caseInsert',
    surface: captured.surface,
  })
}

function createBaseline(
  snapshot: CapturedLifecycleProject,
): ProjectCleanBaseline {
  return Object.freeze({
    exactSnapshot: snapshot,
    comparisonValue: createCanonicalProjectComparisonValue(snapshot),
  })
}

function captureBaseline(
  value: unknown,
  kind: EditorProjectType,
): ProjectCleanBaseline | null {
  if (value === null) return null
  const captured = captureRecord(
    value,
    'session.cleanBaseline',
    ['exactSnapshot', 'comparisonValue'],
  )
  const exactSnapshot = captureLifecycleProjectSnapshot(
    captured.exactSnapshot as SavedProject,
  )
  assertSameProjectKind(kind, exactSnapshot)
  const baseline = createBaseline(exactSnapshot)
  if (captured.comparisonValue !== baseline.comparisonValue) {
    throw new TypeError('Project clean baseline comparison is inconsistent.')
  }
  return baseline
}

function requireActiveSession(state: ApplicationLifecycleState): ProjectSession {
  if (!state.activeSession) {
    throw new Error('An active project session is required.')
  }
  return state.activeSession
}

function assertSameProjectKind(
  expected: EditorProjectType,
  project: CapturedLifecycleProject,
) {
  const actual = getNormalizedProjectKind(project)
  if (actual !== expected) {
    throw new Error(
      `Project kind ${actual} cannot replace active ${expected} content.`,
    )
  }
}

function createCaseApplication(
  sessionId: ProjectSessionId,
  project: NormalizedCaseInsertProject,
): CaseInsertPresetSessionApplication {
  const result = createInitialCaseInsertPresetSessionApplication({
    sessionId,
    project,
  })
  if (!result.ok) {
    throw new TypeError(`Case preset application is invalid: ${result.detail}.`)
  }
  return result.application
}

function createRecoveredCaseApplication(
  sessionId: ProjectSessionId,
  project: NormalizedCaseInsertProject,
  recovery: PreparedCaseInsertPresetProjectRecovery,
): CaseInsertPresetSessionApplication {
  const recovered = recoverCaseInsertPresetProjectApplication({
    recovery,
    sessionId,
    project,
  })
  if (!recovered.ok) {
    throw new TypeError(`Case preset recovery is invalid: ${recovered.code}.`)
  }
  const result = createRecoveredCaseInsertPresetSessionApplication({
    sessionId,
    project,
    ...recovered.application,
  })
  if (!result.ok) {
    throw new TypeError(`Case preset application is invalid: ${result.detail}.`)
  }
  return result.application
}

function advanceCaseApplication(
  session: CaseInsertProjectSession,
  project: NormalizedCaseInsertProject,
): CaseInsertPresetSessionApplication {
  const result = synchronizeCaseInsertPresetSessionApplication({
    sessionId: session.id,
    currentProject: session.project,
    nextProject: project,
    currentApplication: session.caseInsertPresetApplication,
  })
  if (!result.ok) {
    throw new TypeError(`Case preset application is invalid: ${result.detail}.`)
  }
  return result.status === 'no-op'
    ? session.caseInsertPresetApplication
    : result.application
}

function advanceContentRevision(revision: number): number {
  if (!Number.isSafeInteger(revision) || revision < 0 ||
      revision >= Number.MAX_SAFE_INTEGER) {
    throw new TypeError('Project content revision cannot advance safely.')
  }
  return revision + 1
}

function replaceSessionProject(
  session: ProjectSession,
  project: CapturedLifecycleProject,
): ProjectSession {
  const revision = advanceContentRevision(session.revision)
  if (session.kind === 'disc') {
    return Object.freeze({
      ...session,
      project: project as NormalizedDiscProject,
      revision,
    })
  }
  const caseProject = project as NormalizedCaseInsertProject
  return Object.freeze({
    ...session,
    project: caseProject,
    revision,
    caseInsertPresetApplication: advanceCaseApplication(session, caseProject),
  })
}

/** Restore the already captured Disc content chosen by the history owner.
 * Navigation and Save metadata belong to the current session, not to history.
 * The successor is a new revision, never a rollback of the revision counter. */
export function restoreHistoryDiscProject(
  state: ApplicationLifecycleState,
  expected: DiscProjectSession,
  target: CommittedDiscProject,
): ApplicationLifecycleState {
  if (state.activeSession !== expected || state.visibleWorkspace !== 'disc' ||
      target === expected.project) return state
  const captured = captureLifecycleProjectSnapshot(target)
  if (captured !== target || getNormalizedProjectKind(captured) !== 'disc') return state
  return Object.freeze({ ...state, activeSession: replaceSessionProject(expected, captured) })
}

/** An import history step restores the document but keeps the *current*
 * Case attachment, route and Save metadata. The assignment basis is rebound
 * by the existing Case companion owner at a fresh monotonic revision. */
export function restoreHistoryCaseProject(
  state: ApplicationLifecycleState,
  expected: CaseInsertProjectSession,
  target: CapturedLifecycleProject,
): ApplicationLifecycleState {
  if (state.activeSession !== expected || state.visibleWorkspace !== 'caseInsert' ||
      target === expected.project || target.projectType !== 'caseInsert') return state
  const captured = captureLifecycleProjectSnapshot(target)
  if (captured !== target) return state
  return Object.freeze({ ...state, activeSession: replaceSessionProject(expected, captured) })
}

function routesAreEqual(
  first: ProjectSessionEditorRoute,
  second: ProjectSessionEditorRoute,
): boolean {
  return first.workspace === second.workspace &&
    (first.workspace === 'disc' ||
      (second.workspace === 'caseInsert' && first.surface === second.surface))
}

function baselinesAreEqual(
  first: ProjectCleanBaseline | null,
  second: ProjectCleanBaseline | null,
): boolean {
  if (first === second) return true
  return first !== null && second !== null &&
    first.comparisonValue === second.comparisonValue &&
    normalizedProjectSnapshotsAreExactlyEqual(
      first.exactSnapshot,
      second.exactSnapshot,
    )
}

export function applicationLifecycleStatesAreSemanticallyEqual(
  first: ApplicationLifecycleState,
  second: ApplicationLifecycleState,
): boolean {
  if (first === second) return true
  if (first.visibleWorkspace !== second.visibleWorkspace) return false
  const firstSession = first.activeSession
  const secondSession = second.activeSession
  if (firstSession === secondSession) return true
  if (!firstSession || !secondSession || firstSession.kind !== secondSession.kind) {
    return false
  }
  if (firstSession.id !== secondSession.id ||
      firstSession.currentPath !== secondSession.currentPath ||
      firstSession.persistenceFormat !== secondSession.persistenceFormat ||
      firstSession.displayName !== secondSession.displayName ||
      firstSession.revision !== secondSession.revision ||
      !routesAreEqual(firstSession.lastEditorRoute, secondSession.lastEditorRoute) ||
      !normalizedProjectSnapshotsAreExactlyEqual(
        firstSession.project,
        secondSession.project,
      ) || !baselinesAreEqual(
        firstSession.cleanBaseline,
        secondSession.cleanBaseline,
      )) {
    return false
  }
  return firstSession.kind === 'disc' || (
    secondSession.kind === 'caseInsert' &&
    caseInsertPresetSessionApplicationsAreEqual(
      firstSession.caseInsertPresetApplication,
      secondSession.caseInsertPresetApplication,
    )
  )
}

export function createEmptyApplicationLifecycleState(): ApplicationLifecycleState {
  return Object.freeze({
    activeSession: null,
    visibleWorkspace: 'home',
  })
}

/**
 * Captures session state at an application-owned boundary. Every field is read
 * through data descriptors; project and Case application inputs are detached,
 * revalidated, and deeply frozen before exposure.
 */
export function captureApplicationLifecycleState(
  state: ApplicationLifecycleState,
): ApplicationLifecycleState {
  if (typeof state === 'object' && state !== null &&
      capturedLifecycleStates.has(state)) {
    return state
  }
  const capturedState = captureRecord(
    state,
    'applicationLifecycleState',
    ['activeSession', 'visibleWorkspace'],
  )
  const workspace = capturedState.visibleWorkspace
  if (workspace !== 'home' && workspace !== 'disc' &&
      workspace !== 'caseInsert') {
    throw new TypeError('Visible workspace is invalid.')
  }
  if (capturedState.activeSession === null) {
    if (workspace !== 'home') {
      throw new Error('An editor workspace requires an active project session.')
    }
    return rememberCapturedLifecycleState(createEmptyApplicationLifecycleState())
  }

  const sessionShape = captureRecord(
    capturedState.activeSession,
    'session',
    [],
    [
      'id', 'kind', 'currentPath', 'persistenceFormat', 'displayName',
      'project', 'cleanBaseline', 'revision', 'lastEditorRoute',
      'caseInsertPresetApplication',
    ],
  )
  const kind = sessionShape.kind
  if (kind !== 'disc' && kind !== 'caseInsert') {
    throw new TypeError('Project session kind is invalid.')
  }
  const expectedKeys = [
    'id', 'kind', 'currentPath', 'persistenceFormat', 'displayName',
    'project', 'cleanBaseline', 'revision', 'lastEditorRoute',
    ...(kind === 'caseInsert' ? ['caseInsertPresetApplication'] : []),
  ]
  if (Object.keys(sessionShape).length !== expectedKeys.length ||
      expectedKeys.some((key) => !(key in sessionShape))) {
    throw new TypeError('Project session has an invalid shape.')
  }

  const id = requireSessionId(sessionShape.id)
  const project = captureLifecycleProjectSnapshot(
    sessionShape.project as SavedProject,
  )
  assertSameProjectKind(kind, project)
  const baseline = captureBaseline(sessionShape.cleanBaseline, kind)
  if (workspace !== 'home' && workspace !== kind) {
    throw new Error(`Workspace ${workspace} does not match project kind ${kind}.`)
  }
  const common = {
    id,
    currentPath: requirePath(sessionShape.currentPath),
    persistenceFormat: requirePersistenceFormat(sessionShape.persistenceFormat),
    displayName: requireDisplayName(sessionShape.displayName),
    cleanBaseline: baseline,
    revision: requireRevision(sessionShape.revision),
  }

  if (kind === 'disc') {
    return rememberCapturedLifecycleState(Object.freeze({
      activeSession: Object.freeze({
        ...common,
        kind: 'disc' as const,
        project: project as NormalizedDiscProject,
        lastEditorRoute: captureEditorRoute(
          'disc',
          sessionShape.lastEditorRoute,
        ),
      }),
      visibleWorkspace: workspace,
    }))
  }

  const caseProject = project as NormalizedCaseInsertProject
  const application = captureCaseInsertPresetSessionApplication({
    sessionId: id,
    project: caseProject,
    application: sessionShape.caseInsertPresetApplication,
  })
  if (!application.ok) {
    throw new TypeError(`Case preset application is invalid: ${application.detail}.`)
  }
  return rememberCapturedLifecycleState(Object.freeze({
    activeSession: Object.freeze({
      ...common,
      kind: 'caseInsert' as const,
      project: caseProject,
      lastEditorRoute: captureEditorRoute(
        'caseInsert',
        sessionShape.lastEditorRoute,
      ),
      caseInsertPresetApplication: application.application,
    }),
    visibleWorkspace: workspace,
  }))
}

function captureNewInput(input: NewProjectSessionInput) {
  return captureRecord(
    input,
    'newProjectSessionInput',
    ['sessionId', 'project'],
    ['displayName', 'lastEditorRoute'],
  )
}

export function createNewProjectSession(
  input: NewProjectSessionInput,
): ApplicationLifecycleState {
  const captured = captureNewInput(input)
  const id = requireSessionId(captured.sessionId)
  const project = captureLifecycleProjectSnapshot(captured.project as SavedProject)
  const kind = getNormalizedProjectKind(project)
  const displayName = captured.displayName === undefined
    ? project.title
    : requireDisplayName(captured.displayName)

  if (kind === 'disc') {
    return Object.freeze({
      activeSession: Object.freeze({
        id,
        kind: 'disc' as const,
        currentPath: null,
        persistenceFormat: null,
        displayName,
        project: project as NormalizedDiscProject,
        cleanBaseline: null,
        revision: 0,
        lastEditorRoute: captureEditorRoute(
          'disc',
          captured.lastEditorRoute,
        ),
      }),
      visibleWorkspace: 'disc',
    })
  }
  const caseProject = project as NormalizedCaseInsertProject
  return Object.freeze({
    activeSession: Object.freeze({
      id,
      kind: 'caseInsert' as const,
      currentPath: null,
      persistenceFormat: null,
      displayName,
      project: caseProject,
      cleanBaseline: null,
      revision: 0,
      lastEditorRoute: captureEditorRoute(
        'caseInsert',
        captured.lastEditorRoute,
      ),
      caseInsertPresetApplication: createCaseApplication(id, caseProject),
    }),
    visibleWorkspace: 'caseInsert',
  })
}

export function createLoadedProjectSession(
  input: LoadedProjectSessionInput,
): ApplicationLifecycleState {
  const captured = captureRecord(
    input,
    'loadedProjectSessionInput',
    ['sessionId', 'project', 'currentPath', 'persistenceFormat'],
    ['displayName', 'lastEditorRoute', 'caseInsertPresetRecovery', 'stagedDiscBackground'],
  )
  const id = requireSessionId(captured.sessionId)
  const stagedDiscBackground = captured.stagedDiscBackground
  if (stagedDiscBackground !== undefined && !isDiscBackgroundAsset(stagedDiscBackground)) {
    throw new TypeError('Invalid staged Disc background.')
  }
  const project = captureLifecycleProjectSnapshot(captured.project, stagedDiscBackground)
  const kind = getNormalizedProjectKind(project)
  const currentPath = requirePath(captured.currentPath)
  if (currentPath === null) {
    throw new TypeError('A loaded project requires a current path.')
  }
  const persistenceFormat = requirePersistenceFormat(captured.persistenceFormat)
  if (persistenceFormat === null) {
    throw new TypeError('A loaded project requires a persistence format.')
  }
  const displayName = captured.displayName === undefined
    ? project.title
    : requireDisplayName(captured.displayName)

  if (kind === 'disc') {
    if (captured.caseInsertPresetRecovery !== undefined) {
      throw new TypeError(
        'Disc project sessions cannot recover Case preset application state.',
      )
    }
    const discProject = project as NormalizedDiscProject
    return Object.freeze({
      activeSession: Object.freeze({
        id,
        kind: 'disc' as const,
        currentPath,
        persistenceFormat,
        displayName,
        project: discProject,
        cleanBaseline: createBaseline(discProject),
        revision: 0,
        lastEditorRoute: captureEditorRoute(
          'disc',
          captured.lastEditorRoute,
        ),
      }),
      visibleWorkspace: 'disc',
    })
  }
  if (captured.stagedDiscBackground !== undefined) {
    throw new TypeError('A Case project cannot adopt a staged Disc background.')
  }
  const caseProject = project as NormalizedCaseInsertProject
  return Object.freeze({
    activeSession: Object.freeze({
      id,
      kind: 'caseInsert' as const,
      currentPath,
      persistenceFormat,
      displayName,
      project: caseProject,
      cleanBaseline: createBaseline(caseProject),
      revision: 0,
      lastEditorRoute: captureEditorRoute(
        'caseInsert',
        captured.lastEditorRoute,
      ),
      caseInsertPresetApplication: captured.caseInsertPresetRecovery === undefined
        ? createCaseApplication(id, caseProject)
        : createRecoveredCaseApplication(
            id,
            caseProject,
            captured.caseInsertPresetRecovery as
              PreparedCaseInsertPresetProjectRecovery,
          ),
    }),
    visibleWorkspace: 'caseInsert',
  })
}

export function replaceActiveProjectContent(
  state: ApplicationLifecycleState,
  replacement: SavedProject,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)
  const project = captureLifecycleProjectSnapshot(replacement)
  assertSameProjectKind(session.kind, project)

  if (projectContentsAreSemanticallyEqual(project, session.project)) {
    return state
  }

  return Object.freeze({
    ...state,
    activeSession: replaceSessionProject(session, project),
  })
}

/** Disc-only typed transition; binds against the current session and content
 * revision, not React render timing or project route. */
export type DiscBackgroundOperation =
  | Readonly<{ kind: 'transform'; scale: number; offset: DiscProjectSession['project']['background']['offset'] }>
  | Readonly<{ kind: 'visibility'; enabled: boolean; scale: number; offset: DiscProjectSession['project']['background']['offset'] }>
  | Readonly<{ kind: 'placement'; scale: number; offset: DiscProjectSession['project']['background']['offset'] }>
  | Readonly<{ kind: 'asset'; background: CapturedSavedDiscBackground; stagedAsset?: DiscBackgroundAsset }>

export type DiscBackgroundEdit = Readonly<{
  sessionId: ProjectSessionId
  expectedRevision: number
  operation: DiscBackgroundOperation
}>

const discAssetFields = new Set(['imageDataUrl', 'scale', 'offset', 'note', 'enabled', 'imageSize', 'imageSource'])

function checkedDiscAssetInput(candidate: CapturedSavedDiscBackground): CapturedSavedDiscBackground {
  const prototype = Object.getPrototypeOf(candidate)
  const descriptors = Object.getOwnPropertyDescriptors(candidate)
  if ((prototype !== Object.prototype && prototype !== null) ||
      Reflect.ownKeys(descriptors).some(key => typeof key !== 'string' || !discAssetFields.has(key) ||
        !descriptors[key]?.enumerable || !('value' in descriptors[key]!)) ||
      !descriptors.imageDataUrl || !descriptors.scale || !descriptors.offset) {
    throw new TypeError('A closed Disc asset edit is required.')
  }
  const { imageDataUrl, scale, offset, imageSize, imageSource, enabled, note } = descriptors
  if (imageDataUrl.value === undefined || typeof scale.value !== 'number' ||
      !offset.value || typeof note?.value !== 'string') {
    throw new TypeError('Incomplete Disc asset edit.')
  }
  return {
    imageDataUrl: imageDataUrl.value,
    scale: scale.value,
    offset: offset.value,
    note: note.value,
    ...(imageSize ? { imageSize: imageSize.value } : {}),
    ...(imageSource ? { imageSource: imageSource.value } : {}),
    ...(enabled ? { enabled: enabled.value } : {}),
  }
}

export function editDiscBackground(
  state: ApplicationLifecycleState,
  edit: DiscBackgroundEdit,
): ApplicationLifecycleState {
  const session = state.activeSession
  if (!session || session.kind !== 'disc' || state.visibleWorkspace !== 'disc' ||
      session.id !== edit.sessionId || session.revision !== edit.expectedRevision) return state
  const current = session.project.background
  const { operation } = edit
  let background: typeof current
  switch (operation.kind) {
    case 'asset': {
      const { imageDataUrl, ...ownedFields } = checkedDiscAssetInput(operation.background)
      if (imageDataUrl !== null && typeof imageDataUrl !== 'string') {
        throw new TypeError('An accepted Disc background source is required.')
      }
      const asset = operation.stagedAsset === undefined
        ? legacyDiscBackgroundAsset(imageDataUrl) : operation.stagedAsset
      if (!isDiscBackgroundAsset(asset) || readDiscBackgroundAsset(asset) !== imageDataUrl) {
        throw new TypeError('Staged Disc source does not match the asset edit.')
      }
      const clean = session.cleanBaseline?.exactSnapshot
      const retained = clean && 'background' in clean
        ? reuseDiscBackgroundAsset(asset, clean.background.asset) : asset
      background = { ...ownedFields, asset: retained }
      break
    }
    case 'visibility':
      background = { ...current, enabled: operation.enabled, scale: operation.scale, offset: operation.offset }
      break
    case 'placement':
    case 'transform':
      background = { ...current, scale: operation.scale, offset: operation.offset }
      break
    default:
      throw new TypeError('Unknown Disc background operation.')
  }
  const project = replaceCapturedDiscBackground(session.project, background)
  if (project === session.project) return state
  return Object.freeze({ ...state, activeSession: replaceSessionProject(session, project) })
}

/** Accept checked sibling data and, if supplied, its scoped Background edit
 * together. A prepared edit never advances or notifies the store by itself. */
export function replaceActiveDiscRemainder(
  state: ApplicationLifecycleState,
  expected: DiscProjectSession,
  remainder: unknown,
  backgroundEdit?: DiscBackgroundEdit,
): ApplicationLifecycleState {
  if (state.activeSession !== expected) return state
  let ownedProject = expected.project
  if (backgroundEdit) {
    if (backgroundEdit.sessionId !== expected.id ||
        backgroundEdit.expectedRevision !== expected.revision ||
        state.visibleWorkspace !== 'disc') return state
    const prepared = editDiscBackground(state, backgroundEdit).activeSession
    if (prepared?.kind !== 'disc') return state
    ownedProject = prepared.project
  }
  const project = captureDiscRemainderWithOwnedBackground(remainder, ownedProject)
  if (projectContentsAreSemanticallyEqual(project, expected.project)) return state
  return Object.freeze({
    ...state,
    activeSession: Object.freeze({
      ...expected,
      project,
      revision: advanceContentRevision(expected.revision),
    }),
  })
}

/**
 * Synchronizes one complete editor-owned aggregate into the active lifecycle
 * session. Stale sessions and mismatched project kinds are semantic no-ops so
 * a committed React render can never overwrite a replacement session.
 */
export function synchronizeActiveProjectContent(
  state: ApplicationLifecycleState,
  input: SynchronizeProjectContentInput,
): ApplicationLifecycleState {
  let captured: Record<string, unknown>
  try {
    captured = captureRecord(
      input,
      'synchronizeProjectContentInput',
      ['sessionId', 'kind', 'project'],
    )
  } catch {
    return state
  }
  const session = state.activeSession
  if (!session || session.id !== captured.sessionId ||
      session.kind !== captured.kind) {
    return state
  }

  let project: CapturedLifecycleProject
  try {
    project = captureLifecycleProjectSnapshot(captured.project as SavedProject)
  } catch {
    return state
  }
  if (getNormalizedProjectKind(project) !== captured.kind) return state
  if (session.kind === 'disc') {
    try {
      project = preserveCapturedDiscBackground(project as NormalizedDiscProject, session.project)
    } catch {
      return state
    }
  }
  if (projectContentsAreSemanticallyEqual(project, session.project)) return state
  return Object.freeze({ ...state, activeSession: replaceSessionProject(session, project) })
}

export function updateLastEditorRoute(
  state: ApplicationLifecycleState,
  route: ProjectSessionEditorRoute,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)
  const capturedRoute = session.kind === 'disc'
    ? captureEditorRoute('disc', route)
    : captureEditorRoute('caseInsert', route)
  if (routesAreEqual(capturedRoute, session.lastEditorRoute)) return state

  return Object.freeze({
    ...state,
    activeSession: Object.freeze({ ...session, lastEditorRoute: capturedRoute }),
  }) as ApplicationLifecycleState
}

/** Synchronizes exact editor navigation without treating it as project content. */
export function synchronizeActiveProjectRoute(
  state: ApplicationLifecycleState,
  input: SynchronizeProjectRouteInput,
): ApplicationLifecycleState {
  const session = state.activeSession
  if (!session || session.id !== input.sessionId ||
      session.kind !== input.kind || input.route.workspace !== input.kind) {
    return state
  }
  return updateLastEditorRoute(state, input.route)
}

export function returnProjectSessionHome(
  state: ApplicationLifecycleState,
): ApplicationLifecycleState {
  if (state.visibleWorkspace === 'home') return state
  requireActiveSession(state)
  return Object.freeze({ ...state, visibleWorkspace: 'home' })
}

export function resumeProjectSession(
  state: ApplicationLifecycleState,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)
  return Object.freeze({ ...state, visibleWorkspace: session.kind })
}

const discSaveSnapshot: unique symbol = Symbol('discSaveSnapshot')

/** A Save operation's handle to one already validated Disc revision. It is
 * not an ingress project and must not be serialized or passed to the writer. */
export type DiscSaveRevision = Readonly<{
  sessionId: ProjectSessionId
  revision: number
  [discSaveSnapshot]: NormalizedDiscProject
}>

export function pinDiscSaveRevision(session: DiscProjectSession): DiscSaveRevision {
  return Object.freeze({
    sessionId: session.id,
    revision: session.revision,
    [discSaveSnapshot]: session.project,
  })
}

/** Materialize the exact pinned R for the independent saved-file boundary. */
export function projectPinnedDiscSave(pin: DiscSaveRevision): SavedDiscProject {
  return materializeDiscProject(pin[discSaveSnapshot])
}

/** Apply only after a successful write. The current revision can be newer;
 * adopt the exact pinned baseline without replacing that newer content. */
export function adoptPinnedDiscSave(
  state: ApplicationLifecycleState,
  pin: DiscSaveRevision,
  destination: string,
): ApplicationLifecycleState {
  const current = state.activeSession
  if (current?.kind !== 'disc' || current.id !== pin.sessionId ||
      current.revision < pin.revision) return state
  return adoptCapturedProjectBaseline(state, current, pin[discSaveSnapshot], {
    currentPath: destination,
    persistenceFormat: 'sbls-package-v1',
  })
}

export function adoptSavedProjectBaseline(
  state: ApplicationLifecycleState,
  input: AdoptSavedBaselineInput,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)
  const acceptedSnapshot = captureLifecycleProjectSnapshot(input.acceptedSnapshot)
  return adoptCapturedProjectBaseline(state, session, acceptedSnapshot, input)
}

function adoptCapturedProjectBaseline(
  state: ApplicationLifecycleState,
  session: ProjectSession,
  acceptedSnapshot: CapturedLifecycleProject,
  input: Omit<AdoptSavedBaselineInput, 'acceptedSnapshot'>,
): ApplicationLifecycleState {
  assertSameProjectKind(session.kind, acceptedSnapshot)
  const currentProject = input.currentProject
    ? captureLifecycleProjectSnapshot(input.currentProject)
    : session.project
  assertSameProjectKind(session.kind, currentProject)
  const contentAdvanced = !projectContentsAreSemanticallyEqual(currentProject, session.project)
  const contentSession = contentAdvanced
    ? replaceSessionProject(session, currentProject)
    : session

  return Object.freeze({
    ...state,
    activeSession: Object.freeze({
      ...contentSession,
      currentPath: input.currentPath === undefined
        ? contentSession.currentPath
        : input.currentPath,
      persistenceFormat: input.persistenceFormat === undefined
        ? contentSession.persistenceFormat
        : input.persistenceFormat,
      displayName: input.displayName ?? contentSession.displayName,
      cleanBaseline: createBaseline(acceptedSnapshot),
    }),
  })
}

export function closeProjectSession(
  state: ApplicationLifecycleState,
): ApplicationLifecycleState {
  requireActiveSession(state)
  return createEmptyApplicationLifecycleState()
}

export function isProjectSessionDirty(session: ProjectSession): boolean {
  return session.cleanBaseline === null ||
    !projectContentsAreSemanticallyEqual(session.project, session.cleanBaseline.exactSnapshot)
}

export function hasEligibleSblsPath(path: string | null): path is string {
  if (!path) return false
  const separator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  const fileName = path.slice(separator + 1)
  return fileName.length > 5 && fileName.toLowerCase().endsWith('.sbls')
}

export function canSaveProjectSessionDirectly(session: ProjectSession): boolean {
  return session.persistenceFormat === 'sbls-package-v1' &&
    hasEligibleSblsPath(session.currentPath)
}

export function selectIsActiveProjectDirty(
  state: ApplicationLifecycleState,
): boolean {
  return state.activeSession ? isProjectSessionDirty(state.activeSession) : false
}
