import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const before = '7c8c0debd00b11027c954f36b697665e3e2e1318'
const product = 'ddc885d103fa37a7052b91d6e9917914bc7c63ce'
const branch = 'agent/365-background-ab-ci-20261123'
const repo = 'thelordofdino4/steam-backup-label-studio'
const laneRunner = resolve(root, 'scripts/performance/disc-background-ab-lane.mjs')
const git = (...args) => execFileSync('git', ['-C', root, ...args], {encoding:'utf8', maxBuffer:1048576}).trim()
const setupOnly = process.argv[2] === '--verify-source-only'
const canvasOnly = process.argv[2] === '--canvas-only'
assert.equal(process.argv.length, setupOnly || canvasOnly ? 3 : 2)
const approvedCI = process.env.GITHUB_ACTIONS==='true' &&
  process.env.GITHUB_EVENT_NAME==='pull_request' && process.env.GITHUB_REPOSITORY===repo &&
  process.env.GITHUB_BASE_REF==='main' && process.env.GITHUB_HEAD_REF===branch
assert.ok(approvedCI || setupOnly, 'Only the approved PR Actions lane can launch Chromium.')
const expected = {
  src:'ab6904519e6d9f3498f64fdbb618cb76a081589b',
  public:'8bbb5ee6c07004e372ddd3fd49ee75964c2c9e75',
  'src-tauri':'0dc807402c10cf87ab2fbb5970832b761b03dce7',
  'package.json':'2002b4944f6ed1c4afdbeaba539021c1b94ba9ff',
  'package-lock.json':'e4adaccfac1c115ef78511829672dfdc2228ce1e',
  'vite.config.ts':'593bbb30e1439c082365b9c2c2cf8cbe0bdcfa59',
}
for (const [path, sha] of Object.entries(expected)) {
  assert.equal(git('rev-parse', 'HEAD:'+path), sha, 'Unexpected candidate tree: '+path)
}
try {
  git('cat-file','-e',before+'^{commit}')
} catch {
  assert.ok(approvedCI && !setupOnly, 'Exact before object required locally; no local network fetch.')
  assert.match(git('remote','get-url','origin'),
    /^https:\/\/github\.com\/thelordofdino4\/steam-backup-label-studio(?:\.git)?$/)
  execFileSync('git',['-C',root,'fetch','--quiet','--no-tags','--depth=1','origin',before],{stdio:'inherit'})
}
assert.equal(git('rev-parse',before+'^{commit}'),before)
assert.equal(git('rev-parse',before+':package-lock.json'), expected['package-lock.json'])
const temp = mkdtempSync(resolve(tmpdir(),'sbls365-ab-'))
function extract(revision, side) {
  const destination = resolve(temp,side)
  const tar = resolve(temp,side+'.tar')
  mkdirSync(destination)
  // Materialize only service-independent code checked into the exact revisions.
  execFileSync('git',['-C',root,'archive','--format=tar','-o',tar,revision])
  execFileSync('tar',['-xf',tar,'-C',destination])
  rmSync(tar)
  symlinkSync(resolve(root,'node_modules'),resolve(destination,'node_modules'),'dir')
  return destination
}
try {
  const roots = {before:extract(before,'before'),after:extract('HEAD','after')}
  const sequence = canvasOnly ? [['after','canvas']] : setupOnly ? [['before','A'],['after','A'],['after','canvas']] :
    [['after','regressions'],['before','A'],['after','A'],['after','B'],['before','B']]
  if (!setupOnly) console.log('SBLS365_AB_PLAN '+JSON.stringify({before,product,worktree:git('rev-parse','HEAD'),schedule:sequence,browser:'148.0.7778.96',sizeOrder:['small','normal','large']}))
  for (const [lane,batch] of sequence) {
    const result = spawnSync(process.execPath,[laneRunner,roots[lane],lane,batch,roots.before,...(setupOnly?['--verify-source-only']:[])],{stdio:'inherit'})
    assert.equal(result.status,0,`AB session failed: ${lane}/${batch}`)
  }
  console.log('SBLS365_AB_COMPLETE '+JSON.stringify({before,product,scenario:canvasOnly?'mounted-trusted-background-canvas-only':setupOnly?'offline source/fixture qualification only':'mounted-regressions-and-balanced-measurement',timed:!setupOnly&&!canvasOnly}))
} finally {
  rmSync(temp,{recursive:true,force:true})
}
