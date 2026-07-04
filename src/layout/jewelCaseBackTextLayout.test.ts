import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProjectJewelCaseState } from '../caseInsert/defaults.ts'
import {
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListItems,
  setCaseInsertTextListEnabled,
  updateCaseInsertTextBlockValue,
} from '../caseInsert/textTransitions.ts'
import {
  updateProjectCaseInsertTemplate,
} from '../caseInsert/templateSurfaceTransitions.ts'
import {
  getCaseInsertBackTextBlockRole,
} from '../caseInsert/textReadability.ts'
import {
  caseInsertFontSizePtToExportPx,
} from '../caseInsert/textSizing.ts'
import { createJewelCasePreviewLayout } from './caseInsertPreviewLayout.ts'
import {
  getJewelCaseBackTextBlockPreviewLayout,
  getJewelCaseBackTextListPreviewLayout,
} from './jewelCaseBackLayout.ts'
import { isPixelRectInsideBounds } from './jewelCaseLayout.ts'

function getRegionBounds(
  layout: ReturnType<typeof createJewelCasePreviewLayout>,
  regionId: string,
) {
  return layout.regions.find((region) => region.regionId === regionId)?.bounds
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

test('tray default metadata text is readable and paint-safe at common point sizes', () => {
  const state = createDefaultProjectJewelCaseState('Untitled Steam Backup Label')
  const layout = createJewelCasePreviewLayout('jewelCase', 'back')
  const safeBounds = getRegionBounds(layout, 'backPanelSafe')
  const titleBlock = state.templates.tray.textBlocks.find(
    ({ id }) => id === 'tray-title-text',
  )

  assert.ok(safeBounds)
  assert.ok(titleBlock)

  const defaultFontSizePt = titleBlock.layout.fontSizePt ?? 24

  for (const fontSizePt of [6, defaultFontSizePt, 72]) {
    const textBlock = {
      ...setCaseInsertTextBlockEnabled(
        updateCaseInsertTextBlockValue(
          titleBlock,
          'Untitled Steam Backup Label',
        ),
        true,
      ),
      layout: {
        ...titleBlock.layout,
        fontSizePt,
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
    assert.equal(
      Math.round(textLayout.fontSizePx * 100) / 100,
      Math.round(caseInsertFontSizePtToExportPx(fontSizePt) * 100) / 100,
    )
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
  const narrowLayout = createTextLayout(42)
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
