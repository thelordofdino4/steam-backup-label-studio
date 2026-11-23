import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash, webcrypto } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import { readFileSync } from 'node:fs'
import { bmp, CLASSIC_IMPORT_FIXTURES, decodeGeneratedDiscPackageWrite, openDiscProjectFile, validateGeneratedClassicImport } from './disc-background-ab-regressions.mjs'
import { validateImportedImageDataUrl } from '../../src/tauri/importedImageValidation.ts'
import { createProjectPackageCapturePlan } from '../../src/package/projectPackageCapturePlan.ts'
import { createBlankDiscSavedProject } from '../../src/project/blankDiscProject.ts'
import { createProjectPackageWriteRequest } from '../../src/tauri/projectPackageWrite.ts'

test('generated portrait BMP input and renderer raw-Save fixture hydrate exact background bytes', () => {
  const data = bmp(48,144,[210,100,35])
  assert.equal(data.toString('ascii',0,2),'BM')
  assert.equal(data.readInt32LE(18),48)
  assert.equal(data.readInt32LE(22),144)
  assert.equal(data.readUInt32LE(2),data.length)
  const imageDataUrl='data:image/bmp;base64,'+data.toString('base64')
  const project=createBlankDiscSavedProject()
  project.background={...project.background, enabled:false, imageDataUrl, scale:0.32, offset:{x:0.1,y:0},
    imageSize:{width:48,height:144},imageSource:{source:'uploaded',sourceLabel:'generated',sourceId:null}}
  const plan=createProjectPackageCapturePlan(project)
  const wire=createProjectPackageWriteRequest(project,plan)
  assert.deepEqual(decodeGeneratedDiscPackageWrite(wire).background,project.background)
  assert.throws(()=>decodeGeneratedDiscPackageWrite(wire.subarray(0,wire.length-1)))
})

const fixtureUrl=(spec,color=spec.color)=>
  'data:image/bmp;base64,'+bmp(spec.width,spec.height,color).toString('base64')
const bytes = value => new TextEncoder().encode(value)

test('serialized fixture gate accepts only the exact two raw requests through the real renderer validation port', async () => {
  const isolated = runInNewContext(`(${validateGeneratedClassicImport})`, {
    Uint8Array, DataView, TextDecoder, atob, crypto:webcrypto,
  })
  for (const fixture of CLASSIC_IMPORT_FIXTURES) {
    const input=fixtureUrl(fixture)
    const raw=bytes(input)
    assert.equal(raw.byteLength,fixture.bytes)
    assert.equal(createHash('sha256').update(raw).digest('hex'),fixture.sha256)
    const accepted=await validateImportedImageDataUrl(input,async (command,body)=>{
      assert.equal(command,'validate_imported_image_asset')
      assert.deepEqual(body,raw)
      const receipt=await isolated(body,[fixture])
      assert.equal(receipt.key,fixture.key)
      assert.equal(receipt.sha256,fixture.sha256)
      assert.equal(receipt.response.width,fixture.width)
      assert.equal(receipt.response.height,fixture.height)
      return receipt.response
    })
    assert.equal(accepted,input)
  }
})

test('fixture validation rejects unknown bytes, the wrong transport or dimensions, and unarmed imports', async () => {
  const [landscape,portrait]=CLASSIC_IMPORT_FIXTURES
  const exact=bytes(fixtureUrl(landscape))
  await assert.rejects(validateGeneratedClassicImport(exact,[]),/Unexpected generated import body/)
  await assert.rejects(validateGeneratedClassicImport(exact,[portrait]),/Unexpected generated import body/)
  await assert.rejects(validateGeneratedClassicImport(exact.buffer,[landscape]),/Unexpected generated import body/)
  await assert.rejects(validateGeneratedClassicImport(
    bytes(fixtureUrl(landscape,[40,170,212])),[landscape]),/Unrecognized generated import digest/)
  await assert.rejects(validateGeneratedClassicImport(exact,[{...landscape,width:95}]),/BMP profile or dimensions/)
})

test('the default-closed real Project File markup reveals its scoped Save and Load in order', async () => {
  const project = readFileSync(new URL('../../src/components/sidebar/ProjectPanel.tsx',import.meta.url),'utf8')
  const panelSource = readFileSync(new URL('../../src/components/editor/EditorPanel.tsx',import.meta.url),'utf8')
  const app = readFileSync(new URL('../../src/app/App.tsx',import.meta.url),'utf8')
  const [,title] = /<EditorPanel title="([^"]+)">/.exec(project)
  const names = [...project.matchAll(/<button[^>]*>\s*([^<]+?)\s*<\/button>/g)].map(match=>match[1].trim())
  const [saveName,loadName] = names.filter(name=>name==='Save Project'||name==='Load Project')
  assert.equal(title,'Project File')
  assert.deepEqual([saveName,loadName],['Save Project','Load Project'])
  assert.match(panelSource,/<details[\s\S]*?open=\{open\}[\s\S]*?<summary[\s\S]*?className="panel-summary-title"/)
  assert.match(app,/<aside className="sidebar">[\s\S]*?<ProjectPanel/)
  const openFrom = async initialOpen => {
    const calls=[]
    const details={open:initialOpen}
    const panel={
      count:async()=>1,
      getByRole:(role,opts)=>{
        assert.equal(role,'button')
        assert.equal(opts.exact,true)
        assert.equal(details.open,true,'ARIA child lookup happened before opening the panel')
        assert.ok([saveName,loadName].includes(opts.name))
        calls.push('scope '+opts.name)
        return {
          waitFor:async({state})=>{assert.equal(state,'visible');assert.equal(details.open,true)},
          count:async()=>details.open?1:0,
          click:async()=>{assert.equal(details.open,true);calls.push('click '+opts.name)},
        }
      },
    }
    const summary={
      count:async()=>1,
      waitFor:async({state})=>assert.equal(state,'visible'),
      evaluate:async(fn)=>fn({parentElement:details}),
      click:async()=>{assert.equal(details.open,false);calls.push('open summary');details.open=true},
      locator:selector=>{assert.equal(selector,'xpath=..');return panel},
    }
    const page={locator:selector=>{
      assert.equal(selector,`aside.sidebar > details > summary:has(> .panel-summary-title:text-is("${title}"))`)
      return summary
    }}
    const {save,load,openedByHarness}=await openDiscProjectFile(page)
    assert.equal(openedByHarness,!initialOpen)
    await save.click()
    await load.click()
    assert.deepEqual(calls,[...(initialOpen?[]:['open summary']),
      'scope Save Project','scope Load Project','click Save Project','click Load Project'])
  }
  await openFrom(false)
  await openFrom(true)
})

test('candidate workflow remains standard CI; comparison guard cannot run on main or other branches', () => {
  const testRunner=readFileSync(new URL('../run-tests.mjs',import.meta.url),'utf8')
  assert.match(testRunner,/GITHUB_EVENT_NAME === 'pull_request'/)
  assert.match(testRunner,/GITHUB_REPOSITORY === 'thelordofdino4\/steam-backup-label-studio'/)
  assert.match(testRunner,/GITHUB_HEAD_REF === 'agent\/365-background-ab-ci-20261123'/)
  assert.match(testRunner,/GITHUB_BASE_REF === 'main'/)
  assert.match(testRunner,/!failed && mode === '--node-only'/)
})
