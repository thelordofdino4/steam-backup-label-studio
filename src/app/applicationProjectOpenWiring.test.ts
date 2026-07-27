import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('production mounts one lifecycle runtime and every current Load surface shares one dispatch handler', async () => {
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
    (appSource.match(/dispatch\('project\.open'\)/g) ?? []).length,
    1,
  )
  assert.equal(appSource.includes('runAppProjectLoad'), false)
  assert.equal(
    (appSource.match(/(?:onLoadProject|handleLoadProject)=\{handleLoadProject\}/g)
      ?? []).length,
    3,
  )
  assert.match(homeSource, /onClick=\{onLoadProject\}/)
  assert.match(discSource, /onClick=\{handleLoadProject\}/)
  assert.match(caseSource, /onClick=\{onLoadProject\}/)
  assert.equal(appSource.includes("dispatch('menu."), false)
})
