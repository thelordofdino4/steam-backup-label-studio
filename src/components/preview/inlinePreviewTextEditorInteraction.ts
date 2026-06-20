export type InlinePreviewTextEditorControlRoot = {
  contains: (target: unknown) => boolean
}

function closestInlinePreviewTextElement(
  target: unknown,
  selector: string,
) {
  const closest = (target as { closest?: unknown } | null)?.closest

  if (typeof closest !== 'function') {
    return null
  }

  return closest.call(target, selector)
}

export function isInlinePreviewTextEditorControlTarget(
  target: unknown,
  roots: readonly InlinePreviewTextEditorControlRoot[],
) {
  if (!target) return false

  return roots.some((root) => root.contains(target))
}

export function isInlinePreviewTextEditorControlEvent({
  composedPath,
  roots,
  target,
}: {
  composedPath?: readonly unknown[]
  roots: readonly InlinePreviewTextEditorControlRoot[]
  target: unknown
}) {
  if (
    composedPath?.some((pathTarget) =>
      isInlinePreviewTextEditorControlTarget(pathTarget, roots))
  ) {
    return true
  }

  return isInlinePreviewTextEditorControlTarget(target, roots)
}

export function shouldKeepInlinePreviewTextEditorOpenOnBlur({
  pointerStartedInsideControls,
  relatedTarget,
  roots,
}: {
  pointerStartedInsideControls: boolean
  relatedTarget: unknown
  roots: readonly InlinePreviewTextEditorControlRoot[]
}) {
  return (
    pointerStartedInsideControls ||
    isInlinePreviewTextEditorControlTarget(relatedTarget, roots)
  )
}

export function isInlinePreviewTextEditorPlacementLockTarget(
  target: unknown,
) {
  const interactiveTarget = closestInlinePreviewTextElement(
    target,
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
    ].join(','),
  )

  if (!interactiveTarget) {
    return false
  }

  const excludedTarget = closestInlinePreviewTextElement(
    target,
    [
      '.inline-preview-text-tabs',
      '.inline-preview-text-move-handle',
      '.inline-preview-text-done-button',
      '.inline-preview-text-delete-button',
    ].join(','),
  )

  return !excludedTarget
}
