import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCustomDiscTemplate, normalizeCustomDiscTemplate } from '../disc/geometry.ts'
import {
  createDiscGeometryRawDraft,
  DISC_GEOMETRY_FIELDS,
  validateDiscGeometryDraft,
  type DiscGeometryRawDraft,
} from './discGeometryDraft.ts'
import { discTemplates } from './discTemplates.ts'

const source = discTemplates.standardPrintableDisc
const draft = createDiscGeometryRawDraft(source)

for (const field of DISC_GEOMETRY_FIELDS) {
  test(`${field}: partial input remains exact and cannot create a candidate`, () => {
    for (const raw of ['', ' ', '-', '+', '.', '-.', '120.', '1e', '1e-', ' 12. ']) {
      const input = Object.freeze({ ...draft, [field]: raw })
      const result = validateDiscGeometryDraft(input)
      assert.equal(result.status, 'incomplete', raw)
      assert.equal(result.rawDraft[field], raw)
      assert.deepEqual(result.diagnostics.map(({ code, field: key }) => [code, key]), [['incomplete', field]])
      assert.equal('candidate' in result, false)
      assert.equal(input[field], raw)
    }
  })
  test(`${field}: invalid numeric text has field-specific recovery instead of coercion`, () => {
    for (const raw of ['12mm', '0xff', '0b10', '1,5', 'two', '1 2', 'NaN', 'Infinity', '-Infinity', '1e999']) {
      const result = validateDiscGeometryDraft({ ...draft, [field]: raw })
      assert.equal(result.status, 'invalid', raw)
      const diagnostic = result.diagnostics.find(item => item.field === field)
      assert.ok(diagnostic)
      assert.match(diagnostic.message, /millimeters/)
      assert.ok(diagnostic.recovery.length > 0)
      assert.equal(result.rawDraft[field], raw)
      assert.equal('candidate' in result, false)
    }
  })
}

test('complete decimals and exponent notation preserve valid numeric geometry and raw text', () => {
  const result = validateDiscGeometryDraft({ ...draft, outerDiameterMm: ' +1.20e2 ', physicalCenterHoleDiameterMm: '.5' })
  assert.equal(result.status, 'valid')
  if (result.status !== 'valid') throw new Error('Expected valid draft')
  assert.equal(result.rawDraft.outerDiameterMm, ' +1.20e2 ')
  assert.equal(result.candidate.outerDiameterMm, 120)
  assert.equal(result.candidate.physicalCenterHoleDiameterMm, 0.5)
  assert.deepEqual(result.candidate, normalizeCustomDiscTemplate(result.candidate))
})

test('intrinsic boundaries include zero holes, equal annulus bounds and both outer limits', () => {
  for (const outer of [20, 305]) {
    for (const edge of [0, outer - 1]) {
      const template = buildCustomDiscTemplate(source, {
        outerDiameterMm: outer,
        physicalCenterHoleDiameterMm: edge,
        innerHoleDiameterMm: edge,
        printableDiameterMm: outer,
        safeDiameterMm: edge,
      })
      const result = validateDiscGeometryDraft(createDiscGeometryRawDraft(template))
      assert.equal(result.status, 'valid')
      if (result.status === 'valid') {
        for (const field of DISC_GEOMETRY_FIELDS) assert.equal(result.candidate[field], template[field])
      }
    }
  }
})

test('scalar ranges report limits and never clamp the candidate into existence', () => {
  for (const [field, raw, range] of [
    ['outerDiameterMm', '19.9', '20 and 305'],
    ['outerDiameterMm', '305.1', '20 and 305'],
    ...DISC_GEOMETRY_FIELDS.filter(field => field !== 'outerDiameterMm').flatMap(field => [
      [field, '-0.1', '0 and 305'], [field, '305.1', '0 and 305'],
    ]),
  ]) {
    const result = validateDiscGeometryDraft({ ...draft, [field]: raw })
    assert.equal(result.status, 'invalid')
    const error = result.diagnostics.find(item => item.code === 'out-of-range' && item.field === field)
    assert.ok(error)
    assert.ok(error.message.includes(range))
    assert.equal('candidate' in result, false)
  }
})

test('all cross-field relationships identify both affected controls and preserve their values', () => {
  const cases = [
    ['physicalCenterHoleDiameterMm', '23', 'center-after-inner', 'innerHoleDiameterMm'],
    ['physicalCenterHoleDiameterMm', '120', 'center-outside-outer', 'outerDiameterMm'],
    ['innerHoleDiameterMm', '120', 'inner-outside-outer', 'outerDiameterMm'],
    ['innerHoleDiameterMm', '119', 'inner-after-printable', 'printableDiameterMm'],
    ['innerHoleDiameterMm', '113', 'inner-after-safe', 'safeDiameterMm'],
    ['printableDiameterMm', '121', 'printable-outside-outer', 'outerDiameterMm'],
    ['safeDiameterMm', '119', 'safe-after-printable', 'printableDiameterMm'],
  ] as const
  for (const [field, value, code, related] of cases) {
    const input = { ...draft, [field]: value }
    const result = validateDiscGeometryDraft(input)
    assert.equal(result.status, 'invalid')
    assert.deepEqual(result.rawDraft, input)
    const error = result.diagnostics.find(item => item.code === code)
    assert.equal(error?.field, field)
    assert.deepEqual(error?.relatedFields, [related])
    assert.match(error?.message ?? '', /must be at most.*mm/)
    if (code === 'safe-after-printable') assert.match(error?.message ?? '', /advisory.*inside the printable diameter/)
    assert.equal('candidate' in result, false)
  }
})

test('correcting either side clears only resolved diagnostics; unrelated invalid text remains visible', () => {
  const invalid = { ...draft, safeDiameterMm: '119', physicalCenterHoleDiameterMm: '-' }
  const result = validateDiscGeometryDraft(invalid)
  assert.equal(result.status, 'invalid')
  assert.deepEqual(result.diagnostics.map(item => item.code), ['incomplete', 'safe-after-printable'])
  for (const correction of [{ safeDiameterMm: '118' }, { printableDiameterMm: '119' }]) {
    const corrected = validateDiscGeometryDraft({ ...invalid, ...correction })
    assert.equal(corrected.status, 'incomplete')
    assert.deepEqual(corrected.diagnostics.map(item => item.code), ['incomplete'])
    assert.equal(corrected.rawDraft.physicalCenterHoleDiameterMm, '-')
  }
})

test('validation owns no committed state and cannot borrow or replace canonical source metadata', () => {
  const original = structuredClone(source)
  original.guides = [{ id: 'safe', name: 'Safe', type: 'safeZone', visibleByDefault: true, bounds: { xMm: 0, yMm: 0, widthMm: 100, heightMm: 100 } }]
  const before = structuredClone(original)
  const raw = Object.freeze({ ...draft, safeDiameterMm: '110', id: 'injected', units: 'in' }) as DiscGeometryRawDraft
  const valid = validateDiscGeometryDraft(raw, Object.freeze(original))
  assert.equal(valid.status, 'valid')
  if (valid.status !== 'valid') throw new Error('Expected valid draft')
  assert.equal(valid.candidate.id, 'custom')
  assert.equal(valid.candidate.units, 'mm')
  assert.equal('id' in valid.rawDraft, false)
  assert.deepEqual(original, before)
  assert.ok(valid.candidate.guides?.[0].bounds)
  valid.candidate.guides[0].bounds.widthMm = 1
  assert.deepEqual(original, before)
  const invalid = validateDiscGeometryDraft({ ...raw, safeDiameterMm: '500' }, original)
  assert.equal(invalid.status, 'invalid')
  assert.equal(valid.candidate.safeDiameterMm, 110)
  assert.deepEqual(original, before)
})
