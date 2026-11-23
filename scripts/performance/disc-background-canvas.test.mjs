import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {BACKGROUND_CANVAS,qualifyCanvasPointerSequence} from './disc-background-canvas.mjs'

const events=terminal=>['pointerdown','gotpointercapture','pointermove',terminal,'lostpointercapture']
  .map(type=>({type,trusted:true,pointerType:'touch',eventId:5}))

test('accepts one trusted captured same-pointer gesture reaching either real terminal',()=>{
  for(const kind of ['pointercancel','pointerup']) assert.equal(qualifyCanvasPointerSequence(events(kind),kind).at(-2),kind)
})

test('rejects synthetic, mixed-pointer, uncaptured, wrong-terminal and non-release receipts',()=>{
  const tamper=[
    x=>{x[2].trusted=false},x=>{x[2].eventId++},x=>{x[2].pointerType='mouse'},
    x=>{x.splice(1,1)},x=>{x[3].type='pointerup'},x=>{x.pop()},x=>{x.splice(4,0,x[3])},
  ]
  for(const f of tamper){const x=events('pointercancel');f(x);assert.throws(()=>qualifyCanvasPointerSequence(x,'pointercancel'))}
})

test('canvas proof targets the mounted BackgroundLayer and not the sidebar range',()=>{
  const read=p=>readFileSync(new URL('../../src/'+p,import.meta.url),'utf8')
  const layer=read('components/preview/BackgroundLayer.tsx')
  const drag=read('interaction/useDiscPreviewPointerDrag.ts')
  assert.equal(BACKGROUND_CANVAS,'.background-image-layer[aria-label="Uploaded background image layer"]')
  assert.match(layer,/className="background-image-layer"[\s\S]*aria-label="Uploaded background image layer"/)
  assert.match(layer,/onPointerUp=\{handleBackgroundPointerUp\}[\s\S]*onPointerCancel=\{handleBackgroundPointerUp\}[\s\S]*onLostPointerCapture=\{handleBackgroundPointerUp\}/)
  assert.match(drag,/event\.type === 'pointerup'\) background\.finish\(key\)[\s\S]*else background\.cancel\(key\)/)
})
