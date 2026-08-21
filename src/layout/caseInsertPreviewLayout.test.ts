import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createJewelCasePreviewLayout,
} from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseFrontBackgroundFit,
  getJewelCaseFrontImageSlotLayoutSliderRanges,
  getJewelCaseFrontImageSlotPreviewRect,
  getJewelCaseFrontTextBlockPreviewLayout,
} from './jewelCaseFrontLayout.ts'
import { createDefaultProjectJewelCaseState } from '../caseInsert/defaults.ts'
import {
  setCaseInsertTextBlockAvoidVisualElements,
  setCaseInsertTextBlockEnabled,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions.ts'
import {
  createCaseInsertTextAvoidanceRegionFromRect,
} from './caseInsertTextAvoidance.ts'
import { getCenteredRectLayoutSliderRanges } from './caseInsertElementSafeZone.ts'
import {
  createCaseInsertSpineTextAvoidanceRegions,
  createCaseInsertTemplateTextAvoidanceRegions,
} from './caseInsertTextOccupiedRegions.ts'
import {
  wrapCaseInsertTextLines,
} from './caseInsertTextVisualLayout.ts'
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
import {
  resolveCaseInsertArtworkViewportRenderArtifact,
} from '../render/caseInsertArtworkViewportRenderArtifact.ts'
import {
  getCaseInsertArtworkViewportLayoutSliderRanges,
} from '../caseInsert/artworkViewportPlacement.ts'
import type { ProjectCaseInsertImageSlot } from '../project/projectTypes.ts'

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

function measureTextAsCharacters(text: string) {
  return Array.from(text).length
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

test('cover sheet preview helpers fit backgrounds and clamp overlays', () => {
  const layout = createJewelCasePreviewLayout()
  const frontSafe = layout.regions.find(({ regionId }) => regionId === 'frontSafe')
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const front = {
    ...state.templates.cover,
    background: {
      ...state.templates.cover.background,
      imageDataUrl: 'data:image/png;base64,background',
      imageSize: { width: 3200, height: 1800 },
      fit: 'cover' as const,
    },
    titleArtwork: {
      ...state.templates.cover.titleArtwork,
      enabled: true,
      imageDataUrl: 'data:image/png;base64,title',
      imageSize: { width: 1200, height: 360 },
      layout: { scale: 1, x: 50, y: 20, rotation: 0 },
    },
    textBlocks: state.templates.cover.textBlocks.map((textBlock) =>
      textBlock.id === 'cover-custom-note'
        ? {
            ...textBlock,
            enabled: true,
            value: 'Includes co-op',
            layout: { scale: 1, x: 99, y: 99, rotation: 0 },
          }
        : textBlock,
    ),
  }
  const customNoteText = front.textBlocks.find(({ id }) =>
    id === 'cover-custom-note')!

  const backgroundFit = getJewelCaseFrontBackgroundFit(front.background, layout)
  const titleRect = getJewelCaseFrontImageSlotPreviewRect(
    front.titleArtwork,
    layout,
    'titleArtwork',
  )
  const customNoteLayout = getJewelCaseFrontTextBlockPreviewLayout(
    customNoteText,
    layout,
  )

  assert.ok(frontSafe)
  assert.ok(backgroundFit)
  assert.ok(titleRect)
  assert.ok(customNoteLayout)
  assert.equal(backgroundFit.hasEmptySpace, false)
  assert.equal(titleRect.x >= frontSafe.bounds.x, true)
  assert.equal(titleRect.y >= frontSafe.bounds.y, true)
  assert.equal(
    titleRect.x + titleRect.width <= frontSafe.bounds.x + frontSafe.bounds.width,
    true,
  )
  assert.equal(
    customNoteLayout.bounds.y + customNoteLayout.bounds.height <=
      frontSafe.bounds.y + frontSafe.bounds.height,
    true,
  )
})

test('cover sheet text avoidance wraps opted-in text around occupied visuals', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const customNote = state.templates.cover.textBlocks.find(({ id }) =>
    id === 'cover-custom-note')
  const text = 'Includes cooperative campaign challenge modes and developer commentary'

  assert.ok(customNote)

  const textBlock = setCaseInsertTextBlockAvoidVisualElements(
    setCaseInsertTextBlockEnabled(
      updateCaseInsertTextBlockValue(
        {
          ...customNote,
          layout: {
            ...customNote.layout,
            fontSizePt: 12,
          },
        },
        text,
      ),
      true,
    ),
    true,
  )
  const baseLayout = getJewelCaseFrontTextBlockPreviewLayout(textBlock, layout)

  assert.ok(baseLayout)

  const logoRegion = createCaseInsertTextAvoidanceRegionFromRect(
    'cover-title-logo',
    'Game logo',
    {
      x: baseLayout.bounds.x + baseLayout.bounds.width * 0.34,
      y: baseLayout.bounds.y,
      width: baseLayout.bounds.width * 0.32,
      height: baseLayout.bounds.height,
    },
  )
  const adjustedLayout = getJewelCaseFrontTextBlockPreviewLayout(
    textBlock,
    layout,
    [logoRegion],
  )

  assert.ok(adjustedLayout)
  assert.equal(adjustedLayout.lines.length > baseLayout.lines.length, true)
  assert.equal(getJoinedTextLines(adjustedLayout), text)
  assert.equal(
    textLineRects(adjustedLayout).some((lineRect) =>
      rectsOverlap(lineRect, logoRegion.bounds)),
    false,
  )
})

test('cover sheet text width controls reserved wrapping width', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const customNote = state.templates.cover.textBlocks.find(({ id }) =>
    id === 'cover-custom-note')
  const text = 'Includes cooperative campaign challenge modes and developer commentary'

  assert.ok(customNote)

  const baseTextBlock = setCaseInsertTextBlockEnabled(
    updateCaseInsertTextBlockValue(customNote, text),
    true,
  )
  const wideLayout = getJewelCaseFrontTextBlockPreviewLayout(
    {
      ...baseTextBlock,
      layout: { ...baseTextBlock.layout, width: 90 },
    },
    layout,
  )
  const narrowLayout = getJewelCaseFrontTextBlockPreviewLayout(
    {
      ...baseTextBlock,
      layout: { ...baseTextBlock.layout, width: 36 },
    },
    layout,
  )

  assert.ok(wideLayout)
  assert.ok(narrowLayout)
  assert.equal(narrowLayout.reservedBounds.width < wideLayout.reservedBounds.width, true)
  assert.equal(narrowLayout.lines.length >= wideLayout.lines.length, true)
})

test('case insert text wrapping preserves typed whitespace for live editing', () => {
  assert.deepEqual(
    wrapCaseInsertTextLines(
      'hello  world ',
      80,
      '10px test',
      measureTextAsCharacters,
    ),
    ['hello  world '],
  )
  assert.deepEqual(
    wrapCaseInsertTextLines(
      'hello world',
      7,
      '10px test',
      measureTextAsCharacters,
    ),
    ['hello', 'world'],
  )
})

test('cover sheet text avoidance wraps around other visible text blocks', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const cover = {
    ...state.templates.cover,
    textBlocks: state.templates.cover.textBlocks.map((textBlock) => {
      if (textBlock.id === 'cover-title-text') {
        return setCaseInsertTextBlockEnabled(
          updateCaseInsertTextBlockValue(textBlock, 'Portal 2', 'manual'),
          true,
        )
      }

      if (textBlock.id === 'cover-custom-note') {
        return {
          ...setCaseInsertTextBlockAvoidVisualElements(
            setCaseInsertTextBlockEnabled(
              updateCaseInsertTextBlockValue(
                textBlock,
                'Includes cooperative campaign challenge modes and commentary',
                'manual',
              ),
              true,
            ),
            true,
          ),
          layout: { ...textBlock.layout, x: 50, y: 34 },
        }
      }

      return textBlock
    }),
  }
  const customNote = cover.textBlocks.find(({ id }) => id === 'cover-custom-note')!
  const baseLayout = getJewelCaseFrontTextBlockPreviewLayout(customNote, layout)
  const avoidanceRegions = createCaseInsertTemplateTextAvoidanceRegions({
    paneId: 'cover',
    templateState: cover,
    layout,
    brandingSources: createBrandingSources(),
  })
  const titleRegion = avoidanceRegions.find(
    (region) => region.sourceTextBlockId === 'cover-title-text',
  )
  const adjustedLayout = getJewelCaseFrontTextBlockPreviewLayout(
    customNote,
    layout,
    avoidanceRegions.filter(
      (region) => region.sourceTextBlockId !== customNote.id,
    ),
  )

  assert.ok(baseLayout)
  assert.ok(titleRegion)
  assert.ok(adjustedLayout)
  assert.equal(
    textLineRects(adjustedLayout).some((lineRect) =>
      rectsOverlap(lineRect, titleRegion.bounds)),
    false,
  )
})

test('cover artwork slider ranges shrink to the front safe area', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const frontSafe = layout.regions.find(
    ({ regionId }) => regionId === 'frontSafe',
  )
  const baseSlot = {
    ...state.templates.cover.titleArtwork,
    enabled: true,
    imageDataUrl: 'data:image/png;base64,title',
    imageSize: { width: 1200, height: 360 },
    layout: { scale: 1, x: 50, y: 24, rotation: 0 },
  }
  const smallRanges = getJewelCaseFrontImageSlotLayoutSliderRanges(
    baseSlot,
    layout,
    'titleArtwork',
  )
  const largeRanges = getJewelCaseFrontImageSlotLayoutSliderRanges(
    {
      ...baseSlot,
      layout: { ...baseSlot.layout, scale: 1.8 },
    },
    layout,
    'titleArtwork',
  )
  const maxXRect = getJewelCaseFrontImageSlotPreviewRect(
    {
      ...baseSlot,
      layout: { ...baseSlot.layout, x: smallRanges.x.max },
    },
    layout,
    'titleArtwork',
  )

  assert.ok(frontSafe)
  assert.ok(maxXRect)
  assert.equal(smallRanges.x.min > 0, true)
  assert.equal(smallRanges.x.max < 100, true)
  assert.equal(
    largeRanges.x.max - largeRanges.x.min <
      smallRanges.x.max - smallRanges.x.min,
    true,
  )
  assert.equal(
    maxXRect.x + maxXRect.width <= frontSafe.bounds.x + frontSafe.bounds.width,
    true,
  )
})

test('reserved artwork text avoidance follows fixed Cover viewport geometry and ignores source aspect', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'front')
  const baseSlot = {
    ...state.templates.cover.titleArtwork,
    id: 'cover-artwork-1',
    label: 'Screenshot',
    enabled: true,
    imageDataUrl: 'data:image/png;base64,screenshot',
    imageSize: { width: 1600, height: 900 },
    fit: 'cover' as const,
    layout: { scale: 1, x: 50, y: 50, rotation: 23 },
    reservedArtworkViewport: {
      kind: 'sbls/case-insert-artwork-viewport' as const,
      formatVersion: 1 as const,
      templateId: 'jewelCase' as const,
      templateRevision: null,
      coordinateBasis: 'frontSafe' as const,
      widthPercent: 26,
      heightPercent: 16,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    },
  }
  const createRegions = (imageSize: ProjectCaseInsertImageSlot['imageSize']) =>
    createCaseInsertTemplateTextAvoidanceRegions({
      paneId: 'cover',
      templateState: {
        ...state.templates.cover,
        additionalArtworkEnabled: true,
        artworkSlots: [{ ...baseSlot, imageSize }],
      },
      layout,
      brandingSources: createBrandingSources(),
    })
  const wideRegion = createRegions({ width: 1600, height: 900 }).find(
    ({ id }) => id === 'cover-artwork-cover-artwork-1',
  )
  const standardRegion = createRegions({ width: 1200, height: 900 }).find(
    ({ id }) => id === 'cover-artwork-cover-artwork-1',
  )
  const resolved = resolveCaseInsertArtworkViewportRenderArtifact({
    owner: 'cover',
    slot: baseSlot,
    layout,
  })
  const ranges = getCaseInsertArtworkViewportLayoutSliderRanges({
    owner: 'cover',
    slot: baseSlot,
    layout,
  })

  assert.ok(wideRegion)
  assert.ok(standardRegion)
  assert.equal(resolved.status, 'resolved')
  assert.ok(ranges)
  assert.deepEqual(wideRegion.bounds, standardRegion.bounds)
  if (resolved.status === 'resolved') {
    assert.deepEqual(wideRegion.bounds, resolved.artifact.boundingRect)
    assert.notDeepEqual(wideRegion.bounds, resolved.artifact.outerRect)
    assert.deepEqual(
      ranges,
      getCenteredRectLayoutSliderRanges(
        resolved.artifact.basisRect,
        resolved.artifact.boundingRect,
      ),
    )
  }

  const transparentRegions = createRegions({
    width: 1600,
    height: 900,
    contentBounds: { x: 0, y: 0, width: 0, height: 0 },
  })
  assert.equal(
    transparentRegions.some(
      ({ id }) => id === 'cover-artwork-cover-artwork-1',
    ),
    false,
  )

  const legacySlot: ProjectCaseInsertImageSlot = {
    ...baseSlot,
    reservedArtworkViewport: null,
  }
  const legacyRegion = createCaseInsertTemplateTextAvoidanceRegions({
    paneId: 'cover',
    templateState: {
      ...state.templates.cover,
      additionalArtworkEnabled: true,
      artworkSlots: [legacySlot],
    },
    layout,
    brandingSources: createBrandingSources(),
  }).find(({ id }) => id === 'cover-artwork-cover-artwork-1')

  assert.deepEqual(
    legacyRegion?.bounds,
    getJewelCaseFrontImageSlotPreviewRect(
      legacySlot,
      layout,
      'calloutArtwork',
    ),
  )
})

test('reserved Spine artwork text avoidance uses the rotated viewport bounding rectangle', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const slot = {
    ...state.spine.left.titleArtwork,
    id: 'left-spine-artwork-1',
    label: 'Spine artwork',
    enabled: true,
    imageDataUrl: 'data:image/png;base64,spine-artwork',
    imageSize: { width: 1200, height: 900 },
    fit: 'contain' as const,
    layout: { scale: 1, x: 50, y: 50, rotation: 37 },
    reservedArtworkViewport: {
      kind: 'sbls/case-insert-artwork-viewport' as const,
      formatVersion: 1 as const,
      templateId: 'jewelCase' as const,
      templateRevision: null,
      coordinateBasis: 'leftSpineSafe' as const,
      widthPercent: 80,
      heightPercent: 24,
      focalPosition: { xPercent: 50, yPercent: 50 },
      zoom: 1,
    },
  }
  const regions = createCaseInsertSpineTextAvoidanceRegions({
    side: 'left',
    spineSide: {
      ...state.spine.left,
      additionalArtworkEnabled: true,
      artworkSlots: [slot],
    },
    layout,
    brandingSources: createBrandingSources(),
  })
  const region = regions.find(
    ({ id }) => id === 'left-spine-artwork-left-spine-artwork-1',
  )
  const resolved = resolveCaseInsertArtworkViewportRenderArtifact({
    owner: 'left-spine',
    slot,
    layout,
  })

  assert.ok(region)
  assert.equal(resolved.status, 'resolved')
  if (resolved.status === 'resolved') {
    assert.deepEqual(region.bounds, resolved.artifact.boundingRect)
    assert.notDeepEqual(region.bounds, resolved.artifact.outerRect)
  }
})
