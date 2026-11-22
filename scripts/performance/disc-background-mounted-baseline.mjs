import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(resolve(root, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite/package.json').replace(/package\.json$/, 'dist/node/index.js')))
const { chromium } = require('playwright')
const git = (...args) => execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim()
const baseline = '7c8c0debd00b11027c954f36b697665e3e2e1318'
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
for (const [path, expectedBlob] of Object.entries(exactBaselineFiles)) {
  assert.equal(git('hash-object', path), expectedBlob, 'Baseline source drift: '+path)
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
try {
for(const [size, hash] of Object.entries(expected)){
 const fixtureDirectory = resolve(evidence,`disc-${size}`)
 execFileSync(process.execPath,['--experimental-strip-types','scripts/performance/project-baseline.mjs','--fixture',`disc-${size}`,fixtureDirectory],{cwd:root,maxBuffer:1048576})
 const path=resolve(fixtureDirectory,'project.json')
 fixturePaths[size]=path
 const blob=readFileSync(path)
 assert.equal(digest(blob),hash)
 const p=JSON.parse(blob)
 assert.equal(p.projectType,'disc')
 assert.equal(p.background.enabled,true)
 metadata[size]={sha256:hash,bytes:blob.length,scale:p.background.scale,assetHash:digest(p.background.imageDataUrl),width:p.background.imageSize.width}
}
const replace=(s,a,b)=>{assert.equal(s.split(a).length,2,`instrumentation anchor: ${a.slice(0,100)}`);return s.replace(a,b)}
const handler="  function handleBackgroundScaleChange(value: number) {"
const capture=`    applicationLifecycleRoot.synchronizeCurrentProject({
      sessionId: session.id,
      kind: activeWorkspace,
      project: captureCurrentSavedProject(),
    })`
let browser, server, rows=[], rawSetup=[]
function emitRow(r) {
  const {meta,keys,in:handlers,captures,commits,result}=r
  const zero=handlers[0]?.t
  const relative=t=>typeof t==='number'&&typeof zero==='number'?Number((t-zero).toFixed(4)):null
  console.log('SBLS365_SAMPLE '+JSON.stringify({meta,keys,failure:r.failure,handlerCalls:handlers.map(h=>({ms:relative(h.t),value:h.value})),captureRows:captures.map(c=>({startMs:relative(c.start),projectionEndMs:relative(c.end),syncEndMs:relative(c.syncEnd),value:c.value,accepted:c.accepted.length})),commits:commits.map(c=>({ms:relative(c.t),beforeRevision:c.b.rev,acceptedRevision:c.a.rev,scale:c.a.scale,inSync:c.inSync})),result}))
}
try{
 server=await createServer({root,cacheDir:resolve(evidence,'vite-cache'),server:{host:'127.0.0.1',port:0,strictPort:true},logLevel:'error',plugins:[{
   name:'sbls-365-isolated-before-probes',
   enforce:'pre',
   configureServer(vite){
     vite.middlewares.use((req,res,next)=>{
       const size=req.url?.match(/^\/__sbls365_fixture\/(small|normal|large)$/)?.[1]
       if(!size) return next()
       res.setHeader('Content-Type','application/json')
       createReadStream(fixturePaths[size]).pipe(res)
     })
   },
   transform(s,id){
    if(id===resolve(root,'src/hooks/useBackgroundImage.ts'))return replace(s,handler,handler+'\n    globalThis.__sbls365?.handler(value)')
    if(id===resolve(root,'src/main.tsx')){
     const a='  const lifecycleRuntime = createApplicationLifecycleRuntime({ performanceObserver })'
     return replace(s,a,a+'\n  if (globalThis.__sbls365) globalThis.__sbls365.root = lifecycleRuntime.root')
    }
    if(id===resolve(root,'src/app/App.tsx'))return replace(s,capture,`    const beforeProbe = globalThis.__sbls365
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
 }]})
 await server.listen()
 const url=`http://127.0.0.1:${server.httpServer.address().port}`
 browser=await chromium.launch({headless:true})
 const version = browser.version()
 assert.equal(version,'148.0.7778.96','Use the Playwright-lockfile headless shell')
 const smoke = await browser.newPage()
 await smoke.goto('about:blank')
 assert.equal(await smoke.title(),'')
 await smoke.close()
 console.log('SBLS365_SMOKE '+JSON.stringify({browser:version,node:process.version,os:process.platform,arch:process.arch,baseline}))
 for(const size of ['small','normal','large']){
   const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1})
   await context.route('**/*',r=>r.request().url().startsWith(url+'/')||r.request().url().startsWith('data:')?r.continue():r.abort())
   const page=await context.newPage()
   const errors=[], consoleErrors=[]
   page.on('pageerror',e=>errors.push(e.message))
   page.on('console',e=>{if(e.type()==='error'||e.type()==='warning')consoleErrors.push(e.text().slice(0,280))})
   await page.addInitScript(({size})=>{
     let active=null, probe=null
     const invokes=[]
     function view(s){const b=s?.kind==='disc'?s.project?.background:null;return {id:s?.id,rev:s?.revision,scale:b?.scale,width:b?.imageSize?.width,enabled:b?.enabled}}
     const P=globalThis.__sbls365={
       root:null, invokes,
       view(){return view(P.root?.getLifecycleState().activeSession)},
       layout(){return [...document.querySelectorAll('.fieldset, fieldset')].filter(el=>el.querySelector('input[id$="-background-scale-number"]')).map(el=>({label:el.getAttribute('aria-label'),disabled:el.disabled,id:el.querySelector('input[id$="-background-scale-number"]').id,open:el.getBoundingClientRect().width>0}))},
       initTrial(meta,expected){if(active)throw Error('overlap');active={meta,expected,before:P.view(),in:[],keys:[],captures:[],commits:[]}},
       getTrial(){return active},
       drain(){const r=active;active=null;probe=null;return r},
       handler(value){if(active)active.in.push({t:performance.now(),value})},
       captureStart(s){if(active){if(probe)throw Error('nested projection');probe={start:performance.now(),before:view(s),accepted:[]};active.captures.push(probe)}},
       captureEnd(p){if(probe){probe.end=performance.now();probe.value=p?.background?.scale}},
       syncEnd(){if(probe){probe.syncEnd=performance.now();probe=null}},
       accepted(before,after){if(!active)return;const t=performance.now(),b=view(before?.state.activeSession),a=view(after.state.activeSession);if(b.rev!==a.rev||b.id!==a.id){const join={t,b,a,inSync:!!probe};active.commits.push(join);if(probe)probe.accepted.push(join)}},
     }
     document.addEventListener('keydown',e=>{if(active && /-background-scale-number$/.test(e.target?.id??''))active.keys.push({key:e.key,trusted:e.isTrusted})},true)
     globalThis.isTauri=true
     globalThis.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener(){}}
     globalThis.__TAURI_INTERNALS__={
       transformCallback(){return 1},
       convertFileSrc(s){return s},
       metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},
       invoke:async(cmd,args)=>{
         invokes.push(cmd)
         if(cmd==='plugin:dialog|open')return '/sbls365-fixture.sbls'
         if(cmd==='recognize_project_file_format')return {status:'success',format:'sbls-package-v1'}
         if(cmd==='decode_project_package_file'){const r=await fetch('/__sbls365_fixture/'+size);if(!r.ok)throw Error('fixture unavailable');return r.arrayBuffer()}
         if(cmd==='plugin:event|listen')return 1
         if(cmd.startsWith('plugin:event|')||cmd.includes('application_menu')||cmd.includes('termination'))return undefined
         throw Error('Unsupported isolated stub: '+cmd)
       },
     }
   },{size})
   await page.goto(url)
   await page.locator('[data-smoke-id=home-load-project]').click({timeout:20000})
   try{await page.waitForFunction(w=>globalThis.__sbls365.view().width===w,metadata[size].width,{timeout:15000})}
   catch(e){rawSetup.push({size,errors,consoleErrors,text:(await page.locator('body').innerText()).slice(0,1800),invokes:await page.evaluate(()=>globalThis.__sbls365.invokes)});throw e}
   assert.equal(await page.evaluate(()=>globalThis.__sbls365.view().enabled),true)
   const selector='input[id$="-background-scale-number"]:enabled:visible'
   let input=page.locator(selector)
   if(await input.count()===0){
     const section=page.getByRole('button',{name:/^Background Image$/i})
     if(await section.count()===1)await section.click()
     if(await input.count()===0){
       const local=page.getByRole('button',{name:/^(Local File|Local Image|Upload Local Image)$/i})
       if(await local.count()===1)await local.click()
     }
   }
   const setup={size,errors,consoleErrors,layout:await page.evaluate(()=>globalThis.__sbls365.layout()),invokes:await page.evaluate(()=>globalThis.__sbls365.invokes)}
   rawSetup.push(setup)
   if(await input.count()!==1){setup.text=(await page.locator('body').innerText()).slice(0,3500);throw Error('Unique visible enabled Disc background scale not located')}
   const control=await input.getAttribute('id')
   setup.control=control
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
     assert.equal(commit.inSync,true)
     assert.ok(row.in.length>=1&&row.in.every(x=>x.value===next))
     const joins=row.captures.filter(c=>c.accepted.length===1)
     assert.equal(joins.length,1)
     const [c]=joins
     assert.equal(c.value,next)
     assert.ok(row.in[0].t<=c.start&&c.start<=c.end&&c.end<=commit.t&&commit.t<=c.syncEnd)
     row.result={handlerToAcceptMs:commit.t-row.in[0].t,projectionMs:c.end-c.start,postProjectionToAcceptMs:commit.t-c.end,fullProjectionCount:row.captures.length,handlerCount:row.in.length,semanticCommitCount:1}
   }
   if(size==='small'){
     await trial('dry','qualification',0,'ArrowUp')
     await noChange()
     await trial('dry','qualification',1,'ArrowDown')
     assert.equal(Number(await input.inputValue()),start)
     console.log('SBLS365_QUALIFIED '+JSON.stringify(rows.map(x=>({phase:x.meta.phase,keys:x.keys,revisionDelta:x.commits.length,result:x.result}))))
   }
   for(const batch of ['A','B']){
     for(let i=0;i<12;i++)await trial(batch,i<2?'warmup':'measure',i,i%2?'ArrowDown':'ArrowUp')
     assert.equal(Number(await input.inputValue()),start)
   }
   assert.equal(errors.length,0,errors.join('\n'))
   await context.close()
 }
const measured=rows.filter(r=>r.meta.phase==='measure')
assert.equal(measured.length,60)
assert.equal(rows.filter(r=>r.meta.phase==='warmup').length,12)
assert.equal(rows.filter(r=>r.meta.phase==='qualification').length,2)
assert.equal(rows.filter(r=>r.meta.phase==='no-op').length,1)
for (const r of rows) emitRow(r)
console.log('SBLS365_BASELINE '+JSON.stringify({status:'passed',baseline,sourceBlobs:exactBaselineFiles,metadata,rows:rows.length,count:measured.length,browser:version,node:process.version,os:process.platform,arch:process.arch,runnerImage:process.env.ImageOS||null,runnerImageVersion:process.env.ImageVersion||null,cpu:execFileSync('uname',['-m'],{encoding:'utf8'}).trim(),method:'headless instrumented DEV, stubbed picker/native recognition/codec response, real staging and matched lifecycle assignment'}))
} catch(e){
  for (const r of rows) emitRow(r)
  const scrub=x=>String(x).replaceAll(root,'<checkout>').replaceAll(evidence,'<temp>')
  console.error('SBLS365_FAILED '+JSON.stringify({qualifiedRows:rows.length,error:scrub(e.message),setup:rawSetup.map(({size,layout,invokes,errors,consoleErrors,text})=>({size,layout,invokes,errors:errors?.map(scrub),consoleErrors:consoleErrors?.map(scrub),text:scrub(text??'').slice(0,900)}))}))
  throw new Error('Disc background baseline did not qualify; see sanitized failure record', {cause: undefined})
} finally {
 await browser?.close()
 await server?.close()
}
} finally {
 rmSync(evidence,{recursive:true,force:true})
}
