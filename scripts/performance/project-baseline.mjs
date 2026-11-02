import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir, cpus, totalmem } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { captureNormalizedProjectSnapshot, createCanonicalProjectComparisonValue } from '../../src/lifecycle/canonicalProject.ts'
import { validateNormalizedProjectSchema } from '../../src/project/projectSchema.ts'
import { createProjectPackageCapturePlan } from '../../src/package/projectPackageCapturePlan.ts'
import { createProjectPackageWriteRequest } from '../../src/tauri/projectPackageWrite.ts'
import { createPerformanceFixture, fixtureIds } from './fixtures.mjs'

const samples = 5
function measure(run, prepare = () => undefined) {
  const durations = []
  for (let i = 0; i <= samples; i++) {
    const input = prepare(i), start = performance.now()
    run(input)
    if (i > 0) durations.push(performance.now() - start)
  }
  return durations
}
function writeJson(path, value) { writeFileSync(path, JSON.stringify(value, null, 2), { flag: 'wx' }) }

if (process.argv[2] === '--fixture') {
  const id = process.argv[3], directory = resolve(process.argv[4])
  const { project, characteristics } = createPerformanceFixture(id)
  const json = JSON.stringify(project)
  assert.equal(json, JSON.stringify(createPerformanceFixture(id).project), 'Fixture must be repeatable')
  const snapshot = captureNormalizedProjectSnapshot(project)
  const plan = createProjectPackageCapturePlan(snapshot)
  assert.equal(plan.captures.filter(c => c.decision.kind === 'project-owned-data-url').length, 2)
  assert.ok(plan.captures.every(c => c.decision.kind !== 'unsupported-nonportable-asset'),
    'All fixture owners must have supported capture decisions')
  const body = createProjectPackageWriteRequest(snapshot, plan)
  const timingMs = {
    captureValidateFreeze: measure(() => captureNormalizedProjectSnapshot(project)),
    schemaValidationOnly: measure(() => { validateNormalizedProjectSchema(snapshot); return true }),
    canonicalComparisonUncached: measure(value => createCanonicalProjectComparisonValue(value),
      () => captureNormalizedProjectSnapshot(project)),
    canonicalComparisonCached: measure(() => createCanonicalProjectComparisonValue(snapshot)),
    scalarSuccessorCaptureComparisonProxy: measure(i => createCanonicalProjectComparisonValue(
      captureNormalizedProjectSnapshot({ ...project, title: `Edit ${i}` })), i => i),
    jsonSerialization: measure(() => JSON.stringify(snapshot)),
    capturePlan: measure(() => createProjectPackageCapturePlan(snapshot)),
    rawRequestFraming: measure(() => createProjectPackageWriteRequest(snapshot, plan)),
  }
  mkdirSync(directory)
  writeFileSync(join(directory, 'project.json'), json, { flag: 'wx' })
  writeFileSync(join(directory, 'request.bin'), body, { flag: 'wx' })
  const report = {
    ...characteristics, projectUtf8Bytes: Buffer.byteLength(json), requestBytes: body.byteLength,
    fixtureSha256: createHash('sha256').update(json).digest('hex'), timingMs,
    memory: { nodeEnd: process.memoryUsage(), nodeProcessPeakRssKiB: process.resourceUsage().maxRSS },
  }
  writeJson(join(directory, 'node.json'), report)
  console.log(JSON.stringify(report))
} else {
  if (process.argv.length !== 2) throw new Error('Usage: node --experimental-strip-types scripts/performance/project-baseline.mjs')
  const directory = mkdtempSync(join(tmpdir(), 'sbls-performance-'))
  const results = fixtureIds.map(id => JSON.parse(execFileSync(process.execPath,
    ['--experimental-strip-types', fileURLToPath(import.meta.url), '--fixture', id, join(directory, id)],
    { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })))
  const report = {
    formatVersion: 1, capturedAt: new Date().toISOString(),
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceStatus: execFileSync('git', ['status', '--short'], { encoding: 'utf8' }).trim(),
    environment: { node: process.version, platform: process.platform, arch: process.arch,
      cpu: cpus()[0]?.model, logicalCpus: cpus().length, physicalMemoryBytes: totalmem() },
    warmup: 1, samples, results,
    pending: ['native input-to-preview latency', 'actual lifecycle scalar commit',
      'native WebView/IPC end-to-end Save/Open', 'whole-app process-tree peak memory'],
  }
  writeJson(join(directory, 'node-baseline.json'), report)
  console.log(JSON.stringify({ directory, fixtures: results.map(r => ({ id: r.id, requestBytes: r.requestBytes })) }, null, 2))
}
