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
    maxHeight: 162,
    maxWidth: 300,
    placement: 'below',
    top: 138,
  })
  assert.deepEqual(layout.moveHandle, {
    left: 178,
    top: 103,
  })
})

test('inline text menu flips above the tab strip before overflowing the preview bottom', () => {
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
  assert.equal(layout.menu.top, 170)
  assert.equal(layout.menu.maxHeight, 210)
  assert.ok(layout.menu.top + 40 <= layout.tabs.top - 8)
})

test('inline text menu and tabs do not overlap in upward placement', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 292,
      centerY: 271,
      top: 250,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes: {
      ...sizes,
      menu: { height: 88, width: 90 },
      tabs: { height: 34, width: 130 },
    },
  })

  assert.equal(layout.menu.placement, 'above')
  assert.ok(layout.menu.top + 88 <= layout.tabs.top - 8)
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
  assert.equal(layout.menu.maxHeight, 12)
  assert.equal(layout.menu.maxWidth, 40)
  assert.equal(layout.moveHandle.left, narrowPreviewRect.left)
  assert.ok(layout.tabs.top >= narrowPreviewRect.top)
  assert.ok(layout.menu.top >= narrowPreviewRect.top)
  assert.ok(layout.moveHandle.top >= narrowPreviewRect.top)
})

test('inline text controls follow when the selected text moves', () => {
  const originalLayout = getInlinePreviewTextControlLayout({
    anchor: createAnchor(),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes,
  })
  const movedLayout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 170,
      centerX: 190,
      centerY: 155,
      right: 210,
      top: 140,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes,
  })

  assert.equal(movedLayout.tabs.left - originalLayout.tabs.left, 40)
  assert.equal(movedLayout.tabs.top - originalLayout.tabs.top, 40)
  assert.equal(movedLayout.menu.left - originalLayout.menu.left, 40)
  assert.equal(movedLayout.menu.top - originalLayout.menu.top, 40)
  assert.equal(
    movedLayout.moveHandle.left - originalLayout.moveHandle.left,
    40,
  )
  assert.equal(
    movedLayout.moveHandle.top - originalLayout.moveHandle.top,
    40,
  )
})

test('inline text controls follow when selected text bounds change', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 165,
      centerX: 150,
      centerY: 132.5,
      right: 225,
      top: 100,
    }),
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
    maxHeight: 127,
    maxWidth: 300,
    placement: 'below',
    top: 173,
  })
  assert.deepEqual(layout.moveHandle, {
    left: 233,
    top: 120.5,
  })
})

test('inline text controls clamp after following a moved selection', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 286,
      centerX: 292,
      centerY: 268,
      right: 298,
      top: 250,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes: {
      ...sizes,
      menu: { height: 40, width: 120 },
      tabs: { height: 24, width: 140 },
    },
  })

  assert.equal(layout.tabs.left, 160)
  assert.equal(layout.menu.left, 180)
  assert.equal(layout.menu.placement, 'above')
  assert.equal(layout.menu.top, 170)
  assert.equal(layout.moveHandle.left, 260)
  assert.equal(layout.moveHandle.top, 256)
})

test('inline text menu shrinks inside the preview when neither vertical side has full room', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 115,
      centerY: 97.5,
      top: 80,
    }),
    previewRect: {
      bottom: 170,
      left: 0,
      right: 300,
      top: 0,
    },
    requestedMenuPlacement: 'below',
    sizes: {
      menu: { height: 178, width: 180 },
      moveHandle: sizes.moveHandle,
      tabs: { height: 46, width: 180 },
    },
  })

  assert.equal(layout.menu.placement, 'below')
  assert.equal(layout.menu.top, 123)
  assert.equal(layout.menu.maxHeight, 47)
  assert.ok(layout.menu.top + layout.menu.maxHeight <= 170)
})

test('inline text controls clamp for the right spine edge case', () => {
  const rightSpinePreviewRect: InlinePreviewTextRect = {
    bottom: 900,
    left: 320,
    right: 1580,
    top: 0,
  }
  const rightSpineSizes: InlinePreviewTextControlSizes = {
    menu: { height: 178, width: 520 },
    moveHandle: { height: 32, width: 60 },
    tabs: { height: 46, width: 520 },
  }
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 862,
      centerX: 1570,
      centerY: 691,
      right: 1578,
      top: 520,
    }),
    previewRect: rightSpinePreviewRect,
    requestedMenuPlacement: 'below',
    sizes: rightSpineSizes,
  })

  assert.equal(layout.tabs.left, 1060)
  assert.equal(layout.menu.left, 1060)
  assert.equal(layout.tabs.left + rightSpineSizes.tabs.width, 1580)
  assert.equal(layout.menu.left + rightSpineSizes.menu.width, 1580)
  assert.equal(layout.menu.placement, 'above')
  assert.ok(layout.menu.top + rightSpineSizes.menu.height <= layout.tabs.top - 8)
})

test('inline text controls use straight-disc preview coordinates without page offsets', () => {
  const discPreviewRect: InlinePreviewTextRect = {
    bottom: 1200,
    left: 320,
    right: 1600,
    top: 0,
  }
  const discSizes: InlinePreviewTextControlSizes = {
    menu: { height: 178, width: 520 },
    moveHandle: { height: 32, width: 60 },
    tabs: { height: 46, width: 520 },
  }
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 455,
      centerX: 960,
      centerY: 438.5,
      right: 1160,
      top: 422,
    }),
    previewRect: discPreviewRect,
    requestedMenuPlacement: 'below',
    sizes: discSizes,
  })

  assert.equal(layout.tabs.left, 700)
  assert.equal(layout.tabs.top, 368)
  assert.equal(layout.menu.left, 700)
  assert.equal(layout.menu.placement, 'below')
  assert.equal(layout.menu.top, 463)
  assert.equal(layout.menu.maxWidth, 1280)
})
