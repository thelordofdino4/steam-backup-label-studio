import type {
  RestoredCaseInsertProjectState,
} from '../project/projectCaseInsert.ts'
import { resolveSavedProjectRouteFromContents } from '../project/projectRouting.ts'
import type { RestoredProjectState } from '../project/restoreProjectState.ts'
import {
  applyRestoredCaseInsertProjectState,
  applyRestoredDiscProjectState,
  type ApplyRestoredCaseInsertProjectStateParams,
  type ApplyRestoredDiscProjectStateParams,
} from './appProjectRestore.ts'

type DialogFilter = {
  name: string
  extensions: string[]
}

type AnnounceStatus = (message: string) => void

export type OpenProjectDialog = (options: {
  filters?: DialogFilter[]
  multiple?: boolean
}) => Promise<string | string[] | null>

export type ReadProjectFileCommand = (path: string) => Promise<string>

export type RestoreCaseInsertProjectStateCommand = (
  contents: string,
) => RestoredCaseInsertProjectState

export type RestoreDiscProjectStateCommand = (
  contents: string,
) => Promise<RestoredProjectState>

type CaseInsertRestoreCallbacks = Omit<
  ApplyRestoredCaseInsertProjectStateParams,
  'restoredProject'
>

type DiscRestoreCallbacks = Omit<
  ApplyRestoredDiscProjectStateParams,
  'restoredProject'
>

export type RunAppProjectLoadParams = {
  announceStatus: AnnounceStatus
  caseInsertRestore: CaseInsertRestoreCallbacks
  discRestore: DiscRestoreCallbacks
  openDialog: OpenProjectDialog
  readProjectFileCommand: ReadProjectFileCommand
  restoreCaseInsertProjectState: RestoreCaseInsertProjectStateCommand
  restoreDiscProjectState: RestoreDiscProjectStateCommand
}

const PROJECT_FILE_FILTERS: DialogFilter[] = [
  {
    name: 'Steam Backup Label Studio Project',
    extensions: ['json'],
  },
]

export async function runAppProjectLoad({
  announceStatus,
  caseInsertRestore,
  discRestore,
  openDialog,
  readProjectFileCommand,
  restoreCaseInsertProjectState,
  restoreDiscProjectState,
}: RunAppProjectLoadParams) {
  try {
    const selected = await openDialog({
      multiple: false,
      filters: PROJECT_FILE_FILTERS,
    })

    if (!selected || Array.isArray(selected)) {
      announceStatus('Load cancelled.')
      return
    }

    const contents = await readProjectFileCommand(selected)
    const projectRoute = resolveSavedProjectRouteFromContents(contents)

    if (projectRoute.projectType === 'caseInsert') {
      const restoredProject = restoreCaseInsertProjectState(contents)

      applyRestoredCaseInsertProjectState({
        restoredProject,
        ...caseInsertRestore,
      })
      announceStatus(
        'Loaded case insert project template, metadata, and preview geometry.',
      )
      return
    }

    const restoredProject = await restoreDiscProjectState(contents)

    applyRestoredDiscProjectState({
      restoredProject,
      ...discRestore,
    })

    announceStatus(
      restoredProject.backgroundImageUrl
        ? 'Loaded project layout, game metadata, embedded background image, and template geometry.'
        : 'Loaded project layout, game metadata, and template geometry. No embedded background image was found.',
    )
  } catch (error) {
    announceStatus(`Load failed: ${String(error)}`)
  }
}
