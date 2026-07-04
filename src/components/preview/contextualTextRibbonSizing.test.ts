import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  CONTEXTUAL_TEXT_RIBBON_COMPACT_RESERVED_HEIGHT,
  CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS,
  CONTEXTUAL_TEXT_RIBBON_INACTIVE_TOAST_TOP,
  CONTEXTUAL_TEXT_RIBBON_RESERVED_HEIGHT,
  CONTEXTUAL_TEXT_RIBBON_TOAST_GAP,
  CONTEXTUAL_TEXT_RIBBON_WIDE_RESERVED_HEIGHT,
  getContextualTextRibbonActiveWidth,
  getContextualTextRibbonColumnWidths,
  getContextualTextRibbonLayoutModel,
  getContextualTextRibbonReservedHeight,
  getContextualTextRibbonToastOffset,
  packContextualTextRibbonColumns,
} from './contextualTextRibbonModel.ts'

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
  assert.equal(columnWidths[0], CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.min)
  assert.ok(columnWidths[1] > CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.background.preferred)
  assert.ok(columnWidths[2] > CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.border.preferred)
})

test('contextual text ribbon keeps compact paint columns target-parity sized', () => {
  const compactOnlyWidths = getContextualTextRibbonColumnWidths({
    availableWidth: 900,
    gap: 4,
    columns: [
      {
        ...CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['text-color'],
        max: CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.max,
        preferred: CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.preferred,
      },
    ],
  })

  assert.deepEqual(compactOnlyWidths, [
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.min,
  ])
  assert.deepEqual([
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['text-color'].min,
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['text-color'].preferred,
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['text-color'].max,
  ], [108, 108, 108])
  assert.deepEqual([
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.min,
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.preferred,
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.max,
  ], [108, 108, 108])
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['text-color'].grows, undefined)
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.contrast.grows, undefined)
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.background.grows, true)
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.border.grows, true)
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
  const packed = packContextualTextRibbonColumns({
    rowCount: 2,
    items: [
      { id: 'style', payload: 'style', profile: styleProfile },
      { id: 'layout-preset', payload: 'layout', profile: layoutProfile },
    ],
  })
  const menuSource = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorMenuContent.tsx',
  )
  const presetsBlock = menuSource.slice(
    menuSource.indexOf("if (activeTab === 'presets')"),
    menuSource.indexOf("if (activeTab === 'text')"),
  )
  const ribbonCss = readContextualTextRibbonCss()

  assert.equal(styleProfile.fit, 'content')
  assert.equal(layoutProfile.fit, 'content')
  assert.equal(styleProfile.min, layoutProfile.min)
  assert.equal(styleProfile.preferred, layoutProfile.preferred)
  assert.equal(styleProfile.max, layoutProfile.max)
  assert.ok(
    styleProfile.min >= 282,
    'preset cards must reserve title, divider, padding, dropdown width, and reset slot',
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
    ],
  )
  assert.match(
    menuSource,
    /className:\s*'contextual-text-ribbon-control-row--presets'/,
  )
  assert.match(
    menuSource,
    /id:\s*'style'[\s\S]*label:\s*'Style'[\s\S]*className:\s*'contextual-text-ribbon-group--preset-style'/,
  )
  assert.match(
    menuSource,
    /id:\s*'layout-preset'[\s\S]*label:\s*'Layout'[\s\S]*className:\s*'contextual-text-ribbon-group--preset-layout'/,
  )
  assert.match(
    presetsBlock,
    /id:\s*'style'[\s\S]*renderContextualTextRibbonCardResetButton\(\{[\s\S]*ariaLabel:\s*'Reset style'[\s\S]*onClick:\s*controls\.presets\?\.onReset/,
  )
  assert.doesNotMatch(
    presetsBlock,
    /renderContextualTextRibbonGroup\(\{[\s\S]*id:\s*'reset'/,
  )
  assert.doesNotMatch(
    presetsBlock,
    /contextual-text-ribbon-command-button--preset-reset/,
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
    /\.contextual-text-ribbon-card-reset-slot\s*\{[\s\S]*border-left:\s*1px solid rgba\(148,\s*163,\s*184,\s*0\.22\)[\s\S]*\.contextual-text-ribbon-card-reset-button\s*\{[\s\S]*min-width:\s*52px/,
  )
})
