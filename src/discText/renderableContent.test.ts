import assert from 'node:assert/strict'
import test from 'node:test'

import { parseHtmlText, type RichTextRun } from '../text/htmlText.ts'
import {
  areDiscTextRenderableContentsMeasurementEquivalent,
  type DiscTextRenderableContent,
} from './renderableContent.ts'

function plainContent(plainText: string): DiscTextRenderableContent {
  return { plainText }
}

function richContent(source: string): DiscTextRenderableContent {
  const richText = parseHtmlText(source)

  return {
    plainText: richText.plainText,
    richText,
  }
}

function contentWithRuns(
  runs: RichTextRun[],
): DiscTextRenderableContent {
  const plainText = runs.map((run) => run.text).join('')

  return {
    plainText,
    richText: {
      lines: [{ runs, text: plainText }],
      plainText,
      source: '',
    },
  }
}

test('visual-only rich styles and segmentation are measurement-equivalent', () => {
  const plain = plainContent('Alpha Beta')
  const visuallySegmented = richContent(
    '<p><span style="color:#ff0000">Alpha</span>' +
      '<u> </u><span style="background-color:#00ff00;' +
      'text-decoration:underline">Beta</span></p>',
  )
  const differentlyDecorated = richContent(
    '<p><span style="color:#0000ff;background-color:#ffffff">' +
      'Alpha Beta</span></p>',
  )

  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      plain,
      visuallySegmented,
    ),
    true,
  )
  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      visuallySegmented,
      differentlyDecorated,
    ),
    true,
  )
})

test('equivalence resolves effective bold, italic, and size precedence', () => {
  const explicitAliases = contentWithRuns([{
    bold: true,
    fontSizePt: 12,
    fontSizePx: 20,
    italic: true,
    text: 'Styled',
  }])
  const effectiveFields = contentWithRuns([{
    fontSizePx: 20,
    fontStyle: 'italic',
    fontWeight: 700,
    text: 'Styled',
  }])

  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      explicitAliases,
      effectiveFields,
    ),
    true,
  )

  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      contentWithRuns([{ bold: true, fontWeight: 400, text: 'Weight' }]),
      contentWithRuns([{ fontWeight: 700, text: 'Weight' }]),
    ),
    true,
  )
  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      contentWithRuns([{ bold: true, fontWeight: 400, text: 'Weight' }]),
      contentWithRuns([{ fontWeight: 400, text: 'Weight' }]),
    ),
    false,
  )
  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      contentWithRuns([{ fontStyle: 'normal', italic: true, text: 'Style' }]),
      contentWithRuns([{ fontStyle: 'italic', text: 'Style' }]),
    ),
    true,
  )
  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      contentWithRuns([{ fontStyle: 'normal', italic: true, text: 'Style' }]),
      contentWithRuns([{ fontStyle: 'normal', text: 'Style' }]),
    ),
    false,
  )
  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      contentWithRuns([{ fontSizePt: 12, fontSizePx: 20, text: 'Size' }]),
      contentWithRuns([{ fontSizePx: 20, text: 'Size' }]),
    ),
    true,
  )
  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      contentWithRuns([{ fontSizePt: 12, text: 'Size' }]),
      contentWithRuns([{ fontSizePx: 12, text: 'Size' }]),
    ),
    false,
  )
  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(
      richContent('<p><b>Bold</b></p>'),
      richContent('<p><span style="font-weight:700">Bold</span></p>'),
    ),
    true,
  )
})

test('nested conflicting rich styles follow SVG paint precedence', () => {
  const nested = richContent(
    '<p><strong><em><span style="font-weight:400;font-style:normal;' +
      'font-size:12pt"><span style="font-size:20px">Styled</span>' +
      '</span></em></strong></p>',
  )
  const painted = contentWithRuns([{
    fontSizePx: 20,
    fontStyle: 'italic',
    fontWeight: 700,
    text: 'Styled',
  }])

  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(nested, painted),
    true,
  )
})

test('measurement-relevant text and run-font changes are not equivalent', () => {
  const baseline = richContent('<p>Alpha Beta</p>')
  const changes = [
    richContent('<p>Alpha Gamma</p>'),
    richContent('<p>Alpha</p><p>Beta</p>'),
    richContent('<p><span style="font-family:Georgia">Alpha Beta</span></p>'),
    richContent('<p><strong>Alpha Beta</strong></p>'),
    richContent('<p><em>Alpha Beta</em></p>'),
    richContent('<p><span style="font-size:12pt">Alpha Beta</span></p>'),
    richContent('<p><span style="font-size:16px">Alpha Beta</span></p>'),
  ]

  for (const changed of changes) {
    assert.equal(
      areDiscTextRenderableContentsMeasurementEquivalent(baseline, changed),
      false,
    )
  }
})

test('paint-only run boundaries at wrapping-token boundaries stay equivalent', () => {
  const splitRuns = contentWithRuns([
    { fontFamily: 'Georgia', text: 'Alpha' },
    {
      color: '#ff0000',
      fontFamily: 'Georgia',
      text: ' ',
      underline: true,
    },
    { backgroundColor: '#ffffff', fontFamily: 'Georgia', text: 'Beta' },
  ])
  const combinedRun = contentWithRuns([{
    fontFamily: 'Georgia',
    text: 'Alpha Beta',
  }])

  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(splitRuns, combinedRun),
    true,
  )
})

test('paint-only run boundaries inside a word are measurement-relevant', () => {
  const splitWord = contentWithRuns([
    { text: 'Al' },
    { color: '#ff0000', text: 'pha' },
    { backgroundColor: '#ffffff', text: 'bet' },
  ])
  const combinedWord = contentWithRuns([{ text: 'Alphabet' }])

  assert.equal(
    areDiscTextRenderableContentsMeasurementEquivalent(splitWord, combinedWord),
    false,
  )
})
