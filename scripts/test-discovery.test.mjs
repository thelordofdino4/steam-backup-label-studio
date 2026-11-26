import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { discoverTestFiles, repositoryRoot } from './discover-tests.mjs'
import { testFiles } from './test-file-list.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'sbls-discovery-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'src/nested'), { recursive: true })
  mkdirSync(join(root, 'scripts'), { recursive: true })
  return root
}

test('new nested tests are discovered without editing any registry', (t) => {
  const root = fixture(t)
  writeFileSync(join(root, 'src/nested/new.test.ts'), '')
  writeFileSync(join(root, 'scripts/tool.test.mjs'), '')
  writeFileSync(join(root, 'src/nested/helper.ts'), '')
  assert.deepEqual(discoverTestFiles(root), [
    'scripts/tool.test.mjs', 'src/nested/new.test.ts',
  ])
  writeFileSync(join(root, 'src/another.test.mts'), '')
  assert.deepEqual(discoverTestFiles(root), [
    'scripts/tool.test.mjs', 'src/another.test.mts', 'src/nested/new.test.ts',
  ])
})

test('unsupported test extensions fail discovery instead of silently skipping coverage', (t) => {
  const root = fixture(t)
  writeFileSync(join(root, 'src/nested/new.test.tsx'), '')
  assert.throws(() => discoverTestFiles(root), /Unsupported Node test extension.*new.test.tsx/)
})

test('the standard runner lists the complete discovered suite from another working directory', () => {
  const listed = execFileSync(process.execPath, [
    join(repositoryRoot, 'scripts/run-tests.mjs'), '--list',
  ], { cwd: tmpdir(), encoding: 'utf8' }).trim().split(/\r?\n/)
  assert.deepEqual(listed, discoverTestFiles())
  assert.deepEqual(testFiles, listed)
  assert.ok(listed.includes('src/steam/steamMetadataCandidates.test.ts'))
})

test('explicit CI lanes partition the complete suite without skipping a sandboxed browser file', () => {
  function list(lane) {
    return execFileSync(process.execPath, [
      join(repositoryRoot, 'scripts/run-tests.mjs'), '--list', lane,
    ], { cwd: tmpdir(), encoding: 'utf8' }).trim().split(/\r?\n/)
  }
  const remaining = list('--exclude-sandboxed-browser')
  const sandboxed = list('--sandboxed-browser-only')
  assert.deepEqual(sandboxed, [
    'src/app/discSteamMounted.integration.test.mjs',
    'src/components/preview/inlinePreviewTextEditorRibbon.integration.test.mjs',
    'src/export/discBackgroundLifetime.integration.test.mjs',
  ])
  assert.ok(sandboxed.every(file => !remaining.includes(file)))
  assert.deepEqual([...remaining, ...sandboxed].sort(), discoverTestFiles())
})
