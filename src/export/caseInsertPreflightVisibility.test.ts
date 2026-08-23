import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  CaseInsertBrandingSourceCatalog,
} from '../caseInsert/brandingSlotSources.ts'
import {
  createDefaultCaseInsertImageSlot,
} from '../caseInsert/defaults.ts'
import {
  createCaseInsertPngExportLayout,
} from '../caseInsert/exportLayout.ts'
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
  const missingSizeSlot = {
    ...emptySlot,
    imageDataUrl: 'data:image/png;base64,test-slot',
  }

  assert.equal(slotWillRender(emptySlot), false)
  assert.equal(slotWillRender(createRenderableSlot(emptySlot)), true)
  assert.equal(slotWillRender(disabledRenderableSlot), false)
  assert.equal(slotWillRender(missingSizeSlot), false)
})

test('case insert preflight visibility requires real image content, not a viewport alone', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const trayViewportContext = {
    owner: 'tray' as const,
    layout: createCaseInsertPngExportLayout(project, 'tray'),
  }
  const coverViewportContext = {
    owner: 'cover' as const,
    layout: createCaseInsertPngExportLayout(project, 'cover'),
  }
  const emptySlot = createDefaultCaseInsertImageSlot(
    'viewport-slot',
    'Viewport slot',
    { enabled: true },
  )
  const viewportOnlySlot: ProjectCaseInsertImageSlot = {
    ...emptySlot,
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
  }
  const allTransparentSlot = createRenderableSlot(viewportOnlySlot, {
    width: 300,
    height: 200,
    contentBounds: { x: 0, y: 0, width: 0, height: 0 },
  })
  const contentBoundedSlot = createRenderableSlot(viewportOnlySlot, {
    width: 300,
    height: 200,
    contentBounds: { x: 20, y: 10, width: 120, height: 80 },
  })

  assert.equal(slotWillRender(viewportOnlySlot), false)
  assert.equal(slotWillRender(allTransparentSlot), false)
  assert.equal(slotWillRender(contentBoundedSlot), false)
  assert.equal(slotWillRender(contentBoundedSlot, trayViewportContext), true)
  assert.equal(slotWillRender(contentBoundedSlot, coverViewportContext), false)
  assert.equal(
    slotWillRender(
      { ...contentBoundedSlot, fit: 'scale' },
      trayViewportContext,
    ),
    false,
  )
  assert.equal(
    slotWillRender({
      ...contentBoundedSlot,
      fit: 'crop',
      reservedArtworkViewport: {
        ...contentBoundedSlot.reservedArtworkViewport!,
        zoom: Number.MAX_VALUE,
      },
    }, trayViewportContext),
    false,
  )
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
  assert.equal(
    formatImageSlotStatus(createRenderableSlot(emptySlot, {
      width: 300,
      height: 200,
      contentBounds: { x: 0, y: 0, width: 0, height: 0 },
    })),
    'None',
  )
})

test('case insert preflight visibility counts renderable surface content', () => {
  const project = createDefaultProjectJewelCaseState('Test Game')
  const brandingSources = createDefaultBrandingSources()
  const coverViewportContext = {
    owner: 'cover' as const,
    layout: createCaseInsertPngExportLayout(project, 'cover'),
  }
  const trayViewportContext = {
    owner: 'tray' as const,
    layout: createCaseInsertPngExportLayout(project, 'tray'),
  }
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
  const trayViewportSlot: ProjectCaseInsertImageSlot = {
    ...createRenderableSlot(createDefaultCaseInsertImageSlot(
      'tray-artwork-1',
      'Screenshot',
      { enabled: true, fit: 'cover' },
    )),
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
  }
  const surfaceWithTrayViewport = {
    ...emptySurface,
    additionalArtworkEnabled: true,
    artworkSlots: [trayViewportSlot],
  }

  assert.equal(surfaceHasVisibleContent(emptySurface, brandingSources), false)
  assert.equal(formatVisibleElementStatus(emptySurface, null, brandingSources), 'None')
  assert.equal(surfaceHasVisibleContent(surfaceWithBackground, brandingSources), true)
  assert.equal(formatVisibleElementStatus(surfaceWithBackground, null, brandingSources), '1')
  assert.equal(
    surfaceHasVisibleContent(
      surfaceWithTrayViewport,
      brandingSources,
      coverViewportContext,
    ),
    false,
  )
  assert.equal(
    surfaceHasVisibleContent(
      surfaceWithTrayViewport,
      brandingSources,
      trayViewportContext,
    ),
    true,
  )
  assert.equal(
    formatVisibleElementStatus(
      surfaceWithTrayViewport,
      null,
      brandingSources,
      coverViewportContext,
    ),
    'None',
  )
  assert.equal(
    formatVisibleElementStatus(
      surfaceWithTrayViewport,
      null,
      brandingSources,
      trayViewportContext,
    ),
    '1',
  )

  const surfaceWithUnresolvableViewport = {
    ...surfaceWithTrayViewport,
    artworkSlots: [{
      ...trayViewportSlot,
      fit: 'crop' as const,
      reservedArtworkViewport: {
        ...trayViewportSlot.reservedArtworkViewport!,
        zoom: Number.MAX_VALUE,
      },
    }],
  }

  assert.equal(
    surfaceHasVisibleContent(
      surfaceWithUnresolvableViewport,
      brandingSources,
      trayViewportContext,
    ),
    false,
  )
  assert.equal(
    formatVisibleElementStatus(
      surfaceWithUnresolvableViewport,
      null,
      brandingSources,
      trayViewportContext,
    ),
    'None',
  )
})
