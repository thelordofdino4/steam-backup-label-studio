import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCaseInsertProjectSnapshot,
  normalizeSavedCaseInsertProject,
  restoreCaseInsertProjectState,
} from './projectCaseInsert.ts'
import { resolveSavedProjectRoute } from './projectRouting.ts'

const steamGame = {
  appId: 620,
  title: 'Portal 2',
  developer: ['Valve'],
  publisher: ['Valve'],
  releaseDate: '2011',
  genres: ['Puzzle'],
  categories: ['Single-player'],
  storeUrl: 'https://store.steampowered.com/app/620/Portal_2/',
  artwork: [],
}

test('case insert active pane restore defaults safely for legacy and invalid project data', () => {
  const legacySaved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Legacy Case',
    savedAt: '2026-06-20T12:00:00.000Z',
  })
  delete legacySaved.editor

  const restoredLegacy = restoreCaseInsertProjectState(legacySaved)

  assert.equal(restoredLegacy.activeCaseInsertTemplatePane, 'cover')

  const invalidSaved = {
    ...createCaseInsertProjectSnapshot({
      manualGameTitle: 'Invalid Case',
      caseInsert: {
        templates: {
          tray: {
            textBlocks: [
              {
                id: 'tray-description',
                label: 'Description',
                enabled: true,
                value: 'Tray survives invalid pane',
                source: 'manual',
              },
            ],
          },
        },
      },
      savedAt: '2026-06-20T12:00:00.000Z',
    }),
    editor: {
      activeCaseInsertTemplatePane: 'spine',
    },
  }

  const normalizedInvalid = normalizeSavedCaseInsertProject(invalidSaved)
  const restoredInvalid = restoreCaseInsertProjectState(invalidSaved)

  assert.equal(normalizedInvalid.editor?.activeCaseInsertTemplatePane, 'cover')
  assert.equal(restoredInvalid.activeCaseInsertTemplatePane, 'cover')
  assert.equal(
    restoredInvalid.caseInsert.templates.tray.textBlocks.find(({ id }) =>
      id === 'tray-description')?.value,
    'Tray survives invalid pane',
  )
})

test('restores sparse legacy jewel case projects to safe defaults', () => {
  const restored = restoreCaseInsertProjectState({
    schemaVersion: '0.1.0',
    projectType: 'caseInsert',
    title: 'Sparse Case',
    savedAt: '2026-06-03T12:00:00.000Z',
    game: {
      manualTitle: 'Sparse Manual',
      selectedSteamGame: steamGame,
    },
    metadata: {
      title: 'Sparse Manual',
    },
    template: {
      type: 'caseInsert',
      variant: 'jewelCase',
    },
    caseInsert: {
      back: {
        screenshots: [
          {
            imageDataUrl: 'data:image/png;base64,shot',
            imageSource: {
              source: 'uploaded',
              sourceLabel: 'C:\\Users\\John\\Pictures\\shot.png',
              sourceUrl: 'file:///C:/Users/John/Pictures/shot.png',
            },
            imageSize: {
              width: 1280,
              height: 720,
            },
          },
        ],
        description: {
          enabled: true,
          value: '',
        },
        features: {
          enabled: true,
          items: ['  Portals  ', '', 'Robots'],
        },
        minimumSystemRequirements: {
          enabled: true,
          value: 'Windows XP',
        },
        recommendedSystemRequirements: {
          value: 'Windows 7',
        },
        legal: {
          value: 'Valve terms apply.',
        },
      },
      spine: {
        left: {
          title: {
            enabled: true,
            value: 'SPARSE',
            align: 'center',
            layout: {
              scale: 0.8,
              x: 12,
              y: 34,
              rotation: 90,
            },
          },
          marks: [
            {
              id: 'legacy-left-spine-platform',
              label: 'Legacy Windows mark',
              enabled: true,
              imageDataUrl: 'data:image/png;base64,legacy-windows',
              imageSource: {
                source: 'placeholder',
                sourceId: 'case-platform:windows:windows11',
                sourceLabel: 'Windows operating-system mark',
              },
              imageSize: {
                width: 256,
                height: 128,
              },
            },
          ],
        },
      },
      export: {
        surfaces: ['back'],
        guideIds: ['backPanelBounds', 'not-a-guide'],
      },
    },
  })
  const cover = restored.caseInsert.templates.cover
  const tray = restored.caseInsert.templates.tray
  const artwork = tray.artworkSlots[0]

  assert.equal(restored.manualGameTitle, 'Sparse Manual')
  assert.equal(restored.projectMetadata.steamAppId, '620')
  assert.equal(restored.template.selectedCaseInsertTemplateId, 'jewelCase')
  assert.equal(cover.background.enabled, true)
  assert.equal(cover.steamBanner.enabled, true)
  assert.equal(tray.steamBanner.enabled, false)
  assert.equal(artwork?.id, 'tray-artwork-1')
  assert.equal(artwork?.label, 'Artwork 1')
  assert.equal(artwork?.imageDataUrl, 'data:image/png;base64,shot')
  assert.deepEqual(artwork?.imageSize, { width: 1280, height: 720 })
  assert.equal(artwork?.imageSource?.source, 'uploaded')
  assert.equal(artwork?.imageSource?.sourceLabel, 'shot.png')
  assert.equal(artwork?.imageSource?.sourceUrl, null)
  assert.equal(
    tray.textBlocks.find(({ id }) => id === 'tray-description')?.enabled,
    true,
  )
  assert.equal(
    tray.textBlocks.find(({ id }) => id === 'tray-description')?.value,
    '',
  )
  assert.deepEqual(tray.textLists[0]?.items, ['Portals', 'Robots'])
  assert.equal(
    tray.textBlocks.find(({ id }) =>
      id === 'tray-minimum-requirements')?.value,
    'Windows XP',
  )
  assert.equal(
    tray.textBlocks.find(({ id }) =>
      id === 'tray-recommended-requirements')?.value,
    'Windows 7',
  )
  assert.equal(
    tray.textBlocks.find(({ id }) => id === 'tray-copyright-text')?.value,
    'Valve terms apply.',
  )
  assert.equal(restored.caseInsert.spine.left.title.enabled, true)
  assert.equal(restored.caseInsert.spine.left.steamBanner.enabled, true)
  assert.equal(restored.caseInsert.spine.left.title.value, 'SPARSE')
  assert.equal(restored.caseInsert.spine.left.title.layout.rotation, 90)
  assert.equal(restored.caseInsert.spine.left.markSlots[0]?.id, 'legacy-left-spine-platform')
  assert.equal(restored.caseInsert.spine.left.markSlots[0]?.label, 'Legacy Windows mark')
  assert.equal(
    restored.caseInsert.spine.left.markSlots[0]?.imageSource?.sourceId,
    'case-platform:windows:windows11',
  )
  assert.deepEqual(restored.caseInsert.spine.right.markSlots, [])
  assert.deepEqual(restored.caseInsert.export.surfaces, ['back'])
  assert.deepEqual(restored.caseInsert.export.guideIds, ['backPanelBounds'])
})

test('normalizes legacy jewelCase project shells', () => {
  const project = normalizeSavedCaseInsertProject({
    title: 'Legacy Jewel Case',
    template: {
      type: 'jewelCase',
    },
    jewelCase: {
      front: {
        background: {
          imageDataUrl: 'data:image/png;base64,cover',
        },
      },
    },
  })

  assert.equal(project.projectType, 'caseInsert')
  assert.equal(project.game.manualTitle, 'Legacy Jewel Case')
  assert.equal(project.template.type, 'caseInsert')
  assert.equal(project.template.variant, 'jewelCase')
  assert.equal(
    project.caseInsert.templates.cover.background.imageSource?.source,
    'embedded',
  )
  assert.deepEqual(resolveSavedProjectRoute({ template: { type: 'jewelCase' } }), {
    projectType: 'caseInsert',
    workspace: 'caseInsert',
  })
})
