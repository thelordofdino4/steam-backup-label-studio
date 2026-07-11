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
import {
  DEFAULT_DISC_PROJECT_TITLE,
  createDefaultProjectMetadata,
} from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarkAsset,
  createDefaultProjectPlatformMarks,
} from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import {
  DISC_GUIDED_SLOT_DEFINITIONS,
  DISC_GUIDED_SLOT_IDS,
  getDiscGuidedSlotDefinition,
  resolveDiscGuidedSlot,
  resolveDiscGuidedSlots,
  type DiscGuidedSlotId,
  type DiscGuidedSlotState,
  type DiscGuidedSlotSuggestion,
} from './discGuidedSlots.ts'

const IDS = {
  title: 'disc:guided:game-title:primary',
  background: 'disc:guided:background-image:primary',
  rating: 'disc:guided:rating-badge:primary',
  media: 'disc:guided:media-format-mark:primary',
  operatingSystems: 'disc:guided:operating-system-marks:group',
  developer: 'disc:guided:developer-logo:primary',
  publisher: 'disc:guided:publisher-logo:primary',
  legal: 'disc:guided:legal-text:copyright',
} as const satisfies Record<string, DiscGuidedSlotId>

const CLASSIC_IDS = Object.values(IDS)

function createState(): DiscGuidedSlotState {
  const ratingBadge = createDefaultProjectRatingBadge()
  const mediaMark = createDefaultProjectMediaMark()

  return {
    background: { enabled: false, imageDataUrl: null, imageSize: null },
    titleArtwork: createDefaultProjectTitleArtwork(),
    metadata: createDefaultProjectMetadata(),
    ratingBadge: {
      ...ratingBadge,
      layout: { ...ratingBadge.layout, enabled: false },
    },
    mediaMark: {
      ...mediaMark,
      layout: { ...mediaMark.layout },
    },
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

function resolve(slotId: DiscGuidedSlotId, state: DiscGuidedSlotState) {
  return resolveDiscGuidedSlot({
    slotId,
    state,
    suggestions: [],
    skippedSlotIds: new Set(),
  })
}

function filledIds(state: DiscGuidedSlotState) {
  return resolveDiscGuidedSlots({
    state,
    suggestions: [],
    skippedSlotIds: new Set(),
  }).filter(({ lifecycle }) => lifecycle === 'filled')
    .map(({ definition }) => definition.id)
}

test('defines stable exact slots while retaining future flexible definitions', () => {
  assert.deepEqual(DISC_GUIDED_SLOT_IDS.slice(0, 8), CLASSIC_IDS)
  assert.deepEqual(DISC_GUIDED_SLOT_DEFINITIONS.slice(0, 8).map(({ id }) => id), CLASSIC_IDS)
  assert.deepEqual(DISC_GUIDED_SLOT_IDS.slice(8), [
    'disc:guided:additional-artwork:primary',
    'disc:guided:additional-text:custom-note',
  ])
  assert.equal(DISC_GUIDED_SLOT_IDS.includes('disc:guided:rating:primary' as DiscGuidedSlotId), false)
  assert.equal(DISC_GUIDED_SLOT_IDS.includes('disc:guided:company-logo:primary' as DiscGuidedSlotId), false)
})

test('maps each exact slot to its independent semantic owner', () => {
  assert.deepEqual(CLASSIC_IDS.map((id) => {
    const definition = getDiscGuidedSlotDefinition(id)
    return {
      id,
      role: definition?.role,
      accepted: definition?.acceptedContentKinds,
      preferred: definition?.preferredContentKind,
      bindings: definition?.candidateBindings,
    }
  }), [
    { id: IDS.title, role: 'game-title', accepted: ['image', 'text'], preferred: 'image', bindings: [{ owner: 'titleArtwork' }, { owner: 'discText', key: 'title' }] },
    { id: IDS.background, role: 'background-artwork', accepted: ['image'], preferred: 'image', bindings: [{ owner: 'backgroundImage' }] },
    { id: IDS.rating, role: 'game-info-logos', accepted: ['domain-mark', 'image'], preferred: 'domain-mark', bindings: [{ owner: 'ratingBadge', badgeKey: 'primary' }] },
    { id: IDS.media, role: 'game-info-logos', accepted: ['domain-mark', 'image'], preferred: 'domain-mark', bindings: [{ owner: 'mediaMark' }] },
    { id: IDS.operatingSystems, role: 'game-info-logos', accepted: ['domain-mark', 'image'], preferred: 'domain-mark', bindings: [{ owner: 'platformMarks', selection: 'enabled-values' }] },
    { id: IDS.developer, role: 'company-logos', accepted: ['image'], preferred: 'image', bindings: [{ owner: 'logoAssets', logoKey: 'developer', scope: 'primary' }] },
    { id: IDS.publisher, role: 'company-logos', accepted: ['image'], preferred: 'image', bindings: [{ owner: 'logoAssets', logoKey: 'publisher', scope: 'primary' }] },
    { id: IDS.legal, role: 'legal-info', accepted: ['text'], preferred: 'text', bindings: [{ owner: 'discText', key: 'copyright' }] },
  ])
})

test('a focused blank state leaves all eight exact slots unfilled', () => {
  const state = createState()
  state.discText.values.title = DEFAULT_DISC_PROJECT_TITLE
  state.metadata.title = DEFAULT_DISC_PROJECT_TITLE

  assert.deepEqual(
    CLASSIC_IDS.map((id) => resolve(id, state).lifecycle),
    Array(8).fill('unfilled'),
  )
})

test('title and background fill only their exact slots', () => {
  const titleState = createState()
  titleState.titleArtwork = {
    ...titleState.titleArtwork,
    imageDataUrl: 'data:image/png;base64,title',
    imageSize: { width: 800, height: 300 },
    layout: { ...titleState.titleArtwork.layout, enabled: true },
  }
  assert.deepEqual(filledIds(titleState), [IDS.title])

  const backgroundState = createState()
  backgroundState.background = {
    enabled: true,
    imageDataUrl: 'data:image/png;base64,background',
    imageSize: { width: 1920, height: 1080 },
  }
  assert.deepEqual(filledIds(backgroundState), [IDS.background])

  backgroundState.background.imageSize = { width: 0, height: 1080 }
  assert.deepEqual(filledIds(backgroundState), [])
})

test('rating media and operating-system marks resolve independently', () => {
  const ratingState = createState()
  ratingState.metadata.ratingSystem = 'ESRB'
  ratingState.ratingBadge.layout.enabled = true
  assert.deepEqual(filledIds(ratingState), [IDS.rating])

  const mediaState = createState()
  mediaState.mediaMark.layout.enabled = true
  assert.deepEqual(filledIds(mediaState), [IDS.media])

  const osState = createState()
  osState.platformMarks = {
    ...osState.platformMarks,
    values: ['windows'],
    assets: {
      windows: (() => {
        const asset = createDefaultProjectPlatformMarkAsset('windows')
        return { ...asset, layout: { ...asset.layout } }
      })(),
    },
  }
  assert.deepEqual(filledIds(osState), [IDS.operatingSystems])

  osState.platformMarks.assets.windows!.layout.enabled = false
  assert.deepEqual(filledIds(osState), [])
})

test('developer and publisher logos resolve independently', () => {
  const developerState = createState()
  developerState.logoAssets.developerLogoDataUrl = 'data:image/png;base64,developer'
  developerState.logoAssets.developerLogoLayout.enabled = true
  assert.deepEqual(filledIds(developerState), [IDS.developer])

  const publisherState = createState()
  publisherState.logoAssets.publisherLogoDataUrl = 'data:image/png;base64,publisher'
  publisherState.logoAssets.publisherLogoLayout.enabled = true
  assert.deepEqual(filledIds(publisherState), [IDS.publisher])
})

test('copyright resolves plain metadata and HTML content only for Legal', () => {
  const plainState = createState()
  plainState.discText.settings.copyright = true
  plainState.discText.values.copyright = 'Copyright Valve Corporation.'
  plainState.discText.valueSources.copyright = 'manual'
  assert.deepEqual(filledIds(plainState), [IDS.legal])

  const metadataState = createState()
  metadataState.discText.settings.copyright = true
  metadataState.metadata.copyrightText = 'Copyright from metadata.'
  assert.deepEqual(filledIds(metadataState), [IDS.legal])

  const htmlState = createState()
  htmlState.discText.settings.copyright = true
  htmlState.discText.htmlSources.copyright =
    '<p><strong>Copyright from HTML.</strong></p>'
  assert.deepEqual(filledIds(htmlState), [IDS.legal])
})

test('suggestions remain exact-slot-specific', () => {
  const suggestion: DiscGuidedSlotSuggestion = {
    id: 'suggestion:media',
    slotId: IDS.media,
    contentKind: 'domain-mark',
    sourceKind: 'external',
  }
  const resolutions = resolveDiscGuidedSlots({
    state: createState(),
    suggestions: [suggestion],
    skippedSlotIds: new Set(),
  })

  assert.equal(resolutions.find(({ definition }) => definition.id === IDS.media)?.lifecycle, 'suggested')
  assert.ok(resolutions.filter(({ definition }) => CLASSIC_IDS.includes(definition.id)).every(({ definition, lifecycle }) =>
    definition.id === IDS.media || lifecycle === 'unfilled'))
})

test('guided slot domain stays transient and outside persistence renderers and imports', () => {
  const source = readFileSync(new URL('./discGuidedSlots.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /savedProject|restoreProject|caseInsert|network|fetch\(/i)
  assert.doesNotMatch(source, /\/render\//)
})
