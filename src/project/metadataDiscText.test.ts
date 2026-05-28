import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultDiscTextValues } from '../discText.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import {
  createDefaultDiscTextValueSources,
  getDiscTextInputState,
  normalizeDiscTextValueSources,
  resolveMetadataBoundDiscTextTitle,
  resolveMetadataBoundDiscTextValues,
  updateDiscTextInputValue,
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
  const emptyManualSources = normalizeDiscTextValueSources(
    { appId: 'manual' },
    { ...values, appId: '' },
    metadata,
  )

  assert.equal(inferredSources.appId, 'manual')
  assert.equal(inferredSources.backupDate, 'metadata')
  assert.equal(explicitSources.appId, 'metadata')
  assert.equal(emptyManualSources.appId, 'metadata')
})

test('metadata-bound input state shows metadata/default as a placeholder', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    steamAppId: '440',
  }
  const values = {
    ...createDefaultDiscTextValues(),
    appId: '',
  }
  const sources = createDefaultDiscTextValueSources()
  const resolvedValues = resolveMetadataBoundDiscTextValues(
    values,
    metadata,
    sources,
  )

  const inputState = getDiscTextInputState(
    'appId',
    values,
    resolvedValues,
    sources,
    '',
    metadata.title,
  )

  assert.equal(inputState.value, '')
  assert.equal(inputState.placeholder, '440')
  assert.equal(inputState.isMetadataBacked, true)
  assert.equal(inputState.isManualOverride, false)
  assert.equal(resolvedValues.appId, '440')
})

test('title input state shows Game metadata title as a placeholder', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    title: 'Warframe',
  }
  const values = createDefaultDiscTextValues()
  const sources = createDefaultDiscTextValueSources()
  const resolvedTitle = resolveMetadataBoundDiscTextTitle('', metadata, sources)

  const inputState = getDiscTextInputState(
    'title',
    values,
    values,
    sources,
    '',
    resolvedTitle,
  )

  assert.equal(inputState.value, '')
  assert.equal(inputState.placeholder, 'Warframe')
  assert.equal(inputState.isMetadataBacked, true)
  assert.equal(inputState.isManualOverride, false)
  assert.equal(resolvedTitle, 'Warframe')
})

test('typing metadata-bound input creates a manual override', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    steamAppId: '440',
  }
  const inputUpdate = updateDiscTextInputValue(
    createDefaultDiscTextValues(),
    createDefaultDiscTextValueSources(),
    'appId',
    'Custom ID',
  )

  const resolvedValues = resolveMetadataBoundDiscTextValues(
    inputUpdate.values,
    metadata,
    inputUpdate.sources,
  )

  assert.equal(inputUpdate.sources.appId, 'manual')
  assert.equal(inputUpdate.values.appId, 'Custom ID')
  assert.equal(resolvedValues.appId, 'Custom ID')
})

test('typing title input creates a manual title override', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    title: 'Warframe',
  }
  const inputUpdate = updateDiscTextInputValue(
    createDefaultDiscTextValues(),
    createDefaultDiscTextValueSources(),
    'title',
    'Custom Label Title',
    '',
  )
  const resolvedTitle = resolveMetadataBoundDiscTextTitle(
    inputUpdate.titleValue,
    metadata,
    inputUpdate.sources,
  )

  assert.equal(inputUpdate.sources.title, 'manual')
  assert.equal(inputUpdate.titleValue, 'Custom Label Title')
  assert.equal(resolvedTitle, 'Custom Label Title')
})

test('clearing metadata-bound input returns it to metadata/default', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    steamAppId: '440',
  }
  const manualUpdate = updateDiscTextInputValue(
    createDefaultDiscTextValues(),
    createDefaultDiscTextValueSources(),
    'appId',
    'Custom ID',
  )

  const clearedUpdate = updateDiscTextInputValue(
    manualUpdate.values,
    manualUpdate.sources,
    'appId',
    '   ',
  )
  const resolvedValues = resolveMetadataBoundDiscTextValues(
    clearedUpdate.values,
    metadata,
    clearedUpdate.sources,
  )

  assert.equal(clearedUpdate.sources.appId, 'metadata')
  assert.equal(clearedUpdate.values.appId, '')
  assert.equal(resolvedValues.appId, '440')
})

test('clearing title input returns it to Game metadata/default', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    title: 'Warframe',
  }
  const manualUpdate = updateDiscTextInputValue(
    createDefaultDiscTextValues(),
    createDefaultDiscTextValueSources(),
    'title',
    'Custom Label Title',
    '',
  )

  const clearedUpdate = updateDiscTextInputValue(
    manualUpdate.values,
    manualUpdate.sources,
    'title',
    '   ',
    manualUpdate.titleValue,
  )
  const resolvedTitle = resolveMetadataBoundDiscTextTitle(
    clearedUpdate.titleValue,
    metadata,
    clearedUpdate.sources,
  )

  assert.equal(clearedUpdate.sources.title, 'metadata')
  assert.equal(clearedUpdate.titleValue, '')
  assert.equal(resolvedTitle, 'Warframe')
})
