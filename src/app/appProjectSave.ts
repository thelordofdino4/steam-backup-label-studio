import type { EditorWorkspace } from '../editor/editorTypes.ts'
import {
  createProjectSnapshot,
  createDiscLegacyProjectProjection,
  type DiscLegacyProjectProjectionParams,
  type CreateProjectSnapshotParams,
} from '../project/createProjectSnapshot.ts'
import {
  createCaseInsertProjectSnapshot,
  type CreateCaseInsertProjectSnapshotParams,
} from '../project/projectCaseInsert.ts'

export type AppProjectSaveState = {
  activeWorkspace: EditorWorkspace
  caseInsertProject: CreateCaseInsertProjectSnapshotParams
  discProject: CreateProjectSnapshotParams
}

export function createSavedProjectForWorkspace({
  activeWorkspace,
  caseInsertProject,
  discProject,
}: AppProjectSaveState) {
  return activeWorkspace === 'caseInsert'
    ? createCaseInsertProjectSnapshot(caseInsertProject)
    : createProjectSnapshot(discProject)
}

export function createLegacyProjectForWorkspace({ activeWorkspace, caseInsertProject, discProject }:
  Omit<AppProjectSaveState, 'discProject'> & { discProject: DiscLegacyProjectProjectionParams },
) {
  return activeWorkspace === 'caseInsert'
    ? { kind: 'caseInsert' as const, project: createCaseInsertProjectSnapshot(caseInsertProject) }
    : { kind: 'disc' as const, project: createDiscLegacyProjectProjection(discProject) }
}
