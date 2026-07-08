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

function readContextualTextRibbonCss() {
  const manifestPath = 'src/styles/app-contextual-text-ribbon.css'
  const manifest = readRepoFile(manifestPath)
  const imports = [...manifest.matchAll(/@import\s+['"](.+)['"];/g)]

  if (imports.length === 0) return manifest

  const manifestDir = dirname(join(repoRoot, manifestPath))
  return imports
    .map(([, importPath]) => readFileSync(join(manifestDir, importPath), 'utf8'))
    .join('\n')
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
  const ribbonControlsSource = readRepoFile(
    'src/components/preview/inlinePreviewTextRibbonControls.tsx',
  )
  const menuSource = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorMenuContent.tsx',
  )
  const editorRibbonSource = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorRibbon.tsx',
  )
  const textareaSource = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorTextarea.tsx',
  )
  const geometrySource = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorTextGeometry.ts',
  )
  const contract = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorContract.ts',
  )

  assert.match(contract, /controls\?:\s*InlinePreviewTextEditorControls/)
  assert.match(source, /inlinePreviewTextEditorContract/)
  assert.match(source, /InlinePreviewTextEditorRibbon/)
  assert.match(editorRibbonSource, /InlinePreviewTextEditorMenuContent/)
  assert.match(editorRibbonSource, /deleteAction/)
  assert.match(contract, /html\?:\s*\{[\s\S]*source\?:\s*InlinePreviewTextEditorCheckboxControl/)
  assert.match(contract, /sourceMode\?:\s*boolean/)
  assert.match(ribbonControlsSource, /getInlinePreviewHtmlSourceDraftStatus/)
  assert.match(ribbonControlsSource, /inline-preview-text-source-textarea/)
  assert.match(ribbonControlsSource, /HTML source editor/)
  assert.match(
    ribbonControlsSource,
    /event\.currentTarget\.select\(\)/,
  )
  assert.doesNotMatch(source, /Markdown planned/)
  assert.match(menuSource, /controls\.presets\?\.style/)
  assert.match(menuSource, /controls\.presets\?\.layout/)
  assert.doesNotMatch(source, /inline-preview-text-preset-list/)
  assert.match(contract, /bold\?:\s*InlinePreviewTextEditorToggleControl/)
  assert.match(contract, /italic\?:\s*InlinePreviewTextEditorToggleControl/)
  assert.match(contract, /underline\?:\s*InlinePreviewTextEditorToggleControl/)
  assert.match(contract, /bulletedList\?:\s*InlinePreviewTextEditorToggleControl/)
  assert.match(menuSource, /renderInlinePreviewTextToggleControl/)
  assert.match(ribbonControlsSource, /aria-pressed=\{resolvedState === 'mixed'/)
  assert.match(menuSource, /id:\s*'font'/)
  assert.match(ribbonControlsSource, /data-ribbon-group=\{id\}/)
  assert.match(ribbonControlsSource, /contextual-text-ribbon-icon-button/)
  assert.match(editorRibbonSource, /data-smoke-id="inline-text-tabs"/)
  assert.match(editorRibbonSource, /data-smoke-id="inline-text-menu"/)
  assert.match(editorRibbonSource, /data-smoke-id="inline-text-delete"/)
  assert.match(editorRibbonSource, /data-smoke-id="inline-text-done"/)
  assert.match(source, /InlinePreviewTextEditorTextarea/)
  assert.match(textareaSource, /<textarea/)
  assert.match(textareaSource, /value=\{value\}/)
  assert.match(textareaSource, /onChange=\{onChange\}/)
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
  assert.match(textareaSource, /inline-preview-textarea--adapter/)
  assert.doesNotMatch(textareaSource, /inline-preview-textarea--source/)
  assert.match(geometrySource, /getInlinePreviewTextSelectionLineOffsets/)
  assert.match(source, /createPortal\(textareaElement,\s*document\.body\)/)
  assert.match(source, /adapterSelectionAnchorRef/)
  assert.match(source, /adapterSelectionPointerIdRef/)
  assert.match(geometrySource, /caretPositionFromPoint/)
  assert.match(geometrySource, /caretRangeFromPoint/)
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
  const ribbonCss = readContextualTextRibbonCss()
  const editor = readRepoFile('src/components/preview/InlinePreviewTextEditor.tsx')
  const menuSource = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorMenuContent.tsx',
  )
  const pointColorControls = readRepoFile(
    'src/components/preview/inlinePreviewTextPointColorControls.tsx',
  )

  assert.match(ribbonCss, /\.contextual-text-ribbon-host\s*\{[^}]*min-height:\s*var\(--contextual-text-ribbon-reserved-height\)/s)
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-tab\s*\{[^}]*white-space:\s*nowrap/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row\s*\{[^}]*display:\s*grid/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row\s*\{[^}]*grid-auto-flow:\s*column/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row\s*\{[^}]*grid-template-rows:\s*repeat\(/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row\s*\{[^}]*overflow-x:\s*auto/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row\s*\{[^}]*overflow-y:\s*hidden/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control select\s*\{[^}]*color-scheme:\s*dark/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control select option,\s*\.contextual-text-ribbon-point-size-presets option\s*\{[^}]*color:\s*#f9fafb[^}]*background-color:\s*#0f1117/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control select option:checked,\s*\.contextual-text-ribbon-point-size-presets option:checked\s*\{[^}]*background-color:\s*#1d4ed8/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group\s*\{[^}]*display:\s*flex/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group-label\s*\{/s,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group-body\s*\{/s,
  )
  assert.match(menuSource, /id:\s*'style'[\s\S]*label:\s*'Style'/)
  assert.match(menuSource, /id:\s*'layout-preset'[\s\S]*label:\s*'Layout'/)
  assert.match(menuSource, /id:\s*'font'[\s\S]*label:\s*'Font'/)
  assert.match(menuSource, /id:\s*'paragraph'[\s\S]*label:\s*'Paragraph'/)
  assert.doesNotMatch(menuSource, /id:\s*'formatting'[\s\S]*label:\s*'Formatting'/)
  assert.match(pointColorControls, /contextual-text-ribbon-point-size-presets/)
  assert.match(pointColorControls, /inline-preview-text-number-preset-select/)
  assert.doesNotMatch(pointColorControls, /inline-preview-text-number-preset-button/)
  assert.doesNotMatch(pointColorControls, /className="inline-preview-text-number-options"/)
  assert.doesNotMatch(ribbonCss, /data-ribbon-overflow-state/)
  assert.doesNotMatch(ribbonCss, /scroll-snap-type/)
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-controls\s*\{[^}]*overflow:\s*hidden/s,
  )
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-portal-slot/)
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-controls--inline-menu/)
  assert.doesNotMatch(ribbonCss, /\.inline-preview-text-control-grid/)
  assert.doesNotMatch(editorCss, /\.inline-preview-text-tabs\s*\{/)
  assert.doesNotMatch(editorCss, /\.inline-preview-text-menu\s*\{/)
  assert.doesNotMatch(editor, /createPortal\(controls,\s*document\.body\)/)
  assert.doesNotMatch(editor, /getInlinePreviewTextControlLayout/)
  assert.match(editor, /useContextualTextRibbonRegistration/)
  assert.doesNotMatch(editor, /ribbonSlotId/)
})

test('case insert inline editing uses the adapter input path', () => {
  const templateTextLayer = readRepoFile(
    'src/components/preview/CaseInsertTemplateTextLayer.tsx',
  )
  const spineLayer = readRepoFile(
    'src/components/preview/CaseInsertSpinePreviewLayer.tsx',
  )
  const previewControls = readRepoFile(
    'src/components/preview/caseInsertInlineTextEditorControls.ts',
  )

  assert.match(templateTextLayer, /createInlinePreviewTextTargetAttributes/)
  assert.match(spineLayer, /createInlinePreviewTextTargetAttributes/)
  assert.match(templateTextLayer, /createCaseInsertInlineTextEditorControls/)
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
  assert.equal((templateTextLayer.match(/inputMode="adapter"/g) ?? []).length, 2)
  assert.equal((spineLayer.match(/inputMode="adapter"/g) ?? []).length, 1)
  assert.doesNotMatch(templateTextLayer, /inputMode=\{isHtmlSourceEditing \? 'overlay' : 'adapter'\}/)
  assert.doesNotMatch(spineLayer, /inputMode=\{isHtmlSourceEditing \? 'overlay' : 'adapter'\}/)
  assert.match(templateTextLayer, /isSelected && !isHtmlSourceEditing/)
  assert.match(spineLayer, /isSelected && !isHtmlSourceEditing/)
  assert.match(templateTextLayer, /sourceMode=\{isHtmlSourceEditing\}/)
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
  assert.doesNotMatch(adapter, /ribbonSlotId/)
  assert.doesNotMatch(discLayer, /ribbonSlotId/)
  assert.doesNotMatch(adapter, /placementStrategy/)
  assert.doesNotMatch(adapter, /paintedCollisionRects/)
  assert.doesNotMatch(adapter, /inputMode=\{isHtmlSourceEditing \? 'overlay' : 'adapter'\}/)
  assert.match(discLayer, /buildDiscTextSvgLayer/)
  assert.match(discLayer, /DiscInlineTextEditorLayer/)
  assert.match(discLayer, /addEventListener\('pointerdown', handleNativePointerDown\)/)
  assert.match(discLayer, /onSelectedDiscTextKeyChange\(key\)/)
})

test('disc sidebar keeps setup controls while curved editing moves contextually', () => {
  const control = readRepoFile('src/components/sidebar/DiscTextControl.tsx')
  const policy = readRepoFile('src/discText/sidebarControlPolicy.ts')
  const titleTextControls = readRepoFile(
    'src/components/sidebar/text/DiscGameTitleTextControls.tsx',
  )
  const legalTextControls = readRepoFile(
    'src/components/sidebar/text/DiscLegalTextControls.tsx',
  )

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
  assert.match(titleTextControls, /textKey="title"/)
  assert.match(titleTextControls, /<DiscTextControl/)
  assert.match(legalTextControls, /textKey="copyright"/)
  assert.match(legalTextControls, /<DiscTextControl/)
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
  assert.match(
    adapter,
    /getStraightDiscTextRenderLayout\([\s\S]*richText:\s*htmlDocument \?\? undefined[\s\S]*const geometryLines = getDiscInlineTextEditorGeometryLines/,
  )
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
