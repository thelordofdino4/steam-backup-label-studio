import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import { locateProjectPackageCaptures } from '../package/projectPackageCapturePlan.ts'
import { createProjectPackageWriteProjection } from '../package/projectPackageWriteProjection.ts'
import { validateNormalizedProjectSchema } from '../project/projectSchema.ts'
import { createProjectPackageCapturePlan } from '../package/projectPackageCapturePlan.ts'
import { createProjectPackageWriteRequest } from './projectPackageWrite.ts'

function repeatedBitmapDataUrl(): string {
  const side = 1024
  const pixelBytes = side * side * 3
  const bytes = Buffer.alloc(54 + pixelBytes)
  bytes.write('BM')
  bytes.writeUInt32LE(bytes.length, 2)
  bytes.writeUInt32LE(54, 10)
  bytes.writeUInt32LE(40, 14)
  bytes.writeInt32LE(side, 18)
  bytes.writeInt32LE(side, 22)
  bytes.writeUInt16LE(1, 26)
  bytes.writeUInt16LE(24, 28)
  bytes.writeUInt32LE(pixelBytes, 34)
  assert.equal(bytes.length, 3_145_782)
  return `data:image/bmp;base64,${bytes.toString('base64')}`
}

for (const kind of ['disc', 'case']) {
  test(`normalized ${kind}: four bindings to one bitmap fit the save transport`, () => {
    const url = repeatedBitmapDataUrl()
    const fixture = JSON.parse(readFileSync(new URL(
      `../../src-tauri/tests/fixtures/package-capacity-${kind}.json`, import.meta.url,
    ), 'utf8').replaceAll('data:image/bmp;base64,SBLS_CAPACITY_BITMAP', url))
    const { project, plan } = fixture
    validateNormalizedProjectSchema(project)
    assert.deepEqual(createProjectPackageCapturePlan(project), plan)
    const original = JSON.stringify(project)
    assert.ok(Buffer.byteLength(original) > 16_777_216)
    const body = createProjectPackageWriteRequest(project, plan)
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
    assert.equal(view.getUint32(16, false), 1, 'one payload, even for disabled owners')
    const poolOffset = 20 + view.getUint32(8, false) + view.getUint32(12, false)
    assert.equal(view.getUint32(poolOffset, false), url.length)
    assert.equal(new TextDecoder().decode(body.subarray(poolOffset + 4)), url)
    assert.ok(body.byteLength < 4_300_000)
    assert.equal(JSON.stringify(project), original, 'snapshot is immutable')
    const projection = createProjectPackageWriteProjection(project, plan)
    const restored = JSON.parse(projection.projectJson)
    for (const { capture, container, key } of locateProjectPackageCaptures(restored)) {
      const decision = projection.plan.captures.find(({ ownerId }) => ownerId === capture.ownerId)!.decision
      if ('dataUrlIndex' in decision) container![key] = projection.dataUrls[decision.dataUrlIndex]
    }
    for (const { capture, container, key } of locateProjectPackageCaptures(project)) {
      if (capture.decision.kind === 'qualified-built-in' && container && key in container) container[key] = null
    }
    assert.deepEqual(restored, project, 'all non-asset metadata and four payloads survive')
  })
}

test('transport never externalizes an ordinary field with the same image string', () => {
  const { project } = JSON.parse(readFileSync(new URL(
    '../../src-tauri/tests/fixtures/package-capacity-disc.json', import.meta.url,
  ), 'utf8'))
  project.background.note = project.background.imageDataUrl
  project['ordinary/alias~'] = project.background
  const projection = createProjectPackageWriteProjection(project, createProjectPackageCapturePlan(project))
  assert.equal(JSON.parse(projection.projectJson).background.note, project.background.imageDataUrl)
  assert.equal(JSON.parse(projection.projectJson)['ordinary/alias~'].imageDataUrl, project.background.imageDataUrl)
  assert.equal(JSON.parse(projection.projectJson).background.imageDataUrl, null)
  assert.equal(projection.dataUrls.length, 1)
  assert.throws(() => createProjectPackageWriteProjection(project, { version: 1, captures: [] }))
  const plan = createProjectPackageCapturePlan(project)
  assert.throws(() => createProjectPackageWriteProjection(project, {
    ...plan, captures: [...plan.captures.slice(1), plan.captures[1]],
  }))
})
