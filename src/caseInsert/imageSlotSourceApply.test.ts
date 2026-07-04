import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyLoadedCaseInsertImageSlotSource,
} from './imageSlotSourceApply.ts'
import type { CaseInsertImageSlotImageInput } from './types.ts'

const image: CaseInsertImageSlotImageInput = {
  imageDataUrl: 'data:image/png;base64,abc123',
  imageSize: {
    height: 20,
    width: 10,
  },
}

test('loaded case insert image slot source applies image and announces success', async () => {
  const appliedImages: CaseInsertImageSlotImageInput[] = []
  const statuses: string[] = []

  const applied = await applyLoadedCaseInsertImageSlotSource({
    announceStatus: (message) => statuses.push(message),
    applyImage: (nextImage) => appliedImages.push(nextImage),
    importedImagePromise: Promise.resolve({
      image,
      successStatus: 'Using Steam Capsule as the cover artwork.',
    }),
  })

  assert.equal(applied, true)
  assert.deepEqual(appliedImages, [image])
  assert.deepEqual(statuses, ['Using Steam Capsule as the cover artwork.'])
})

test('loaded case insert image slot source ignores null imports', async () => {
  const appliedImages: CaseInsertImageSlotImageInput[] = []
  const statuses: string[] = []

  const applied = await applyLoadedCaseInsertImageSlotSource({
    announceStatus: (message) => statuses.push(message),
    applyImage: (nextImage) => appliedImages.push(nextImage),
    importedImagePromise: Promise.resolve(null),
  })

  assert.equal(applied, false)
  assert.deepEqual(appliedImages, [])
  assert.deepEqual(statuses, [])
})
