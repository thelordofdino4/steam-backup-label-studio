import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import type {
  InlinePreviewTextEditorControls,
} from './inlinePreviewTextEditorContract.ts'
import {
  CONTEXTUAL_TEXT_RIBBON_COMPACT_RESERVED_HEIGHT,
  CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS,
  CONTEXTUAL_TEXT_RIBBON_INACTIVE_TOAST_TOP,
  CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT,
  CONTEXTUAL_TEXT_RIBBON_TABS,
  CONTEXTUAL_TEXT_RIBBON_TOAST_GAP,
  CONTEXTUAL_TEXT_RIBBON_WIDE_RESERVED_HEIGHT,
  getContextualTextRibbonActiveWidth,
  getContextualTextRibbonColumnWidths,
  getContextualTextRibbonControlDescriptors,
  getContextualTextRibbonLayoutModel,
  getContextualTextRibbonReservedHeight,
  getContextualTextRibbonTabDisplayLabel,
  getContextualTextRibbonToastOffset,
  packContextualTextRibbonColumns,
} from './contextualTextRibbonModel.ts'
import {
  getContextualTextRibbonScrollDeltaToReveal,
} from './contextualTextRibbonOverflow.ts'

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

test('contextual text ribbon reserves a stable app-shell slot', () => {
  assert.equal(CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT, 158)
  assert.equal(CONTEXTUAL_TEXT_RIBBON_WIDE_RESERVED_HEIGHT, 158)
  assert.equal(CONTEXTUAL_TEXT_RIBBON_COMPACT_RESERVED_HEIGHT, 158)
  assert.equal(getContextualTextRibbonReservedHeight('wide'), 158)
  assert.equal(getContextualTextRibbonReservedHeight('medium'), 158)
  assert.equal(getContextualTextRibbonReservedHeight('narrow'), 158)
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
  assert.deepEqual(getContextualTextRibbonLayoutModel(1500), {
    controlColumns: 4,
    controlsMayUseThirdRow: false,
    controlRows: 2,
    mode: 'wide',
    reservedHeight: 158,
    tabColumns: 5,
  })
  assert.deepEqual(getContextualTextRibbonLayoutModel(1100), {
    controlColumns: 2,
    controlsMayUseThirdRow: false,
    controlRows: 2,
    mode: 'medium',
    reservedHeight: 158,
    tabColumns: 5,
  })
  assert.deepEqual(getContextualTextRibbonLayoutModel(420), {
    controlColumns: 1,
    controlsMayUseThirdRow: false,
    controlRows: 2,
    mode: 'narrow',
    reservedHeight: 158,
    tabColumns: 5,
  })
})

test('contextual text ribbon keeps the active host width at the available header width', () => {
  const artisticMin =
    Math.max(
      CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['text-color'].min,
      CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.min,
    )
    + CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.background.min
    + CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.border.min
  const artisticPreferred =
    Math.max(
      CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['text-color'].preferred,
      CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.preferred,
    )
    + CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.background.preferred
    + CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.border.preferred
  const artisticMax =
    Math.max(
      CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['text-color'].max,
      CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.max,
    )
    + CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.background.max
    + CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.border.max

  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.background.rowSpan, 2)
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.border.rowSpan, 2)
  assert.ok(artisticMin < artisticPreferred)
  assert.ok(artisticPreferred < artisticMax)
  assert.equal(
    getContextualTextRibbonActiveWidth(artisticMin - 16, {
      max: artisticMax,
      min: artisticMin,
      preferred: artisticPreferred,
    }),
    artisticMin - 16,
  )
  assert.equal(
    getContextualTextRibbonActiveWidth(artisticPreferred - 8, {
      max: artisticMax,
      min: artisticMin,
      preferred: artisticPreferred,
    }),
    artisticPreferred - 8,
  )
  assert.equal(
    getContextualTextRibbonActiveWidth(artisticMax + 400, {
      max: artisticMax,
      min: artisticMin,
      preferred: artisticPreferred,
    }),
    artisticMax + 400,
  )
})

test('contextual text ribbon equalizes stacked semantic boxes by column', () => {
  const columnWidths = getContextualTextRibbonColumnWidths({
    availableWidth: 1000,
    gap: 4,
    columns: [
      {
        ...CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['text-color'],
        max: CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.max,
        preferred: CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.preferred,
      },
      CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.background,
      CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.border,
    ],
  })

  assert.equal(columnWidths.length, 3)
  assert.equal(columnWidths[0], CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.max)
  assert.ok(columnWidths[1] > CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.background.preferred)
  assert.ok(columnWidths[2] > CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.border.preferred)
})

test('contextual text ribbon fills lower row slots before opening a later column', () => {
  const fixed = (width: number) => ({
    max: width,
    min: width,
    preferred: width,
  })
  const packed = packContextualTextRibbonColumns({
    rowCount: 2,
    items: [
      { id: 'top', payload: 'top', profile: fixed(120) },
      {
        id: 'tall',
        payload: 'tall',
        profile: { ...fixed(240), rowSpan: 2 },
      },
      { id: 'bottom', payload: 'bottom', profile: fixed(180) },
    ],
  })

  assert.deepEqual(
    packed.map((column) => column.items.map((item) => ({
      id: item.id,
      rowSpan: item.rowSpan,
      rowStart: item.rowStart,
    }))),
    [
      [
        { id: 'top', rowSpan: 1, rowStart: 1 },
        { id: 'bottom', rowSpan: 1, rowStart: 2 },
      ],
      [
        { id: 'tall', rowSpan: 2, rowStart: 1 },
      ],
    ],
  )
  assert.equal(packed[0].profile.min, 180)
  assert.equal(packed[0].profile.preferred, 180)
  assert.equal(packed[0].profile.max, 180)
  assert.equal(packed[1].profile.min, 240)
})

test('contextual text ribbon dense text groups remain content fitted', () => {
  const fontProfile = CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.font
  const paragraphProfile = CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.paragraph

  assert.equal(fontProfile.fit, 'content')
  assert.equal(paragraphProfile.fit, 'content')
  assert.ok(
    fontProfile.min < 360,
    'font card minimum should not preserve the old oversized 388px floor',
  )
  assert.ok(
    fontProfile.max - fontProfile.min <= 70,
    'font card content-fit envelope should stay close to its actual controls',
  )
})

test('contextual text ribbon presets tab uses stable semantic cards', () => {
  const styleProfile = CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.style
  const layoutProfile = CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['layout-preset']
  const resetCommandProfile = { min: 52, preferred: 52, max: 52 }
  const packed = packContextualTextRibbonColumns({
    rowCount: 2,
    items: [
      { id: 'style', payload: 'style', profile: styleProfile },
      { id: 'layout-preset', payload: 'layout', profile: layoutProfile },
      { id: 'reset-command', payload: 'reset', profile: resetCommandProfile },
    ],
  })
  const editorSource = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const presetsBlock = editorSource.slice(
    editorSource.indexOf("if (activeTab === 'presets')"),
    editorSource.indexOf("if (activeTab === 'text')"),
  )
  const ribbonCss = readRepoFile('src/styles/app-contextual-text-ribbon.css')

  assert.equal(styleProfile.fit, 'content')
  assert.equal(layoutProfile.fit, 'content')
  assert.equal(styleProfile.min, layoutProfile.min)
  assert.equal(styleProfile.preferred, layoutProfile.preferred)
  assert.equal(styleProfile.max, layoutProfile.max)
  assert.ok(
    styleProfile.min >= 214,
    'preset cards must reserve title, divider, padding, and dropdown width',
  )
  assert.deepEqual(
    packed.map((column) => column.items.map((item) => ({
      id: item.id,
      rowSpan: item.rowSpan,
      rowStart: item.rowStart,
    }))),
    [
      [
        { id: 'style', rowSpan: 1, rowStart: 1 },
        { id: 'layout-preset', rowSpan: 1, rowStart: 2 },
      ],
      [
        { id: 'reset-command', rowSpan: 1, rowStart: 1 },
      ],
    ],
  )
  assert.match(
    editorSource,
    /className:\s*'contextual-text-ribbon-control-row--presets'/,
  )
  assert.match(
    editorSource,
    /id:\s*'style'[\s\S]*label:\s*'Style'[\s\S]*className:\s*'contextual-text-ribbon-group--preset-style'/,
  )
  assert.match(
    editorSource,
    /id:\s*'layout-preset'[\s\S]*label:\s*'Layout'[\s\S]*className:\s*'contextual-text-ribbon-group--preset-layout'/,
  )
  assert.match(
    presetsBlock,
    /className="contextual-text-ribbon-command-button contextual-text-ribbon-command-button--preset-reset"[\s\S]*onClick=\{controls\.presets\.onReset\}[\s\S]*>\s*Reset\s*<\/button>/,
  )
  assert.doesNotMatch(
    presetsBlock,
    /renderContextualTextRibbonGroup\(\{[\s\S]*id:\s*'reset'/,
  )
  assert.doesNotMatch(
    presetsBlock,
    /aria-label="Reset style preset"/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--presets\s*\{[\s\S]*grid-template-rows:\s*repeat\(2,\s*var\(--contextual-text-ribbon-control-row-height\)\)[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--presets[\s\S]*\.contextual-text-ribbon-group--preset-style,[\s\S]*\.contextual-text-ribbon-control-row--presets[\s\S]*\.contextual-text-ribbon-group--preset-layout\s*\{[\s\S]*container-type:\s*inline-size[\s\S]*width:\s*var\(--contextual-text-ribbon-column-width/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--presets[\s\S]*\.contextual-text-ribbon-group--preset-style[\s\S]*\.contextual-text-ribbon-select-control select,[\s\S]*\.contextual-text-ribbon-control-row--presets[\s\S]*\.contextual-text-ribbon-group--preset-layout[\s\S]*\.contextual-text-ribbon-select-control select\s*\{[\s\S]*width:\s*100%[\s\S]*max-width:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--presets[\s\S]*\.contextual-text-ribbon-command-button--preset-reset\s*\{[\s\S]*min-width:\s*52px/,
  )
})

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

test('contextual text ribbon artistic tab uses stable semantic cards', () => {
  const editorSource = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const ribbonHostSource = readRepoFile(
    'src/components/preview/ContextualTextRibbon.tsx',
  )
  const ribbonCss = readRepoFile('src/styles/app-contextual-text-ribbon.css')

  assert.match(
    editorSource,
    /className:\s*'contextual-text-ribbon-control-row--artistic'/,
  )
  assert.match(
    editorSource,
    /id:\s*'text-color'[\s\S]*label:\s*'Text Color'/,
  )
  assert.match(
    editorSource,
    /id:\s*'contrast'[\s\S]*label:\s*'Contrast'/,
  )
  assert.match(
    editorSource,
    /renderInlinePreviewTextArtisticFeatureGroup\(\{[\s\S]*id:\s*'background'[\s\S]*label:\s*'Background'/,
  )
  assert.match(
    editorSource,
    /renderInlinePreviewTextArtisticFeatureGroup\(\{[\s\S]*id:\s*'border'[\s\S]*label:\s*'Border'/,
  )
  assert.match(
    editorSource,
    /ariaLabel:\s*`Enable \$\{label\.toLowerCase\(\)\}`/,
  )
  assert.match(
    editorSource,
    /renderInlinePreviewTextColorControl\([\s\S]*controls\.art\?\.backgroundColor[\s\S]*disabled:\s*!isBackgroundEnabled/,
  )
  assert.match(
    editorSource,
    /renderInlinePreviewTextRangeControl\([\s\S]*controls\.art\?\.backgroundOpacity[\s\S]*presentation:\s*getInlinePreviewTextOpacityPresentation\(\)/,
  )
  assert.match(editorSource, /label:\s*'Fill color'/)
  assert.match(editorSource, /label:\s*'Line color'/)
  assert.match(editorSource, /output:\s*\(value\)\s*=>\s*`\$\{Math\.round\(value \* 100\)\}%`/)
  assert.match(editorSource, /output:\s*\(value\)\s*=>\s*`\$\{formatInlinePreviewTextCompactNumber\(value\)\}cqw`/)
  assert.match(
    editorSource,
    /renderInlinePreviewTextColorControl\([\s\S]*controls\.art\?\.borderColor[\s\S]*disabled:\s*!areBorderFieldsEnabled/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--artistic\s*\{[\s\S]*grid-template-rows:\s*repeat\(2,/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--span-rows\s*\{[\s\S]*grid-row:\s*span 2/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--artistic-feature\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)[\s\S]*overflow:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--artistic-feature[\s\S]*\.contextual-text-ribbon-group-body\s*\{[\s\S]*flex-direction:\s*column/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--artistic-feature[\s\S]*\.contextual-text-ribbon-group-header\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) 24px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group-header-controls\s*\{[\s\S]*min-width:\s*24px[\s\S]*min-height:\s*24px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--artistic-feature[\s\S]*\.contextual-text-ribbon-feature-toggle input\s*\{[\s\S]*width:\s*24px[\s\S]*height:\s*24px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group:focus-within\s*\{[\s\S]*z-index:\s*2/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--contrast\s*\{[\s\S]*container-type:\s*inline-size[\s\S]*overflow:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--contrast\s*\{[\s\S]*width:\s*clamp\([\s\S]*var\(--contextual-text-ribbon-group-min-width\)[\s\S]*18cqw[\s\S]*var\(--contextual-text-ribbon-group-max-width\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--contrast[\s\S]*\.contextual-text-ribbon-control\s*\{[\s\S]*display:\s*flex[\s\S]*justify-content:\s*flex-end/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--contrast[\s\S]*\.contextual-text-ribbon-control-label\s*\{[\s\S]*clip-path:\s*inset\(50%\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--contrast[\s\S]*\.contextual-text-ribbon-control select\s*\{[\s\S]*width:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /--contextual-text-ribbon-bottom-row-gap:\s*2px/,
  )
  assert.match(
    ribbonCss,
    /--contextual-text-ribbon-reserved-height:\s*158px/,
  )
  assert.match(
    ribbonCss,
    /--contextual-text-ribbon-horizontal-scrollbar-height:\s*10px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row\s*\{[\s\S]*grid-template-rows:\s*repeat\([\s\S]*var\(--contextual-text-ribbon-control-row-height\)[\s\S]*height:\s*100%[\s\S]*max-height:\s*100%[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden[\s\S]*padding-bottom:\s*var\(--contextual-text-ribbon-bottom-row-gap\)[\s\S]*scrollbar-width:\s*thin/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group\s*\{[\s\S]*justify-self:\s*stretch/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--artistic\s*\{[\s\S]*grid-template-rows:\s*repeat\(2,\s*var\(--contextual-text-ribbon-control-row-height\)\)[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden[\s\S]*padding-bottom:\s*var\(--contextual-text-ribbon-bottom-row-gap\)[\s\S]*scrollbar-width:\s*thin/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row::-webkit-scrollbar\s*\{[\s\S]*width:\s*0[\s\S]*height:\s*var\(--contextual-text-ribbon-horizontal-scrollbar-height\)/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 719px\)[\s\S]*\.contextual-text-ribbon-group--contrast[\s\S]*\.contextual-text-ribbon-control select\s*\{[\s\S]*width:\s*34px[\s\S]*color:\s*transparent/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 519px\)[\s\S]*\.contextual-text-ribbon-group--contrast[\s\S]*\.contextual-text-ribbon-control select\s*\{[\s\S]*width:\s*34px[\s\S]*color:\s*transparent/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--artistic-feature[\s\S]*\.contextual-text-ribbon-range-value-input\s*\{/,
  )
  assert.match(
    editorSource,
    /className="contextual-text-ribbon-range-value-input"/,
  )
  assert.match(
    editorSource,
    /parseInput:\s*\(value\)\s*=>\s*value \/ 100/,
  )
  assert.match(ribbonCss, /min-height:\s*24px/)
  assert.doesNotMatch(ribbonCss, /min-height:\s*14px/)
  assert.match(
    ribbonHostSource,
    /classList\.contains\('contextual-text-ribbon-tab'\)[\s\S]*textContent\?\.trim\(\)\.length/,
  )
  assert.match(
    ribbonHostSource,
    /dataset\.ribbonGroupPreferredWidth/,
  )
  assert.match(
    ribbonHostSource,
    /function getColumnPackedChildrenInlineWidthProfile/,
  )
  assert.doesNotMatch(ribbonHostSource, /getVerticalScrollbarInlineSize/)
  assert.doesNotMatch(ribbonHostSource, /getRibbonScrollableContentWidth/)
  assert.doesNotMatch(ribbonHostSource, /controlRowReservedScrollbarProfile/)
  assert.match(
    ribbonHostSource,
    /function applyColumnPackedGroupWidths/,
  )
  assert.match(
    ribbonHostSource,
    /packContextualTextRibbonColumns\(\{/,
  )
  assert.match(
    ribbonHostSource,
    /element\.style\.gridColumn = String\(columnIndex \+ 1\)/,
  )
  assert.match(
    ribbonHostSource,
    /element\.style\.gridRow = rowSpan === 2/,
  )
  assert.match(
    ribbonHostSource,
    /element\.dataset\.ribbonRowStart = String\(rowStart\)/,
  )
  assert.match(
    ribbonHostSource,
    /element\.dataset\.ribbonRowSpan = String\(rowSpan\)/,
  )
  assert.match(
    ribbonHostSource,
    /element\.style\.width = widthValue/,
  )
  assert.match(
    ribbonHostSource,
    /element\.style\.maxWidth = widthValue/,
  )
  assert.match(
    ribbonHostSource,
    /element\.dataset\.ribbonColumnIndex = String\(columnIndex\)/,
  )
  assert.match(
    ribbonHostSource,
    /getContextualTextRibbonColumnWidths\(\{/,
  )
  assert.match(
    ribbonHostSource,
    /getColumnPackedChildrenInlineWidthProfile\(controlRow\)/,
  )
  assert.match(
    ribbonHostSource,
    /applyColumnPackedGroupWidths\(controlRow\)/,
  )
  assert.match(
    ribbonHostSource,
    /getContextualTextRibbonActiveWidth\(availableWidth,\s*widthProfile\)/,
  )
  assert.match(
    editorSource,
    /data-ribbon-group-min-width=\{size\?\.min\}/,
  )
  assert.match(
    editorSource,
    /data-ribbon-group-preferred-width=\{size\?\.preferred\}/,
  )
  assert.match(
    editorSource,
    /data-ribbon-group-max-width=\{size\?\.max\}/,
  )
  assert.match(
    editorSource,
    /data-ribbon-group-fit=\{size\?\.fit\}/,
  )
  assert.match(
    ribbonHostSource,
    /element\.dataset\.ribbonGroupFit === 'content'/,
  )
  assert.match(ribbonHostSource, /getRibbonGroupContentWidth\(element\)/)
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.font.fit, 'content')
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.paragraph.fit, 'content')
  assert.ok(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.font.min > 319)
  assert.ok(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.font.max <= 460)
  assert.ok(
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.paragraph.max
      < CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.font.max,
  )
  assert.match(
    editorSource,
    /className="contextual-text-ribbon-point-size-presets inline-preview-text-number-preset-select"/,
  )
  assert.match(
    editorSource,
    /className="contextual-text-ribbon-point-size-chevron-hit"/,
  )
  assert.match(
    editorSource,
    /className="contextual-text-ribbon-point-size-chevron"/,
  )
  assert.match(
    editorSource,
    /data-smoke-id=\{`inline-text-number-options-\$\{token\}`\}/,
  )
  assert.match(editorSource, /<span className="contextual-text-ribbon-control-label">\s*POINTS\s*<\/span>/)
  assert.match(
    editorSource,
    /renderInlinePreviewTextSelectControl\(\s*controls\.text\?\.fontFamily,\s*selection,\s*'STYLES'/,
  )
  assert.match(
    editorSource,
    /renderInlinePreviewTextSelectControl\(\s*controls\.text\?\.alignment,\s*selection,\s*'ALIGN'/,
  )
  assert.match(
    editorSource,
    /className="contextual-text-ribbon-button-cluster-heading"[\s\S]*FORMAT/,
  )
  assert.match(
    editorSource,
    /className="contextual-text-ribbon-button-cluster-caption"[\s\S]*LIST/,
  )
  assert.match(editorSource, /onPointerDown=\{stopInlineTextEditorPointer\}/)
  assert.doesNotMatch(
    editorSource,
    /inline-preview-text-number-preset-button/,
  )
  assert.doesNotMatch(
    editorSource,
    /className="inline-preview-text-number-options"/,
  )
  assert.match(editorSource, /function InlinePreviewTextBulletedListIcon/)
  assert.match(
    editorSource,
    /className:\s*'contextual-text-ribbon-control-row--text'/,
  )
  assert.match(
    editorSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--font-fields/,
  )
  assert.match(
    editorSource,
    /function getContextualTextRibbonMatchedFieldWidthCh/,
  )
  assert.match(
    editorSource,
    /CONTEXTUAL_TEXT_RIBBON_FIELD_MAX_CH/,
  )
  assert.match(
    editorSource,
    /CONTEXTUAL_TEXT_RIBBON_COMPACT_FIELD_MIN_CH/,
  )
  assert.match(
    editorSource,
    /--contextual-text-ribbon-stacked-field-width/,
  )
  assert.match(
    editorSource,
    /contextual-text-ribbon-button-cluster contextual-text-ribbon-button-cluster--emphasis/,
  )
  assert.match(
    editorSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--paragraph-fields/,
  )
  assert.match(
    editorSource,
    /getContextualTextRibbonMatchedFieldWidthCh\(\s*\[controls\.text\?\.alignment\],\s*CONTEXTUAL_TEXT_RIBBON_COMPACT_FIELD_MIN_CH/,
  )
  assert.match(
    editorSource,
    /contextual-text-ribbon-button-cluster contextual-text-ribbon-button-cluster--paragraph/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text\s*\{[\s\S]*grid-template-rows:\s*repeat\(2,\s*var\(--contextual-text-ribbon-control-row-height\)\)[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--font,\s*\.contextual-text-ribbon-group--paragraph\s*\{[\s\S]*container-type:\s*inline-size[\s\S]*overflow:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--font[\s\S]*\.contextual-text-ribbon-group-body\s*\{[\s\S]*grid-template-columns:\s*max-content max-content[\s\S]*justify-content:\s*start[\s\S]*flex:\s*0 0 auto[\s\S]*justify-self:\s*start[\s\S]*width:\s*max-content[\s\S]*max-width:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--font[\s\S]*\.contextual-text-ribbon-control-stack--font-fields\s*\{[\s\S]*grid-template-rows:\s*repeat\(2,\s*24px\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--font[\s\S]*\.contextual-text-ribbon-control-stack--font-fields\s*\{[\s\S]*grid-template-columns:[\s\S]*max-content[\s\S]*minmax\(0,\s*var\(--contextual-text-ribbon-stacked-field-width,\s*12ch\)\)[\s\S]*48px[\s\S]*justify-self:\s*start[\s\S]*width:\s*max-content[\s\S]*max-width:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--font-fields\s*\{[\s\S]*justify-content:\s*start/,
  )
  assert.doesNotMatch(
    ribbonCss,
    /minmax\([\s\S]{0,120}var\(--contextual-text-ribbon-stacked-field-width[\s\S]{0,80}1fr/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--font[\s\S]*\.contextual-text-ribbon-control-stack--font-fields[\s\S]*>\s*\.contextual-text-ribbon-select-control,[\s\S]*>\s*\.contextual-text-ribbon-point-size-control\s*\{[\s\S]*display:\s*contents/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--font-fields[\s\S]*>\s*\.contextual-text-ribbon-select-control[\s\S]*select\s*\{[\s\S]*grid-column:\s*2[\s\S]*grid-row:\s*1/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--font-fields[\s\S]*>\s*\.contextual-text-ribbon-point-size-control[\s\S]*\.contextual-text-ribbon-point-size\s*\{[\s\S]*grid-column:\s*2[\s\S]*grid-row:\s*2[\s\S]*width:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--font[\s\S]*\.contextual-text-ribbon-button-cluster--emphasis\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*24px\)[\s\S]*grid-template-rows:\s*max-content 24px[\s\S]*justify-content:\s*center[\s\S]*justify-items:\s*center[\s\S]*padding-left:\s*5px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-button-cluster-heading\s*\{[\s\S]*grid-column:\s*1 \/ -1[\s\S]*text-decoration:\s*underline[\s\S]*text-underline-offset:\s*2px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--font[\s\S]*\.contextual-text-ribbon-button-cluster--emphasis::before\s*\{[\s\S]*height:\s*24px[\s\S]*border-left:\s*1px solid rgba\(148,\s*163,\s*184,\s*0\.22\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--paragraph[\s\S]*\.contextual-text-ribbon-group-body\s*\{[\s\S]*grid-template-columns:\s*max-content minmax\(max-content,\s*1fr\)[\s\S]*justify-content:\s*start[\s\S]*flex:\s*1 1 auto[\s\S]*justify-self:\s*start[\s\S]*width:\s*100%[\s\S]*max-width:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--paragraph[\s\S]*\.contextual-text-ribbon-control-stack--paragraph-fields\s*\{[\s\S]*grid-template-columns:[\s\S]*max-content[\s\S]*minmax\([\s\S]*0,[\s\S]*min\(100%,\s*var\(--contextual-text-ribbon-stacked-field-width,\s*8ch\)\)[\s\S]*justify-content:\s*start[\s\S]*justify-items:\s*start/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--paragraph[\s\S]*\.contextual-text-ribbon-control-stack--paragraph-fields[\s\S]*>\s*\.contextual-text-ribbon-select-control\s*\{[\s\S]*display:\s*contents/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--paragraph-fields[\s\S]*>\s*\.contextual-text-ribbon-select-control[\s\S]*\.contextual-text-ribbon-control-label\s*\{[\s\S]*grid-column:\s*1[\s\S]*grid-row:\s*1 \/ span 2/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--paragraph-fields[\s\S]*>\s*\.contextual-text-ribbon-select-control[\s\S]*select\s*\{[\s\S]*grid-column:\s*2[\s\S]*grid-row:\s*1 \/ span 2/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--paragraph[\s\S]*\.contextual-text-ribbon-select-control\s*\{[\s\S]*width:\s*100%[\s\S]*max-width:\s*100%[\s\S]*min-width:\s*0/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--paragraph[\s\S]*\.contextual-text-ribbon-button-cluster--paragraph\s*\{[\s\S]*box-sizing:\s*border-box[\s\S]*justify-self:\s*stretch[\s\S]*padding-left:\s*5px[\s\S]*border-left:\s*1px solid rgba\(148,\s*163,\s*184,\s*0\.22\)[\s\S]*width:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-button-cluster-caption\s*\{[\s\S]*grid-column:\s*1[\s\S]*text-transform:\s*uppercase/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--paragraph[\s\S]*\.contextual-text-ribbon-icon-button\s*\{[\s\S]*justify-self:\s*center/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 319px\)[\s\S]*\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--font[\s\S]*\.contextual-text-ribbon-group-body\s*\{[\s\S]*grid-template-columns:\s*max-content max-content[\s\S]*\.contextual-text-ribbon-select-control select[\s\S]*width:\s*34px[\s\S]*color:\s*transparent/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 239px\)[\s\S]*\.contextual-text-ribbon-control-row--text[\s\S]*\.contextual-text-ribbon-group--paragraph[\s\S]*\.contextual-text-ribbon-select-control select[\s\S]*width:\s*34px[\s\S]*color:\s*transparent/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-group--font[\s\S]*\.contextual-text-ribbon-select-control[\s\S]*\.contextual-text-ribbon-control-label,[\s\S]*\.contextual-text-ribbon-group--font[\s\S]*\.contextual-text-ribbon-point-size-control[\s\S]*\.contextual-text-ribbon-control-label\s*\{[\s\S]*clip-path:\s*none/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-point-size\s*\{[\s\S]*box-sizing:\s*border-box[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) 24px[\s\S]*width:\s*92px[\s\S]*height:\s*24px[\s\S]*border:\s*1px solid #374151[\s\S]*background:\s*#0f1117[\s\S]*overflow:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-point-size:focus-within\s*\{[\s\S]*border-color:\s*rgba\(96,\s*165,\s*250,\s*0\.92\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-point-size input:focus,\s*\.contextual-text-ribbon-point-size-presets:focus\s*\{[\s\S]*outline:\s*0/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-point-size input\s*\{[\s\S]*position:\s*relative[\s\S]*grid-column:\s*1[\s\S]*grid-row:\s*1[\s\S]*z-index:\s*3[\s\S]*width:\s*100%[\s\S]*height:\s*100%[\s\S]*min-height:\s*0[\s\S]*background:\s*transparent/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-point-size-chevron-hit\s*\{[\s\S]*position:\s*relative[\s\S]*place-items:\s*center[\s\S]*grid-column:\s*2[\s\S]*grid-row:\s*1[\s\S]*width:\s*24px[\s\S]*height:\s*100%[\s\S]*min-height:\s*0/,
  )
  assert.match(
    ribbonCss,
    /--contextual-text-ribbon-select-chevron:\s*url/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control select\s*\{[\s\S]*appearance:\s*none[\s\S]*-webkit-appearance:\s*none[\s\S]*background-image:\s*var\(--contextual-text-ribbon-select-chevron\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-point-size-presets\s*\{[\s\S]*appearance:\s*none[\s\S]*-webkit-appearance:\s*none[\s\S]*grid-area:\s*1 \/ 1[\s\S]*width:\s*24px[\s\S]*border:\s*0[\s\S]*background:\s*transparent[\s\S]*color:\s*transparent[\s\S]*opacity:\s*0[\s\S]*cursor:\s*pointer/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-point-size-presets option\s*\{[\s\S]*font-size:\s*12px[\s\S]*-webkit-text-fill-color:\s*#f9fafb/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-point-size-chevron\s*\{[\s\S]*display:\s*block[\s\S]*position:\s*absolute[\s\S]*top:\s*50%[\s\S]*right:\s*7px[\s\S]*background-image:\s*var\(--contextual-text-ribbon-select-chevron\)[\s\S]*transform:\s*translateY\(-50%\)[\s\S]*pointer-events:\s*none/,
  )
  assert.doesNotMatch(
    ribbonCss,
    /\.contextual-text-ribbon-point-size-presets\s*\{[^}]*border-left:/,
  )
  assert.doesNotMatch(
    ribbonCss,
    /\.contextual-text-ribbon-point-size-presets\s*\{[^}]*text-indent:/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-list-icon\s*\{[\s\S]*width:\s*16px[\s\S]*height:\s*16px/,
  )
  const featureToggleSource = editorSource.slice(
    editorSource.indexOf('function renderInlinePreviewTextFeatureToggleControl'),
    editorSource.indexOf('function renderInlinePreviewTextArtisticFeatureGroup'),
  )
  assert.doesNotMatch(featureToggleSource, /<span>\{control\.label\}<\/span>/)
})

test('contextual text ribbon utilities tab uses semantic native cards', () => {
  const editorSource = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const ribbonHostSource = readRepoFile(
    'src/components/preview/ContextualTextRibbon.tsx',
  )
  const ribbonCss = readRepoFile('src/styles/app-contextual-text-ribbon.css')
  const packed = packContextualTextRibbonColumns({
    rowCount: 2,
    items: [
      {
        id: 'position',
        payload: null,
        profile: CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.position,
      },
      {
        id: 'layout',
        payload: null,
        profile: CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.layout,
      },
      {
        id: 'reset',
        payload: null,
        profile: CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.reset,
      },
    ],
  })

  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.position.rowSpan, 2)
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.layout.rowSpan, 2)
  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.layout, {
    min: 360,
    preferred: 504,
    max: 620,
    grows: true,
    rowSpan: 2,
  })
  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['layout-compact'], {
    min: 292,
    preferred: 292,
    max: 292,
    rowSpan: 2,
    fit: 'content',
  })
  assert.deepEqual(
    packed.map((column) => column.items.map((item) => ({
      id: item.id,
      rowSpan: item.rowSpan,
      rowStart: item.rowStart,
    }))),
    [
      [{ id: 'position', rowSpan: 2, rowStart: 1 }],
      [{ id: 'layout', rowSpan: 2, rowStart: 1 }],
      [{ id: 'reset', rowSpan: 1, rowStart: 1 }],
    ],
  )
  assert.match(
    editorSource,
    /className:\s*'contextual-text-ribbon-control-row--utilities'/,
  )
  assert.match(
    editorSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-position/,
  )
  assert.match(
    editorSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-layout-ranges/,
  )
  assert.match(
    editorSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-layout-options/,
  )
  assert.match(
    editorSource,
    /id:\s*'position'[\s\S]*label:\s*'Position'/,
  )
  assert.match(
    editorSource,
    /id:\s*'layout'[\s\S]*label:\s*'Layout'/,
  )
  assert.match(
    editorSource,
    /const layoutRangeControls =[\s\S]*controls\.utilities\?\.respectVisualElements[\s\S]*contextual-text-ribbon-control-stack--utility-layout-ranges[\s\S]*renderInlinePreviewTextRangeControl\(controls\.utilities\?\.width\)[\s\S]*renderInlinePreviewTextCheckboxControl\(\s*controls\.utilities\?\.respectVisualElements/,
  )
  assert.doesNotMatch(
    editorSource,
    /const layoutOptionControls =[\s\S]*renderInlinePreviewTextCheckboxControl\(\s*controls\.utilities\?\.respectVisualElements/,
  )
  assert.match(
    editorSource,
    /id:\s*'layout'[\s\S]*\{layoutRangeControls\}[\s\S]*\{layoutOptionControls\}/,
  )
  assert.match(
    editorSource,
    /const layoutGroupSize = layoutOptionControls[\s\S]*CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS\.layout[\s\S]*CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS\['layout-compact'\]/,
  )
  assert.match(
    editorSource,
    /id:\s*'layout'[\s\S]*size:\s*layoutGroupSize/,
  )
  assert.match(
    editorSource,
    /className="contextual-text-ribbon-command-button contextual-text-ribbon-command-button--preset-reset contextual-text-ribbon-command-button--utility-reset"[\s\S]*data-ribbon-group-row-span="2"[\s\S]*aria-label="Reset layout"[\s\S]*>\s*Reset\s*<\/button>/,
  )
  assert.doesNotMatch(
    editorSource,
    /id:\s*'reset'[\s\S]*label:\s*'Reset'[\s\S]*aria-label="Reset layout"[\s\S]*>\s*Layout\s*<\/button>/,
  )
  assert.match(
    ribbonHostSource,
    /function getRibbonElementRowSpan\(element: HTMLElement\): 1 \| 2[\s\S]*dataset\.ribbonGroupRowSpan === '2'/,
  )
  assert.match(
    ribbonHostSource,
    /withRibbonElementRowSpan\([\s\S]*getFixedWidthProfile/,
  )
  assert.match(
    ribbonHostSource,
    /function getRibbonDeclaredWidthProfile\([\s\S]*dataset\.ribbonGroupMinWidth[\s\S]*dataset\.ribbonGroupPreferredWidth[\s\S]*dataset\.ribbonGroupMaxWidth/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-command-button--utility-reset\s*\{[\s\S]*align-self:\s*stretch[\s\S]*min-width:\s*52px[\s\S]*height:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities\s*\{[\s\S]*grid-template-rows:\s*repeat\(2,\s*var\(--contextual-text-ribbon-control-row-height\)\)[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-group--position,[\s\S]*\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-group--layout\s*\{[\s\S]*container-type:\s*inline-size[\s\S]*align-items:\s*stretch[\s\S]*overflow:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-position,[\s\S]*\.contextual-text-ribbon-control-stack--utility-layout-ranges,[\s\S]*\.contextual-text-ribbon-control-stack--utility-layout-options\s*\{[\s\S]*flex-direction:\s*column/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-layout-options\s*\{[\s\S]*border-left:\s*1px solid rgba\(148,\s*163,\s*184,\s*0\.22\)/,
  )
  const utilityLayoutRangesRule = ribbonCss.match(
    /\.contextual-text-ribbon-control-stack--utility-layout-ranges\s*\{[^}]*\}/,
  )
  assert.equal(
    utilityLayoutRangesRule?.[0].includes('border-left') ?? false,
    false,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*max-content[\s\S]*minmax\(72px,\s*96px\)[\s\S]*minmax\(48px,\s*max-content\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control[\s\S]*input\[type="range"\]\s*\{[\s\S]*min-width:\s*72px[\s\S]*max-width:\s*96px/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 719px\)[\s\S]*\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control\s*\{[\s\S]*grid-template-columns:\s*max-content[\s\S]*minmax\(58px,\s*96px\)[\s\S]*minmax\(42px,\s*max-content\)/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 719px\)[\s\S]*\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control[\s\S]*input\[type="range"\]\s*\{[\s\S]*min-width:\s*58px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-toggle-check[\s\S]*span\s*\{[\s\S]*max-width:\s*none[\s\S]*overflow:\s*visible[\s\S]*text-overflow:\s*clip/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 719px\)[\s\S]*\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-toggle-check span\s*\{[\s\S]*max-width:\s*none[\s\S]*overflow:\s*visible[\s\S]*text-overflow:\s*clip/,
  )
})

test('html ribbon tab uses a dedicated source panel instead of a semantic card', () => {
  const editorSource = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const ribbonCss = readRepoFile('src/styles/app-contextual-text-ribbon.css')

  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.source, {
    min: 1,
    preferred: 960,
    max: 4096,
    grows: true,
  })
  assert.match(
    editorSource,
    /function renderInlinePreviewHtmlSourcePanel\(/,
  )
  assert.match(
    editorSource,
    /className="contextual-text-ribbon-html-panel"[\s\S]*data-ribbon-group="source"[\s\S]*data-ribbon-group-row-span="2"[\s\S]*data-ribbon-html-panel/,
  )
  assert.match(
    editorSource,
    /activeTab === 'html'[\s\S]*className:\s*'contextual-text-ribbon-control-row--html'[\s\S]*children:\s*renderInlinePreviewHtmlSourcePanel/,
  )
  assert.doesNotMatch(
    editorSource,
    /activeTab === 'html'[\s\S]*renderContextualTextRibbonGroup\(\{[\s\S]*label:\s*'HTML'/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-html-panel\s*\{[\s\S]*display:\s*grid[\s\S]*grid-row:\s*span 2[\s\S]*overflow:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--html\s*\{[\s\S]*grid-auto-columns:\s*minmax\(0,\s*1fr\)[\s\S]*overflow-x:\s*hidden[\s\S]*padding-bottom:\s*0[\s\S]*scrollbar-width:\s*none/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--html::-webkit-scrollbar\s*\{[\s\S]*display:\s*none/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-source-control\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-source-status\s*\{[\s\S]*flex-wrap:\s*nowrap[\s\S]*overflow:\s*hidden/,
  )
  assert.match(
    editorSource,
    /contextual-text-ribbon-source-validation[\s\S]*\{status\.message\}/,
  )
  assert.doesNotMatch(
    editorSource,
    /inline-preview-text-source-message/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-source-field textarea\s*\{[\s\S]*height:\s*100%[\s\S]*min-height:\s*44px[\s\S]*overflow:\s*auto[\s\S]*white-space:\s*pre/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-html-panel \.contextual-text-ribbon-control-label\s*\{[\s\S]*clip-path:\s*inset\(50%\)/,
  )
})

test('contextual text ribbon preserves manual scroll ownership', () => {
  const editorSource = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )
  const ribbonCss = readRepoFile('src/styles/app-contextual-text-ribbon.css')

  assert.doesNotMatch(editorSource, /scrollIntoView\(/)
  assert.doesNotMatch(editorSource, /scrollTo\(/)
  assert.doesNotMatch(editorSource, /scrollBy\(/)
  assert.match(
    editorSource,
    /ribbonPointerInteractionRef\.current\s*=\s*true/,
  )
  assert.match(
    editorSource,
    /if\s*\(ribbonPointerInteractionRef\.current\)\s*\{[\s\S]*return[\s\S]*\}/,
  )
  assert.match(
    editorSource,
    /const isFullyHidden =[\s\S]*itemRect\.right <= rowRect\.left \+ 1[\s\S]*itemRect\.left >= rowRect\.right - 1/,
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

test('contextual text ribbon color input uses a stable draft path', () => {
  const editorSource = readRepoFile(
    'src/components/preview/InlinePreviewTextEditor.tsx',
  )

  assert.match(editorSource, /const \[draft,\s*setDraft\] = useState\(value\)/)
  assert.match(editorSource, /requestAnimationFrame\(flushPendingColor\)/)
  assert.match(editorSource, /pendingValueRef\.current = nextValue/)
  assert.match(editorSource, /window\.cancelAnimationFrame\(rafRef\.current\)/)
})

test('contextual text ribbon CSS keeps preview layout independent of activation', () => {
  const appCss = readRepoFile('src/styles/App.css')
  const ribbonCss = readRepoFile('src/styles/app-contextual-text-ribbon.css')
  const feedbackCss = readRepoFile('src/styles/app-preview-feedback.css')
  const previewCss = readRepoFile('src/styles/app-preview-shell.css')
  const layoutFixCss = readRepoFile('src/styles/layoutFix.css')

  assert.match(appCss, /@import '\.\/app-contextual-text-ribbon\.css';/)
  assert.match(ribbonCss, /\.preview-header\s*\{/)
  assert.match(ribbonCss, /--contextual-text-ribbon-control-row-count:\s*2/)
  assert.match(ribbonCss, /grid-template-columns:[\s\S]*fit-content\(220px\)[\s\S]*minmax\(0,\s*1fr\)/)
  assert.match(ribbonCss, /gap:\s*0/)
  assert.match(ribbonCss, /min-height: var\(--contextual-text-ribbon-reserved-height\)/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-host/)
  assert.match(ribbonCss, /width:\s*min\(100%,\s*var\(--contextual-text-ribbon-active-width,\s*100%\)\)/)
  assert.match(ribbonCss, /justify-self:\s*end/)
  assert.match(ribbonCss, /max-width:\s*100%/)
  assert.match(ribbonCss, /container-type:\s*inline-size/)
  assert.match(ribbonCss, /height:\s*var\(--contextual-text-ribbon-reserved-height\)/)
  assert.match(ribbonCss, /border-radius:\s*0 0 0 8px/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-tabs\s*\{[\s\S]*grid-row:\s*1/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-tabs\s*\{[\s\S]*repeat\(5,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-tab\s*\{[\s\S]*white-space:\s*nowrap/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-controls\s*\{[\s\S]*grid-row:\s*2/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-controls\s*\{[\s\S]*overflow:\s*hidden/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*display:\s*grid/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*grid-auto-flow:\s*column/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*grid-template-rows:\s*repeat\(/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*overflow-x:\s*auto/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*overflow-y:\s*hidden/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*height:\s*100%/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*max-height:\s*100%/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row\s*\{[\s\S]*padding-bottom:\s*var\(--contextual-text-ribbon-bottom-row-gap\)/)
  assert.doesNotMatch(ribbonCss, /scrollbar-gutter:\s*stable/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-control-row::-webkit-scrollbar\s*\{[\s\S]*width:\s*0[\s\S]*height:\s*var\(--contextual-text-ribbon-horizontal-scrollbar-height\)/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-group\s*\{[\s\S]*display:\s*flex/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-group\s*\{[\s\S]*border:\s*1px solid/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-group-label\s*\{/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-group-body\s*\{/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-html-panel\s*\{[\s\S]*grid-row:\s*span 2/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-html-panel\s*\{[\s\S]*height:\s*100%/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-source-field textarea\s*\{[\s\S]*white-space:\s*pre/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-source-field textarea\s*\{[\s\S]*font-family:[\s\S]*monospace/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-source-field textarea\s*\{[\s\S]*min-height:\s*44px/)
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-group--source-expanded/)
  assert.doesNotMatch(ribbonCss, /scroll-snap-type/)
  assert.doesNotMatch(ribbonCss, /scroll-snap-align/)
  assert.doesNotMatch(ribbonCss, /data-ribbon-overflow-state/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-actions\s*\{[\s\S]*grid-column:\s*2/)
  assert.match(ribbonCss, /\.contextual-text-ribbon-actions\s*\{[\s\S]*display:\s*flex/)
  assert.doesNotMatch(ribbonCss, /--contextual-text-ribbon-label-column/)
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-portal-slot/)
  assert.doesNotMatch(ribbonCss, /\.contextual-text-ribbon-controls--inline-menu/)
  assert.doesNotMatch(ribbonCss, /\.inline-preview-text-control-grid/)
  assert.doesNotMatch(ribbonCss, /width:\s*min\(100%,\s*820px\)/)
  assert.doesNotMatch(ribbonCss, /--contextual-text-ribbon-max-width/)
  assert.doesNotMatch(ribbonCss, /280px/)
  assert.doesNotMatch(ribbonCss, /position:\s*fixed/)
  assert.doesNotMatch(
    ribbonCss,
    /\.contextual-text-ribbon-(?:host|shell|tabs|controls|control-row|group)\s*\{[^}]*position:\s*absolute/,
  )
  assert.match(previewCss, /grid-template-rows:\s*auto minmax\(0,\s*1fr\)/)
  assert.match(previewCss, /--preview-area-padding:\s*clamp/)
  assert.match(previewCss, /--preview-area-top-padding:\s*0px/)
  assert.match(previewCss, /--preview-area-right-padding:\s*0px/)
  assert.match(previewCss, /padding:[\s\S]*var\(--preview-area-top-padding\)[\s\S]*var\(--preview-area-right-padding\)[\s\S]*var\(--preview-area-bottom-padding\)[\s\S]*var\(--preview-area-left-padding\)/)
  assert.match(previewCss, /\.preview-workspace\s*\{[\s\S]*container-type:\s*size/)
  assert.match(previewCss, /\.disc-preview\s*\{[\s\S]*100cqh/)
  assert.match(previewCss, /\.case-insert-preview\s*\{[\s\S]*100cqh/)
  assert.match(layoutFixCss, /--preview-chrome-space:\s*calc\(/)
  assert.match(layoutFixCss, /var\(--contextual-text-ribbon-reserved-height,\s*158px\)/)
  assert.match(layoutFixCss, /var\(--preview-area-top-padding,\s*0px\)/)
  assert.match(layoutFixCss, /var\(--preview-area-bottom-padding,\s*0px\)/)
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
  assert.doesNotMatch(feedbackCss, /\+\s*8px/)
  assert.doesNotMatch(feedbackCss, /280px/)
})
