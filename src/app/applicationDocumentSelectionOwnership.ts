import { useEffect } from 'react'

type KeyboardTargetLike = Readonly<{
  tagName?: string
  type?: string
  isContentEditable?: boolean
  parentElement?: KeyboardTargetLike | null
  getAttribute?(name: string): string | null
}>

export type ApplicationSelectAllEvent = Readonly<{
  altKey: boolean
  ctrlKey: boolean
  defaultPrevented: boolean
  key: string
  metaKey: boolean
  shiftKey: boolean
  target: EventTarget | null
  preventDefault(): void
}>

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

function asKeyboardTarget(target: EventTarget | null): KeyboardTargetLike | null {
  return typeof target === 'object' && target !== null
    ? target as KeyboardTargetLike
    : null
}

export function isApplicationTextEntryTarget(
  target: EventTarget | null,
): boolean {
  let current = asKeyboardTarget(target)
  while (current) {
    const tagName = current.tagName?.toLowerCase()
    if (tagName === 'textarea') return true
    if (tagName === 'input') {
      const inputType = (current.type ?? current.getAttribute?.('type') ?? 'text')
        .toLowerCase()
      return !NON_TEXT_INPUT_TYPES.has(inputType)
    }
    if (
      current.isContentEditable === true ||
      ['', 'true', 'plaintext-only'].includes(
        current.getAttribute?.('contenteditable')?.toLowerCase() ?? 'false',
      )
    ) {
      return true
    }
    current = current.parentElement ?? null
  }
  return false
}

export function shouldPreventApplicationDocumentSelectAll(
  event: ApplicationSelectAllEvent,
): boolean {
  return !event.defaultPrevented &&
    event.key.toLowerCase() === 'a' &&
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    !isApplicationTextEntryTarget(event.target)
}

export function installApplicationDocumentSelectionOwnership(
  documentTarget: Pick<Document, 'addEventListener' | 'removeEventListener'>,
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (shouldPreventApplicationDocumentSelectAll(event)) {
      event.preventDefault()
    }
  }
  documentTarget.addEventListener('keydown', handleKeyDown, true)
  return () => documentTarget.removeEventListener('keydown', handleKeyDown, true)
}

export function useApplicationDocumentSelectionOwnership(): void {
  useEffect(() => installApplicationDocumentSelectionOwnership(document), [])
}
