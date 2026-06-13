import assert from 'node:assert/strict'
import test from 'node:test'
import { createCaseInsertProjectSnapshot } from './caseInsertProjectAdapters.ts'
import { normalizeParsedProject } from './normalizeProject.ts'
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  ProjectSchemaError,
  getSavedProjectSchemaIssues,
  parseProjectJsonRecord,
  parseSavedProjectContents,
} from './projectSchema.ts'

test('case insert snapshots use the shared current project schema version', () => {
  const project = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Schema Fixture Case',
    savedAt: '2026-06-03T12:00:00.000Z',
  })

  assert.equal(project.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION)
})

test('project parse adapters preserve saved project payload compatibility', () => {
  const contents = JSON.stringify({
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
    steamBackupLogo: {
      placement: 'top',
    },
    background: {
      scale: 1,
      offset: { x: 0, y: 0 },
      imageDataUrl: null,
      note: 'schema parse fixture',
    },
  })

  const parsedProject = parseSavedProjectContents(contents)

  assert.equal(parsedProject.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION)
  assert.deepEqual(normalizeParsedProject(contents), parsedProject)
})

test('project parser rejects malformed JSON and non-object roots', () => {
  assert.throws(
    () => parseProjectJsonRecord('{not-json'),
    (error) =>
      error instanceof ProjectSchemaError &&
      /not valid JSON/.test(error.message),
  )

  assert.throws(
    () => parseSavedProjectContents('[]'),
    (error) =>
      error instanceof ProjectSchemaError &&
      /root must be a JSON object/.test(error.message),
  )
})

test('project parser rejects unsupported schema versions before restore', () => {
  const contents = JSON.stringify({
    schemaVersion: '9.9.9',
    title: 'Future Project',
    savedAt: '2026-06-12T12:00:00.000Z',
    game: {
      manualTitle: 'Future Project',
      selectedSteamGame: null,
    },
    template: {
      type: 'disc',
      variant: 'standardPrintableDisc',
      customDimensions: null,
    },
    steamBackupLogo: {
      placement: 'top',
    },
    background: {
      scale: 1,
      offset: { x: 0, y: 0 },
      imageDataUrl: null,
      note: 'future schema fixture',
    },
  })

  assert.throws(
    () => parseSavedProjectContents(contents),
    (error) =>
      error instanceof ProjectSchemaError &&
      /Unsupported project schema version 9\.9\.9/.test(error.message),
  )
})

test('project validation catches missing required disc save sections', () => {
  const issues = getSavedProjectSchemaIssues({
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    title: 'Broken Disc',
    savedAt: '2026-06-12T12:00:00.000Z',
    game: {
      manualTitle: 'Broken Disc',
      selectedSteamGame: null,
    },
    template: {
      type: 'disc',
      variant: 'standardPrintableDisc',
    },
    steamBackupLogo: {
      placement: 'top',
    },
  })

  assert.ok(issues.includes('background must be an object for disc projects.'))
})
