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
}>

export type AdoptSavedBaselineInput = Readonly<{
  acceptedSnapshot: SavedProject
  currentPath?: string | null
  displayName?: string
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

  if (captured.workspace !== kind) {
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

  return Object.freeze({
    ...state,
    activeSession: Object.freeze({
      ...session,
      project,
      revision: session.revision + 1,
    }),
  })
}

export function updateLastEditorRoute(
  state: ApplicationLifecycleState,
  route: ProjectSessionEditorRoute,
): ApplicationLifecycleState {
  const session = requireActiveSession(state)

  return Object.freeze({
    ...state,
    activeSession: Object.freeze({
      ...session,
      lastEditorRoute: captureEditorRoute(session.kind, route),
    }),
  })
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

  return Object.freeze({
    ...state,
    activeSession: Object.freeze({
      ...session,
      currentPath: input.currentPath === undefined
        ? session.currentPath
        : input.currentPath,
      displayName: input.displayName ?? session.displayName,
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

export function selectIsActiveProjectDirty(
  state: ApplicationLifecycleState,
): boolean {
  return state.activeSession ? isProjectSessionDirty(state.activeSession) : false
}
