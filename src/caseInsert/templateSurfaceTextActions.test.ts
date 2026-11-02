import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ProjectCaseInsertLayout,
  ProjectCaseInsertTextBlock,
  ProjectCaseInsertTextList,
} from '../project/projectTypes.ts'
import {
  createDefaultProjectJewelCaseState,
} from './defaults.ts'
import {
  updateCaseInsertTemplateTextBlock,
  updateCaseInsertTemplateTextList,
  updateProjectCaseInsertTemplate,
} from './templateSurfaceTransitions.ts'
import {
  addCaseInsertTemplateTextListItem,
  getDefaultCaseInsertTemplateTextBlockLayout,
  getDefaultCaseInsertTemplateTextListLayout,
  removeCaseInsertTemplateTextListItem,
  resetCaseInsertTemplateTextListDefaultLayout,
  resetCaseInsertTemplateTextBlockLayout,
  resetCaseInsertTemplateTextListLayout,
  setCaseInsertTemplateTextBlockAlign,
  setCaseInsertTemplateTextListAvoidVisualElements,
  setCaseInsertTemplateTextListEnabled,
  updateCaseInsertTemplateTextListItemValue,
  updateCaseInsertTemplateTextListLayoutField,
  updateCaseInsertTemplateTextListLayoutValue,
} from './templateSurfaceTextActions.ts'
import {
  updateCaseInsertTextBlockLayout,
  updateCaseInsertTextBlockLayoutField,
  updateCaseInsertTextBlockLayoutPosition,
  updateCaseInsertTextListLayout,
  updateCaseInsertTextListLayoutPosition,
} from './textTransitions.ts'

const baseLayout: ProjectCaseInsertLayout = {
  scale: 1,
  width: 70,
  x: 50,
  y: 40,
  rotation: 0,
}

const textBlock = {
  id: 'cover-title-text',
  label: 'Title',
  enabled: true,
  value: 'Half-Life',
  source: 'manual',
  avoidVisualElements: false,
  align: 'left',
  layout: baseLayout,
  style: {},
} as ProjectCaseInsertTextBlock

const textList = {
  id: 'tray-feature-bullets',
  label: 'Features',
  enabled: true,
  items: ['One', 'Two'],
  source: 'manual',
  avoidVisualElements: true,
  layout: baseLayout,
  style: {},
} as ProjectCaseInsertTextList

test('case insert template text action defaults resolve canonical ids', () => {
  assert.deepEqual(
    getDefaultCaseInsertTemplateTextBlockLayout('cover-title-text'),
    { scale: 1, width: 80, x: 50, y: 34, rotation: 0 },
  )
  assert.deepEqual(
    getDefaultCaseInsertTemplateTextBlockLayout('tray-title-text'),
    { scale: 1.18, fontSizePt: 24, width: 74, x: 50, y: 11, rotation: 0 },
  )
  assert.deepEqual(
    getDefaultCaseInsertTemplateTextListLayout('tray-feature-bullets'),
    { scale: 0.68, fontSizePt: 12, width: 36, x: 25, y: 34, rotation: 0 },
  )
})

test('template text block align update preserves the rest of the block', () => {
  const updated = setCaseInsertTemplateTextBlockAlign(textBlock, 'center')

  assert.equal(updated.align, 'center')
  assert.equal(updated.value, textBlock.value)
  assert.equal(updated.layout, textBlock.layout)
})

test('template text block layout reset replaces only the layout object', () => {
  const layout = {
    scale: 0.8,
    width: 52,
    x: 25,
    y: 75,
    rotation: -4,
  }
  const updated = resetCaseInsertTemplateTextBlockLayout(textBlock, layout)

  assert.equal(updated.layout, layout)
  assert.equal(updated.align, textBlock.align)
  assert.equal(updated.style, textBlock.style)
})

test('template text list layout field update preserves other layout fields', () => {
  const updated = updateCaseInsertTemplateTextListLayoutField(textList, 'x', 62)

  assert.deepEqual(updated.layout, {
    ...baseLayout,
    x: 62,
  })
  assert.equal(updated.items, textList.items)
})

test('text layout no-ops preserve block and list reference identity', () => {
  assert.equal(
    updateCaseInsertTextBlockLayout(textBlock, { ...textBlock.layout }),
    textBlock,
  )
  assert.equal(
    updateCaseInsertTextBlockLayoutField(textBlock, 'x', textBlock.layout.x),
    textBlock,
  )
  assert.equal(
    updateCaseInsertTextBlockLayoutField(textBlock, 'y', textBlock.layout.y),
    textBlock,
  )
  assert.equal(
    updateCaseInsertTextBlockLayoutField(
      textBlock,
      'scale',
      textBlock.layout.scale,
    ),
    textBlock,
  )
  assert.equal(
    updateCaseInsertTextBlockLayoutField(
      textBlock,
      'rotation',
      textBlock.layout.rotation,
    ),
    textBlock,
  )
  assert.equal(
    updateCaseInsertTextBlockLayoutPosition(textBlock, {
      x: textBlock.layout.x,
      y: textBlock.layout.y,
    }),
    textBlock,
  )
  assert.equal(
    updateCaseInsertTextListLayout(textList, { ...textList.layout }),
    textList,
  )
  assert.equal(
    updateCaseInsertTextListLayoutPosition(textList, {
      x: textList.layout.x,
      y: textList.layout.y,
    }),
    textList,
  )
})

test('real text layout width and point-size changes preserve existing behavior', () => {
  const widthChanged = updateCaseInsertTextBlockLayoutField(
    textBlock,
    'width',
    82,
  )
  const pointSizeChanged = updateCaseInsertTextBlockLayoutField(
    textBlock,
    'fontSizePt',
    24,
  )
  const listWidthChanged = updateCaseInsertTextListLayout(textList, {
    ...textList.layout,
    width: 84,
  })
  const listPointSizeChanged = updateCaseInsertTextListLayout(textList, {
    ...textList.layout,
    fontSizePt: 18,
  })

  assert.notEqual(widthChanged, textBlock)
  assert.equal(widthChanged.layout.width, 82)
  assert.equal(widthChanged.value, textBlock.value)
  assert.notEqual(pointSizeChanged, textBlock)
  assert.equal(pointSizeChanged.layout.fontSizePt, 24)
  assert.equal(pointSizeChanged.style, textBlock.style)
  assert.notEqual(listWidthChanged, textList)
  assert.equal(listWidthChanged.layout.width, 84)
  assert.equal(listWidthChanged.items, textList.items)
  assert.notEqual(listPointSizeChanged, textList)
  assert.equal(listPointSizeChanged.layout.fontSizePt, 18)
  assert.equal(listPointSizeChanged.style, textList.style)
})

test('template text list layout reset replaces only the layout object', () => {
  const layout = {
    scale: 1.1,
    width: 64,
    x: 38,
    y: 44,
    rotation: 2,
  }
  const updated = resetCaseInsertTemplateTextListLayout(textList, layout)

  assert.equal(updated.layout, layout)
  assert.equal(updated.items, textList.items)
  assert.equal(updated.style, textList.style)
})

test('template text list action helpers update only the target cover or tray list', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const coverLists = state.templates.cover.textLists
  const trayList = state.templates.tray.textLists[0]

  assert.ok(trayList)

  const enabled = setCaseInsertTemplateTextListEnabled(
    state,
    'tray',
    trayList.id,
    true,
  )
  const withItem = addCaseInsertTemplateTextListItem(
    enabled,
    'tray',
    trayList.id,
  )
  const withUpdatedItem = updateCaseInsertTemplateTextListItemValue(
    withItem,
    'tray',
    trayList.id,
    trayList.items.length,
    'Controller support',
  )
  const withAvoidance = setCaseInsertTemplateTextListAvoidVisualElements(
    withUpdatedItem,
    'tray',
    trayList.id,
    true,
  )

  const updatedList = withAvoidance.templates.tray.textLists[0]

  assert.equal(withAvoidance.templates.cover.textLists, coverLists)
  assert.equal(updatedList?.enabled, true)
  assert.equal(updatedList?.items.at(-1), 'Controller support')
  assert.equal(updatedList?.avoidVisualElements, true)
})

test('template text list layout helpers preserve list identity and unrelated surfaces', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const trayList = state.templates.tray.textLists[0]

  assert.ok(trayList)

  const moved = updateCaseInsertTemplateTextListLayoutValue(
    state,
    'tray',
    trayList.id,
    'x',
    63,
  )
  const reset = resetCaseInsertTemplateTextListDefaultLayout(
    moved,
    'tray',
    trayList.id,
  )
  const unchanged = resetCaseInsertTemplateTextListDefaultLayout(
    reset,
    'tray',
    'unknown-list',
  )
  const removed = removeCaseInsertTemplateTextListItem(
    unchanged,
    'tray',
    trayList.id,
    0,
  )

  assert.equal(moved.templates.tray.textLists[0]?.layout.x, 63)
  assert.deepEqual(
    reset.templates.tray.textLists[0]?.layout,
    trayList.layout,
  )
  assert.equal(unchanged, reset)
  assert.deepEqual(
    removed.templates.tray.textLists[0]?.items,
    trayList.items.slice(1),
  )
  assert.equal(removed.templates.cover, state.templates.cover)
})

test('template text transition no-ops preserve complete root identity', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const coverBlock = state.templates.cover.textBlocks[0]
  const trayList = state.templates.tray.textLists[0]

  assert.ok(coverBlock)
  assert.ok(trayList)

  const directNoop = updateProjectCaseInsertTemplate(
    state,
    'cover',
    (surface) => surface,
  )
  const blockNoop = updateCaseInsertTemplateTextBlock(
    state,
    'cover',
    coverBlock.id,
    (block) => updateCaseInsertTextBlockLayoutPosition(block, {
      x: block.layout.x,
      y: block.layout.y,
    }),
  )
  const listNoop = updateCaseInsertTemplateTextList(
    state,
    'tray',
    trayList.id,
    (list) => updateCaseInsertTextListLayout(list, { ...list.layout }),
  )
  const changed = updateCaseInsertTemplateTextBlock(
    state,
    'cover',
    coverBlock.id,
    (block) => updateCaseInsertTextBlockLayoutField(
      block,
      'rotation',
      block.layout.rotation + 1,
    ),
  )

  assert.equal(directNoop, state)
  assert.equal(blockNoop, state)
  assert.equal(listNoop, state)
  assert.notEqual(changed, state)
  assert.notEqual(changed.templates.cover, state.templates.cover)
  assert.equal(
    changed.templates.cover.textBlocks[0]?.layout.rotation,
    coverBlock.layout.rotation + 1,
  )
  assert.equal(
    changed.templates.cover.textBlocks[1],
    state.templates.cover.textBlocks[1],
  )
  assert.equal(changed.templates.tray, state.templates.tray)
})
