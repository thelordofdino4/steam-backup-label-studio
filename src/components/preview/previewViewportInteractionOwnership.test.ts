import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPreviewPanStartMode,
  isPreviewInteractiveTarget,
  shouldArmPreviewSpacePan,
  type PreviewInteractionElement,
} from './previewViewportInteractionOwnership.ts'

type ElementInit = Readonly<{
  attributes?: Readonly<Record<string, string>>
  isContentEditable?: boolean
  parent?: PreviewInteractionElement | null
  tagName?: string
}>

function element({
  attributes = {},
  isContentEditable,
  parent = null,
  tagName = 'div',
}: ElementInit = {}): PreviewInteractionElement {
  const normalized = new Map(
    Object.entries(attributes).map(([name, value]) => [
      name.toLowerCase(),
      value,
    ]),
  )
  return {
    tagName,
    parentElement: parent,
    getAttribute(name) {
      return normalized.get(name.toLowerCase()) ?? null
    },
    hasAttribute(name) {
      return normalized.has(name.toLowerCase())
    },
    isContentEditable,
  }
}

test('native controls, links, summary, roles, and viewport rail descendants own Space', () => {
  for (const target of [
    element({ tagName: 'button' }),
    element({ tagName: 'a', attributes: { href: '/help' } }),
    element({ tagName: 'summary' }),
    element({ tagName: 'input' }),
    element({ tagName: 'textarea' }),
    element({ tagName: 'select' }),
    element({ attributes: { role: 'tab' } }),
    element({ attributes: { role: 'menu' } }),
    element({ attributes: { role: 'menuitem' } }),
    element({ attributes: { role: 'switch' } }),
    element({ attributes: { role: 'slider' } }),
    element({ attributes: { role: 'dialog', tabindex: '-1' } }),
    element({ attributes: { tabindex: '0' } }),
  ]) {
    assert.equal(isPreviewInteractiveTarget(target), true)
  }

  const rail = element({
    attributes: { 'data-preview-viewport-controls': 'true' },
  })
  assert.equal(isPreviewInteractiveTarget(element({ parent: rail })), true)
  assert.equal(
    isPreviewInteractiveTarget(element({
      parent: element({ tagName: 'button' }),
      tagName: 'span',
    })),
    true,
  )
})

test('effective contenteditable ownership handles direct, inherited, and false boundaries', () => {
  const editable = element({ attributes: { contenteditable: 'true' } })
  const inherited = element({ parent: editable })
  const plaintext = element({ attributes: { contenteditable: 'plaintext-only' } })
  const blocked = element({
    attributes: { contenteditable: 'false' },
    parent: editable,
  })

  assert.equal(isPreviewInteractiveTarget(editable), true)
  assert.equal(isPreviewInteractiveTarget(inherited), true)
  assert.equal(isPreviewInteractiveTarget(plaintext), true)
  assert.equal(isPreviewInteractiveTarget(blocked), false)
  assert.equal(
    isPreviewInteractiveTarget(element({ isContentEditable: true })),
    true,
  )
})

test('Space arms only once for a preview-owned noninteractive context', () => {
  const stageTarget = element()
  const base = {
    code: 'Space',
    defaultPrevented: false,
    repeat: false,
    target: stageTarget,
    targetInsideStage: true,
    pointerInsideStage: true,
  }
  assert.equal(shouldArmPreviewSpacePan(base), true)
  assert.equal(shouldArmPreviewSpacePan({ ...base, repeat: true }), false)
  assert.equal(
    shouldArmPreviewSpacePan({ ...base, defaultPrevented: true }),
    false,
  )
  assert.equal(
    shouldArmPreviewSpacePan({ ...base, target: element({ tagName: 'button' }) }),
    false,
  )
  assert.equal(
    shouldArmPreviewSpacePan({
      ...base,
      targetInsideStage: false,
      pointerInsideStage: false,
    }),
    false,
  )
  assert.equal(
    shouldArmPreviewSpacePan({
      ...base,
      targetInsideStage: false,
      pointerInsideStage: true,
    }),
    true,
  )
})

test('pointer origin is rechecked for Space pan while middle mouse remains available', () => {
  const stage = element()
  assert.equal(getPreviewPanStartMode({
    button: 0,
    spacePanArmed: true,
    target: stage,
    targetInsideStage: true,
  }), 'space-primary')
  assert.equal(getPreviewPanStartMode({
    button: 0,
    spacePanArmed: true,
    target: element({ tagName: 'button' }),
    targetInsideStage: true,
  }), null)
  assert.equal(getPreviewPanStartMode({
    button: 0,
    spacePanArmed: true,
    target: stage,
    targetInsideStage: false,
  }), null)
  assert.equal(getPreviewPanStartMode({
    button: 1,
    spacePanArmed: false,
    target: element({ tagName: 'button' }),
    targetInsideStage: true,
  }), 'middle')

  const rail = element({
    attributes: { 'data-preview-viewport-controls': 'true' },
  })
  assert.equal(getPreviewPanStartMode({
    button: 1,
    spacePanArmed: false,
    target: element({ parent: rail }),
    targetInsideStage: false,
  }), null)
})
