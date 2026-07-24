import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextValueSources } from '../project/metadataDiscText.ts'
import {
  addAdditionalArtworkElement,
  createDefaultProjectAdditionalArtwork,
} from '../project/projectAdditionalArtwork.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import {
  DEFAULT_DISC_PROJECT_TITLE,
  createDefaultProjectMetadata,
} from '../project/projectMetadata.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectPlatformMarks,
  updatePlatformMarkToggle,
} from '../project/projectPlatformMarks.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import type { ProjectAdditionalArtworkElement } from '../project/projectTypes.ts'
import {
  DISC_GUIDED_SLOT_DEFINITIONS,
  DISC_GUIDED_SLOT_IDS,
  getDiscGuidedSlotDefinition,
  resolveDiscGuidedSlot,
  resolveDiscGuidedSlots,
  type DiscGuidedSlotId,
  type DiscGuidedSlotState,
  type DiscGuidedSlotSuggestion,
  type GuidedContentKind,
} from './discGuidedSlots.ts'

const NO_OMITTED_SLOTS = new Set<DiscGuidedSlotId>()

function createState(): DiscGuidedSlotState {
  return {
    background: {
      enabled: true,
      imageDataUrl: null,
      imageSize: null,
    },
    titleArtwork: createDefaultProjectTitleArtwork(),
    metadata: createDefaultProjectMetadata(),
    ratingBadge: createDefaultProjectRatingBadge(),
    mediaMark: createDefaultProjectMediaMark(),
    platformMarks: createDefaultProjectPlatformMarks(),
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

function createSuggestion(
  slotId: DiscGuidedSlotId,
  contentKind: GuidedContentKind,
): DiscGuidedSlotSuggestion {
  return {
    id: `suggestion:${slotId}:${contentKind}`,
    slotId,
    contentKind,
    sourceKind: 'external',
  }
}

function resolve(
  slotId: DiscGuidedSlotId,
  state = createState(),
  suggestions: readonly DiscGuidedSlotSuggestion[] = [],
  omittedSlotIds: ReadonlySet<DiscGuidedSlotId> = NO_OMITTED_SLOTS,
) {
  return resolveDiscGuidedSlot({
    slotId,
    state,
    suggestions,
    omittedSlotIds,
  })
}

function createRenderableAdditionalArtworkElement(
  id: string,
): ProjectAdditionalArtworkElement {
  const additionalArtwork = addAdditionalArtworkElement(
    createDefaultProjectAdditionalArtwork(),
  )
  const element = additionalArtwork.elements[0]

  assert.ok(element)

  return {
    ...element,
    id,
    imageDataUrl: `data:image/png;base64,${id}`,
    layout: {
      ...element.layout,
      enabled: true,
    },
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)

    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue)
    }
  }

  return value
}

const PRIMARY_LOGO_IDS = {
  developer: 'disc:guided:developer-logo:primary',
  publisher: 'disc:guided:publisher-logo:primary',
} as const satisfies Record<string, DiscGuidedSlotId>

const CLASSIC_IDS = DISC_GUIDED_SLOT_IDS.slice(0, 8)

function filledIds(state: DiscGuidedSlotState) {
  return resolveDiscGuidedSlots({
    state,
    suggestions: [],
    omittedSlotIds: NO_OMITTED_SLOTS,
  }).filter(({ lifecycle }) => lifecycle === 'filled')
    .map(({ definition }) => definition.id)
}

function setDeveloperLogoEnabled(
  state: DiscGuidedSlotState,
  enabled: boolean,
) {
  state.logoAssets = {
    ...state.logoAssets,
    developerLogoLayout: {
      ...state.logoAssets.developerLogoLayout,
      enabled,
    },
  }
}

function setPublisherLogoEnabled(
  state: DiscGuidedSlotState,
  enabled: boolean,
) {
  state.logoAssets = {
    ...state.logoAssets,
    publisherLogoLayout: {
      ...state.logoAssets.publisherLogoLayout,
      enabled,
    },
  }
}

test('defines stable exact slots while retaining future flexible definitions', () => {
  assert.deepEqual(
    DISC_GUIDED_SLOT_DEFINITIONS.slice(0, 8).map(({ id }) => id),
    CLASSIC_IDS,
  )
  assert.deepEqual(DISC_GUIDED_SLOT_IDS.slice(8), [
    'disc:guided:additional-artwork:primary',
    'disc:guided:additional-text:custom-note',
  ])
  assert.equal(DISC_GUIDED_SLOT_IDS.includes('disc:guided:rating:primary' as DiscGuidedSlotId), false)
  assert.equal(DISC_GUIDED_SLOT_IDS.includes('disc:guided:company-logo:primary' as DiscGuidedSlotId), false)
})

test('defines the exact Disc guided slots in stable order', () => {
  assert.equal(DISC_GUIDED_SLOT_DEFINITIONS.length, 10)
  assert.deepEqual(
    DISC_GUIDED_SLOT_DEFINITIONS.map((definition) => definition.id),
    DISC_GUIDED_SLOT_IDS,
  )
  assert.equal(new Set(DISC_GUIDED_SLOT_IDS).size, DISC_GUIDED_SLOT_IDS.length)
  assert.ok(DISC_GUIDED_SLOT_DEFINITIONS.every(
    (definition) => definition.surface === 'disc' && definition.omittable,
  ))
  assert.deepEqual(
    DISC_GUIDED_SLOT_DEFINITIONS.map((definition) => ({
      role: definition.role,
      accepted: definition.acceptedContentKinds,
      preferred: definition.preferredContentKind,
      requirement: definition.requirement,
    })),
    [
      {
        role: 'game-title',
        accepted: ['image', 'text'],
        preferred: 'image',
        requirement: 'expected',
      },
      {
        role: 'background-artwork',
        accepted: ['image'],
        preferred: 'image',
        requirement: 'expected',
      },
      {
        role: 'game-info-logos',
        accepted: ['domain-mark', 'image'],
        preferred: 'domain-mark',
        requirement: 'optional',
      },
      {
        role: 'game-info-logos',
        accepted: ['domain-mark', 'image'],
        preferred: 'domain-mark',
        requirement: 'optional',
      },
      {
        role: 'game-info-logos',
        accepted: ['domain-mark', 'image'],
        preferred: 'domain-mark',
        requirement: 'optional',
      },
      {
        role: 'company-logos',
        accepted: ['image'],
        preferred: 'image',
        requirement: 'optional',
      },
      {
        role: 'company-logos',
        accepted: ['image'],
        preferred: 'image',
        requirement: 'optional',
      },
      {
        role: 'legal-info',
        accepted: ['text'],
        preferred: 'text',
        requirement: 'optional',
      },
      {
        role: 'additional-artwork',
        accepted: ['image'],
        preferred: 'image',
        requirement: 'optional',
      },
      {
        role: 'additional-text',
        accepted: ['text'],
        preferred: 'text',
        requirement: 'optional',
      },
    ],
  )
})

test('definitions contain no presentation identifiers or populated geometry', () => {
  for (const definition of DISC_GUIDED_SLOT_DEFINITIONS) {
    assert.equal('domId' in definition, false)
    assert.equal('smokeId' in definition, false)
    assert.equal('reactRef' in definition, false)
    assert.equal('placeholderGeometry' in definition, false)
  }
})

test('looks up definitions by stable ID', () => {
  assert.equal(
    getDiscGuidedSlotDefinition('disc:guided:rating-badge:primary')?.role,
    'game-info-logos',
  )
  assert.equal(getDiscGuidedSlotDefinition('disc:guided:unknown'), undefined)
})

test('title artwork fills Game Title and wins over meaningful title text', () => {
  const state = createState()
  state.titleArtwork = {
    ...state.titleArtwork,
    imageDataUrl: 'data:image/png;base64,title-artwork',
    imageSize: { width: 800, height: 300 },
    layout: { ...state.titleArtwork.layout, enabled: true },
  }
  state.discText.settings.title = true
  state.discText.valueSources.title = 'manual'
  state.discText.titleValue = 'Meaningful title'

  const result = resolve('disc:guided:game-title:primary', state)

  assert.equal(result.lifecycle, 'filled')
  assert.deepEqual(result.binding, { owner: 'titleArtwork' })
})

test('meaningful manual title text fills when artwork is unavailable', () => {
  const state = createState()
  state.discText.settings.title = true
  state.discText.valueSources.title = 'manual'
  state.discText.titleValue = 'A Real Game'

  const result = resolve('disc:guided:game-title:primary', state)

  assert.equal(result.lifecycle, 'filled')
  assert.deepEqual(result.binding, { owner: 'discText', key: 'title' })
})

test('blank title text and untouched default title copy remain unfilled', () => {
  const blankState = createState()
  blankState.discText.settings.title = true
  blankState.discText.valueSources.title = 'manual'
  blankState.discText.titleValue = '   '

  assert.equal(
    resolve('disc:guided:game-title:primary', blankState).lifecycle,
    'unfilled',
  )

  const defaultState = createState()
  defaultState.discText.settings.title = true
  assert.equal(defaultState.metadata.title, DEFAULT_DISC_PROJECT_TITLE)

  assert.equal(
    resolve('disc:guided:game-title:primary', defaultState).lifecycle,
    'unfilled',
  )
})

test('user-authored and metadata-bound imported games titled Untitled fill Game Title', () => {
  const manualState = createState()
  manualState.discText.settings.title = true
  manualState.discText.valueSources.title = 'manual'
  manualState.discText.titleValue = 'Untitled'

  assert.equal(
    resolve('disc:guided:game-title:primary', manualState).lifecycle,
    'filled',
  )

  const importedState = createState()
  importedState.discText.settings.title = true
  importedState.metadata = {
    ...importedState.metadata,
    title: 'Untitled',
    steamAppId: '12345',
  }

  assert.equal(
    resolve('disc:guided:game-title:primary', importedState).lifecycle,
    'filled',
  )
})

test('Game Title resolves an accepted suggestion only without valid owner content', () => {
  const slotId = 'disc:guided:game-title:primary'
  const suggestion = createSuggestion(slotId, 'image')

  assert.equal(resolve(slotId, createState(), [suggestion]).lifecycle, 'suggested')

  const state = createState()
  state.discText.settings.title = true
  state.discText.valueSources.title = 'manual'
  state.discText.titleValue = 'Owner title'

  assert.equal(resolve(slotId, state, [suggestion]).lifecycle, 'filled')
})

test('Background requires both enablement and a real effective image', () => {
  const state = createState()
  state.background.imageDataUrl = 'data:image/png;base64,background'
  state.background.imageSize = { width: 1200, height: 1200 }

  assert.deepEqual(
    resolve('disc:guided:background-image:primary', state).binding,
    { owner: 'backgroundImage' },
  )

  state.background.imageDataUrl = null
  assert.equal(
    resolve('disc:guided:background-image:primary', state).lifecycle,
    'unfilled',
  )

  state.background.enabled = false
  state.background.imageDataUrl = 'data:image/png;base64,preserved'
  assert.equal(
    resolve('disc:guided:background-image:primary', state).lifecycle,
    'unfilled',
  )
})

test('Rating uses the existing badge validity predicate', () => {
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

  assert.deepEqual(resolve('disc:guided:rating-badge:primary', state).binding, {
    owner: 'ratingBadge',
    badgeKey: 'primary',
  })

  state.metadata.ratingSystem = 'none'
  assert.equal(
    resolve('disc:guided:rating-badge:primary', state).lifecycle,
    'unfilled',
  )

  const suggestion = createSuggestion(
    'disc:guided:rating-badge:primary',
    'domain-mark',
  )
  assert.equal(
    resolve('disc:guided:rating-badge:primary', state, [suggestion]).lifecycle,
    'suggested',
  )
})

test('Media and Operating System marks resolve independently', () => {
  const mediaState = createState()
  mediaState.mediaMark = {
    ...mediaState.mediaMark,
    layout: { ...mediaState.mediaMark.layout, enabled: true },
  }
  assert.deepEqual(
    resolve('disc:guided:media-format-mark:primary', mediaState).binding,
    { owner: 'mediaMark' },
  )
  assert.equal(
    resolve('disc:guided:operating-system-marks:group', mediaState).lifecycle,
    'unfilled',
  )

  const platformState = createState()
  platformState.platformMarks = updatePlatformMarkToggle(
    platformState.platformMarks,
    'windows',
    true,
  )
  assert.deepEqual(
    resolve('disc:guided:operating-system-marks:group', platformState).binding,
    { owner: 'platformMarks', selection: 'enabled-values' },
  )
  assert.equal(
    resolve('disc:guided:media-format-mark:primary', platformState).lifecycle,
    'unfilled',
  )
})

test('Developer and Publisher Logo slots resolve independently', () => {
  const state = createState()
  state.logoAssets = {
    ...state.logoAssets,
    developerLogoDataUrl: 'data:image/png;base64,developer',
    developerLogoLayout: {
      ...state.logoAssets.developerLogoLayout,
      enabled: true,
    },
    publisherLogoDataUrl: 'data:image/png;base64,publisher',
    publisherLogoLayout: {
      ...state.logoAssets.publisherLogoLayout,
      enabled: true,
    },
  }

  assert.deepEqual(resolve('disc:guided:developer-logo:primary', state).binding, {
    owner: 'logoAssets',
    logoKey: 'developer',
    scope: 'primary',
  })

  assert.deepEqual(resolve('disc:guided:publisher-logo:primary', state).binding, {
    owner: 'logoAssets',
    logoKey: 'publisher',
    scope: 'primary',
  })

  state.logoAssets.developerLogoLayout.enabled = false
  assert.equal(
    resolve('disc:guided:developer-logo:primary', state).lifecycle,
    'unfilled',
  )
  assert.equal(
    resolve('disc:guided:publisher-logo:primary', state).lifecycle,
    'filled',
  )
})

test('primary Developer lifecycle follows its feature-owned placeholder', () => {
  const state = createState()
  assert.equal(resolve(PRIMARY_LOGO_IDS.developer, state).lifecycle, 'unfilled')

  setDeveloperLogoEnabled(state, true)
  assert.equal(resolve(PRIMARY_LOGO_IDS.developer, state).lifecycle, 'filled')
  assert.equal(state.logoAssets.developerLogoDataUrl, null)

  state.logoAssets.developerLogoDataUrl = 'data:image/png;base64,developer'
  assert.equal(resolve(PRIMARY_LOGO_IDS.developer, state).lifecycle, 'filled')

  state.logoAssets.developerLogoDataUrl = null
  assert.equal(resolve(PRIMARY_LOGO_IDS.developer, state).lifecycle, 'filled')

  setDeveloperLogoEnabled(state, false)
  assert.equal(resolve(PRIMARY_LOGO_IDS.developer, state).lifecycle, 'unfilled')
})

test('primary Publisher lifecycle follows its feature-owned placeholder', () => {
  const state = createState()
  assert.equal(resolve(PRIMARY_LOGO_IDS.publisher, state).lifecycle, 'unfilled')

  setPublisherLogoEnabled(state, true)
  assert.equal(resolve(PRIMARY_LOGO_IDS.publisher, state).lifecycle, 'filled')
  assert.equal(state.logoAssets.publisherLogoDataUrl, null)

  state.logoAssets.publisherLogoDataUrl = 'data:image/png;base64,publisher'
  assert.equal(resolve(PRIMARY_LOGO_IDS.publisher, state).lifecycle, 'filled')

  state.logoAssets.publisherLogoDataUrl = null
  assert.equal(resolve(PRIMARY_LOGO_IDS.publisher, state).lifecycle, 'filled')

  setPublisherLogoEnabled(state, false)
  assert.equal(resolve(PRIMARY_LOGO_IDS.publisher, state).lifecycle, 'unfilled')
})

test('primary logo placeholder claims stay independent and immutable', () => {
  const state = createState()
  setDeveloperLogoEnabled(state, true)
  const beforeDeveloperResolution = structuredClone(state)

  assert.deepEqual(filledIds(state), [PRIMARY_LOGO_IDS.developer])
  assert.deepEqual(state, beforeDeveloperResolution)

  setPublisherLogoEnabled(state, true)
  const beforePublisherResolution = structuredClone(state)
  assert.deepEqual(filledIds(state), [
    PRIMARY_LOGO_IDS.developer,
    PRIMARY_LOGO_IDS.publisher,
  ])
  assert.deepEqual(state, beforePublisherResolution)

  setDeveloperLogoEnabled(state, false)
  assert.deepEqual(filledIds(state), [PRIMARY_LOGO_IDS.publisher])
  setPublisherLogoEnabled(state, false)
  assert.deepEqual(filledIds(state), [])
})

test('omission overrides primary logo placeholder claims without owner mutation', () => {
  const state = createState()
  setDeveloperLogoEnabled(state, true)
  setPublisherLogoEnabled(state, true)
  const before = structuredClone(state)

  for (const slotId of [
    PRIMARY_LOGO_IDS.developer,
    PRIMARY_LOGO_IDS.publisher,
  ]) {
    const resolution = resolveDiscGuidedSlot({
      slotId,
      state,
      suggestions: [],
      omittedSlotIds: new Set([slotId]),
    })
    assert.equal(resolution.lifecycle, 'omitted')
  }

  assert.deepEqual(state, before)
})

test('repeatable logo data never claims either primary logo slot', () => {
  const state = createState()
  const runtimeLogoAssets = state.logoAssets as typeof state.logoAssets & {
    additionalLogoElements: readonly unknown[]
  }
  runtimeLogoAssets.additionalLogoElements = [{
    id: 'additional-logo',
    enabled: true,
    imageDataUrl: 'data:image/png;base64,additional',
  }]

  assert.equal(
    resolve(PRIMARY_LOGO_IDS.developer, state).lifecycle,
    'unfilled',
  )
  assert.equal(
    resolve(PRIMARY_LOGO_IDS.publisher, state).lifecycle,
    'unfilled',
  )
})

test('Legal Text resolves plain, metadata-bound, and HTML-rendered content', () => {
  const plainState = createState()
  plainState.discText.settings.copyright = true
  plainState.discText.valueSources.copyright = 'manual'
  plainState.discText.values.copyright = 'Copyright 2026'
  assert.equal(
    resolve('disc:guided:legal-text:copyright', plainState).lifecycle,
    'filled',
  )

  const metadataState = createState()
  metadataState.discText.settings.copyright = true
  metadataState.metadata.copyrightText = 'Metadata legal text'
  assert.equal(
    resolve('disc:guided:legal-text:copyright', metadataState).lifecycle,
    'filled',
  )

  const htmlState = createState()
  htmlState.discText.settings.copyright = true
  htmlState.discText.htmlSources.copyright = '<p>Rendered <strong>legal</strong></p>'
  assert.equal(
    resolve('disc:guided:legal-text:copyright', htmlState).lifecycle,
    'filled',
  )

  htmlState.discText.htmlSources.copyright = '<p>   </p>'
  assert.equal(
    resolve('disc:guided:legal-text:copyright', htmlState).lifecycle,
    'unfilled',
  )

  htmlState.discText.settings.copyright = false
  htmlState.discText.htmlSources.copyright = '<p>Preserved</p>'
  assert.equal(
    resolve('disc:guided:legal-text:copyright', htmlState).lifecycle,
    'unfilled',
  )
})

test('Additional Artwork returns the first renderable element persisted ID', () => {
  const state = createState()
  const disabledElement = createRenderableAdditionalArtworkElement('disabled-id')
  disabledElement.layout.enabled = false
  const missingImageElement = createRenderableAdditionalArtworkElement('missing-id')
  missingImageElement.imageDataUrl = null
  const firstValidElement = createRenderableAdditionalArtworkElement('persisted-first')
  const secondValidElement = createRenderableAdditionalArtworkElement('persisted-second')
  state.additionalArtwork = {
    enabled: true,
    elements: [
      disabledElement,
      missingImageElement,
      firstValidElement,
      secondValidElement,
    ],
  }

  const result = resolve('disc:guided:additional-artwork:primary', state)

  assert.equal(result.lifecycle, 'filled')
  assert.deepEqual(result.binding, {
    owner: 'additionalArtwork',
    elementId: 'persisted-first',
  })
  assert.equal('index' in (result.binding ?? {}), false)

  state.additionalArtwork.enabled = false
  assert.equal(
    resolve('disc:guided:additional-artwork:primary', state).lifecycle,
    'unfilled',
  )
})

test('Additional Text requires enabled nonblank rendered custom-note content', () => {
  const state = createState()
  state.discText.settings.customNote = true
  state.discText.values.customNote = 'Callout'
  assert.equal(
    resolve('disc:guided:additional-text:custom-note', state).lifecycle,
    'filled',
  )

  state.discText.htmlSources.customNote = '<p><em>HTML callout</em></p>'
  state.discText.values.customNote = ''
  assert.equal(
    resolve('disc:guided:additional-text:custom-note', state).lifecycle,
    'filled',
  )

  state.discText.htmlSources.customNote = '<p> </p>'
  assert.equal(
    resolve('disc:guided:additional-text:custom-note', state).lifecycle,
    'unfilled',
  )

  state.discText.settings.customNote = false
  state.discText.values.customNote = 'Preserved but disabled'
  delete state.discText.htmlSources.customNote
  assert.equal(
    resolve('disc:guided:additional-text:custom-note', state).lifecycle,
    'unfilled',
  )
})

test('explicit omission overrides filled state without mutating the owner', () => {
  const state = createState()
  state.background.imageDataUrl = 'data:image/png;base64,background'
  state.background.imageSize = { width: 1200, height: 1200 }
  const before = structuredClone(state)
  const omittedSlotIds = new Set<DiscGuidedSlotId>([
    'disc:guided:background-image:primary',
  ])

  const result = resolve(
    'disc:guided:background-image:primary',
    state,
    [],
    omittedSlotIds,
  )

  assert.equal(result.lifecycle, 'omitted')
  assert.deepEqual(state, before)
})

test('filled, accepted suggestion, wrong-kind suggestion, and cleared content resolve deterministically', () => {
  const slotId = 'disc:guided:additional-text:custom-note'
  const acceptedSuggestion = createSuggestion(slotId, 'text')
  const wrongKindSuggestion = createSuggestion(slotId, 'image')
  const state = createState()

  assert.equal(resolve(slotId, state, [wrongKindSuggestion]).lifecycle, 'unfilled')
  assert.equal(resolve(slotId, state, [acceptedSuggestion]).lifecycle, 'suggested')

  state.discText.settings.customNote = true
  state.discText.values.customNote = 'Filled owner'
  assert.equal(resolve(slotId, state, [acceptedSuggestion]).lifecycle, 'filled')

  state.discText.values.customNote = ''
  assert.equal(resolve(slotId, state, [acceptedSuggestion]).lifecycle, 'suggested')
  assert.equal(resolve(slotId, state).lifecycle, 'unfilled')
})

test('presentation precedence preserves orthogonal omission, completion, owner, and suggestion flags', () => {
  const slotId = 'disc:guided:background-image:primary'
  const state = createState()
  state.background.imageDataUrl = 'data:image/png;base64,background'
  state.background.imageSize = { width: 1200, height: 1200 }
  const suggestion = createSuggestion(slotId, 'image')
  const omittedSlotIds = new Set<DiscGuidedSlotId>([slotId])
  const completedSlotIds = new Set<DiscGuidedSlotId>([slotId])

  const omitted = resolveDiscGuidedSlot({
    slotId,
    state,
    suggestions: [suggestion],
    omittedSlotIds,
    completedSlotIds,
  })

  assert.equal(omitted.lifecycle, 'omitted')
  assert.equal(omitted.presentation, 'omitted')
  assert.deepEqual(omitted.flags, {
    unsupported: false,
    omitted: true,
    completed: true,
    ownerFilled: true,
    suggested: true,
  })
  assert.deepEqual(omitted.binding, { owner: 'backgroundImage' })
  assert.equal(omitted.suggestion?.id, suggestion.id)

  const completed = resolveDiscGuidedSlot({
    slotId,
    state,
    suggestions: [suggestion],
    omittedSlotIds: NO_OMITTED_SLOTS,
    completedSlotIds,
  })
  assert.equal(completed.lifecycle, 'completed')
  assert.equal(completed.presentation, 'completed')
  assert.equal(completed.flags.ownerFilled, true)
  assert.equal(completed.flags.suggested, true)

  const unsupported = resolveDiscGuidedSlot({
    slotId,
    state,
    suggestions: [suggestion],
    omittedSlotIds,
    completedSlotIds,
    unsupported: true,
  })
  assert.equal(unsupported.lifecycle, 'unsupported')
  assert.equal(unsupported.presentation, 'unsupported')
  assert.deepEqual(unsupported.flags, {
    unsupported: true,
    omitted: true,
    completed: true,
    ownerFilled: true,
    suggested: true,
  })
})

test('completed presentation hides an otherwise available or suggested guide', () => {
  const slotId = 'disc:guided:background-image:primary'
  const completedSlotIds = new Set<DiscGuidedSlotId>([slotId])
  const suggestion = createSuggestion(slotId, 'image')

  const completedAvailable = resolveDiscGuidedSlot({
    slotId,
    state: createState(),
    suggestions: [],
    omittedSlotIds: NO_OMITTED_SLOTS,
    completedSlotIds,
  })
  assert.equal(completedAvailable.lifecycle, 'completed')
  assert.equal(completedAvailable.flags.ownerFilled, false)
  assert.equal(completedAvailable.flags.suggested, false)

  const completedSuggested = resolveDiscGuidedSlot({
    slotId,
    state: createState(),
    suggestions: [suggestion],
    omittedSlotIds: NO_OMITTED_SLOTS,
    completedSlotIds,
  })
  assert.equal(completedSuggested.lifecycle, 'completed')
  assert.equal(completedSuggested.flags.suggested, true)
})

test('batch resolution follows definition order', () => {
  const results = resolveDiscGuidedSlots({
    state: createState(),
    suggestions: [],
    omittedSlotIds: NO_OMITTED_SLOTS,
  })

  assert.deepEqual(
    results.map((result) => result.definition.id),
    DISC_GUIDED_SLOT_IDS,
  )
})

test('resolution is pure for frozen state, suggestions, and omission input', () => {
  const state = deepFreeze(createState())
  const suggestions = deepFreeze([
    createSuggestion('disc:guided:rating-badge:primary', 'domain-mark'),
  ])
  const omittedSlotIds = Object.freeze(new Set<DiscGuidedSlotId>())
  const stateBefore = structuredClone(state)
  const suggestionsBefore = structuredClone(suggestions)

  resolveDiscGuidedSlots({ state, suggestions, omittedSlotIds })

  assert.deepEqual(state, stateBefore)
  assert.deepEqual(suggestions, suggestionsBefore)
  assert.equal(omittedSlotIds.size, 0)
})

test('source has no forbidden UI, renderer, export, schema, or Case Insert dependencies', () => {
  const source = readFileSync(
    new URL('./discGuidedSlots.ts', import.meta.url),
    'utf8',
  )
  const forbiddenImports = [
    'react',
    'App.tsx',
    'DiscPreview',
    'components/',
    'caseInsert',
    'createProjectSnapshot',
    'savedProjectNormalization',
    'restoreProject',
    'render/',
    'export/',
  ]

  for (const forbiddenImport of forbiddenImports) {
    assert.equal(
      source.includes(forbiddenImport),
      false,
      `unexpected dependency: ${forbiddenImport}`,
    )
  }
})

test('guided slot resolution stays transient and outside persistence renderers and imports', () => {
  const source = readFileSync(new URL('./discGuidedSlots.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /savedProject|restoreProject|caseInsert|network|fetch\(/i)
  assert.doesNotMatch(source, /\/render\//)

  const logoResolver = source.slice(
    source.indexOf('function resolveLogoBinding'),
    source.indexOf('function hasRenderableImageSource'),
  )
  assert.doesNotMatch(logoResolver, /LogoDataUrl|imageDataUrl|Boolean\(/)
})
