import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { relative } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { getEditorBuiltInImageAssets } from '../assets/assetManifest.ts'

type RegistryAsset = Readonly<{
  id: string
  path: string
  sha256: string
}>

type RegistryMapping = Readonly<{
  compatibilityId?: string
  compatibilityIds?: readonly string[]
}>

type Registry = Readonly<{
  registryVersion: number
  status: string
  supportedProjectSchemaVersions: readonly string[]
  compatibilityLifetime: string
  assets: readonly RegistryAsset[]
  ownerMappings: readonly RegistryMapping[]
  semanticMappings: readonly RegistryMapping[]
}>

const INCLUDED_ID = /^(steam-banner|logo|rating:(ESRB|PEGI|USK)|media|platform|technical|disc-number|artwork-frame:rocky)/

test('package-v1 built-in registry has exact checked-in bytes and complete IDs', async () => {
  const registry = JSON.parse(await readFile(
    'docs/PROJECT_PACKAGE_BUILT_IN_REGISTRY_V1.json',
    'utf8',
  )) as Registry
  assert.equal(registry.registryVersion, 1)
  assert.equal(registry.status, 'normative')
  assert.deepEqual(
    registry.supportedProjectSchemaVersions,
    ['0.1.0', '0.2.0', '0.3.0', '0.4.0'],
  )
  assert.match(registry.compatibilityLifetime, /remains reconstructible/)
  assert.ok(registry.ownerMappings.length >= 10)
  assert.ok(registry.semanticMappings.length >= 3)

  const editorAssets = getEditorBuiltInImageAssets()
    .filter(({ id }) => INCLUDED_ID.test(id) && id !== 'rating:custom')
    .sort((left, right) => left.id.localeCompare(right.id))
  const registryAssets = [...registry.assets]
    .sort((left, right) => left.id.localeCompare(right.id))
  assert.deepEqual(
    registryAssets.map(({ id }) => id),
    editorAssets.map(({ id }) => id),
  )
  const registeredIds = new Set(registryAssets.map(({ id }) => id))
  for (const mapping of [
    ...registry.ownerMappings,
    ...registry.semanticMappings,
  ]) {
    const compatibilityIds = [
      ...(mapping.compatibilityId ? [mapping.compatibilityId] : []),
      ...(mapping.compatibilityIds ?? []),
    ]
    assert.ok(compatibilityIds.length > 0)
    for (const id of compatibilityIds) {
      assert.doesNotMatch(id, /\*/)
      assert.equal(registeredIds.has(id), true, id)
    }
  }

  for (let index = 0; index < registryAssets.length; index += 1) {
    const declared = registryAssets[index]
    const editor = editorAssets[index]
    const editorPath = relative(process.cwd(), fileURLToPath(editor.imageUrl))
      .replaceAll('\\', '/')
    assert.equal(declared.path, editorPath, declared.id)
    assert.equal(
      createHash('sha256')
        .update(await readFile(declared.path))
        .digest('hex'),
      declared.sha256,
      declared.id,
    )
  }
})
