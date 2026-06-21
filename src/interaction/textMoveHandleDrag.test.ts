import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  MOVE_HANDLE_DRAG_ACTIVATION_OPTIONS,
  TEXT_BODY_DRAG_ACTIVATION_OPTIONS,
  getRotatedLocalTextEdgePoint,
  isPointInTextEdgeGrabBand,
  isPrimaryMoveHandlePointer,
} from './textMoveHandleDrag.ts'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(currentDir))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

test('explicit text move handle activation has no long-hold delay or movement threshold', () => {
  assert.deepEqual(MOVE_HANDLE_DRAG_ACTIVATION_OPTIONS, {
    activationDelayMs: 0,
    movementTolerancePx: 0,
  })
})

test('text body drag keeps its long-hold activation contract separate', () => {
  assert.deepEqual(TEXT_BODY_DRAG_ACTIVATION_OPTIONS, {
    activationDelayMs: 320,
    movementTolerancePx: 6,
  })
})

test('move handle starts only from primary pointer buttons across pointer types', () => {
  for (const pointerType of ['mouse', 'pen', 'touch']) {
    assert.equal(
      isPrimaryMoveHandlePointer({
        button: 0,
        isPrimary: true,
        pointerType,
      } as never),
      true,
      `${pointerType} primary pointer should arm movement`,
    )
  }

  assert.equal(
    isPrimaryMoveHandlePointer({ button: 0, isPrimary: undefined } as never),
    true,
  )
  assert.equal(
    isPrimaryMoveHandlePointer({ button: 1, isPrimary: true } as never),
    false,
  )
  assert.equal(
    isPrimaryMoveHandlePointer({ button: 2, isPrimary: true } as never),
    false,
  )
  assert.equal(
    isPrimaryMoveHandlePointer({ button: 0, isPrimary: false } as never),
    false,
  )
})

test('shared text adapters route explicit move handles through immediate activation only', () => {
  const caseDragHook = readRepoFile(
    'src/interaction/useCaseInsertPreviewPointerDrag.ts',
  )
  const discDragHook = readRepoFile(
    'src/interaction/useDiscPreviewPointerDrag.ts',
  )
  const inlineEditor = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const discLayer = readRepoFile('src/components/preview/DiscTextLayer.tsx')

  assert.match(caseDragHook, /MOVE_HANDLE_DRAG_ACTIVATION_OPTIONS/)
  assert.doesNotMatch(caseDragHook, /TEXT_DRAG_ACTIVATION_OPTIONS/)
  assert.match(discDragHook, /handleDiscTextMoveHandlePointerDown/)
  assert.match(
    discDragHook,
    /beginDiscTextDrag\(event, key, MOVE_HANDLE_DRAG_ACTIVATION_OPTIONS\)/,
  )
  assert.match(
    discDragHook,
    /beginDiscTextDrag\(event, key, TEXT_BODY_DRAG_ACTIVATION_OPTIONS\)/,
  )
  assert.match(
    discLayer,
    /onMoveHandlePointerDown=\{handleDiscTextMoveHandlePointerDown\}/,
  )
  assert.match(inlineEditor, /isPrimaryMoveHandlePointer/)
  assert.match(inlineEditor, /inline-preview-text-edge-move-ring/)
  assert.match(inlineEditor, /'top'/)
  assert.match(inlineEditor, /'right'/)
  assert.match(inlineEditor, /'bottom'/)
  assert.match(inlineEditor, /'left'/)
  assert.match(inlineEditor, /`inline-preview-text-edge-move-hit--\$\{edge\}`/)
  assert.match(inlineEditor, /edgeRing\.addEventListener\('pointerdown'/)
  assert.match(
    inlineEditor,
    /isPointerInInlineTextEdgeGrabBand/,
  )
  assert.match(
    inlineEditor,
    /activeMoveEdgePointerIdRef\.current = isEdgeHit \? event\.pointerId : null/,
  )
})

test('selection edge movement keeps the editable interior available', () => {
  const inlineEditor = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const css = readRepoFile('src/styles/app-editor-controls.css')

  assert.match(css, /\.inline-preview-text-edge-move-ring\s*\{[^}]*pointer-events:\s*none/s)
  assert.match(css, /\.inline-preview-text-edge-move-hit\s*\{[^}]*pointer-events:\s*auto/s)
  assert.match(css, /\.inline-preview-text-edge-move-hit\s*\{[^}]*cursor:\s*text/s)
  assert.match(css, /\.inline-preview-text-edge-move-ring\[data-edge-grab-active\][^{]*\{[^}]*cursor:\s*move/s)
  assert.match(css, /\.inline-preview-text-edge-move-hit--top\s*\{[^}]*top:\s*-6px/s)
  assert.match(css, /\.inline-preview-text-edge-move-hit--bottom\s*\{[^}]*bottom:\s*-6px/s)
  assert.match(css, /\.inline-preview-text-edge-move-hit--left\s*\{[^}]*left:\s*-6px/s)
  assert.match(css, /\.inline-preview-text-edge-move-hit--right\s*\{[^}]*right:\s*-6px/s)
  assert.match(css, /cursor:\s*move/)
  assert.match(css, /cursor:\s*grabbing/)
  assert.doesNotMatch(
    inlineEditor,
    /TEXT_BODY_DRAG_ACTIVATION_OPTIONS/,
    'Inline text body should not route movement through long-hold activation',
  )
})

test('text edge grab band rejects editable interior points', () => {
  for (const point of [
    { x: 50, y: 20 },
    { x: 8, y: 8 },
    { x: 92, y: 32 },
  ]) {
    assert.equal(
      isPointInTextEdgeGrabBand({
        height: 40,
        point,
        width: 100,
      }),
      false,
      `interior point ${JSON.stringify(point)} should not move text`,
    )
  }
})

test('text edge grab band accepts outside edges and corners', () => {
  for (const point of [
    { x: 50, y: -6 },
    { x: 50, y: 46 },
    { x: -6, y: 20 },
    { x: 106, y: 20 },
    { x: -6, y: -6 },
    { x: 106, y: -6 },
    { x: 106, y: 46 },
    { x: -6, y: 46 },
  ]) {
    assert.equal(
      isPointInTextEdgeGrabBand({
        height: 40,
        point,
        width: 100,
      }),
      true,
      `edge point ${JSON.stringify(point)} should move text`,
    )
  }
})

test('text edge grab band keeps small text interiors editable', () => {
  assert.equal(
    isPointInTextEdgeGrabBand({
      height: 10,
      point: { x: 10, y: 5 },
      width: 20,
    }),
    false,
  )
  assert.equal(
    isPointInTextEdgeGrabBand({
      height: 10,
      point: { x: 10, y: -6 },
      width: 20,
    }),
    true,
  )
})

test('rotated spine edge hit testing maps screen points into local text space', () => {
  const rect = {
    height: 100,
    left: 100,
    top: 100,
    width: 40,
  }
  const localCenter = getRotatedLocalTextEdgePoint({
    clientX: 120,
    clientY: 150,
    height: 40,
    rect,
    rotationDegrees: 90,
    width: 100,
  })
  assert.deepEqual(
    {
      x: Math.round(localCenter.x),
      y: Math.round(localCenter.y),
    },
    { x: 50, y: 20 },
  )
  assert.equal(
    isPointInTextEdgeGrabBand({
      height: 40,
      point: localCenter,
      width: 100,
    }),
    false,
  )
})
