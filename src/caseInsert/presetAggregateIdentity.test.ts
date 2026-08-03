import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  createCaseInsertPresetIdentityDigest,
  createCaseInsertPresetIdentityDigestFromChunks,
} from
  '../presets/caseInsertPresetIdentityDigest.ts'
import {
  createCaseInsertPresetDeterministicIdentityDigest,
  encodeCaseInsertPresetDeterministicIdentity,
} from '../presets/caseInsertPresetReapplyIdentity.ts'
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

function nodeSha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function legacyDeterministicIdentityEncoding(value: unknown): string {
  if (value === null) return 'n0:'
  if (typeof value === 'boolean') return `b1:${value ? '1' : '0'}`
  if (typeof value === 'number') {
    const encoded = Object.is(value, -0) ? '-0' : String(value)
    return `d${encoded.length}:${encoded}`
  }
  if (typeof value === 'string') return `s${value.length}:${value}`
  if (Array.isArray(value)) {
    const encoded = value.map(legacyDeterministicIdentityEncoding).join('')
    return `a${value.length}:${encoded.length}:${encoded}`
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const entries = Object.keys(record).sort().map((key) =>
      legacyDeterministicIdentityEncoding(key) +
      legacyDeterministicIdentityEncoding(record[key]))
    const encoded = entries.join('')
    return `o${entries.length}:${encoded.length}:${encoded}`
  }
  throw new Error('Unsupported deterministic identity value.')
}

test('bounded identity digest matches SHA-256 at block and Unicode boundaries', () => {
  assert.equal(
    createCaseInsertPresetIdentityDigest(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
  assert.equal(
    createCaseInsertPresetIdentityDigest('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )

  for (const length of [55, 56, 63, 64, 65, 16_383, 16_384, 16_385]) {
    const value = 'a'.repeat(length)
    assert.equal(createCaseInsertPresetIdentityDigest(value), nodeSha256(value))
  }

  const splitPair = `${'a'.repeat(16_383)}😀after-boundary`
  assert.equal(
    createCaseInsertPresetIdentityDigest(splitPair),
    nodeSha256(splitPair),
  )
  const chunkCases = [
    ['', '\ud83d', '\ude00'],
    ['before', '\ud83d', '\ude00', 'after'],
    ['\ud83d', '', '\ud83d', '\ude00'],
    ['\ude00', '\ud83d'],
    ['\ud83d', 'plain'],
  ]
  for (const chunks of chunkCases) {
    assert.equal(
      createCaseInsertPresetIdentityDigestFromChunks(chunks),
      nodeSha256(chunks.join('')),
    )
  }

  const splitEverywhere = 'NUL:\0 astral:😀 lone:\ud83d low:\ude00 end'
  for (let split = 0; split <= splitEverywhere.length; split += 1) {
    const chunks = [
      splitEverywhere.slice(0, split),
      '',
      splitEverywhere.slice(split),
    ]
    assert.equal(
      createCaseInsertPresetIdentityDigestFromChunks(chunks),
      nodeSha256(splitEverywhere),
    )
  }

  let randomState = 0x8a5c_19d3
  const nextRandom = () => {
    randomState ^= randomState << 13
    randomState ^= randomState >>> 17
    randomState ^= randomState << 5
    return randomState >>> 0
  }
  for (let fixture = 0; fixture < 100; fixture += 1) {
    const codeUnits = Array.from(
      { length: nextRandom() % 4097 },
      () => nextRandom() & 0xffff,
    )
    const value = String.fromCharCode(...codeUnits)
    const chunks: string[] = []
    let offset = 0
    while (offset < value.length) {
      if ((nextRandom() & 3) === 0) chunks.push('')
      const length = 1 + (nextRandom() % 97)
      chunks.push(value.slice(offset, offset + length))
      offset += length
    }
    if ((nextRandom() & 1) === 0) chunks.push('')
    assert.equal(
      createCaseInsertPresetIdentityDigestFromChunks(chunks),
      nodeSha256(value),
      `random UTF-16 fixture ${fixture}`,
    )
  }

  const large = `${'data:image/png;base64,'.padEnd(1024 * 1024, 'A')}😀`
  assert.equal(createCaseInsertPresetIdentityDigest(large), nodeSha256(large))
})

test('streamed deterministic encoding preserves the exact v1 grammar', () => {
  const fixtures: readonly [unknown, string][] = [
    [null, 'n0:'],
    [true, 'b1:1'],
    [-0, 'd2:-0'],
    [12.5, 'd4:12.5'],
    ['😀', 's2:😀'],
    ['colon:\0\n"\\', 's10:colon:\0\n"\\'],
    [['😀'], 'a1:5:s2:😀'],
    [[null, 'x'], 'a2:7:n0:s1:x'],
    [{ b: true, a: -0 }, 'o2:17:s1:ad2:-0s1:bb1:1'],
    [{ b: 2, a: 'x' }, 'o2:16:s1:as1:xs1:bd1:2'],
  ]
  for (const [value, expected] of fixtures) {
    assert.equal(encodeCaseInsertPresetDeterministicIdentity(value), expected)
    assert.equal(legacyDeterministicIdentityEncoding(value), expected)
    assert.equal(
      createCaseInsertPresetDeterministicIdentityDigest(value),
      nodeSha256(expected),
    )
  }

  const first = { z: [1, '😀', null], a: { second: false, first: 'x' } }
  const reordered = { a: { first: 'x', second: false }, z: [1, '😀', null] }
  assert.equal(
    encodeCaseInsertPresetDeterministicIdentity(first),
    encodeCaseInsertPresetDeterministicIdentity(reordered),
  )
  assert.equal(
    createCaseInsertPresetDeterministicIdentityDigest(first),
    nodeSha256(encodeCaseInsertPresetDeterministicIdentity(first)),
  )
  assert.notEqual(
    createCaseInsertPresetDeterministicIdentityDigest([1, 2]),
    createCaseInsertPresetDeterministicIdentityDigest([2, 1]),
  )
  const parityValues = [
    first,
    reordered,
    { nfc: 'é', nfd: 'e\u0301', loneHigh: '\ud83d', loneLow: '\ude00' },
    Array.from({ length: 12 }, (_, index) => ({
      index,
      enabled: index % 2 === 0,
      value: `${index}:\0\n😀`,
    })),
  ]
  const sparse = new Array<unknown>(3)
  sparse[1] = 'middle'
  parityValues.push(sparse)
  for (const value of parityValues) {
    const legacy = legacyDeterministicIdentityEncoding(value)
    assert.equal(encodeCaseInsertPresetDeterministicIdentity(value), legacy)
    assert.equal(
      createCaseInsertPresetDeterministicIdentityDigest(value),
      nodeSha256(legacy),
    )
  }

  const cycle: Record<string, unknown> = {}
  cycle.self = cycle
  assert.throws(
    () => createCaseInsertPresetDeterministicIdentityDigest(cycle),
    /Cyclic deterministic identity value/,
  )
  let deep: Record<string, unknown> = {}
  const deepRoot = deep
  for (let depth = 0; depth < 300; depth += 1) {
    const next: Record<string, unknown> = {}
    deep.child = next
    deep = next
  }
  assert.throws(
    () => createCaseInsertPresetDeterministicIdentityDigest(deepRoot),
    /too deep/,
  )

  const digestSource = readFileSync(
    new URL('../presets/caseInsertPresetIdentityDigest.ts', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(digestSource, /\.encode\(value\)/)
  assert.doesNotMatch(digestSource, /paddedLength/)
  assert.match(digestSource, /UTF16_CHUNK_CODE_UNITS = 16 \* 1024/)
  assert.match(digestSource, /new Uint8Array\(SHA256_BLOCK_BYTE_LENGTH\)/)
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
  assert.equal(
    first.aggregateContentIdentity,
    `${CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX}` +
      'a08bc3f71e9f7b641bbfb6ae90d01617af4bc0c48f085dae68d64c5c423fa1a7',
  )

  const assetBearing = structuredClone(mutable)
  assetBearing.templates.cover.background.imageDataUrl =
    'data:image/png;base64,QUJDRA=='
  assetBearing.templates.cover.background.imageSource =
    createProjectImageAssetProvenance({
      source: 'uploaded',
      sourceLabel: 'Golden',
    })
  assetBearing.templates.cover.background.imageSize = { width: 2, height: 3 }
  assert.equal(
    identity(assetBearing),
    `${CASE_INSERT_PRESET_AGGREGATE_CONTENT_IDENTITY_PREFIX}` +
      '2c15753089b1a0d7c049d62cb41e29f9af7b6c7dc6fefda07cbdbb5571fcba4f',
  )
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
  const excessivelyDeep = structuredClone(aggregate) as
    ProjectJewelCaseState & { nested?: unknown }
  let nested: Record<string, unknown> = {}
  excessivelyDeep.nested = nested
  for (let depth = 0; depth < 300; depth += 1) {
    const next: Record<string, unknown> = {}
    nested.child = next
    nested = next
  }
  const prototypeKey = structuredClone(aggregate) as
    ProjectJewelCaseState & Record<string, unknown>
  Object.defineProperty(prototypeKey, '__proto__', {
    value: { polluted: true },
    enumerable: true,
    configurable: true,
    writable: true,
  })
  let ownKeysCalls = 0
  const statefulKeys = new Proxy(structuredClone(aggregate), {
    ownKeys(target) {
      ownKeysCalls += 1
      return ownKeysCalls === 1 ? Reflect.ownKeys(target) : ['templates']
    },
  })
  const revocableTarget = structuredClone(aggregate)
  const revocableKeys = Reflect.ownKeys(revocableTarget)
  let descriptorCalls = 0
  const revocable = Proxy.revocable(revocableTarget, {
    ownKeys() {
      return revocableKeys
    },
    getOwnPropertyDescriptor(target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key)
      descriptorCalls += 1
      if (descriptorCalls === revocableKeys.length) revocable.revoke()
      return descriptor
    },
  })
  const nonIndexArrayKey = structuredClone(aggregate)
  Object.defineProperty(
    nonIndexArrayKey.templates.cover.artworkSlots,
    '4294967295',
    {
      value: createDefaultCaseInsertImageSlot(
        'hostile-array-key',
        'Hostile array key',
      ),
      enumerable: true,
      configurable: true,
      writable: true,
    },
  )
  const malformed = [
    null,
    [],
    { templateType: 'jewelCase' },
    createBlankDiscSavedProject(),
    cycle,
    getter,
    new ForeignAggregate(),
    excessivelyDeep,
    prototypeKey,
    revocable.proxy,
    nonIndexArrayKey,
  ]
  for (const value of malformed) {
    const result = validateCaseInsertPresetAggregateContent(value)
    assert.equal(result.ok, false)
    assert.equal(isDeeplyFrozen(result), true)
    assert.equal('aggregate' in result, false)
  }
  const statefulResult = validateCaseInsertPresetAggregateContent(statefulKeys)
  assert.equal(statefulResult.ok, true)
  assert.equal(ownKeysCalls, 1)
  assert.equal((Object.prototype as { polluted?: unknown }).polluted, undefined)

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
