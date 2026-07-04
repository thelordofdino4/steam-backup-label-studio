import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  createTextEditorSmokeGeometry,
} from './text-editor-smoke-geometry.mjs'

function createFakeLocator({ rects, screenshotBuffer }) {
  return {
    first() {
      return this
    },
    evaluate: async () => {
      const rect = rects.shift() ?? rects.at(-1)

      return { ...rect }
    },
    screenshot: async () => screenshotBuffer,
  }
}

function createGeometryHarness({
  paintBounds = { left: 2, right: 6, width: 10 },
  rects = [{ bottom: 20, height: 10, left: 1, right: 11, top: 10, width: 10 }],
  screenshotBuffer = Buffer.from('png'),
} = {}) {
  const calls = []
  const artifactDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'text-editor-smoke-geometry-'),
  )
  const locator = createFakeLocator({ rects: [...rects], screenshotBuffer })
  const geometry = createTextEditorSmokeGeometry({
    artifactDir,
    expectVisible: async (_page, smokeId) => calls.push(['expectVisible', smokeId]),
    fail: (message) => {
      calls.push(['fail', message])
      throw new Error(message)
    },
    getPaintBoundsFromScreenshot: (buffer) => {
      calls.push(['getPaintBoundsFromScreenshot', buffer.toString()])
      return paintBounds
    },
    slugDiagnosticLabel: (label) => label.toLowerCase().replace(/\s+/g, '-'),
    smoke: (_page, smokeId) => {
      calls.push(['smoke', smokeId])
      return locator
    },
    visibleSmoke: (_page, smokeId) => {
      calls.push(['visibleSmoke', smokeId])
      return locator
    },
  })

  return {
    artifactDir,
    calls,
    geometry,
    page: {
      waitForTimeout: async (ms) => calls.push(['wait', ms]),
    },
  }
}

test('text editor smoke geometry captures element rects through visible smoke selectors', async () => {
  const { calls, geometry, page } = createGeometryHarness({
    rects: [{ bottom: 34, height: 24, left: 12, right: 80, top: 10, width: 68 }],
  })

  assert.deepEqual(await geometry.getRect(page, 'target'), {
    bottom: 34,
    height: 24,
    left: 12,
    right: 80,
    top: 10,
    width: 68,
  })
  assert.deepEqual(calls, [
    ['expectVisible', 'target'],
    ['visibleSmoke', 'target'],
  ])
})

test('text editor smoke geometry waits until rects stabilize', async () => {
  const { calls, geometry, page } = createGeometryHarness({
    rects: [
      { bottom: 34, height: 24, left: 12, right: 80, top: 10, width: 68 },
      { bottom: 40, height: 24, left: 14, right: 82, top: 16, width: 68 },
      { bottom: 40.2, height: 24.1, left: 14.1, right: 82.1, top: 16.2, width: 68.1 },
    ],
  })

  assert.deepEqual(await geometry.waitForStableRect(page, 'target'), {
    bottom: 40.2,
    height: 24.1,
    left: 14.1,
    right: 82.1,
    top: 16.2,
    width: 68.1,
  })
  assert.equal(calls.filter((call) => call[0] === 'wait').length, 2)
})

test('text editor smoke geometry preserves paint-edge artifact failure wording', async () => {
  const { artifactDir, geometry, page } = createGeometryHarness({
    paintBounds: { left: 0, right: 9, width: 10 },
    screenshotBuffer: Buffer.from('edge-paint'),
  })

  await assert.rejects(
    () => geometry.assertScreenshotPaintDoesNotTouchHorizontalEdges(
      page,
      'paint-target',
      'Disc Title',
    ),
    new RegExp(
      'Disc Title paint touched screenshot edge: ' +
      'leftMargin=0, rightMargin=0, imageWidth=10, paintLeft=0, paintRight=9, ' +
      `elementScreenshot=${artifactDir.replace(/\\/g, '\\\\')}\\\\disc-title-element\\.png\\.`,
    ),
  )
  assert.equal(
    fs.readFileSync(path.join(artifactDir, 'disc-title-element.png'), 'utf8'),
    'edge-paint',
  )
})
