import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInlinePreviewTextControlLayout,
  type InlinePreviewTextAnchor,
  type InlinePreviewTextControlSizes,
  type InlinePreviewTextRect,
} from './inlinePreviewTextEditorPositioning.ts'

const previewRect: InlinePreviewTextRect = {
  bottom: 300,
  left: 0,
  right: 300,
  top: 0,
}

const sizes: InlinePreviewTextControlSizes = {
  menu: { height: 32, width: 80 },
  moveHandle: { height: 24, width: 40 },
  tabs: { height: 24, width: 100 },
}

function createAnchor(
  input: Partial<InlinePreviewTextAnchor> = {},
): InlinePreviewTextAnchor {
  return {
    bottom: 130,
    centerX: 150,
    centerY: 115,
    right: 170,
    top: 100,
    ...input,
  }
}

test('inline text controls use normal below-text placement when there is room', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor(),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes,
  })

  assert.deepEqual(layout.tabs, {
    left: 100,
    maxWidth: 300,
    top: 68,
  })
  assert.deepEqual(layout.menu, {
    left: 110,
    maxWidth: 300,
    placement: 'below',
    top: 138,
  })
  assert.deepEqual(layout.moveHandle, {
    left: 178,
    top: 103,
  })
})

test('inline text menu flips upward before overflowing the preview bottom', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 286,
      centerY: 268,
      top: 250,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes: {
      ...sizes,
      menu: { height: 40, width: 80 },
    },
  })

  assert.equal(layout.menu.placement, 'above')
  assert.equal(layout.menu.top, 202)
})

test('inline text controls clamp leftward before crossing the right edge', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      centerX: 290,
      right: 295,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes,
  })

  assert.equal(layout.tabs.left, 200)
  assert.equal(layout.menu.left, 220)
  assert.equal(layout.moveHandle.left, 260)
})

test('inline text controls clamp rightward before crossing the left edge', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      centerX: 10,
      right: 20,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes,
  })

  assert.equal(layout.tabs.left, 0)
  assert.equal(layout.menu.left, 0)
  assert.equal(layout.moveHandle.left, 28)
})

test('inline text controls keep a narrow preview fallback inside the preview origin', () => {
  const narrowPreviewRect: InlinePreviewTextRect = {
    bottom: 90,
    left: 40,
    right: 80,
    top: 10,
  }
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 70,
      centerX: 74,
      centerY: 60,
      right: 78,
      top: 50,
    }),
    previewRect: narrowPreviewRect,
    requestedMenuPlacement: 'below',
    sizes,
  })

  assert.equal(layout.tabs.left, narrowPreviewRect.left)
  assert.equal(layout.tabs.maxWidth, 40)
  assert.equal(layout.menu.left, narrowPreviewRect.left)
  assert.equal(layout.menu.maxWidth, 40)
  assert.equal(layout.moveHandle.left, narrowPreviewRect.left)
  assert.ok(layout.tabs.top >= narrowPreviewRect.top)
  assert.ok(layout.menu.top >= narrowPreviewRect.top)
  assert.ok(layout.moveHandle.top >= narrowPreviewRect.top)
})
