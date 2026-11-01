import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareImportedImageDataUrl, ImportedImagePolicyError } from './importedImagePolicy.ts'
import { validateImportedImageDataUrl } from '../tauri/importedImageValidation.ts'

for (const mime of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/jpg']) {
  test(`ordinary ${mime} import crosses the native boundary with exact bytes`, async () => {
    const input = `data:${mime};base64,AA==`
    const canonicalMime = mime === 'image/jpg' ? 'image/jpeg' : mime
    let calls = 0
    const result = await validateImportedImageDataUrl(input, async (command, bytes) => {
      calls++
      assert.equal(command, 'validate_imported_image_asset')
      assert.ok(bytes instanceof Uint8Array)
      assert.equal(new TextDecoder().decode(bytes), `data:${canonicalMime};base64,AA==`)
      return { status: 'success', mimeType: canonicalMime, width: 1, height: 1 }
    })
    assert.equal(result, `data:${canonicalMime};base64,AA==`)
    assert.equal(calls, 1)
  })
}

test('unsupported SVG, AVIF, TIFF, ICO and non-data imports reject before invoking/decoding', async () => {
  for (const input of ['data:image/svg+xml;base64,PHN2Zy8+', 'data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E',
    'data:image/avif;base64,AA==', 'data:image/tiff;base64,AA==', 'data:image/x-icon;base64,AA==',
    'data:text/html;base64,AA==', 'https://example.test/image.png', 'blob:unowned']) {
    await assert.rejects(validateImportedImageDataUrl(input, async () => {
      assert.fail('unsupported input must never cross the native boundary')
    }), /Choose PNG, JPEG, WebP, GIF, or BMP/)
  }
})

test('native rejection and unavailable or malformed validation fail closed with actionable copy', async () => {
  const input = 'data:image/png;base64,AA=='
  for (const code of ['project.package.asset-type-unsupported', 'project.package.asset-jpeg-profile-unsupported',
    'project.package.asset-bmp-profile-unsupported', 'project.package.asset-type-invalid',
    'project.package.resource-limit-exceeded']) {
    await assert.rejects(validateImportedImageDataUrl(input, async () => { throw { code } }), ImportedImagePolicyError)
  }
  for (const result of [null, { status: 'success' }, { status: 'success', mimeType: 'image/gif', width: 1, height: 1 },
    { status: 'success', mimeType: 'image/png', width: 0, height: 1 }]) {
    await assert.rejects(validateImportedImageDataUrl(input, async () => result), /could not be validated/)
  }
  await assert.rejects(validateImportedImageDataUrl(input, async () => { throw Error('bridge unavailable') }), /desktop app/)
  assert.equal(prepareImportedImageDataUrl('data:IMAGE/JPG;base64,AA=='), 'data:image/jpeg;base64,AA==')
})
