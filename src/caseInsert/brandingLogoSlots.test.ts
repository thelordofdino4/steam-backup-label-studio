import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addCaseInsertAdditionalLogoSlot,
  clearCaseInsertPrimaryLogoSlotImage,
  clearCaseInsertAdditionalLogoSlotImage,
  createCaseInsertLogoFallbackProvenance,
  getCaseInsertAdditionalLogoSlotsForKey,
  getCaseInsertAdditionalLogoSlots,
  getCaseInsertLogoSlotRenderInfo,
  getCaseInsertPrimaryLogoSlot,
  getCaseInsertPrimaryLogoSourceId,
  getCaseInsertUnassignedAdditionalLogoSlots,
  resetCaseInsertPrimaryLogoSlotLayout,
  setCaseInsertPrimaryLogoSlotEnabled,
  setCaseInsertPrimaryLogoSlotImage,
  updateCaseInsertPrimaryLogoSlotLayoutField,
  withCaseInsertAdditionalLogoImageSource,
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
  assert.equal(developerLogo?.layout.x, 50)
  assert.equal(developerLogo?.layout.y, 92)
  assert.equal(publisherLogo?.enabled, true)
  assert.equal(publisherLogo?.label, 'Publisher logo')
  assert.equal(publisherLogo?.layout.x, 84)
  assert.equal(publisherLogo?.layout.y, 92)
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
  assert.equal(developerLogo?.layout.x, 50)
  assert.equal(developerLogo?.layout.y, 92)
})

test('case insert logo slots preserve selected images while disabled', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) =>
    setCaseInsertPrimaryLogoSlotImage(tray, 'tray', 'developer', {
      imageDataUrl: 'data:image/png;base64,developer',
      imageSize: { width: 512, height: 128 },
      imageSource: createProjectImageAssetProvenance({
        source: 'uploaded',
        sourceLabel: 'developer.png',
      }),
    }))
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) =>
    setCaseInsertPrimaryLogoSlotEnabled(tray, 'tray', 'developer', false))

  let developerLogo = getCaseInsertPrimaryLogoSlot(
    state.templates.tray,
    'developer',
  )

  assert.equal(developerLogo?.imageDataUrl, 'data:image/png;base64,developer')
  assert.equal(getCaseInsertLogoSlotRenderInfo(developerLogo!), null)

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) =>
    setCaseInsertPrimaryLogoSlotEnabled(tray, 'tray', 'developer', true))
  developerLogo = getCaseInsertPrimaryLogoSlot(
    state.templates.tray,
    'developer',
  )

  assert.equal(
    getCaseInsertLogoSlotRenderInfo(developerLogo!)?.imageDataUrl,
    'data:image/png;base64,developer',
  )
})

test('case insert logo render info uses built-in default artwork for enabled empty logo slots', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    setCaseInsertPrimaryLogoSlotEnabled(cover, 'cover', 'developer', true))
  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    setCaseInsertPrimaryLogoSlotEnabled(cover, 'cover', 'publisher', true))
  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    addCaseInsertAdditionalLogoSlot(cover, 'cover', 'developer'))

  const developerLogo = getCaseInsertPrimaryLogoSlot(
    state.templates.cover,
    'developer',
  )
  const publisherLogo = getCaseInsertPrimaryLogoSlot(
    state.templates.cover,
    'publisher',
  )
  const additionalDeveloperLogo =
    getCaseInsertAdditionalLogoSlotsForKey(
      state.templates.cover,
      'developer',
    )[0]

  assert.ok(developerLogo)
  assert.ok(publisherLogo)
  assert.ok(additionalDeveloperLogo)

  const developerRenderInfo = getCaseInsertLogoSlotRenderInfo(developerLogo)
  const publisherRenderInfo = getCaseInsertLogoSlotRenderInfo(publisherLogo)
  const additionalRenderInfo =
    getCaseInsertLogoSlotRenderInfo(additionalDeveloperLogo)

  assert.equal(developerRenderInfo?.isBundledFallback, true)
  assert.equal(developerRenderInfo?.logoKey, 'developer')
  assert.equal(developerRenderInfo?.imageSize.width, 480)
  assert.equal(publisherRenderInfo?.isBundledFallback, true)
  assert.equal(publisherRenderInfo?.logoKey, 'publisher')
  assert.equal(additionalRenderInfo?.isBundledFallback, true)
  assert.equal(additionalRenderInfo?.logoKey, 'developer')
  assert.deepEqual(
    createCaseInsertLogoFallbackProvenance('developer'),
    {
      source: 'placeholder',
      sourceId: 'case-logo:developer',
      sourceLabel: 'Developer logo',
      sourceUrl: null,
    },
  )
})

test('case insert additional logos are grouped by developer or publisher without losing legacy slots', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) =>
    addCaseInsertAdditionalLogoSlot(tray, 'tray', 'developer'))
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) =>
    addCaseInsertAdditionalLogoSlot(tray, 'tray', 'publisher'))
  state = addCaseInsertTemplateImageSlot(state, 'tray', 'logoSlots')

  const tray = state.templates.tray

  assert.equal(getCaseInsertAdditionalLogoSlots(tray).length, 3)
  assert.equal(getCaseInsertAdditionalLogoSlotsForKey(tray, 'developer').length, 1)
  assert.equal(getCaseInsertAdditionalLogoSlotsForKey(tray, 'publisher').length, 1)
  assert.equal(getCaseInsertUnassignedAdditionalLogoSlots(tray).length, 1)
})

test('case insert additional logo upload and clear preserve developer/publisher grouping', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) =>
    addCaseInsertAdditionalLogoSlot(cover, 'cover', 'publisher'))

  let additionalLogo = getCaseInsertAdditionalLogoSlotsForKey(
    state.templates.cover,
    'publisher',
  )[0]

  assert.ok(additionalLogo)

  const image = withCaseInsertAdditionalLogoImageSource(additionalLogo, {
    imageDataUrl: 'data:image/png;base64,publisher-extra',
    imageSize: { width: 400, height: 120 },
    imageSource: createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel: 'publisher-extra.png',
    }),
  })

  assert.equal(image.imageSource?.sourceId, additionalLogo.imageSource?.sourceId)

  additionalLogo = clearCaseInsertAdditionalLogoSlotImage({
    ...additionalLogo,
    imageDataUrl: image.imageDataUrl,
    imageSize: image.imageSize,
    imageSource: createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceId: image.imageSource?.sourceId,
      sourceLabel: 'publisher-extra.png',
    }),
  })

  assert.equal(additionalLogo.imageDataUrl, null)
  assert.equal(additionalLogo.imageSource?.sourceId, image.imageSource?.sourceId)
  assert.equal(
    getCaseInsertAdditionalLogoSlotsForKey(
      { logoSlots: [additionalLogo] },
      'publisher',
    ).length,
    1,
  )
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
