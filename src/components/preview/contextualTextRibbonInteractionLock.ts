// Presentation-only interaction state. No project/editor state is captured.
export function bindContextualTextRibbonInteractionLock(
  host: HTMLElement,
  onRelease: () => void,
) {
  let target: HTMLElement | null = null
  let row: HTMLElement | null = null
  let scrollLeft = 0
  let pointerHeld = false

  const release = () => {
    if (!target) return
    target = null
    row = null
    pointerHeld = false
    delete host.dataset.ribbonLayoutFrozen
    onRelease()
  }
  const controlFor = (value: EventTarget | null) => {
    if (!(value instanceof HTMLElement)) return null
    const control = value.closest<HTMLElement>('input, select, textarea, button, [contenteditable="true"]')
    return control && host.contains(control)
      && control.closest('.contextual-text-ribbon-control-row') ? control : null
  }
  const begin = (event: Event) => {
    if (event instanceof KeyboardEvent && event.key === 'Tab') {
      release()
      return
    }
    const control = controlFor(event.target)
    if (!control) return
    if (target !== control) {
      target = control
      row = control.closest<HTMLElement>('.contextual-text-ribbon-control-row')
      scrollLeft = row?.scrollLeft ?? 0
    }
    if (event.type === 'pointerdown') pointerHeld = true
    host.dataset.ribbonLayoutFrozen = 'true'
  }
  const endHold = () => {
    pointerHeld = false
    if (target && (target.matches('button, input[type="checkbox"], input[type="radio"], input[type="range"]')
      || document.activeElement !== target)) release()
  }
  const focusChanged = () => {
    // Focus navigation is allowed to reveal the next control before a new edit.
    if (!pointerHeld && target && document.activeElement !== target) release()
  }
  const focusLeaving = () => queueMicrotask(focusChanged)
  const retainScroll = (event: Event) => {
    if (event.target === row && row && row.scrollLeft !== scrollLeft) row.scrollLeft = scrollLeft
  }
  host.addEventListener('pointerdown', begin, true)
  host.addEventListener('keydown', begin, true)
  host.addEventListener('scroll', retainScroll, true)
  document.addEventListener('pointerup', endHold, true)
  document.addEventListener('pointercancel', release, true)
  document.addEventListener('keyup', endHold, true)
  document.addEventListener('focusin', focusChanged, true)
  document.addEventListener('focusout', focusLeaving, true)
  window.addEventListener('blur', endHold)
  return {
    isFrozen() {
      if (target && !host.contains(target)) release()
      return target !== null
    },
    dispose() {
      target = null
      row = null
      host.removeEventListener('pointerdown', begin, true)
      host.removeEventListener('keydown', begin, true)
      host.removeEventListener('scroll', retainScroll, true)
      document.removeEventListener('pointerup', endHold, true)
      document.removeEventListener('pointercancel', release, true)
      document.removeEventListener('keyup', endHold, true)
      document.removeEventListener('focusin', focusChanged, true)
      document.removeEventListener('focusout', focusLeaving, true)
      window.removeEventListener('blur', endHold)
      delete host.dataset.ribbonLayoutFrozen
    },
  }
}
