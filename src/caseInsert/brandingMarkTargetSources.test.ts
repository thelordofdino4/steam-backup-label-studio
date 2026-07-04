import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectMetadata,
} from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import {
  createDefaultProjectTechnicalMarks,
  getProjectTechnicalMarkAsset,
  setTechnicalMarkCustomImage,
  updateTechnicalMarkToggle,
} from '../project/projectTechnicalMarks.ts'
import {
  createAdditionalTechnicalAsset,
  createBrandingSources,
  createMarkSlot,
  selectedDiscTemplate,
} from './brandingMarkTargetSourcesFixtures.ts'
import {
  getCaseInsertTargetBrandingSources,
  getCaseInsertTargetMediaMark,
  getCaseInsertTargetPlatformMarkSyncRequest,
  getCaseInsertTargetPlatformMarks,
  getCaseInsertTargetRatingBadge,
  getCaseInsertTargetTechnicalMarkLayoutSyncRequest,
  getCaseInsertTargetTechnicalMarks,
  getCaseInsertTargetTechnicalMarkToggleSyncRequest,
  getTechnicalMarksAfterCaseInsertTargetUpload,
} from './brandingMarkTargetSources.ts'

test('case insert target source projection derives rating and media enabled state from slots', () => {
  const sources = createBrandingSources({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'T',
    },
  })
  const targetState = {
    markSlots: [
      createMarkSlot('case-rating:ESRB:T'),
      createMarkSlot('case-media:dataDisc:light'),
    ],
  }

  assert.equal(
    getCaseInsertTargetRatingBadge(targetState, sources).layout.enabled,
    true,
  )
  assert.equal(
    getCaseInsertTargetMediaMark(targetState, sources).layout.enabled,
    true,
  )
})

test('case insert target source projection preserves platform values and per-slot enabled state', () => {
  let platformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
    selectedDiscTemplate,
  )
  platformMarks = updatePlatformMarkToggle(
    platformMarks,
    'linux',
    true,
    selectedDiscTemplate,
  )
  const sources = createBrandingSources({
    projectPlatformMarks: platformMarks,
  })
  const projected = getCaseInsertTargetPlatformMarks(
    {
      markSlots: [
        createMarkSlot('case-platform:windows:windows11'),
        createMarkSlot('case-platform:linux:dark', false),
      ],
    },
    sources,
    selectedDiscTemplate,
  )

  assert.deepEqual(projected.values, ['windows', 'linux'])
  assert.equal(projected.assets.windows?.layout.enabled, true)
  assert.equal(projected.assets.linux?.layout.enabled, false)
  assert.equal(platformMarks.assets.linux?.layout.enabled, true)
})

test('case insert platform target sync request keeps shared and target state explicit', () => {
  const sharedPlatformMarks = createDefaultProjectPlatformMarks()
  const targetPlatformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
    selectedDiscTemplate,
  )

  const syncRequest = getCaseInsertTargetPlatformMarkSyncRequest(
    targetPlatformMarks,
    sharedPlatformMarks,
    'windows',
    true,
  )

  assert.equal(syncRequest.projectPlatformMarks, targetPlatformMarks)
  assert.equal(syncRequest.value, 'windows')
  assert.equal(syncRequest.sourcePrefix, 'case-platform:windows:')
  assert.equal(syncRequest.enabled, true)
  assert.equal(syncRequest.shouldEnableSharedValue, true)
})

test('case insert platform target sync request does not promote existing shared values', () => {
  const sharedPlatformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
    selectedDiscTemplate,
  )
  const targetPlatformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    false,
    selectedDiscTemplate,
  )

  const syncRequest = getCaseInsertTargetPlatformMarkSyncRequest(
    targetPlatformMarks,
    sharedPlatformMarks,
    'windows',
    false,
  )

  assert.equal(syncRequest.sourcePrefix, 'case-platform:windows:')
  assert.equal(syncRequest.enabled, false)
  assert.equal(syncRequest.shouldEnableSharedValue, false)
})

test('case insert target source projection separates technical primary and additional assets', () => {
  const primary = getProjectTechnicalMarkAsset(
    createDefaultProjectTechnicalMarks(),
    'audio',
    selectedDiscTemplate,
  )
  const technicalMarks = {
    ...updateTechnicalMarkToggle(
      createDefaultProjectTechnicalMarks(),
      'audio',
      true,
      selectedDiscTemplate,
    ),
    assets: {
      audio: primary,
    },
    additionalAssets: {
      audio: [
        createAdditionalTechnicalAsset('audio', 'dolby'),
        createAdditionalTechnicalAsset('audio', 'dts'),
      ],
    },
  }
  const projected = getCaseInsertTargetTechnicalMarks(
    {
      markSlots: [
        createMarkSlot('case-technical:audio:primary', false),
        createMarkSlot('case-technical:audio:dolby'),
        createMarkSlot('case-technical:audio:dts', false),
      ],
    },
    createBrandingSources({ projectTechnicalMarks: technicalMarks }),
    selectedDiscTemplate,
  )

  assert.deepEqual(projected.values, ['audio'])
  assert.equal(projected.assets.audio?.layout.enabled, false)
  assert.equal(projected.additionalAssets?.audio?.[0]?.layout.enabled, true)
  assert.equal(projected.additionalAssets?.audio?.[1]?.layout.enabled, false)
})

test('case insert technical target toggle sync request keeps family identity explicit', () => {
  const sharedTechnicalMarks = createDefaultProjectTechnicalMarks()
  const targetTechnicalMarks = updateTechnicalMarkToggle(
    createDefaultProjectTechnicalMarks(),
    'audio',
    true,
    selectedDiscTemplate,
  )

  const syncRequest = getCaseInsertTargetTechnicalMarkToggleSyncRequest(
    targetTechnicalMarks,
    sharedTechnicalMarks,
    'audio',
    true,
  )

  assert.equal(syncRequest.projectTechnicalMarks, targetTechnicalMarks)
  assert.equal(syncRequest.value, 'audio')
  assert.equal(syncRequest.sourcePrefix, 'case-technical:audio')
  assert.equal(syncRequest.enabled, true)
  assert.equal(syncRequest.shouldEnableSharedValue, true)
  assert.equal(syncRequest.shouldSyncSharedLayout, false)
  assert.equal(syncRequest.assetId, null)
})

test('case insert technical primary layout sync request keeps primary identity explicit', () => {
  const sharedTechnicalMarks = createDefaultProjectTechnicalMarks()
  const targetTechnicalMarks = updateTechnicalMarkToggle(
    createDefaultProjectTechnicalMarks(),
    'audio',
    true,
    selectedDiscTemplate,
  )

  const syncRequest = getCaseInsertTargetTechnicalMarkLayoutSyncRequest(
    targetTechnicalMarks,
    sharedTechnicalMarks,
    'audio',
    true,
  )

  assert.equal(syncRequest.projectTechnicalMarks, targetTechnicalMarks)
  assert.equal(syncRequest.sourcePrefix, 'case-technical:audio:primary')
  assert.equal(syncRequest.enabled, true)
  assert.equal(syncRequest.shouldEnableSharedValue, true)
  assert.equal(syncRequest.shouldSyncSharedLayout, false)
  assert.equal(syncRequest.assetId, null)
})

test('case insert technical additional layout sync request keeps asset identity explicit', () => {
  const sharedTechnicalMarks = updateTechnicalMarkToggle(
    createDefaultProjectTechnicalMarks(),
    'audio',
    true,
    selectedDiscTemplate,
  )
  const targetTechnicalMarks = {
    ...sharedTechnicalMarks,
    additionalAssets: {
      audio: [createAdditionalTechnicalAsset('audio', 'dolby')],
    },
  }

  const syncRequest = getCaseInsertTargetTechnicalMarkLayoutSyncRequest(
    targetTechnicalMarks,
    sharedTechnicalMarks,
    'audio',
    false,
    'dolby',
  )

  assert.equal(syncRequest.projectTechnicalMarks, targetTechnicalMarks)
  assert.equal(syncRequest.sourcePrefix, 'case-technical:audio:dolby')
  assert.equal(syncRequest.enabled, false)
  assert.equal(syncRequest.shouldEnableSharedValue, false)
  assert.equal(syncRequest.shouldSyncSharedLayout, true)
  assert.equal(syncRequest.assetId, 'dolby')
})

test('case insert target source projection assembles the target branding source catalog', () => {
  const platformMarks = updatePlatformMarkToggle(
    createDefaultProjectPlatformMarks(),
    'windows',
    true,
    selectedDiscTemplate,
  )
  const technicalMarks = updateTechnicalMarkToggle(
    createDefaultProjectTechnicalMarks(),
    'audio',
    true,
    selectedDiscTemplate,
  )
  const sources = createBrandingSources({
    projectMetadata: {
      ...createDefaultProjectMetadata(),
      ratingSystem: 'ESRB',
      ratingValue: 'T',
    },
    projectPlatformMarks: platformMarks,
    projectTechnicalMarks: technicalMarks,
  })
  const projected = getCaseInsertTargetBrandingSources(
    {
      markSlots: [
        createMarkSlot('case-rating:ESRB:T'),
        createMarkSlot('case-media:dataDisc:light'),
        createMarkSlot('case-platform:windows:windows11', false),
        createMarkSlot('case-technical:audio:primary'),
      ],
    },
    sources,
    selectedDiscTemplate,
  )

  assert.equal(projected.projectMetadata, sources.projectMetadata)
  assert.equal(projected.projectLogoAssets, sources.projectLogoAssets)
  assert.equal(projected.projectRatingBadge.layout.enabled, true)
  assert.equal(projected.projectMediaMark.layout.enabled, true)
  assert.equal(projected.projectPlatformMarks.assets.windows?.layout.enabled, false)
  assert.equal(projected.projectTechnicalMarks.assets.audio?.layout.enabled, true)
  assert.equal(sources.projectPlatformMarks.assets.windows?.layout.enabled, true)
})

test('case insert target upload projection merges uploaded technical primary and additional assets', () => {
  const targetTechnicalMarks = updateTechnicalMarkToggle(
    createDefaultProjectTechnicalMarks(),
    'audio',
    true,
    selectedDiscTemplate,
  )
  const uploadedPrimary = setTechnicalMarkCustomImage(
    createDefaultProjectTechnicalMarks(),
    'audio',
    'data:image/png;base64,uploaded-primary',
    { width: 128, height: 64 },
    selectedDiscTemplate,
  )
  const projectedPrimary = getTechnicalMarksAfterCaseInsertTargetUpload(
    targetTechnicalMarks,
    uploadedPrimary,
    selectedDiscTemplate,
    'audio',
  )

  assert.equal(projectedPrimary.values.includes('audio'), true)
  assert.equal(
    projectedPrimary.assets.audio?.customImageDataUrl,
    'data:image/png;base64,uploaded-primary',
  )

  const uploadedAdditional = setTechnicalMarkCustomImage(
    createDefaultProjectTechnicalMarks(),
    'audio',
    'data:image/png;base64,uploaded-additional',
    { width: 64, height: 64 },
    selectedDiscTemplate,
    'dolby',
  )
  const projectedAdditional = getTechnicalMarksAfterCaseInsertTargetUpload(
    targetTechnicalMarks,
    uploadedAdditional,
    selectedDiscTemplate,
    'audio',
    'dolby',
  )

  assert.equal(projectedAdditional.values.includes('audio'), true)
  assert.equal(projectedAdditional.additionalAssets?.audio?.[0]?.id, 'dolby')
  assert.equal(
    projectedAdditional.additionalAssets?.audio?.[0]?.customImageDataUrl,
    'data:image/png;base64,uploaded-additional',
  )
})
