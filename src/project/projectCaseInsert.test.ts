import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_CASE_INSERT_TEMPLATE_TYPE } from '../editor/editorTypes.ts'
import {
  createCaseInsertImageSlotImageFromImportedAsset,
} from '../caseInsert/imageSlotSourceImport.ts'
import {
  createCaseInsertBrandingSourceSections,
  getCaseInsertMarkLayerKind,
} from '../caseInsert/brandingSlotSources.ts'
import {
  DEFAULT_CASE_INSERT_PROJECT_TITLE,
  addCaseInsertTemplateImageSlot,
  addCaseInsertTextListItem,
  createBlankJewelCaseSavedProject,
  createCaseInsertProjectSnapshot,
  createDefaultProjectJewelCaseState,
  removeCaseInsertTemplateImageSlot,
  removeCaseInsertTextListItem,
  renameCaseInsertTemplateImageSlot,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListEnabled,
  setProjectJewelCaseExportGuideIds,
  setProjectJewelCaseExportSurfaces,
  updateCaseInsertImageSlotFit,
  updateCaseInsertImageSlotLayoutField,
  updateCaseInsertTemplateImageSlot,
  updateCaseInsertTemplateImageSlotInGroup,
  updateProjectCaseInsertTemplate,
  updateProjectJewelCaseSpineSide,
  updateCaseInsertTextBlockValue,
  updateCaseInsertTextListItem,
  normalizeSavedCaseInsertProject,
  restoreCaseInsertProjectState,
  restoreCaseInsertProjectStateFromContents,
} from './projectCaseInsert.ts'
import { createProjectImageAssetProvenance } from './projectAssetStatus.ts'
import { createDefaultProjectLogoAssets } from './projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from './projectMediaMark.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from './projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from './projectRatingBadge.ts'
import { createDefaultProjectTechnicalMarks } from './projectTechnicalMarks.ts'
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

test('creates blank jewel case saved project data with generic template panes', () => {
  const project = createBlankJewelCaseSavedProject('Archive Case')
  const cover = project.caseInsert.templates.cover
  const tray = project.caseInsert.templates.tray

  assert.equal(project.schemaVersion, '0.1.0')
  assert.equal(project.projectType, 'caseInsert')
  assert.equal(project.title, 'Archive Case')
  assert.equal(project.game.manualTitle, 'Archive Case')
  assert.equal(project.template.type, 'caseInsert')
  assert.equal(project.template.variant, DEFAULT_CASE_INSERT_TEMPLATE_TYPE)
  assert.equal(project.caseInsert.templateType, DEFAULT_CASE_INSERT_TEMPLATE_TYPE)
  assert.equal(cover.background.enabled, true)
  assert.equal(tray.background.enabled, true)
  assert.equal(cover.artworkSlots[0]?.enabled, false)
  assert.equal(cover.textBlocks[0]?.value, '')
  assert.equal(tray.textBlocks[0]?.value, '')
  assert.deepEqual(tray.textLists[0]?.items, [])
  assert.equal(tray.textBlocks[1]?.enabled, false)
  assert.equal(tray.textBlocks[2]?.enabled, false)
  assert.equal(tray.textBlocks[3]?.enabled, false)
  assert.equal(tray.artworkSlots.length, 3)
  assert.equal(project.caseInsert.spine.left.title.enabled, true)
  assert.equal(project.caseInsert.spine.left.title.value, 'Archive Case')
  assert.equal(project.caseInsert.spine.left.title.layout.rotation, -90)
  assert.equal(project.caseInsert.spine.right.title.layout.rotation, 90)
  assert.equal(project.caseInsert.spine.left.steamBackupBranding.enabled, false)
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
  assert.equal(project.caseInsert.templates.cover.textBlocks[0]?.value, 'Co-op edition')
  assert.equal(
    project.caseInsert.templates.tray.textBlocks[0]?.value,
    'A test chamber classic.',
  )
  assert.deepEqual(project.caseInsert.templates.tray.textLists[0]?.items, [
    'Single-player',
    'Co-op puzzles',
  ])
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
  const screenshot = tray.artworkSlots[0]

  assert.equal(restored.manualGameTitle, 'Sparse Manual')
  assert.equal(restored.projectMetadata.steamAppId, '620')
  assert.equal(restored.template.selectedCaseInsertTemplateId, 'jewelCase')
  assert.equal(cover.background.enabled, true)
  assert.equal(screenshot?.id, 'tray-screenshot-1')
  assert.equal(screenshot?.imageDataUrl, 'data:image/png;base64,shot')
  assert.deepEqual(screenshot?.imageSize, { width: 1280, height: 720 })
  assert.equal(screenshot?.imageSource?.source, 'uploaded')
  assert.equal(screenshot?.imageSource?.sourceLabel, 'shot.png')
  assert.equal(screenshot?.imageSource?.sourceUrl, null)
  assert.equal(tray.textBlocks[0]?.enabled, true)
  assert.equal(tray.textBlocks[0]?.value, '')
  assert.deepEqual(tray.textLists[0]?.items, ['Portals', 'Robots'])
  assert.equal(tray.textBlocks[1]?.value, 'Windows XP')
  assert.equal(tray.textBlocks[2]?.value, 'Windows 7')
  assert.equal(tray.textBlocks[3]?.value, 'Valve terms apply.')
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

test('case update helpers preserve optional state while toggling visibility', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) => ({
    ...cover,
    artworkSlots: cover.artworkSlots.map((slot, index) =>
      index === 0
        ? setCaseInsertImageSlotEnabled(
            setCaseInsertImageSlotImage(slot, {
              imageDataUrl: 'data:image/png;base64,callout',
              imageSize: { width: 640, height: 320 },
              imageSource: {
                source: 'uploaded',
                sourceLabel: 'C:\\Users\\John\\Pictures\\callout.png',
              },
            }),
            false,
          )
        : slot,
    ),
    textBlocks: cover.textBlocks.map((textBlock, index) =>
      index === 0
        ? setCaseInsertTextBlockEnabled(
            updateCaseInsertTextBlockValue(textBlock, 'Includes co-op'),
            false,
          )
        : textBlock,
    ),
  }))
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    textLists: tray.textLists.map((textList, index) =>
      index === 0
        ? setCaseInsertTextListEnabled(
            addCaseInsertTextListItem(textList, 'Two-player puzzles'),
            false,
          )
        : textList,
    ),
  }))
  state = updateProjectJewelCaseSpineSide(state, 'left', (spineSide) => ({
    ...spineSide,
    title: setCaseInsertTextBlockEnabled(
      updateCaseInsertTextBlockValue(spineSide.title, ''),
      false,
    ),
  }))

  const cover = state.templates.cover
  const tray = state.templates.tray

  assert.equal(cover.artworkSlots[0]?.enabled, false)
  assert.equal(cover.artworkSlots[0]?.imageDataUrl, 'data:image/png;base64,callout')
  assert.deepEqual(cover.artworkSlots[0]?.imageSize, { width: 640, height: 320 })
  assert.equal(cover.artworkSlots[0]?.imageSource?.source, 'uploaded')
  assert.equal(cover.artworkSlots[0]?.imageSource?.sourceLabel, 'callout.png')
  assert.equal(cover.textBlocks[0]?.enabled, false)
  assert.equal(cover.textBlocks[0]?.value, 'Includes co-op')
  assert.equal(tray.textLists[0]?.enabled, false)
  assert.deepEqual(tray.textLists[0]?.items, ['Two-player puzzles'])
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

test('case insert source provenance survives save/load for tray slots', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateCaseInsertTemplateImageSlot(
    state,
    'tray',
    'background',
    (slot) => setCaseInsertImageSlotImage(slot, {
      imageDataUrl: 'data:image/png;base64,web',
      imageSize: { width: 1920, height: 1080 },
      imageSource: createProjectImageAssetProvenance({
        source: 'web-artwork',
        sourceId: 'official-hero',
        sourceLabel: 'Official hero artwork',
        sourceUrl: 'https://example.test/portal-2/hero.jpg',
      }),
    }),
  )
  state = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'tray',
    'artworkSlots',
    'tray-screenshot-1',
    (slot) => setCaseInsertImageSlotImage(slot, {
      imageDataUrl: 'data:image/png;base64,shot',
      imageSize: { width: 1280, height: 720 },
      imageSource: createProjectImageAssetProvenance({
        source: 'local-steam-screenshot',
        sourceId: '620-shot-1',
        sourceLabel: 'Screenshot 1',
      }),
    }),
  )

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    selectedSteamGame: steamGame,
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert
  const tray = restored.templates.tray

  assert.equal(tray.background.imageSource?.source, 'web-artwork')
  assert.equal(tray.background.imageSource?.sourceId, 'official-hero')
  assert.equal(tray.background.imageSource?.sourceLabel, 'Official hero artwork')
  assert.equal(
    tray.background.imageSource?.sourceUrl,
    'https://example.test/portal-2/hero.jpg',
  )
  assert.deepEqual(tray.background.imageSize, { width: 1920, height: 1080 })
  assert.equal(
    tray.artworkSlots[0]?.imageSource?.source,
    'local-steam-screenshot',
  )
  assert.equal(tray.artworkSlots[0]?.imageSource?.sourceId, '620-shot-1')
  assert.equal(tray.artworkSlots[0]?.imageSource?.sourceLabel, 'Screenshot 1')
  assert.deepEqual(tray.artworkSlots[0]?.imageSize, { width: 1280, height: 720 })
})

test('case helpers update artwork slots and export settings', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addCaseInsertTemplateImageSlot(state, 'tray', 'artworkSlots')
  assert.equal(state.templates.tray.artworkSlots.length, 4)
  assert.equal(state.templates.tray.artworkSlots[3]?.id, 'tray-screenshot-4')

  state = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'tray',
    'artworkSlots',
    'tray-screenshot-4',
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

  const updatedScreenshot = state.templates.tray.artworkSlots[3]

  assert.equal(updatedScreenshot?.enabled, true)
  assert.equal(updatedScreenshot?.imageSource?.source, 'embedded')
  assert.equal(updatedScreenshot?.fit, 'contain')
  assert.equal(updatedScreenshot?.layout.x, 24)

  state = removeCaseInsertTemplateImageSlot(
    state,
    'tray',
    'artworkSlots',
    'tray-screenshot-4',
  )
  state = setProjectJewelCaseExportSurfaces(state, ['back'])
  state = setProjectJewelCaseExportGuideIds(state, ['backPanelBounds'])

  assert.equal(state.templates.tray.artworkSlots.length, 3)
  assert.deepEqual(state.export.surfaces, ['back'])
  assert.deepEqual(state.export.guideIds, ['backPanelBounds'])
})

test('template helpers add, update, preserve, and remove logo and mark slots', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addCaseInsertTemplateImageSlot(state, 'cover', 'logoSlots')
  state = addCaseInsertTemplateImageSlot(state, 'cover', 'markSlots')
  state = addCaseInsertTemplateImageSlot(state, 'tray', 'logoSlots')
  state = addCaseInsertTemplateImageSlot(state, 'tray', 'markSlots')

  assert.equal(state.templates.cover.logoSlots[0]?.id, 'cover-logo-1')
  assert.equal(state.templates.cover.markSlots[0]?.id, 'cover-mark-1')
  assert.equal(state.templates.tray.logoSlots[0]?.id, 'tray-logo-1')
  assert.equal(state.templates.tray.markSlots[0]?.id, 'tray-mark-1')
  assert.equal(state.templates.cover.markSlots[0]?.layout.x, 82)
  assert.equal(state.templates.tray.markSlots[0]?.layout.x, 84)

  state = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'cover',
    'logoSlots',
    'cover-logo-1',
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
  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    renameCaseInsertTemplateImageSlot(
      cover,
      'logoSlots',
      'cover-logo-1',
      'Developer logo',
    ),
  )

  assert.equal(state.templates.cover.logoSlots[0]?.enabled, false)
  assert.equal(state.templates.cover.logoSlots[0]?.label, 'Developer logo')
  assert.equal(
    state.templates.cover.logoSlots[0]?.imageDataUrl,
    'data:image/png;base64,logo',
  )
  assert.equal(
    state.templates.cover.logoSlots[0]?.imageSource?.sourceLabel,
    'dev-logo.png',
  )

  state = removeCaseInsertTemplateImageSlot(
    state,
    'cover',
    'logoSlots',
    'cover-logo-1',
  )

  assert.equal(state.templates.cover.logoSlots.length, 0)
  assert.equal(state.templates.cover.markSlots.length, 1)
  assert.equal(state.templates.tray.logoSlots.length, 1)
  assert.equal(state.templates.tray.markSlots.length, 1)
})

test('case branding source catalog exposes shared mark and logo sources', () => {
  const sections = createCaseInsertBrandingSourceSections({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'M',
    },
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(),
    projectMediaMark: createDefaultProjectMediaMark(),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
  })
  const logos = sections.find((section) => section.id === 'logos')
  const rating = sections.find((section) => section.id === 'rating')
  const media = sections.find((section) => section.id === 'media')
  const platform = sections.find((section) => section.id === 'platform')
  const technical = sections.find((section) => section.id === 'technical')

  assert.ok(logos?.items.some((item) => item.sourceId === 'case-logo:developer'))
  assert.ok(logos?.items.some((item) => item.sourceId === 'case-logo:publisher'))
  assert.equal(rating?.items[0]?.sourceId, 'case-rating:ESRB:M')
  assert.ok(media?.items.some((item) =>
    item.sourceId === 'case-media:dataDisc:light'))
  assert.ok(platform?.items.some((item) =>
    item.sourceId === 'case-platform:windows:windows11'))
  assert.ok(technical?.items.some((item) =>
    item.sourceId === 'case-technical:audio'))

  assert.equal(getCaseInsertMarkLayerKind('case-rating:ESRB:M'), 'rating')
  assert.equal(getCaseInsertMarkLayerKind('case-media:dataDisc:light'), 'media')
  assert.equal(getCaseInsertMarkLayerKind('case-platform:windows:windows11'), 'platform')
  assert.equal(getCaseInsertMarkLayerKind('case-technical:audio'), 'technical')
  assert.equal(getCaseInsertMarkLayerKind(null), 'rating')
})

test('feature bullet helpers edit items without replacing feature state', () => {
  let textList = createDefaultProjectJewelCaseState().templates.tray.textLists[0]!

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
