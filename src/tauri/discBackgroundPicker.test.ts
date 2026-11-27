import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { ImportedImagePolicyError, MAX_IMPORTED_IMAGE_FILE_BYTES } from '../image/importedImagePolicy.ts'
import { canUseNativeDiscBackgroundPicker, pickDiscBackgroundFile } from './discBackgroundPicker.ts'

function frame(name = 'カバー 🎮.png', mime = 1, data = [0, 17, 255]) {
  const label = new TextEncoder().encode(name)
  const result = new Uint8Array(11 + label.length + data.length)
  result.set(new TextEncoder().encode('SBLSBGI1'))
  result[8] = mime
  new DataView(result.buffer).setUint16(9, label.length, true)
  result.set(label, 11)
  result.set(data, 11 + label.length)
  return result
}

test('only Windows Tauri selects the app-owned picker', () => {
  assert.equal(canUseNativeDiscBackgroundPicker(true, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), true)
  assert.equal(canUseNativeDiscBackgroundPicker(false, 'Windows NT'), false)
  assert.equal(canUseNativeDiscBackgroundPicker(true, 'X11; Linux x86_64'), false)
  assert.equal(canUseNativeDiscBackgroundPicker(true, 'Macintosh; Intel Mac OS X'), false)
})

test('the native picker supplies only an exact raster File and cannot accept a caller path', async () => {
  for (const [id, suffix, type] of [[1,'png','image/png'],[2,'jpeg','image/jpeg'],[3,'webp','image/webp'],
    [4,'gif','image/gif'],[5,'bmp','image/bmp']] as const) {
    const name = 'カバー 🎮.' + suffix
    const file = await pickDiscBackgroundFile(async (...args) => {
      assert.deepEqual(args, ['pick_disc_background_image'])
      return frame(name, id).buffer
    })
    assert.ok(file instanceof File)
    assert.equal(file.name, name)
    assert.equal(file.type, type)
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array([0, 17, 255]))
  }
  const withLeadingMark = '\uFEFFcover.png'
  assert.equal((await pickDiscBackgroundFile(async () => frame(withLeadingMark).buffer))?.name, withLeadingMark)
  assert.equal(await pickDiscBackgroundFile(async () => new ArrayBuffer(0)), null)
})

test('invalid or ambiguous frames cannot reach the shared File import', async () => {
  const wrongMagic = frame()
  wrongMagic[0] = 0
  const badNameLength = frame()
  new DataView(badNameLength.buffer).setUint16(9, 65535, true)
  const notUtf8 = frame('x.png')
  notUtf8[11] = 0xff
  for (const bad of [
    null, [], {status:'success'}, wrongMagic.buffer, frame('x.png',0).buffer,
    frame('x.png',6).buffer, frame('x.png',1,[]).buffer, frame('',1).buffer,
    frame('C:\\file.png').buffer, frame('../secret.png').buffer, notUtf8.buffer, badNameLength.buffer,
  ]) {
    await assert.rejects(pickDiscBackgroundFile(async () => bad))
  }
  const big = new ArrayBuffer(11 + 5 + MAX_IMPORTED_IMAGE_FILE_BYTES + 1)
  const b = new Uint8Array(big)
  b.set(frame('x.png'))
  await assert.rejects(pickDiscBackgroundFile(async () => big),/could not be read/)
})

test('native size/format rejections preserve existing guidance and never surface host paths', async () => {
  for (const [nativeCode, pattern] of [
    ['disc.background-picker.too-large',/64 MiB/],
    ['disc.background-picker.unsupported',/Choose PNG, JPEG, WebP, GIF, or BMP/],
  ] as const) {
    await assert.rejects(pickDiscBackgroundFile(async () => { throw nativeCode }),
      (e: unknown) => e instanceof ImportedImagePolicyError && pattern.test(e.message))
  }
  await assert.rejects(pickDiscBackgroundFile(async () => { throw Error('C:\\private\\sensitive.png') }),
    (e: unknown) => e instanceof Error && e.message === 'Background image could not be read.')
})

test('picker command stays modal-owned and routes through shared import and stale-result guards', () => {
  const source = (path: string) => readFileSync(new URL('../../'+path, import.meta.url), 'utf8')
  const rust = source('src-tauri/src/commands/disc_background_picker.rs')
  const handler = source('src-tauri/src/lib.rs')
  const hook = source('src/hooks/useBackgroundImage.ts')
  const panel = source('src/components/sidebar/artwork/LocalFileArtworkControls.tsx')
  assert.match(rust, /fn pick_disc_background_image\(window: Window\)/)
  assert.match(rust, /if window\.label\(\) != "main"/)
  assert.match(rust, /spawn_blocking\(move \|\|[\s\S]*set_parent\(&window\)[\s\S]*blocking_pick_file\(\)[\s\S]*Some\(FilePath::Path\(path\)\) => selected_file::read_selected\(&path\)/)
  assert.doesNotMatch(rust, /std::fs::read\(|allow_file\(|fs_scope\(/)
  assert.equal(handler.match(/commands::disc_background_picker::pick_disc_background_image/g)?.length, 1)
  assert.match(panel,/canUseNativeDiscBackgroundPicker\(\)[\s\S]*<button[\s\S]*handlePickNativeBackgroundFile\(\)[\s\S]*type="file"[\s\S]*onChange=\{handleBackgroundUpload\}/)
  assert.match(hook,/importBackgroundUpload\(file\)[\s\S]*selectNativeBackgroundFile\(asyncWork, pickDiscBackgroundFile,[\s\S]*importBackgroundUpload\(file\)/)
  assert.match(hook,/begin\('background-artwork'\)[\s\S]*createUploadedBackgroundImageImport\(file, observation\.stage\)[\s\S]*commit\(request, \(\) => \{ applied = applyBackgroundImageImport\(imported\) \}\)[\s\S]*observation\.finish\(accepted && applied\)/)
})
