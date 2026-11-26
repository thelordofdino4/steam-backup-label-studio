import { invoke, isTauri } from '@tauri-apps/api/core'
import {
  IMPORTED_IMAGE_FORMAT_GUIDANCE, ImportedImagePolicyError, MAX_IMPORTED_IMAGE_FILE_BYTES,
} from '../image/importedImagePolicy.ts'

const MAGIC = 'SBLSBGI1'
const HEADER_BYTES = 11
const MAX_NAME_BYTES = 1024
const MIME_BY_ID = ['', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']
const READ_FAILED = 'Background image could not be read.'

export function canUseNativeDiscBackgroundPicker(
  tauri = isTauri(),
  userAgent = globalThis.navigator?.userAgent ?? '',
): boolean {
  return tauri && /\bWindows\b/i.test(userAgent)
}

type PickInvoke = (command: string) => Promise<unknown>

export async function pickDiscBackgroundFile(invokeCommand: PickInvoke = invoke): Promise<File | null> {
  let response: unknown
  try {
    // No renderer path, directory, or permissions parameter.
    response = await invokeCommand('pick_disc_background_image')
  } catch (error) {
    if (error === 'disc.background-picker.too-large') {
      throw new ImportedImagePolicyError('This image is too large. Choose a file at most 64 MiB before importing.')
    }
    if (error === 'disc.background-picker.unsupported') {
      throw new ImportedImagePolicyError(IMPORTED_IMAGE_FORMAT_GUIDANCE)
    }
    // Never rethrow untrusted transport details (which may include host paths).
    response = undefined
  }
  if (!(response instanceof ArrayBuffer)) throw new Error(READ_FAILED)
  if (response.byteLength === 0) return null

  const raw = new Uint8Array(response)
  const mime = MIME_BY_ID[raw[8]]
  if (raw.length <= HEADER_BYTES || !mime || String.fromCharCode(...raw.subarray(0, 8)) !== MAGIC) {
    throw new Error(READ_FAILED)
  }
  const nameLength = new DataView(response).getUint16(9, true)
  const start = HEADER_BYTES + nameLength
  if (!nameLength || nameLength > MAX_NAME_BYTES || start >= raw.length ||
      raw.length - start > MAX_IMPORTED_IMAGE_FILE_BYTES) throw new Error(READ_FAILED)

  const name = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw.subarray(HEADER_BYTES, start))
  const hasControl = [...name].some(character => {
    const code = character.charCodeAt(0)
    return code < 32 || (code >= 127 && code <= 159)
  })
  if (name === '.' || name === '..' || hasControl || /[/\\:]/u.test(name)) throw new Error(READ_FAILED)
  return new File([raw.subarray(start)], name, { type: mime })
}
