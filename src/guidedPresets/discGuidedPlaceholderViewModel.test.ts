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
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import {
  applyDiscPresetResolvedSlotPatches,
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
import {
  getDiscGuidedLayoutSlotDefinition,
} from './discGuidedLayouts.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import {
  createDiscGuidedPlaceholderViewModels,
  projectDiscGuidedPlaceholderViewModel,
} from './discGuidedPlaceholderViewModel.ts'
import type {
  DiscGuidedSlotId,
  DiscGuidedSlotState,
  DiscGuidedSlotSuggestion,
} from './discGuidedSlots.ts'

const LAYOUT_ID = 'disc:guided-layout:classic-top-title'
const SLOT_ORDER = [
  'disc:guided:game-title:primary',
  'disc:guided:background-image:primary',
  'disc:guided:rating-badge:primary',
  'disc:guided:media-format-mark:primary',
  'disc:guided:operating-system-marks:group',
  'disc:guided:developer-logo:primary',
  'disc:guided:publisher-logo:primary',
  'disc:guided:legal-text:copyright',
] as const satisfies readonly DiscGuidedSlotId[]
const RESOLUTION = resolveDiscPresetDefinition({
  definition: CLASSIC_TOP_TITLE_DISC_PRESET,
  template: createDiscPresetTemplateResolutionInput(
    discTemplates.standardPrintableDisc,
  ),
})
assert.notEqual(RESOLUTION.status, 'rejected')
const RESOLVED_PRESET = RESOLUTION.preset!

function createState(): DiscGuidedSlotState {
  const ratingBadge = createDefaultProjectRatingBadge()
  const mediaMark = createDefaultProjectMediaMark()
  return {
    background: { enabled: false, imageDataUrl: null, imageSize: null },
    titleArtwork: createDefaultProjectTitleArtwork(),
    metadata: createDefaultProjectMetadata(),
    ratingBadge: { ...ratingBadge, layout: { ...ratingBadge.layout, enabled: false } },
    mediaMark: { ...mediaMark, layout: { ...mediaMark.layout } },
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

function project(
  state = createState(),
  suggestions: readonly DiscGuidedSlotSuggestion[] = [],
  resolvedPreset = RESOLVED_PRESET,
) {
  return createDiscGuidedPlaceholderViewModels({
    resolvedPreset,
    state,
    suggestions,
    skippedSlotIds: new Set(),
  })
}

test('blank Classic projects eight exact placeholders in product order', () => {
  const placeholders = project()
  assert.deepEqual(placeholders.map(({ slotId }) => slotId), SLOT_ORDER)
  assert.deepEqual(placeholders.map(({ label }) => label), [
    'Game Title',
    'Background Image',
    'Rating Badge',
    'Media Format Mark',
    'Operating System Marks',
    'Developer Logo',
    'Publisher Logo',
    'Copyright / Legal Text',
  ])
  assert.deepEqual(placeholders.map(({ setupKind }) => setupKind), [
    'game-title-choice',
    'background',
    'rating-badge',
    'media-format-mark',
    'operating-system-marks',
    'developer-logo',
    'publisher-logo',
    'legal-text',
  ])
  assert.ok(placeholders.every(({ lifecycle }) => lifecycle === 'unfilled'))
  assert.equal(placeholders.filter(({ visualLayer }) => visualLayer === 'background').length, 1)
})

test('view models use exact registry visual and action geometry', () => {
  for (const placeholder of project()) {
    const slot = getDiscGuidedLayoutSlotDefinition(LAYOUT_ID, placeholder.slotId)
    assert.ok(slot)
    assert.deepEqual(placeholder.visualGeometry, slot.visualGeometry)
    assert.deepEqual(placeholder.actionGeometry, slot.actionGeometry)
  }
})

test('filling one exact owner removes only its placeholder', () => {
  const state = createState()
  state.mediaMark.layout.enabled = true

  assert.deepEqual(project(state).map(({ slotId }) => slotId),
    SLOT_ORDER.filter((slotId) => slotId !== 'disc:guided:media-format-mark:primary'))
})

test('an exact suggestion changes only its own lifecycle', () => {
  const suggestion: DiscGuidedSlotSuggestion = {
    id: 'suggestion:publisher',
    slotId: 'disc:guided:publisher-logo:primary',
    contentKind: 'image',
    sourceKind: 'external',
  }
  const placeholders = project(createState(), [suggestion])

  assert.equal(placeholders.find(({ slotId }) => slotId === suggestion.slotId)?.lifecycle, 'suggested')
  assert.ok(placeholders.every(({ slotId, lifecycle }) =>
    slotId === suggestion.slotId || lifecycle === 'unfilled'))
})

test('filled and skipped slots never project editor guidance', () => {
  const layoutSlot = getDiscGuidedLayoutSlotDefinition(LAYOUT_ID, SLOT_ORDER[0])
  assert.ok(layoutSlot)
  assert.equal(projectDiscGuidedPlaceholderViewModel({ layoutSlot, lifecycle: 'filled' }), null)
  assert.equal(projectDiscGuidedPlaceholderViewModel({ layoutSlot, lifecycle: 'skipped' }), null)
})

test('unfilled Legal guidance uses final resolved geometry and filled Legal hides it', () => {
  const refinedRegion = {
    centerXPercent: 50,
    centerYPercent: 84,
    widthPercent: 44,
    heightPercent: 7,
  }
  const refinedPreset = applyDiscPresetResolvedSlotPatches(
    RESOLVED_PRESET,
    [{
      slotId: 'disc:guided:legal-text:copyright',
      resolvedContentRegion: refinedRegion,
      resolvedActionRegion: refinedRegion,
      status: 'adjusted',
    }],
  )
  const unfilled = project(createState(), [], refinedPreset).find(
    ({ slotId }) => slotId === 'disc:guided:legal-text:copyright',
  )
  assert.deepEqual(unfilled?.visualGeometry, {
    kind: 'rect',
    ...refinedRegion,
  })
  assert.equal(unfilled?.resolutionStatus, 'adjusted')

  const filledState = createState()
  filledState.discText.settings.copyright = true
  filledState.discText.values.copyright = 'Copyright content'
  assert.equal(
    project(filledState, [], refinedPreset).some(
      ({ slotId }) => slotId === 'disc:guided:legal-text:copyright',
    ),
    false,
  )

  filledState.discText.values.copyright = ''
  assert.equal(
    project(filledState, [], refinedPreset).some(
      ({ slotId }) => slotId === 'disc:guided:legal-text:copyright',
    ),
    true,
  )
})

test('unsupported Legal resolution never promises an invalid destination', () => {
  const unsupportedPreset = applyDiscPresetResolvedSlotPatches(
    RESOLVED_PRESET,
    [{
      slotId: 'disc:guided:legal-text:copyright',
      status: 'unsupported',
    }],
  )

  assert.equal(
    project(createState(), [], unsupportedPreset).some(
      ({ slotId }) => slotId === 'disc:guided:legal-text:copyright',
    ),
    false,
  )
})

test('projection keeps broad role setup vocabulary out of the model', () => {
  const source = readFileSync(new URL('./discGuidedPlaceholderViewModel.ts', import.meta.url), 'utf8')
  const layouts = readFileSync(new URL('./discGuidedLayouts.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(`${source}\n${layouts}`, /company-logo-choice|setupKind: 'rating'/)
  assert.doesNotMatch(`${source}\n${layouts}`, /Game Info Logos|Company Logos/)
})
