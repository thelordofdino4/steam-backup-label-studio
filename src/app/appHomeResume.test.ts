import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createEmptyApplicationLifecycleState,
  createLoadedProjectSession,
  replaceActiveProjectContent,
  returnProjectSessionHome,
} from '../lifecycle/projectSession.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import { selectHomeResumeProjectSummary } from './appHomeResume.ts'

test('Home Resume is absent without a retained Home session', () => {
  assert.equal(
    selectHomeResumeProjectSummary(createEmptyApplicationLifecycleState()),
    null,
  )
})

test('Home Resume truthfully describes exact Case route and clean/dirty state', () => {
  const project = createBlankJewelCaseSavedProject()
  const loaded = createLoadedProjectSession({
    sessionId: 'resume-case',
    project,
    currentPath: 'resume-case.sbls',
    persistenceFormat: 'sbls-package-v1',
    displayName: 'My Case Project',
    lastEditorRoute: { workspace: 'caseInsert', surface: 'back' },
  })
  assert.equal(selectHomeResumeProjectSummary(loaded), null)
  const home = returnProjectSessionHome(loaded)
  assert.deepEqual(selectHomeResumeProjectSummary(home), {
    title: 'Resume Case Insert Project',
    description: 'My Case Project',
    status: 'All changes saved · Back surface',
  })

  const edited = replaceActiveProjectContent(home, {
    ...project,
    title: 'Edited Case Project',
    game: { ...project.game, manualTitle: 'Edited Case Project' },
  })
  assert.deepEqual(selectHomeResumeProjectSummary(edited), {
    title: 'Resume Case Insert Project',
    description: 'My Case Project',
    status: 'Unsaved changes · Back surface',
  })
})
