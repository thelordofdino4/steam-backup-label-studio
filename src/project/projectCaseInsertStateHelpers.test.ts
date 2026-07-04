import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addCaseInsertTemplateImageSlot,
  addCaseInsertTextListItem,
  createCaseInsertProjectSnapshot,
  createDefaultProjectJewelCaseState,
  removeCaseInsertTextListItem,
  restoreCaseInsertProjectState,
  setCaseInsertImageSlotEnabled,
  setCaseInsertImageSlotImage,
  setCaseInsertTextBlockEnabled,
  setCaseInsertTextListEnabled,
  setJewelCaseSpineMirrored,
  updateCaseInsertTextBlockValue,
  updateCaseInsertTextListItem,
  updateProjectCaseInsertTemplate,
  updateProjectJewelCaseSpineSide,
} from './projectCaseInsert.ts'

test('case insert snapshots preserve the active editor pane separately from design data', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) => ({
    ...cover,
    textBlocks: cover.textBlocks.map((textBlock) =>
      textBlock.id === 'cover-custom-note'
        ? updateCaseInsertTextBlockValue(textBlock, 'Cover note stays put')
        : textBlock,
    ),
  }))
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    textBlocks: tray.textBlocks.map((textBlock) =>
      textBlock.id === 'tray-description'
        ? updateCaseInsertTextBlockValue(textBlock, 'Tray note stays put')
        : textBlock,
    ),
  }))

  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2 Case',
    caseInsert: state,
    activeCaseInsertTemplatePane: 'tray',
    savedAt: '2026-06-20T12:00:00.000Z',
  })
  const restored = restoreCaseInsertProjectState(saved)

  assert.equal(saved.editor?.activeCaseInsertTemplatePane, 'tray')
  assert.equal(restored.activeCaseInsertTemplatePane, 'tray')
  assert.equal(
    restored.caseInsert.templates.cover.textBlocks.find(({ id }) =>
      id === 'cover-custom-note')?.value,
    'Cover note stays put',
  )
  assert.equal(
    restored.caseInsert.templates.tray.textBlocks.find(({ id }) =>
      id === 'tray-description')?.value,
    'Tray note stays put',
  )

  const resavedFromCover = createCaseInsertProjectSnapshot({
    manualGameTitle: restored.manualGameTitle,
    projectMetadata: restored.projectMetadata,
    selectedSteamGame: restored.selectedSteamGame,
    caseInsert: restored.caseInsert,
    activeCaseInsertTemplatePane: 'cover',
    savedAt: '2026-06-20T12:30:00.000Z',
  })
  const restoredFromCover = restoreCaseInsertProjectState(resavedFromCover)

  assert.equal(restoredFromCover.activeCaseInsertTemplatePane, 'cover')
  assert.equal(
    restoredFromCover.caseInsert.templates.cover.textBlocks.find(({ id }) =>
      id === 'cover-custom-note')?.value,
    'Cover note stays put',
  )
  assert.equal(
    restoredFromCover.caseInsert.templates.tray.textBlocks.find(({ id }) =>
      id === 'tray-description')?.value,
    'Tray note stays put',
  )
})

test('case insert save and restore preserves spine mirror setting', () => {
  const state = setJewelCaseSpineMirrored(
    createDefaultProjectJewelCaseState('Portal 2'),
    false,
  )
  const saved = createCaseInsertProjectSnapshot({
    manualGameTitle: 'Portal 2',
    caseInsert: state,
  })
  const restored = restoreCaseInsertProjectState(saved).caseInsert

  assert.equal(saved.caseInsert.spine.mirrored, false)
  assert.equal(restored.spine.mirrored, false)
})

test('case update helpers preserve optional state while toggling visibility', () => {
  let state = createDefaultProjectJewelCaseState('Portal 2')

  state = addCaseInsertTemplateImageSlot(state, 'cover', 'artworkSlots')
  state = updateProjectCaseInsertTemplate(state, 'cover', (cover) => ({
    ...cover,
    artworkSlots: cover.artworkSlots.map((slot, index) =>
      index === 0
        ? setCaseInsertImageSlotEnabled(
            setCaseInsertImageSlotImage(slot, {
              imageDataUrl: 'data:image/png;base64,callout',
              imageSize: { width: 640, height: 320 },
              imageSource: {
                source: 'uploaded',
                sourceLabel: 'C:\\Users\\John\\Pictures\\callout.png',
              },
            }),
            false,
          )
        : slot,
    ),
    textBlocks: cover.textBlocks.map((textBlock) =>
      textBlock.id === 'cover-custom-note'
        ? setCaseInsertTextBlockEnabled(
            updateCaseInsertTextBlockValue(textBlock, 'Includes co-op'),
            false,
          )
        : textBlock,
    ),
  }))
  state = updateProjectCaseInsertTemplate(state, 'tray', (tray) => ({
    ...tray,
    textLists: tray.textLists.map((textList, index) =>
      index === 0
        ? setCaseInsertTextListEnabled(
            addCaseInsertTextListItem(textList, 'Two-player puzzles'),
            false,
          )
        : textList,
    ),
  }))
  state = updateProjectJewelCaseSpineSide(state, 'left', (spineSide) => ({
    ...spineSide,
    title: setCaseInsertTextBlockEnabled(
      updateCaseInsertTextBlockValue(spineSide.title, ''),
      false,
    ),
  }))

  const cover = state.templates.cover
  const tray = state.templates.tray

  assert.equal(cover.artworkSlots[0]?.enabled, false)
  assert.equal(cover.artworkSlots[0]?.imageDataUrl, 'data:image/png;base64,callout')
  assert.deepEqual(cover.artworkSlots[0]?.imageSize, { width: 640, height: 320 })
  assert.equal(cover.artworkSlots[0]?.imageSource?.source, 'uploaded')
  assert.equal(cover.artworkSlots[0]?.imageSource?.sourceLabel, 'callout.png')
  assert.equal(
    cover.textBlocks.find(({ id }) => id === 'cover-custom-note')?.enabled,
    false,
  )
  assert.equal(
    cover.textBlocks.find(({ id }) => id === 'cover-custom-note')?.value,
    'Includes co-op',
  )
  assert.equal(tray.textLists[0]?.enabled, false)
  assert.deepEqual(tray.textLists[0]?.items, ['Two-player puzzles'])
  assert.equal(state.spine.left.title.enabled, false)
  assert.equal(state.spine.left.title.value, '')
})

test('feature bullet helpers edit items without replacing feature state', () => {
  let textList = createDefaultProjectJewelCaseState().templates.tray.textLists[0]!

  assert.deepEqual(addCaseInsertTextListItem(textList).items, ['New item'])

  textList = addCaseInsertTextListItem(textList, 'First bullet')
  textList = addCaseInsertTextListItem(textList, 'Second bullet')
  textList = updateCaseInsertTextListItem(textList, 1, 'Updated second bullet')
  textList = removeCaseInsertTextListItem(textList, 0)

  assert.equal(textList.enabled, true)
  assert.deepEqual(textList.items, ['Updated second bullet'])
})
