import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getFeatureVisibleRepeatedArtworkItems,
} from '../editor/repeatedArtwork.ts'
import {
  addCaseInsertTemplateImageSlot,
  addJewelCaseSpineImageSlot,
  createCaseInsertProjectSnapshot,
  createDefaultCaseInsertImageSlot,
  createDefaultJewelCaseSpineArtworkSlot,
  createDefaultProjectJewelCaseState,
  removeCaseInsertTemplateImageSlot,
  renameCaseInsertTemplateImageSlot,
  resetCaseInsertImageSlotFrame,
  setCaseInsertImageSlotImage,
  setCaseInsertTemplateAdditionalArtworkEnabled,
  setJewelCaseSpineAdditionalArtworkEnabled,
  updateCaseInsertImageSlotFrameField,
  updateCaseInsertTemplateImageSlotInGroup,
  updateProjectCaseInsertTemplate,
  restoreCaseInsertProjectState,
} from './projectCaseInsert.ts'
import {
  DEFAULT_ADDITIONAL_ARTWORK_FRAME,
} from './additionalArtworkFrame.ts'

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

test('case insert additional artwork frame helpers match disc defaults', () => {
  let slot = createDefaultCaseInsertImageSlot('case-art-1', 'Case art 1')

  assert.deepEqual(slot.frame, DEFAULT_ADDITIONAL_ARTWORK_FRAME)

  slot = updateCaseInsertImageSlotFrameField(slot, 'enabled', true)
  slot = updateCaseInsertImageSlotFrameField(slot, 'shape', 'circle')
  slot = updateCaseInsertImageSlotFrameField(slot, 'color', '#ff00aa')
  slot = updateCaseInsertImageSlotFrameField(slot, 'width', 6)
  slot = updateCaseInsertImageSlotFrameField(slot, 'style', 'rocky')
  slot = updateCaseInsertImageSlotFrameField(slot, 'lumpiness', 74)
  slot = updateCaseInsertImageSlotFrameField(slot, 'jaggedness', 63)
  slot = updateCaseInsertImageSlotFrameField(slot, 'roughnessOffset', 31)

  assert.deepEqual(slot.frame, {
    ...DEFAULT_ADDITIONAL_ARTWORK_FRAME,
    enabled: true,
    shape: 'circle',
    color: '#ff00aa',
    width: 6,
    style: 'rocky',
    lumpiness: 74,
    jaggedness: 63,
    roughnessOffset: 31,
  })
  assert.deepEqual(
    resetCaseInsertImageSlotFrame(slot).frame,
    DEFAULT_ADDITIONAL_ARTWORK_FRAME,
  )

  const restored = restoreCaseInsertProjectState({
    schemaVersion: '0.1.0',
    projectType: 'caseInsert',
    title: 'Frame Case',
    savedAt: '2026-06-03T12:00:00.000Z',
    game: {
      manualTitle: 'Frame Case',
      selectedSteamGame: null,
    },
    caseInsert: {
      templates: {
        cover: {
          artworkSlots: [
            {
              id: 'frame-slot',
              label: 'Frame slot',
              enabled: true,
              frame: {
                enabled: true,
                shape: 'circle',
                color: '#0f172a',
                width: 999,
                style: 'rocky',
                lumpiness: -5,
                jaggedness: 999,
                roughnessOffset: 44,
              },
            },
          ],
        },
      },
    },
  }).caseInsert

  assert.deepEqual(restored.templates.cover.artworkSlots[0]?.frame, {
    ...DEFAULT_ADDITIONAL_ARTWORK_FRAME,
    enabled: true,
    shape: 'circle',
    color: '#0f172a',
    width: 8,
    style: 'rocky',
    lumpiness: 0,
    jaggedness: 100,
    roughnessOffset: 44,
  })
})

test('case insert additional artwork global visibility preserves slot state', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addCaseInsertTemplateImageSlot(state, 'tray', 'artworkSlots')
  state = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'tray',
    'artworkSlots',
    'tray-artwork-1',
    (slot) =>
      updateCaseInsertImageSlotFrameField(
        updateCaseInsertImageSlotFrameField(
          updateCaseInsertImageSlotFrameField(
            setCaseInsertImageSlotImage(slot, {
              imageDataUrl: 'data:image/png;base64,hidden-screenshot',
              imageSize: { width: 1280, height: 720 },
            }),
            'enabled',
            true,
          ),
          'shape',
          'circle',
        ),
        'width',
        4,
      ),
  )
  state = setCaseInsertTemplateAdditionalArtworkEnabled(state, 'tray', false)
  state = addJewelCaseSpineImageSlot(
    state,
    'left',
    'artworkSlots',
    createDefaultCaseInsertImageSlot(
      'left-spine-artwork-1',
      'Artwork 1',
      { enabled: true },
    ),
  )
  state = setJewelCaseSpineAdditionalArtworkEnabled(state, 'left', false)

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    selectedSteamGame: steamGame,
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert
  const trayArtwork = restored.templates.tray.artworkSlots[0]

  assert.equal(restored.templates.tray.additionalArtworkEnabled, false)
  assert.equal(
    trayArtwork?.imageDataUrl,
    'data:image/png;base64,hidden-screenshot',
  )
  assert.deepEqual(
    getFeatureVisibleRepeatedArtworkItems(
      restored.templates.tray,
      restored.templates.tray.artworkSlots,
    ),
    [],
  )
  assert.deepEqual(trayArtwork?.imageSize, { width: 1280, height: 720 })
  assert.deepEqual(trayArtwork?.frame, {
    ...DEFAULT_ADDITIONAL_ARTWORK_FRAME,
    enabled: true,
    shape: 'circle',
    width: 4,
  })
  assert.equal(restored.spine.left.additionalArtworkEnabled, false)
  assert.equal(restored.spine.left.artworkSlots[0]?.id, 'left-spine-artwork-1')
  assert.equal(restored.spine.left.artworkSlots[0]?.label, 'Artwork 1')
  assert.deepEqual(
    getFeatureVisibleRepeatedArtworkItems(
      restored.spine.left,
      restored.spine.left.artworkSlots,
    ),
    [],
  )
  assert.deepEqual(
    restored.spine.left.artworkSlots[0]?.frame,
    DEFAULT_ADDITIONAL_ARTWORK_FRAME,
  )
})

test('case additional artwork slots use shared labels, frames, and save/load behavior', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addCaseInsertTemplateImageSlot(state, 'cover', 'artworkSlots')
  state = addCaseInsertTemplateImageSlot(state, 'cover', 'artworkSlots')
  state = removeCaseInsertTemplateImageSlot(
    state,
    'cover',
    'artworkSlots',
    'cover-artwork-1',
  )
  state = addCaseInsertTemplateImageSlot(state, 'cover', 'artworkSlots')
  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    renameCaseInsertTemplateImageSlot(
      cover,
      'artworkSlots',
      'cover-artwork-2',
      '',
    ),
  )

  assert.deepEqual(
    state.templates.cover.artworkSlots.map(({ id, label }) => [id, label]),
    [
      ['cover-artwork-2', ''],
      ['cover-artwork-3', 'Artwork 3'],
    ],
  )

  state = addCaseInsertTemplateImageSlot(state, 'tray', 'artworkSlots')
  state = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'tray',
    'artworkSlots',
    'tray-artwork-1',
    (slot) =>
      updateCaseInsertImageSlotFrameField(
        updateCaseInsertImageSlotFrameField(
          setCaseInsertImageSlotImage(slot, {
            imageDataUrl: 'data:image/png;base64,tray-artwork',
            imageSize: { width: 640, height: 360 },
          }),
          'enabled',
          true,
        ),
        'color',
        '#00ffaa',
      ),
  )
  state = addJewelCaseSpineImageSlot(
    state,
    'right',
    'artworkSlots',
    createDefaultJewelCaseSpineArtworkSlot('right', 1),
  )
  state = setCaseInsertTemplateAdditionalArtworkEnabled(state, 'tray', false)
  state = setJewelCaseSpineAdditionalArtworkEnabled(state, 'right', false)

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert

  assert.equal(restored.templates.tray.additionalArtworkEnabled, false)
  assert.equal(restored.templates.tray.artworkSlots[0]?.label, 'Artwork 1')
  assert.equal(
    restored.templates.tray.artworkSlots[0]?.imageDataUrl,
    'data:image/png;base64,tray-artwork',
  )
  assert.deepEqual(
    getFeatureVisibleRepeatedArtworkItems(
      restored.templates.tray,
      restored.templates.tray.artworkSlots,
    ),
    [],
  )
  assert.deepEqual(restored.templates.tray.artworkSlots[0]?.frame, {
    ...DEFAULT_ADDITIONAL_ARTWORK_FRAME,
    enabled: true,
    color: '#00ffaa',
  })
  assert.equal(restored.spine.right.additionalArtworkEnabled, false)
  assert.equal(restored.spine.right.artworkSlots[0]?.id, 'right-spine-artwork-1')
  assert.equal(restored.spine.right.artworkSlots[0]?.label, 'Artwork 1')
  assert.deepEqual(
    getFeatureVisibleRepeatedArtworkItems(
      restored.spine.right,
      restored.spine.right.artworkSlots,
    ),
    [],
  )
})
