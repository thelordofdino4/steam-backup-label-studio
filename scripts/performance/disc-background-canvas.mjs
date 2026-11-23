import assert from 'node:assert/strict'

export const BACKGROUND_CANVAS = '.background-image-layer[aria-label="Uploaded background image layer"]'

/** Runs in the isolated page, observes only the generated Disc, and never sends input. */
export function armCanvasPointerObservation() {
  const selector='.background-image-layer[aria-label="Uploaded background image layer"]'
  let events=null
  for (const type of ['pointerdown','gotpointercapture','pointermove','pointerup','pointercancel','lostpointercapture']) {
    document.addEventListener(type,event=>{
      if(events && event.target instanceof Element && event.target.closest(selector)) {
        if(events.length>=64) throw Error('Canvas receipt buffer overflow')
        events.push({type,eventId:event.pointerId,trusted:event.isTrusted,pointerType:event.pointerType})
      }
    },{capture:true,passive:true})
  }
  globalThis.__sbls365Canvas={
    arm(){if(events)throw Error('Canvas observations already armed');events=[]},
    drain(){const read=events;events=null;return read},
    read(){
      const layer=document.querySelector(selector)
      const child=layer?.firstElementChild
      const surface=layer?.closest('.disc-preview')
      const t=child?getComputedStyle(child).transform:'none'
      const m=t!=='none'?new DOMMatrixReadOnly(t):null
      const id=events?.find(e=>e.type==='pointerdown')?.eventId
      const matrix=m?{x:m.m41,y:m.m42,sx:m.m11,sy:m.m22}:null
      const s=globalThis.__sbls365.readRegression()
      const visible=!!layer && !!surface && !!matrix && matrix.sx>0 && !!layer.querySelector('img')?.naturalWidth
      return {id:s.id,revision:s.rev,scale:s.scale,offset:s.offset,matrix,visible,
        ratio:surface?surface.getBoundingClientRect().width/surface.offsetWidth:null,
        captured:id!==undefined&&layer?.hasPointerCapture(id)}
    },
  }
}

export function qualifyCanvasPointerSequence(events, terminal) {
  assert.ok(Array.isArray(events) && events.length>0 && events.length<64)
  assert.ok(['pointercancel','pointerup'].includes(terminal))
  assert.ok(events.every(e=>e.trusted===true&&e.pointerType==='touch'&&e.eventId===events[0].eventId))
  const types=events.map(e=>e.type)
  assert.equal(types[0],'pointerdown')
  assert.equal(types.filter(x=>x==='pointerdown').length,1)
  assert.equal(types.filter(x=>x===terminal).length,1)
  assert.equal(types.includes(terminal==='pointercancel'?'pointerup':'pointercancel'),false)
  const move=types.indexOf('pointermove'), got=types.indexOf('gotpointercapture'), end=types.indexOf(terminal)
  assert.ok(got>0&&move>got&&end>move,'Require trusted pointerdown, capture, move, terminal in order')
  assert.equal(types.at(-1),'lostpointercapture','Require confirmed capture release after terminal')
  assert.equal(types.filter(x=>x==='gotpointercapture').length,1)
  assert.equal(types.filter(x=>x==='lostpointercapture').length,1)
  return types
}

const read=page=>page.evaluate(()=>globalThis.__sbls365Canvas.read())
const waitFrames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
const close=(a,b,label)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=1, label+': outside 1 CSS pixel')

export async function runTrustedBackgroundCanvas(page, context, qualify) {
  const layer=page.locator(BACKGROUND_CANVAS)
  assert.equal(await layer.count(),1)
  await layer.waitFor({state:'visible',timeout:5000})
  await page.waitForFunction(()=>globalThis.__sbls365Canvas.read().visible===true,null,{timeout:5000})
  await waitFrames(page)
  const before=await read(page)
  assert.equal(before.scale,1.5)
  assert.deepEqual(before.offset,{x:0,y:0})
  assert.ok(before.ratio>0)
  const client=await context.newCDPSession(page)
  const dx=26,dy=-17
  const touch=(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points})
  const gesture=async(kind)=>{
    // Choose from deterministic interior cells only after actual viewport hit-testing.
    const start=await layer.evaluate((node,{dx,dy})=>{
      const r=node.getBoundingClientRect()
      for (const fy of [.32,.42,.58,.68]) for (const fx of [.32,.44,.56,.68]) {
        const x=Math.round(r.left+r.width*fx),y=Math.round(r.top+r.height*fy)
        const hit=document.elementFromPoint(x,y)
        if(x+dx>0&&y+dy>0&&x+dx<innerWidth&&y+dy<innerHeight&&
          hit instanceof Element&&(hit===node||node.contains(hit))) return {x,y}
      }
      return null
    },{dx,dy})
    assert.ok(start,'Canvas interior hit test did not resolve BackgroundLayer')
    const point=(x,y)=>({x,y,id:1,radiusX:1,radiusY:1})
    await page.evaluate(()=>{globalThis.__sbls365Canvas.arm();globalThis.__sbls365.initTrial({phase:'canvas'},null)})
    await touch('touchStart',[point(start.x,start.y)])
    await touch('touchMove',[point(start.x+dx,start.y+dy)])
    await page.waitForFunction(old=>{
      const v=globalThis.__sbls365Canvas.read()
      return v.captured && v.matrix?.x!==old.x && v.matrix?.y!==old.y
    },before.matrix,{timeout:5000})
    await waitFrames(page)
    const held=await read(page)
    assert.equal(held.id,before.id)
    assert.equal(held.revision,before.revision)
    assert.deepEqual(held.offset,before.offset)
    assert.equal(held.scale,before.scale)
    assert.equal(held.ratio,before.ratio)
    assert.equal(held.captured,true)
    const expected={x:dx/before.ratio,y:dy/before.ratio}
    close(held.matrix.x-before.matrix.x,expected.x,'held x translation')
    close(held.matrix.y-before.matrix.y,expected.y,'held y translation')
    await touch(kind==='pointercancel'?'touchCancel':'touchEnd',[])
    await page.waitForFunction(({rev,restore,matrix})=>{
      const v=globalThis.__sbls365Canvas.read()
      return v.revision===rev && !v.captured && (!restore||(v.matrix?.x===matrix.x&&v.matrix?.y===matrix.y))
    },{rev:before.revision+(kind==='pointerup'?1:0),restore:kind==='pointercancel',matrix:before.matrix},{timeout:5000})
    await waitFrames(page)
    const end=await read(page)
    const data=await page.evaluate(()=>{
      const {commits,direct,captures}=globalThis.__sbls365.drain()
      return {events:globalThis.__sbls365Canvas.drain(),commits,direct,captures}
    })
    const order=qualify(data.events,kind)
    assert.equal(end.id,before.id)
    assert.equal(end.scale,before.scale)
    assert.equal(end.captured,false)
    if(kind==='pointercancel'){
      assert.equal(data.commits.length,0)
      assert.equal(data.direct.length,0)
      assert.deepEqual(end.offset,before.offset)
      assert.deepEqual(end.matrix,before.matrix)
    }else{
      assert.equal(data.commits.length,1)
      const c=data.commits[0]
      assert.equal(c.b.id,c.a.id)
      assert.equal(c.a.rev,c.b.rev+1)
      assert.equal(c.inDirect,true)
      assert.equal(c.inSync,false)
      assert.deepEqual(data.direct.map(r=>[r.kind,r.accepted]),[['transform',1]])
      close(end.offset.x-before.offset.x,expected.x,'accepted offset x')
      close(end.offset.y-before.offset.y,expected.y,'accepted offset y')
      close(end.matrix.x-before.matrix.x,expected.x,'retained translation x')
      close(end.matrix.y-before.matrix.y,expected.y,'retained translation y')
    }
    assert.equal(data.captures.length,0)
    return {order,heldTranslation:{x:held.matrix.x-before.matrix.x,y:held.matrix.y-before.matrix.y},
      revisionDelta:data.commits.length,committedOffset:end.offset,captureVerified:true}
  }
  try {
    return {route:'mounted-disc-background-layer',targetQualified:true,
      cancelled:await gesture('pointercancel'),completed:await gesture('pointerup')}
  } finally {await client.detach()}
}
