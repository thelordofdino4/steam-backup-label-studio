import assert from 'node:assert/strict'
import test from 'node:test'

import { createProjectSnapshot } from '../project/createProjectSnapshot.ts'
import {
  createProjectPackageCapturePlan,
} from '../package/projectPackageCapturePlan.ts'
import {
  createProjectFileCommandFailure,
  isProjectFileCommandFailure,
  PROJECT_PATH_HEADER_NAME,
  type RawBinaryInvoke,
} from './binaryProjectFile.ts'
import {
  LEGACY_SOURCE_PATH_HEADER_NAME,
  MAX_PROJECT_PACKAGE_JSON_BYTES,
  PROJECT_PACKAGE_WRITE_REQUEST_MAGIC,
  createProjectPackageWritePort,
  createProjectPackageWriteRequest,
} from './projectPackageWrite.ts'

function decodeRequest(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const planLength = view.getUint32(8, false)
  const projectLength = view.getUint32(12, false)
  const decoder = new TextDecoder('utf-8', { fatal: true })
  return {
    magic: decoder.decode(bytes.subarray(0, 8)),
    plan: JSON.parse(decoder.decode(bytes.subarray(16, 16 + planLength))),
    project: JSON.parse(decoder.decode(
      bytes.subarray(16 + planLength, 16 + planLength + projectLength),
    )),
    total: 16 + planLength + projectLength,
  }
}

test('raw package-write framing carries one exact plan and one exact project payload', () => {
  const project = createProjectSnapshot({
    manualGameTitle: 'Framing 💿',
    savedAt: '2026-07-29T00:00:00.000Z',
  })
  const plan = createProjectPackageCapturePlan(project)
  const bytes = createProjectPackageWriteRequest(project, plan)
  const decoded = decodeRequest(bytes)

  assert.equal(decoded.magic, PROJECT_PACKAGE_WRITE_REQUEST_MAGIC)
  assert.deepEqual(decoded.plan, plan)
  assert.deepEqual(decoded.project, JSON.parse(JSON.stringify(project)))
  assert.equal(decoded.total, bytes.byteLength)
})

test('package-write port sends raw bytes once and returns only structured success', async () => {
  const project = createProjectSnapshot({ manualGameTitle: 'Write Boundary' })
  const plan = createProjectPackageCapturePlan(project)
  let requestBody: Uint8Array | null = null
  const invokeCommand: RawBinaryInvoke = async <Result>(command, body, options) => {
    assert.equal(command, 'encode_and_write_project_package_file')
    assert.ok(body instanceof Uint8Array)
    requestBody = body
    assert.deepEqual(options.headers, {
      [PROJECT_PATH_HEADER_NAME]: 'C%3A%5CProjects%5Coutput.SBLS',
      [LEGACY_SOURCE_PATH_HEADER_NAME]:
        'C%3A%5CImports%5Clegacy.sbls.json',
    })
    return { status: 'success' } as Result
  }
  const port = createProjectPackageWritePort(invokeCommand)

  const result = await port.encodeAndWrite({
    destinationPath: 'C:\\Projects\\output.SBLS',
    legacySourcePath: 'C:\\Imports\\legacy.sbls.json',
    normalizedProject: project,
    capturePlan: plan,
  })

  assert.deepEqual(result, { status: 'success' })
  assert.ok(requestBody)
  assert.deepEqual(
    decodeRequest(requestBody).project,
    JSON.parse(JSON.stringify(project)),
  )
  assert.deepEqual(Object.keys(result), ['status'])
})

test('package-write port preserves exact safe failures and sanitizes malformed rejects', async () => {
  const project = createProjectSnapshot({ manualGameTitle: 'Failure' })
  const plan = createProjectPackageCapturePlan(project)
  const expected = createProjectFileCommandFailure(
    'project.atomic-write.replace-destination',
    'permission-denied',
    'project.atomic-write.replace-destination',
  )
  for (const [rejection, predicate] of [
    [expected, (error: unknown) => error === expected],
    [new Error('SECRET path and payload'), (error: unknown) =>
      isProjectFileCommandFailure(error) &&
      error.cause?.category === 'transport-rejection-invalid' &&
      !JSON.stringify(error).includes('SECRET')],
  ] as const) {
    const port = createProjectPackageWritePort(async () => {
      throw rejection
    })
    await assert.rejects(port.encodeAndWrite({
      destinationPath: 'project.sbls',
      legacySourcePath: null,
      normalizedProject: project,
      capturePlan: plan,
    }), predicate)
  }
})

test('oversized project input is rejected before native invocation', async () => {
  const project = createProjectSnapshot({ manualGameTitle: 'Oversized' })
  project.background.note = 'x'.repeat(MAX_PROJECT_PACKAGE_JSON_BYTES)
  let invoked = false
  const port = createProjectPackageWritePort(async () => {
    invoked = true
    return { status: 'success' }
  })
  await assert.rejects(port.encodeAndWrite({
    destinationPath: 'project.sbls',
    legacySourcePath: null,
    normalizedProject: project,
    capturePlan: createProjectPackageCapturePlan(project),
  }), (error) => isProjectFileCommandFailure(error) &&
    error.code === 'project.file-too-large')
  assert.equal(invoked, false)
})

test('package output cannot enter the frontend response shape', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) =>
    readFile('src/tauri/projectPackageWrite.ts', 'utf8'))
  assert.doesNotMatch(source, /base64|Array\.from|number\[\]|packageBytes/)
  assert.match(source, /return Object\.freeze\(\{ status: 'success' \}\)/)
})
