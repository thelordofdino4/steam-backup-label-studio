import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import type { DiscTextLayoutSettings, DiscTextSettings } from '../discText/types.ts'
import { createLoadedProjectSession, pinDiscSaveRevision, projectPinnedDiscSave } from '../lifecycle/projectSession.ts'
import { createDefaultProjectTechnicalMarkAsset } from '../project/projectTechnicalMarks.ts'
import { createSavedDiscGuidedLayout } from '../project/projectGuidedWorkflow.ts'
import { createDefaultProjectPlatformMarkAsset } from '../project/projectPlatformMarks.ts'
import type { DiscLegacyProjectProjection } from '../project/createProjectSnapshot.ts'
import type { ProjectLogoAssets, ProjectMediaMark, ProjectPlatformMarks, ProjectTechnicalMarks, ProjectTitleArtwork } from '../project/projectTypes.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { prepareDiscHistoryProjection, stepProjectedDiscHistory } from './appDiscHistoryProjection.ts'

const noTitleOrTextWrites = {
  setLogoAssets() { assert.fail('Unexpected logo assets write') },
  setTechnicalMarks() { assert.fail('Unexpected technical marks write') },
  setTitleArtwork() { assert.fail('Unexpected Title artwork write') },
  setDiscTextSettings() { assert.fail('Unexpected text settings write') },
  setDiscTextLayout() { assert.fail('Unexpected text layout write') },
}

const noMediaOrPlatformWrites = {
  ...noTitleOrTextWrites,
  setMediaMark() { assert.fail('Unexpected Media mark owner write') },
  setPlatformMarks() { assert.fail('Unexpected Platform marks owner write') },
}

function setup() {
  const saved = createBlankDiscSavedProject()
  const badge = saved.ratingBadge!
  saved.ratingBadge = {
    ...badge,
    source: 'custom',
    customImageDataUrl: 'data:image/png;base64,AA==',
    customImageSize: { width: 6, height: 7, contentBounds: { x: 1, y: 1, width: 3, height: 4 } },
    layout: { ...badge.layout, enabled: true, x: 0, y: 0 },
    uskBadge: { ...badge.uskBadge, layout: { ...badge.uskBadge.layout, enabled: true, x: 0, y: 0 } },
  }
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'disc', currentPath: 'test.sbls',
      persistenceFormat: 'sbls-package-v1', project: saved,
    }),
    discHistoryLimit: 3,
  })
  const read = () => {
    const session = root.getLifecycleState().activeSession
    assert.equal(session?.kind, 'disc')
    return session
  }
  const basis = () => ({ sessionId: read().id, expectedGeneration: root.getStateSnapshot().generation })
  return { root, saved, read, basis }
}

test('the history mirror restores exact accepted rating and custom asset without Open clamping', () => {
  const { root, read, basis } = setup()
  const prior = read()
  const badge = prior.project.ratingBadge!
  assert.equal(root.commitDiscSupplementalUsk({
    ...basis(), ratingValue: '16',
    placement: { layout: { ...badge.layout, x: 20 }, uskLayout: { ...badge.uskBadge.layout, x: 30 } },
  }), 'committed')
  const edited = read()
  const plan = prepareDiscHistoryProjection(edited, prior.project)
  assert.ok(plan?.ratingBadge)
  assert.deepEqual(plan.ratingBadge, badge)
  assert.notEqual(plan.ratingBadge, badge)
  assert.equal(plan.ratingBadge.layout.x, 0)
  assert.equal(plan.ratingBadge.uskBadge.layout.x, 0)
  assert.deepEqual(plan.ratingBadge.customImageSize?.contentBounds, { x: 1, y: 1, width: 3, height: 4 })
  const written: unknown[] = []
  let inBatch = false
  assert.equal(stepProjectedDiscHistory(root, 'undo', {
    ...noMediaOrPlatformWrites,
    batch(apply) {
      inBatch = true
      apply()
      inBatch = false
    },
    setRatingBadge(value) {
      assert.equal(inBatch, true)
      written.push(value)
    },
  }), 'committed')
  assert.deepEqual(written, [plan.ratingBadge])
  assert.equal(read().project, prior.project)

  // Simulate the legacy editor's next committed projection, not a second read
  // of the restored rating from the document store.
  const { background, ...legacy } = edited.project
  void background
  assert.equal(root.acknowledgeDiscHistoryProjection({
    ...basis(), projection: { ...legacy, ratingBadge: plan.ratingBadge },
  }), 'committed')
  assert.equal(read().revision, edited.revision + 1)
  assert.equal(stepProjectedDiscHistory(root, 'redo', {
    ...noMediaOrPlatformWrites,
    batch(apply) { apply() },
    setRatingBadge(value) { written.push(value) },
  }), 'committed')
  assert.equal(read().project, edited.project)
  assert.deepEqual(written[1], edited.project.ratingBadge)
})

test('a background-only step requires no mirrored owner writes', () => {
  const { root, read } = setup()
  const before = read()
  assert.equal(root.commitDiscBackground({
    sessionId: before.id, expectedRevision: before.revision,
    operation: { kind: 'transform', scale: 1.25, offset: { x: 0, y: 1 } },
  }), 'committed')
  assert.deepEqual(prepareDiscHistoryProjection(read(), before.project), {})
})

test('unsupported sibling changes and missing legacy owners are refused before spending history', () => {
  const { root, saved, read } = setup()
  const before = read()
  const changedTemplate = { ...saved, template: { ...saved.template, variant: 'custom' as const } }
  for (const project of [{ ...saved, title: 'Renamed' }, changedTemplate, { ...saved, ratingBadge: undefined }, { ...saved, mediaMark: undefined }, { ...saved, platformMarks: undefined }]) {
    const session = createLoadedProjectSession({
      sessionId: 'disc', currentPath: 'test.sbls', persistenceFormat: 'sbls-package-v1', project,
    }).activeSession
    assert.equal(session?.kind, 'disc')
    assert.equal(prepareDiscHistoryProjection(before, session.project), null)
  }
  assert.equal(root.getStateSnapshot().discHistory?.past.length, 0)
  assert.equal(read(), before)
})

test('an unsupported preset delta leaves both history and the editor untouched', () => {
  const { root, read } = setup()
  const before = read()
  assert.equal(root.commitDiscBackgroundCompound({
    sessionId: before.id, expectedRevision: before.revision,
    operation: { kind: 'visibility', enabled: false, scale: 1.25, offset: { x: 0, y: 1 } },
  }, { kind: 'preset', fields: {}, guidedLayout: { id: 'wrong-id', version: 999, omittedSlotIds: [], completedSlotIds: [] } }), 'committed')
  const edited = root.getStateSnapshot()
  assert.equal(stepProjectedDiscHistory(root, 'undo', {
    ...noMediaOrPlatformWrites,
    batch() { assert.fail('Unsupported projection cannot enter the editor batch') },
    setRatingBadge() { assert.fail('Unsupported projection cannot write an editor owner') },
  }), 'unavailable')
  assert.equal(root.getStateSnapshot(), edited)
  assert.equal(edited.discHistory?.past[0], before.project)
  assert.notEqual(edited.discHistoryProjectionPending, true)
})

test('intervening accepted edit rejects a stale prepared history step without touching the mirror', () => {
  const { root, read, basis } = setup()
  assert.equal(root.commitDiscSupplementalUsk({ ...basis(), ratingValue: '16' }), 'committed')
  assert.equal(stepProjectedDiscHistory(root, 'undo', {
    ...noMediaOrPlatformWrites,
    batch(apply) {
      assert.equal(root.commitDiscSupplementalUsk({ ...basis(), ratingValue: '18' }), 'committed')
      apply()
    },
    setRatingBadge() { assert.fail('A stale prepared plan cannot write the mirror') },
  }), 'stale')
  assert.equal(read().project.ratingBadge?.uskBadge.ratingValue, '18')
  assert.equal(root.getStateSnapshot().discHistory?.past.length, 2)
  assert.notEqual(root.getStateSnapshot().discHistoryProjectionPending, true)
})

test('one history step mirrors both marks and background from the same accepted preset revision', () => {
  const { root, read, basis } = setup()
  const before = read()
  const mediaMark = { ...before.project.mediaMark!, value: 'dvdRom' as const,
    layout: { ...before.project.mediaMark!.layout, x: 0, y: 0 } }
  const mark = createDefaultProjectPlatformMarkAsset('windows')
  const platformMarks = {
    values: ['windows' as const], assets: { windows: { ...mark,
      source: 'custom' as const, customImageDataUrl: 'data:image/png;base64,AA==',
      customImageSize: { width: 5, height: 6, contentBounds: null },
      layout: { ...mark.layout, x: 0, y: 0 } } },
    inference: { source: 'manual' as const, status: 'manual' as const, steamAppId: null,
      values: ['windows' as const], message: 'Kept' },
  }
  assert.equal(root.commitDiscBackgroundCompound({
    sessionId: before.id, expectedRevision: before.revision,
    operation: { kind: 'visibility', enabled: false, scale: 1.25, offset: { x: 0, y: 1 } },
  }, { kind: 'preset', fields: { mediaMark, platformMarks } }), 'committed')
  const edited = read()
  let mirror: Pick<DiscLegacyProjectProjection, 'mediaMark' | 'platformMarks'> = { mediaMark, platformMarks }
  const order: string[] = []
  const editor = {
    ...noTitleOrTextWrites,
    batch(apply: () => void) { order.push('start'); apply(); order.push('end') },
    setRatingBadge() { assert.fail('Unchanged rating must not be restored') },
    setMediaMark(value: ProjectMediaMark) {
      assert.ok(value); order.push('media'); mirror = { ...mirror, mediaMark: value }
    },
    setPlatformMarks(value: ProjectPlatformMarks) {
      assert.ok(value); order.push('platform'); mirror = { ...mirror, platformMarks: value }
    },
  }
  const { background, ...unchanged } = edited.project
  void background
  assert.equal(stepProjectedDiscHistory(root, 'undo', editor), 'committed')
  assert.deepEqual(order, ['start', 'media', 'platform', 'end'])
  assert.equal(read().project, before.project)
  assert.deepEqual(mirror.platformMarks?.values, [])
  assert.deepEqual(mirror.mediaMark, before.project.mediaMark)
  assert.equal(root.acknowledgeDiscHistoryProjection({
    ...basis(), projection: { ...unchanged, ...mirror } as DiscLegacyProjectProjection,
  }), 'committed')
  assert.equal(stepProjectedDiscHistory(root, 'redo', editor), 'committed')
  assert.equal(read().project, edited.project)
  assert.deepEqual(mirror.platformMarks, platformMarks)
  assert.deepEqual(mirror.mediaMark, mediaMark)
  assert.notEqual(mirror.platformMarks?.values, edited.project.platformMarks?.values)
})

test('Title artwork and text geometry are restored without replacing saved text content', () => {
  const { root, read, basis } = setup()
  const before = read()
  const titleArtwork = { ...before.project.titleArtwork!, source: 'custom' as const,
    sourceLabel: 'User art', imageDataUrl: 'data:image/png;base64,AA==',
    imageSize: { width: 2, height: 3 }, layout: { ...before.project.titleArtwork!.layout, x: 0 },
    defaultSteamLogo: { steamArtworkAssetId: 'old-logo', sourceLabel: 'Steam',
      imageDataUrl: 'data:image/png;base64,AA==', imageSize: { width: 2, height: 3 } },
  }
  const discText = { layout: { ...before.project.discText!.layout,
    title: { ...before.project.discText!.layout!.title, x: 0, y: 0 } },
    settings: { ...before.project.discText!.settings, title: true },
  }
  assert.equal(root.commitDiscBackgroundCompound({
    sessionId: before.id, expectedRevision: before.revision,
    operation: { kind: 'visibility', enabled: false, scale: 1.25, offset: { x: 0, y: 1 } },
  }, { kind: 'preset', fields: { titleArtwork, discText } }), 'committed')
  const edited = read()
  const editor = {
    ...noMediaOrPlatformWrites,
    batch(apply: () => void) { apply() },
    setRatingBadge() { assert.fail('Unchanged rating must not be written') },
    setTitleArtwork(value: ProjectTitleArtwork) { mirrorTitle = value },
    setDiscTextSettings(value: DiscTextSettings) { mirrorSettings = value },
    setDiscTextLayout(value: DiscTextLayoutSettings) { mirrorLayout = value },
  }
  let mirrorTitle: ProjectTitleArtwork | undefined
  let mirrorSettings: DiscTextSettings | undefined
  let mirrorLayout: DiscTextLayoutSettings | undefined
  assert.equal(stepProjectedDiscHistory(root, 'undo', editor), 'committed')
  assert.deepEqual(mirrorTitle, before.project.titleArtwork)
  assert.deepEqual(mirrorSettings, before.project.discText?.settings)
  assert.deepEqual(mirrorLayout, before.project.discText?.layout)
  const { background, ...legacy } = edited.project
  void background
  assert.equal(root.acknowledgeDiscHistoryProjection({ ...basis(), projection: {
    ...legacy, titleArtwork: mirrorTitle,
    discText: { ...legacy.discText, settings: mirrorSettings, layout: mirrorLayout },
  } as DiscLegacyProjectProjection }), 'committed')
  const pinned = pinDiscSaveRevision(read())
  assert.equal(stepProjectedDiscHistory(root, 'redo', editor), 'committed')
  assert.deepEqual(mirrorTitle, titleArtwork)
  assert.deepEqual(mirrorSettings, discText.settings)
  assert.deepEqual(mirrorLayout, discText.layout)
  assert.deepEqual(read().project.discText?.values, before.project.discText?.values)
  assert.deepEqual(projectPinnedDiscSave(pinned).titleArtwork, before.project.titleArtwork)
  assert.deepEqual(projectPinnedDiscSave(pinned).discText?.layout, before.project.discText?.layout)
})

test('logo/technical owners and exact Guided slots restore together; missing attachment fails closed', () => {
  const { root, read, basis } = setup()
  const before = read()
  const logo = before.project.logoAssets!
  const logoAssets = { ...logo, developerLogoLayout: { ...logo.developerLogoLayout!, x: 0 },
    additionalDeveloperLogos: [{
      id: 'retained', label: 'Exact custom logo', imageDataUrl: 'data:image/png;base64,AA==', imageSize: {width: 2, height: 3},
      layout: { ...logo.developerLogoLayout!, enabled: true, x: 0, y: 0 },
    }], additionalPublisherLogos: [...logo.additionalPublisherLogos!],
  }
  const audio = createDefaultProjectTechnicalMarkAsset('audio')
  const technicalMarks = { values: ['audio' as const], assets: { audio }, additionalAssets: {
    audio: [{ ...audio, id: 'additional-audio', layout: { ...audio.layout, x: 0 } }],
  } }
  const guidedLayout = { id: 'disc:guided-layout:classic-top-title', version: 1,
    omittedSlotIds: [], completedSlotIds: ['disc:guided:game-title:primary'] }
  assert.equal(root.commitDiscBackgroundCompound({
    sessionId: before.id, expectedRevision: before.revision,
    operation: { kind: 'visibility', enabled: false, scale: 1.25, offset: { x: 0, y: 1 } },
  }, { kind: 'preset', fields: { logoAssets, technicalMarks }, guidedLayout }), 'committed')
  const edited = read()
  let mirrorLogo: ProjectLogoAssets | undefined
  let mirrorTechnical: ProjectTechnicalMarks | undefined
  let mirrorGuided: ReturnType<typeof createSavedDiscGuidedLayout> | undefined
  let batchDepth = 0
  const editor = {
    ...noMediaOrPlatformWrites,
    batch(apply: () => void) { batchDepth++; apply(); batchDepth-- },
    setRatingBadge() { assert.fail('Unchanged rating must not be written') },
    setLogoAssets(value: ProjectLogoAssets) { assert.equal(batchDepth, 1); mirrorLogo = value },
    setTechnicalMarks(value: ProjectTechnicalMarks) { assert.equal(batchDepth, 1); mirrorTechnical = value },
  }
  assert.equal(stepProjectedDiscHistory(root, 'undo', editor), 'unavailable')
  assert.equal(read(), edited)
  const preparedEditor = { ...editor, prepareGuidedAttachment(
    workflow: Parameters<typeof createSavedDiscGuidedLayout>[0], target: typeof edited.project,
  ) {
    const restored = createSavedDiscGuidedLayout(workflow)
    assert.deepEqual(restored ?? undefined, target.editor?.guidedLayout)
    assert.equal(batchDepth, 0)
    return () => { assert.equal(batchDepth, 1); mirrorGuided = restored }
  } }
  assert.equal(stepProjectedDiscHistory(root, 'undo', preparedEditor), 'committed')
  assert.deepEqual(mirrorLogo, before.project.logoAssets)
  assert.deepEqual(mirrorTechnical, before.project.technicalMarks)
  assert.equal(mirrorGuided, null)
  const { background, editor: omittedEditor, ...legacy } = edited.project
  void background
  assert.equal(omittedEditor?.guidedLayout?.id, guidedLayout.id)
  assert.equal(root.acknowledgeDiscHistoryProjection({ ...basis(),
    projection: { ...legacy, logoAssets: mirrorLogo, technicalMarks: mirrorTechnical } as DiscLegacyProjectProjection,
  }), 'committed')
  assert.equal(stepProjectedDiscHistory(root, 'redo', preparedEditor), 'committed')
  assert.equal(read().project, edited.project)
  assert.deepEqual(mirrorLogo, logoAssets)
  assert.deepEqual(mirrorTechnical, technicalMarks)
  assert.deepEqual(mirrorGuided, guidedLayout)
})
