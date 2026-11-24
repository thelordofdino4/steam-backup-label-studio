import { materializeDiscProject } from '../lifecycle/canonicalProject.ts'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL } from '../assets/assetManifest.ts'
import { createBrandingSources } from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import type { CreateCaseInsertProjectSnapshotParams } from '../caseInsert/types.ts'
import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import {
  captureNormalizedProjectSnapshot,
  createCanonicalProjectComparisonValue,
} from '../lifecycle/canonicalProject.ts'
import { selectIsActiveProjectDirty } from '../lifecycle/projectSession.ts'
import { createBlankJewelCaseSavedProject } from '../project/caseInsertProjectAdapters.ts'
import type { CreateProjectSnapshotParams } from '../project/createProjectSnapshot.ts'
import { parseSavedProjectContents } from '../project/projectSchema.ts'
import { restoreSavedProjectState } from '../project/restoreProjectState.ts'
import type { SavedDiscProject } from '../project/projectTypes.ts'
import { createProjectPackageCommandFailure } from '../tauri/packageProjectFile.ts'
import { createProjectPackageWritePort, LEGACY_SOURCE_PATH_HEADER_NAME, type ProjectPackageWritePort } from '../tauri/projectPackageWrite.ts'
import { stageAppProjectOpen, type StagedProjectOpenCandidate } from './appProjectLoad.ts'
import { createApplicationEditorAggregateApplier } from './appProjectRestore.ts'
import { createLegacyProjectForWorkspace } from './appProjectSave.ts'
import { createApplicationLifecycleRuntime } from './applicationLifecycleRuntime.ts'

const sourcePath = 'C:\\projects\\legacy.sbls.json'
const destinationPath = 'C:\\projects\\converted.sbls'
const fixture = (name: string) => readFile(`fixtures/projects/${name}.sbls.json`, 'utf8')

/** Production Open/apply/capture/sync/Save owners; native I/O and React setters are ports. */
function harness(contents: string, format: 'legacy-json' | 'sbls-package-v1' = 'legacy-json') {
  const disc: Partial<CreateProjectSnapshotParams> = {}
  const caseInsert: CreateCaseInsertProjectSnapshotParams = {}
  const options = {
    contents, cancelSave: false, onBackgroundResolution: () => {},
    writePort: null as ProjectPackageWritePort | null,
  }
  let workspace: 'disc' | 'caseInsert' = 'disc'
  let candidate: StagedProjectOpenCandidate | undefined
  let insideBatch = false
  let publications = 0
  let prompts = 0
  let saveDialogs = 0
  const writes: Parameters<ProjectPackageWritePort['encodeAndWrite']>[0][] = []
  const set = <Key extends keyof CreateProjectSnapshotParams>(key: Key) =>
    (value: CreateProjectSnapshotParams[Key]) => {
      assert.equal(insideBatch, true)
      disc[key] = value
    }
  const apply = createApplicationEditorAggregateApplier({
    batchReactUpdates(commit) {
      insideBatch = true
      try { commit() } finally { insideBatch = false }
    },
    shell: {
      setActiveWorkspace: (value) => { workspace = value },
      setHomeStatusMessage: () => {},
      restoreCaseInsertRoute: (pane) => { caseInsert.activeCaseInsertTemplatePane = pane },
    },
    commonProject: {
      setManualGameTitle(value) { set('manualGameTitle')(value); caseInsert.manualGameTitle = value },
      setProjectMetadata(value) { set('projectMetadata')(value); caseInsert.projectMetadata = value },
      setSelectedSteamGame(value) { set('selectedSteamGame')(value); caseInsert.selectedSteamGame = value },
    },
    discProject: {
      restoreDiscGuidedWorkflow: set('discGuidedWorkflow'),
      setProjectLogoAssets: set('projectLogoAssets'),
      setProjectTitleArtwork: set('projectTitleArtwork'),
      setProjectAdditionalArtwork: set('projectAdditionalArtwork'),
      setProjectRatingBadge: set('projectRatingBadge'),
      setProjectMediaMark: set('projectMediaMark'),
      setProjectPlatformMarks: set('projectPlatformMarks'),
      setProjectTechnicalMarks: set('projectTechnicalMarks'),
      restoreDiscTemplateState(value) {
        set('selectedDiscTemplateId')(value.selectedDiscTemplateId)
        set('customDiscTemplate')(value.customDiscTemplate ?? value.selectedDiscTemplate)
      },
      setSteamLogoPlacement: set('steamLogoPlacement'),
      setSteamBannerColors: set('steamBannerColors'),
      setSteamBannerLockupImageUrl: set('steamBannerLockupImageUrl'),
      setSteamBannerLockupImageSource: set('steamBannerLockupImageSource'),
      setSteamBannerLockupImageSize: set('steamBannerLockupImageSize'),
      setSteamBannerLockupLayout: set('steamBannerLockupLayout'),
      setSteamBannerUseTextFallback: set('steamBannerUseTextFallback'),
      setSteamBannerFallbackText: set('steamBannerFallbackText'),
      restoreExportGuides: set('exportGuides'),
      restoreDiscTextState: (value) => { Object.assign(disc, value) },
    },
    caseInsertProject: { setProjectJewelCase: (value) => { caseInsert.caseInsert = value } },
    transientEditor: {
      clearPreviewSelections: () => {},
      clearDiscArtworkSelection: () => {},
      clearDiscLocalScreenshotResults: () => {},
      restoreActiveDiscPresetState: () => {},
    },
  })
  const runtime = createApplicationLifecycleRuntime({
    createRoot: (ports) => createApplicationLifecycleCompositionRoot({
      ...ports,
      createSessionId: () => 'opened-session',
    }),
  })
  const root = runtime.root
  root.subscribe(() => { publications += 1 })
  runtime.updateProjectReplacementDependencies({
    promptForReplacementDecision: async () => { prompts += 1; return 'cancel' },
  })
  runtime.updateProjectOpenDependencies({
    stageCandidate: () => stageAppProjectOpen({
      openDialog: async () => sourcePath,
      recognizeProjectFileFormatCommand: async () => format,
      readProjectFileCommand: async () => options.contents,
      decodeProjectPackageFileCommand: async () => new TextEncoder().encode(options.contents),
      defaultSteamBannerLockupImageUrl: DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL,
      resolveBackgroundImageSize: async () => {
        options.onBackgroundResolution()
        return { width: 960, height: 640 }
      },
      caseInsertBrandingSources: createBrandingSources(),
    }),
    prepareEditorAggregateApply(value) { candidate = value; return apply.prepare(value) },
  })
  runtime.updateProjectSaveDependencies({
    saveDialog: async () => { saveDialogs += 1; return options.cancelSave ? null : destinationPath },
    packageWrite: {
      async encodeAndWrite(input) {
        writes.push(input)
        if (options.writePort) return options.writePort.encodeAndWrite(input)
        throw createProjectPackageCommandFailure('project.package.asset-type-invalid', 'asset-validation')
      },
    },
  })
  const projectProjection = () => createLegacyProjectForWorkspace({
    activeWorkspace: workspace,
    discProject: disc as CreateProjectSnapshotParams,
    caseInsertProject: caseInsert,
  })
  const snapshot = () => {
    const projection = projectProjection()
    if (projection.kind === 'caseInsert') return projection.project
    const session = root.getLifecycleState().activeSession
    assert.equal(session?.kind, 'disc')
    if (session?.kind !== 'disc') throw new Error('Missing Disc session')
    return { ...projection.project, background: materializeDiscProject(session.project).background }
  }
  return {
    root, options, disc, writes, snapshot,
    candidate: () => candidate!,
    publications: () => publications,
    prompts: () => prompts,
    saveDialogs: () => saveDialogs,
    async open() {
      const result = await root.dispatch('project.open')
      assert.equal(result.disposition, 'executed')
      if (result.disposition !== 'executed') throw new Error('Open did not execute')
      assert.equal(result.result.status, 'success')
    },
    sync() {
      const session = root.getLifecycleState().activeSession!
      const projection = projectProjection()
      return projection.kind === 'disc'
        ? root.synchronizeDiscLegacyProject({ sessionId: session.id, legacy: projection.project })
        : root.synchronizeCurrentProject({ sessionId: session.id, kind: 'caseInsert', project: projection.project })
    },
  }
}

function assertCleanSync(app: ReturnType<typeof harness>) {
  const before = app.root.getStateSnapshot()
  const session = before.state.activeSession!
  const publications = app.publications()
  const comparison = createCanonicalProjectComparisonValue(captureNormalizedProjectSnapshot(app.snapshot()))
  if (session.kind === 'disc') {
    const baseline = session.cleanBaseline?.exactSnapshot
    assert.ok(baseline && 'background' in baseline)
    assert.equal(comparison, createCanonicalProjectComparisonValue(
      captureNormalizedProjectSnapshot(materializeDiscProject(baseline))))
  } else {
    assert.equal(comparison, session.cleanBaseline?.comparisonValue)
  }
  assert.equal(app.sync(), 'no-op')
  assert.equal(app.sync(), 'no-op')
  assert.equal(app.root.getStateSnapshot(), before)
  assert.equal(app.publications(), publications)
  assert.equal(session.revision, 0)
  assert.equal(selectIsActiveProjectDirty(before.state), false)
}

for (const name of ['full-branding', 'legacy-minimal-0.1.0', 'custom-dimensions', 'blank-project', 'background-only']) {
  test(`${name} legacy Open applies and captures a clean revision-zero aggregate`, async () => {
    const contents = await fixture(name)
    const app = harness(contents)
    await app.open()
    assertCleanSync(app)
    assert.equal(app.root.getLifecycleState().activeSession?.currentPath, sourcePath)
    assert.equal(app.root.getLifecycleState().activeSession?.persistenceFormat, 'legacy-json')
    assert.equal(app.root.getLifecycleState().activeSession?.project.savedAt, JSON.parse(contents).savedAt)
    if (name === 'full-branding') {
      const original = parseSavedProjectContents(contents) as SavedDiscProject
      const current = app.snapshot() as SavedDiscProject
      assert.deepEqual(original.platformMarks?.assets.pc?.layout, { enabled: true, scale: 1, x: 24, y: 82 })
      assert.notDeepEqual(current.platformMarks?.assets.pc?.layout, original.platformMarks?.assets.pc?.layout)
      assert.equal(current.logoAssets?.developerLogoSource?.source, 'embedded')
      assert.equal(current.background.imageDataUrl, original.background.imageDataUrl)
      assert.equal(current.logoAssets?.developerLogoDataUrl, original.logoAssets?.developerLogoDataUrl)
      assert.equal(current.logoAssets?.publisherLogoDataUrl, original.logoAssets?.publisherLogoDataUrl)
    }
  })
}

test('package Open uses the same restored Disc baseline as legacy Open', async () => {
  const app = harness(await fixture('full-branding'), 'sbls-package-v1')
  await app.open()
  assertCleanSync(app)
  assert.equal(app.root.getLifecycleState().activeSession?.persistenceFormat, 'sbls-package-v1')
})

for (const failReconstruction of [false, true]) {
  test(`Open baseline includes the final ${failReconstruction ? 'deactivated' : 'active'} guided workflow`, async (t) => {
    const project = JSON.parse(await fixture('full-branding')) as SavedDiscProject
    project.editor = { guidedLayout: {
      id: 'disc:guided-layout:classic-top-title', version: 1,
      omittedSlotIds: [], completedSlotIds: [],
    } }
    // Image inspection is the last asynchronous restore step. Fail browser
    // measurement only after restoration so the staging owner's later preset
    // reconstruction/fallback path, rather than parsing, is exercised.
    delete project.background.imageSize
    const before = await restoreSavedProjectState(project)
    assert.ok(before.discGuidedWorkflow.activeLayout)
    const app = harness(JSON.stringify(project))
    let measurements = 0
    if (failReconstruction) {
      const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
      t.after(() => {
        if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
        else Reflect.deleteProperty(globalThis, 'document')
      })
      app.options.onBackgroundResolution = () => {
        Object.defineProperty(globalThis, 'document', {
          configurable: true,
          value: { createElement() { measurements += 1; throw new Error('Canvas unavailable') } },
        })
      }
    }
    await app.open()
    const candidate = app.candidate()
    assert.equal(candidate.projectType, 'disc')
    if (candidate.projectType !== 'disc') return
    assert.equal(Boolean(candidate.activeDiscPresetState), !failReconstruction)
    assert.equal(Boolean(candidate.restoredProject.discGuidedWorkflow.activeLayout), !failReconstruction)
    assert.equal(Boolean(candidate.normalizedProject.editor), !failReconstruction)
    assert.deepEqual(candidate.normalizedProject.background.imageSize, { width: 960, height: 640 })
    if (failReconstruction) assert.ok(measurements > 0)
    assertCleanSync(app)
  })
}

test('Case Open aggregate application and normal capture remain clean', async () => {
  const project = createBlankJewelCaseSavedProject('Case control')
  project.editor = { ...project.editor, activeCaseInsertTemplatePane: 'tray' }
  const app = harness(JSON.stringify(project))
  await app.open()
  assertCleanSync(app)
  assert.deepEqual(app.root.getLifecycleState().activeSession?.lastEditorRoute, { workspace: 'caseInsert', surface: 'back' })
})

test('a real edit after legacy Open becomes dirty once without changing the baseline', async () => {
  const app = harness(await fixture('full-branding'))
  await app.open()
  assertCleanSync(app)
  const baseline = app.root.getLifecycleState().activeSession!.cleanBaseline
  app.disc.manualGameTitle = 'A real title edit'
  assert.equal(app.sync(), 'synchronized')
  assert.equal(app.root.getLifecycleState().activeSession?.revision, 1)
  assert.equal(selectIsActiveProjectDirty(app.root.getLifecycleState()), true)
  assert.deepEqual(app.root.getLifecycleState().activeSession?.cleanBaseline, baseline)
  assert.equal(app.sync(), 'no-op')
  const result = await app.root.dispatch('project.open')
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') assert.equal(result.result.status, 'declined')
  assert.equal(app.prompts(), 1)
})

for (const dirty of [false, true]) {
  for (const cancel of [false, true]) {
    test(`${dirty ? 'edited' : 'clean'} legacy conversion ${cancel ? 'cancellation' : 'failure'} preserves the entire session`, async () => {
      const app = harness(await fixture('full-branding'))
      await app.open()
      assertCleanSync(app)
      if (dirty) {
        app.disc.manualGameTitle = 'Keep this unsaved edit'
        assert.equal(app.sync(), 'synchronized')
      }
      const before = app.root.getStateSnapshot()
      app.options.cancelSave = cancel
      const result = await app.root.dispatch('project.save')
      assert.equal(result.disposition, 'executed')
      if (result.disposition !== 'executed') return
      assert.equal(result.result.status, cancel ? 'cancelled' : 'failure')
      if (result.result.status === 'failure') assert.equal(result.result.error.code, 'project.package.asset-type-invalid')
      assert.equal(app.root.getStateSnapshot(), before)
      assert.equal(app.root.getLifecycleState().activeSession?.currentPath, sourcePath)
      assert.equal(app.root.getLifecycleState().activeSession?.persistenceFormat, 'legacy-json')
      assert.equal(selectIsActiveProjectDirty(app.root.getLifecycleState()), dirty)
      assert.equal(app.sync(), 'no-op')
      assert.equal(app.writes.length, cancel ? 0 : 1)
      if (!cancel) {
        assert.equal(app.writes[0].legacySourcePath, sourcePath)
        assert.equal(app.writes[0].destinationPath, destinationPath)
        const current = before.state.activeSession
        assert.ok(current?.kind === 'disc')
        assert.deepEqual(app.writes[0].normalizedProject, materializeDiscProject(current.project))
      }
    })
  }
}

test('a failed later Open cannot replace the prepared legacy baseline or editor content', async () => {
  const app = harness(await fixture('full-branding'))
  await app.open()
  assertCleanSync(app)
  const before = app.root.getStateSnapshot()
  const applied = app.candidate()
  app.options.contents = '{invalid'
  const result = await app.root.dispatch('project.open')
  assert.equal(result.disposition, 'executed')
  if (result.disposition === 'executed') assert.equal(result.result.status, 'failure')
  assert.equal(app.root.getStateSnapshot(), before)
  assert.equal(app.candidate(), applied)
  assert.equal(app.prompts(), 0)
  assert.equal(app.sync(), 'no-op')
})

test('minimal legacy conversion sends a portable built-in request and adopts its successful baseline', async () => {
  const app = harness(await fixture('legacy-minimal-0.1.0'))
  await app.open()
  assertCleanSync(app)
  const opened = app.root.getLifecycleState().activeSession!
  let invokes = 0
  let projectedContents = ''
  app.options.writePort = createProjectPackageWritePort(async <Result>(command, body, options) => {
    invokes += 1
    assert.equal(command, 'encode_and_write_project_package_file')
    assert.ok(body instanceof Uint8Array)
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
    const decoder = new TextDecoder('utf-8', { fatal: true })
    assert.equal(decoder.decode(body.subarray(0, 8)), 'SBLSPSV2')
    const planLength = view.getUint32(8, false)
    const projectLength = view.getUint32(12, false)
    assert.equal(view.getUint32(16, false), 0, 'No project-owned image parts are required')
    const plan = JSON.parse(decoder.decode(body.subarray(20, 20 + planLength)))
    assert.deepEqual(plan.captures.find(({ ownerId }: { ownerId: string }) => ownerId === 'disc.steam-banner').decision,
      { kind: 'qualified-built-in', compatibilityId: 'steam-banner:banner-lockup' })
    assert.equal(plan.captures.some(({ decision }: { decision: { kind: string } }) => decision.kind === 'unsupported-nonportable-asset'), false)
    projectedContents = decoder.decode(body.subarray(20 + planLength, 20 + planLength + projectLength))
    const project = JSON.parse(projectedContents)
    assert.equal(project.steamBackupLogo.lockupImageDataUrl, null)
    assert.equal(project.steamBackupLogo.lockupImageSource.source, 'built-in')
    assert.equal(projectedContents.includes(DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL), false)
    assert.equal(options.headers[LEGACY_SOURCE_PATH_HEADER_NAME], invokes === 1 ? encodeURIComponent(sourcePath) : undefined)
    // Native byte validation and atomic filesystem writing have their own Rust
    // tests; this port assertion proves the actual frontend request, not a disk write.
    return { status: 'success' } as Result
  })
  for (let save = 0; save < 2; save += 1) {
    const result = await app.root.dispatch('project.save')
    assert.equal(result.disposition, 'executed')
    if (result.disposition !== 'executed') return
    assert.equal(result.result.status, 'success')
    const session = app.root.getLifecycleState().activeSession!
    assert.equal(session.id, opened.id)
    assert.equal(session.revision, 0)
    assert.equal(session.currentPath, destinationPath)
    assert.equal(session.persistenceFormat, 'sbls-package-v1')
    assert.equal(selectIsActiveProjectDirty(app.root.getLifecycleState()), false)
    assert.deepEqual(session.cleanBaseline, opened.cleanBaseline)
    assert.equal(app.sync(), 'no-op')
    assert.equal(app.saveDialogs(), 1, 'Only the first legacy conversion opens Save As')
  }
  assert.equal(invokes, 2)
  const reopened = harness(projectedContents, 'sbls-package-v1')
  await reopened.open()
  assertCleanSync(reopened)
  assert.equal(reopened.disc.steamBannerLockupImageUrl, DEFAULT_STEAM_BANNER_LOCKUP_IMAGE_URL)
  assert.equal(reopened.disc.steamBannerLockupImageSource?.source, 'built-in')
})
