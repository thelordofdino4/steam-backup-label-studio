#!/usr/bin/env node
// Offline, same-version maintenance rehearsal; never edits vendored inputs.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const codecRoot = join(repoRoot, 'src-tauri/crates/sbls-package-codec')
const [extractedArg, reportArg, ...extra] = process.argv.slice(2)
if (!extractedArg || !reportArg || extra.length) {
  throw new Error('Usage: node scripts/rehearse-native-codec-overlays.mjs <sbls-pinned-native-codecs directory from a verified Cargo build> <new report directory>')
}
const extractedRoot = resolve(extractedArg)
const reportRoot = resolve(reportArg)
const buildSource = await readFile(join(codecRoot, 'build.rs'), 'utf8')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
function pin(name) {
  const value = buildSource.match(new RegExp(`const ${name}: &str =\\s*"([a-f0-9]{64})";`))?.[1]
  assert.ok(value, `Missing build-owned digest: ${name}`)
  return value
}
async function verified(path, constant) {
  const bytes = await readFile(path)
  assert.equal(hash(bytes), pin(constant), `Digest mismatch: ${constant}`)
  return bytes
}
const definitions = [
  { id: 'jpeg-allocator', library: 'libjpeg-turbo', root: 'libjpeg-turbo-3.1.4.1', source: 'src/jmemnobs.c', prefix: 'JPEG_ALLOCATOR', patch: '0001-libjpeg-turbo-operation-ledger.patch', patchPin: 'JPEG_PATCH_SHA256', reviewPatchKind: 'abbreviated-review-not-applyable' },
  { id: 'webp-allocator', library: 'libwebp', root: 'libwebp-1.6.0', source: 'src/utils/utils.c', prefix: 'WEBP_ALLOCATOR', patch: '0002-libwebp-operation-ledger.patch', patchPin: 'WEBP_PATCH_SHA256', reviewPatchKind: 'abbreviated-review-not-applyable' },
  { id: 'webp-cpu', library: 'libwebp', root: 'libwebp-1.6.0', source: 'src/dsp/cpu.h', prefix: 'WEBP_CPU', patch: '0003-libwebp-generic-c-only.patch', patchPin: 'WEBP_CPU_PATCH_SHA256', reviewPatchKind: 'review-diff' },
]
const archives = []
for (const [name, constant] of [['libjpeg-turbo-3.1.4.1.tar.gz', 'JPEG_ARCHIVE_SHA256'], ['libwebp-1.6.0.tar.gz', 'WEBP_ARCHIVE_SHA256']]) {
  const bytes = await verified(join(codecRoot, 'vendor/upstream', name), constant)
  archives.push({ archive: name, sha256: hash(bytes) })
}
// Verify all inputs before writing output. Do not trust a random Cargo cache tree.
const inputs = await Promise.all(definitions.map(async definition => ({
  ...definition,
  pristine: await verified(join(extractedRoot, definition.root, definition.source), `${definition.prefix}_UPSTREAM_SHA256`),
  overlay: await verified(join(codecRoot, 'vendor/overlays', definition.library, definition.source), `${definition.prefix}_OVERLAY_SHA256`),
  reviewPatch: await verified(join(codecRoot, 'vendor/patches', definition.patch), definition.patchPin),
})))
const scratch = await mkdtemp(join(tmpdir(), 'sbls-overlay-rehearsal-'))
const records = []
const patches = []
function git(args, cwd, allowedStatus = 0) {
  const result = spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', ...args], { cwd, encoding: 'utf8', shell: false })
  if (result.error) throw result.error
  assert.equal(result.status, allowedStatus, `Git command failed: ${result.stderr}`)
  return result.stdout
}
try {
  for (const input of inputs) {
    const root = join(scratch, input.id)
    for (const [tree, bytes] of [['pristine', input.pristine], ['overlay', input.overlay], ['replayed', input.pristine]]) {
      const path = join(root, tree, input.source)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, bytes, { flag: 'wx' })
    }
    const diff = git(['diff', '--no-index', '--no-ext-diff', '--no-textconv', '--no-color', '--diff-algorithm=myers', '--unified=3', '--src-prefix=a/', '--dst-prefix=b/', '--', `pristine/${input.source}`, `overlay/${input.source}`], root, 1)
      .replaceAll('a/pristine/', 'a/').replaceAll('b/overlay/', 'b/')
    const patchPath = join(root, 'complete.patch')
    await writeFile(patchPath, diff, { flag: 'wx' })
    const replayRoot = join(root, 'replayed')
    git(['apply', '--check', '--whitespace=nowarn', patchPath], replayRoot)
    git(['apply', '--whitespace=nowarn', patchPath], replayRoot)
    const replayed = await readFile(join(replayRoot, input.source))
    assert.equal(hash(replayed), hash(input.overlay), `${input.id}: replay differs from compiled overlay`)
    records.push({
      id: input.id, source: `${input.root}/${input.source}`,
      pristineSha256: hash(input.pristine), overlaySha256: hash(input.overlay),
      reviewPatch: input.patch, reviewPatchSha256: hash(input.reviewPatch),
      reviewPatchKind: input.reviewPatchKind,
      generatedCompletePatch: `${input.id}.patch`, generatedCompletePatchSha256: hash(diff),
      replayMatchesCompiledOverlay: true,
    })
    patches.push([`${input.id}.patch`, diff])
  }
  const report = {
    schemaVersion: 1, rehearsal: 'same-version-complete-diff-replay',
    buildScriptSha256: hash(buildSource), archives, overlays: records,
    limitations: ['Not an upstream version upgrade.', 'Not a security advisory clearance or packaged-app acceptance.'],
  }
  // Must be a new directory; never overwrite a prior report or user files.
  await mkdir(reportRoot)
  for (const [name, bytes] of patches) await writeFile(join(reportRoot, name), bytes, { flag: 'wx' })
  await writeFile(join(reportRoot, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  process.stdout.write(JSON.stringify({ overlays: records.length, allReplaysMatch: true }) + '\n')
} finally {
  // Remove only the exact scratch directory allocated by mkdtemp above.
  await rm(scratch, { recursive: true, force: true })
}
