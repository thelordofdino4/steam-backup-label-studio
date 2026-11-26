import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

// Fresh headless fixture with the real presentation controller, panel, shared
// feedback adapter, toast hook, and live-region renderer. Not native acceptance.
const route = '/__case-preset-toast-feedback'
const html = `<!doctype html><div id="root"></div><script type="module">
import { act, createElement, StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useStatusToasts } from '/src/hooks/useStatusToasts.ts'
import { publishApplicationCommandFeedback } from '/src/app/appApplicationCommandFeedback.ts'
import { createCaseInsertPresetPresentationController } from '/src/app/caseInsertPresetPresentationController.ts'
import { CaseInsertLayoutPresetsPanel } from '/src/components/caseInsert/CaseInsertLayoutPresetsPanel.tsx'
import { PreviewToastStack } from '/src/components/preview/PreviewToastStack.tsx'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const timers = [], originalSetTimeout = window.setTimeout.bind(window)
window.setTimeout = (callback, delay, ...args) => delay === 3600
  ? timers.push(() => callback(...args))
  : originalSetTimeout(callback, delay, ...args)
let api, outcome = 'success', revision = 0, lastDispatch
const inspection = { ok:true, status:'detached', sessionId:'case-one', projectRevision:0, applicationRevision:0, recoveryStatus:{status:'not-applicable'} }
const catalog = { list:()=>[{id:'builtin:case-preset:jewel-case-essentials',revision:2,name:'Jewel Case Essentials',surface:'case-insert',source:'builtin'}] }
const review = {operation:'apply',source:{sessionId:'case-one',projectRevision:0,applicationRevision:0},selectedPreset:{id:'builtin:case-preset:jewel-case-essentials',revision:2},reviewIdentity:'review:case-one',warningIds:[],materialConsentRequirementIds:[],plan:{resolvedRegions:['front-cover'],blockers:[],fieldActions:[],objectCreationActions:[],artworkViewportActions:[],preservationDecisions:[],skips:[],assignments:[]}}
function Owner() {
  const status = useStatusToasts()
  const [home, setHomeStatusMessage] = useState('')
  const [controller] = useState(() => createCaseInsertPresetPresentationController({
    catalog,
    workflow: {
      inspectCurrent:()=>inspection,
      beginApply:()=>({ok:true,status:'review-required',review}),
      async complete() {
        const result = outcome === 'failure'
          ? {status:'failure',error:{code:'case.layoutPreset.apply.failed',userMessage:'Preset failed.',recoverable:true}}
          : {status:'success',value:{},feedback:{kind:'success',message:'Case layout preset applied.',deduplicationKey:'case.layoutPreset.apply:case-one:'+ ++revision}}
        lastDispatch = {disposition:'executed',commandId:'case.layoutPreset.apply',result}
        return outcome === 'failure'
          ? {ok:false,status:'dispatch-failed',operation:'apply',code:'case.layoutPreset.apply.failed',dispatch:lastDispatch}
          : {ok:true,status:'dispatched',operation:'apply',dispatch:lastDispatch}
      },
    },
    publishDispatchFeedback: dispatch => publishApplicationCommandFeedback(dispatch, {announceStatus:status.announceStatus,setHomeStatusMessage}),
  }))
  api = {status,home,controller,setHomeStatusMessage}
  return createElement('div',null,
    createElement(CaseInsertLayoutPresetsPanel,{controller}),
    createElement('p',{id:'persistent-project'},status.projectStatus),
    createElement('p',{id:'persistent-home'},home),
    createElement(PreviewToastStack,{statusToasts:status.statusToasts}))
}
await act(async()=>createRoot(document.getElementById('root')).render(createElement(StrictMode,null,createElement(Owner))))
document.querySelector('details').open = true
window.toastHarness = {
  async apply(nextOutcome='success') {
    outcome=nextOutcome
    if(!api.controller.getSnapshot().review) {
      await act(async()=>api.controller.selectOption(api.controller.getSnapshot().options[0].value))
      await act(async()=>api.controller.beginApplyReview())
    }
    await act(async()=>nextOutcome==='cancelled'?api.controller.cancelReview():api.controller.confirmReview())
  },
  async duplicate() { await act(async()=>publishApplicationCommandFeedback(lastDispatch,{announceStatus:api.status.announceStatus,setHomeStatusMessage:api.setHomeStatusMessage})) },
  async expire() { await act(async()=>{for(const callback of timers.splice(0))callback()}) },
  snapshot() {return {project:api.status.projectStatus,home:api.home,toasts:api.status.statusToasts,notice:api.controller.getSnapshot().notice,selected:api.controller.getSnapshot().selectedOptionValue,focus:document.activeElement.id,focusRole:document.activeElement.getAttribute('role')}},
}
</script>`
let server, browser, page, url
const pageErrors = []

test.before(async () => {
  server = await createServer({
    cacheDir: 'node_modules/.vite-case-preset-toast-main-feedback',
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{
      name: 'case-preset-toast-feedback-fixture',
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url !== route) return next()
          try {
            res.setHeader('Content-Type', 'text/html')
            res.end(await vite.transformIndexHtml(route, html))
          } catch (error) { next(error) }
        })
      },
    }],
  })
  await server.listen()
  url = 'http://127.0.0.1:' + server.httpServer.address().port + route
  browser = await chromium.launch({ headless: true })
})

test.beforeEach(async () => {
  pageErrors.length = 0
  page = await browser.newPage()
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(url)
  await page.waitForFunction(() => Boolean(window.toastHarness), null, { timeout: 10000 })
})
test.afterEach(async () => {
  await page?.close()
  assert.deepEqual(pageErrors, [])
})
test.after(async () => { await browser?.close(); await server?.close() })
const call = (method, ...args) => page.evaluate(
  ([method, args]) => window.toastHarness[method](...args), [method, args],
)

test('Apply success is one accessible expiring toast with no persistent success text', async () => {
  await call('apply')
  const state = await call('snapshot')
  assert.equal(state.toasts.length, 1)
  assert.equal(state.toasts[0].message, 'Case layout preset applied.')
  assert.equal(state.project, '')
  assert.equal(state.home, '')
  assert.equal(state.notice, null)
  assert.equal(state.selected, '')
  assert.equal(state.focus, 'case-layout-preset-selector')
  assert.equal(await page.locator('.preview-toast-stack').getAttribute('aria-live'), 'polite')
  assert.equal(await page.locator('.case-layout-preset-result').count(), 0)
  await call('duplicate')
  assert.equal((await call('snapshot')).toasts.length, 1)
  await call('expire')
  assert.equal((await call('snapshot')).toasts.length, 0)
  assert.equal(await page.locator('body').innerText().then(text => text.includes('preset applied.')), false)
})

test('failed Apply stays actionable and successful retry clears superseded failure text', async () => {
  await call('apply', 'failure')
  const failed = await call('snapshot')
  assert.equal(failed.project, 'Preset failed.')
  assert.equal(failed.home, 'Preset failed.')
  assert.equal(failed.notice.kind, 'error')
  assert.equal(failed.focusRole, 'alert')
  assert.equal(await page.locator('.case-layout-preset-error[role="alert"]').count(), 1)
  await call('expire')
  assert.equal((await call('snapshot')).project, 'Preset failed.')
  await call('apply')
  const succeeded = await call('snapshot')
  assert.equal(succeeded.project, '')
  assert.equal(succeeded.home, '')
  assert.equal(succeeded.notice, null)
  assert.equal(succeeded.toasts.length, 1)
  assert.equal(succeeded.focus, 'case-layout-preset-selector')
  await call('expire')
  assert.equal((await call('snapshot')).toasts.length, 0)
  await call('apply')
  assert.equal((await call('snapshot')).toasts.length, 1)
})

test('cancellation retains its accessible local status without inventing success', async () => {
  await call('apply', 'cancelled')
  const state = await call('snapshot')
  assert.equal(state.toasts.length, 0)
  assert.equal(state.notice.message, 'Case layout preset review cancelled. No project changes were made.')
  assert.equal(state.focus, 'case-layout-preset-selector')
  assert.equal(await page.locator('.case-layout-preset-result').getAttribute('role'), 'status')
})
