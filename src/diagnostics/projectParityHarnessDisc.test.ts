import test from 'node:test'
import {
  DEFAULT_STEAM_BANNER_COLORS,
  DEFAULT_STEAM_BANNER_FALLBACK_TEXT,
  DEFAULT_STEAM_BANNER_LOCKUP_LAYOUT,
} from '../branding/steamBannerDefaults.ts'
import { createDefaultProjectDiscNumberArtwork } from '../discText/discNumberArtwork.ts'
import {
  DEFAULT_DISC_TEXT_SETTINGS,
  createDefaultDiscTextLayout,
  createDefaultDiscTextValues,
} from '../discText/index.ts'
import { createDefaultDiscTextStyles } from '../discText/styles.ts'
import { DEFAULT_EXPORT_GUIDES } from '../export/exportGuides.ts'
import { DEFAULT_ADDITIONAL_ARTWORK_FRAME } from '../project/additionalArtworkFrame.ts'
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
  assertProjectParityFixtures,
  normalizeProjectParityExportState,
  normalizeProjectParityImageAsset,
  normalizeProjectParityLayout,
  normalizeProjectParityStyle,
  normalizeProjectParityValue,
  type ProjectParityField,
} from './projectParityHarness.ts'
import type { SavedDiscProject } from '../project/projectTypes.ts'

const IMAGE_DATA_URL = 'data:image/png;base64,cGFyaXR5LWltYWdl'

function cloneThroughProjectFile<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createUploadedImageSource(sourceLabel: string) {
  return createProjectImageAssetProvenance({
    source: 'uploaded',
    sourceId: sourceLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    sourceLabel,
  })
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

test('disc project fixture preserves text, curved SVG state, artwork, disabled visuals, and export inputs', async () => {
  assertProjectParityFixtures([
    {
      label: 'discProject',
      fields: await createDiscParityFields(),
    },
  ])
})
