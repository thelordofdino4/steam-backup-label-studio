export type InlinePreviewTextShellMode = 'compact' | 'narrow' | 'wide'

export type InlinePreviewTextShellSizeContract = {
  menu: {
    minHeight: number
    minWidth: number
    preferredHeight: number
    preferredWidth: number
  }
  tabs: {
    minHeight: number
    minWidth: number
    preferredHeight: number
    preferredWidth: number
  }
}

export const INLINE_PREVIEW_TEXT_SHELL_SIZE_CONTRACT =
  {
    menu: {
      minHeight: 118,
      minWidth: 260,
      preferredHeight: 178,
      preferredWidth: 520,
    },
    tabs: {
      minHeight: 42,
      minWidth: 220,
      preferredHeight: 46,
      preferredWidth: 520,
    },
  } satisfies InlinePreviewTextShellSizeContract

export function getInlinePreviewTextShellMode(
  availableWidth: number,
): InlinePreviewTextShellMode {
  if (availableWidth < 320) return 'narrow'
  if (availableWidth < 440) return 'compact'

  return 'wide'
}

export function isInlinePreviewTextShellMenuUsable({
  maxHeight,
  maxWidth,
}: {
  maxHeight: number
  maxWidth: number
}) {
  return (
    maxHeight >= INLINE_PREVIEW_TEXT_SHELL_SIZE_CONTRACT.menu.minHeight &&
    maxWidth >= INLINE_PREVIEW_TEXT_SHELL_SIZE_CONTRACT.menu.minWidth
  )
}
