import { invoke } from '@tauri-apps/api/core'

import {
  createProjectFileCommandFailure,
  isProjectFileCommandFailure,
  type ProjectFileCommandFailure,
} from './projectFileFailure.ts'

export {
  PROJECT_FILE_FAILURE_MESSAGES,
  createProjectFileCommandFailure,
  isProjectFileCommandFailure,
} from './projectFileFailure.ts'
export type {
  ProjectFileCommandCause,
  ProjectFileCommandFailure,
  ProjectFileCommandSecondaryCause,
  ProjectFileFailureCode,
} from './projectFileFailure.ts'

export const MAX_BINARY_PROJECT_BYTES = 268_435_456
export const PROJECT_PATH_HEADER_NAME = 'x-sbls-project-path-v1'
export const MAX_PROJECT_PATH_UTF8_BYTES = 4_096
export const MAX_PROJECT_PATH_HEADER_BYTES = 4_096

export type ProjectFileCommandSuccess = Readonly<{
  status: 'success'
}>

export type RawBinaryInvoke = <Result>(
  command: string,
  body: Uint8Array,
  options: Readonly<{ headers: Readonly<Record<string, string>> }>,
) => Promise<Result>

export type BinaryProjectFilePort = Readonly<{
  read(path: string): Promise<Uint8Array>
  write(path: string, bytes: Uint8Array): Promise<ProjectFileCommandSuccess>
}>

function isProjectFileCommandSuccess(
  value: unknown,
): value is ProjectFileCommandSuccess {
  return typeof value === 'object' && value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).status === 'success'
}

function pathFailure(
  operation: 'read' | 'write',
  category: string,
): ProjectFileCommandFailure {
  return createProjectFileCommandFailure(
    operation === 'read' ? 'project.read-failed' : 'project.write-failed',
    category,
    `project-binary-${operation}-path`,
  )
}

export function encodeBinaryProjectPath(
  path: string,
  operation: 'read' | 'write',
): string {
  if (typeof path !== 'string' || path.length === 0 || path.includes('\0')) {
    throw pathFailure(operation, 'path-metadata-invalid')
  }
  if (path.length > MAX_PROJECT_PATH_UTF8_BYTES) {
    throw pathFailure(operation, 'path-metadata-too-large')
  }

  let encoded: string
  try {
    const utf8Length = new TextEncoder().encode(path).byteLength
    if (utf8Length > MAX_PROJECT_PATH_UTF8_BYTES) {
      throw pathFailure(operation, 'path-metadata-too-large')
    }
    encoded = encodeURIComponent(path).replace(
      /[!'()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    )
  } catch (error) {
    if (isProjectFileCommandFailure(error)) {
      throw error
    }
    throw pathFailure(operation, 'path-metadata-undecodable')
  }

  if (encoded.length > MAX_PROJECT_PATH_HEADER_BYTES) {
    throw pathFailure(operation, 'path-metadata-too-large')
  }
  return encoded
}

export function normalizeProjectFileCommandRejection(
  value: unknown,
  fallbackCode: 'project.read-failed' | 'project.write-failed',
  operation: string,
): ProjectFileCommandFailure {
  return isProjectFileCommandFailure(value)
    ? value
    : createProjectFileCommandFailure(
        fallbackCode,
        'transport-rejection-invalid',
        operation,
      )
}

export function createBinaryProjectRequestOptions(
  path: string,
  operation: 'read' | 'write',
) {
  return Object.freeze({
    headers: Object.freeze({
      [PROJECT_PATH_HEADER_NAME]: encodeBinaryProjectPath(path, operation),
    }),
  })
}

export function isBinaryProjectByteLengthSupported(byteLength: number): boolean {
  return Number.isSafeInteger(byteLength) &&
    byteLength >= 0 &&
    byteLength <= MAX_BINARY_PROJECT_BYTES
}

export function createBinaryProjectFilePort(
  invokeCommand: RawBinaryInvoke = invoke,
  maximumBytes: number = MAX_BINARY_PROJECT_BYTES,
): BinaryProjectFilePort {
  if (!isBinaryProjectByteLengthSupported(maximumBytes)) {
    throw new RangeError('Binary project port limit must not exceed the production cap.')
  }
  return Object.freeze({
    async read(path: string): Promise<Uint8Array> {
      try {
        const response = await invokeCommand<ArrayBuffer>(
          'read_binary_project_file',
          new Uint8Array(0),
          createBinaryProjectRequestOptions(path, 'read'),
        )
        if (!(response instanceof ArrayBuffer)) {
          throw createProjectFileCommandFailure(
            'project.read-failed',
            'raw-response-required',
            'project-binary-read-response',
          )
        }
        if (response.byteLength > maximumBytes) {
          throw createProjectFileCommandFailure(
            'project.file-too-large',
            'size-limit-exceeded',
            'project-binary-read-response',
          )
        }
        return new Uint8Array(response)
      } catch (error) {
        throw normalizeProjectFileCommandRejection(
          error,
          'project.read-failed',
          'project-binary-read-invoke',
        )
      }
    },

    async write(
      path: string,
      bytes: Uint8Array,
    ): Promise<ProjectFileCommandSuccess> {
      try {
        if (!(bytes instanceof Uint8Array)) {
          throw createProjectFileCommandFailure(
            'project.write-failed',
            'raw-body-required',
            'project-binary-write-preflight',
          )
        }
        if (bytes.byteLength > maximumBytes) {
          throw createProjectFileCommandFailure(
            'project.file-too-large',
            'size-limit-exceeded',
            'project-binary-write-preflight',
          )
        }
        const response = await invokeCommand<unknown>(
          'write_binary_project_file',
          bytes,
          createBinaryProjectRequestOptions(path, 'write'),
        )
        if (!isProjectFileCommandSuccess(response)) {
          throw createProjectFileCommandFailure(
            'project.write-failed',
            'success-response-invalid',
            'project-binary-write-response',
          )
        }
        return Object.freeze({ status: 'success' })
      } catch (error) {
        throw normalizeProjectFileCommandRejection(
          error,
          'project.write-failed',
          'project-binary-write-invoke',
        )
      }
    },
  })
}

const binaryProjectFilePort = createBinaryProjectFilePort()

export function readBinaryProjectFile(path: string): Promise<Uint8Array> {
  return binaryProjectFilePort.read(path)
}

export function writeBinaryProjectFile(
  path: string,
  bytes: Uint8Array,
): Promise<ProjectFileCommandSuccess> {
  return binaryProjectFilePort.write(path, bytes)
}
