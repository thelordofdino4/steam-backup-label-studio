import { useLayoutEffect, useRef } from 'react'
import type {
  ProjectReplacementDecision,
} from '../../app/appProjectReplacementGuard.ts'

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hidden)
}

export function ProjectReplacementDialog({
  open,
  onDecision,
}: Readonly<{
  open: boolean
  onDecision: (decision: ProjectReplacementDecision) => void
}>) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const saveButtonRef = useRef<HTMLButtonElement | null>(null)

  useLayoutEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    saveButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onDecision('cancel')
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = getFocusableElements(dialogRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [onDecision, open])

  if (!open) return null

  return (
    <div className="project-replacement-backdrop">
      <div
        aria-describedby="project-replacement-description"
        aria-labelledby="project-replacement-title"
        aria-modal="true"
        className="project-replacement-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <h2 id="project-replacement-title">Save changes before continuing?</h2>
        <p id="project-replacement-description">
          The current project has unsaved changes. Save them, discard them, or
          cancel and keep editing.
        </p>
        <div className="project-replacement-actions">
          <button
            onClick={() => onDecision('save')}
            ref={saveButtonRef}
            type="button"
          >
            Save
          </button>
          <button
            className="project-replacement-discard"
            onClick={() => onDecision('discard')}
            type="button"
          >
            Discard Changes
          </button>
          <button onClick={() => onDecision('cancel')} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
