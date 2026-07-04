import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodeHtmlEntities,
  escapeHtmlAttribute,
  escapeHtmlText,
} from './htmlEntities.ts'

test('HTML entity helpers escape text and attributes for canonical rich text', () => {
  assert.equal(
    escapeHtmlText('Alpha & <Beta> "Gamma"'),
    'Alpha &amp; &lt;Beta&gt; "Gamma"',
  )
  assert.equal(
    escapeHtmlAttribute('font-family:"Steam & Serif"'),
    'font-family:&quot;Steam &amp; Serif&quot;',
  )
})

test('HTML entity helpers decode named and numeric entities', () => {
  assert.equal(
    decodeHtmlEntities('&amp;&lt;&gt;&quot;&apos;&nbsp;&#169;&#x1f600;'),
    '&<>"\' ©😀',
  )
})

test('HTML entity helpers drop invalid numeric entities like the parser did before extraction', () => {
  assert.equal(decodeHtmlEntities('bad: &#x110000; &#9999999999;'), 'bad:  ')
})
