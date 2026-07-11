import assert from 'node:assert/strict'
import test from 'node:test'
import type { RestoredCaseInsertProjectState } from '../project/projectCaseInsert.ts'
import type { RestoredProjectState } from '../project/restoreProjectState.ts'
import {
  applyRestoredCaseInsertProjectState,
  applyRestoredDiscProjectState,
} from './appProjectRestore.ts'

type CallRecord = {
  name: string
  value?: unknown
}

function recordValueCall(calls: CallRecord[], name: string) {
  return (value: unknown) => calls.push({ name, value })
}

function recordVoidCall(calls: CallRecord[], name: string) {
  return () => calls.push({ name })
}

test('case insert project restore applies app shell state in the load order', () => {
  const calls: CallRecord[] = []
  const restoredProject = {
    manualGameTitle: 'Case title',
    projectMetadata: { title: 'Case title' },
    selectedSteamGame: { appId: 123 },
    caseInsert: { templateType: 'jewelCase' },
    activeCaseInsertTemplatePane: 'tray',
  } as unknown as RestoredCaseInsertProjectState

  applyRestoredCaseInsertProjectState({
    restoredProject,
    setManualGameTitle: recordValueCall(calls, 'setManualGameTitle'),
    setProjectMetadata: recordValueCall(calls, 'setProjectMetadata'),
    setSelectedSteamGame: recordValueCall(calls, 'setSelectedSteamGame'),
    setProjectJewelCase: recordValueCall(calls, 'setProjectJewelCase'),
    setActiveCaseInsertTemplatePane:
      recordValueCall(calls, 'setActiveCaseInsertTemplatePane'),
    setActiveWorkspace: recordValueCall(calls, 'setActiveWorkspace'),
    setHomeStatusMessage: recordValueCall(calls, 'setHomeStatusMessage'),
    scheduleCaseInsertBrandingMarkSlotSync:
      recordValueCall(calls, 'scheduleCaseInsertBrandingMarkSlotSync'),
  })

  assert.deepEqual(
    calls.map((call) => call.name),
    [
      'setManualGameTitle',
      'setProjectMetadata',
      'setSelectedSteamGame',
      'setProjectJewelCase',
      'setActiveCaseInsertTemplatePane',
      'setActiveWorkspace',
      'setHomeStatusMessage',
      'scheduleCaseInsertBrandingMarkSlotSync',
    ],
  )
  assert.equal(calls[5].value, 'caseInsert')
  assert.equal(calls[6].value, null)
  assert.deepEqual(calls[7].value, {
    projectMetadata: restoredProject.projectMetadata,
  })
})

test('disc project restore groups restored disc text and background state', () => {
  const calls: CallRecord[] = []
  const restoredProject = {
    discGuidedWorkflow: {
      activeLayout: {
        id: 'disc:guided-layout:classic-top-title',
        version: 1,
      },
      omittedSlotIds: ['disc:guided:publisher-logo:primary'],
    },
    manualGameTitle: 'Disc title',
    projectMetadata: { title: 'Disc title' },
    projectLogoAssets: { kind: 'logos' },
    projectTitleArtwork: { kind: 'titleArtwork' },
    projectAdditionalArtwork: { kind: 'additionalArtwork' },
    projectRatingBadge: { kind: 'ratingBadge' },
    projectMediaMark: { kind: 'mediaMark' },
    projectPlatformMarks: { kind: 'platformMarks' },
    projectTechnicalMarks: { kind: 'technicalMarks' },
    selectedSteamGame: { appId: 456 },
    template: { selectedDiscTemplateId: 'standardPrintableDisc' },
    steamLogoPlacement: 'top',
    steamBannerColors: { gradientStart: '#111', gradientEnd: '#222', accent: '#333' },
    steamBannerLockupImageUrl: 'lockup',
    steamBannerLockupImageSource: { source: 'built-in' },
    steamBannerLockupImageSize: { width: 1, height: 2 },
    steamBannerLockupLayout: { scale: 1, offsetX: 2, offsetY: 3 },
    steamBannerUseTextFallback: false,
    steamBannerFallbackText: 'Steam Backup',
    exportGuides: { mode: 'none' },
    projectDiscNumberArtwork: { mode: 'text' },
    discTextSettings: { title: { enabled: true } },
    discTextValues: { title: 'Disc title' },
    discTextValueSources: { title: 'metadata' },
    discTextTitleValue: 'Title override',
    discTextHtmlSources: { title: '<strong>Disc title</strong>' },
    discTextLayout: { title: { x: 1, y: 2 } },
    discTextStyles: { title: { color: '#fff' } },
    backgroundScale: 1.2,
    backgroundOffset: { x: 3, y: 4 },
    backgroundImageUrl: 'background',
    backgroundImageSource: { source: 'uploaded' },
    backgroundImageSize: { width: 100, height: 200 },
    isBackgroundArtworkEnabled: true,
  } as unknown as RestoredProjectState

  applyRestoredDiscProjectState({
    restoredProject,
    restoreDiscGuidedWorkflow:
      recordValueCall(calls, 'restoreDiscGuidedWorkflow'),
    setManualGameTitle: recordValueCall(calls, 'setManualGameTitle'),
    setProjectMetadata: recordValueCall(calls, 'setProjectMetadata'),
    setProjectLogoAssets: recordValueCall(calls, 'setProjectLogoAssets'),
    setProjectTitleArtwork: recordValueCall(calls, 'setProjectTitleArtwork'),
    setProjectAdditionalArtwork:
      recordValueCall(calls, 'setProjectAdditionalArtwork'),
    setProjectRatingBadge: recordValueCall(calls, 'setProjectRatingBadge'),
    setProjectMediaMark: recordValueCall(calls, 'setProjectMediaMark'),
    setProjectPlatformMarks: recordValueCall(calls, 'setProjectPlatformMarks'),
    setProjectTechnicalMarks: recordValueCall(calls, 'setProjectTechnicalMarks'),
    setSelectedSteamGame: recordValueCall(calls, 'setSelectedSteamGame'),
    clearSelectedArtwork: recordVoidCall(calls, 'clearSelectedArtwork'),
    clearLocalSteamScreenshotResults:
      recordVoidCall(calls, 'clearLocalSteamScreenshotResults'),
    restoreDiscTemplateState: recordValueCall(calls, 'restoreDiscTemplateState'),
    setSteamLogoPlacement: recordValueCall(calls, 'setSteamLogoPlacement'),
    setSteamBannerColors: recordValueCall(calls, 'setSteamBannerColors'),
    setSteamBannerLockupImageUrl:
      recordValueCall(calls, 'setSteamBannerLockupImageUrl'),
    setSteamBannerLockupImageSource:
      recordValueCall(calls, 'setSteamBannerLockupImageSource'),
    setSteamBannerLockupImageSize:
      recordValueCall(calls, 'setSteamBannerLockupImageSize'),
    setSteamBannerLockupLayout:
      recordValueCall(calls, 'setSteamBannerLockupLayout'),
    setSteamBannerUseTextFallback:
      recordValueCall(calls, 'setSteamBannerUseTextFallback'),
    setSteamBannerFallbackText:
      recordValueCall(calls, 'setSteamBannerFallbackText'),
    restoreExportGuides: recordValueCall(calls, 'restoreExportGuides'),
    restoreDiscTextState: recordValueCall(calls, 'restoreDiscTextState'),
    restoreBackgroundImageState:
      recordValueCall(calls, 'restoreBackgroundImageState'),
    setActiveWorkspace: recordValueCall(calls, 'setActiveWorkspace'),
    setHomeStatusMessage: recordValueCall(calls, 'setHomeStatusMessage'),
  })

  assert.deepEqual(
    calls.map((call) => call.name),
    [
      'restoreDiscGuidedWorkflow',
      'setManualGameTitle',
      'setProjectMetadata',
      'setProjectLogoAssets',
      'setProjectTitleArtwork',
      'setProjectAdditionalArtwork',
      'setProjectRatingBadge',
      'setProjectMediaMark',
      'setProjectPlatformMarks',
      'setProjectTechnicalMarks',
      'setSelectedSteamGame',
      'clearSelectedArtwork',
      'clearLocalSteamScreenshotResults',
      'restoreDiscTemplateState',
      'setSteamLogoPlacement',
      'setSteamBannerColors',
      'setSteamBannerLockupImageUrl',
      'setSteamBannerLockupImageSource',
      'setSteamBannerLockupImageSize',
      'setSteamBannerLockupLayout',
      'setSteamBannerUseTextFallback',
      'setSteamBannerFallbackText',
      'restoreExportGuides',
      'restoreDiscTextState',
      'restoreBackgroundImageState',
      'setActiveWorkspace',
      'setHomeStatusMessage',
    ],
  )
  assert.deepEqual(calls[23].value, {
    projectDiscNumberArtwork: restoredProject.projectDiscNumberArtwork,
    discTextSettings: restoredProject.discTextSettings,
    discTextValues: restoredProject.discTextValues,
    discTextValueSources: restoredProject.discTextValueSources,
    discTextTitleValue: restoredProject.discTextTitleValue,
    discTextHtmlSources: restoredProject.discTextHtmlSources,
    discTextLayout: restoredProject.discTextLayout,
    discTextStyles: restoredProject.discTextStyles,
  })
  assert.deepEqual(calls[24].value, {
    backgroundScale: restoredProject.backgroundScale,
    backgroundOffset: restoredProject.backgroundOffset,
    backgroundImageUrl: restoredProject.backgroundImageUrl,
    backgroundImageSource: restoredProject.backgroundImageSource,
    backgroundImageSize: restoredProject.backgroundImageSize,
    isBackgroundArtworkEnabled: restoredProject.isBackgroundArtworkEnabled,
  })
  assert.deepEqual(calls[0].value, restoredProject.discGuidedWorkflow)
  assert.equal(calls[25].value, 'disc')
  assert.equal(calls[26].value, null)
})
