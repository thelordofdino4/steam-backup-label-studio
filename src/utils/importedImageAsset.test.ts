import { readImageFileAsDataUrl } from './imageFile.ts'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createImportedImageAssetFromDataUrl } from './importedImageAsset.ts'
import { ImportedImagePolicyError } from '../image/importedImagePolicy.ts'

test('import rejection precedes browser image decoding, bounds inspection and adoption', async () => {
  const prior = { imageDataUrl: 'previous accepted image' }
  let adopted: unknown = prior
  await assert.rejects(async () => {
    adopted = await createImportedImageAssetFromDataUrl('data:image/svg+xml;base64,PHN2Zy8+', 'art.svg', {
      validate: async () => { throw new ImportedImagePolicyError('Convert SVG to PNG.') },
      load: async () => { assert.fail('rejected image must not be rendered') },
      inspect: () => { assert.fail('rejected image must not be inspected') },
    })
  }, /Convert SVG to PNG/)
  assert.equal(adopted, prior)
})

test('accepted bytes use existing display dimensions and active-pixel inspection without transcoding', async () => {
  const calls: string[] = []
  const image = {} as HTMLImageElement
  const size = { width: 30, height: 20, contentBounds: { x: 3, y: 2, width: 15, height: 10 } }
  const result = await createImportedImageAssetFromDataUrl('data:image/jpg;base64,AA==', 'original.jpg', {
    validate: async () => { calls.push('validate'); return 'data:image/jpeg;base64,AA==' },
    load: async (url, label) => {
      calls.push('decode'); assert.equal(url, 'data:image/jpeg;base64,AA=='); assert.equal(label, 'original.jpg'); return image
    },
    inspect: (loaded) => { calls.push('inspect'); assert.equal(loaded, image); return size },
  })
  assert.deepEqual(calls, ['validate', 'decode', 'inspect'])
  assert.deepEqual(result, { imageDataUrl: 'data:image/jpeg;base64,AA==', imageSize: size, fileName: 'original.jpg' })
})

test('over-limit files fail before FileReader allocation', async () => {
  await assert.rejects(readImageFileAsDataUrl({ size: 67_108_865, name: 'large.png' } as File), /at most 64 MiB/)
})
