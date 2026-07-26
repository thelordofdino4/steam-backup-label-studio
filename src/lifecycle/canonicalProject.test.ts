import assert from 'node:assert/strict'
import test from 'node:test'
import { createCaseInsertProjectSnapshot } from '../project/caseInsertProjectAdapters.ts'
import type { SavedDiscProject } from '../project/projectTypes.ts'
import {
  captureNormalizedProjectSnapshot,
  createCanonicalProjectComparisonValue,
} from './canonicalProject.ts'

function createDiscProject(
  overrides: Partial<SavedDiscProject> = {},
): SavedDiscProject {
  return {
    schemaVersion: '0.2.0',
    projectType: 'disc',
    title: 'Canonical Disc',
    savedAt: '2026-07-26T12:00:00.000Z',
    game: {
      manualTitle: 'Canonical Disc',
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
      imageDataUrl: 'data:image/png;base64,YXNzZXQ=',
      note: 'canonical fixture',
    },
    ...overrides,
  }
}

function compare(project: SavedDiscProject) {
  return createCanonicalProjectComparisonValue(
    captureNormalizedProjectSnapshot(project),
  )
}

test('canonical project comparison sorts records while preserving array order', () => {
  const first = createDiscProject({
    editor: {
      guidedLayout: {
        id: 'layout',
        version: 1,
        omittedSlotIds: ['second', 'first'],
        completedSlotIds: ['title', 'rating'],
      },
    },
  })
  const second = {
    background: {
      note: 'canonical fixture',
      imageDataUrl: 'data:image/png;base64,YXNzZXQ=',
      offset: { y: 0, x: 0 },
      scale: 1,
    },
    steamBackupLogo: { placement: 'top' },
    template: {
      customDimensions: null,
      variant: 'standardPrintableDisc',
      type: 'disc',
    },
    game: {
      selectedSteamGame: null,
      manualTitle: 'Canonical Disc',
    },
    savedAt: '2026-07-26T12:00:00.000Z',
    title: 'Canonical Disc',
    projectType: 'disc',
    schemaVersion: '0.2.0',
    editor: {
      guidedLayout: {
        completedSlotIds: ['title', 'rating'],
        omittedSlotIds: ['second', 'first'],
        version: 1,
        id: 'layout',
      },
    },
  } as SavedDiscProject

  assert.equal(compare(first), compare(second))
  assert.notEqual(
    compare(first),
    compare({
      ...first,
      editor: {
        guidedLayout: {
          ...first.editor?.guidedLayout,
          id: 'layout',
          version: 1,
          omittedSlotIds: ['first', 'second'],
          completedSlotIds: ['title', 'rating'],
        },
      },
    }),
  )
})

test('canonical comparison excludes only volatile save time and coarse Case pane', () => {
  const disc = createDiscProject()
  assert.equal(
    compare(disc),
    compare({ ...disc, savedAt: '2030-01-01T00:00:00.000Z' }),
  )

  const caseFront = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Canonical Case',
    activeCaseInsertTemplatePane: 'front',
    savedAt: '2026-07-26T12:00:00.000Z',
  })
  const caseTray = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Canonical Case',
    activeCaseInsertTemplatePane: 'tray',
    savedAt: '2030-01-01T00:00:00.000Z',
  })

  assert.equal(
    createCanonicalProjectComparisonValue(
      captureNormalizedProjectSnapshot(caseFront),
    ),
    createCanonicalProjectComparisonValue(
      captureNormalizedProjectSnapshot(caseTray),
    ),
  )
  assert.notEqual(
    createCanonicalProjectComparisonValue(
      captureNormalizedProjectSnapshot(caseFront),
    ),
    createCanonicalProjectComparisonValue(
      captureNormalizedProjectSnapshot({
        ...caseFront,
        caseInsert: {
          ...caseFront.caseInsert,
          export: {
            ...caseFront.caseInsert.export,
            surfaces: ['front'],
          },
        },
      }),
    ),
  )
})

test('meaningful nested, asset, array, and optional project content remains dirty-significant', () => {
  const base = createDiscProject({
    editor: {
      guidedLayout: {
        id: 'layout',
        version: 1,
        omittedSlotIds: [],
        completedSlotIds: ['title'],
      },
    },
  })

  assert.notEqual(compare(base), compare({ ...base, title: 'Changed title' }))
  assert.notEqual(compare(base), compare({
    ...base,
    background: {
      ...base.background,
      imageDataUrl: 'data:image/png;base64,Y2hhbmdlZA==',
    },
  }))
  assert.notEqual(compare(base), compare({
    ...base,
    editor: {
      guidedLayout: {
        id: 'layout',
        version: 1,
        omittedSlotIds: [],
        completedSlotIds: ['title', 'rating'],
      },
    },
  }))
  assert.notEqual(compare(base), compare({
    ...base,
    export: { guideMode: 'none' },
  }))
  assert.equal(compare(base), compare({ ...base, export: undefined }))
})

test('captured project snapshots are detached, immutable JSON values', () => {
  const source = createDiscProject()
  const captured = captureNormalizedProjectSnapshot(source)
  const comparison = createCanonicalProjectComparisonValue(captured)

  source.background.note = 'mutated after capture'

  assert.equal(createCanonicalProjectComparisonValue(captured), comparison)
  assert.equal(Object.isFrozen(captured), true)
  assert.equal(Object.isFrozen(captured.background), true)
  assert.throws(
    () => compare({ ...createDiscProject(), background: {
      ...createDiscProject().background,
      scale: Number.NaN,
    } }),
    /finite (JSON )?number/,
  )
})
