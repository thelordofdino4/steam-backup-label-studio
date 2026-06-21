import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const diagnosticsDir = dirname(fileURLToPath(import.meta.url))
const srcDir = dirname(diagnosticsDir)
const repoRoot = dirname(srcDir)

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

function walkSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)

    if (stat.isDirectory()) return walkSourceFiles(path)
    if (/\.test\.(ts|tsx)$/.test(entry)) return []
    if (/\.(ts|tsx|css)$/.test(entry)) return [path]
    return []
  })
}

test('text editor contract document records the stabilization gate', () => {
  const contract = readRepoFile('docs/TEXT_EDITOR_CONTRACT.md')

  assert.match(contract, /Core UX Contract/)
  assert.match(contract, /Input And Caret Contract/)
  assert.match(contract, /Disc Compatibility Contract/)
  assert.match(contract, /HTML source is the supported source-editing mode/)
  assert.match(contract, /Curved disc text remains SVG\/textPath based/)
})

test('inline text editor keeps keyboard input inside the native textarea', () => {
  const source = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const contract = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorContract.ts',
  )

  assert.match(contract, /controls\?:\s*InlinePreviewTextEditorControls/)
  assert.match(source, /inlinePreviewTextEditorContract/)
  assert.match(source, /InlinePreviewTextEditorMenuContent/)
  assert.match(source, /deleteAction/)
  assert.match(contract, /htmlSource\?:\s*InlinePreviewTextEditorCheckboxControl/)
  assert.match(contract, /sourceMode\?:\s*boolean/)
  assert.match(source, /getInlinePreviewHtmlSourceDraftStatus/)
  assert.match(source, /inline-preview-text-source-textarea/)
  assert.match(source, /HTML source editor/)
  assert.match(
    source,
    /event\.currentTarget\.select\(\)/,
  )
  assert.doesNotMatch(source, /Markdown planned/)
  assert.match(source, /controls\.presets\?\.style/)
  assert.match(source, /controls\.presets\?\.layout/)
  assert.doesNotMatch(source, /inline-preview-text-preset-list/)
  assert.match(contract, /bold\?:\s*InlinePreviewTextEditorToggleControl/)
  assert.match(contract, /italic\?:\s*InlinePreviewTextEditorToggleControl/)
  assert.match(contract, /underline\?:\s*InlinePreviewTextEditorToggleControl/)
  assert.match(contract, /bulletedList\?:\s*InlinePreviewTextEditorToggleControl/)
  assert.match(source, /renderInlinePreviewTextToggleControl/)
  assert.match(source, /aria-pressed=\{resolvedState === 'mixed'/)
  assert.match(source, /inline-preview-text-format-row/)
  assert.match(source, /<textarea/)
  assert.match(source, /value=\{value\}/)
  assert.match(source, /onChange=\{\(event\) => \{/)
  assert.match(source, /onKeyDown=\{handleInlineTextEditorKeyDown\}/)
  assert.match(source, /event\.stopPropagation\(\)/)
  assert.match(source, /isInlinePreviewTextSelectAllShortcut\(event\)/)
  assert.match(
    source,
    /textarea\.setSelectionRange\(0,\s*textarea\.value\.length,\s*'forward'\)/,
  )
  assert.match(source, /inputMode === 'overlay'/)
  assert.match(source, /handleInlineTextEditorPointerDown/)
  assert.match(source, /getPointerSelectionStart\(/)
  assert.match(
    source,
    /textarea\.setSelectionRange\(\s*nextSelectionStart,\s*nextSelectionStart,\s*'forward',?\s*\)/,
  )
  assert.match(contract, /inputMode\?:\s*InlinePreviewTextEditorInputMode/)
  assert.match(source, /inputMode = 'overlay'/)
  assert.match(source, /inline-preview-textarea--adapter/)
  assert.doesNotMatch(source, /inline-preview-textarea--source/)
  assert.match(source, /getInlinePreviewTextSelectionLineOffsets/)
  assert.match(source, /createPortal\(textareaElement,\s*document\.body\)/)
  assert.match(source, /adapterSelectionAnchorRef/)
  assert.match(source, /adapterSelectionPointerIdRef/)
  assert.match(source, /caretPositionFromPoint/)
  assert.match(source, /caretRangeFromPoint/)
  assert.match(source, /setPointerCapture\(event\.pointerId\)/)
  assert.match(source, /releasePointerCapture\(event\.pointerId\)/)
  assert.doesNotMatch(
    source,
    /\}, \[caretValue, inputMode, lines, selection\.focus, targetKey\]\)/,
  )
})

test('editor styling exposes a dotted boundary and blue blinking caret', () => {
  const css = readRepoFile('src/styles/app-editor-controls.css')

  assert.match(css, /\.inline-preview-text-host\s*\{[^}]*outline:\s*2px dotted/s)
  assert.match(css, /\.inline-preview-text-host\.is-empty\s*\{[^}]*min-width/s)
  assert.match(css, /\.inline-preview-textarea--adapter\s*\{[^}]*position:\s*fixed/s)
  assert.match(css, /\.inline-preview-text-source-control\s*\{[^}]*grid-column:\s*1 \/ -1/s)
  assert.match(css, /\.inline-preview-text-source-textarea\s*\{[^}]*font-family:\s*"Cascadia Mono",\s*"Consolas",\s*monospace/s)
  assert.match(css, /\.inline-preview-text-source-textarea\s*\{[^}]*caret-color:\s*#2aabe2/s)
  assert.doesNotMatch(css, /\.inline-preview-text-host\.is-html-source\s+\.case-insert-text-render-content\s*\{[^}]*visibility:\s*hidden/s)
  assert.match(css, /\.inline-preview-text-selection\s*\{[^}]*background:\s*rgba\(42,\s*171,\s*226,\s*0\.28\)/s)
  assert.match(css, /\.inline-preview-text-selection-path\s*\{[^}]*stroke-linecap:\s*butt/s)
  assert.match(css, /\.inline-preview-text-caret\s*\{[^}]*background:\s*#2aabe2/s)
  assert.match(css, /\.inline-preview-text-caret\s*\{[^}]*animation:\s*inline-preview-text-caret-flash/s)
  assert.match(css, /@keyframes inline-preview-text-caret-flash/)
})

test('contextual text editor shell is hosted by the stable ribbon', () => {
  const editorCss = readRepoFile('src/styles/app-editor-controls.css')
  const ribbonCss = readRepoFile('src/styles/app-contextual-text-ribbon.css')
  const editor = readRepoFile('src/components/preview/InlinePreviewTextEditor.tsx')

  assert.match(ribbonCss, /\.contextual-text-ribbon-host\s*\{[^}]*min-height:\s*var\(--contextual-text-ribbon-reserved-height\)/s)
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-controls--inline-menu\s+\.inline-preview-text-control-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(190px,\s*1fr\)\)/s,
  )
  assert.match(
    ribbonCss,
    /@media \(max-width:\s*820px\)[\s\S]*\.contextual-text-ribbon-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-controls\s*\{[^}]*overflow-y:\s*auto/s,
  )
  assert.doesNotMatch(editorCss, /\.inline-preview-text-tabs\s*\{/)
  assert.doesNotMatch(editorCss, /\.inline-preview-text-menu\s*\{/)
  assert.doesNotMatch(editor, /createPortal\(controls,\s*document\.body\)/)
  assert.doesNotMatch(editor, /getInlinePreviewTextControlLayout/)
})

test('case insert inline editing uses the adapter input path', () => {
  const templateLayer = readRepoFile(
    'src/components/preview/CaseInsertTemplatePreviewLayers.tsx',
  )
  const spineLayer = readRepoFile(
    'src/components/preview/CaseInsertSpinePreviewLayer.tsx',
  )
  const previewControls = readRepoFile(
    'src/components/preview/caseInsertInlineTextEditorControls.ts',
  )

  assert.match(templateLayer, /createInlinePreviewTextTargetAttributes/)
  assert.match(spineLayer, /createInlinePreviewTextTargetAttributes/)
  assert.match(templateLayer, /createCaseInsertInlineTextEditorControls/)
  assert.match(spineLayer, /createCaseInsertInlineTextEditorControls/)
  assert.match(previewControls, /CASE_INSERT_TEXT_STYLE_PRESETS/)
  assert.match(previewControls, /layoutPresets\?:\s*readonly CaseInsertTextLayoutPreset\[\]/)
  assert.match(previewControls, /onApplyLayoutPreset/)
  assert.match(previewControls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.stylePreset/)
  assert.match(previewControls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.layoutPreset/)
  assert.match(previewControls, /CASE_INSERT_TEXT_FONT_OPTIONS/)
  assert.match(previewControls, /CASE_INSERT_TEXT_CONTRAST_OPTIONS/)
  assert.match(previewControls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.bold/)
  assert.match(previewControls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.italic/)
  assert.match(previewControls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.underline/)
  assert.match(previewControls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.bulletedList/)
  assert.match(previewControls, /'bold'/)
  assert.match(previewControls, /'italic'/)
  assert.match(previewControls, /'underline'/)
  assert.match(previewControls, /'bulletedList'/)
  assert.doesNotMatch(previewControls, /unsupported:\s*\['Bold', 'Italic', 'Underline'\]/)
  assert.match(previewControls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.htmlSource/)
  assert.match(previewControls, /onContentModeChange/)
  assert.doesNotMatch(previewControls, /markdownPlanned:\s*true/)
  assert.equal((templateLayer.match(/inputMode="adapter"/g) ?? []).length, 2)
  assert.equal((spineLayer.match(/inputMode="adapter"/g) ?? []).length, 1)
  assert.doesNotMatch(templateLayer, /inputMode=\{isHtmlSourceEditing \? 'overlay' : 'adapter'\}/)
  assert.doesNotMatch(spineLayer, /inputMode=\{isHtmlSourceEditing \? 'overlay' : 'adapter'\}/)
  assert.match(templateLayer, /isSelected && !isHtmlSourceEditing/)
  assert.match(spineLayer, /isSelected && !isHtmlSourceEditing/)
  assert.match(templateLayer, /sourceMode=\{isHtmlSourceEditing\}/)
  assert.match(spineLayer, /sourceMode=\{isHtmlSourceEditing\}/)
})

test('curved disc text is not routed through a visible rectangular editor layer', () => {
  const adapter = readRepoFile(
    'src/components/preview/DiscInlineTextEditorLayer.tsx',
  )
  const controls = readRepoFile(
    'src/components/preview/discInlineTextEditorControls.ts',
  )
  const discLayer = readRepoFile('src/components/preview/DiscTextLayer.tsx')

  assert.match(adapter, /isCurvedCopyrightDiscTextLayout/)
  assert.match(adapter, /createCurvedDiscTextEditorControls/)
  assert.match(adapter, /geometryAdapter=\{geometryAdapter\}/)
  assert.doesNotMatch(adapter, /suppressCanvasInput/)
  assert.match(adapter, /disc-inline-text-host--curved/)
  assert.match(adapter, /createDiscInlineTextEditorControls/)
  assert.match(controls, /createCurvedDiscTextEditorControls/)
  assert.match(controls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.lineSpacing/)
  assert.match(controls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.arcSide/)
  assert.match(controls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.arcDegrees/)
  assert.match(controls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.bold/)
  assert.match(controls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.italic/)
  assert.match(controls, /CONTEXTUAL_TEXT_CONTROL_LABELS\.underline/)
  assert.doesNotMatch(controls, /unsupported:\s*\[/)
  assert.doesNotMatch(controls, /unsupported:\s*\['Bold', 'Italic', 'Underline'\]/)
  assert.match(adapter, /controls=\{controls\}/)
  assert.match(adapter, /inputMode="adapter"/)
  assert.match(adapter, /ribbonSlotId=\{ribbonSlotId\}/)
  assert.match(discLayer, /ribbonSlotId=\{ribbonSlotId\}/)
  assert.doesNotMatch(adapter, /placementStrategy/)
  assert.doesNotMatch(adapter, /paintedCollisionRects/)
  assert.doesNotMatch(adapter, /inputMode=\{isHtmlSourceEditing \? 'overlay' : 'adapter'\}/)
  assert.match(discLayer, /buildDiscTextSvgLayer/)
  assert.match(discLayer, /DiscInlineTextEditorLayer/)
})

test('disc sidebar keeps setup controls while curved editing moves contextually', () => {
  const control = readRepoFile('src/components/sidebar/DiscTextControl.tsx')
  const policy = readRepoFile('src/discText/sidebarControlPolicy.ts')
  const panel = readRepoFile('src/components/sidebar/TextPanel.tsx')

  assert.match(control, /sidebarTarget\.supportsContextualEditor/)
  assert.match(control, /disc-sidebar-mode/)
  assert.doesNotMatch(control, /Curved text value/)
  assert.doesNotMatch(control, /sidebarException/)
  assert.doesNotMatch(control, /curved style controls/)
  assert.doesNotMatch(control, /curved placement controls/)
  assert.doesNotMatch(control, /curved fine tuning controls/)
  assert.match(policy, /curvedDiscCopyrightText/)
  assert.match(policy, /supportsContextualEditor/)
  assert.match(policy, /hasContextualTextControlEquivalent/)
  assert.doesNotMatch(control, />\s*Text value\s*</)
  assert.match(panel, /Straight and curved text are edited from the preview/)
  assert.match(panel, /Curved copyright text remains SVG\/textPath based/)
})

test('straight disc inline editing keeps the SVG renderer visible', () => {
  const adapter = readRepoFile(
    'src/components/preview/DiscInlineTextEditorLayer.tsx',
  )
  const discLayer = readRepoFile('src/components/preview/DiscTextLayer.tsx')
  const discCss = readRepoFile('src/styles/app-disc-text.css')

  assert.doesNotMatch(discLayer, /hiddenVisibleTextKeys/)
  assert.doesNotMatch(discLayer, /hiddenTextKeys:\s*hiddenVisibleTextKeys/)
  assert.doesNotMatch(discLayer, /hiddenTextKeys/)
  assert.doesNotMatch(discLayer, /isDiscTextHtmlEnabled/)
  assert.match(discLayer, /buildDiscTextSvgLayer/)
  assert.match(adapter, /geometryLines=\{geometryLines\}/)
  assert.doesNotMatch(adapter, /className="disc-inline-text-line"/)
  assert.doesNotMatch(discCss, /\.disc-inline-text-line/)
})

test('source tree does not contain the removed ghost text editor renderer', () => {
  const matches = walkSourceFiles(srcDir).flatMap((path) => {
    const text = readFileSync(path, 'utf8')

    return text.includes('disc-text-editable-preview') ? [path] : []
  })

  assert.deepEqual(matches, [])
})
