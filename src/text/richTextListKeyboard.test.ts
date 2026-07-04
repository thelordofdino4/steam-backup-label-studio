import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyEnterInsideBulletedLine,
  applySoftBreakInsideBulletedLine,
  getRichTextDocumentForListKeyboard,
} from './richTextListKeyboard.ts'

test('list keyboard document parser promotes visible bullet text to list lines', () => {
  const document = getRichTextDocumentForListKeyboard({
    fallbackText: '• Alpha\nPlain',
  })

  assert.equal(document.plainText, '• Alpha\nPlain')
  assert.equal(document.source, '<ul><li>Alpha</li></ul><p>Plain</p>')
  assert.deepEqual(
    document.lines.map((line) => ({
      prefix: line.list?.prefix,
      text: line.text,
      type: line.list?.type,
    })),
    [
      { prefix: '• ', text: '• Alpha', type: 'ul' },
      { prefix: undefined, text: 'Plain', type: undefined },
    ],
  )
})

test('enter helper splits a styled bullet item into the next list item', () => {
  const document = getRichTextDocumentForListKeyboard({
    fallbackText: '• AlphaBeta',
    htmlSource: '<ul><li><strong>AlphaBeta</strong></li></ul>',
  })
  const line = document.lines[0]
  assert.ok(line)

  const mutation = applyEnterInsideBulletedLine({
    document,
    line,
    lineIndex: 0,
    lineOffset: '• Alpha'.length,
    lineStart: 0,
  })

  assert.deepEqual(
    mutation.document.lines.map((candidate) => candidate.text),
    ['• Alpha', '• Beta'],
  )
  assert.equal(mutation.document.lines[1]?.list?.type, 'ul')
  assert.ok(
    mutation.document.lines[0]?.runs.some((run) =>
      run.text === 'Alpha' && run.bold),
  )
  assert.ok(
    mutation.document.lines[1]?.runs.some((run) =>
      run.text === 'Beta' && run.bold),
  )
  assert.deepEqual(mutation.selection, {
    end: '• Alpha\n• '.length,
    start: '• Alpha\n• '.length,
  })
})

test('soft break helper creates a continuation line inside a bullet item', () => {
  const document = getRichTextDocumentForListKeyboard({
    fallbackText: '• AlphaBeta',
    htmlSource: '<ul><li>AlphaBeta</li></ul>',
  })
  const line = document.lines[0]
  assert.ok(line)

  const mutation = applySoftBreakInsideBulletedLine({
    document,
    line,
    lineIndex: 0,
    lineOffset: '• Alpha'.length,
    lineStart: 0,
  })

  assert.deepEqual(
    mutation.document.lines.map((candidate) => candidate.text),
    ['• Alpha', 'Beta'],
  )
  assert.equal(mutation.document.lines[1]?.list?.continuation, true)
  assert.deepEqual(mutation.selection, {
    end: '• Alpha\n'.length,
    start: '• Alpha\n'.length,
  })
})

test('enter helper exits an empty bullet without carrying list metadata', () => {
  const document = getRichTextDocumentForListKeyboard({
    fallbackText: '• ',
    htmlSource: '<ul><li></li></ul>',
  })
  const line = document.lines[0]
  assert.ok(line)

  const mutation = applyEnterInsideBulletedLine({
    document,
    line,
    lineIndex: 0,
    lineOffset: '• '.length,
    lineStart: 0,
  })

  assert.deepEqual(mutation.document.lines[0], {
    runs: [],
    text: '',
  })
  assert.deepEqual(mutation.selection, { end: 0, start: 0 })
})
