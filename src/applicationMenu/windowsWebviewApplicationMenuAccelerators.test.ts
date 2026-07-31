import assert from 'node:assert/strict'
import test from 'node:test'

import { createApplicationMenuPlatformDescriptor } from './applicationMenuRegistry.ts'
import type { ApplicationMenuItemId } from './applicationMenuTypes.ts'
import {
  createWindowsWebviewApplicationMenuAcceleratorBindings,
  installWindowsWebviewApplicationMenuAccelerators,
  resolveWindowsWebviewApplicationMenuAccelerator,
  type WindowsWebviewApplicationMenuKeyboardEvent,
} from './windowsWebviewApplicationMenuAccelerators.ts'

function event(
  overrides: Partial<WindowsWebviewApplicationMenuKeyboardEvent> = {},
): WindowsWebviewApplicationMenuKeyboardEvent {
  return {
    altKey: false,
    ctrlKey: true,
    defaultPrevented: false,
    isComposing: false,
    key: 'o',
    metaKey: false,
    repeat: false,
    shiftKey: false,
    preventDefault() {},
    ...overrides,
  }
}

test('Windows fallback bindings derive only command-owned accelerators from the descriptor', () => {
  const bindings = createWindowsWebviewApplicationMenuAcceleratorBindings(
    createApplicationMenuPlatformDescriptor('windows'),
  )
  assert.deepEqual(bindings, [
    { accelerator: 'Ctrl+N', itemId: 'menu.file.new-disc' },
    { accelerator: 'Ctrl+Shift+N', itemId: 'menu.file.new-case' },
    { accelerator: 'Ctrl+O', itemId: 'menu.file.open' },
    { accelerator: 'Ctrl+S', itemId: 'menu.file.save' },
    { accelerator: 'Ctrl+Shift+S', itemId: 'menu.file.save-as' },
    { accelerator: 'Ctrl+E', itemId: 'menu.file.export-png' },
    { accelerator: 'Ctrl+W', itemId: 'menu.file.close-window' },
    { accelerator: 'Ctrl+Q', itemId: 'menu.file.quit' },
  ])
  assert.equal(Object.isFrozen(bindings), true)
  assert.deepEqual(
    createWindowsWebviewApplicationMenuAcceleratorBindings(
      createApplicationMenuPlatformDescriptor('linux'),
    ),
    [],
  )
})

test('exact Windows chords resolve without accepting repeats, composition, or extra modifiers', () => {
  const bindings = createWindowsWebviewApplicationMenuAcceleratorBindings(
    createApplicationMenuPlatformDescriptor('windows'),
  )
  assert.equal(
    resolveWindowsWebviewApplicationMenuAccelerator(bindings, event()),
    'menu.file.open',
  )
  assert.equal(
    resolveWindowsWebviewApplicationMenuAccelerator(bindings, event({
      key: 'N', shiftKey: true,
    })),
    'menu.file.new-case',
  )
  for (const rejected of [
    event({ defaultPrevented: true }),
    event({ isComposing: true }),
    event({ repeat: true }),
    event({ altKey: true }),
    event({ ctrlKey: false }),
    event({ metaKey: true }),
    event({ shiftKey: true }),
  ]) {
    assert.equal(
      resolveWindowsWebviewApplicationMenuAccelerator(bindings, rejected),
      null,
    )
  }
})

test('installed fallback consumes only accepted enabled activations and tears down exactly once', () => {
  let listener: ((event: KeyboardEvent) => void) | null = null
  const removed: unknown[] = []
  const activated: ApplicationMenuItemId[] = []
  let modal = false
  const disconnect = installWindowsWebviewApplicationMenuAccelerators(
    createApplicationMenuPlatformDescriptor('windows'),
    (itemId) => {
      activated.push(itemId)
      return itemId === 'menu.file.open'
    },
    {
      eventTarget: {
        addEventListener(_type, nextListener) {
          listener = nextListener
        },
        removeEventListener(_type, nextListener) {
          removed.push(nextListener)
        },
      },
      isModalActive: () => modal,
    },
  )

  let prevented = 0
  const dispatch = (input: Partial<WindowsWebviewApplicationMenuKeyboardEvent>) => {
    ;(listener as ((event: KeyboardEvent) => void) | null)?.(event({
      ...input,
      preventDefault() { prevented += 1 },
    }) as KeyboardEvent)
  }
  dispatch({ key: 'o' })
  dispatch({ key: 's' })
  dispatch({ key: 'o', repeat: true })
  modal = true
  dispatch({ key: 'o' })

  assert.deepEqual(activated, ['menu.file.open', 'menu.file.save'])
  assert.equal(prevented, 1)
  disconnect()
  assert.deepEqual(removed, [listener])
})
