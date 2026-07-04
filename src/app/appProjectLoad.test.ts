import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBlankJewelCaseSavedProject,
  type RestoredCaseInsertProjectState,
} from '../project/projectCaseInsert.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import type { RestoredProjectState } from '../project/restoreProjectState.ts'
import {
  runAppProjectLoad,
  type RunAppProjectLoadParams,
} from './appProjectLoad.ts'

type CallRecord = {
  name: string
  value?: unknown
}

type CaseInsertRestoreCallbacks =
  RunAppProjectLoadParams['caseInsertRestore']
type DiscRestoreCallbacks = RunAppProjectLoadParams['discRestore']

function recordValueCall(calls: CallRecord[], name: string) {
  return (value: unknown) => calls.push({ name, value })
}

function recordVoidCall(calls: CallRecord[], name: string) {
  return () => calls.push({ name })
}

function createStatusRecorder(statuses: string[]) {
  return (message: string) => statuses.push(message)
}

function createCaseInsertRestoreCallbacks(
  calls: CallRecord[],
): CaseInsertRestoreCallbacks {
  return {
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
  }
}

function createDiscRestoreCallbacks(calls: CallRecord[]): DiscRestoreCallbacks {
  return {
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
  }
}

function createDiscProjectContents() {
  return JSON.stringify({
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'disc',
    title: 'Saved Disc',
    savedAt: '2026-06-03T12:00:00.000Z',
    game: {
      manualTitle: 'Saved Disc',
      selectedSteamGame: null,
    },
    template: {
      type: 'disc',
      variant: 'standardPrintableDisc',
      customDimensions: null,
    },
    steamBackupLogo: {
      placement: 'top',
    },
    background: {
      scale: 1,
      offset: { x: 0, y: 0 },
      imageDataUrl: null,
      note: 'schema parse fixture',
    },
  })
}

function createRestoredCaseInsertProject(): RestoredCaseInsertProjectState {
  return {
    manualGameTitle: 'Loaded Case',
    projectMetadata: { title: 'Loaded Case' },
    selectedSteamGame: null,
    caseInsert: { templateType: 'jewelCase' },
    activeCaseInsertTemplatePane: 'tray',
  } as unknown as RestoredCaseInsertProjectState
}

function createRestoredDiscProject(
  backgroundImageUrl: string | null = null,
): RestoredProjectState {
  return {
    manualGameTitle: 'Loaded Disc',
    projectMetadata: { title: 'Loaded Disc' },
    projectLogoAssets: { kind: 'logos' },
    projectTitleArtwork: { kind: 'titleArtwork' },
    projectAdditionalArtwork: { kind: 'additionalArtwork' },
    projectRatingBadge: { kind: 'ratingBadge' },
    projectMediaMark: { kind: 'mediaMark' },
    projectPlatformMarks: { kind: 'platformMarks' },
    projectTechnicalMarks: { kind: 'technicalMarks' },
    selectedSteamGame: null,
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
    discTextValues: { title: 'Loaded Disc' },
    discTextValueSources: { title: 'metadata' },
    discTextTitleValue: 'Loaded Disc',
    discTextHtmlSources: {},
    discTextLayout: { title: { x: 1, y: 2 } },
    discTextStyles: { title: { color: '#fff' } },
    backgroundScale: 1,
    backgroundOffset: { x: 0, y: 0 },
    backgroundImageUrl,
    backgroundImageSource: null,
    backgroundImageSize: null,
    isBackgroundArtworkEnabled: true,
  } as unknown as RestoredProjectState
}

test('project load reports cancellation before reading a file', async () => {
  const calls: CallRecord[] = []
  const statuses: string[] = []

  await runAppProjectLoad({
    announceStatus: createStatusRecorder(statuses),
    caseInsertRestore: createCaseInsertRestoreCallbacks(calls),
    discRestore: createDiscRestoreCallbacks(calls),
    openDialog: async (options) => {
      calls.push({
        name: 'openDialog',
        value: `${options.multiple}:${options.filters?.[0]?.extensions.join(',')}`,
      })
      return null
    },
    readProjectFileCommand: async () => {
      calls.push({ name: 'readProjectFileCommand' })
      return ''
    },
    restoreCaseInsertProjectState: () => createRestoredCaseInsertProject(),
    restoreDiscProjectState: async () => createRestoredDiscProject(),
  })

  assert.deepEqual(calls, [
    { name: 'openDialog', value: 'false:json' },
  ])
  assert.deepEqual(statuses, ['Load cancelled.'])
})

test('project load routes case insert projects through case insert restore', async () => {
  const calls: CallRecord[] = []
  const statuses: string[] = []
  const contents = JSON.stringify(createBlankJewelCaseSavedProject('Case Load'))

  await runAppProjectLoad({
    announceStatus: createStatusRecorder(statuses),
    caseInsertRestore: createCaseInsertRestoreCallbacks(calls),
    discRestore: createDiscRestoreCallbacks(calls),
    openDialog: async () => 'case.sbls.json',
    readProjectFileCommand: async (path) => {
      calls.push({ name: 'readProjectFileCommand', value: path })
      return contents
    },
    restoreCaseInsertProjectState: (nextContents) => {
      calls.push({ name: 'restoreCaseInsertProjectState', value: nextContents })
      return createRestoredCaseInsertProject()
    },
    restoreDiscProjectState: async () => {
      calls.push({ name: 'restoreDiscProjectState' })
      return createRestoredDiscProject()
    },
  })

  assert.equal(calls[0].name, 'readProjectFileCommand')
  assert.equal(calls[1].name, 'restoreCaseInsertProjectState')
  assert.equal(
    calls.some((call) => call.name === 'restoreDiscProjectState'),
    false,
  )
  assert.equal(
    calls.find((call) => call.name === 'setActiveWorkspace')?.value,
    'caseInsert',
  )
  assert.deepEqual(statuses, [
    'Loaded case insert project template, metadata, and preview geometry.',
  ])
})

test('project load routes disc projects through disc restore', async () => {
  const calls: CallRecord[] = []
  const statuses: string[] = []

  await runAppProjectLoad({
    announceStatus: createStatusRecorder(statuses),
    caseInsertRestore: createCaseInsertRestoreCallbacks(calls),
    discRestore: createDiscRestoreCallbacks(calls),
    openDialog: async () => 'disc.sbls.json',
    readProjectFileCommand: async (path) => {
      calls.push({ name: 'readProjectFileCommand', value: path })
      return createDiscProjectContents()
    },
    restoreCaseInsertProjectState: () => {
      calls.push({ name: 'restoreCaseInsertProjectState' })
      return createRestoredCaseInsertProject()
    },
    restoreDiscProjectState: async (contents) => {
      calls.push({ name: 'restoreDiscProjectState', value: contents })
      return createRestoredDiscProject('data:image/png;base64,abc')
    },
  })

  assert.equal(
    calls.some((call) => call.name === 'restoreCaseInsertProjectState'),
    false,
  )
  assert.equal(calls[1].name, 'restoreDiscProjectState')
  assert.equal(
    calls.find((call) => call.name === 'setActiveWorkspace')?.value,
    'disc',
  )
  assert.deepEqual(statuses, [
    'Loaded project layout, game metadata, embedded background image, and template geometry.',
  ])
})

test('project load reports route and restore failures', async () => {
  const calls: CallRecord[] = []
  const statuses: string[] = []

  await runAppProjectLoad({
    announceStatus: createStatusRecorder(statuses),
    caseInsertRestore: createCaseInsertRestoreCallbacks(calls),
    discRestore: createDiscRestoreCallbacks(calls),
    openDialog: async () => 'bad.sbls.json',
    readProjectFileCommand: async () => '{not-json',
    restoreCaseInsertProjectState: () => createRestoredCaseInsertProject(),
    restoreDiscProjectState: async () => createRestoredDiscProject(),
  })

  assert.equal(
    calls.some((call) => call.name.startsWith('set')),
    false,
  )
  assert.match(statuses[0], /^Load failed: ProjectSchemaError:/)
})
