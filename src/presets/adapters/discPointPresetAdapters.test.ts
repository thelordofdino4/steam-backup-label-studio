import assert from 'node:assert/strict'
import test from 'node:test'

import { discTemplates } from '../../templates/discTemplates.ts'
import { CLASSIC_TOP_TITLE_DISC_PRESET } from '../builtins/classicTopTitleDiscPreset.ts'
import type {
  DiscPointPlacementIntentV1,
  DiscPointPresetTarget,
  DiscNormalizedRegion,
} from '../discPresetDefinition.ts'
import type {
  DiscPresetFocusedOwnerState,
} from '../discPresetOwnerPlacement.ts'
import type {
  DiscPresetOwnerPlacementContext,
  DiscPresetOwnerPlacementResult,
  DiscPresetPlacementAdapter,
} from '../discPresetPlacementAdapters.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../discPresetResolution.ts'
import type {
  DiscCanonicalVisualBounds,
} from '../fitVisualBoundsToDiscPresetRegion.ts'
import {
  DISC_DEVELOPER_LOGO_PRESET_ADAPTER,
  DISC_MEDIA_MARK_PRESET_ADAPTER,
  DISC_PUBLISHER_LOGO_PRESET_ADAPTER,
  DISC_RATING_PRESET_ADAPTER,
  DISC_TITLE_ARTWORK_PRESET_ADAPTER,
} from './discPointPresetAdapters.ts'

const template = createDiscPresetTemplateResolutionInput(
  discTemplates.standardPrintableDisc,
)
const resolution = resolveDiscPresetDefinition({
  definition: CLASSIC_TOP_TITLE_DISC_PRESET,
  template,
})

if (resolution.status === 'rejected') {
  throw new Error('Classic fixture must resolve.')
}

const SAFE_TEST_REGION = Object.freeze({
  centerXPercent: 50,
  centerYPercent: 20,
  widthPercent: 30,
  heightPercent: 12,
})

const ASPECT_MATRIX_TEST_REGION = Object.freeze({
  centerXPercent: 50,
  centerYPercent: 20,
  widthPercent: 8,
  heightPercent: 8,
})

const aspectCases = [
  {
    label: 'wide 4:1',
    bounds: {
      centerOffsetXPercent: 1.25,
      centerOffsetYPercent: -0.75,
      widthPercent: 4,
      heightPercent: 1,
    },
    expectedLimitingAxis: 'horizontal',
  },
  {
    label: 'tall 1:4',
    bounds: {
      centerOffsetXPercent: 1.25,
      centerOffsetYPercent: -0.75,
      widthPercent: 1,
      heightPercent: 4,
    },
    expectedLimitingAxis: 'vertical',
  },
  {
    label: 'square 1:1',
    bounds: {
      centerOffsetXPercent: 1.25,
      centerOffsetYPercent: -0.75,
      widthPercent: 4,
      heightPercent: 4,
    },
    expectedLimitingAxis: 'both',
  },
] as const

const pointCases = [
  {
    target: 'game-title.artwork',
    adapter: DISC_TITLE_ARTWORK_PRESET_ADAPTER,
    layout: { enabled: false, x: 4, y: 5, scale: 1.4 },
    bounds: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 20,
      heightPercent: 5,
    },
    expectedKind: 'title-artwork-layout',
  },
  {
    target: 'rating.primary',
    adapter: DISC_RATING_PRESET_ADAPTER,
    layout: { enabled: false, x: 14, y: 15, scale: 1.2 },
    bounds: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 5,
      heightPercent: 10,
    },
    expectedKind: 'rating-layout',
  },
  {
    target: 'media-format.primary',
    adapter: DISC_MEDIA_MARK_PRESET_ADAPTER,
    layout: { enabled: false, x: 24, y: 25, scale: 0.9 },
    bounds: {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 10,
      heightPercent: 10,
    },
    expectedKind: 'media-mark-layout',
  },
  {
    target: 'developer-logo.primary',
    adapter: DISC_DEVELOPER_LOGO_PRESET_ADAPTER,
    logoKey: 'developer',
    layout: { enabled: false, x: 34, y: 35, scale: 0.8 },
    bounds: {
      centerOffsetXPercent: 2,
      centerOffsetYPercent: -1,
      widthPercent: 12,
      heightPercent: 6,
    },
    expectedKind: 'primary-logo-layout',
  },
  {
    target: 'publisher-logo.primary',
    adapter: DISC_PUBLISHER_LOGO_PRESET_ADAPTER,
    logoKey: 'publisher',
    layout: { enabled: false, x: 44, y: 45, scale: 0.7 },
    bounds: {
      centerOffsetXPercent: -1,
      centerOffsetYPercent: 2,
      widthPercent: 6,
      heightPercent: 12,
    },
    expectedKind: 'primary-logo-layout',
  },
] as const

function getOwnerState<TTarget extends DiscPointPresetTarget>(
  target: TTarget,
  layout: Readonly<{ enabled: boolean; x: number; y: number; scale: number }>,
  canonicalVisualBoundsAtScaleOne: DiscCanonicalVisualBounds | null,
): DiscPresetFocusedOwnerState<TTarget> {
  return {
    ...(target === 'developer-logo.primary'
      ? { logoKey: 'developer' }
      : target === 'publisher-logo.primary'
        ? { logoKey: 'publisher' }
        : {}),
    layout,
    canonicalVisualBoundsAtScaleOne,
  } as DiscPresetFocusedOwnerState<TTarget>
}

function getContext<TTarget extends DiscPointPresetTarget>(
  target: TTarget,
  ownerState: DiscPresetFocusedOwnerState<TTarget> | undefined,
  placementOverride?: DiscPointPlacementIntentV1,
  regionOverride?: DiscNormalizedRegion,
): DiscPresetOwnerPlacementContext<TTarget> {
  const sourceSlot = resolution.preset.slots.find((candidate) =>
    candidate.placements.some((placement) => placement.target === target))
  const placement = placementOverride ?? sourceSlot?.placements.find(
    (candidate) => candidate.target === target,
  )
  if (!sourceSlot || !placement) throw new Error(`Missing ${target} fixture.`)

  const slot = regionOverride
    ? Object.freeze({
        ...sourceSlot,
        resolvedContentRegion: regionOverride,
      })
    : sourceSlot

  return {
    slot,
    placement: placement as DiscPresetOwnerPlacementContext<TTarget>['placement'],
    ownerState,
    services: {},
    template,
  }
}

function invokePointAdapter<TTarget extends DiscPointPresetTarget>(
  adapter: DiscPresetPlacementAdapter<TTarget>,
  context: DiscPresetOwnerPlacementContext<TTarget>,
): DiscPresetOwnerPlacementResult {
  return adapter.buildUpdate(context)
}

function getOnlyLayout(result: DiscPresetOwnerPlacementResult) {
  assert.equal(result.updates.length, 1)
  const update = result.updates[0]
  assert.ok(update && 'layout' in update)
  return update.layout
}

test('contain-fits every point target from its focused canonical visual bounds', () => {
  for (const fixture of pointCases) {
    for (const aspect of aspectCases) {
      const state = {
        ...getOwnerState(
          fixture.target,
          fixture.layout,
          aspect.bounds,
        ),
        semanticPayload: Object.freeze({
          source: `${fixture.target}:${aspect.label}`,
        }),
      } as DiscPresetFocusedOwnerState<typeof fixture.target>
      const before = structuredClone(state)
      const context = getContext(
        fixture.target,
        state,
        undefined,
        ASPECT_MATRIX_TEST_REGION,
      )
      const result = invokePointAdapter(
        fixture.adapter as DiscPresetPlacementAdapter<typeof fixture.target>,
        context,
      )
      const layout = getOnlyLayout(result)
      const update = result.updates[0]
      const fittedWidth = aspect.bounds.widthPercent * layout.scale
      const fittedHeight = aspect.bounds.heightPercent * layout.scale

      assert.equal(result.status, 'applied', `${fixture.target} ${aspect.label}`)
      assert.equal(update?.kind, fixture.expectedKind)
      assert.equal(update?.target, fixture.target)
      assert.deepEqual(Object.keys(layout).sort(), ['scale', 'x', 'y'])
      assert.equal(layout.scale, 2)
      assert.equal(
        layout.x + aspect.bounds.centerOffsetXPercent * layout.scale,
        ASPECT_MATRIX_TEST_REGION.centerXPercent,
      )
      assert.equal(
        layout.y + aspect.bounds.centerOffsetYPercent * layout.scale,
        ASPECT_MATRIX_TEST_REGION.centerYPercent,
      )
      assert.ok(
        fittedWidth <= ASPECT_MATRIX_TEST_REGION.widthPercent,
        `${fixture.target} ${aspect.label} width containment`,
      )
      assert.ok(
        fittedHeight <= ASPECT_MATRIX_TEST_REGION.heightPercent,
        `${fixture.target} ${aspect.label} height containment`,
      )
      assert.equal(
        fittedWidth / fittedHeight,
        aspect.bounds.widthPercent / aspect.bounds.heightPercent,
      )
      assert.equal(
        aspect.expectedLimitingAxis === 'horizontal' ||
            aspect.expectedLimitingAxis === 'both'
          ? fittedWidth
          : fittedHeight,
        aspect.expectedLimitingAxis === 'horizontal'
          ? ASPECT_MATRIX_TEST_REGION.widthPercent
          : ASPECT_MATRIX_TEST_REGION.heightPercent,
      )
      if (aspect.expectedLimitingAxis === 'both') {
        assert.equal(fittedHeight, ASPECT_MATRIX_TEST_REGION.heightPercent)
      }
      assert.equal('enabled' in layout, false)
      assert.deepEqual(state, before)
      assert.ok(Object.isFrozen(result))
      assert.ok(Object.isFrozen(result.updates))
      assert.ok(Object.isFrozen(update?.layout))
    }
  }
})

test('fixed-scale remains supported without canonical bounds', () => {
  for (const fixture of pointCases) {
    const ownerWithoutBounds = {
      ...(fixture.target === 'developer-logo.primary'
        ? { logoKey: 'developer' }
        : fixture.target === 'publisher-logo.primary'
          ? { logoKey: 'publisher' }
          : {}),
      layout: fixture.layout,
    } as unknown as DiscPresetFocusedOwnerState<typeof fixture.target>
    const context = getContext(
      fixture.target,
      ownerWithoutBounds,
      {
        kind: 'point',
        target: fixture.target,
        size: { mode: 'fixed-scale', scale: 0.75 },
      },
    )
    const result = invokePointAdapter(
      fixture.adapter as DiscPresetPlacementAdapter<typeof fixture.target>,
      context,
    )

    assert.equal(result.status, 'applied')
    assert.deepEqual(getOnlyLayout(result), {
      x: context.slot.resolvedContentRegion.centerXPercent,
      y: context.slot.resolvedContentRegion.centerYPercent,
      scale: 0.75,
    })
    assert.deepEqual(result.warnings, [])
  }
})

test('dormant point owners seed the center, preserve scale, and report skipped fit', () => {
  for (const fixture of pointCases) {
    const state = getOwnerState(fixture.target, fixture.layout, null)
    const context = getContext(fixture.target, state)
    const result = invokePointAdapter(
      fixture.adapter as DiscPresetPlacementAdapter<typeof fixture.target>,
      context,
    )

    assert.equal(result.status, 'applied')
    assert.deepEqual(getOnlyLayout(result), {
      x: context.slot.resolvedContentRegion.centerXPercent,
      y: context.slot.resolvedContentRegion.centerYPercent,
      scale: fixture.layout.scale,
    })
    assert.deepEqual(result.warnings, [{
      kind: 'placement-skipped',
      slotId: context.slot.id,
      target: fixture.target,
      reason: 'canonical-bounds-unavailable',
    }])
    assert.equal(result.resolvedSlotPatch, undefined)
  }
})

test('off-center rectangular fit reaches the nearest slot edge without annulus shrink', () => {
  const state = getOwnerState(
    'rating.primary',
    pointCases[1].layout,
    {
      centerOffsetXPercent: 1,
      centerOffsetYPercent: -0.5,
      widthPercent: 10,
      heightPercent: 4,
    },
  )
  const region = Object.freeze({
    centerXPercent: 80,
    centerYPercent: 70,
    widthPercent: 30,
    heightPercent: 10,
  })
  const result = DISC_RATING_PRESET_ADAPTER.buildUpdate(
    getContext('rating.primary', state, undefined, region),
  )
  const layout = getOnlyLayout(result)

  assert.equal(result.status, 'applied')
  assert.equal(layout.scale, 2.5)
  assert.equal(layout.x + layout.scale, region.centerXPercent)
  assert.equal(layout.y - 0.5 * layout.scale, region.centerYPercent)
  assert.equal(10 * layout.scale, 25)
  assert.equal(4 * layout.scale, region.heightPercent)
  assert.deepEqual(result.warnings, [])
})

test('a slot over the center hole still uses its full rectangular boundary', () => {
  const state = getOwnerState(
    'media-format.primary',
    pointCases[2].layout,
    {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 10,
      heightPercent: 4,
    },
  )
  const centerRegion = Object.freeze({
    centerXPercent: 50,
    centerYPercent: 50,
    widthPercent: 10,
    heightPercent: 10,
  })
  const result = DISC_MEDIA_MARK_PRESET_ADAPTER.buildUpdate(
    getContext(
      'media-format.primary',
      state,
      undefined,
      centerRegion,
    ),
  )
  const layout = getOnlyLayout(result)

  assert.equal(result.status, 'applied')
  assert.deepEqual(layout, { x: 50, y: 50, scale: 1 })
  assert.equal(10 * layout.scale, centerRegion.widthPercent)
  assert.ok(4 * layout.scale <= centerRegion.heightPercent)
  assert.deepEqual(result.warnings, [])
})

test('invalid non-null canonical bounds return a structured impossible result', () => {
  const state = getOwnerState(
    'game-title.artwork',
    pointCases[0].layout,
    {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 0,
      heightPercent: 10,
    },
  )
  const result = DISC_TITLE_ARTWORK_PRESET_ADAPTER.buildUpdate(
    getContext('game-title.artwork', state),
  )

  assert.equal(result.status, 'partial')
  assert.deepEqual(result.updates, [])
  assert.equal(result.warnings[0]?.kind, 'placement-impossible')
  assert.ok(
    result.warnings[0]?.kind === 'placement-impossible' &&
      result.warnings[0].reason === 'invalid-canonical-bounds',
  )
})

test('rejects missing owners, malformed contain owners, invalid fixed scale, and unknown policies', () => {
  const missing = DISC_RATING_PRESET_ADAPTER.buildUpdate(
    getContext('rating.primary', undefined),
  )
  const malformedContainOwner = DISC_RATING_PRESET_ADAPTER.buildUpdate(
    getContext(
      'rating.primary',
      pointCases[1] as unknown as DiscPresetFocusedOwnerState<'rating.primary'>,
    ),
  )
  const invalidScale = DISC_RATING_PRESET_ADAPTER.buildUpdate(
    getContext(
      'rating.primary',
      getOwnerState('rating.primary', pointCases[1].layout, null),
      {
        kind: 'point',
        target: 'rating.primary',
        size: { mode: 'fixed-scale', scale: 0 },
      },
    ),
  )
  const unknownPolicy = DISC_RATING_PRESET_ADAPTER.buildUpdate(
    getContext(
      'rating.primary',
      getOwnerState('rating.primary', pointCases[1].layout, null),
      {
        kind: 'point',
        target: 'rating.primary',
        size: { mode: 'fit-region' },
      } as unknown as DiscPointPlacementIntentV1,
    ),
  )
  const wrongLogoKey = DISC_DEVELOPER_LOGO_PRESET_ADAPTER.buildUpdate(
    getContext(
      'developer-logo.primary',
      {
        logoKey: 'publisher',
        layout: pointCases[3].layout,
        canonicalVisualBoundsAtScaleOne: null,
      } as unknown as DiscPresetFocusedOwnerState<'developer-logo.primary'>,
    ),
  )

  assert.equal(missing.status, 'unsupported')
  assert.equal(missing.warnings[0]?.kind, 'placement-unsupported')
  assert.equal(malformedContainOwner.status, 'unsupported')
  assert.deepEqual(malformedContainOwner.warnings[0], {
    kind: 'placement-unsupported',
    slotId: 'disc:guided:rating-badge:primary',
    target: 'rating.primary',
    reason: 'owner-state-unsupported',
  })
  assert.deepEqual(invalidScale.warnings[0], {
    kind: 'placement-unsupported',
    slotId: 'disc:guided:rating-badge:primary',
    target: 'rating.primary',
    reason: 'invalid-scale',
  })
  assert.deepEqual(unknownPolicy.warnings[0], {
    kind: 'placement-unsupported',
    slotId: 'disc:guided:rating-badge:primary',
    target: 'rating.primary',
    reason: 'unsupported-size-policy',
  })
  assert.equal(wrongLogoKey.status, 'unsupported')
})

test('updates contain only x, y, and scale and preserve payload identities', () => {
  const owners = {
    rating: {
      system: 'ESRB',
      value: 'teen',
      source: 'custom',
      customImageDataUrl: 'data:image/png;base64,rating',
      uskBadge: { ratingValue: '12', layout: { enabled: true } },
      layout: { enabled: true, x: 8, y: 9, scale: 1 },
    },
    media: {
      value: 'dvdRom',
      source: 'custom',
      theme: 'dark',
      customImageDataUrl: 'data:image/png;base64,media',
      layout: { enabled: true, x: 18, y: 19, scale: 1 },
    },
    logos: {
      developerLogoDataUrl: 'data:image/png;base64,developer',
      publisherLogoDataUrl: 'data:image/png;base64,publisher',
      additionalDeveloperLogos: [{ id: 'developer-extra' }],
      additionalPublisherLogos: [{ id: 'publisher-extra' }],
      developerLogoLayout: { enabled: true, x: 28, y: 29, scale: 1 },
      publisherLogoLayout: { enabled: false, x: 38, y: 39, scale: 1 },
    },
  }
  const before = JSON.stringify(owners)
  const bounds = Object.freeze({
    centerOffsetXPercent: 0,
    centerOffsetYPercent: 0,
    widthPercent: 10,
    heightPercent: 5,
  })
  const results = [
    DISC_RATING_PRESET_ADAPTER.buildUpdate(getContext(
      'rating.primary',
      getOwnerState('rating.primary', owners.rating.layout, bounds),
      undefined,
      SAFE_TEST_REGION,
    )),
    DISC_MEDIA_MARK_PRESET_ADAPTER.buildUpdate(getContext(
      'media-format.primary',
      getOwnerState('media-format.primary', owners.media.layout, bounds),
      undefined,
      SAFE_TEST_REGION,
    )),
    DISC_DEVELOPER_LOGO_PRESET_ADAPTER.buildUpdate(getContext(
      'developer-logo.primary',
      getOwnerState(
        'developer-logo.primary',
        owners.logos.developerLogoLayout,
        bounds,
      ),
      undefined,
      SAFE_TEST_REGION,
    )),
    DISC_PUBLISHER_LOGO_PRESET_ADAPTER.buildUpdate(getContext(
      'publisher-logo.primary',
      getOwnerState(
        'publisher-logo.primary',
        owners.logos.publisherLogoLayout,
        bounds,
      ),
      undefined,
      SAFE_TEST_REGION,
    )),
  ]

  assert.equal(JSON.stringify(owners), before)
  assert.deepEqual(
    results.flatMap(({ updates }) => updates).map((update) =>
      Object.keys(update.layout).sort()),
    Array.from({ length: 4 }, () => ['scale', 'x', 'y']),
  )
})
