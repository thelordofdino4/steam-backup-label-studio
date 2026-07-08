import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createDefaultProjectJewelCaseState } from './defaults.ts'
import { updateCaseInsertPreviewTextDraftValue } from './previewTextEditing.ts'
import type { ContextualTextControlId } from '../text/contextualTextControlViewModel.ts'
import {
  addCaseInsertTextListItem,
  removeCaseInsertTextListItem,
  updateCaseInsertTextListItem,
} from './textTransitions.ts'
import {
  getCaseInsertTextSidebarTargetCapability,
  shouldShowCaseInsertTextSidebarControl,
} from './sidebarControlPolicy.ts'
import {
  isCaseInsertAdditionalTextBlock,
  isCaseInsertBackRoleTextBlock,
  isCaseInsertFeatureBulletsTextList,
  isCaseInsertGameDescriptionTextBlock,
  isCaseInsertSystemRequirementsTextBlock,
} from './textContent.ts'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(testDir))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

function getFunctionSource(
  source: string,
  functionName: string,
  nextFunctionName: string,
) {
  const functionPattern = new RegExp(
    `(?:export\\s+)?function\\s+${functionName}\\s*\\(`,
  )
  const nextFunctionPattern = new RegExp(
    `\\n(?:export\\s+)?function\\s+${nextFunctionName}\\s*\\(`,
  )
  const startMatch = functionPattern.exec(source)
  const start = startMatch?.index ?? -1
  const endMatch = start >= 0
    ? nextFunctionPattern.exec(source.slice(start + 1))
    : null
  const end = endMatch ? start + 1 + endMatch.index : -1

  assert.notEqual(start, -1, `${functionName} was not found`)
  assert.notEqual(end, -1, `${nextFunctionName} was not found`)

  return source.slice(start, end)
}

test('cover and tray text block sidebars keep setup and edit-entry controls only', () => {
  const source = readRepoFile(
    'src/components/caseInsert/CaseInsertTemplateTextControls.tsx',
  )
  const textBlockControls = getFunctionSource(
    source,
    'TextBlockControls',
    'TextListControls',
  )

  assert.match(textBlockControls, /handleTextBlockEnabledChange/)
  assert.match(textBlockControls, /Edit in preview/)
  assert.match(textBlockControls, /shouldShowCaseInsertTextSidebarControl/)
  assert.match(textBlockControls, /Select this text in the preview/)
  assert.doesNotMatch(textBlockControls, /CaseInsertTextSourceControls/)
  assert.doesNotMatch(textBlockControls, /onUseMetadataValue/)

  assert.doesNotMatch(
    textBlockControls,
    /const layoutPresets = getCaseInsertTextBlockLayoutPresets\(paneId, textBlock\)/,
  )
  assert.doesNotMatch(textBlockControls, /CaseInsertTextOptionalStyleControls/)
  assert.doesNotMatch(textBlockControls, /CaseInsertTextStyleControls/)
  assert.doesNotMatch(
    textBlockControls,
    /CaseInsertTextBackgroundFineTuneControls/,
  )
  assert.doesNotMatch(textBlockControls, /EditorRangeField/)
  assert.doesNotMatch(textBlockControls, /handleTextBlockStyleChange/)
  assert.doesNotMatch(textBlockControls, /handleTextBlockLayoutChange/)
  assert.doesNotMatch(textBlockControls, /handleTextBlockAlignChange/)
  assert.doesNotMatch(
    textBlockControls,
    /handleTextBlockAvoidVisualElementsChange/,
  )
  assert.doesNotMatch(textBlockControls, /handleApplyTextBlockStylePreset/)
  assert.doesNotMatch(textBlockControls, /handleResetTextBlockLayout/)
  assert.doesNotMatch(textBlockControls, /handleResetTextBlockStyle/)
})

test('cover and tray text block contextual editor keeps layout preset ownership', () => {
  const editor = readRepoFile(
    'src/components/preview/caseInsertInlineTextEditorControls.ts',
  )

  assert.match(editor, /createCaseInsertInlineTextEditorControls/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.layoutPreset/)
  assert.match(editor, /handlers\.onApplyLayoutPreset\(target, presetId\)/)
  assert.match(editor, /layoutPresets\.length > 0/)
})

test('cover and tray text list sidebars keep setup and item-management controls only', () => {
  const source = readRepoFile(
    'src/components/caseInsert/CaseInsertTemplateTextControls.tsx',
  )
  const textListControls = getFunctionSource(
    source,
    'TextListControls',
    'CaseInsertTemplateTextControls',
  )

  assert.match(textListControls, /handleTextListEnabledChange/)
  assert.match(textListControls, /No list items yet/)
  assert.match(textListControls, /Select this list in the preview/)
  assert.match(textListControls, /Edit in preview/)
  assert.match(textListControls, /Add item/)
  assert.match(textListControls, /handleAddTextListItem/)
  assert.match(textListControls, /shouldShowCaseInsertTextSidebarControl/)
  assert.doesNotMatch(textListControls, /CaseInsertTextSourceControls/)

  assert.doesNotMatch(textListControls, /CaseInsertTextOptionalStyleControls/)
  assert.doesNotMatch(textListControls, /CaseInsertTextStyleControls/)
  assert.doesNotMatch(
    textListControls,
    /CaseInsertTextBackgroundFineTuneControls/,
  )
  assert.doesNotMatch(textListControls, /EditorRangeField/)
  assert.doesNotMatch(textListControls, /handleTextListStyleChange/)
  assert.doesNotMatch(textListControls, /handleTextListLayoutChange/)
  assert.doesNotMatch(
    textListControls,
    /handleTextListAvoidVisualElementsChange/,
  )
  assert.doesNotMatch(textListControls, /handleApplyTextListStylePreset/)
  assert.doesNotMatch(textListControls, /handleResetTextListLayout/)
  assert.doesNotMatch(textListControls, /handleResetTextListStyle/)
})

test('case insert sidebar policy omits contextual equivalents', () => {
  const migratedControls = [
    'stylePreset',
    'layoutPreset',
    'fontFamily',
    'size',
    'alignment',
    'bold',
    'bulletedList',
    'italic',
    'underline',
    'color',
    'contrast',
    'backgroundEnabled',
    'backgroundColor',
    'backgroundOpacity',
    'backgroundPadding',
    'borderEnabled',
    'borderColor',
    'borderRadius',
    'respectVisualElements',
    'width',
    'x',
    'y',
    'resetStyle',
    'resetLayout',
    'htmlSource',
    'delete',
  ] as const satisfies readonly ContextualTextControlId[]
  const sidebarOwnedControls = [
    'mode',
    'arcSide',
    'arcDegrees',
  ] as const satisfies readonly ContextualTextControlId[]
  const target = getCaseInsertTextSidebarTargetCapability()

  assert.equal(target.id, 'caseInsertRectangularText')
  assert.equal(target.supportsContextualEditor, true)
  assert.ok(target.contextualControlIds.includes('layoutPreset'))

  for (const controlId of migratedControls) {
    assert.equal(
      shouldShowCaseInsertTextSidebarControl(controlId),
      false,
      `${controlId} should be omitted from text-list sidebar ownership`,
    )
  }

  for (const controlId of sidebarOwnedControls) {
    assert.equal(
      shouldShowCaseInsertTextSidebarControl(controlId),
      true,
      `${controlId} should remain sidebar-eligible without a contextual equivalent`,
    )
  }
})

test('left and right spine title sidebars keep setup and edit-entry controls only', () => {
  const source = readRepoFile(
    'src/components/caseInsert/CaseInsertSpineTextControls.tsx',
  )
  const titleControls = getFunctionSource(
    source,
    'CaseInsertSpineTitleTextControl',
    'SpineTextBlockControls',
  )

  assert.match(titleControls, /handleSpineTitleEnabledChange/)
  assert.match(titleControls, /Select this text in the preview/)
  assert.match(titleControls, /Edit in preview/)
  assert.match(titleControls, /Orientation/)
  assert.match(titleControls, /shouldShowCaseInsertTextSidebarControl/)
  assert.match(titleControls, /handleSpineTitleOrientationChange/)
  assert.doesNotMatch(titleControls, /CaseInsertTextSourceControls/)
  assert.doesNotMatch(titleControls, /onUseMetadataValue/)

  assert.doesNotMatch(
    titleControls,
    /const layoutPresets = getCaseInsertTextBlockLayoutPresets\('spine', title\)/,
  )
  assert.doesNotMatch(titleControls, /CaseInsertTextOptionalStyleControls/)
  assert.doesNotMatch(titleControls, /CaseInsertTextStyleControls/)
  assert.doesNotMatch(
    titleControls,
    /CaseInsertTextBackgroundFineTuneControls/,
  )
  assert.doesNotMatch(titleControls, /EditorRangeField/)
  assert.doesNotMatch(titleControls, /handleSpineTitleStyleChange/)
  assert.doesNotMatch(titleControls, /handleSpineTitleLayoutChange/)
  assert.doesNotMatch(titleControls, /handleSpineTitleAlignChange/)
  assert.doesNotMatch(
    titleControls,
    /handleSpineTitleAvoidVisualElementsChange/,
  )
  assert.doesNotMatch(titleControls, /handleApplySpineTitleStylePreset/)
  assert.doesNotMatch(titleControls, /handleResetSpineTitleLayout/)
  assert.doesNotMatch(titleControls, /handleResetSpineTitleStyle/)
})

test('left and right spine text block sidebars keep setup and edit-entry controls only', () => {
  const source = readRepoFile(
    'src/components/caseInsert/CaseInsertSpineTextControls.tsx',
  )
  const textBlockControls = getFunctionSource(
    source,
    'SpineTextBlockControls',
    'CaseInsertSpineTextControls',
  )

  assert.match(textBlockControls, /handleSpineTextBlockEnabledChange/)
  assert.match(textBlockControls, /Select this text in the preview/)
  assert.match(textBlockControls, /Edit in preview/)
  assert.match(textBlockControls, /Orientation/)
  assert.match(textBlockControls, /shouldShowCaseInsertTextSidebarControl/)
  assert.match(textBlockControls, /handleSpineTextBlockOrientationChange/)
  assert.doesNotMatch(textBlockControls, /CaseInsertTextSourceControls/)
  assert.doesNotMatch(textBlockControls, /onUseMetadataValue/)

  assert.doesNotMatch(
    textBlockControls,
    /const layoutPresets = getCaseInsertTextBlockLayoutPresets\('spine', textBlock\)/,
  )
  assert.doesNotMatch(textBlockControls, /CaseInsertTextOptionalStyleControls/)
  assert.doesNotMatch(textBlockControls, /CaseInsertTextStyleControls/)
  assert.doesNotMatch(
    textBlockControls,
    /CaseInsertTextBackgroundFineTuneControls/,
  )
  assert.doesNotMatch(textBlockControls, /EditorRangeField/)
  assert.doesNotMatch(textBlockControls, /handleSpineTextBlockStyleChange/)
  assert.doesNotMatch(textBlockControls, /handleSpineTextBlockLayoutChange/)
  assert.doesNotMatch(textBlockControls, /handleSpineTextBlockAlignChange/)
  assert.doesNotMatch(
    textBlockControls,
    /handleSpineTextBlockAvoidVisualElementsChange/,
  )
  assert.doesNotMatch(textBlockControls, /handleApplySpineTextBlockStylePreset/)
  assert.doesNotMatch(textBlockControls, /handleResetSpineTextBlockLayout/)
  assert.doesNotMatch(textBlockControls, /handleResetSpineTextBlockStyle/)
})

test('cover and tray text list item management helpers remain wired', () => {
  const editorHook = readRepoFile('src/hooks/useCaseInsertTemplateEditor.ts')
  const transitions = readRepoFile('src/caseInsert/textTransitions.ts')

  assert.match(editorHook, /function handleAddTextListItem/)
  assert.match(editorHook, /function handleTextListItemValueChange/)
  assert.match(editorHook, /function handleRemoveTextListItem/)
  assert.match(editorHook, /handleAddTextListItem,/)
  assert.match(editorHook, /handleTextListItemValueChange,/)
  assert.match(editorHook, /handleRemoveTextListItem,/)

  assert.match(transitions, /export function addCaseInsertTextListItem/)
  assert.match(transitions, /export function updateCaseInsertTextListItem/)
  assert.match(transitions, /export function removeCaseInsertTextListItem/)
  assert.match(transitions, /export function setCaseInsertTextListItems/)
})

test('cover and tray text list item management remains behaviorally intact', () => {
  const state = createDefaultProjectJewelCaseState('Portal 2')
  const textList = state.templates.tray.textLists.find(
    (currentList) => currentList.id === 'tray-feature-bullets',
  )

  assert.ok(textList, 'tray feature bullets list should exist')

  let managedList = addCaseInsertTextListItem(textList, 'Co-op chambers')
  assert.equal(managedList.enabled, true)
  assert.deepEqual(managedList.items, ['Co-op chambers'])

  managedList = updateCaseInsertTextListItem(
    managedList,
    0,
    'Single-player campaign',
  )
  managedList = addCaseInsertTextListItem(managedList, 'Two-player co-op')
  managedList = removeCaseInsertTextListItem(managedList, 1)
  assert.deepEqual(managedList.items, ['Single-player campaign'])

  const target = {
    scope: 'templateTextList',
    paneId: 'tray',
    textListId: textList.id,
  } as const
  const draftState = updateCaseInsertPreviewTextDraftValue(
    state,
    target,
    '• Portal puzzles\n- Co-op chambers\nSpeedrun routes',
  )
  const draftedList = draftState.templates.tray.textLists.find(
    (currentList) => currentList.id === textList.id,
  )
  assert.deepEqual(draftedList?.items, [
    'Portal puzzles',
    'Co-op chambers',
    'Speedrun routes',
  ])

  const reorderedState = updateCaseInsertPreviewTextDraftValue(
    draftState,
    target,
    'Speedrun routes\nPortal puzzles',
  )
  const reorderedList = reorderedState.templates.tray.textLists.find(
    (currentList) => currentList.id === textList.id,
  )
  assert.deepEqual(reorderedList?.items, [
    'Speedrun routes',
    'Portal puzzles',
  ])
})

test('Back Tray text role predicates target only migrated rows', () => {
  assert.equal(
    isCaseInsertGameDescriptionTextBlock({ id: 'tray-description' }),
    true,
  )
  assert.equal(
    isCaseInsertSystemRequirementsTextBlock({
      id: 'tray-minimum-requirements',
    }),
    true,
  )
  assert.equal(
    isCaseInsertSystemRequirementsTextBlock({
      id: 'tray-recommended-requirements',
    }),
    true,
  )
  assert.equal(
    isCaseInsertBackRoleTextBlock({ id: 'tray-description' }),
    true,
  )
  assert.equal(
    isCaseInsertFeatureBulletsTextList({ id: 'tray-feature-bullets' }),
    true,
  )

  for (const id of [
    'tray-title-text',
    'tray-subtitle-text',
    'tray-disc-number',
    'tray-backup-date',
    'tray-steam-app-id',
    'tray-developer-text',
    'tray-publisher-text',
    'tray-install-notes',
    'tray-custom-note',
    'cover-custom-note',
    'left-spine-subtitle-text',
  ]) {
    assert.equal(
      isCaseInsertBackRoleTextBlock({ id }),
      false,
      `${id} should remain outside the Back text role block migration`,
    )
  }

  for (const id of ['cover-feature-bullets', 'spine-feature-bullets']) {
    assert.equal(
      isCaseInsertFeatureBulletsTextList({ id }),
      false,
      `${id} should remain outside the Back feature bullets migration`,
    )
  }
})

test('Additional Text predicate targets only non-title non-legal metadata text rows', () => {
  for (const id of [
    'cover-subtitle-text',
    'cover-disc-number',
    'cover-backup-date',
    'cover-steam-app-id',
    'cover-developer-text',
    'cover-publisher-text',
    'cover-install-notes',
    'cover-custom-note',
    'tray-subtitle-text',
    'tray-disc-number',
    'tray-backup-date',
    'tray-steam-app-id',
    'tray-developer-text',
    'tray-publisher-text',
    'tray-install-notes',
    'tray-custom-note',
    'left-spine-subtitle-text',
    'left-spine-disc-number',
    'left-spine-backup-date',
    'left-spine-steam-app-id',
    'left-spine-developer-text',
    'left-spine-publisher-text',
    'left-spine-install-notes',
    'left-spine-custom-note',
    'right-spine-subtitle-text',
    'right-spine-disc-number',
    'right-spine-backup-date',
    'right-spine-steam-app-id',
    'right-spine-developer-text',
    'right-spine-publisher-text',
    'right-spine-install-notes',
    'right-spine-custom-note',
  ]) {
    assert.equal(
      isCaseInsertAdditionalTextBlock({ id }),
      true,
      `${id} should be owned by Additional Text`,
    )
  }

  for (const id of [
    'cover-title-text',
    'tray-title-text',
    'left-spine-title-text',
    'right-spine-title-text',
    'cover-copyright-text',
    'tray-copyright-text',
    'left-spine-copyright-text',
    'right-spine-copyright-text',
    'tray-description',
    'tray-minimum-requirements',
    'tray-recommended-requirements',
    'tray-feature-bullets',
  ]) {
    assert.equal(
      isCaseInsertAdditionalTextBlock({ id }),
      false,
      `${id} should remain outside Additional Text`,
    )
  }
})

test('case insert export continues reading migrated text block state', () => {
  const source = readRepoFile('src/export/caseInsertTemplateExportLayers.ts')
  const drawTemplateTextBlock = getFunctionSource(
    source,
    'drawTemplateTextBlock',
    'drawTemplateTextList',
  )

  assert.match(drawTemplateTextBlock, /getJewelCaseFrontTextBlockPreviewLayout/)
  assert.match(drawTemplateTextBlock, /getJewelCaseBackTextBlockPreviewLayout/)
  assert.match(drawTemplateTextBlock, /renderedTextBlock\.style/)
  assert.match(drawTemplateTextBlock, /getCaseInsertTextCanvasOptions/)
  assert.match(drawTemplateTextBlock, /drawComputedTextLayout/)
})
