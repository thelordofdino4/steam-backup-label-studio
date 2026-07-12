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

test('visual layers share normalized annulus-masked rendering', () => {
  assert.match(overlaySource, /function DiscGuidedPlaceholderVisualLayer/)
  assert.match(overlaySource, /viewBox="0 0 100 100"/)
  assert.match(overlaySource, /<circle cx="50" cy="50" r="50" fill="white"/)
  assert.match(overlaySource, /r=\{physicalCenterHolePercent \/ 2\}/)
  assert.match(overlaySource, /<g mask=\{`url\(#\$\{maskId\}\)`\}>/)
  assert.match(
    overlaySource,
    /layer="background"[\s\S]*?placeholders=\{backgroundPlaceholders\}/,
  )
  assert.match(
    overlaySource,
    /layer="foreground"[\s\S]*?placeholders=\{foregroundPlaceholders\}/,
  )
  assert.doesNotMatch(overlaySource, /getBoundingClientRect|offsetWidth|offsetHeight/)
})

test('visual geometry paints the shape while action geometry anchors its label', () => {
  assert.match(overlaySource, /getGeometryBounds\(visualGeometry\)/)
  assert.match(overlaySource, /width=\{visualGeometry\.widthPercent\}/)
  assert.match(overlaySource, /height=\{visualGeometry\.heightPercent\}/)
  assert.match(overlaySource, /x=\{actionGeometry\.centerXPercent\}/)
  assert.match(overlaySource, /y=\{actionGeometry\.centerYPercent\}/)
  assert.match(overlaySource, /\{label\}/)
  assert.equal(overlaySource.includes('Game Title'), false)
})

test('suggested lifecycle remains visible with an explicit secondary label', () => {
  assert.match(
    overlaySource,
    /lifecycle === 'suggested'[\s\S]*?disc-guided-placeholder-shape--suggested/,
  )
  assert.match(
    overlaySource,
    /disc-guided-placeholder-suggested-label[\s\S]*?Suggested/,
  )
})

test('visual guidance is passive and has no editing or navigation behavior', () => {
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
    'drag',
    'resize',
    'PreviewEditable',
    'roleFocus',
    'requestFocus',
  ]) {
    assert.equal(
      overlaySource.includes(forbidden),
      false,
      `unexpected behavior: ${forbidden}`,
    )
  }
})

test('guidance mounts below the existing selection overlay', () => {
  const layersIndex = previewSource.indexOf('DISC_EDITOR_PREVIEW_LAYER_ORDER.map')
  const guidedIndex = previewSource.indexOf('<DiscGuidedPlaceholderOverlay')
  const selectionIndex = previewSource.indexOf('<PreviewElementOverlay')

  assert.ok(layersIndex >= 0 && layersIndex < guidedIndex)
  assert.ok(guidedIndex < selectionIndex)
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

test('guided visuals stay isolated from export, render, persistence, Case Insert, and role focus', () => {
  for (const forbidden of [
    '../../export',
    '../../render',
    '../../project',
    'caseInsert',
    'roleFocus',
    'autoFill',
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
