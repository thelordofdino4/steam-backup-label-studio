import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  PROJECT_PATH_HEADER_NAME,
  createProjectFileCommandFailure,
  isProjectFileCommandFailure,
  type RawBinaryInvoke,
} from './binaryProjectFile.ts'
import {
  PROJECT_PACKAGE_FAILURE_REGISTRY,
  PROJECT_PACKAGE_FAILURE_STAGES,
  MAX_PACKAGE_HYDRATED_JSON_BYTES,
  createPackageProjectFilePort,
  createProjectPackageCommandFailure,
  isProjectPackageCommandFailure,
  type ProjectPackageCommandFailure,
} from './packageProjectFile.ts'

const EXPECTED_CODES = Object.freeze([
  'project.file-too-large',
  'project.format.unsupported',
  'project.package.version-unsupported',
  'project.package.archive-too-large',
  'project.package.resource-limit-exceeded',
  'project.package.archive-invalid',
  'project.package.entry-path-invalid',
  'project.package.manifest-invalid',
  'project.package.project-missing',
  'project.package.project-digest-mismatch',
  'project.package.asset-missing',
  'project.package.asset-digest-mismatch',
  'project.package.asset-hash-collision',
  'project.package.asset-type-invalid',
  'project.package.asset-type-unsupported',
  'project.package.asset-jpeg-profile-unsupported',
  'project.package.asset-bmp-profile-unsupported',
  'project.package.asset-dimensions-invalid',
  'project.package.binding-invalid',
  'project.package.binding-conflict',
  'project.package.binding-unresolved',
  'project.package.built-in-unavailable',
  'project.package.built-in-capture-required',
  'project.package.hydrated-json-invalid',
  'project.schema.unsupported',
  'project.package.asset-capture-failed',
  'project.package.encode-failed',
] as const)

test('package failure registry and stages are exact and complete', () => {
  assert.equal(MAX_PACKAGE_HYDRATED_JSON_BYTES, 671_096_832)
  assert.deepEqual(Object.keys(PROJECT_PACKAGE_FAILURE_REGISTRY), EXPECTED_CODES)
  assert.deepEqual(PROJECT_PACKAGE_FAILURE_STAGES, [
    'raw-input',
    'archive-envelope',
    'entry-inventory',
    'manifest',
    'project',
    'asset-capture',
    'asset-validation',
    'binding-hydration',
    'encoding',
  ])
  assert.equal(Object.keys(PROJECT_PACKAGE_FAILURE_REGISTRY).length, 27)
  for (const definition of Object.values(PROJECT_PACKAGE_FAILURE_REGISTRY)) {
    assert.ok(definition.message.length > 0)
    assert.equal(typeof definition.recoverable, 'boolean')
  }
})

test('package failure guard accepts every exact DTO and rejects unsafe shapes', () => {
  for (const code of EXPECTED_CODES) {
    for (const stage of PROJECT_PACKAGE_FAILURE_STAGES) {
      const failure = createProjectPackageCommandFailure(code, stage)
      assert.equal(isProjectPackageCommandFailure(failure), true, `${code}:${stage}`)
      assert.equal(failure.message, PROJECT_PACKAGE_FAILURE_REGISTRY[code].message)
      assert.equal(
        failure.recoverable,
        PROJECT_PACKAGE_FAILURE_REGISTRY[code].recoverable,
      )
    }
  }

  const valid = createProjectPackageCommandFailure(
    'project.package.archive-invalid',
    'archive-envelope',
  )
  for (const malformed of [
    null,
    'project.package.archive-invalid',
    { ...valid, status: 'error' },
    { ...valid, code: 'project.package.unknown' },
    { ...valid, message: 'unsafe decoder text' },
    { ...valid, recoverable: false },
    { ...valid, cause: { stage: 'unknown-stage' } },
    { ...valid, cause: { stage: 'archive-envelope', source: 'secret path' } },
    { ...valid, path: 'C:\\private\\secret.sbls' },
  ]) {
    assert.equal(isProjectPackageCommandFailure(malformed), false)
  }
})

test('package port invokes one raw command and returns a zero-copy hydrated view', async () => {
  const response = new Uint8Array([0x7b, 0x7d]).buffer
  const invokeCommand: RawBinaryInvoke = async <Result>(
    command,
    body,
    options,
  ) => {
    assert.equal(command, 'decode_project_package_file')
    assert.ok(body instanceof Uint8Array)
    assert.equal(body.byteLength, 0)
    assert.deepEqual(options.headers, {
      [PROJECT_PATH_HEADER_NAME]:
        'C%3A%5CProjects%5C%E4%BF%9D%E5%AD%98%20%26%20100%25.sbls',
    })
    return response as Result
  }
  const port = createPackageProjectFilePort(invokeCommand)

  const hydrated = await port.decode('C:\\Projects\\保存 & 100%.sbls')

  assert.equal(hydrated.buffer, response)
  assert.deepEqual([...hydrated], [0x7b, 0x7d])
})

test('package port preserves exact file and package rejections', async () => {
  const fileFailure = createProjectFileCommandFailure(
    'project.read-failed',
    'permission-denied',
    'project-binary-read-open',
  )
  const packageFailure = createProjectPackageCommandFailure(
    'project.package.asset-digest-mismatch',
    'asset-validation',
  )

  for (const expected of [fileFailure, packageFailure]) {
    const port = createPackageProjectFilePort(async () => {
      throw expected
    })
    await assert.rejects(port.decode('project.sbls'), (error) => error === expected)
  }
})

test('malformed transport and raw response failures are safe structured file failures', async () => {
  const rejected = createPackageProjectFilePort(async () => {
    throw new Error('SECRET transport detail')
  })
  await assert.rejects(
    rejected.decode('project.sbls'),
    (error) => isProjectFileCommandFailure(error) &&
      error.code === 'project.read-failed' &&
      error.cause?.category === 'transport-rejection-invalid' &&
      !JSON.stringify(error).includes('SECRET'),
  )

  const invalidResponse = createPackageProjectFilePort(
    async <Result>() => ({ bytes: [1, 2, 3] }) as Result,
  )
  await assert.rejects(
    invalidResponse.decode('project.sbls'),
    (error) => isProjectFileCommandFailure(error) &&
      error.cause?.category === 'raw-response-required',
  )

  const unsafeFileFailure = createPackageProjectFilePort(async () => {
    throw {
      ...createProjectFileCommandFailure(
        'project.read-failed',
        'permission-denied',
        'project-binary-read-open',
      ),
      path: 'C:\\private\\secret.sbls',
    }
  })
  await assert.rejects(
    unsafeFileFailure.decode('project.sbls'),
    (error) => isProjectFileCommandFailure(error) &&
      error.cause?.category === 'transport-rejection-invalid' &&
      !JSON.stringify(error).includes('secret.sbls'),
  )
})

test('hydrated response cap is exact and uses package resource taxonomy', async () => {
  const exact = createPackageProjectFilePort(
    async <Result>() => new Uint8Array(8).buffer as Result,
    8,
  )
  assert.equal((await exact.decode('project.sbls')).byteLength, 8)

  const oversized = createPackageProjectFilePort(
    async <Result>() => new Uint8Array(9).buffer as Result,
    8,
  )
  await assert.rejects(
    oversized.decode('project.sbls'),
    (error) => isProjectPackageCommandFailure(error) &&
      error.code === 'project.package.resource-limit-exceeded' &&
      error.cause.stage === 'binding-hydration',
  )
})

test('package port rejects invalid paths before invoking native code', async () => {
  let invoked = false
  const port = createPackageProjectFilePort(async () => {
    invoked = true
    return new ArrayBuffer(0)
  })

  await assert.rejects(
    port.decode('bad\0path'),
    (error) => isProjectFileCommandFailure(error) &&
      error.cause?.category === 'path-metadata-invalid',
  )
  assert.equal(invoked, false)
})

test('package port stays raw, metadata-free, and dormant from production Open', async () => {
  const source = await readFile('src/tauri/packageProjectFile.ts', 'utf8')
  assert.doesNotMatch(
    source,
    /Array\.from|btoa|atob|base64|JSON\.stringify|\.\.\.bytes|number\[\]/,
  )

  for (const file of [
    'src/app/App.tsx',
    'src/app/appProjectOpenCommand.ts',
    'src/lifecycle/applicationLifecycleCompositionRoot.ts',
  ]) {
    const productionSource = await readFile(file, 'utf8')
    assert.doesNotMatch(
      productionSource,
      /decode_project_package_file|decodeProjectPackageFile|stageProjectPackageOpen/,
      file,
    )
  }
})

test('package failure objects expose no error, path, archive, or source payload', () => {
  const failure: ProjectPackageCommandFailure =
    createProjectPackageCommandFailure(
      'project.package.manifest-invalid',
      'manifest',
    )
  assert.deepEqual(Object.keys(failure).sort(), [
    'cause',
    'code',
    'message',
    'recoverable',
    'status',
  ])
  assert.deepEqual(Object.keys(failure.cause), ['stage'])
  assert.doesNotMatch(JSON.stringify(failure), /secret|path|archive bytes|source/i)
})
