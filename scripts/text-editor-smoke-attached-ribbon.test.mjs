import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createTextEditorSmokeAttachedRibbon } from './text-editor-smoke-attached-ribbon.mjs'

function createRect({
  bottom,
  left,
  right,
  top,
}) {
  return {
    bottom,
    height: bottom - top,
    left,
    right,
    top,
    width: right - left,
  }
}

function createAttachedRibbonSnapshot({
  active,
  height,
  toastTop,
  width,
}) {
  const header = createRect({ bottom: 148, left: 0, right: width, top: 0 })
  const label = createRect({ bottom: 148, left: 0, right: 160, top: 0 })
  const preview = createRect({
    bottom: Math.min(height - 10, 700),
    left: 100,
    right: Math.min(width - 100, 700),
    top: 148,
  })

  return {
    active,
    availableHeaderWidth: width - label.right,
    header,
    label,
    preview,
    previewArea: createRect({ bottom: height, left: 0, right: width, top: 0 }),
    ribbon: createRect({ bottom: 148, left: 160, right: width, top: 0 }),
    shell: createRect({ bottom: 148, left: 160, right: width, top: 0 }),
    toast: createRect({ bottom: toastTop + 20, left: 700, right: 820, top: toastTop }),
    toastStack: createRect({ bottom: toastTop + 20, left: 700, right: 820, top: toastTop }),
    toastStackTop: toastTop,
    variables: {
      padding: '12px',
      ribbonHeight: '148px',
      ribbonMode: active ? 'active' : 'inactive',
      toastGap: '12px',
    },
    viewport: { height, width },
  }
}

test('attached ribbon smoke helper preserves viewport and presets-tab orchestration', async () => {
  const calls = []
  let currentViewport = { height: 1500, width: 1800 }
  let snapshotPhase = 'inactive'
  const page = {
    evaluate: async () => {
      const inactiveToastTop = currentViewport.width <= 1000 ? 12 : 18
      const snapshot = createAttachedRibbonSnapshot({
        active: snapshotPhase === 'active',
        height: currentViewport.height,
        toastTop: snapshotPhase === 'active' ? 160 : inactiveToastTop,
        width: currentViewport.width,
      })
      snapshotPhase = snapshotPhase === 'inactive' ? 'active' : 'inactive'
      return snapshot
    },
    screenshot: async ({ path: screenshotPath }) => {
      calls.push(`screenshot:${path.basename(screenshotPath)}`)
    },
    setViewportSize: async (viewport) => {
      currentViewport = viewport
      calls.push(`viewport:${viewport.width}x${viewport.height}`)
    },
    viewportSize: () => ({ height: 1500, width: 1800 }),
    waitForTimeout: async (timeout) => {
      calls.push(`wait:${timeout}`)
    },
  }
  const artifactDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'text-editor-smoke-attached-ribbon-'),
  )
  const { assertAttachedRibbonLayoutAtViewports } =
    createTextEditorSmokeAttachedRibbon({
      artifactDir,
      clickInlineTab: async (_page, tab) => calls.push(`tab:${tab}`),
      done: async () => calls.push('done'),
      expectContextualShell: async () => calls.push('expect-shell'),
      fail: (message) => {
        throw new Error(message)
      },
      getRectDelta: (first, second) => ({
        left: second.left - first.left,
        top: second.top - first.top,
      }),
      openInlineEditorFromTarget: async (_page, smokeId) =>
        calls.push(`open:${smokeId}`),
    })

  await assertAttachedRibbonLayoutAtViewports(page)

  assert.equal(calls.filter((call) => call === 'tab:presets').length, 3)
  assert.equal(
    calls.filter((call) =>
      call === 'open:case-text-block-cover-cover-title-text').length,
    4,
  )
  assert.equal(calls.includes('screenshot:attached-ribbon-default-tauri.png'), false)
  assert.deepEqual(calls.slice(-4), [
    'viewport:1800x1500',
    'wait:160',
    'open:case-text-block-cover-cover-title-text',
    'expect-shell',
  ])
})
