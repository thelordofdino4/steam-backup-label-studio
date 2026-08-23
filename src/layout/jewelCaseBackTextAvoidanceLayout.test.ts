import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProjectJewelCaseState } from '../caseInsert/defaults.ts'
import {
  setCaseInsertTextBlockAvoidVisualElements,
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListItems,
  setCaseInsertTextListEnabled,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions.ts'
import {
  updateProjectCaseInsertTemplate,
} from '../caseInsert/templateSurfaceTransitions.ts'
import { createDefaultProjectLogoAssets } from '../project/projectLogoAssets.ts'
import { createDefaultProjectMediaMark } from '../project/projectMediaMark.ts'
import { createDefaultProjectMetadata } from '../project/projectMetadata.ts'
import {
  createDefaultProjectPlatformMarks,
} from '../project/projectPlatformMarks.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import {
  createDefaultProjectTechnicalMarks,
} from '../project/projectTechnicalMarks.ts'
import { createJewelCasePreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseBackTextBlockPreviewLayout,
} from './jewelCaseBackLayout.ts'
import {
  createCaseInsertTextAvoidanceRegionFromRect,
} from './caseInsertTextAvoidance.ts'
import {
  createCaseInsertTemplateTextAvoidanceRegions,
} from './caseInsertTextOccupiedRegions.ts'

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
}

function textLineRects(
  layout: {
    lineHeightPx: number
    lines: Array<{ left: number; y: number; width: number }>
  },
) {
  return layout.lines.map((line) => ({
    x: line.left,
    y: line.y,
    width: line.width,
    height: layout.lineHeightPx,
  }))
}

function getJoinedTextLines(
  layout: { lines: Array<{ text: string }> },
) {
  return layout.lines.map((line) => line.text).join(' ').replace(/\s+/g, ' ').trim()
}

function createBrandingSources() {
  return {
    projectMetadata: createDefaultProjectMetadata(),
    projectLogoAssets: createDefaultProjectLogoAssets(),
    projectRatingBadge: createDefaultProjectRatingBadge(),
    projectMediaMark: createDefaultProjectMediaMark(),
    projectPlatformMarks: createDefaultProjectPlatformMarks(),
    projectTechnicalMarks: createDefaultProjectTechnicalMarks(),
  }
}

test('tray text avoidance wraps opted-in text around occupied visuals', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const text = 'A test chamber classic with online co-op support.'

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    textBlocks: tray.textBlocks.map((textBlock, index) =>
      index === 0
        ? setCaseInsertTextBlockAvoidVisualElements(
            setCaseInsertTextBlockEnabled(
              updateCaseInsertTextBlockValue(
                textBlock,
                text,
              ),
              true,
            ),
            true,
          )
        : textBlock,
    ),
  }))

  const textBlock = state.templates.tray.textBlocks[0]!
  const baseLayout = getJewelCaseBackTextBlockPreviewLayout(
    textBlock,
    layout,
    'description',
  )

  assert.ok(baseLayout)

  const ratingBadgeRegion = createCaseInsertTextAvoidanceRegionFromRect(
    'rating-badge',
    'Rating badge',
    {
      x: baseLayout.bounds.x + baseLayout.bounds.width * 0.48,
      y: baseLayout.bounds.y,
      width: baseLayout.bounds.width * 0.32,
      height: baseLayout.bounds.height,
    },
  )
  const adjustedLayout = getJewelCaseBackTextBlockPreviewLayout(
    textBlock,
    layout,
    'description',
    [ratingBadgeRegion],
  )
  const disabledLayout = getJewelCaseBackTextBlockPreviewLayout(
    {
      ...textBlock,
      avoidVisualElements: false,
    },
    layout,
    'description',
    [ratingBadgeRegion],
  )

  assert.ok(adjustedLayout)
  assert.ok(disabledLayout)
  assert.deepEqual(disabledLayout.bounds, baseLayout.bounds)
  assert.equal(adjustedLayout.lines.length > baseLayout.lines.length, true)
  assert.equal(getJoinedTextLines(adjustedLayout), text)
  assert.equal(
    textLineRects(adjustedLayout).some((lineRect) =>
      rectsOverlap(lineRect, ratingBadgeRegion.bounds)),
    false,
  )
  assert.equal(
    adjustedLayout.lines.some((line) =>
      line.right <= ratingBadgeRegion.bounds.x ||
      line.left >= ratingBadgeRegion.bounds.x + ratingBadgeRegion.bounds.width),
    true,
  )
})

test('tray text avoidance wraps around other visible text lists', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    textBlocks: tray.textBlocks.map((textBlock) =>
      textBlock.id === 'tray-description'
        ? {
            ...setCaseInsertTextBlockAvoidVisualElements(
              setCaseInsertTextBlockEnabled(
                updateCaseInsertTextBlockValue(
                  textBlock,
                  'A test chamber classic with online co-op support and challenge rooms.',
                  'manual',
                ),
                true,
              ),
              true,
            ),
            layout: { ...textBlock.layout, fontSizePt: 10, x: 28, y: 31 },
          }
        : textBlock,
    ),
    textLists: tray.textLists.map((textList) =>
      textList.id === 'tray-feature-bullets'
        ? setCaseInsertTextListItems(
            {
              ...setCaseInsertTextListEnabled(textList, true),
              layout: { ...textList.layout, fontSizePt: 10 },
            },
            ['Single-player', 'Co-op puzzles', 'Challenge rooms'],
          )
        : textList,
    ),
  }))

  const tray = state.templates.tray
  const description = tray.textBlocks.find(({ id }) => id === 'tray-description')!
  const baseLayout = getJewelCaseBackTextBlockPreviewLayout(
    description,
    layout,
    'description',
  )
  const avoidanceRegions = createCaseInsertTemplateTextAvoidanceRegions({
    paneId: 'tray',
    templateState: tray,
    layout,
    brandingSources: createBrandingSources(),
  })
  const featureListRegion = avoidanceRegions.find(
    (region) => region.sourceTextListId === 'tray-feature-bullets',
  )
  const adjustedLayout = getJewelCaseBackTextBlockPreviewLayout(
    description,
    layout,
    'description',
    avoidanceRegions.filter(
      (region) => region.sourceTextBlockId !== description.id,
    ),
  )

  assert.ok(baseLayout)
  assert.ok(featureListRegion)
  assert.ok(adjustedLayout)
  assert.equal(
    textLineRects(adjustedLayout).some((lineRect) =>
      rectsOverlap(lineRect, featureListRegion.bounds)),
    false,
  )
})

test('reserved Tray artwork avoidance is source-independent and remains outside both spines', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const baseSlot = {
    ...state.templates.tray.titleArtwork,
    id: 'tray-artwork-1',
    label: 'Screenshot',
    enabled: true,
    imageDataUrl: 'data:image/png;base64,screenshot',
    fit: 'cover' as const,
    layout: { scale: 1, x: 50, y: 50, rotation: 0 },
    reservedArtworkViewport: {
      kind: 'sbls/case-insert-artwork-viewport' as const,
      formatVersion: 1 as const,
      templateId: 'jewelCase' as const,
      templateRevision: null,
      coordinateBasis: 'backPanelSafe' as const,
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    },
  }
  const createArtworkRegion = (imageSize: { width: number; height: number }) =>
    createCaseInsertTemplateTextAvoidanceRegions({
      paneId: 'tray',
      templateState: {
        ...state.templates.tray,
        additionalArtworkEnabled: true,
        artworkSlots: [{ ...baseSlot, imageSize }],
      },
      layout,
      brandingSources: createBrandingSources(),
    }).find(({ id }) => id === 'tray-artwork-tray-artwork-1')

  const wideRegion = createArtworkRegion({ width: 1600, height: 900 })
  const standardRegion = createArtworkRegion({ width: 1200, height: 900 })
  const backPanelSafe = layout.regions.find(
    ({ regionId }) => regionId === 'backPanelSafe',
  )
  const leftSpineSafe = layout.regions.find(
    ({ regionId }) => regionId === 'leftSpineSafe',
  )
  const rightSpineSafe = layout.regions.find(
    ({ regionId }) => regionId === 'rightSpineSafe',
  )

  assert.ok(wideRegion)
  assert.ok(standardRegion)
  assert.ok(backPanelSafe)
  assert.ok(leftSpineSafe)
  assert.ok(rightSpineSafe)
  assert.deepEqual(wideRegion.bounds, standardRegion.bounds)
  assert.equal(rectsOverlap(wideRegion.bounds, leftSpineSafe.bounds), false)
  assert.equal(rectsOverlap(wideRegion.bounds, rightSpineSafe.bounds), false)
  assert.equal(
    wideRegion.bounds.x >= backPanelSafe.bounds.x &&
      wideRegion.bounds.x + wideRegion.bounds.width <=
        backPanelSafe.bounds.x + backPanelSafe.bounds.width,
    true,
  )
})
