import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultProjectDiscNumberArtwork } from '../discText/discNumberArtwork.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import {
  DISC_ROLE_PRESET_IDS,
  getDiscRolePresetUpdatePlan,
  type DiscRolePresetFeatureOwner,
} from '../layout/discRolePresets.ts'
import { createDefaultDiscTextValueSources } from '../project/metadataDiscText.ts'
import { createDefaultProjectAdditionalArtwork } from '../project/projectAdditionalArtwork.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarkAsset,
  createDefaultProjectPlatformMarks,
} from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarkAsset,
  createDefaultProjectTechnicalMarks,
} from '../project/projectTechnicalMarks.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  applyDiscRolePresetToOwners,
  type DiscRolePresetCurrentState,
  type DiscRolePresetOwnerActions,
} from './appDiscRolePresetApplication.ts'

type CallRecord = {
  name: string
  value?: unknown
}

const adapterSource = readFileSync(
  'src/app/appDiscRolePresetApplication.ts',
  'utf8',
)

const expectedOwnersByPreset = {
  'classic-top-title': [
    'backgroundImage',
    'titleArtwork',
    'discText',
    'ratingBadge',
    'mediaMark',
    'logoAssets',
  ],
  'centered-logo-archive': [
    'backgroundImage',
    'titleArtwork',
    'discText',
    'ratingBadge',
    'mediaMark',
    'logoAssets',
  ],
  'clean-metadata-footer': [
    'backgroundImage',
    'titleArtwork',
    'discText',
    'platformMarks',
    'technicalMarks',
    'logoAssets',
  ],
} as const satisfies Record<
  (typeof DISC_ROLE_PRESET_IDS)[number],
  readonly DiscRolePresetFeatureOwner[]
>

const expectedCallsByPreset = {
  'classic-top-title': [
    'restoreBackgroundImageState',
    'setProjectTitleArtwork',
    'clampProjectTitleArtworkToTemplate',
    'restoreDiscTextState',
    'clampDiscTextLayoutToTemplate',
    'setProjectRatingBadge',
    'clampProjectRatingBadgeToTemplate',
    'setProjectMediaMark',
    'clampProjectMediaMarkToTemplate',
    'setProjectLogoAssets',
    'clampProjectLogoAssetsToTemplate',
  ],
  'centered-logo-archive': [
    'restoreBackgroundImageState',
    'setProjectTitleArtwork',
    'clampProjectTitleArtworkToTemplate',
    'restoreDiscTextState',
    'clampDiscTextLayoutToTemplate',
    'setProjectRatingBadge',
    'clampProjectRatingBadgeToTemplate',
    'setProjectMediaMark',
    'clampProjectMediaMarkToTemplate',
    'setProjectLogoAssets',
    'clampProjectLogoAssetsToTemplate',
  ],
  'clean-metadata-footer': [
    'restoreBackgroundImageState',
    'setProjectTitleArtwork',
    'clampProjectTitleArtworkToTemplate',
    'restoreDiscTextState',
    'clampDiscTextLayoutToTemplate',
    'setProjectPlatformMarks',
    'clampProjectPlatformMarksToTemplate',
    'setProjectTechnicalMarks',
    'clampProjectTechnicalMarksToTemplate',
    'setProjectLogoAssets',
    'clampProjectLogoAssetsToTemplate',
  ],
} as const

function createCurrentState(): DiscRolePresetCurrentState {
  const template = discTemplates.standardPrintableDisc
  const logoAssets = createDefaultProjectLogoAssets(template)
  const platformMarks = createDefaultProjectPlatformMarks()
  const technicalMarks = createDefaultProjectTechnicalMarks()

  return {
    background: {
      enabled: false,
      scale: 1.7,
      offset: { x: 12, y: -8 },
      imageDataUrl: 'data:image/png;base64,background',
      imageSource: {
        source: 'uploaded',
        sourceId: 'background-id',
        sourceLabel: 'background.png',
      },
      imageSize: { width: 1920, height: 1080 },
    },
    titleArtwork: {
      ...createDefaultProjectTitleArtwork(template, 'top'),
      source: 'custom',
      sourceLabel: 'title.png',
      imageDataUrl: 'data:image/png;base64,title',
      imageSize: { width: 900, height: 300 },
      layout: { enabled: false, scale: 1.8, x: 17, y: 23 },
    },
    projectDiscNumberArtwork: createDefaultProjectDiscNumberArtwork(),
    discTextSettings: {
      ...DEFAULT_DISC_TEXT_SETTINGS,
      title: false,
      copyright: false,
    },
    discTextValues: {
      ...createDefaultDiscTextValues(220),
      customNote: 'Keep this note.',
    },
    discTextValueSources: createDefaultDiscTextValueSources(),
    discTextTitleValue: 'Keep this title.',
    discTextHtmlSources: {
      customNote: '<strong>Keep this HTML.</strong>',
    },
    discTextLayout: createDefaultDiscTextLayout('top', template),
    discTextStyles: createDefaultDiscTextStyles(),
    logoAssets: {
      ...logoAssets,
      developerLogoDataUrl: 'data:image/png;base64,developer',
      developerLogoSource: {
        source: 'uploaded',
        sourceId: 'developer-id',
        sourceLabel: 'developer.png',
      },
      developerLogoSize: { width: 400, height: 100 },
      publisherLogoDataUrl: 'data:image/png;base64,publisher',
      publisherLogoSource: {
        source: 'official-logo-candidate',
        sourceId: 'publisher-id',
        sourceLabel: 'publisher.png',
      },
      publisherLogoSize: { width: 360, height: 90 },
      additionalDeveloperLogos: [
        {
          id: 'additional-developer',
          label: 'Additional developer',
          imageDataUrl: 'data:image/png;base64,additional-developer',
          imageSource: {
            source: 'uploaded',
            sourceId: 'additional-developer-id',
            sourceLabel: 'additional-developer.png',
          },
          imageSize: { width: 200, height: 80 },
          layout: { enabled: false, scale: 0.6, x: 15, y: 85 },
        },
      ],
      additionalPublisherLogos: [
        {
          id: 'additional-publisher',
          label: 'Additional publisher',
          imageDataUrl: 'data:image/png;base64,additional-publisher',
          imageSource: {
            source: 'uploaded',
            sourceId: 'additional-publisher-id',
            sourceLabel: 'additional-publisher.png',
          },
          imageSize: { width: 200, height: 80 },
          layout: { enabled: false, scale: 0.6, x: 85, y: 85 },
        },
      ],
    },
    ratingBadge: {
      ...createDefaultProjectRatingBadge(template),
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,rating',
      customImageSize: { width: 180, height: 260 },
    },
    mediaMark: {
      ...createDefaultProjectMediaMark(template),
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,media',
      customImageSize: { width: 220, height: 120 },
    },
    platformMarks: {
      ...platformMarks,
      values: ['windows'],
      assets: {
        windows: {
          ...createDefaultProjectPlatformMarkAsset('windows', template),
          source: 'custom',
          customImageDataUrl: 'data:image/png;base64,windows',
          customImageSize: { width: 120, height: 120 },
        },
      },
    },
    technicalMarks: {
      ...technicalMarks,
      values: ['audio'],
      assets: {
        audio: {
          ...createDefaultProjectTechnicalMarkAsset('audio', template),
          source: 'custom',
          customImageDataUrl: 'data:image/png;base64,audio',
          customImageSize: { width: 120, height: 120 },
        },
      },
      additionalAssets: {
        audio: [
          {
            id: 'additional-audio',
            label: 'Additional audio mark',
            source: 'custom',
            customImageDataUrl: 'data:image/png;base64,additional-audio',
            customImageSize: { width: 80, height: 80 },
            layout: { enabled: false, scale: 0.5, x: 10, y: 10 },
          },
        ],
      },
    },
    additionalArtwork: {
      ...createDefaultProjectAdditionalArtwork(),
      enabled: false,
      elements: [
        {
          id: 'additional-artwork',
          label: 'Untouched artwork',
          source: 'custom',
          sourceId: 'additional-artwork-id',
          sourceLabel: 'additional-artwork.png',
          imageDataUrl: 'data:image/png;base64,additional-artwork',
          imageSize: { width: 320, height: 180 },
          layout: { enabled: false, scale: 0.8, x: 30, y: 40 },
          frame: {
            enabled: true,
            color: '#ffffff',
            width: 1,
            shape: 'rectangle',
            style: 'solid',
            lumpiness: 0,
            jaggedness: 0,
            roughnessOffset: 0,
          },
        },
      ],
    },
    metadata: {
      ...createDefaultProjectMetadata(),
      title: 'Half-Life 2',
      ratingSystem: 'ESRB',
      ratingValue: 'T',
    },
  }
}

function recordValueCall(calls: CallRecord[], name: string) {
  return (value: unknown) => calls.push({ name, value })
}

function createActions(calls: CallRecord[]): DiscRolePresetOwnerActions {
  return {
    restoreBackgroundImageState:
      recordValueCall(calls, 'restoreBackgroundImageState'),
    setProjectTitleArtwork: recordValueCall(calls, 'setProjectTitleArtwork'),
    clampProjectTitleArtworkToTemplate:
      recordValueCall(calls, 'clampProjectTitleArtworkToTemplate'),
    restoreDiscTextState: recordValueCall(calls, 'restoreDiscTextState'),
    clampDiscTextLayoutToTemplate:
      recordValueCall(calls, 'clampDiscTextLayoutToTemplate'),
    setProjectLogoAssets: recordValueCall(calls, 'setProjectLogoAssets'),
    clampProjectLogoAssetsToTemplate:
      recordValueCall(calls, 'clampProjectLogoAssetsToTemplate'),
    setProjectRatingBadge: recordValueCall(calls, 'setProjectRatingBadge'),
    clampProjectRatingBadgeToTemplate:
      recordValueCall(calls, 'clampProjectRatingBadgeToTemplate'),
    setProjectMediaMark: recordValueCall(calls, 'setProjectMediaMark'),
    clampProjectMediaMarkToTemplate:
      recordValueCall(calls, 'clampProjectMediaMarkToTemplate'),
    setProjectPlatformMarks: recordValueCall(calls, 'setProjectPlatformMarks'),
    clampProjectPlatformMarksToTemplate:
      recordValueCall(calls, 'clampProjectPlatformMarksToTemplate'),
    setProjectTechnicalMarks:
      recordValueCall(calls, 'setProjectTechnicalMarks'),
    clampProjectTechnicalMarksToTemplate:
      recordValueCall(calls, 'clampProjectTechnicalMarksToTemplate'),
  }
}

function getCallValue<T>(calls: CallRecord[], name: string): T {
  const call = calls.find((candidate) => candidate.name === name)

  assert.ok(call, `Expected ${name} to be called.`)
  return call.value as T
}

test('known disc role presets dispatch only their owner plans in deterministic order', () => {
  for (const presetId of DISC_ROLE_PRESET_IDS) {
    const calls: CallRecord[] = []
    const result = applyDiscRolePresetToOwners({
      presetId,
      currentState: createCurrentState(),
      selectedDiscTemplate: discTemplates.standardPrintableDisc,
      actions: createActions(calls),
    })

    assert.equal(result.applied, true)
    assert.equal(result.preset?.id, presetId)
    assert.deepEqual(
      result.dispatchedOwners,
      expectedOwnersByPreset[presetId],
    )
    assert.deepEqual(
      result.dispatchedOwners,
      getDiscRolePresetUpdatePlan(presetId).map(({ owner }) => owner),
    )
    assert.deepEqual(
      calls.map(({ name }) => name),
      expectedCallsByPreset[presetId],
    )
    assert.deepEqual(Object.keys(result).sort(), [
      'applied',
      'dispatchedOwners',
      'preset',
      'state',
    ])
  }
})

test('unknown disc role preset ids return failure before owner dispatch', () => {
  const calls: CallRecord[] = []
  const currentState = createCurrentState()
  const result = applyDiscRolePresetToOwners({
    presetId: 'missing-preset',
    currentState,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    actions: createActions(calls),
  })

  assert.deepEqual(result, {
    applied: false,
    preset: null,
    state: currentState,
    dispatchedOwners: [],
  })
  assert.deepEqual(calls, [])
})

test('adapter preserves background title text logo rating and media payloads', () => {
  const calls: CallRecord[] = []
  const currentState = createCurrentState()
  const result = applyDiscRolePresetToOwners({
    presetId: 'classic-top-title',
    currentState,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    actions: createActions(calls),
  })

  assert.equal(result.applied, true)
  assert.deepEqual(
    getCallValue(calls, 'restoreBackgroundImageState'),
    {
      backgroundScale: 1,
      backgroundOffset: { x: 0, y: 0 },
      backgroundImageUrl: currentState.background.imageDataUrl,
      backgroundImageSource: currentState.background.imageSource,
      backgroundImageSize: currentState.background.imageSize,
      isBackgroundArtworkEnabled: true,
    },
  )

  const titleArtwork = getCallValue<
    DiscRolePresetCurrentState['titleArtwork']
  >(calls, 'setProjectTitleArtwork')
  assert.equal(titleArtwork.imageDataUrl, currentState.titleArtwork.imageDataUrl)
  assert.equal(titleArtwork.source, currentState.titleArtwork.source)
  assert.equal(titleArtwork.sourceLabel, currentState.titleArtwork.sourceLabel)

  const discText = getCallValue<Record<string, unknown>>(
    calls,
    'restoreDiscTextState',
  )
  assert.equal(
    discText.projectDiscNumberArtwork,
    currentState.projectDiscNumberArtwork,
  )
  assert.equal(discText.discTextValues, currentState.discTextValues)
  assert.equal(discText.discTextValueSources, currentState.discTextValueSources)
  assert.equal(discText.discTextTitleValue, currentState.discTextTitleValue)
  assert.equal(discText.discTextHtmlSources, currentState.discTextHtmlSources)
  assert.equal(discText.discTextStyles, currentState.discTextStyles)

  const logoAssets = getCallValue<DiscRolePresetCurrentState['logoAssets']>(
    calls,
    'setProjectLogoAssets',
  )
  assert.equal(
    logoAssets.developerLogoDataUrl,
    currentState.logoAssets.developerLogoDataUrl,
  )
  assert.equal(
    logoAssets.developerLogoSource,
    currentState.logoAssets.developerLogoSource,
  )
  assert.equal(
    logoAssets.additionalDeveloperLogos,
    currentState.logoAssets.additionalDeveloperLogos,
  )
  assert.equal(
    logoAssets.additionalPublisherLogos,
    currentState.logoAssets.additionalPublisherLogos,
  )

  const ratingBadge = getCallValue<
    DiscRolePresetCurrentState['ratingBadge']
  >(calls, 'setProjectRatingBadge')
  assert.equal(ratingBadge.source, currentState.ratingBadge.source)
  assert.equal(
    ratingBadge.customImageDataUrl,
    currentState.ratingBadge.customImageDataUrl,
  )

  const mediaMark = getCallValue<DiscRolePresetCurrentState['mediaMark']>(
    calls,
    'setProjectMediaMark',
  )
  assert.equal(mediaMark.source, currentState.mediaMark.source)
  assert.equal(
    mediaMark.customImageDataUrl,
    currentState.mediaMark.customImageDataUrl,
  )
  assert.equal(result.state.metadata, currentState.metadata)
  assert.equal(result.state.additionalArtwork, currentState.additionalArtwork)
})

test('adapter preserves selected and repeated mark state for targeted mark owners', () => {
  const calls: CallRecord[] = []
  const currentState = createCurrentState()
  const result = applyDiscRolePresetToOwners({
    presetId: 'clean-metadata-footer',
    currentState,
    selectedDiscTemplate: discTemplates.standardPrintableDisc,
    actions: createActions(calls),
  })

  assert.equal(result.applied, true)

  const platformMarks = getCallValue<
    DiscRolePresetCurrentState['platformMarks']
  >(calls, 'setProjectPlatformMarks')
  assert.equal(platformMarks.values, currentState.platformMarks.values)
  assert.equal(platformMarks.assets.windows?.source, 'custom')
  assert.equal(
    platformMarks.assets.windows?.customImageDataUrl,
    currentState.platformMarks.assets.windows?.customImageDataUrl,
  )

  const technicalMarks = getCallValue<
    DiscRolePresetCurrentState['technicalMarks']
  >(calls, 'setProjectTechnicalMarks')
  assert.equal(technicalMarks.values, currentState.technicalMarks.values)
  assert.equal(technicalMarks.assets.audio?.source, 'custom')
  assert.equal(
    technicalMarks.assets.audio?.customImageDataUrl,
    currentState.technicalMarks.assets.audio?.customImageDataUrl,
  )
  assert.equal(
    technicalMarks.additionalAssets,
    currentState.technicalMarks.additionalAssets,
  )
  assert.equal(result.state.additionalArtwork, currentState.additionalArtwork)
})

test('adapter exposes only targeted owner APIs and no broad or persistence actions', () => {
  assert.doesNotMatch(adapterSource, /setProjectAdditionalArtwork/)
  assert.doesNotMatch(adapterSource, /clampProjectAdditionalArtwork/)
  assert.doesNotMatch(adapterSource, /clampForegroundElementLayoutsToTemplate/)
  assert.doesNotMatch(adapterSource, /setProjectMetadata/)
  assert.doesNotMatch(adapterSource, /writeProjectFile/)
  assert.doesNotMatch(adapterSource, /createProjectSnapshot/)
  assert.doesNotMatch(adapterSource, /serialize/)
})
