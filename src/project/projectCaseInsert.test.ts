import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_CASE_INSERT_TEMPLATE_TYPE } from '../editor/editorTypes.ts'
import {
  addJewelCaseFrontRepeatedImageSlot,
  removeJewelCaseFrontRepeatedImageSlot,
  renameJewelCaseFrontRepeatedImageSlot,
  updateJewelCaseFrontRepeatedImageSlot,
} from '../caseInsert/frontCoverTransitions.ts'
import {
  createCaseInsertImageSlotImageFromImportedAsset,
} from '../caseInsert/imageSlotSourceImport.ts'
import {
  DEFAULT_CASE_INSERT_PROJECT_TITLE,
  addCaseInsertTextListItem,
  addJewelCaseBackScreenshotSlot,
  createBlankJewelCaseSavedProject,
  createCaseInsertProjectSnapshot,
  createDefaultProjectJewelCaseState,
  removeCaseInsertTextListItem,
  removeJewelCaseBackScreenshotSlot,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListEnabled,
  setProjectJewelCaseExportGuideIds,
  setProjectJewelCaseExportSurfaces,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotLayoutField,
  updateCaseInsertTextBlockValue,
  updateCaseInsertTextListItem,
  updateJewelCaseBackScreenshotSlot,
  updateProjectJewelCaseBack,
  updateProjectJewelCaseFront,
  updateProjectJewelCaseSpineSide,
  normalizeSavedCaseInsertProject,
  restoreCaseInsertProjectState,
  restoreCaseInsertProjectStateFromContents,
} from './projectCaseInsert.ts'
import { createProjectImageAssetProvenance } from './projectAssetStatus.ts'
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

test('creates blank jewel case saved project data', () => {
  const project = createBlankJewelCaseSavedProject('Archive Case')

  assert.equal(project.schemaVersion, '0.1.0')
  assert.equal(project.projectType, 'caseInsert')
  assert.equal(project.title, 'Archive Case')
  assert.equal(project.game.manualTitle, 'Archive Case')
  assert.equal(project.template.type, 'caseInsert')
  assert.equal(project.template.variant, DEFAULT_CASE_INSERT_TEMPLATE_TYPE)
  assert.equal(project.caseInsert.templateType, DEFAULT_CASE_INSERT_TEMPLATE_TYPE)
  assert.equal(project.caseInsert.front.background.enabled, true)
  assert.equal(project.caseInsert.back.background.enabled, true)
  assert.equal(project.caseInsert.front.calloutArtwork.enabled, false)
  assert.equal(project.caseInsert.front.calloutText.value, '')
  assert.equal(project.caseInsert.back.description.value, '')
  assert.deepEqual(project.caseInsert.back.featureBullets.items, [])
  assert.equal(project.caseInsert.back.minimumRequirements.enabled, false)
  assert.equal(project.caseInsert.back.recommendedRequirements.enabled, false)
  assert.equal(project.caseInsert.back.legalText.enabled, false)
  assert.equal(project.caseInsert.back.screenshotSlots.length, 3)
  assert.equal(project.caseInsert.spine.left.title.value, 'Archive Case')
  assert.equal(project.caseInsert.spine.left.steamBackupBranding.enabled, false)
  assert.deepEqual(project.caseInsert.export.surfaces, ['front', 'back'])
  assert.equal(project.caseInsert.export.guideIds.includes('leftSpineFold'), true)
  assert.deepEqual(resolveSavedProjectRoute(project), {
    projectType: 'caseInsert',
    workspace: 'caseInsert',
  })
})

test('creates case insert snapshots with normalized metadata and state', () => {
  const project = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    selectedSteamGame: steamGame,
    projectMetadata: {
      title: 'Portal 2 Case',
      steamAppId: '620',
    },
    savedAt: '2026-06-03T12:00:00.000Z',
    caseInsert: {
      front: {
        calloutText: {
          enabled: true,
          value: 'Co-op edition',
          align: 'center',
        },
        textBlocks: [
          {
            id: 'front-tagline',
            label: 'Front tagline',
            enabled: true,
            value: 'Now thinking with portals',
            source: 'manual',
            align: 'center',
            layout: {
              scale: 1,
              x: 10,
              y: 20,
              rotation: 0,
            },
          },
        ],
      },
      back: {
        description: {
          enabled: true,
          value: 'A test chamber classic.',
        },
        featureBullets: {
          enabled: true,
          items: ['Single-player', 'Co-op puzzles'],
        },
      },
    },
  })

  assert.equal(project.savedAt, '2026-06-03T12:00:00.000Z')
  assert.equal(project.metadata?.title, 'Portal 2 Case')
  assert.equal(project.metadata?.steamAppId, '620')
  assert.equal(project.metadata?.ratingSystem, 'none')
  assert.equal(project.caseInsert.front.calloutText.value, 'Co-op edition')
  assert.equal(project.caseInsert.front.textBlocks[0]?.value, 'Now thinking with portals')
  assert.equal(project.caseInsert.back.description.value, 'A test chamber classic.')
  assert.deepEqual(project.caseInsert.back.featureBullets.items, [
    'Single-player',
    'Co-op puzzles',
  ])
})

test('restores sparse jewel case projects to safe defaults', () => {
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
        },
      },
      export: {
        surfaces: ['back'],
        guideIds: ['backPanelBounds', 'not-a-guide'],
      },
    },
  })

  const screenshot = restored.caseInsert.back.screenshotSlots[0]

  assert.equal(restored.manualGameTitle, 'Sparse Manual')
  assert.equal(restored.projectMetadata.steamAppId, '620')
  assert.equal(restored.template.selectedCaseInsertTemplateId, 'jewelCase')
  assert.equal(restored.caseInsert.front.background.enabled, true)
  assert.equal(screenshot?.id, 'back-screenshot-1')
  assert.equal(screenshot?.imageDataUrl, 'data:image/png;base64,shot')
  assert.deepEqual(screenshot?.imageSize, { width: 1280, height: 720 })
  assert.equal(screenshot?.imageSource?.source, 'uploaded')
  assert.equal(screenshot?.imageSource?.sourceLabel, 'shot.png')
  assert.equal(screenshot?.imageSource?.sourceUrl, null)
  assert.equal(restored.caseInsert.back.description.enabled, true)
  assert.equal(restored.caseInsert.back.description.value, '')
  assert.deepEqual(restored.caseInsert.back.featureBullets.items, [
    'Portals',
    'Robots',
  ])
  assert.equal(restored.caseInsert.back.minimumRequirements.value, 'Windows XP')
  assert.equal(restored.caseInsert.back.recommendedRequirements.value, 'Windows 7')
  assert.equal(restored.caseInsert.back.legalText.value, 'Valve terms apply.')
  assert.equal(restored.caseInsert.spine.left.title.enabled, true)
  assert.equal(restored.caseInsert.spine.left.title.value, 'SPARSE')
  assert.equal(restored.caseInsert.spine.left.title.layout.rotation, 90)
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
          imageDataUrl: 'data:image/png;base64,front',
        },
      },
    },
  })

  assert.equal(project.projectType, 'caseInsert')
  assert.equal(project.game.manualTitle, 'Legacy Jewel Case')
  assert.equal(project.template.type, 'caseInsert')
  assert.equal(project.template.variant, 'jewelCase')
  assert.equal(project.caseInsert.front.background.imageSource?.source, 'embedded')
  assert.deepEqual(resolveSavedProjectRoute({ template: { type: 'jewelCase' } }), {
    projectType: 'caseInsert',
    workspace: 'caseInsert',
  })
})

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

  assert.equal(project.caseInsert.front.background.fit, 'crop')
  assert.equal(project.caseInsert.back.screenshotSlots[0]?.fit, 'scale')
})

test('case update helpers preserve optional state while toggling visibility', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectJewelCaseFront(state, (front) => ({
    ...front,
    calloutArtwork: setCaseInsertImageSlotEnabled(
      setCaseInsertImageSlotImage(front.calloutArtwork, {
        imageDataUrl: 'data:image/png;base64,callout',
        imageSize: { width: 640, height: 320 },
        imageSource: {
          source: 'uploaded',
          sourceLabel: 'C:\\Users\\John\\Pictures\\callout.png',
        },
      }),
      false,
    ),
    calloutText: setCaseInsertTextBlockEnabled(
      updateCaseInsertTextBlockValue(front.calloutText, 'Includes co-op'),
      false,
    ),
  }))
  state = updateProjectJewelCaseBack(state, (back) => ({
    ...back,
    featureBullets: setCaseInsertTextListEnabled(
      addCaseInsertTextListItem(back.featureBullets, 'Two-player puzzles'),
      false,
    ),
  }))
  state = updateProjectJewelCaseSpineSide(state, 'left', (spineSide) => ({
    ...spineSide,
    title: setCaseInsertTextBlockEnabled(
      updateCaseInsertTextBlockValue(spineSide.title, ''),
      false,
    ),
  }))

  assert.equal(state.front.calloutArtwork.enabled, false)
  assert.equal(state.front.calloutArtwork.imageDataUrl, 'data:image/png;base64,callout')
  assert.deepEqual(state.front.calloutArtwork.imageSize, { width: 640, height: 320 })
  assert.equal(state.front.calloutArtwork.imageSource?.source, 'uploaded')
  assert.equal(state.front.calloutArtwork.imageSource?.sourceLabel, 'callout.png')
  assert.equal(state.front.calloutText.enabled, false)
  assert.equal(state.front.calloutText.value, 'Includes co-op')
  assert.equal(state.back.featureBullets.enabled, false)
  assert.deepEqual(state.back.featureBullets.items, ['Two-player puzzles'])
  assert.equal(state.spine.left.title.enabled, false)
  assert.equal(state.spine.left.title.value, '')
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

  state = updateProjectJewelCaseFront(state, (front) => ({
    ...front,
    background: setCaseInsertImageSlotEnabled(
      setCaseInsertImageSlotImage(front.background, slotImage),
      false,
    ),
  }))

  assert.equal(state.front.background.enabled, false)
  assert.equal(state.front.background.imageDataUrl, 'data:image/png;base64,library')
  assert.deepEqual(state.front.background.imageSize, { width: 600, height: 900 })
  assert.equal(state.front.background.imageSource?.source, 'steam-artwork')
  assert.equal(state.front.background.imageSource?.sourceId, 'cdn-library-capsule')
  assert.equal(state.front.background.imageSource?.sourceLabel, 'Steam library capsule')
  assert.equal(
    state.front.background.imageSource?.sourceUrl,
    'https://cdn.akamai.steamstatic.com/steam/apps/620/library_600x900.jpg',
  )
})

test('case helpers update screenshot slots and export settings', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addJewelCaseBackScreenshotSlot(state)
  assert.equal(state.back.screenshotSlots.length, 4)
  assert.equal(state.back.screenshotSlots[3]?.id, 'back-screenshot-4')

  state = updateJewelCaseBackScreenshotSlot(
    state,
    'back-screenshot-4',
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

  const updatedScreenshot = state.back.screenshotSlots[3]

  assert.equal(updatedScreenshot?.enabled, true)
  assert.equal(updatedScreenshot?.imageSource?.source, 'embedded')
  assert.equal(updatedScreenshot?.fit, 'contain')
  assert.equal(updatedScreenshot?.layout.x, 24)

  state = removeJewelCaseBackScreenshotSlot(state, 'back-screenshot-4')
  state = setProjectJewelCaseExportSurfaces(state, ['back'])
  state = setProjectJewelCaseExportGuideIds(state, ['backPanelBounds'])

  assert.equal(state.back.screenshotSlots.length, 3)
  assert.deepEqual(state.export.surfaces, ['back'])
  assert.deepEqual(state.export.guideIds, ['backPanelBounds'])
})

test('front cover helpers add, update, preserve, and remove logo and mark slots', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addJewelCaseFrontRepeatedImageSlot(state, 'logoSlots')
  state = addJewelCaseFrontRepeatedImageSlot(state, 'markSlots')

  assert.equal(state.front.logoSlots[0]?.id, 'front-logo-1')
  assert.equal(state.front.markSlots[0]?.id, 'front-mark-1')
  assert.equal(state.front.logoSlots[0]?.enabled, true)
  assert.equal(state.front.markSlots[0]?.layout.x, 82)

  state = updateJewelCaseFrontRepeatedImageSlot(
    state,
    'logoSlots',
    'front-logo-1',
    (slot) => setCaseInsertImageSlotEnabled(
      setCaseInsertImageSlotImage(slot, {
        imageDataUrl: 'data:image/png;base64,logo',
        imageSize: { width: 400, height: 120 },
        imageSource: {
          source: 'uploaded',
          sourceLabel: 'C:\\Users\\John\\Pictures\\dev-logo.png',
        },
      }),
      false,
    ),
  )
  state = updateProjectJewelCaseFront(state, (front) =>
    renameJewelCaseFrontRepeatedImageSlot(
      front,
      'logoSlots',
      'front-logo-1',
      'Developer logo',
    ),
  )

  assert.equal(state.front.logoSlots[0]?.enabled, false)
  assert.equal(state.front.logoSlots[0]?.label, 'Developer logo')
  assert.equal(state.front.logoSlots[0]?.imageDataUrl, 'data:image/png;base64,logo')
  assert.equal(state.front.logoSlots[0]?.imageSource?.sourceLabel, 'dev-logo.png')

  state = removeJewelCaseFrontRepeatedImageSlot(
    state,
    'logoSlots',
    'front-logo-1',
  )

  assert.equal(state.front.logoSlots.length, 0)
  assert.equal(state.front.markSlots.length, 1)
})

test('feature bullet helpers edit items without replacing feature state', () => {
  let textList = createDefaultProjectJewelCaseState().back.featureBullets

  textList = addCaseInsertTextListItem(textList, 'First bullet')
  textList = addCaseInsertTextListItem(textList, 'Second bullet')
  textList = updateCaseInsertTextListItem(textList, 1, 'Updated second bullet')
  textList = removeCaseInsertTextListItem(textList, 0)

  assert.equal(textList.enabled, true)
  assert.deepEqual(textList.items, ['Updated second bullet'])
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
