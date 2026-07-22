import assert from 'node:assert/strict'
import test from 'node:test'

import { discTemplates } from '../../templates/discTemplates.ts'
import { CLASSIC_TOP_TITLE_DISC_PRESET } from '../builtins/classicTopTitleDiscPreset.ts'
import type {
  DiscPointPlacementIntentV1,
  DiscPointPresetTarget,
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

const pointCases = [
  {
    target: 'game-title.artwork',
    adapter: DISC_TITLE_ARTWORK_PRESET_ADAPTER,
    state: {
      layout: { enabled: false, x: 4, y: 5, scale: 1.4 },
    },
    expectedKind: 'title-artwork-layout',
  },
  {
    target: 'rating.primary',
    adapter: DISC_RATING_PRESET_ADAPTER,
    state: {
      layout: { enabled: false, x: 14, y: 15, scale: 1.2 },
    },
    expectedKind: 'rating-layout',
  },
  {
    target: 'media-format.primary',
    adapter: DISC_MEDIA_MARK_PRESET_ADAPTER,
    state: {
      layout: { enabled: false, x: 24, y: 25, scale: 0.9 },
    },
    expectedKind: 'media-mark-layout',
  },
  {
    target: 'developer-logo.primary',
    adapter: DISC_DEVELOPER_LOGO_PRESET_ADAPTER,
    state: {
      logoKey: 'developer',
      layout: { enabled: false, x: 34, y: 35, scale: 0.8 },
    },
    expectedKind: 'primary-logo-layout',
  },
  {
    target: 'publisher-logo.primary',
    adapter: DISC_PUBLISHER_LOGO_PRESET_ADAPTER,
    state: {
      logoKey: 'publisher',
      layout: { enabled: false, x: 44, y: 45, scale: 0.7 },
    },
    expectedKind: 'primary-logo-layout',
  },
] as const

function getContext<TTarget extends DiscPointPresetTarget>(
  target: TTarget,
  ownerState: DiscPresetFocusedOwnerState<TTarget> | undefined,
  placementOverride?: DiscPointPlacementIntentV1,
): DiscPresetOwnerPlacementContext<TTarget> {
  const slot = resolution.preset.slots.find((candidate) =>
    candidate.placements.some((placement) => placement.target === target))
  const placement = placementOverride ?? slot?.placements.find(
    (candidate) => candidate.target === target,
  )
  if (!slot || !placement) throw new Error(`Missing ${target} fixture.`)

  return {
    slot,
    placement: placement as DiscPresetOwnerPlacementContext<TTarget>['placement'],
    ownerState,
    template,
  }
}

function invokePointAdapter<TTarget extends DiscPointPresetTarget>(
  adapter: DiscPresetPlacementAdapter<TTarget>,
  context: DiscPresetOwnerPlacementContext<TTarget>,
): DiscPresetOwnerPlacementResult {
  return adapter.buildUpdate(context)
}

test('maps every fixed point target center and scale without enabling it', () => {
  for (const fixture of pointCases) {
    const before = JSON.stringify(fixture.state)
    const context = getContext(
      fixture.target,
      fixture.state as DiscPresetFocusedOwnerState<typeof fixture.target>,
    )
    const result = invokePointAdapter(
      fixture.adapter as DiscPresetPlacementAdapter<typeof fixture.target>,
      context,
    )
    const placement = context.placement

    assert.equal(result.status, 'applied')
    assert.equal(result.updates.length, 1)
    assert.equal(result.updates[0]?.kind, fixture.expectedKind)
    assert.deepEqual(result.updates[0]?.layout, {
      x: context.slot.resolvedContentRegion.centerXPercent,
      y: context.slot.resolvedContentRegion.centerYPercent,
      scale: placement.size.mode === 'fixed-scale'
        ? placement.size.scale
        : NaN,
    })
    assert.equal('enabled' in (result.updates[0]?.layout ?? {}), false)
    assert.equal(JSON.stringify(fixture.state), before)
    assert.ok(Object.isFrozen(result))
    assert.ok(Object.isFrozen(result.updates))
    assert.ok(Object.isFrozen(result.updates[0]?.layout))
  }
})

test('placement is independent of dormant or populated owner content', () => {
  const dormantTitle = {
    source: 'custom',
    imageDataUrl: null,
    defaultSteamLogo: null,
    layout: { enabled: false, x: 5, y: 6, scale: 1.3 },
  }
  const populatedTitle = {
    source: 'steam',
    imageDataUrl: 'data:image/png;base64,title',
    defaultSteamLogo: { imageDataUrl: 'data:image/png;base64,default' },
    layout: { enabled: true, x: 70, y: 71, scale: 0.6 },
  }
  const before = JSON.stringify([dormantTitle, populatedTitle])

  const dormantResult = DISC_TITLE_ARTWORK_PRESET_ADAPTER.buildUpdate(
    getContext('game-title.artwork', { layout: dormantTitle.layout }),
  )
  const populatedResult = DISC_TITLE_ARTWORK_PRESET_ADAPTER.buildUpdate(
    getContext('game-title.artwork', { layout: populatedTitle.layout }),
  )

  assert.deepEqual(dormantResult.updates, populatedResult.updates)
  assert.equal(JSON.stringify([dormantTitle, populatedTitle]), before)
})

test('rating, media, and logo payload identities remain outside updates', () => {
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

  const results = [
    DISC_RATING_PRESET_ADAPTER.buildUpdate(
      getContext('rating.primary', { layout: owners.rating.layout }),
    ),
    DISC_MEDIA_MARK_PRESET_ADAPTER.buildUpdate(
      getContext('media-format.primary', { layout: owners.media.layout }),
    ),
    DISC_DEVELOPER_LOGO_PRESET_ADAPTER.buildUpdate(
      getContext('developer-logo.primary', {
        logoKey: 'developer',
        layout: owners.logos.developerLogoLayout,
      }),
    ),
    DISC_PUBLISHER_LOGO_PRESET_ADAPTER.buildUpdate(
      getContext('publisher-logo.primary', {
        logoKey: 'publisher',
        layout: owners.logos.publisherLogoLayout,
      }),
    ),
  ]

  assert.equal(JSON.stringify(owners), before)
  assert.deepEqual(
    results.flatMap(({ updates }) => updates).map((update) =>
      Object.keys(update.layout).sort()),
    Array.from({ length: 4 }, () => ['scale', 'x', 'y']),
  )
  assert.deepEqual(results[2]?.updates[0], {
    kind: 'primary-logo-layout',
    slotId: 'disc:guided:developer-logo:primary',
    target: 'developer-logo.primary',
    logoKey: 'developer',
    layout: { x: 21, y: 62, scale: 0.7 },
  })
  assert.deepEqual(results[3]?.updates[0], {
    kind: 'primary-logo-layout',
    slotId: 'disc:guided:publisher-logo:primary',
    target: 'publisher-logo.primary',
    logoKey: 'publisher',
    layout: { x: 21, y: 74, scale: 0.7 },
  })
})

test('rejects missing owners, invalid scale, and unsupported fit policy', () => {
  const missing = DISC_RATING_PRESET_ADAPTER.buildUpdate(
    getContext('rating.primary', undefined),
  )
  const invalidScale = DISC_RATING_PRESET_ADAPTER.buildUpdate(
    getContext(
      'rating.primary',
      pointCases[1].state,
      {
        kind: 'point',
        target: 'rating.primary',
        size: { mode: 'fixed-scale', scale: 0 },
      },
    ),
  )
  const fitRegion = DISC_RATING_PRESET_ADAPTER.buildUpdate(
    getContext(
      'rating.primary',
      pointCases[1].state,
      {
        kind: 'point',
        target: 'rating.primary',
        size: { mode: 'fit-region' },
      },
    ),
  )

  assert.equal(missing.status, 'unsupported')
  assert.equal(missing.warnings[0]?.kind, 'placement-unsupported')
  assert.equal(invalidScale.warnings[0]?.kind, 'placement-unsupported')
  assert.deepEqual(
    'reason' in invalidScale.warnings[0]! && invalidScale.warnings[0].reason,
    'invalid-scale',
  )
  assert.deepEqual(
    'reason' in fitRegion.warnings[0]! && fitRegion.warnings[0].reason,
    'unsupported-size-policy',
  )
})
