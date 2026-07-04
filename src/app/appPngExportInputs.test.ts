import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCaseInsertPngExportInput,
  createDiscPngExportInput,
  type CreateDiscPngExportInputParams,
} from './appPngExportInputs.ts'

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
