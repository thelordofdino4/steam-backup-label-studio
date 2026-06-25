import crypto from 'node:crypto'
import zlib from 'node:zlib'

export const REQUIRED_RIBBON_CAPTURE_SIZES = Object.freeze([
  { height: 650, name: 'minimum-client', width: 900 },
  { height: 720, name: 'default-client', width: 1000 },
  { height: 1009, name: 'maximum-client', width: 1920 },
])

function fail(message) {
  throw new Error(message)
}

function paethPredictor(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)

  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

export function decodePngRgba(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (!buffer.subarray(0, 8).equals(signature)) {
    fail('PNG validation failed: file does not start with a PNG signature.')
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += 12 + length

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }
  }

  if (width <= 0 || height <= 0 || idatChunks.length === 0) {
    fail('PNG validation failed: missing image dimensions or IDAT chunks.')
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    fail(`PNG validation failed: unsupported bitDepth=${bitDepth}, colorType=${colorType}.`)
  }

  const channels = colorType === 6 ? 4 : 3
  const rowLength = width * channels
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks))
  const rgba = new Uint8Array(width * height * 4)
  let sourceOffset = 0
  let previous = new Uint8Array(rowLength)

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset]
    sourceOffset += 1
    const raw = inflated.subarray(sourceOffset, sourceOffset + rowLength)
    sourceOffset += rowLength
    const row = new Uint8Array(rowLength)

    for (let x = 0; x < rowLength; x += 1) {
      const left = x >= channels ? row[x - channels] : 0
      const up = previous[x] ?? 0
      const upperLeft = x >= channels ? previous[x - channels] ?? 0 : 0
      const value = raw[x]

      if (filter === 0) row[x] = value
      else if (filter === 1) row[x] = (value + left) & 0xff
      else if (filter === 2) row[x] = (value + up) & 0xff
      else if (filter === 3) row[x] = (value + Math.floor((left + up) / 2)) & 0xff
      else if (filter === 4) row[x] = (value + paethPredictor(left, up, upperLeft)) & 0xff
      else fail(`PNG validation failed: unsupported PNG filter ${filter}.`)
    }

    for (let x = 0; x < width; x += 1) {
      const source = x * channels
      const target = (y * width + x) * 4
      rgba[target] = row[source]
      rgba[target + 1] = row[source + 1]
      rgba[target + 2] = row[source + 2]
      rgba[target + 3] = channels === 4 ? row[source + 3] : 255
    }

    previous = row
  }

  return { bitDepth, colorType, data: rgba, height, width }
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function validateClientSize({ actualHeight, actualWidth, requestedHeight, requestedWidth }) {
  const widthDelta = Math.abs(actualWidth - requestedWidth)
  const heightDelta = Math.abs(actualHeight - requestedHeight)
  const passed = widthDelta === 0 && heightDelta === 0

  return {
    actualHeight,
    actualWidth,
    heightDelta,
    passed,
    requestedHeight,
    requestedWidth,
    widthDelta,
  }
}

export function validatePngScreenshot(buffer, options) {
  const {
    expectedHeight,
    expectedWidth,
    fullWindow = true,
    minColorfulPixelRatio = 0.02,
    minNonBlackPixelRatio = 0.1,
    minOpaquePixelRatio = 0.98,
  } = options
  const image = decodePngRgba(buffer)
  const pixelCount = image.width * image.height
  let blackPixels = 0
  let colorfulPixels = 0
  let nonBlackPixels = 0
  let opaquePixels = 0
  let transparentPixels = 0
  let luminanceSum = 0

  for (let offset = 0; offset < image.data.length; offset += 4) {
    const red = image.data[offset]
    const green = image.data[offset + 1]
    const blue = image.data[offset + 2]
    const alpha = image.data[offset + 3]
    const luminance = (red + green + blue) / 3
    luminanceSum += luminance

    if (alpha === 0) transparentPixels += 1
    if (alpha >= 250) opaquePixels += 1
    if (alpha > 0 && red < 8 && green < 8 && blue < 8) blackPixels += 1
    if (alpha > 0 && (red >= 8 || green >= 8 || blue >= 8)) nonBlackPixels += 1
    if (alpha > 0 && Math.max(red, green, blue) - Math.min(red, green, blue) > 20) {
      colorfulPixels += 1
    }
  }

  const stats = {
    averageLuminance: Number((luminanceSum / pixelCount).toFixed(3)),
    bitDepth: image.bitDepth,
    blackPixelRatio: Number((blackPixels / pixelCount).toFixed(6)),
    colorType: image.colorType,
    colorfulPixelRatio: Number((colorfulPixels / pixelCount).toFixed(6)),
    height: image.height,
    nonBlackPixelRatio: Number((nonBlackPixels / pixelCount).toFixed(6)),
    opaquePixelRatio: Number((opaquePixels / pixelCount).toFixed(6)),
    transparentPixelRatio: Number((transparentPixels / pixelCount).toFixed(6)),
    width: image.width,
  }
  const failures = []

  if (fullWindow && (image.width !== expectedWidth || image.height !== expectedHeight)) {
    failures.push(
      `expected full-window ${expectedWidth}x${expectedHeight}, got ${image.width}x${image.height}`,
    )
  }
  if (stats.opaquePixelRatio < minOpaquePixelRatio) {
    failures.push(`opaque pixel ratio ${stats.opaquePixelRatio} below ${minOpaquePixelRatio}`)
  }
  if (stats.nonBlackPixelRatio < minNonBlackPixelRatio) {
    failures.push(`nonblack pixel ratio ${stats.nonBlackPixelRatio} below ${minNonBlackPixelRatio}`)
  }
  if (stats.colorfulPixelRatio < minColorfulPixelRatio) {
    failures.push(`colorful pixel ratio ${stats.colorfulPixelRatio} below ${minColorfulPixelRatio}`)
  }
  if (stats.averageLuminance < 8) {
    failures.push(`average luminance ${stats.averageLuminance} indicates a visually empty image`)
  }

  return {
    failures,
    hash: hashBuffer(buffer),
    passed: failures.length === 0,
    stats,
  }
}

export function rectsOverlap(first, second, tolerance = 0) {
  return (
    Math.min(first.right, second.right) - Math.max(first.left, second.left) > tolerance &&
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > tolerance
  )
}

export function rectInside(inner, outer, tolerance = 0) {
  return (
    inner.left >= outer.left - tolerance &&
    inner.top >= outer.top - tolerance &&
    inner.right <= outer.right + tolerance &&
    inner.bottom <= outer.bottom + tolerance
  )
}

export function comparePixelBuffers(first, second, options = {}) {
  const { maxAverageChannelDelta = 0, maxDifferentPixelRatio = 0 } = options
  const firstImage = decodePngRgba(first)
  const secondImage = decodePngRgba(second)
  if (firstImage.width !== secondImage.width || firstImage.height !== secondImage.height) {
    return {
      averageChannelDelta: Infinity,
      differentPixelRatio: 1,
      passed: false,
      reason: 'dimension mismatch',
    }
  }

  let totalDelta = 0
  let differentPixels = 0
  const pixelCount = firstImage.width * firstImage.height

  for (let offset = 0; offset < firstImage.data.length; offset += 4) {
    const pixelDelta =
      Math.abs(firstImage.data[offset] - secondImage.data[offset]) +
      Math.abs(firstImage.data[offset + 1] - secondImage.data[offset + 1]) +
      Math.abs(firstImage.data[offset + 2] - secondImage.data[offset + 2]) +
      Math.abs(firstImage.data[offset + 3] - secondImage.data[offset + 3])
    totalDelta += pixelDelta
    if (pixelDelta > 0) differentPixels += 1
  }

  const averageChannelDelta = totalDelta / (pixelCount * 4)
  const differentPixelRatio = differentPixels / pixelCount

  return {
    averageChannelDelta,
    differentPixelRatio,
    passed:
      averageChannelDelta <= maxAverageChannelDelta &&
      differentPixelRatio <= maxDifferentPixelRatio,
    reason: 'ok',
  }
}

export function createManifestEntry(input) {
  const method = input.method
  if (method !== 'browser' && method !== 'tauri') {
    fail(`Capture manifest method must be browser or tauri, got ${method}.`)
  }

  return {
    activeRibbonTab: input.activeRibbonTab,
    actualClient: input.actualClient,
    branch: input.branch,
    captureMethod: method,
    commitSha: input.commitSha,
    devicePixelRatio: input.devicePixelRatio,
    domValidation: input.domValidation,
    editorModule: input.editorModule,
    outerWindow: input.outerWindow,
    png: input.png,
    requestedClient: input.requestedClient,
    screenshotPath: input.screenshotPath,
    screenshotPixels: input.screenshotPixels,
    selectedTextTarget: input.selectedTextTarget,
    timestamp: input.timestamp,
  }
}

export function createHtmlContactSheet({ generatedAt, manifestPath, screenshots, title }) {
  const cards = screenshots.map((entry) => {
    const imagePath = entry.relativePath.replaceAll('\\', '/')
    const failures = [
      ...(entry.png?.failures ?? []),
      ...(entry.domValidation?.failures ?? []),
    ]
    const failureHtml = failures.length
      ? `<p class="failures">${escapeHtml(failures.join(' | '))}</p>`
      : '<p class="passed">validated</p>'

    return `
      <figure>
        <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(entry.label)}">
        <figcaption>
          <strong>${escapeHtml(entry.label)}</strong>
          <span>${escapeHtml(entry.sizeLabel)} · ${escapeHtml(entry.captureMethod)}</span>
          ${failureHtml}
        </figcaption>
      </figure>`
  }).join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { background: #101622; color: #edf3ff; font-family: system-ui, sans-serif; margin: 24px; }
    code { color: #b7d8ff; }
    .grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
    figure { background: #171f2d; border: 1px solid #344056; border-radius: 8px; margin: 0; padding: 10px; }
    img { background: #05070b; border: 1px solid #2c364a; display: block; max-width: 100%; }
    figcaption { display: grid; gap: 4px; margin-top: 8px; }
    span { color: #afbdd3; }
    .passed { color: #7bdc9a; margin: 0; }
    .failures { color: #ff9e9e; margin: 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Generated ${escapeHtml(generatedAt)}. Manifest: <code>${escapeHtml(manifestPath)}</code>.</p>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>
`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
