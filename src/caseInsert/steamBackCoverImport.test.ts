import assert from 'node:assert/strict'
import { makeDiscSteamPngFixtures } from '../app/testing/discSteamPngFixtures.mjs'
import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { applyCaseSteamDocumentImport, readCaseSteamDocumentBasis } from '../app/appCaseSteamDocumentCommand.ts'
import { prepareCaseSteamImport } from '../lifecycle/caseSteamOperation.ts'
import { createLoadedProjectSession, selectIsActiveProjectDirty, updateLastEditorRoute } from '../lifecycle/projectSession.ts'
import { planCaseSteamDocumentImport } from '../app/appCaseSteamDocumentPlan.ts'
import { createCaseInsertProjectSnapshot } from '../project/caseInsertProjectAdapters.ts'
import test from 'node:test'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  applyCaseInsertBackCoverLegalText,
  applySteamBackCoverImportToCaseInsert,
} from './steamBackCoverImport.ts'
import {
  applyCaseInsertSteamImportBrandingDefaults,
  getCaseInsertRatingBadgeForSteamImport,
} from './steamImportBrandingDefaults.ts'
import {
  applySteamImportDefaultsToCaseInsert,
} from './steamImportDefaults.ts'
import type {
  CaseInsertTitleArtworkImportSeed,
} from './titleArtwork.ts'
import {
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS,
  CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS,
} from './defaultImportLayouts.ts'
import {
  getEnabledCaseInsertMarkSlotForKind,
} from './brandingMarkPlacement.ts'
import {
  syncProjectJewelCaseBrandingMarkSlots,
} from './brandingMarkSlots.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
} from '../project/projectPlatformMarks.ts'
import {
  createDefaultProjectRatingBadge,
} from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarks,
} from '../project/projectTechnicalMarks.ts'
import type {
  CaseInsertBrandingSourceCatalog,
} from './brandingSlotSources.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'
import type { RatingBoardCandidate } from '../steam/steamMetadataCandidates.ts'

function createSteamGame(
  overrides: Partial<SteamImportedGame> = {},
): SteamImportedGame {
  return {
    appId: 620,
    title: 'Portal 2',
    developer: ['Valve'],
    publisher: ['Valve'],
    releaseDate: '2011',
    shortDescription: 'The sequel to the acclaimed puzzle game.',
    detailedDescription: '',
    genres: ['Puzzle', 'Action'],
    categories: ['Single-player', 'Co-op', 'Steam Achievements'],
    minimumRequirements: '<strong>Minimum:</strong><br>OS: Windows XP',
    recommendedRequirements:
      '<strong>Recommended:</strong><br>OS: Windows 7<br>Memory: 2 GB RAM',
    legalNotice: '&copy; Valve Corporation. All rights reserved.',
    ratings: undefined,
    platforms: { windows: true, mac: true, linux: true },
    website: undefined,
    storeUrl: 'https://store.steampowered.com/app/620',
    artwork: [],
    ...overrides,
  }
}

function createEsrbRatingCandidate(
  overrides: Partial<RatingBoardCandidate> = {},
): RatingBoardCandidate {
  return {
    id: 'rating-steam-appdetails-esrb-m',
    boardId: 'esrb',
    boardLabel: 'ESRB',
    rawRating: 'm',
    displayRating: 'M',
    ratingSystem: 'ESRB',
    ratingValue: 'M',
    applyKind: 'rating',
    canApply: true,
    confidence: 'high',
    source: 'steam-appdetails',
    sourceLabel: 'Steam appdetails',
    sourceUrl: null,
    descriptors: [],
    reasons: ['Steam appdetails includes ESRB rating data.'],
    ...overrides,
  }
}

function createBrandingSources(
  overrides: Partial<CaseInsertBrandingSourceCatalog> = {},
): CaseInsertBrandingSourceCatalog {
  return {
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(),
    projectMediaMark: createDefaultProjectMediaMark(),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    ...overrides,
  }
}

function getTrayTextBlock(
  caseInsert: ReturnType<typeof createDefaultProjectJewelCaseState>,
  id: string,
) {
  const textBlock = caseInsert.templates.tray.textBlocks.find(
    (candidate) => candidate.id === id,
  )

  assert.ok(textBlock)

  return textBlock
}

function getTrayTextList(
  caseInsert: ReturnType<typeof createDefaultProjectJewelCaseState>,
  id: string,
) {
  const textList = caseInsert.templates.tray.textLists.find(
    (candidate) => candidate.id === id,
  )

  assert.ok(textList)

  return textList
}

test('Steam Case defaults preserve Tray artwork and never provision preset screenshot slots', () => {
  const source = createDefaultProjectJewelCaseState('Portal 2')
  const customArtwork = createDefaultCaseInsertImageSlot(
    'tray-artwork-custom',
    'Custom supporting art',
    { enabled: true },
  )
  source.templates.tray.additionalArtworkEnabled = true
  source.templates.tray.artworkSlots = [customArtwork]
  const sourceSlots = source.templates.tray.artworkSlots
  const before = structuredClone(sourceSlots)

  const state = applySteamImportDefaultsToCaseInsert({
    caseInsert: source,
    importedGame: createSteamGame(),
    legalText: 'Copyright Valve Corporation.',
    replaceExisting: true,
    titleArtworkSeed: null,
    ratingCandidate: null,
    brandingSources: createBrandingSources(),
  })

  assert.strictEqual(state.templates.tray.artworkSlots, sourceSlots)
  assert.deepEqual(state.templates.tray.artworkSlots, before)
  assert.deepEqual(
    state.templates.tray.artworkSlots
      .filter(({ id }) => /^tray-artwork-[123]$/.test(id)),
    [],
  )
})

test('Steam import seeds tray card back-cover text fields', () => {
  const state = applySteamBackCoverImportToCaseInsert(
    createDefaultProjectJewelCaseState(),
    createSteamGame(),
  )
  const tray = state.templates.tray

  assert.equal(
    getTrayTextBlock(state, 'tray-description').value,
    'The sequel to the acclaimed puzzle game.',
  )
  assert.equal(getTrayTextBlock(state, 'tray-description').enabled, false)
  assert.equal(getTrayTextBlock(state, 'tray-description').source, 'steam')
  assert.equal(getTrayTextBlock(state, 'tray-description').align, 'left')
  assert.deepEqual(
    getTrayTextBlock(state, 'tray-description').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS['tray-description'].layout,
  )
  assert.equal(
    getTrayTextBlock(state, 'tray-minimum-requirements').value,
    'Minimum:\nOS: Windows XP',
  )
  assert.deepEqual(
    getTrayTextBlock(state, 'tray-minimum-requirements').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS[
      'tray-minimum-requirements'
    ].layout,
  )
  assert.equal(
    getTrayTextBlock(state, 'tray-recommended-requirements').value,
    'Recommended:\nOS: Windows 7\nMemory: 2 GB RAM',
  )
  assert.deepEqual(
    getTrayTextBlock(state, 'tray-recommended-requirements').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS[
      'tray-recommended-requirements'
    ].layout,
  )
  assert.equal(
    getTrayTextBlock(state, 'tray-copyright-text').value,
    '(c) Valve Corporation. All rights reserved.',
  )
  assert.deepEqual(
    getTrayTextBlock(state, 'tray-copyright-text').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS['tray-copyright-text'].layout,
  )
  assert.deepEqual(tray.textLists[0]?.items, [
    'Single-player',
    'Co-op',
    'Puzzle',
    'Action',
    'Steam Achievements',
  ])
  assert.equal(tray.textLists[0]?.enabled, false)
  assert.equal(tray.textLists[0]?.source, 'steam')
  assert.deepEqual(
    getTrayTextList(state, 'tray-feature-bullets').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_LIST_LAYOUTS['tray-feature-bullets'].layout,
  )
})

test('Steam import preserves enabled tray text fields while updating game text', () => {
  const state = createDefaultProjectJewelCaseState()
  const enabledDescription = state.templates.tray.textBlocks.map((textBlock) =>
    textBlock.id === 'tray-description'
      ? { ...textBlock, enabled: true, value: '', source: 'steam' as const }
      : textBlock,
  )
  const updated = applySteamBackCoverImportToCaseInsert(
    {
      ...state,
      templates: {
        ...state.templates,
        tray: {
          ...state.templates.tray,
          textBlocks: enabledDescription,
        },
      },
    },
    createSteamGame({ shortDescription: 'Updated Steam copy.' }),
  )

  assert.equal(getTrayTextBlock(updated, 'tray-description').enabled, true)
  assert.equal(
    getTrayTextBlock(updated, 'tray-description').value,
    'Updated Steam copy.',
  )
})

test('Steam import preserves user-edited tray card text by default', () => {
  const state = createDefaultProjectJewelCaseState()
  const customDescription = state.templates.tray.textBlocks.map((textBlock) =>
    textBlock.id === 'tray-description'
      ? {
          ...textBlock,
          enabled: true,
          value: 'Custom back-cover copy',
          source: 'manual' as const,
          layout: {
            ...textBlock.layout,
            scale: 1.2,
            x: 12,
            y: 88,
          },
        }
      : textBlock,
  )
  const updated = applySteamBackCoverImportToCaseInsert(
    {
      ...state,
      templates: {
        ...state.templates,
        tray: {
          ...state.templates.tray,
          textBlocks: customDescription,
        },
      },
    },
    createSteamGame({ shortDescription: 'Steam copy.' }),
  )

  assert.equal(
    getTrayTextBlock(updated, 'tray-description').value,
    'Custom back-cover copy',
  )
  assert.equal(getTrayTextBlock(updated, 'tray-description').source, 'manual')
  assert.equal(getTrayTextBlock(updated, 'tray-description').layout.scale, 1.2)
  assert.equal(getTrayTextBlock(updated, 'tray-description').layout.x, 12)
  assert.equal(getTrayTextBlock(updated, 'tray-description').layout.y, 88)
})

test('Steam import can replace game-scoped tray card text', () => {
  const state = createDefaultProjectJewelCaseState()
  const customDescription = state.templates.tray.textBlocks.map((textBlock) =>
    textBlock.id === 'tray-description'
      ? {
          ...textBlock,
          enabled: true,
          value: 'Previous game copy',
          source: 'manual' as const,
        }
      : textBlock,
  )
  const updated = applySteamBackCoverImportToCaseInsert(
    {
      ...state,
      templates: {
        ...state.templates,
        tray: {
          ...state.templates.tray,
          textBlocks: customDescription,
        },
      },
    },
    createSteamGame({ shortDescription: 'Next game copy.' }),
    { replaceExisting: true },
  )

  assert.equal(getTrayTextBlock(updated, 'tray-description').value, 'Next game copy.')
  assert.equal(getTrayTextBlock(updated, 'tray-description').source, 'steam')
  assert.deepEqual(
    getTrayTextBlock(updated, 'tray-description').layout,
    CASE_INSERT_TRAY_DEFAULT_STEAM_TEXT_BLOCK_LAYOUTS['tray-description'].layout,
  )
})

test('case insert legal candidate applies to the tray card legal text', () => {
  const state = applyCaseInsertBackCoverLegalText(
    createDefaultProjectJewelCaseState(),
    '<p>&copy; Example Studio. All rights reserved.</p>',
  )
  const legalText = getTrayTextBlock(state, 'tray-copyright-text')

  assert.equal(legalText.enabled, true)
  assert.equal(legalText.source, 'steam')
  assert.equal(legalText.value, '(c) Example Studio. All rights reserved.')
})

test('Steam import branding defaults enable the cover ESRB rating badge', () => {
  const ratingCandidate = createEsrbRatingCandidate()
  const projectMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }
  const projectRatingBadge = getCaseInsertRatingBadgeForSteamImport({
    projectMetadata,
    projectRatingBadge: createDefaultProjectRatingBadge(),
    ratingCandidate,
  })
  const state = applyCaseInsertSteamImportBrandingDefaults({
    caseInsert: createDefaultProjectJewelCaseState('Portal 2'),
    ratingCandidate,
    brandingSources: createBrandingSources({
      projectMetadata,
      projectRatingBadge,
    }),
  })
  const coverRatingSlot = getEnabledCaseInsertMarkSlotForKind(
    state.templates.cover.markSlots,
    'rating',
  )

  assert.equal(projectRatingBadge.layout.enabled, true)
  assert.equal(coverRatingSlot?.enabled, true)
  assert.equal(coverRatingSlot?.imageSource?.sourceId, 'case-rating:ESRB:M')
  assert.match(coverRatingSlot?.imageDataUrl ?? '', /rating-badge-esrb-m\.svg/)
  assert.equal(state.templates.tray.markSlots.length, 0)
  assert.equal(state.spine.left.markSlots.length, 0)
  assert.equal(state.spine.right.markSlots.length, 0)
})

test('Steam import branding broad sync does not create tray or spine ESRB badges', () => {
  const ratingCandidate = createEsrbRatingCandidate()
  const projectMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }
  const projectRatingBadge = getCaseInsertRatingBadgeForSteamImport({
    projectMetadata,
    projectRatingBadge: createDefaultProjectRatingBadge(),
    ratingCandidate,
  })
  const brandingSources = createBrandingSources({
    projectMetadata,
    projectRatingBadge,
  })
  const importDefaultState = applyCaseInsertSteamImportBrandingDefaults({
    caseInsert: createDefaultProjectJewelCaseState('Portal 2'),
    ratingCandidate,
    brandingSources,
  })
  const syncedState = syncProjectJewelCaseBrandingMarkSlots(
    importDefaultState,
    brandingSources,
  )

  assert.equal(
    getEnabledCaseInsertMarkSlotForKind(
      syncedState.templates.cover.markSlots,
      'rating',
    )?.imageSource?.sourceId,
    'case-rating:ESRB:M',
  )
  assert.equal(syncedState.templates.tray.markSlots.length, 0)
  assert.equal(syncedState.spine.left.markSlots.length, 0)
  assert.equal(syncedState.spine.right.markSlots.length, 0)
})

test('Steam import defaults apply tray copy, title artwork seed, and cover rating defaults together', () => {
  const ratingCandidate = createEsrbRatingCandidate()
  const projectMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
    copyrightText: 'Copyright 2011 Valve Corporation.',
  }
  const projectRatingBadge = getCaseInsertRatingBadgeForSteamImport({
    projectMetadata,
    projectRatingBadge: createDefaultProjectRatingBadge(),
    ratingCandidate,
  })
  const titleArtworkSeed: CaseInsertTitleArtworkImportSeed = {
    status: 'seeded',
    statusMessage: 'Using Steam logo as the case insert game logo.',
    image: {
      imageDataUrl: 'data:image/png;base64,title-logo',
      imageSize: { width: 320, height: 120 },
    },
    steamArtworkAsset: {
      id: 'steam-logo',
      label: 'Steam logo',
      url: 'https://cdn.example.test/logo.png',
      kind: 'logo',
    },
  }
  const state = applySteamImportDefaultsToCaseInsert({
    caseInsert: createDefaultProjectJewelCaseState('Portal 2'),
    importedGame: createSteamGame(),
    legalText: projectMetadata.copyrightText,
    replaceExisting: true,
    titleArtworkSeed,
    ratingCandidate,
    brandingSources: createBrandingSources({
      projectMetadata,
      projectRatingBadge,
    }),
  })
  const coverRatingSlot = getEnabledCaseInsertMarkSlotForKind(
    state.templates.cover.markSlots,
    'rating',
  )

  assert.equal(getTrayTextBlock(state, 'tray-description').source, 'steam')
  assert.equal(
    getTrayTextBlock(state, 'tray-copyright-text').value,
    'Copyright 2011 Valve Corporation.',
  )
  assert.equal(
    state.templates.cover.titleArtwork.imageDataUrl,
    'data:image/png;base64,title-logo',
  )
  assert.equal(
    state.templates.tray.titleArtwork.imageSource?.sourceId,
    'steam-logo',
  )
  assert.equal(state.spine.left.title.enabled, false)
  assert.equal(state.spine.right.title.enabled, false)
  assert.equal(coverRatingSlot?.enabled, true)
  assert.equal(coverRatingSlot?.imageSource?.sourceId, 'case-rating:ESRB:M')
  assert.equal(state.templates.tray.markSlots.length, 0)
  assert.equal(state.spine.left.markSlots.length, 0)
  assert.equal(state.spine.right.markSlots.length, 0)
})

test('Case Steam document plan keeps authored owners and matches the current defaults-plus-sync sequence', () => {
  const source = createDefaultProjectJewelCaseState('Previous title')
  source.templates.tray.additionalArtworkEnabled = true
  source.templates.tray.artworkSlots = [createDefaultCaseInsertImageSlot(
    'tray-artwork-author', 'Authored supporting art', { enabled: true },
  )]
  const current = createCaseInsertProjectSnapshot({
    caseInsert: source, savedAt: '2020-01-01T00:00:00.000Z', activeCaseInsertTemplatePane: 'tray',
    projectMetadata: { ...createDefaultProjectMetadata(), subtitle: 'Keep this edition' },
  })
  const before = structuredClone(current)
  const currentSources = createBrandingSources()
  const importedGame = createSteamGame()
  const autoRatingCandidate = createEsrbRatingCandidate()
  const { newer: png } = makeDiscSteamPngFixtures(1, importedGame.appId)
  const titleArtworkSeed: CaseInsertTitleArtworkImportSeed = {
    status: 'seeded', statusMessage: 'Imported test PNG',
    image: { imageDataUrl: png.dataUrl, imageSize: { width: png.width, height: png.height, contentBounds: png.bounds } },
    steamArtworkAsset: { id: 'fixture-logo', label: 'Fixture Steam logo',
      url: 'https://example.invalid/fixture.png', kind: 'logo' },
  }
  const projectMetadata = { ...current.metadata!, title: importedGame.title, steamAppId: '620',
    ratingSystem: 'ESRB' as const, ratingValue: 'M', copyrightText: 'Copyright Valve.' }
  const metadataPlan = {
    isDifferentSelectedSteamGame: true, autoRatingCandidate, autoLegalCandidate: null,
    nextProjectMetadata: projectMetadata, shouldResetGameScopedRating: true,
    shouldResetGameScopedLegal: true, shouldUpdateCopyrightDiscTextSource: false,
  }
  const result = planCaseSteamDocumentImport({
    current, importedGame, titleArtworkSeed, metadataPlan, brandingSources: currentSources,
  })
  assert.deepEqual(current, before)
  const sources = { ...currentSources, projectMetadata, projectRatingBadge: result.ratingBadge }
  const expected = syncProjectJewelCaseBrandingMarkSlots(applySteamImportDefaultsToCaseInsert({
    caseInsert: current.caseInsert, importedGame, legalText: projectMetadata.copyrightText,
    replaceExisting: true, titleArtworkSeed, ratingCandidate: autoRatingCandidate, brandingSources: sources,
  }), sources)
  const expectedSnapshot = createCaseInsertProjectSnapshot({
    caseInsert: expected, activeCaseInsertTemplatePane: 'tray', savedAt: current.savedAt,
    manualGameTitle: importedGame.title, selectedSteamGame: importedGame, projectMetadata,
  })
  assert.deepEqual(result.project, expectedSnapshot)
  assert.equal(result.project.editor?.activeCaseInsertTemplatePane, 'tray')
  assert.equal(result.project.metadata?.subtitle, 'Keep this edition')
  assert.equal(result.project.game.selectedSteamGame?.appId, 620)
  assert.deepEqual(result.project.caseInsert.templates.tray.artworkSlots, before.caseInsert.templates.tray.artworkSlots)
  assert.strictEqual(result.project.caseInsertLayoutPreset, current.caseInsertLayoutPreset)

  const state = updateLastEditorRoute(createLoadedProjectSession({
    sessionId: 'case-fixture', project: current, currentPath: 'saved.sbls',
    persistenceFormat: 'sbls-package-v1',
  }), { workspace: 'caseInsert', surface: 'spine' })
  const session = state.activeSession
  assert.equal(session?.kind, 'caseInsert')
  const input = { sessionId: 'case-fixture', expectedRevision: session.revision, proposed: result.project }
  assert.deepEqual(prepareCaseSteamImport(state, { ...input, expectedRevision: session.revision + 1 }), { status: 'stale' })
  assert.deepEqual(prepareCaseSteamImport(state, { ...input, proposed: {
    ...result.project, metadata: { ...projectMetadata, subtitle: 'Denied rewrite' },
  } }), { status: 'invalid' })
  assert.deepEqual(prepareCaseSteamImport(state, { ...input, proposed: {
    ...result.project, caseInsert: { ...result.project.caseInsert, export: { ...current.caseInsert.export, guideIds: ['frontSafe'] } },
  } }), { status: 'invalid' })
  assert.deepEqual(prepareCaseSteamImport(state, { ...input, proposed: {
    ...result.project, game: { ...result.project.game, selectedSteamGame: { ...importedGame, appId: 621 } },
  } }), { status: 'invalid' })
  const tray = result.project.caseInsert.templates.tray
  assert.deepEqual(prepareCaseSteamImport(state, { ...input, proposed: { ...result.project, caseInsert: {
    ...result.project.caseInsert, templates: {
      ...result.project.caseInsert.templates, tray: { ...tray, artworkSlots: [] },
    },
  } } }), { status: 'invalid' })
  const prepared = prepareCaseSteamImport(state, {
    ...input, proposed: { ...input.proposed, editor: { activeCaseInsertTemplatePane: 'cover' } },
  })
  assert.equal(prepared.status, 'prepared')
  const next = prepared.state.activeSession
  assert.equal(next?.kind, 'caseInsert')
  assert.equal(next.revision, session.revision + 1)
  assert.equal(next.currentPath, session.currentPath)
  assert.equal(next.cleanBaseline, session.cleanBaseline)
  assert.deepEqual(next.lastEditorRoute, session.lastEditorRoute)
  assert.deepEqual(next.project.editor, session.project.editor)
  assert.deepEqual(next.project.caseInsert, expectedSnapshot.caseInsert)
  assert.equal(next.project.game.selectedSteamGame?.appId, 620)
  for (const surface of [next.project.caseInsert.templates.cover, next.project.caseInsert.templates.tray,
    next.project.caseInsert.spine.left, next.project.caseInsert.spine.right]) {
    assert.equal(surface.titleArtwork.imageDataUrl, png.dataUrl)
    assert.equal(surface.titleArtwork.defaultSteamLogo?.imageDataUrl, png.dataUrl)
  }
  assert.equal(next.caseInsertPresetApplication.applicationRevision, session.caseInsertPresetApplication.applicationRevision + 1)
  assert.equal(selectIsActiveProjectDirty(state), false)
  assert.equal(selectIsActiveProjectDirty(prepared.state), true)
  assert.deepEqual(prepareCaseSteamImport(prepared.state, input), { status: 'stale' })
  assert.deepEqual(prepareCaseSteamImport(prepared.state, { ...input, expectedRevision: next.revision }), { status: 'no-op' })

  const root = createApplicationLifecycleCompositionRoot({ initialState: state, caseHistoryLimit: 2 })
  const basis = readCaseSteamDocumentBasis(root, current)
  assert.ok(basis)
  assert.equal(readCaseSteamDocumentBasis(root, result.project), null)
  const observed: unknown[] = []
  const stop = root.subscribe(({ lifecycle, capabilities }) => {
    if (!root.getStateSnapshot().caseSteamProjectionPending) return
    const session = lifecycle.activeSession
    assert.equal(session?.kind, 'caseInsert')
    observed.push(session.revision, session.project.game.selectedSteamGame?.appId,
      capabilities['export.png'].reasonCode, capabilities['case.layoutPreset.apply'].reasonCode,
      root.synchronizeCurrentProject({ sessionId: session.id, kind: 'caseInsert', project: current }))
    observed.push(root.acknowledgeCaseSteamProjection({
      sessionId: session.id, expectedGeneration: root.getStateSnapshot().generation, projection: current,
    }))
  })
  assert.equal(applyCaseSteamDocumentImport(root, { ...input, expectedGeneration: basis.expectedGeneration },
    run => run(), changed => { assert.equal(changed, true); observed.push('mirrored') }), true)
  stop()
  assert.deepEqual(observed, [next.revision, 620, 'export.case-steam-projection-pending',
    'case.layoutPreset.projection-pending', 'stale-session', 'invalid', 'mirrored'])
  assert.equal(root.acknowledgeCaseSteamProjection({
    sessionId: next.id, expectedGeneration: root.getStateSnapshot().generation, projection: result.project,
  }), 'committed')
  assert.equal(root.getStateSnapshot().caseSteamProjectionPending, undefined)
  assert.ok(readCaseSteamDocumentBasis(root, result.project))
  const committedSession = root.getLifecycleState().activeSession
  assert.equal(committedSession?.kind, 'caseInsert')
  assert.deepEqual(root.getStateSnapshot().caseHistory?.past, [session.project])
  const step = (direction: 'undo' | 'redo', projection: typeof current) => {
    assert.equal(root.stepCaseDocumentHistory({
      sessionId: session.id, expectedGeneration: root.getStateSnapshot().generation, direction,
    }), 'committed')
    assert.equal(root.getStateSnapshot().caseSteamProjectionPending, true)
    assert.equal(root.acknowledgeCaseSteamProjection({
      sessionId: session.id, expectedGeneration: root.getStateSnapshot().generation, projection,
    }), 'committed')
    const accepted = root.getLifecycleState().activeSession
    assert.equal(accepted?.kind, 'caseInsert')
    assert.equal(accepted.currentPath, session.currentPath)
    assert.deepEqual(accepted.cleanBaseline, session.cleanBaseline)
    assert.deepEqual(accepted.lastEditorRoute, session.lastEditorRoute)
    assert.equal(accepted.caseInsertPresetApplication.attachment.status, 'unattached')
    return accepted
  }
  const undone = step('undo', current)
  assert.equal(undone.project, session.project)
  assert.equal(undone.revision, committedSession.revision + 1)
  assert.equal(undone.caseInsertPresetApplication.applicationRevision,
    committedSession.caseInsertPresetApplication.applicationRevision + 1)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), false)
  const redone = step('redo', result.project)
  assert.equal(redone.project, committedSession.project)
  assert.equal(redone.revision, undone.revision + 1)
  assert.equal(redone.caseInsertPresetApplication.applicationRevision,
    undone.caseInsertPresetApplication.applicationRevision + 1)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), true)
  root.dispose()
})
