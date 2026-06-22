import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDiscTextPreviewEditableElementId,
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
  findPreviewEditableElementsById,
  getPreviewElementOverlayRect,
  getPreviewElementOverlayUnionRect,
  DISC_TEXT_KEY_ATTRIBUTE,
  PREVIEW_EDITABLE_ID_ATTRIBUTE,
  PREVIEW_EDITABLE_KIND_ATTRIBUTE,
  PREVIEW_EDITABLE_LABEL_ATTRIBUTE,
} from './previewElementOverlay.ts'

function fakeElement(attributes: Record<string, string>) {
  return {
    getAttribute(name: string) {
      return attributes[name] ?? null
    },
  } as Element
}

test('preview editable attributes expose stable id label and kind', () => {
  const attributes = createPreviewEditableAttributes({
    id: createPreviewEditableElementId('disc', 'logo', 'developer'),
    label: 'Developer logo',
    kind: 'logo',
  })

  assert.equal(
    attributes[PREVIEW_EDITABLE_ID_ATTRIBUTE],
    'disc:logo:developer',
  )
  assert.equal(attributes[PREVIEW_EDITABLE_LABEL_ATTRIBUTE], 'Developer logo')
  assert.equal(attributes[PREVIEW_EDITABLE_KIND_ATTRIBUTE], 'logo')
})

test('preview editable ids skip absent optional parts', () => {
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
})

test('overlay rects are relative to the preview root', () => {
  assert.deepEqual(
    getPreviewElementOverlayRect(
      { left: 100, top: 40, right: 500, bottom: 440, width: 400, height: 400 },
      { left: 150, top: 90, right: 250, bottom: 190, width: 100, height: 100 },
    ),
    { left: 50, top: 50, width: 100, height: 100 },
  )
})

test('overlay rects compensate for transformed preview viewport scale', () => {
  assert.deepEqual(
    getPreviewElementOverlayRect(
      { left: 100, top: 40, right: 900, bottom: 840, width: 800, height: 800 },
      { left: 200, top: 140, right: 400, bottom: 340, width: 200, height: 200 },
      { width: 400, height: 400 },
    ),
    { left: 50, top: 50, width: 100, height: 100 },
  )
})

test('overlay union rect covers multiline or multi-node elements', () => {
  assert.deepEqual(
    getPreviewElementOverlayUnionRect(
      { left: 10, top: 20, right: 410, bottom: 420, width: 400, height: 400 },
      [
        { left: 100, top: 120, right: 180, bottom: 140, width: 80, height: 20 },
        { left: 90, top: 150, right: 210, bottom: 170, width: 120, height: 20 },
      ],
    ),
    { left: 80, top: 100, width: 120, height: 50 },
  )
})

test('overlay lookup returns every node with the same preview editable id', () => {
  const first = fakeElement({
    [PREVIEW_EDITABLE_ID_ATTRIBUTE]: 'case:cover:text-block:title',
  })
  const second = fakeElement({
    [PREVIEW_EDITABLE_ID_ATTRIBUTE]: 'case:cover:text-block:title',
  })
  const other = fakeElement({
    [PREVIEW_EDITABLE_ID_ATTRIBUTE]: 'case:cover:text-block:subtitle',
  })
  const root = {
    querySelectorAll(selector: string) {
      return selector === `[${PREVIEW_EDITABLE_ID_ATTRIBUTE}]`
        ? [first, second, other]
        : []
    },
  } as unknown as ParentNode

  assert.deepEqual(
    findPreviewEditableElementsById(root, 'case:cover:text-block:title'),
    [first, second],
  )
})

test('overlay lookup keeps the legacy disc text SVG fallback', () => {
  const backupDate = fakeElement({
    [DISC_TEXT_KEY_ATTRIBUTE]: 'backupDate',
  })
  const copyright = fakeElement({
    [DISC_TEXT_KEY_ATTRIBUTE]: 'copyright',
  })
  const root = {
    querySelectorAll(selector: string) {
      if (selector === `[${PREVIEW_EDITABLE_ID_ATTRIBUTE}]`) {
        return []
      }

      return selector === `[${DISC_TEXT_KEY_ATTRIBUTE}]`
        ? [backupDate, copyright]
        : []
    },
  } as unknown as ParentNode

  assert.deepEqual(
    findPreviewEditableElementsById(root, 'disc-text:backupDate'),
    [backupDate],
  )
})
