import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getImageCandidatePickerTabTarget,
  restoreImageCandidatePickerFocus,
} from './imageCandidatePickerFocus.ts'

type FakeTarget = HTMLElement & {
  focused: number
  focusables: FakeTarget[]
}

function target({
  connected = true,
  disabled = false,
  hidden = false,
  tabIndex = 0,
}: Readonly<{
  connected?: boolean
  disabled?: boolean
  hidden?: boolean
  tabIndex?: number
}> = {}) {
  const attributes = new Map<string, string>()
  const value = {
    disabled,
    focused: 0,
    focusables: [] as FakeTarget[],
    getAttribute(name: string) {
      return attributes.get(name) ?? null
    },
    getClientRects() {
      return hidden ? [] : [{}]
    },
    hasAttribute(name: string) {
      return attributes.has(name)
    },
    hidden,
    isConnected: connected,
    ownerDocument: undefined,
    parentElement: null,
    querySelectorAll() {
      return this.focusables
    },
    focus() {
      this.focused += 1
    },
    removeAttribute(name: string) {
      attributes.delete(name)
    },
    setAttribute(name: string, attributeValue: string) {
      attributes.set(name, attributeValue)
    },
    tabIndex,
  }
  return value as unknown as FakeTarget
}

test('Tab and Shift+Tab wrap over the current usable target set', () => {
  const first = target()
  const middle = target({ disabled: true })
  const last = target()
  const container = target({ tabIndex: -1 })
  container.focusables = [first, middle, last]

  assert.equal(getImageCandidatePickerTabTarget(container, first, true), last)
  assert.equal(getImageCandidatePickerTabTarget(container, last, false), first)
  assert.equal(getImageCandidatePickerTabTarget(container, middle, false), first)

  Object.defineProperty(first, 'isConnected', { value: false })
  Object.defineProperty(last, 'isConnected', { value: false })
  assert.equal(
    getImageCandidatePickerTabTarget(container, middle, false),
    container,
  )
})

test('focus restoration prefers a valid opener', () => {
  const opener = target()
  const ancestor = target({ tabIndex: -1 })
  opener.parentElement = ancestor

  assert.equal(restoreImageCandidatePickerFocus([opener, ancestor]), opener)
  assert.equal(opener.focused, 1)
  assert.equal(ancestor.focused, 0)
})

test('disabled or disconnected opener restores to a surviving target', () => {
  const disabledOpener = target({ disabled: true })
  const sibling = target()
  const ancestor = target({ tabIndex: -1 })
  ancestor.focusables = [disabledOpener, sibling]

  assert.equal(
    restoreImageCandidatePickerFocus([disabledOpener, ancestor]),
    sibling,
  )
  assert.equal(sibling.focused, 1)

  const disconnectedOpener = target({ connected: false })
  const fallback = target({ tabIndex: -1 })
  assert.equal(
    restoreImageCandidatePickerFocus([disconnectedOpener, fallback]),
    fallback,
  )
  assert.equal(fallback.focused, 1)
})

test('a missing surviving fallback is a safe no-op', () => {
  assert.equal(restoreImageCandidatePickerFocus([]), null)
  assert.equal(
    restoreImageCandidatePickerFocus([
      target({ connected: false }),
      target({ connected: false }),
    ]),
    null,
  )
})
