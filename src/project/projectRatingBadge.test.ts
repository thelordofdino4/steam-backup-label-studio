import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import {
  createDefaultProjectRatingBadge,
  shouldRenderRatingBadge,
  shouldUseCustomRatingBadgeImage,
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
