import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  CLASSIC_TOP_TITLE_DISC_PRESET,
  CLASSIC_TOP_TITLE_DISC_PRESET_ID,
} from '../presets/builtins/classicTopTitleDiscPreset.ts'
import type {
  DiscPointPresetTarget,
} from '../presets/discPresetDefinition.ts'
import {
  createDiscCanonicalVisualBoundsFromCenteredRenderBounds,
} from '../presets/discPresetOwnerPlacement.ts'
import {
  createDiscPresetTemplateResolutionInput,
  resolveDiscPresetDefinition,
} from '../presets/discPresetResolution.ts'
import {
  createDefaultProjectLogoAssets,
  getPrimaryLogoAssetCanonicalVisualBounds,
} from '../project/projectLogoAssets.ts'
import {
  createDefaultProjectMediaMark,
} from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectRatingBadge,
} from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTitleArtwork,
  getTitleArtworkCanonicalVisualBounds,
} from '../project/projectTitleArtwork.ts'
import type {
  ProjectLogoAssets,
  ProjectMediaMark,
  ProjectRatingBadge,
  ProjectTitleArtwork,
} from '../project/projectTypes.ts'
import {
  getMediaMarkCanonicalVisualBounds,
} from '../render/mediaMarkRenderModel.ts'
import {
  getPrimaryRatingBadgeCanonicalVisualBounds,
} from '../render/ratingBadgeRenderModel.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  applyActiveDiscPresetToDeveloperLogoState,
  applyActiveDiscPresetToLogoAssetsState,
  applyActiveDiscPresetToMediaMarkState,
  applyActiveDiscPresetToPublisherLogoState,
  applyActiveDiscPresetToRatingBadgeState,
  applyActiveDiscPresetToTitleArtworkState,
  isActiveDiscPresetPointFitImpossible,
} from './appActiveDiscPresetPointOwners.ts'
import {
  applySupplementalUskRatingCandidate,
} from './appSupplementalUskRatingCandidate.ts'

const template = discTemplates.standardPrintableDisc

function createActivePresetState(selectedTemplate: DiscTemplate = template) {
  const resolution = resolveDiscPresetDefinition({
    definition: CLASSIC_TOP_TITLE_DISC_PRESET,
    template: createDiscPresetTemplateResolutionInput(selectedTemplate),
  })

  if (resolution.status === 'rejected') {
    throw new Error('Classic test preset could not be resolved.')
  }

  return Object.freeze({
    ref: Object.freeze({
      id: CLASSIC_TOP_TITLE_DISC_PRESET_ID,
      revision: 1,
    }),
    resolvedDefinition: resolution.preset,
  })
}

function createTitleArtwork(
  imageSize: ProjectTitleArtwork['imageSize'],
): ProjectTitleArtwork {
  return {
    ...createDefaultProjectTitleArtwork(template, 'top'),
    source: 'custom',
    steamArtworkAssetId: null,
    sourceLabel: imageSize ? 'title.png' : '',
    imageDataUrl: imageSize ? 'data:image/png;base64,title' : null,
    imageSize,
    layout: {
      enabled: false,
      x: 7,
      y: 88,
      scale: 2.25,
    },
  }
}

function createRatingBadge(): ProjectRatingBadge {
  return {
    ...createDefaultProjectRatingBadge(template),
    source: 'custom',
    customImageDataUrl: 'data:image/png;base64,rating',
    customImageSize: { width: 210, height: 300 },
    layout: { enabled: true, x: 13, y: 14, scale: 1.7 },
    uskBadge: {
      ratingValue: '16',
      layout: { enabled: true, x: 45, y: 46, scale: 0.8 },
    },
  }
}

function createMediaMark(): ProjectMediaMark {
  return {
    ...createDefaultProjectMediaMark(template),
    value: 'dvdRom',
    source: 'custom',
    theme: 'dark',
    customImageDataUrl: 'data:image/png;base64,media',
    customImageSize: { width: 420, height: 120 },
    layout: { enabled: true, x: 15, y: 16, scale: 0.6 },
  }
}

function createLogoAssets(): ProjectLogoAssets {
  return {
    ...createDefaultProjectLogoAssets(template),
    developerLogoDataUrl: 'data:image/png;base64,developer',
    developerLogoSource: {
      source: 'uploaded',
      sourceId: 'developer-id',
      sourceLabel: 'developer.png',
    },
    developerLogoSize: { width: 500, height: 100 },
    developerLogoLayout: { enabled: true, x: 88, y: 11, scale: 1.9 },
    publisherLogoDataUrl: 'data:image/png;base64,publisher',
    publisherLogoSource: {
      source: 'official-logo-candidate',
      sourceId: 'publisher-id',
      sourceLabel: 'publisher.png',
    },
    publisherLogoSize: { width: 180, height: 360 },
    publisherLogoLayout: { enabled: false, x: 87, y: 12, scale: 1.8 },
    additionalDeveloperLogos: [{
      id: 'additional-developer',
      label: 'Additional developer',
      imageDataUrl: 'data:image/png;base64,additional-developer',
      imageSize: { width: 200, height: 100 },
      layout: { enabled: true, x: 10, y: 80, scale: 0.7 },
    }],
    additionalPublisherLogos: [{
      id: 'additional-publisher',
      label: 'Additional publisher',
      imageDataUrl: 'data:image/png;base64,additional-publisher',
      imageSize: { width: 200, height: 100 },
      layout: { enabled: true, x: 90, y: 80, scale: 0.7 },
    }],
  }
}

function assertTouchesClassicSlotBoundary(
  target: DiscPointPresetTarget,
  scale: number,
  renderBounds: Readonly<{ halfWidth: number; halfHeight: number }> | null,
) {
  assert.ok(renderBounds)
  const slot = createActivePresetState().resolvedDefinition.slots.find(
    (candidate) => candidate.placements.some((placement) =>
      placement.target === target),
  )
  assert.ok(slot)

  const fittedWidth = renderBounds.halfWidth * 2 * scale
  const fittedHeight = renderBounds.halfHeight * 2 * scale
  const region = slot.resolvedContentRegion
  const tolerance = 0.000001

  assert.ok(
    fittedWidth <= region.widthPercent + tolerance,
    `${target} exceeds its slot width`,
  )
  assert.ok(
    fittedHeight <= region.heightPercent + tolerance,
    `${target} exceeds its slot height`,
  )
  assert.ok(
    Math.abs(fittedWidth - region.widthPercent) <= tolerance ||
      Math.abs(fittedHeight - region.heightPercent) <= tolerance,
    `${target} does not touch either rectangular slot boundary`,
  )
}

test('centered render bounds cross the preset boundary without fallback geometry', () => {
  assert.deepEqual(
    createDiscCanonicalVisualBoundsFromCenteredRenderBounds({
      halfWidth: 12,
      halfHeight: 7,
    }),
    {
      centerOffsetXPercent: 0,
      centerOffsetYPercent: 0,
      widthPercent: 24,
      heightPercent: 14,
    },
  )
  assert.equal(
    createDiscCanonicalVisualBoundsFromCenteredRenderBounds(null),
    null,
  )
  assert.equal(
    createDiscCanonicalVisualBoundsFromCenteredRenderBounds({
      halfWidth: 0,
      halfHeight: 7,
    }),
    null,
  )
})

test('dormant Title artwork seeds the slot center and preserves dormant scale', () => {
  const titleArtwork = createTitleArtwork(null)
  const before = structuredClone(titleArtwork)
  const result = applyActiveDiscPresetToTitleArtworkState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    titleArtwork,
  })

  assert.equal(result.application?.status, 'applied')
  assert.deepEqual(result.application?.updates.map(({ target }) => target), [
    'game-title.artwork',
  ])
  assert.deepEqual(result.titleArtwork.layout, {
    enabled: false,
    x: 50,
    y: 19.5,
    scale: 2.25,
  })
  assert.ok(result.application?.warnings.some((warning) =>
    warning.kind === 'placement-skipped' &&
    warning.reason === 'canonical-bounds-unavailable'))
  assert.deepEqual(
    { ...result.titleArtwork, layout: before.layout },
    before,
  )
  assert.deepEqual(titleArtwork, before)
})

test('first Title asset and a later replacement refit from current canonical bounds', () => {
  const dormant = applyActiveDiscPresetToTitleArtworkState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    titleArtwork: createTitleArtwork(null),
  }).titleArtwork
  const firstAsset = {
    ...dormant,
    sourceLabel: 'wide-title.png',
    imageDataUrl: 'data:image/png;base64,wide-title',
    imageSize: { width: 900, height: 200 },
  }
  const first = applyActiveDiscPresetToTitleArtworkState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    titleArtwork: firstAsset,
  })
  const replacementAsset = {
    ...first.titleArtwork,
    sourceLabel: 'tall-title.png',
    imageDataUrl: 'data:image/png;base64,tall-title',
    imageSize: { width: 200, height: 900 },
    layout: {
      ...first.titleArtwork.layout,
      x: 4,
      y: 96,
      scale: 0.37,
    },
  }
  const replacement = applyActiveDiscPresetToTitleArtworkState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    titleArtwork: replacementAsset,
  })

  assert.equal(first.application?.status, 'applied')
  assert.equal(replacement.application?.status, 'applied')
  assert.equal(first.titleArtwork.layout.x, 50)
  assert.equal(first.titleArtwork.layout.y, 19.5)
  assert.equal(replacement.titleArtwork.layout.x, 50)
  assert.equal(replacement.titleArtwork.layout.y, 19.5)
  assert.notEqual(
    first.titleArtwork.layout.scale,
    replacement.titleArtwork.layout.scale,
  )
  assertTouchesClassicSlotBoundary(
    'game-title.artwork',
    first.titleArtwork.layout.scale,
    getTitleArtworkCanonicalVisualBounds(firstAsset),
  )
  assertTouchesClassicSlotBoundary(
    'game-title.artwork',
    replacement.titleArtwork.layout.scale,
    getTitleArtworkCanonicalVisualBounds(replacementAsset),
  )
  assert.equal(replacement.titleArtwork.sourceLabel, 'tall-title.png')
  assert.equal(replacement.titleArtwork.layout.enabled, false)
})

test('Rating fit changes only primary x/y/scale and preserves supplemental USK state', () => {
  const ratingBadge = createRatingBadge()
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'PEGI' as const,
    ratingValue: '16',
  }
  const before = structuredClone(ratingBadge)
  const result = applyActiveDiscPresetToRatingBadgeState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    ratingBadge,
    metadata,
  })

  assert.equal(result.application?.status, 'applied')
  assert.deepEqual(result.application?.updates.map(({ target }) => target), [
    'rating.primary',
  ])
  assert.equal(result.ratingBadge.layout.x, 79)
  assert.equal(result.ratingBadge.layout.y, 62)
  assert.equal(result.ratingBadge.layout.enabled, true)
  assert.equal(result.ratingBadge.source, before.source)
  assert.equal(
    result.ratingBadge.customImageDataUrl,
    before.customImageDataUrl,
  )
  assert.equal(result.ratingBadge.customImageSize, ratingBadge.customImageSize)
  assert.equal(result.ratingBadge.uskBadge, ratingBadge.uskBadge)
  assert.deepEqual(result.ratingBadge.uskBadge, before.uskBadge)
  assertTouchesClassicSlotBoundary(
    'rating.primary',
    result.ratingBadge.layout.scale,
    getPrimaryRatingBadgeCanonicalVisualBounds(metadata, ratingBadge),
  )
  assert.deepEqual(ratingBadge, before)
})

test('supplemental USK candidate refits a newly enabled primary Rating', () => {
  const ratingBadge = {
    ...createRatingBadge(),
    source: 'placeholder' as const,
    customImageDataUrl: null,
    customImageSize: null,
    layout: {
      enabled: false,
      x: 13,
      y: 14,
      scale: 1.7,
    },
    uskBadge: {
      ratingValue: '0',
      layout: {
        enabled: false,
        x: 70,
        y: 70,
        scale: 0.8,
      },
    },
  }
  let fittedInput: ProjectRatingBadge | null = null
  const fittedLayout = {
    enabled: true,
    x: 79,
    y: 62,
    scale: 1.125,
  }
  const result = applySupplementalUskRatingCandidate({
    selectedDiscTemplate: template,
    ratingBadge,
    metadata: {
      ratingSystem: 'PEGI',
      ratingValue: '18',
    },
    supplementalRatingValue: '16',
    applyActivePrimaryRatingPlacement: (candidate) => {
      fittedInput = candidate
      return {
        ...candidate,
        layout: fittedLayout,
      }
    },
  })

  assert.ok(fittedInput)
  assert.equal(fittedInput.layout.enabled, true)
  assert.equal(result.layout, fittedLayout)
  assert.deepEqual(result.uskBadge, {
    ratingValue: '16',
    layout: {
      enabled: true,
      x: 70,
      y: 70,
      scale: 0.8,
    },
  })
})

test('supplemental USK candidate preserves an already enabled primary Rating placement', () => {
  const ratingBadge = {
    ...createRatingBadge(),
    source: 'placeholder' as const,
    customImageDataUrl: null,
    customImageSize: null,
    layout: {
      enabled: true,
      x: 13,
      y: 14,
      scale: 1.7,
    },
    uskBadge: {
      ratingValue: '0',
      layout: {
        enabled: false,
        x: 70,
        y: 70,
        scale: 0.8,
      },
    },
  }
  let fitCallCount = 0
  const result = applySupplementalUskRatingCandidate({
    selectedDiscTemplate: template,
    ratingBadge,
    metadata: {
      ratingSystem: 'PEGI',
      ratingValue: '18',
    },
    supplementalRatingValue: '16',
    applyActivePrimaryRatingPlacement: () => {
      fitCallCount += 1
      return null
    },
  })

  assert.equal(fitCallCount, 0)
  assert.equal(result.layout, ratingBadge.layout)
  assert.deepEqual(result.layout, {
    enabled: true,
    x: 13,
    y: 14,
    scale: 1.7,
  })
  assert.deepEqual(result.uskBadge, {
    ratingValue: '16',
    layout: {
      enabled: true,
      x: 70,
      y: 70,
      scale: 0.8,
    },
  })
})

test('Media replacement fits only the Media owner and preserves semantic fields', () => {
  const mediaMark = createMediaMark()
  const before = structuredClone(mediaMark)
  const result = applyActiveDiscPresetToMediaMarkState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    mediaMark,
  })

  assert.equal(result.application?.status, 'applied')
  assert.deepEqual(result.application?.updates.map(({ target }) => target), [
    'media-format.primary',
  ])
  assert.equal(result.mediaMark.layout.x, 80)
  assert.equal(result.mediaMark.layout.y, 76)
  assert.equal(result.mediaMark.layout.enabled, true)
  assert.equal(result.mediaMark.value, before.value)
  assert.equal(result.mediaMark.source, before.source)
  assert.equal(result.mediaMark.theme, before.theme)
  assert.equal(result.mediaMark.customImageSize, mediaMark.customImageSize)
  assertTouchesClassicSlotBoundary(
    'media-format.primary',
    result.mediaMark.layout.scale,
    getMediaMarkCanonicalVisualBounds(mediaMark),
  )
  assert.deepEqual(mediaMark, before)
})

test('Developer and Publisher fits remain independent and preserve additional logos', () => {
  const logoAssets = createLogoAssets()
  const before = structuredClone(logoAssets)
  const developer = applyActiveDiscPresetToDeveloperLogoState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    logoAssets,
  })

  assert.deepEqual(developer.application?.updates.map(({ target }) => target), [
    'developer-logo.primary',
  ])
  assert.equal(developer.logoAssets.developerLogoLayout.x, 21)
  assert.equal(developer.logoAssets.developerLogoLayout.y, 62)
  assert.equal(
    developer.logoAssets.publisherLogoLayout,
    logoAssets.publisherLogoLayout,
  )
  assert.equal(
    developer.logoAssets.additionalDeveloperLogos,
    logoAssets.additionalDeveloperLogos,
  )
  assert.equal(
    developer.logoAssets.additionalPublisherLogos,
    logoAssets.additionalPublisherLogos,
  )

  const publisher = applyActiveDiscPresetToPublisherLogoState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    logoAssets: developer.logoAssets,
  })

  assert.deepEqual(publisher.application?.updates.map(({ target }) => target), [
    'publisher-logo.primary',
  ])
  assert.equal(publisher.logoAssets.publisherLogoLayout.x, 21)
  assert.equal(publisher.logoAssets.publisherLogoLayout.y, 74)
  assert.equal(
    publisher.logoAssets.developerLogoLayout,
    developer.logoAssets.developerLogoLayout,
  )
  assert.equal(
    publisher.logoAssets.additionalDeveloperLogos,
    logoAssets.additionalDeveloperLogos,
  )
  assert.equal(
    publisher.logoAssets.additionalPublisherLogos,
    logoAssets.additionalPublisherLogos,
  )
  assert.equal(publisher.logoAssets.developerLogoDataUrl, before.developerLogoDataUrl)
  assert.equal(publisher.logoAssets.publisherLogoDataUrl, before.publisherLogoDataUrl)
  assertTouchesClassicSlotBoundary(
    'developer-logo.primary',
    publisher.logoAssets.developerLogoLayout.scale,
    getPrimaryLogoAssetCanonicalVisualBounds(logoAssets, 'developer'),
  )
  assertTouchesClassicSlotBoundary(
    'publisher-logo.primary',
    publisher.logoAssets.publisherLogoLayout.scale,
    getPrimaryLogoAssetCanonicalVisualBounds(logoAssets, 'publisher'),
  )
  assert.deepEqual(logoAssets, before)
})

test('Developer and Publisher fallback placeholders contain-fit the full Classic slot height', () => {
  const logoAssets = createDefaultProjectLogoAssets(template)
  logoAssets.developerLogoLayout = {
    ...logoAssets.developerLogoLayout,
    enabled: true,
    x: 88,
    y: 11,
    scale: 0.5,
  }
  logoAssets.publisherLogoLayout = {
    ...logoAssets.publisherLogoLayout,
    enabled: true,
    x: 87,
    y: 12,
    scale: 1.8,
  }
  logoAssets.additionalDeveloperLogos = createLogoAssets().additionalDeveloperLogos
  logoAssets.additionalPublisherLogos = createLogoAssets().additionalPublisherLogos

  const developer = applyActiveDiscPresetToDeveloperLogoState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    logoAssets,
  })
  const publisher = applyActiveDiscPresetToPublisherLogoState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    logoAssets: developer.logoAssets,
  })
  const expectedScale = 4 / 3

  assert.deepEqual(
    {
      x: publisher.logoAssets.developerLogoLayout.x,
      y: publisher.logoAssets.developerLogoLayout.y,
      scale: publisher.logoAssets.developerLogoLayout.scale,
    },
    { x: 21, y: 62, scale: expectedScale },
  )
  assert.deepEqual(
    {
      x: publisher.logoAssets.publisherLogoLayout.x,
      y: publisher.logoAssets.publisherLogoLayout.y,
      scale: publisher.logoAssets.publisherLogoLayout.scale,
    },
    { x: 21, y: 74, scale: expectedScale },
  )

  for (const logoKey of ['developer', 'publisher'] as const) {
    const bounds = getPrimaryLogoAssetCanonicalVisualBounds(
      publisher.logoAssets,
      logoKey,
    )
    assert.ok(bounds)
    assert.equal(bounds.halfWidth * 2 * expectedScale, 24)
    assert.equal(bounds.halfHeight * 2 * expectedScale, 9)
  }
  assert.equal(
    publisher.logoAssets.additionalDeveloperLogos,
    logoAssets.additionalDeveloperLogos,
  )
  assert.equal(
    publisher.logoAssets.additionalPublisherLogos,
    logoAssets.additionalPublisherLogos,
  )
  assert.deepEqual(developer.application?.warnings, [])
  assert.deepEqual(publisher.application?.warnings, [])
})

test('generic logo wrapper delegates to the requested primary owner only', () => {
  const logoAssets = createLogoAssets()
  const result = applyActiveDiscPresetToLogoAssetsState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    logoAssets,
    logoKey: 'publisher',
  })

  assert.deepEqual(result.application?.updates.map(({ target }) => target), [
    'publisher-logo.primary',
  ])
  assert.equal(result.logoAssets.developerLogoLayout, logoAssets.developerLogoLayout)
})

test('a large center hole does not shrink or reject an authoritative slot fit', () => {
  const unsafeTemplate: DiscTemplate = {
    ...template,
    id: 'test-large-center-hole',
    physicalCenterHoleDiameterMm: 77,
    innerHoleDiameterMm: 77,
  }
  const logoAssets = createLogoAssets()
  const baseline = applyActiveDiscPresetToDeveloperLogoState({
    presetState: createActivePresetState(),
    selectedDiscTemplate: template,
    logoAssets,
  })
  const result = applyActiveDiscPresetToDeveloperLogoState({
    presetState: createActivePresetState(unsafeTemplate),
    selectedDiscTemplate: unsafeTemplate,
    logoAssets,
  })

  assert.equal(result.application?.status, 'applied')
  assert.deepEqual(result.application?.warnings, [])
  assert.deepEqual(
    result.logoAssets.developerLogoLayout,
    baseline.logoAssets.developerLogoLayout,
  )
  assert.equal(
    isActiveDiscPresetPointFitImpossible(
      result.application,
      'developer-logo.primary',
    ),
    false,
  )
  assertTouchesClassicSlotBoundary(
    'developer-logo.primary',
    result.logoAssets.developerLogoLayout.scale,
    getPrimaryLogoAssetCanonicalVisualBounds(logoAssets, 'developer'),
  )
  assert.equal(result.logoAssets.developerLogoDataUrl, logoAssets.developerLogoDataUrl)
})

test('no active preset preserves every full authoritative owner by reference', () => {
  const titleArtwork = createTitleArtwork({ width: 900, height: 200 })
  const ratingBadge = createRatingBadge()
  const mediaMark = createMediaMark()
  const logoAssets = createLogoAssets()
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }

  const title = applyActiveDiscPresetToTitleArtworkState({
    presetState: null,
    selectedDiscTemplate: template,
    titleArtwork,
  })
  const rating = applyActiveDiscPresetToRatingBadgeState({
    presetState: null,
    selectedDiscTemplate: template,
    ratingBadge,
    metadata,
  })
  const media = applyActiveDiscPresetToMediaMarkState({
    presetState: null,
    selectedDiscTemplate: template,
    mediaMark,
  })
  const logos = applyActiveDiscPresetToDeveloperLogoState({
    presetState: null,
    selectedDiscTemplate: template,
    logoAssets,
  })

  assert.equal(title.application, null)
  assert.equal(rating.application, null)
  assert.equal(media.application, null)
  assert.equal(logos.application, null)
  assert.equal(title.titleArtwork, titleArtwork)
  assert.equal(rating.ratingBadge, ratingBadge)
  assert.equal(media.mediaMark, mediaMark)
  assert.equal(logos.logoAssets, logoAssets)
})

test('point-owner integration stays pure, focused, and free of Classic geometry', () => {
  const source = readFileSync(
    'src/app/appActiveDiscPresetPointOwners.ts',
    'utf8',
  )

  assert.match(source, /resolveDiscPresetPlacementForTarget\(\{/)
  assert.match(source, /DISC_PRESET_PRODUCTION_ADAPTER_REGISTRY/)
  assert.doesNotMatch(source, /CLASSIC_TOP_TITLE|classic-top-title/i)
  assert.doesNotMatch(source, /clamp[A-Z]|useEffect|setTimeout|document\.|window\./)
  assert.doesNotMatch(
    source,
    /completedSlotIds|omittedSlotIds|discGuidedWorkflow/,
  )
})
