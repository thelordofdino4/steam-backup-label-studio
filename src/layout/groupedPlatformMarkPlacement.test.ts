import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { getPlatformMarkPlaceholderImageSize } from '../assets/assetManifest.ts'
import {
  doesRectAvoidDiscCenterCircle,
  getPlatformMarkBoundsPercent,
} from '../disc/geometry.ts'
import {
  createDefaultProjectPlatformMarkAsset,
  createDefaultProjectPlatformMarks,
  PLATFORM_MARK_OPTIONS,
} from '../project/projectPlatformMarks.ts'
import type {
  PlatformMarkValue,
  ProjectPlatformMarks,
} from '../project/projectTypes.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import { clampPlatformMarkLayoutToSafeZone } from './discElementSafeZone.ts'
import {
  placeGroupedPlatformMarks,
  type DiscNormalizedRegion,
  type GroupedPlatformMarkLayoutUpdate,
} from './groupedPlatformMarkPlacement.ts'

const template = discTemplates.standardPrintableDisc
const region: DiscNormalizedRegion = {
  centerXPercent: 50,
  centerYPercent: 73,
  widthPercent: 28,
  heightPercent: 10,
}

function createMarks(
  values: readonly PlatformMarkValue[],
  options: {
    disabled?: readonly PlatformMarkValue[]
    reorder?: readonly PlatformMarkValue[]
  } = {},
): ProjectPlatformMarks {
  const disabled = new Set(options.disabled ?? [])
  const assetValues = options.reorder ?? values

  return {
    ...createDefaultProjectPlatformMarks(),
    values: [...values],
    assets: Object.fromEntries(assetValues.map((value) => {
      const asset = createDefaultProjectPlatformMarkAsset(value, template)

      return [value, {
        ...asset,
        customImageDataUrl: value === 'windows'
          ? 'data:image/png;base64,windows'
          : asset.customImageDataUrl,
        layout: {
          ...asset.layout,
          enabled: !disabled.has(value),
          scale: 1,
        },
      }]
    })),
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }

  return value
}

function getBounds(update: GroupedPlatformMarkLayoutUpdate) {
  return getPlatformMarkBoundsPercent(
    getPlatformMarkPlaceholderImageSize(update.value),
    update.scale,
  )
}

function assertInsideRegion(
  update: GroupedPlatformMarkLayoutUpdate,
  targetRegion = region,
) {
  const bounds = getBounds(update)
  const left = targetRegion.centerXPercent - targetRegion.widthPercent / 2
  const right = targetRegion.centerXPercent + targetRegion.widthPercent / 2
  const top = targetRegion.centerYPercent - targetRegion.heightPercent / 2
  const bottom = targetRegion.centerYPercent + targetRegion.heightPercent / 2

  assert.ok(update.x - bounds.halfWidth >= left - 0.00001)
  assert.ok(update.x + bounds.halfWidth <= right + 0.00001)
  assert.ok(update.y - bounds.halfHeight >= top - 0.00001)
  assert.ok(update.y + bounds.halfHeight <= bottom + 0.00001)
}

function assertSeparated(
  first: GroupedPlatformMarkLayoutUpdate,
  second: GroupedPlatformMarkLayoutUpdate,
  gap = 1.5,
) {
  const firstBounds = getBounds(first)
  const secondBounds = getBounds(second)
  const horizontalGap = Math.max(
    second.x - secondBounds.halfWidth - (first.x + firstBounds.halfWidth),
    first.x - firstBounds.halfWidth - (second.x + secondBounds.halfWidth),
  )
  const verticalGap = Math.max(
    second.y - secondBounds.halfHeight - (first.y + firstBounds.halfHeight),
    first.y - firstBounds.halfHeight - (second.y + secondBounds.halfHeight),
  )

  assert.ok(horizontalGap >= gap - 0.00001 || verticalGap >= gap - 0.00001)
}

function assertValidPlacement(
  updates: readonly GroupedPlatformMarkLayoutUpdate[],
  targetRegion = region,
) {
  const physicalHoleRadius =
    template.physicalCenterHoleDiameterMm / template.outerDiameterMm * 50

  updates.forEach((update) => {
    assertInsideRegion(update, targetRegion)
    assert.equal(
      doesRectAvoidDiscCenterCircle(
        { x: update.x, y: update.y },
        physicalHoleRadius,
        getBounds(update),
      ),
      true,
    )
    const asset = createDefaultProjectPlatformMarkAsset(update.value, template)
    const clamped = clampPlatformMarkLayoutToSafeZone({
      ...asset,
      value: update.value,
      layout: {
        ...asset.layout,
        x: update.x,
        y: update.y,
        scale: update.scale,
      },
    }, template)

    assert.ok(Math.abs(clamped.x - update.x) <= 0.00001)
    assert.ok(Math.abs(clamped.y - update.y) <= 0.00001)
  })

  for (let index = 0; index < updates.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < updates.length; nextIndex += 1) {
      assertSeparated(updates[index], updates[nextIndex])
    }
  }
}

test('zero selected marks returns a frozen deterministic no-op', () => {
  const platformMarks = deepFreeze(createDefaultProjectPlatformMarks())
  const first = placeGroupedPlatformMarks({ platformMarks, region, template })
  const second = placeGroupedPlatformMarks({ platformMarks, region, template })

  assert.deepEqual(first, {
    status: 'no-eligible-marks',
    updates: [],
    ignoredMarks: [],
  })
  assert.deepEqual(second, first)
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.updates), true)
  assert.deepEqual(platformMarks, createDefaultProjectPlatformMarks())
})

test('disabled selected marks remain unchanged and are reported', () => {
  const platformMarks = deepFreeze(createMarks(['windows'], {
    disabled: ['windows'],
  }))
  const snapshot = structuredClone(platformMarks)
  const result = placeGroupedPlatformMarks({ platformMarks, region, template })

  assert.equal(result.status, 'no-eligible-marks')
  assert.deepEqual(result.updates, [])
  assert.deepEqual(result.ignoredMarks, [
    { value: 'windows', reason: 'disabled' },
  ])
  assert.deepEqual(platformMarks, snapshot)
})

test('one mark centers in the region without changing owner state', () => {
  const platformMarks = deepFreeze(createMarks(['windows']))
  const snapshot = structuredClone(platformMarks)
  const result = placeGroupedPlatformMarks({ platformMarks, region, template })

  assert.equal(result.status, 'placed')
  assert.deepEqual(result.updates.map(({ value }) => value), ['windows'])
  assert.equal(result.updates[0].x, region.centerXPercent)
  assert.equal(result.updates[0].y, region.centerYPercent)
  assert.equal(result.updates[0].scale, 1)
  assertValidPlacement(result.updates)
  assert.deepEqual(platformMarks, snapshot)
})

test('one mark clamps safely near the Disc edge while staying in-region', () => {
  const edgeRegion: DiscNormalizedRegion = {
    centerXPercent: 50,
    centerYPercent: 14,
    widthPercent: 24,
    heightPercent: 12,
  }
  const result = placeGroupedPlatformMarks({
    platformMarks: createMarks(['linux']),
    region: edgeRegion,
    template,
  })

  assert.equal(result.status, 'placed')
  assertValidPlacement(result.updates, edgeRegion)
})

test('a centered hub conflict moves downward before upward deterministically', () => {
  const hubRegion: DiscNormalizedRegion = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 28,
    heightPercent: 32,
  }
  const input = {
    platformMarks: createMarks(['pc']),
    region: hubRegion,
    template,
  }
  const first = placeGroupedPlatformMarks(input)
  const second = placeGroupedPlatformMarks(input)

  assert.equal(first.status, 'placed')
  assert.ok(first.updates[0].y > hubRegion.centerYPercent)
  assert.deepEqual(second, first)
  assertValidPlacement(first.updates, hubRegion)
})

for (const values of [
  ['pc', 'windows'] as const,
  ['pc', 'windows', 'linux'] as const,
  ['pc', 'windows', 'linux', 'steamDeck', 'macos'] as const,
]) {
  test(`places ${values.length} marks in canonical order without overlap`, () => {
    const platformMarks = deepFreeze(createMarks(values, {
      reorder: [...values].reverse(),
    }))
    const snapshot = structuredClone(platformMarks)
    const first = placeGroupedPlatformMarks({ platformMarks, region, template })
    const second = placeGroupedPlatformMarks({ platformMarks, region, template })
    const canonicalValues = PLATFORM_MARK_OPTIONS
      .map(({ value }) => value)
      .filter((value) => values.includes(value as never))

    assert.equal(first.status, 'placed')
    assert.deepEqual(first.updates.map(({ value }) => value), canonicalValues)
    assert.deepEqual(second, first)
    assert.equal(new Set(first.updates.map(({ scale }) => scale)).size, 1)
    assertValidPlacement(first.updates)
    assert.deepEqual(platformMarks, snapshot)
  })
}

test('uses one row when preferred scale fits and two balanced rows when it does not', () => {
  const twoMarks = placeGroupedPlatformMarks({
    platformMarks: createMarks(['pc', 'windows']),
    region: { ...region, widthPercent: 40, heightPercent: 10 },
    template,
    preferredScale: 0.7,
  })
  const fiveMarks = placeGroupedPlatformMarks({
    platformMarks: createMarks([
      'pc',
      'windows',
      'linux',
      'steamDeck',
      'macos',
    ]),
    region: {
      centerXPercent: 50,
      centerYPercent: 73,
      widthPercent: 20,
      heightPercent: 18,
    },
    template,
    preferredScale: 0.7,
  })

  assert.equal(twoMarks.status, 'placed')
  assert.equal(new Set(twoMarks.updates.map(({ y }) => y)).size, 1)
  assert.equal(fiveMarks.status, 'placed')
  const rowSizes = Object.values(Object.groupBy(
    fiveMarks.updates,
    ({ y }) => y.toFixed(5),
  )).map((row) => row?.length).sort()
  assert.deepEqual(rowSizes, [2, 3])
  assertValidPlacement(fiveMarks.updates, {
    centerXPercent: 50,
    centerYPercent: 73,
    widthPercent: 20,
    heightPercent: 18,
  })
})

test('materializes a selected missing asset through the canonical accessor', () => {
  const platformMarks: ProjectPlatformMarks = {
    ...createDefaultProjectPlatformMarks(),
    values: ['linux'],
    assets: {},
  }
  const result = placeGroupedPlatformMarks({ platformMarks, region, template })

  assert.equal(result.status, 'placed')
  assert.deepEqual(result.updates.map(({ value }) => value), ['linux'])
  assert.deepEqual(platformMarks.assets, {})
})

test('an unrenderable custom mark is ignored while valid marks are placed', () => {
  const platformMarks = createMarks(['pc', 'windows'])
  const pcAsset = platformMarks.assets.pc

  assert.ok(pcAsset)
  platformMarks.assets.pc = {
    ...pcAsset,
    source: 'custom',
    customImageDataUrl: 'data:image/png;base64,invalid-size',
    customImageSize: { width: 0, height: 0 },
  }
  const snapshot = structuredClone(platformMarks)
  const result = placeGroupedPlatformMarks({ platformMarks, region, template })

  assert.equal(result.status, 'placed')
  assert.deepEqual(result.updates.map(({ value }) => value), ['windows'])
  assert.deepEqual(result.ignoredMarks, [
    { value: 'pc', reason: 'unrenderable' },
  ])
  assert.deepEqual(platformMarks, snapshot)
})

test('custom source, theme, image payload, enablement, and inference remain untouched', () => {
  const platformMarks = createMarks(['windows'])
  const windowsAsset = platformMarks.assets.windows

  assert.ok(windowsAsset)
  platformMarks.inference = {
    source: 'manual',
    status: 'manual',
    steamAppId: 123,
    values: ['windows'],
    message: 'Preserve me',
  }
  platformMarks.assets.windows = {
    ...windowsAsset,
    source: 'custom',
    theme: 'windows7',
    customImageDataUrl: 'data:image/png;base64,custom-windows',
    customImageSize: { width: 320, height: 120 },
    layout: {
      ...windowsAsset.layout,
      enabled: true,
    },
  }
  const snapshot = structuredClone(platformMarks)
  const result = placeGroupedPlatformMarks({ platformMarks, region, template })

  assert.equal(result.status, 'placed')
  assert.deepEqual(result.updates.map(({ value }) => value), ['windows'])
  assert.deepEqual(platformMarks, snapshot)
})

test('updates expose only stable value identity and placement fields', () => {
  const result = placeGroupedPlatformMarks({
    platformMarks: createMarks(['macos', 'windows']),
    region,
    template,
  })

  assert.equal(result.status, 'placed')
  for (const update of result.updates) {
    assert.deepEqual(Object.keys(update).sort(), ['scale', 'value', 'x', 'y'])
    assert.equal(typeof update.value, 'string')
    assert.equal('index' in update, false)
    assert.equal('asset' in update, false)
  }
})

test('invalid and impossible regions return typed no-op failures', () => {
  const platformMarks = createMarks(['pc', 'windows'])
  const invalidRegions: DiscNormalizedRegion[] = [
    { ...region, centerXPercent: Number.NaN },
    { ...region, widthPercent: 0 },
    { ...region, heightPercent: -1 },
    { ...region, centerXPercent: 99 },
  ]

  invalidRegions.forEach((invalidRegion) => {
    assert.deepEqual(
      placeGroupedPlatformMarks({
        platformMarks,
        region: invalidRegion,
        template,
      }),
      { status: 'invalid-region', updates: [], ignoredMarks: [] },
    )
  })

  const impossible = placeGroupedPlatformMarks({
    platformMarks,
    region: { centerXPercent: 50, centerYPercent: 73, widthPercent: 1, heightPercent: 1 },
    template,
  })
  assert.equal(impossible.status, 'cannot-fit')
  assert.deepEqual(impossible.updates, [])
})

test('source stays pure and the Disc preset domain adopts the helper', () => {
  const source = readFileSync(
    new URL('./groupedPlatformMarkPlacement.ts', import.meta.url),
    'utf8',
  )
  const legacyPresetSource = readFileSync(
    new URL('./discRolePresets.ts', import.meta.url),
    'utf8',
  )
  const platformAdapterSource = readFileSync(
    new URL(
      '../presets/adapters/discPlatformMarksPresetAdapter.ts',
      import.meta.url,
    ),
    'utf8',
  )

  for (const forbidden of [
    'react',
    '../components',
    'node:fs',
    'App.tsx',
    'document.',
    'window.',
    'canvas',
    '../project/projectSchema',
    '../project/createProjectSnapshot',
    '../project/restoreProject',
    '../render',
    '../export',
    'caseInsert',
    'guidedPresets',
    'fetch(',
    'Math.random',
    'setTimeout',
    'setInterval',
  ]) {
    assert.equal(source.includes(forbidden), false, `unexpected source: ${forbidden}`)
  }

  assert.equal(
    platformAdapterSource.includes('groupedPlatformMarkPlacement'),
    true,
  )
  assert.equal(
    platformAdapterSource.includes('placeGroupedPlatformMarks'),
    true,
  )
  assert.equal(
    legacyPresetSource.includes('groupedPlatformMarkPlacement'),
    false,
  )
  assert.equal(
    legacyPresetSource.includes('placeGroupedPlatformMarks'),
    false,
  )
})
