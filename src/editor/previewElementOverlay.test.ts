import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDiscTextPreviewEditableElementId,
  createPreviewEditableAttributes,
  createPreviewEditableElementId,
  getPreviewElementOverlayRect,
  getPreviewElementOverlayUnionRect,
  PREVIEW_EDITABLE_ID_ATTRIBUTE,
  PREVIEW_EDITABLE_KIND_ATTRIBUTE,
  PREVIEW_EDITABLE_LABEL_ATTRIBUTE,
} from './previewElementOverlay.ts'

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
