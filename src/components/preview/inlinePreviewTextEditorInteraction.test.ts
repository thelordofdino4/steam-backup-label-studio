import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isInlinePreviewTextEditorControlEvent,
  isInlinePreviewTextEditorPlacementLockTarget,
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

function createClosestTarget(matches: Record<string, unknown>) {
  return {
    closest: (selector: string) => matches[selector] ?? null,
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

test('inline editor locks placement for active contextual controls only', () => {
  const rangeInput = createClosestTarget({
    [
      [
        'input',
        'textarea',
        'select',
        'button',
        '[role="combobox"]',
        '[role="listbox"]',
        '[role="option"]',
        'label.inline-preview-text-control-field',
        'label.inline-preview-text-checkbox-field',
        '.inline-preview-text-number-select',
      ].join(',')
    ]: { id: 'range-input' },
  })
  const menuPadding = createClosestTarget({})
  const tabButton = createClosestTarget({
    [
      [
        'input',
        'textarea',
        'select',
        'button',
        '[role="combobox"]',
        '[role="listbox"]',
        '[role="option"]',
        'label.inline-preview-text-control-field',
        'label.inline-preview-text-checkbox-field',
        '.inline-preview-text-number-select',
      ].join(',')
    ]: { id: 'tab-button' },
    [
      [
        '.inline-preview-text-tabs',
        '.inline-preview-text-move-handle',
        '.inline-preview-text-done-button',
        '.inline-preview-text-delete-button',
      ].join(',')
    ]: { id: 'tab-strip' },
  })

  assert.equal(
    isInlinePreviewTextEditorPlacementLockTarget(rangeInput),
    true,
  )
  assert.equal(
    isInlinePreviewTextEditorPlacementLockTarget(menuPadding),
    false,
  )
  assert.equal(
    isInlinePreviewTextEditorPlacementLockTarget(tabButton),
    false,
  )
})
