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

function getPlacementUnion(
  updates: readonly GroupedPlatformMarkLayoutUpdate[],
) {
  return {
    left: Math.min(...updates.map((update) =>
      update.x - getBounds(update).halfWidth,
    )),
    right: Math.max(...updates.map((update) =>
      update.x + getBounds(update).halfWidth,
    )),
    top: Math.min(...updates.map((update) =>
      update.y - getBounds(update).halfHeight,
    )),
    bottom: Math.max(...updates.map((update) =>
      update.y + getBounds(update).halfHeight,
    )),
  }
}

function assertStrictContainPlacement(
  updates: readonly GroupedPlatformMarkLayoutUpdate[],
  targetRegion = region,
) {
  assert.ok(updates.length > 0)

  for (const update of updates) {
    assertInsideRegion(update, targetRegion)
  }

  for (let index = 0; index < updates.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < updates.length; nextIndex += 1) {
      assertSeparated(updates[index], updates[nextIndex])
    }
  }

  const union = getPlacementUnion(updates)

  assert.ok(
    Math.abs((union.left + union.right) / 2 - targetRegion.centerXPercent) <=
      0.00001,
  )
  assert.ok(
    Math.abs((union.top + union.bottom) / 2 - targetRegion.centerYPercent) <=
      0.00001,
  )
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

test('strict contain derives a centered one-mark scale without using owner scale', () => {
  const smallOwnerScale = createMarks(['pc'])
  const largeOwnerScale = createMarks(['pc'])

  assert.ok(smallOwnerScale.assets.pc)
  assert.ok(largeOwnerScale.assets.pc)
  smallOwnerScale.assets.pc.layout.scale = 0.2
  largeOwnerScale.assets.pc.layout.scale = 4
  const smallSnapshot = structuredClone(smallOwnerScale)
  const largeSnapshot = structuredClone(largeOwnerScale)

  const fitPolicy = {
    mode: 'contain-region' as const,
    allowUpscale: true,
    insetPercent: 0,
  }
  const smallResult = placeGroupedPlatformMarks({
    platformMarks: smallOwnerScale,
    region,
    template,
    fitPolicy,
  })
  const largeResult = placeGroupedPlatformMarks({
    platformMarks: largeOwnerScale,
    region,
    template,
    fitPolicy,
  })

  assert.equal(smallResult.status, 'placed')
  assert.deepEqual(largeResult, smallResult)
  assert.deepEqual(smallResult.updates, [
    { value: 'pc', x: 50, y: 73, scale: 1.25 },
  ])
  assert.equal(Object.isFrozen(smallResult), true)
  assert.equal(Object.isFrozen(smallResult.updates), true)
  assert.equal(Object.isFrozen(smallResult.updates[0]), true)
  assertStrictContainPlacement(smallResult.updates)
  assert.deepEqual(getPlacementUnion(smallResult.updates), {
    left: 45,
    right: 55,
    top: 68,
    bottom: 78,
  })
  assert.deepEqual(smallOwnerScale, smallSnapshot)
  assert.deepEqual(largeOwnerScale, largeSnapshot)
})

test('strict contain honors allow-upscale, maximum-scale, and inset caps', () => {
  const platformMarks = createMarks(['pc'])
  const baseInput = { platformMarks, region, template }
  const noUpscale = placeGroupedPlatformMarks({
    ...baseInput,
    fitPolicy: { mode: 'contain-region', allowUpscale: false },
  })
  const maximumScale = placeGroupedPlatformMarks({
    ...baseInput,
    fitPolicy: {
      mode: 'contain-region',
      allowUpscale: true,
      maximumScale: 0.75,
    },
  })
  const inset = placeGroupedPlatformMarks({
    ...baseInput,
    fitPolicy: {
      mode: 'contain-region',
      allowUpscale: true,
      insetPercent: 10,
    },
  })

  assert.equal(noUpscale.status, 'placed')
  assert.equal(noUpscale.updates[0].scale, 1)
  assert.equal(maximumScale.status, 'placed')
  assert.equal(maximumScale.updates[0].scale, 0.75)
  assert.equal(inset.status, 'placed')
  assert.equal(inset.updates[0].scale, 1)
  assertStrictContainPlacement(noUpscale.updates)
  assertStrictContainPlacement(maximumScale.updates)
  assertStrictContainPlacement(inset.updates, {
    ...region,
    widthPercent: region.widthPercent * 0.8,
    heightPercent: region.heightPercent * 0.8,
  })
})

test('strict contain keeps two marks in one centered row at the largest common scale', () => {
  const result = placeGroupedPlatformMarks({
    platformMarks: createMarks(['pc', 'windows']),
    region,
    template,
    fitPolicy: {
      mode: 'contain-region',
      allowUpscale: true,
    },
  })

  assert.equal(result.status, 'placed')
  assert.deepEqual(result.updates.map(({ value }) => value), ['pc', 'windows'])
  assert.equal(new Set(result.updates.map(({ y }) => y)).size, 1)
  assert.equal(new Set(result.updates.map(({ scale }) => scale)).size, 1)
  assert.equal(result.updates[0].scale, 1.25)
  assertStrictContainPlacement(result.updates)
  const union = getPlacementUnion(result.updates)

  assert.ok(Math.abs(union.top - 68) <= 0.00001)
  assert.ok(Math.abs(union.bottom - 78) <= 0.00001)
})

test('strict contain fills the nearest Classic boundary for five marks', () => {
  const values = [
    'pc',
    'windows',
    'linux',
    'steamDeck',
    'macos',
  ] as const
  const result = placeGroupedPlatformMarks({
    platformMarks: createMarks(values),
    region,
    template,
    fitPolicy: {
      mode: 'contain-region',
      allowUpscale: true,
      insetPercent: 0,
    },
  })

  assert.equal(result.status, 'placed')
  assert.equal(new Set(result.updates.map(({ scale }) => scale)).size, 1)
  assertStrictContainPlacement(result.updates)
  const union = getPlacementUnion(result.updates)

  assert.ok(Math.abs(union.left - 36) <= 0.00001)
  assert.ok(Math.abs(union.right - 64) <= 0.00001)
})

test('strict contain evaluates canonical two-row splits and chooses the largest five-mark fit', () => {
  const targetRegion = {
    centerXPercent: 50,
    centerYPercent: 73,
    widthPercent: 20,
    heightPercent: 18,
  }
  const values = [
    'pc',
    'windows',
    'linux',
    'steamDeck',
    'macos',
  ] as const
  const result = placeGroupedPlatformMarks({
    platformMarks: createMarks(values, { reorder: [...values].reverse() }),
    region: targetRegion,
    template,
    fitPolicy: {
      mode: 'contain-region',
      allowUpscale: true,
    },
  })

  assert.equal(result.status, 'placed')
  assert.deepEqual(result.updates.map(({ value }) => value), [...values])
  assert.equal(new Set(result.updates.map(({ scale }) => scale)).size, 1)
  const rowSizes = Object.values(Object.groupBy(
    result.updates,
    ({ y }) => y.toFixed(5),
  )).map((row) => row?.length).sort()
  const union = getPlacementUnion(result.updates)

  assert.deepEqual(rowSizes, [2, 3])
  assert.ok(Math.abs(union.left - 40) <= 0.00001)
  assert.ok(Math.abs(union.right - 60) <= 0.00001)
  assertStrictContainPlacement(result.updates, targetRegion)
})

test('strict contain responds to custom aspect changes while preserving center', () => {
  const platformMarks = createMarks(['windows'])
  const windowsAsset = platformMarks.assets.windows

  assert.ok(windowsAsset)
  platformMarks.assets.windows = {
    ...windowsAsset,
    source: 'custom',
    customImageDataUrl: 'data:image/png;base64,custom-wide',
    customImageSize: { width: 400, height: 100 },
  }
  const wide = placeGroupedPlatformMarks({
    platformMarks,
    region,
    template,
    fitPolicy: { mode: 'contain-region', allowUpscale: true },
  })
  platformMarks.assets.windows = {
    ...platformMarks.assets.windows,
    customImageDataUrl: 'data:image/png;base64,custom-tall',
    customImageSize: { width: 100, height: 400 },
  }
  const tall = placeGroupedPlatformMarks({
    platformMarks,
    region,
    template,
    fitPolicy: { mode: 'contain-region', allowUpscale: true },
  })

  assert.equal(wide.status, 'placed')
  assert.equal(tall.status, 'placed')
  assert.equal(wide.updates[0].x, region.centerXPercent)
  assert.equal(wide.updates[0].y, region.centerYPercent)
  assert.equal(tall.updates[0].x, region.centerXPercent)
  assert.equal(tall.updates[0].y, region.centerYPercent)
  assert.ok(Math.abs(wide.updates[0].scale - 28 / 12) <= 0.00001)
  assert.ok(Math.abs(tall.updates[0].scale - 10 / 8) <= 0.00001)
})

test('strict contain recomputes canonical bounds after a built-in theme change', () => {
  const platformMarks = createMarks(['macos'])
  const macosAsset = platformMarks.assets.macos

  assert.ok(macosAsset)
  platformMarks.assets.macos = {
    ...macosAsset,
    source: 'placeholder',
    theme: 'macos1988',
  }
  const classicTheme = placeGroupedPlatformMarks({
    platformMarks,
    region,
    template,
    fitPolicy: { mode: 'contain-region', allowUpscale: true },
  })
  platformMarks.assets.macos = {
    ...platformMarks.assets.macos,
    theme: 'macos2017',
  }
  const wideTheme = placeGroupedPlatformMarks({
    platformMarks,
    region,
    template,
    fitPolicy: { mode: 'contain-region', allowUpscale: true },
  })

  assert.equal(classicTheme.status, 'placed')
  assert.equal(wideTheme.status, 'placed')
  assert.equal(classicTheme.updates[0].x, region.centerXPercent)
  assert.equal(classicTheme.updates[0].y, region.centerYPercent)
  assert.equal(wideTheme.updates[0].x, region.centerXPercent)
  assert.equal(wideTheme.updates[0].y, region.centerYPercent)
  assert.notEqual(classicTheme.updates[0].scale, wideTheme.updates[0].scale)
})

test('strict contain treats the preset rectangle as authoritative near the inner hole', () => {
  const innerBoundaryRegion = {
    centerXPercent: 50,
    centerYPercent: 61,
    widthPercent: 20,
    heightPercent: 10,
  }
  const result = placeGroupedPlatformMarks({
    platformMarks: createMarks(['pc']),
    region: innerBoundaryRegion,
    template,
    fitPolicy: { mode: 'contain-region', allowUpscale: true },
  })

  assert.equal(result.status, 'placed')
  assert.equal(result.updates[0].x, innerBoundaryRegion.centerXPercent)
  assert.equal(result.updates[0].y, innerBoundaryRegion.centerYPercent)
  assert.equal(result.updates[0].scale, 1.25)
  assertStrictContainPlacement(result.updates, innerBoundaryRegion)
  const union = getPlacementUnion(result.updates)

  assert.ok(Math.abs(union.top - 56) <= 0.00001)
  assert.ok(Math.abs(union.bottom - 66) <= 0.00001)
})

test('strict contain fills a centered rectangle without hole-driven translation', () => {
  const hubRegion = {
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 40,
    heightPercent: 40,
  }
  const platformMarks = createMarks(['pc'])
  const legacy = placeGroupedPlatformMarks({
    platformMarks,
    region: hubRegion,
    template,
  })
  const strict = placeGroupedPlatformMarks({
    platformMarks,
    region: hubRegion,
    template,
    fitPolicy: { mode: 'contain-region', allowUpscale: true },
  })

  assert.equal(legacy.status, 'placed')
  assert.notEqual(legacy.updates[0].y, hubRegion.centerYPercent)
  assert.equal(strict.status, 'placed')
  assert.deepEqual(strict.updates, [
    { value: 'pc', x: 50, y: 50, scale: 5 },
  ])
  assertStrictContainPlacement(strict.updates, hubRegion)
})

test('strict contain fills an edge-near rectangle without safe-circle shrinkage', () => {
  const outerBoundaryRegion = {
    centerXPercent: 50,
    centerYPercent: 93,
    widthPercent: 10,
    heightPercent: 10,
  }
  const result = placeGroupedPlatformMarks({
    platformMarks: createMarks(['pc']),
    region: outerBoundaryRegion,
    template,
    fitPolicy: { mode: 'contain-region', allowUpscale: true },
  })

  assert.equal(result.status, 'placed')
  assert.equal(result.updates[0].x, outerBoundaryRegion.centerXPercent)
  assert.equal(result.updates[0].y, outerBoundaryRegion.centerYPercent)
  assert.equal(result.updates[0].scale, 1.25)
  assertStrictContainPlacement(result.updates, outerBoundaryRegion)
  assert.deepEqual(getPlacementUnion(result.updates), {
    left: 45,
    right: 55,
    top: 88,
    bottom: 98,
  })
})

test('strict contain rejects malformed or future fit policies safely', () => {
  const platformMarks = createMarks(['pc'])

  for (const fitPolicy of [
    { mode: 'contain-region', allowUpscale: 'yes' },
    { mode: 'contain-region', allowUpscale: true, maximumScale: 0 },
    { mode: 'contain-region', allowUpscale: true, maximumScale: 11 },
    { mode: 'contain-region', allowUpscale: true, insetPercent: -1 },
    { mode: 'contain-region', allowUpscale: true, insetPercent: 50 },
    { mode: 'future-fit', allowUpscale: true },
  ]) {
    assert.deepEqual(placeGroupedPlatformMarks({
      platformMarks,
      region,
      template,
      fitPolicy: fitPolicy as never,
    }), {
      status: 'invalid-region',
      updates: [],
      ignoredMarks: [],
    })
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
    source.includes('fitVisualBoundsToDiscPresetRectangle'),
    true,
  )
  assert.equal(
    source.includes('doesRectFitTemplateSafeAnnulus'),
    false,
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
