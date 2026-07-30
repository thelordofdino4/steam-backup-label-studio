export type PreviewInteractionElement = Readonly<{
  tagName: string
  parentElement: PreviewInteractionElement | null
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  isContentEditable?: boolean
}>

const NATIVE_INTERACTIVE_TAGS = new Set([
  'BUTTON',
  'INPUT',
  'LABEL',
  'SELECT',
  'SUMMARY',
  'TEXTAREA',
])

const INTERACTIVE_ROLES = new Set([
  'alertdialog',
  'button',
  'checkbox',
  'combobox',
  'dialog',
  'gridcell',
  'link',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'scrollbar',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
  'treeitem',
])

function asInteractionElement(
  target: EventTarget | PreviewInteractionElement | null,
): PreviewInteractionElement | null {
  if (!target || typeof target !== 'object') return null

  if (
    'tagName' in target &&
    typeof target.tagName === 'string' &&
    'getAttribute' in target &&
    typeof target.getAttribute === 'function'
  ) {
    return target as PreviewInteractionElement
  }

  if ('parentElement' in target) {
    return (target as { parentElement?: PreviewInteractionElement | null })
      .parentElement ?? null
  }

  return null
}

function isExplicitlyContentEditable(element: PreviewInteractionElement) {
  let current: PreviewInteractionElement | null = element

  while (current) {
    const value = current.getAttribute('contenteditable')
    if (value !== null) {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'false') return false
      if (
        normalized === '' ||
        normalized === 'true' ||
        normalized === 'plaintext-only'
      ) {
        return true
      }
    }
    current = current.parentElement
  }

  return Boolean(element.isContentEditable)
}

function isElementInteractive(element: PreviewInteractionElement) {
  const tagName = element.tagName.toUpperCase()
  if (NATIVE_INTERACTIVE_TAGS.has(tagName)) return true
  if (
    (tagName === 'A' || tagName === 'AREA') &&
    element.hasAttribute('href')
  ) {
    return true
  }
  if (
    (tagName === 'AUDIO' || tagName === 'VIDEO') &&
    element.hasAttribute('controls')
  ) {
    return true
  }

  const role = element.getAttribute('role')?.trim().toLowerCase()
  if (role && INTERACTIVE_ROLES.has(role)) return true

  const tabIndexValue = element.getAttribute('tabindex')
  if (tabIndexValue !== null) {
    const tabIndex = Number.parseInt(tabIndexValue, 10)
    if (Number.isFinite(tabIndex) && tabIndex >= 0) return true
  }

  return element.getAttribute('data-preview-viewport-controls') === 'true'
}

/**
 * Returns true when the event target belongs to a native/custom control or an
 * effective editable region. Descendants inherit ownership from their nearest
 * interactive ancestor, while an explicit contenteditable=false boundary
 * stops editable inheritance.
 */
export function isPreviewInteractiveTarget(
  target: EventTarget | PreviewInteractionElement | null,
) {
  const element = asInteractionElement(target)
  if (!element) return false
  if (isExplicitlyContentEditable(element)) return true

  let current: PreviewInteractionElement | null = element
  while (current) {
    if (isElementInteractive(current)) return true
    current = current.parentElement
  }

  return false
}

export function isPreviewViewportControlTarget(
  target: EventTarget | PreviewInteractionElement | null,
) {
  let current = asInteractionElement(target)
  while (current) {
    if (current.getAttribute('data-preview-viewport-controls') === 'true') {
      return true
    }
    current = current.parentElement
  }
  return false
}

export type PreviewSpaceKeyOwnershipInput = Readonly<{
  code: string
  defaultPrevented: boolean
  repeat: boolean
  target: EventTarget | PreviewInteractionElement | null
  targetInsideStage: boolean
  pointerInsideStage: boolean
}>

export function shouldArmPreviewSpacePan({
  code,
  defaultPrevented,
  repeat,
  target,
  targetInsideStage,
  pointerInsideStage,
}: PreviewSpaceKeyOwnershipInput) {
  return code === 'Space' &&
    !defaultPrevented &&
    !repeat &&
    (targetInsideStage || pointerInsideStage) &&
    !isPreviewInteractiveTarget(target)
}

export type PreviewPanStartMode = 'middle' | 'space-primary'

export function getPreviewPanStartMode({
  button,
  spacePanArmed,
  target,
  targetInsideStage,
}: Readonly<{
  button: number
  spacePanArmed: boolean
  target: EventTarget | PreviewInteractionElement | null
  targetInsideStage: boolean
}>): PreviewPanStartMode | null {
  if (isPreviewViewportControlTarget(target)) return null
  if (button === 1) return 'middle'
  if (
    button === 0 &&
    spacePanArmed &&
    targetInsideStage &&
    !isPreviewInteractiveTarget(target)
  ) {
    return 'space-primary'
  }
  return null
}
