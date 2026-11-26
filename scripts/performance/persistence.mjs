import assert from 'node:assert/strict'
import { parseSavedProjectContents } from '../../src/project/projectSchema.ts'
import { stageProjectPackageOpen } from '../../src/app/appProjectLoad.ts'
import { createBrandingSources } from '../../src/caseInsert/brandingMarkTargetSourcesFixtures.ts'

// fixtures.mjs uses the existing persisted project constructors, including the
// Case unattached companion. Validate/copy that complete shape, not content-only
// canonical state. No fabricated lifecycle session/attachment is needed.
export function createPerformancePersistedProject(project) {
  return parseSavedProjectContents(JSON.stringify(project))
}

export async function assertPerformanceOpenStaging(hydratedBytes, persisted, width) {
  const hydrated = parseSavedProjectContents(new TextDecoder('utf-8', { fatal: true }).decode(hydratedBytes))
  const pointers = persisted.projectType === 'caseInsert'
    ? [['caseInsert', 'templates', 'cover', 'background', 'imageDataUrl'],
      ['caseInsert', 'templates', 'cover', 'titleArtwork', 'imageDataUrl']]
    : [['background', 'imageDataUrl'], ['titleArtwork', 'imageDataUrl']]
  for (const path of pointers) {
    const expected = path.reduce((value, key) => value[key], persisted)
    assert.ok(expected.startsWith('data:image/bmp;base64,'))
    assert.equal(path.reduce((value, key) => value[key], hydrated), expected)
  }
  if (persisted.projectType === 'caseInsert') {
    assert.deepEqual(hydrated.caseInsertLayoutPreset, persisted.caseInsertLayoutPreset)
  }
  const result = await stageProjectPackageOpen({
    selectedPath: 'performance-fixture.sbls',
    decodeProjectPackageFileCommand: async () => hydratedBytes,
    caseInsertBrandingSources: createBrandingSources(),
    resolveBackgroundImageSize: async () => ({ width, height: width }),
  })
  assert.equal(result.status, 'success', result.error?.diagnosticMessage)
  assert.equal(result.value.projectType, persisted.projectType)
  for (const path of pointers) {
    assert.equal(path.reduce((value, key) => value[key], result.value.normalizedProject),
      path.reduce((value, key) => value[key], persisted))
  }
  if (persisted.projectType === 'caseInsert') {
    assert.deepEqual(result.value.caseInsertPresetRecovery.persistedState, persisted.caseInsertLayoutPreset)
  }
  return { status: result.status, projectType: result.value.projectType,
    editorRoute: result.value.editorRoute, exactAssetLeaves: pointers.length,
    presetState: persisted.projectType === 'caseInsert' ? 'exact' : 'not-applicable' }
}
