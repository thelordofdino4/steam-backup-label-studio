import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import type { ContextualTextControlId } from '../text/contextualTextControlViewModel.ts'
import { createDefaultDiscTextLayout } from './index.ts'
import {
  getDiscTextSidebarException,
  getDiscTextSidebarTargetCapabilityId,
  shouldShowDiscTextSidebarControl,
} from './sidebarControlPolicy.ts'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(testDir))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

function getSourceBetween(source: string, startText: string, endText: string) {
  const start = source.indexOf(startText)
  const end = source.indexOf(endText, start + startText.length)

  assert.notEqual(start, -1, `${startText} was not found`)
  assert.notEqual(end, -1, `${endText} was not found after ${startText}`)

  return source.slice(start, end)
}

test('straight disc sidebar policy omits contextual controls and keeps exceptions', () => {
  const layout = createDefaultDiscTextLayout('none')
  const migratedControlIds = [
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
  const sidebarExceptionControlIds = [
    'mode',
    'arcSide',
    'arcDegrees',
  ] as const satisfies readonly ContextualTextControlId[]

  assert.equal(
    getDiscTextSidebarTargetCapabilityId('title', layout.title),
    'straightDiscText',
  )
  assert.equal(getDiscTextSidebarException('title', layout.title), undefined)
  for (const controlId of migratedControlIds) {
    assert.equal(
      shouldShowDiscTextSidebarControl({
        controlId,
        key: 'title',
        layout: layout.title,
      }),
      false,
      `${controlId} should move out of the straight disc sidebar`,
    )
  }
  for (const controlId of sidebarExceptionControlIds) {
    assert.equal(
      shouldShowDiscTextSidebarControl({
        controlId,
        key: 'title',
        layout: layout.title,
      }),
      true,
      `${controlId} should remain available when a sidebar path owns it`,
    )
  }

  assert.equal(
    getDiscTextSidebarTargetCapabilityId('copyright', layout.copyright),
    'curvedDiscCopyrightText',
  )
  assert.match(
    getDiscTextSidebarException('copyright', layout.copyright) ?? '',
    /SVG\/textPath/,
  )
  for (const controlId of [
    ...migratedControlIds,
    ...sidebarExceptionControlIds,
  ]) {
    assert.equal(
      shouldShowDiscTextSidebarControl({
        controlId,
        key: 'copyright',
        layout: layout.copyright,
      }),
      true,
      `${controlId} should stay in the curved copyright sidebar exception`,
    )
  }
})

test('straight disc sidebar keeps entry and source controls without migrated style/layout duplicates', () => {
  const control = readRepoFile('src/components/sidebar/DiscTextControl.tsx')
  const straightPreviewControls = getSourceBetween(
    control,
    'aria-label={`${controlLabel} preview edit controls`}',
    '{shouldShowSidebarTextValue ? (',
  )

  assert.match(straightPreviewControls, /Edit in preview/)
  assert.match(straightPreviewControls, /handleDiscTextPreviewEditStart\(key\)/)
  assert.match(control, /getDiscTextSidebarTargetCapability/)
  assert.match(control, /shouldShowDiscTextSidebarControl/)
  assert.match(control, /sidebarTarget\.supportsContextualEditor/)
  assert.match(control, /selectedDiscTextKey/)
  assert.match(control, /Using Game metadata\/default/)
  assert.match(control, /Use Game metadata value/)
  assert.match(control, /disc-number-artwork-mode/)
  assert.match(control, /disc-number-badge-set/)

  assert.doesNotMatch(control, /Respect visual elements/)
  assert.doesNotMatch(control, /Block background/)
  assert.doesNotMatch(control, /handleDiscTextVisualAvoidanceChange/)
  assert.doesNotMatch(control, /DISC_TEXT_WIDTH_MIN/)
  assert.doesNotMatch(control, /DISC_TEXT_WIDTH_MAX/)
  assert.doesNotMatch(control, /straightSliderRanges/)
  assert.doesNotMatch(control, /label="Width"/)
  assert.doesNotMatch(control, /label=\{isCurvedCopyright \? 'Angle' : 'X'\}/)
  assert.doesNotMatch(control, /label=\{isCurvedCopyright \? 'Inset' : 'Y'\}/)
  assert.doesNotMatch(control, /label="Opacity"/)
  assert.doesNotMatch(control, /label="Padding"/)
  assert.doesNotMatch(control, /label="Radius"/)

  assert.doesNotMatch(straightPreviewControls, /Style preset/)
  assert.doesNotMatch(straightPreviewControls, /Font/)
  assert.doesNotMatch(straightPreviewControls, /Color/)
  assert.doesNotMatch(straightPreviewControls, /Contrast/)
  assert.doesNotMatch(straightPreviewControls, /Align/)
  assert.doesNotMatch(straightPreviewControls, /Scale/)
  assert.doesNotMatch(straightPreviewControls, /Reset .* layout/)
  assert.doesNotMatch(straightPreviewControls, /Reset .* style/)
})

test('straight disc contextual editor still exposes migrated controls', () => {
  const editor = readRepoFile(
    'src/components/preview/discInlineTextEditorControls.ts',
  )

  assert.match(editor, /export function createDiscInlineTextEditorControls/)
  assert.match(editor, /DISC_TEXT_STYLE_PRESETS/)
  assert.match(editor, /getDiscTextLayoutPresetsForKey/)
  assert.match(editor, /preset\.layout\.mode !== 'curved'/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.stylePreset/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.layoutPreset/)
  assert.match(editor, /applyDiscTextLayoutPreset/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.fontFamily/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.size/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.alignment/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.bold/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.italic/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.underline/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.bulletedList/)
  assert.match(editor, /'bold'/)
  assert.match(editor, /'italic'/)
  assert.match(editor, /'underline'/)
  assert.match(editor, /'bulletedList'/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.color/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.contrast/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.backgroundEnabled/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.backgroundColor/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.backgroundOpacity/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.backgroundPadding/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.borderEnabled/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.borderColor/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.borderRadius/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.respectVisualElements/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.width/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.x/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.y/)
  assert.match(editor, /resetLayout: \(\) => onResetDiscTextLayout\(key\)/)
  assert.match(editor, /CONTEXTUAL_TEXT_CONTROL_LABELS\.delete/)
})

test('curved copyright keeps its sidebar exception and SVG textPath path', () => {
  const control = readRepoFile('src/components/sidebar/DiscTextControl.tsx')
  const editor = readRepoFile('src/components/preview/DiscInlineTextEditorLayer.tsx')
  const svgLayer = readRepoFile('src/discText/svgLayer.ts')

  assert.match(control, /getDiscTextSidebarException/)
  assert.match(control, /Curved text value/)
  assert.match(control, /\{sidebarException\}/)
  assert.match(control, />Mode</)
  assert.match(control, /curved style controls/)
  assert.match(control, /curved placement controls/)
  assert.match(control, /curved fine tuning controls/)
  assert.match(control, /label="Font size \(pt\)"/)
  assert.match(control, /'fontSizePt'/)
  assert.match(control, /DISC_TEXT_POINT_SIZE_STEP/)
  assert.match(control, /label="Line spacing"/)
  assert.match(control, /label="Angle"/)
  assert.match(control, /label="Inset"/)
  assert.match(control, /label="Arc"/)
  assert.match(control, /Reset \{controlLabel\.toLowerCase\(\)\} layout/)
  assert.match(control, /Reset \{controlLabel\.toLowerCase\(\)\} style/)
  assert.match(editor, /isCurvedCopyrightDiscTextLayout\(key, layout\)/)
  assert.match(editor, /return null/)
  assert.match(svgLayer, /<textPath href=/)
})
