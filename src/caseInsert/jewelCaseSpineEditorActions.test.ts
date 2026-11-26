import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectJewelCaseState,
  createDefaultCaseInsertImageSlot,
} from './defaults.ts'
import {
  createImageInput,
  createTextBlock,
  findSpineTextBlock,
  steamLogoAsset,
  withSource,
} from './jewelCaseSpineEditorActionsFixtures.ts'
import {
  setJewelCaseSpineMirrored,
} from './jewelCaseTransitions.ts'
import {
  clearJewelCaseSpineImageSlotImage,
  createDefaultJewelCaseSpineGroupedImageSlot,
  fitJewelCaseSpineImageSlotToRegionHeight,
  getSpineGroupedImageSlotResetLayout,
  preserveSpineGroupedSlotSource,
  resetJewelCaseSpineImageSlotDefaultLayout,
  restoreJewelCaseSpineTitleArtworkDefault,
  setJewelCaseSpineImageSlotEnabled,
  updateJewelCaseSpineImageSlotFit,
  updateJewelCaseSpineImageSlotLayoutValue,
} from './jewelCaseSpineImageSlotActions.ts'
import {
  getDefaultSpineTextBlockLayout,
  resetJewelCaseSpineTextBlockLayout,
  resetJewelCaseSpineTitleLayout,
  setJewelCaseSpineTextBlockAlign,
  updateJewelCaseSpineTextBlockLayoutValue,
  updateJewelCaseSpineTitleValue,
} from './jewelCaseSpineTextActions.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import {
  setCaseInsertTitleArtworkSteamImage,
} from './titleArtwork.ts'
import type {
  ProjectJewelCaseSpineSideState,
} from '../project/projectTypes.ts'

test('spine text reset layout resolves side-scoped text block ids', () => {
  assert.deepEqual(
    getDefaultSpineTextBlockLayout('left', 'left-spine-subtitle-text'),
    { scale: 0.78, width: 74, x: 50, y: 42, rotation: -90 },
  )
  assert.deepEqual(
    getDefaultSpineTextBlockLayout('right', 'subtitle-text'),
    { scale: 0.78, width: 74, x: 50, y: 42, rotation: 90 },
  )
})

test('spine text align update preserves the rest of the text block', () => {
  const textBlock = createTextBlock('left-spine-subtitle-text')
  const updated = setJewelCaseSpineTextBlockAlign(textBlock, 'center')

  assert.equal(updated.align, 'center')
  assert.equal(updated.layout, textBlock.layout)
  assert.equal(updated.style, textBlock.style)
})

test('spine title layout reset uses the target side orientation', () => {
  const title = createTextBlock('left-spine-title')
  const updated = resetJewelCaseSpineTitleLayout(title, 'right')

  assert.deepEqual(updated.layout, {
    scale: 1,
    fontSizePt: 16,
    width: 90,
    x: 50,
    y: 50,
    rotation: 90,
  })
  assert.equal(updated.align, title.align)
})

test('spine text block layout reset scopes ids to the mirrored target side', () => {
  const subtitle = createTextBlock('right-spine-subtitle-text')
  const otherText = createTextBlock('right-spine-developer-text')
  const spineSide = {
    textBlocks: [subtitle, otherText],
  } as ProjectJewelCaseSpineSideState

  const updated = resetJewelCaseSpineTextBlockLayout(
    spineSide,
    'right',
    'left-spine-subtitle-text',
  )

  assert.deepEqual(updated.textBlocks[0].layout, {
    scale: 0.78,
    width: 74,
    x: 50,
    y: 42,
    rotation: 90,
  })
  assert.equal(updated.textBlocks[1], otherText)
})

test('spine text block layout reset preserves state when no default exists', () => {
  const spineSide = {
    textBlocks: [createTextBlock('left-spine-unknown-text')],
  } as ProjectJewelCaseSpineSideState

  const updated = resetJewelCaseSpineTextBlockLayout(
    spineSide,
    'left',
    'left-spine-unknown-text',
  )

  assert.equal(updated, spineSide)
})

test('spine text block state helpers apply side-scoped mirrored edits', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')

  const updated = updateJewelCaseSpineTextBlockLayoutValue(
    state,
    'left',
    'left-spine-subtitle-text',
    'x',
    62,
  )

  assert.equal(
    findSpineTextBlock(updated, 'left', 'left-spine-subtitle-text').layout.x,
    62,
  )
  assert.equal(
    findSpineTextBlock(updated, 'right', 'right-spine-subtitle-text').layout.x,
    62,
  )
  assert.equal(
    findSpineTextBlock(updated, 'left', 'left-spine-developer-text'),
    findSpineTextBlock(state, 'left', 'left-spine-developer-text'),
  )
  assert.equal(updated.templates, state.templates)
})

test('spine title state helpers preserve one-sided edits when mirroring is off', () => {
  const state = setJewelCaseSpineMirrored(
    createDefaultProjectJewelCaseState('Portal 2'),
    false,
  )

  const updated = updateJewelCaseSpineTitleValue(
    state,
    'left',
    'Manual spine title',
    'manual',
  )

  assert.equal(updated.spine.left.title.value, 'Manual spine title')
  assert.equal(updated.spine.left.title.source, 'manual')
  assert.equal(updated.spine.right.title.value, state.spine.right.title.value)
  assert.equal(updated.spine.right.title, state.spine.right.title)
})

test('spine primary image slot helpers apply mirrored edits with side identity intact', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')

  const disabled = setJewelCaseSpineImageSlotEnabled(
    state,
    'left',
    'background',
    false,
  )
  const fitChanged = updateJewelCaseSpineImageSlotFit(
    disabled,
    'left',
    'background',
    'contain',
  )
  const moved = updateJewelCaseSpineImageSlotLayoutValue(
    fitChanged,
    'left',
    'background',
    'x',
    38,
  )

  assert.equal(moved.spine.left.background.enabled, false)
  assert.equal(moved.spine.right.background.enabled, false)
  assert.equal(moved.spine.left.background.fit, 'contain')
  assert.equal(moved.spine.right.background.fit, 'contain')
  assert.equal(moved.spine.left.background.layout.x, 38)
  assert.equal(moved.spine.right.background.layout.x, 38)
  assert.equal(moved.spine.left.background.id, 'left-spine-background')
  assert.equal(moved.spine.right.background.id, 'right-spine-background')
  assert.equal(moved.templates, state.templates)
})

test('spine primary image slot helpers preserve the opposite side when mirroring is off', () => {
  const state = setJewelCaseSpineMirrored(
    createDefaultProjectJewelCaseState('Portal 2'),
    false,
  )

  const moved = updateJewelCaseSpineImageSlotLayoutValue(
    state,
    'left',
    'titleArtwork',
    'y',
    27,
  )
  const reset = resetJewelCaseSpineImageSlotDefaultLayout(
    moved,
    'left',
    'titleArtwork',
  )

  assert.equal(moved.spine.left.titleArtwork.layout.y, 27)
  assert.equal(moved.spine.right.titleArtwork, state.spine.right.titleArtwork)
  assert.deepEqual(
    reset.spine.left.titleArtwork.layout,
    state.spine.left.titleArtwork.layout,
  )
  assert.equal(reset.spine.right.titleArtwork, state.spine.right.titleArtwork)
})

test('spine title artwork restore preserves layout and remembered Steam default', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const steamDefault = setCaseInsertTitleArtworkSteamImage(
    state.spine.left.titleArtwork,
    createImageInput('Steam logo'),
    steamLogoAsset,
    { rememberAsDefault: true },
  )
  const customized = {
    ...state,
    spine: {
      ...state.spine,
      left: {
        ...state.spine.left,
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
            scale: 1.25,
            x: 44,
          },
        },
      },
    },
  }

  const restored = restoreJewelCaseSpineTitleArtworkDefault(customized, 'left')

  assert.equal(restored.spine.left.titleArtwork.enabled, true)
  assert.equal(
    restored.spine.left.titleArtwork.imageDataUrl,
    'data:image/png;base64,new-image',
  )
  assert.equal(restored.spine.left.titleArtwork.imageSource?.source, 'steam-artwork')
  assert.equal(restored.spine.left.titleArtwork.imageSource?.sourceId, 'cdn-logo')
  assert.equal(restored.spine.left.titleArtwork.layout.scale, 1.25)
  assert.equal(restored.spine.left.titleArtwork.layout.x, 44)
})

test('spine primary image slot fit and clear preserve slot enabled state', () => {
  const state = setJewelCaseSpineMirrored(
    createDefaultProjectJewelCaseState('Portal 2'),
    false,
  )
  const withImage = {
    ...state,
    spine: {
      ...state.spine,
      left: {
        ...state.spine.left,
        background: {
          ...state.spine.left.background,
          enabled: true,
          imageDataUrl: 'data:image/png;base64,background',
          imageSize: { width: 1200, height: 800 },
        },
      },
    },
  }

  const titleFitIgnored = fitJewelCaseSpineImageSlotToRegionHeight(
    withImage,
    'left',
    'titleArtwork',
  )
  const fitted = fitJewelCaseSpineImageSlotToRegionHeight(
    titleFitIgnored,
    'left',
    'background',
  )
  const cleared = clearJewelCaseSpineImageSlotImage(
    fitted,
    'left',
    'background',
  )

  assert.equal(titleFitIgnored, withImage)
  assert.equal(fitted.spine.left.background.fit, 'cover')
  assert.equal(fitted.spine.left.background.layout.scale > 0, true)
  assert.equal(cleared.spine.left.background.enabled, true)
  assert.equal(cleared.spine.left.background.imageDataUrl, null)
  assert.equal(cleared.spine.left.background.imageSize, null)
  assert.equal(cleared.spine.right, state.spine.right)
})

test('spine grouped image slot factory creates non-colliding side-scoped slots', () => {
  const existingSlots = [
    createDefaultCaseInsertImageSlot('left-spine-logo-1', 'Logo 1'),
    createDefaultCaseInsertImageSlot('left-spine-logo-2', 'Logo 2'),
  ]

  const slot = createDefaultJewelCaseSpineGroupedImageSlot(
    'left',
    'logoSlots',
    existingSlots,
  )

  assert.equal(slot.id, 'left-spine-logo-3')
  assert.equal(slot.label, 'Logo 3')
  assert.equal(slot.fit, 'contain')
  assert.deepEqual(slot.layout, { scale: 1, x: 50, y: 84, rotation: 0 })
})

test('spine grouped image source preservation keeps case-owned mark identity', () => {
  const slot = withSource(
    createDefaultCaseInsertImageSlot('left-spine-mark-1', 'Rating mark'),
    'case-rating:ESRB:T',
    'ESRB T',
  )
  const image = createImageInput('Uploaded ESRB')

  const preserved = preserveSpineGroupedSlotSource('markSlots', slot, image)

  assert.equal(preserved.imageSource?.sourceId, 'case-rating:ESRB:T')
  assert.equal(preserved.imageSource?.sourceLabel, 'Uploaded ESRB')
})

test('spine grouped image source preservation keeps case-owned logo identity', () => {
  const slot = withSource(
    createDefaultCaseInsertImageSlot(
      'left-spine-logo-developer-1',
      'Additional Developer Logo 1',
    ),
    'case-logo:developer:additional:left-spine-logo-developer-1',
    'Additional Developer Logo 1',
  )
  const image = createImageInput()

  const preserved = preserveSpineGroupedSlotSource('logoSlots', slot, image)

  assert.equal(
    preserved.imageSource?.sourceId,
    'case-logo:developer:additional:left-spine-logo-developer-1',
  )
  assert.equal(preserved.imageSource?.sourceLabel, 'Imported mark')
})

test('spine grouped image slot reset uses shared mark defaults for case marks', () => {
  const slot = withSource(
    createDefaultCaseInsertImageSlot('left-spine-mark-1', 'Rating mark', {
      layout: { scale: 4, x: 12, y: 34, rotation: 45 },
    }),
    'case-rating:ESRB:T',
    'ESRB T',
  )

  assert.deepEqual(
    getSpineGroupedImageSlotResetLayout('left', 'markSlots', slot),
    { scale: 0.78, x: 50, y: 94, rotation: 0 },
  )
})
