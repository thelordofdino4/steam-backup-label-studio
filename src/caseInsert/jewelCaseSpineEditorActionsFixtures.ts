import { createProjectImageAssetProvenance } from '../project/projectAssetStatus.ts'
import { createDefaultDiscTextStyle } from '../discText/styles.ts'
import type {
  ProjectCaseInsertImageSlot,
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextBlock,
  ProjectJewelCaseState,
} from '../project/projectTypes.ts'
import type { SteamArtworkAsset } from '../steam/steamApi.ts'

const textLayout: ProjectCaseInsertLayout = {
  scale: 1,
  width: 60,
  x: 50,
  y: 50,
  rotation: 0,
}

export const steamLogoAsset: SteamArtworkAsset = {
  id: 'cdn-logo',
  label: 'Steam CDN logo',
  kind: 'logo',
  url: 'https://cdn.example.test/logo.png',
}

export function createTextBlock(id: string): ProjectCaseInsertTextBlock {
  return {
    id,
    label: id,
    enabled: true,
    value: 'Text',
    source: 'manual',
    avoidVisualElements: false,
    align: 'left',
    layout: textLayout,
    style: createDefaultDiscTextStyle('title'),
  }
}

export function createImageInput(sourceLabel = 'Imported mark') {
  return {
    imageDataUrl: 'data:image/png;base64,new-image',
    imageSize: { width: 320, height: 180 },
    imageSource: {
      source: 'embedded',
      sourceId: 'uploaded-image',
      sourceLabel,
    },
  }
}

export function withSource(
  slot: ProjectCaseInsertImageSlot,
  sourceId: string,
  sourceLabel: string,
) {
  return {
    ...slot,
    imageSource: createProjectImageAssetProvenance({
      source: 'placeholder',
      sourceId,
      sourceLabel,
    }),
  }
}

export function findSpineTextBlock(
  state: ProjectJewelCaseState,
  side: 'left' | 'right',
  textBlockId: string,
) {
  const textBlock = state.spine[side].textBlocks.find(
    (currentTextBlock) => currentTextBlock.id === textBlockId,
  )

  if (!textBlock) {
    throw new Error(`Expected ${side} spine text block ${textBlockId}`)
  }

  return textBlock
}
