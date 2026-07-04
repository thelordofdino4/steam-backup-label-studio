import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSafeStyleDeclarations,
  parseSafeInlineStyle,
} from './htmlInlineStyles.ts'

test('HTML inline style parser keeps only supported safe declarations', () => {
  assert.deepEqual(
    parseSafeInlineStyle([
      'color: Blue',
      'background-color: rgba(10, 20, 30, 0.5)',
      'font-family: "Steam Serif", Bad/Family',
      'font-size: 999px',
      'font-weight: 650',
      'font-style: italic',
      'text-decoration: underline',
      'background-image: url(https://example.test/bad.png)',
      'width: 12px',
    ].join('; ')),
    {
      backgroundColor: 'rgba(10, 20, 30, 0.5)',
      bold: true,
      color: 'blue',
      fontFamily: 'Steam Serif',
      fontSizePx: 144,
      fontStyle: 'italic',
      fontWeight: 700,
      italic: true,
      textDecoration: 'underline',
      underline: true,
    },
  )
})

test('HTML inline style parser preserves safe point sizes and normal styles', () => {
  assert.deepEqual(
    parseSafeInlineStyle(
      'font-size:24pt; font-weight: normal; font-style: normal; text-decoration: none',
    ),
    {
      fontSizePt: 24,
      fontStyle: 'normal',
      fontWeight: 400,
      textDecoration: 'none',
    },
  )
})

test('HTML inline style serializer omits declarations already expressed by semantic tags', () => {
  assert.deepEqual(
    getSafeStyleDeclarations({
      bold: true,
      color: '#ff0000',
      fontSizePt: 18,
      fontStyle: 'italic',
      fontWeight: 700,
      italic: true,
      textDecoration: 'underline',
      underline: true,
    }),
    ['color:#ff0000', 'font-size:18pt'],
  )
})
