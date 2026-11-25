// Fixture-only native boundary. The actual App still renders PNG and encodes
// the package write request; no native file is claimed to have been written.
const decoder = new TextDecoder('utf-8', { fatal: true })
const results = new Map()
let armed

window.armDiscHistoryOutput = label => {
  if (armed || results.has(label) || !['before', 'applied', 'undo', 'redo'].includes(label))
    throw Error('Invalid output checkpoint')
  armed = label
  results.set(label, {})
}
window.readDiscHistoryOutput = label => structuredClone(results.get(label))
window.finishDiscHistoryOutput = label => {
  const captured = results.get(label)
  if (armed !== label || !captured?.project || !captured?.png)
    throw Error('Both real output payloads must reach the sink')
  armed = undefined
}
window.discHistoryFixtureDialog = options => {
  if (!armed) return undefined
  const format = options.filters?.[0]?.extensions?.[0]
  if (format !== 'sbls' && format !== 'png') throw Error('Unexpected fixture output format')
  return `C:\\sbls-history-fixture-${armed}.${format}`
}
window.discHistoryFixtureMayConfirm = () => Boolean(armed)

function parseProject(bytes, view) {
  const planLength = view.getUint32(8, false)
  const projectLength = view.getUint32(12, false)
  const assetCount = view.getUint32(16, false)
  let offset = 20 + planLength
  const project = JSON.parse(decoder.decode(bytes.subarray(offset, offset + projectLength)))
  offset += projectLength
  const assetUrls = []
  for (let n = 0; n < assetCount; n++) {
    const length = view.getUint32(offset, false)
    offset += 4
    assetUrls.push(decoder.decode(bytes.subarray(offset, offset + length)))
    offset += length
  }
  if (offset !== bytes.byteLength) throw Error('Unexpected package framing length')
  // Save records its own time and changes the baseline/path; those are not content.
  delete project.savedAt
  return { project, assetUrls }
}

async function decodePng(bytes) {
  if (bytes.length < 24 || ![137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value))
    throw Error('Renderer did not generate a PNG')
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    const digest = await crypto.subtle.digest('SHA-256', pixels)
    return { width: bitmap.width, height: bitmap.height, bytes: bytes.length,
      pixels: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') }
  } finally { bitmap.close() }
}

window.captureDiscHistoryOutput = (command, bytes) => {
  if (!armed) return undefined
  if (!(bytes instanceof Uint8Array)) throw Error('Expected a raw write request')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const magic = decoder.decode(bytes.subarray(0, 8))
  const captured = results.get(armed)
  if (command === 'encode_and_write_project_package_file' && magic === 'SBLSPSV2' && !captured.project) {
    captured.project = parseProject(bytes, view)
    return Promise.resolve({ status: 'success' })
  }
  if (command === 'write_export_png' && magic === 'SBLSPEV1' && !captured.png) {
    const pathEnd = 12 + view.getUint32(8, true)
    if (decoder.decode(bytes.subarray(12, pathEnd)) !== window.discHistoryFixtureDialog({ filters: [{ extensions: ['png'] }] }))
      throw Error('Unexpected PNG destination')
    return decodePng(bytes.slice(pathEnd)).then(png => { captured.png = png })
  }
  throw Error('Unexpected or duplicate fixture output')
}
