import assert from 'node:assert/strict'
import test from 'node:test'
import { createCaseInsertProjectSnapshot } from './caseInsertProjectAdapters.ts'
import { normalizeParsedProject } from './normalizeProject.ts'
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
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
