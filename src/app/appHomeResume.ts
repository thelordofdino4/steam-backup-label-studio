import type {
  ApplicationLifecycleState,
} from '../lifecycle/projectSession.ts'
import { isProjectSessionDirty } from '../lifecycle/projectSession.ts'

export type HomeResumeProjectSummary = Readonly<{
  title: string
  description: string
  status: string
}>

/** Projects truthful Home copy from the retained lifecycle session only. */
export function selectHomeResumeProjectSummary(
  state: ApplicationLifecycleState,
): HomeResumeProjectSummary | null {
  const session = state.activeSession
  if (!session || state.visibleWorkspace !== 'home') return null

  const kindLabel = session.kind === 'disc' ? 'Disc' : 'Case Insert'
  const routeLabel = session.lastEditorRoute.workspace === 'disc'
    ? 'Disc editor'
    : `${session.lastEditorRoute.surface[0].toUpperCase()}${
        session.lastEditorRoute.surface.slice(1)
      } surface`
  const stateLabel = isProjectSessionDirty(session)
    ? 'Unsaved changes'
    : 'All changes saved'
  return Object.freeze({
    title: `Resume ${kindLabel} Project`,
    description: session.displayName,
    status: `${stateLabel} · ${routeLabel}`,
  })
}
