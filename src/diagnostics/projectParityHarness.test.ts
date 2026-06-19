import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
} from '../branding/steamBannerDefaults.ts'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from '../caseInsert/defaults.ts'
import { createDefaultProjectDiscNumberArtwork } from '../discText/discNumberArtwork.ts'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import { DEFAULT_EXPORT_GUIDES } from '../export/exportGuides.ts'
import { DEFAULT_ADDITIONAL_ARTWORK_FRAME } from '../project/additionalArtworkFrame.ts'
import {
  createCaseInsertProjectSnapshot,
  restoreCaseInsertProjectState,
} from '../project/caseInsertProjectAdapters.ts'
import { createProjectSnapshot } from '../project/createProjectSnapshot.ts'
import { createDefaultDiscTextValueSources } from '../project/metadataDiscText.ts'
import { createDefaultProjectAdditionalArtwork } from '../project/projectAdditionalArtwork.ts'
import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import { createDefaultProjectPlatformMarks } from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import { createDefaultProjectTechnicalMarks } from '../project/projectTechnicalMarks.ts'
import { createDefaultProjectTitleArtwork } from '../project/projectTitleArtwork.ts'
import { restoreSavedProjectState } from '../project/restoreProjectState.ts'
import { discTemplates } from '../templates/discTemplates.ts'
import { sanitizeHtmlSource } from '../text/htmlText.ts'
import {
  assertProjectParityFixture,
  assertProjectParityFixtures,
  normalizeProjectParityExportState,
  normalizeProjectParityImageAsset,
  normalizeProjectParityLayout,
  normalizeProjectParityStyle,
  normalizeProjectParityText,
  normalizeProjectParityValue,
  type ProjectParityField,
} from './projectParityHarness.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseState,
  SavedCaseInsertProject,
  SavedDiscProject,
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

async function createDiscParityFields(): Promise<ProjectParityField[]> {
  const selectedDiscTemplate = discTemplates.standardPrintableDisc
  const discTextValues = {
    ...createDefaultDiscTextValues(),
    copyright: '© 2026 Valve  Corporation',
    customNote: 'Install  from  backup',
  }
  const discTextTitleValue = 'HELLO  WORLD'
  const discTextSettings = {
    ...DEFAULT_DISC_TEXT_SETTINGS,
    title: true,
    customNote: true,
    copyright: true,
  }
  const discTextLayout = createDefaultDiscTextLayout('top')
  discTextLayout.title = {
    ...discTextLayout.title,
    x: 0,
    y: 28,
    width: 58,
    scale: 1.12,
    align: 'center',
    mode: 'straight',
  }
  discTextLayout.copyright = {
    ...discTextLayout.copyright,
    x: 0,
    y: 0,
    width: 72,
    scale: 0.92,
    align: 'center',
    mode: 'curved',
    arcDegrees: 220,
    arcSide: 'bottom',
  }
  const discTextStyles = createDefaultDiscTextStyles()
  discTextStyles.title = {
    ...discTextStyles.title,
    fontFamily: 'georgia',
    color: '#ff00ff',
    bold: true,
    italic: true,
    underline: true,
    backgroundEnabled: true,
    backgroundColor: '#101827',
    backgroundOpacity: 0.72,
    borderEnabled: true,
    borderColor: '#f8fafc',
  }
  const discTextHtmlSources = {
    title: sanitizeHtmlSource(
      '<p><strong>HELLO</strong> <span style="color: #ff00ff;">WORLD</span></p>',
    ),
  }
  const additionalArtwork = {
    ...createDefaultProjectAdditionalArtwork(),
    enabled: false,
    elements: [
      {
        id: 'additional-artwork-1',
        label: 'Parity artwork',
        source: 'custom' as const,
        sourceId: null,
        sourceLabel: 'parity-artwork.png',
        imageDataUrl: IMAGE_DATA_URL,
        imageSize: { width: 512, height: 512 },
        layout: {
          enabled: true,
          scale: 0.42,
          x: 50,
          y: 66,
        },
        frame: {
          ...DEFAULT_ADDITIONAL_ARTWORK_FRAME,
          enabled: true,
          color: '#ffcc00',
          width: 3,
        },
      },
    ],
  }
  const backgroundImageSource = createUploadedImageSource('disc-background.png')
  const runtime = {
    exportGuides: {
      ...DEFAULT_EXPORT_GUIDES,
      safeZone: true,
    },
    background: {
      enabled: true,
      scale: 1.08,
      offset: { x: 3, y: -2 },
      imageDataUrl: IMAGE_DATA_URL,
      imageSource: backgroundImageSource,
      imageSize: { width: 1024, height: 1024 },
    },
    discTextSettings,
    discTextValues,
    discTextValueSources: {
      ...createDefaultDiscTextValueSources(),
      title: 'manual' as const,
      customNote: 'manual' as const,
      copyright: 'manual' as const,
    },
    discTextTitleValue,
    discTextHtmlSources,
    discTextLayout,
    discTextStyles,
    additionalArtwork,
  }
  const saved = createProjectSnapshot({
    manualGameTitle: 'Parity Disc',
    selectedSteamGame: null,
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(selectedDiscTemplate),
    projectTitleArtwork: createDefaultProjectTitleArtwork(
      selectedDiscTemplate,
      'top',
    ),
    projectDiscNumberArtwork: createDefaultProjectDiscNumberArtwork(),
    projectAdditionalArtwork: runtime.additionalArtwork,
    projectRatingBadge: createDefaultProjectRatingBadge(selectedDiscTemplate),
    projectMediaMark: createDefaultProjectMediaMark(selectedDiscTemplate),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
    selectedDiscTemplateId: 'standardPrintableDisc',
    customDiscTemplate: selectedDiscTemplate,
    steamLogoPlacement: 'top',
    steamBannerColors: DEFAULT_STEAM_BANNER_COLORS,
    steamBannerLockupImageUrl: null,
    steamBannerLockupImageSource: null,
    steamBannerLockupImageSize: null,
    steamBannerLockupLayout: DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
    steamBannerUseTextFallback: false,
    steamBannerFallbackText: DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
    exportGuides: runtime.exportGuides,
    backgroundScale: runtime.background.scale,
    backgroundOffset: runtime.background.offset,
    backgroundImageUrl: runtime.background.imageDataUrl,
    backgroundImageSource: runtime.background.imageSource,
    backgroundImageSize: runtime.background.imageSize,
    isBackgroundArtworkEnabled: runtime.background.enabled,
    discTextSettings: runtime.discTextSettings,
    discTextValues: runtime.discTextValues,
    discTextValueSources: runtime.discTextValueSources,
    discTextTitleValue: runtime.discTextTitleValue,
    discTextHtmlSources: runtime.discTextHtmlSources,
    discTextLayout: runtime.discTextLayout,
    discTextStyles: runtime.discTextStyles,
  })
  const restored = await restoreSavedProjectState(
    cloneThroughProjectFile<SavedDiscProject>(saved),
  )
  const exportInputs = {
    exportGuides: restored.exportGuides,
    background: {
      enabled: restored.isBackgroundArtworkEnabled,
      scale: restored.backgroundScale,
      offset: restored.backgroundOffset,
      imageDataUrl: restored.backgroundImageUrl,
      imageSource: restored.backgroundImageSource,
      imageSize: restored.backgroundImageSize,
    },
    discTextSettings: restored.discTextSettings,
    discTextValues: restored.discTextValues,
    discTextTitleValue: restored.discTextTitleValue,
    discTextHtmlSources: restored.discTextHtmlSources,
    discTextLayout: restored.discTextLayout,
    discTextStyles: restored.discTextStyles,
    additionalArtwork: restored.projectAdditionalArtwork,
  }

  return [
    {
      path: 'disc.straightText.title.enabled',
      values: {
        runtime: runtime.discTextSettings.title,
        saved: saved.discText?.settings?.title,
        restored: restored.discTextSettings.title,
        export: exportInputs.discTextSettings.title,
      },
    },
    {
      path: 'disc.straightText.title.value',
      values: {
        runtime: runtime.discTextTitleValue,
        saved: saved.discText?.titleValue,
        restored: restored.discTextTitleValue,
        export: exportInputs.discTextTitleValue,
      },
    },
    {
      path: 'disc.straightText.title.htmlSource',
      values: {
        runtime: runtime.discTextHtmlSources.title,
        saved: saved.discText?.htmlSources?.title,
        restored: restored.discTextHtmlSources.title,
        export: exportInputs.discTextHtmlSources.title,
      },
    },
    {
      path: 'disc.straightText.title.layout',
      normalize: normalizeProjectParityLayout,
      values: {
        runtime: runtime.discTextLayout.title,
        saved: saved.discText?.layout?.title,
        restored: restored.discTextLayout.title,
        export: exportInputs.discTextLayout.title,
      },
    },
    {
      path: 'disc.straightText.title.style',
      normalize: normalizeProjectParityStyle,
      values: {
        runtime: runtime.discTextStyles.title,
        saved: saved.discText?.styles?.title,
        restored: restored.discTextStyles.title,
        export: exportInputs.discTextStyles.title,
      },
    },
    {
      path: 'disc.curvedCopyright.value',
      values: {
        runtime: runtime.discTextValues.copyright,
        saved: saved.discText?.values?.copyright,
        restored: restored.discTextValues.copyright,
        export: exportInputs.discTextValues.copyright,
      },
    },
    {
      path: 'disc.curvedCopyright.layout',
      normalize: normalizeProjectParityLayout,
      values: {
        runtime: runtime.discTextLayout.copyright,
        saved: saved.discText?.layout?.copyright,
        restored: restored.discTextLayout.copyright,
        export: exportInputs.discTextLayout.copyright,
      },
    },
    {
      path: 'disc.backgroundArtwork',
      normalize: normalizeProjectParityImageAsset,
      values: {
        runtime: runtime.background,
        saved: saved.background,
        restored: exportInputs.background,
        export: exportInputs.background,
      },
    },
    {
      path: 'disc.optionalAdditionalArtwork.disabledPreservedAsset',
      normalize: normalizeProjectParityValue,
      values: {
        runtime: runtime.additionalArtwork,
        saved: saved.additionalArtwork,
        restored: restored.projectAdditionalArtwork,
        export: exportInputs.additionalArtwork,
      },
    },
    {
      path: 'disc.exportGuides',
      normalize: normalizeProjectParityExportState,
      values: {
        runtime: runtime.exportGuides,
        saved: saved.export?.guides,
        restored: restored.exportGuides,
        export: exportInputs.exportGuides,
      },
    },
  ]
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

function createCaseParityFields(): ProjectParityField[] {
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

test('project parity harness reports exact missing and drifting fields', () => {
  assert.throws(
    () => assertProjectParityFixture({
      label: 'diagnostic',
      fields: [
        {
          path: 'missing.saved',
          values: {
            runtime: true,
            restored: true,
          },
        },
      ],
    }),
    /diagnostic\.missing\.saved.*saved/,
  )

  assert.throws(
    () => assertProjectParityFixture({
      label: 'diagnostic',
      fields: [
        {
          path: 'drifting.text',
          values: {
            runtime: 'HELLO',
            saved: 'HELLO',
            restored: 'GOODBYE',
            export: 'HELLO',
          },
        },
      ],
    }),
    /diagnostic\.drifting\.text.*restored differs from runtime/,
  )
})

test('disc project fixture preserves text, curved SVG state, artwork, disabled visuals, and export inputs', async () => {
  assertProjectParityFixtures([
    {
      label: 'discProject',
      fields: await createDiscParityFields(),
    },
  ])
})

test('case insert project fixture preserves text, spines, image slots, branding, disabled visuals, and export inputs', () => {
  assertProjectParityFixtures([
    {
      label: 'caseInsertProject',
      fields: createCaseParityFields(),
    },
  ])
})
