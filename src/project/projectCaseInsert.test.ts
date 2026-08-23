import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_CASE_INSERT_TEMPLATE_TYPE } from '../editor/editorTypes.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from './projectSchema.ts'
import {
  DEFAULT_CASE_INSERT_PROJECT_TITLE,
  createBlankJewelCaseSavedProject,
  createCaseInsertProjectSnapshot,
  restoreCaseInsertProjectStateFromContents,
} from './projectCaseInsert.ts'
import { resolveSavedProjectRoute } from './projectRouting.ts'
import { restoreProjectStateFromContents } from './restoreProjectState.ts'

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

const COVER_DISC_TEXT_BLOCK_IDS = [
  'cover-title-text',
  'cover-subtitle-text',
  'cover-disc-number',
  'cover-backup-date',
  'cover-steam-app-id',
  'cover-developer-text',
  'cover-publisher-text',
  'cover-install-notes',
  'cover-custom-note',
  'cover-copyright-text',
]

const TRAY_TEXT_BLOCK_IDS = [
  'tray-title-text',
  'tray-subtitle-text',
  'tray-disc-number',
  'tray-backup-date',
  'tray-steam-app-id',
  'tray-developer-text',
  'tray-publisher-text',
  'tray-install-notes',
  'tray-custom-note',
  'tray-copyright-text',
  'tray-description',
  'tray-minimum-requirements',
  'tray-recommended-requirements',
]

const SPINE_TEXT_BLOCK_IDS = [
  'subtitle-text',
  'disc-number',
  'backup-date',
  'steam-app-id',
  'developer-text',
  'publisher-text',
  'install-notes',
  'custom-note',
  'copyright-text',
]

test('creates blank jewel case saved project data with generic template panes', () => {
  const project = createBlankJewelCaseSavedProject('Archive Case')
  const cover = project.caseInsert.templates.cover
  const tray = project.caseInsert.templates.tray

  assert.equal(project.schemaVersion, CURRENT_PROJECT_SCHEMA_VERSION)
  assert.deepEqual(project.caseInsertLayoutPreset, {
    kind: 'sbls/case-insert-layout-preset-project-state',
    formatVersion: 1,
    applicationRevision: 0,
    attachment: { status: 'unattached' },
  })
  assert.equal(project.projectType, 'caseInsert')
  assert.equal(project.title, 'Archive Case')
  assert.equal(project.game.manualTitle, 'Archive Case')
  assert.equal(project.template.type, 'caseInsert')
  assert.equal(project.template.variant, DEFAULT_CASE_INSERT_TEMPLATE_TYPE)
  assert.equal(project.caseInsert.templateType, DEFAULT_CASE_INSERT_TEMPLATE_TYPE)
  assert.equal(project.caseInsert.spine.mirrored, true)
  assert.equal(cover.background.enabled, true)
  assert.equal(tray.background.enabled, true)
  assert.equal(cover.steamBanner.enabled, true)
  assert.equal(cover.steamBanner.colors.gradientStart, '#2a475f')
  assert.equal(cover.steamBanner.colors.gradientEnd, '#1a2838')
  assert.equal(cover.steamBanner.colors.accent, '#2aabe2')
  assert.equal(tray.steamBanner.enabled, false)
  assert.equal(cover.additionalArtworkEnabled, false)
  assert.equal(tray.additionalArtworkEnabled, false)
  assert.deepEqual(cover.artworkSlots, [])
  assert.deepEqual(tray.artworkSlots, [])
  assert.deepEqual(cover.textBlocks.map(({ id }) => id), COVER_DISC_TEXT_BLOCK_IDS)
  assert.equal(cover.textBlocks[0]?.value, 'Archive Case')
  assert.equal(cover.textBlocks[0]?.source, 'metadata')
  assert.equal(cover.textBlocks[0]?.layout.width, 80)
  assert.equal(cover.textBlocks[8]?.value, '')
  assert.equal(cover.textBlocks[8]?.style.backgroundEnabled, false)
  assert.deepEqual(tray.textBlocks.map(({ id }) => id), TRAY_TEXT_BLOCK_IDS)
  assert.equal(tray.textBlocks[0]?.value, '')
  assert.equal(tray.textBlocks[0]?.source, 'metadata')
  assert.equal(tray.textBlocks[0]?.layout.scale, 1.18)
  assert.equal(tray.textBlocks[2]?.layout.scale, 0.72)
  assert.equal(tray.textBlocks[9]?.layout.scale, 0.54)
  assert.equal(tray.textLists[0]?.style.backgroundEnabled, true)
  assert.equal(tray.textLists[0]?.layout.width, 36)
  assert.deepEqual(tray.textLists[0]?.items, [])
  assert.equal(tray.textBlocks[10]?.enabled, false)
  assert.equal(tray.textBlocks[11]?.enabled, false)
  assert.equal(tray.textBlocks[12]?.enabled, false)
  assert.equal(project.caseInsert.spine.left.title.enabled, true)
  assert.equal(project.caseInsert.spine.left.title.value, 'Archive Case')
  assert.equal(project.caseInsert.spine.left.title.style.color, '#ffffff')
  assert.equal(project.caseInsert.spine.left.title.layout.fontSizePt, 16)
  assert.equal(project.caseInsert.spine.left.title.layout.width, 90)
  assert.equal(project.caseInsert.spine.left.title.layout.rotation, -90)
  assert.equal(project.caseInsert.spine.right.title.layout.fontSizePt, 16)
  assert.equal(project.caseInsert.spine.right.title.layout.rotation, 90)
  assert.deepEqual(
    project.caseInsert.spine.left.textBlocks.map(({ id }) =>
      id.replace('left-spine-', '')),
    SPINE_TEXT_BLOCK_IDS,
  )
  assert.deepEqual(
    project.caseInsert.spine.right.textBlocks.map(({ id }) =>
      id.replace('right-spine-', '')),
    SPINE_TEXT_BLOCK_IDS,
  )
  assert.equal(project.caseInsert.spine.left.background.enabled, true)
  assert.equal(project.caseInsert.spine.right.background.enabled, true)
  assert.equal(project.caseInsert.spine.left.steamBanner.enabled, true)
  assert.equal(project.caseInsert.spine.right.steamBanner.enabled, true)
  assert.equal(project.caseInsert.spine.left.steamBanner.lockupLayout.rotation, 90)
  assert.equal(project.caseInsert.spine.right.steamBanner.lockupLayout.rotation, 90)
  assert.equal(project.caseInsert.spine.left.additionalArtworkEnabled, false)
  assert.equal(project.caseInsert.spine.right.additionalArtworkEnabled, false)
  assert.deepEqual(project.caseInsert.spine.left.artworkSlots, [])
  assert.deepEqual(project.caseInsert.spine.right.artworkSlots, [])
  assert.deepEqual(project.caseInsert.spine.left.logoSlots, [])
  assert.deepEqual(project.caseInsert.spine.right.logoSlots, [])
  assert.deepEqual(project.caseInsert.spine.left.markSlots, [])
  assert.deepEqual(project.caseInsert.spine.right.markSlots, [])
  assert.deepEqual(project.caseInsert.export.surfaces, ['front', 'back'])
  assert.deepEqual(project.caseInsert.export.guideIds, [])
  assert.deepEqual(resolveSavedProjectRoute(project), {
    projectType: 'caseInsert',
    workspace: 'caseInsert',
  })
})

test('creates case insert snapshots from generic template state', () => {
  const project = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    selectedSteamGame: steamGame,
    projectMetadata: {
      title: 'Portal 2 Case',
      steamAppId: '620',
    },
    savedAt: '2026-06-03T12:00:00.000Z',
    caseInsert: {
      templates: {
        cover: {
          textBlocks: [
            {
              id: 'cover-callout-text',
              label: 'Callout text',
              enabled: true,
              value: 'Co-op edition',
              source: 'manual',
              align: 'center',
              layout: {
                scale: 1,
                x: 50,
                y: 82,
                rotation: 0,
              },
            },
          ],
        },
        tray: {
          textBlocks: [
            {
              id: 'tray-description',
              label: 'Description',
              enabled: true,
              value: 'A test chamber classic.',
              source: 'manual',
              align: 'left',
              layout: {
                scale: 1,
                x: 50,
                y: 50,
                rotation: 0,
              },
            },
          ],
          textLists: [
            {
              id: 'tray-feature-bullets',
              label: 'Feature bullets',
              enabled: true,
              items: ['Single-player', 'Co-op puzzles'],
              source: 'manual',
              layout: {
                scale: 1,
                x: 28,
                y: 31,
                rotation: 0,
              },
            },
          ],
        },
      },
    },
  })

  assert.equal(project.savedAt, '2026-06-03T12:00:00.000Z')
  assert.equal(project.metadata?.title, 'Portal 2 Case')
  assert.equal(project.metadata?.steamAppId, '620')
  assert.equal(project.metadata?.ratingSystem, 'none')
  assert.deepEqual(
    project.caseInsert.templates.cover.textBlocks.map(({ id }) => id),
    COVER_DISC_TEXT_BLOCK_IDS,
  )
  assert.equal(
    project.caseInsert.templates.cover.textBlocks.find(({ id }) =>
      id === 'cover-custom-note')?.value,
    'Co-op edition',
  )
  assert.equal(
    project.caseInsert.templates.cover.textBlocks.find(({ id }) =>
      id === 'cover-custom-note')?.layout.width,
    74,
  )
  assert.equal(project.caseInsert.templates.cover.textBlocks[0]?.value, 'Portal 2 Case')
  assert.equal(
    project.caseInsert.templates.tray.textBlocks.find(({ id }) =>
      id === 'tray-description')?.value,
    'A test chamber classic.',
  )
  assert.equal(
    project.caseInsert.templates.tray.textBlocks.find(({ id }) =>
      id === 'tray-description')?.layout.width,
    52,
  )
  assert.deepEqual(
    project.caseInsert.templates.tray.textBlocks.map(({ id }) => id),
    TRAY_TEXT_BLOCK_IDS,
  )
  assert.deepEqual(project.caseInsert.templates.tray.textLists[0]?.items, [
    'Single-player',
    'Co-op puzzles',
  ])
  assert.equal(project.caseInsert.templates.tray.textLists[0]?.layout.width, 36)
})

test('restores case insert project contents without the disc restore path', () => {
  const contents = JSON.stringify(createBlankJewelCaseSavedProject())
  const restored = restoreCaseInsertProjectStateFromContents(contents)

  assert.equal(restored.manualGameTitle, DEFAULT_CASE_INSERT_PROJECT_TITLE)
  assert.equal(restored.caseInsert.templateType, 'jewelCase')
  assert.throws(
    () => restoreProjectStateFromContents(contents),
    /case insert/i,
  )
})
