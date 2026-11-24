// Headless renderer/encoded-byte diagnostics only; never native visual or print acceptance.
import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { decodePngRgba } from '../../scripts/text-editor-smoke-png.mjs'

let server, browser, page
function chunks(input) {
  const bytes = Buffer.from(input), result = []
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), end = offset + length + 12
    assert.ok(end <= bytes.length)
    result.push({ type: bytes.toString('ascii', offset + 4, offset + 8), data: bytes.subarray(offset + 8, end - 4), bytes: bytes.subarray(offset, end) })
    offset = end
  }
  return result
}
test.before(async () => {
  server = await createServer({ logLevel: 'silent', server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'png-density-fixture', configureServer(instance) {
      instance.middlewares.use('/__png-density-fixture', (_request, response) => {
        response.setHeader('Content-Type', 'text/html')
        response.end('<!doctype html><title>PNG byte fixture</title>')
      })
    } }],
  })
  await server.listen()
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__png-density-fixture`)
})
test.after(async () => { await page?.close(); await browser?.close(); await server?.close() })

for (const [target, dimensions] of [['disc', [1423, 1423]], ['cover', [1414, 1414]], ['tray', [1780, 1390]]]) {
  test(`real ${target} exporter writes explicit density without pixel changes, guides on and off`, async () => {
    for (const guides of [false, true]) {
      const result = await page.evaluate(async ({ target, guides }) => {
        const [{ createBlankDiscSavedProject }, { restoreProjectStateFromContents }, { createBlankJewelCaseSavedProject }, { exportDiscLabelPngBytes }, { exportCaseInsertPngBytes }, { JEWEL_CASE_GUIDE_IDS }] = await Promise.all([
          import('/src/project/blankDiscProject.ts'), import('/src/project/restoreProjectState.ts'),
          import('/src/project/caseInsertProjectAdapters.ts'), import('/src/export/exportPng.ts'),
          import('/src/export/exportCaseInsertPng.ts'), import('/src/caseInsert/defaults.ts'),
        ])
        const state = await restoreProjectStateFromContents(JSON.stringify(createBlankDiscSavedProject()))
        const original = HTMLCanvasElement.prototype.toBlob
        let rawBytes
        HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
          original.call(this, (blob) => {
            if (!blob) { callback(blob); return }
            void blob.arrayBuffer().then((buffer) => { rawBytes = Array.from(new Uint8Array(buffer)); callback(blob) })
          }, type, quality)
        }
        try {
          let output
          if (target === 'disc') {
            output = await exportDiscLabelPngBytes({ ...state, selectedDiscTemplate: state.template.selectedDiscTemplate,
              previewSize: 600, exportGuides: { centerHole: guides, outerEdge: guides, printableArea: guides, safeZone: guides } })
          } else {
            const caseInsert = createBlankJewelCaseSavedProject().caseInsert
            caseInsert.export.guideIds = guides ? [...JEWEL_CASE_GUIDE_IDS] : []
            output = await exportCaseInsertPngBytes({ caseInsert, activeTemplatePane: target, brandingSources: state })
          }
          return { ...output, rawBytes }
        } finally { HTMLCanvasElement.prototype.toBlob = original }
      }, { target, guides })
      assert.deepEqual([result.width, result.height], dimensions)
      const parsed = chunks(result.bytes), density = parsed.filter(({ type }) => type === 'pHYs')
      assert.equal(density.length, 1)
      assert.equal(density[0].bytes.toString('hex'), '000000097048597300002e2300002e230178a53f76')
      assert.deepEqual(parsed.filter(({ type }) => type !== 'pHYs').map(({ bytes }) => bytes),
        chunks(result.rawBytes).filter(({ type }) => type !== 'pHYs').map(({ bytes }) => bytes))
      const decoded = decodePngRgba(Buffer.from(result.bytes))
      assert.deepEqual([decoded.width, decoded.height], dimensions)
      assert.deepEqual(decoded.data, decodePngRgba(Buffer.from(result.rawBytes)).data)
    }
  })
}

test('real Disc PNG pixels ignore viewport zoom and pan at a fixed local preview width', async () => {
  const variants = await page.evaluate(async () => {
    const [{ createBlankDiscSavedProject }, { restoreProjectStateFromContents },
      { getDiscPngExportPreviewWidth }, { exportDiscLabelPngBytes }] = await Promise.all([
      import('/src/project/blankDiscProject.ts'), import('/src/project/restoreProjectState.ts'),
      import('/src/app/appPngExportInputs.ts'), import('/src/export/exportPng.ts'),
    ])
    const state = await restoreProjectStateFromContents(JSON.stringify(createBlankDiscSavedProject()))
    const stage = document.createElement('div')
    const preview = document.createElement('div')
    preview.style.width = '600px'
    stage.append(preview)
    document.body.append(stage)
    try {
      const artwork = document.createElement('canvas')
      artwork.width = artwork.height = 152
      const context = artwork.getContext('2d')
      context.fillStyle = '#274051'
      context.fillRect(16, 16, 120, 120)
      context.fillStyle = '#ff00ff'
      context.fillRect(55, 49, 13, 13)
      context.fillStyle = '#00ffff'
      context.fillRect(87, 88, 11, 11)
      const params = {
        ...state, selectedDiscTemplate: state.template.selectedDiscTemplate,
        steamLogoPlacement: 'none', backgroundImageUrl: artwork.toDataURL('image/png'),
        backgroundImageSize: { width: 152, height: 152,
          contentBounds: { x: 16, y: 16, width: 120, height: 120 } },
        backgroundScale: 1.5, backgroundOffset: { x: 33, y: -7 },
        exportGuides: { centerHole: false, outerEdge: false, printableArea: false, safeZone: false },
      }
      const result = []
      for (const [zoom, panX, panY, localWidth] of [
        [1, 0, 0, 600], [0.5, -41, 62, 600], [1.12, 19, -27, 600],
        [2, -60, 29, 600], [1, 0, 0, 480],
      ]) {
        stage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
        preview.style.width = `${localWidth}px`
        const rect = preview.getBoundingClientRect()
        const previewSize = getDiscPngExportPreviewWidth(preview, 640)
        const output = await exportDiscLabelPngBytes({ ...params, previewSize })
        result.push({ localWidth, previewSize, renderedWidth: rect.width, x: rect.x, bytes: Array.from(output.bytes) })
      }
      return result
    } finally {
      stage.remove()
    }
  })
  const reference = Buffer.from(variants[0].bytes)
  const shifted = Buffer.from(variants[4].bytes)
  for (const variant of variants.slice(0, 4)) {
    assert.equal(variant.previewSize, 600)
    assert.equal(variant.localWidth, 600)
    assert.deepEqual(Buffer.from(variant.bytes), reference)
  }
  assert.deepEqual([variants[1].renderedWidth, variants[3].renderedWidth], [300, 1200])
  assert.notEqual(variants[3].x, variants[0].x)
  assert.equal(variants[4].previewSize, 480)
  assert.notDeepEqual(shifted, reference, 'negative control: a real layout-width change moves the pixels')
})

test('actual Disc PNG preserves transparent-crop pixels through the committed asset reference', async () => {
  const rendered = await page.evaluate(async () => {
    const [
      { createBlankDiscSavedProject }, { restoreProjectStateFromContents },
      { createUploadedBackgroundImageImport }, { DiscBackgroundRaster },
      { createApplicationLifecycleCompositionRoot }, { createNewProjectSession },
      { captureDiscBackgroundExportInput }, { exportDiscLabelPngBytes },
    ] = await Promise.all([
      import('/src/project/blankDiscProject.ts'), import('/src/project/restoreProjectState.ts'),
      import('/src/image/backgroundImageImport.ts'), import('/src/image/discBackgroundAsset.ts'),
      import('/src/lifecycle/applicationLifecycleCompositionRoot.ts'), import('/src/lifecycle/projectSession.ts'),
      import('/src/lifecycle/canonicalProject.ts'), import('/src/export/exportPng.ts'),
    ])
    const artwork = document.createElement('canvas')
    artwork.width = artwork.height = 152
    const paint = artwork.getContext('2d')
    if (!paint) throw Error('Fixture canvas is unavailable.')
    paint.fillStyle = '#274051'
    paint.fillRect(16, 16, 120, 120)
    paint.fillStyle = '#ff00ff'
    paint.fillRect(55, 49, 13, 13)
    paint.fillStyle = '#00ffff'
    paint.fillRect(87, 88, 11, 11)
    const file = await new Promise(resolve => artwork.toBlob(resolve, 'image/png'))
    if (!file) throw Error('Fixture PNG is unavailable.')
    const sourceBytes = new Uint8Array(await file.arrayBuffer())
    if (sourceBytes.byteLength >= 65_536) throw Error('Fixture unexpectedly large.')
    const savedArtwork = 'data:image/png;base64,' + btoa(String.fromCharCode(...sourceBytes))
    const saved = createBlankDiscSavedProject()
    const root = createApplicationLifecycleCompositionRoot({
      initialState: createNewProjectSession({ sessionId: 'reference-png-fixture', project: saved }),
    })
    // Substitute only the Windows codec transport. This remains actual File
    // read, imported source preparation, browser decode/alpha inspection, and
    // owned Disc commit. The fake native response checks the fixture exactly.
    const oldTauri = Object.getOwnPropertyDescriptor(window, '__TAURI_INTERNALS__')
    let codecCalls = 0
    Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {
      async invoke(command, input) {
        if (command !== 'validate_imported_image_asset' || !(input instanceof Uint8Array) ||
            new TextDecoder().decode(input) !== savedArtwork) throw Error('Unexpected image-validation request.')
        codecCalls++
        return { status: 'success', mimeType: 'image/png', width: 152, height: 152 }
      },
    } })
    try {
      const prepared = await createUploadedBackgroundImageImport(new File([file], 'transparent-fixture.png', { type: 'image/png' }))
      const before = root.getLifecycleState().activeSession
      const outcome = root.commitDiscBackground({
        sessionId: before.id, expectedRevision: before.revision,
        operation: {
          kind: 'asset', stagedAsset: prepared.stagedAsset,
          background: { ...saved.background, enabled: true, scale: 1.25, offset: { x: 12, y: -7 },
            imageDataUrl: prepared.background.imageUrl, imageSize: prepared.background.imageSize, imageSource: prepared.imageSource },
        },
      })
      const r = root.getLifecycleState().activeSession
      const handle = r.project.background.asset
      const atR = captureDiscBackgroundExportInput(r.project.background)
      if (outcome !== 'committed' || !DiscBackgroundRaster.owns(handle) ||
          handle !== prepared.stagedAsset || Object.hasOwn(r.project.background, 'imageDataUrl')) {
        throw Error('Fixture did not commit one genuine Disc asset reference.')
      }
      const state = await restoreProjectStateFromContents(JSON.stringify(saved))
      const render = async input => {
        const result = await exportDiscLabelPngBytes({
          ...state, selectedDiscTemplate: state.template.selectedDiscTemplate,
          steamLogoPlacement: 'none', ...input, previewSize: 600,
          exportGuides: { centerHole: false, outerEdge: false, printableArea: false, safeZone: false },
        })
        return Array.from(result.bytes)
      }
      const control = {
        backgroundImageUrl: savedArtwork,
        backgroundImageSize: { width: 152, height: 152, contentBounds: { x: 16, y: 16, width: 120, height: 120 } },
        backgroundScale: 1.25, backgroundOffset: { x: 12, y: -7 },
      }
      const [expected, reference, wrongCrop] = await Promise.all([
        render(control), render(atR), render({ ...control, backgroundImageSize: { width: 152, height: 152 } }),
      ])
      const edit = root.commitDiscBackground({
        sessionId: r.id, expectedRevision: r.revision,
        operation: { kind: 'transform', scale: 1.25, offset: { x: 32, y: -7 } },
      })
      const latest = root.getLifecycleState().activeSession
      const [pinned, moved] = await Promise.all([
        render(atR), render(captureDiscBackgroundExportInput(latest.project.background)),
      ])
      return { expected, reference, wrongCrop, pinned, moved, codecCalls, edit,
        revision: latest.revision, sameHandle: latest.project.background.asset === handle,
        crop: atR.backgroundImageSize?.contentBounds }
    } finally {
      if (oldTauri) Object.defineProperty(window, '__TAURI_INTERNALS__', oldTauri)
      else Reflect.deleteProperty(window, '__TAURI_INTERNALS__')
      root.dispose()
    }
  })
  assert.equal(rendered.codecCalls, 1)
  assert.deepEqual(rendered.crop, { x: 16, y: 16, width: 120, height: 120 })
  assert.equal(rendered.edit, 'committed')
  assert.equal(rendered.revision, 2)
  assert.equal(rendered.sameHandle, true)
  const expected = Buffer.from(rendered.expected)
  const ref = Buffer.from(rendered.reference)
  assert.deepEqual(ref, expected, 'actual PNG bytes must match the same exact source/crop from the inline control')
  assert.deepEqual(Buffer.from(rendered.pinned), ref, 'already captured export R must not use R+1')
  const decode = input => decodePngRgba(Buffer.from(input))
  const a = decode(ref), b = decode(rendered.moved), uncropped = decode(rendered.wrongCrop)
  for (const img of [a, b, uncropped]) {
    assert.deepEqual([img.width, img.height], [1423, 1423])
    const alpha = (x, y) => img.data[(y * img.width + x) * 4 + 3]
    assert.equal(alpha(0, 0), 0, 'transparent corner')
    assert.equal(alpha(711, 711), 0, 'transparent physical center hole')
  }
  const magenta = img => {
    let count = 0, x = 0, y = 0
    for (let at = 0; at < img.data.length; at += 4) {
      if (img.data[at] !== 255 || img.data[at + 1] !== 0 ||
          img.data[at + 2] !== 255 || img.data[at + 3] !== 255) continue
      const index = at / 4
      count++
      x += index % img.width
      y += Math.floor(index / img.width)
    }
    assert.ok(count > 500, 'opaque magenta fiducial is visible')
    return { x: x / count, y: y / count, count }
  }
  const original = magenta(a), shifted = magenta(b), untrimmed = magenta(uncropped)
  const expectedShift = 20 * (1423 - 6) / 600
  assert.ok(Math.abs(shifted.x - original.x - expectedShift) <= 2, 'actual output pixels follow the committed offset')
  assert.ok(Math.abs(shifted.y - original.y) <= 1, 'horizontal placement does not move pixels vertically')
  assert.ok(Math.abs(untrimmed.x - original.x) >= 8, 'dimensions-only crop is a meaningful negative control')
})
