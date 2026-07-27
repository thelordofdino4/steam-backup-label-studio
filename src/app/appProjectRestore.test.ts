import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBrandingSources,
} from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import {
  createBlankJewelCaseSavedProject,
} from '../project/caseInsertProjectAdapters.ts'
import { CURRENT_PROJECT_SCHEMA_VERSION } from '../project/projectSchema.ts'
import type {
  ApplicationLifecycleStateCommitResult,
} from '../lifecycle/applicationLifecycleStateStore.ts'
import {
  stageAppProjectOpen,
  type StagedProjectOpenCandidate,
} from './appProjectLoad.ts'
import {
  createApplicationEditorAggregateApplier,
  type ApplicationEditorAggregateApplyDependencies,
} from './appProjectRestore.ts'

type CallRecord = Readonly<{ name: string; value?: unknown }>

function discContents(): string {
  return JSON.stringify({
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    projectType: 'disc',
    title: 'Atomic Disc',
    savedAt: '2026-06-03T12:00:00.000Z',
    game: { manualTitle: 'Atomic Disc', selectedSteamGame: null },
    template: {
      type: 'disc',
      variant: 'standardPrintableDisc',
      customDimensions: null,
    },
    steamBackupLogo: { placement: 'top' },
    background: {
      scale: 1,
      offset: { x: 0, y: 0 },
      imageDataUrl: null,
      note: 'atomic apply fixture',
    },
  })
}

async function stageCandidate(
  contents: string,
): Promise<StagedProjectOpenCandidate> {
  const result = await stageAppProjectOpen({
    openDialog: async () => 'C:\\projects\\atomic.sbls.json',
    readProjectFileCommand: async () => contents,
    caseInsertBrandingSources: createBrandingSources(),
  })
  assert.equal(result.status, 'success')
  if (result.status !== 'success') throw new Error('Candidate did not stage.')
  return result.value
}

function committedResult(): ApplicationLifecycleStateCommitResult {
  return {
    status: 'committed',
    snapshot: {
      generation: 1,
      state: {
        activeSession: null,
        visibleWorkspace: 'home',
      },
    },
  }
}

function createRecordingDependencies() {
  const calls: CallRecord[] = []
  const observedBatches: CallRecord[][] = []
  let insideBatch = false

  const record = (name: string) => (value: unknown) => {
    assert.equal(insideBatch, true, `${name} must run inside the aggregate batch`)
    calls.push({ name, value })
  }
  const recordVoid = (name: string) => () => {
    assert.equal(insideBatch, true, `${name} must run inside the aggregate batch`)
    calls.push({ name })
  }

  const dependencies: ApplicationEditorAggregateApplyDependencies = {
    batchReactUpdates(apply) {
      assert.equal(insideBatch, false)
      insideBatch = true
      try {
        apply()
        observedBatches.push([...calls])
      } finally {
        insideBatch = false
      }
    },
    shell: {
      setActiveWorkspace: record('setActiveWorkspace'),
      setHomeStatusMessage: record('setHomeStatusMessage'),
      restoreCaseInsertRoute(pane, surface) {
        record('restoreCaseInsertRoute')({ pane, surface })
      },
    },
    commonProject: {
      setManualGameTitle: record('setManualGameTitle'),
      setProjectMetadata: record('setProjectMetadata'),
      setSelectedSteamGame: record('setSelectedSteamGame'),
    },
    discProject: {
      restoreDiscGuidedWorkflow: record('restoreDiscGuidedWorkflow'),
      setProjectLogoAssets: record('setProjectLogoAssets'),
      setProjectTitleArtwork: record('setProjectTitleArtwork'),
      setProjectAdditionalArtwork: record('setProjectAdditionalArtwork'),
      setProjectRatingBadge: record('setProjectRatingBadge'),
      setProjectMediaMark: record('setProjectMediaMark'),
      setProjectPlatformMarks: record('setProjectPlatformMarks'),
      setProjectTechnicalMarks: record('setProjectTechnicalMarks'),
      restoreDiscTemplateState: record('restoreDiscTemplateState'),
      setSteamLogoPlacement: record('setSteamLogoPlacement'),
      setSteamBannerColors: record('setSteamBannerColors'),
      setSteamBannerLockupImageUrl: record('setSteamBannerLockupImageUrl'),
      setSteamBannerLockupImageSource: record('setSteamBannerLockupImageSource'),
      setSteamBannerLockupImageSize: record('setSteamBannerLockupImageSize'),
      setSteamBannerLockupLayout: record('setSteamBannerLockupLayout'),
      setSteamBannerUseTextFallback: record('setSteamBannerUseTextFallback'),
      setSteamBannerFallbackText: record('setSteamBannerFallbackText'),
      restoreExportGuides: record('restoreExportGuides'),
      restoreDiscTextState: record('restoreDiscTextState'),
      restoreBackgroundImageState: record('restoreBackgroundImageState'),
    },
    caseInsertProject: {
      setProjectJewelCase: record('setProjectJewelCase'),
    },
    transientEditor: {
      clearPreviewSelections: recordVoid('clearPreviewSelections'),
      clearDiscArtworkSelection: recordVoid('clearDiscArtworkSelection'),
      clearDiscLocalScreenshotResults:
        recordVoid('clearDiscLocalScreenshotResults'),
      restoreActiveDiscPresetState: record('restoreActiveDiscPresetState'),
    },
  }

  return {
    dependencies,
    calls,
    observedBatches,
    isInsideBatch: () => insideBatch,
  }
}

test('Disc candidate commits lifecycle and every editor owner in one synchronous batch', async () => {
  const candidate = await stageCandidate(discContents())
  const recording = createRecordingDependencies()
  const prepared = createApplicationEditorAggregateApplier(
    recording.dependencies,
  ).prepare(candidate)
  assert.equal(prepared.status, 'success')
  if (prepared.status !== 'success') return

  let lifecycleCommits = 0
  const result = prepared.value.commitLifecycleAndApply(() => {
    assert.equal(recording.isInsideBatch(), true)
    lifecycleCommits += 1
    return committedResult()
  })

  assert.equal(result.status, 'committed')
  assert.equal(lifecycleCommits, 1)
  assert.equal(recording.observedBatches.length, 1)
  assert.deepEqual(recording.calls.map(({ name }) => name), [
    'clearPreviewSelections',
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
    'clearDiscArtworkSelection',
    'clearDiscLocalScreenshotResults',
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
    'restoreActiveDiscPresetState',
    'setActiveWorkspace',
    'setHomeStatusMessage',
  ])
  assert.equal(recording.calls.at(-2)?.value, 'disc')
  assert.equal(recording.calls.at(-1)?.value, null)
})

test('Case candidate applies route, branding-complete state, and transient resets atomically', async () => {
  const project = createBlankJewelCaseSavedProject('Atomic Case')
  project.editor = { activeCaseInsertTemplatePane: 'tray' }
  const candidate = await stageCandidate(JSON.stringify(project))
  const recording = createRecordingDependencies()
  const prepared = createApplicationEditorAggregateApplier(
    recording.dependencies,
  ).prepare(candidate)
  assert.equal(prepared.status, 'success')
  if (prepared.status !== 'success') return

  prepared.value.commitLifecycleAndApply(committedResult)

  assert.equal(recording.observedBatches.length, 1)
  assert.deepEqual(recording.calls.map(({ name }) => name), [
    'clearPreviewSelections',
    'setManualGameTitle',
    'setProjectMetadata',
    'setSelectedSteamGame',
    'setProjectJewelCase',
    'restoreCaseInsertRoute',
    'restoreActiveDiscPresetState',
    'setActiveWorkspace',
    'setHomeStatusMessage',
  ])
  assert.deepEqual(recording.calls[5].value, { pane: 'tray', surface: 'back' })
  assert.equal(recording.calls[6].value, null)
  assert.equal(recording.calls[7].value, 'caseInsert')
})

test('stale lifecycle CAS applies no editor state', async () => {
  const candidate = await stageCandidate(discContents())
  const recording = createRecordingDependencies()
  const prepared = createApplicationEditorAggregateApplier(
    recording.dependencies,
  ).prepare(candidate)
  assert.equal(prepared.status, 'success')
  if (prepared.status !== 'success') return

  const stale = {
    ...committedResult(),
    status: 'stale' as const,
  }
  const result = prepared.value.commitLifecycleAndApply(() => stale)
  assert.equal(result.status, 'stale')
  assert.deepEqual(recording.calls, [])
  assert.equal(recording.observedBatches.length, 1)
})

test('mutable or partial candidates cannot enter the aggregate apply boundary', async () => {
  const candidate = await stageCandidate(discContents())
  const mutableCandidate = structuredClone(candidate)
  const recording = createRecordingDependencies()
  const result = createApplicationEditorAggregateApplier(
    recording.dependencies,
  ).prepare(mutableCandidate)

  assert.equal(result.status, 'failure')
  if (result.status === 'failure') {
    assert.equal(
      result.error.code,
      'project.open-editor-apply-precondition-failed',
    )
  }
  assert.deepEqual(recording.calls, [])
})
