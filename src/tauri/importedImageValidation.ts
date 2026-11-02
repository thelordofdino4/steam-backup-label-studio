import { invoke } from '@tauri-apps/api/core'
import {
  ImportedImagePolicyError, imageImportFailureMessage,
  MAX_IMPORTED_IMAGE_DATA_URL_BYTES, prepareImportedImageDataUrl,
} from '../image/importedImagePolicy.ts'

type ImageValidationInvoke = (command: string, body: Uint8Array) => Promise<unknown>

export async function validateImportedImageDataUrl(
  value: string,
  invokeCommand: ImageValidationInvoke = invoke,
): Promise<string> {
  const canonical = prepareImportedImageDataUrl(value)
  const bytes = new TextEncoder().encode(canonical)
  if (bytes.byteLength > MAX_IMPORTED_IMAGE_DATA_URL_BYTES) {
    throw new ImportedImagePolicyError('This image is too large. Choose a smaller image before importing.')
  }
  let result: unknown
  try {
    result = await invokeCommand('validate_imported_image_asset', bytes)
  } catch (error) {
    throw new ImportedImagePolicyError(imageImportFailureMessage(error), error)
  }
  const response = result as Record<string, unknown> | null
  const mime = canonical.slice(5, canonical.indexOf(';'))
  if (!response || response.status !== 'success' || response.mimeType !== mime ||
      typeof response.width !== 'number' || !Number.isInteger(response.width) || response.width <= 0 ||
      typeof response.height !== 'number' || !Number.isInteger(response.height) || response.height <= 0) {
    throw new ImportedImagePolicyError(imageImportFailureMessage(null))
  }
  return canonical
}
