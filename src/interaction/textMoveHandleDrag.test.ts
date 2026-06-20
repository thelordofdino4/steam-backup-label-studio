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
  assert.match(inlineEditor, /onPointerCancel=\{handleMoveHandlePointerRelease\}/)
  assert.match(
    inlineEditor,
    /onLostPointerCapture=\{handleMoveHandlePointerRelease\}/,
  )
})
