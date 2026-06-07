import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearCaseInsertPrimaryLogoSlotImage,
  getCaseInsertAdditionalLogoSlots,
  getCaseInsertPrimaryLogoSlot,
  getCaseInsertPrimaryLogoSourceId,
  resetCaseInsertPrimaryLogoSlotLayout,
  setCaseInsertPrimaryLogoSlotEnabled,
  setCaseInsertPrimaryLogoSlotImage,
  updateCaseInsertPrimaryLogoSlotLayoutField,
} from './brandingLogoSlots.ts'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  addCaseInsertTemplateImageSlot,
  updateProjectCaseInsertTemplate,
} from './templateSurfaceTransitions.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import {
  createCaseInsertProjectSnapshot,
  restoreCaseInsertProjectState,
} from '../project/caseInsertProjectAdapters.ts'

test('case insert primary logo slots have stable developer and publisher identities', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    setCaseInsertPrimaryLogoSlotEnabled(cover, 'cover', 'developer', true))
  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    setCaseInsertPrimaryLogoSlotImage(cover, 'cover', 'publisher', {
      imageDataUrl: 'data:image/png;base64,publisher',
      imageSize: { width: 512, height: 128 },
      imageSource: createProjectImageAssetProvenance({
        source: 'official-logo-candidate',
        sourceId: 'official-candidate-id',
        sourceLabel: 'Official publisher candidate',
        sourceUrl: 'https://example.test/publisher-logo.png',
      }),
    }))

  const cover = state.templates.cover
  const developerLogo = getCaseInsertPrimaryLogoSlot(cover, 'developer')
  const publisherLogo = getCaseInsertPrimaryLogoSlot(cover, 'publisher')

  assert.equal(developerLogo?.enabled, true)
  assert.equal(developerLogo?.label, 'Developer logo')
  assert.equal(developerLogo?.layout.x, 20)
  assert.equal(publisherLogo?.enabled, true)
  assert.equal(publisherLogo?.label, 'Publisher logo')
  assert.equal(
    publisherLogo?.imageSource?.source,
    'official-logo-candidate',
  )
  assert.equal(
    publisherLogo?.imageSource?.sourceId,
    getCaseInsertPrimaryLogoSourceId('publisher'),
  )
  assert.equal(
    publisherLogo?.imageSource?.sourceUrl,
    'https://example.test/publisher-logo.png',
  )
})

test('case insert primary logo helpers preserve primary slots apart from additional logos', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) =>
    setCaseInsertPrimaryLogoSlotImage(tray, 'tray', 'developer', {
      imageDataUrl: 'data:image/png;base64,developer',
      imageSize: { width: 512, height: 128 },
      imageSource: createProjectImageAssetProvenance({
        source: 'steam-logo-candidate',
        sourceId: 'steam-candidate-id',
        sourceLabel: 'Steam developer candidate',
      }),
    }))
  state = addCaseInsertTemplateImageSlot(state, 'tray', 'logoSlots')

  const tray = state.templates.tray
  const additionalLogos = getCaseInsertAdditionalLogoSlots(tray)

  assert.equal(getCaseInsertPrimaryLogoSlot(tray, 'developer')?.label, 'Developer logo')
  assert.equal(additionalLogos.length, 1)
  assert.equal(additionalLogos[0]?.label, 'Logo 2')
})

test('case insert primary logo reset and clear preserve enabled state and saved layout', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    setCaseInsertPrimaryLogoSlotImage(cover, 'cover', 'developer', {
      imageDataUrl: 'data:image/png;base64,developer',
      imageSize: { width: 512, height: 128 },
      imageSource: createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: 'developer.png',
      }),
    }))
  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    updateCaseInsertPrimaryLogoSlotLayoutField(
      cover,
      'cover',
      'developer',
      'x',
      44,
    ))
  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    clearCaseInsertPrimaryLogoSlotImage(cover, 'cover', 'developer'))

  let developerLogo = getCaseInsertPrimaryLogoSlot(
    state.templates.cover,
    'developer',
  )

  assert.equal(developerLogo?.enabled, true)
  assert.equal(developerLogo?.imageDataUrl, null)
  assert.equal(developerLogo?.layout.x, 44)

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    resetCaseInsertPrimaryLogoSlotLayout(cover, 'cover', 'developer'))
  developerLogo = getCaseInsertPrimaryLogoSlot(
    state.templates.cover,
    'developer',
  )

  assert.equal(developerLogo?.enabled, true)
  assert.equal(developerLogo?.layout.x, 20)
  assert.equal(developerLogo?.layout.y, 84)
})

test('case insert primary logo candidate routing survives save and load', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) =>
    setCaseInsertPrimaryLogoSlotImage(tray, 'tray', 'developer', {
      imageDataUrl: 'data:image/png;base64,developer-candidate',
      imageSize: { width: 512, height: 128 },
      imageSource: createProjectImageAssetProvenance({
        source: 'steam-logo-candidate',
        sourceId: 'steam-candidate-id',
        sourceLabel: 'Steam developer candidate',
        sourceUrl: 'https://cdn.example.test/developer-logo.png',
      }),
    }))

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    selectedSteamGame: null,
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert
  const developerLogo = getCaseInsertPrimaryLogoSlot(
    restored.templates.tray,
    'developer',
  )

  assert.equal(developerLogo?.imageDataUrl, 'data:image/png;base64,developer-candidate')
  assert.deepEqual(developerLogo?.imageSize, { width: 512, height: 128 })
  assert.equal(developerLogo?.imageSource?.source, 'steam-logo-candidate')
  assert.equal(
    developerLogo?.imageSource?.sourceId,
    getCaseInsertPrimaryLogoSourceId('developer'),
  )
  assert.equal(
    developerLogo?.imageSource?.sourceUrl,
    'https://cdn.example.test/developer-logo.png',
  )
})
