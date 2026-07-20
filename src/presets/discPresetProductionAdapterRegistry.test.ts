import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import type { DiscTextLayout } from '../discText/types.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import {
  createDefaultProjectPlatformMarkAsset,
  createDefaultProjectPlatformMarks,
} from '../project/projectPlatformMarks.ts'
import type {
  PlatformMarkValue,
  ProjectPlatformMarks,
} from '../project/projectTypes.ts'
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
  type DiscPresetResolutionResult,
} from './discPresetResolution.ts'

const discTemplate = discTemplates.standardPrintableDisc
const template = createDiscPresetTemplateResolutionInput(discTemplate)

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
const legalStyle = createDefaultDiscTextStyles().copyright
const services = {
  textMeasurement: {
    measureText(text: string, font: string) {
      const fontSize = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 1)
      return Array.from(text).length * fontSize * 0.55
    },
  },
}

function createPlatformMarks(
  values: readonly PlatformMarkValue[],
): ProjectPlatformMarks {
  return {
    ...createDefaultProjectPlatformMarks(),
    values: [...values],
    assets: Object.fromEntries(values.map((value) => [
      value,
      {
        ...createDefaultProjectPlatformMarkAsset(value, discTemplate),
        layout: {
          ...createDefaultProjectPlatformMarkAsset(value, discTemplate).layout,
          enabled: true,
          scale: 1,
        },
      },
    ])),
  }
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
  'operating-system-marks.enabled': {
    platformMarks: createPlatformMarks(['windows', 'linux']),
    template: discTemplate,
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
    content: { plainText: '' },
    layout: textLayout,
    style: legalStyle,
    template: discTemplate,
  },
})

test('production registry covers every Classic placement target exactly once', () => {
  assert.deepEqual(
    DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY.listTargets(),
    IMPLEMENTED_DISC_PRESET_PLACEMENT_TARGETS,
  )
  assert.deepEqual(
    DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY.listMissingTargets(),
    [],
  )
  assert.equal(
    DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY.has(
      'operating-system-marks.enabled',
    ),
    true,
  )
  assert.ok(Object.isFrozen(DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY))
  assert.ok(Object.isFrozen(IMPLEMENTED_DISC_PRESET_PLACEMENT_TARGETS))
})

test('Classic planning includes typed OS updates and measured dormant Legal placement', () => {
  const resolution = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template,
  })
  const before = JSON.stringify(ownerState)
  const result = buildDiscPresetApplicationPlan({
    resolution,
    adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
    ownerState,
    services,
    template,
  })

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.updates.map(({ target }) => target), [
    'game-title.artwork',
    'game-title.text',
    'background.primary',
    'rating.primary',
    'media-format.primary',
    'operating-system-marks.enabled',
    'operating-system-marks.enabled',
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
    'platform-mark-layout',
    'platform-mark-layout',
    'primary-logo-layout',
    'primary-logo-layout',
    'disc-text-layout',
  ])
  assert.equal(result.warnings.some((warning) =>
    warning.kind === 'missing-placement-adapter'), false)
  assert.equal(result.warnings.some((warning) =>
    warning.kind === 'text-fit-impossible'), false)
  assert.equal(JSON.stringify(ownerState), before)
  assert.ok(result.updates.every(Object.isFrozen))
  assert.ok(result.updates.every(({ layout }) => Object.isFrozen(layout)))
})

test('an arbitrary validated group preset uses the OS adapter generically', () => {
  const parsed = parseDiscPresetDefinition({
    kind: 'sbls/disc-preset',
    formatVersion: 1,
    id: 'user:disc-preset:123e4567-e89b-42d3-a456-426614174001',
    revision: 1,
    name: 'Arbitrary upper OS group',
    surface: 'disc',
    compatibility: {
      mode: 'any-disc-template',
      onConflict: 'resolve',
    },
    slots: [{
      id: 'disc:guided:operating-system-marks:group',
      contentRegion: {
        centerXPercent: 50,
        centerYPercent: 28,
        widthPercent: 34,
        heightPercent: 12,
      },
      visualLayer: 'foreground',
      placements: [{
        kind: 'group',
        target: 'operating-system-marks.enabled',
        preferredScale: 0.6,
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
  const updates = result.updates.filter(
    (update) => update.kind === 'platform-mark-layout',
  )

  assert.equal(result.status, 'applied')
  assert.deepEqual(updates.map(({ markId }) => markId), [
    'windows',
    'linux',
  ])
  assert.ok(updates.every(({ layout }) =>
    layout.scale > 0 && layout.scale <= 0.6))
  assert.ok(updates.every(({ layout }) => layout.y === 28))
})

test('OS target rejects point, text, and background intent mismatches', () => {
  const resolution = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template,
  })
  assert.notEqual(resolution.status, 'rejected')
  if (resolution.status === 'rejected') return
  const osSlot = resolution.preset.slots.find(
    ({ id }) => id === 'disc:guided:operating-system-marks:group',
  )
  assert.ok(osSlot)

  const incompatiblePlacements = [
    {
      kind: 'point',
      target: 'operating-system-marks.enabled',
      size: { mode: 'fixed-scale', scale: 1 },
    },
    {
      kind: 'text',
      target: 'operating-system-marks.enabled',
      mode: 'straight',
      align: 'center',
      fit: 'region',
    },
    {
      kind: 'background',
      target: 'operating-system-marks.enabled',
      fit: 'cover',
      scale: 1,
    },
  ] as const

  for (const placement of incompatiblePlacements) {
    const incompatibleResolution = {
      status: 'resolved',
      preset: {
        ...resolution.preset,
        slots: [{
          ...osSlot,
          placements: [placement],
        }],
      },
      warnings: [],
    } as unknown as DiscPresetResolutionResult
    const result = buildDiscPresetApplicationPlan({
      resolution: incompatibleResolution,
      adapterRegistry: DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY,
      ownerState,
      template,
    })

    assert.equal(result.status, 'partial')
    assert.deepEqual(result.updates, [])
    assert.deepEqual(result.warnings, [{
      kind: 'intent-target-mismatch',
      slotId: 'disc:guided:operating-system-marks:group',
      target: 'operating-system-marks.enabled',
      intentKind: placement.kind,
    }])
  }
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

test('focused app wrapper exclusively owns the production adapter registry', () => {
  const registeredApplicationSource = readFileSync(
    new URL(
      '../app/appRegisteredDiscPresetApplication.ts',
      import.meta.url,
    ),
    'utf8',
  )
  const appSource = readFileSync(
    new URL('../app/App.tsx', import.meta.url),
    'utf8',
  )
  const genericEngineSources = [
    './discPresetApplication.ts',
    './discPresetTargetedApplication.ts',
  ].map((path) =>
    readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')
  const legacyRolePresetSources = [
    '../app/appDiscRolePresetApplication.ts',
    '../layout/discRolePresets.ts',
  ].map((path) =>
    readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')
  const guidedSources = [
    '../guidedPresets/discGuidedLayouts.ts',
    '../guidedPresets/discGuidedPlaceholderViewModel.ts',
  ].map((path) =>
    readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')
  const definitionSource = readFileSync(
    new URL('./discPresetDefinition.ts', import.meta.url),
    'utf8',
  )
  const concreteRegistryPattern =
    /discPresetProductionAdapterRegistry|DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY/
  const registryConstructionPattern =
    /createDiscPresetPlacementAdapterRegistry|DISC_PRESET_PRODUCTION_ADAPTERS/

  assert.match(registeredApplicationSource, concreteRegistryPattern)
  assert.match(
    registeredApplicationSource,
    /adapterRegistry:\s*DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY/,
  )
  assert.match(
    genericEngineSources,
    /adapterRegistry:\s*DiscPresetPlacementAdapterRegistry/,
  )
  assert.match(genericEngineSources, /adapterRegistry\.get\(/)
  assert.doesNotMatch(genericEngineSources, concreteRegistryPattern)
  assert.doesNotMatch(appSource, concreteRegistryPattern)
  assert.doesNotMatch(appSource, registryConstructionPattern)
  assert.doesNotMatch(legacyRolePresetSources, concreteRegistryPattern)
  assert.doesNotMatch(legacyRolePresetSources, registryConstructionPattern)
  assert.doesNotMatch(guidedSources, concreteRegistryPattern)
  assert.doesNotMatch(guidedSources, registryConstructionPattern)
  assert.doesNotMatch(
    definitionSource,
    /adapterRegistry|DiscPresetPlacementAdapter|buildUpdate|createDiscPresetPlacementAdapterRegistry/,
  )
})

test('concrete adapters exclude side effects, dynamic paths, and UI/render owners', () => {
  const sources = [
    './adapters/discPointPresetAdapters.ts',
    './adapters/discTextPresetAdapters.ts',
    './adapters/discBackgroundPresetAdapter.ts',
    './adapters/discPlatformMarksPresetAdapter.ts',
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
