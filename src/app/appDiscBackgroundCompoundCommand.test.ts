import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationLifecycleCompositionRoot } from '../lifecycle/applicationLifecycleCompositionRoot.ts'
import { createLoadedProjectSession, type DiscProjectSession } from '../lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { commitPreparedDiscBackgroundCompound, projectDiscPresetSiblingFields } from './appDiscBackgroundCompoundCommand.ts'
import type { DiscRolePresetCurrentState } from './appDiscRolePresetApplication.ts'

function setup() {
  const project = createBlankDiscSavedProject()
  const root = createApplicationLifecycleCompositionRoot({
    initialState: createLoadedProjectSession({
      sessionId: 'disc', currentPath: 'fixture.sbls', persistenceFormat: 'sbls-package-v1', project,
    }),
  })
  const read = () => root.getLifecycleState().activeSession as DiscProjectSession
  const edit = { sessionId:'disc', expectedRevision:0, operation: { kind:'asset' as const,
    background:{...project.background, enabled:true, scale:1.5} } }
  return { root, read, edit, project }
}

test('same-session newer accepted sibling wins a stale preset; neither tentative sibling nor mirror writes', () => {
  const { root, read, edit, project } = setup()
  const { background, ...legacy } = project
  const x = 19
  const plannedTitle = {...project.titleArtwork, layout:{...project.titleArtwork!.layout!, x:2}}
  const planned = {kind:'preset' as const, fields:{titleArtwork:plannedTitle}}
  const snapshots: [number,number,number | undefined][] = []
  root.subscribe(() => { const s=read(); snapshots.push([s.revision,s.project.background.scale,s.project.titleArtwork?.layout?.x]) })
  assert.equal(root.synchronizeDiscLegacyProject({sessionId:'disc',legacy: {
    ...legacy,titleArtwork:{...project.titleArtwork,layout:{...project.titleArtwork!.layout!,x}},
  }}),'synchronized')
  const accepted=read()
  const mirrors: unknown[] = []
  assert.equal(commitPreparedDiscBackgroundCompound(root,edit,planned,() => { mirrors.push(plannedTitle) }),'stale')
  assert.equal(read(),accepted)
  assert.deepEqual(mirrors,[])
  assert.deepEqual(snapshots,[[1,background.scale,19]])
})

test('accepted aperture publishes one complete revision before its one mirror; invalid footprint writes neither', () => {
  const { root, read, edit, project } = setup()
  const publications: unknown[] = []
  root.subscribe(() => {
    const s=read()
    publications.push([s.revision,s.project.background.scale,s.project.titleArtwork?.layout?.x])
  })
  const mirror=()=>{ const s=read(); publications.push(['mirror',s.revision,s.project.background.scale,s.project.titleArtwork?.layout?.x]) }
  const titleArtwork={...project.titleArtwork,layout:{...project.titleArtwork!.layout!,x:12}}
  assert.equal(commitPreparedDiscBackgroundCompound(root,edit,{kind:'preset',fields:{title:'unsupported'}},mirror),'invalid')
  assert.deepEqual(publications,[])
  assert.equal(commitPreparedDiscBackgroundCompound(root,edit,{kind:'preset',fields:{titleArtwork}},mirror),'committed')
  assert.deepEqual(publications,[[1,1.5,12],['mirror',1,1.5,12]])
})

test('Guided and Background accept together, but stale Guided preparation never mirrors', () => {
  const { root, read, edit }=setup()
  const guidedLayout={id:'classic-top-title',version:1,omittedSlotIds:[],completedSlotIds:['disc:guided:background-image:primary']}
  const worlds: unknown[] = []
  root.subscribe(() => {
    const s=read()
    worlds.push([s.revision,s.project.background.scale,s.project.editor?.guidedLayout?.completedSlotIds])
  })
  const mirror=()=>{worlds.push(['mirror',read().revision])}
  assert.equal(commitPreparedDiscBackgroundCompound(root,edit,{kind:'guided',guidedLayout},mirror),'committed')
  assert.equal(commitPreparedDiscBackgroundCompound(root,edit,{kind:'guided',guidedLayout},mirror),'stale')
  assert.deepEqual(worlds,[[1,1.5,['disc:guided:background-image:primary']],['mirror',1]])
})

test('reentrant background-only R+2 keeps accepted sibling and Guided mirrors', () => {
  const { root, read, edit, project } = setup()
  const revisions: number[] = []
  root.subscribe(() => {
    revisions.push(read().revision)
    if (read().revision === 1) root.commitDiscBackground({
      ...edit, expectedRevision: 1, operation: {kind:'transform',scale:1.8,offset:{x:0,y:0}},
    })
  })
  let mirrorTitle=project.titleArtwork
  let mirrorEditor=project.editor
  const titleArtwork={...project.titleArtwork,layout:{...project.titleArtwork!.layout!,x:12}}
  const guidedLayout={id:'classic-top-title',version:1,omittedSlotIds:[],completedSlotIds:[]}
  assert.equal(commitPreparedDiscBackgroundCompound(root,edit,{kind:'preset',fields:{titleArtwork},guidedLayout},scope=>{
    assert.equal(scope.currentInteraction,false)
    if (scope.presetField('titleArtwork')) mirrorTitle=titleArtwork
    if (scope.guided) mirrorEditor={guidedLayout}
  }),'committed')
  assert.equal(read().project.background.scale,1.8)
  const { background, ...legacy } = project
  assert.equal(root.synchronizeDiscLegacyProject({sessionId:'disc',legacy:{
    ...legacy,titleArtwork:mirrorTitle,editor:mirrorEditor,
  }}),'no-op')
  assert.ok(background.scale<read().project.background.scale)
  assert.equal(read().project.titleArtwork?.layout?.x,12)
  assert.deepEqual(revisions,[1,2])
})

test('reentrant newer accepted title disarms only its mirror, preserving other accepted fields', () => {
  const { root, read, edit, project } = setup()
  const { background, ...legacy } = project
  const titleAt=x=>({...project.titleArtwork,layout:{...project.titleArtwork!.layout!,x}})
  root.subscribe(() => {
    if (read().revision===1) root.synchronizeDiscLegacyProject({sessionId:'disc',legacy:{
      ...legacy,editor:read().project.editor,titleArtwork:titleAt(19),
    }})
  })
  const guidedLayout={id:'classic-top-title',version:1,omittedSlotIds:[],completedSlotIds:[]}
  assert.equal(commitPreparedDiscBackgroundCompound(root,edit,{kind:'preset',fields:{titleArtwork:titleAt(12)},guidedLayout},scope=>{
    assert.equal(scope.presetField('titleArtwork'),false)
    assert.equal(scope.guided,true)
  }),'committed')
  assert.equal(read().project.titleArtwork?.layout?.x,19)
  assert.equal(read().project.background.scale,1.5)
  assert.ok(background.scale<read().project.background.scale)
})

test('preset nested text patch rejects content replacement without a publication or mirror', () => {
  const { root, read, edit }=setup()
  const before=read()
  assert.equal(commitPreparedDiscBackgroundCompound(root,edit,{
    kind:'preset',fields:{discText:{values:{customNote:'Must not write'}}},
  },()=>{ assert.fail('invalid text must never mirror') }),'invalid')
  assert.equal(read(),before)
})

test('preset applies both rating layouts without replaying the old rendered rating or image', () => {
  const { root, read, edit, project } = setup()
  const { background, ...legacy } = project
  assert.equal(background.scale, read().project.background.scale)
  const oldBadge = project.ratingBadge!
  const currentBadge = {
    ...oldBadge,
    source: 'custom' as const,
    customImageDataUrl: 'data:image/png;base64,AAAA',
    customImageSize: { width: 60, height: 100 },
    uskBadge: { ...oldBadge.uskBadge, ratingValue: '16' },
  }
  assert.equal(root.synchronizeDiscLegacyProject({
    sessionId: 'disc', legacy: { ...legacy, ratingBadge: currentBadge },
  }), 'synchronized')
  const before = read()
  const plannedBadge = {
    ...oldBadge,
    layout: { ...oldBadge.layout, x: 21 },
    uskBadge: { ...oldBadge.uskBadge, layout: { ...oldBadge.uskBadge.layout, x: 8 } },
  }
  const fields = projectDiscPresetSiblingFields(
    { ratingBadge: oldBadge } as DiscRolePresetCurrentState,
    { ratingBadge: plannedBadge } as DiscRolePresetCurrentState,
    ['ratingBadge'],
  )
  const revisions: number[] = []
  const layoutMirrors: (readonly [boolean, boolean])[] = []
  root.subscribe(() => { revisions.push(read().revision) })
  assert.equal(commitPreparedDiscBackgroundCompound(root, { ...edit, expectedRevision: before.revision },
    { kind: 'preset', fields }, scope => {
      layoutMirrors.push([scope.primaryRatingLayout, scope.supplementalRatingLayout])
    }), 'committed')
  assert.deepEqual(read().project.ratingBadge, {
    ...currentBadge,
    layout: plannedBadge.layout,
    uskBadge: { ...currentBadge.uskBadge, layout: plannedBadge.uskBadge.layout },
  })
  assert.deepEqual(revisions, [before.revision + 1])
  assert.deepEqual(layoutMirrors, [[true, true]])
})

test('newer primary rating geometry reentry does not disable the independent USK layout mirror', () => {
  const { root, read, edit, project } = setup()
  const { background, ...legacy } = project
  assert.equal(background.scale, read().project.background.scale)
  const current = project.ratingBadge!
  const preset = {
    layout: { ...current.layout, x: 29 },
    uskLayout: { ...current.uskBadge.layout, x: 24 },
  }
  root.subscribe(() => {
    const accepted = read()
    if (accepted.revision !== 1) return
    const next = accepted.project.ratingBadge!
    assert.equal(root.synchronizeDiscLegacyProject({
      sessionId: 'disc',
      legacy: { ...legacy, ratingBadge: {
        ...next,
        layout: { ...next.layout, x: 34 },
        uskBadge: { ...next.uskBadge, ratingValue: '18' },
      } },
    }), 'synchronized')
  })
  assert.equal(commitPreparedDiscBackgroundCompound(root, edit, { kind: 'preset', fields: {
    ratingBadge: preset,
  } }, scope => {
    assert.equal(scope.currentInteraction, false)
    assert.equal(scope.primaryRatingLayout, false)
    assert.equal(scope.supplementalRatingLayout, true)
  }), 'committed')
  assert.equal(read().revision, 2)
  assert.equal(read().project.ratingBadge?.layout.x, 34)
  assert.equal(read().project.ratingBadge?.uskBadge.ratingValue, '18')
  assert.equal(read().project.ratingBadge?.uskBadge.layout.x, 24)
})
