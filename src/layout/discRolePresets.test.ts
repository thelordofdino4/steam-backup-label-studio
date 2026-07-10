import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DISC_ROLE_PRESET_IDS,
  DISC_ROLE_PRESETS,
  applyDiscRolePresetToState,
  getDiscRolePreset,
  getDiscRolePresetUpdatePlan,
  type DiscRolePresetApplicationState,
  type DiscRolePreset,
  type DiscRolePresetAllowedField,
} from './discRolePresets.ts'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import { createDefaultProjectAdditionalArtwork } from '../project/projectAdditionalArtwork.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultDiscTextValueSources } from '../project/metadataDiscText.ts'
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

const expectedPresetLabels = new Map([
  ['classic-top-title', 'Classic Top Title'],
  ['centered-logo-archive', 'Centered Logo Archive'],
  ['clean-metadata-footer', 'Clean Metadata Footer'],
])

const allowedFields = new Set<DiscRolePresetAllowedField>([
  'enabled',
  'scale',
  'offset.x',
  'offset.y',
  'layout.enabled',
  'layout.x',
  'layout.y',
  'layout.scale',
  'textSetting.enabled',
  'textLayout.x',
  'textLayout.y',
  'textLayout.width',
  'textLayout.scale',
  'textLayout.fontSizePt',
  'textLayout.align',
  'textLayout.mode',
  'textLayout.arcDegrees',
  'textLayout.arcSide',
])

const blockedFieldFragments = [
  'case',
  'delete',
  'remove',
  'clear',
  'image',
  'source',
  'content',
  'value',
  'metadata',
  'schema',
  'preset',
]

function getPlanUpdates(preset: DiscRolePreset) {
  return preset.updatePlan.flatMap((ownerPlan) =>
    ownerPlan.updates.map((update) => ({
      owner: ownerPlan.owner,
      update,
    })),
  )
}

function getPlanFields(preset: DiscRolePreset) {
  return getPlanUpdates(preset).flatMap(({ update }) => update.fields)
}

function createApplicationState(
  options: { titleArtworkImage?: string | null } = {},
): DiscRolePresetApplicationState {
  const template = discTemplates.standardPrintableDisc
  const logoAssets = createDefaultProjectLogoAssets(template)
  const platformMarks = createDefaultProjectPlatformMarks()
  const technicalMarks = createDefaultProjectTechnicalMarks()
  const additionalArtwork = createDefaultProjectAdditionalArtwork()
  const metadata = {
    ...createDefaultProjectMetadata(),
    title: 'Half-Life 2',
    steamAppId: '220',
    copyrightText: 'Copyright content should stay put.',
  }
  const discTextValues = {
    ...createDefaultDiscTextValues(220),
    customNote: 'Do not overwrite this custom note.',
    copyright: 'Do not overwrite legal copy.',
  }

  return {
    background: {
      enabled: false,
      scale: 1.8,
      offset: { x: 11, y: -9 },
      imageDataUrl: 'data:image/png;base64,background',
      imageSource: {
        source: 'uploaded',
        sourceId: 'background-source-id',
        sourceLabel: 'background.png',
      },
      imageSize: { width: 1920, height: 1080 },
      note: 'background note',
    },
    titleArtwork: {
      ...createDefaultProjectTitleArtwork(template, 'top'),
      source: 'steam',
      steamArtworkAssetId: 'steam-title-logo-id',
      sourceLabel: 'Steam title logo',
      imageDataUrl: options.titleArtworkImage === undefined
        ? 'data:image/png;base64,title'
        : options.titleArtworkImage,
      imageSize: { width: 900, height: 360 },
      layout: {
        enabled: false,
        scale: 2.2,
        x: 12,
        y: 34,
      },
    },
    discTextSettings: {
      ...DEFAULT_DISC_TEXT_SETTINGS,
      title: false,
      appId: false,
      backupDate: false,
      developer: false,
      publisher: false,
      copyright: false,
    },
    discTextLayout: createDefaultDiscTextLayout('top', template),
    logoAssets: {
      ...logoAssets,
      developerLogoDataUrl: 'data:image/png;base64,developer-logo',
      developerLogoSource: {
        source: 'uploaded',
        sourceId: 'developer-source-id',
        sourceLabel: 'developer.png',
      },
      developerLogoSize: { width: 512, height: 128 },
      publisherLogoDataUrl: 'data:image/png;base64,publisher-logo',
      publisherLogoSource: {
        source: 'official-logo-candidate',
        sourceId: 'publisher-source-id',
        sourceLabel: 'Publisher mark',
        sourceUrl: 'https://example.test/publisher.png',
      },
      publisherLogoSize: { width: 420, height: 120 },
      additionalDeveloperLogos: [
        {
          id: 'additional-dev-1',
          label: 'Additional developer',
          imageDataUrl: 'data:image/png;base64,additional-dev',
          imageSource: {
            source: 'uploaded',
            sourceId: 'additional-dev-source-id',
            sourceLabel: 'additional-dev.png',
          },
          imageSize: { width: 256, height: 96 },
          layout: { enabled: false, scale: 0.44, x: 9, y: 88 },
        },
      ],
      additionalPublisherLogos: [
        {
          id: 'additional-pub-1',
          label: 'Additional publisher',
          imageDataUrl: 'data:image/png;base64,additional-pub',
          imageSource: {
            source: 'uploaded',
            sourceId: 'additional-pub-source-id',
            sourceLabel: 'additional-pub.png',
          },
          imageSize: { width: 256, height: 96 },
          layout: { enabled: false, scale: 0.45, x: 91, y: 88 },
        },
      ],
    },
    ratingBadge: {
      ...createDefaultProjectRatingBadge(template),
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,rating',
      customImageSize: { width: 180, height: 260 },
      layout: { enabled: false, scale: 1.6, x: 9, y: 9 },
    },
    mediaMark: {
      ...createDefaultProjectMediaMark(template),
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,media',
      customImageSize: { width: 220, height: 120 },
      layout: { enabled: false, scale: 1.7, x: 8, y: 8 },
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
          layout: { enabled: false, scale: 1.4, x: 4, y: 5 },
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
          layout: { enabled: false, scale: 1.3, x: 6, y: 7 },
        },
      },
      additionalAssets: {
        audio: [
          {
            id: 'additional-audio-1',
            label: 'Additional audio',
            source: 'custom',
            customImageDataUrl: 'data:image/png;base64,additional-audio',
            customImageSize: { width: 80, height: 80 },
            layout: { enabled: false, scale: 0.6, x: 13, y: 14 },
          },
        ],
      },
    },
    additionalArtwork: {
      ...additionalArtwork,
      enabled: false,
      elements: [
        {
          id: 'artwork-1',
          label: 'Existing artwork',
          source: 'custom',
          sourceId: 'additional-artwork-source-id',
          sourceLabel: 'artwork.png',
          imageDataUrl: 'data:image/png;base64,artwork',
          imageSize: { width: 320, height: 200 },
          layout: { enabled: false, scale: 0.7, x: 31, y: 41 },
          frame: {
            enabled: true,
            color: '#ffffff',
            width: 1.5,
            shape: 'rectangle',
            style: 'solid',
            lumpiness: 0.3,
            jaggedness: 0.2,
            roughnessOffset: 1,
          },
        },
      ],
    },
    metadata,
    discTextValues,
    discTextValueSources: createDefaultDiscTextValueSources(),
    discTextTitleValue: 'Manual title content stays',
    discTextHtmlSources: {
      customNote: '<strong>HTML content stays</strong>',
    },
    discTextStyles: createDefaultDiscTextStyles(),
  }
}

test('disc role preset ids and labels are stable', () => {
  assert.deepEqual(DISC_ROLE_PRESET_IDS, [
    'classic-top-title',
    'centered-logo-archive',
    'clean-metadata-footer',
  ])
  assert.deepEqual(
    DISC_ROLE_PRESETS.map((preset) => [preset.id, preset.label]),
    Array.from(expectedPresetLabels.entries()),
  )
})

test('disc role preset ids are unique', () => {
  const ids = DISC_ROLE_PRESETS.map((preset) => preset.id)

  assert.equal(new Set(ids).size, ids.length)
})

test('each disc role preset targets the Disc surface and declares role intent', () => {
  for (const preset of DISC_ROLE_PRESETS) {
    assert.equal(preset.targetSurface, 'disc')
    assert.ok(preset.affectedRoles.length > 0)
    assert.ok(preset.intentionallyUntouchedRoles.length > 0)
    assert.ok(preset.intentionallyUntouchedRoles.includes('additional-artwork'))
    assert.equal(
      preset.affectedRoles.some((role) =>
        preset.intentionallyUntouchedRoles.includes(role),
      ),
      false,
    )
  }
})

test('each disc role preset groups updates by current feature owner', () => {
  for (const preset of DISC_ROLE_PRESETS) {
    assert.ok(preset.updatePlan.length > 0)

    for (const ownerPlan of preset.updatePlan) {
      assert.ok(ownerPlan.owner.length > 0)
      assert.ok(ownerPlan.updates.length > 0)
    }
  }
})

test('disc role preset update plans include only allowed layout and enablement fields', () => {
  for (const preset of DISC_ROLE_PRESETS) {
    for (const fieldUpdate of getPlanFields(preset)) {
      assert.equal(
        allowedFields.has(fieldUpdate.field),
        true,
        `${preset.id} uses unsupported field ${fieldUpdate.field}`,
      )
    }
  }
})

test('disc role preset update plans do not declare asset deletion or source/content overwrites', () => {
  for (const preset of DISC_ROLE_PRESETS) {
    for (const fieldUpdate of getPlanFields(preset)) {
      for (const blockedFragment of blockedFieldFragments) {
        assert.equal(
          fieldUpdate.field.toLowerCase().includes(blockedFragment),
          false,
          `${preset.id} field ${fieldUpdate.field} should not include ${blockedFragment}`,
        )
      }
    }
  }
})

test('disc role preset update plans do not target case insert state', () => {
  for (const preset of DISC_ROLE_PRESETS) {
    for (const { owner, update } of getPlanUpdates(preset)) {
      const targetText = [
        owner,
        update.role,
        update.slot,
        update.condition,
        update.enablement,
      ].join(' ')

      assert.equal(/caseInsert|case-insert|front|spine/i.test(targetText), false)
    }
  }
})

test('disc role preset update plans do not include persisted preset identity fields', () => {
  for (const preset of DISC_ROLE_PRESETS) {
    const planText = JSON.stringify(preset.updatePlan)

    assert.equal(/preset/i.test(planText), false)
    assert.equal(/schema/i.test(planText), false)
  }
})

test('disc role preset lookup handles known and unknown ids safely', () => {
  assert.equal(
    getDiscRolePreset('classic-top-title')?.label,
    'Classic Top Title',
  )
  assert.equal(getDiscRolePreset('unknown-preset-id'), null)
  assert.deepEqual(getDiscRolePresetUpdatePlan('unknown-preset-id'), [])
})

test('applying each starter disc role preset updates expected layout fields', () => {
  const expectations = {
    'classic-top-title': {
      title: { x: 50, y: 19.5, scale: 1 },
      copyright: { mode: 'curved', arcSide: 'bottom' },
      textKey: 'appId',
      textY: 72,
      developerLogo: { x: 22, y: 64, scale: 0.82 },
    },
    'centered-logo-archive': {
      title: { x: 50, y: 50, scale: 1.35 },
      copyright: { mode: 'curved', arcSide: 'bottom' },
      textKey: 'backupDate',
      textY: 74,
      developerLogo: { x: 24, y: 76, scale: 0.72 },
    },
    'clean-metadata-footer': {
      title: { x: 50, y: 24, scale: 0.84 },
      copyright: { mode: 'straight', arcSide: 'bottom' },
      textKey: 'developer',
      textY: 68,
      developerLogo: { x: 24, y: 78, scale: 0.68 },
    },
  } as const

  for (const presetId of DISC_ROLE_PRESET_IDS) {
    const result = applyDiscRolePresetToState(createApplicationState(), presetId)
    const expected = expectations[presetId]

    assert.equal(result.applied, true)
    assert.equal(result.preset?.id, presetId)
    assert.deepEqual(result.state.background.offset, { x: 0, y: 0 })
    assert.equal(result.state.background.enabled, true)
    assert.deepEqual(result.state.titleArtwork.layout, {
      enabled: true,
      ...expected.title,
    })
    assert.equal(result.state.discTextSettings.copyright, true)
    assert.equal(
      result.state.discTextLayout.copyright.mode,
      expected.copyright.mode,
    )
    assert.equal(
      result.state.discTextLayout.copyright.arcSide,
      expected.copyright.arcSide,
    )
    assert.equal(result.state.discTextSettings[expected.textKey], true)
    assert.equal(result.state.discTextLayout[expected.textKey].y, expected.textY)
    assert.deepEqual(result.state.logoAssets.developerLogoLayout, {
      enabled: true,
      ...expected.developerLogo,
    })
  }
})

test('disc role preset application preserves user assets sources content metadata and styles', () => {
  const state = createApplicationState()
  const result = applyDiscRolePresetToState(state, 'classic-top-title').state

  assert.equal(result.background.imageDataUrl, state.background.imageDataUrl)
  assert.equal(result.background.imageSource, state.background.imageSource)
  assert.equal(result.titleArtwork.imageDataUrl, state.titleArtwork.imageDataUrl)
  assert.equal(
    result.titleArtwork.steamArtworkAssetId,
    state.titleArtwork.steamArtworkAssetId,
  )
  assert.equal(
    result.logoAssets.developerLogoDataUrl,
    state.logoAssets.developerLogoDataUrl,
  )
  assert.equal(
    result.logoAssets.developerLogoSource,
    state.logoAssets.developerLogoSource,
  )
  assert.equal(
    result.ratingBadge.customImageDataUrl,
    state.ratingBadge.customImageDataUrl,
  )
  assert.equal(result.mediaMark.customImageDataUrl, state.mediaMark.customImageDataUrl)
  assert.equal(result.platformMarks.assets.windows?.source, 'custom')
  assert.equal(
    result.platformMarks.assets.windows?.customImageDataUrl,
    state.platformMarks.assets.windows?.customImageDataUrl,
  )
  assert.equal(result.technicalMarks.assets.audio?.source, 'custom')
  assert.equal(
    result.technicalMarks.assets.audio?.customImageDataUrl,
    state.technicalMarks.assets.audio?.customImageDataUrl,
  )
  assert.equal(result.metadata, state.metadata)
  assert.equal(result.discTextValues, state.discTextValues)
  assert.equal(result.discTextValueSources, state.discTextValueSources)
  assert.equal(result.discTextTitleValue, state.discTextTitleValue)
  assert.equal(result.discTextHtmlSources, state.discTextHtmlSources)
  assert.equal(result.discTextStyles, state.discTextStyles)
})

test('disc role preset application leaves untargeted and repeatable objects unchanged', () => {
  const state = createApplicationState()
  const result = applyDiscRolePresetToState(state, 'clean-metadata-footer').state

  assert.equal(result.additionalArtwork, state.additionalArtwork)
  assert.equal(
    result.logoAssets.additionalDeveloperLogos,
    state.logoAssets.additionalDeveloperLogos,
  )
  assert.equal(
    result.logoAssets.additionalPublisherLogos,
    state.logoAssets.additionalPublisherLogos,
  )
  assert.deepEqual(
    result.technicalMarks.additionalAssets,
    state.technicalMarks.additionalAssets,
  )
  assert.equal(result.logoAssets.additionalDeveloperLogos.length, 1)
  assert.equal(result.logoAssets.additionalPublisherLogos.length, 1)
  assert.equal(result.additionalArtwork.elements.length, 1)
  assert.equal(result.technicalMarks.additionalAssets?.audio?.length, 1)
})

test('disc role preset application enables title text fallback only when title artwork cannot render', () => {
  const stateWithArtwork = createApplicationState()
  const withArtwork = applyDiscRolePresetToState(
    stateWithArtwork,
    'centered-logo-archive',
  ).state

  assert.equal(withArtwork.discTextSettings.title, false)
  assert.deepEqual(
    withArtwork.discTextLayout.title,
    stateWithArtwork.discTextLayout.title,
  )

  const stateWithoutArtwork = createApplicationState({ titleArtworkImage: null })
  const withoutArtwork = applyDiscRolePresetToState(
    stateWithoutArtwork,
    'centered-logo-archive',
  ).state

  assert.equal(withoutArtwork.titleArtwork.layout.enabled, false)
  assert.equal(withoutArtwork.discTextSettings.title, true)
  assert.equal(withoutArtwork.discTextLayout.title.y, 50)
  assert.equal(withoutArtwork.discTextLayout.title.scale, 1.08)
})

test('disc role preset application does not create missing repeated mark assets', () => {
  const state = {
    ...createApplicationState(),
    platformMarks: {
      ...createDefaultProjectPlatformMarks(),
      values: ['windows'],
      assets: {},
    },
    technicalMarks: {
      ...createDefaultProjectTechnicalMarks(),
      values: ['audio'],
      assets: {},
      additionalAssets: {},
    },
  } satisfies DiscRolePresetApplicationState

  const result = applyDiscRolePresetToState(state, 'clean-metadata-footer').state

  assert.deepEqual(result.platformMarks.values, ['windows'])
  assert.deepEqual(result.platformMarks.assets, {})
  assert.deepEqual(result.technicalMarks.values, ['audio'])
  assert.deepEqual(result.technicalMarks.assets, {})
  assert.deepEqual(result.technicalMarks.additionalAssets, {})
})

test('disc role preset application handles unknown preset ids safely', () => {
  const state = createApplicationState()
  const result = applyDiscRolePresetToState(state, 'missing-preset')

  assert.equal(result.applied, false)
  assert.equal(result.preset, null)
  assert.equal(result.state, state)
})

test('disc role presets do not enable rating badges without rating metadata', () => {
  const state = createApplicationState()
  const result = applyDiscRolePresetToState(state, 'classic-top-title').state

  assert.equal(state.metadata?.ratingSystem, 'none')
  assert.equal(result.ratingBadge.layout.enabled, false)
  assert.equal(result.ratingBadge.source, state.ratingBadge.source)
  assert.equal(
    result.ratingBadge.customImageDataUrl,
    state.ratingBadge.customImageDataUrl,
  )
})

test('disc role presets enable preserved rating sources with valid rating metadata', () => {
  const state = createApplicationState()
  const result = applyDiscRolePresetToState(
    {
      ...state,
      metadata: {
        ...state.metadata!,
        ratingSystem: 'ESRB',
        ratingValue: 'T',
      },
    },
    'classic-top-title',
  ).state

  assert.equal(result.ratingBadge.layout.enabled, true)
  assert.equal(result.ratingBadge.source, state.ratingBadge.source)
  assert.equal(
    result.ratingBadge.customImageDataUrl,
    state.ratingBadge.customImageDataUrl,
  )
})
