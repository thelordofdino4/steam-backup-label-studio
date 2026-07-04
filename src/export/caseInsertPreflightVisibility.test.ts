import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import {
  createDefaultProjectJewelCaseState,
} from '../project/projectCaseInsert.ts'
import {
  createDefaultProjectLogoAssets,
} from '../project/projectLogoAssets.ts'
import {
  createDefaultProjectMediaMark,
} from '../project/projectMediaMark.ts'
import {
  createDefaultProjectMetadata,
} from '../project/projectMetadata.ts'
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
  BackgroundImageSize,
  ProjectCaseInsertImageSlot,
} from '../project/projectTypes.ts'
import {
  formatImageSlotStatus,
  formatVisibleElementStatus,
  slotWillRender,
  surfaceHasVisibleContent,
} from './caseInsertPreflightVisibility.ts'

function createDefaultBrandingSources(): CaseInsertBrandingSourceCatalog {
  return {
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(),
    projectMediaMark: createDefaultProjectMediaMark(),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
  }
}

function createRenderableSlot(
  slot: ProjectCaseInsertImageSlot,
  imageSize: BackgroundImageSize = { width: 300, height: 200 },
): ProjectCaseInsertImageSlot {
  return {
    ...slot,
    enabled: true,
    imageDataUrl: `data:image/png;base64,${slot.id}`,
    imageSize,
  }
}

test('case insert preflight visibility requires enabled slot data and size', () => {
  const emptySlot = createDefaultCaseInsertImageSlot(
    'test-slot',
    'Test slot',
    { enabled: true },
  )
  const disabledRenderableSlot = {
    ...createRenderableSlot(emptySlot),
    enabled: false,
  }

  assert.equal(slotWillRender(emptySlot), false)
  assert.equal(slotWillRender(createRenderableSlot(emptySlot)), true)
  assert.equal(slotWillRender(disabledRenderableSlot), false)
})

test('case insert preflight visibility formats image slot status', () => {
  const emptySlot = createDefaultCaseInsertImageSlot(
    'test-slot',
    'Test slot',
    { enabled: true },
  )
  const presentWithoutSize = {
    ...emptySlot,
    imageDataUrl: 'data:image/png;base64,test-slot',
  }

  assert.equal(formatImageSlotStatus({ ...emptySlot, enabled: false }), 'Disabled')
  assert.equal(formatImageSlotStatus(emptySlot), 'None')
  assert.equal(formatImageSlotStatus(presentWithoutSize), 'Present')
  assert.equal(
    formatImageSlotStatus(createRenderableSlot(emptySlot)),
    'Present (300 x 200px)',
  )
})

test('case insert preflight visibility counts renderable surface content', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const brandingSources = createDefaultBrandingSources()
  const emptySurface = {
    ...project.templates.cover,
    additionalArtworkEnabled: false,
    artworkSlots: [],
    background: {
      ...project.templates.cover.background,
      enabled: false,
    },
    logoSlots: [],
    markSlots: [],
    steamBanner: {
      ...project.templates.cover.steamBanner,
      enabled: false,
    },
    textBlocks: [],
    textLists: [],
    titleArtwork: {
      ...project.templates.cover.titleArtwork,
      enabled: false,
    },
  }
  const surfaceWithBackground = {
    ...emptySurface,
    background: createRenderableSlot(emptySurface.background),
  }

  assert.equal(surfaceHasVisibleContent(emptySurface, brandingSources), false)
  assert.equal(formatVisibleElementStatus(emptySurface, null, brandingSources), 'None')
  assert.equal(surfaceHasVisibleContent(surfaceWithBackground, brandingSources), true)
  assert.equal(formatVisibleElementStatus(surfaceWithBackground, null, brandingSources), '1')
})
