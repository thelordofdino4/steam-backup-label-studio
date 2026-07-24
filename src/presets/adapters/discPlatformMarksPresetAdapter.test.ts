import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { getPlatformMarkPlaceholderImageSize } from '../../assets/assetManifest.ts'
import { getPlatformMarkBoundsPercent } from '../../disc/geometry.ts'
import {
  createDefaultProjectPlatformMarkAsset,
  createDefaultProjectPlatformMarks,
  getProjectPlatformMarkAsset,
  PLATFORM_MARK_OPTIONS,
} from '../../project/projectPlatformMarks.ts'
import type {
  PlatformMarkValue,
  ProjectPlatformMarks,
} from '../../project/projectTypes.ts'
import { discTemplates } from '../../templates/discTemplates.ts'
import type { DiscTemplate } from '../../types/template.ts'
import { CLASSIC_TOP_TITLE_DISC_PRESET } from '../builtins/classicTopTitleDiscPreset.ts'
import type {
  DiscPresetOwnerPlacementContext,
} from '../discPresetPlacementAdapters.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../discPresetResolution.ts'
import {
  DISC_PLATFORM_MARKS_PRESET_ADAPTER,
} from './discPlatformMarksPresetAdapter.ts'

const GROUP_CENTER_TOLERANCE_PERCENT = 0.00001
const GEOMETRY_TOLERANCE_PERCENT = 0.00001
const template = discTemplates.standardPrintableDisc
const templateInput = createDiscPresetTemplateResolutionInput(template)
const classicResolution = resolveDiscPresetDefinition({
  definition: CLASSIC_TOP_TITLE_DISC_PRESET,
  template: templateInput,
})

if (classicResolution.status === 'rejected') {
  throw new Error('Classic fixture must resolve.')
}

const classicSlot = classicResolution.preset.slots.find(
  ({ id }) => id === 'disc:guided:operating-system-marks:group',
)
const classicPlacement = classicSlot?.placements.find(
  ({ target }) => target === 'operating-system-marks.enabled',
)

if (
  !classicSlot ||
  !classicPlacement ||
  classicPlacement.kind !== 'group' ||
  !('size' in classicPlacement)
) {
  throw new Error('Classic OS group fixture is missing.')
}

function createMarks(
  values: readonly PlatformMarkValue[],
  options: Readonly<{
    disabled?: readonly PlatformMarkValue[]
    assetOrder?: readonly PlatformMarkValue[]
  }> = {},
): ProjectPlatformMarks {
  const disabled = new Set(options.disabled ?? [])
  const assetOrder = options.assetOrder ?? values

  return {
    ...createDefaultProjectPlatformMarks(),
    values: [...values],
    assets: Object.fromEntries(assetOrder.map((value) => {
      const asset = createDefaultProjectPlatformMarkAsset(value, template)

      return [value, {
        ...asset,
        layout: {
          ...asset.layout,
          enabled: !disabled.has(value),
          scale: 1,
        },
      }]
    })),
    inference: {
      source: 'manual',
      status: 'manual',
      steamAppId: 123,
      values: [...values],
      message: 'Preserve this inference metadata.',
    },
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }

  return value
}

function createContext(
  platformMarks: ProjectPlatformMarks,
  options: Readonly<{
    region?: typeof classicSlot.resolvedContentRegion
    legacyPreferredScale?: number
    ownerTemplate?: DiscTemplate
    resolutionTemplate?: DiscTemplate
  }> = {},
): DiscPresetOwnerPlacementContext<'operating-system-marks.enabled'> {
  const placement = options.legacyPreferredScale === undefined
    ? classicPlacement
    : {
        kind: 'group' as const,
        target: 'operating-system-marks.enabled' as const,
        preferredScale: options.legacyPreferredScale,
      }

  return {
    slot: {
      ...classicSlot,
      ...(options.region
        ? { resolvedContentRegion: options.region }
        : {}),
      placements: [placement],
    },
    placement: placement as
      DiscPresetOwnerPlacementContext<
        'operating-system-marks.enabled'
      >['placement'],
    ownerState: {
      platformMarks,
      template: options.ownerTemplate ?? template,
    },
    template: options.resolutionTemplate
      ? createDiscPresetTemplateResolutionInput(options.resolutionTemplate)
      : templateInput,
  }
}

function getUpdateBounds(
  platformMarks: ProjectPlatformMarks,
  update: Extract<
    import('../discPresetOwnerPlacement.ts').DiscPresetOwnerUpdate,
    { kind: 'platform-mark-layout' }
  >,
) {
  const asset = getProjectPlatformMarkAsset(
    platformMarks,
    update.markId,
    template,
  )
  const imageSize = asset.source === 'custom' && asset.customImageDataUrl
    ? asset.customImageSize
    : getPlatformMarkPlaceholderImageSize(update.markId, asset.theme)
  assert.ok(imageSize)

  return getPlatformMarkBoundsPercent(imageSize, update.layout.scale)
}

function getGroupBounds(
  platformMarks: ProjectPlatformMarks,
  updates: readonly Extract<
    import('../discPresetOwnerPlacement.ts').DiscPresetOwnerUpdate,
    { kind: 'platform-mark-layout' }
  >[],
) {
  const bounds = updates.map((update) => {
    const markBounds = getUpdateBounds(platformMarks, update)

    return {
      left: update.layout.x - markBounds.halfWidth,
      right: update.layout.x + markBounds.halfWidth,
      top: update.layout.y - markBounds.halfHeight,
      bottom: update.layout.y + markBounds.halfHeight,
    }
  })

  return {
    left: Math.min(...bounds.map(({ left }) => left)),
    right: Math.max(...bounds.map(({ right }) => right)),
    top: Math.min(...bounds.map(({ top }) => top)),
    bottom: Math.max(...bounds.map(({ bottom }) => bottom)),
  }
}

function assertValidGroup(
  platformMarks: ProjectPlatformMarks,
  updates: readonly Extract<
    import('../discPresetOwnerPlacement.ts').DiscPresetOwnerUpdate,
    { kind: 'platform-mark-layout' }
  >[],
  region = classicSlot.resolvedContentRegion,
) {
  const groupBounds = getGroupBounds(platformMarks, updates)
  const regionLeft = region.centerXPercent - region.widthPercent / 2
  const regionRight = region.centerXPercent + region.widthPercent / 2
  const regionTop = region.centerYPercent - region.heightPercent / 2
  const regionBottom = region.centerYPercent + region.heightPercent / 2
  const groupCenterX = (groupBounds.left + groupBounds.right) / 2
  const groupCenterY = (groupBounds.top + groupBounds.bottom) / 2

  assert.ok(groupBounds.left >= regionLeft - GEOMETRY_TOLERANCE_PERCENT)
  assert.ok(groupBounds.right <= regionRight + GEOMETRY_TOLERANCE_PERCENT)
  assert.ok(groupBounds.top >= regionTop - GEOMETRY_TOLERANCE_PERCENT)
  assert.ok(groupBounds.bottom <= regionBottom + GEOMETRY_TOLERANCE_PERCENT)
  assert.ok(
    Math.abs(groupCenterX - region.centerXPercent) <=
      GROUP_CENTER_TOLERANCE_PERCENT,
  )
  assert.ok(
    Math.abs(groupCenterY - region.centerYPercent) <=
      GROUP_CENTER_TOLERANCE_PERCENT,
  )

  for (let index = 0; index < updates.length; index += 1) {
    const first = updates[index]
    const firstBounds = getUpdateBounds(platformMarks, first)

    for (
      let nextIndex = index + 1;
      nextIndex < updates.length;
      nextIndex += 1
    ) {
      const second = updates[nextIndex]
      const secondBounds = getUpdateBounds(platformMarks, second)
      const separatedHorizontally =
        first.layout.x + firstBounds.halfWidth <=
          second.layout.x - secondBounds.halfWidth +
            GEOMETRY_TOLERANCE_PERCENT ||
        second.layout.x + secondBounds.halfWidth <=
          first.layout.x - firstBounds.halfWidth +
            GEOMETRY_TOLERANCE_PERCENT
      const separatedVertically =
        first.layout.y + firstBounds.halfHeight <=
          second.layout.y - secondBounds.halfHeight +
            GEOMETRY_TOLERANCE_PERCENT ||
        second.layout.y + secondBounds.halfHeight <=
          first.layout.y - firstBounds.halfHeight +
            GEOMETRY_TOLERANCE_PERCENT

      assert.equal(separatedHorizontally || separatedVertically, true)
    }
  }
}

test('declares the exact OS group target and intent kind', () => {
  assert.equal(
    DISC_PLATFORM_MARKS_PRESET_ADAPTER.target,
    'operating-system-marks.enabled',
  )
  assert.deepEqual(
    DISC_PLATFORM_MARKS_PRESET_ADAPTER.supportedIntentKinds,
    ['group'],
  )
  assert.ok(Object.isFrozen(DISC_PLATFORM_MARKS_PRESET_ADAPTER))
})

test('zero eligible marks is an immutable applied no-op', () => {
  const platformMarks = deepFreeze(createDefaultProjectPlatformMarks())
  const before = structuredClone(platformMarks)
  const result = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks),
  )

  assert.deepEqual(result, {
    status: 'applied',
    updates: [],
    warnings: [],
  })
  assert.deepEqual(platformMarks, before)
  assert.ok(Object.isFrozen(result))
  assert.ok(Object.isFrozen(result.updates))
})

test('Classic contain-fit places one Windows mark at scale 1.25 and exact slot center', () => {
  const platformMarks = createMarks(['windows'])
  const result = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks),
  )
  const updates = result.updates.filter(
    (update) => update.kind === 'platform-mark-layout',
  )

  assert.equal(result.status, 'applied')
  assert.deepEqual(updates.map(({ markId, layout }) => ({ markId, layout })), [{
    markId: 'windows',
    layout: { x: 50, y: 73, scale: 1.25 },
  }])
  assertValidGroup(platformMarks, updates)
})

for (const values of [
  ['windows'] as const,
  ['windows', 'pc'] as const,
  ['linux', 'windows', 'pc'] as const,
  ['macos', 'steamDeck', 'linux', 'windows', 'pc'] as const,
]) {
  test(`places ${values.length} marks in canonical centered order`, () => {
    const platformMarks = deepFreeze(createMarks(values, {
      assetOrder: [...values].reverse(),
    }))
    const before = structuredClone(platformMarks)
    const first = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
      createContext(platformMarks),
    )
    const second = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
      createContext(platformMarks),
    )
    const updates = first.updates.filter(
      (update) => update.kind === 'platform-mark-layout',
    )
    const expectedOrder = PLATFORM_MARK_OPTIONS
      .map(({ value }) => value)
      .filter((value) => values.includes(value as never))

    assert.equal(first.status, 'applied')
    assert.deepEqual(first, second)
    assert.deepEqual(updates.map(({ markId }) => markId), expectedOrder)
    assert.ok(updates.every(({ layout }) =>
      Object.keys(layout).sort().join(',') === 'scale,x,y'))
    assert.ok(updates.every((update) =>
      Object.isFrozen(update) && Object.isFrozen(update.layout)))
    assertValidGroup(platformMarks, updates)
    assert.deepEqual(platformMarks, before)
  })
}

test('supports one row and a balanced two-row group with center parity', () => {
  const oneRowRegion = {
    centerXPercent: 50,
    centerYPercent: 73,
    widthPercent: 40,
    heightPercent: 10,
  }
  const oneRowMarks = createMarks(['pc', 'windows'])
  const oneRowResult = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(oneRowMarks, {
      region: oneRowRegion,
    }),
  )
  const oneRowUpdates = oneRowResult.updates.filter(
    (update) => update.kind === 'platform-mark-layout',
  )

  assert.equal(oneRowResult.status, 'applied')
  assert.equal(
    new Set(oneRowUpdates.map(({ layout }) => layout.y)).size,
    1,
  )
  assertValidGroup(oneRowMarks, oneRowUpdates, oneRowRegion)

  const twoRowRegion = {
    centerXPercent: 50,
    centerYPercent: 73,
    widthPercent: 20,
    heightPercent: 18,
  }
  const twoRowMarks = createMarks([
    'pc',
    'windows',
    'linux',
    'steamDeck',
    'macos',
  ])
  const twoRowResult = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(twoRowMarks, {
      region: twoRowRegion,
    }),
  )
  const twoRowUpdates = twoRowResult.updates.filter(
    (update) => update.kind === 'platform-mark-layout',
  )
  const rowSizes = Object.values(Object.groupBy(
    twoRowUpdates,
    ({ layout }) => layout.y.toFixed(5),
  )).map((row) => row?.length).sort()

  assert.equal(twoRowResult.status, 'applied')
  assert.deepEqual(rowSizes, [2, 3])
  assertValidGroup(twoRowMarks, twoRowUpdates, twoRowRegion)
})

test('legacy preferredScale remains a bounded preference outside Classic', () => {
  const platformMarks = createMarks(['pc', 'windows', 'linux'])
  const preferredScale = 0.65
  const result = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks, { legacyPreferredScale: preferredScale }),
  )
  const updates = result.updates.filter(
    (update) => update.kind === 'platform-mark-layout',
  )

  assert.equal(result.status, 'applied')
  assert.ok(updates.every(({ layout }) =>
    layout.scale > 0 && layout.scale <= preferredScale))
  assertValidGroup(platformMarks, updates)
})

test('materializes implicit built-ins without changing selected state', () => {
  const platformMarks = deepFreeze({
    ...createDefaultProjectPlatformMarks(),
    values: ['linux'] as PlatformMarkValue[],
    assets: {},
  })
  const before = structuredClone(platformMarks)
  const result = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks),
  )

  assert.equal(result.status, 'applied')
  assert.deepEqual(result.updates.map((update) =>
    update.kind === 'platform-mark-layout' ? update.markId : null), ['linux'])
  assert.deepEqual(platformMarks, before)
  assert.deepEqual(platformMarks.assets, {})
})

test('ignores a missing custom asset while placing valid marks', () => {
  const platformMarks = createMarks(['pc', 'windows'])
  const pcAsset = platformMarks.assets.pc
  assert.ok(pcAsset)
  platformMarks.assets.pc = {
    ...pcAsset,
    source: 'custom',
    customImageDataUrl: 'data:image/png;base64,missing-size',
    customImageSize: null,
  }
  const before = structuredClone(platformMarks)
  const result = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks),
  )

  assert.equal(result.status, 'partial')
  assert.deepEqual(result.updates.map((update) =>
    update.kind === 'platform-mark-layout' ? update.markId : null), [
    'windows',
  ])
  assert.deepEqual(result.warnings, [{
    kind: 'platform-mark-asset-missing',
    slotId: 'disc:guided:operating-system-marks:group',
    target: 'operating-system-marks.enabled',
    markId: 'pc',
  }])
  assert.deepEqual(platformMarks, before)
})

test('disabled selected marks are silently left unchanged', () => {
  const platformMarks = deepFreeze(createMarks(['windows'], {
    disabled: ['windows'],
  }))
  const before = structuredClone(platformMarks)
  const result = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks),
  )

  assert.deepEqual(result, {
    status: 'applied',
    updates: [],
    warnings: [],
  })
  assert.deepEqual(platformMarks, before)
})

test('maps an invalid selected layout to a typed ignored warning', () => {
  const platformMarks = createMarks(['windows'])
  const windowsAsset = platformMarks.assets.windows
  assert.ok(windowsAsset)
  platformMarks.assets.windows = {
    ...windowsAsset,
    layout: {
      ...windowsAsset.layout,
      scale: Number.NaN,
    },
  }
  const before = structuredClone(platformMarks)
  const result = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks),
  )

  assert.equal(result.status, 'partial')
  assert.deepEqual(result.updates, [])
  assert.deepEqual(result.warnings, [{
    kind: 'platform-mark-ignored',
    slotId: 'disc:guided:operating-system-marks:group',
    target: 'operating-system-marks.enabled',
    markId: 'windows',
    reason: 'invalid-layout',
  }])
  assert.deepEqual(platformMarks, before)
})

test('maps invalid and impossible geometry to structured no-op failures', () => {
  const platformMarks = createMarks(['pc', 'windows'])
  const invalid = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks, {
      region: {
        ...classicSlot.resolvedContentRegion,
        centerXPercent: Number.NaN,
      },
    }),
  )
  const impossible = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks, {
      region: {
        centerXPercent: 50,
        centerYPercent: 73,
        widthPercent: 1,
        heightPercent: 1,
      },
    }),
  )

  assert.equal(invalid.status, 'unsupported')
  assert.deepEqual(invalid.updates, [])
  assert.deepEqual(invalid.warnings, [{
    kind: 'invalid-group-region',
    slotId: 'disc:guided:operating-system-marks:group',
    target: 'operating-system-marks.enabled',
  }])
  assert.equal(impossible.status, 'unsupported')
  assert.deepEqual(impossible.updates, [])
  assert.deepEqual(impossible.warnings, [{
    kind: 'grouped-placement-impossible',
    slotId: 'disc:guided:operating-system-marks:group',
    target: 'operating-system-marks.enabled',
  }])
})

test('Classic strict contain keeps the resolved rectangle authoritative across the inner hole', () => {
  const platformMarks = createMarks(['windows'])
  const innerHoleTemplate = {
    ...template,
    id: 'test-large-inner-no-print-hole',
    physicalCenterHoleDiameterMm: 15,
    innerHoleDiameterMm: 64,
  }
  const result = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks, {
      ownerTemplate: innerHoleTemplate,
      resolutionTemplate: innerHoleTemplate,
    }),
  )

  assert.deepEqual(result, {
    status: 'applied',
    updates: [{
      kind: 'platform-mark-layout',
      slotId: 'disc:guided:operating-system-marks:group',
      target: 'operating-system-marks.enabled',
      markId: 'windows',
      layout: {
        x: 50,
        y: 73,
        scale: 1.25,
      },
    }],
    warnings: [],
  })
})

test('rejects missing state, template mismatch, and invalid preferred scale', () => {
  const platformMarks = createMarks(['windows'])
  const context = createContext(platformMarks)
  const missing = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: undefined,
  })
  const mismatched = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate(
    createContext(platformMarks, {
      ownerTemplate: discTemplates.stickyLabelDisc,
    }),
  )
  const malformed = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate({
    ...context,
    ownerState: {
      platformMarks: { values: [], assets: null },
      template,
    } as unknown as typeof context.ownerState,
  })
  const invalidScale = DISC_PLATFORM_MARKS_PRESET_ADAPTER.buildUpdate({
    ...createContext(platformMarks, { legacyPreferredScale: 0 }),
  })

  assert.equal(missing.status, 'unsupported')
  assert.equal(
    'reason' in missing.warnings[0]! && missing.warnings[0].reason,
    'owner-state-unavailable',
  )
  assert.equal(
    'reason' in mismatched.warnings[0]! && mismatched.warnings[0].reason,
    'owner-state-unsupported',
  )
  assert.equal(
    'reason' in malformed.warnings[0]! && malformed.warnings[0].reason,
    'owner-state-unsupported',
  )
  assert.equal(
    'reason' in invalidScale.warnings[0]! &&
      invalidScale.warnings[0].reason,
    'invalid-scale',
  )
})

test('adapter delegates grouped geometry and excludes side effects', () => {
  const source = readFileSync(
    new URL('./discPlatformMarksPresetAdapter.ts', import.meta.url),
    'utf8',
  )

  assert.match(source, /placeGroupedPlatformMarks/)
  assert.doesNotMatch(
    source,
    /buildCenteredRows|createRows|SCALE_SEARCH_ITERATIONS|getVerticalOffsetCandidates/,
  )
  assert.doesNotMatch(
    source,
    /from ['"]react|App\.tsx|components\/|document\.|window\.|projectSchema|createProjectSnapshot|restoreProject|renderer|exportPng|caseInsert|fetch\(|localStorage|sessionStorage|node:fs|@tauri-apps/i,
  )
  assert.doesNotMatch(
    source,
    /statePath|lodash\.set|setIn\(|\[\s*(?:index|i)\s*\]|\.enabled\s*=|\.values\s*=/,
  )
})
