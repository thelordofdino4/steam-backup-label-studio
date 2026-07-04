import assert from 'node:assert/strict'
import test from 'node:test'
import {
  finalizeCaseInsertPreviewTextDraft,
  getCaseInsertPreviewTextEditValue,
  updateCaseInsertPreviewTextDraftValue,
} from '../caseInsert/previewTextEditing.ts'
import {
  setCaseInsertPreviewTextTargetEnabled,
  updateCaseInsertPreviewTextTargetContentMode,
} from '../caseInsert/previewTextControls.ts'
import { createDefaultProjectMetadata } from './projectMetadata.ts'
import {
  createDefaultProjectJewelCaseState,
} from './projectCaseInsert.ts'

test('case insert preview text drafts can stay empty until editing completes', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const emptyCoverDraft = updateCaseInsertPreviewTextDraftValue(
    state,
    {
      scope: 'templateTextBlock',
      paneId: 'cover',
      textBlockId: 'cover-title-text',
    },
    '',
  )
  const coverTitle = emptyCoverDraft.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )

  assert.equal(coverTitle?.value, '')
  assert.equal(coverTitle?.source, 'manual')

  const finalizedCoverDraft = finalizeCaseInsertPreviewTextDraft(
    emptyCoverDraft,
    {
      scope: 'templateTextBlock',
      paneId: 'cover',
      textBlockId: 'cover-title-text',
    },
  )
  const finalizedCoverTitle =
    finalizedCoverDraft.templates.cover.textBlocks.find(
      ({ id }) => id === 'cover-title-text',
    )

  assert.equal(finalizedCoverTitle?.value, '')
  assert.equal(finalizedCoverTitle?.source, 'metadata')
})

test('HTML metadata text restores rendered default after empty completion', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const metadata = {
    ...createDefaultProjectMetadata(),
    title: 'Portal 2',
  }
  const coverTitleTarget = {
    scope: 'templateTextBlock' as const,
    paneId: 'cover' as const,
    textBlockId: 'cover-title-text',
  }
  const htmlState = updateCaseInsertPreviewTextTargetContentMode(
    state,
    coverTitleTarget,
    'html',
    metadata,
  )
  const emptyDraft = updateCaseInsertPreviewTextDraftValue(
    htmlState,
    coverTitleTarget,
    '',
  )
  const finalizedDraft = finalizeCaseInsertPreviewTextDraft(
    emptyDraft,
    coverTitleTarget,
  )
  const finalizedCoverTitle =
    finalizedDraft.templates.cover.textBlocks.find(
      ({ id }) => id === 'cover-title-text',
    )

  assert.equal(finalizedCoverTitle?.value, '')
  assert.equal(finalizedCoverTitle?.source, 'metadata')
  assert.equal(
    finalizedCoverTitle
      ? getCaseInsertPreviewTextEditValue(finalizedCoverTitle, metadata)
      : '',
    'Portal 2',
  )
})

test('tray metadata text restores its default after empty completion', () => {
  const state = createDefaultProjectJewelCaseState('Warframe')
  const metadata = {
    ...createDefaultProjectMetadata(),
    title: 'Warframe',
  }
  const trayTitleTarget = {
    scope: 'templateTextBlock' as const,
    paneId: 'tray' as const,
    textBlockId: 'tray-title-text',
  }
  const emptyDraft = updateCaseInsertPreviewTextDraftValue(
    state,
    trayTitleTarget,
    '',
  )
  const editingTrayTitle = emptyDraft.templates.tray.textBlocks.find(
    ({ id }) => id === 'tray-title-text',
  )
  const finalizedDraft = finalizeCaseInsertPreviewTextDraft(
    emptyDraft,
    trayTitleTarget,
    metadata,
  )
  const finalizedTrayTitle = finalizedDraft.templates.tray.textBlocks.find(
    ({ id }) => id === 'tray-title-text',
  )

  assert.equal(editingTrayTitle?.value, '')
  assert.equal(editingTrayTitle?.source, 'manual')
  assert.equal(finalizedTrayTitle?.value, '')
  assert.equal(finalizedTrayTitle?.source, 'metadata')
  assert.equal(
    finalizedTrayTitle
      ? getCaseInsertPreviewTextEditValue(finalizedTrayTitle, metadata)
      : '',
    'Warframe',
  )
})

test('case insert delete remains disabled instead of restoring empty default text', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const coverTitleTarget = {
    scope: 'templateTextBlock' as const,
    paneId: 'cover' as const,
    textBlockId: 'cover-title-text',
  }
  const emptyDraft = updateCaseInsertPreviewTextDraftValue(
    state,
    coverTitleTarget,
    '',
  )
  const deletedDraft = setCaseInsertPreviewTextTargetEnabled(
    emptyDraft,
    coverTitleTarget,
    false,
  )
  const finalizedDraft = finalizeCaseInsertPreviewTextDraft(
    deletedDraft,
    coverTitleTarget,
    {
      ...createDefaultProjectMetadata(),
      title: 'Portal 2',
    },
  )
  const finalizedCoverTitle = finalizedDraft.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )

  assert.equal(finalizedCoverTitle?.enabled, false)
})

test('case insert preview text edit values include metadata defaults', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const metadata = {
    ...createDefaultProjectMetadata(),
    title: 'Portal 2',
    steamAppId: '620',
  }
  const coverTitle = state.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )
  const coverAppId = state.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-steam-app-id',
  )

  assert.equal(
    coverTitle ? getCaseInsertPreviewTextEditValue(coverTitle, metadata) : '',
    'Portal 2',
  )
  assert.equal(
    coverAppId ? getCaseInsertPreviewTextEditValue(coverAppId, metadata) : '',
    'Steam App ID 620',
  )
})

test('case insert HTML source mode seeds metadata-backed defaults from rendered text', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const metadata = {
    ...createDefaultProjectMetadata(),
    title: 'Portal 2',
  }
  const nextState = updateCaseInsertPreviewTextTargetContentMode(
    state,
    {
      scope: 'templateTextBlock',
      paneId: 'tray',
      textBlockId: 'tray-title-text',
    },
    'html',
    metadata,
  )
  const trayTitle = nextState.templates.tray.textBlocks.find(
    ({ id }) => id === 'tray-title-text',
  )

  assert.equal(trayTitle?.contentMode, 'html')
  assert.equal(trayTitle?.htmlSource, '<p>Portal 2</p>')
  assert.equal(trayTitle?.value, 'Portal 2')
})

test('case insert preview text edit values preserve manual whitespace', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const coverTitleDraft = updateCaseInsertPreviewTextDraftValue(
    state,
    {
      scope: 'templateTextBlock',
      paneId: 'cover',
      textBlockId: 'cover-title-text',
    },
    'hello ',
  )
  const titleBlock = coverTitleDraft.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )
  const coverAppIdDraft = updateCaseInsertPreviewTextDraftValue(
    state,
    {
      scope: 'templateTextBlock',
      paneId: 'cover',
      textBlockId: 'cover-steam-app-id',
    },
    'Steam App ID 620 ',
  )
  const appIdBlock = coverAppIdDraft.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-steam-app-id',
  )

  assert.equal(
    titleBlock ? getCaseInsertPreviewTextEditValue(titleBlock) : '',
    'hello ',
  )
  assert.equal(
    appIdBlock ? getCaseInsertPreviewTextEditValue(appIdBlock) : '',
    'Steam App ID 620 ',
  )
})

test('case insert preview title replacement draft commits unchanged words', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const coverTitleTarget = {
    scope: 'templateTextBlock' as const,
    paneId: 'cover' as const,
    textBlockId: 'cover-title-text',
  }
  const coverTitleDraft = updateCaseInsertPreviewTextDraftValue(
    state,
    coverTitleTarget,
    'hello hello',
  )
  const titleBlock = coverTitleDraft.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-title-text',
  )

  assert.equal(titleBlock?.value, 'hello hello')
  assert.equal(titleBlock?.source, 'manual')
  assert.equal(
    titleBlock ? getCaseInsertPreviewTextEditValue(titleBlock) : '',
    'hello hello',
  )

  const finalizedDraft = finalizeCaseInsertPreviewTextDraft(
    coverTitleDraft,
    coverTitleTarget,
  )
  const finalizedTitleBlock =
    finalizedDraft.templates.cover.textBlocks.find(
      ({ id }) => id === 'cover-title-text',
    )

  assert.equal(finalizedTitleBlock?.value, 'hello hello')
  assert.equal(finalizedTitleBlock?.source, 'manual')
})

test('case insert preview text drafts strip rendered prefixes before saving', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const appIdDraft = updateCaseInsertPreviewTextDraftValue(
    state,
    {
      scope: 'templateTextBlock',
      paneId: 'cover',
      textBlockId: 'cover-steam-app-id',
    },
    'Steam App ID 620',
  )
  const coverAppId = appIdDraft.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-steam-app-id',
  )

  assert.equal(coverAppId?.value, '620')
  assert.equal(coverAppId?.source, 'manual')
})

test('case insert preview text draft completion preserves empty custom text', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const emptyCustomDraft = updateCaseInsertPreviewTextDraftValue(
    state,
    {
      scope: 'templateTextBlock',
      paneId: 'cover',
      textBlockId: 'cover-custom-note',
    },
    '',
  )
  const finalizedCustomDraft = finalizeCaseInsertPreviewTextDraft(
    emptyCustomDraft,
    {
      scope: 'templateTextBlock',
      paneId: 'cover',
      textBlockId: 'cover-custom-note',
    },
  )
  const customNote = finalizedCustomDraft.templates.cover.textBlocks.find(
    ({ id }) => id === 'cover-custom-note',
  )

  assert.equal(customNote?.value, '')
  assert.equal(customNote?.source, 'manual')
})
