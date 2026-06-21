import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  MOVE_HANDLE_DRAG_ACTIVATION_OPTIONS,
  TEXT_BODY_DRAG_ACTIVATION_OPTIONS,
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
  assert.match(inlineEditor, /target\.closest\('\.inline-preview-text-edge-move-hit'\)/)
  assert.match(inlineEditor, /onPointerCancel=\{handleMoveHandlePointerRelease\}/)
  assert.match(
    inlineEditor,
    /onLostPointerCapture=\{handleMoveHandlePointerRelease\}/,
  )
  assert.match(
    inlineEditor,
    /onLostPointerCapture=\{handleMoveEdgePointerRelease\}/,
  )
})

test('selection edge movement keeps the editable interior available', () => {
  const inlineEditor = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const css = readRepoFile('src/styles/app-editor-controls.css')

  assert.match(css, /\.inline-preview-text-edge-move-ring\s*\{[^}]*pointer-events:\s*none/s)
  assert.match(css, /\.inline-preview-text-edge-move-hit\s*\{[^}]*pointer-events:\s*auto/s)
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
