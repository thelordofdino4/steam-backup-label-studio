import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolveSavedProjectRoute,
  resolveSavedProjectRouteFromContents,
} from './projectRouting.ts'
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  ProjectSchemaError,
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
      note: 'route fixture',
    },
    ...overrides,
  }
}

test('routes current explicit disc projects to the disc editor', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      projectType: 'disc',
      template: { type: 'disc', variant: 'standardPrintableDisc' },
    }),
    {
      projectType: 'disc',
      workspace: 'disc',
    },
  )
})

test('routes legacy disc projects by template type', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      template: { type: 'disc', variant: 'standardPrintableDisc' },
    }),
    {
      projectType: 'disc',
      workspace: 'disc',
    },
  )
})

test('routes future case insert projects by explicit project type', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      projectType: 'caseInsert',
      template: { type: 'caseInsert', variant: 'jewelCase' },
    }),
    {
      projectType: 'caseInsert',
      workspace: 'caseInsert',
    },
  )
})

test('routes legacy case insert project shells by jewel case template type', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      projectType: 'caseInsert',
      template: { type: 'jewelCase' },
    }),
    {
      projectType: 'caseInsert',
      workspace: 'caseInsert',
    },
  )
})

test('routes future case insert projects by editor metadata', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      editor: { projectType: 'caseInsert' },
      template: { type: 'disc' },
    }),
    {
      projectType: 'caseInsert',
      workspace: 'caseInsert',
    },
  )
})

test('routes future case insert projects by case template type', () => {
  assert.deepEqual(
    resolveSavedProjectRoute({
      template: { type: 'jewelCase' },
    }),
    {
      projectType: 'caseInsert',
      workspace: 'caseInsert',
    },
  )
})

test('routes saved project contents through schema validation', () => {
  assert.deepEqual(
    resolveSavedProjectRouteFromContents(JSON.stringify(createDiscProjectFixture())),
    {
      projectType: 'disc',
      workspace: 'disc',
    },
  )

  assert.throws(
    () =>
      resolveSavedProjectRouteFromContents(
        JSON.stringify(createDiscProjectFixture({ projectType: 'poster' })),
      ),
    (error) =>
      error instanceof ProjectSchemaError &&
      /projectType must be "disc" or "caseInsert"/.test(error.message),
  )
})
