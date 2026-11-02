import { createBlankDiscSavedProject } from '../../src/project/blankDiscProject.ts'
import { createBlankJewelCaseSavedProject } from '../../src/project/caseInsertProjectAdapters.ts'

export const fixtureSizes = Object.freeze({ small: 128, normal: 512, large: 1400 })
export const fixtureIds = Object.freeze(['disc', 'case'].flatMap(kind =>
  Object.keys(fixtureSizes).map(size => `${kind}-${size}`)))

// Valid 24-bit BI_RGB, deterministic incompressible pixels and aligned rows.
// Two registered owners reuse one image, exercising portable-asset fan-out.
export function createPerformanceFixture(id) {
  if (!fixtureIds.includes(id)) throw new Error('Unknown performance fixture')
  const [kind, size] = id.split('-'), width = fixtureSizes[size]
  const stride = Math.ceil(width * 3 / 4) * 4
  const bmp = Buffer.alloc(54 + stride * width)
  bmp.write('BM'); bmp.writeUInt32LE(bmp.length, 2); bmp.writeUInt32LE(54, 10)
  bmp.writeUInt32LE(40, 14); bmp.writeInt32LE(width, 18); bmp.writeInt32LE(width, 22)
  bmp.writeUInt16LE(1, 26); bmp.writeUInt16LE(24, 28); bmp.writeUInt32LE(stride * width, 34)
  let seed = 0x12345678
  for (let i = 54; i < bmp.length; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
    bmp[i] = seed & 255
  }
  const dataUrl = `data:image/bmp;base64,${bmp.toString('base64')}`
  const project = kind === 'disc' ? createBlankDiscSavedProject() : createBlankJewelCaseSavedProject()
  project.savedAt = '2026-01-01T00:00:00.000Z'
  project.metadata.backupDate = '2026-01-01'
  if (kind === 'disc') {
    project.discText.values.backupDate = '2026-01-01'
    // The benchmark uses the published ESRB E compatibility tuple. The
    // current blank no-rating plan rejects its placeholder evidence; that
    // independent save-policy gap must not be hidden by codec overrides.
    project.metadata.ratingSystem = 'ESRB'
    project.metadata.ratingValue = 'E'
  }
  const background = kind === 'disc' ? project.background : project.caseInsert.templates.cover.background
  const title = kind === 'disc' ? project.titleArtwork : project.caseInsert.templates.cover.titleArtwork
  for (const owner of [background, title]) {
    owner.imageDataUrl = dataUrl
    owner.imageSize = { width, height: width }
  }
  if (kind === 'disc') title.layout.enabled = true
  else title.enabled = true
  // Stable built-in URLs across operating systems; identity remains owned by
  // existing provenance/compatibility tuples, not by these fixture URLs.
  const normalizedUrls = JSON.parse(JSON.stringify(project, (_key, value) =>
    typeof value === 'string' && value.startsWith('file:') && value.includes('/src/assets/')
      ? `/src/assets/${value.split('/src/assets/')[1]}` : value))
  return { project: normalizedUrls, characteristics: {
    id, kind, width, height: width, format: '24-bit BI_RGB BMP',
    uniqueEncodedAssetBytes: bmp.length, assetOwnerOccurrences: 2,
    dataUrlAsciiBytesPerOwner: dataUrl.length, logicalDataUrlBytes: 2 * dataUrl.length,
    uniqueRgbaBytes: width * width * 4,
  } }
}
