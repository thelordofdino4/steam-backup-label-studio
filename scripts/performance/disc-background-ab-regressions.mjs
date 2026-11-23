import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

const digest = value => createHash('sha256').update(value).digest('hex')
const control = '#local-file-background-scale'
const readView = page => page.evaluate(() => globalThis.__sbls365.readRegression())
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
function near(actual, expected) { assert.ok(Math.abs(actual-expected)<1e-8,`expected ${expected}; got ${actual}`) }
export function bmp(width, height, color) {
  const stride = (width * 3 + 3) & ~3
  const data = Buffer.alloc(54 + stride * height)
  data.write('BM')
  data.writeUInt32LE(data.length, 2)
  data.writeUInt32LE(54, 10)
  data.writeUInt32LE(40, 14)
  data.writeInt32LE(width, 18)
  data.writeInt32LE(height, 22)
  data.writeUInt16LE(1, 26)
  data.writeUInt16LE(24, 28)
  data.writeUInt32LE(stride * height, 34)
  for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
    const at = 54 + y * stride + x * 3
    data.set(color, at)
  }
  return data
}

// Exact public, generated regression inputs; none are benchmark fixture changes.
export const CLASSIC_IMPORT_FIXTURES = Object.freeze([
  Object.freeze({ key:'landscape', width:96, height:48, color:[40,170,213], bytes:18526,
    sha256:'f757a46f682a3a541539eee5cae2a8e8bb4bacf5fa7b29790fdcd284cd6f361b' }),
  Object.freeze({ key:'portrait', width:48, height:144, color:[210,100,35], bytes:27742,
    sha256:'f33cc91caf071d846763654e89aec97181bac157a5f70cd7cf259b5c9dd9ad53' }),
])

// Serialized into the isolated renderer alongside the existing native fake.
// Return only the documented shape for two pinned, raw generated bodies.
export async function validateGeneratedClassicImport(body, fixtures) {
  const candidates = body instanceof Uint8Array
    ? fixtures.filter(x => x.bytes === body.byteLength) : []
  if (!candidates.length) throw Error('Unexpected generated import body')
  const hash = await crypto.subtle.digest('SHA-256', body)
  const sha256 = [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('')
  const pinned = candidates.find(x=>x.sha256===sha256)
  if (!pinned) throw Error('Unrecognized generated import digest')
  const dataUrl = new TextDecoder('utf-8',{fatal:true}).decode(body)
  const prefix = 'data:image/bmp;base64,'
  if (!dataUrl.startsWith(prefix)) throw Error('Unexpected generated import MIME')
  const bmpBytes = Uint8Array.from(atob(dataUrl.slice(prefix.length)), c=>c.charCodeAt(0))
  const v = new DataView(bmpBytes.buffer)
  if (bmpBytes.byteLength < 54 || v.getUint16(0,false)!==0x424d ||
      v.getUint32(2,true)!==bmpBytes.byteLength || v.getUint32(10,true)!==54 ||
      v.getUint32(14,true)!==40 || v.getInt32(18,true)!==pinned.width ||
      v.getInt32(22,true)!==pinned.height || pinned.width<=0 || pinned.height<=0 ||
      v.getUint16(26,true)!==1 || v.getUint16(28,true)!==24 || v.getUint32(30,true)!==0) {
    throw Error('Unexpected generated BMP profile or dimensions')
  }
  return { key:pinned.key, sha256,
    response:{status:'success',mimeType:'image/bmp',width:pinned.width,height:pinned.height} }
}

export function decodeGeneratedDiscPackageWrite(args) {
  const decoder=new TextDecoder('utf-8',{fatal:true})
  const bytes=args instanceof ArrayBuffer?new Uint8Array(args):args
  if (!(bytes instanceof Uint8Array)) throw Error('Expected typed raw package body')
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  if (decoder.decode(bytes.subarray(0,8))!=='SBLSPSV2') throw Error('Package framing magic changed')
  const planLength=dv.getUint32(8), projectLength=dv.getUint32(12), poolCount=dv.getUint32(16)
  const plan=JSON.parse(decoder.decode(bytes.subarray(20,20+planLength)))
  let off=20+planLength
  const project=JSON.parse(decoder.decode(bytes.subarray(off,off+projectLength)))
  off+=projectLength
  if (plan.version!==2||project.projectType!=='disc'||poolCount>8) throw Error('Unexpected fixture package shape')
  const pool=[]
  for(let i=0;i<poolCount;i++){
    const n=dv.getUint32(off)
    off+=4
    pool.push(decoder.decode(bytes.subarray(off,off+n)))
    off+=n
  }
  if(off!==bytes.length) throw Error('Unconsumed fixture package bytes')
  const bindings={'disc.background':[project.background,'imageDataUrl'],
    'disc.title.current':[project.titleArtwork,'imageDataUrl'],
    'disc.title.default':[project.titleArtwork?.defaultSteamLogo,'imageDataUrl']}
  const bound=new Set()
  for(const x of plan.captures) {
    if(x.decision.kind!=='project-owned-data-url-part')continue
    const [container,k]=bindings[x.ownerId]??[]
    const value=pool[x.decision.dataUrlIndex]
    if(!container||container[k]!==null||typeof value!=='string'||bound.has(x.ownerId))throw Error('Unexpected generated fixture binding')
    bound.add(x.ownerId)
    container[k]=value
  }
  if(!bound.has('disc.background'))throw Error('Saved Background is not a project-owned portable part')
  return project
}

async function revealDetails(page, locator) {
  assert.equal(await locator.count(), 1)
  const ancestors = await locator.evaluate(el=>{
    let count=0
    for(let node=el.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS')count++
    return count
  })
  for(let i=ancestors;i>0;i--){
    const summary=locator.locator(`xpath=ancestor::details[${i}]/summary`)
    assert.equal(await summary.count(),1)
    if(!(await summary.evaluate(x=>x.parentElement.open)))await summary.click()
  }
  await locator.waitFor({state:'visible'})
}

// Qualify the always-visible summary first. A role locator for a hidden
// descendant cannot identify the default-closed disclosure.
export async function openDiscProjectFile(page) {
  const summary = page.locator('aside.sidebar > details > summary:has(> .panel-summary-title:text-is("Project File"))')
  assert.equal(await summary.count(),1,'project-file: expected one direct Project File summary')
  await summary.waitFor({state:'visible',timeout:5000})
  const detailsOpen = () => summary.evaluate(node => node.parentElement.open)
  const openedByHarness = !(await detailsOpen())
  if (openedByHarness) await summary.click()
  const panel = summary.locator('xpath=..')
  assert.equal(await panel.count(),1,'project-file: expected exact summary disclosures parent')
  const save = panel.getByRole('button',{name:'Save Project',exact:true})
  const load = panel.getByRole('button',{name:'Load Project',exact:true})
  await save.waitFor({state:'visible',timeout:5000})
  await load.waitFor({state:'visible',timeout:5000})
  assert.equal(await detailsOpen(),true,'project-file: direct disclosure did not open')
  assert.equal(await save.count(),1,'project-file: expected one visible scoped Save Project')
  assert.equal(await load.count(),1,'project-file: expected one visible scoped Load Project')
  return {save,load,openedByHarness}
}

const stage = (name, extra={}) =>
  console.log('SBLS365_AB_REGRESSION_STAGE '+JSON.stringify({stage:name,...extra}))

async function sliderProof(page, context) {
  console.log('SBLS365_AB_REGRESSION_STAGE '+JSON.stringify({stage:'trusted-range'}))
  const range = page.locator(control)
  await range.scrollIntoViewIfNeeded()
  const bounds = await range.boundingBox()
  assert.ok(bounds?.width>20 && bounds.height>0)
  const point = ratio => ({x:Math.round(bounds.x+bounds.width*ratio),y:Math.round(bounds.y+bounds.height/2),id:1,radiusX:1,radiusY:1})
  const client = await context.newCDPSession(page)
  const original = await readView(page)
  const touch = (type,points) => client.send('Input.dispatchTouchEvent',{type,touchPoints:points})
  try {
    await touch('touchStart',[point(.42)])
    await touch('touchMove',[point(.72)])
    await page.waitForFunction(({control,original})=>Number(document.querySelector(control).value)!==original,{control,original:original.scale},{timeout:5000})
    const active=await readView(page)
    assert.equal(active.rev,original.rev,'held input must not publish')
    assert.equal(active.scale,original.scale)
    assert.notEqual(active.previewTransform,original.previewTransform,'held edit must actually move preview')
    await touch('touchCancel',[])
    await page.waitForFunction(old=>globalThis.__sbls365.readRegression().previewTransform===old,original.previewTransform,{timeout:5000})
    const afterCancel=await readView(page)
    assert.equal(afterCancel.rev,original.rev)
    assert.equal(afterCancel.scale,original.scale)
    assert.ok(afterCancel.pointer.some(x=>x.type==='pointercancel'&&x.trusted),'cancel must pass the real pointer ingress')
    // Mouse-path completion distinguishes a range gesture from a scalar key press.
    const movedX=point(.67).x
    const y=point(.67).y
    await page.mouse.move(point(.38).x,y)
    await page.mouse.down()
    await page.mouse.move(movedX,y,{steps:4})
    await page.waitForFunction(({control,original})=>Number(document.querySelector(control).value)!==original,{control,original:original.scale},{timeout:5000})
    assert.equal((await readView(page)).rev,original.rev)
    await page.mouse.up()
    await page.waitForFunction(r=>globalThis.__sbls365.readRegression().rev===r,original.rev+1,{timeout:5000})
    await settle(page)
    const done=await readView(page)
    assert.equal(done.rev,original.rev+1)
    assert.notEqual(done.scale,original.scale)
    assert.ok(done.pointer.some(x=>x.type==='pointerup'&&x.trusted),'finish must pass the real pointer ingress')
    return {cancelledRevisionDelta:0,completedRevisionDelta:1,heldPreviewChanged:true,trusted:true}
  } finally { await client.detach() }
}

async function presetAndStorageProof(page) {
  const select = page.locator('[data-smoke-id="disc-layout-preset-select"]')
  const apply = page.locator('[data-smoke-id="disc-layout-preset-apply"]')
  await revealDetails(page,select)
  await select.selectOption('classic-top-title')
  console.log('SBLS365_AB_REGRESSION_STAGE '+JSON.stringify({stage:'stale-sibling-oracle'}))
  const beforeStale=await readView(page)
  await page.evaluate(()=>globalThis.__sbls365.armStaleSibling())
  await apply.click()
  await page.waitForFunction(()=>globalThis.__sbls365.readRegression().interruptions===1,null,{timeout:5000})
  await settle(page)
  const afterStale=await readView(page)
  assert.equal(afterStale.rev,beforeStale.rev+1,'only deliberate newer sibling may publish')
  assert.equal(afterStale.scale,beforeStale.scale,'stale Background preset must not publish')
  assert.deepEqual(afterStale.sibling, afterStale.expectedSibling,'stale rollback destroyed newer accepted sibling')
  await apply.click()
  await page.waitForFunction(r=>globalThis.__sbls365.readRegression().rev>r,afterStale.rev,{timeout:5000})
  await settle(page)
  assert.equal((await readView(page)).rev,afterStale.rev+1,'Classic applies once with its sibling projection')

  console.log('SBLS365_AB_REGRESSION_STAGE '+JSON.stringify({stage:'classic-import-manual-persistence'}))
  const upload=page.locator('#background-upload')
  const adopter=async ({key,width,height,color,sha256}) => {
    const old=await readView(page)
    const data=bmp(width,height,color)
    const dataUrl='data:image/bmp;base64,'+data.toString('base64')
    assert.equal(digest(dataUrl),sha256,'Generated import input drifted')
    const safeReceipt=(stage, extra={})=>console.log('SBLS365_AB_IMPORT '+JSON.stringify({
      stage,fixture:key,sha256,width,height,...extra,
    }))
    const validationBefore=(await page.evaluate(()=>globalThis.__sbls365.importReceipts())).length
    safeReceipt('started')
    await upload.setInputFiles({name:`benchmark-generated-${key}.bmp`,mimeType:'image/bmp',buffer:data})
    try {
      await page.waitForFunction(({width,height,rev})=>{
        const v=globalThis.__sbls365.readRegression()
        return v.width===width&&v.height===height&&v.rev>rev
      },{width,height,rev:old.rev},{timeout:7000})
    } catch (error) {
      const observed=await readView(page)
      safeReceipt('adoption-unqualified',{
        observedWidth:observed.width??null, observedHeight:observed.height??null,
        revisionDelta:observed.rev-old.rev,
        validations:(await page.evaluate(()=>globalThis.__sbls365.importReceipts())).slice(validationBefore),
      })
      throw error
    }
    await settle(page)
    const now=await readView(page)
    const validations=(await page.evaluate(()=>globalThis.__sbls365.importReceipts())).slice(validationBefore)
    assert.deepEqual(validations,[{status:'fixture-accepted',fixture:key,sha256,width,height}])
    assert.equal(now.rev,old.rev+1)
    assert.equal(now.source,'uploaded')
    assert.deepEqual(now.offset,{x:0,y:0})
    near(now.scale,0.92/Math.max(width/height,height/width))
    assert.equal(await page.evaluate(hash=>globalThis.__sbls365.checkAssetHash(hash),sha256),true)
    safeReceipt('adopted',{revisionDelta:1})
    return sha256
  }
  await adopter(CLASSIC_IMPORT_FIXTURES[0])
  const assetHash=await adopter(CLASSIC_IMPORT_FIXTURES[1])
  const scale=page.locator(control+'-number')
  const beforeManual=await readView(page)
  await scale.press('ArrowUp')
  await scale.press('Enter')
  await page.waitForFunction(r=>globalThis.__sbls365.readRegression().rev===r,beforeManual.rev+1,{timeout:5000})
  const x=page.locator('#local-file-background-offset-x-number')
  await x.press('ArrowUp')
  await x.press('Enter')
  await page.waitForFunction(r=>globalThis.__sbls365.readRegression().rev===r,beforeManual.rev+2,{timeout:5000})
  const manual=await readView(page)
  assert.notEqual(manual.scale,beforeManual.scale)
  assert.notEqual(manual.offset.x,beforeManual.offset.x)
  await settle(page)
  const stable=await readView(page)
  assert.equal(stable.scale,manual.scale,'manual placement was reapplied away')
  assert.deepEqual(stable.offset,manual.offset)
  stage('classic-manual-placement-checked',{revisionDelta:manual.rev-beforeManual.rev})
  stage('project-file-reveal-started')
  const {save,load,openedByHarness}=await openDiscProjectFile(page)
  stage('project-file-revealed',{openedByHarness})
  stage('classic-save-started')
  await save.click()
  await page.waitForFunction(()=>globalThis.__sbls365.readRegression().saved,true,{timeout:5000})
  const saved=await readView(page)
  assert.equal(saved.savedScale,manual.scale,'classic-save: emitted scale does not match committed placement')
  assert.deepEqual(saved.savedOffset,manual.offset,'classic-save: emitted offset does not match committed placement')
  assert.equal(await page.evaluate(hash=>globalThis.__sbls365.checkAssetHash(hash,true),assetHash),true,
    'classic-save: emitted asset does not match the pinned fixture')
  await page.waitForFunction(()=>globalThis.__sbls365.readRegression().clean,true,{timeout:5000})
  stage('classic-save-frame-checked')
  await page.evaluate(()=>globalThis.__sbls365.reopenSaved())
  stage('classic-reopen-started')
  await load.click()
  await page.waitForFunction(id=>{const v=globalThis.__sbls365.readRegression();return v.id!==id&&v.rev===0},manual.id,{timeout:7000})
  const reopened=await readView(page)
  assert.equal(reopened.scale,manual.scale,'classic-reopen: scale drift')
  assert.deepEqual(reopened.offset,manual.offset,'classic-reopen: offset drift')
  assert.equal(reopened.source,'uploaded','classic-reopen: source drift')
  assert.equal(await page.evaluate(hash=>globalThis.__sbls365.checkAssetHash(hash),assetHash),true,
    'classic-reopen: imported bytes drift')
  assert.equal(reopened.clean,true,'classic-reopen: session did not establish a clean baseline')
  stage('classic-reopen-checked',{revision:reopened.rev})
  return {stalePresetRejected:true,newerSiblingPreserved:true,classicImports:2,centeredMaximalContain:true,manualTwoEditsPreserved:true,saveFrameChecked:true,reopened:true}
}

export async function runMountedRegressions(page, context) {
  const slider=await sliderProof(page,context)
  console.log('SBLS365_AB_REGRESSION '+JSON.stringify({case:'slider',...slider}))
  const storage=await presetAndStorageProof(page)
  console.log('SBLS365_AB_REGRESSION '+JSON.stringify({case:'classic-and-stale',...storage}))
}
