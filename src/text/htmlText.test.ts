import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getRenderablePlainText,
  isHtmlTextEnabled,
  markdownToHtmlSource,
  parseHtmlText,
  sanitizeHtmlSource,
} from './htmlText.ts'

test('HTML sanitizer removes executable and external content while preserving safe text', () => {
  const source = [
    '<p onclick="steal()">Hello ',
    '<span id="x" class="bad" style="color:#ff0000; font-size:999px; width:12px; background-image:url(https://evil.test/x.png)">red</span>',
    '<script>alert(1)</script>',
    '<a href="https://evil.test"> link</a>',
    '<img src="https://evil.test/x.png">',
    '</p>',
  ].join('')
  const document = parseHtmlText(source)

  assert.equal(document.plainText, 'Hello red link')
  assert.match(
    document.source,
    /^<p>Hello <span style="color:#ff0000; font-size:144px">red<\/span> link<\/p>$/,
  )
  assert.doesNotMatch(document.source, /script|onclick|href|img|url\(|class=|id=/i)
})

test('HTML parser canonicalizes supported tags and inline styles', () => {
  const document = parseHtmlText(
    '<p><b>Bold</b> <i>Italic</i> <span style="color:Blue; font-weight:bold; font-style:italic; text-decoration:underline">Styled</span></p>',
  )

  assert.equal(document.plainText, 'Bold Italic Styled')
  assert.match(document.source, /<strong>Bold<\/strong>/)
  assert.match(document.source, /<em>Italic<\/em>/)
  assert.match(document.source, /color:blue/)
  assert.match(document.source, /<strong><em><u><span style="color:blue">Styled<\/span><\/u><\/em><\/strong>/)
  assert.deepEqual(
    document.lines[0]?.runs.map((run) => ({
      text: run.text,
      bold: Boolean(run.bold),
      italic: Boolean(run.italic),
      underline: Boolean(run.underline),
      color: run.color,
    })),
    [
      {
        text: 'Bold',
        bold: true,
        italic: false,
        underline: false,
        color: undefined,
      },
      {
        text: ' ',
        bold: false,
        italic: false,
        underline: false,
        color: undefined,
      },
      {
        text: 'Italic',
        bold: false,
        italic: true,
        underline: false,
        color: undefined,
      },
      {
        text: ' ',
        bold: false,
        italic: false,
        underline: false,
        color: undefined,
      },
      {
        text: 'Styled',
        bold: true,
        italic: true,
        underline: true,
        color: 'blue',
      },
    ],
  )
})

test('HTML parser canonicalizes safe point font sizes and keeps legacy px readable', () => {
  const pointDocument = parseHtmlText(
    '<p><span style="font-size:24pt">Large</span></p>',
  )
  const legacyPxDocument = parseHtmlText(
    '<p><span style="font-size:18px">Legacy</span></p>',
  )

  assert.equal(pointDocument.source, '<p><span style="font-size:24pt">Large</span></p>')
  assert.equal(pointDocument.lines[0]?.runs[0]?.fontSizePt, 24)
  assert.equal(legacyPxDocument.source, '<p><span style="font-size:18px">Legacy</span></p>')
  assert.equal(legacyPxDocument.lines[0]?.runs[0]?.fontSizePx, 18)
})

test('HTML parser supports lists and line breaks', () => {
  const document = parseHtmlText(
    '<p>Intro<br>Next</p><ul><li><strong>Co-op</strong></li><li>Workshop</li></ul>',
  )

  assert.equal(document.plainText, 'Intro\nNext\n• Co-op\n• Workshop')
  assert.deepEqual(
    document.lines.map((line) => ({
      text: line.text,
      listType: line.list?.type,
    })),
    [
      { text: 'Intro', listType: undefined },
      { text: 'Next', listType: undefined },
      { text: '• Co-op', listType: 'ul' },
      { text: '• Workshop', listType: 'ul' },
    ],
  )
  assert.equal(
    sanitizeHtmlSource(document.source),
    '<p>Intro</p><p>Next</p><ul><li><strong>Co-op</strong></li><li>Workshop</li></ul>',
  )
})

test('HTML parser ignores source-formatting whitespace outside supported tags', () => {
  const document = parseHtmlText(
    '<p>Untitled Steam Backup Label</p>\n\n<p>Manual subtitle</p>\n\n',
  )

  assert.equal(document.plainText, 'Untitled Steam Backup Label\nManual subtitle')
  assert.equal(
    document.source,
    '<p>Untitled Steam Backup Label</p><p>Manual subtitle</p>',
  )
})

test('HTML parser preserves visible whitespace inside supported tags', () => {
  const document = parseHtmlText(
    '<p>Alpha <strong>Beta</strong> Gamma</p>',
  )

  assert.equal(document.plainText, 'Alpha Beta Gamma')
  assert.deepEqual(
    document.lines[0]?.runs.map((run) => run.text),
    ['Alpha ', 'Beta', ' Gamma'],
  )
})

test('HTML parser preserves soft line breaks inside list items', () => {
  const document = parseHtmlText(
    '<ul><li>Alpha<br><strong>Beta</strong></li></ul>',
  )

  assert.equal(document.plainText, '• Alpha\nBeta')
  assert.equal(
    document.source,
    '<ul><li>Alpha<br><strong>Beta</strong></li></ul>',
  )
  assert.deepEqual(
    document.lines.map((line) => ({
      continuation: Boolean(line.list?.continuation),
      prefix: line.list?.prefix,
      text: line.text,
    })),
    [
      { continuation: false, prefix: '• ', text: '• Alpha' },
      { continuation: true, prefix: '', text: 'Beta' },
    ],
  )
})

test('legacy Markdown source migrates to canonical HTML without losing supported formatting', () => {
  const htmlSource = markdownToHtmlSource(
    'Intro **bold** and *italic*\n- **Co-op** puzzles\n- *Workshop* support',
  )
  const document = parseHtmlText(htmlSource)

  assert.equal(
    htmlSource,
    '<p>Intro <strong>bold</strong> and <em>italic</em></p><ul><li><strong>Co-op</strong> puzzles</li><li><em>Workshop</em> support</li></ul>',
  )
  assert.equal(
    document.plainText,
    'Intro bold and italic\n• Co-op puzzles\n• Workshop support',
  )
})

test('legacy Markdown migration preserves unsupported syntax as visible text', () => {
  const htmlSource = markdownToHtmlSource('__literal__ [link](https://example.test)')
  const document = parseHtmlText(htmlSource)

  assert.equal(document.plainText, '__literal__ [link](https://example.test)')
  assert.equal(
    htmlSource,
    '<p>__literal__ [link](https://example.test)</p>',
  )
})

test('HTML helpers leave plain text objects unchanged and read legacy Markdown fields', () => {
  assert.equal(
    getRenderablePlainText(
      { contentMode: 'plain', htmlSource: '<p>ignored</p>' },
      'visible text',
    ),
    'visible text',
  )
  assert.equal(
    getRenderablePlainText(
      { contentMode: 'markdown', markdownSource: 'A **bold** title' },
      'fallback',
    ),
    'A bold title',
  )
  assert.equal(isHtmlTextEnabled({ contentMode: 'html' }), true)
  assert.equal(isHtmlTextEnabled({ contentMode: 'markdown' }), true)
  assert.equal(isHtmlTextEnabled({ contentMode: 'plain' }), false)
})
