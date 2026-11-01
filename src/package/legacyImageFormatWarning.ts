import type { SavedProject } from '../project/projectTypes.ts'
import { isSupportedImportedImageMime } from '../image/importedImagePolicy.ts'
import { locateProjectPackageCaptures } from './projectPackageCapturePlan.ts'

/** Compatibility notice, not a new legacy decoder or a mutation/rejection rule. */
export function legacyImageFormatWarning(project: SavedProject): string {
  const unsupported = locateProjectPackageCaptures(project).some(({ capture, container, key }) => {
    if (capture.decision.kind !== 'project-owned-data-url') return false
    const value = (container as Record<string, unknown> | undefined)?.[key]
    if (typeof value !== 'string') return false
    const mime = /^data:([^;,]+)/i.exec(value)?.[1]
    return !mime || !isSupportedImportedImageMime(mime)
  })
  return unsupported
    ? ' This legacy project contains SVG or another image format that cannot be saved as .sbls. Replace those images with PNG, JPEG, WebP, GIF, or BMP before saving. The original legacy file is preserved.'
    : ''
}
