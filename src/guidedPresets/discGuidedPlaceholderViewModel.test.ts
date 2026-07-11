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
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import {
  getDiscGuidedLayoutSlotDefinition,
  type DiscGuidedRectGeometry,
} from './discGuidedLayouts.ts'
import {
  createDiscGuidedPlaceholderViewModels,
  projectDiscGuidedPlaceholderViewModel,
} from './discGuidedPlaceholderViewModel.ts'
import type {
  DiscGuidedSlotId,
  DiscGuidedSlotState,
  DiscGuidedSlotSuggestion,
} from './discGuidedSlots.ts'

const CLASSIC_LAYOUT_ID = 'disc:guided-layout:classic-top-title'
const TITLE_SLOT_ID = 'disc:guided:game-title:primary'
const BACKGROUND_SLOT_ID = 'disc:guided:background-image:primary'
const RATING_SLOT_ID = 'disc:guided:rating:primary'
const COMPANY_SLOT_ID = 'disc:guided:company-logo:primary'
const LEGAL_SLOT_ID = 'disc:guided:legal-text:copyright'
const CLASSIC_SLOT_ORDER = [
  BACKGROUND_SLOT_ID,
  TITLE_SLOT_ID,
  RATING_SLOT_ID,
  COMPANY_SLOT_ID,
  LEGAL_SLOT_ID,
] as const
const NO_SUGGESTIONS: readonly DiscGuidedSlotSuggestion[] = []
const NO_SKIPPED_SLOTS = new Set<DiscGuidedSlotId>()

function createState(): DiscGuidedSlotState {
  return {
    background: { enabled: true, imageDataUrl: null, imageSize: null },
    titleArtwork: createDefaultProjectTitleArtwork(),
    metadata: createDefaultProjectMetadata(),
    ratingBadge: createDefaultProjectRatingBadge(),
    logoAssets: createDefaultProjectLogoAssets(),
    additionalArtwork: createDefaultProjectAdditionalArtwork(),
    discText: {
      settings: { ...DEFAULT_DISC_TEXT_SETTINGS },
      values: createDefaultDiscTextValues(),
      valueSources: createDefaultDiscTextValueSources(),
      titleValue: '',
      htmlSources: {},
    },
  }
}

function createPlaceholders(
  state = createState(),
  suggestions: readonly DiscGuidedSlotSuggestion[] = NO_SUGGESTIONS,
  skippedSlotIds: ReadonlySet<DiscGuidedSlotId> = NO_SKIPPED_SLOTS,
) {
  return createDiscGuidedPlaceholderViewModels({
    activeLayoutId: CLASSIC_LAYOUT_ID,
    state,
    suggestions,
    skippedSlotIds,
  })
}

function getSlotIds(state = createState()) {
  return createPlaceholders(state).map(({ slotId }) => slotId)
}

test('blank Classic Top Title projects all five slots in layout order', () => {
  const placeholders = createPlaceholders()

  assert.deepEqual(placeholders.map(({ slotId }) => slotId), CLASSIC_SLOT_ORDER)
  assert.deepEqual(placeholders.map(({ label }) => label), [
    'Background Image',
    'Game Title',
    'Game Info Logos',
    'Company Logos',
    'Legal Info',
  ])
  assert.deepEqual(placeholders.map(({ setupKind }) => setupKind), [
    'background',
    'game-title-choice',
    'rating',
    'company-logo-choice',
    'legal',
  ])
  assert.equal(placeholders[0]?.visualLayer, 'background')
  assert.ok(placeholders.slice(1).every(({ visualLayer }) =>
    visualLayer === 'foreground'))
  assert.ok(placeholders.every(({ lifecycle }) => lifecycle === 'unfilled'))
  assert.ok(placeholders.every(({ ownerContentLayering }) =>
    ownerContentLayering === 'guidance-behind-real-content'))
  assert.equal(Object.isFrozen(placeholders), true)
  assert.ok(placeholders.every(Object.isFrozen))
})

test('view models use exact visual/action registry geometry', () => {
  for (const placeholder of createPlaceholders()) {
    const layoutSlot = getDiscGuidedLayoutSlotDefinition(
      CLASSIC_LAYOUT_ID,
      placeholder.slotId,
    )

    assert.ok(layoutSlot)
    assert.equal(placeholder.visualGeometry, layoutSlot.visualGeometry)
    assert.equal(placeholder.actionGeometry, layoutSlot.actionGeometry)
  }

  const background = createPlaceholders()[0]
  assert.notDeepEqual(background?.visualGeometry, background?.actionGeometry)
})

test('suggested slots remain visible and skipped slots remain absent', () => {
  const suggestion: DiscGuidedSlotSuggestion = {
    id: 'suggestion:title',
    slotId: TITLE_SLOT_ID,
    contentKind: 'image',
    sourceKind: 'external',
  }
  const suggested = createPlaceholders(createState(), [suggestion])

  assert.equal(suggested.length, 5)
  assert.equal(
    suggested.find(({ slotId }) => slotId === TITLE_SLOT_ID)?.lifecycle,
    'suggested',
  )
  assert.deepEqual(
    createPlaceholders(createState(), NO_SUGGESTIONS, new Set([TITLE_SLOT_ID]))
      .map(({ slotId }) => slotId),
    CLASSIC_SLOT_ORDER.filter((slotId) => slotId !== TITLE_SLOT_ID),
  )
})

test('untouched default title remains guided', () => {
  const state = createState()
  state.discText.settings.title = true

  assert.ok(getSlotIds(state).includes(TITLE_SLOT_ID))
})

test('authored title and valid title artwork suppress only Game Title', () => {
  const authoredState = createState()
  authoredState.discText.settings.title = true
  authoredState.discText.valueSources.title = 'manual'
  authoredState.discText.titleValue = 'A Real Game'
  assert.deepEqual(
    getSlotIds(authoredState),
    CLASSIC_SLOT_ORDER.filter((slotId) => slotId !== TITLE_SLOT_ID),
  )

  const artworkState = createState()
  artworkState.titleArtwork = {
    ...artworkState.titleArtwork,
    imageDataUrl: 'data:image/png;base64,title',
    layout: { ...artworkState.titleArtwork.layout, enabled: true },
  }
  assert.deepEqual(
    getSlotIds(artworkState),
    CLASSIC_SLOT_ORDER.filter((slotId) => slotId !== TITLE_SLOT_ID),
  )
})

test('Background requires active image readiness before it suppresses guidance', () => {
  const state = createState()
  state.background.imageDataUrl = 'data:image/png;base64,background'
  assert.ok(getSlotIds(state).includes(BACKGROUND_SLOT_ID))

  state.background.imageSize = { width: 1200, height: 1200 }
  assert.deepEqual(
    getSlotIds(state),
    CLASSIC_SLOT_ORDER.filter((slotId) => slotId !== BACKGROUND_SLOT_ID),
  )
})

test('valid primary Rating suppresses only Game Info Logos', () => {
  const state = createState()
  state.ratingBadge = {
    ...state.ratingBadge,
    layout: { ...state.ratingBadge.layout, enabled: true },
  }
  state.metadata = {
    ...state.metadata,
    ratingSystem: 'ESRB',
    ratingValue: 'T',
  }

  assert.deepEqual(
    getSlotIds(state),
    CLASSIC_SLOT_ORDER.filter((slotId) => slotId !== RATING_SLOT_ID),
  )
})

test('enabled developer or publisher assets suppress only Company Logos', () => {
  for (const logoKey of ['developer', 'publisher'] as const) {
    const state = createState()

    if (logoKey === 'developer') {
      state.logoAssets.developerLogoDataUrl = 'data:image/png;base64,developer'
      state.logoAssets.developerLogoLayout.enabled = true
    } else {
      state.logoAssets.publisherLogoDataUrl = 'data:image/png;base64,publisher'
      state.logoAssets.publisherLogoLayout.enabled = true
    }

    assert.deepEqual(
      getSlotIds(state),
      CLASSIC_SLOT_ORDER.filter((slotId) => slotId !== COMPANY_SLOT_ID),
    )
  }
})

test('meaningful enabled copyright suppresses only Legal Info', () => {
  const state = createState()
  state.discText.settings.copyright = true
  state.discText.valueSources.copyright = 'manual'
  state.discText.values.copyright = 'Copyright 2026'

  assert.deepEqual(
    getSlotIds(state),
    CLASSIC_SLOT_ORDER.filter((slotId) => slotId !== LEGAL_SLOT_ID),
  )
})

test('no active layout and missing slot layout produce no view model', () => {
  assert.deepEqual(createDiscGuidedPlaceholderViewModels({
    activeLayoutId: null,
    state: createState(),
    suggestions: NO_SUGGESTIONS,
    skippedSlotIds: NO_SKIPPED_SLOTS,
  }), [])
  assert.equal(projectDiscGuidedPlaceholderViewModel({
    layoutSlot: null,
    lifecycle: 'unfilled',
  }), null)
})

test('filled and skipped lifecycle never project while suggested remains explicit', () => {
  const layoutSlot = getDiscGuidedLayoutSlotDefinition(
    CLASSIC_LAYOUT_ID,
    TITLE_SLOT_ID,
  )
  assert.ok(layoutSlot)

  assert.equal(projectDiscGuidedPlaceholderViewModel({
    layoutSlot,
    lifecycle: 'filled',
  }), null)
  assert.equal(projectDiscGuidedPlaceholderViewModel({
    layoutSlot,
    lifecycle: 'skipped',
  }), null)
  assert.equal(projectDiscGuidedPlaceholderViewModel({
    layoutSlot,
    lifecycle: 'suggested',
  })?.lifecycle, 'suggested')
})

test('normalized geometry is deterministic and contains no viewport pixels', () => {
  const geometry: DiscGuidedRectGeometry = {
    kind: 'rect',
    centerXPercent: 42,
    centerYPercent: 18,
    widthPercent: 50,
    heightPercent: 12,
    rotationDegrees: 7,
  }
  const layoutSlot = {
    slotId: TITLE_SLOT_ID,
    label: 'Game Title',
    visualGeometry: geometry,
    actionGeometry: geometry,
    visualLayer: 'foreground' as const,
    setupKind: 'game-title-choice' as const,
    populationSource: 'existing-steam-import' as const,
  }
  const first = projectDiscGuidedPlaceholderViewModel({
    layoutSlot,
    lifecycle: 'unfilled',
  })
  const second = projectDiscGuidedPlaceholderViewModel({
    layoutSlot,
    lifecycle: 'unfilled',
  })

  assert.deepEqual(first, second)
  assert.equal(first?.visualGeometry, geometry)
  assert.equal(JSON.stringify(first).includes('px'), false)
})

test('view-model source contains no UI, persistence, export, renderer, Case Insert, or navigation behavior', () => {
  const source = readFileSync(
    new URL('./discGuidedPlaceholderViewModel.ts', import.meta.url),
    'utf8',
  )

  for (const forbidden of [
    'react',
    'onClick',
    'roleFocus',
    'export/',
    'render/',
    'caseInsert',
    'projectSchema',
    'snapshot',
    'restoreProject',
    'localStorage',
    'sessionStorage',
    'autoFill',
  ]) {
    assert.equal(source.includes(forbidden), false, `unexpected source: ${forbidden}`)
  }
})
