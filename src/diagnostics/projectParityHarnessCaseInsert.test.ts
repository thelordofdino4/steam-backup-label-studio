import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from '../caseInsert/defaults.ts'
import { DEFAULT_ADDITIONAL_ARTWORK_FRAME } from '../project/additionalArtworkFrame.ts'
import {
  createCaseInsertProjectSnapshot,
  restoreCaseInsertProjectState,
} from '../project/caseInsertProjectAdapters.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import { sanitizeHtmlSource } from '../text/htmlText.ts'
import {
  assertProjectParityFixtures,
  normalizeProjectParityExportState,
  normalizeProjectParityImageAsset,
  normalizeProjectParityText,
  normalizeProjectParityValue,
} from './projectParityHarness.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseState,
  SavedCaseInsertProject,
} from '../project/projectTypes.ts'

const IMAGE_DATA_URL = 'data:image/png;base64,cGFyaXR5LWltYWdl'
const FIXED_SAVED_AT = '2026-06-19T12:00:00.000Z'

function cloneThroughProjectFile<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function findById<T extends { id: string }>(
  items: readonly T[],
  id: string,
): T {
  const item = items.find((candidate) => candidate.id === id)

  assert.ok(item, `Expected fixture item "${id}" to exist.`)

  return item
}

function createUploadedImageSource(sourceLabel: string) {
  return createProjectImageAssetProvenance({
    source: 'uploaded',
    sourceId: sourceLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    sourceLabel,
  })
}

function makeCaseImageSlot(
  id: string,
  label: string,
  options: {
    enabled?: boolean
    x: number
    y: number
    scale: number
    rotation?: number
  },
): ProjectCaseInsertImageSlot {
  return {
    ...createDefaultCaseInsertImageSlot(id, label, {
      enabled: options.enabled ?? true,
      fit: 'contain',
      layout: {
        x: options.x,
        y: options.y,
        scale: options.scale,
        rotation: options.rotation ?? 0,
      },
    }),
    imageDataUrl: IMAGE_DATA_URL,
    imageSource: createUploadedImageSource(`${label}.png`),
    imageSize: { width: 640, height: 360 },
    frame: {
      ...DEFAULT_ADDITIONAL_ARTWORK_FRAME,
      enabled: true,
      color: '#00ffaa',
      width: 2,
    },
  }
}

function updateTextBlock(
  textBlock: ProjectCaseInsertTextBlock,
  updates: Partial<ProjectCaseInsertTextBlock>,
): ProjectCaseInsertTextBlock {
  return {
    ...textBlock,
    ...updates,
    layout: {
      ...textBlock.layout,
      ...(updates.layout ?? {}),
    },
    style: {
      ...textBlock.style,
      ...(updates.style ?? {}),
    },
  }
}

function createCaseParityState(): ProjectJewelCaseState {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const coverTitleHtml = sanitizeHtmlSource(
    '<p><strong>Portal</strong> <span style="color: #00ffaa;">2</span></p>',
  )

  return {
    ...state,
    templates: {
      ...state.templates,
      cover: {
        ...state.templates.cover,
        additionalArtworkEnabled: false,
        artworkSlots: [
          makeCaseImageSlot('cover-artwork-1', 'Cover artwork', {
            x: 26,
            y: 58,
            scale: 0.62,
            rotation: 3,
          }),
        ],
        textBlocks: state.templates.cover.textBlocks.map((textBlock) =>
          textBlock.id === 'cover-title-text'
            ? updateTextBlock(textBlock, {
                enabled: true,
                value: 'Portal 2',
                source: 'manual',
                contentMode: 'html',
                htmlSource: coverTitleHtml,
                align: 'center',
                avoidVisualElements: true,
                layout: {
                  width: 64,
                  x: 50,
                  y: 34,
                  scale: 1.12,
                },
                style: {
                  fontFamily: 'georgia',
                  color: '#00ffaa',
                  bold: true,
                  italic: true,
                  underline: true,
                  backgroundEnabled: true,
                  backgroundColor: '#111827',
                  backgroundOpacity: 0.66,
                  borderEnabled: true,
                  borderColor: '#f8fafc',
                },
              })
            : textBlock),
      },
      tray: {
        ...state.templates.tray,
        logoSlots: [
          makeCaseImageSlot('tray-logo-1', 'Tray logo', {
            x: 82,
            y: 84,
            scale: 0.34,
          }),
        ],
        textBlocks: state.templates.tray.textBlocks.map((textBlock) =>
          textBlock.id === 'tray-description'
            ? updateTextBlock(textBlock, {
                enabled: true,
                value: 'Manual  tray  copy',
                source: 'manual',
                align: 'left',
                avoidVisualElements: true,
                layout: {
                  width: 72,
                  x: 44,
                  y: 58,
                  scale: 1.08,
                },
                style: {
                  color: '#f97316',
                  bold: true,
                  backgroundEnabled: true,
                  backgroundColor: '#0f172a',
                  backgroundOpacity: 0.54,
                },
              })
            : textBlock),
      },
    },
    spine: {
      ...state.spine,
      mirrored: false,
      left: {
        ...state.spine.left,
        title: updateTextBlock(state.spine.left.title, {
          enabled: true,
          value: 'LEFT  SPINE',
          source: 'manual',
          align: 'center',
          layout: {
            width: 86,
            x: 48,
            y: 52,
            scale: 0.92,
          },
          style: {
            color: '#93c5fd',
            bold: true,
          },
        }),
      },
      right: {
        ...state.spine.right,
        title: updateTextBlock(state.spine.right.title, {
          enabled: true,
          value: 'RIGHT  SPINE',
          source: 'manual',
          align: 'center',
          layout: {
            width: 84,
            x: 52,
            y: 48,
            scale: 0.94,
          },
          style: {
            color: '#fca5a5',
            underline: true,
          },
        }),
      },
    },
    export: {
      surfaces: ['front', 'back'],
      guideIds: ['frontSafeBounds'],
    },
  }
}

function createCaseParityFields() {
  const runtime = createCaseParityState()
  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    caseInsert: runtime,
    savedAt: FIXED_SAVED_AT,
  })
  const restored = restoreCaseInsertProjectState(
    cloneThroughProjectFile<SavedCaseInsertProject>(saved),
  ).caseInsert
  const exportInputs = restored
  const runtimeCoverTitle = findById(
    runtime.templates.cover.textBlocks,
    'cover-title-text',
  )
  const savedCoverTitle = findById(
    saved.caseInsert.templates.cover.textBlocks,
    'cover-title-text',
  )
  const restoredCoverTitle = findById(
    restored.templates.cover.textBlocks,
    'cover-title-text',
  )
  const runtimeTrayDescription = findById(
    runtime.templates.tray.textBlocks,
    'tray-description',
  )
  const savedTrayDescription = findById(
    saved.caseInsert.templates.tray.textBlocks,
    'tray-description',
  )
  const restoredTrayDescription = findById(
    restored.templates.tray.textBlocks,
    'tray-description',
  )

  return [
    {
      path: 'case.coverText.title',
      normalize: normalizeProjectParityText,
      values: {
        runtime: runtimeCoverTitle,
        saved: savedCoverTitle,
        restored: restoredCoverTitle,
        export: findById(exportInputs.templates.cover.textBlocks, 'cover-title-text'),
      },
    },
    {
      path: 'case.trayText.description',
      normalize: normalizeProjectParityText,
      values: {
        runtime: runtimeTrayDescription,
        saved: savedTrayDescription,
        restored: restoredTrayDescription,
        export: findById(exportInputs.templates.tray.textBlocks, 'tray-description'),
      },
    },
    {
      path: 'case.leftSpine.title',
      normalize: normalizeProjectParityText,
      values: {
        runtime: runtime.spine.left.title,
        saved: saved.caseInsert.spine.left.title,
        restored: restored.spine.left.title,
        export: exportInputs.spine.left.title,
      },
    },
    {
      path: 'case.rightSpine.title',
      normalize: normalizeProjectParityText,
      values: {
        runtime: runtime.spine.right.title,
        saved: saved.caseInsert.spine.right.title,
        restored: restored.spine.right.title,
        export: exportInputs.spine.right.title,
      },
    },
    {
      path: 'case.coverArtwork.disabledGroupAndSlot',
      normalize: normalizeProjectParityValue,
      values: {
        runtime: {
          enabled: runtime.templates.cover.additionalArtworkEnabled,
          slot: runtime.templates.cover.artworkSlots[0],
        },
        saved: {
          enabled: saved.caseInsert.templates.cover.additionalArtworkEnabled,
          slot: saved.caseInsert.templates.cover.artworkSlots[0],
        },
        restored: {
          enabled: restored.templates.cover.additionalArtworkEnabled,
          slot: restored.templates.cover.artworkSlots[0],
        },
        export: {
          enabled: exportInputs.templates.cover.additionalArtworkEnabled,
          slot: exportInputs.templates.cover.artworkSlots[0],
        },
      },
    },
    {
      path: 'case.trayBranding.logoSlot',
      normalize: normalizeProjectParityImageAsset,
      values: {
        runtime: runtime.templates.tray.logoSlots[0],
        saved: saved.caseInsert.templates.tray.logoSlots[0],
        restored: restored.templates.tray.logoSlots[0],
        export: exportInputs.templates.tray.logoSlots[0],
      },
    },
    {
      path: 'case.exportSettings',
      normalize: normalizeProjectParityExportState,
      values: {
        runtime: runtime.export,
        saved: saved.caseInsert.export,
        restored: restored.export,
        export: exportInputs.export,
      },
    },
  ]
}

test('case insert project fixture preserves text, spines, image slots, branding, disabled visuals, and export inputs', () => {
  assertProjectParityFixtures([
    {
      label: 'caseInsertProject',
      fields: createCaseParityFields(),
    },
  ])
})
