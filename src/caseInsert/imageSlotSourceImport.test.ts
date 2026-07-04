import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCaseInsertImageSlotUploadFile,
  loadLocalSteamScreenshotCaseInsertImageSlotImage,
  loadSteamArtworkCaseInsertImageSlotImage,
  loadUploadedCaseInsertImageSlotImage,
  loadWebArtworkCaseInsertImageSlotImage,
  type CaseInsertImageSlotUploadFileEvent,
} from './imageSlotSourceImport.ts'
import type { LocalSteamScreenshotAsset } from '../local/localArtwork.ts'
import type { SteamArtworkAsset } from '../steam/steamApi.ts'
import type { RemoteLogoCandidate } from '../steam/steamLogoCandidates.ts'
import type { CaseInsertImageSlotImageInput } from './types.ts'

function uploadEvent(file?: File): CaseInsertImageSlotUploadFileEvent {
  return {
    target: {
      files: file ? ([file] as unknown as FileList) : null,
      value: 'selected-file',
    },
  }
}

const image: CaseInsertImageSlotImageInput = {
  imageDataUrl: 'data:image/png;base64,abc123',
  imageSize: {
    height: 20,
    width: 10,
  },
}

const localScreenshot: LocalSteamScreenshotAsset = {
  folderPath: 'C:/Steam/screenshots',
  id: 'local-1',
  label: 'Local Shot',
  path: 'C:/Steam/screenshots/local-shot.png',
}

const steamArtwork: SteamArtworkAsset = {
  id: 'steam-art-1',
  kind: 'library',
  label: 'Steam Capsule',
  url: 'https://cdn.example.test/steam-capsule.png',
}

const webCandidate: RemoteLogoCandidate = {
  contentKind: 'artwork',
  fileType: 'png',
  id: 'web-1',
  label: 'Web Art',
  reasons: [],
  routingReasons: [],
  score: 10,
  sourceKind: 'official-img',
  sourcePageUrl: 'https://example.test',
  targetWorkflow: 'artwork',
  transparencyHint: false,
  url: 'https://example.test/art.png',
}

test('case insert upload file helper clears input and normalizes image labels', () => {
  const file = new File(['image'], 'cover.png', { type: 'image/png' })
  const event = uploadEvent(file)
  const statuses: string[] = []
  const result = getCaseInsertImageSlotUploadFile({
    announceStatus: (message) => statuses.push(message),
    event,
    label: '  Cover Artwork  ',
  })

  assert.equal(event.target.value, '')
  assert.deepEqual(statuses, [])
  assert.equal(result?.file, file)
  assert.equal(result?.statusLabel, 'cover artwork')
})

test('case insert upload file helper rejects non-image files with existing status copy', () => {
  const event = uploadEvent(
    new File(['notes'], 'notes.txt', { type: 'text/plain' }),
  )
  const statuses: string[] = []
  const result = getCaseInsertImageSlotUploadFile({
    announceStatus: (message) => statuses.push(message),
    event,
    label: 'Tray Screenshot',
  })

  assert.equal(event.target.value, '')
  assert.equal(result, null)
  assert.deepEqual(statuses, [
    'Choose an image file for the tray screenshot.',
  ])
})

test('case insert upload file helper ignores empty file inputs after clearing them', () => {
  const event = uploadEvent()
  const statuses: string[] = []
  const result = getCaseInsertImageSlotUploadFile({
    announceStatus: (message) => statuses.push(message),
    event,
    label: 'Spine logo',
  })

  assert.equal(event.target.value, '')
  assert.equal(result, null)
  assert.deepEqual(statuses, [])
})

test('case insert uploaded image loader preserves file label and image result', async () => {
  const file = new File(['image'], 'uploaded.png', { type: 'image/png' })
  const statuses: string[] = []
  const result = await loadUploadedCaseInsertImageSlotImage({
    announceStatus: (message) => statuses.push(message),
    createImage: async (nextFile, fallbackLabel) => {
      assert.equal(nextFile, file)
      assert.equal(fallbackLabel, 'cover artwork')
      return image
    },
    uploadFile: {
      file,
      statusLabel: 'cover artwork',
    },
  })

  assert.deepEqual(statuses, [])
  assert.equal(result, image)
})

test('case insert uploaded image loader preserves failure status copy', async () => {
  const file = new File(['image'], 'broken.png', { type: 'image/png' })
  const statuses: string[] = []
  const result = await loadUploadedCaseInsertImageSlotImage({
    announceStatus: (message) => statuses.push(message),
    createImage: async () => {
      throw new Error('decode failed')
    },
    uploadFile: {
      file,
      statusLabel: 'tray artwork',
    },
  })

  assert.equal(result, null)
  assert.deepEqual(statuses, [
    'The tray artwork image could not be read.',
  ])
})

test('case insert Steam artwork loader preserves status copy and image result', async () => {
  const statuses: string[] = []
  const result = await loadSteamArtworkCaseInsertImageSlotImage({
    announceStatus: (message) => statuses.push(message),
    asset: steamArtwork,
    createImage: async (asset) => {
      assert.equal(asset, steamArtwork)
      return image
    },
    label: 'Cover Artwork',
  })

  assert.deepEqual(statuses, [
    'Downloading Steam Capsule for cover artwork...',
  ])
  assert.deepEqual(result, {
    image,
    successStatus: 'Using Steam Capsule as the cover artwork.',
  })
})

test('case insert Steam artwork loader preserves failure status copy', async () => {
  const statuses: string[] = []
  const result = await loadSteamArtworkCaseInsertImageSlotImage({
    announceStatus: (message) => statuses.push(message),
    asset: steamArtwork,
    createImage: async () => {
      throw new Error('timeout')
    },
    label: 'Tray Artwork',
  })

  assert.equal(result, null)
  assert.deepEqual(statuses, [
    'Downloading Steam Capsule for tray artwork...',
    'Steam artwork import failed for tray artwork: Error: timeout',
  ])
})

test('case insert local screenshot loader preserves status copy and image result', async () => {
  const statuses: string[] = []
  const result = await loadLocalSteamScreenshotCaseInsertImageSlotImage({
    announceStatus: (message) => statuses.push(message),
    asset: localScreenshot,
    createImage: async (asset) => {
      assert.equal(asset, localScreenshot)
      return image
    },
    label: '  Cover Artwork  ',
  })

  assert.deepEqual(statuses, [
    'Loading Local Shot for cover artwork...',
  ])
  assert.deepEqual(result, {
    image,
    successStatus: 'Using Local Shot as the cover artwork.',
  })
})

test('case insert local screenshot loader preserves failure status copy', async () => {
  const statuses: string[] = []
  const result = await loadLocalSteamScreenshotCaseInsertImageSlotImage({
    announceStatus: (message) => statuses.push(message),
    asset: localScreenshot,
    createImage: async () => {
      throw new Error('no file')
    },
    label: 'Tray Screenshot',
  })

  assert.equal(result, null)
  assert.deepEqual(statuses, [
    'Loading Local Shot for tray screenshot...',
    'Local screenshot import failed for tray screenshot: Error: no file',
  ])
})

test('case insert web artwork loader preserves status copy and image result', async () => {
  const statuses: string[] = []
  const result = await loadWebArtworkCaseInsertImageSlotImage({
    announceStatus: (message) => statuses.push(message),
    candidate: webCandidate,
    createImage: async (candidate) => {
      assert.equal(candidate, webCandidate)
      return image
    },
    label: 'Spine Artwork',
  })

  assert.deepEqual(statuses, [
    'Downloading Web Art for spine artwork...',
  ])
  assert.deepEqual(result, {
    image,
    successStatus: 'Using Web Art as the spine artwork.',
  })
})

test('case insert web artwork loader preserves failure status copy', async () => {
  const statuses: string[] = []
  const result = await loadWebArtworkCaseInsertImageSlotImage({
    announceStatus: (message) => statuses.push(message),
    candidate: webCandidate,
    createImage: async () => {
      throw new Error('offline')
    },
    label: 'Additional Artwork',
  })

  assert.equal(result, null)
  assert.deepEqual(statuses, [
    'Downloading Web Art for additional artwork...',
    'Web artwork import failed for additional artwork: Error: offline',
  ])
})
