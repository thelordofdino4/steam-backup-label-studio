import assert from 'node:assert/strict'
import test from 'node:test'
import { createPerformanceFixture, fixtureIds } from './fixtures.mjs'
import { createPerformancePersistedProject, assertPerformanceOpenStaging } from './persistence.mjs'
import { captureNormalizedProjectSnapshot } from '../../src/lifecycle/canonicalProject.ts'
import { createProjectPackageCapturePlan } from '../../src/package/projectPackageCapturePlan.ts'
import { createProjectPackageWriteRequest } from '../../src/tauri/projectPackageWrite.ts'
import { parseSavedProjectContents } from '../../src/project/projectSchema.ts'

function frameProject(project) {
  const bytes = createProjectPackageWriteRequest(project, createProjectPackageCapturePlan(project))
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const start = 20 + view.getUint32(8)
  return JSON.parse(new TextDecoder().decode(bytes.subarray(start, start + view.getUint32(12))))
}

test('old Case content-only request omits required persisted companion and fails production Open', async () => {
  const { project } = createPerformanceFixture('case-small')
  const snapshot = captureNormalizedProjectSnapshot(project)
  assert.equal(frameProject(snapshot).caseInsertLayoutPreset, undefined)
  assert.throws(() => parseSavedProjectContents(JSON.stringify(snapshot)), /caseInsertLayoutPreset must be an object/)
  await assert.rejects(assertPerformanceOpenStaging(new TextEncoder().encode(JSON.stringify(snapshot)), project, 128),
    /caseInsertLayoutPreset must be an object/)
})

for (const id of fixtureIds) test(`${id} persisted request retains required state and passes production staging`, async () => {
  const { project, characteristics } = createPerformanceFixture(id)
  const before = JSON.stringify(project)
  const persisted = createPerformancePersistedProject(project)
  const metadata = frameProject(persisted)
  if (project.projectType === 'caseInsert') {
    assert.deepEqual(persisted.caseInsertLayoutPreset, project.caseInsertLayoutPreset)
    assert.deepEqual(metadata.caseInsertLayoutPreset, project.caseInsertLayoutPreset)
  }
  const result = await assertPerformanceOpenStaging(new TextEncoder().encode(JSON.stringify(persisted)),
    persisted, characteristics.width)
  assert.equal(result.status, 'success')
  assert.equal(result.exactAssetLeaves, 2)
  assert.equal(JSON.stringify(project), before)
})
