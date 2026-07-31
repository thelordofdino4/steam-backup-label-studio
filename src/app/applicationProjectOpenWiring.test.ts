import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('production mounts one lifecycle runtime and current lifecycle surfaces share semantic dispatch and feedback', async () => {
  const [mainSource, appSource, homeSource, discSource, caseSource] =
    await Promise.all([
      readFile('src/main.tsx', 'utf8'),
      readFile('src/app/App.tsx', 'utf8'),
      readFile('src/components/home/HomeScreen.tsx', 'utf8'),
      readFile('src/components/sidebar/ProjectPanel.tsx', 'utf8'),
      readFile('src/components/caseInsert/CaseInsertEditorShell.tsx', 'utf8'),
    ])

  assert.equal(
    (mainSource.match(/createApplicationLifecycleRuntime\(\)/g) ?? []).length,
    1,
  )
  assert.match(mainSource, /ApplicationLifecycleBoundary runtime=/)
  assert.equal(mainSource.includes('createApplicationLifecycleCompositionRoot'), false)
  assert.equal(
    (appSource.match(/applicationLifecycleRoot\.dispatch\(commandId\)/g) ?? [])
      .length,
    1,
  )
  assert.equal(appSource.includes('runAppProjectLoad'), false)
  assert.equal(
    (appSource.match(/(?:onLoadProject|handleLoadProject)=\{handleLoadProject\}/g)
      ?? []).length,
    3,
  )
  assert.equal(
    (appSource.match(/dispatchNewProject\('project\.new-disc'\)/g) ?? []).length,
    2,
  )
  assert.equal(
    (appSource.match(/dispatchNewProject\('project\.new-case'\)/g) ?? []).length,
    2,
  )
  assert.equal(appSource.includes('pendingNewProjectSession'), false)
  assert.equal(appSource.includes('getProjectOpenCompatibilityFeedback'), false)
  assert.match(appSource, /dispatchApplicationCommand\('project\.open'\)/)
  assert.match(
    appSource,
    /dispatchApplicationCommand\('workspace\.return-home'\)/,
  )
  assert.match(appSource, /dispatchApplicationCommand\('project\.resume'\)/)
  assert.equal(
    (appSource.match(/dispatchApplicationCommand\('export\.png'\)/g) ?? [])
      .length,
    1,
  )
  assert.equal(appSource.includes('runDiscPngExport('), false)
  assert.equal(appSource.includes('runCaseInsertPngExport('), false)
  assert.match(appSource, /publishApplicationCommandFeedback\(result,/)
  assert.match(appSource, /synchronizeCurrentEditorRoute\(/)
  assert.match(appSource, /getElementById\('home-resume-project'\)/)
  assert.match(appSource, /id="disc-editor-heading" tabIndex=\{-1\}/)
  assert.equal(appSource.includes('Return to the main menu?'), false)
  assert.match(homeSource, /onClick=\{onLoadProject\}/)
  assert.match(homeSource, /onClick=\{onNewDisc\}/)
  assert.match(homeSource, /onClick=\{onNewCaseInsert\}/)
  assert.match(homeSource, /onClick=\{onResumeProject\}/)
  assert.match(homeSource, /id="home-title" tabIndex=\{-1\}/)
  assert.match(homeSource, /role="status"/)
  assert.match(discSource, /onClick=\{handleLoadProject\}/)
  assert.match(discSource, /onClick=\{handleNewProject\}/)
  assert.match(discSource, /onClick=\{handleNewCaseInsert\}/)
  assert.match(
    discSource,
    /disabled=\{exportPngDisabled\}[\s\S]*onClick=\{handleExportPng\}/,
  )
  assert.match(caseSource, /onClick=\{onLoadProject\}/)
  assert.match(caseSource, /onClick=\{onNewDisc\}/)
  assert.match(caseSource, /onClick=\{onNewCaseInsert\}/)
  assert.match(
    caseSource,
    /disabled=\{exportPngDisabled\}[\s\S]*onClick=\{onExportPng\}/,
  )
  assert.match(caseSource, /id="case-insert-editor-heading" tabIndex=\{-1\}/)
  assert.equal(appSource.includes("dispatch('menu."), false)
})
