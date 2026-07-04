import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultDiscTextValues,
} from './index.ts'
import {
  resolveDiscTextMetadataState,
  restoreDiscTextMetadataValueTransition,
} from './metadataStateTransitions.ts'
import {
  createDefaultDiscTextValueSources,
  updateDiscTextInputValue,
} from '../project/metadataDiscText.ts'
import {
  createDefaultProjectMetadata,
} from '../project/projectMetadata.ts'

test('disc text metadata resolution preserves manual title and metadata-bound fields', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    publisher: 'Valve',
    title: 'Portal 2',
  }
  const manualTitle = updateDiscTextInputValue(
    createDefaultDiscTextValues(),
    createDefaultDiscTextValueSources(),
    'title',
    'Custom Disc Title',
  )
  const manualPublisher = updateDiscTextInputValue(
    manualTitle.values,
    manualTitle.sources,
    'publisher',
    'Custom Publisher',
    manualTitle.titleValue,
  )
  const resolution = resolveDiscTextMetadataState(metadata, {
    discTextValues: manualPublisher.values,
    discTextValueSources: manualPublisher.sources,
    discTextTitleValue: manualPublisher.titleValue,
  })

  assert.equal(resolution.resolvedDiscTextTitle, 'Custom Disc Title')
  assert.equal(resolution.metadataBoundDiscTextValues.publisher, 'Custom Publisher')
  assert.equal(resolution.discTextValueSources.title, 'manual')
  assert.equal(resolution.discTextValueSources.publisher, 'manual')
})

test('disc text metadata restore transition returns a non-title field to metadata', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    steamAppId: '620',
  }
  const manualAppId = updateDiscTextInputValue(
    createDefaultDiscTextValues(),
    createDefaultDiscTextValueSources(),
    'appId',
    'custom-app-id',
  )
  const transition = restoreDiscTextMetadataValueTransition({
    key: 'appId',
    metadata,
    state: {
      discTextValues: manualAppId.values,
      discTextValueSources: manualAppId.sources,
      discTextTitleValue: manualAppId.titleValue,
    },
  })

  assert.equal(transition.state.discTextValueSources.appId, 'metadata')
  assert.equal(transition.state.discTextValues.appId, '')
  assert.equal(transition.renderedContent, 'Steam App ID 620')
  assert.equal(transition.resolution.metadataBoundDiscTextValues.appId, '620')
})

test('disc text metadata restore transition returns title to game metadata', () => {
  const metadata = {
    ...createDefaultProjectMetadata(),
    title: 'Half-Life',
  }
  const manualTitle = updateDiscTextInputValue(
    createDefaultDiscTextValues(),
    createDefaultDiscTextValueSources(),
    'title',
    'Custom Title',
  )
  const transition = restoreDiscTextMetadataValueTransition({
    key: 'title',
    metadata,
    state: {
      discTextValues: manualTitle.values,
      discTextValueSources: manualTitle.sources,
      discTextTitleValue: manualTitle.titleValue,
    },
  })

  assert.equal(transition.state.discTextValueSources.title, 'metadata')
  assert.equal(transition.state.discTextTitleValue, '')
  assert.equal(transition.renderedContent, 'Half-Life')
  assert.equal(transition.resolution.resolvedDiscTextTitle, 'Half-Life')
})
