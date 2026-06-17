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
  assert.match(contract, /Markdown is the planned source-editing mode/)
  assert.match(contract, /Curved disc text remains SVG\/textPath based/)
})

test('inline text editor keeps keyboard input inside the native textarea', () => {
  const source = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )

  assert.match(source, /controls\?:\s*InlinePreviewTextEditorControls/)
  assert.match(source, /InlinePreviewTextEditorMenuContent/)
  assert.match(source, /deleteAction/)
  assert.match(source, /Markdown planned/)
  assert.match(source, /unsupported\?:\s*readonly string\[\]/)
  assert.match(source, /controls\.text\.unsupported/)
  assert.match(source, /\{label\} unsupported/)
  assert.match(source, /is not supported in the contextual editor yet/)
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
  assert.match(source, /inputMode\?:\s*InlinePreviewTextEditorInputMode/)
  assert.match(source, /inputMode = 'overlay'/)
  assert.match(source, /inline-preview-textarea--adapter/)
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
  assert.match(css, /\.inline-preview-text-selection\s*\{[^}]*background:\s*rgba\(42,\s*171,\s*226,\s*0\.28\)/s)
  assert.match(css, /\.inline-preview-text-caret\s*\{[^}]*background:\s*#2aabe2/s)
  assert.match(css, /\.inline-preview-text-caret\s*\{[^}]*animation:\s*inline-preview-text-caret-flash/s)
  assert.match(css, /@keyframes inline-preview-text-caret-flash/)
})

test('contextual text editor shell keeps tab and menu sizing stable', () => {
  const css = readRepoFile('src/styles/app-editor-controls.css')

  assert.match(css, /\.inline-preview-text-tabs\s*\{[^}]*display:\s*grid/s)
  assert.match(
    css,
    /\.inline-preview-text-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s,
  )
  assert.match(
    css,
    /\.inline-preview-text-tabs\s*\{[^}]*width:\s*min\(520px,\s*calc\(100vw - 24px\)\)/s,
  )
  assert.match(
    css,
    /\.inline-preview-text-menu\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s*auto/s,
  )
  assert.match(
    css,
    /\.inline-preview-text-menu\s*\{[^}]*width:\s*min\(520px,\s*calc\(100vw - 24px\)\)/s,
  )
  assert.match(
    css,
    /\.inline-preview-text-menu\s*\{[^}]*max-height:\s*min\(286px,\s*calc\(100vh - 32px\)\)/s,
  )
  assert.match(
    css,
    /\.inline-preview-text-menu\s*>\s*\.inline-preview-text-control-grid\s*\{[^}]*overflow-y:\s*auto/s,
  )
  assert.doesNotMatch(
    css,
    /\.inline-preview-text-(tabs|menu)\s*\{[^}]*width:\s*max-content/s,
  )
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

  assert.match(templateLayer, /INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE/)
  assert.match(spineLayer, /INLINE_PREVIEW_TEXT_TARGET_ATTRIBUTE/)
  assert.match(templateLayer, /createCaseInsertInlineTextEditorControls/)
  assert.match(spineLayer, /createCaseInsertInlineTextEditorControls/)
  assert.match(previewControls, /CASE_INSERT_TEXT_STYLE_PRESETS/)
  assert.match(previewControls, /CASE_INSERT_TEXT_FONT_OPTIONS/)
  assert.match(previewControls, /CASE_INSERT_TEXT_CONTRAST_OPTIONS/)
  assert.match(previewControls, /unsupported:\s*\['Bold', 'Italic', 'Underline'\]/)
  assert.match(previewControls, /markdownPlanned:\s*true/)
  assert.equal((templateLayer.match(/inputMode="adapter"/g) ?? []).length, 2)
  assert.equal((spineLayer.match(/inputMode="adapter"/g) ?? []).length, 1)
})

test('curved disc text is not routed through a visible rectangular editor layer', () => {
  const adapter = readRepoFile(
    'src/components/preview/DiscInlineTextEditorLayer.tsx',
  )
  const discLayer = readRepoFile('src/components/preview/DiscTextLayer.tsx')

  assert.match(adapter, /isCurvedCopyrightDiscTextLayout/)
  assert.match(adapter, /return null/)
  assert.match(adapter, /createDiscInlineTextEditorControls/)
  assert.match(adapter, /unsupported:\s*\['Bold', 'Italic', 'Underline'\]/)
  assert.match(adapter, /controls=\{controls\}/)
  assert.match(discLayer, /buildDiscTextSvgLayer/)
  assert.match(discLayer, /DiscInlineTextEditorLayer/)
})

test('disc sidebar text value is limited to the curved text exception', () => {
  const control = readRepoFile('src/components/sidebar/DiscTextControl.tsx')
  const panel = readRepoFile('src/components/sidebar/TextPanel.tsx')

  assert.match(control, /shouldShowSidebarTextValue\s*=\s*isCurvedCopyright/)
  assert.match(control, /Curved text value/)
  assert.match(control, /Curved-text exception/)
  assert.doesNotMatch(control, />\s*Text value\s*</)
  assert.match(panel, /Straight text is edited on the preview/)
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
  assert.match(discLayer, /isCurvedCopyrightDiscTextLayout/)
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
