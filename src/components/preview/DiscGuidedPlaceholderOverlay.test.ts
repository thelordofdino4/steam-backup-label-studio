import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const overlaySource = readFileSync(
  new URL('./DiscGuidedPlaceholderOverlay.tsx', import.meta.url),
  'utf8',
)
const previewSource = readFileSync(new URL('./DiscPreview.tsx', import.meta.url), 'utf8')
const cssSource = readFileSync(
  new URL('../../styles/app-guided-placeholders.css', import.meta.url),
  'utf8',
)
const previewCssSource = readFileSync(
  new URL('../../styles/app-preview-shell.css', import.meta.url),
  'utf8',
)

test('overlay uses normalized SVG geometry and canonical annulus masking', () => {
  assert.match(overlaySource, /viewBox="0 0 100 100"/)
  assert.match(overlaySource, /<circle cx="50" cy="50" r="50" fill="white"/)
  assert.match(overlaySource, /r=\{physicalCenterHolePercent \/ 2\}/)
  assert.match(overlaySource, /<g mask=\{`url\(#\$\{maskId\}\)`\}>/)
  assert.match(
    overlaySource,
    /rotate\(\$\{rotation\} \$\{geometry\.centerXPercent\} \$\{geometry\.centerYPercent\}\)/,
  )
  assert.match(overlaySource, /\{label\}/)
  assert.equal(overlaySource.includes('Game Title'), false)
  assert.doesNotMatch(overlaySource, /getBoundingClientRect|offsetWidth|offsetHeight/)
})

test('overlay is passive and has no editing or navigation behavior', () => {
  assert.match(
    cssSource,
    /\.disc-guided-placeholder-overlay\s*\{[\s\S]*pointer-events:\s*none/,
  )

  for (const forbidden of [
    'onClick',
    'onPointer',
    'onKey',
    'tabIndex',
    '<button',
    'cursor:',
    'drag',
    'resize',
    'PreviewEditable',
    'roleFocus',
    'requestFocus',
  ]) {
    assert.equal(
      `${overlaySource}\n${cssSource}`.includes(forbidden),
      false,
      `unexpected behavior: ${forbidden}`,
    )
  }
})

test('overlay mounts after normal layers and below selection feedback', () => {
  const layersIndex = previewSource.indexOf('DISC_EDITOR_PREVIEW_LAYER_ORDER.map')
  const guidedIndex = previewSource.indexOf('<DiscGuidedPlaceholderOverlay')
  const selectionIndex = previewSource.indexOf('<PreviewElementOverlay')

  assert.ok(layersIndex >= 0 && layersIndex < guidedIndex)
  assert.ok(guidedIndex < selectionIndex)
  assert.match(
    cssSource,
    /\.disc-guided-placeholder-overlay\s*\{[\s\S]*z-index:\s*8/,
  )
  assert.match(
    previewCssSource,
    /\.preview-element-overlay-layer\s*\{[\s\S]*z-index:\s*24/,
  )
})

test('editor affordance is explicit and absent from clean DiscPreview composition', () => {
  assert.match(previewSource, /editorAffordances\?:/)
  assert.match(
    previewSource,
    /\{editorAffordances \? \([\s\S]*?<DiscGuidedPlaceholderOverlay[\s\S]*?\) : null\}/,
  )
})

test('guided placeholder stays isolated from export, render, persistence, Case Insert, and role focus', () => {
  for (const forbidden of [
    '../../export',
    '../../render',
    '../../project',
    'caseInsert',
    'roleFocus',
    'autoFill',
    'skipped',
  ]) {
    assert.equal(overlaySource.includes(forbidden), false, `unexpected source: ${forbidden}`)
  }

  const isolatedSources = [
    '../../export/exportPng.ts',
    '../../app/appPngExportInputs.ts',
    '../../editor/layerOrder.ts',
  ].map((relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8'))

  for (const source of isolatedSources) {
    assert.equal(source.includes('DiscGuidedPlaceholderOverlay'), false)
    assert.equal(source.includes('useDiscGuidedPlaceholderPreview'), false)
  }
})

test('styling is static, high-contrast, and distinct from selection blue', () => {
  assert.match(cssSource, /stroke:\s*#fbbf24/)
  assert.match(cssSource, /fill:\s*rgba\(17, 24, 39, 0\.62\)/)
  assert.match(cssSource, /stroke-dasharray:/)
  assert.match(cssSource, /text-anchor:\s*middle/)
  assert.doesNotMatch(cssSource, /animation|@keyframes/)
})
