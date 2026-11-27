import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Real hooks and lifecycle ownership; only native transport and thumbnail IO
// are controlled. Headless behavior checks are not native/visual acceptance.
const route = '/__local-steam-screenshot-ownership'
const html = `<!doctype html><div id="root"></div><script type="module">
import { act, createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createApplicationLifecycleRuntime } from '/src/app/applicationLifecycleRuntime.ts'
import { ApplicationLifecycleRuntimeContext } from '/src/app/applicationLifecycleRuntimeContext.ts'
import { createApplicationLifecycleCompositionRoot } from '/src/lifecycle/applicationLifecycleCompositionRoot.ts'
import { createNewProjectSession } from '/src/lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '/src/project/blankDiscProject.ts'
import { useLocalSteamScreenshots } from '/src/hooks/useLocalSteamScreenshots.ts'
import { useSteamImport } from '/src/hooks/useSteamImport.ts'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const discoveries = [], imports = [], folders = [], reads = [], statuses = [], selections = [], applied = [], renders = []
let api, steam, retained, deferThumbnails = false
const thumbnailRequests = []
window.loadScreenshotThumbnails = (assets,current) => {
 const entries=assets.filter(asset=>!current[asset.id]).map(asset=>[asset.id,'thumbnail:'+asset.id])
 if(!deferThumbnails || entries.length===0)return Promise.resolve(Object.fromEntries(entries))
 return new Promise(resolve=>thumbnailRequests.push({resolve,entries}))
}
const runtime = createApplicationLifecycleRuntime({createRoot: options => createApplicationLifecycleCompositionRoot({
 ...options, initialState:createNewProjectSession({sessionId:'A',project:createBlankDiscSavedProject()})
})})
runtime.updateProjectReplacementDependencies({promptForReplacementDecision:async()=> 'discard'})
runtime.updateProjectNewDependencies({createBlankProject:()=>createBlankDiscSavedProject(),prepareEditorApply:()=>({commitLifecycleAndApply:commit=>commit()})})
window.__TAURI_INTERNALS__ = {invoke(command,args) {
 if(command==='validate_imported_image_asset')return Promise.resolve({status:'success',mimeType:'image/png',width:4,height:4})
 if(command==='find_steam_screenshots')return new Promise((resolve,reject)=>discoveries.push({resolve,reject,appId:args.appid}))
 if(command==='fetch_steam_app_details')return new Promise((resolve,reject)=>imports.push({resolve,reject,appId:args.appid}))
 if(command==='fetch_steam_store_items')return Promise.resolve('{}')
 if(command==='find_steam_library_cache_assets')return Promise.resolve([])
 if(command==='open_local_folder')return new Promise((resolve,reject)=>folders.push({resolve,reject,path:args.path}))
 if(command==='read_local_image_file')return new Promise((resolve,reject)=>reads.push({resolve,reject,path:args.path}))
 throw new Error('Unexpected native call: '+command)
}}
const announceStatus=message=>statuses.push(message)
function state() {
 return {ids:api.localSteamScreenshots.map(s=>s.id),thumbnails:api.localSteamScreenshotThumbnails,
 checked:api.hasCheckedLocalSteamScreenshots,loading:api.isLocalSteamScreenshotsLoading}
}
function Owner() {
 steam=useSteamImport({announceStatus})
 api=useLocalSteamScreenshots({selectedSteamGame:steam.selectedSteamGame,announceStatus,
 applyBackgroundImageImport:value=>applied.push(value),setSelectedArtworkId:value=>selections.push(value)})
 renders.push(state())
 return null
}
const root=createRoot(document.getElementById('root'))
await act(async()=>root.render(createElement(StrictMode,null,createElement(ApplicationLifecycleRuntimeContext.Provider,{value:runtime},createElement(Owner)))))
await act(async()=>steam.setSelectedSteamGame({appId:1,title:'Game A'}))
window.screenshotHarness={
 deferThumbnails(){deferThumbnails=true},
 async settleThumbnail(index){await act(async()=>{const request=thumbnailRequests[index];request.resolve(Object.fromEntries(request.entries))})},
 async start(){await act(async()=>{const completion=api.handleFindLocalSteamScreenshots();discoveries.at(-1).completion=completion})},
 async settle(index,fail=false){await act(async()=>{const request=discoveries[index];
  if(fail)request.reject(new Error('discovery failed '+index))
  else request.resolve([{id:'shot-'+index,label:'Screenshot '+index,path:'shot-'+index+'.png',folderPath:'folder-'+index}])
  await request.completion
 })},
 async change(kind){renders.length=0;await act(async()=>{
  if(kind==='session')await runtime.root.dispatch('project.new-disc')
  else steam.setSelectedSteamGame(kind==='none'?null:{appId:kind==='same'?1:2,title:kind==='same'?'Renamed A':'Game B'})
 })},
 async startImport(){await act(async()=>{const completion=steam.runSteamImport(2,result=>()=>{steam.setSelectedSteamGame(result.importedGame);return 'committed'});imports.at(-1).completion=completion})},
 async finishImport(outcome){await act(async()=>{const request=imports.at(-1)
  if(outcome==='cancel')runtime.projectAsyncWork.invalidate('steam-game')
  if(outcome==='failure')request.reject(new Error('import failed'))
  else request.resolve(JSON.stringify({[request.appId]:{success:true,data:{name:'Game B',developers:['D'],publishers:['P']}}}))
  await request.completion
 })},
 capture(){retained={folder:api.handleOpenLocalSteamScreenshotFolder,use:api.handleUseLocalSteamScreenshot,asset:api.localSteamScreenshots[0]}},
 async open(stale=false){await act(async()=>{const before=folders.length;const completion=(stale?retained.folder:api.handleOpenLocalSteamScreenshotFolder)();if(folders.length>before)folders.at(-1).completion=completion;else await completion})},
 async settleFolder(fail=false){await act(async()=>{const request=folders.at(-1);if(fail)request.reject(new Error('folder failed'));else request.resolve();await request.completion})},
 async useStale(){await act(async()=>{const before=reads.length;const completion=retained.use(retained.asset);if(reads.length>before)reads.at(-1).completion=completion;else await completion})},
 async settleRead(fail=false){await act(async()=>{const request=reads.at(-1)
  if(fail)request.reject(new Error('image failed'))
  else {
   const canvas=document.createElement('canvas');canvas.width=4;canvas.height=4
   const context=canvas.getContext('2d');context.fillStyle='red';context.fillRect(0,0,4,4)
   const bytes=Array.from(atob(canvas.toDataURL('image/png').split(',')[1]),value=>value.charCodeAt(0))
   request.resolve({content_type:'image/png',bytes})
  }
  await request.completion
 })},
 async clear(kind){await act(async()=>api[kind]())},
 snapshot(){return {...state(),game:steam.selectedSteamGame,session:runtime.projectAsyncWork.getCurrentSessionId(),
 thumbnailRequests:thumbnailRequests.map(request=>request.entries.map(([id])=>id)),statuses:[...statuses],selections:[...selections],applied:[...applied],folders:folders.map(f=>f.path),reads:reads.map(r=>r.path),renders:[...renders]}}
}
</script>`
let server, browser, page, url

test.before(async()=>{
 server=await createServer({cacheDir:'node_modules/.vite-local-screenshot-ownership',logLevel:'silent',server:{host:'127.0.0.1',port:0},plugins:[{
  name:'local-screenshot-ownership-fixture',enforce:'pre',
  resolveId(source,importer){if(importer?.endsWith('/useLocalSteamScreenshots.ts')&&source==='../local/localSteamScreenshotThumbnails')return '\0screenshot-thumbnails'},
  load(id){if(id==='\0screenshot-thumbnails')return 'export const loadMissingLocalSteamScreenshotThumbnails = (assets, current) => window.loadScreenshotThumbnails(assets,current)'},
  configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
   if(req.url!==route)return next()
   try{res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml(route,html))}catch(error){next(error)}
  })}
 }]})
 await server.listen()
 url='http://127.0.0.1:'+server.httpServer.address().port+route
 browser=await chromium.launch({headless:true})
})
test.beforeEach(async()=>{
 page=await browser.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(url)
 try{await page.waitForFunction(()=>Boolean(window.screenshotHarness),null,{timeout:10000})}
 catch(error){throw new Error(errors.join('\n')||error.message)}
})
test.afterEach(async()=>{await page?.close()})
test.after(async()=>{await browser?.close();await server?.close()})
const call=(method,...args)=>page.evaluate(([method,args])=>window.screenshotHarness[method](...args),[method,args])
const snapshot=()=>call('snapshot')
async function accept(){await call('start');await call('settle',0);assert.deepEqual((await snapshot()).ids,['shot-0'])}
function empty(state){assert.deepEqual(state.ids,[]);assert.deepEqual(state.thumbnails,{});assert.equal(state.checked,false)}

for(const identity of ['game','session','none']) {
 test('accepted results hide immediately on '+identity+' change, including retained folder callback',async()=>{
  await accept();await call('capture');await call('change',identity)
  const changed=await snapshot();empty(changed)
  // Every render, not merely an effect-cleaned final render, hides old results.
  assert.ok(changed.renders.length>0);changed.renders.forEach(empty)
  await call('open',true);assert.deepEqual((await snapshot()).folders,[])
 })
}
for(const identity of ['game','session']) {
 test('new '+identity+' search cannot relabel accepted arrays while pending or failed',async()=>{
  await accept();await call('change',identity);await call('start')
  const pending=await snapshot();assert.deepEqual(pending.ids,[]);assert.deepEqual(pending.thumbnails,{});assert.equal(pending.loading,true)
  await call('settle',1,true)
  const failed=await snapshot();assert.deepEqual(failed.ids,[]);assert.deepEqual(failed.thumbnails,{});assert.equal(failed.loading,false)
  assert.match(failed.statuses.at(-1),/discovery failed 1/)
 })
}
test('same numeric App ID survives replacement object/title and refresh retains accepted arrays',async()=>{
 await accept();const accepted=await snapshot();await call('change','same');await call('start')
 const pending=await snapshot();assert.deepEqual(pending.ids,accepted.ids);assert.deepEqual(pending.thumbnails,accepted.thumbnails);assert.equal(pending.checked,true);assert.equal(pending.loading,true)
 await call('settle',1);assert.deepEqual((await snapshot()).ids,['shot-1'])
})
for(const fail of [false,true]) {
 test('stale discovery '+(fail?'failure':'success')+' cannot replace newer results or feedback',async()=>{
  await call('start');await call('change','game');await call('start');await call('settle',1)
  const current=await snapshot();await call('settle',0,fail)
  const after=await snapshot();assert.deepEqual(after.ids,current.ids);assert.deepEqual(after.thumbnails,current.thumbnails);assert.deepEqual(after.statuses,current.statuses)
 })
 test('changed game rejects old discovery '+(fail?'failure':'success')+' even without a newer search',async()=>{
  await call('start');await call('change','game');const current=await snapshot();await call('settle',0,fail)
  const after=await snapshot();empty(after);assert.deepEqual(after.statuses,current.statuses)
 })
}
for(const outcome of ['failure','cancel','success']) {
 test('pending Steam import preserves accepted A; '+outcome+' respects selected identity',async()=>{
  await accept();await call('startImport');assert.deepEqual((await snapshot()).ids,['shot-0'])
  await call('finishImport',outcome);const after=await snapshot()
  if(outcome==='success'){assert.equal(after.game.appId,2);empty(after)}
  else {assert.equal(after.game.appId,1);assert.deepEqual(after.ids,['shot-0']);assert.deepEqual(after.thumbnails,{'shot-0':'thumbnail:shot-0'});assert.equal(after.checked,true)}
 })
}
test('A discovery accepted during pending B import is hidden when B commits',async()=>{
 await call('startImport');await accept();assert.equal((await snapshot()).game.appId,1)
 await call('finishImport','success');const after=await snapshot();assert.equal(after.game.appId,2);empty(after)
})
for(const identity of ['game','session']) {
 test('retained screenshot selection cannot read or select assets after '+identity+' change',async()=>{
  await accept();await call('capture');await call('change',identity);const before=await snapshot();await call('useStale')
  const after=await snapshot();assert.deepEqual(after.reads,[]);assert.deepEqual(after.selections,[]);assert.deepEqual(after.applied,[]);assert.deepEqual(after.statuses,before.statuses)
 })
}
for(const fail of [false,true]) {
 test('returning folder '+(fail?'failure':'success')+' cannot announce for the old game',async()=>{
  await accept();await call('open');assert.deepEqual((await snapshot()).folders,['folder-0']);await call('change','game')
  const before=await snapshot();await call('settleFolder',fail);assert.deepEqual((await snapshot()).statuses,before.statuses)
 })
}
for(const fail of [false,true]) for(const identity of ['game','session']) {
 test('returning selection '+(fail?'failure':'success')+' cannot mutate or announce after '+identity+' change',async()=>{
 await accept();await call('capture');await call('useStale');assert.deepEqual((await snapshot()).reads,['shot-0.png'])
 await call('change',identity);const before=await snapshot();await call('settleRead',fail);const after=await snapshot()
 assert.deepEqual(after.selections,before.selections);assert.deepEqual(after.statuses,before.statuses);assert.deepEqual(after.applied,[])
 })
}
test('current screenshot selection decodes and applies through the real background owner',async()=>{
 await accept();await call('capture');await call('useStale');await call('settleRead')
 const after=await snapshot();assert.equal(after.applied.length,1);assert.equal(after.applied[0].selectedArtworkId,'shot-0');assert.deepEqual(after.selections,['shot-0'])
})
for(const method of ['resetLocalSteamScreenshotSearch','clearLocalSteamScreenshotResults']) {
 test(method+' removes accepted identity and invalidates pending discovery',async()=>{
  await accept();await call('start');await call('clear',method);empty(await snapshot());const before=await snapshot()
  await call('settle',1);const after=await snapshot();empty(after);assert.deepEqual(after.statuses,before.statuses)
 })
}

for(const fail of [false,true]) {
 test('A to B to A keeps the original discovery '+(fail?'failure':'success')+' retired without a newer search',async()=>{
  await call('start');await call('change','game');await call('change','same')
  const before=await snapshot();assert.equal(before.game.appId,1);empty(before);assert.equal(before.loading,false)
  await call('settle',0,fail)
  const after=await snapshot();empty(after);assert.equal(after.loading,false);assert.deepEqual(after.statuses,before.statuses)
 })
}
for(const change of ['game','session','refresh']) {
 test('delayed old thumbnails cannot merge after '+change+' and newer accepted results',async()=>{
  await call('deferThumbnails');await accept()
  const original=await snapshot();assert.deepEqual(original.thumbnails,{});assert.deepEqual(original.thumbnailRequests,[['shot-0']])
  if(change!=='refresh')await call('change',change)
  await call('start');await call('settle',1)
  const newer=await snapshot();assert.deepEqual(newer.ids,['shot-1']);assert.deepEqual(newer.thumbnails,{})
  const currentThumbnailIndex=newer.thumbnailRequests.length-1
  assert.deepEqual(newer.thumbnailRequests[currentThumbnailIndex],['shot-1'])
  await call('settleThumbnail',currentThumbnailIndex)
  const accepted=await snapshot();assert.deepEqual(accepted.thumbnails,{'shot-1':'thumbnail:shot-1'})
  // Refresh can request A's still-missing thumbnail again before B is accepted.
  // Complete every retired thumbnail job after the current cache is populated.
  for(let index=0;index<currentThumbnailIndex;index++)await call('settleThumbnail',index)
  const after=await snapshot();assert.deepEqual(after.ids,accepted.ids);assert.deepEqual(after.thumbnails,accepted.thumbnails);assert.deepEqual(after.statuses,accepted.statuses)
 })
}
