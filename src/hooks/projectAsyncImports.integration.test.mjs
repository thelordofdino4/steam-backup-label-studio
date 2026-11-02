import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Real React owners and image decoding with deferred FileReader completion.
// These headless race diagnostics do not establish native visual acceptance.
const route = '/__project-async-imports'
const html = `<!doctype html><div id="root"></div><script type="module">
import { act, createElement, useState, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createApplicationLifecycleRuntime } from '/src/app/applicationLifecycleRuntime.ts'
import { ApplicationLifecycleRuntimeContext } from '/src/app/applicationLifecycleRuntimeContext.ts'
import { createApplicationLifecycleCompositionRoot } from '/src/lifecycle/applicationLifecycleCompositionRoot.ts'
import { createNewProjectSession } from '/src/lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '/src/project/blankDiscProject.ts'
import { createDefaultProjectJewelCaseState } from '/src/project/projectCaseInsert.ts'
import { createDefaultProjectMetadata } from '/src/project/projectMetadata.ts'
import { discTemplates } from '/src/templates/discTemplates.ts'
import { useBackgroundImage } from '/src/hooks/useBackgroundImage.ts'
import { useTitleArtwork } from '/src/hooks/useTitleArtwork.ts'
import { useProjectLogoAssets } from '/src/hooks/useProjectLogoAssets.ts'
import { useMediaMarkState } from '/src/hooks/useMediaMarkState.ts'
import { useRatingBadgeState } from '/src/hooks/useRatingBadgeState.ts'
import { useCaseInsertTemplateEditor } from '/src/hooks/useCaseInsertTemplateEditor.ts'
import { useJewelCaseSpineEditor } from '/src/hooks/useJewelCaseSpineEditor.ts'
import { useSteamMetadataAssistance } from '/src/hooks/useSteamMetadataAssistance.ts'
import { useCaseInsertBrandingSyncQueue } from '/src/hooks/useCaseInsertBrandingSyncQueue.ts'
import { createDefaultProjectPlatformMarks } from '/src/project/projectPlatformMarks.ts'
import { createDefaultProjectTechnicalMarks } from '/src/project/projectTechnicalMarks.ts'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let api, metadataInput = createDefaultProjectMetadata()
const statuses = [], readers = [], metadataRequests = [], adopted = [], queuedAdoptions = []
const announceStatus = message => statuses.push(message)
const selectedDiscTemplate = discTemplates.standardPrintableDisc
const blank = createBlankDiscSavedProject()
const runtime = createApplicationLifecycleRuntime({createRoot: options => createApplicationLifecycleCompositionRoot({ ...options, initialState: createNewProjectSession({sessionId: 'A', project: blank}) })})
runtime.updateProjectReplacementDependencies({promptForReplacementDecision:async()=> 'discard'})
runtime.updateProjectNewDependencies({createBlankProject:()=>createBlankDiscSavedProject(),prepareEditorApply:()=>({commitLifecycleAndApply:commit=>commit()})})
const OriginalReader = FileReader
window.FileReader = class extends OriginalReader {
  readAsDataURL(file) {
    readers.push({ resume: () => super.readAsDataURL(file), reject: () => this.dispatchEvent(new ProgressEvent('error')) })
  }
}
window.__TAURI_INTERNALS__ = { invoke(command, args) {
  if(command === 'fetch_steam_app_details') return new Promise((resolve,reject) => metadataRequests.push({resolve,reject,appId:args.appid}))
  if(command === 'fetch_steam_store_items') return Promise.resolve('{}')
  if(command === 'find_steam_library_cache_assets') return Promise.resolve([])
  return Promise.reject('Unexpected native request '+command)
} }
function Owner() {
 const [caseState,setCaseState] = useState(() => createDefaultProjectJewelCaseState('Case'))
 const background = useBackgroundImage({discPreviewSize:600,steamLogoPlacement:'top',announceStatus})
 const title = useTitleArtwork({selectedDiscTemplate,steamLogoPlacement:'top',announceStatus})
 const logos = useProjectLogoAssets({selectedDiscTemplate,announceStatus})
 const media = useMediaMarkState({selectedDiscTemplate,announceStatus})
 const rating = useRatingBadgeState({selectedDiscTemplate,projectMetadata:metadataInput,announceStatus})
 const caseEditor = useCaseInsertTemplateEditor({setProjectJewelCase:setCaseState,announceStatus})
 const spine = useJewelCaseSpineEditor({setProjectJewelCase:setCaseState,announceStatus})
 const metadata = useSteamMetadataAssistance({selectedSteamGame:null,projectMetadata:metadataInput,announceStatus})
 const sources = {projectMetadata:metadataInput,projectLogoAssets:logos.projectLogoAssets,projectRatingBadge:rating.projectRatingBadge,projectMediaMark:media.projectMediaMark,projectPlatformMarks:createDefaultProjectPlatformMarks(),projectTechnicalMarks:createDefaultProjectTechnicalMarks()}
 const queue = useCaseInsertBrandingSyncQueue(sources, updater => { queuedAdoptions.push(runtime.projectAsyncWork.getCurrentSessionId()); setCaseState(updater) })
 api = { background,title,logos,media,rating,caseEditor,spine,caseState,metadata,queue }
 return null
}
const root = createRoot(document.getElementById('root'))
const render = () => root.render(createElement(StrictMode,null,createElement(ApplicationLifecycleRuntimeContext.Provider,{value:runtime},createElement(Owner))))
await act(async () => render())
const completions=[]
function imageFile(name) {
 const canvas=document.createElement('canvas'); canvas.width=4; canvas.height=4
 const ctx=canvas.getContext('2d'); ctx.fillStyle=name==='A.png'?'red':'blue';ctx.fillRect(0,0,4,4)
 const bytes=Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]), c=>c.charCodeAt(0))
 return new File([bytes],name,{type:'image/png'})
}
window.importHarness = {
 diagnostics: () => runtime.diagnostics.snapshot(),
 async start(kind,name) {
  const event={target:{files:[name==='malformed.png' ? new File(['invalid PNG'],name,{type:'image/png'}) : imageFile(name)],value:name}}
  await act(async()=>{
   let promise
   if(kind==='background')promise=api.background.handleBackgroundUpload(event)
   if(kind==='title')promise=api.title.handleTitleArtworkUpload(event)
   if(kind==='logo')promise=api.logos.handleLogoAssetUpload('developer',event)
   if(kind==='media')promise=api.media.handleMediaMarkUpload(event,value=>adopted.push({kind,source:value.source}))
   if(kind==='rating')promise=api.rating.handleRatingBadgeUpload(event,value=>adopted.push({kind,source:value.source}))
   if(kind==='cover'||kind==='tray')promise=api.caseEditor.handleImageSlotUpload(kind,'background','Background',event)
   if(kind==='left'||kind==='right')promise=api.spine.handleSpineImageSlotUpload(kind,'background','Background',event)
   if(kind==='cover-group')promise=api.caseEditor.handleGroupedImageSlotUpload('cover','artworkSlots','test-slot','Artwork',event)
   if(kind==='left-group')promise=api.spine.handleSpineGroupedImageSlotUpload('left','artworkSlots','test-slot','Artwork',event)
   if(kind==='cover-logo')promise=api.caseEditor.handlePrimaryLogoSlotUpload('cover','developer',event)
   if(kind==='left-logo')promise=api.spine.handleSpinePrimaryLogoSlotUpload('left','developer',event)
   completions.push(promise)
  })
 },
 async settle(index,fail) { await act(async()=>{ if(fail)readers[index].reject();else readers[index].resume();await completions[index] }) },
 async edit() {await act(async()=>{const session=runtime.root.getLifecycleState().activeSession;runtime.root.synchronizeCurrentProject({sessionId:session.id,kind:session.kind,project:{...session.project,title:session.project.title+' changed'}})})},
 async newProject() {await act(async()=>{const result=await runtime.root.dispatch('project.new-disc');if(result.result?.status==='failed')throw new Error(JSON.stringify(result))})},
 async reset() {await act(async()=>{runtime.projectAsyncWork.invalidateAll()})},
 async metadataStart(id,apply=true) {
  metadataInput={...metadataInput,steamAppId:String(id)}
  await act(async()=>render())
  await act(async()=>{const completion=api.metadata.findSteamMetadataCandidates(apply ? result=>{adopted.push({kind:'metadata',count:result.ratingCandidates.length})} : undefined);metadataRequests.at(-1).completion=completion})
 },
 async metadataSettle(index,fail) {await act(async()=>{const r=metadataRequests[index];if(fail)r.reject('metadata failed');else r.resolve(JSON.stringify({[r.appId]:{success:true,data:{name:'G'+r.appId,developers:['D'],publishers:['P'],ratings:{esrb:{rating:'e'}}}}}));await r.completion;})},
 async queue(revoke) {await act(async()=>{api.queue.scheduleCaseInsertBrandingMarkSlotSync();if(revoke)runtime.projectAsyncWork.invalidateAll()})},
 snapshot(){return {sessionId:runtime.projectAsyncWork.getCurrentSessionId(),statuses:[...statuses],adopted:[...adopted],queuedAdoptions:[...queuedAdoptions],background:api.background.backgroundImageUrl,title:api.title.projectTitleArtwork,logos:api.logos.projectLogoAssets,media:api.media.projectMediaMark,rating:api.rating.projectRatingBadge,caseState:api.caseState,metadata:api.metadata.steamMetadataAssistance}},
}
</script>`
let server,browser,page,url

test.before(async()=>{
 server=await createServer({cacheDir:'node_modules/.vite-project-async-imports',logLevel:'silent',server:{host:'127.0.0.1',port:0},plugins:[{name:'async-imports-fixture',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{if(req.url!==route)return next();try{res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml(route,html))}catch(e){next(e)}})}}]})
 await server.listen();url=`http://127.0.0.1:${server.httpServer.address().port}${route}`
 browser=await chromium.launch({headless:true})
})
test.beforeEach(async()=>{page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});await page.goto(url);try{await page.waitForFunction(()=>Boolean(window.importHarness),null,{timeout:5000})}catch(error){throw new Error(errors.join('\n') || error.message)}})
test.afterEach(async()=>{await page?.close()})
test.after(async()=>{await browser?.close();await server?.close()})
const snapshot=()=>page.evaluate(()=>window.importHarness.snapshot())
const start=(kind,name)=>page.evaluate(([kind,name])=>window.importHarness.start(kind,name),[kind,name])
const settle=(index,fail=false)=>page.evaluate(([index,fail])=>window.importHarness.settle(index,fail),[index,fail])
for(const kind of ['background','title','logo','media','rating','cover','tray','left','right']){
 test(`${kind}: newest real image wins and stale success/failure cannot publish`,async()=>{
  await start(kind,'A.png');await start(kind,'B.png');await settle(1)
  const accepted=await snapshot();assert.match(JSON.stringify(accepted), /data:image\/png;base64,/);assert.doesNotMatch(accepted.statuses.at(-1)??'', /failed|could not/)
  await settle(0);assert.deepEqual(await snapshot(),accepted)
 })
 test(`${kind}: revision change suppresses image and failure feedback`,async()=>{
  await start(kind,'A.png');await page.evaluate(()=>window.importHarness.edit());const current=await snapshot()
  await settle(0,true);assert.deepEqual(await snapshot(),current)
 })
}
for(const kind of ['media','rating'])test(`${kind}: accepted companion runs once, stale companion never runs`,async()=>{
 await start(kind,'A.png');await start(kind,'B.png');await settle(1);assert.equal((await snapshot()).adopted.length,1)
 await settle(0);assert.equal((await snapshot()).adopted.length,1)
})
test('reset suppresses a successful decoded image',async()=>{await start('background','A.png');await page.evaluate(()=>window.importHarness.reset());const current=await snapshot();await settle(0);assert.deepEqual(await snapshot(),current)})
test('queued branding reconciliation applies current work',async()=>{await page.evaluate(()=>window.importHarness.queue(false));assert.deepEqual((await snapshot()).queuedAdoptions,['A'])})
test('queued branding reconciliation cannot survive Reset before the committed render',async()=>{await page.evaluate(()=>window.importHarness.queue(true));assert.deepEqual((await snapshot()).queuedAdoptions,[])})

for(const kind of ['background','title','cover','tray','left','right'])test(`${kind}: New cannot be mutated by the previous session image`,async()=>{
 await start(kind,'A.png');await page.evaluate(()=>window.importHarness.newProject());const current=await snapshot();assert.notEqual(current.sessionId,'A')
 await settle(0);assert.deepEqual(await snapshot(),current)
})
for(const fail of [false,true])test(`older metadata ${fail?'failure':'success'} cannot replace newer candidates or auto-apply`,async()=>{
 await page.evaluate(()=>window.importHarness.metadataStart(1));await page.evaluate(()=>window.importHarness.metadataStart(2));await page.evaluate(()=>window.importHarness.metadataSettle(1,false))
 const accepted=await snapshot();assert.equal(accepted.metadata.isLoading,false);assert.equal(accepted.adopted.length,1)
 await page.evaluate(fail=>window.importHarness.metadataSettle(0,fail),fail);assert.deepEqual(await snapshot(),accepted)
})
test('metadata completion after New cannot publish candidates or auto-apply',async()=>{
 await page.evaluate(()=>window.importHarness.metadataStart(1));await page.evaluate(()=>window.importHarness.newProject());const current=await snapshot()
 await page.evaluate(()=>window.importHarness.metadataSettle(0,false));assert.deepEqual(await snapshot(),current);assert.deepEqual(current.adopted,[])
})

for(const kind of ['cover','tray','left','right','cover-group','left-group','cover-logo','left-logo','logo']) {
 test(kind + ': malformed upload does not revoke a valid import in another lane',async()=>{
  const before=await snapshot()
  await start('background','A.png')
  await start(kind,'malformed.png')
  await settle(1)
  const failed=await snapshot()
  assert.deepEqual(failed.caseState,before.caseState)
  assert.deepEqual(failed.logos,before.logos)
  assert.equal(failed.background,before.background)
  assert.match(failed.statuses.at(-1), /could not|failed|Unable|invalid/i)
  await settle(0)
  const accepted=await snapshot()
  assert.match(accepted.background,/^data:image\/png;base64,/)
  assert.deepEqual(accepted.caseState,before.caseState)
  assert.deepEqual(accepted.logos,before.logos)
  assert.doesNotMatch(accepted.statuses.at(-1), /could not|failed|Unable|invalid/i)
 })
}

for (const kind of ['background','title','logo','media','rating','cover','tray','left','right']) test(`${kind}: current read failure is typed, consumes authority and retains accepted image`, async()=>{
 await start(kind,'accepted.png'); await settle(0)
 const before = await snapshot()
 await start(kind,'private-replacement.png'); await settle(1,true)
 const after = await snapshot()
 assert.equal(JSON.stringify({...after,statuses:[]}), JSON.stringify({...before,statuses:[]}))
 const records = await page.evaluate(()=>window.importHarness.diagnostics().records)
 assert.equal(records.at(-1).status,'failure')
 assert.equal(records.at(-1).failureCode,'image.read-failed')
 assert.doesNotMatch(JSON.stringify(records),/private|accepted.png|data:image/)
 assert.match(after.statuses.at(-1),/could not be read/)
})
