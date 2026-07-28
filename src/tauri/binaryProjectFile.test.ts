import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  MAX_BINARY_PROJECT_BYTES,
  MAX_PROJECT_PATH_HEADER_BYTES,
  PROJECT_FILE_FAILURE_MESSAGES,
  PROJECT_PATH_HEADER_NAME,
  createBinaryProjectFilePort,
  encodeBinaryProjectPath,
  isBinaryProjectByteLengthSupported,
  isProjectFileCommandFailure,
  type ProjectFileCommandFailure,
  type RawBinaryInvoke,
} from './binaryProjectFile.ts'

test('binary project constants and failure registry exactly match the native contract', () => {
  assert.equal(MAX_BINARY_PROJECT_BYTES, 268_435_456)
  assert.equal(isBinaryProjectByteLengthSupported(MAX_BINARY_PROJECT_BYTES), true)
  assert.equal(isBinaryProjectByteLengthSupported(MAX_BINARY_PROJECT_BYTES + 1), false)
  assert.equal(MAX_PROJECT_PATH_HEADER_BYTES, 4_096)
  assert.deepEqual(Object.keys(PROJECT_FILE_FAILURE_MESSAGES), [
    'project.file-too-large',
    'project.read-failed',
    'project.write-failed',
    'project.atomic-write.validate-destination',
    'project.atomic-write.create-temporary',
    'project.atomic-write.collision-exhausted',
    'project.atomic-write.write-temporary',
    'project.atomic-write.flush-temporary',
    'project.atomic-write.sync-temporary',
    'project.atomic-write.close-temporary',
    'project.atomic-write.replace-destination',
  ])
})

test('path metadata encoding is canonical and preserves Unicode and Windows separators', () => {
  assert.equal(
    encodeBinaryProjectPath(
      'C:\\Users\\Zoë Smith\\保存 & 100% (final).sbls',
      'write',
    ),
    'C%3A%5CUsers%5CZo%C3%AB%20Smith%5C%E4%BF%9D%E5%AD%98%20%26%20100%25%20%28final%29.sbls',
  )
})

test('path metadata preflight returns structured safe failures', () => {
  for (const path of ['', 'bad\0path', '\ud800']) {
    assert.throws(
      () => encodeBinaryProjectPath(path, 'read'),
      isProjectFileCommandFailure,
    )
  }
  assert.throws(
    () => encodeBinaryProjectPath('a'.repeat(MAX_PROJECT_PATH_HEADER_BYTES + 1), 'write'),
    (error) => isProjectFileCommandFailure(error) &&
      error.cause?.category === 'path-metadata-too-large',
  )
})

test('read invokes with an empty raw body and returns a fresh view over raw response bytes', async () => {
  const response = new Uint8Array([0, 0xff, 0xfe, 4]).buffer
  const invokeCommand: RawBinaryInvoke = async <Result>(command, body, options) => {
    assert.equal(command, 'read_binary_project_file')
    assert.ok(body instanceof Uint8Array)
    assert.equal(body.byteLength, 0)
    assert.deepEqual(options.headers, {
      [PROJECT_PATH_HEADER_NAME]: 'folder%2Fproject.sbls',
    })
    return response as Result
  }
  const port = createBinaryProjectFilePort(invokeCommand)

  const bytes = await port.read('folder/project.sbls')

  assert.ok(bytes instanceof Uint8Array)
  assert.equal(bytes.buffer, response)
  assert.deepEqual([...bytes], [0, 0xff, 0xfe, 4])
})

test('read response enforces the configured exact boundary before exposing bytes', async () => {
  const exactPort = createBinaryProjectFilePort(
    async <Result>() => new Uint8Array(8).buffer as Result,
    8,
  )
  assert.equal((await exactPort.read('project.sbls')).byteLength, 8)

  const oversizedPort = createBinaryProjectFilePort(
    async <Result>() => new Uint8Array(9).buffer as Result,
    8,
  )
  await assert.rejects(
    oversizedPort.read('project.sbls'),
    (error) => isProjectFileCommandFailure(error) &&
      error.code === 'project.file-too-large' &&
      error.cause?.operation === 'project-binary-read-response',
  )
})

test('write passes the caller Uint8Array unchanged as the raw request body', async () => {
  const bytes = new Uint8Array([0, 0xff, 0xfe, 4])
  const before = bytes.slice()
  const invokeCommand: RawBinaryInvoke = async <Result>(command, body, options) => {
    assert.equal(command, 'write_binary_project_file')
    assert.equal(body, bytes)
    assert.deepEqual(body, before)
    assert.deepEqual(options.headers, {
      [PROJECT_PATH_HEADER_NAME]: 'C%3A%5CProjects%5Cproject.sbls',
    })
    return { status: 'success' } as Result
  }
  const port = createBinaryProjectFilePort(invokeCommand)

  assert.deepEqual(
    await port.write('C:\\Projects\\project.sbls', bytes),
    { status: 'success' },
  )
  assert.deepEqual(bytes, before)
})

test('write preflight rejects one byte over a compact bounded configuration before invoke', async () => {
  let invoked = false
  const invokeCommand: RawBinaryInvoke = async <Result>() => {
    invoked = true
    return { status: 'success' } as Result
  }
  const port = createBinaryProjectFilePort(invokeCommand, 8)
  const oversized = new Uint8Array(9)

  await assert.rejects(
    port.write('project.sbls', oversized),
    (error) => isProjectFileCommandFailure(error) &&
      error.code === 'project.file-too-large',
  )
  assert.equal(invoked, false)
})

test('known structured Rust rejections are preserved as objects', async () => {
  const expected: ProjectFileCommandFailure = Object.freeze({
    status: 'failure',
    code: 'project.atomic-write.replace-destination',
    recoverable: true,
    message: PROJECT_FILE_FAILURE_MESSAGES['project.atomic-write.replace-destination'],
    cause: Object.freeze({
      category: 'permission-denied',
      operation: 'project.atomic-write.replace-destination',
      platformCode: 5,
      secondary: Object.freeze([Object.freeze({
        category: 'permission-denied',
        operation: 'project.atomic-write.cleanup-remove-temporary',
      })]),
    }),
  })
  const port = createBinaryProjectFilePort(async () => {
    throw expected
  })

  await assert.rejects(
    port.write('project.sbls', new Uint8Array([1])),
    (error) => error === expected,
  )
})

test('malformed rejection and success values become safe structured failures', async () => {
  const readPort = createBinaryProjectFilePort(async () => {
    throw new Error('SECRET RAW ERROR')
  })
  await assert.rejects(
    readPort.read('project.sbls'),
    (error) => isProjectFileCommandFailure(error) &&
      error.code === 'project.read-failed' &&
      error.cause?.category === 'transport-rejection-invalid' &&
      !JSON.stringify(error).includes('SECRET'),
  )

  const writePort = createBinaryProjectFilePort(async <Result>() => (
    { status: 'not-success' } as Result
  ))
  await assert.rejects(
    writePort.write('project.sbls', new Uint8Array()),
    (error) => isProjectFileCommandFailure(error) &&
      error.cause?.category === 'success-response-invalid',
  )
})

test('type guard accepts every valid code and rejects malformed objects', () => {
  for (const [code, message] of Object.entries(PROJECT_FILE_FAILURE_MESSAGES)) {
    assert.equal(isProjectFileCommandFailure({
      status: 'failure',
      code,
      recoverable: true,
      message,
      cause: {
        category: 'io',
        operation: 'test',
        platformCode: 5,
        secondary: [{ category: 'permission-denied', operation: 'cleanup' }],
      },
    }), true, code)
  }

  for (const malformed of [
    null,
    'project.read-failed',
    { status: 'failure', code: 'project.read-failed', recoverable: true },
    {
      status: 'failure',
      code: 'application.unexpected',
      recoverable: true,
      message: 'unexpected',
    },
    {
      status: 'failure',
      code: 'project.read-failed',
      recoverable: true,
      message: 'wrong',
    },
    {
      status: 'failure',
      code: 'project.read-failed',
      recoverable: true,
      message: PROJECT_FILE_FAILURE_MESSAGES['project.read-failed'],
      cause: { category: '', operation: 'read' },
    },
  ]) {
    assert.equal(isProjectFileCommandFailure(malformed), false)
  }
})

test('raw binary ports stay dormant and do not replace legacy JSON or PNG ports', async () => {
  const files = [
    'src/app/App.tsx',
    'src/app/appProjectLoad.ts',
    'src/app/appProjectSave.ts',
    'src/app/appPngExport.ts',
    'src/tauri/fileSystem.ts',
  ]
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    assert.doesNotMatch(source, /binaryProjectFile|readBinaryProjectFile|writeBinaryProjectFile/)
  }

  const legacyPort = await readFile('src/tauri/fileSystem.ts', 'utf8')
  assert.match(legacyPort, /invoke<string>\('read_project_file', \{ path \}\)/)
  assert.match(legacyPort, /invoke\('write_project_file', \{ path, contents \}\)/)
  assert.match(legacyPort, /invoke\('write_binary_file', \{ path, bytes \}\)/)
})

test('port implementation contains no archive byte-array or base64 conversion path', async () => {
  const source = await readFile('src/tauri/binaryProjectFile.ts', 'utf8')
  assert.doesNotMatch(source, /Array\.from|btoa|atob|base64|JSON\.stringify|\.\.\.bytes/)
  assert.doesNotMatch(source, /number\[\]/)
})
