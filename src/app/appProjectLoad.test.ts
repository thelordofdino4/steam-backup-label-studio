import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  createBrandingSources,
} from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import {
  stageAppProjectOpen,
  type StageAppProjectOpenParams,
} from './appProjectLoad.ts'

function createDiscProjectContents(
  imageDataUrl: string | null = null,
): string {
  return JSON.stringify({
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'disc',
    title: 'Saved Disc',
    savedAt: '2026-06-03T12:00:00.000Z',
    game: {
      manualTitle: 'Saved Disc',
      selectedSteamGame: null,
    },
    template: {
      type: 'disc',
      variant: 'standardPrintableDisc',
      customDimensions: null,
    },
    steamBackupLogo: { placement: 'top' },
    background: {
      scale: 1,
      offset: { x: 0, y: 0 },
      imageDataUrl,
      note: 'two-phase Open fixture',
    },
  })
}

function paramsFor(
  contents: string,
  overrides: Partial<StageAppProjectOpenParams> = {},
): StageAppProjectOpenParams {
  return {
    openDialog: async () => 'C:\\projects\\candidate.sbls.json',
    readProjectFileCommand: async () => contents,
    defaultSteamBannerLockupImageUrl: 'default-lockup.png',
    resolveBackgroundImageSize: async () => ({ width: 320, height: 200 }),
    caseInsertBrandingSources: createBrandingSources(),
    ...overrides,
  }
}

test('Open staging cancellation performs no read or live mutation', async () => {
  let readCount = 0
  const result = await stageAppProjectOpen(paramsFor('', {
    openDialog: async (options) => {
      assert.equal(options.multiple, false)
      assert.deepEqual(options.filters?.[0]?.extensions, ['json'])
      return null
    },
    readProjectFileCommand: async () => {
      readCount += 1
      return ''
    },
  }))

  assert.deepEqual(result, {
    status: 'cancelled',
    reason: 'file-dialog-dismissed',
  })
  assert.equal(readCount, 0)
})

test('Open staging rejects an invalid array dialog response deterministically', async () => {
  const result = await stageAppProjectOpen(paramsFor('', {
    openDialog: async () => ['one.json', 'two.json'],
  }))

  assert.equal(result.status, 'failure')
  if (result.status === 'failure') {
    assert.equal(result.error.code, 'dialog.project-file-invalid-selection')
  }
})

test('Disc Open staging returns one complete immutable candidate from the accepted project', async () => {
  const selectedPath = 'D:\\labels\\disc-project.sbls.json'
  const result = await stageAppProjectOpen(paramsFor(
    createDiscProjectContents('data:image/png;base64,abc'),
    { openDialog: async () => selectedPath },
  ))

  assert.equal(result.status, 'success')
  if (result.status !== 'success') return
  const candidate = result.value
  assert.equal(candidate.projectType, 'disc')
  assert.equal(candidate.selectedPath, selectedPath)
  assert.equal(candidate.editorRoute.workspace, 'disc')
  assert.equal(candidate.normalizedProject.title, 'Saved Disc')
  assert.equal(candidate.restoredProject.manualGameTitle, 'Saved Disc')
  assert.deepEqual(candidate.restoredProject.backgroundImageSize, {
    width: 320,
    height: 200,
  })
  assert.equal(Object.isFrozen(candidate), true)
  assert.equal(Object.isFrozen(candidate.normalizedProject), true)
  assert.equal(Object.isFrozen(candidate.restoredProject), true)
  assert.equal(Object.isFrozen(candidate.restoredProject.backgroundOffset), true)
})

test('Case Insert Open staging derives normalized lifecycle and editor state together', async () => {
  const savedProject = createBlankJewelCaseSavedProject('Case Candidate')
  savedProject.editor = { activeCaseInsertTemplatePane: 'tray' }
  const result = await stageAppProjectOpen(paramsFor(JSON.stringify(savedProject)))

  assert.equal(result.status, 'success')
  if (result.status !== 'success') return
  const candidate = result.value
  assert.equal(candidate.projectType, 'caseInsert')
  assert.equal(candidate.editorRoute.surface, 'back')
  assert.equal(candidate.restoredProject.activeCaseInsertTemplatePane, 'tray')
  assert.deepEqual(
    candidate.normalizedProject.caseInsert,
    candidate.restoredProject.caseInsert,
  )
  assert.equal(Object.isFrozen(candidate), true)
  assert.equal(Object.isFrozen(candidate.normalizedProject), true)
  assert.equal(Object.isFrozen(candidate.restoredProject), true)
})

test('Open staging preserves typed read, parse, validation, migration, and image failures', async () => {
  const throwingBrandingSources = createBrandingSources()
  Object.defineProperty(throwingBrandingSources, 'projectLogoAssets', {
    enumerable: true,
    get() {
      throw new Error('private Case restore detail')
    },
  })
  const cases: readonly [StageAppProjectOpenParams, string][] = [
    [paramsFor('', {
      readProjectFileCommand: async () => { throw new Error('private read detail') },
    }), 'project.read-failed'],
    [paramsFor('{not-json'), 'project.parse-failed'],
    [paramsFor(JSON.stringify({ schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION })),
      'project.validation-failed'],
    [paramsFor(JSON.stringify({ schemaVersion: '9.9.9' })),
      'project.migration-failed'],
    [paramsFor(JSON.stringify(createBlankJewelCaseSavedProject('Bad Case')), {
      caseInsertBrandingSources: throwingBrandingSources,
    }), 'project.case-restore-failed'],
    [paramsFor(createDiscProjectContents('data:image/png;base64,bad'), {
      resolveBackgroundImageSize: async () => {
        throw new Error('private decoder detail')
      },
    }), 'project.background-image-resolution-failed'],
  ]

  for (const [params, code] of cases) {
    const result = await stageAppProjectOpen(params)
    assert.equal(result.status, 'failure')
    if (result.status === 'failure') {
      assert.equal(result.error.code, code)
      assert.equal(result.error.userMessage.includes('private'), false)
    }
  }
})

test('checked-in current and migrated Disc fixtures remain stageable', async () => {
  for (const fixturePath of [
    'fixtures/projects/full-branding.sbls.json',
    'fixtures/projects/legacy-minimal-0.1.0.sbls.json',
  ]) {
    const contents = await readFile(fixturePath, 'utf8')
    const result = await stageAppProjectOpen(paramsFor(contents))
    assert.equal(result.status, 'success', fixturePath)
    if (result.status === 'success') {
      assert.equal(result.value.projectType, 'disc')
      assert.equal(
        result.value.normalizedProject.schemaVersion,
        CURRENT_PROJECT_SCHEMA_VERSION,
      )
    }
  }
})
