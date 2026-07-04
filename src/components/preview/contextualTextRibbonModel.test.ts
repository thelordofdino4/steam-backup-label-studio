import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import type {
  InlinePreviewTextEditorControls,
} from './inlinePreviewTextEditorContract.ts'
import {
  CONTEXTUAL_TEXT_RIBBON_TABS,
  getContextualTextRibbonControlDescriptors,
  getContextualTextRibbonTabDisplayLabel,
} from './contextualTextRibbonModel.ts'
import {
  getContextualTextRibbonScrollDeltaToReveal,
} from './contextualTextRibbonOverflow.ts'
import {
  getContextualTextRibbonScrollRevealDelta,
} from './contextualTextRibbonScrollReveal.ts'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(dirname(currentDir)))

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

function createFixtureControls(): InlinePreviewTextEditorControls {
  const noop = () => undefined
  const selectOptions = [
    { label: 'Default', value: 'default' },
    { label: 'Compact', value: 'compact' },
  ]

  return {
    presets: {
      layout: {
        label: 'Layout preset',
        options: selectOptions,
        value: 'default',
        onChange: noop,
      },
      style: {
        label: 'Style preset',
        options: selectOptions,
        value: 'default',
        onChange: noop,
      },
      onReset: noop,
    },
    text: {
      alignment: {
        label: 'Align',
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
        value: 'center',
        onChange: noop,
      },
      bold: { label: 'Bold', pressed: true, onChange: noop },
      bulletedList: { label: 'Bulleted List', pressed: false, onChange: noop },
      fontFamily: {
        label: 'Font',
        options: selectOptions,
        value: 'default',
        onChange: noop,
      },
      italic: { label: 'Italic', pressed: false, onChange: noop },
      size: {
        label: 'Font size (pt)',
        max: 96,
        min: 6,
        options: [8, 12, 16, 24, 36, 48, 72],
        step: 0.25,
        value: 16,
        onChange: noop,
      },
      textValue: {
        label: 'Text value',
        value: 'Preview text',
        onChange: noop,
      },
      underline: { label: 'Underline', pressed: false, onChange: noop },
    },
    art: {
      backgroundColor: { label: 'Fill', value: '#111827', onChange: noop },
      backgroundEnabled: {
        checked: true,
        label: 'Background',
        onChange: noop,
      },
      backgroundOpacity: {
        label: 'Opacity',
        max: 1,
        min: 0,
        step: 0.05,
        value: 0.7,
        onChange: noop,
      },
      backgroundPadding: {
        label: 'Padding',
        max: 24,
        min: 0,
        step: 1,
        value: 8,
        onChange: noop,
      },
      borderColor: { label: 'Line', value: '#60a5fa', onChange: noop },
      borderEnabled: { checked: true, label: 'Border', onChange: noop },
      borderRadius: {
        label: 'Radius',
        max: 24,
        min: 0,
        step: 1,
        value: 6,
        onChange: noop,
      },
      color: { label: 'Color', value: '#f9fafb', onChange: noop },
      contrast: {
        label: 'Contrast',
        options: selectOptions,
        value: 'default',
        onChange: noop,
      },
    },
    utilities: {
      arcDegrees: {
        label: 'Arc',
        max: 360,
        min: 30,
        step: 1,
        value: 160,
        onChange: noop,
      },
      arcSide: {
        label: 'Arc side',
        options: [
          { label: 'Top', value: 'top' },
          { label: 'Bottom', value: 'bottom' },
        ],
        value: 'top',
        onChange: noop,
      },
      lineSpacing: {
        label: 'Line spacing',
        max: 2,
        min: 0.8,
        step: 0.05,
        value: 1.1,
        onChange: noop,
      },
      mode: {
        label: 'Mode',
        options: selectOptions,
        value: 'default',
        onChange: noop,
      },
      metadataSource: {
        label: 'Game metadata',
        status: 'manual',
        statusLabel: 'Manual override',
        actionLabel: 'Use Game metadata value',
        onAction: noop,
      },
      respectVisualElements: {
        checked: true,
        label: 'Respect visual elements',
        onChange: noop,
      },
      resetLayout: noop,
      width: {
        label: 'Wrap width',
        max: 100,
        min: 10,
        step: 1,
        value: 64,
        onChange: noop,
      },
      x: {
        label: 'X',
        max: 100,
        min: 0,
        step: 1,
        value: 50,
        onChange: noop,
      },
      y: {
        label: 'Y',
        max: 100,
        min: 0,
        step: 1,
        value: 42,
        onChange: noop,
      },
    },
    html: {
      source: {
        checked: false,
        label: 'HTML source',
        onChange: noop,
      },
    },
    deleteAction: {
      label: 'Delete',
      onDelete: noop,
    },
  }
}

test('contextual text ribbon reuses the shared contextual tab registry', () => {
  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_TABS, [
    { id: 'presets', label: 'Style Presets' },
    { id: 'text', label: 'Text Controls' },
    { id: 'art', label: 'Artistic Elements' },
    { id: 'utilities', label: 'Utilities' },
    { id: 'html', label: 'HTML Source' },
  ])
})
test('contextual text ribbon presents compact single-line tab labels', () => {
  assert.deepEqual(
    CONTEXTUAL_TEXT_RIBBON_TABS.map((tab) => ({
      id: tab.id,
      label: getContextualTextRibbonTabDisplayLabel(tab.id),
    })),
    [
      { id: 'presets', label: 'Presets' },
      { id: 'text', label: 'Text' },
      { id: 'art', label: 'Artistic' },
      { id: 'utilities', label: 'Utilities' },
      { id: 'html', label: 'HTML' },
    ],
  )
})

test('contextual text ribbon fixture covers each supported control type', () => {
  const descriptors = getContextualTextRibbonControlDescriptors(
    createFixtureControls(),
  )
  const ids = descriptors.map((descriptor) => descriptor.id)
  const kinds = new Set(descriptors.map((descriptor) => descriptor.kind))

  assert.deepEqual(
    [...kinds].sort(),
    ['action', 'checkbox', 'color', 'number', 'range', 'select', 'text', 'toggle'],
  )
  assert.ok(ids.includes('stylePreset'))
  assert.ok(ids.includes('layoutPreset'))
  assert.ok(ids.includes('fontFamily'))
  assert.ok(ids.includes('size'))
  assert.ok(ids.includes('color'))
  assert.ok(ids.includes('width'))
  assert.ok(ids.includes('metadataSource'))
  assert.ok(ids.includes('htmlSource'))
  assert.ok(ids.includes('delete'))
})

test('contextual text ribbon scrolls whole groups into view', () => {
  const rowRect = { left: 100, right: 500 }

  assert.equal(
    getContextualTextRibbonScrollDeltaToReveal({
      itemRect: { left: 492, right: 700 },
      rowRect,
    }),
    204,
  )
  assert.equal(
    getContextualTextRibbonScrollDeltaToReveal({
      itemRect: { left: 80, right: 260 },
      rowRect,
    }),
    -24,
  )
  assert.equal(
    getContextualTextRibbonScrollDeltaToReveal({
      itemRect: { left: 120, right: 300 },
      rowRect,
    }),
    0,
  )
})

test('contextual text ribbon preserves manual scroll ownership', () => {
  const editorSource = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const revealSource = readRepoFile(
    'src/components/preview/contextualTextRibbonScrollReveal.ts',
  )
  const ribbonCss = readContextualTextRibbonCss()

  assert.doesNotMatch(editorSource, /scrollIntoView\(/)
  assert.doesNotMatch(editorSource, /scrollTo\(/)
  assert.doesNotMatch(editorSource, /scrollBy\(/)
  assert.doesNotMatch(revealSource, /scrollIntoView\(/)
  assert.doesNotMatch(revealSource, /scrollTo\(/)
  assert.doesNotMatch(revealSource, /scrollBy\(/)
  assert.match(
    editorSource,
    /ribbonPointerInteractionRef\.current\s*=\s*true/,
  )
  assert.match(
    editorSource,
    /if\s*\(ribbonPointerInteractionRef\.current\)\s*\{[\s\S]*return[\s\S]*\}/,
  )
  assert.match(
    revealSource,
    /const isFullyHidden =[\s\S]*itemRect\.right <= rowRect\.left \+ 1[\s\S]*itemRect\.left >= rowRect\.right - 1/,
  )
  assert.equal(
    getContextualTextRibbonScrollRevealDelta({
      itemRect: { left: 498.5, right: 620 },
      rowRect: { left: 100, right: 500 },
    }),
    0,
  )
  assert.doesNotMatch(
    ribbonCss,
    /data-ribbon-scroll-clipped[\s\S]*visibility:\s*hidden/,
  )
  assert.doesNotMatch(
    ribbonCss,
    /data-ribbon-scroll-clipped[\s\S]*opacity:\s*0/,
  )
})
