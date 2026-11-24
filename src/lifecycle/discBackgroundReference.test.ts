import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import test from 'node:test'
import { DiscBackgroundRaster, readDiscBackgroundAsset } from '../image/discBackgroundAsset.ts'
import { findImageDataContentBounds, getImageContentSourceRect } from '../image/imageContentBounds.ts'
import { getBackgroundDrawSize } from '../image/backgroundImage.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createProjectPackageCapturePlan } from '../package/projectPackageCapturePlan.ts'
import { createProjectPackageWriteRequest } from '../tauri/projectPackageWrite.ts'
import { createBrandingSources } from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import { stageProjectPackageOpen } from '../app/appProjectLoad.ts'
import {
  captureDiscBackgroundExportInput, captureNormalizedProjectSnapshot, materializeDiscProject,
} from './canonicalProject.ts'
import { createApplicationLifecycleCompositionRoot } from './applicationLifecycleCompositionRoot.ts'
import {
  adoptPinnedDiscSave, createLoadedProjectSession, pinDiscSaveRevision, projectPinnedDiscSave, selectIsActiveProjectDirty,
} from './projectSession.ts'
import { createProjectAsyncWork } from './projectAsyncWork.ts'

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAECAYAAABGM/VAAAAANklEQVR4nBXI0Q0AIAjEUGZCjmEEt2Q/rR8vaWq+xxYCQsK8mDU3IDrrz2Y2E6Kz/zxMBITEA89YHUOv2IY1AAAAAElFTkSuQmCC'

function fixture() {
  const saved = createBlankDiscSavedProject()
  const file = Buffer.from(png.split(',')[1]!, 'base64')
  const pixels = inflateSync(file.subarray(41, 41 + file.readUInt32BE(33)))
  const raster = new Uint8ClampedArray(5 * 4 * 4)
  for (let y = 0; y < 4; y++) {
    assert.equal(pixels[y * 21], 0)
    raster.set(pixels.subarray(y * 21 + 1, y * 21 + 21), y * 20)
  }
  const bounds = findImageDataContentBounds({ width: 5, height: 4, data: raster })
  assert.deepEqual(bounds, { x: 1, y: 1, width: 2, height: 2 })
  saved.background = {
    ...saved.background, imageDataUrl: png, imageSize: { width: 5, height: 4, contentBounds: bounds! },
    imageSource: { source: 'uploaded', sourceLabel: 'generated alpha fixture', sourceId: null },
  }
  return saved
}

const frame = (project: ReturnType<typeof fixture>) =>
  createProjectPackageWriteRequest(project, createProjectPackageCapturePlan(project))

function load(project: ReturnType<typeof fixture>, stagedDiscBackground?: Awaited<ReturnType<typeof DiscBackgroundRaster.stageAcceptedSource>>) {
  return createLoadedProjectSession({ sessionId:'test', project, stagedDiscBackground,
    currentPath:'fixture.sbls', persistenceFormat:'sbls-package-v1' })
}

function read(root: ReturnType<typeof createApplicationLifecycleCompositionRoot>) {
  const active = root.getLifecycleState().activeSession
  assert.ok(active?.kind === 'disc')
  return active
}

test('package Open stages the opaque exact asset and geometry revisions share it through pinned Save and export', async () => {
  const saved = fixture()
  const bytes = new TextEncoder().encode(JSON.stringify(saved))
  const result = await stageProjectPackageOpen({ selectedPath: 'fixture.sbls',
    decodeProjectPackageFileCommand: async () => bytes,
    caseInsertBrandingSources: createBrandingSources() })
  assert.equal(result.status, 'success')
  if (result.status !== 'success' || result.value.projectType !== 'disc') throw Error('Expected staged Disc.')
  const candidate = result.value
  const handle = candidate.stagedDiscBackground
  assert.ok(DiscBackgroundRaster.owns(handle))
  const root = createApplicationLifecycleCompositionRoot({
    initialState: load(candidate.normalizedProject as ReturnType<typeof fixture>, handle),
  })
  const initial = read(root)
  assert.equal(initial.project.background.asset, handle)
  assert.equal(Object.hasOwn(initial.project.background,'imageDataUrl'), false)
  assert.equal(JSON.stringify(initial.project.background).includes(png), false)
  assert.equal(initial.cleanBaseline?.comparisonValue.includes(png), false)
  const pinned = pinDiscSaveRevision(initial)
  const exportAtR = captureDiscBackgroundExportInput(initial.project.background)
  const legacy = load(candidate.normalizedProject as ReturnType<typeof fixture>).activeSession
  assert.ok(legacy?.kind === 'disc')
  const legacyExport = captureDiscBackgroundExportInput(legacy.project.background)
  assert.deepEqual(exportAtR, legacyExport)
  assert.equal(exportAtR.backgroundImageUrl, png)
  assert.deepEqual(getImageContentSourceRect(exportAtR.backgroundImageSize), { x: 1, y: 1, width: 2, height: 2 })
  assert.deepEqual(getBackgroundDrawSize(exportAtR.backgroundImageSize!, 1, 1000), {width: 1000,height: 1000})
  assert.deepEqual(frame(projectPinnedDiscSave(pinned)), frame(materializeDiscProject(legacy.project)))
  assert.equal(root.commitDiscBackground({sessionId:initial.id,expectedRevision:0,
    operation:{kind:'transform',scale:1.25,offset:{x:9,y:7}}}), 'committed')
  const r1=read(root)
  assert.equal(r1.project.background.asset, handle)
  assert.equal(exportAtR.backgroundScale, initial.project.background.scale)
  assert.notDeepEqual(exportAtR.backgroundOffset,r1.project.background.offset)
  const equivalent=await DiscBackgroundRaster.stageAcceptedSource(png)
  assert.notEqual(equivalent,handle)
  assert.equal(DiscBackgroundRaster.owns(equivalent) && equivalent.id,handle.id)
  assert.equal(root.commitDiscBackground({sessionId:r1.id,expectedRevision:r1.revision,
    operation:{kind:'asset',stagedAsset:equivalent,background:materializeDiscProject(r1.project).background}}),'no-op')
  assert.equal(read(root).project.background.asset,handle)
  const adopted=adoptPinnedDiscSave(root.getLifecycleState(),pinned,'other.sbls')
  assert.equal(adopted.activeSession?.project,r1.project)
  assert.equal(adopted.activeSession?.cleanBaseline?.exactSnapshot,initial.project)
  assert.equal(selectIsActiveProjectDirty(adopted),true)
})

test('mismatched and stale staging cannot alter the background or its baseline', async () => {
  const saved = fixture()
  const root = createApplicationLifecycleCompositionRoot({ initialState: load(saved) })
  const old = read(root)
  const work = createProjectAsyncWork(() => root.getStateSnapshot())
  const request = work.begin('background-artwork')
  const pending = DiscBackgroundRaster.stageAcceptedSource(png)
  const newer = work.begin('background-artwork')
  const handle = await pending
  assert.ok(DiscBackgroundRaster.owns(handle))
  assert.equal(work.commit(request, () => { throw Error('Stale completion must not publish.') }),false)
  assert.equal(work.isCurrent(newer),true)
  assert.equal(root.commitDiscBackground({sessionId:old.id,expectedRevision:0,
    operation:{kind:'asset',stagedAsset:handle,background:{...saved.background,imageDataUrl:'data:image/png;base64,AQ=='}}}),'invalid')
  assert.equal(read(root),old)
  assert.equal(readDiscBackgroundAsset(old.project.background.asset),png)
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()),false)
  const projected=materializeDiscProject(old.project)
  assert.deepEqual(projected,captureNormalizedProjectSnapshot(saved))
  assert.throws(()=>load({...saved,background:{...saved.background,imageDataUrl:null}},handle),/no longer matches/)
})

test('only internally backed assets enter committed state, and an unused getter is not invoked', async () => {
  const saved = fixture()
  const root = createApplicationLifecycleCompositionRoot({ initialState:load(saved) })
  const before=read(root)
  let sourceAccessed=false
  for (const stagedAsset of [
    { kind:'legacy-inline', source:png },
    Object.freeze({ kind:'legacy-inline', source:png }),
    Object.freeze({ kind:'legacy-inline', get source(){ sourceAccessed=true;return png } }),
    Object.create(DiscBackgroundRaster.prototype),
  ]) {
    assert.equal(root.commitDiscBackground({sessionId:before.id,expectedRevision:0,
      operation:{kind:'asset',stagedAsset,background:saved.background}}),'invalid')
    assert.throws(()=>load(saved,stagedAsset),/Invalid staged Disc background/)
  }
  assert.equal(sourceAccessed,false)
  assert.throws(()=>Reflect.construct(DiscBackgroundRaster,[undefined,'forged-id',png]),/constructor/)
  let accessed=false
  const background={...saved.background,get unused(){ accessed=true;return 'unexpected' }}
  assert.equal(root.commitDiscBackground({sessionId:before.id,expectedRevision:0,
    operation:{kind:'asset',background}}),'invalid')
  assert.equal(accessed,false)
  assert.equal(read(root),before)
  let reentered=false
  const reentrant = new Proxy(saved.background, {
    getOwnPropertyDescriptor(target,key) {
      if (!reentered) {
        reentered=true
        assert.equal(root.commitDiscBackground({sessionId:before.id,expectedRevision:0,
          operation:{kind:'transform',scale:1.5,offset:{x:3,y:4}}}),'committed')
      }
      return Reflect.getOwnPropertyDescriptor(target,key)
    },
  })
  assert.equal(root.commitDiscBackground({sessionId:before.id,expectedRevision:0,
    operation:{kind:'asset',background:reentrant}}),'stale')
  assert.equal(read(root).revision,1)
  assert.equal(read(root).project.background.scale,1.5)
})
