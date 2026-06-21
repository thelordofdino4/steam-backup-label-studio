import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import type {
  InlinePreviewTextEditorControls,
} from './inlinePreviewTextEditorContract.ts'
import {
  CONTEXTUAL_TEXT_RIBBON_INACTIVE_TOAST_TOP,
  CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT,
  CONTEXTUAL_TEXT_RIBBON_TABS,
  CONTEXTUAL_TEXT_RIBBON_TOAST_GAP,
  getContextualTextRibbonControlDescriptors,
  getContextualTextRibbonLayoutModel,
  getContextualTextRibbonTabDisplayLabel,
  getContextualTextRibbonToastOffset,
} from './contextualTextRibbonModel.ts'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(dirname(currentDir)))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
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
      htmlSource: {
        checked: false,
        label: 'HTML source',
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
      respectVisualElements: {
        checked: true,
        label: 'Respect visuals',
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
    deleteAction: {
      label: 'Delete',
      onDelete: noop,
    },
  }
}

test('contextual text ribbon reserves a stable app-shell slot', () => {
  assert.equal(CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT, 64)
  assert.ok(CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT <= 65)
  assert.ok(CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT >= 60)
  assert.equal(
    getContextualTextRibbonToastOffset({ isRibbonActive: false }),
    CONTEXTUAL_TEXT_RIBBON_INACTIVE_TOAST_TOP,
  )
  assert.equal(
    getContextualTextRibbonToastOffset({ isRibbonActive: true }),
    CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT
      + CONTEXTUAL_TEXT_RIBBON_TOAST_GAP,
  )
  assert.equal(
    getContextualTextRibbonToastOffset({
      isRibbonActive: true,
      reservedHeight: 190,
      toastGap: 12,
    }),
    202,
  )
})

test('contextual text ribbon exposes wide medium and narrow layouts', () => {
  assert.deepEqual(getContextualTextRibbonLayoutModel(900), {
    controlColumns: 4,
    controlsMayUseThirdRow: false,
    mode: 'wide',
    tabColumns: 4,
  })
  assert.deepEqual(getContextualTextRibbonLayoutModel(640), {
    controlColumns: 2,
    controlsMayUseThirdRow: false,
    mode: 'medium',
    tabColumns: 4,
  })
  assert.deepEqual(getContextualTextRibbonLayoutModel(420), {
    controlColumns: 1,
    controlsMayUseThirdRow: false,
    mode: 'narrow',
    tabColumns: 4,
  })
})

test('contextual text ribbon reuses the shared contextual tab registry', () => {
  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_TABS, [
    { id: 'presets', label: 'Style Presets' },
    { id: 'text', label: 'Text Controls' },
    { id: 'art', label: 'Artistic Elements' },
    { id: 'utilities', label: 'Utilities' },
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
  assert.ok(ids.includes('delete'))
})

test('contextual text ribbon CSS keeps preview layout independent of activation', () => {
  const appCss = readRepoFile('src/styles/App.css')
  const ribbonCss = readRepoFile('src/styles/app-contextual-text-ribbon.css')
  const feedbackCss = readRepoFile('src/styles/app-preview-feedback.css')
  const previewCss = readRepoFile('src/styles/app-preview-shell.css')
  const layoutFixCss = readRepoFile('src/styles/layoutFix.css')

  assert.match(appCss, /@import '\.\/app-contextual-text-ribbon\.css';/)
  assert.match(ribbonCss, /\.preview-header\s*\{/)
  assert.match(ribbonCss, /grid-template-columns:[\s\S]*--contextual-text-ribbon-label-column[\s\S]*minmax\(0,\s*1fr\)/)
  assert.match(ribbonCss, /min-height: var\(--contextual-text-ribbon-reserved-height\)/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-host/)
  assert.match(ribbonCss, /width:\s*100%/)
  assert.match(ribbonCss, /justify-self:\s*stretch/)
  assert.match(ribbonCss, /max-width:\s*100%/)
  assert.match(ribbonCss, /height:\s*var\(--contextual-text-ribbon-reserved-height\)/)
  assert.match(ribbonCss, /border-radius:\s*0 0 0 8px/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-tabs\s*\{[\s\S]*grid-row:\s*1/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-tab\s*\{[\s\S]*white-space:\s*nowrap/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-controls\s*\{[\s\S]*grid-row:\s*2/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-controls\s*\{[\s\S]*overflow:\s*hidden/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*flex-wrap:\s*nowrap/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*overflow-x:\s*auto/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-group\s*\{[\s\S]*display:\s*flex/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-actions\s*\{[\s\S]*flex:\s*0 0 auto/)
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-portal-slot/)
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-controls--inline-menu/)
  assert.doesNotMatch(ribbonCss, /\.inline-preview-text-control-grid/)
  assert.doesNotMatch(ribbonCss, /width:\s*min\(100%,\s*820px\)/)
  assert.doesNotMatch(ribbonCss, /--contextual-text-ribbon-max-width/)
  assert.doesNotMatch(ribbonCss, /280px/)
  assert.doesNotMatch(ribbonCss, /position:\s*fixed/)
  assert.doesNotMatch(ribbonCss, /position:\s*absolute/)
  assert.match(previewCss, /grid-template-rows:\s*auto minmax\(0,\s*1fr\)/)
  assert.match(previewCss, /--preview-area-padding:\s*clamp/)
  assert.match(previewCss, /--preview-area-top-padding:\s*0px/)
  assert.match(previewCss, /--preview-area-right-padding:\s*0px/)
  assert.match(previewCss, /padding:[\s\S]*var\(--preview-area-top-padding\)[\s\S]*var\(--preview-area-right-padding\)[\s\S]*var\(--preview-area-bottom-padding\)[\s\S]*var\(--preview-area-left-padding\)/)
  assert.match(previewCss, /\.preview-workspace\s*\{[\s\S]*container-type:\s*size/)
  assert.match(previewCss, /\.disc-preview\s*\{[\s\S]*100cqh/)
  assert.match(previewCss, /\.case-insert-preview\s*\{[\s\S]*100cqh/)
  assert.match(layoutFixCss, /--preview-chrome-space:\s*calc\(/)
  assert.match(layoutFixCss, /var\(--contextual-text-ribbon-reserved-height,\s*64px\)/)
  assert.match(layoutFixCss, /var\(--preview-area-top-padding,\s*0px\)/)
  assert.match(layoutFixCss, /var\(--preview-area-bottom-padding,\s*32px\)/)
  assert.doesNotMatch(layoutFixCss, /clamp\(136px,\s*16vh,\s*172px\)/)
  assert.match(
    feedbackCss,
    /\.preview-area\.has-contextual-text-ribbon-active \.preview-toast-stack/,
  )
  assert.match(
    feedbackCss,
    /var\(--contextual-text-ribbon-reserved-height\)/,
  )
  assert.match(feedbackCss, /var\(--preview-area-top-padding,\s*0px\)/)
  assert.match(feedbackCss, /\+\s*8px/)
  assert.doesNotMatch(feedbackCss, /280px/)
})
