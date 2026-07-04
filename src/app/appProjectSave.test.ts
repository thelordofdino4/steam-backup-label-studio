import assert from 'node:assert/strict'
import test from 'node:test'
import type { CreateProjectSnapshotParams } from '../project/createProjectSnapshot.ts'
import type {
  CreateCaseInsertProjectSnapshotParams,
} from '../project/projectCaseInsert.ts'
import {
  createSavedProjectForWorkspace,
  runAppProjectSave,
  type SaveProjectDialog,
  type WriteProjectFileCommand,
} from './appProjectSave.ts'

function createStatusRecorder(statuses: string[]) {
  return (message: string) => statuses.push(message)
}

test('project save reports cancellation before writing a project file', async () => {
  const calls: string[] = []
  const statuses: string[] = []
  const saveDialog: SaveProjectDialog = async (options) => {
    calls.push(
      `save:${options.defaultPath}:${options.filters?.[0]?.extensions.join(',')}`,
    )
    return null
  }
  const writeProjectFileCommand: WriteProjectFileCommand = async () => {
    calls.push('write')
  }

  await runAppProjectSave({
    activeWorkspace: 'disc',
    caseInsertProject: {},
    discProject: {} as CreateProjectSnapshotParams,
    saveDialog,
    writeProjectFileCommand,
    announceStatus: createStatusRecorder(statuses),
  })

  assert.deepEqual(calls, ['save:steam-backup-label.sbls.json:json'])
  assert.deepEqual(statuses, ['Save cancelled.'])
})

test('case insert project save uses the case insert default path and snapshot route', async () => {
  const calls: string[] = []
  const statuses: string[] = []

  await runAppProjectSave({
    activeWorkspace: 'caseInsert',
    caseInsertProject: {
      manualGameTitle: 'Case Insert Title',
      activeCaseInsertTemplatePane: 'tray',
    },
    discProject: {} as CreateProjectSnapshotParams,
    saveDialog: async (options) => {
      calls.push(`save:${options.defaultPath}`)
      return 'case-insert.sbls.json'
    },
    writeProjectFileCommand: async (path, contents) => {
      const project = JSON.parse(contents) as { projectType: string; title: string }
      calls.push(`write:${path}:${project.projectType}:${project.title}`)
    },
    announceStatus: createStatusRecorder(statuses),
  })

  assert.deepEqual(calls, [
    'save:steam-backup-case-insert.sbls.json',
    'write:case-insert.sbls.json:caseInsert:Case Insert Title',
  ])
  assert.deepEqual(statuses, ['Saved project to case-insert.sbls.json'])
})

test('saved project snapshot selection follows the active workspace', () => {
  const caseInsertProject: CreateCaseInsertProjectSnapshotParams = {
    manualGameTitle: 'Case Insert Title',
  }
  const discProject = {
    manualGameTitle: 'Disc Title',
  } as CreateProjectSnapshotParams

  assert.equal(
    createSavedProjectForWorkspace({
      activeWorkspace: 'caseInsert',
      caseInsertProject,
      discProject,
    }).projectType,
    'caseInsert',
  )
  assert.equal(
    createSavedProjectForWorkspace({
      activeWorkspace: 'disc',
      caseInsertProject,
      discProject,
    }).projectType,
    'disc',
  )
})
