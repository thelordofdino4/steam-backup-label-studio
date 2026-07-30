export const IMAGE_CANDIDATE_PICKER_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function isDisabled(element: HTMLElement) {
  return ('disabled' in element && Boolean(element.disabled)) ||
    element.getAttribute('aria-disabled') === 'true'
}

export function isImageCandidatePickerFocusTargetUsable(
  element: HTMLElement | null,
) {
  if (!element || !element.isConnected || element.hidden || isDisabled(element)) {
    return false
  }
  if (element.getAttribute('aria-hidden') === 'true') return false

  const view = element.ownerDocument?.defaultView
  if (view) {
    const style = view.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false
  }

  return element.getClientRects().length > 0
}

export function getImageCandidatePickerFocusableTargets(
  container: HTMLElement,
) {
  return [...container.querySelectorAll<HTMLElement>(
    IMAGE_CANDIDATE_PICKER_FOCUSABLE_SELECTOR,
  )].filter(isImageCandidatePickerFocusTargetUsable)
}

export function getImageCandidatePickerInitialFocusTarget(
  container: HTMLElement,
) {
  const candidates = [...container.querySelectorAll<HTMLElement>(
    '[data-image-candidate-item="true"]',
  )].filter(isImageCandidatePickerFocusTargetUsable)
  return candidates.find((candidate) =>
    candidate.getAttribute('data-image-candidate-selected') === 'true') ??
    candidates[0] ??
    [...container.querySelectorAll<HTMLElement>(
      '[data-image-candidate-close="true"]',
    )].find(isImageCandidatePickerFocusTargetUsable) ??
    container
}

export function getImageCandidatePickerTabTarget(
  container: HTMLElement,
  activeElement: Element | null,
  reverse: boolean,
) {
  const focusable = getImageCandidatePickerFocusableTargets(container)
  if (focusable.length === 0) return container

  const currentIndex = focusable.findIndex((target) => target === activeElement)
  if (currentIndex < 0) return reverse ? focusable.at(-1)! : focusable[0]

  const offset = reverse ? -1 : 1
  return focusable[
    (currentIndex + offset + focusable.length) % focusable.length
  ]
}

export function focusImageCandidatePickerTarget(element: HTMLElement) {
  element.focus({ preventScroll: true })
}

export function captureImageCandidatePickerFocusPath(opener: HTMLElement) {
  const path: HTMLElement[] = []
  let current: HTMLElement | null = opener
  while (current) {
    path.push(current)
    current = current.parentElement
  }
  return path
}

function isTabbableRestorationTarget(element: HTMLElement) {
  return isImageCandidatePickerFocusTargetUsable(element) &&
    element.tabIndex >= 0
}

function focusProgrammaticFallback(element: HTMLElement) {
  const hadTabIndex = element.hasAttribute('tabindex')
  const previousTabIndex = element.getAttribute('tabindex')
  if (!hadTabIndex) element.setAttribute('tabindex', '-1')
  focusImageCandidatePickerTarget(element)
  if (!hadTabIndex) {
    element.removeAttribute('tabindex')
  } else if (previousTabIndex !== null) {
    element.setAttribute('tabindex', previousTabIndex)
  }
}

/**
 * Restores the exact opener when possible. If it became invalid, the first
 * usable focus target in the nearest surviving captured ancestor wins; a
 * connected ancestor itself is the deterministic final fallback.
 */
export function restoreImageCandidatePickerFocus(
  capturedPath: readonly HTMLElement[],
) {
  const opener = capturedPath[0] ?? null
  if (opener && isTabbableRestorationTarget(opener)) {
    focusImageCandidatePickerTarget(opener)
    return opener
  }

  for (const ancestor of capturedPath.slice(1)) {
    if (!isImageCandidatePickerFocusTargetUsable(ancestor)) continue
    const survivingTarget = getImageCandidatePickerFocusableTargets(ancestor)
      .find((target) => target !== opener)
    if (survivingTarget) {
      focusImageCandidatePickerTarget(survivingTarget)
      return survivingTarget
    }
  }

  const fallback = capturedPath.slice(1)
    .find(isImageCandidatePickerFocusTargetUsable)
  if (fallback) {
    focusProgrammaticFallback(fallback)
    return fallback
  }

  return null
}
