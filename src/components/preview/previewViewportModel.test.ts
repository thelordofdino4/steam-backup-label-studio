import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  PREVIEW_VIEWPORT_DEFAULT_STATE,
  PREVIEW_VIEWPORT_MAX_RAIL_BUTTON_SIZE,
  PREVIEW_VIEWPORT_MIN_RAIL_BUTTON_SIZE,
  choosePreviewViewportRailButtonSize,
  clampPreviewViewportState,
  getPreviewViewportRailHeight,
  getPreviewViewportRailWidth,
  getPreviewViewportPanBounds,
  getPreviewViewportZoomPercent,
  panPreviewViewportBy,
  resetPreviewViewportToFit,
  zoomPreviewViewportAroundPoint,
  type PreviewViewportBounds,
} from './previewViewportModel.ts'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(dirname(currentDir)))

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8')
}

const bounds: PreviewViewportBounds = {
  viewportWidth: 400,
  viewportHeight: 300,
  contentWidth: 320,
  contentHeight: 220,
}

test('preview viewport clamps zoom and keeps fit as the default state', () => {
  assert.equal(getPreviewViewportZoomPercent(1.245), 125)
  assert.deepEqual(resetPreviewViewportToFit(), PREVIEW_VIEWPORT_DEFAULT_STATE)
  assert.deepEqual(
    clampPreviewViewportState({ zoom: 99, panX: 0, panY: 0 }, bounds),
    { zoom: 4, panX: 0, panY: 0 },
  )
  assert.deepEqual(
    clampPreviewViewportState({ zoom: 0, panX: 0, panY: 0 }, bounds),
    { zoom: 0.25, panX: 0, panY: 0 },
  )
})

test('preview viewport pans within transformed surface bounds', () => {
  const zoomedState = { zoom: 2, panX: 0, panY: 0 }
  assert.deepEqual(getPreviewViewportPanBounds(zoomedState, bounds), {
    minX: -120,
    maxX: 120,
    minY: -140,
    maxY: 0,
  })
  assert.deepEqual(
    panPreviewViewportBy(zoomedState, { x: 500, y: -500 }, bounds),
    { zoom: 2, panX: 120, panY: -140 },
  )
})

test('preview viewport zooms around the cursor in top-aligned preview space', () => {
  const nextState = zoomPreviewViewportAroundPoint(
    PREVIEW_VIEWPORT_DEFAULT_STATE,
    2,
    { x: 300, y: 120 },
    bounds,
  )

  assert.deepEqual(nextState, {
    zoom: 2,
    panX: -100,
    panY: -120,
  })
})

test('preview viewport chooses a continuous rail size without reducing fit scale', () => {
  const baseInput = {
    contentHeight: 300,
    contentWidth: 300,
    stageHeight: 300,
    surfaceWindowGap: 4,
    viewportHeight: 400,
    viewportWidth: 600,
  }

  assert.equal(getPreviewViewportRailWidth(PREVIEW_VIEWPORT_MIN_RAIL_BUTTON_SIZE), 48)
  assert.equal(getPreviewViewportRailHeight(PREVIEW_VIEWPORT_MIN_RAIL_BUTTON_SIZE), 120)
  assert.equal(getPreviewViewportRailWidth(PREVIEW_VIEWPORT_MAX_RAIL_BUTTON_SIZE), 96)
  assert.equal(getPreviewViewportRailHeight(PREVIEW_VIEWPORT_MAX_RAIL_BUTTON_SIZE), 240)
  assert.equal(choosePreviewViewportRailButtonSize(baseInput), 48)
  assert.equal(
    choosePreviewViewportRailButtonSize({
      ...baseInput,
      viewportHeight: 220,
    }),
    44,
  )
  assert.equal(
    choosePreviewViewportRailButtonSize({
      ...baseInput,
      viewportHeight: 170,
    }),
    34,
  )
  assert.equal(
    choosePreviewViewportRailButtonSize({
      ...baseInput,
      viewportHeight: 130,
    }),
    26,
  )
  assert.equal(
    choosePreviewViewportRailButtonSize({
      ...baseInput,
      viewportWidth: 360,
    }),
    25,
  )
  assert.equal(
    choosePreviewViewportRailButtonSize({
      ...baseInput,
      viewportWidth: 365,
    }),
    26.25,
  )
  assert.equal(
    choosePreviewViewportRailButtonSize({
      ...baseInput,
      viewportHeight: 177,
    }),
    35.4,
  )
  assert.equal(
    choosePreviewViewportRailButtonSize({
      ...baseInput,
      viewportWidth: 356,
    }),
    24,
  )
  assert.equal(
    choosePreviewViewportRailButtonSize({
      ...baseInput,
      viewportWidth: 365,
    }),
    choosePreviewViewportRailButtonSize({
      ...baseInput,
      viewportWidth: 365,
    }),
  )
})

test('preview viewport controls use the right-edge compact rail presentation', () => {
  const component = readRepoFile('src/components/preview/PreviewViewport.tsx')
  const casePreview = readRepoFile('src/components/preview/CaseInsertPreview.tsx')
  const discPreview = readRepoFile('src/components/preview/DiscPreview.tsx')
  const css = readRepoFile('src/styles/app-preview-shell.css')
  const layoutFixCss = readRepoFile('src/styles/layoutFix.css')

  assert.match(component, /aria-label=\{`Zoom in \$\{label\} from \$\{zoomPercent\} percent`\}/)
  assert.match(component, /aria-label=\{`Zoom out \$\{label\} from \$\{zoomPercent\} percent`\}/)
  assert.match(component, /aria-label=\{`Pan \$\{label\} up, current zoom \$\{zoomPercent\} percent`\}/)
  assert.match(component, /aria-label=\{`Pan \$\{label\} right, current zoom \$\{zoomPercent\} percent`\}/)
  assert.match(component, /aria-label=\{`Pan \$\{label\} down, current zoom \$\{zoomPercent\} percent`\}/)
  assert.match(component, /aria-label=\{`Pan \$\{label\} left, current zoom \$\{zoomPercent\} percent`\}/)
  assert.match(component, /aria-label=\{`Fit \$\{label\} to available space from \$\{zoomPercent\} percent`\}/)
  assert.doesNotMatch(component, /Show \$\{label\} at 100 percent/)
  assert.doesNotMatch(component, />100%</)
  assert.match(component, /choosePreviewViewportRailButtonSize/)
  assert.doesNotMatch(component, /RAIL_BUTTON_SIZE_CANDIDATES/)
  assert.match(component, /railSizingFrozenRef/)
  assert.match(component, /previewInteractionPointerIdRef/)
  assert.match(component, /railInteractionPointerIdRef/)
  assert.match(component, /--preview-viewport-rail-button-size/)
  assert.match(component, /--preview-viewport-rail-width/)
  const buttonOrder = [
    'Zoom in ${label}',
    'Zoom out ${label}',
    'Fit ${label}',
    'Pan ${label} up',
    'Pan ${label} left',
    'Pan ${label} right',
    'Pan ${label} down',
  ].map((text) => component.indexOf(text))
  assert.deepEqual(
    buttonOrder,
    [...buttonOrder].sort((left, right) => left - right),
  )
  assert.ok(buttonOrder.every((index) => index >= 0))
  assert.match(css, /\.preview-viewport-controls\s*\{[\s\S]*right:\s*0/)
  assert.match(css, /\.preview-viewport-controls\s*\{[\s\S]*top:\s*50%/)
  assert.match(css, /--preview-surface-window-gap:\s*4px/)
  assert.match(css, /--preview-viewport-min-rail-width:\s*48px/)
  assert.match(css, /--preview-viewport-rail-collapsed-width:\s*14px/)
  assert.match(css, /--preview-viewport-rail-button-size:\s*24px/)
  assert.match(css, /--preview-viewport-rail-width:\s*48px/)
  assert.match(css, /--preview-area-bottom-padding:\s*0px/)
  assert.match(css, /--preview-bottom-control-closed-height:\s*40px/)
  assert.match(css, /--preview-bottom-control-rail-height:[\s\S]*var\(--preview-bottom-control-closed-height\)[\s\S]*var\(--preview-surface-window-gap\)/)
  assert.doesNotMatch(css, /--preview-bottom-control-open-height/)
  assert.doesNotMatch(css, /has-open-preview-bottom-panel/)
  assert.match(css, /--preview-area-left-padding:\s*4px/)
  assert.match(layoutFixCss, /\.disc-preview\s*\{[\s\S]*100cqh/)
  assert.match(layoutFixCss, /\.case-insert-preview\s*\{[\s\S]*100cqh/)
  assert.doesNotMatch(layoutFixCss, /100vh - var\(--preview-chrome-space\)/)
  assert.match(layoutFixCss, /var\(--preview-area-left-padding,\s*4px\)/)
  assert.match(layoutFixCss, /var\(--preview-area-bottom-padding,\s*0px\)/)
  assert.match(
    css,
    /inset:[\s\S]*0[\s\S]*calc\([\s\S]*var\(--preview-viewport-min-rail-width\)[\s\S]*var\(--preview-surface-window-gap\)[\s\S]*\)[\s\S]*var\(--preview-bottom-control-rail-height\)[\s\S]*var\(--preview-surface-window-gap\)/,
  )
  assert.doesNotMatch(
    css,
    /var\(--preview-viewport-rail-width\)\s*\+\s*var\(--preview-surface-window-gap\)/,
  )
  assert.match(css, /\.preview-viewport-stage\s*\{[\s\S]*container-type:\s*size/)
  assert.match(
    css,
    /\.preview-viewport-controls\s*\{[\s\S]*transform:\s*translateY\(-50%\)/,
  )
  assert.match(
    css,
    /\.preview-viewport-controls\s*\{[\s\S]*width:\s*var\(--preview-viewport-rail-collapsed-width\)/,
  )
  assert.match(css, /\.preview-viewport-controls\s*\{[\s\S]*overflow:\s*visible/)
  assert.match(
    css,
    /\.preview-viewport-controls:hover,\s*\.preview-viewport-controls:focus-within\s*\{[\s\S]*width:\s*var\(--preview-viewport-rail-width\)/,
  )
  assert.match(css, /\.preview-viewport-controls-panel\s*\{[\s\S]*display:\s*grid/)
  assert.match(
    css,
    /\.preview-viewport-controls-panel\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*var\(--preview-viewport-rail-button-size\)\)/,
  )
  assert.match(
    css,
    /\.preview-viewport-controls-panel\s*\{[\s\S]*grid-auto-rows:\s*var\(--preview-viewport-rail-button-size\)/,
  )
  assert.match(css, /\.preview-viewport-button--span\s*\{[\s\S]*grid-column:\s*1 \/ span 2/)
  assert.match(css, /\.preview-viewport-controls-panel\s*\{[\s\S]*overflow:\s*hidden/)
  assert.match(css, /\.preview-viewport-controls-panel\s*\{[\s\S]*pointer-events:\s*none/)
  assert.match(css, /\.preview-viewport-controls-panel\s*\{[\s\S]*scrollbar-width:\s*none/)
  assert.match(
    css,
    /\.preview-viewport-controls:hover \.preview-viewport-controls-panel,\s*\.preview-viewport-controls:focus-within \.preview-viewport-controls-panel\s*\{[\s\S]*transform:\s*translateX\(0\)[\s\S]*opacity:\s*1[\s\S]*pointer-events:\s*auto/,
  )
  assert.match(css, /\.preview-viewport-controls-panel::-webkit-scrollbar\s*\{[\s\S]*display:\s*none/)
  assert.doesNotMatch(css, /\.preview-viewport-controls\s*\{[\s\S]*overflow-x:\s*auto/)
  assert.match(css, /\.preview-viewport-icon-button\s*\{[\s\S]*min-width:\s*24px/)
  assert.match(css, /\.preview-viewport-icon-button\s*\{[\s\S]*min-height:\s*24px/)
  assert.match(css, /\.preview-viewport-svg-icon\s*\{[\s\S]*width:\s*24px/)
  assert.match(css, /\.preview-viewport-svg-icon\s*\{[\s\S]*height:\s*24px/)
  assert.doesNotMatch(css, /left:\s*10px/)
  assert.doesNotMatch(css, /bottom:\s*10px/)
  assert.doesNotMatch(css, /\.disc-preview\s*\{[^}]*,\s*640px[^}]*\}/)
  assert.doesNotMatch(css, /\.case-insert-preview\s*\{[^}]*,\s*1080px[^}]*\}/)
  assert.doesNotMatch(
    layoutFixCss,
    /\.disc-preview\s*\{[^}]*,\s*(?:420px|640px)[^}]*\}/,
  )
  assert.doesNotMatch(
    layoutFixCss,
    /\.case-insert-preview\s*\{[^}]*,\s*(?:420px|1080px)[^}]*\}/,
  )
  assert.doesNotMatch(
    layoutFixCss,
    /\.preview-area\s*\{[^}]*padding:\s*16px\s*!important[^}]*\}/,
  )
  assert.doesNotMatch(casePreview, /has-open-preview-bottom-panel/)
  assert.doesNotMatch(discPreview, /has-open-preview-bottom-panel/)
  assert.match(casePreview, /closedOffset=\{guideLegendClosedSize \+ 4\}/)
  assert.match(discPreview, /closedOffset=\{guideLegendClosedSize \+ 4\}/)
  assert.match(css, /\.preview-guide-legend-panel\.is-open\s*\{[\s\S]*right:\s*0/)
  assert.match(css, /\.preview-guide-legend-panel\.is-open\s*\{[\s\S]*bottom:\s*0/)
  assert.doesNotMatch(css, /\.preview-guide-legend-panel\.is-open\s*\{[\s\S]*clamp\(16px/)
})
