import assert from 'node:assert/strict'
import test from 'node:test'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createDefaultDiscTextLayout } from '../discText/index.ts'
import { DEFAULT_DISC_TEXT_SETTINGS } from '../discText/constants.ts'
import { createDefaultProjectRatingBadge } from '../project/projectRatingBadge.ts'
import {
  captureDiscPngLayout,
  createCaseInsertPngExportInput,
  createDiscPngExportInput,
  getDiscPngExportPreviewWidth,
  type CreateDiscPngExportInputParams,
} from './appPngExportInputs.ts'

test('Disc PNG width stays in layout coordinates across viewport zoom and pan', () => {
  for (const zoom of [0.5, 1, 1.12, 2]) {
    const preview = {
      offsetWidth: 600,
      getBoundingClientRect: () => ({ width: 600 * zoom, x: -123, y: 45 }),
    }
    assert.equal(getDiscPngExportPreviewWidth(preview, 640), 600)
  }
  assert.equal(getDiscPngExportPreviewWidth({ offsetWidth: 540 }, 640), 540)
})

test('Disc PNG width falls back when the preview is absent or cannot be measured', () => {
  assert.equal(getDiscPngExportPreviewWidth(null, 640), 640)
  for (const offsetWidth of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(getDiscPngExportPreviewWidth({ offsetWidth }, 640), 640)
  }
})

test('case insert export input groups app-owned branding sources', () => {
  const caseInsert = { templateType: 'jewelCase' }
  const projectMetadata = { title: 'Portal 2' }
  const projectLogoAssets = { developer: [] }
  const projectRatingBadge = { enabled: true }
  const projectMediaMark = { value: 'dvd-rom' }
  const projectPlatformMarks = { windows: true }
  const projectTechnicalMarks = { audio: [] }

  const input = createCaseInsertPngExportInput({
    caseInsert: caseInsert as never,
    activeTemplatePane: 'tray',
    projectMetadata: projectMetadata as never,
    projectLogoAssets: projectLogoAssets as never,
    projectRatingBadge: projectRatingBadge as never,
    projectMediaMark: projectMediaMark as never,
    projectPlatformMarks: projectPlatformMarks as never,
    projectTechnicalMarks: projectTechnicalMarks as never,
  })

  assert.equal(input.caseInsert, caseInsert)
  assert.equal(input.activeTemplatePane, 'tray')
  assert.deepEqual(input.brandingSources, {
    projectMetadata,
    projectLogoAssets,
    projectRatingBadge,
    projectMediaMark,
    projectPlatformMarks,
    projectTechnicalMarks,
  })
})

test('disc export input keeps preflight title separate from renderer title', () => {
  const exportGuides = { mode: 'clean' }
  const params = {
    selectedDiscTemplateId: 'standard',
    selectedDiscTemplate: { id: 'standard' },
    backgroundImageUrl: 'blob:background',
    backgroundImageSize: { width: 100, height: 100 },
    selectedSteamGame: { appId: 620 },
    manualGameTitle: 'Manual title for preflight',
    resolvedDiscTextTitle: 'Resolved title for renderer',
    steamLogoPlacement: 'top',
    steamBannerColors: { accent: '#fff' },
    steamBannerUseTextFallback: false,
    steamBannerFallbackText: 'STEAM',
    steamBannerLockupImageUrl: 'blob:banner',
    steamBannerLockupImageSize: { width: 20, height: 10 },
    steamBannerLockupLayout: { scale: 1 },
    backgroundScale: 1.25,
    backgroundOffset: { x: 4, y: -3 },
    discTextSettings: { title: { enabled: true } },
    discTextValues: { title: 'Portal 2' },
    discTextValueSources: { title: 'metadata' },
    discTextHtmlSources: { title: '<p>Portal 2</p>' },
    discTextStyles: { title: { bold: true } },
    discTextLayout: { title: { width: 70 } },
    projectLogoAssets: { developer: [] },
    projectTitleArtwork: { enabled: true },
    projectDiscNumberArtwork: { enabled: true },
    projectAdditionalArtwork: { elements: [] },
    projectMetadata: { title: 'Portal 2' },
    projectRatingBadge: { enabled: true },
    projectMediaMark: { enabled: true },
    projectPlatformMarks: { windows: true },
    projectTechnicalMarks: { audio: [] },
    exportGuides,
  } as unknown as CreateDiscPngExportInputParams

  const input = createDiscPngExportInput(params)

  assert.equal(input.preflight.manualGameTitle, 'Manual title for preflight')
  assert.equal(input.exportInput.manualGameTitle, 'Resolved title for renderer')
  assert.equal(input.preflight.selectedSteamGame, params.selectedSteamGame)
  assert.equal('selectedSteamGame' in input.exportInput, false)
  assert.equal(input.preflight.exportGuides, exportGuides)
  assert.equal(input.exportInput.exportGuides, exportGuides)
  assert.equal(input.exportInput.backgroundScale, 1.25)
  assert.deepEqual(input.exportInput.backgroundOffset, { x: 4, y: -3 })
})


test('Disc PNG takes complete accepted preset layouts and settings without reclamping', () => {
  const rendered = {
    discTextSettings: { ...DEFAULT_DISC_TEXT_SETTINGS },
    discTextLayout: createDefaultDiscTextLayout('top'),
    projectRatingBadge: createDefaultProjectRatingBadge(),
  }
  const oldLayout = { ...rendered.discTextLayout.title }
  const accepted = {
    ...createBlankDiscSavedProject(),
    discText: {
      settings: { title: false, copyright: true, backupDate: true },
      layout: {
        title: { ...rendered.discTextLayout.title, y: 61.29066667258212, width: 58, scale: 1.08 },
        copyright: { ...rendered.discTextLayout.copyright, y: 8, mode: 'curved' as const },
        backupDate: { ...rendered.discTextLayout.backupDate, x: 0, avoidVisualElements: false },
      },
    },
    ratingBadge: {
      ...rendered.projectRatingBadge,
      // The read change must not replace the renderer's existing non-layout source.
      customImageDataUrl: 'data:image/png;base64,dGVzdA==',
      layout: { enabled: false, x: 78, y: 74, scale: 0.75 },
      uskBadge: { ...rendered.projectRatingBadge.uskBadge,
        layout: { enabled: true, x: 0, y: 55, scale: 0.9 } },
    },
  }
  const captured = captureDiscPngLayout(accepted, rendered)
  assert.deepEqual(captured.discTextLayout.title, accepted.discText.layout.title)
  assert.deepEqual(captured.discTextLayout.copyright, accepted.discText.layout.copyright)
  assert.deepEqual(captured.discTextLayout.backupDate, accepted.discText.layout.backupDate)
  assert.equal(captured.discTextLayout.customNote, rendered.discTextLayout.customNote)
  assert.equal(captured.discTextSettings.title, false)
  assert.equal(captured.discTextSettings.copyright, true)
  assert.equal(captured.discTextSettings.backupDate, true)
  assert.deepEqual(captured.projectRatingBadge.layout, accepted.ratingBadge.layout)
  assert.deepEqual(captured.projectRatingBadge.uskBadge.layout, accepted.ratingBadge.uskBadge.layout)
  assert.equal(captured.projectRatingBadge.customImageDataUrl, rendered.projectRatingBadge.customImageDataUrl)
  assert.deepEqual(rendered.discTextLayout.title, oldLayout, 'capture cannot mutate the mirror')
})

test('Disc PNG retains absent legacy defaults and matches an already mirrored revision', () => {
  const rendered = {
    discTextSettings: { ...DEFAULT_DISC_TEXT_SETTINGS },
    discTextLayout: createDefaultDiscTextLayout('top'),
    projectRatingBadge: createDefaultProjectRatingBadge(),
  }
  assert.deepEqual(captureDiscPngLayout({}, rendered), rendered)
  const partial = captureDiscPngLayout({ discText: {
    settings: { title: false },
    layout: { title: { x: 0, y: 0 }, copyright: { avoidVisualElements: false } },
  } }, rendered)
  assert.deepEqual(partial.discTextLayout.title, { ...rendered.discTextLayout.title, x: 0, y: 0 })
  assert.deepEqual(partial.discTextLayout.copyright,
    { ...rendered.discTextLayout.copyright, avoidVisualElements: false })
  assert.equal(partial.discTextSettings.title, false)
  assert.deepEqual(captureDiscPngLayout({
    discText: { layout: rendered.discTextLayout, settings: rendered.discTextSettings },
    ratingBadge: rendered.projectRatingBadge,
  }, rendered), rendered)
})

test('Disc PNG reads the supplemental USK value from the same revision as its placement', () => {
  const badge = createDefaultProjectRatingBadge()
  const rendered = {
    discTextSettings: { ...DEFAULT_DISC_TEXT_SETTINGS },
    discTextLayout: createDefaultDiscTextLayout('top'),
    projectRatingBadge: {
      ...badge,
      uskBadge: { ...badge.uskBadge, ratingValue: '6' },
    },
  }
  for (const ratingValue of ['16', '0', '']) {
    const uskBadge = { ratingValue, layout: { enabled: ratingValue !== '', x: 0, y: 55, scale: 1 } }
    const accepted = { ...badge, uskBadge }
    const captured = captureDiscPngLayout({ ratingBadge: accepted }, rendered)
    assert.deepEqual(captured.projectRatingBadge.uskBadge, uskBadge)
    assert.equal(rendered.projectRatingBadge.uskBadge.ratingValue, '6')
  }
  // Older documents may have an absent supplemental owner. This differs
  // from an accepted empty value, which deliberately clears the old rating.
  const absentUsk = { ...badge }
  Reflect.deleteProperty(absentUsk, 'uskBadge')
  assert.deepEqual(captureDiscPngLayout({ ratingBadge: absentUsk }, rendered).projectRatingBadge.uskBadge,
    rendered.projectRatingBadge.uskBadge)
})
