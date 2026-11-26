import assert from 'node:assert/strict'
import { crc32, inflateSync } from 'node:zlib'
import test from 'node:test'
import { DiscBackgroundRaster, discBackgroundAssetsExactlyEqual, readDiscBackgroundAsset } from '../image/discBackgroundAsset.ts'
import { findImageDataContentBounds, getImageContentSourceRect } from '../image/imageContentBounds.ts'
import { getBackgroundDrawSize } from '../image/backgroundImage.ts'
import { createBlankDiscSavedProject } from '../project/blankDiscProject.ts'
import { createProjectPackageCapturePlan } from '../package/projectPackageCapturePlan.ts'
import { createProjectPackageWriteRequest } from '../tauri/projectPackageWrite.ts'
import { createBrandingSources } from '../caseInsert/brandingMarkTargetSourcesFixtures.ts'
import { stageProjectOpenContents, stageProjectPackageOpen } from '../app/appProjectLoad.ts'
import {
  captureDiscBackgroundExportInput, captureNormalizedProjectSnapshot, materializeDiscProject,
} from './canonicalProject.ts'
import { createApplicationLifecycleCompositionRoot } from './applicationLifecycleCompositionRoot.ts'
import {
  adoptPinnedDiscSave, applicationLifecycleStatesAreSemanticallyEqual, createLoadedProjectSession, pinDiscSaveRevision, projectPinnedDiscSave, selectIsActiveProjectDirty,
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
  assert.ok(DiscBackgroundRaster.owns(equivalent))
  assert.ok(discBackgroundAssetsExactlyEqual(equivalent, handle))
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
  assert.throws(()=>Reflect.construct(DiscBackgroundRaster,[undefined,png]),/constructor/)
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

function pngWithComment(value: 'a' | 'b'): string {
  const file = Buffer.from(png.split(',')[1]!, 'base64')
  const text = Buffer.from('tEXtComment\0' + value)
  const chunk = Buffer.alloc(text.length + 8)
  chunk.writeUInt32BE(text.length - 4)
  chunk.set(text, 4)
  chunk.writeUInt32BE(crc32(text), chunk.length - 4)
  return 'data:image/png;base64,' + Buffer.concat([
    file.subarray(0, -12), chunk, file.subarray(-12),
  ]).toString('base64')
}

test('validated raster staging reads neither crypto nor any source characters', async () => {
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const originalSlice = String.prototype.slice
  const originalIndexOf = String.prototype.indexOf
  const length = 100_000
  const input = 'data:image/jpeg;base64,' + 'A'.repeat(length - 23)
  let cryptoReads = 0
  let characterSearches = 0
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    get() { cryptoReads++; throw new Error('Crypto is unavailable.') },
  })
  String.prototype.slice = function(start, end) {
    if (this.length === length) characterSearches++
    return originalSlice.call(this, start, end)
  }
  String.prototype.indexOf = function(searchString, position) {
    if (this.length === length) characterSearches++
    return originalIndexOf.call(this, searchString, position)
  }
  try {
    const accepted = await DiscBackgroundRaster.stageAcceptedSource(input)
    assert.ok(DiscBackgroundRaster.owns(accepted))
    assert.equal(readDiscBackgroundAsset(accepted), input)
    assert.equal(cryptoReads, 0)
    assert.equal(characterSearches, 0)
  } finally {
    String.prototype.slice = originalSlice
    String.prototype.indexOf = originalIndexOf
    if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto)
    else Reflect.deleteProperty(globalThis, 'crypto')
  }
})

test('raw contents and legacy Open never manufacture native raster evidence', async () => {
  const saved = fixture()
  const contents = JSON.stringify(saved)
  for (const persistenceFormat of ['legacy-json', 'sbls-package-v1'] as const) {
    const staged = await stageProjectOpenContents({
      selectedPath: 'fixture.sbls', contents, persistenceFormat,
      caseInsertBrandingSources: createBrandingSources(),
    })
    assert.equal(staged.status, 'success')
    if (staged.status !== 'success' || staged.value.projectType !== 'disc') throw Error('Expected staged Disc.')
    assert.equal(staged.value.stagedDiscBackground, undefined)
    const active = load(saved).activeSession
    assert.ok(active?.kind === 'disc')
    assert.equal(DiscBackgroundRaster.owns(active.project.background.asset), false)
    assert.equal(readDiscBackgroundAsset(active.project.background.asset), png)
  }
})

test('same-length raster collisions and ref/compatibility aliases use exact lifecycle equality', async () => {
  const first = pngWithComment('a')
  const second = pngWithComment('b')
  assert.equal(first.length, second.length)
  assert.notEqual(first, second)
  const saved = fixture()
  saved.background.imageDataUrl = first
  const changed = { ...saved, background: { ...saved.background, imageDataUrl: second } }
  const brandA = await DiscBackgroundRaster.stageAcceptedSource(first)
  const brandB = await DiscBackgroundRaster.stageAcceptedSource(second)
  const copyA = await DiscBackgroundRaster.stageAcceptedSource(first)
  assert.ok(DiscBackgroundRaster.owns(brandA))
  assert.ok(DiscBackgroundRaster.owns(brandB))
  assert.notEqual(copyA, brandA)
  assert.equal(discBackgroundAssetsExactlyEqual(copyA, brandA), true)
  assert.equal(discBackgroundAssetsExactlyEqual(brandB, brandA), false)

  const a = load(saved, brandA)
  const b = load(changed, brandB)
  const fallbackA = load(saved)
  const aSession = a.activeSession!
  const bSession = b.activeSession!
  const aComparison = aSession.cleanBaseline!.comparisonValue
  assert.ok(aComparison === bSession.cleanBaseline!.comparisonValue, 'Deliberate compact-hint collision.')
  assert.equal(aComparison, fallbackA.activeSession!.cleanBaseline!.comparisonValue, 'Same source is cheap across representations.')
  assert.ok(!aComparison.includes(first))
  assert.equal(applicationLifecycleStatesAreSemanticallyEqual(a, fallbackA), true)
  assert.equal(applicationLifecycleStatesAreSemanticallyEqual(a, b), false)
  assert.equal(applicationLifecycleStatesAreSemanticallyEqual(a, {
    ...a, activeSession: { ...aSession, cleanBaseline: bSession.cleanBaseline },
  }), false, 'A colliding clean hint must not alias a different clean snapshot.')

  const root = createApplicationLifecycleCompositionRoot({ initialState: a })
  const r0 = read(root)
  const pin = pinDiscSaveRevision(r0)
  const submit = (source: string, stage: typeof brandA, revision: number) => root.commitDiscBackground({
    sessionId: r0.id, expectedRevision: revision,
    operation: { kind: 'asset', stagedAsset: stage, background: { ...saved.background, imageDataUrl: source } },
  })
  assert.equal(submit(first, copyA, 0), 'no-op')
  assert.equal(read(root).project.background.asset, brandA)
  assert.equal(submit(second, brandB, 0), 'committed')
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), true)
  assert.equal(captureDiscBackgroundExportInput(read(root).project.background).backgroundImageUrl, second)
  assert.equal(projectPinnedDiscSave(pin).background.imageDataUrl, first)
  assert.notDeepEqual(frame(projectPinnedDiscSave(pin)), frame(projectPinnedDiscSave(pinDiscSaveRevision(read(root)))))
  assert.equal(submit(first, copyA, 1), 'committed')
  assert.equal(selectIsActiveProjectDirty(root.getLifecycleState()), false, 'Restoring exact bytes is clean across handles.')
  root.dispose()
})
