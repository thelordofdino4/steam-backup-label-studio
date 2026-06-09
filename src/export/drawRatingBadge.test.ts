import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectRatingBadge,
  updateRatingBadgeEnabledState,
} from '../project/projectRatingBadge.ts'
import { drawRatingBadge } from './drawRatingBadge.ts'

type DrawImageCall = unknown[]

function createDrawImageContext() {
  const calls: DrawImageCall[] = []

  return {
    calls,
    context: {
      drawImage: (...args: DrawImageCall) => {
        calls.push(args)
      },
    } as unknown as CanvasRenderingContext2D,
  }
}

function createLoadedImage(width: number, height: number) {
  return {
    naturalWidth: width,
    naturalHeight: height,
    width,
    height,
  } as HTMLImageElement
}

test('rating badge export uses the selected ESRB built-in artwork', async () => {
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
  const loadedSources: string[] = []
  const { context, calls } = createDrawImageContext()

  await drawRatingBadge(
    context,
    1000,
    0,
    metadata,
    ratingBadge,
    async (source) => {
      loadedSources.push(source)
      return createLoadedImage(90, 130)
    },
  )

  assert.equal(calls.length, 1)
  assert.equal(loadedSources.length, 1)
  assert.match(loadedSources[0], /rating-badge-esrb-m\.svg$/)
  assert.doesNotMatch(loadedSources[0], /rating-badge-custom-placeholder/)
})
