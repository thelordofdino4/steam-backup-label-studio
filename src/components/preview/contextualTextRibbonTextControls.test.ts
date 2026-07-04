import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS,
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

test('contextual text ribbon text tab uses compact typography controls', () => {
  const menuSource = readRepoFile(
    'src/components/preview/inlinePreviewTextEditorMenuContent.tsx',
  )
  const helperSource = readRepoFile(
    'src/components/preview/inlinePreviewTextRibbonControls.tsx',
  )
  const pointColorSource = readRepoFile(
    'src/components/preview/inlinePreviewTextPointColorControls.tsx',
  )
  const ribbonCss = readContextualTextRibbonCss()

  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.font.fit, 'content')
  assert.equal(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.paragraph.fit, 'content')
  assert.ok(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.font.min > 319)
  assert.ok(CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.font.max <= 460)
  assert.ok(
    CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.paragraph.max
      < CONTEXTUAL_TEXT_RIBBON_GROUP_WIDTHS.font.max,
  )
  assert.match(
    pointColorSource,
    /className="contextual-text-ribbon-point-size-presets inline-preview-text-number-preset-select"/,
  )
  assert.match(
    pointColorSource,
    /className="contextual-text-ribbon-point-size-chevron-hit"/,
  )
  assert.match(
    pointColorSource,
    /className="contextual-text-ribbon-point-size-chevron"/,
  )
  assert.match(
    pointColorSource,
    /data-smoke-id=\{`inline-text-number-options-\$\{token\}`\}/,
  )
  assert.match(
    pointColorSource,
    /<span className="contextual-text-ribbon-control-label">\s*POINTS\s*<\/span>/,
  )
  assert.match(
    menuSource,
    /renderInlinePreviewTextSelectControl\(\s*controls\.text\?\.fontFamily,\s*selection,\s*'STYLES'/,
  )
  assert.match(
    menuSource,
    /renderInlinePreviewTextSelectControl\(\s*controls\.text\?\.alignment,\s*selection,\s*'ALIGN'/,
  )
  assert.match(
    menuSource,
    /className="contextual-text-ribbon-button-cluster-heading"[\s\S]*FORMAT/,
  )
  assert.match(
    menuSource,
    /className="contextual-text-ribbon-button-cluster-caption"[\s\S]*LIST/,
  )
  assert.match(pointColorSource, /onPointerDown=\{stopInlineTextEditorPointer\}/)
  assert.doesNotMatch(
    pointColorSource,
    /inline-preview-text-number-preset-button/,
  )
  assert.doesNotMatch(
    pointColorSource,
    /className="inline-preview-text-number-options"/,
  )
  assert.match(helperSource, /function renderInlinePreviewTextBulletedListIcon/)
  assert.match(
    menuSource,
    /className:\s*'contextual-text-ribbon-control-row--text'/,
  )
  assert.match(
    menuSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--font-fields/,
  )
  assert.match(
    helperSource,
    /function getContextualTextRibbonMatchedFieldWidthCh/,
  )
  assert.match(
    helperSource,
    /CONTEXTUAL_TEXT_RIBBON_FIELD_MAX_CH/,
  )
  assert.match(
    menuSource,
    /CONTEXTUAL_TEXT_RIBBON_COMPACT_FIELD_MIN_CH/,
  )
  assert.match(
    menuSource,
    /--contextual-text-ribbon-stacked-field-width/,
  )
  assert.match(
    menuSource,
    /contextual-text-ribbon-button-cluster contextual-text-ribbon-button-cluster--emphasis/,
  )
  assert.match(
    menuSource,
    /contextual-text-ribbon-control-stack contextual-text-ribbon-control-stack--paragraph-fields/,
  )
  assert.match(
    menuSource,
    /getContextualTextRibbonMatchedFieldWidthCh\(\s*\[controls\.text\?\.alignment\],\s*CONTEXTUAL_TEXT_RIBBON_COMPACT_FIELD_MIN_CH/,
  )
  assert.match(
    menuSource,
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
})
