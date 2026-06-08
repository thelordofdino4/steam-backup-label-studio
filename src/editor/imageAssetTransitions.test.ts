import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearEditorImageAssetContent,
  clearEditorImageAssetSourceContent,
  setEditorImageAssetContent,
  setEditorImageAssetSourceContent,
} from './imageAssetTransitions.ts'

test('setEditorImageAssetContent updates image payload and preserves unrelated state', () => {
  const state = {
    enabled: false,
    imageDataUrl: null,
    imageSize: null,
    label: 'Artwork 1',
    layout: {
      enabled: false,
      scale: 1,
      x: 20,
      y: 40,
    },
  }

  const nextState = setEditorImageAssetContent(state, {
    imageDataUrl: 'data:image/png;base64,asset',
    imageSize: {
      width: 320,
      height: 180,
    },
  })

  assert.equal(nextState.imageDataUrl, 'data:image/png;base64,asset')
  assert.deepEqual(nextState.imageSize, {
    width: 320,
    height: 180,
  })
  assert.equal(nextState.enabled, false)
  assert.equal(nextState.label, 'Artwork 1')
  assert.deepEqual(nextState.layout, state.layout)
})

test('clearEditorImageAssetContent clears image payload and preserves unrelated state', () => {
  const state = {
    imageDataUrl: 'data:image/png;base64,asset',
    imageSize: {
      width: 320,
      height: 180,
    },
    source: 'custom',
    sourceLabel: 'Custom image',
  }

  const nextState = clearEditorImageAssetContent(state)

  assert.equal(nextState.imageDataUrl, null)
  assert.equal(nextState.imageSize, null)
  assert.equal(nextState.source, 'custom')
  assert.equal(nextState.sourceLabel, 'Custom image')
})

test('image asset source transitions update source metadata without owning enablement', () => {
  const state = {
    enabled: false,
    imageDataUrl: null,
    imageSize: null,
    imageSource: null as null | {
      source: string
      sourceLabel: string
    },
  }
  const imageSource = {
    source: 'steam-artwork',
    sourceLabel: 'Steam capsule',
  }

  const withImage = setEditorImageAssetSourceContent(state, {
    imageDataUrl: 'data:image/png;base64,asset',
    imageSize: {
      width: 600,
      height: 900,
    },
    imageSource,
  })
  const cleared = clearEditorImageAssetSourceContent(withImage)

  assert.deepEqual(withImage.imageSource, imageSource)
  assert.equal(withImage.enabled, false)
  assert.equal(cleared.imageDataUrl, null)
  assert.equal(cleared.imageSize, null)
  assert.equal(cleared.imageSource, null)
  assert.equal(cleared.enabled, false)
})
