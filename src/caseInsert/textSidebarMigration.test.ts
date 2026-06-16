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

test('cover and tray text list sidebars keep list management controls', () => {
  const source = readRepoFile(
    'src/components/caseInsert/CaseInsertTemplateControls.tsx',
  )
  const textListControls = getFunctionSource(
    source,
    'TextListControls',
    'CaseInsertTemplateArtworkControls',
  )

  assert.match(textListControls, /CaseInsertTextOptionalStyleControls/)
  assert.match(textListControls, /CaseInsertTextStyleControls/)
  assert.match(textListControls, /CaseInsertTextBackgroundFineTuneControls/)
  assert.match(textListControls, /handleTextListEnabledChange/)
  assert.match(textListControls, /No list items yet/)
  assert.match(textListControls, /Edit in preview/)
  assert.match(textListControls, /Add item/)
  assert.match(textListControls, /handleAddTextListItem/)
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
