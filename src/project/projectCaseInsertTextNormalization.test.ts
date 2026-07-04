import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_CASE_INSERT_TEMPLATE_TYPE } from '../editor/editorTypes.ts'
import {
  applyCaseInsertTextBlockPresetLayout,
  applyCaseInsertTextListPresetLayout,
  createCaseInsertProjectSnapshot,
  createDefaultProjectJewelCaseState,
  restoreCaseInsertProjectState,
  setCaseInsertTextBlockAvoidVisualElements,
  setCaseInsertTextListAvoidVisualElements,
  updateCaseInsertTextBlockStyleField,
  updateCaseInsertTextBlockValue,
  updateProjectCaseInsertTemplate,
} from './projectCaseInsert.ts'

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

test('case insert text groups and styles survive sparse save/load data', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) => ({
    ...cover,
    textBlocks: cover.textBlocks.map((textBlock) =>
      textBlock.id === 'cover-custom-note'
        ? {
            ...updateCaseInsertTextBlockStyleField(
              setCaseInsertTextBlockAvoidVisualElements(
                updateCaseInsertTextBlockValue(textBlock, 'Includes co-op'),
                true,
              ),
              'backgroundEnabled',
              true,
            ),
            layout: { ...textBlock.layout, width: 44 },
          }
        : textBlock,
    ),
  }))
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    textLists: tray.textLists.map((textList) =>
      textList.id === 'tray-feature-bullets'
        ? {
            ...setCaseInsertTextListAvoidVisualElements(textList, true),
            layout: { ...textList.layout, width: 36 },
          }
        : textList,
    ),
  }))

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    selectedSteamGame: steamGame,
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert
  const customNote = restored.templates.cover.textBlocks.find(({ id }) =>
    id === 'cover-custom-note')

  assert.equal(customNote?.value, 'Includes co-op')
  assert.equal(customNote?.style.backgroundEnabled, true)
  assert.equal(customNote?.avoidVisualElements, true)
  assert.equal(customNote?.layout.x, 50)
  assert.equal(customNote?.layout.width, 44)
  assert.equal(restored.templates.tray.textLists[0]?.avoidVisualElements, true)
  assert.equal(restored.templates.tray.textLists[0]?.layout.width, 36)

  const sparse = restoreCaseInsertProjectState({
    schemaVersion: '0.1.0',
    projectType: 'caseInsert',
    title: 'Sparse Text Case',
    savedAt: '2026-06-03T12:00:00.000Z',
    game: {
      manualTitle: 'Sparse Text Case',
      selectedSteamGame: steamGame,
    },
    template: {
      type: 'caseInsert',
      variant: DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
    },
    caseInsert: {
      templates: {
        cover: {
          textBlocks: [
            {
              id: 'cover-callout-text',
              label: 'Callout text',
              enabled: true,
              value: 'Legacy callout',
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
              value: 'Legacy tray text',
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
          textLists: [],
        },
      },
    },
  }).caseInsert

  assert.deepEqual(
    sparse.templates.cover.textBlocks.map(({ id }) => id),
    COVER_DISC_TEXT_BLOCK_IDS,
  )
  assert.equal(
    sparse.templates.cover.textBlocks.find(({ id }) =>
      id === 'cover-custom-note')?.value,
    'Legacy callout',
  )
  assert.equal(
    sparse.templates.cover.textBlocks.find(({ id }) =>
      id === 'cover-custom-note')?.layout.width,
    74,
  )
  assert.equal(sparse.templates.cover.textBlocks[0]?.value, 'Sparse Text Case')
  assert.equal(
    sparse.templates.tray.textBlocks.find(({ id }) =>
      id === 'tray-description')?.value,
    'Legacy tray text',
  )
  assert.equal(
    sparse.templates.tray.textBlocks.find(({ id }) =>
      id === 'tray-description')?.layout.width,
    52,
  )
  assert.deepEqual(
    sparse.templates.tray.textBlocks.map(({ id }) => id),
    TRAY_TEXT_BLOCK_IDS,
  )
  assert.deepEqual(sparse.templates.tray.textLists.map(({ id }) => id), [
    'tray-feature-bullets',
  ])
  assert.equal(sparse.templates.tray.textLists[0]?.avoidVisualElements, false)
  assert.equal(sparse.templates.tray.textLists[0]?.layout.width, 36)
})

test('case insert text layout presets update width and alignment without changing spine orientation', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const customNote = state.templates.cover.textBlocks.find(({ id }) =>
    id === 'cover-custom-note')
  const featureList = state.templates.tray.textLists[0]
  const leftBlock = applyCaseInsertTextBlockPresetLayout(
    'cover',
    customNote!,
    'cover-left-block',
  )
  const wideList = applyCaseInsertTextListPresetLayout(
    'tray',
    featureList!,
    'tray-wide-center',
  )
  const spineTitle = applyCaseInsertTextBlockPresetLayout(
    'spine',
    {
      ...state.spine.left.title,
      layout: { ...state.spine.left.title.layout, fontSizePt: 18 },
    },
    'spine-centered',
  )
  const narrowSpineTitle = applyCaseInsertTextBlockPresetLayout(
    'spine',
    state.spine.left.title,
    'spine-narrow',
  )

  assert.ok(customNote)
  assert.ok(featureList)
  assert.equal(leftBlock.align, 'left')
  assert.equal(leftBlock.layout.x, 22)
  assert.equal(leftBlock.layout.width, 42)
  assert.equal(wideList.layout.x, 50)
  assert.equal(wideList.layout.width, 90)
  assert.equal(spineTitle.layout.fontSizePt, 18)
  assert.equal(spineTitle.layout.rotation, -90)
  assert.equal(narrowSpineTitle.layout.fontSizePt, state.spine.left.title.layout.fontSizePt)
  assert.equal(narrowSpineTitle.layout.width, 46)
  assert.equal(narrowSpineTitle.layout.rotation, -90)
})

test('case insert spine title normalization preserves explicit saved point sizes', () => {
  const restored = restoreCaseInsertProjectState({
    schemaVersion: '0.1.0',
    projectType: 'caseInsert',
    title: 'Saved Spine Case',
    savedAt: '2026-06-20T12:00:00.000Z',
    game: {
      manualTitle: 'Saved Spine Case',
      selectedSteamGame: null,
    },
    template: {
      type: 'caseInsert',
      variant: 'jewelCase',
    },
    caseInsert: {
      spine: {
        left: {
          title: {
            id: 'left-spine-title-text',
            label: 'Game title',
            enabled: true,
            value: 'Explicit 18pt',
            source: 'manual',
            layout: {
              scale: 1,
              fontSizePt: 18,
              width: 90,
              x: 50,
              y: 50,
              rotation: -90,
            },
          },
        },
        right: {
          title: {
            id: 'right-spine-title-text',
            label: 'Game title',
            enabled: true,
            value: 'Legacy scale only',
            source: 'manual',
            layout: {
              scale: 1,
              width: 90,
              x: 50,
              y: 50,
              rotation: 90,
            },
          },
        },
      },
    },
  })

  assert.equal(restored.caseInsert.spine.left.title.layout.fontSizePt, 18)
  assert.equal(restored.caseInsert.spine.right.title.layout.fontSizePt, 7.7)
  assert.equal(restored.caseInsert.spine.left.title.value, 'Explicit 18pt')
  assert.equal(restored.caseInsert.spine.right.title.value, 'Legacy scale only')
})
