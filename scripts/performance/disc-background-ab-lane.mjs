import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { CLASSIC_IMPORT_FIXTURES, decodeGeneratedDiscPackageWrite, runMountedRegressions, validateGeneratedClassicImport } from './disc-background-ab-regressions.mjs'
import { armCanvasPointerObservation, qualifyCanvasPointerSequence, runTrustedBackgroundCanvas } from './disc-background-canvas.mjs'
const [, , root, lane, batch, fixtureRoot, mode] = process.argv
assert.ok(mode === undefined || mode === '--verify-source-only')
assert.ok(root && ['before', 'after'].includes(lane) && ['A', 'B', 'regressions', 'canvas'].includes(batch))
assert.ok(!['regressions','canvas'].includes(batch) || lane === 'after')

const require = createRequire(resolve(root, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite/package.json').replace(/package\.json$/, 'dist/node/index.js')))
const { chromium } = require('playwright')
const hashBlob = path => { const b = readFileSync(resolve(root, path)); return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex') }
const baseline = '7c8c0debd00b11027c954f36b697665e3e2e1318'
const product = 'ddc885d103fa37a7052b91d6e9917914bc7c63ce'
const exactBaselineFiles = {
  "package-lock.json": "e4adaccfac1c115ef78511829672dfdc2228ce1e",
  "src/main.tsx": "3da470110e013670a93b081e7ad1fe93d361302e",
  "src/app/App.tsx": "1b78afb609d184fcd458e5b33360347f9275c14b",
  "src/hooks/useBackgroundImage.ts": "2481566d735d30988edba752ed610dd6a144786c",
  "src/lifecycle/applicationLifecycleStateStore.ts": "c50910c38e0d0b53c216cf5056647a6b547fb997",
  "scripts/performance/project-baseline.mjs": "fd2f3963db290577383b8237baafcf8278994e6f",
  "scripts/performance/fixtures.mjs": "b7e4701e00afac213efb5ebe7079b2958f681d2c",
  "scripts/performance/persistence.mjs": "07177e1fd1373e22c20b1443d8bb6c8a375340a7"
}
const AFTER_BLOBS = {
  "src/app/App.tsx": "57743176f08f9d22207debbe527a21cd5164fdbf",
  "src/hooks/useBackgroundImage.ts": "176246025f6c1f64951a1ddcfb1d453f7f206504",
  "src/lifecycle/applicationLifecycleCompositionRoot.ts": "450ec953c290ba17eb925d521777433401a81a3f",
  "src/app/appDiscBackgroundCompoundCommand.ts": "9af1d13780612a4027ae1f7a000ca9b691e4f691",
  "src/app/appDiscPresetDocumentPlan.ts": "aa8643c0857ecb803cd768459b64b3738f846d15"
}
const exactSource = { ...exactBaselineFiles, ...(lane === 'after' ? AFTER_BLOBS : {}) }
for (const [path, expectedBlob] of Object.entries(exactSource)) {
  assert.equal(hashBlob(path), expectedBlob, 'Baseline source drift: '+path)
}
assert.equal(require('playwright/package.json').version, '1.60.0')
const evidence = mkdtempSync(resolve(tmpdir(), 'sbls-disc-background-baseline-'))
const expected = {
 small:'498baae8132cfe92f9bc98117c7f9fd280728756365c7daf270cad55db900901',
 normal:'5cf04e345d2f9bdad4cfc3222303ee829fbc819351c278056d3b6d33bfa8e5a8',
 large:'9da8e668945e7dde20756b9bfb48e36281a9225c1f88da19122c7068b274a43e',
}
const digest=b=>createHash('sha256').update(b).digest('hex')
const metadata={}
const fixturePaths={}
const canvasFixtureHash='fb9b4ee461ace5f4eb2b3ba1f90fd104ab42286fc019131d31102f83491c9e40'
let canvasFixture
try {
for(const [size, hash] of Object.entries(expected)){
 const fixtureDirectory = resolve(evidence,`disc-${size}`)
 execFileSync(process.execPath,['--experimental-strip-types','scripts/performance/project-baseline.mjs','--fixture',`disc-${size}`,fixtureDirectory],{cwd:fixtureRoot,maxBuffer:1048576})
 const path=resolve(fixtureDirectory,'project.json')
 fixturePaths[size]=path
 const blob=readFileSync(path)
 assert.equal(digest(blob),hash)
 const p=JSON.parse(blob)
 assert.equal(p.projectType,'disc')
 assert.equal(p.background.enabled,true)
 metadata[size]={sha256:hash,bytes:blob.length,scale:p.background.scale,assetHash:digest(p.background.imageDataUrl),width:p.background.imageSize.width}
 if(batch==='canvas'&&size==='small'){
   assert.deepEqual(p.background.offset,{x:0,y:0})
   assert.equal(p.background.scale,1)
   // Separate fixture gives the square background enough travel on both axes.
   p.background.scale=1.5
   canvasFixture=Buffer.from(JSON.stringify(p))
   assert.equal(digest(canvasFixture),canvasFixtureHash)
 }
}
const replace=(s,a,b)=>{assert.equal(s.split(a).length,2,`instrumentation anchor: ${a.slice(0,100)}`);return s.replace(a,b)}
const handler="  function handleBackgroundScaleChange(value: number) {"
const beforeCapture=`    applicationLifecycleRoot.synchronizeCurrentProject({
      sessionId: session.id,
      kind: activeWorkspace,
      project: captureCurrentSavedProject(),
    })`
const regressionAnchor='    const outcome = unstable_batchedUpdates(() => commitPreparedDiscBackgroundCompound(applicationLifecycleRoot, {'
const afterCapture='    const captured = captureCurrentLegacyProject()'
const editEnd="        return stateStore.commitTransition(snapshot.generation, state => editDiscBackground(state, edit)).status"
let browser, server, rows=[], rawSetup=[]

function emitRow(r) {
  const {meta,keys,in:handlers,captures,commits,result}=r
  const zero=handlers[0]?.t
  const relative=t=>typeof t==='number'&&typeof zero==='number'?Number((t-zero).toFixed(4)):null
  console.log('SBLS365_AB_SAMPLE '+JSON.stringify({lane,batch,meta,keys,failure:r.failure,handlerCalls:handlers.map(h=>({ms:relative(h.t),value:h.value})),captureRows:captures.map(c=>({startMs:relative(c.start),projectionEndMs:relative(c.end),syncEndMs:relative(c.syncEnd),value:c.value,accepted:c.accepted.length})),directRows:r.direct.map(x=>({startMs:relative(x.start),endMs:relative(x.end),accepted:x.accepted,kind:x.kind})),commits:commits.map(c=>({ms:relative(c.t),beforeRevision:c.b.rev,acceptedRevision:c.a.rev,scale:c.a.scale,inSync:c.inSync,inDirect:c.inDirect})),result}))
}
try{
 const plugin = {
   name:'sbls-365-isolated-ab-probes',
   enforce:'pre',
   configureServer(vite){
     vite.middlewares.use((req,res,next)=>{
       const size=req.url?.match(/^\/__sbls365_fixture\/(small|normal|large)$/)?.[1]
       if(!size) return next()
       res.setHeader('Content-Type','application/json')
       if(batch==='canvas'){
         assert.equal(size,'small')
         return res.end(canvasFixture)
       }
       createReadStream(fixturePaths[size]).pipe(res)
     })
   },
   transform(s,id){
    if(id===resolve(root,'src/hooks/useBackgroundImage.ts'))return replace(s,handler,handler+'\n    globalThis.__sbls365?.handler(value)')
    if(id===resolve(root,'src/main.tsx')){
     const a='  const lifecycleRuntime = createApplicationLifecycleRuntime({ performanceObserver })'
     return replace(s,a,a+'\n  if (globalThis.__sbls365) globalThis.__sbls365.root = lifecycleRuntime.root')
    }
    if(lane==='after' && id===resolve(root,'src/app/App.tsx')) {
      const measured = replace(s,afterCapture,
        `    globalThis.__sbls365?.captureStart(session)
${afterCapture}
    globalThis.__sbls365?.captureEnd(captured.project)
    globalThis.__sbls365?.syncEnd()`)
      return batch==='regressions'||mode==='--verify-source-only'
        ? replace(measured, regressionAnchor,
          '    globalThis.__sbls365?.interruptPreparedPreset(session, setProjectTitleArtwork)\n'+regressionAnchor)
        : measured
    }
    if(lane==='after' && id===resolve(root,'src/lifecycle/applicationLifecycleCompositionRoot.ts'))
      return replace(s,editEnd,`        globalThis.__sbls365?.directStart(edit.operation.kind)
        try {
  ${editEnd}
        } finally {
          globalThis.__sbls365?.directEnd()
        }`)
    if(lane==='before' && id===resolve(root,'src/app/App.tsx'))return replace(s,beforeCapture,`    const beforeProbe = globalThis.__sbls365
    beforeProbe?.captureStart(session)
    const beforeProject = captureCurrentSavedProject()
    beforeProbe?.captureEnd(beforeProject)
    try {
      applicationLifecycleRoot.synchronizeCurrentProject({
        sessionId: session.id,
        kind: activeWorkspace,
        project: beforeProject,
      })
    } finally {
      beforeProbe?.syncEnd()
    }`)
    if(id===resolve(root,'src/lifecycle/applicationLifecycleStateStore.ts')){
     const a='      snapshot = captureSnapshot(snapshot.generation + 1, nextState)\n      notifySubscribers(snapshot)'
     return replace(s,a,'      const beforeAcceptance = globalThis.__sbls365 ? snapshot : null\n      snapshot = captureSnapshot(snapshot.generation + 1, nextState)\n      globalThis.__sbls365?.accepted(beforeAcceptance, snapshot)\n      notifySubscribers(snapshot)')
    }
    return null
   },
 }

 if (mode === '--verify-source-only') {
   for (const path of ['src/hooks/useBackgroundImage.ts','src/main.tsx','src/app/App.tsx',
     'src/lifecycle/applicationLifecycleStateStore.ts',
     ...(lane==='after'?['src/lifecycle/applicationLifecycleCompositionRoot.ts']:[])]) {
     const id=resolve(root,path)
     const source=readFileSync(id,'utf8')
     assert.notEqual(plugin.transform(source,id),source)
     if (lane==='after' && path==='src/app/App.tsx') assert.ok(plugin.transform(source,id).includes('interruptPreparedPreset(session, setProjectTitleArtwork)') && source.includes(regressionAnchor))
     assert.equal(typeof plugin.transform(source,id),'string')
   }
   console.log('SBLS365_AB_OFFLINE '+JSON.stringify({lane,batch,fixtureHashes:expected,canvasFixtureHash:batch==='canvas'?canvasFixtureHash:null,overlayAnchors:'verified',browser:false}))
   process.exitCode=0
 } else {
   server=await createServer({root,cacheDir:resolve(evidence,'vite-cache'),server:{host:'127.0.0.1',port:0,strictPort:true,fs:{allow:[root,evidence,realpathSync(resolve(root,'node_modules'))]}},logLevel:'error',plugins:[plugin]})
 await server.listen()
 const url=`http://127.0.0.1:${server.httpServer.address().port}`
 browser=await chromium.launch({headless:true})
 const version = browser.version()
 assert.equal(version,'148.0.7778.96','Use the Playwright-lockfile headless shell')
 const smoke = await browser.newPage()
 await smoke.goto('about:blank')
 assert.equal(await smoke.title(),'')
 await smoke.close()
 console.log('SBLS365_AB_SMOKE '+JSON.stringify({browser:version,node:process.version,os:process.platform,arch:process.arch,baseline,lane,batch}))
 for(const size of ['regressions','canvas'].includes(batch)?['small']:['small','normal','large']){
   const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,hasTouch:['regressions','canvas'].includes(batch)})
   await context.route('**/*',r=>r.request().url().startsWith(url+'/')||r.request().url().startsWith('data:')?r.continue():r.abort())
   const page=await context.newPage()
   const errors=[], consoleErrors=[]
   page.on('pageerror',e=>errors.push(e.message))
   page.on('console',e=>{if(e.type()==='error'||e.type()==='warning')consoleErrors.push(e.text().slice(0,280))})
   const initialize = ({size,isRegression,importFixtures}, decodeGeneratedDiscPackageWrite, validateGeneratedClassicImport)=>{
     let active=null, probe=null, direct=null, validatingImport=false
     const invokes=[], pointer=[], importChecks=[]
     let savedProject=null, savedPath=null, reopen=false, interrupt=false, interruptions=0, expectedSibling=null
     function view(s){const b=s?.kind==='disc'?s.project?.background:null;return {id:s?.id,rev:s?.revision,scale:b?.scale,width:b?.imageSize?.width,enabled:b?.enabled}}
     const P=globalThis.__sbls365={
       root:null, invokes,
       importReceipts: () => importChecks.slice(),
       readRegression() {
         const s=P.root?.getLifecycleState().activeSession
         const b=s?.project.background
         return { ...view(s), height:b?.imageSize?.height, source:b?.imageSource?.source, offset:b?.offset,
           sibling:s?.project.titleArtwork?.layout,
           expectedSibling, interruptions, pointer:pointer.slice(),
           previewTransform:document.querySelector('.background-image-layer > img, .background-image-layer > span')?.style.transform,
           saved:!!savedProject,savedScale:savedProject?.background.scale,savedOffset:savedProject?.background.offset,
           clean:!!s?.cleanBaseline&&s.cleanBaseline.exactSnapshot===s.project }
       },
       armStaleSibling(){if(!isRegression||interrupt)throw Error('unexpected interrupt request');interrupt=true},
       interruptPreparedPreset(s, mirrorTitle) {
         if(!interrupt)return
         interrupt=false
         if(!isRegression||s?.kind!=='disc'||P.root.getLifecycleState().activeSession.id!==s.id)throw Error('unexpected interrupt scope')
         const {background,...legacy}=s.project
         if(!background||!legacy.titleArtwork)throw Error('competing fixture sibling is missing')
         const layout={...legacy.titleArtwork.layout,x:19,y:-11}
         const titleArtwork={...legacy.titleArtwork,layout}
         const status=P.root.synchronizeDiscLegacyProject({sessionId:s.id,legacy:{...legacy,titleArtwork}})
         if(status!=='synchronized'||typeof mirrorTitle!=='function')throw Error('competing owner write did not publish')
         // This competing writer mirrors its OWN accepted field. No candidate
         // preset or rollback setter is invoked by the diagnostic itself.
         mirrorTitle(titleArtwork)
         expectedSibling=layout
         interruptions++
       },
       reopenSaved() { if(!isRegression||!savedProject)throw Error('Nothing saved'); reopen=true },
       async checkAssetHash(expected,saved=false) {
         const value=(saved?savedProject:P.root?.getLifecycleState().activeSession?.project)?.background?.imageDataUrl
         if(typeof value!=='string')return false
         const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))
         return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('')===expected
       },
       view(){return view(P.root?.getLifecycleState().activeSession)},
       layout(){
         const selector='input[id$="-background-scale-number"]'
         return [...document.querySelectorAll(selector)].map(input=>{
           const panels=[]
           for(let node=input.parentElement;node;node=node.parentElement){
             if(node.tagName==='DETAILS')panels.unshift({
               title:node.querySelector(':scope > summary > .panel-summary-title')?.textContent?.trim(),
               open:node.open,
             })
           }
           const label=input.closest('fieldset')?.getAttribute('aria-label')
           const rect=input.getBoundingClientRect()
           return {id:input.id,label,enabled:input.matches(':enabled'),rect:{width:rect.width,height:rect.height},panels}
         })
       },
       initTrial(meta,expected){if(active)throw Error('overlap');active={meta,expected,before:P.view(),in:[],keys:[],captures:[],commits:[],direct:[]}},
       getTrial(){return active},
       drain(){const r=active;active=null;probe=null;direct=null;return r},
       handler(value){if(active)active.in.push({t:performance.now(),value})},
       captureStart(s){if(active){if(probe)throw Error('nested projection');probe={start:performance.now(),before:view(s),accepted:[]};active.captures.push(probe)}},
       captureEnd(p){if(probe){probe.end=performance.now();probe.value=p?.background?.scale}},
       syncEnd(){if(probe){probe.syncEnd=performance.now();probe=null}},
       directStart(kind) { if (active) { if (direct) throw Error('nested edit'); direct={kind,start:performance.now(),accepted:0}; active.direct.push(direct) } },
       directEnd() { if (direct) { direct.end=performance.now(); direct=null } },
       accepted(before,after){if(!active)return;const t=performance.now(),b=view(before?.state.activeSession),a=view(after.state.activeSession);if(b.rev!==a.rev||b.id!==a.id){const join={t,b,a,inSync:!!probe,inDirect:!!direct};active.commits.push(join);if(probe)probe.accepted.push(join);if(direct)direct.accepted++}},
     }
     document.addEventListener('keydown',e=>{if(active && /-background-scale-number$/.test(e.target?.id??''))active.keys.push({key:e.key,trusted:e.isTrusted})},true)
     if (isRegression) for(const eventName of ['pointerdown','pointerup','pointercancel']) {
       document.addEventListener(eventName,e=>{
         if(e.target?.id==='local-file-background-scale'&&pointer.length<32)
           pointer.push({type:e.type,trusted:e.isTrusted})
       },true)
     }
     globalThis.isTauri=true
     globalThis.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener(){}}
     globalThis.__TAURI_INTERNALS__={
       transformCallback(){return 1},
       convertFileSrc(s){return s},
       metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},
       invoke:async(cmd,args,options)=>{
         invokes.push(cmd)
         if(cmd==='plugin:dialog|open')return reopen?savedPath:'/sbls365-fixture.sbls'
         if(cmd==='plugin:dialog|save'&&isRegression)return '/sbls365-fake-saved.sbls'
         if(cmd==='validate_imported_image_asset'&&isRegression){
           if(validatingImport) throw Error('Overlapping generated import validation')
           validatingImport=true
           const expected = importFixtures[importChecks.length]
           try {
             const {key,sha256,response}=await validateGeneratedClassicImport(args,expected?[expected]:[])
             importChecks.push({status:'fixture-accepted',fixture:key,sha256,width:response.width,height:response.height})
             return response
           } catch (error) {
             if(importChecks.length<importFixtures.length+1) importChecks.push({status:'fixture-rejected'})
             throw error
           } finally {
             validatingImport=false
           }
         }
         if(cmd==='encode_and_write_project_package_file'&&isRegression){
           savedPath=decodeURIComponent(options?.headers?.['x-sbls-project-path-v1']??'')
           if(!['/sbls365-fixture.sbls','/sbls365-fake-saved.sbls'].includes(savedPath))throw Error('Unexpected fixture destination')
           savedProject=decodeGeneratedDiscPackageWrite(args)
           return {status:'success'}
         }
         if(cmd==='decode_project_package_file'&&reopen&&savedProject){
           const requested=decodeURIComponent(options?.headers?.['x-sbls-project-path-v1']??'')
           if(requested!==savedPath)throw Error('Fixture reopened a different path')
           return new TextEncoder().encode(JSON.stringify(savedProject)).buffer
         }
         if(cmd==='recognize_project_file_format')return {status:'success',format:'sbls-package-v1'}
         if(cmd==='decode_project_package_file'){const r=await fetch('/__sbls365_fixture/'+size);if(!r.ok)throw Error('fixture unavailable');return r.arrayBuffer()}
         if(cmd==='plugin:event|listen')return 1
         if(cmd.startsWith('plugin:event|')||cmd.includes('application_menu')||cmd.includes('termination'))return undefined
         throw Error('Unsupported isolated stub: '+cmd)
       },
     }
   }
   const isRegression=batch==='regressions'
   const init = {size,isRegression,importFixtures:isRegression?CLASSIC_IMPORT_FIXTURES:[]}
   // All three functions are checked-in source. No page/text input becomes code.
   await page.addInitScript({content:
     `(${initialize})(${JSON.stringify(init)},${decodeGeneratedDiscPackageWrite},${validateGeneratedClassicImport})`})
   await page.goto(url)
   await page.locator('[data-smoke-id=home-load-project]').click({timeout:20000})
   try{await page.waitForFunction(w=>globalThis.__sbls365.view().width===w,metadata[size].width,{timeout:15000})}
   catch(e){rawSetup.push({size,errors,consoleErrors,text:(await page.locator('body').innerText()).slice(0,1800),invokes:await page.evaluate(()=>globalThis.__sbls365.invokes)});throw e}
   assert.equal(await page.evaluate(()=>globalThis.__sbls365.view().enabled),true)
   if(batch==='canvas'){
     await page.evaluate(armCanvasPointerObservation)
     const result=await runTrustedBackgroundCanvas(page,context,qualifyCanvasPointerSequence)
     assert.equal(errors.length,0,errors.join('\n'))
     console.log('SBLS365_CANVAS_RESULT '+JSON.stringify({fixtureSha:canvasFixtureHash,product,browser:version,...result}))
     await context.close()
     continue
   }
   const control='local-file-background-scale-number'
   const target='#'+control
   const input=page.locator(target)
   const summaries=page.locator('details:has('+target+') > summary')
   const expectedTitles=['Background Image','Local file']
   const readLayout=()=>page.evaluate(()=>globalThis.__sbls365.layout())
   const setup={size,errors,consoleErrors,layout:await readLayout(),invokes:await page.evaluate(()=>globalThis.__sbls365.invokes),reveals:[]}
   rawSetup.push(setup)
   const panels=()=>setup.layout.find(x=>x.id===control)?.panels
   try {
     assert.equal(await input.count(),1,'Expected one Local file Background Scale input')
     assert.deepEqual(panels()?.map(x=>x.title),expectedTitles,'Unexpected Background Scale disclosure ancestry')
     assert.equal(await summaries.count(),expectedTitles.length,'Expected one direct summary per ancestor')
     for(let i=0;i<expectedTitles.length;i++){
       const panel=panels()[i]
       const summary=summaries.nth(i)
       assert.equal(await summary.locator(':scope > .panel-summary-title').textContent(),panel.title)
       if(!panel.open){
         await summary.click({timeout:5000})
         await page.waitForFunction(({control,i})=>globalThis.__sbls365.layout().find(x=>x.id===control)?.panels[i]?.open===true,{control,i},{timeout:5000})
       }
       setup.layout=await readLayout()
       assert.equal(panels()[i].open,true)
       setup.reveals.push({title:panel.title,openedByHarness:!panel.open})
     }
     await input.waitFor({state:'visible',timeout:5000})
     assert.equal(await input.isEnabled(),true,'Background Scale is visible but disabled')
     assert.equal(await input.getAttribute('type'),'number')
     const layout=setup.layout.find(x=>x.id===control)
     assert.equal(layout?.label,'Local file background fine tuning controls')
     assert.ok(layout?.panels.every(x=>x.open),'Background Scale disclosures are not open')
     console.log('SBLS365_AB_SETUP '+JSON.stringify({lane,batch,size,control,layout,reveals:setup.reveals}))
   } catch (error) {
     setup.layout=await readLayout()
     setup.text=(await page.locator('body').innerText()).slice(0,3500)
     throw error
   }
   if(batch==='regressions') {
     await runMountedRegressions(page,context)
     assert.equal(errors.length,0,errors.join('\n'))
     await context.close()
     continue
   }
   const start=Number(await input.inputValue())
   assert.equal(start,metadata[size].scale)
   async function noChange(){
     await input.focus()
     const value=Number(await input.inputValue())
     await page.evaluate(({control,value})=>globalThis.__sbls365.initTrial({phase:'no-op',size:'small',control},value),{control,value})
     await input.press('Enter')
     await page.waitForFunction(()=>document.activeElement?.id!==globalThis.__sbls365.getTrial().meta.control)
     const row=await page.evaluate(()=>globalThis.__sbls365.drain())
     assert.deepEqual(row.keys,[{key:'Enter',trusted:true}])
     assert.deepEqual(row.commits,[])
     assert.equal(Number(await input.inputValue()),value)
     rows.push(row)
   }
   async function trial(batch,phase,index,key){
     const now=Number(await input.inputValue()), next=Number((now+(key==='ArrowUp'?.01:-.01)).toFixed(2))
     const meta={size,batch,phase,index,key,control}
     await input.focus()
     await page.evaluate(({meta,next})=>globalThis.__sbls365.initTrial(meta,next),{meta,next})
     let row
     try{
       await input.press(key)
       await page.waitForFunction(v=>globalThis.__sbls365.getTrial().commits.some(x=>x.a.scale===v),next,{timeout:2500})
       assert.equal(await page.evaluate(()=>globalThis.__sbls365.getTrial().commits.length),1)
       await input.press('Enter')
       await page.waitForFunction(()=>document.activeElement?.id!==globalThis.__sbls365.getTrial().meta.control,null,{timeout:2500})
       row=await page.evaluate(()=>globalThis.__sbls365.drain())
     }catch(e){row=await page.evaluate(()=>globalThis.__sbls365.drain());row.failure='trusted edit did not qualify';rows.push(row);throw e}
     rows.push(row)
     assert.deepEqual(row.keys,[{key,trusted:true},{key:'Enter',trusted:true}])
     assert.equal(row.commits.length,1)
     const [commit]=row.commits
     assert.equal(commit.a.id,row.before.id)
     assert.equal(commit.a.rev,row.before.rev+1)
     assert.equal(commit.a.scale,next)
     assert.equal(commit.inSync,lane==='before')
     assert.equal(commit.inDirect,lane==='after')
     assert.ok(row.in.length>=1&&row.in.every(x=>x.value===next))
     if (lane==='after') {
       assert.equal(row.captures.length,0,'background-only update entered a legacy projection')
       const joins=row.direct.filter(c=>c.accepted===1)
       assert.equal(joins.length,1)
       const [c]=joins
       assert.equal(c.kind,'transform')
       assert.ok(row.in[0].t<=c.start&&c.start<=commit.t&&commit.t<=c.end)
       row.result={handlerToAcceptMs:commit.t-row.in[0].t,typedEditToAcceptMs:commit.t-c.start,projectionMs:null,fullProjectionCount:0,handlerCount:row.in.length,semanticCommitCount:1}
     } else {
     const joins=row.captures.filter(c=>c.accepted.length===1)
     assert.equal(joins.length,1)
     const [c]=joins
     assert.equal(c.value,next)
     assert.ok(row.in[0].t<=c.start&&c.start<=c.end&&c.end<=commit.t&&commit.t<=c.syncEnd)
     row.result={handlerToAcceptMs:commit.t-row.in[0].t,projectionMs:c.end-c.start,postProjectionToAcceptMs:commit.t-c.end,fullProjectionCount:row.captures.length,handlerCount:row.in.length,semanticCommitCount:1}
     }

   }
   if(size==='small' && batch==='A'){
     await trial('dry','qualification',0,'ArrowUp')
     await noChange()
     await trial('dry','qualification',1,'ArrowDown')
     assert.equal(Number(await input.inputValue()),start)
     console.log('SBLS365_AB_QUALIFIED '+JSON.stringify({lane,batch,rows:rows.map(x=>({phase:x.meta.phase,keys:x.keys,revisionDelta:x.commits.length,result:x.result}))}))
   }
   {
     for(let i=0;i<12;i++)await trial(batch,i<2?'warmup':'measure',i,i%2?'ArrowDown':'ArrowUp')
     assert.equal(Number(await input.inputValue()),start)
   }
   assert.equal(errors.length,0,errors.join('\n'))
   await context.close()
 }
if(['regressions','canvas'].includes(batch)) {
  assert.equal(rows.length,0,'Regression setup must not be counted as timing')
} else {
const measured=rows.filter(r=>r.meta.phase==='measure')
assert.equal(measured.length,30)
assert.equal(rows.filter(r=>r.meta.phase==='warmup').length,6)
assert.equal(rows.filter(r=>r.meta.phase==='qualification').length,batch==='A'?2:0)
assert.equal(rows.filter(r=>r.meta.phase==='no-op').length,batch==='A'?1:0)
for (const r of rows) emitRow(r)
console.log('SBLS365_AB_BASELINE '+JSON.stringify({status:'passed',lane,batch,baseline,product,sourceBlobs:exactSource,metadata,rows:rows.length,count:measured.length,browser:version,node:process.version,os:process.platform,arch:process.arch,runnerImage:process.env.ImageOS||null,runnerImageVersion:process.env.ImageVersion||null,cpu:execFileSync('uname',['-m'],{encoding:'utf8'}).trim(),method:'headless instrumented DEV, stubbed picker/native recognition/codec response, real staging and matched lifecycle assignment'}))
}

 }
} catch(e){
  for (const r of rows) emitRow(r)
  const scrub=x=>String(x).replaceAll(root,'<checkout>').replaceAll(evidence,'<temp>').replaceAll(fixtureRoot,'<fixture-source>')
  console.error('SBLS365_AB_FAILED '+JSON.stringify({lane,batch,qualifiedRows:rows.length,error:scrub(e.message),setup:rawSetup.map(({size,layout,reveals,invokes,errors,consoleErrors,text})=>({size,layout,reveals,invokes,errors:errors?.map(scrub),consoleErrors:consoleErrors?.map(scrub),text:scrub(text??'').slice(0,900)}))}))
  throw new Error('Disc background baseline did not qualify; see sanitized failure record', {cause: undefined})
} finally {
 await browser?.close()
 await server?.close()
}
} finally {
 rmSync(evidence,{recursive:true,force:true})
}
