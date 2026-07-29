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
  PROJECT_PACKAGE_FAILURE_REGISTRY,
  createProjectPackageCommandFailure,
} from '../tauri/packageProjectFile.ts'
import {
  createProjectFileCommandFailure,
} from '../tauri/binaryProjectFile.ts'
import {
  stageProjectPackageOpen,
  type ProjectOpenRestorationDependencies,
  type StageProjectPackageOpenParams,
} from './appProjectLoad.ts'

function restorationDependencies(): ProjectOpenRestorationDependencies {
  return {
    defaultSteamBannerLockupImageUrl: 'default-lockup.png',
    resolveBackgroundImageSize: async () => ({ width: 320, height: 200 }),
    caseInsertBrandingSources: createBrandingSources(),
  }
}

function packageParams(
  hydratedBytes: Uint8Array,
  overrides: Partial<StageProjectPackageOpenParams> = {},
): StageProjectPackageOpenParams {
  return {
    ...restorationDependencies(),
    selectedPath: 'C:\\projects\\candidate.sbls',
    decodeProjectPackageFileCommand: async () => hydratedBytes,
    ...overrides,
  }
}

function discProjectWithBackground(imageDataUrl: string): string {
  return JSON.stringify({
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'disc',
    title: 'Packaged Disc',
    savedAt: '2026-07-28T12:00:00.000Z',
    game: {
      manualTitle: 'Packaged Disc',
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
    },
  })
}

test('package staging accepts current and migrated Disc JSON through the shared owner', async () => {
  for (const fixturePath of [
    'fixtures/projects/full-branding.sbls.json',
    'fixtures/projects/legacy-minimal-0.1.0.sbls.json',
  ]) {
    const contents = await readFile(fixturePath, 'utf8')
    const bytes = new TextEncoder().encode(contents)
    const before = bytes.slice()
    let decodedPath = ''
    const result = await stageProjectPackageOpen(packageParams(bytes, {
      selectedPath: 'D:\\packages\\disc-project.sbls',
      decodeProjectPackageFileCommand: async (path) => {
        decodedPath = path
        return bytes
      },
    }))

    assert.equal(result.status, 'success', fixturePath)
    assert.equal(decodedPath, 'D:\\packages\\disc-project.sbls')
    assert.deepEqual(bytes, before)
    if (result.status !== 'success') continue
    assert.equal(result.value.projectType, 'disc')
    assert.equal(result.value.persistenceFormat, 'sbls-package-v1')
    assert.equal(result.value.selectedPath, decodedPath)
    assert.equal(
      result.value.normalizedProject.schemaVersion,
      CURRENT_PROJECT_SCHEMA_VERSION,
    )
    assert.equal(Object.isFrozen(result.value), true)
    assert.equal(Object.isFrozen(result.value.normalizedProject), true)
    assert.equal(Object.isFrozen(result.value.restoredProject), true)
  }
})

test('package staging accepts Case JSON through the same route and restore owner', async () => {
  const project = createBlankJewelCaseSavedProject('Packaged Case')
  project.editor = { activeCaseInsertTemplatePane: 'tray' }
  const bytes = new TextEncoder().encode(JSON.stringify(project))

  const result = await stageProjectPackageOpen(packageParams(bytes))

  assert.equal(result.status, 'success')
  if (result.status !== 'success') return
  assert.equal(result.value.projectType, 'caseInsert')
  assert.equal(result.value.persistenceFormat, 'sbls-package-v1')
  assert.equal(result.value.editorRoute.surface, 'back')
  assert.equal(result.value.restoredProject.activeCaseInsertTemplatePane, 'tray')
  assert.deepEqual(
    result.value.normalizedProject.caseInsert,
    result.value.restoredProject.caseInsert,
  )
  assert.equal(Object.isFrozen(result.value.normalizedProject), true)
})

test('hydrated asset data reaches existing background inspection without package metadata', async () => {
  const asset = 'data:image/bmp;base64,Qk0='
  const inspected: string[] = []
  const result = await stageProjectPackageOpen(packageParams(
    new TextEncoder().encode(discProjectWithBackground(asset)),
    {
      resolveBackgroundImageSize: async (imageDataUrl) => {
        inspected.push(imageDataUrl)
        return { width: 1, height: 1 }
      },
    },
  ))

  assert.equal(result.status, 'success')
  assert.deepEqual(inspected, [asset])
  if (result.status !== 'success') return
  assert.equal(result.value.restoredProject.backgroundImageUrl, asset)
  const candidateText = JSON.stringify(result.value)
  assert.doesNotMatch(candidateText, /packageVersion|manifest\.json|bindings/i)
})

test('strict UTF-8 failure is typed and does not mutate caller-owned bytes', async () => {
  const bytes = new Uint8Array([0xc3, 0x28])
  const before = bytes.slice()

  const result = await stageProjectPackageOpen(packageParams(bytes))

  assert.equal(result.status, 'failure')
  assert.deepEqual(bytes, before)
  if (result.status !== 'failure') return
  assert.equal(result.error.code, 'project.package.hydrated-json-invalid')
  assert.equal(result.error.recoverable, true)
  assert.deepEqual(result.error.cause, { stage: 'binding-hydration' })
  assert.equal(
    result.error.userMessage,
    PROJECT_PACKAGE_FAILURE_REGISTRY[
      'project.package.hydrated-json-invalid'
    ].message,
  )
})

test('package staging preserves all 27 exact package failure mappings', async () => {
  for (const [code, definition] of Object.entries(
    PROJECT_PACKAGE_FAILURE_REGISTRY,
  )) {
    const expected = createProjectPackageCommandFailure(
      code as keyof typeof PROJECT_PACKAGE_FAILURE_REGISTRY,
      'asset-validation',
    )
    const result = await stageProjectPackageOpen(packageParams(
      new Uint8Array(),
      {
        decodeProjectPackageFileCommand: async () => { throw expected },
      },
    ))

    assert.equal(result.status, 'failure', code)
    if (result.status !== 'failure') continue
    assert.equal(result.error.code, code)
    assert.equal(result.error.userMessage, definition.message)
    assert.equal(result.error.recoverable, definition.recoverable)
    assert.deepEqual(result.error.cause, { stage: 'asset-validation' })
    assert.doesNotMatch(result.error.userMessage, /private|path|decoder/i)
  }
})

test('package staging preserves file failures and sanitizes unknown decode rejection', async () => {
  const fileFailure = createProjectFileCommandFailure(
    'project.read-failed',
    'permission-denied',
    'project-binary-read-open',
  )
  const known = await stageProjectPackageOpen(packageParams(
    new Uint8Array(),
    { decodeProjectPackageFileCommand: async () => { throw fileFailure } },
  ))
  assert.equal(known.status, 'failure')
  if (known.status === 'failure') {
    assert.equal(known.error.code, 'project.read-failed')
    assert.equal(known.error.userMessage, fileFailure.message)
    assert.deepEqual(known.error.cause, fileFailure.cause)
  }

  const unknown = await stageProjectPackageOpen(packageParams(
    new Uint8Array(),
    {
      decodeProjectPackageFileCommand: async () => {
        throw new Error('SECRET decode rejection')
      },
    },
  ))
  assert.equal(unknown.status, 'failure')
  if (unknown.status === 'failure') {
    assert.equal(unknown.error.code, 'project.read-failed')
    assert.doesNotMatch(JSON.stringify(unknown.error), /SECRET/)
  }
})

test('shared schema taxonomy is unchanged for package-hydrated JSON', async () => {
  const cases = [
    ['{not-json', 'project.parse-failed'],
    [
      JSON.stringify({ schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION }),
      'project.validation-failed',
    ],
    [JSON.stringify({ schemaVersion: '9.9.9' }), 'project.migration-failed'],
  ] as const

  for (const [contents, expectedCode] of cases) {
    const result = await stageProjectPackageOpen(packageParams(
      new TextEncoder().encode(contents),
    ))
    assert.equal(result.status, 'failure')
    if (result.status === 'failure') {
      assert.equal(result.error.code, expectedCode)
    }
  }
})

test('existing background inspection failure remains typed and mutation-free', async () => {
  const result = await stageProjectPackageOpen(packageParams(
    new TextEncoder().encode(
      discProjectWithBackground('data:image/png;base64,bad'),
    ),
    {
      resolveBackgroundImageSize: async () => {
        throw new Error('private decoder detail')
      },
    },
  ))

  assert.equal(result.status, 'failure')
  if (result.status === 'failure') {
    assert.equal(
      result.error.code,
      'project.background-image-resolution-failed',
    )
    assert.doesNotMatch(result.error.userMessage, /private/)
  }
})
