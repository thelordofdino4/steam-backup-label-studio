import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import type { ContextualTextControlId } from '../text/contextualTextControlViewModel.ts'
import { createDefaultDiscTextLayout } from './index.ts'
import {
  getDiscTextSidebarTargetCapabilityId,
  shouldShowDiscTextSidebarControl,
} from './sidebarControlPolicy.ts'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(testDir))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

test('disc sidebar policy omits contextual controls and keeps setup exceptions', () => {
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
  const straightSidebarOwnedControlIds = [
    'mode',
    'arcSide',
    'arcDegrees',
  ] as const satisfies readonly ContextualTextControlId[]
  const curvedMigratedControlIds = [
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
    'resetStyle',
    'resetLayout',
    'delete',
  ] as const satisfies readonly ContextualTextControlId[]
  const curvedSidebarOwnedControlIds = [
    'mode',
    'htmlSource',
    'bulletedList',
    'width',
  ] as const satisfies readonly ContextualTextControlId[]

  assert.equal(
    getDiscTextSidebarTargetCapabilityId('title', layout.title),
    'straightDiscText',
  )
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
  for (const controlId of straightSidebarOwnedControlIds) {
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
  for (const controlId of curvedMigratedControlIds) {
    assert.equal(
      shouldShowDiscTextSidebarControl({
        controlId,
        key: 'copyright',
        layout: layout.copyright,
      }),
      false,
      `${controlId} should move out of the curved copyright sidebar`,
    )
  }
  for (const controlId of curvedSidebarOwnedControlIds) {
    assert.equal(
      shouldShowDiscTextSidebarControl({
        controlId,
        key: 'copyright',
        layout: layout.copyright,
      }),
      true,
      `${controlId} should remain sidebar-owned or unsupported for curved copyright`,
    )
  }
})

test('straight disc sidebar keeps entry and source controls without migrated style/layout duplicates', () => {
  const control = readRepoFile('src/components/sidebar/DiscTextControl.tsx')

  assert.match(control, /aria-label=\{`\$\{controlLabel\} preview edit controls`\}/)
  assert.match(control, /Edit in preview/)
  assert.match(control, /handleDiscTextPreviewEditStart\(key\)/)
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

  assert.doesNotMatch(control, /Style preset/)
  assert.doesNotMatch(control, />Font</)
  assert.doesNotMatch(control, />Color</)
  assert.doesNotMatch(control, />Contrast</)
  assert.doesNotMatch(control, />Align</)
  assert.doesNotMatch(control, />Scale</)
  assert.doesNotMatch(control, /Reset .* layout/)
  assert.doesNotMatch(control, /Reset .* style/)
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

test('curved copyright removes duplicate sidebar controls while keeping SVG textPath path', () => {
  const control = readRepoFile('src/components/sidebar/DiscTextControl.tsx')
  const editor = readRepoFile('src/components/preview/DiscInlineTextEditorLayer.tsx')
  const controls = readRepoFile(
    'src/components/preview/discInlineTextEditorControls.ts',
  )
  const svgLayer = readRepoFile('src/discText/svgLayer.ts')

  assert.match(control, />Mode</)
  assert.doesNotMatch(control, /Curved text value/)
  assert.doesNotMatch(control, /curved style controls/)
  assert.doesNotMatch(control, /curved placement controls/)
  assert.doesNotMatch(control, /curved fine tuning controls/)
  assert.doesNotMatch(control, /label="Font size \(pt\)"/)
  assert.doesNotMatch(control, /label="Line spacing"/)
  assert.doesNotMatch(control, /label="Angle"/)
  assert.doesNotMatch(control, /label="Inset"/)
  assert.doesNotMatch(control, /label="Arc"/)
  assert.match(editor, /isCurvedCopyrightDiscTextLayout\(key, layout\)/)
  assert.match(editor, /createCurvedDiscTextEditorControls/)
  assert.match(editor, /suppressCanvasInput/)
  assert.match(controls, /export function createCurvedDiscTextEditorControls/)
  assert.match(controls, /textValue/)
  assert.match(controls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.arcSide/)
  assert.match(controls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.arcDegrees/)
  assert.match(controls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.lineSpacing/)
  assert.match(svgLayer, /<textPath href=/)
})
