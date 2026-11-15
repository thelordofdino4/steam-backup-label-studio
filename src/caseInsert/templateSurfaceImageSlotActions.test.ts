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
  updateCaseInsertImageSlotLayout,
  updateCaseInsertImageSlotLayoutField,
  updateCaseInsertImageSlotLayoutPosition,
} from './imageSlotTransitions.ts'
import {
  updateCaseInsertTemplateImageSlot,
  updateCaseInsertTemplateImageSlotInGroup,
} from './templateSurfaceTransitions.ts'
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
  setCaseInsertTemplateGroupedSlotImageSource,
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

test('repeated artwork source replacement preserves stable viewport-backed slot state', () => {
  const slot = createDefaultCaseInsertImageSlot(
    'tray-artwork-2',
    'Screenshot 2',
    {
      enabled: false,
      fit: 'crop',
      layout: { x: 50, y: 78, scale: 1, rotation: 9 },
    },
  )
  slot.frame = {
    ...slot.frame,
    enabled: true,
    color: '#123456',
    width: 3,
  }
  slot.reservedArtworkViewport = {
    kind: 'sbls/case-insert-artwork-viewport',
    formatVersion: 1,
    templateId: 'jewelCase',
    templateRevision: null,
    coordinateBasis: 'backPanelSafe',
    widthPercent: 26,
    heightPercent: 16,
    focalPosition: { xPercent: 41, yPercent: 63 },
    zoom: 2.25,
  }
  const next = setCaseInsertTemplateGroupedSlotImageSource(
    'artworkSlots',
    slot,
    createImportedImageInput('Replacement screenshot'),
  )

  assert.deepEqual({
    id: next.id,
    label: next.label,
    enabled: next.enabled,
    fit: next.fit,
    layout: next.layout,
    frame: next.frame,
    viewport: next.reservedArtworkViewport,
  }, {
    id: slot.id,
    label: slot.label,
    enabled: slot.enabled,
    fit: slot.fit,
    layout: slot.layout,
    frame: slot.frame,
    viewport: slot.reservedArtworkViewport,
  })
  assert.equal(next.imageSource?.sourceLabel, 'Replacement screenshot')
  assert.deepEqual(next.imageSize, { width: 320, height: 180 })
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

test('image-slot layout no-ops preserve slot and template identities', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const slot = state.templates.cover.background
  const sameLayout = { ...slot.layout }

  assert.equal(updateCaseInsertImageSlotLayout(slot, sameLayout), slot)
  assert.equal(
    updateCaseInsertImageSlotLayoutField(slot, 'x', slot.layout.x),
    slot,
  )
  assert.equal(
    updateCaseInsertImageSlotLayoutField(slot, 'y', slot.layout.y),
    slot,
  )
  assert.equal(
    updateCaseInsertImageSlotLayoutField(slot, 'scale', slot.layout.scale),
    slot,
  )
  assert.equal(
    updateCaseInsertImageSlotLayoutField(
      slot,
      'rotation',
      slot.layout.rotation,
    ),
    slot,
  )
  assert.equal(
    updateCaseInsertImageSlotLayoutPosition(slot, {
      x: slot.layout.x,
      y: slot.layout.y,
    }),
    slot,
  )

  const unchanged = updateCaseInsertTemplateImageSlot(
    state,
    'cover',
    'background',
    (current) => updateCaseInsertImageSlotLayout(current, sameLayout),
  )

  assert.equal(unchanged, state)
  assert.equal(unchanged.templates, state.templates)
  assert.equal(unchanged.templates.cover, state.templates.cover)
  assert.equal(unchanged.templates.cover.background, slot)
})

test('real image-slot layout changes replace only the owned identity chain', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const slot = state.templates.cover.background
  const nextX = slot.layout.x + 1
  const changedSlot = updateCaseInsertImageSlotLayoutField(slot, 'x', nextX)
  const changedState = updateCaseInsertTemplateImageSlot(
    state,
    'cover',
    'background',
    (current) => updateCaseInsertImageSlotLayoutPosition(current, {
      x: nextX,
      y: current.layout.y,
    }),
  )

  assert.notEqual(changedSlot, slot)
  assert.equal(changedSlot.layout.x, nextX)
  assert.equal(changedSlot.layout.y, slot.layout.y)
  assert.notEqual(changedState, state)
  assert.notEqual(changedState.templates, state.templates)
  assert.notEqual(changedState.templates.cover, state.templates.cover)
  assert.notEqual(changedState.templates.cover.background, slot)
  assert.equal(changedState.templates.cover.background.layout.x, nextX)
  assert.equal(
    changedState.templates.cover.titleArtwork,
    state.templates.cover.titleArtwork,
  )
  assert.equal(changedState.templates.tray, state.templates.tray)
})

test('grouped template image-slot no-ops preserve arrays and root identity', () => {
  const slot = createDefaultCaseInsertImageSlot('cover-artwork-1', 'Artwork 1')
  const base = createDefaultProjectJewelCaseState('Portal 2')
  const state = {
    ...base,
    templates: {
      ...base.templates,
      cover: {
        ...base.templates.cover,
        artworkSlots: [slot],
      },
    },
  }
  const unchanged = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'cover',
    'artworkSlots',
    slot.id,
    (current) => updateCaseInsertImageSlotLayoutPosition(current, {
      x: current.layout.x,
      y: current.layout.y,
    }),
  )
  const changed = updateCaseInsertTemplateImageSlotInGroup(
    state,
    'cover',
    'artworkSlots',
    slot.id,
    (current) => updateCaseInsertImageSlotLayoutField(
      current,
      'scale',
      current.layout.scale + 0.1,
    ),
  )

  assert.equal(unchanged, state)
  assert.equal(
    unchanged.templates.cover.artworkSlots,
    state.templates.cover.artworkSlots,
  )
  assert.notEqual(changed, state)
  assert.notEqual(
    changed.templates.cover.artworkSlots,
    state.templates.cover.artworkSlots,
  )
  assert.equal(
    changed.templates.cover.artworkSlots[0]?.layout.scale,
    slot.layout.scale + 0.1,
  )
  assert.equal(changed.templates.tray, state.templates.tray)
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
