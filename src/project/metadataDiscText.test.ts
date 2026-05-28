import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultDiscTextValues } from '../discText.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import {
  createDefaultDiscTextValueSources,
  normalizeDiscTextValueSources,
  resolveMetadataBoundDiscTextValues,
  updateDiscTextValueSource,
} from './metadataDiscText.ts'

test('resolves metadata defaults for bound disc text values', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    subtitle: 'Deluxe Edition',
    steamAppId: '440',
    backupDate: '2026-05-28',
    discNumber: '2',
    discTotal: '4',
    copyrightText: 'Copyright 2026 Example Studio.',
  }
  const values = {
    ...createDefaultDiscTextValues(),
    subtitle: 'Fallback subtitle',
    appId: '111',
    backupDate: '2020-01-01',
    discNumber: 'Fallback disc',
    copyright: 'Fallback copyright',
    customNote: 'Manual note',
  }

  const resolved = resolveMetadataBoundDiscTextValues(
    values,
    metadata,
    createDefaultDiscTextValueSources(),
  )

  assert.equal(resolved.subtitle, 'Deluxe Edition')
  assert.equal(resolved.appId, '440')
  assert.equal(resolved.backupDate, '2026-05-28')
  assert.equal(resolved.discNumber, 'Disc 2 of 4')
  assert.equal(resolved.copyright, 'Copyright 2026 Example Studio.')
  assert.equal(resolved.customNote, 'Manual note')
})

test('manual disc text source prevents later metadata values from overwriting rendered text', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    steamAppId: '440',
  }
  const values = {
    ...createDefaultDiscTextValues(),
    appId: 'Manual App ID',
  }
  const sources = updateDiscTextValueSource(
    createDefaultDiscTextValueSources(),
    'appId',
    'manual',
  )

  const resolved = resolveMetadataBoundDiscTextValues(values, metadata, sources)

  assert.equal(resolved.appId, 'Manual App ID')
})

test('normalizes saved source state and infers legacy manual overrides', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    steamAppId: '440',
    backupDate: '2026-05-28',
  }
  const values = {
    ...createDefaultDiscTextValues(),
    appId: 'Custom rendered ID',
    backupDate: '2026-05-28',
  }

  const inferredSources = normalizeDiscTextValueSources(undefined, values, metadata)
  const explicitSources = normalizeDiscTextValueSources(
    { appId: 'metadata' },
    values,
    metadata,
  )

  assert.equal(inferredSources.appId, 'manual')
  assert.equal(inferredSources.backupDate, 'metadata')
  assert.equal(explicitSources.appId, 'metadata')
})
