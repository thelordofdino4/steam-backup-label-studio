import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createTextEditorSmokeSelection,
} from './text-editor-smoke-selection.mjs'

function createFakePage(calls) {
  return {
    mouse: {
      down: async () => calls.push(['mouse-down']),
      move: async (x, y, options) => calls.push(['mouse-move', x, y, options]),
      up: async () => calls.push(['mouse-up']),
    },
    waitForTimeout: async (ms) => calls.push(['wait', ms]),
  }
}

function createSelectionHarness({
  htmlSource = '<strong>source</strong>',
  inputState = { selectionEnd: 6, selectionStart: 2, value: 'abcdef' },
  rect = { height: 20, left: 100, top: 50, width: 200 },
  text = 'Rendered Text',
} = {}) {
  const calls = []
  const failures = []
  const selection = createTextEditorSmokeSelection({
    fail: (message) => {
      failures.push(message)
      throw new Error(message)
    },
    getHtmlSource: async () => htmlSource,
    getInlineInputState: async () => inputState,
    getRect: async (_page, smokeId) => {
      calls.push(['getRect', smokeId])
      return rect
    },
    getTextContent: async (_page, smokeId) => {
      calls.push(['getTextContent', smokeId])
      return text
    },
  })

  return {
    calls,
    failures,
    page: createFakePage(calls),
    selection,
  }
}

test('text editor smoke visible selection drag uses stable interior points', async () => {
  const { calls, page, selection } = createSelectionHarness()

  await selection.dragSelectVisibleText(page, 'target-text')

  assert.deepEqual(calls, [
    ['getRect', 'target-text'],
    ['mouse-move', 110, 60, undefined],
    ['mouse-down'],
    ['mouse-move', 190, 60, { steps: 8 }],
    ['mouse-up'],
    ['wait', 100],
  ])
})

test('text editor smoke prefix drag preserves prefix-specific endpoint', async () => {
  const { calls, page, selection } = createSelectionHarness()

  await selection.dragSelectVisiblePrefix(page, 'target-text')

  assert.deepEqual(calls, [
    ['getRect', 'target-text'],
    ['mouse-move', 110, 60, undefined],
    ['mouse-down'],
    ['mouse-move', 164, 60, { steps: 10 }],
    ['mouse-up'],
    ['wait', 100],
  ])
})

test('text editor smoke rotated spine selection avoids text edges', async () => {
  const { calls, page, selection } = createSelectionHarness({
    inputState: { selectionEnd: 5, selectionStart: 2, value: 'abcdef' },
    rect: { height: 100, left: 20, top: 40, width: 30 },
  })

  await selection.dragSelectRotatedSpineText(page, 'spine-text', true)

  assert.deepEqual(calls, [
    ['getRect', 'spine-text'],
    ['mouse-move', 35, 102, undefined],
    ['mouse-down'],
    ['mouse-move', 35, 78, { steps: 10 }],
    ['mouse-up'],
    ['wait', 100],
  ])
})

test('text editor smoke selection helpers preserve failure wording', async () => {
  const { page, selection } = createSelectionHarness({
    inputState: { selectionEnd: 3, selectionStart: 3, value: 'abcdef' },
  })

  await assert.rejects(
    () => selection.dragSelectVisibleText(page, 'target-text'),
    /LMB drag did not create a visible selection on target-text\./,
  )
})

test('text editor smoke text and source assertions preserve failure wording', async () => {
  const { page, selection } = createSelectionHarness({
    htmlSource: '<p>alpha</p>',
    text: 'Bravo',
  })

  await assert.rejects(
    () => selection.assertTextIncludes(page, 'target-text', 'Alpha'),
    /target-text text "Bravo" did not include "Alpha"\./,
  )
  await assert.rejects(
    () => selection.assertSourceIncludes(page, '<strong>'),
    /HTML source "<p>alpha<\/p>" did not include "<strong>"\./,
  )
})
