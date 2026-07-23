import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextValueSources } from '../project/metadataDiscText.ts'
import { createDefaultProjectAdditionalArtwork } from '../project/projectAdditionalArtwork.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks, updatePlatformMarkToggle } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import {
  completeDiscGuidedRatingBadgeAction,
  completeDiscGuidedSlotWhenSatisfied,
  DISC_GUIDED_COMPLETION_SLOT_IDS,
  getSatisfiedDiscGuidedSlotIds,
  getSatisfiedDiscGuidedSlotIdsForMetadataAction,
  isDiscGuidedSlotOwnerSatisfied,
  isDiscGuidedTextOwnerSatisfied,
} from './discGuidedCompletion.ts'
import {
  DISC_GUIDED_SLOT_IDS,
  resolveDiscGuidedSlot,
  type DiscGuidedSlotId,
  type DiscGuidedSlotState,
} from './discGuidedSlots.ts'
import {
  INITIAL_DISC_GUIDED_WORKFLOW_STATE,
  applyDiscGuidedLayout,
  completeDiscGuidedSlot,
  restoreCompletedDiscGuidedSlot,
} from './discGuidedWorkflow.ts'

function createState(): DiscGuidedSlotState {
  return {
    background: {
      enabled: true,
      imageDataUrl: null,
      imageSize: null,
    },
    titleArtwork: structuredClone(createDefaultProjectTitleArtwork()),
    metadata: structuredClone(createDefaultProjectMetadata()),
    ratingBadge: structuredClone(createDefaultProjectRatingBadge()),
    mediaMark: structuredClone(createDefaultProjectMediaMark()),
    platformMarks: structuredClone(createDefaultProjectPlatformMarks()),
    logoAssets: structuredClone(createDefaultProjectLogoAssets()),
    additionalArtwork: structuredClone(createDefaultProjectAdditionalArtwork()),
    discText: {
      settings: { ...DEFAULT_DISC_TEXT_SETTINGS },
      values: createDefaultDiscTextValues(),
      valueSources: createDefaultDiscTextValueSources(),
      titleValue: '',
      htmlSources: {},
    },
  }
}

test('seeds satisfied guided slots in caller-supplied canonical order without mutation', () => {
  const state = createState()
  state.background = {
    enabled: true,
    imageDataUrl: 'data:image/png;base64,background',
    imageSize: { width: 1200, height: 1200 },
  }
  state.titleArtwork = {
    ...state.titleArtwork,
    imageDataUrl: 'data:image/png;base64,title',
    imageSize: { width: 800, height: 300 },
    layout: { ...state.titleArtwork.layout, enabled: true },
  }
  state.metadata = {
    ...state.metadata,
    ratingSystem: 'ESRB',
    ratingValue: 'T',
    copyrightText: 'Copyright 2026',
  }
  state.ratingBadge = {
    ...state.ratingBadge,
    layout: { ...state.ratingBadge.layout, enabled: true },
  }
  state.mediaMark = {
    ...state.mediaMark,
    layout: { ...state.mediaMark.layout, enabled: true },
  }
  state.platformMarks = updatePlatformMarkToggle(
    state.platformMarks,
    'windows',
    true,
  )
  state.logoAssets = {
    ...state.logoAssets,
    developerLogoLayout: {
      ...state.logoAssets.developerLogoLayout,
      enabled: true,
    },
    publisherLogoLayout: {
      ...state.logoAssets.publisherLogoLayout,
      enabled: true,
    },
  }
  state.discText.settings.copyright = true
  const before = structuredClone(state)
  const canonicalOrder = Array.from(DISC_GUIDED_SLOT_IDS.slice(0, 8)).reverse()

  assert.deepEqual(
    getSatisfiedDiscGuidedSlotIds(state, canonicalOrder),
    canonicalOrder,
  )
  assert.deepEqual(state, before)
})

test('Game Title text and Legal use enabled meaningful canonical content', () => {
  const state = createState()
  state.discText.settings.title = true
  state.discText.valueSources.title = 'manual'
  state.discText.titleValue = 'A Real Game'
  state.discText.settings.copyright = true
  state.discText.htmlSources.copyright = '<p>Copyright <strong>2026</strong></p>'

  assert.equal(isDiscGuidedTextOwnerSatisfied(state, 'title'), true)
  assert.equal(isDiscGuidedTextOwnerSatisfied(state, 'copyright'), true)

  state.discText.titleValue = '   '
  state.discText.htmlSources.copyright = '<p> &nbsp; </p>'
  assert.equal(isDiscGuidedTextOwnerSatisfied(state, 'title'), false)
  assert.equal(isDiscGuidedTextOwnerSatisfied(state, 'copyright'), false)
})

test('primary logo claim satisfaction is enablement-only and independent', () => {
  const state = createState()
  state.logoAssets.developerLogoLayout.enabled = true

  assert.equal(
    isDiscGuidedSlotOwnerSatisfied(
      DISC_GUIDED_COMPLETION_SLOT_IDS.developerLogo,
      state,
    ),
    true,
  )
  assert.equal(
    isDiscGuidedSlotOwnerSatisfied(
      DISC_GUIDED_COMPLETION_SLOT_IDS.publisherLogo,
      state,
    ),
    false,
  )
  assert.equal(state.logoAssets.developerLogoDataUrl, null)
})

test('metadata actions return only affected satisfied title, Rating, and Legal slots', () => {
  const state = createState()
  state.discText.settings.title = true
  state.discText.valueSources.title = 'manual'
  state.discText.titleValue = 'Metadata-aware title'
  state.metadata.ratingSystem = 'PEGI'
  state.metadata.ratingValue = '12'
  state.ratingBadge.layout.enabled = true
  state.metadata.copyrightText = 'Legal metadata'
  state.discText.settings.copyright = true

  assert.deepEqual(
    getSatisfiedDiscGuidedSlotIdsForMetadataAction(state, [
      'copyrightText',
      'ratingValue',
      'title',
    ]),
    [
      DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle,
      DISC_GUIDED_COMPLETION_SLOT_IDS.ratingBadge,
      DISC_GUIDED_COMPLETION_SLOT_IDS.legalText,
    ],
  )
  assert.deepEqual(
    getSatisfiedDiscGuidedSlotIdsForMetadataAction(state, ['developer']),
    [],
  )

  state.ratingBadge.layout.enabled = false
  assert.deepEqual(
    getSatisfiedDiscGuidedSlotIdsForMetadataAction(state, ['ratingSystem']),
    [],
  )
})

test('completion dispatch helpers emit exact slot IDs only for satisfied owner actions', () => {
  const completed: DiscGuidedSlotId[] = []
  const onCompleted = (slotId: DiscGuidedSlotId) => completed.push(slotId)
  const state = createState()

  completeDiscGuidedSlotWhenSatisfied(
    onCompleted,
    DISC_GUIDED_COMPLETION_SLOT_IDS.backgroundImage,
    false,
  )
  completeDiscGuidedSlotWhenSatisfied(
    onCompleted,
    DISC_GUIDED_COMPLETION_SLOT_IDS.backgroundImage,
    true,
  )

  state.metadata.ratingSystem = 'ESRB'
  state.ratingBadge.layout.enabled = true
  completeDiscGuidedRatingBadgeAction(
    onCompleted,
    state.metadata,
    state.ratingBadge,
  )

  assert.deepEqual(completed, [
    DISC_GUIDED_COMPLETION_SLOT_IDS.backgroundImage,
    DISC_GUIDED_COMPLETION_SLOT_IDS.ratingBadge,
  ])
})

test('all eight owner claims stay completed after invalidation until explicitly restored', () => {
  const scenarios: readonly Readonly<{
    slotId: DiscGuidedSlotId
    satisfy: (state: DiscGuidedSlotState) => void
  }>[] = [
    {
      slotId: DISC_GUIDED_COMPLETION_SLOT_IDS.gameTitle,
      satisfy: (state) => {
        state.titleArtwork = {
          ...state.titleArtwork,
          imageDataUrl: 'data:image/png;base64,title',
          imageSize: { width: 800, height: 300 },
          layout: { ...state.titleArtwork.layout, enabled: true },
        }
      },
    },
    {
      slotId: DISC_GUIDED_COMPLETION_SLOT_IDS.backgroundImage,
      satisfy: (state) => {
        state.background.imageDataUrl = 'data:image/png;base64,background'
        state.background.imageSize = { width: 1200, height: 1200 }
      },
    },
    {
      slotId: DISC_GUIDED_COMPLETION_SLOT_IDS.ratingBadge,
      satisfy: (state) => {
        state.metadata.ratingSystem = 'ESRB'
        state.metadata.ratingValue = 'T'
        state.ratingBadge = {
          ...state.ratingBadge,
          layout: { ...state.ratingBadge.layout, enabled: true },
        }
      },
    },
    {
      slotId: DISC_GUIDED_COMPLETION_SLOT_IDS.mediaFormatMark,
      satisfy: (state) => {
        state.mediaMark = {
          ...state.mediaMark,
          layout: { ...state.mediaMark.layout, enabled: true },
        }
      },
    },
    {
      slotId: DISC_GUIDED_COMPLETION_SLOT_IDS.operatingSystemMarks,
      satisfy: (state) => {
        state.platformMarks = updatePlatformMarkToggle(
          state.platformMarks,
          'windows',
          true,
        )
      },
    },
    {
      slotId: DISC_GUIDED_COMPLETION_SLOT_IDS.developerLogo,
      satisfy: (state) => {
        state.logoAssets = {
          ...state.logoAssets,
          developerLogoLayout: {
            ...state.logoAssets.developerLogoLayout,
            enabled: true,
          },
        }
      },
    },
    {
      slotId: DISC_GUIDED_COMPLETION_SLOT_IDS.publisherLogo,
      satisfy: (state) => {
        state.logoAssets = {
          ...state.logoAssets,
          publisherLogoLayout: {
            ...state.logoAssets.publisherLogoLayout,
            enabled: true,
          },
        }
      },
    },
    {
      slotId: DISC_GUIDED_COMPLETION_SLOT_IDS.legalText,
      satisfy: (state) => {
        state.metadata.copyrightText = 'Copyright 2026'
        state.discText.settings.copyright = true
      },
    },
  ]

  for (const { slotId, satisfy } of scenarios) {
    const satisfiedState = createState()
    assert.equal(isDiscGuidedSlotOwnerSatisfied(slotId, satisfiedState), false)
    satisfy(satisfiedState)
    assert.equal(isDiscGuidedSlotOwnerSatisfied(slotId, satisfiedState), true)

    const active = applyDiscGuidedLayout(
      INITIAL_DISC_GUIDED_WORKFLOW_STATE,
      { id: 'disc:guided-layout:classic-top-title', version: 1 },
    ).state
    const completed = completeDiscGuidedSlot(active, slotId).state
    const duplicate = completeDiscGuidedSlot(completed, slotId).state
    assert.equal(duplicate, completed)

    const invalidatedState = createState()
    const hidden = resolveDiscGuidedSlot({
      slotId,
      state: invalidatedState,
      suggestions: [],
      omittedSlotIds: new Set(),
      completedSlotIds: new Set(completed.completedSlotIds),
    })
    assert.equal(hidden.presentation, 'completed')

    const restored = restoreCompletedDiscGuidedSlot(completed, slotId).state
    const eligible = resolveDiscGuidedSlot({
      slotId,
      state: invalidatedState,
      suggestions: [],
      omittedSlotIds: new Set(),
      completedSlotIds: new Set(restored.completedSlotIds),
    })
    assert.equal(eligible.presentation, 'available', slotId)
  }
})

test('completion architecture has no reactive, DOM, preset-definition, or App slot policy coupling', () => {
  const completionSource = readFileSync(
    'src/guidedPresets/discGuidedCompletion.ts',
    'utf8',
  )
  const appSource = readFileSync('src/app/App.tsx', 'utf8')
  const presetSources = [
    'src/presets/discPresetDefinition.ts',
    'src/presets/builtins/classicTopTitleDiscPreset.ts',
  ].map((path) => readFileSync(path, 'utf8')).join('\n')
  const ownerSources = [
    'src/hooks/useBackgroundImage.ts',
    'src/hooks/useTitleArtwork.ts',
    'src/hooks/useRatingBadgeState.ts',
    'src/hooks/useMediaMarkState.ts',
    'src/hooks/usePlatformMarksState.ts',
    'src/hooks/useProjectLogoAssets.ts',
    'src/hooks/useLogoAssetDiscovery.ts',
    'src/hooks/useDiscTextState.ts',
  ].map((path) => readFileSync(path, 'utf8')).join('\n')

  assert.doesNotMatch(
    completionSource,
    /useEffect|MutationObserver|querySelector|getBoundingClientRect|document\.|window\./,
  )
  assert.doesNotMatch(completionSource, /centerXPercent|centerYPercent|coordinates?/i)
  assert.doesNotMatch(presetSources, /completedSlotIds|completeDiscGuidedSlot/)
  assert.doesNotMatch(appSource, /DISC_GUIDED_COMPLETION_SLOT_IDS|disc:guided:/)
  assert.equal(
    (appSource.match(
      /onDiscGuidedSlotCompleted:\s*completeActiveDiscGuidedSlot/g,
    ) ?? []).length,
    8,
  )
  assert.match(appSource, /completeDiscGuidedSlotsForMetadataAction\(/)
  assert.match(appSource, /completeDiscGuidedRatingBadgeAction\(/)
  assert.doesNotMatch(ownerSources, /setDiscGuidedWorkflow|completedSlotIds/)
  assert.doesNotMatch(
    `${completionSource}\n${ownerSources}`,
    /containFit|contain-fit|fit:\s*['"]contain['"]/i,
  )
})
