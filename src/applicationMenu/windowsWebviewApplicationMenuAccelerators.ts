import type {
  ApplicationMenuAccelerator,
  ApplicationMenuItemId,
  ApplicationMenuPlatformDescriptor,
} from './applicationMenuTypes.ts'

export type WindowsWebviewApplicationMenuKeyboardEvent = Readonly<{
  altKey: boolean
  ctrlKey: boolean
  defaultPrevented: boolean
  isComposing: boolean
  key: string
  metaKey: boolean
  repeat: boolean
  shiftKey: boolean
  preventDefault(): void
}>

export type WindowsWebviewApplicationMenuEventTarget = Readonly<{
  addEventListener(
    type: 'keydown',
    listener: (event: KeyboardEvent) => void,
  ): void
  removeEventListener(
    type: 'keydown',
    listener: (event: KeyboardEvent) => void,
  ): void
}>

export type WindowsWebviewApplicationMenuAcceleratorBinding = Readonly<{
  accelerator: ApplicationMenuAccelerator
  itemId: ApplicationMenuItemId
}>

export type WindowsWebviewApplicationMenuAcceleratorInstaller = (
  descriptor: ApplicationMenuPlatformDescriptor,
  activate: (itemId: ApplicationMenuItemId) => boolean,
) => () => void

function isWebviewFallbackOwner(
  owner: ApplicationMenuPlatformDescriptor['items'][number]['eventRoutingOwner'],
) {
  return owner === 'application-command-dispatcher' ||
    owner === 'domain-command-dispatcher'
}

/**
 * The Windows fallback consumes the authoritative native-menu descriptor. It
 * deliberately excludes focused-edit and window-role accelerators, whose
 * ownership is not part of the connected File-command slice.
 */
export function createWindowsWebviewApplicationMenuAcceleratorBindings(
  descriptor: ApplicationMenuPlatformDescriptor,
): readonly WindowsWebviewApplicationMenuAcceleratorBinding[] {
  if (descriptor.platform !== 'windows') return Object.freeze([])

  const accelerators = new Set<ApplicationMenuAccelerator>()
  return Object.freeze(descriptor.items.flatMap((item) => {
    if (!item.accelerator || !isWebviewFallbackOwner(item.eventRoutingOwner)) {
      return []
    }
    if (accelerators.has(item.accelerator)) {
      throw new Error(
        `Duplicate Windows application-menu accelerator: ${item.accelerator}`,
      )
    }
    accelerators.add(item.accelerator)
    return [Object.freeze({
      accelerator: item.accelerator,
      itemId: item.itemId,
    })]
  }))
}

function acceleratorMatches(
  accelerator: ApplicationMenuAccelerator,
  event: WindowsWebviewApplicationMenuKeyboardEvent,
) {
  const tokens = accelerator.toLowerCase().split('+')
  const key = tokens.at(-1)
  return key !== undefined &&
    event.key.toLowerCase() === key &&
    event.ctrlKey === tokens.includes('ctrl') &&
    event.shiftKey === tokens.includes('shift') &&
    event.metaKey === tokens.includes('command') &&
    !event.altKey
}

export function resolveWindowsWebviewApplicationMenuAccelerator(
  bindings: readonly WindowsWebviewApplicationMenuAcceleratorBinding[],
  event: WindowsWebviewApplicationMenuKeyboardEvent,
): ApplicationMenuItemId | null {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    event.altKey
  ) {
    return null
  }
  return bindings.find(({ accelerator }) =>
    acceleratorMatches(accelerator, event))?.itemId ?? null
}

function productionModalIsActive() {
  return typeof document !== 'undefined' &&
    document.querySelector('[aria-modal="true"]') !== null
}

export function installWindowsWebviewApplicationMenuAccelerators(
  descriptor: ApplicationMenuPlatformDescriptor,
  activate: (itemId: ApplicationMenuItemId) => boolean,
  dependencies: Readonly<{
    eventTarget?: WindowsWebviewApplicationMenuEventTarget
    isModalActive?: () => boolean
  }> = {},
): () => void {
  const bindings = createWindowsWebviewApplicationMenuAcceleratorBindings(
    descriptor,
  )
  if (bindings.length === 0) return () => {}

  const eventTarget: WindowsWebviewApplicationMenuEventTarget | null =
    dependencies.eventTarget ?? (typeof window === 'undefined'
      ? null
      : {
          addEventListener(_type, listener) {
            window.addEventListener('keydown', listener)
          },
          removeEventListener(_type, listener) {
            window.removeEventListener('keydown', listener)
          },
        })
  if (eventTarget === null) return () => {}
  const isModalActive = dependencies.isModalActive ?? productionModalIsActive
  const handleKeyDown = (event: KeyboardEvent) => {
    if (isModalActive()) return
    const itemId = resolveWindowsWebviewApplicationMenuAccelerator(
      bindings,
      event,
    )
    if (itemId !== null && activate(itemId)) {
      event.preventDefault()
    }
  }

  eventTarget.addEventListener('keydown', handleKeyDown)
  return () => eventTarget.removeEventListener('keydown', handleKeyDown)
}
