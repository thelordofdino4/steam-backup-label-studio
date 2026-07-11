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
  getDiscGuidedSlotGeometry,
  type DiscGuidedRectGeometry,
} from './discGuidedLayouts.ts'
import {
  createDiscGuidedPlaceholderViewModels,
  DISC_GAME_TITLE_GUIDED_SLOT_ID,
  projectDiscGameTitleGuidedPlaceholder,
} from './discGuidedPlaceholderViewModel.ts'
import type {
  DiscGuidedSlotId,
  DiscGuidedSlotState,
  DiscGuidedSlotSuggestion,
} from './discGuidedSlots.ts'

const CLASSIC_LAYOUT_ID = 'disc:guided-layout:classic-top-title'
const NO_SUGGESTIONS: readonly DiscGuidedSlotSuggestion[] = []
const NO_SKIPPED_SLOTS = new Set<DiscGuidedSlotId>()

function createState(): DiscGuidedSlotState {
  return {
    background: { enabled: true, imageDataUrl: null },
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

test('unfilled Game Title projects the immutable registry geometry', () => {
  const placeholders = createPlaceholders()
  const geometry = getDiscGuidedSlotGeometry(
    CLASSIC_LAYOUT_ID,
    DISC_GAME_TITLE_GUIDED_SLOT_ID,
  )

  assert.equal(placeholders.length, 1)
  assert.deepEqual(placeholders[0], {
    slotId: DISC_GAME_TITLE_GUIDED_SLOT_ID,
    label: 'Game Title',
    geometry,
  })
  assert.equal(placeholders[0]?.geometry, geometry)
  assert.equal(Object.isFrozen(placeholders), true)
  assert.equal(Object.isFrozen(placeholders[0]), true)
})

test('valid title artwork and meaningful title text suppress the placeholder', () => {
  const artworkState = createState()
  artworkState.titleArtwork = {
    ...artworkState.titleArtwork,
    imageDataUrl: 'data:image/png;base64,title',
    layout: { ...artworkState.titleArtwork.layout, enabled: true },
  }
  assert.deepEqual(createPlaceholders(artworkState), [])

  const textState = createState()
  textState.discText.settings.title = true
  textState.discText.valueSources.title = 'manual'
  textState.discText.titleValue = 'A Real Game'
  assert.deepEqual(createPlaceholders(textState), [])
})

test('untouched default title stays visible but authored or imported Untitled counts', () => {
  const untouchedState = createState()
  untouchedState.discText.settings.title = true
  assert.equal(createPlaceholders(untouchedState).length, 1)

  const authoredState = createState()
  authoredState.discText.settings.title = true
  authoredState.discText.valueSources.title = 'manual'
  authoredState.discText.titleValue = 'Untitled'
  assert.deepEqual(createPlaceholders(authoredState), [])

  const importedState = createState()
  importedState.discText.settings.title = true
  importedState.metadata = {
    ...importedState.metadata,
    title: 'Untitled',
    steamAppId: '123',
  }
  assert.deepEqual(createPlaceholders(importedState), [])
})

test('suggested and skipped lifecycle states stay hidden', () => {
  const suggestion: DiscGuidedSlotSuggestion = {
    id: 'suggestion:title',
    slotId: DISC_GAME_TITLE_GUIDED_SLOT_ID,
    contentKind: 'image',
    sourceKind: 'external',
  }

  assert.deepEqual(createPlaceholders(createState(), [suggestion]), [])
  assert.deepEqual(
    createPlaceholders(createState(), NO_SUGGESTIONS, new Set([
      DISC_GAME_TITLE_GUIDED_SLOT_ID,
    ])),
    [],
  )
})

test('no active layout and missing geometry project no placeholder', () => {
  assert.deepEqual(createDiscGuidedPlaceholderViewModels({
    activeLayoutId: null,
    state: createState(),
    suggestions: NO_SUGGESTIONS,
    skippedSlotIds: NO_SKIPPED_SLOTS,
  }), [])
  assert.deepEqual(projectDiscGameTitleGuidedPlaceholder({
    geometry: null,
    lifecycle: 'unfilled',
  }), [])
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
  const first = projectDiscGameTitleGuidedPlaceholder({
    geometry,
    lifecycle: 'unfilled',
  })
  const second = projectDiscGameTitleGuidedPlaceholder({
    geometry,
    lifecycle: 'unfilled',
  })

  assert.deepEqual(first, second)
  assert.equal(first[0]?.geometry, geometry)
  assert.equal(JSON.stringify(first).includes('px'), false)
})

test('view-model source contains no UI, persistence, export, or navigation behavior', () => {
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
