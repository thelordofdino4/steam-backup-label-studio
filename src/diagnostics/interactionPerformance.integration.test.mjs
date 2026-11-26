import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const route='/interaction-observer-test'
const html=`<div id="root"></div><script type="module">
import { act, createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useTitleArtwork } from '/src/hooks/useTitleArtwork.ts'
import { useDiscTextState } from '/src/hooks/useDiscTextState.ts'
import { useDiscInteractionCommit } from '/src/diagnostics/useDiscInteractionCommit.ts'
import { createInteractionPerformanceObserver } from '/src/diagnostics/interactionPerformanceObserver.ts'
import { bindInteractionSession } from '/src/diagnostics/interactionPerformanceSession.ts'
import { InteractionPerformanceContext } from '/src/diagnostics/InteractionPerformanceContext.ts'
import { InteractionPerformanceReport } from '/src/diagnostics/InteractionPerformanceReport.tsx'
import { createApplicationLifecycleRuntime } from '/src/app/applicationLifecycleRuntime.ts'
import { createApplicationLifecycleCompositionRoot } from '/src/lifecycle/applicationLifecycleCompositionRoot.ts'
import { ApplicationLifecycleRuntimeContext } from '/src/app/applicationLifecycleRuntimeContext.ts'
import { createNewProjectSession } from '/src/lifecycle/projectSession.ts'
import { createBlankDiscSavedProject } from '/src/project/blankDiscProject.ts'
import { createDefaultProjectMetadata } from '/src/project/projectMetadata.ts'
import { shouldRenderTitleArtwork } from '/src/project/projectTitleArtwork.ts'
import { isDiscTextHtmlEnabled } from '/src/discText/index.ts'
import { discTemplates } from '/src/templates/discTemplates.ts'
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const observer=createInteractionPerformanceObserver()
let api, visible=true, injected=observer
const runtime=createApplicationLifecycleRuntime({createRoot: options => createApplicationLifecycleCompositionRoot({
 ...options,initialState:createNewProjectSession({sessionId:'A',project:createBlankDiscSavedProject()})
})})
bindInteractionSession(observer,runtime.root)
runtime.updateProjectReplacementDependencies({promptForReplacementDecision:async()=> 'discard'})
runtime.updateProjectNewDependencies({createBlankProject:()=>createBlankDiscSavedProject(),prepareEditorApply:()=>({commitLifecycleAndApply:commit=>commit()})})
function PreviewSeam({art,text}) {
 useDiscInteractionCommit(art,text.discTextValues,shouldRenderTitleArtwork(art),text.discTextSettings.customNote&&!isDiscTextHtmlEnabled(text.discTextHtmlSources,'customNote'))
 return createElement('div',null,createElement('output',{id:'scale'},art.layout.scale),createElement('output',{id:'text'},text.discTextValues.customNote))
}
function Owner(){
 const params={selectedDiscTemplate:discTemplates.standardPrintableDisc,steamLogoPlacement:'top'}
 const artwork=useTitleArtwork({...params,announceStatus:()=>{}})
 const text=useDiscTextState({...params,projectMetadata:createDefaultProjectMetadata()})
 api={artwork,text}
 return createElement('div',null,
  createElement('input',{id:'scale-input',type:'number',value:artwork.projectTitleArtwork.layout.scale,onChange:e=>artwork.handleTitleArtworkLayoutChange('scale',Number(e.target.value))}),
  createElement('textarea',{id:'note-input',value:text.discTextValues.customNote,onChange:e=>text.handleDiscTextInlineDraftChange('customNote',e.target.value)}),
  visible&&createElement(PreviewSeam,{art:artwork.projectTitleArtwork,text}),
  createElement(InteractionPerformanceReport,{observer}))
}
const root=createRoot(document.getElementById('root'))
const render=()=>root.render(createElement(StrictMode,null,createElement(ApplicationLifecycleRuntimeContext.Provider,{value:runtime},createElement(InteractionPerformanceContext.Provider,{value:injected},createElement(Owner)))))
await act(async()=>render())
await act(async()=>{
 api.artwork.setProjectTitleArtwork({...api.artwork.projectTitleArtwork,imageDataUrl:'data:image/png;base64,placeholder',imageSize:{width:128,height:128},layout:{...api.artwork.projectTitleArtwork.layout,enabled:true}})
 api.text.handleDiscTextToggle('customNote',true)
})
window.interactionHarness={
 snapshot:()=>({report:observer.snapshot(),scale:api.artwork.projectTitleArtwork.layout.scale,text:api.text.discTextValues.customNote}),
 async action(kind){await act(async()=>{
  if(kind==='noop')api.artwork.handleTitleArtworkLayoutChange('scale',api.artwork.projectTitleArtwork.layout.scale)
  if(kind==='batch'){api.artwork.handleTitleArtworkLayoutChange('scale',.65);api.artwork.handleTitleArtworkLayoutChange('scale',.75)}
  if(kind==='hidden'){api.text.handleDiscTextInlineDraftChange('customNote','hidden');api.text.handleDiscTextToggle('customNote',false)}
  if(kind==='html')api.text.handleDiscTextContentModeChange('customNote','html')
  if(kind==='source')api.text.handleDiscTextInlineDraftChange('customNote','<b>source</b>',{sourceMode:true})
  if(kind==='unmount'){api.artwork.handleTitleArtworkLayoutChange('scale',.65);visible=false;render()}
  if(kind==='remount'){visible=true;render()}
  if(kind==='replace'){api.artwork.handleTitleArtworkLayoutChange('scale',.75);await runtime.root.dispatch('project.new-disc')}
  if(kind==='fault'){injected={...observer,begin(){throw Error('begin')},expect(){throw Error('expect')},commit(){throw Error('commit')},unmount(){throw Error('unmount')}};render()}
  if(kind==='expect-fault'){injected={...observer,expect(){throw Error('expect')}};render()}
  if(kind==='disabled'){injected=undefined;render()}
 })}
}
</script>`
let server,browser,page,url

test.before(async()=>{
 server=await createServer({cacheDir:'node_modules/.vite-interaction-observer',logLevel:'silent',server:{host:'127.0.0.1',port:0},plugins:[{
  name:'interaction-fixture',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
   if(req.url!==route)return next()
   try{res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml(route,html))}catch(e){next(e)}
  })}
 }]})
 await server.listen();url='http://127.0.0.1:'+server.httpServer.address().port+route
 browser=await chromium.launch({headless:true})
})
test.beforeEach(async()=>{
 page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(url)
 try{await page.waitForFunction(()=>window.interactionHarness,null,{timeout:15000})}catch(e){throw Error(errors.join('\n')||e.message)}
})
test.afterEach(async()=>{await page?.close()})
test.after(async()=>{await browser?.close();await server?.close()})
const action=kind=>page.evaluate(kind=>window.interactionHarness.action(kind),kind)
const snapshot=()=>page.evaluate(()=>window.interactionHarness.snapshot())

test('actual scalar/text handlers reach preview seam once under StrictMode, report refresh is explicit',async()=>{
 await page.locator('#scale-input').fill('0.65')
 await page.locator('#note-input').fill('private fixture text')
 const s=await snapshot()
 assert.equal(s.scale,.65);assert.equal(s.text,'private fixture text')
 assert.deepEqual(s.report.samples.map(x=>[x.kind,x.outcome]),[['disc-title-artwork-scale','preview-commit'],['disc-custom-note-plain','preview-commit']])
 assert.ok(!JSON.stringify(s.report).includes('private'))
 assert.equal(await page.locator('[aria-label="Interaction timing samples"]').count(),0)
 await page.locator('summary').click();await page.getByRole('button',{name:'Refresh interaction timing report'}).click()
 assert.match(await page.locator('[aria-label="Interaction timing samples"]').innerText(),/retained 2/)
})
test('clamped no-op and coalesced earlier scalar excluded',async()=>{
 await action('noop');await action('batch')
 assert.deepEqual((await snapshot()).report.samples.map(x=>x.outcome),['no-op','superseded','coalesced'])
})
test('disabled text does not count as visible or reappear later',async()=>{
 await action('hidden');await action('remount')
 assert.deepEqual((await snapshot()).report.samples.map(x=>x.outcome),['hidden'])
})
test('HTML and source branches are not plain-text samples',async()=>{
 await action('html');await page.locator('#note-input').fill('rich text');await action('source')
 assert.equal((await snapshot()).report.samples.length,0)
})
test('unmount and replacement cancel pending before old identities return',async()=>{
 await action('unmount');await action('remount');await action('replace')
 assert.deepEqual((await snapshot()).report.samples.map(x=>x.outcome),['preview-unmounted','session-changed'])
 assert.equal((await snapshot()).report.samples.length,2)
})
for(const mode of ['fault','expect-fault','disabled'])test(mode+' leaves real owner updates intact',async()=>{
 await action(mode);await page.locator('#scale-input').fill('0.65');await page.locator('#note-input').fill('unchanged semantics')
 const s=await snapshot();assert.equal(s.scale,.65);assert.equal(s.text,'unchanged semantics')
 assert.ok(s.report.samples.every(x=>x.outcome!=='preview-commit'))
})
