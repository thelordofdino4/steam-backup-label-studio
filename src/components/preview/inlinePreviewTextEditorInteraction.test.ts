import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isInlinePreviewTextEditorControlEvent,
  isInlinePreviewTextEditorControlTarget,
  shouldKeepInlinePreviewTextEditorOpenOnBlur,
  type InlinePreviewTextEditorControlRoot,
} from './inlinePreviewTextEditorInteraction.ts'

function createControlRoot(
  ...insideTargets: readonly unknown[]
): InlinePreviewTextEditorControlRoot {
  return {
    contains: (target: unknown) => insideTargets.includes(target),
  }
}

test('inline editor recognizes contextual shell padding and gaps as inside clicks', () => {
  const menuPadding = { id: 'menu-padding' }
  const tabGap = { id: 'tab-gap' }
  const outside = { id: 'outside' }
  const roots = [
    createControlRoot(menuPadding),
    createControlRoot(tabGap),
  ]

  assert.equal(isInlinePreviewTextEditorControlTarget(menuPadding, roots), true)
  assert.equal(
    isInlinePreviewTextEditorControlEvent({
      composedPath: [menuPadding, { id: 'menu' }],
      roots,
      target: outside,
    }),
    true,
  )
  assert.equal(
    isInlinePreviewTextEditorControlEvent({
      composedPath: [outside],
      roots,
      target: outside,
    }),
    false,
  )
})

test('inline editor blur remains open after a pointer starts inside contextual shell', () => {
  const menuWhitespace = { id: 'menu-whitespace' }
  const outside = { id: 'outside' }
  const roots = [createControlRoot(menuWhitespace)]

  assert.equal(
    shouldKeepInlinePreviewTextEditorOpenOnBlur({
      pointerStartedInsideControls: true,
      relatedTarget: null,
      roots,
    }),
    true,
  )
  assert.equal(
    shouldKeepInlinePreviewTextEditorOpenOnBlur({
      pointerStartedInsideControls: false,
      relatedTarget: menuWhitespace,
      roots,
    }),
    true,
  )
  assert.equal(
    shouldKeepInlinePreviewTextEditorOpenOnBlur({
      pointerStartedInsideControls: false,
      relatedTarget: outside,
      roots,
    }),
    false,
  )
})
