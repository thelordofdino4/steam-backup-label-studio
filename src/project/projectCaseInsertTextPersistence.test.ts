import assert from 'node:assert/strict'
import test from 'node:test'
import {
  updateCaseInsertPreviewTextTargetAlign,
  updateCaseInsertPreviewTextTargetAvoidVisualElements,
  updateCaseInsertPreviewTextTargetLayoutField,
  updateCaseInsertPreviewTextTargetStyleField,
} from '../caseInsert/previewTextControls.ts'
import {
  createCaseInsertProjectSnapshot,
  createDefaultProjectJewelCaseState,
  restoreCaseInsertProjectState,
  updateCaseInsertTextBlockContentMode,
  updateCaseInsertTextListContentMode,
  updateProjectCaseInsertTemplate,
} from './projectCaseInsert.ts'

test('migrated cover and tray text block properties survive save and restore', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')
  const coverTitleTarget = {
    scope: 'templateTextBlock' as const,
    paneId: 'cover' as const,
    textBlockId: 'cover-title-text',
  }
  const trayDescriptionTarget = {
    scope: 'templateTextBlock' as const,
    paneId: 'tray' as const,
    textBlockId: 'tray-description',
  }

  state = updateCaseInsertPreviewTextTargetStyleField(
    state,
    coverTitleTarget,
    'color',
    '#123456',
  )
  state = updateCaseInsertPreviewTextTargetStyleField(
    state,
    coverTitleTarget,
    'backgroundEnabled',
    true,
  )
  state = updateCaseInsertPreviewTextTargetStyleField(
    state,
    coverTitleTarget,
    'bold',
    true,
  )
  state = updateCaseInsertPreviewTextTargetStyleField(
    state,
    coverTitleTarget,
    'underline',
    true,
  )
  state = updateCaseInsertPreviewTextTargetLayoutField(
    state,
    coverTitleTarget,
    'width',
    68,
  )
  state = updateCaseInsertPreviewTextTargetLayoutField(
    state,
    coverTitleTarget,
    'x',
    44,
  )
  state = updateCaseInsertPreviewTextTargetAlign(
    state,
    coverTitleTarget,
    'right',
  )
  state = updateCaseInsertPreviewTextTargetAvoidVisualElements(
    state,
    coverTitleTarget,
    true,
  )
  state = updateCaseInsertPreviewTextTargetStyleField(
    state,
    trayDescriptionTarget,
    'fontFamily',
    'georgia',
  )
  state = updateCaseInsertPreviewTextTargetStyleField(
    state,
    trayDescriptionTarget,
    'italic',
    true,
  )
  state = updateCaseInsertPreviewTextTargetStyleField(
    state,
    trayDescriptionTarget,
    'borderEnabled',
    true,
  )
  state = updateCaseInsertPreviewTextTargetStyleField(
    state,
    trayDescriptionTarget,
    'borderRadius',
    0.85,
  )
  state = updateCaseInsertPreviewTextTargetLayoutField(
    state,
    trayDescriptionTarget,
    'scale',
    1.18,
  )
  state = updateCaseInsertPreviewTextTargetLayoutField(
    state,
    trayDescriptionTarget,
    'y',
    58,
  )

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert
  const restoredCoverTitle = restored.templates.cover.textBlocks.find(
    ({ id }) => id === coverTitleTarget.textBlockId,
  )
  const restoredTrayDescription = restored.templates.tray.textBlocks.find(
    ({ id }) => id === trayDescriptionTarget.textBlockId,
  )

  assert.equal(
    saved.caseInsert.templates.cover.textBlocks.find(
      ({ id }) => id === coverTitleTarget.textBlockId,
    )?.layout.width,
    68,
  )
  assert.equal(restoredCoverTitle?.style.color, '#123456')
  assert.equal(restoredCoverTitle?.style.backgroundEnabled, true)
  assert.equal(restoredCoverTitle?.style.bold, true)
  assert.equal(restoredCoverTitle?.style.underline, true)
  assert.equal(restoredCoverTitle?.layout.width, 68)
  assert.equal(restoredCoverTitle?.layout.x, 44)
  assert.equal(restoredCoverTitle?.align, 'right')
  assert.equal(restoredCoverTitle?.avoidVisualElements, true)
  assert.equal(restoredTrayDescription?.style.fontFamily, 'georgia')
  assert.equal(restoredTrayDescription?.style.italic, true)
  assert.equal(restoredTrayDescription?.style.borderEnabled, true)
  assert.equal(restoredTrayDescription?.style.borderRadius, 0.85)
  assert.equal(restoredTrayDescription?.layout.scale, 1.18)
  assert.equal(restoredTrayDescription?.layout.y, 58)
})

test('case insert HTML text fields survive save and restore', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) => ({
    ...cover,
    textBlocks: cover.textBlocks.map((textBlock) =>
      textBlock.id === 'cover-title-text'
        ? updateCaseInsertTextBlockContentMode(
            textBlock,
            'html',
            '<p>A <strong>bold</strong> title</p>',
          )
        : textBlock),
  }))
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    textLists: tray.textLists.map((textList) =>
      textList.id === 'tray-feature-bullets'
        ? updateCaseInsertTextListContentMode(
            textList,
            'html',
            '<ul><li><strong>Co-op</strong> puzzles</li><li><em>Workshop</em> support</li></ul>',
          )
        : textList),
  }))

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert
  const coverTitle = restored.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )
  const featureList = restored.templates.tray.textLists.find(
    ({ id }) => id === 'tray-feature-bullets',
  )

  assert.equal(coverTitle?.contentMode, 'html')
  assert.equal(coverTitle?.htmlSource, '<p>A <strong>bold</strong> title</p>')
  assert.equal(coverTitle?.value, 'A bold title')
  assert.equal(featureList?.contentMode, 'html')
  assert.equal(
    featureList?.htmlSource,
    '<ul><li><strong>Co-op</strong> puzzles</li><li><em>Workshop</em> support</li></ul>',
  )
  assert.deepEqual(featureList?.items, ['• Co-op puzzles', '• Workshop support'])
})

test('legacy case insert Markdown text fields migrate to HTML on restore', () => {
  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    caseInsert: createDefaultProjectJewelCaseState('Portal 2'),
  })
  const coverTitle = saved.caseInsert.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )
  const featureList = saved.caseInsert.templates.tray.textLists.find(
    ({ id }) => id === 'tray-feature-bullets',
  )

  assert.ok(coverTitle)
  assert.ok(featureList)

  coverTitle.contentMode = 'markdown'
  coverTitle.markdownSource = 'A **legacy** title'
  coverTitle.htmlSource = undefined
  featureList.contentMode = 'markdown'
  featureList.markdownSource = '- **Co-op** puzzles\n- *Workshop* support'
  featureList.htmlSource = undefined

  const restored = restoreCaseInsertProjectState(saved).caseInsert
  const restoredCoverTitle = restored.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )
  const restoredFeatureList = restored.templates.tray.textLists.find(
    ({ id }) => id === 'tray-feature-bullets',
  )

  assert.equal(restoredCoverTitle?.contentMode, 'html')
  assert.equal(
    restoredCoverTitle?.htmlSource,
    '<p>A <strong>legacy</strong> title</p>',
  )
  assert.equal(restoredCoverTitle?.value, 'A legacy title')
  assert.equal(restoredFeatureList?.contentMode, 'html')
  assert.equal(
    restoredFeatureList?.htmlSource,
    '<ul><li><strong>Co-op</strong> puzzles</li><li><em>Workshop</em> support</li></ul>',
  )
  assert.deepEqual(restoredFeatureList?.items, [
    '• Co-op puzzles',
    '• Workshop support',
  ])
})
