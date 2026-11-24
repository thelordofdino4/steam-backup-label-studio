import { readDiscBackgroundAsset } from '../image/discBackgroundAsset.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import type { SavedDiscProject } from '../project/projectTypes.ts'
import { validateNormalizedProjectSchema } from '../project/projectSchema.ts'
import { createApplicationLifecycleCompositionRoot } from './applicationLifecycleCompositionRoot.ts'
import { adoptSavedProjectBaseline, createLoadedProjectSession, selectIsActiveProjectDirty } from './projectSession.ts'

function setup() {
  const blank = createBlankDiscSavedProject()
  const image = 'data:image/png;base64,TEST-IMMUTABLE-COMPATIBILITY-HANDLE'
  const project: SavedDiscProject = { ...blank, background: {
    ...blank.background, imageDataUrl: image, imageSize: { height: 1400, width: 1400 },
    imageSource: { source: 'uploaded', sourceLabel: 'Test image', sourceId: null },
  } }
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({ sessionId: 'fixture', project, currentPath: 'example.sbls',
      persistenceFormat: 'sbls-package-v1' }),
  })
  function read() {
    const session = root.getLifecycleState().activeSession
    assert.ok(session?.kind === 'disc')
    return session
  }
  return { root, read, project }
}

test('Disc scalar uses one existing-store publication, retains asset and unrelated fields, and exact undo is clean', () => {
  const { root, read } = setup()
  const original = read()
  let publications = 0
  root.subscribe(() => { publications++ })
  assert.equal(root.commitDiscBackground({ sessionId: original.id, expectedRevision: 0,
    operation: { kind: 'transform', scale: 1.01, offset: { x: 1, y: 2 } } }), 'committed')
  const next = read()
  assert.equal(next.revision, 1)
  assert.equal(publications, 1)
  assert.equal(next.project.background.asset, original.project.background.asset)
  assert.equal(next.project.background.imageSize, original.project.background.imageSize)
  assert.equal(next.project.background.imageSource, original.project.background.imageSource)
  assert.equal(next.project.template, original.project.template)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), true)
  assert.equal(root.commitDiscBackground({ sessionId: original.id, expectedRevision: 0,
    operation: { kind: 'transform', scale: 2, offset: { x: 0, y: 0 } } }), 'stale')
  assert.equal(root.commitDiscBackground({ sessionId: original.id, expectedRevision: 1,
    operation: { kind: 'transform', scale: NaN, offset: { x: 0, y: 0 } } }), 'invalid')
  const identity = root.getSnapshot()
  assert.equal(root.commitDiscBackground({ sessionId: original.id, expectedRevision: 1,
    operation: { kind: 'transform', scale: 1.01, offset: { x: 1, y: 2 } } }), 'no-op')
  assert.equal(root.getSnapshot(), identity)
  assert.equal(root.commitDiscBackground({ sessionId: original.id, expectedRevision: 1,
    operation: { kind: 'transform', scale: original.project.background.scale,
      offset: original.project.background.offset } }), 'committed')
  assert.equal(publications, 2)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), false)
})

test('closed legacy writer cannot erase a newer background; legitimate other edits retain the exact Background object', () => {
  const { root, read, project } = setup()
  assert.equal(root.commitDiscBackground({ sessionId: 'fixture', expectedRevision: 0,
    operation: { kind: 'visibility', enabled: false, scale: 1, offset: { x: 0, y: 0 } } }), 'committed')
  const after = read()
  assert.equal(root.synchronizeCurrentProject({ sessionId: 'fixture', kind: 'disc', project }), 'invalid')
  assert.equal(root.synchronizeDiscLegacyProject({ sessionId: 'fixture', legacy: project }), 'invalid')
  assert.equal(read(), after)
  const { background, ...legacy } = project
  assert.ok(background.imageDataUrl)
  assert.equal(root.synchronizeDiscLegacyProject({ sessionId: 'fixture',
    legacy: { ...legacy, title: 'Other edit' } }), 'synchronized')
  assert.equal(read().project.background, after.project.background)
  assert.equal(read().project.background.enabled, false)
  assert.equal(readDiscBackgroundAsset(read().project.background.asset), background.imageDataUrl)
})

test('a completed Save of background R adopts its baseline without replacing later R+1', () => {
  const { root, read } = setup()
  assert.equal(root.commitDiscBackground({ sessionId: 'fixture', expectedRevision: 0,
    operation: { kind: 'transform', scale: 1.25, offset: { x: 1, y: 2 } } }), 'committed')
  const saved = read().project
  assert.equal(root.commitDiscBackground({ sessionId: 'fixture', expectedRevision: 1,
    operation: { kind: 'transform', scale: 1.5, offset: { x: 3, y: 4 } } }), 'committed')
  const state = adoptSavedProjectBaseline(root.getLifecycleState(),
    { acceptedSnapshot: saved as unknown as SavedDiscProject })
  const session = state.activeSession
  assert.ok(session?.kind === 'disc')
  assert.equal(session.revision, 2)
  assert.equal(session.cleanBaseline?.exactSnapshot, saved)
  assert.equal(session.project.background.scale, 1.5)
  assert.equal(selectIsActiveProjectDirty(state), true)
})

test('compound preset accepts only its owner footprint together or neither', () => {
  const { root, read, project } = setup()
  const original = read()
  const background = project.background
  const edit = { sessionId: original.id, expectedRevision: original.revision,
    operation: { kind: 'asset' as const, background: { ...background, enabled: true, scale: 1.4 } } }
  const publications: [number, number | undefined][] = []
  root.subscribe(() => {
    const observed = read()
    publications.push([observed.project.background.scale, observed.project.titleArtwork?.layout?.x])
  })
  const titleArtwork = { ...project.titleArtwork,
    layout: { ...project.titleArtwork!.layout!, x: 9 } }
  assert.equal(root.commitDiscBackgroundCompound(edit, {
    kind: 'preset', fields: { title: 'Not a preset field' },
  }), 'invalid')
  assert.equal(root.getLifecycleState().activeSession, original)
  assert.equal(root.commitDiscBackgroundCompound(edit, {
    kind: 'preset', fields: { titleArtwork },
  }), 'committed')
  assert.deepEqual(publications, [[1.4,9]])
  const accepted = read()
  assert.equal(accepted.revision, 1)
  assert.equal(accepted.project.background.imageSize, original.project.background.imageSize)
  assert.equal(root.commitDiscBackgroundCompound(edit, {
    kind: 'preset', fields: { titleArtwork: { ...titleArtwork, layout: { ...titleArtwork.layout, x: 99 } } },
  }), 'stale')
  assert.deepEqual(publications, [[1.4,9]])
  assert.equal(read(), accepted)
})

test('a compound companion rejects undeclared owners and accessor-bearing envelopes atomically', () => {
  const { root, read } = setup()
  const original = read()
  let publications = 0
  root.subscribe(() => publications++)
  const edit = { sessionId: original.id, expectedRevision: original.revision,
    operation: { kind: 'visibility' as const, enabled: false, scale: 1, offset: { x: 0, y: 0 } } }
  const withExtra = { kind: 'preset' as const, fields: {}, background: { enabled: false } }
  assert.equal(root.commitDiscBackgroundCompound(edit, withExtra), 'invalid')
  let readAccessor = false
  const withAccessor = {
    kind: 'preset' as const,
    get fields() { readAccessor = true; return {} },
  }
  assert.equal(root.commitDiscBackgroundCompound(edit, withAccessor), 'invalid')
  assert.equal(readAccessor, false)
  assert.equal(read(), original)
  assert.equal(publications, 0)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), false)
})

test('the Disc remainder is validated without treating the committed Background as saved input', async () => {
  const { captureDiscRemainderWithOwnedBackground } = await import('./canonicalProject.ts')
  const { read } = setup()
  const current = read().project
  const { background, ...remainder } = current
  const next = captureDiscRemainderWithOwnedBackground({ ...remainder, title: 'checked sibling' }, current)
  assert.equal(next.background, background)
  assert.equal(next.title, 'checked sibling')
  assert.throws(() => validateNormalizedProjectSchema(remainder), /background must be an object/)
  assert.deepEqual(Object.keys(next), Object.keys(next).sort())
  assert.throws(() => captureDiscRemainderWithOwnedBackground({ ...remainder, background }, current))
  assert.throws(() => captureDiscRemainderWithOwnedBackground({ ...remainder, title: null }, current))
})

test('reentrant sibling validation cannot overwrite a revision accepted during preparation', () => {
  for (const route of ['legacy', 'compound']) {
    const { root, read, project } = setup()
    const original = read()
    let publications = 0
    root.subscribe(() => publications++)
    let injected = false
    const injectDuringCapture = <T extends object>(value: T): T => new Proxy(value, {
      getPrototypeOf(target) {
        if (!injected) {
          injected = true
          assert.equal(root.commitDiscBackground({ sessionId: original.id, expectedRevision: 0,
            operation: { kind: 'transform', scale: 1.6, offset: { x: 3, y: 4 } } }), 'committed')
        }
        return Reflect.getPrototypeOf(target)
      },
    })
    if (route === 'legacy') {
      const legacy = { ...project }
      Reflect.deleteProperty(legacy, 'background')
      assert.equal(root.synchronizeDiscLegacyProject({ sessionId: original.id, legacy: {
        ...legacy, title: 'outer stale title', game: injectDuringCapture(project.game),
      } }), 'stale-session')
      assert.equal(read().project.title, original.project.title)
    } else {
      assert.equal(root.commitDiscBackgroundCompound({ sessionId: original.id, expectedRevision: 0,
        operation: { kind: 'visibility', enabled: false, scale: 1, offset: { x: 0, y: 0 } } },
      { kind: 'preset', fields: { titleArtwork: injectDuringCapture({
        ...project.titleArtwork, layout: { ...project.titleArtwork!.layout!, x: 9 },
      }) } }), 'stale')
      assert.equal(read().project.titleArtwork, original.project.titleArtwork)
    }
    assert.equal(injected, true)
    assert.equal(read().revision, 1)
    assert.equal(read().project.background.scale, 1.6)
    assert.equal(publications, 1)
  }
})
