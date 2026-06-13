import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProjectMetadata,
  getRatingMetadataForSystemChange,
  getRatingValuesForSystem,
  normalizeEsrbRatingValue,
  normalizePegiRatingValue,
  normalizeUskRatingValue,
} from './projectMetadata.ts'
import { getRatingBadgePlaceholderRenderModel } from '../assets/assetManifest.ts'
import {
  createDefaultProjectRatingBadge,
  shouldRenderRatingBadge,
  shouldRenderSupplementalUskRatingBadge,
  shouldUseCustomRatingBadgeImage,
  updateSupplementalUskRatingBadgeEnabledState,
  updateSupplementalUskRatingBadgeValue,
  updateRatingBadgeEnabledState,
} from './projectRatingBadge.ts'

test('clean default project enables a renderable default rating badge', () => {
  const metadata = createDefaultProjectMetadata()
  const ratingBadge = createDefaultProjectRatingBadge()
  const nextState = updateRatingBadgeEnabledState(metadata, ratingBadge, true)

  assert.equal(nextState.ratingBadge.layout.enabled, true)
  assert.equal(nextState.metadata.ratingSystem, 'ESRB')
  assert.equal(nextState.metadata.ratingValue, 'E')
  assert.equal(shouldRenderRatingBadge(nextState.metadata, nextState.ratingBadge), true)
})

test('additional USK badge defaults larger to visually match PEGI badge scale', () => {
  const ratingBadge = createDefaultProjectRatingBadge()

  assert.equal(ratingBadge.uskBadge.layout.scale, 1.2)
})

test('ESRB rating metadata exposes all built-in badge variants in menu order', () => {
  assert.deepEqual(
    getRatingValuesForSystem('ESRB'),
    ['E', 'E10+', 'T', 'M', 'AO', 'RP', 'RP17+'],
  )
})

test('PEGI rating metadata exposes all built-in badge variants in menu order', () => {
  assert.deepEqual(
    getRatingValuesForSystem('PEGI'),
    ['3', '7', '12', '16', '18'],
  )
})

test('USK rating metadata exposes all built-in badge variants in menu order', () => {
  assert.deepEqual(
    getRatingValuesForSystem('USK'),
    ['0', '6', '12', '16', '18'],
  )
})

test('rating system changes return system and coerced value together', () => {
  const esrbMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }
  const pegiMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'PEGI' as const,
    ratingValue: '16',
  }

  assert.deepEqual(
    getRatingMetadataForSystemChange(esrbMetadata, 'PEGI'),
    { ratingSystem: 'PEGI', ratingValue: '3' },
  )
  assert.deepEqual(
    getRatingMetadataForSystemChange(pegiMetadata, 'ESRB'),
    { ratingSystem: 'ESRB', ratingValue: 'E' },
  )
  assert.deepEqual(
    getRatingMetadataForSystemChange(pegiMetadata, 'USK'),
    { ratingSystem: 'USK', ratingValue: '16' },
  )
  assert.deepEqual(
    getRatingMetadataForSystemChange(pegiMetadata, 'custom'),
    { ratingSystem: 'custom', ratingValue: '16' },
  )
})

test('ESRB built-in badge artwork is value-specific and does not use text overlays', () => {
  const e10Model = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'ESRB',
    ratingValue: 'E10+',
  })
  const rp17Model = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'ESRB',
    ratingValue: 'Rating Pending Likely Mature 17+',
  })

  assert.match(e10Model.imageUrl, /rating-badge-esrb-e10-plus\.svg$/)
  assert.deepEqual(e10Model.imageSize, { width: 60, height: 91 })
  assert.equal(e10Model.overlayLabel, null)
  assert.equal(e10Model.altLabel, 'ESRB E10+ rating badge')
  assert.match(rp17Model.imageUrl, /rating-badge-esrb-rp17-plus\.svg$/)
  assert.deepEqual(rp17Model.imageSize, { width: 100, height: 150 })
  assert.equal(rp17Model.overlayLabel, null)
})

test('PEGI built-in badge artwork is value-specific and does not use text overlays', () => {
  const pegiModel = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'PEGI',
    ratingValue: '16',
  })

  assert.match(pegiModel.imageUrl, /rating-badge-pegi-16\.png$/)
  assert.deepEqual(pegiModel.imageSize, { width: 181, height: 220 })
  assert.equal(pegiModel.overlayLabel, null)
  assert.equal(pegiModel.altLabel, 'PEGI 16 rating badge')
})

test('USK built-in badge artwork is value-specific and does not use text overlays', () => {
  const uskModel = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'USK',
    ratingValue: 'ab 18',
  })

  assert.match(uskModel.imageUrl, /rating-badge-usk-18\.svg$/)
  assert.deepEqual(uskModel.imageSize, { width: 1406, height: 1406 })
  assert.equal(uskModel.overlayLabel, null)
  assert.equal(uskModel.altLabel, 'USK 18 rating badge')
})

test('custom built-in rating badges keep generic text overlays', () => {
  const customModel = getRatingBadgePlaceholderRenderModel({
    ratingSystem: 'custom',
    ratingValue: 'USK 12',
  })

  assert.match(customModel.imageUrl, /rating-badge-custom-placeholder\.svg$/)
  assert.equal(customModel.overlayLabel, 'USK 12')
  assert.equal(customModel.altLabel, 'USK 12 rating badge')
})

test('ESRB rating value normalization supports RP17+ sources', () => {
  assert.equal(normalizeEsrbRatingValue('RP17+'), 'RP17+')
  assert.equal(normalizeEsrbRatingValue('RP-LM17-English'), 'RP17+')
  assert.equal(normalizeEsrbRatingValue('Rating Pending Likely Mature 17+'), 'RP17+')
  assert.equal(normalizeEsrbRatingValue('Mature 17+'), 'M')
})

test('PEGI rating value normalization supports labeled sources', () => {
  assert.equal(normalizePegiRatingValue('PEGI 3'), '3')
  assert.equal(normalizePegiRatingValue('pegi16'), '16')
  assert.equal(normalizePegiRatingValue('18'), '18')
  assert.equal(normalizePegiRatingValue('PEGI 21'), null)
})

test('USK rating value normalization supports labeled sources', () => {
  assert.equal(normalizeUskRatingValue('USK 0'), '0')
  assert.equal(normalizeUskRatingValue('USK ab 16'), '16')
  assert.equal(normalizeUskRatingValue('18'), '18')
  assert.equal(normalizeUskRatingValue('USK 21'), null)
})

test('enabling rating badge preserves existing valid rating metadata', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'PEGI' as const,
    ratingValue: '16',
  }
  const nextState = updateRatingBadgeEnabledState(
    metadata,
    createDefaultProjectRatingBadge(),
    true,
  )

  assert.equal(nextState.ratingBadge.layout.enabled, true)
  assert.equal(nextState.metadata.ratingSystem, 'PEGI')
  assert.equal(nextState.metadata.ratingValue, '16')
  assert.equal(shouldRenderRatingBadge(nextState.metadata, nextState.ratingBadge), true)
})

test('additional USK badge renders only as a PEGI companion badge', () => {
  const pegiMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'PEGI' as const,
    ratingValue: '16',
  }
  const uskMetadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'USK' as const,
    ratingValue: '16',
  }
  const ratingBadge = updateSupplementalUskRatingBadgeValue(
    updateSupplementalUskRatingBadgeEnabledState(
      updateRatingBadgeEnabledState(
        pegiMetadata,
        createDefaultProjectRatingBadge(),
        true,
      ).ratingBadge,
      true,
    ),
    '16',
  )

  assert.equal(shouldRenderRatingBadge(pegiMetadata, ratingBadge), true)
  assert.equal(shouldRenderSupplementalUskRatingBadge(pegiMetadata, ratingBadge), true)
  assert.equal(shouldRenderSupplementalUskRatingBadge(uskMetadata, ratingBadge), false)
  assert.equal(
    shouldRenderSupplementalUskRatingBadge(
      pegiMetadata,
      {
        ...ratingBadge,
        layout: {
          ...ratingBadge.layout,
          enabled: false,
        },
      },
    ),
    false,
  )
})

test('custom badge source without an image falls back to placeholder rendering when enabled', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'custom' as const,
    ratingValue: '',
  }
  const ratingBadge = {
    ...createDefaultProjectRatingBadge(),
    source: 'custom' as const,
    customImageDataUrl: null,
    customImageSize: null,
  }
  const nextState = updateRatingBadgeEnabledState(metadata, ratingBadge, true)

  assert.equal(nextState.ratingBadge.layout.enabled, true)
  assert.equal(nextState.ratingBadge.source, 'custom')
  assert.equal(nextState.ratingBadge.customImageDataUrl, null)
  assert.equal(nextState.metadata.ratingSystem, 'custom')
  assert.equal(nextState.metadata.ratingValue, 'Custom')
  assert.equal(shouldRenderRatingBadge(nextState.metadata, nextState.ratingBadge), true)
  assert.equal(shouldUseCustomRatingBadgeImage(nextState.ratingBadge), false)
})

test('disabling rating badge only disables the badge state', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'M',
  }
  const ratingBadge = updateRatingBadgeEnabledState(
    metadata,
    createDefaultProjectRatingBadge(),
    true,
  ).ratingBadge
  const nextState = updateRatingBadgeEnabledState(metadata, ratingBadge, false)

  assert.equal(nextState.ratingBadge.layout.enabled, false)
  assert.equal(nextState.metadata.ratingSystem, 'ESRB')
  assert.equal(nextState.metadata.ratingValue, 'M')
  assert.equal(shouldRenderRatingBadge(nextState.metadata, nextState.ratingBadge), false)
})

test('rating badge preview and export predicates agree on render and image fallback', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'E',
  }
  const placeholderBadge = updateRatingBadgeEnabledState(
    metadata,
    createDefaultProjectRatingBadge(),
    true,
  ).ratingBadge
  const customBadge = {
    ...placeholderBadge,
    source: 'custom' as const,
    customImageDataUrl: 'data:image/png;base64,AAAA',
  }

  assert.equal(shouldRenderRatingBadge(metadata, placeholderBadge), true)
  assert.equal(shouldUseCustomRatingBadgeImage(placeholderBadge), false)
  assert.equal(shouldRenderRatingBadge(metadata, customBadge), true)
  assert.equal(shouldUseCustomRatingBadgeImage(customBadge), true)
  assert.equal(
    shouldRenderRatingBadge(
      createDefaultProjectMetadata(),
      {
        ...placeholderBadge,
        layout: {
          ...placeholderBadge.layout,
          enabled: true,
        },
      },
    ),
    false,
  )
})
