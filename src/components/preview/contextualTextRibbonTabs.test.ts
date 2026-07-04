import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS,
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

test('contextual text ribbon utilities tab uses semantic native cards', () => {
  const menuSource = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorMenuContent.tsx',
  )
  const helperSource = readRepoFile(
    'src/components/preview/inlinePreviewTextRibbonControls.tsx',
  )
  const ribbonHostSource = readRepoFile(
    'src/components/preview/ContextualTextRibbon.tsx',
  )
  const ribbonCss = readContextualTextRibbonCss()
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
    ],
  })

  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.position.rowSpan, 2)
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.layout.rowSpan, 2)
  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.layout, {
    min: 424,
    preferred: 568,
    max: 684,
    grows: true,
    rowSpan: 2,
  })
  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['layout-curved'], {
    min: 494,
    preferred: 494,
    max: 494,
    rowSpan: 2,
    fit: 'content',
  })
  assert.deepEqual(
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['layout-curved-compact'],
    {
      min: 334,
      preferred: 334,
      max: 334,
      rowSpan: 2,
      fit: 'content',
    },
  )
  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['layout-compact'], {
    min: 356,
    preferred: 356,
    max: 356,
    rowSpan: 2,
    fit: 'content',
  })
  assert.deepEqual(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS['metadata-source'], {
    min: 248,
    preferred: 268,
    max: 288,
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
    ],
  )
  assert.match(
    menuSource,
    /className:\s*'contextual-text-ribbon-control-row--utilities'/,
  )
  assert.match(
    menuSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-position/,
  )
  assert.match(
    menuSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-layout-ranges/,
  )
  assert.match(
    helperSource,
    /function getContextualTextRibbonRangeValueWidthCss\([\s\S]*control\.min[\s\S]*control\.max[\s\S]*control\.value[\s\S]*return `calc\(\$\{fieldCh\}ch \+ 12px\)`/,
  )
  assert.match(
    menuSource,
    /const isCurvedLayoutRangeStack = Boolean\([\s\S]*isCurvedText[\s\S]*controls\.utilities\?\.lineSpacing[\s\S]*controls\.utilities\?\.arcDegrees/,
  )
  assert.match(
    menuSource,
    /--contextual-text-ribbon-curved-layout-value-width'[\s\S]*getContextualTextRibbonRangeValueWidthCss\(\[[\s\S]*controls\.utilities\?\.lineSpacing,[\s\S]*controls\.utilities\?\.arcDegrees/,
  )
  assert.match(
    menuSource,
    /contextual-text-ribbon-control-stack--utility-curved-layout-ranges/,
  )
  assert.match(
    menuSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-layout-options'[\s\S]*contextual-text-ribbon-control-stack--utility-curved-layout-options/,
  )
  assert.match(
    menuSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--utility-layout-options/,
  )
  assert.match(
    menuSource,
    /id:\s*'position'[\s\S]*label:\s*'Position'/,
  )
  assert.match(
    menuSource,
    /id:\s*'layout'[\s\S]*label:\s*'Layout'/,
  )
  assert.match(
    menuSource,
    /const layoutRangeControls =[\s\S]*controls\.utilities\?\.respectVisualElements[\s\S]*contextual-text-ribbon-control-stack--utility-layout-ranges[\s\S]*renderInlinePreviewTextRangeControl\(controls\.utilities\?\.width\)[\s\S]*renderInlinePreviewTextCheckboxControl\(\s*controls\.utilities\?\.respectVisualElements/,
  )
  assert.doesNotMatch(
    menuSource,
    /const layoutOptionControls =[\s\S]*renderInlinePreviewTextCheckboxControl\(\s*controls\.utilities\?\.respectVisualElements/,
  )
  assert.match(
    menuSource,
    /id:\s*'layout'[\s\S]*\{layoutRangeControls\}[\s\S]*\{layoutOptionControls\}[\s\S]*renderContextualTextRibbonCardResetButton\(\{[\s\S]*ariaLabel:\s*'Reset layout'[\s\S]*onClick:\s*controls\.utilities\?\.resetLayout/,
  )
  assert.match(
    menuSource,
    /const layoutGroupSize = layoutOptionControls[\s\S]*CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS\['layout-curved'\][\s\S]*CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS\.layout[\s\S]*CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS\['layout-curved-compact'\][\s\S]*CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS\['layout-compact'\]/,
  )
  assert.match(
    menuSource,
    /id:\s*'layout'[\s\S]*size:\s*layoutGroupSize/,
  )
  assert.doesNotMatch(menuSource, /contextual-text-ribbon-command-button--utility-reset/)
  assert.doesNotMatch(menuSource, /contextual-text-ribbon-command-button--preset-reset/)
  assert.doesNotMatch(
    menuSource,
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
    /\.contextual-text-ribbon-card-reset-slot\s*\{[\s\S]*align-self:\s*stretch[\s\S]*min-width:\s*58px[\s\S]*border-left:\s*1px solid rgba\(148,\s*163,\s*184,\s*0\.22\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities\s*\{[\s\S]*grid-template-rows:\s*repeat\(2,\s*var\(--contextual-text-ribbon-control-row-height\)\)[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-group--position,[\s\S]*\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-group--layout,[\s\S]*\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-group--metadata-source\s*\{[\s\S]*container-type:\s*inline-size[\s\S]*align-items:\s*stretch[\s\S]*overflow:\s*hidden/,
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
    /--contextual-text-ribbon-utility-range-value-width:\s*62px/,
  )
  assert.match(
    ribbonCss,
    /--contextual-text-ribbon-curved-layout-value-width:\s*44px/,
  )
  assert.match(
    ribbonCss,
    /--contextual-text-ribbon-curved-layout-label-width:\s*72px/,
  )
  assert.match(
    ribbonCss,
    /--contextual-text-ribbon-curved-layout-slider-width:\s*76px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*max-content[\s\S]*minmax\(72px,\s*96px\)[\s\S]*minmax\(var\(--contextual-text-ribbon-utility-range-value-width\),\s*max-content\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control[\s\S]*input\[type="range"\]\s*\{[\s\S]*min-width:\s*72px[\s\S]*max-width:\s*96px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control[\s\S]*input\[type="number"\]\s*\{[\s\S]*width:\s*var\(--contextual-text-ribbon-utility-range-value-width\)[\s\S]*min-width:\s*var\(--contextual-text-ribbon-utility-range-value-width\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-curved-layout-ranges\s*\{[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-curved-layout-options\s*\{[\s\S]*flex:\s*0 0 160px[\s\S]*align-items:\s*stretch[\s\S]*padding-left:\s*4px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-control-stack--utility-curved-layout-ranges[\s\S]*\.contextual-text-ribbon-range-control\s*\{[\s\S]*grid-template-columns:[\s\S]*var\(--contextual-text-ribbon-curved-layout-label-width\)[\s\S]*var\(--contextual-text-ribbon-curved-layout-slider-width\)[\s\S]*var\(--contextual-text-ribbon-curved-layout-value-width\)[\s\S]*justify-content:\s*center/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-curved-layout-ranges[\s\S]*\.contextual-text-ribbon-range-control[\s\S]*\.contextual-text-ribbon-control-label\s*\{[\s\S]*justify-content:\s*center[\s\S]*text-align:\s*center[\s\S]*width:\s*var\(--contextual-text-ribbon-curved-layout-label-width\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-curved-layout-ranges[\s\S]*\.contextual-text-ribbon-range-control[\s\S]*input\[type="range"\]\s*\{[\s\S]*justify-self:\s*center[\s\S]*width:\s*var\(--contextual-text-ribbon-curved-layout-slider-width\)[\s\S]*max-width:\s*var\(--contextual-text-ribbon-curved-layout-slider-width\)/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-curved-layout-ranges[\s\S]*\.contextual-text-ribbon-range-control[\s\S]*input\[type="number"\]\s*\{[\s\S]*appearance:\s*textfield[\s\S]*-webkit-appearance:\s*none[\s\S]*justify-self:\s*end[\s\S]*width:\s*var\(--contextual-text-ribbon-curved-layout-value-width\)[\s\S]*max-width:\s*var\(--contextual-text-ribbon-curved-layout-value-width\)[\s\S]*padding-inline:\s*4px/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-curved-layout-ranges[\s\S]*input\[type="number"\]::-webkit-inner-spin-button,[\s\S]*\.contextual-text-ribbon-control-stack--utility-curved-layout-ranges[\s\S]*input\[type="number"\]::-webkit-outer-spin-button\s*\{[\s\S]*-webkit-appearance:\s*none[\s\S]*margin:\s*0/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-curved-layout-options[\s\S]*\.contextual-text-ribbon-select-control\s*\{[\s\S]*grid-template-columns:\s*54px minmax\(96px,\s*1fr\)[\s\S]*width:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /\.contextual-text-ribbon-control-stack--utility-curved-layout-options[\s\S]*\.contextual-text-ribbon-select-control[\s\S]*select\s*\{[\s\S]*width:\s*100%[\s\S]*min-width:\s*0[\s\S]*max-width:\s*100%/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 719px\)[\s\S]*\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control\s*\{[\s\S]*grid-template-columns:\s*max-content[\s\S]*minmax\(58px,\s*96px\)[\s\S]*minmax\(var\(--contextual-text-ribbon-utility-range-value-width\),\s*max-content\)/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 719px\)[\s\S]*\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control[\s\S]*input\[type="range"\]\s*\{[\s\S]*min-width:\s*58px/,
  )
  assert.match(
    ribbonCss,
    /@container \(max-width: 719px\)[\s\S]*\.contextual-text-ribbon-control-row--utilities[\s\S]*\.contextual-text-ribbon-range-control[\s\S]*input\[type="number"\]\s*\{[\s\S]*width:\s*var\(--contextual-text-ribbon-utility-range-value-width\)[\s\S]*min-width:\s*var\(--contextual-text-ribbon-utility-range-value-width\)/,
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
