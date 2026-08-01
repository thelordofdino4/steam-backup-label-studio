const APPLICATION_MODAL_SELECTOR = '[aria-modal="true"]'

/** Returns the committed accessible application-modal state at dispatch time. */
export function hasApplicationModal(): boolean {
  return typeof document !== 'undefined' &&
    document.querySelector(APPLICATION_MODAL_SELECTOR) !== null
}
