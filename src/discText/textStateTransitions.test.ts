import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextLayout,
  setDiscTextHtmlEnabled,
} from './index.ts'
import {
  createDefaultDiscTextStyles,
} from './styles.ts'
import {
  applyDiscTextRichTextCommandToSource,
  createDiscTextRichTextSource,
  getDiscTextInlineStorageValue,
  getDiscTextRichTextAmbientStyle,
} from './textStateTransitions.ts'

test('disc text inline storage strips rendered metadata prefixes only for matching keys', () => {
  assert.equal(
    getDiscTextInlineStorageValue('developer', 'Developer: Valve'),
    'Valve',
  )
  assert.equal(
    getDiscTextInlineStorageValue('publisher', 'Developer: Valve'),
    'Developer: Valve',
  )
  assert.equal(
    getDiscTextInlineStorageValue('title', 'Portal 2'),
    'Portal 2',
  )
})

test('disc text rich-text source preserves ambient style and enabled HTML source', () => {
  const layout = createDefaultDiscTextLayout('top').title
  const styles = {
    ...createDefaultDiscTextStyles(),
    title: {
      ...createDefaultDiscTextStyles().title,
      bold: true,
      color: '#224466',
      fontFamily: 'georgia',
      italic: true,
      underline: true,
    },
  }
  const htmlSources = setDiscTextHtmlEnabled(
    {},
    'title',
    true,
    '<strong>Portal</strong>',
  )
  const source = createDiscTextRichTextSource({
    currentText: 'Portal',
    htmlSources,
    key: 'title',
    layout,
    styles,
  })

  assert.equal(source.htmlSource, '<p><strong>Portal</strong></p>')
  assert.deepEqual(source.ambientStyle, getDiscTextRichTextAmbientStyle(
    'title',
    styles,
    layout,
  ))
})

test('disc text rich-text command applies selected range formatting', () => {
  const result = applyDiscTextRichTextCommandToSource({
    command: 'bold',
    selection: { end: 6, start: 0 },
    source: {
      ambientStyle: getDiscTextRichTextAmbientStyle(
        'customNote',
        createDefaultDiscTextStyles(),
        createDefaultDiscTextLayout('top').customNote,
      ),
      fallbackText: 'Portal note',
    },
    value: true,
  })

  assert.equal(result?.plainText, 'Portal note')
  assert.match(result?.htmlSource ?? '', /<strong>Portal<\/strong>/)
})
