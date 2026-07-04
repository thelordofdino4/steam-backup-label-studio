import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  CURVED_DISC_TEXT_EXCEPTION,
} from '../../editor/previewEditableRegistry.ts'
import {
  CONTEXTUAL_TEXT_TARGET_CAPABILITIES,
} from '../../text/contextualTextControlViewModel.ts'
import {
  assertCurvedDiscTextContextualEditorException,
  CURVED_DISC_TEXT_CONTEXTUAL_EDITOR_EXCEPTION,
} from './inlinePreviewTextEditorContract.ts'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(dirname(currentDir)))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

test('curved disc text remains outside the rectangular adapter contract', () => {
  assertCurvedDiscTextContextualEditorException()
  assert.deepEqual(CURVED_DISC_TEXT_CONTEXTUAL_EDITOR_EXCEPTION, {
    finalRenderer: 'disc-svg-textPath',
    reason:
      'Curved disc text remains SVG/textPath based and uses a contextual menu adapter without rectangular on-canvas text input.',
    surface: 'curved-disc-text',
    supportsContextualEditor: true,
  })
  assert.equal(
    CONTEXTUAL_TEXT_TARGET_CAPABILITIES.curvedDiscCopyrightText
      .supportsContextualEditor,
    true,
  )
  assert.deepEqual(
    CONTEXTUAL_TEXT_TARGET_CAPABILITIES.curvedDiscCopyrightText
      .contextualControlIds,
    [
      'stylePreset',
      'layoutPreset',
      'fontFamily',
      'size',
      'alignment',
      'bold',
      'italic',
      'underline',
      'color',
      'contrast',
      'x',
      'y',
      'lineSpacing',
      'arcSide',
      'arcDegrees',
      'htmlSource',
      'resetStyle',
      'resetLayout',
      'delete',
    ],
  )
  assert.equal(CURVED_DISC_TEXT_EXCEPTION.renderer, 'svgTextPath')
})

test('adapter ownership does not introduce a fake visible renderer', () => {
  const discAdapter = readRepoFile(
    'src/components/preview/DiscInlineTextEditorLayer.tsx',
  )
  const discLayer = readRepoFile('src/components/preview/DiscTextLayer.tsx')
  const templateTextLayer = readRepoFile(
    'src/components/preview/CaseInsertTemplateTextLayer.tsx',
  )
  const spineLayer = readRepoFile(
    'src/components/preview/CaseInsertSpinePreviewLayer.tsx',
  )

  assert.match(discAdapter, /inputMode="adapter"/)
  assert.match(discAdapter, /isCurvedCopyrightDiscTextLayout/)
  assert.match(discAdapter, /geometryAdapter=\{geometryAdapter\}/)
  assert.doesNotMatch(discAdapter, /ribbonSlotId/)
  assert.doesNotMatch(discAdapter, /suppressCanvasInput/)
  assert.match(discAdapter, /createCurvedDiscTextEditorControls/)
  assert.doesNotMatch(discAdapter, /className="disc-inline-text-line"/)
  assert.match(discLayer, /buildDiscTextSvgLayer/)
  assert.doesNotMatch(discLayer, /hiddenTextKeys/)
  assert.doesNotMatch(discLayer, /hiddenVisibleTextKeys/)
  assert.equal(
    (templateTextLayer.match(/inputMode="adapter"/g) ?? []).length,
    2,
  )
  assert.equal((spineLayer.match(/inputMode="adapter"/g) ?? []).length, 1)
})
