import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  createBrandingSources,
} from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import { createDefaultCaseInsertImageSlot } from '../caseInsert/defaults.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  PREVIOUS_PROJECT_SCHEMA_VERSION,
} from '../project/projectSchema.ts'
import type {
  ProjectCaseInsertReservedArtworkViewport,
} from '../project/projectTypes.ts'
import { createProjectPackageCommandFailure } from '../tauri/packageProjectFile.ts'
import { createProjectFormatRecognitionFailure } from '../tauri/projectFileFormat.ts'
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

const CASE_VIEWPORT: ProjectCaseInsertReservedArtworkViewport = {
  kind: 'sbls/case-insert-artwork-viewport',
  formatVersion: 1,
  templateId: 'jewelCase',
  templateRevision: null,
  coordinateBasis: 'backPanelSafe',
  widthPercent: 26,
  heightPercent: 16,
  focalPosition: { xPercent: 42, yPercent: 58 },
  zoom: 1.2,
}

function createCaseProjectWithViewport() {
  const project = createBlankJewelCaseSavedProject('Viewport Case Candidate')
  project.caseInsert.templates.tray.artworkSlots = [{
    ...createDefaultCaseInsertImageSlot('tray-artwork-1', 'Screenshot 1', {
      enabled: true,
      fit: 'cover',
    }),
    imageDataUrl: 'data:image/png;base64,dmlld3BvcnQ=',
    imageSource: {
      source: 'embedded',
      sourceId: null,
      sourceLabel: 'Viewport screenshot',
      sourceUrl: null,
    },
    imageSize: { width: 1600, height: 900 },
    reservedArtworkViewport: structuredClone(CASE_VIEWPORT),
  }]
  return project
}

function paramsFor(
  contents: string,
  overrides: Partial<StageAppProjectOpenParams> = {},
): StageAppProjectOpenParams {
  return {
    openDialog: async () => 'C:\\projects\\candidate.sbls.json',
    readProjectFileCommand: async () => contents,
    recognizeProjectFileFormatCommand: async () => 'legacy-json',
    decodeProjectPackageFileCommand: async () => {
      throw new Error('Package decoder must not run for legacy content.')
    },
    defaultSteamBannerLockupImageUrl: 'default-lockup.png',
    resolveBackgroundImageSize: async () => ({ width: 320, height: 200 }),
    caseInsertBrandingSources: createBrandingSources(),
    ...overrides,
  }
}

test('Open staging cancellation performs no read or live mutation', async () => {
  let readCount = 0
  let recognitionCount = 0
  let decodeCount = 0
  const result = await stageAppProjectOpen(paramsFor('', {
    openDialog: async (options) => {
      assert.equal(options.multiple, false)
      assert.deepEqual(options.filters?.[0]?.extensions, ['sbls', 'json'])
      return null
    },
    recognizeProjectFileFormatCommand: async () => {
      recognitionCount += 1
      return 'legacy-json'
    },
    readProjectFileCommand: async () => {
      readCount += 1
      return ''
    },
    decodeProjectPackageFileCommand: async () => {
      decodeCount += 1
      return new Uint8Array()
    },
  }))

  assert.deepEqual(result, {
    status: 'cancelled',
    reason: 'file-dialog-dismissed',
  })
  assert.equal(readCount, 0)
  assert.equal(recognitionCount, 0)
  assert.equal(decodeCount, 0)
})

test('content identity, not .json, .sbls.json, or .sbls suffixes, selects legacy staging', async () => {
  for (const path of [
    'C:\\projects\\legacy.json',
    'C:\\projects\\legacy.sbls.json',
    'C:\\projects\\misleading.sbls',
  ]) {
    let readCount = 0
    let decodeCount = 0
    const result = await stageAppProjectOpen(paramsFor(
      `\uFEFF \n${createDiscProjectContents()}`,
      {
        openDialog: async () => path,
        recognizeProjectFileFormatCommand: async (recognizedPath) => {
          assert.equal(recognizedPath, path)
          return 'legacy-json'
        },
        readProjectFileCommand: async (readPath) => {
          assert.equal(readPath, path)
          readCount += 1
          return `\uFEFF \n${createDiscProjectContents()}`
        },
        decodeProjectPackageFileCommand: async () => {
          decodeCount += 1
          return new Uint8Array()
        },
      },
    ))

    assert.equal(result.status, 'success', path)
    if (result.status === 'success') {
      assert.equal(result.value.persistenceFormat, 'legacy-json')
      assert.equal(result.value.selectedPath, path)
    }
    assert.equal(readCount, 1)
    assert.equal(decodeCount, 0)
  }
})

test('package identity dispatches only to native decode regardless of suffix casing', async () => {
  const hydrated = new TextEncoder().encode(createDiscProjectContents())
  for (const path of [
    'C:\\projects\\package.sbls',
    'C:\\projects\\package.SBLS',
    'C:\\projects\\misleading.json',
  ]) {
    let readCount = 0
    let decodeCount = 0
    const result = await stageAppProjectOpen(paramsFor('', {
      openDialog: async () => path,
      recognizeProjectFileFormatCommand: async () => 'sbls-package-v1',
      readProjectFileCommand: async () => {
        readCount += 1
        return createDiscProjectContents()
      },
      decodeProjectPackageFileCommand: async (decodedPath) => {
        assert.equal(decodedPath, path)
        decodeCount += 1
        return hydrated
      },
    }))

    assert.equal(result.status, 'success', path)
    if (result.status === 'success') {
      assert.equal(result.value.persistenceFormat, 'sbls-package-v1')
      assert.equal(result.value.selectedPath, path)
    }
    assert.equal(readCount, 0)
    assert.equal(decodeCount, 1)
  }
})

test('recognition and package failures remain typed and never fall back to JSON', async () => {
  const recognitionFailure = createProjectFormatRecognitionFailure()
  let readCount = 0
  let decodeCount = 0
  const unrecognized = await stageAppProjectOpen(paramsFor('', {
    recognizeProjectFileFormatCommand: async () => {
      throw recognitionFailure
    },
    readProjectFileCommand: async () => {
      readCount += 1
      return createDiscProjectContents()
    },
    decodeProjectPackageFileCommand: async () => {
      decodeCount += 1
      return new Uint8Array()
    },
  }))
  assert.equal(unrecognized.status, 'failure')
  if (unrecognized.status === 'failure') {
    assert.equal(unrecognized.error.code, 'project.format.unsupported')
  }
  assert.equal(readCount, 0)
  assert.equal(decodeCount, 0)

  const packageFailure = createProjectPackageCommandFailure(
    'project.package.archive-invalid',
    'archive-envelope',
  )
  const malformedPackage = await stageAppProjectOpen(paramsFor('', {
    recognizeProjectFileFormatCommand: async () => 'sbls-package-v1',
    readProjectFileCommand: async () => {
      readCount += 1
      return createDiscProjectContents()
    },
    decodeProjectPackageFileCommand: async () => {
      decodeCount += 1
      throw packageFailure
    },
  }))
  assert.equal(malformedPackage.status, 'failure')
  if (malformedPackage.status === 'failure') {
    assert.equal(
      malformedPackage.error.code,
      'project.package.archive-invalid',
    )
  }
  assert.equal(readCount, 0)
  assert.equal(decodeCount, 1)
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

test('current Case JSON stages exact viewport, image, and provenance without applying a preset', async () => {
  const project = createCaseProjectWithViewport()
  const result = await stageAppProjectOpen(paramsFor(JSON.stringify(project)))

  assert.equal(result.status, 'success')
  if (result.status !== 'success') return
  assert.equal(result.value.projectType, 'caseInsert')
  const normalizedSlot = result.value.normalizedProject.caseInsert
    .templates.tray.artworkSlots[0]
  const restoredSlot = result.value.restoredProject.caseInsert
    .templates.tray.artworkSlots[0]
  assert.deepEqual(normalizedSlot?.reservedArtworkViewport, CASE_VIEWPORT)
  assert.deepEqual(restoredSlot?.reservedArtworkViewport, CASE_VIEWPORT)
  assert.equal(
    restoredSlot?.imageDataUrl,
    'data:image/png;base64,dmlld3BvcnQ=',
  )
  assert.equal(restoredSlot?.imageSource?.sourceLabel, 'Viewport screenshot')
  assert.deepEqual(
    result.value.caseInsertPresetRecovery?.persistedState.attachment,
    { status: 'unattached' },
  )
})

test('legacy 0.3.0 Case JSON migrates missing viewport state to canonical omission', async () => {
  const current = createCaseProjectWithViewport()
  const legacy = JSON.parse(JSON.stringify(
    current,
    (key, value: unknown) => key === 'reservedArtworkViewport'
      ? undefined
      : value,
  )) as Record<string, unknown>
  legacy.schemaVersion = PREVIOUS_PROJECT_SCHEMA_VERSION

  const result = await stageAppProjectOpen(paramsFor(JSON.stringify(legacy)))

  assert.equal(result.status, 'success')
  if (result.status !== 'success') return
  assert.equal(result.value.projectType, 'caseInsert')
  assert.equal(
    result.value.normalizedProject.schemaVersion,
    CURRENT_PROJECT_SCHEMA_VERSION,
  )
  const normalizedSlot = result.value.normalizedProject.caseInsert
    .templates.tray.artworkSlots[0]
  const restoredSlot = result.value.restoredProject.caseInsert
    .templates.tray.artworkSlots[0]
  assert.ok(normalizedSlot)
  assert.ok(restoredSlot)
  assert.equal(Object.hasOwn(normalizedSlot, 'reservedArtworkViewport'), false)
  assert.equal(Object.hasOwn(restoredSlot, 'reservedArtworkViewport'), false)
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
