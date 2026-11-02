import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Entry-point/DOM failure diagnostics only; no native visual acceptance.
let server, browser, page, base
test.before(async()=>{
 server=await createServer({cacheDir:'node_modules/.vite-test-startup',logLevel:'silent',server:{host:'127.0.0.1',port:0},plugins:[{name:'startup-fixture',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  if(!req.url?.startsWith('/__startup')) return next()
  const html=`<!doctype html><body>${req.url.includes('missing')?'':'<div id="root"></div>'}<script type="module" src="/src/main.tsx"></script></body>`
  try {res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml('/__startup',html))}catch(error){next(error)}
 })}}]})
 await server.listen();base=`http://127.0.0.1:${server.httpServer.address().port}`
 browser=await chromium.launch({headless:true})
})
test.beforeEach(async()=>{
 page=await browser.newPage()
 await page.route('**/src/app/App.tsx*',async route=>{
  const transformed=await server.transformRequest('/src/components/testing/ApplicationStartupFixture.tsx')
  await route.fulfill({contentType:'application/javascript',body:transformed.code})
 })
})
test.afterEach(async()=>{await page?.close()})
test.after(async()=>{await browser?.close();await server?.close()})
async function report(){
 await page.getByRole('heading',{name:'Steam Backup Label Studio could not continue'}).waitFor({timeout:15000})
 const field=page.getByRole('textbox',{name:'Local diagnostic report'})
 assert.equal(await field.getAttribute('readonly'),'')
 const text=await field.inputValue()
 assert.doesNotMatch(text,/private|localhost|127\.0\.0\.1|data:image|stack|message/i)
 await page.getByRole('button',{name:'Select report'}).click()
 assert.equal(await field.evaluate(node=>node.selectionEnd-node.selectionStart),text.length)
 return JSON.parse(text)
}
test('missing document root still exposes a safe selectable fallback',async()=>{
 await page.goto(base+'/__startup?missing')
 const result=await report();assert.equal(result.records[0].failureCode,'startup.document-root-failed')
})
test('failed application module load reports before React can be imported',async()=>{
 await page.route('**/src/app/bootstrapApplication.tsx*',route=>route.abort('failed'))
 await page.goto(base+'/__startup')
 const result=await report();assert.equal(result.records[0].failureCode,'startup.module-load-failed')
})
for(const [path,exportName,stage] of [
 ['app/applicationLifecycleRuntime.ts','createApplicationLifecycleRuntime','lifecycle-root'],
 ['applicationMenu/applicationMenuRuntime.ts','createApplicationMenuRuntime','menu-runtime'],
])test(`${stage} construction failure retains report before React mounts`,async()=>{
 await page.route(`**/src/${path}*`,route=>route.fulfill({contentType:'application/javascript',body:`export function ${exportName}(){throw Error('private-construction')}`}))
 await page.goto(base+'/__startup')
 const result=await report();assert.equal(result.records[0].failureCode,`startup.${stage}-failed`)
})
test('first render failure preserves startup report through lifecycle cleanup',async()=>{
 await page.route('**/src/app/App.tsx*',route=>route.fulfill({contentType:'application/javascript',body:`export default function App(){throw Error('private-render')}`}))
 await page.goto(base+'/__startup')
 const result=await report();assert.equal(result.records[0].failureCode,'startup.react-render-failed')
})
test('runtime render failure retains successful startup and records the later failure separately',async()=>{
 await page.goto(base+'/__startup')
 await page.getByText('Ready fixture',{exact:true}).waitFor({timeout:15000})
 // Give the actual committed effect a turn; the test then triggers a real React render failure.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
 await page.evaluate(()=>window.failFixture())
 const result=await report()
 assert.equal(result.records[0].status,'success')
 assert.ok(result.records.some(record=>record.event==='runtime' && record.failureCode==='startup.react-render-failed'))
})
