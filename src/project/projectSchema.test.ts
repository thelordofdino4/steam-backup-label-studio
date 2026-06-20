import assert from 'node:assert/strict'
import test from 'node:test'
import { createCaseInsertProjectSnapshot } from './caseInsertProjectAdapters.ts'
import { normalizeParsedProject } from './normalizeProject.ts'
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  ProjectSchemaError,
  getSavedProjectSchemaIssues,
  migrateProjectSchemaRecord,
  parseProjectJsonRecord,
  parseSavedProjectContents,
  validateSavedProjectSchema,
} from './projectSchema.ts'

function createDiscProjectFixture(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  }
}

test('case insert snapshots use the shared current project schema version', () => {
  const project = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Schema Fixture Case',
    activeCaseInsertTemplatePane: 'tray',
    savedAt: '2026-06-03T12:00:00.000Z',
  })

  assert.equal(project.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION)
  assert.equal(project.editor?.activeCaseInsertTemplatePane, 'tray')
  assert.deepEqual(getSavedProjectSchemaIssues(project), [])
  assert.doesNotThrow(() => validateSavedProjectSchema(project))
})

test('project parse adapters preserve saved project payload compatibility', () => {
  const contents = JSON.stringify(createDiscProjectFixture())

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
  const contents = JSON.stringify(createDiscProjectFixture({
    schemaVersion: '9.9.9',
    title: 'Future Project',
  }))

  assert.throws(
    () => parseSavedProjectContents(contents),
    (error) =>
      error instanceof ProjectSchemaError &&
      /Unsupported project schema version 9\.9\.9/.test(error.message),
  )
})

test('project schema migrations apply before current validation', () => {
  const legacyProject = createDiscProjectFixture({
    schemaVersion: '0.0.9',
    title: 'Legacy Disc',
  })

  const migratedProject = migrateProjectSchemaRecord(legacyProject, [
    {
      from: '0.0.9',
      to: CURRENT_PROJECT_SCHEMA_VERSION,
      migrate: (project) => ({
        ...project,
        schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      }),
    },
  ])

  assert.equal(migratedProject.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION)
  assert.deepEqual(getSavedProjectSchemaIssues(migratedProject), [])
})

test('project schema migrations must return the declared target version', () => {
  assert.throws(
    () =>
      migrateProjectSchemaRecord({ schemaVersion: '0.0.1' }, [
        {
          from: '0.0.1',
          to: '0.0.2',
          migrate: (project) => ({
            ...project,
            schemaVersion: '0.0.1',
          }),
        },
      ]),
    (error) =>
      error instanceof ProjectSchemaError &&
      /produced schemaVersion 0\.0\.1/.test(error.message),
  )
})

test('project validation catches malformed case insert state', () => {
  const issues = getSavedProjectSchemaIssues({
    ...createCaseInsertProjectSnapshot({
      manualGameTitle: 'Broken Case',
      savedAt: '2026-06-12T12:00:00.000Z',
    }),
    caseInsert: {
      templateType: 'posterCase',
      templates: [],
      export: {
        surfaces: ['front', 42],
      },
    },
  })

  assert.ok(
    issues.includes(
      'caseInsert.templateType must be a supported case insert template type.',
    ),
  )
  assert.ok(issues.includes('caseInsert.templates must be an object when present.'))
  assert.ok(
    issues.includes(
      'caseInsert.export.surfaces must be an array of strings when present.',
    ),
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
