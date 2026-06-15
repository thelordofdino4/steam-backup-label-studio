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
  assert.match(source, /onPointerDown=\{handleInlineTextEditorPointerDown\}/)
  assert.match(source, /getPointerSelectionStart\(/)
  assert.match(
    source,
    /textarea\.setSelectionRange\(\s*nextSelectionStart,\s*nextSelectionStart,\s*'forward',?\s*\)/,
  )
})

test('editor styling exposes a dotted boundary and blue blinking caret', () => {
  const css = readRepoFile('src/styles/app-editor-controls.css')

  assert.match(css, /\.inline-preview-text-host\s*\{[^}]*outline:\s*2px dotted/s)
  assert.match(css, /\.inline-preview-text-host\.is-empty\s*\{[^}]*min-width/s)
  assert.match(css, /\.inline-preview-text-caret\s*\{[^}]*background:\s*#2aabe2/s)
  assert.match(css, /\.inline-preview-text-caret\s*\{[^}]*animation:\s*inline-preview-text-caret-flash/s)
  assert.match(css, /@keyframes inline-preview-text-caret-flash/)
})

test('curved disc text is not routed through a visible rectangular editor layer', () => {
  const adapter = readRepoFile(
    'src/components/preview/DiscInlineTextEditorLayer.tsx',
  )
  const discLayer = readRepoFile('src/components/preview/DiscTextLayer.tsx')

  assert.match(adapter, /isCurvedCopyrightDiscTextLayout/)
  assert.match(adapter, /return null/)
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

test('straight disc inline editing hides only the duplicate visible SVG glyphs', () => {
  const adapter = readRepoFile(
    'src/components/preview/DiscInlineTextEditorLayer.tsx',
  )
  const discLayer = readRepoFile('src/components/preview/DiscTextLayer.tsx')
  const discCss = readRepoFile('src/styles/app-disc-text.css')
  const hiddenTextKeyUsages =
    discLayer.match(/hiddenTextKeys:\s*hiddenVisibleTextKeys/g) ?? []

  assert.equal(hiddenTextKeyUsages.length, 2)
  assert.match(discLayer, /isCurvedCopyrightDiscTextLayout/)
  assert.match(
    discCss,
    /\.disc-inline-text-line\s*\{[^}]*color:\s*currentColor/s,
  )
  assert.doesNotMatch(
    discCss,
    /\.disc-inline-text-line\s*\{[^}]*color:\s*transparent/s,
  )
  assert.match(adapter, /textShadow:\s*getDiscInlineEditorTextShadow/)
  assert.match(adapter, /WebkitTextStroke:\s*getDiscInlineEditorTextStroke/)
})

test('source tree does not contain the removed ghost text editor renderer', () => {
  const matches = walkSourceFiles(srcDir).flatMap((path) => {
    const text = readFileSync(path, 'utf8')

    return text.includes('disc-text-editable-preview') ? [path] : []
  })

  assert.deepEqual(matches, [])
})
