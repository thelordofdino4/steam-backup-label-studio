import type {
  EditorProjectType,
  EditorWorkspace,
} from '../editor/editorTypes.ts'
import type { SavedProject } from '../project/projectTypes.ts'
import {
  captureNormalizedProjectSnapshot,
  createCanonicalProjectComparisonValue,
  getNormalizedProjectKind,
  type CanonicalProjectComparisonValue,
  type NormalizedPersistableProject,
} from './canonicalProject.ts'

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

export type ProjectSession = Readonly<{
  id: ProjectSessionId
  kind: EditorProjectType
  currentPath: string | null
  persistenceFormat: ProjectPersistenceFormat | null
  displayName: string
  project: NormalizedPersistableProject
  cleanBaseline: ProjectCleanBaseline | null
  revision: number
  lastEditorRoute: ProjectSessionEditorRoute
}>

export type ApplicationLifecycleState = Readonly<{
  activeSession: ProjectSession | null
  visibleWorkspace: EditorWorkspace
}>

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

function defaultEditorRoute(kind: EditorProjectType): ProjectSessionEditorRoute {
  return kind === 'disc'
    ? Object.freeze({ workspace: 'disc' })
    : Object.freeze({ workspace: 'caseInsert', surface: 'front' })
}

function captureEditorRoute(
  kind: EditorProjectType,
  route: ProjectSessionEditorRoute | undefined,
): ProjectSessionEditorRoute {
  const captured = route ?? defaultEditorRoute(kind)

  if (
    captured.workspace !== kind ||
    (captured.workspace === 'caseInsert' &&
      captured.surface !== 'front' &&
      captured.surface !== 'back' &&
      captured.surface !== 'spine')
  ) {
    throw new Error(
      `Editor route ${captured.workspace} does not match project kind ${kind}.`,
    )
  }

  return Object.freeze({ ...captured })
}

function createBaseline(
  snapshot: NormalizedPersistableProject,
): ProjectCleanBaseline {
  return Object.freeze({
    exactSnapshot: snapshot,
    comparisonValue: createCanonicalProjectComparisonValue(snapshot),
  })
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

export function createEmptyApplicationLifecycleState(): ApplicationLifecycleState {
  return Object.freeze({
    activeSession: null,
    visibleWorkspace: 'home',
  })
}

/**
 * Captures session state at an application-owned boundary. Session metadata is
 * copied while both project snapshots are revalidated and deeply frozen.
 */
export function captureApplicationLifecycleState(
  state: ApplicationLifecycleState,
): ApplicationLifecycleState {
  const session = state.activeSession
  if (!session) {
    if (state.visibleWorkspace !== 'home') {
      throw new Error('An editor workspace requires an active project session.')
    }
    return createEmptyApplicationLifecycleState()
  }

  const project = captureNormalizedProjectSnapshot(session.project as SavedProject)
  assertSameProjectKind(session.kind, project)
  const baselineSnapshot = session.cleanBaseline
    ? captureNormalizedProjectSnapshot(
        session.cleanBaseline.exactSnapshot as SavedProject,
      )
    : null
  if (baselineSnapshot) assertSameProjectKind(session.kind, baselineSnapshot)
  if (
    state.visibleWorkspace !== 'home' &&
    state.visibleWorkspace !== session.kind
  ) {
    throw new Error(
      `Workspace ${state.visibleWorkspace} does not match project kind ` +
      `${session.kind}.`,
    )
  }

  return Object.freeze({
    activeSession: Object.freeze({
      id: session.id,
      kind: session.kind,
      currentPath: session.currentPath,
      persistenceFormat: session.persistenceFormat,
      displayName: session.displayName,
      project,
      cleanBaseline: baselineSnapshot
        ? createBaseline(baselineSnapshot)
        : null,
      revision: session.revision,
      lastEditorRoute: captureEditorRoute(
        session.kind,
        session.lastEditorRoute,
      ),
    }),
    visibleWorkspace: state.visibleWorkspace,
  })
}

export function createNewProjectSession(
  input: NewProjectSessionInput,
): ApplicationLifecycleState {
  const project = captureNormalizedProjectSnapshot(input.project)
  const kind = getNormalizedProjectKind(project)

  return Object.freeze({
    activeSession: Object.freeze({
      id: input.sessionId,
      kind,
      currentPath: null,
      persistenceFormat: null,
      displayName: input.displayName ?? project.title,
      project,
      cleanBaseline: null,
      revision: 0,
      lastEditorRoute: captureEditorRoute(kind, input.lastEditorRoute),
    }),
    visibleWorkspace: kind,
  })
}

export function createLoadedProjectSession(
  input: LoadedProjectSessionInput,
): ApplicationLifecycleState {
  const project = captureNormalizedProjectSnapshot(input.project)
  const kind = getNormalizedProjectKind(project)

  return Object.freeze({
    activeSession: Object.freeze({
      id: input.sessionId,
      kind,
      currentPath: input.currentPath,
      persistenceFormat: input.persistenceFormat,
      displayName: input.displayName ?? project.title,
      project,
      cleanBaseline: createBaseline(project),
      revision: 0,
      lastEditorRoute: captureEditorRoute(kind, input.lastEditorRoute),
    }),
    visibleWorkspace: kind,
  })
}

export function replaceActiveProjectContent(
  state: ApplicationLifecycleState,
  replacement: SavedProject,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)
  const project = captureNormalizedProjectSnapshot(replacement)
  assertSameProjectKind(session.kind, project)

  if (
    createCanonicalProjectComparisonValue(project) ===
      createCanonicalProjectComparisonValue(session.project)
  ) {
    return state
  }

  return Object.freeze({
    ...state,
    activeSession: Object.freeze({
      ...session,
      project,
      revision: session.revision + 1,
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
  const session = state.activeSession
  if (
    !session ||
    session.id !== input.sessionId ||
    session.kind !== input.kind
  ) {
    return state
  }

  const project = captureNormalizedProjectSnapshot(input.project)
  if (getNormalizedProjectKind(project) !== input.kind) return state

  return replaceActiveProjectContent(
    state,
    project as unknown as SavedProject,
  )
}

export function updateLastEditorRoute(
  state: ApplicationLifecycleState,
  route: ProjectSessionEditorRoute,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)
  const capturedRoute = captureEditorRoute(session.kind, route)
  if (
    capturedRoute.workspace === session.lastEditorRoute.workspace &&
    (capturedRoute.workspace === 'disc' ||
      (session.lastEditorRoute.workspace === 'caseInsert' &&
        capturedRoute.surface === session.lastEditorRoute.surface))
  ) {
    return state
  }

  return Object.freeze({
    ...state,
    activeSession: Object.freeze({
      ...session,
      lastEditorRoute: capturedRoute,
    }),
  })
}

/**
 * Synchronizes exact editor navigation without treating navigation as project
 * content. Stale sessions and mismatched kinds are safe semantic no-ops.
 */
export function synchronizeActiveProjectRoute(
  state: ApplicationLifecycleState,
  input: SynchronizeProjectRouteInput,
): ApplicationLifecycleState {
  const session = state.activeSession
  if (
    !session ||
    session.id !== input.sessionId ||
    session.kind !== input.kind ||
    input.route.workspace !== input.kind
  ) {
    return state
  }

  return updateLastEditorRoute(state, input.route)
}

export function returnProjectSessionHome(
  state: ApplicationLifecycleState,
): ApplicationLifecycleState {
  if (state.visibleWorkspace === 'home') return state
  requireActiveSession(state)

  return Object.freeze({
    ...state,
    visibleWorkspace: 'home',
  })
}

export function resumeProjectSession(
  state: ApplicationLifecycleState,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)

  return Object.freeze({
    ...state,
    visibleWorkspace: session.kind,
  })
}

export function adoptSavedProjectBaseline(
  state: ApplicationLifecycleState,
  input: AdoptSavedBaselineInput,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)
  const acceptedSnapshot = captureNormalizedProjectSnapshot(
    input.acceptedSnapshot,
  )
  assertSameProjectKind(session.kind, acceptedSnapshot)
  const currentProject = input.currentProject
    ? captureNormalizedProjectSnapshot(input.currentProject)
    : session.project
  assertSameProjectKind(session.kind, currentProject)
  const contentAdvanced = createCanonicalProjectComparisonValue(currentProject) !==
    createCanonicalProjectComparisonValue(session.project)

  return Object.freeze({
    ...state,
    activeSession: Object.freeze({
      ...session,
      currentPath: input.currentPath === undefined
        ? session.currentPath
        : input.currentPath,
      persistenceFormat: input.persistenceFormat === undefined
        ? session.persistenceFormat
        : input.persistenceFormat,
      displayName: input.displayName ?? session.displayName,
      project: currentProject,
      cleanBaseline: createBaseline(acceptedSnapshot),
      revision: contentAdvanced ? session.revision + 1 : session.revision,
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
