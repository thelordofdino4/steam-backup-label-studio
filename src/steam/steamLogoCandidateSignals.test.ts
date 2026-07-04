import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compactForMatch,
  decodeHtml,
  getNumericDimension,
  getTagAttributes,
  getUrlSignalText,
  hasEntityMatch,
  includesStandaloneTerm,
  normalizeForMatch,
  stripTags,
  uniqueStrings,
} from './steamLogoCandidateSignals.ts'

test('Steam logo signal helpers decode HTML text and attributes', () => {
  assert.equal(
    decodeHtml('Valve &amp; Gearbox &quot;Logo&quot; &#39;A&#39; &lt;mark&gt;'),
    'Valve & Gearbox "Logo" \'A\' <mark>',
  )
  assert.equal(
    stripTags('<a title="Valve &amp; Gearbox"><span>Official</span> Logo</a>'),
    'Official Logo',
  )
  assert.deepEqual(
    getTagAttributes('<img DATA-SRC="/logo.png" alt="Valve &amp; Gearbox" width=128>'),
    {
      alt: 'Valve & Gearbox',
      'data-src': '/logo.png',
      width: '128',
    },
  )
})

test('Steam logo signal helpers normalize company and URL matching text', () => {
  assert.equal(normalizeForMatch('Valve & Gearbox: Logo!'), 'valve and gearbox logo')
  assert.equal(compactForMatch('Valve & Gearbox'), 'valveandgearbox')
  assert.equal(includesStandaloneTerm('official valve logo', 'valve'), true)
  assert.equal(includesStandaloneTerm('steampowered valve-logo', 'power'), false)
  assert.equal(
    hasEntityMatch('official valve and gearbox wordmark', ['Valve & Gearbox']),
    true,
  )
  assert.equal(
    hasEntityMatch('official valve wordmark', ['Valve & Gearbox']),
    false,
  )
})

test('Steam logo signal helpers preserve stable numeric and URL signals', () => {
  assert.equal(getNumericDimension('256px'), 256)
  assert.equal(getNumericDimension('0'), undefined)
  assert.equal(getNumericDimension('not-a-size'), undefined)
  assert.equal(
    getUrlSignalText('https://example.test/assets/Valve%20Logo.png?size=large'),
    '/assets/Valve Logo.png ?size=large',
  )
  assert.deepEqual(uniqueStrings([' Valve ', '', 'Gearbox', 'Valve']), [
    'Valve',
    'Gearbox',
  ])
})
