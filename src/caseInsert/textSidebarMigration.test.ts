import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

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

test('cover and tray text block sidebars keep entry/source controls only', () => {
  const source = readRepoFile(
    'src/components/caseInsert/CaseInsertTemplateControls.tsx',
  )
  const textBlockControls = getFunctionSource(
    source,
    'TextBlockControls',
    'TextListControls',
  )

  assert.match(textBlockControls, /handleTextBlockEnabledChange/)
  assert.match(textBlockControls, /CaseInsertTextSourceControls/)
  assert.match(textBlockControls, /onUseMetadataValue/)
  assert.match(textBlockControls, /Edit in preview/)
  assert.match(textBlockControls, /TextLayoutPresetControl/)
  assert.match(textBlockControls, /Select this text in the preview/)

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
  assert.doesNotMatch(textBlockControls, /handleResetTextBlockLayout/)
  assert.doesNotMatch(textBlockControls, /handleResetTextBlockStyle/)
})

test('cover and tray text list sidebars keep entry/source controls only', () => {
  const source = readRepoFile(
    'src/components/caseInsert/CaseInsertTemplateControls.tsx',
  )
  const textListControls = getFunctionSource(
    source,
    'TextListControls',
    'CaseInsertTemplateArtworkControls',
  )

  assert.match(textListControls, /handleTextListEnabledChange/)
  assert.match(textListControls, /CaseInsertTextSourceControls/)
  assert.match(textListControls, /No list items yet/)
  assert.match(textListControls, /Select this list in the preview/)
  assert.match(textListControls, /Edit in preview/)
  assert.match(textListControls, /Add item/)
  assert.match(textListControls, /handleAddTextListItem/)
  assert.match(textListControls, /TextLayoutPresetControl/)
  assert.match(textListControls, /handleApplyTextListLayoutPreset/)

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

test('left and right spine title sidebars keep entry/source controls only', () => {
  const source = readRepoFile(
    'src/components/caseInsert/CaseInsertSpineControls.tsx',
  )
  const titleControls = getFunctionSource(
    source,
    'SpineTitleControls',
    'SpineTextBlockControls',
  )

  assert.match(titleControls, /handleSpineTitleEnabledChange/)
  assert.match(titleControls, /CaseInsertTextSourceControls/)
  assert.match(titleControls, /onUseMetadataValue/)
  assert.match(titleControls, /Select this text in the preview/)
  assert.match(titleControls, /Edit in preview/)
  assert.match(titleControls, /Orientation/)
  assert.match(titleControls, /SpineTextLayoutPresetControl/)
  assert.match(titleControls, /handleSpineTitleOrientationChange/)
  assert.match(titleControls, /handleApplySpineTitleLayoutPreset/)

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

test('left and right spine text block sidebars keep entry/source controls only', () => {
  const source = readRepoFile(
    'src/components/caseInsert/CaseInsertSpineControls.tsx',
  )
  const textBlockControls = getFunctionSource(
    source,
    'SpineTextBlockControls',
    'SpineImageSlotControls',
  )

  assert.match(textBlockControls, /handleSpineTextBlockEnabledChange/)
  assert.match(textBlockControls, /CaseInsertTextSourceControls/)
  assert.match(textBlockControls, /onUseMetadataValue/)
  assert.match(textBlockControls, /Select this text in the preview/)
  assert.match(textBlockControls, /Edit in preview/)
  assert.match(textBlockControls, /Orientation/)
  assert.match(textBlockControls, /SpineTextLayoutPresetControl/)
  assert.match(textBlockControls, /handleSpineTextBlockOrientationChange/)
  assert.match(textBlockControls, /handleApplySpineTextBlockLayoutPreset/)

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

test('case insert export continues reading migrated text block state', () => {
  const source = readRepoFile('src/export/exportCaseInsertPng.ts')
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
