import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createProjectImageAssetProvenance,
} from '../project/projectAssetStatus.ts'
import {
  getCaseInsertAdditionalLogoSlotsForKey,
  getCaseInsertPrimaryLogoSlot,
  getCaseInsertPrimaryLogoSourceId,
} from './brandingLogoSlots.ts'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  setJewelCaseSpineMirrored,
} from './jewelCaseTransitions.ts'
import {
  addJewelCaseSpineAdditionalLogoSlot,
  clearJewelCaseSpinePrimaryLogoSlotImage,
  resetJewelCaseSpinePrimaryLogoSlotDefaultLayout,
  setJewelCaseSpinePrimaryLogoSlotEnabled,
  setJewelCaseSpinePrimaryLogoSlotImage,
  updateJewelCaseSpinePrimaryLogoSlotLayoutValue,
} from './jewelCaseSpineLogoActions.ts'

function createLogoImage(sourceLabel = 'developer.png') {
  return {
    imageDataUrl: `data:image/png;base64,${sourceLabel}`,
    imageSize: { width: 512, height: 128 },
    imageSource: createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel,
    }),
  }
}

test('spine primary logo actions apply mirrored edits to both sides', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const updated = updateJewelCaseSpinePrimaryLogoSlotLayoutValue(
    setJewelCaseSpinePrimaryLogoSlotEnabled(
      state,
      'left',
      'developer',
      true,
    ),
    'left',
    'developer',
    'x',
    44,
  )
  const leftLogo = getCaseInsertPrimaryLogoSlot(
    updated.spine.left,
    'developer',
  )
  const rightLogo = getCaseInsertPrimaryLogoSlot(
    updated.spine.right,
    'developer',
  )

  assert.equal(leftLogo?.enabled, true)
  assert.equal(rightLogo?.enabled, true)
  assert.equal(leftLogo?.layout.x, 44)
  assert.equal(rightLogo?.layout.x, 44)
  assert.equal(updated.templates, state.templates)
})

test('spine primary logo actions preserve the opposite side when mirroring is off', () => {
  const state = setJewelCaseSpineMirrored(
    createDefaultProjectJewelCaseState('Portal 2'),
    false,
  )
  const originalRight = state.spine.right
  const updated = setJewelCaseSpinePrimaryLogoSlotImage(
    state,
    'left',
    'publisher',
    createLogoImage('publisher.png'),
  )
  const publisherLogo = getCaseInsertPrimaryLogoSlot(
    updated.spine.left,
    'publisher',
  )

  assert.equal(publisherLogo?.enabled, true)
  assert.equal(publisherLogo?.imageDataUrl, 'data:image/png;base64,publisher.png')
  assert.equal(
    publisherLogo?.imageSource?.sourceId,
    getCaseInsertPrimaryLogoSourceId('publisher'),
  )
  assert.equal(updated.spine.right, originalRight)
})

test('spine primary logo reset and clear preserve enabled state and saved layout', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const withImage = setJewelCaseSpinePrimaryLogoSlotImage(
    state,
    'right',
    'developer',
    createLogoImage(),
  )
  const moved = updateJewelCaseSpinePrimaryLogoSlotLayoutValue(
    withImage,
    'right',
    'developer',
    'x',
    42,
  )
  const cleared = clearJewelCaseSpinePrimaryLogoSlotImage(
    moved,
    'right',
    'developer',
  )
  const reset = resetJewelCaseSpinePrimaryLogoSlotDefaultLayout(
    cleared,
    'right',
    'developer',
  )
  const clearedLogo = getCaseInsertPrimaryLogoSlot(
    cleared.spine.right,
    'developer',
  )
  const resetLogo = getCaseInsertPrimaryLogoSlot(
    reset.spine.right,
    'developer',
  )

  assert.equal(clearedLogo?.enabled, true)
  assert.equal(clearedLogo?.imageDataUrl, null)
  assert.equal(clearedLogo?.layout.x, 42)
  assert.equal(resetLogo?.layout.x, 50)
  assert.equal(resetLogo?.layout.y, 78)
})

test('spine additional logo action keeps side and logo family explicit', () => {
  const state = setJewelCaseSpineMirrored(
    createDefaultProjectJewelCaseState('Portal 2'),
    false,
  )
  const updated = addJewelCaseSpineAdditionalLogoSlot(
    addJewelCaseSpineAdditionalLogoSlot(state, 'left', 'developer'),
    'right',
    'publisher',
  )
  const leftDeveloperLogos = getCaseInsertAdditionalLogoSlotsForKey(
    updated.spine.left,
    'developer',
  )
  const rightPublisherLogos = getCaseInsertAdditionalLogoSlotsForKey(
    updated.spine.right,
    'publisher',
  )

  assert.equal(leftDeveloperLogos.length, 1)
  assert.equal(rightPublisherLogos.length, 1)
  assert.match(leftDeveloperLogos[0]?.id ?? '', /^left-spine-logo-developer-/)
  assert.match(rightPublisherLogos[0]?.id ?? '', /^right-spine-logo-publisher-/)
})
