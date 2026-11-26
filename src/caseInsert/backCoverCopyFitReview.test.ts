import assert from 'node:assert/strict'
import test from 'node:test'
import { createBackCoverCopyFitReview, type BackCoverCopyReviewTarget } from './backCoverCopyFitReview.ts'
import { createFittedSteamBackCoverCopy } from './backCoverCopyFit.ts'
import { estimateCaseInsertTextFit, getCaseInsertTextReadabilityWarnings } from './textReadability.ts'
import type { SteamImportedGame } from '../steam/steamApi.ts'

const game: SteamImportedGame = {
  appId: 620, title: 'Example', developer: [], publisher: [], storeUrl: '', artwork: [],
  categories: ['Single-player', 'Co-op', 'Steam Achievements'], genres: ['Puzzle','Adventure'],
  shortDescription: 'A compact description.',
  detailedDescription: '<h2>About This Game</h2><p>' + 'A longer sentence about exploring a detailed world. '.repeat(20) + '</p>',
  minimumRequirements: 'OS: Example', recommendedRequirements: 'More memory', legalNotice: 'A required notice.',
}
function target(height = 100): BackCoverCopyReviewTarget {
  return { id: 'tray-description', text: '  My exact manual text.\nSecond line.  ', source: 'manual',
    layout: { bounds: { x: 0, y: 0, width: 260, height }, fontSizePx: 18, lineHeightPx: 22 },
  }
}

test('review exposes every existing description variant without implicitly selecting medium or mutating manual content', () => {
  const current = target()
  const before = JSON.stringify({ game, current })
  const review = createBackCoverCopyFitReview(game, { description: current })
  assert.equal(review.defaultAction, 'preserve')
  assert.equal(review.fitEvidence, 'existing-preflight-estimate')
  assert.equal(review.requiresVisualVerification, true)
  assert.equal(review.description.current?.text, current.text)
  assert.equal(review.description.current?.source, 'manual')
  assert.deepEqual(review.description.variants.map(({ id, text }) => ({ id, text })),
    createFittedSteamBackCoverCopy(game).descriptionVariants.map(({ id, text }) => ({ id, text })))
  assert.equal('selectedVariant' in review.description, false)
  assert.equal(JSON.stringify({ game, current }), before)
})

test('shorter candidates improve the existing overflow estimate without pretending to prove rendered fit', () => {
  const review = createBackCoverCopyFitReview(game, { description: target(70) })
  const short = review.description.variants.find(v => v.id === 'short')!.assessment
  const full = review.description.variants.find(v => v.id === 'full')!.assessment
  assert.equal(short.status, 'estimated'); assert.equal(full.status, 'estimated')
  if (short.status !== 'estimated' || full.status !== 'estimated') assert.fail()
  assert.ok(short.estimate.requiredLines < full.estimate.requiredLines)
  assert.equal(short.warnings.length, 0)
  assert.ok(full.warnings.some(warning => warning.includes('may overflow')))
})

test('bullet prefixes use target capacity while preserving source order, omitted counts and current text', () => {
  const current = target(70)
  const review = createBackCoverCopyFitReview(game, { features: current })
  assert.ok(review.features.prefixes.length > 2)
  for (const prefix of review.features.prefixes) {
    assert.deepEqual(prefix.items, review.features.sourceItems.slice(0, prefix.items.length))
    assert.equal(prefix.items.length + prefix.omittedCount, review.features.sourceItems.length)
    assert.equal(prefix.assessment.status, 'estimated')
    if (prefix.assessment.status !== 'estimated') assert.fail()
    assert.deepEqual(prefix.assessment.estimate, estimateCaseInsertTextFit(prefix.items.map(item => `- ${item}`).join('\n'), current.layout!))
  }
  assert.equal(review.features.prefixes[0].assessment.warnings.length, 0)
  assert.ok(review.features.prefixes.at(-1)!.assessment.warnings.some(warning => warning.includes('overflow')))
  assert.equal(review.features.current?.text, current.text)
})

test('reserved bounds and readability warnings match export preflight and do not shrink fonts', () => {
  const current = target(500)
  current.layout!.reservedBounds = { x: 20, y: 30, width: 100, height: 45 }
  current.layout!.fontSizePx = 8
  const review = createBackCoverCopyFitReview(game, { description: current })
  const candidate = review.description.variants[0]
  assert.equal(candidate.assessment.status, 'estimated')
  if (candidate.assessment.status !== 'estimated') assert.fail()
  const layout = { ...current.layout!, bounds: current.layout!.reservedBounds! }
  assert.deepEqual(candidate.assessment.estimate, estimateCaseInsertTextFit(candidate.text, layout))
  assert.deepEqual(candidate.assessment.warnings, getCaseInsertTextReadabilityWarnings({ label: 'Description', text: candidate.text, layout, role: 'description' }))
  assert.ok(candidate.assessment.warnings.some(warning => warning.includes('too small')))
  assert.equal(current.layout!.fontSizePx, 8)
})

test('missing and invalid geometry never report an estimated fit', () => {
  const noTarget = createBackCoverCopyFitReview(game, {})
  assert.equal(noTarget.description.current, null)
  assert.equal(noTarget.description.variants[0].assessment.status, 'unavailable')
  for (const bad of [0, -1, NaN, Infinity]) {
    const current = target(bad)
    assert.equal(createBackCoverCopyFitReview(game, { description: current }).description.variants[0].assessment.status, 'unavailable')
  }
  const blank = createBackCoverCopyFitReview({ ...game, shortDescription: '', detailedDescription: '', categories: [], genres: [] }, {})
  assert.equal(blank.description.variants[0].assessment.status, 'empty')
  assert.deepEqual(blank.features.prefixes, [])
})

test('requirements and legal review retain content and the existing density advice rather than deleting notices', () => {
  const source = { ...game, minimumRequirements: 'Long requirements. '.repeat(80), legalNotice: 'Required notice. '.repeat(80) }
  const review = createBackCoverCopyFitReview(source, { minimumRequirements: target(), legalText: target() })
  const copy = createFittedSteamBackCoverCopy(source)
  assert.equal(review.minimumRequirements.candidate.text, copy.minimumRequirements)
  assert.equal(review.legalText.candidate.text, copy.legalText)
  assert.deepEqual(review.sourceWarnings, copy.warnings)
  assert.ok(review.sourceWarnings.some(warning => warning.includes('required notices')))
  assert.equal(review.legalText.current?.source, 'manual')
})

test('review outputs are detached and immutable, including arrays, estimates and warnings', () => {
  const current = target()
  const review = createBackCoverCopyFitReview(game, { description: current, features: current })
  const original = JSON.stringify(review)
  current.layout!.bounds.height = 1
  function assertFrozen(value: unknown) {
    if (!value || typeof value !== 'object') return
    assert.ok(Object.isFrozen(value))
    for (const child of Object.values(value)) assertFrozen(child)
  }
  assertFrozen(review)
  assert.equal(JSON.stringify(review), original)
})
