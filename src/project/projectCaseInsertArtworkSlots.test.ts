import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCaseInsertImageSlotImageFromImportedAsset,
} from '../caseInsert/imageSlotSourceImport.ts'
import {
  addCaseInsertTemplateImageSlot,
  createDefaultProjectJewelCaseState,
  fitCaseInsertImageSlotToRegionHeight,
  removeCaseInsertTemplateImageSlot,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  setProjectJewelCaseExportGuideIds,
  setProjectJewelCaseExportSurfaces,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotLayoutField,
  updateCaseInsertTemplateImageSlot,
  updateCaseInsertTemplateImageSlotInGroup,
  normalizeSavedCaseInsertProject,
} from './projectCaseInsert.ts'
import { createProjectImageAssetProvenance } from './projectAssetStatus.ts'

test('case image fit normalization accepts scale and crop modes', () => {
  const project = normalizeSavedCaseInsertProject({
    title: 'Fit Modes',
    caseInsert: {
      front: {
        background: {
          fit: 'crop',
        },
      },
      back: {
        screenshots: [
          {
            fit: 'scale',
          },
        ],
      },
    },
  })

  assert.equal(project.caseInsert.templates.cover.background.fit, 'crop')
  assert.equal(project.caseInsert.templates.tray.artworkSlots[0]?.fit, 'scale')
})

test('case image slot source import keeps reusable provenance and size metadata', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const slotImage = createCaseInsertImageSlotImageFromImportedAsset(
    {
      imageDataUrl: 'data:image/png;base64,library',
      imageSize: { width: 600, height: 900 },
      fileName: 'library_600x900.jpg',
    },
    createProjectImageAssetProvenance({
      source: 'steam-artwork',
      sourceId: 'cdn-library-capsule',
      sourceLabel: 'Steam library capsule',
      sourceUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/620/library_600x900.jpg',
    }),
  )

  state = updateCaseInsertTemplateImageSlot(
    state,
    'cover',
    'background',
    (slot) => setCaseInsertImageSlotEnabled(
      setCaseInsertImageSlotImage(slot, slotImage),
      false,
    ),
  )

  const background = state.templates.cover.background

  assert.equal(background.enabled, false)
  assert.equal(background.imageDataUrl, 'data:image/png;base64,library')
  assert.deepEqual(background.imageSize, { width: 600, height: 900 })
  assert.equal(background.imageSource?.source, 'steam-artwork')
  assert.equal(background.imageSource?.sourceId, 'cdn-library-capsule')
  assert.equal(background.imageSource?.sourceLabel, 'Steam library capsule')
  assert.equal(
    background.imageSource?.sourceUrl,
    'https://cdn.akamai.steamstatic.com/steam/apps/620/library_600x900.jpg',
  )
})

test('case artwork visibility preserves fit and manual placement state', () => {
  let slot = setCaseInsertImageSlotImage(
    createDefaultProjectJewelCaseState('Portal 2').templates.cover.background,
    {
      imageDataUrl: 'data:image/png;base64,cover',
      imageSize: { width: 1600, height: 2400 },
      imageSource: createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: 'C:\\Users\\John\\Pictures\\cover.png',
      }),
    },
  )

  slot = updateCaseInsertImageSlotFit(slot, 'scale')
  slot = updateCaseInsertImageSlotLayoutField(slot, 'scale', 1.8)
  slot = updateCaseInsertImageSlotLayoutField(slot, 'x', 24)
  slot = updateCaseInsertImageSlotLayoutField(slot, 'y', -18)

  const hiddenSlot = setCaseInsertImageSlotEnabled(slot, false)
  const restoredSlot = setCaseInsertImageSlotEnabled(hiddenSlot, true)

  assert.equal(hiddenSlot.enabled, false)
  assert.equal(hiddenSlot.imageDataUrl, 'data:image/png;base64,cover')
  assert.equal(hiddenSlot.imageSource?.source, 'uploaded')
  assert.equal(hiddenSlot.imageSource?.sourceLabel, 'cover.png')
  assert.equal(hiddenSlot.fit, 'scale')
  assert.deepEqual(hiddenSlot.layout, {
    scale: 1.8,
    x: 24,
    y: -18,
    rotation: 0,
  })
  assert.deepEqual(restoredSlot.layout, hiddenSlot.layout)
  assert.equal(restoredSlot.imageDataUrl, hiddenSlot.imageDataUrl)
})

test('case helpers update artwork slots and export settings', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addCaseInsertTemplateImageSlot(state, 'cover', 'artworkSlots')
  assert.equal(state.templates.cover.additionalArtworkEnabled, true)
  assert.equal(state.templates.cover.artworkSlots.length, 1)
  assert.equal(state.templates.cover.artworkSlots[0]?.id, 'cover-artwork-1')
  assert.equal(state.templates.cover.artworkSlots[0]?.label, 'Artwork 1')

  assert.equal(state.templates.tray.additionalArtworkEnabled, false)
  state = addCaseInsertTemplateImageSlot(state, 'tray', 'artworkSlots')
  assert.equal(state.templates.tray.additionalArtworkEnabled, true)
  assert.equal(state.templates.tray.artworkSlots.length, 1)
  assert.equal(state.templates.tray.artworkSlots[0]?.id, 'tray-artwork-1')
  assert.equal(state.templates.tray.artworkSlots[0]?.label, 'Artwork 1')

  state = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'tray',
    'artworkSlots',
    'tray-artwork-1',
    (slot) => updateCaseInsertImageSlotFit(
      updateCaseInsertImageSlotLayoutField(
        setCaseInsertImageSlotImage(slot, {
          imageDataUrl: 'data:image/png;base64,screenshot',
          imageSize: { width: 1280, height: 720 },
        }),
        'x',
        24,
      ),
      'contain',
    ),
  )

  const updatedArtwork = state.templates.tray.artworkSlots[0]

  assert.equal(updatedArtwork?.enabled, true)
  assert.equal(updatedArtwork?.imageSource?.source, 'embedded')
  assert.equal(updatedArtwork?.fit, 'contain')
  assert.equal(updatedArtwork?.layout.x, 24)

  state = removeCaseInsertTemplateImageSlot(
    state,
    'tray',
    'artworkSlots',
    'tray-artwork-1',
  )
  state = setProjectJewelCaseExportSurfaces(state, ['back'])
  state = setProjectJewelCaseExportGuideIds(state, ['backPanelBounds'])

  assert.equal(state.templates.tray.artworkSlots.length, 0)
  assert.deepEqual(state.export.surfaces, ['back'])
  assert.deepEqual(state.export.guideIds, ['backPanelBounds'])
})

test('case image slot height fit keeps the full image vertical span visible', () => {
  const slot = setCaseInsertImageSlotImage(
    createDefaultProjectJewelCaseState('Portal 2').templates.cover.background,
    {
      imageDataUrl: 'data:image/png;base64,tall-cover',
      imageSize: { width: 1000, height: 4000 },
    },
  )
  const fittedSlot = fitCaseInsertImageSlotToRegionHeight(slot, {
    width: 1000,
    height: 1000,
  })

  assert.equal(fittedSlot.fit, 'cover')
  assert.equal(fittedSlot.layout.scale, 0.25)
  assert.equal(fittedSlot.layout.x, 0)
  assert.equal(fittedSlot.layout.y, 0)
})
