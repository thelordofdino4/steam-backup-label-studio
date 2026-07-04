import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import type { ProjectCaseInsertImageSlot } from '../project/projectTypes.ts'
import type { SteamArtworkAsset } from '../steam/steamApi.ts'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  CASE_INSERT_TRAY_MARK_LAYOUTS,
} from './defaultBrandingLayouts.ts'
import {
  setCaseInsertTitleArtworkSteamImage,
} from './titleArtwork.ts'
import {
  clearCaseInsertTemplatePrimaryImageSlot,
  defaultCaseInsertTemplatePrimarySlotLayouts,
  fitCaseInsertTemplatePrimaryImageSlotToRegionHeight,
  getCaseInsertTemplateGroupedImageSlotResetLayout,
  getCaseInsertTemplateGroupDefaultLayout,
  preserveCaseInsertTemplateGroupedSlotSource,
  resetCaseInsertTemplatePrimaryImageSlotDefaultLayout,
  restoreCaseInsertTemplateTitleArtworkDefault,
  setCaseInsertTemplatePrimaryImageSlotEnabled,
  updateCaseInsertTemplatePrimaryImageSlotFit,
  updateCaseInsertTemplatePrimaryImageSlotLayoutValue,
} from './templateSurfaceImageSlotActions.ts'

const steamLogoAsset: SteamArtworkAsset = {
  id: 'cdn-logo',
  label: 'Steam CDN logo',
  kind: 'logo',
  url: 'https://cdn.example.test/logo.png',
  width: 640,
  height: 240,
}

function createImage(imageDataUrl: string) {
  return {
    imageDataUrl,
    imageSize: { width: 640, height: 240 },
    imageSource: createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel: 'custom-logo.png',
    }),
  }
}

function createMarkSlot(sourceId: string): ProjectCaseInsertImageSlot {
  return {
    ...createDefaultCaseInsertImageSlot('mark-1', 'Test mark', {
      enabled: true,
    }),
    imageDataUrl: 'data:image/png;base64,test-mark',
    imageSize: { width: 256, height: 128 },
    imageSource: createProjectImageAssetProvenance({
      source: 'placeholder',
      sourceId,
      sourceLabel: 'Test mark',
    }),
  }
}

function createImportedImageInput(sourceLabel = 'Imported image') {
  return {
    imageDataUrl: 'data:image/png;base64,imported-image',
    imageSize: { width: 320, height: 180 },
    imageSource: createProjectImageAssetProvenance({
      source: 'embedded',
      sourceId: 'uploaded-image',
      sourceLabel,
    }),
  }
}

test('case insert template action defaults preserve cover and tray reset layouts', () => {
  assert.deepEqual(
    defaultCaseInsertTemplatePrimarySlotLayouts.cover.background,
    { scale: 1, x: 0, y: 0, rotation: 0 },
  )
  assert.deepEqual(
    defaultCaseInsertTemplatePrimarySlotLayouts.tray.titleArtwork,
    { scale: 1, x: 50, y: 24, rotation: 0 },
  )
  assert.deepEqual(
    getCaseInsertTemplateGroupDefaultLayout('tray', 'markSlots'),
    { scale: 1, x: 84, y: 88, rotation: 0 },
  )
})

test('case insert template action resets keep shared mark kind defaults', () => {
  const slot = {
    ...createMarkSlot('case-platform:windows:windows11'),
    layout: { scale: 4, x: 12, y: 34, rotation: 45 },
  }

  assert.deepEqual(
    getCaseInsertTemplateGroupedImageSlotResetLayout(
      'tray',
      'markSlots',
      slot,
    ),
    CASE_INSERT_TRAY_MARK_LAYOUTS.platform,
  )
})

test('case insert template grouped image source helpers preserve case-owned identities', () => {
  const markSlot = createMarkSlot('case-rating:ESRB:T')
  const preservedMarkImage = preserveCaseInsertTemplateGroupedSlotSource(
    'markSlots',
    markSlot,
    createImportedImageInput('Uploaded ESRB'),
  )
  const logoSlot = {
    ...createDefaultCaseInsertImageSlot(
      'cover-logo-developer-1',
      'Additional Developer Logo 1',
    ),
    imageSource: createProjectImageAssetProvenance({
      source: 'placeholder',
      sourceId: 'case-logo:developer:additional:cover-logo-developer-1',
      sourceLabel: 'Additional Developer Logo 1',
    }),
  }
  const preservedLogoImage = preserveCaseInsertTemplateGroupedSlotSource(
    'logoSlots',
    logoSlot,
    createImportedImageInput(),
  )

  assert.equal(preservedMarkImage.imageSource?.sourceId, 'case-rating:ESRB:T')
  assert.equal(preservedMarkImage.imageSource?.sourceLabel, 'Uploaded ESRB')
  assert.equal(
    preservedLogoImage.imageSource?.sourceId,
    'case-logo:developer:additional:cover-logo-developer-1',
  )
})

test('template primary image slot helpers update only the targeted cover or tray slot', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const trayBackground = state.templates.tray.background

  const disabled = setCaseInsertTemplatePrimaryImageSlotEnabled(
    state,
    'cover',
    'background',
    false,
  )
  const fitChanged = updateCaseInsertTemplatePrimaryImageSlotFit(
    disabled,
    'cover',
    'background',
    'contain',
  )
  const moved = updateCaseInsertTemplatePrimaryImageSlotLayoutValue(
    fitChanged,
    'cover',
    'background',
    'x',
    42,
  )

  assert.equal(moved.templates.cover.background.enabled, false)
  assert.equal(moved.templates.cover.background.fit, 'contain')
  assert.equal(moved.templates.cover.background.layout.x, 42)
  assert.equal(moved.templates.tray.background, trayBackground)
})

test('template primary image slot reset restores the default layout without replacing slot identity', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const moved = updateCaseInsertTemplatePrimaryImageSlotLayoutValue(
    state,
    'tray',
    'titleArtwork',
    'x',
    12,
  )
  const reset = resetCaseInsertTemplatePrimaryImageSlotDefaultLayout(
    moved,
    'tray',
    'titleArtwork',
  )

  assert.equal(reset.templates.tray.titleArtwork.id, 'tray-title-artwork')
  assert.deepEqual(reset.templates.tray.titleArtwork.layout, {
    scale: 1,
    x: 50,
    y: 24,
    rotation: 0,
  })
  assert.equal(reset.templates.cover, state.templates.cover)
})

test('template title artwork restore preserves layout and Steam default provenance', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const steamDefault = setCaseInsertTitleArtworkSteamImage(
    state.templates.cover.titleArtwork,
    createImage('data:image/png;base64,steam-default'),
    steamLogoAsset,
    { rememberAsDefault: true },
  )
  const customizedState = {
    ...state,
    templates: {
      ...state.templates,
      cover: {
        ...state.templates.cover,
        titleArtwork: {
          ...steamDefault,
          enabled: false,
          imageDataUrl: 'data:image/png;base64,custom-logo',
          imageSource: createProjectImageAssetProvenance({
            source: 'uploaded',
            sourceLabel: 'custom-logo.png',
          }),
          layout: {
            ...steamDefault.layout,
            scale: 1.3,
            x: 38,
          },
        },
      },
    },
  }

  const restored = restoreCaseInsertTemplateTitleArtworkDefault(
    customizedState,
    'cover',
  )

  assert.equal(restored.templates.cover.titleArtwork.enabled, true)
  assert.equal(
    restored.templates.cover.titleArtwork.imageDataUrl,
    'data:image/png;base64,steam-default',
  )
  assert.equal(restored.templates.cover.titleArtwork.imageSource?.source, 'steam-artwork')
  assert.equal(restored.templates.cover.titleArtwork.imageSource?.sourceId, 'cdn-logo')
  assert.equal(restored.templates.cover.titleArtwork.layout.scale, 1.3)
  assert.equal(restored.templates.cover.titleArtwork.layout.x, 38)
  assert.equal(restored.templates.tray, state.templates.tray)
})

test('template primary image slot fit and clear keep cover tray ownership explicit', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const withImage = {
    ...state,
    templates: {
      ...state.templates,
      tray: {
        ...state.templates.tray,
        background: {
          ...state.templates.tray.background,
          imageDataUrl: 'data:image/png;base64,background',
          imageSize: { width: 1200, height: 800 },
        },
      },
    },
  }

  const titleFitIgnored = fitCaseInsertTemplatePrimaryImageSlotToRegionHeight(
    withImage,
    'tray',
    'titleArtwork',
  )
  const fitted = fitCaseInsertTemplatePrimaryImageSlotToRegionHeight(
    titleFitIgnored,
    'tray',
    'background',
  )
  const cleared = clearCaseInsertTemplatePrimaryImageSlot(
    fitted,
    'tray',
    'background',
  )

  assert.equal(titleFitIgnored, withImage)
  assert.equal(fitted.templates.tray.background.fit, 'cover')
  assert.equal(fitted.templates.tray.background.layout.scale > 0, true)
  assert.equal(cleared.templates.tray.background.enabled, false)
  assert.equal(cleared.templates.tray.background.imageDataUrl, null)
  assert.equal(cleared.templates.tray.background.imageSize, null)
  assert.equal(cleared.templates.cover, state.templates.cover)
})
