import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

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

test('contextual text ribbon artistic tab uses stable semantic cards', () => {
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

  assert.match(
    menuSource,
    /className:\s*'contextual-text-ribbon-control-row--artistic'/,
  )
  assert.match(
    menuSource,
    /id:\s*'text-color'[\s\S]*label:\s*'Text Color'/,
  )
  assert.match(
    menuSource,
    /id:\s*'contrast'[\s\S]*label:\s*'Contrast'/,
  )
  assert.match(
    menuSource,
    /renderInlinePreviewTextArtisticFeatureGroup\(\{[\s\S]*id:\s*'background'[\s\S]*label:\s*'Background'/,
  )
  assert.match(
    menuSource,
    /renderInlinePreviewTextArtisticFeatureGroup\(\{[\s\S]*id:\s*'border'[\s\S]*label:\s*'Border'/,
  )
  assert.match(
    helperSource,
    /ariaLabel:\s*`Enable \$\{label\.toLowerCase\(\)\}`/,
  )
  assert.match(
    menuSource,
    /renderInlinePreviewTextColorControl\([\s\S]*controls\.art\?\.backgroundColor[\s\S]*disabled:\s*!isBackgroundEnabled/,
  )
  assert.match(
    menuSource,
    /renderInlinePreviewTextRangeControl\([\s\S]*controls\.art\?\.backgroundOpacity[\s\S]*presentation:\s*getInlinePreviewTextOpacityPresentation\(\)/,
  )
  assert.match(menuSource, /label:\s*'Fill color'/)
  assert.match(menuSource, /label:\s*'Line color'/)
  assert.match(helperSource, /output:\s*\(value\)\s*=>\s*`\$\{Math\.round\(value \* 100\)\}%`/)
  assert.match(helperSource, /output:\s*\(value\)\s*=>\s*`\$\{formatInlinePreviewTextCompactNumber\(value\)\}cqw`/)
  assert.match(
    menuSource,
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
    helperSource,
    /className="contextual-text-ribbon-range-value-input"/,
  )
  assert.match(
    helperSource,
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
    /element\.style\.gridColumn = fillsRow \? '1 \/ -1' : String\(columnIndex \+ 1\)/,
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
    helperSource,
    /data-ribbon-group-min-width=\{size\?\.min\}/,
  )
  assert.match(
    helperSource,
    /data-ribbon-group-preferred-width=\{size\?\.preferred\}/,
  )
  assert.match(
    helperSource,
    /data-ribbon-group-max-width=\{size\?\.max\}/,
  )
  assert.match(
    helperSource,
    /data-ribbon-group-fit=\{size\?\.fit\}/,
  )
  assert.match(
    ribbonHostSource,
    /element\.dataset\.ribbonGroupFit === 'content'/,
  )
  assert.match(ribbonHostSource, /getRibbonGroupContentWidth\(element\)/)
  const featureToggleSource = helperSource.slice(
    helperSource.indexOf('function renderInlinePreviewTextFeatureToggleControl'),
    helperSource.indexOf('function renderInlinePreviewTextArtisticFeatureGroup'),
  )
  assert.doesNotMatch(featureToggleSource, /<span>\{control\.label\}<\/span>/)
})

test('contextual text ribbon color input uses a stable draft path', () => {
  const pointColorSource = readRepoFile(
    'src/components/preview/inlinePreviewTextPointColorControls.tsx',
  )

  assert.match(pointColorSource, /const \[draft,\s*setDraft\] = useState\(value\)/)
  assert.match(pointColorSource, /requestAnimationFrame\(flushPendingColor\)/)
  assert.match(pointColorSource, /pendingValueRef\.current = nextValue/)
  assert.match(pointColorSource, /window\.cancelAnimationFrame\(rafRef\.current\)/)
})
