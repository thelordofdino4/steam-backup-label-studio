import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationLifecycleCompositionRoot } from './applicationLifecycleCompositionRoot.ts'
import { captureDiscRatingLayoutBasis } from './discRatingLayoutSync.ts'
import { materializeDiscProject } from './canonicalProject.ts'
import { createLoadedProjectSession } from './projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'

function setup() {
  const project = createBlankDiscSavedProject()
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'disc', currentPath: 'fixture.sbls', persistenceFormat: 'sbls-package-v1', project,
    }),
  })
  const read = () => {
    const session = root.getLifecycleState().activeSession
    assert.equal(session?.kind, 'disc')
    return session
  }
  const command = () => ({ sessionId: read().id, expectedGeneration: root.getStateSnapshot().generation })
  return { project, root, read, command }
}

test('authored Apply accepts age and two active layouts in one observed revision', () => {
  const { root, read, command } = setup()
  const before = read().project.ratingBadge!
  const revisions: unknown[] = []
  root.subscribe(() => {
    const { revision, project } = read()
    revisions.push({ revision, badge: project.ratingBadge })
  })
  const layout = { ...before.layout, enabled: true, x: 17 }
  const uskLayout = { ...before.uskBadge.layout, enabled: true, x: 26 }
  assert.equal(root.commitDiscSupplementalUsk({ ...command(), ratingValue: '16', placement: { layout, uskLayout } }), 'committed')
  assert.deepEqual(revisions, [{ revision: 1, badge: {
    ...before, layout, uskBadge: { ratingValue: '16', layout: uskLayout },
  } }])
})

test('both legacy paths preserve the explicit age while accepting independent placement; later choosing 0 works', () => {
  const { project, root, read, command } = setup()
  const { background, ...remainder } = project
  const original = remainder.ratingBadge!
  assert.equal(root.commitDiscSupplementalUsk({ ...command(), ratingValue: '16' }), 'committed')
  assert.equal(root.synchronizeDiscLegacyProject({ sessionId: 'disc', ratingBasis: captureDiscRatingLayoutBasis(original), legacy: {
    ...remainder, ratingBadge: { ...original, layout: { ...original.layout, x: 17 } },
  } }), 'synchronized')
  assert.equal(read().project.ratingBadge?.uskBadge.ratingValue, '16')
  const full = materializeDiscProject(read().project)
  assert.equal(root.synchronizeCurrentProject({ sessionId: 'disc', kind: 'disc', ratingBasis: captureDiscRatingLayoutBasis(full.ratingBadge!), project: {
    ...full, ratingBadge: {
      ...full.ratingBadge!, uskBadge: {
        ...original.uskBadge, layout: { ...original.uskBadge.layout, x: 26 },
      },
    },
  } }), 'synchronized')
  assert.equal(read().project.ratingBadge?.uskBadge.ratingValue, '16')
  assert.equal(read().project.ratingBadge?.layout.x, 17)
  assert.equal(read().project.ratingBadge?.uskBadge.layout.x, 26)
  assert.equal(read().project.background.scale, background.scale)
  assert.equal(root.commitDiscSupplementalUsk({ ...command(), ratingValue: '0' }), 'committed')
  assert.equal(read().project.ratingBadge?.uskBadge.ratingValue, '0')
  assert.equal(read().project.ratingBadge?.uskBadge.layout.x, 26)
  assert.equal(root.commitDiscSupplementalUsk({ ...command(), ratingValue: '0' }), 'no-op')
  assert.equal(read().revision, 4)
})

test('stale generation, wrong owner and malformed suggestion do not publish', () => {
  const { root, read, command } = setup()
  const old = command()
  assert.equal(root.commitDiscSupplementalUsk({ ...old, ratingValue: '16' }), 'committed')
  assert.equal(root.commitDiscSupplementalUsk({ ...old, ratingValue: '0' }), 'stale')
  assert.equal(root.commitDiscSupplementalUsk({ ...command(), sessionId: 'other', ratingValue: '0' }), 'stale')
  const before = read()
  const badge = before.project.ratingBadge!
  assert.equal(root.commitDiscSupplementalUsk({
    ...command(), ratingValue: '18', placement: { layout: badge.layout, uskLayout: badge.uskBadge.layout },
  }), 'invalid')
  assert.equal(read(), before)
})

test('unversioned legacy projections retain both accepted layouts while allowing unrelated edits', () => {
  for (const path of ['projected', 'full']) {
    const { project, root, read, command } = setup()
    const { background, ...remainder } = project
    const original = remainder.ratingBadge!
    const layout = { ...original.layout, enabled: true, x: 17 }
    const uskLayout = { ...original.uskBadge.layout, enabled: true, x: 26 }
    assert.equal(root.commitDiscSupplementalUsk({ ...command(), ratingValue: '16', placement: { layout, uskLayout } }), 'committed')
    const stale = { ...remainder, title: 'An unrelated edit' }
    const outcome = path === 'full' ?
      root.synchronizeCurrentProject({ sessionId: 'disc', kind: 'disc', project: { ...stale, background } }) :
      root.synchronizeDiscLegacyProject({ sessionId: 'disc', legacy: stale })
    assert.equal(outcome, 'synchronized')
    const result = read().project.ratingBadge!
    assert.equal(read().project.title, stale.title)
    assert.equal(result.uskBadge.ratingValue, '16')
    assert.deepEqual(result.layout, layout)
    assert.deepEqual(result.uskBadge.layout, uskLayout)
  }
})

test('both new ingress adapters distinguish old enabled state from deliberate Off and fresh placement', () => {
  for (const path of ['projected', 'full']) {
    const { project, root, read, command } = setup()
    const blank = project.ratingBadge!
    const sync = (ratingBadge: typeof blank, prior: typeof blank) => {
      const base = captureDiscRatingLayoutBasis(prior)
      const full = materializeDiscProject(read().project)
      if (path === 'full') return root.synchronizeCurrentProject({
        sessionId: 'disc', kind: 'disc', project: { ...full, ratingBadge }, ratingBasis: base,
      })
      const { background, ...legacy } = full
      void background
      return root.synchronizeDiscLegacyProject({
        sessionId: 'disc', legacy: { ...legacy, ratingBadge }, ratingBasis: base,
      })
    }
    const layout = { ...blank.layout, enabled: true, x: 17 }
    const uskLayout = { ...blank.uskBadge.layout, enabled: true, x: 26 }
    assert.equal(root.commitDiscSupplementalUsk({ ...command(), ratingValue: '16', placement: { layout, uskLayout } }), 'committed')
    assert.equal(sync(blank, blank), 'no-op')
    const enabledBadge = read().project.ratingBadge!
    assert.equal(enabledBadge.uskBadge.ratingValue, '16')
    assert.equal(enabledBadge.uskBadge.layout.enabled, true)
    const fresh = { ...enabledBadge,
      uskBadge: { ...enabledBadge.uskBadge, layout: { ...uskLayout, x: 32 } },
    }
    assert.equal(sync(fresh, enabledBadge), 'synchronized')
    const disabled = { ...fresh, uskBadge: {
      ...fresh.uskBadge, layout: { ...fresh.uskBadge.layout, enabled: false },
    } }
    assert.equal(sync(disabled, fresh), 'synchronized')
    assert.deepEqual(read().project.ratingBadge, disabled)
  }
})
