import assert from 'node:assert/strict'
import test from 'node:test'
import {
  setCaseInsertPreviewTextTargetEnabled,
  updateCaseInsertPreviewTextTargetAlign,
  updateCaseInsertPreviewTextTargetAvoidVisualElements,
  updateCaseInsertPreviewTextTargetLayoutField,
  updateCaseInsertPreviewTextTargetStyleField,
} from '../caseInsert/previewTextControls.ts'
import {
  createDefaultProjectJewelCaseState,
  getJewelCaseSpineSideScopedId,
  setJewelCaseSpineMirrored,
  updateCaseInsertTextBlockValue,
  updateProjectJewelCaseSpineSides,
} from './projectCaseInsert.ts'

test('case insert preview text controls update existing target state fields', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const coverTitleTarget = {
    scope: 'templateTextBlock' as const,
    paneId: 'cover' as const,
    textBlockId: 'cover-title-text',
  }
  const trayFeaturesTarget = {
    scope: 'templateTextList' as const,
    paneId: 'tray' as const,
    textListId: 'tray-feature-bullets',
  }
  const spineSubtitleTarget = {
    scope: 'spineTextBlock' as const,
    side: 'left' as const,
    textBlockId: 'left-spine-subtitle-text',
  }
  const styledCoverTitle = updateCaseInsertPreviewTextTargetStyleField(
    state,
    coverTitleTarget,
    'color',
    '#ff00ff',
  )
  const positionedCoverTitle = updateCaseInsertPreviewTextTargetLayoutField(
    styledCoverTitle,
    coverTitleTarget,
    'width',
    72,
  )
  const alignedCoverTitle = updateCaseInsertPreviewTextTargetAlign(
    positionedCoverTitle,
    coverTitleTarget,
    'right',
  )
  const avoidantCoverTitle =
    updateCaseInsertPreviewTextTargetAvoidVisualElements(
      alignedCoverTitle,
      coverTitleTarget,
      true,
    )
  const hiddenCoverTitle = setCaseInsertPreviewTextTargetEnabled(
    avoidantCoverTitle,
    coverTitleTarget,
    false,
  )
  const coverTitle = hiddenCoverTitle.templates.cover.textBlocks.find(
    ({ id }) => id === coverTitleTarget.textBlockId,
  )
  const listAlignAttempt = updateCaseInsertPreviewTextTargetAlign(
    hiddenCoverTitle,
    trayFeaturesTarget,
    'right',
  )
  const styledSpineSubtitle = updateCaseInsertPreviewTextTargetStyleField(
    hiddenCoverTitle,
    spineSubtitleTarget,
    'color',
    '#00ff00',
  )
  const leftSubtitle = styledSpineSubtitle.spine.left.textBlocks.find(
    ({ id }) => id === 'left-spine-subtitle-text',
  )
  const rightSubtitle = styledSpineSubtitle.spine.right.textBlocks.find(
    ({ id }) => id === 'right-spine-subtitle-text',
  )

  assert.equal(coverTitle?.style.color, '#ff00ff')
  assert.equal(coverTitle?.layout.width, 72)
  assert.equal(coverTitle?.align, 'right')
  assert.equal(coverTitle?.avoidVisualElements, true)
  assert.equal(coverTitle?.enabled, false)
  assert.equal(listAlignAttempt, hiddenCoverTitle)
  assert.equal(leftSubtitle?.style.color, '#00ff00')
  assert.equal(rightSubtitle?.style.color, '#00ff00')
})

test('mirrored spine side updates fan out until mirror is disabled', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')

  const mirroredState = updateProjectJewelCaseSpineSides(
    state,
    'left',
    (spineSide) => ({
      ...spineSide,
      title: updateCaseInsertTextBlockValue(spineSide.title, 'Shared spine'),
    }),
  )

  assert.equal(mirroredState.spine.left.title.value, 'Shared spine')
  assert.equal(mirroredState.spine.right.title.value, 'Shared spine')
  assert.equal(
    getJewelCaseSpineSideScopedId('right', 'left-spine-artwork-1'),
    'right-spine-artwork-1',
  )

  const independentState = updateProjectJewelCaseSpineSides(
    setJewelCaseSpineMirrored(mirroredState, false),
    'left',
    (spineSide) => ({
      ...spineSide,
      title: updateCaseInsertTextBlockValue(spineSide.title, 'Left only'),
    }),
  )

  assert.equal(independentState.spine.mirrored, false)
  assert.equal(independentState.spine.left.title.value, 'Left only')
  assert.equal(independentState.spine.right.title.value, 'Shared spine')
})
