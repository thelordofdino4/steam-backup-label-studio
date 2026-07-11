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
import {
  DEFAULT_DISC_PROJECT_TITLE,
  createDefaultProjectMetadata,
} from '../project/projectMetadata.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
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

const NO_SKIPPED_SLOTS = new Set<DiscGuidedSlotId>()

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
  skippedSlotIds: ReadonlySet<DiscGuidedSlotId> = NO_SKIPPED_SLOTS,
) {
  return resolveDiscGuidedSlot({
    slotId,
    state,
    suggestions,
    skippedSlotIds,
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

test('defines the seven documented Disc guided slots in stable order', () => {
  assert.equal(DISC_GUIDED_SLOT_DEFINITIONS.length, 7)
  assert.deepEqual(
    DISC_GUIDED_SLOT_DEFINITIONS.map((definition) => definition.id),
    DISC_GUIDED_SLOT_IDS,
  )
  assert.equal(new Set(DISC_GUIDED_SLOT_IDS).size, DISC_GUIDED_SLOT_IDS.length)
  assert.ok(DISC_GUIDED_SLOT_DEFINITIONS.every(
    (definition) => definition.surface === 'disc' && definition.skippable,
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
    getDiscGuidedSlotDefinition('disc:guided:rating:primary')?.role,
    'game-info-logos',
  )
  assert.equal(getDiscGuidedSlotDefinition('disc:guided:unknown'), undefined)
})

test('title artwork fills Game Title and wins over meaningful title text', () => {
  const state = createState()
  state.titleArtwork = {
    ...state.titleArtwork,
    imageDataUrl: 'data:image/png;base64,title-artwork',
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

test('Background requires enablement, an image URL, and active image readiness', () => {
  const state = createState()
  state.background.imageDataUrl = 'data:image/png;base64,background'

  assert.equal(
    resolve('disc:guided:background-image:primary', state).lifecycle,
    'unfilled',
  )

  state.background.imageSize = {
    width: 1200,
    height: 1200,
    contentBounds: { x: 0, y: 0, width: 0, height: 0 },
  }
  assert.equal(
    resolve('disc:guided:background-image:primary', state).lifecycle,
    'unfilled',
  )

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

  assert.deepEqual(resolve('disc:guided:rating:primary', state).binding, {
    owner: 'ratingBadge',
    badgeKey: 'primary',
  })

  state.metadata.ratingSystem = 'none'
  assert.equal(resolve('disc:guided:rating:primary', state).lifecycle, 'unfilled')

  const suggestion = createSuggestion('disc:guided:rating:primary', 'domain-mark')
  assert.equal(
    resolve('disc:guided:rating:primary', state, [suggestion]).lifecycle,
    'suggested',
  )
})

test('Company Logo prefers a real enabled developer image, then publisher', () => {
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

  assert.deepEqual(resolve('disc:guided:company-logo:primary', state).binding, {
    owner: 'logoAssets',
    logoKey: 'developer',
    scope: 'primary',
  })

  state.logoAssets.developerLogoLayout.enabled = false
  assert.deepEqual(resolve('disc:guided:company-logo:primary', state).binding, {
    owner: 'logoAssets',
    logoKey: 'publisher',
    scope: 'primary',
  })
})

test('Company Logo does not count missing images or generic renderer placeholders', () => {
  const state = createState()
  state.logoAssets.developerLogoLayout.enabled = true
  state.logoAssets.publisherLogoLayout.enabled = true

  assert.equal(
    resolve('disc:guided:company-logo:primary', state).lifecycle,
    'unfilled',
  )

  state.logoAssets.developerLogoDataUrl = 'data:image/png;base64,preserved'
  state.logoAssets.developerLogoLayout.enabled = false
  assert.equal(
    resolve('disc:guided:company-logo:primary', state).lifecycle,
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

test('explicit skip overrides filled state without mutating the owner', () => {
  const state = createState()
  state.background.imageDataUrl = 'data:image/png;base64,background'
  state.background.imageSize = { width: 1200, height: 1200 }
  const before = structuredClone(state)
  const skippedSlotIds = new Set<DiscGuidedSlotId>([
    'disc:guided:background-image:primary',
  ])

  const result = resolve(
    'disc:guided:background-image:primary',
    state,
    [],
    skippedSlotIds,
  )

  assert.equal(result.lifecycle, 'skipped')
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

test('batch resolution follows definition order', () => {
  const results = resolveDiscGuidedSlots({
    state: createState(),
    suggestions: [],
    skippedSlotIds: NO_SKIPPED_SLOTS,
  })

  assert.deepEqual(
    results.map((result) => result.definition.id),
    DISC_GUIDED_SLOT_IDS,
  )
})

test('resolution is pure for frozen state, suggestions, and skip input', () => {
  const state = deepFreeze(createState())
  const suggestions = deepFreeze([
    createSuggestion('disc:guided:rating:primary', 'domain-mark'),
  ])
  const skippedSlotIds = Object.freeze(new Set<DiscGuidedSlotId>())
  const stateBefore = structuredClone(state)
  const suggestionsBefore = structuredClone(suggestions)

  resolveDiscGuidedSlots({ state, suggestions, skippedSlotIds })

  assert.deepEqual(state, stateBefore)
  assert.deepEqual(suggestions, suggestionsBefore)
  assert.equal(skippedSlotIds.size, 0)
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
