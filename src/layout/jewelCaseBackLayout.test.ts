import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultCaseInsertImageSlot,
  createDefaultProjectJewelCaseState,
} from '../caseInsert/defaults.ts'
import {
  setCaseInsertImageSlotImage,
} from '../caseInsert/imageSlotTransitions.ts'
import {
  setCaseInsertTextBlockAvoidVisualElements,
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListItems,
  setCaseInsertTextListEnabled,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions.ts'
import {
  addCaseInsertTemplateImageSlot,
  updateProjectCaseInsertTemplate,
} from '../caseInsert/templateSurfaceTransitions.ts'
import {
  getCaseInsertBackTextBlockRole,
} from '../caseInsert/textReadability.ts'
import { createJewelCasePreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseBackBackgroundFit,
  getJewelCaseBackImageSlotPreviewRect,
  getJewelCaseBackImageSlotLayoutSliderRanges,
  getJewelCaseBackScreenshotLayoutSliderRanges,
  getJewelCaseBackTextBlockPreviewLayout,
  getJewelCaseBackTextListPreviewLayout,
} from './jewelCaseBackLayout.ts'
import { isPixelRectInsideBounds } from './jewelCaseLayout.ts'
import {
  createCaseInsertTextAvoidanceRegionFromRect,
} from './caseInsertTextAvoidance.ts'
import {
  createCaseInsertTemplateTextAvoidanceRegions,
} from './caseInsertTextOccupiedRegions.ts'
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

function getRegionBounds(
  layout: ReturnType<typeof createJewelCasePreviewLayout>,
  regionId: string,
) {
  return layout.regions.find((region) => region.regionId === regionId)?.bounds
}

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

function assertTextLinesFitVisualBounds(
  layout: {
    bounds: { x: number; width: number }
    lines: Array<{ left: number; right: number; width: number }>
  },
) {
  for (const line of layout.lines) {
    if (line.width <= 0) continue

    assert.ok(line.left >= layout.bounds.x)
    assert.ok(line.right <= layout.bounds.x + layout.bounds.width)
  }
}

function assertTextLinesHavePaintSlack(
  layout: {
    bounds: { x: number; width: number }
    lines: Array<{ left: number; right: number; width: number }>
  },
) {
  for (const line of layout.lines) {
    if (line.width <= 0) continue

    assert.ok(line.left > layout.bounds.x)
    assert.ok(line.right < layout.bounds.x + layout.bounds.width)
  }
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

test('tray card preview layout fits background to the print surface', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const backBounds = getRegionBounds(layout, 'back')

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    background: setCaseInsertImageSlotImage(tray.background, {
      imageDataUrl: 'data:image/png;base64,back',
      imageSize: { width: 1780, height: 1390 },
    }),
  }))

  const fit = getJewelCaseBackBackgroundFit(
    state.templates.tray.background,
    layout,
  )

  assert.ok(backBounds)
  assert.ok(fit)
  assert.deepEqual(fit.region, backBounds)
  assert.equal(fit.hasEmptySpace, false)
})

test('tray artwork and mark layouts stay inside the panel safe area', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')

  state = addCaseInsertTemplateImageSlot(state, 'tray', 'artworkSlots')
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    artworkSlots: tray.artworkSlots.map((slot, index) =>
      setCaseInsertImageSlotImage(slot, {
        imageDataUrl: `data:image/png;base64,shot-${index + 1}`,
        imageSize: { width: 1280, height: 720 },
      }),
    ),
    markSlots: [
      setCaseInsertImageSlotImage(
        createDefaultCaseInsertImageSlot(
          'tray-mark-1',
          'Mark 1',
          {
            enabled: true,
            fit: 'contain',
            layout: { scale: 1, x: 84, y: 88 },
          },
        ),
        {
          imageDataUrl: 'data:image/png;base64,mark',
          imageSize: { width: 240, height: 320 },
        },
      ),
    ],
  }))

  assert.ok(safeBounds)

  for (const slot of state.templates.tray.artworkSlots) {
    const artworkRect = getJewelCaseBackImageSlotPreviewRect(
      slot,
      layout,
      'artwork',
    )

    assert.ok(artworkRect)
    assert.equal(isPixelRectInsideBounds(artworkRect, safeBounds), true)
  }

  const markRect = getJewelCaseBackImageSlotPreviewRect(
    state.templates.tray.markSlots[0]!,
    layout,
    'mark',
  )

  assert.ok(markRect)
  assert.equal(isPixelRectInsideBounds(markRect, safeBounds), true)
})

test('tray text layouts render readable blocks in the panel safe area', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')

  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    textBlocks: tray.textBlocks.map((textBlock, index) =>
      index === 0
        ? setCaseInsertTextBlockEnabled(
            updateCaseInsertTextBlockValue(textBlock, 'A test chamber classic.'),
            true,
          )
        : textBlock,
    ),
    textLists: tray.textLists.map((textList, index) =>
      index === 0
        ? {
            ...setCaseInsertTextListEnabled(textList, true),
            items: ['Single-player', 'Co-op puzzles'],
          }
        : textList,
    ),
  }))

  const descriptionLayout = getJewelCaseBackTextBlockPreviewLayout(
    state.templates.tray.textBlocks[0]!,
    layout,
    'description',
  )
  const featureLayout = getJewelCaseBackTextListPreviewLayout(
    state.templates.tray.textLists[0]!,
    layout,
  )

  assert.ok(safeBounds)
  assert.ok(descriptionLayout)
  assert.ok(featureLayout)
  assert.equal(isPixelRectInsideBounds(descriptionLayout.bounds, safeBounds), true)
  assert.equal(isPixelRectInsideBounds(featureLayout.bounds, safeBounds), true)
  assert.equal(descriptionLayout.fontSizePx >= safeBounds.width * 0.012, true)
  assert.deepEqual(featureLayout.items, ['Single-player', 'Co-op puzzles'])
})

test('tray text visual bounds include paint slack and width controls wrapping', () => {
  const state = createDefaultProjectJewelCaseState('Warframe')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')
  const baseTextBlock = state.templates.tray.textBlocks[0]!
  const longText =
    'WARFRAME WARFRAME WARFRAME WARFRAME WARFRAME WARFRAME WARFRAME'
  const narrowTextBlock = {
    ...setCaseInsertTextBlockEnabled(
      updateCaseInsertTextBlockValue(baseTextBlock, longText),
      true,
    ),
    layout: {
      ...baseTextBlock.layout,
      width: 24,
      x: 96,
    },
  }
  const wideTextBlock = {
    ...narrowTextBlock,
    layout: {
      ...narrowTextBlock.layout,
      width: 74,
    },
  }
  const narrowLayout = getJewelCaseBackTextBlockPreviewLayout(
    narrowTextBlock,
    layout,
    'description',
  )
  const wideLayout = getJewelCaseBackTextBlockPreviewLayout(
    wideTextBlock,
    layout,
    'description',
  )

  assert.ok(safeBounds)
  assert.ok(narrowLayout)
  assert.ok(wideLayout)
  assert.equal(isPixelRectInsideBounds(narrowLayout.bounds, safeBounds), true)
  assert.equal(isPixelRectInsideBounds(wideLayout.bounds, safeBounds), true)
  assert.ok(narrowLayout.lines.length > wideLayout.lines.length)
  assert.ok(narrowLayout.fontSizePx >= safeBounds.width * 0.012)
  assertTextLinesFitVisualBounds(narrowLayout)
  assertTextLinesHavePaintSlack(wideLayout)
})

test('tray default metadata text is readable and paint-safe at common scales', () => {
  const state = createDefaultProjectJewelCaseState('Warframe')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')
  const titleBlock = state.templates.tray.textBlocks.find(
    ({ id }) => id === 'tray-title-text',
  )

  assert.ok(safeBounds)
  assert.ok(titleBlock)

  for (const scale of [0.7, titleBlock.layout.scale, 1.8]) {
    const textBlock = {
      ...setCaseInsertTextBlockEnabled(
        updateCaseInsertTextBlockValue(titleBlock, 'WARFRAME'),
        true,
      ),
      layout: {
        ...titleBlock.layout,
        scale,
        x: 50,
      },
    }
    const textLayout = getJewelCaseBackTextBlockPreviewLayout(
      textBlock,
      layout,
      getCaseInsertBackTextBlockRole(textBlock),
    )

    assert.ok(textLayout)
    assert.equal(isPixelRectInsideBounds(textLayout.bounds, safeBounds), true)
    assert.ok(textLayout.fontSizePx >= safeBounds.width * 0.012)
    assertTextLinesFitVisualBounds(textLayout)
    assertTextLinesHavePaintSlack(textLayout)
  }
})

test('tray text ink-safe bounds preserve left center and right alignment', () => {
  const state = createDefaultProjectJewelCaseState('Warframe')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')
  const titleBlock = state.templates.tray.textBlocks.find(
    ({ id }) => id === 'tray-title-text',
  )

  assert.ok(safeBounds)
  assert.ok(titleBlock)

  for (const align of ['left', 'center', 'right'] as const) {
    const textBlock = {
      ...setCaseInsertTextBlockEnabled(
        updateCaseInsertTextBlockValue(titleBlock, 'WARFRAME'),
        true,
      ),
      align,
      layout: {
        ...titleBlock.layout,
        x: align === 'left' ? 16 : align === 'right' ? 84 : 50,
      },
    }
    const textLayout = getJewelCaseBackTextBlockPreviewLayout(
      textBlock,
      layout,
      getCaseInsertBackTextBlockRole(textBlock),
    )

    assert.ok(textLayout)
    assert.equal(isPixelRectInsideBounds(textLayout.bounds, safeBounds), true)
    assertTextLinesFitVisualBounds(textLayout)
    assertTextLinesHavePaintSlack(textLayout)
  }
})

test('tray wrap width changes reserved wrapping width without becoming the visible hull', () => {
  const state = createDefaultProjectJewelCaseState('Warframe')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const titleBlock = state.templates.tray.textBlocks.find(
    ({ id }) => id === 'tray-title-text',
  )

  assert.ok(titleBlock)

  const createTextLayout = (width: number) =>
    getJewelCaseBackTextBlockPreviewLayout(
      {
        ...setCaseInsertTextBlockEnabled(
          updateCaseInsertTextBlockValue(titleBlock, 'WARFRAME'),
          true,
        ),
        layout: {
          ...titleBlock.layout,
          width,
          x: 50,
        },
      },
      layout,
      getCaseInsertBackTextBlockRole(titleBlock),
    )
  const narrowLayout = createTextLayout(24)
  const wideLayout = createTextLayout(74)

  assert.ok(narrowLayout)
  assert.ok(wideLayout)
  assert.equal(getJoinedTextLines(narrowLayout), 'WARFRAME')
  assert.equal(getJoinedTextLines(wideLayout), 'WARFRAME')
  assert.equal(narrowLayout.lines.length, wideLayout.lines.length)
  assert.equal(narrowLayout.lines[0]?.width, wideLayout.lines[0]?.width)
  assert.equal(narrowLayout.reservedBounds.width < wideLayout.reservedBounds.width, true)
  assert.ok(
    Math.abs(narrowLayout.bounds.width - wideLayout.bounds.width) < 1,
    'text that fits should keep the same visible bounds when wrap width changes',
  )
})

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

test('tray text list width controls reserved wrapping width', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const textList = setCaseInsertTextListItems(
    setCaseInsertTextListEnabled(state.templates.tray.textLists[0]!, true),
    [
      'Single-player campaign',
      'Online cooperative challenge rooms',
      'Developer commentary',
    ],
  )
  const wideLayout = getJewelCaseBackTextListPreviewLayout(
    {
      ...textList,
      layout: { ...textList.layout, width: 72 },
    },
    layout,
  )
  const narrowLayout = getJewelCaseBackTextListPreviewLayout(
    {
      ...textList,
      layout: { ...textList.layout, width: 30 },
    },
    layout,
  )

  assert.ok(wideLayout)
  assert.ok(narrowLayout)
  assert.equal(narrowLayout.reservedBounds.width < wideLayout.reservedBounds.width, true)
  assert.equal(narrowLayout.lines.length >= wideLayout.lines.length, true)
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
            layout: { ...textBlock.layout, x: 28, y: 31 },
          }
        : textBlock,
    ),
    textLists: tray.textLists.map((textList) =>
      textList.id === 'tray-feature-bullets'
        ? setCaseInsertTextListItems(
            setCaseInsertTextListEnabled(textList, true),
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

test('tray card overlay slider ranges follow rendered image size', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')
  const logoSlot = setCaseInsertImageSlotImage(
    createDefaultCaseInsertImageSlot(
      'tray-logo-1',
      'Logo 1',
      {
        enabled: true,
        fit: 'contain',
        layout: { scale: 1, x: 18, y: 88 },
      },
    ),
    {
      imageDataUrl: 'data:image/png;base64,logo',
      imageSize: { width: 900, height: 300 },
    },
  )
  const smallRanges = getJewelCaseBackImageSlotLayoutSliderRanges(
    logoSlot,
    layout,
    'logo',
  )
  const largeRanges = getJewelCaseBackImageSlotLayoutSliderRanges(
    {
      ...logoSlot,
      layout: { ...logoSlot.layout, scale: 2 },
    },
    layout,
    'logo',
  )
  const maxYRect = getJewelCaseBackImageSlotPreviewRect(
    {
      ...logoSlot,
      layout: { ...logoSlot.layout, y: smallRanges.y.max },
    },
    layout,
    'logo',
  )

  assert.ok(safeBounds)
  assert.ok(maxYRect)
  assert.equal(smallRanges.y.min > 0, true)
  assert.equal(smallRanges.y.max < 100, true)
  assert.equal(
    largeRanges.x.max - largeRanges.x.min <
      smallRanges.x.max - smallRanges.x.min,
    true,
  )
  assert.equal(
    maxYRect.y + maxYRect.height <= safeBounds.y + safeBounds.height,
    true,
  )
})

test('tray screenshot offset slider ranges shrink when crop travel is limited', () => {
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const matchingAspectSlot = setCaseInsertImageSlotImage(
    createDefaultCaseInsertImageSlot(
      'tray-screenshot-1',
      'Screenshot 1',
      {
        enabled: true,
        fit: 'cover',
        layout: { scale: 1, x: 0, y: 0 },
      },
    ),
    {
      imageDataUrl: 'data:image/png;base64,wide',
      imageSize: { width: 1280, height: 720 },
    },
  )
  const tallSlot = setCaseInsertImageSlotImage(
    {
      ...matchingAspectSlot,
      id: 'tray-screenshot-2',
      label: 'Screenshot 2',
    },
    {
      imageDataUrl: 'data:image/png;base64,tall',
      imageSize: { width: 720, height: 1280 },
    },
  )
  const matchingRanges = getJewelCaseBackScreenshotLayoutSliderRanges(
    matchingAspectSlot,
    layout,
    0,
    3,
  )
  const tallRanges = getJewelCaseBackScreenshotLayoutSliderRanges(
    tallSlot,
    layout,
    0,
    3,
  )

  assert.deepEqual(matchingRanges.x, { min: 0, max: 0 })
  assert.deepEqual(matchingRanges.y, { min: 0, max: 0 })
  assert.equal(tallRanges.x.max, 0)
  assert.equal(tallRanges.y.max > 0, true)
  assert.equal(tallRanges.y.max < 100, true)
})
