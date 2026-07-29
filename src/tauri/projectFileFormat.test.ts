import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PROJECT_PATH_HEADER_NAME,
  createProjectFileCommandFailure,
  isProjectFileCommandFailure,
  type RawBinaryInvoke,
} from './binaryProjectFile.ts'
import {
  PROJECT_RECOGNIZED_FILE_FORMATS,
  createProjectFormatRecognitionFailure,
  createProjectFormatRecognitionPort,
  isProjectFormatRecognitionFailure,
} from './projectFileFormat.ts'

test('recognition port invokes one native command with path metadata and no file bytes', async () => {
  const invokeCommand: RawBinaryInvoke = async <Result>(command, body, options) => {
    assert.equal(command, 'recognize_project_file_format')
    assert.ok(body instanceof Uint8Array)
    assert.equal(body.byteLength, 0)
    assert.deepEqual(options.headers, {
      [PROJECT_PATH_HEADER_NAME]: 'C%3A%5CProjects%5Cmisleading.json',
    })
    return { status: 'success', format: 'sbls-package-v1' } as Result
  }

  assert.equal(
    await createProjectFormatRecognitionPort(invokeCommand).recognize(
      'C:\\Projects\\misleading.json',
    ),
    'sbls-package-v1',
  )
})

test('recognition success registry is exact and independent of path suffix', async () => {
  assert.deepEqual(PROJECT_RECOGNIZED_FILE_FORMATS, [
    'legacy-json',
    'sbls-package-v1',
  ])
  for (const format of PROJECT_RECOGNIZED_FILE_FORMATS) {
    const port = createProjectFormatRecognitionPort(
      async <Result>() => ({ status: 'success', format }) as Result,
    )
    assert.equal(await port.recognize('anything.unrelated'), format)
  }
})

test('exact structured file and unsupported-format rejections are preserved', async () => {
  const expectedFailures = [
    createProjectFormatRecognitionFailure(),
    createProjectFileCommandFailure(
      'project.file-too-large',
      'size-limit-exceeded',
      'project-format-recognition-limit',
    ),
  ]

  for (const expected of expectedFailures) {
    const port = createProjectFormatRecognitionPort(async () => {
      throw expected
    })
    await assert.rejects(
      port.recognize('project.sbls'),
      (error) => error === expected,
    )
  }
})

test('recognition failure guard rejects additional, missing, and altered data', () => {
  const valid = createProjectFormatRecognitionFailure()
  assert.equal(isProjectFormatRecognitionFailure(valid), true)

  for (const malformed of [
    null,
    'project.format.unsupported',
    { ...valid, status: 'error' },
    { ...valid, message: 'unsafe native detail' },
    { ...valid, recoverable: false },
    { ...valid, cause: { stage: 'other' } },
    { ...valid, cause: { stage: 'content-recognition', path: 'SECRET' } },
    { ...valid, path: 'C:\\SECRET\\project.sbls' },
  ]) {
    assert.equal(isProjectFormatRecognitionFailure(malformed), false)
  }
})

test('malformed success and rejection values are sanitized without disclosure', async () => {
  for (const response of [
    null,
    { status: 'success' },
    { status: 'success', format: 'unknown' },
    { status: 'success', format: 'legacy-json', path: 'SECRET' },
  ]) {
    const port = createProjectFormatRecognitionPort(
      async <Result>() => response as Result,
    )
    await assert.rejects(
      port.recognize('project.sbls'),
      (error) => isProjectFileCommandFailure(error) &&
        error.cause?.category === 'success-response-invalid' &&
        !JSON.stringify(error).includes('SECRET'),
    )
  }

  const rejected = createProjectFormatRecognitionPort(async () => {
    throw {
      status: 'failure',
      code: 'project.format.unsupported',
      recoverable: true,
      message: 'SECRET native diagnostic',
      cause: { stage: 'content-recognition', path: 'C:\\SECRET' },
    }
  })
  await assert.rejects(
    rejected.recognize('project.sbls'),
    (error) => isProjectFileCommandFailure(error) &&
      error.cause?.category === 'transport-rejection-invalid' &&
      !JSON.stringify(error).includes('SECRET'),
  )
})

test('invalid paths fail before native invocation', async () => {
  let invoked = false
  const port = createProjectFormatRecognitionPort(async () => {
    invoked = true
    return { status: 'success', format: 'legacy-json' }
  })

  await assert.rejects(
    port.recognize('bad\0path'),
    (error) => isProjectFileCommandFailure(error) &&
      error.cause?.category === 'path-metadata-invalid',
  )
  assert.equal(invoked, false)
})
