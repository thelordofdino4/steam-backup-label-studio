export type InlinePreviewTextEditorControlRoot = {
  contains: (target: unknown) => boolean
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
