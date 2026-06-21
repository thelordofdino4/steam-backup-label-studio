import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getInlinePreviewTextControlLayout,
  getInlinePreviewTextLockedControlLayout,
  getInlinePreviewTextControlPlacementDiagnostics,
  inlinePreviewTextPlacementInternals,
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

test('inline text menu uses full measured height on initial bottom-edge open', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 286,
      centerY: 268,
      top: 250,
    }),
    previewRect: {
      bottom: 360,
      left: 0,
      right: 520,
      top: 0,
    },
    requestedMenuPlacement: 'below',
    sizes: {
      menu: { height: 178, width: 220 },
      moveHandle: sizes.moveHandle,
      tabs: { height: 46, width: 220 },
    },
  })

  assert.equal(layout.menu.placement, 'above')
  assert.equal(layout.tabs.top, 196)
  assert.equal(layout.menu.top, 10)
  assert.equal(layout.menu.maxHeight, 188)
  assert.ok(layout.menu.top + 178 <= layout.tabs.top - 8)
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

test('inline text menu falls back to internal scrolling when neither side fits on initial open', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 155,
      centerY: 140,
      top: 125,
    }),
    previewRect: {
      bottom: 240,
      left: 0,
      right: 420,
      top: 0,
    },
    requestedMenuPlacement: 'below',
    sizes: {
      menu: { height: 178, width: 220 },
      moveHandle: sizes.moveHandle,
      tabs: { height: 46, width: 220 },
    },
  })

  assert.equal(layout.menu.placement, 'below')
  assert.equal(layout.menu.top, 163)
  assert.equal(layout.menu.maxHeight, 77)
  assert.ok(layout.menu.top + layout.menu.maxHeight <= 240)
})

test('inline text controls keep a top-edge menu below selected text on first placement', () => {
  const input = {
    anchor: createAnchor({
      bottom: 42,
      centerX: 150,
      centerY: 25,
      right: 230,
      top: 8,
    }),
    previewRect: {
      bottom: 500,
      left: 0,
      right: 500,
      top: 0,
    },
    requestedMenuPlacement: 'below' as const,
    sizes: {
      menu: { height: 178, width: 220 },
      moveHandle: { height: 32, width: 60 },
      tabs: { height: 46, width: 220 },
    },
  }
  const layout = getInlinePreviewTextControlLayout(input)
  const diagnostics = getInlinePreviewTextControlPlacementDiagnostics(input)
  const belowCandidate = diagnostics.candidates.find((candidate) =>
    candidate.candidate === 'below')

  assert.equal(layout.mode, 'anchored')
  assert.equal(layout.tabs.top, 0)
  assert.equal(layout.menu.placement, 'below')
  assert.equal(layout.menu.top, 50)
  assert.equal(layout.menu.maxHeight, 450)
  assert.equal(diagnostics.emergencyEligible, false)
  assert.equal(belowCandidate?.usable, true)
})

test('inline text menu recalculates when tab content changes menu height', () => {
  const anchor = createAnchor({
    bottom: 286,
    centerY: 268,
    top: 250,
  })
  const sharedSizes = {
    moveHandle: sizes.moveHandle,
    tabs: { height: 46, width: 220 },
  }
  const preview = {
    bottom: 360,
    left: 0,
    right: 520,
    top: 0,
  }
  const compactLayout = getInlinePreviewTextControlLayout({
    anchor,
    previewRect: preview,
    requestedMenuPlacement: 'below',
    sizes: {
      ...sharedSizes,
      menu: { height: 48, width: 220 },
    },
  })
  const expandedLayout = getInlinePreviewTextControlLayout({
    anchor,
    previewRect: preview,
    requestedMenuPlacement: 'below',
    sizes: {
      ...sharedSizes,
      menu: { height: 178, width: 220 },
    },
  })

  assert.equal(compactLayout.menu.placement, 'below')
  assert.equal(expandedLayout.menu.placement, 'above')
  assert.ok(
    expandedLayout.menu.top + 178 <= expandedLayout.tabs.top - 8,
  )
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
  assert.ok(layout.menu.maxHeight >= 1)
  assert.ok(layout.menu.maxHeight <= 80)
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

test('inline text controls use replaced text host bounds as the new anchor', () => {
  const originalLayout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 168,
      centerX: 150,
      centerY: 134,
      right: 230,
      top: 100,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes,
  })
  const replacedHostLayout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 248,
      centerX: 210,
      centerY: 214,
      right: 290,
      top: 180,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes,
  })

  assert.equal(replacedHostLayout.tabs.left - originalLayout.tabs.left, 60)
  assert.equal(replacedHostLayout.tabs.top - originalLayout.tabs.top, 80)
  assert.equal(
    replacedHostLayout.moveHandle.top - originalLayout.moveHandle.top,
    80,
  )
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

test('inline text menu detaches instead of collapsing below navigable height', () => {
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

  assert.equal(layout.mode, 'detached')
  assert.equal(layout.menu.placement, 'detached')
  assert.equal(layout.menu.top, 0)
  assert.ok(layout.menu.maxHeight >= 118)
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

test('inline text controls choose a side candidate to avoid registered obstacles', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 260,
      centerX: 250,
      centerY: 240,
      right: 300,
      top: 220,
    }),
    obstacles: [
      {
        id: 'below-panel',
        rect: { bottom: 430, left: 190, right: 360, top: 268 },
      },
      {
        id: 'above-panel',
        rect: { bottom: 212, left: 190, right: 360, top: 84 },
      },
      {
        id: 'right-panel',
        rect: { bottom: 360, left: 308, right: 486, top: 120 },
      },
    ],
    previewRect: {
      bottom: 500,
      left: 0,
      right: 500,
      top: 0,
    },
    requestedMenuPlacement: 'below',
    sizes: {
      menu: { height: 120, width: 120 },
      moveHandle: sizes.moveHandle,
      tabs: { height: 30, width: 120 },
    },
  })

  assert.equal(layout.mode, 'anchored')
  assert.equal(layout.menu.placement, 'left')
  assert.ok(layout.menu.left + 120 < 308)
  assert.ok(layout.tabs.left + 120 < 308)
})

test('inline text controls keep placement stable when scores are nearly tied', () => {
  const input = {
    anchor: createAnchor(),
    obstacles: [
      {
        id: 'non-overlapping-panel',
        rect: { bottom: 20, left: 260, right: 300, top: 0 },
      },
    ],
    previewRect,
    requestedMenuPlacement: 'below' as const,
    sizes,
  }
  const defaultLayout = getInlinePreviewTextControlLayout(input)
  const stableLayout = getInlinePreviewTextControlLayout({
    ...input,
    previousPlacement: 'above',
  })

  assert.equal(defaultLayout.menu.placement, 'below')
  assert.equal(stableLayout.menu.placement, 'above')
})

test('inline text controls keep roomy large text anchored when a side placement fits', () => {
  const input = {
    anchor: {
      bottom: 300,
      centerX: 120,
      centerY: 150,
      right: 240,
      top: 0,
    },
    obstacles: [
      {
        id: 'unrelated-workspace-control',
        rect: { bottom: 24, left: 260, right: 300, top: 0 },
      },
    ],
    previewRect,
    requestedMenuPlacement: 'below' as const,
    sizes: {
      menu: { height: 40, width: 40 },
      moveHandle: { height: 20, width: 20 },
      tabs: { height: 30, width: 40 },
    },
    workspaceRect: {
      bottom: 420,
      left: 0,
      right: 300,
      top: 0,
    },
  }
  const layout = getInlinePreviewTextControlLayout(input)
  const diagnostics = getInlinePreviewTextControlPlacementDiagnostics(input)
  const rightCandidate = diagnostics.candidates.find((candidate) =>
    candidate.candidate === 'right')

  assert.equal(diagnostics.selectedTextAreaRatio, 0.8)
  assert.equal(diagnostics.emergencyEligible, false)
  assert.equal(rightCandidate?.usable, true)
  assert.equal(layout.mode, 'anchored')
  assert.equal(layout.menu.placement, 'right')
})

test('inline text controls detach when selected text occupies most of the preview', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: {
      bottom: 1080,
      centerX: 500,
      centerY: 600,
      right: 950,
      top: 120,
    },
    previewRect: {
      bottom: 1100,
      left: 0,
      right: 1000,
      top: 100,
    },
    requestedMenuPlacement: 'below',
    sizes: {
      menu: { height: 140, width: 260 },
      moveHandle: { height: 32, width: 60 },
      tabs: { height: 46, width: 260 },
    },
    workspaceRect: {
      bottom: 1300,
      left: 0,
      right: 1000,
      top: 0,
    },
  })

  assert.equal(layout.mode, 'detached')
  assert.equal(layout.menu.placement, 'detached')
  assert.equal(layout.tabs.top, 46)
  assert.equal(layout.menu.top, 1108)
  assert.ok(layout.menu.top >= 1100)
})

test('inline text placement diagnostics report candidate scores and overlaps', () => {
  const diagnostics = getInlinePreviewTextControlPlacementDiagnostics({
    anchor: createAnchor({
      bottom: 260,
      centerX: 250,
      centerY: 240,
      right: 300,
      top: 220,
    }),
    obstacles: [
      {
        id: 'below-panel',
        rect: { bottom: 430, left: 190, right: 360, top: 268 },
      },
      {
        id: 'above-panel',
        rect: { bottom: 212, left: 190, right: 360, top: 84 },
      },
      {
        id: 'right-panel',
        rect: { bottom: 360, left: 308, right: 486, top: 120 },
      },
    ],
    previewRect: {
      bottom: 500,
      left: 0,
      right: 500,
      top: 0,
    },
    requestedMenuPlacement: 'below',
    sizes: {
      menu: { height: 120, width: 120 },
      moveHandle: sizes.moveHandle,
      tabs: { height: 30, width: 120 },
    },
  })
  const belowCandidate = diagnostics.candidates.find((candidate) =>
    candidate.candidate === 'below')

  assert.equal(diagnostics.candidates.length, 4)
  assert.equal(diagnostics.selectedPlacement, 'left')
  assert.ok((belowCandidate?.obstacleOverlap ?? 0) > 0)
  assert.ok(Number.isFinite(belowCandidate?.score))
})

test('inline text detached menu avoids checklist and guide legend obstacles', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: {
      bottom: 1080,
      centerX: 500,
      centerY: 600,
      right: 950,
      top: 120,
    },
    obstacles: [
      {
        id: 'design-check-button',
        rect: { bottom: 1168, left: 420, right: 468, top: 1120 },
      },
      {
        id: 'guide-legend-button',
        rect: { bottom: 1168, left: 476, right: 524, top: 1120 },
      },
    ],
    previewRect: {
      bottom: 1100,
      left: 0,
      right: 1000,
      top: 100,
    },
    requestedMenuPlacement: 'below',
    sizes: {
      menu: { height: 140, width: 260 },
      moveHandle: { height: 32, width: 60 },
      tabs: { height: 46, width: 260 },
    },
    workspaceRect: {
      bottom: 1300,
      left: 0,
      right: 1000,
      top: 0,
    },
  })

  assert.equal(layout.mode, 'detached')
  assert.ok(layout.menu.top + 140 <= 1112)
})

test('inline text controls return to anchored placement below emergency threshold', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: {
      bottom: 420,
      centerX: 500,
      centerY: 360,
      right: 620,
      top: 300,
    },
    previewRect: {
      bottom: 1100,
      left: 0,
      right: 1000,
      top: 100,
    },
    requestedMenuPlacement: 'below',
    sizes: {
      menu: { height: 140, width: 260 },
      moveHandle: { height: 32, width: 60 },
      tabs: { height: 46, width: 260 },
    },
    workspaceRect: {
      bottom: 1300,
      left: 0,
      right: 1000,
      top: 0,
    },
  })

  assert.equal(layout.mode, 'anchored')
  assert.equal(layout.menu.placement, 'below')
  assert.equal(layout.menu.top, 428)
})

test('inline text controls can freeze current placement during active input', () => {
  const initialLayout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 130,
      centerX: 250,
      centerY: 115,
      right: 270,
      top: 100,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes,
  })
  const lockedLayout = getInlinePreviewTextLockedControlLayout({
    layout: initialLayout,
    sizes,
    workspaceRect: {
      bottom: 300,
      left: 0,
      right: 260,
      top: 0,
    },
  })

  assert.equal(lockedLayout.menu.placement, initialLayout.menu.placement)
  assert.equal(lockedLayout.mode, initialLayout.mode)
  assert.equal(lockedLayout.tabs.top, initialLayout.tabs.top)
  assert.equal(lockedLayout.menu.top, initialLayout.menu.top)
  assert.ok(lockedLayout.menu.left + sizes.menu.width <= 260)
  assert.ok(lockedLayout.tabs.left + sizes.tabs.width <= 260)
})

test('inline text controls keep move handle accessible when the menu blocks the normal side', () => {
  const layout = getInlinePreviewTextControlLayout({
    anchor: createAnchor({
      bottom: 136,
      centerX: 234,
      centerY: 120,
      right: 276,
      top: 104,
    }),
    previewRect,
    requestedMenuPlacement: 'below',
    sizes: {
      menu: { height: 96, width: 160 },
      moveHandle: { height: 28, width: 54 },
      tabs: { height: 24, width: 160 },
    },
  })
  const menuRect = {
    bottom: layout.menu.top + 96,
    left: layout.menu.left,
    right: layout.menu.left + 160,
    top: layout.menu.top,
  }
  const tabsRect = {
    bottom: layout.tabs.top + 24,
    left: layout.tabs.left,
    right: layout.tabs.left + 160,
    top: layout.tabs.top,
  }
  const handleRect = {
    bottom: layout.moveHandle.top + 28,
    left: layout.moveHandle.left,
    right: layout.moveHandle.left + 54,
    top: layout.moveHandle.top,
  }

  assert.equal(
    inlinePreviewTextPlacementInternals.getOverlapArea(handleRect, menuRect),
    0,
  )
  assert.equal(
    inlinePreviewTextPlacementInternals.getOverlapArea(handleRect, tabsRect),
    0,
  )
  assert.ok(handleRect.left >= previewRect.left)
  assert.ok(handleRect.right <= previewRect.right)
})

test('inline text controls treat center-hole-sized obstacles as local, not emergency', () => {
  const input = {
    anchor: createAnchor({
      bottom: 178,
      centerX: 150,
      centerY: 150,
      right: 198,
      top: 122,
    }),
    obstacles: [
      {
        id: 'disc-center-hole',
        rect: { bottom: 185, left: 115, right: 185, top: 115 },
      },
    ],
    previewRect,
    requestedMenuPlacement: 'below' as const,
    sizes: {
      menu: { height: 72, width: 112 },
      moveHandle: { height: 24, width: 40 },
      tabs: { height: 24, width: 112 },
    },
    workspaceRect: {
      bottom: 420,
      left: 0,
      right: 300,
      top: 0,
    },
  }
  const diagnostics = getInlinePreviewTextControlPlacementDiagnostics(input)
  const layout = getInlinePreviewTextControlLayout(input)

  assert.equal(diagnostics.emergencyEligible, false)
  assert.equal(layout.mode, 'anchored')
})

test('disc text controls use normal anchored placement when it avoids the selected text', () => {
  const input = {
    anchor: createAnchor({
      bottom: 455,
      centerX: 500,
      centerY: 438.5,
      right: 620,
      top: 422,
    }),
    placementStrategy: 'disc-center-dock' as const,
    previewRect: {
      bottom: 1000,
      left: 0,
      right: 1000,
      top: 0,
    },
    requestedMenuPlacement: 'below' as const,
    sizes: {
      menu: { height: 220, width: 420 },
      moveHandle: { height: 32, width: 60 },
      tabs: { height: 46, width: 420 },
    },
  }
  const diagnostics = getInlinePreviewTextControlPlacementDiagnostics(input)
  const layout = getInlinePreviewTextControlLayout(input)

  assert.equal(diagnostics.selectedPlacement, 'below')
  assert.equal(layout.mode, 'anchored')
  assert.equal(layout.menu.placement, 'below')
})

test('disc text controls center-dock when top-arc anchored controls cover selected text', () => {
  const input = {
    anchor: createAnchor({
      bottom: 110,
      centerX: 500,
      centerY: 65,
      right: 840,
      top: 20,
    }),
    obstacles: [
      {
        id: 'disc-center-hole',
        rect: { bottom: 570, left: 430, right: 570, top: 430 },
      },
    ],
    placementStrategy: 'disc-center-dock' as const,
    previewRect: {
      bottom: 1000,
      left: 0,
      right: 1000,
      top: 0,
    },
    requestedMenuPlacement: 'below' as const,
    sizes: {
      menu: { height: 286, width: 520 },
      moveHandle: { height: 32, width: 60 },
      tabs: { height: 46, width: 520 },
    },
  }
  const diagnostics = getInlinePreviewTextControlPlacementDiagnostics(input)
  const layout = getInlinePreviewTextControlLayout(input)

  assert.equal(diagnostics.selectedPlacement, 'center-docked')
  assert.equal(layout.mode, 'center-docked')
  assert.equal(layout.menu.placement, 'center-docked')
  assert.equal(layout.tabs.top, 220)
  assert.equal(layout.menu.top, 274)
  assert.equal(layout.moveHandle.top, 568)
  assert.equal(layout.tabs.maxWidth, 520)
  assert.equal(layout.menu.maxWidth, 520)
  assert.equal(
    inlinePreviewTextPlacementInternals.getOverlapArea(
      {
        bottom: layout.menu.top + 286,
        left: layout.menu.left,
        right: layout.menu.left + 520,
        top: layout.menu.top,
      },
      {
        bottom: 110,
        left: 160,
        right: 840,
        top: 20,
      },
    ),
    0,
  )
})

test('disc center-docked controls scroll internally inside the central workspace', () => {
  const input = {
    anchor: createAnchor({
      bottom: 110,
      centerX: 300,
      centerY: 65,
      right: 520,
      top: 20,
    }),
    placementStrategy: 'disc-center-dock' as const,
    previewRect: {
      bottom: 600,
      left: 0,
      right: 600,
      top: 0,
    },
    requestedMenuPlacement: 'below' as const,
    sizes: {
      menu: { height: 480, width: 420 },
      moveHandle: { height: 32, width: 60 },
      tabs: { height: 46, width: 420 },
    },
  }
  const layout = getInlinePreviewTextControlLayout(input)

  assert.equal(layout.mode, 'center-docked')
  assert.ok(Math.abs(layout.menu.maxHeight - 242) < 0.001)
  assert.ok(layout.menu.maxHeight < input.sizes.menu.height)
  assert.ok(layout.menu.maxHeight >= 118)
  assert.ok(layout.moveHandle.top + input.sizes.moveHandle.height <= 468)
})
