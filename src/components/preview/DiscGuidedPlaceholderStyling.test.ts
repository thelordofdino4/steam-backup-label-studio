import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const guidedCss = readFileSync(
  new URL('../../styles/app-guided-placeholders.css', import.meta.url),
  'utf8',
)
const previewCss = readFileSync(
  new URL('../../styles/app-preview-shell.css', import.meta.url),
  'utf8',
)
const discTextCss = readFileSync(
  new URL('../../styles/app-disc-text.css', import.meta.url),
  'utf8',
)
const discVisualCss = readFileSync(
  new URL('../../styles/app-disc-visual-layers.css', import.meta.url),
  'utf8',
)

test('guided layers sit behind real owner content and selection feedback', () => {
  assert.match(
    guidedCss,
    /\.disc-guided-placeholder-overlay--background\s*\{[\s\S]*z-index:\s*0/,
  )
  assert.match(
    guidedCss,
    /\.disc-guided-placeholder-overlay--foreground\s*\{[\s\S]*z-index:\s*6/,
  )
  assert.match(
    discTextCss,
    /\.disc-text-layer\s*\{[\s\S]*z-index:\s*7/,
  )
  assert.match(
    discVisualCss,
    /\.disc-logo-asset-layer\s*\{[\s\S]*z-index:\s*3/,
  )
  assert.match(
    discVisualCss,
    /\.disc-title-artwork-layer\s*\{[\s\S]*z-index:\s*3/,
  )
  assert.match(
    discVisualCss,
    /\.disc-rating-badge-layer\s*\{[\s\S]*z-index:\s*4/,
  )
  assert.match(
    previewCss,
    /\.preview-element-overlay-layer\s*\{[\s\S]*z-index:\s*24/,
  )
})

test('guided placeholders reuse the blue dashed pulse and glow language', () => {
  assert.match(guidedCss, /border:\s*2px dashed rgba\(96, 165, 250, 0\.95\)/)
  assert.match(guidedCss, /background:\s*rgba\(59, 130, 246, 0\.1\)/)
  assert.match(guidedCss, /0 0 18px rgba\(37, 99, 235, 0\.3\)/)
  assert.match(
    guidedCss,
    /animation:\s*preview-element-outline-breathe 1400ms ease-in-out infinite/,
  )
  assert.match(previewCss, /@keyframes preview-element-outline-breathe/)
  assert.equal((`${guidedCss}\n${previewCss}`.match(
    /@keyframes preview-element-outline-breathe/g,
  ) ?? []).length, 1)
})

test('reduced motion keeps static blue guidance without animation', () => {
  assert.match(
    guidedCss,
    /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.disc-guided-placeholder-shape\s*\{[\s\S]*?animation:\s*none/,
  )
  assert.match(guidedCss, /\.disc-guided-placeholder-shape\s*\{[\s\S]*?border:/)
  assert.match(guidedCss, /\.disc-guided-placeholder-shape\s*\{[\s\S]*?background:/)
})

test('superseded amber and opaque gray placeholder theme is absent', () => {
  assert.doesNotMatch(guidedCss, /#fbbf24|#fff7dd/i)
  assert.doesNotMatch(guidedCss, /rgba\(17, 24, 39, 0\.62\)/)
  assert.doesNotMatch(guidedCss, /background:\s*(?:rgb\([^)]*\)|#[0-9a-f]{3,8})\s*;/i)
})

test('visual guidance exposes no handles, movement cursor, or pointer behavior', () => {
  const visualCss = guidedCss.slice(
    0,
    guidedCss.indexOf('.disc-guided-placeholder-action-layer'),
  )

  for (const forbidden of [
    'cursor:',
    'grab',
    'resize',
    'handle',
    'pointer-events: auto',
    'pointer-events: all',
  ]) {
    assert.equal(visualCss.includes(forbidden), false, `unexpected style: ${forbidden}`)
  }
})
