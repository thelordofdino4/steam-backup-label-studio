import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultCaseInsertImageSlot } from '../caseInsert/defaults.ts'
import { createCaseInsertProjectSnapshot } from '../project/caseInsertProjectAdapters.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import type {
  SavedCaseInsertProject,
  SavedDiscProject,
} from '../project/projectTypes.ts'
import {
  captureNormalizedProjectSnapshot,
  createCanonicalProjectComparisonValue,
} from './canonicalProject.ts'

function createDiscProject(
  overrides: Partial<SavedDiscProject> = {},
): SavedDiscProject {
  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
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
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
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

test('reserved artwork viewport state participates in canonical Case identity', () => {
  const base = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Viewport Identity',
    savedAt: '2026-08-21T12:00:00.000Z',
  })
  const caseInsert = structuredClone(base.caseInsert)
  caseInsert.templates.tray.artworkSlots = [{
    ...createDefaultCaseInsertImageSlot('tray-artwork-1', 'Artwork 1'),
    reservedArtworkViewport: {
      kind: 'sbls/case-insert-artwork-viewport',
      formatVersion: 1,
      templateId: 'jewelCase',
      templateRevision: null,
      coordinateBasis: 'backPanelSafe',
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    },
  }]
  const first = createCaseInsertProjectSnapshot({
    manualGameTitle: base.game.manualTitle,
    savedAt: base.savedAt,
    caseInsert,
  })
  const changedCaseInsert = structuredClone(caseInsert)
  changedCaseInsert.templates.tray.artworkSlots[0]!
    .reservedArtworkViewport!.zoom = 1.25
  const changed = createCaseInsertProjectSnapshot({
    manualGameTitle: base.game.manualTitle,
    savedAt: base.savedAt,
    caseInsert: changedCaseInsert,
  })

  const firstComparison = createCanonicalProjectComparisonValue(
    captureNormalizedProjectSnapshot(first),
  )
  assert.equal(
    firstComparison,
    createCanonicalProjectComparisonValue(
      captureNormalizedProjectSnapshot(structuredClone(first)),
    ),
  )
  assert.notEqual(
    firstComparison,
    createCanonicalProjectComparisonValue(
      captureNormalizedProjectSnapshot(changed),
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

  assert.equal(
    captureNormalizedProjectSnapshot(
      captured as unknown as SavedDiscProject,
    ),
    captured,
  )
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

test('project capture rejects cyclic and accessor-bearing input without invoking accessors', () => {
  const cyclic = createDiscProject() as SavedDiscProject & {
    cycle?: unknown
  }
  cyclic.cycle = cyclic
  assert.throws(
    () => captureNormalizedProjectSnapshot(cyclic),
    /must not contain cycles/,
  )

  const accessor = createDiscProject()
  let getterCalls = 0
  Object.defineProperty(accessor.background, 'scale', {
    enumerable: true,
    get() {
      getterCalls += 1
      return 1
    },
  })
  assert.throws(
    () => captureNormalizedProjectSnapshot(accessor),
    /enumerable data property/,
  )
  assert.equal(getterCalls, 0)

  for (const hostile of [new Map(), Promise.resolve(), () => 1]) {
    const project = createDiscProject() as SavedDiscProject & {
      hostile?: unknown
    }
    project.hostile = hostile
    assert.throws(() => captureNormalizedProjectSnapshot(project))
  }
})

test('project capture safely preserves unknown keys but rejects root session metadata', () => {
  const rootPrototypeKey = JSON.parse(
    `${JSON.stringify(createDiscProject()).slice(0, -1)},` +
      '"__proto__":{"polluted":true}}',
  ) as SavedDiscProject
  const nestedPrototypeKey = createDiscProject() as SavedDiscProject & {
    metadata: Record<string, unknown>
  }
  nestedPrototypeKey.metadata = JSON.parse(
    '{"nested":{"__proto__":{"polluted":true},' +
      '"constructor":"content","applicationRevision":17}}',
  ) as Record<string, unknown>
  const leakedSessionMetadata = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Leaked Case',
  }) as SavedCaseInsertProject & {
    caseInsertPresetApplication: Record<string, unknown>
  }
  leakedSessionMetadata.caseInsertPresetApplication = {
    applicationRevision: 0,
  }

  const capturedRoot = captureNormalizedProjectSnapshot(rootPrototypeKey) as
    unknown as Record<string, unknown>
  const capturedNested = captureNormalizedProjectSnapshot(nestedPrototypeKey) as
    unknown as { metadata: { nested: Record<string, unknown> } }
  assert.equal(Object.hasOwn(capturedRoot, '__proto__'), true)
  assert.deepEqual(capturedRoot.__proto__, { polluted: true })
  assert.equal(
    Object.hasOwn(capturedNested.metadata.nested, '__proto__'),
    true,
  )
  assert.deepEqual(capturedNested.metadata.nested.__proto__, { polluted: true })
  assert.equal(capturedNested.metadata.nested.constructor, 'content')
  assert.equal(capturedNested.metadata.nested.applicationRevision, 17)
  assert.throws(
    () => captureNormalizedProjectSnapshot(leakedSessionMetadata),
    /not persisted project content/,
  )
  assert.equal(({} as Record<string, unknown>).polluted, undefined)
})
