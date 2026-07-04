import type { EditorWorkspace } from '../editor/editorTypes.ts'
import {
  createProjectSnapshot,
  type CreateProjectSnapshotParams,
} from '../project/createProjectSnapshot.ts'
import {
  createCaseInsertProjectSnapshot,
  type CreateCaseInsertProjectSnapshotParams,
} from '../project/projectCaseInsert.ts'

type DialogFilter = {
  name: string
  extensions: string[]
}

export type SaveProjectDialog = (options: {
  defaultPath?: string
  filters?: DialogFilter[]
}) => Promise<string | null>

export type WriteProjectFileCommand = (
  path: string,
  contents: string,
) => Promise<unknown>

type AnnounceStatus = (message: string) => void

export type AppProjectSaveState = {
  activeWorkspace: EditorWorkspace
  caseInsertProject: CreateCaseInsertProjectSnapshotParams
  discProject: CreateProjectSnapshotParams
}

export type RunAppProjectSaveParams = AppProjectSaveState & {
  announceStatus: AnnounceStatus
  saveDialog: SaveProjectDialog
  writeProjectFileCommand: WriteProjectFileCommand
}

const PROJECT_FILE_FILTERS: DialogFilter[] = [
  {
    name: 'Steam Backup Label Studio Project',
    extensions: ['json'],
  },
]

function getDefaultProjectFileName(activeWorkspace: EditorWorkspace) {
  return activeWorkspace === 'caseInsert'
    ? 'steam-backup-case-insert.sbls.json'
    : 'steam-backup-label.sbls.json'
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

export async function runAppProjectSave({
  activeWorkspace,
  caseInsertProject,
  discProject,
  saveDialog,
  writeProjectFileCommand,
  announceStatus,
}: RunAppProjectSaveParams) {
  try {
    const path = await saveDialog({
      defaultPath: getDefaultProjectFileName(activeWorkspace),
      filters: PROJECT_FILE_FILTERS,
    })

    if (!path) {
      announceStatus('Save cancelled.')
      return
    }

    const project = createSavedProjectForWorkspace({
      activeWorkspace,
      caseInsertProject,
      discProject,
    })

    await writeProjectFileCommand(path, JSON.stringify(project, null, 2))

    announceStatus(`Saved project to ${path}`)
  } catch (error) {
    announceStatus(`Save failed: ${String(error)}`)
  }
}
