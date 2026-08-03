import type {
  EditorProjectType,
  EditorWorkspace,
} from '../editor/editorTypes.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import {
  captureNormalizedProjectSnapshot,
  createCanonicalProjectComparisonValue,
  getNormalizedProjectKind,
  normalizedProjectSnapshotsAreExactlyEqual,
  type CanonicalProjectComparisonValue,
  type NormalizedPersistableProject,
} from './canonicalProject.ts'
import {
  caseInsertPresetSessionApplicationsAreEqual,
  captureCaseInsertPresetSessionApplication,
  createInitialCaseInsertPresetSessionApplication,
  synchronizeCaseInsertPresetSessionApplication,
  type CaseInsertPresetSessionApplication,
} from './caseInsertPresetSessionApplication.ts'

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
  exactSnapshot: NormalizedPersistableProject
  comparisonValue: CanonicalProjectComparisonValue
}>

type NormalizedDiscProject = Extract<
  NormalizedPersistableProject,
  Readonly<{ template: Readonly<{ type: 'disc' }> }>
>

type NormalizedCaseInsertProject = Extract<
  NormalizedPersistableProject,
  Readonly<{ projectType: 'caseInsert' }>
>

type ProjectSessionBase<
  Kind extends EditorProjectType,
  Project extends NormalizedPersistableProject,
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
  snapshot: NormalizedPersistableProject,
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
  const exactSnapshot = captureNormalizedProjectSnapshot(
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
  project: NormalizedPersistableProject,
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
  project: NormalizedPersistableProject,
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
  const project = captureNormalizedProjectSnapshot(
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
  const project = captureNormalizedProjectSnapshot(captured.project as SavedProject)
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
    ['displayName', 'lastEditorRoute'],
  )
  const id = requireSessionId(captured.sessionId)
  const project = captureNormalizedProjectSnapshot(captured.project as SavedProject)
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
      caseInsertPresetApplication: createCaseApplication(id, caseProject),
    }),
    visibleWorkspace: 'caseInsert',
  })
}

export function replaceActiveProjectContent(
  state: ApplicationLifecycleState,
  replacement: SavedProject,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)
  const project = captureNormalizedProjectSnapshot(replacement)
  assertSameProjectKind(session.kind, project)

  if (createCanonicalProjectComparisonValue(project) ===
      createCanonicalProjectComparisonValue(session.project)) {
    return state
  }

  return Object.freeze({
    ...state,
    activeSession: replaceSessionProject(session, project),
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

  let project: NormalizedPersistableProject
  try {
    project = captureNormalizedProjectSnapshot(captured.project as SavedProject)
  } catch {
    return state
  }
  if (getNormalizedProjectKind(project) !== captured.kind) return state
  return replaceActiveProjectContent(state, project as unknown as SavedProject)
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

export function adoptSavedProjectBaseline(
  state: ApplicationLifecycleState,
  input: AdoptSavedBaselineInput,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)
  const acceptedSnapshot = captureNormalizedProjectSnapshot(input.acceptedSnapshot)
  assertSameProjectKind(session.kind, acceptedSnapshot)
  const currentProject = input.currentProject
    ? captureNormalizedProjectSnapshot(input.currentProject)
    : session.project
  assertSameProjectKind(session.kind, currentProject)
  const contentAdvanced = createCanonicalProjectComparisonValue(currentProject) !==
    createCanonicalProjectComparisonValue(session.project)
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
    createCanonicalProjectComparisonValue(session.project) !==
      session.cleanBaseline.comparisonValue
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
