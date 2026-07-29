import type { EditorWorkspace } from '../editor/editorTypes.ts'
import {
  createProjectSnapshot,
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
