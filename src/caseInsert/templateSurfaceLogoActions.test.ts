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
  addCaseInsertTemplateAdditionalLogoSlot,
  clearCaseInsertTemplatePrimaryLogoSlotImage,
  resetCaseInsertTemplatePrimaryLogoSlotDefaultLayout,
  setCaseInsertTemplatePrimaryLogoSlotEnabled,
  setCaseInsertTemplatePrimaryLogoSlotImage,
  updateCaseInsertTemplatePrimaryLogoSlotLayoutValue,
} from './templateSurfaceLogoActions.ts'

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

test('template primary logo actions update only the targeted cover or tray pane', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const originalTray = state.templates.tray
  const updated = updateCaseInsertTemplatePrimaryLogoSlotLayoutValue(
    setCaseInsertTemplatePrimaryLogoSlotEnabled(
      state,
      'cover',
      'developer',
      true,
    ),
    'cover',
    'developer',
    'x',
    44,
  )
  const developerLogo = getCaseInsertPrimaryLogoSlot(
    updated.templates.cover,
    'developer',
  )

  assert.equal(developerLogo?.enabled, true)
  assert.equal(developerLogo?.layout.x, 44)
  assert.equal(updated.templates.tray, originalTray)
})

test('template primary logo image action preserves primary logo provenance', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const updated = setCaseInsertTemplatePrimaryLogoSlotImage(
    state,
    'tray',
    'publisher',
    createLogoImage('publisher.png'),
  )
  const publisherLogo = getCaseInsertPrimaryLogoSlot(
    updated.templates.tray,
    'publisher',
  )

  assert.equal(publisherLogo?.enabled, true)
  assert.equal(publisherLogo?.imageDataUrl, 'data:image/png;base64,publisher.png')
  assert.equal(
    publisherLogo?.imageSource?.sourceId,
    getCaseInsertPrimaryLogoSourceId('publisher'),
  )
  assert.equal(publisherLogo?.imageSource?.sourceLabel, 'publisher.png')
})

test('template primary logo reset and clear preserve enabled state and saved layout', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const withImage = setCaseInsertTemplatePrimaryLogoSlotImage(
    state,
    'cover',
    'developer',
    createLogoImage(),
  )
  const moved = updateCaseInsertTemplatePrimaryLogoSlotLayoutValue(
    withImage,
    'cover',
    'developer',
    'x',
    42,
  )
  const cleared = clearCaseInsertTemplatePrimaryLogoSlotImage(
    moved,
    'cover',
    'developer',
  )
  const reset = resetCaseInsertTemplatePrimaryLogoSlotDefaultLayout(
    cleared,
    'cover',
    'developer',
  )
  const clearedLogo = getCaseInsertPrimaryLogoSlot(
    cleared.templates.cover,
    'developer',
  )
  const resetLogo = getCaseInsertPrimaryLogoSlot(
    reset.templates.cover,
    'developer',
  )

  assert.equal(clearedLogo?.enabled, true)
  assert.equal(clearedLogo?.imageDataUrl, null)
  assert.equal(clearedLogo?.layout.x, 42)
  assert.equal(resetLogo?.layout.x, 50)
  assert.equal(resetLogo?.layout.y, 92)
})

test('template additional logo action keeps developer and publisher groups explicit', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  state = addCaseInsertTemplateAdditionalLogoSlot(state, 'tray', 'developer')
  state = addCaseInsertTemplateAdditionalLogoSlot(state, 'tray', 'publisher')

  const developerLogos = getCaseInsertAdditionalLogoSlotsForKey(
    state.templates.tray,
    'developer',
  )
  const publisherLogos = getCaseInsertAdditionalLogoSlotsForKey(
    state.templates.tray,
    'publisher',
  )

  assert.equal(developerLogos.length, 1)
  assert.equal(publisherLogos.length, 1)
  assert.match(developerLogos[0]?.id ?? '', /^tray-logo-developer-/)
  assert.match(publisherLogos[0]?.id ?? '', /^tray-logo-publisher-/)
})
