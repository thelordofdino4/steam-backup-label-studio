import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Exercise real React/lifecycle owners with controlled discovery completions.
// This is a headless race diagnostic, not native visual acceptance.
const route = '/__discovery-ownership'
const serviceId = '\0discovery-ownership-service'
const service = `
export const discoverLogoCandidates = () => window.discoveryRequest('images')
export const discoverSteamMetadataCandidates = () => window.discoveryRequest('metadata')
export const buildSteamMetadataCandidatesFromImportedGame = game => window.discoveryResult('metadata', game.title)
export const downloadRemoteLogoCandidateAsDataUrl = () => { throw new Error('Unexpected download') }
`
const html = `<!doctype html><div id="root"></div><script type="module">
import { act, createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createApplicationLifecycleRuntime } from '/src/app/applicationLifecycleRuntime.ts'
import { ApplicationLifecycleRuntimeContext } from '/src/app/applicationLifecycleRuntimeContext.ts'
import { createApplicationLifecycleCompositionRoot } from '/src/lifecycle/applicationLifecycleCompositionRoot.ts'
import { createNewProjectSession } from '/src/lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '/src/project/blankDiscProject.ts'
import { createDefaultProjectMetadata } from '/src/project/projectMetadata.ts'
import { discTemplates } from '/src/templates/discTemplates.ts'
import { useLogoAssetDiscovery } from '/src/hooks/useLogoAssetDiscovery.ts'
import { useWebArtworkDiscovery } from '/src/hooks/useWebArtworkDiscovery.ts'
import { useSteamMetadataAssistance } from '/src/hooks/useSteamMetadataAssistance.ts'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let api
let metadata = {...createDefaultProjectMetadata(), steamAppId:'1', developer:'Developer A', publisher:''}
const statuses = [], requests = []
const announceStatus = message => statuses.push(message)
const runtime = createApplicationLifecycleRuntime({createRoot: options => createApplicationLifecycleCompositionRoot({
 ...options, initialState:createNewProjectSession({sessionId:'A',project:createBlankDiscSavedProject()})
})})
runtime.updateProjectReplacementDependencies({promptForReplacementDecision:async()=> 'discard'})
runtime.updateProjectNewDependencies({createBlankProject:()=>createBlankDiscSavedProject(),prepareEditorApply:()=>({commitLifecycleAndApply:commit=>commit()})})
window.discoveryRequest = kind => new Promise((resolve,reject)=>requests.push({kind,resolve,reject}))
window.discoveryResult = (kind,label) => {
 const candidate={id:label,url:'https://example.test/'+label+'.png',label,score:1}
 const sourceStatuses=[{source:'steam',label,status:'searched',candidateCount:1}]
 return kind==='metadata'
   ? {ratingCandidates:[{...candidate,system:'esrb',value:'e'}],legalCandidates:[{...candidate,text:label}],sourceStatuses}
   : {candidates:[candidate],artworkCandidates:[candidate],sourceStatuses}
}
function Owner() {
 const params={selectedSteamGame:null,projectMetadata:metadata,announceStatus}
 const logo=useLogoAssetDiscovery({...params,selectedDiscTemplate:discTemplates.standardPrintableDisc,
   setProjectLogoAssets:()=>{throw new Error('Unexpected project mutation')}})
 const web=useWebArtworkDiscovery({...params,applyBackgroundImageImport:()=>{throw new Error('Unexpected project mutation')}})
 const assistance=useSteamMetadataAssistance(params)
 api={logo,web,assistance}
 return null
}
const root=createRoot(document.getElementById('root'))
const render=()=>root.render(createElement(StrictMode,null,createElement(ApplicationLifecycleRuntimeContext.Provider,{value:runtime},createElement(Owner))))
await act(async()=>render())
window.discoveryHarness={
 async start(kind) {
  await act(async()=>{
   const before=requests.length
   const completion=kind==='logo' ? api.logo.findLogoCandidates('developer')
     : kind==='web' ? api.web.findWebArtworkCandidates()
     : api.assistance.findSteamMetadataCandidates()
   if(requests.length>before)requests.at(-1).completion=completion
   else await completion
  })
 },
 async settle(index,fail=false) {
  await act(async()=>{
   const request=requests[index]
   if(fail)request.reject(new Error('discovery failed https://private.invalid/art.png'))
   else request.resolve(window.discoveryResult(request.kind,'result-'+index))
   await request.completion
  })
 },
 async settleSources(mode) {
  await act(async()=>{
   const first=requests[0]
   const second=requests[1]
   if(mode==='rejected-partial') {
    first.reject(new Error('private discovery failure'))
    second.resolve(window.discoveryResult('images','usable-result'))
   } else {
    const base={candidates:[],artworkCandidates:[],sourceStatuses:[]}
    first.resolve({...base,sourceStatuses:[{source:'official-site',label:'private label',
      status:mode==='empty'?'unavailable':'error',detail:'private detail'}]})
    second.resolve(mode==='source-partial'?window.discoveryResult('images','usable-result'):base)
   }
   await first.completion
  })
 },
 async change(kind) {
  await act(async()=>{
   if(kind==='session')await runtime.root.dispatch('project.new-disc')
   else {
    metadata={...metadata,steamAppId:'2',developer:kind==='empty'?'':'Developer B',publisher:kind==='both'?'Publisher B':''}
    render()
   }
  })
 },
 snapshot(kind) {
  return {state:kind==='logo'?api.logo.logoCandidateDiscovery.developer:
   kind==='web'?api.web.webArtworkDiscovery:api.assistance.steamMetadataAssistance,
   sessionId:runtime.projectAsyncWork.getCurrentSessionId(),statuses:[...statuses],
   diagnostics:runtime.diagnostics.snapshot().records.filter(row=>row.workflowId)}
 }
}
</script>`
let server, browser, page, url

test.before(async()=>{
 server=await createServer({cacheDir:'node_modules/.vite-discovery-ownership',logLevel:'silent',server:{host:'127.0.0.1',port:0},plugins:[{
  name:'discovery-ownership-fixture',
  enforce:'pre',
  resolveId(source,importer) {
   if(importer && /\/use(LogoAssetDiscovery|WebArtworkDiscovery|SteamMetadataAssistance)\.ts$/.test(importer) &&
     ['../steam/steamLogoCandidates','../steam/steamMetadataCandidates'].includes(source))return serviceId
  },
  load(id){if(id===serviceId)return service},
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
 try{await page.waitForFunction(()=>Boolean(window.discoveryHarness),null,{timeout:5000})}
 catch(error){throw new Error(errors.join('\n')||error.message)}
})
test.afterEach(async()=>{await page?.close()})
test.after(async()=>{await browser?.close();await server?.close()})
const start=kind=>page.evaluate(kind=>window.discoveryHarness.start(kind),kind)
const settle=(index,fail=false)=>page.evaluate(([index,fail])=>window.discoveryHarness.settle(index,fail),[index,fail])
const snapshot=kind=>page.evaluate(kind=>window.discoveryHarness.snapshot(kind),kind)
function arrays(kind,state) {
 return kind==='metadata'?[state.ratingCandidates,state.legalCandidates,state.sourceStatuses]:
   kind==='logo'?[state.candidates,state.artworkCandidates,state.sourceStatuses]:[state.candidates,state.sourceStatuses]
}
for(const kind of ['logo','web','metadata']) {
 for(const change of ['session','input']) {
  test(kind+': accepted results cannot be relabeled after '+change+' changes, including pending/failure',async()=>{
   await start(kind);await settle(0)
   const accepted=await snapshot(kind)
   assert.ok(arrays(kind,accepted.state).every(array=>array.length===1))
   await page.evaluate(change=>window.discoveryHarness.change(change),change)
   assert.ok(arrays(kind,(await snapshot(kind)).state).every(array=>array.length===0))
   await start(kind)
   const pending=await snapshot(kind)
   assert.equal(pending.state.isLoading,true)
   assert.ok(arrays(kind,pending.state).every(array=>array.length===0))
   await settle(1,true)
   const failed=await snapshot(kind)
   assert.equal(failed.state.isLoading,false)
   assert.match(failed.state.error,kind==='metadata'?/discovery failed/:/Artwork search could not be completed/)
   if(kind!=='metadata'){
    const report=failed.diagnostics.at(-1)
    assert.equal(report.status,'failure')
    assert.equal(report.stage,'discover')
    assert.equal(report.failureCode,'artwork.discovery-failed')
    assert.doesNotMatch(JSON.stringify(report),/private|Developer/)
   }
   assert.ok(arrays(kind,failed.state).every(array=>array.length===0))
   await start(kind);await settle(2)
   const current=await snapshot(kind)
   assert.ok(arrays(kind,current.state).every(array=>array.length===1))
   assert.equal(arrays(kind,current.state)[0][0].id,'result-2')
  })
 }
 test(kind+': refresh keeps accepted results for the same session and input while pending',async()=>{
  await start(kind);await settle(0)
  const accepted=arrays(kind,(await snapshot(kind)).state)
  await start(kind)
  assert.deepEqual(arrays(kind,(await snapshot(kind)).state),accepted)
  await settle(1)
  assert.equal(arrays(kind,(await snapshot(kind)).state)[0][0].id,'result-1')
 })
}
test('web: missing discovery targets do not resurrect old accepted artwork',async()=>{
 await start('web');await settle(0)
 await page.evaluate(()=>window.discoveryHarness.change('empty'))
 await start('web')
 const result=(await snapshot('web')).state
 assert.equal(result.isLoading,false)
 assert.match(result.error,/enter developer\/publisher metadata/)
 assert.ok(arrays('web',result).every(array=>array.length===0))
})
for (const mode of ['rejected-partial','source-partial','source-failed','empty']) {
 test('web: '+mode+' records a safe outcome without hiding usable candidates',async()=>{
  await page.evaluate(()=>window.discoveryHarness.change('both'))
  await start('web')
  await page.evaluate(mode=>window.discoveryHarness.settleSources(mode),mode)
  const {state,diagnostics}=await snapshot('web')
  const partial=mode.endsWith('-partial')
  assert.equal(state.candidates.length,partial?1:0)
  assert.equal(Boolean(state.error),mode==='source-failed')
  assert.equal(diagnostics.length,1)
  const record=diagnostics[0]
  assert.equal(record.status,mode==='source-failed'?'failure':'success')
  assert.equal(record.partial,partial?true:undefined)
  assert.equal(record.stage,'discover')
  assert.doesNotMatch(JSON.stringify(record),/private|usable-result|Publisher/)
 })
}
test('web: a retired discovery records cancellation, not a failure with private input',async()=>{
 await start('web'); await start('web'); await settle(1); await settle(0,true)
 const {state,diagnostics}=await snapshot('web')
 assert.equal(state.candidates[0].id,'result-1')
 assert.equal(state.error,null)
 assert.deepEqual(diagnostics.map(row=>row.status),['cancelled','success'])
 assert.doesNotMatch(JSON.stringify(diagnostics),/private|result-1/)
})
