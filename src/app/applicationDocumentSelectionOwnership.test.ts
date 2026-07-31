import assert from 'node:assert/strict'
import test from 'node:test'

import {
  installApplicationDocumentSelectionOwnership,
  isApplicationTextEntryTarget,
  shouldPreventApplicationDocumentSelectAll,
  type ApplicationSelectAllEvent,
} from './applicationDocumentSelectionOwnership.ts'

type FakeTarget = Readonly<{
  tagName?: string
  type?: string
  isContentEditable?: boolean
  parentElement?: FakeTarget | null
  attributes?: Readonly<Record<string, string>>
}>

function asEventTarget(target: FakeTarget): EventTarget {
  return {
    ...target,
    parentElement: target.parentElement
      ? asEventTarget(target.parentElement)
      : null,
    getAttribute(name: string) {
      return target.attributes?.[name] ?? null
    },
  } as unknown as EventTarget
}

function event(
  target: FakeTarget | null,
  overrides: Partial<ApplicationSelectAllEvent> = {},
): ApplicationSelectAllEvent {
  return {
    altKey: false,
    ctrlKey: true,
    defaultPrevented: false,
    key: 'a',
    metaKey: false,
    shiftKey: false,
    target: target === null ? null : asEventTarget(target),
    preventDefault() {},
    ...overrides,
  }
}

test('application document selection is suppressed outside text-entry owners', () => {
  assert.equal(shouldPreventApplicationDocumentSelectAll(event({
    tagName: 'button',
  })), true)
  assert.equal(shouldPreventApplicationDocumentSelectAll(event({
    tagName: 'main',
  }, { ctrlKey: false, metaKey: true })), true)
  assert.equal(shouldPreventApplicationDocumentSelectAll(event(null)), true)
})

test('native text inputs, textareas, and contenteditable owners retain Select All', () => {
  for (const target of [
    { tagName: 'input', type: 'text' },
    { tagName: 'input', type: 'number' },
    { tagName: 'textarea' },
    { tagName: 'div', isContentEditable: true },
    { tagName: 'span', attributes: { contenteditable: 'plaintext-only' } },
    {
      tagName: 'span',
      parentElement: { tagName: 'div', attributes: { contenteditable: 'true' } },
    },
  ] satisfies readonly FakeTarget[]) {
    assert.equal(isApplicationTextEntryTarget(event(target).target), true)
    assert.equal(shouldPreventApplicationDocumentSelectAll(event(target)), false)
  }
})

test('non-text controls and modified chords do not become text-entry owners', () => {
  for (const type of ['button', 'checkbox', 'file', 'radio', 'range']) {
    assert.equal(isApplicationTextEntryTarget(event({
      tagName: 'input', type,
    }).target), false)
  }
  assert.equal(shouldPreventApplicationDocumentSelectAll(event({
    tagName: 'main',
  }, { altKey: true })), false)
  assert.equal(shouldPreventApplicationDocumentSelectAll(event({
    tagName: 'main',
  }, { shiftKey: true })), false)
  assert.equal(shouldPreventApplicationDocumentSelectAll(event({
    tagName: 'main',
  }, { key: 'e' })), false)
  assert.equal(shouldPreventApplicationDocumentSelectAll(event({
    tagName: 'main',
  }, { defaultPrevented: true })), false)
})

test('document ownership installs one capture listener and removes that exact listener', () => {
  const added: unknown[][] = []
  const removed: unknown[][] = []
  const documentTarget = {
    addEventListener(...args: unknown[]) {
      added.push(args)
    },
    removeEventListener(...args: unknown[]) {
      removed.push(args)
    },
  } as unknown as Pick<Document, 'addEventListener' | 'removeEventListener'>

  const disconnect = installApplicationDocumentSelectionOwnership(documentTarget)
  assert.equal(added.length, 1)
  assert.equal(added[0][0], 'keydown')
  assert.equal(added[0][2], true)
  disconnect()
  assert.deepEqual(removed, [added[0]])
})
