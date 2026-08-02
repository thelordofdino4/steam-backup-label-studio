import assert from 'node:assert/strict'
import test from 'node:test'

import { createCaseInsertPresetIdentityDigest } from
  '../presets/caseInsertPresetIdentityDigest.ts'
import { captureNormalizedProjectSnapshot } from
  '../lifecycle/canonicalProject.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createBlankJewelCaseSavedProject } from
  '../project/caseInsertProjectAdapters.ts'
import { createProjectImageAssetProvenance } from
  '../project/projectAssetStatus.ts'
import type { ProjectJewelCaseState } from '../project/projectTypes.ts'
import { createDefaultCaseInsertImageSlot } from './defaults.ts'
import {
  createCaseInsertPresetAssignmentSnapshot,
  isCaseInsertPresetAssignmentSnapshot,
} from './presetAssignmentSnapshot.ts'
import {
  CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX,
  validateCaseInsertPresetAggregateContent,
} from './presetAggregateIdentity.ts'

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value)) deepFreeze(child, seen)
  return Object.freeze(value)
}

function isDeeplyFrozen(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== 'object') return true
  if (seen.has(value)) return true
  seen.add(value)
  return Object.isFrozen(value) && Object.values(value).every((child) =>
    isDeeplyFrozen(child, seen))
}

function identity(value: unknown, label = '') {
  const result = validateCaseInsertPresetAggregateContent(value)
  assert.equal(result.ok, true, result.ok ? label : `${label}:${result.code}`)
  if (!result.ok) throw new Error(result.code)
  return result.aggregateContentIdentity
}

function reverseRecordOrder(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseRecordOrder)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).reverse().map(
    ([key, child]) => [key, reverseRecordOrder(child)],
  ))
}

test('deterministic identity digest matches standard SHA-256 vectors', () => {
  assert.equal(
    createCaseInsertPresetIdentityDigest(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
  assert.equal(
    createCaseInsertPresetIdentityDigest('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
})

test('equivalent clones and record order share one detached immutable identity', () => {
  const mutable = createBlankJewelCaseSavedProject().caseInsert
  const before = structuredClone(mutable)
  const first = validateCaseInsertPresetAggregateContent(mutable)
  const clone = validateCaseInsertPresetAggregateContent(
    structuredClone(mutable),
  )
  const reordered = validateCaseInsertPresetAggregateContent(
    reverseRecordOrder(mutable),
  )
  assert.equal(first.ok, true)
  assert.equal(clone.ok, true)
  assert.equal(reordered.ok, true)
  if (!first.ok || !clone.ok || !reordered.ok) return
  assert.equal(first.aggregateContentIdentity, clone.aggregateContentIdentity)
  assert.equal(first.aggregateContentIdentity, reordered.aggregateContentIdentity)
  assert.match(first.aggregateContentIdentity, new RegExp(
    `^${CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX}[0-9a-f]{64}$`,
  ))
  assert.notEqual(first.aggregate, mutable)
  assert.equal(isDeeplyFrozen(first), true)
  assert.deepEqual(mutable, before)
  assert.equal(Object.isFrozen(mutable), false)

  const frozen = deepFreeze(structuredClone(mutable))
  assert.equal(identity(frozen), first.aggregateContentIdentity)
})

test('the complete normalized Case aggregate projection binds every owner domain', () => {
  const baseline = createBlankJewelCaseSavedProject().caseInsert
  const baselineIdentity = identity(baseline)
  const mutations: readonly [
    string,
    (aggregate: ProjectJewelCaseState) => void,
  ][] = [
    ['cover background enablement', (value) => {
      value.templates.cover.background.enabled = false
    }],
    ['cover background bytes', (value) => {
      value.templates.cover.background.imageDataUrl = 'data:image/png;base64,AA=='
      value.templates.cover.background.imageSource =
        createProjectImageAssetProvenance({
          source: 'uploaded', sourceLabel: 'Identity',
        })
      value.templates.cover.background.imageSize = { width: 2, height: 3 }
    }],
    ['cover background provenance', (value) => {
      value.templates.cover.background.imageDataUrl = 'data:image/png;base64,AA=='
      value.templates.cover.background.imageSource =
        createProjectImageAssetProvenance({
          source: 'uploaded', sourceLabel: 'Identity provenance',
        })
      value.templates.cover.background.imageSize = { width: 2, height: 3 }
    }],
    ['cover background size', (value) => {
      value.templates.cover.background.imageDataUrl = 'data:image/png;base64,AA=='
      value.templates.cover.background.imageSource =
        createProjectImageAssetProvenance({
          source: 'uploaded', sourceLabel: 'Identity',
        })
      value.templates.cover.background.imageSize = { width: 2, height: 3 }
    }],
    ['cover background layout', (value) => {
      value.templates.cover.background.layout.x = 1
    }],
    ['cover background fit', (value) => {
      value.templates.cover.background.fit = 'contain'
    }],
    ['cover background frame', (value) => {
      value.templates.cover.background.frame.enabled = true
    }],
    ['cover banner', (value) => {
      value.templates.cover.steamBanner.fallbackText = 'IDENTITY'
    }],
    ['cover title artwork', (value) => {
      value.templates.cover.titleArtwork.layout.y = 1
    }],
    ['cover owner enablement', (value) => {
      value.templates.cover.additionalArtworkEnabled = true
    }],
    ['repeated target membership and ID', (value) => {
      value.templates.cover.artworkSlots.push(
        createDefaultCaseInsertImageSlot('identity-artwork', 'Identity artwork'),
      )
    }],
    ['logo membership', (value) => {
      value.templates.cover.logoSlots.push(
        createDefaultCaseInsertImageSlot('identity-logo', 'Identity logo'),
      )
    }],
    ['mark membership', (value) => {
      value.templates.cover.markSlots.push(
        createDefaultCaseInsertImageSlot('identity-mark', 'Identity mark'),
      )
    }],
    ['text content', (value) => {
      value.templates.cover.textBlocks[0]!.value = 'Identity title'
    }],
    ['text style', (value) => {
      value.templates.cover.textBlocks[0]!.style.bold = true
    }],
    ['text ownership/source', (value) => {
      value.templates.cover.textBlocks[0]!.source = 'manual'
    }],
    ['Back Panel text', (value) => {
      value.templates.tray.textBlocks.find(({ id }) =>
        id === 'tray-description')!.value = 'Identity back panel'
    }],
    ['complete Tray background', (value) => {
      value.templates.tray.background.layout.y = 2
    }],
    ['Tray list membership', (value) => {
      value.templates.tray.textLists[0]!.items.push('Identity feature')
    }],
    ['spine mirroring', (value) => {
      value.spine.mirrored = !value.spine.mirrored
    }],
    ['left Spine', (value) => {
      value.spine.left.title.value = 'Identity left'
    }],
    ['right Spine', (value) => {
      value.spine.right.title.value = 'Identity right'
    }],
    ['export surface order', (value) => {
      value.export.surfaces.reverse()
    }],
    ['export guide membership', (value) => {
      value.export.guideIds.push('frontTrimBounds')
    }],
  ]

  for (const [label, mutate] of mutations) {
    const changed = structuredClone(baseline)
    mutate(changed)
    const changedIdentity = identity(changed, label)
    assert.notEqual(changedIdentity, baselineIdentity, label)
  }
})

test('distinct Back/Tray and left/right Spine states cannot alias', () => {
  const baseline = createBlankJewelCaseSavedProject().caseInsert
  const back = structuredClone(baseline)
  back.templates.tray.textBlocks.find(({ id }) =>
    id === 'tray-description')!.layout.x += 1
  const tray = structuredClone(baseline)
  tray.templates.tray.background.layout.x += 1
  const left = structuredClone(baseline)
  left.spine.left.title.layout.y += 1
  const right = structuredClone(baseline)
  right.spine.right.title.layout.y += 1
  assert.equal(new Set([
    identity(back), identity(tray), identity(left), identity(right),
  ]).size, 4)
})

test('malformed, cyclic, partial, cross-domain, and forged inputs fail safely', () => {
  const aggregate = createBlankJewelCaseSavedProject().caseInsert
  const cycle = structuredClone(aggregate) as ProjectJewelCaseState & {
    cycle?: unknown
  }
  cycle.cycle = cycle
  const getter = structuredClone(aggregate)
  Object.defineProperty(getter, 'templates', {
    enumerable: true,
    get() { throw new Error('must not execute') },
  })
  class ForeignAggregate {}
  const malformed = [
    null,
    [],
    { templateType: 'jewelCase' },
    createBlankDiscSavedProject(),
    cycle,
    getter,
    new ForeignAggregate(),
  ]
  for (const value of malformed) {
    const result = validateCaseInsertPresetAggregateContent(value)
    assert.equal(result.ok, false)
    assert.equal(isDeeplyFrozen(result), true)
    assert.equal('aggregate' in result, false)
  }

  const project = createBlankJewelCaseSavedProject()
  const snapshot = createCaseInsertPresetAssignmentSnapshot({
    sessionId: 'aggregate-identity-forgery',
    projectRevision: 0,
    project: captureNormalizedProjectSnapshot(project),
  })
  assert.equal(snapshot.ok, true)
  if (!snapshot.ok) return
  const forged = structuredClone(snapshot.value) as unknown as {
    identity: { aggregateContentIdentity: string }
  }
  forged.identity.aggregateContentIdentity =
    `${CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX}${'0'.repeat(64)}`
  assert.equal(isCaseInsertPresetAssignmentSnapshot(deepFreeze(forged)), false)
})
