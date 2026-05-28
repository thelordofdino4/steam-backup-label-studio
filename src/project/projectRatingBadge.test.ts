import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import {
  createDefaultProjectRatingBadge,
  shouldRenderRatingBadge,
} from './projectRatingBadge.ts'

test('enabled rating badge remains renderable with a valid rating system and value', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'E',
  }
  const ratingBadge = {
    ...createDefaultProjectRatingBadge(),
    layout: {
      ...createDefaultProjectRatingBadge().layout,
      enabled: true,
    },
  }

  assert.equal(shouldRenderRatingBadge(metadata, ratingBadge), true)
})

test('disabled or unrated badge does not render', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    ratingSystem: 'ESRB' as const,
    ratingValue: 'E',
  }
  const ratingBadge = createDefaultProjectRatingBadge()

  assert.equal(shouldRenderRatingBadge(metadata, ratingBadge), false)
  assert.equal(
    shouldRenderRatingBadge(
      createDefaultProjectMetadata(),
      {
        ...ratingBadge,
        layout: {
          ...ratingBadge.layout,
          enabled: true,
        },
      },
    ),
    false,
  )
})
