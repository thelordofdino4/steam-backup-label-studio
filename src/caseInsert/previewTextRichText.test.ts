import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultCaseInsertTextBlock,
  createDefaultCaseInsertTextList,
} from './defaults.ts'
import {
  applyRichTextCommandToTextBlock,
  applyRichTextCommandToTextList,
  getRichTextCommandStateForTextBlock,
} from './previewTextRichText.ts'
test('case insert rich text command promotes text block to manual HTML', () => {
  const textBlock = createDefaultCaseInsertTextBlock(
    'cover-title',
    'Cover title',
    {
      value: 'Portal 2',
    },
  )
  const result = applyRichTextCommandToTextBlock(
    textBlock,
    'bold',
    { end: 6, start: 0 },
    true,
  )

  assert.equal(result.textBlock.contentMode, 'html')
  assert.equal(result.textBlock.source, 'manual')
  assert.equal(result.textBlock.value, 'Portal 2')
  assert.match(result.textBlock.htmlSource ?? '', /<strong>Portal<\/strong>/)
})

test('case insert rich text command updates text list HTML and items', () => {
  const textList = createDefaultCaseInsertTextList(
    'tray-metadata-list',
    'Metadata',
    {
      items: ['Portal 2', 'Valve'],
    },
  )
  const result = applyRichTextCommandToTextList(
    textList,
    'bold',
    { end: 8, start: 2 },
    true,
  )

  assert.equal(result.textList.contentMode, 'html')
  assert.deepEqual(result.textList.items, ['• Portal 2', '• Valve'])
  assert.match(result.textList.htmlSource ?? '', /<strong>Portal<\/strong>/)
})

test('case insert rich text state reports selected text formatting', () => {
  const textBlock = {
    ...createDefaultCaseInsertTextBlock('cover-title', 'Cover title'),
    contentMode: 'html' as const,
    htmlSource: '<p><strong>Portal</strong> 2</p>',
    value: 'Portal 2',
  }

  assert.equal(
    getRichTextCommandStateForTextBlock(
      textBlock,
      'bold',
      { end: 6, start: 0 },
    ),
    'active',
  )
})
