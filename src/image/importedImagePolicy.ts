// Ordinary project-owned images use the package v1 raster allowlist. Built-in
// reconstruction and legacy Open are separate owners, not upload bypasses.
export const IMPORTED_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp'
export const IMPORTED_IMAGE_FORMAT_GUIDANCE =
  'Choose PNG, JPEG, WebP, GIF, or BMP. Convert SVG or other formats to PNG before importing.'
export const MAX_IMPORTED_IMAGE_DATA_URL_BYTES = 89_478_511
export const MAX_IMPORTED_IMAGE_FILE_BYTES = 67_108_864

const RASTER_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'])

export class ImportedImagePolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportedImagePolicyError'
  }
}

export function isSupportedImportedImageMime(mime: string): boolean {
  return RASTER_MIMES.has(mime.toLowerCase()) || mime.toLowerCase() === 'image/jpg'
}

/** Only a MIME spelling alias changes; exact encoded pixels/alpha are retained. */
export function prepareImportedImageDataUrl(value: string): string {
  if (value.length > MAX_IMPORTED_IMAGE_DATA_URL_BYTES) {
    throw new ImportedImagePolicyError('This image is too large. Choose a smaller image (at most 64 MiB of encoded image bytes).')
  }
  const comma = value.indexOf(',')
  const header = comma < 0 ? '' : value.slice(0, comma)
  const match = /^data:(image\/[a-z0-9.+-]+);base64$/i.exec(header)
  if (!match || !isSupportedImportedImageMime(match[1])) {
    throw new ImportedImagePolicyError(IMPORTED_IMAGE_FORMAT_GUIDANCE)
  }
  const mime = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase()
  return `data:${mime};base64,${value.slice(comma + 1)}`
}

export function imageImportFailureMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
  if (code === 'project.package.asset-type-unsupported' ||
      code === 'project.package.asset-jpeg-profile-unsupported' ||
      code === 'project.package.asset-bmp-profile-unsupported') {
    return `This image format or profile cannot be saved in a project. ${IMPORTED_IMAGE_FORMAT_GUIDANCE}`
  }
  if (code === 'project.package.resource-limit-exceeded' ||
      code === 'project.package.asset-dimensions-invalid') {
    return 'This image exceeds supported image limits. Resize it or choose a smaller image before importing.'
  }
  if (code === 'project.package.asset-type-invalid') {
    return 'This image is invalid or its contents do not match its format. Re-export it as PNG and try again.'
  }
  return 'The image could not be validated for project saving. Try again in the desktop app.'
}
