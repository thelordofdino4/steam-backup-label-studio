import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { bmp, decodeGeneratedDiscPackageWrite } from './disc-background-ab-regressions.mjs'
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

test('candidate workflow remains standard CI; comparison guard cannot run on main or other branches', () => {
  const testRunner=readFileSync(new URL('../run-tests.mjs',import.meta.url),'utf8')
  assert.match(testRunner,/GITHUB_EVENT_NAME === 'pull_request'/)
  assert.match(testRunner,/GITHUB_REPOSITORY === 'thelordofdino4\/steam-backup-label-studio'/)
  assert.match(testRunner,/GITHUB_HEAD_REF === 'agent\/365-background-ab-ci-20261123'/)
  assert.match(testRunner,/GITHUB_BASE_REF === 'main'/)
  assert.match(testRunner,/!failed && mode === '--node-only'/)
})
