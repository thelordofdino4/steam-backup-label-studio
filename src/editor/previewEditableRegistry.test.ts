import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCaseInsertInlineTextTargetKey,
  createDiscInlineTextTargetKey,
  createDiscTextPreviewEditableElement,
  createDiscTextPreviewEditableElementFromAttributes,
  createDiscTextPreviewEditableElementId,
  createExplicitPreviewEditableElement,
  createInlinePreviewTextTargetAttributes,
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
  CURVED_DISC_TEXT_EXCEPTION,
  DISC_TEXT_KEY_ATTRIBUTE,
  INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE,
  parseDiscTextPreviewEditableElementId,
  PREVIEW_EDITABLE_DEFAULT_CAPABILITIES,
  PREVIEW_EDITABLE_ID_ATTRIBUTE,
  PREVIEW_EDITABLE_KIND_ATTRIBUTE,
  PREVIEW_EDITABLE_LABEL_ATTRIBUTE,
  PREVIEW_EDITABLE_TEXT_CAPABILITIES,
} from './previewEditableRegistry.ts'

function createAttributeReader(attributes: Record<string, string>) {
  return {
    getAttribute(name: string) {
      return attributes[name] ?? null
    },
  } as Pick<Element, 'getAttribute'>
}

test('registry preserves existing preview editable id strings', () => {
  assert.equal(
    createPreviewEditableElementId('disc', 'logo', 'developer'),
    'disc:logo:developer',
  )
  assert.equal(
    createPreviewEditableElementId('case', 'cover', 'text-block', 'title'),
    'case:cover:text-block:title',
  )
  assert.equal(
    createPreviewEditableElementId(
      'case',
      'spine',
      'left',
      'logoSlots',
      undefined,
    ),
    'case:spine:left:logoSlots',
  )
  assert.equal(
    createDiscTextPreviewEditableElementId('backupDate'),
    'disc-text:backupDate',
  )
  assert.equal(
    parseDiscTextPreviewEditableElementId('disc-text:backupDate'),
    'backupDate',
  )
  assert.equal(parseDiscTextPreviewEditableElementId('disc:backupDate'), null)
})

test('registry preserves existing inline text target keys', () => {
  assert.equal(createDiscInlineTextTargetKey('customNote'), 'disc:customNote')
  assert.equal(
    createCaseInsertInlineTextTargetKey({
      scope: 'templateTextBlock',
      paneId: 'cover',
      textBlockId: 'title',
    }),
    'templateTextBlock:cover:title',
  )
  assert.equal(
    createCaseInsertInlineTextTargetKey({
      scope: 'templateTextList',
      paneId: 'tray',
      textListId: 'features',
    }),
    'templateTextList:tray:features',
  )
  assert.equal(
    createCaseInsertInlineTextTargetKey({
      scope: 'spineTitle',
      side: 'left',
    }),
    'spineTitle:left',
  )
  assert.equal(
    createCaseInsertInlineTextTargetKey({
      scope: 'spineTextBlock',
      side: 'right',
      textBlockId: 'metadata',
    }),
    'spineTextBlock:right:metadata',
  )
})

test('registry preserves DOM attribute names and values', () => {
  const attributes = createPreviewEditableAttributes({
    id: 'case:tray:logoSlots:publisher',
    kind: 'logo',
    label: 'Publisher logo',
  })

  assert.equal(
    attributes[PREVIEW_EDITABLE_ID_ATTRIBUTE],
    'case:tray:logoSlots:publisher',
  )
  assert.equal(attributes[PREVIEW_EDITABLE_LABEL_ATTRIBUTE], 'Publisher logo')
  assert.equal(attributes[PREVIEW_EDITABLE_KIND_ATTRIBUTE], 'logo')
  assert.deepEqual(
    createInlinePreviewTextTargetAttributes('spineTitle:right'),
    {
      [INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE]: 'spineTitle:right',
    },
  )
})

test('registry creates overlay elements from explicit and disc SVG attributes', () => {
  assert.deepEqual(
    createExplicitPreviewEditableElement(createAttributeReader({
      [PREVIEW_EDITABLE_ID_ATTRIBUTE]: 'disc:rating-badge:primary',
      [PREVIEW_EDITABLE_KIND_ATTRIBUTE]: 'mark',
      [PREVIEW_EDITABLE_LABEL_ATTRIBUTE]: 'Rating badge layer',
    })),
    {
      capabilities: PREVIEW_EDITABLE_DEFAULT_CAPABILITIES,
      id: 'disc:rating-badge:primary',
      kind: 'mark',
      label: 'Rating badge layer',
      surface: 'disc',
    },
  )

  assert.deepEqual(
    createDiscTextPreviewEditableElementFromAttributes(createAttributeReader({
      [DISC_TEXT_KEY_ATTRIBUTE]: 'backupDate',
    })),
    createDiscTextPreviewEditableElement('backupDate'),
  )
  assert.equal(
    createDiscTextPreviewEditableElementFromAttributes(createAttributeReader({})),
    null,
  )
})

test('registry documents inline eligibility defaults and curved text exception', () => {
  assert.deepEqual(PREVIEW_EDITABLE_DEFAULT_CAPABILITIES, {
    inlineTextEditable: false,
    movable: true,
    resizable: false,
    selectable: true,
  })
  assert.deepEqual(PREVIEW_EDITABLE_TEXT_CAPABILITIES, {
    inlineTextEditable: true,
    movable: true,
    resizable: false,
    selectable: true,
  })
  assert.equal(CURVED_DISC_TEXT_EXCEPTION.renderer, 'svgTextPath')
  assert.match(CURVED_DISC_TEXT_EXCEPTION.reason, /SVG\/textPath/)
})
