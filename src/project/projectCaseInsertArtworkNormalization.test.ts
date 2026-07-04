import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_CASE_INSERT_TEMPLATE_TYPE } from '../editor/editorTypes.ts'
import { restoreCaseInsertProjectState } from './projectCaseInsert.ts'

test('legacy case insert projects infer additional artwork visibility from slots', () => {
  const restored = restoreCaseInsertProjectState({
    schemaVersion: '0.1.0',
    projectType: 'caseInsert',
    title: 'Legacy Artwork Case',
    savedAt: '2026-06-03T12:00:00.000Z',
    game: {
      manualTitle: 'Legacy Artwork Case',
      selectedSteamGame: null,
    },
    template: {
      type: 'caseInsert',
      variant: DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
    },
    caseInsert: {
      templates: {
        cover: {
          artworkSlots: [
            {
              id: 'legacy-cover-art',
              label: 'Legacy cover art',
              enabled: true,
              imageDataUrl: 'data:image/png;base64,legacy-cover',
              imageSize: { width: 800, height: 800 },
            },
          ],
        },
        tray: {
          artworkSlots: [
            {
              id: 'legacy-tray-art',
              label: 'Legacy tray art',
              enabled: true,
              imageDataUrl: 'data:image/png;base64,legacy-tray',
              imageSize: { width: 1280, height: 720 },
            },
          ],
        },
      },
      spine: {
        left: {
          artworkSlots: [
            {
              id: 'legacy-left-spine-art',
              label: 'Legacy left spine art',
              enabled: true,
              imageDataUrl: 'data:image/png;base64,legacy-spine',
              imageSize: { width: 512, height: 512 },
            },
          ],
        },
      },
    },
  }).caseInsert

  assert.equal(restored.templates.cover.additionalArtworkEnabled, true)
  assert.equal(restored.templates.tray.additionalArtworkEnabled, true)
  assert.equal(restored.spine.left.additionalArtworkEnabled, true)
  assert.equal(restored.spine.right.additionalArtworkEnabled, false)
})

test('case insert artwork slots use shared saved image field normalization', () => {
  const restored = restoreCaseInsertProjectState({
    schemaVersion: '0.1.0',
    projectType: 'caseInsert',
    title: 'Sparse Image Case',
    savedAt: '2026-06-03T12:00:00.000Z',
    game: {
      manualTitle: 'Sparse Image Case',
      selectedSteamGame: null,
    },
    template: {
      type: 'caseInsert',
      variant: DEFAULT_CASE_INSERT_TEMPLATE_TYPE,
    },
    caseInsert: {
      templates: {
        cover: {
          artworkSlots: [
            {
              id: 'bad-cover-artwork',
              enabled: true,
              imageDataUrl: 42,
              imageSize: { width: 'wide', height: 720 },
              layout: {
                enabled: 'true',
                scale: Number.NaN,
                x: 'left',
                y: 24,
              },
            },
          ],
        },
      },
    },
  }).caseInsert
  const slot = restored.templates.cover.artworkSlots[0]!

  assert.equal(slot.imageDataUrl, null)
  assert.equal(slot.imageSize, null)
  assert.equal(slot.layout.scale, 1)
  assert.equal(slot.layout.x, 0)
  assert.equal(slot.layout.y, 24)
})
