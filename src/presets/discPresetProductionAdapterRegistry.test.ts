import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import type { DiscTextLayout } from '../discText/types.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import { CLASSIC_TOP_TITLE_DISC_PRESET } from './builtins/classicTopTitleDiscPreset.ts'
import { buildDiscPresetApplicationPlan } from './discPresetApplication.ts'
import {
  parseDiscPresetDefinition,
} from './discPresetDefinition.ts'
import type {
  DiscPresetOwnerStateCatalog,
} from './discPresetOwnerPlacement.ts'
import {
  DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
  IMPLEMENTED_DISC_PRESET_PLACEMENT_TARGETS,
} from './discPresetProductionAdapterRegistry.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from './discPresetResolution.ts'

const template = createDiscPresetTemplateResolutionInput(
  discTemplates.standardPrintableDisc,
)

const textLayout: DiscTextLayout = {
  x: 3,
  y: 4,
  width: 50,
  scale: 1,
  fontSizePt: 12,
  align: 'left',
  mode: 'curved',
  arcDegrees: 90,
  arcSide: 'top',
  avoidVisualElements: true,
}

const ownerState: DiscPresetOwnerStateCatalog = Object.freeze({
  'game-title.artwork': {
    layout: { enabled: false, x: 1, y: 2, scale: 1.1 },
  },
  'game-title.text': {
    key: 'title',
    enabled: false,
    layout: textLayout,
  },
  'background.primary': {
    enabled: false,
    imageDataUrl: null,
    imageSource: null,
    imageSize: null,
    scale: 1.3,
    offset: { x: 9, y: -5 },
  },
  'rating.primary': {
    layout: { enabled: false, x: 11, y: 12, scale: 1.2 },
  },
  'media-format.primary': {
    layout: { enabled: false, x: 21, y: 22, scale: 0.8 },
  },
  'developer-logo.primary': {
    logoKey: 'developer',
    layout: { enabled: false, x: 31, y: 32, scale: 0.7 },
  },
  'publisher-logo.primary': {
    logoKey: 'publisher',
    layout: { enabled: true, x: 41, y: 42, scale: 0.6 },
  },
  'legal.copyright': {
    key: 'copyright',
    enabled: false,
    layout: textLayout,
  },
})

test('production registry covers this chunk exactly and leaves OS explicit', () => {
  assert.deepEqual(
    DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY.listTargets(),
    IMPLEMENTED_DISC_PRESET_PLACEMENT_TARGETS,
  )
  assert.deepEqual(
    DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY.listMissingTargets(),
    ['operating-system-marks.enabled'],
  )
  assert.equal(
    DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY.has(
      'operating-system-marks.enabled',
    ),
    false,
  )
  assert.ok(Object.isFrozen(DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY))
  assert.ok(Object.isFrozen(IMPLEMENTED_DISC_PRESET_PLACEMENT_TARGETS))
})

test('Classic planning emits ordered typed updates while OS and Legal stay partial', () => {
  const resolution = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template,
  })
  const before = JSON.stringify(ownerState)
  const result = buildDiscPresetApplicationPlan({
    resolution,
    adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
    ownerState,
    template,
  })

  assert.equal(result.status, 'partial')
  assert.deepEqual(result.updates.map(({ target }) => target), [
    'game-title.artwork',
    'game-title.text',
    'background.primary',
    'rating.primary',
    'media-format.primary',
    'developer-logo.primary',
    'publisher-logo.primary',
    'legal.copyright',
  ])
  assert.deepEqual(result.updates.map(({ kind }) => kind), [
    'title-artwork-layout',
    'disc-text-layout',
    'background-layout',
    'rating-layout',
    'media-mark-layout',
    'primary-logo-layout',
    'primary-logo-layout',
    'disc-text-layout',
  ])
  assert.ok(result.warnings.some((warning) =>
    warning.kind === 'missing-placement-adapter' &&
    warning.target === 'operating-system-marks.enabled'))
  assert.ok(result.warnings.some((warning) =>
    warning.kind === 'content-measurement-required' &&
    warning.target === 'legal.copyright'))
  assert.equal(JSON.stringify(ownerState), before)
  assert.ok(result.updates.every(Object.isFrozen))
  assert.ok(result.updates.every(({ layout }) => Object.isFrozen(layout)))
})

test('an arbitrary validated preset uses the same rating adapter generically', () => {
  const parsed = parseDiscPresetDefinition({
    kind: 'sbls/disc-preset',
    formatVersion: 1,
    id: 'user:disc-preset:123e4567-e89b-42d3-a456-426614174000',
    revision: 1,
    name: 'Arbitrary lower-left rating',
    surface: 'disc',
    compatibility: {
      mode: 'any-disc-template',
      onConflict: 'resolve',
    },
    slots: [{
      id: 'disc:guided:rating-badge:primary',
      contentRegion: {
        centerXPercent: 27,
        centerYPercent: 71,
        widthPercent: 16,
        heightPercent: 12,
      },
      visualLayer: 'foreground',
      placements: [{
        kind: 'point',
        target: 'rating.primary',
        size: { mode: 'fixed-scale', scale: 0.55 },
      }],
    }],
  })
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return

  const result = buildDiscPresetApplicationPlan({
    resolution: resolveDiscPresetDefinition({
      definition: parsed.value,
      template,
    }),
    adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
    ownerState,
    template,
  })

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.updates, [{
    kind: 'rating-layout',
    slotId: 'disc:guided:rating-badge:primary',
    target: 'rating.primary',
    layout: { x: 27, y: 71, scale: 0.55 },
  }])
})

test('production modules do not route through the concrete registry yet', () => {
  const productionSources = [
    '../app/App.tsx',
    '../app/appDiscRolePresetApplication.ts',
    '../layout/discRolePresets.ts',
    '../guidedPresets/discGuidedLayouts.ts',
  ].map((path) =>
    readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')

  assert.doesNotMatch(
    productionSources,
    /discPresetProductionAdapterRegistry|DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY/,
  )
})

test('concrete adapters exclude side effects, dynamic paths, and UI/render owners', () => {
  const sources = [
    './adapters/discPointPresetAdapters.ts',
    './adapters/discTextPresetAdapters.ts',
    './adapters/discBackgroundPresetAdapter.ts',
    './discPresetOwnerPlacement.ts',
    './discPresetProductionAdapterRegistry.ts',
  ].map((path) =>
    readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')

  assert.doesNotMatch(
    sources,
    /from ['"]react|App\.tsx|components\/|document\.|window\.|projectSchema|createProjectSnapshot|restoreProject|renderer|exportPng|caseInsert|fetch\(|localStorage|sessionStorage|node:fs|@tauri-apps/i,
  )
  assert.doesNotMatch(
    sources,
    /statePath|project\.owner|lodash\.set|setIn\(|set[A-Z][A-Za-z]+\s*:/,
  )
})
