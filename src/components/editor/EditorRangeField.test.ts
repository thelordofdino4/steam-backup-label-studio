import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('./EditorRangeField.tsx', import.meta.url),
  'utf8',
).replaceAll('\r\n', '\n')

function readSection(startMarker: string, endMarker: string) {
  const startIndex = source.indexOf(startMarker)
  assert.notEqual(startIndex, -1, `missing start marker: ${startMarker}`)

  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length)
  assert.notEqual(endIndex, -1, `missing end marker: ${endMarker}`)

  return source.slice(startIndex, endIndex)
}

const rangeInput = readSection(
  '      <input\n        id={id}',
  '      />\n      <span className="editor-range-number-control"',
)
const numberInput = readSection(
  '        <input\n          id={numberInputId}',
  '        />\n        {unit ?',
)

test('native range input has one live path and no duplicate React change path', () => {
  assert.match(
    rangeInput,
    /onInput=\{[\s\S]*?onInput[\s\S]*?handleRangeInput\(event\.currentTarget\.value\)[\s\S]*?: undefined[\s\S]*?\}/,
  )
  assert.match(
    rangeInput,
    /onChange=\{onInput\s*\? undefined\s*: \(event\) =>\s*onChange\(getEditorRangeFieldValue\(event\.currentTarget\.value\)\)\}/,
  )
  assert.equal(
    rangeInput.match(/handleRangeInput\(event\.currentTarget\.value\)/g)?.length,
    1,
  )
  assert.doesNotMatch(
    rangeInput,
    /onChange=\{[\s\S]*?handleRangeInput/,
  )
})

test('valid number drafts stage live and blur or Enter finishes the exact value', () => {
  const numberChange = readSection(
    '  const handleNumberInputChange = (nextValue: string) => {',
    '  const handleRangeInput = (rawValue: string) => {',
  )
  const finishLiveValue = readSection(
    '  const finishLiveValue = (nextValue?: number) => {',
    '  const commitDraftValue = () => {',
  )
  const commitDraftValue = readSection(
    '  const commitDraftValue = () => {',
    '  const handleNumberInputChange = (nextValue: string) => {',
  )

  assert.match(
    numberChange,
    /const normalizedValue = normalizeDraftValue\(nextValue\)[\s\S]*?if \(normalizedValue !== null\) \{\s*projectLiveValue\(normalizedValue\)\s*\}/,
  )
  assert.match(
    finishLiveValue,
    /continuousEdit\.update\(\{[\s\S]*?value: nextValue,[\s\S]*?project: onInput,[\s\S]*?\}\)[\s\S]*?continuousEdit\.finish\(id\)/,
  )
  assert.match(
    commitDraftValue,
    /finishLiveValue\(normalizedValue\)/,
  )
  assert.match(numberInput, /onBlur=\{commitDraftValue\}/)
  assert.match(
    numberInput,
    /event\.key === 'Enter'[\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.currentTarget\.blur\(\)/,
  )
})

test('invalid number drafts never project and Escape preserves finish semantics', () => {
  const numberChange = readSection(
    '  const handleNumberInputChange = (nextValue: string) => {',
    '  const handleRangeInput = (rawValue: string) => {',
  )
  const commitDraftValue = readSection(
    '  const commitDraftValue = () => {',
    '  const handleNumberInputChange = (nextValue: string) => {',
  )
  const invalidCommit = commitDraftValue.slice(
    commitDraftValue.indexOf('    if (normalizedValue === null) {'),
    commitDraftValue.indexOf('    setDraftState({', commitDraftValue.indexOf('    if (normalizedValue === null) {') + 1),
  )
  const escapeBranch = numberInput.slice(
    numberInput.indexOf("            if (event.key === 'Escape') {"),
  )

  assert.match(
    numberChange,
    /if \(normalizedValue !== null\) \{\s*projectLiveValue\(normalizedValue\)\s*\}/,
  )
  assert.doesNotMatch(invalidCommit, /projectLiveValue|finishLiveValue\([^)]/)
  assert.match(invalidCommit, /continuousEdit\.finish\(id\)/)
  assert.match(invalidCommit, /onInvalidCommit\?\.\(activeDraftState\.draftValue\)/)

  const finishIndex = escapeBranch.indexOf('continuousEdit.finish(id)')
  const resetIndex = escapeBranch.indexOf('setDraftState({')
  assert.ok(finishIndex >= 0 && finishIndex < resetIndex)
  assert.match(escapeBranch, /draftValue: formattedValue/)
  assert.doesNotMatch(escapeBranch, /onChange\(formattedValue\)/)
})

test('range completion handles every native end signal once per active edit', () => {
  const completeRangeInteraction = readSection(
    '  const completeRangeInteraction = (rawValue: string) => {',
    '  return (',
  )

  assert.match(
    completeRangeInteraction,
    /if \(!rangeInteractionActiveRef\.current\) return/,
  )
  assert.match(
    completeRangeInteraction,
    /rangeInteractionActiveRef\.current = false[\s\S]*?finishLiveValue\(getEditorRangeFieldValue\(rawValue\)\)/,
  )

  for (const eventName of [
    'onPointerUp',
    'onPointerCancel',
    'onLostPointerCapture',
    'onBlur',
    'onKeyUp',
  ]) {
    assert.match(
      rangeInput,
      new RegExp(`${eventName}=\\{\\(event\\) =>\\s*completeRangeInteraction\\(event\\.currentTarget\\.value\\)\\}`),
    )
  }
})

test('current values cannot change control classes or width capacity', () => {
  const capacityOwner = readSection(
    '  const numberInputCharacterCapacity = useMemo(',
    '  const numberInputId = `${id}-number`',
  )

  assert.match(
    capacityOwner,
    /getEditorRangeFieldNumberInputCharacterCapacity\(\{\s*max,\s*min,\s*step,\s*\}\)/,
  )
  assert.match(capacityOwner, /\[max, min, step\]/)
  assert.match(
    capacityOwner,
    /'--editor-range-number-input-character-capacity':\s*String\(numberInputCharacterCapacity\)/,
  )
  assert.doesNotMatch(capacityOwner, /draftValue|formattedValue|sliderValue|\[value\]/)
  assert.match(source, /className="editor-range-field-control"/)
  assert.match(source, /className="editor-range-number-control"/)
  assert.match(source, /className="editor-range-number-input"/)
  assert.doesNotMatch(source, /className=\{[^}]*value/)
})

test('native range and number accessibility semantics remain intact', () => {
  assert.match(rangeInput, /type="range"/)
  assert.match(rangeInput, /disabled=\{disabled \|\| sliderDisabled\}/)
  assert.match(rangeInput, /aria-describedby=\{describedBy\}/)
  assert.match(rangeInput, /aria-valuetext=\{sliderValueText\}/)
  assert.doesNotMatch(rangeInput, /role=|tabIndex=/)

  assert.match(numberInput, /type="number"/)
  assert.match(numberInput, /disabled=\{disabled\}/)
  assert.match(numberInput, /aria-label=\{`\$\{label\} value`\}/)
  assert.match(
    numberInput,
    /\[unitId, describedBy\]\.filter\(Boolean\)\.join\(' '\) \|\| undefined/,
  )
  assert.doesNotMatch(numberInput, /role=|tabIndex=/)

  assert.match(source, /<label htmlFor=\{id\}>\{label\}<\/label>/)
  assert.match(source, /htmlFor=\{inputProps\.id\}/)
})
