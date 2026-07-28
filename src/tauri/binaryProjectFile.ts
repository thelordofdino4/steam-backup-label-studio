import { invoke } from '@tauri-apps/api/core'

export const MAX_BINARY_PROJECT_BYTES = 268_435_456
export const PROJECT_PATH_HEADER_NAME = 'x-sbls-project-path-v1'
export const MAX_PROJECT_PATH_UTF8_BYTES = 4_096
export const MAX_PROJECT_PATH_HEADER_BYTES = 4_096

export const PROJECT_FILE_FAILURE_MESSAGES = Object.freeze({
  'project.file-too-large': 'The project input exceeds the supported size limit.',
  'project.read-failed': 'The project file could not be read.',
  'project.write-failed': 'The project file could not be written.',
  'project.atomic-write.validate-destination': 'The project destination is invalid.',
  'project.atomic-write.create-temporary': 'A temporary project file could not be created safely.',
  'project.atomic-write.collision-exhausted': 'A safe temporary project file name could not be reserved.',
  'project.atomic-write.write-temporary': 'The project bytes could not be written completely.',
  'project.atomic-write.flush-temporary': 'The temporary project file could not be flushed.',
  'project.atomic-write.sync-temporary': 'The temporary project file could not be synchronized.',
  'project.atomic-write.close-temporary': 'The temporary project file could not be closed before replacement.',
  'project.atomic-write.replace-destination': 'The existing project file could not be replaced safely.',
} as const)

export type ProjectFileFailureCode = keyof typeof PROJECT_FILE_FAILURE_MESSAGES

export type ProjectFileCommandSecondaryCause = Readonly<{
  category: string
  operation: string
  platformCode?: number
}>

export type ProjectFileCommandCause = Readonly<{
  category: string
  operation: string
  platformCode?: number
  secondary?: readonly ProjectFileCommandSecondaryCause[]
}>

export type ProjectFileCommandFailure = Readonly<{
  status: 'failure'
  code: ProjectFileFailureCode
  recoverable: true
  message: string
  cause?: ProjectFileCommandCause
}>

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafeCause(value: unknown): value is ProjectFileCommandSecondaryCause {
  if (!isRecord(value)) {
    return false
  }
  return typeof value.category === 'string' && value.category.length > 0 &&
    typeof value.operation === 'string' && value.operation.length > 0 &&
    (value.platformCode === undefined ||
      (typeof value.platformCode === 'number' && Number.isSafeInteger(value.platformCode)))
}

function isSafePrimaryCause(value: unknown): value is ProjectFileCommandCause {
  if (!isRecord(value)) {
    return false
  }
  const secondary = value.secondary
  return isSafeCause(value) &&
    (secondary === undefined ||
      (Array.isArray(secondary) && secondary.every(isSafeCause)))
}

export function isProjectFileCommandFailure(
  value: unknown,
): value is ProjectFileCommandFailure {
  if (!isRecord(value) || value.status !== 'failure' || value.recoverable !== true) {
    return false
  }
  if (typeof value.code !== 'string' || !(value.code in PROJECT_FILE_FAILURE_MESSAGES)) {
    return false
  }
  const code = value.code as ProjectFileFailureCode
  return value.message === PROJECT_FILE_FAILURE_MESSAGES[code] &&
    (value.cause === undefined || isSafePrimaryCause(value.cause))
}

function isProjectFileCommandSuccess(
  value: unknown,
): value is ProjectFileCommandSuccess {
  return isRecord(value) && value.status === 'success'
}

function commandFailure(
  code: ProjectFileFailureCode,
  category: string,
  operation: string,
): ProjectFileCommandFailure {
  return Object.freeze({
    status: 'failure',
    code,
    recoverable: true,
    message: PROJECT_FILE_FAILURE_MESSAGES[code],
    cause: Object.freeze({ category, operation }),
  })
}

function pathFailure(
  operation: 'read' | 'write',
  category: string,
): ProjectFileCommandFailure {
  return commandFailure(
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

function normalizeRejection(
  value: unknown,
  fallbackCode: 'project.read-failed' | 'project.write-failed',
  operation: string,
): ProjectFileCommandFailure {
  return isProjectFileCommandFailure(value)
    ? value
    : commandFailure(fallbackCode, 'transport-rejection-invalid', operation)
}

function requestOptions(path: string, operation: 'read' | 'write') {
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
          requestOptions(path, 'read'),
        )
        if (!(response instanceof ArrayBuffer)) {
          throw commandFailure(
            'project.read-failed',
            'raw-response-required',
            'project-binary-read-response',
          )
        }
        if (response.byteLength > maximumBytes) {
          throw commandFailure(
            'project.file-too-large',
            'size-limit-exceeded',
            'project-binary-read-response',
          )
        }
        return new Uint8Array(response)
      } catch (error) {
        throw normalizeRejection(
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
          throw commandFailure(
            'project.write-failed',
            'raw-body-required',
            'project-binary-write-preflight',
          )
        }
        if (bytes.byteLength > maximumBytes) {
          throw commandFailure(
            'project.file-too-large',
            'size-limit-exceeded',
            'project-binary-write-preflight',
          )
        }
        const response = await invokeCommand<unknown>(
          'write_binary_project_file',
          bytes,
          requestOptions(path, 'write'),
        )
        if (!isProjectFileCommandSuccess(response)) {
          throw commandFailure(
            'project.write-failed',
            'success-response-invalid',
            'project-binary-write-response',
          )
        }
        return Object.freeze({ status: 'success' })
      } catch (error) {
        throw normalizeRejection(
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
