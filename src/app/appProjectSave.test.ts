import assert from 'node:assert/strict'
import test from 'node:test'
import type { CreateProjectSnapshotParams } from '../project/createProjectSnapshot.ts'
import type {
  CreateCaseInsertProjectSnapshotParams,
} from '../project/projectCaseInsert.ts'
import {
  createSavedProjectForWorkspace,
} from './appProjectSave.ts'

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
