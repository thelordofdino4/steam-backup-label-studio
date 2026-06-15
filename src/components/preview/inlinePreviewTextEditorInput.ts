export type InlinePreviewTextKeyboardShortcutEvent = {
  altKey: boolean
  ctrlKey: boolean
  key: string
  metaKey: boolean
}

export function isInlinePreviewTextSelectAllShortcut(
  event: InlinePreviewTextKeyboardShortcutEvent,
) {
  return (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    event.key.toLocaleLowerCase() === 'a'
}
