import { invoke } from '@tauri-apps/api/core'

import type { SavedProject } from '../project/projectTypes.ts'
import type {
  ProjectPackageCapturePlanV1,
} from '../package/projectPackageCapturePlan.ts'
import {
  encodeBinaryProjectPath,
  PROJECT_PATH_HEADER_NAME,
  type ProjectFileCommandSuccess,
  type RawBinaryInvoke,
} from './binaryProjectFile.ts'
import {
  isProjectFileCommandFailure,
  createProjectFileCommandFailure,
  type ProjectFileCommandFailure,
} from './projectFileFailure.ts'
import {
  isProjectPackageCommandFailure,
  type ProjectPackageCommandFailure,
} from './packageProjectFile.ts'

export const LEGACY_SOURCE_PATH_HEADER_NAME =
  'x-sbls-legacy-source-path-v1'
export const PROJECT_PACKAGE_WRITE_REQUEST_MAGIC = 'SBLSPSV1'
export const MAX_PROJECT_PACKAGE_PLAN_BYTES = 2_097_152
export const MAX_PROJECT_PACKAGE_JSON_BYTES = 16_777_216
export const MAX_PROJECT_PACKAGE_WRITE_REQUEST_BYTES =
  16 + MAX_PROJECT_PACKAGE_PLAN_BYTES + MAX_PROJECT_PACKAGE_JSON_BYTES

export type ProjectPackageDestinationFailure = Readonly<{
  status: 'failure'
  code:
    | 'project.package.destination-extension-invalid'
    | 'project.legacy-conversion.destination-conflicts-source'
  recoverable: true
  message:
    | 'The package destination must end in .sbls.'
    | 'The package destination must be different from the legacy project source.'
  cause: Readonly<{
    stage: 'destination-validation' | 'destination-identity'
  }>
}>

export type ProjectPackageWriteFailure =
  | ProjectFileCommandFailure
  | ProjectPackageCommandFailure
  | ProjectPackageDestinationFailure

export type ProjectPackageWritePort = Readonly<{
  encodeAndWrite(input: Readonly<{
    destinationPath: string
    legacySourcePath: string | null
    normalizedProject: SavedProject
    capturePlan: ProjectPackageCapturePlanV1
  }>): Promise<ProjectFileCommandSuccess>
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
}

export function isProjectPackageDestinationFailure(
  value: unknown,
): value is ProjectPackageDestinationFailure {
  return isRecord(value) && hasExactKeys(
    value,
    ['status', 'code', 'recoverable', 'message', 'cause'],
  ) && value.status === 'failure' && value.recoverable === true &&
    isRecord(value.cause) && hasExactKeys(value.cause, ['stage']) &&
    ((value.code === 'project.package.destination-extension-invalid' &&
      value.message === 'The package destination must end in .sbls.' &&
      value.cause.stage === 'destination-validation') ||
      (value.code === 'project.legacy-conversion.destination-conflicts-source' &&
        value.message ===
          'The package destination must be different from the legacy project source.' &&
        value.cause.stage === 'destination-identity'))
}

export function createProjectPackageDestinationFailure(
  code: ProjectPackageDestinationFailure['code'],
): ProjectPackageDestinationFailure {
  const extension = code === 'project.package.destination-extension-invalid'
  return Object.freeze({
    status: 'failure',
    code,
    recoverable: true,
    message: extension
      ? 'The package destination must end in .sbls.'
      : 'The package destination must be different from the legacy project source.',
    cause: Object.freeze({
      stage: extension ? 'destination-validation' : 'destination-identity',
    }),
  } as ProjectPackageDestinationFailure)
}

function isSuccess(value: unknown): value is ProjectFileCommandSuccess {
  return isRecord(value) && hasExactKeys(value, ['status']) &&
    value.status === 'success'
}

function utf8Length(value: string): number {
  let length = 0
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x7f) length += 1
    else if (code <= 0x7ff) length += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        length += 4
        index += 1
      } else {
        length += 3
      }
    } else length += 3
  }
  return length
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, false)
}

function encodeIntoExact(
  encoder: TextEncoder,
  value: string,
  destination: Uint8Array,
) {
  const result = encoder.encodeInto(value, destination)
  if (result.read !== value.length || result.written !== destination.length) {
    throw new RangeError('The package request could not be encoded exactly.')
  }
}

/**
 * Encodes the narrowly versioned raw request without creating intermediate
 * plan/project byte arrays. The immutable project is serialized once and each
 * UTF-8 payload is written directly into its final request span.
 */
export function createProjectPackageWriteRequest(
  normalizedProject: SavedProject,
  capturePlan: ProjectPackageCapturePlanV1,
): Uint8Array {
  const planJson = JSON.stringify(capturePlan)
  const projectJson = JSON.stringify(normalizedProject)
  const planLength = utf8Length(planJson)
  const projectLength = utf8Length(projectJson)
  if (planLength > MAX_PROJECT_PACKAGE_PLAN_BYTES ||
    projectLength > MAX_PROJECT_PACKAGE_JSON_BYTES) {
    throw createProjectFileCommandFailure(
      'project.file-too-large',
      'size-limit-exceeded',
      'project-package-write-request',
    )
  }
  const totalLength = 16 + planLength + projectLength
  if (totalLength > MAX_PROJECT_PACKAGE_WRITE_REQUEST_BYTES) {
    throw createProjectFileCommandFailure(
      'project.file-too-large',
      'size-limit-exceeded',
      'project-package-write-request',
    )
  }

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(totalLength)
  } catch {
    throw createProjectFileCommandFailure(
      'project.write-failed',
      'allocation-denied',
      'project-package-write-request',
    )
  }
  const encoder = new TextEncoder()
  encodeIntoExact(
    encoder,
    PROJECT_PACKAGE_WRITE_REQUEST_MAGIC,
    bytes.subarray(0, 8),
  )
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  writeUint32(view, 8, planLength)
  writeUint32(view, 12, projectLength)
  encodeIntoExact(encoder, planJson, bytes.subarray(16, 16 + planLength))
  encodeIntoExact(
    encoder,
    projectJson,
    bytes.subarray(16 + planLength),
  )
  return bytes
}

function normalizeRejection(value: unknown): ProjectPackageWriteFailure {
  if (isProjectFileCommandFailure(value) ||
    isProjectPackageCommandFailure(value) ||
    isProjectPackageDestinationFailure(value)) return value
  return createProjectFileCommandFailure(
    'project.write-failed',
    'transport-rejection-invalid',
    'project-package-write-invoke',
  )
}

export function createProjectPackageWritePort(
  invokeCommand: RawBinaryInvoke = invoke,
): ProjectPackageWritePort {
  return Object.freeze({
    async encodeAndWrite(input) {
      try {
        const body = createProjectPackageWriteRequest(
          input.normalizedProject,
          input.capturePlan,
        )
        const headers: Record<string, string> = {
          [PROJECT_PATH_HEADER_NAME]: encodeBinaryProjectPath(
            input.destinationPath,
            'write',
          ),
        }
        if (input.legacySourcePath !== null) {
          headers[LEGACY_SOURCE_PATH_HEADER_NAME] = encodeBinaryProjectPath(
            input.legacySourcePath,
            'write',
          )
        }
        const response = await invokeCommand<unknown>(
          'encode_and_write_project_package_file',
          body,
          Object.freeze({ headers: Object.freeze(headers) }),
        )
        if (!isSuccess(response)) {
          throw createProjectFileCommandFailure(
            'project.write-failed',
            'success-response-invalid',
            'project-package-write-response',
          )
        }
        return Object.freeze({ status: 'success' })
      } catch (error) {
        throw normalizeRejection(error)
      }
    },
  })
}

const projectPackageWritePort = createProjectPackageWritePort()

export function encodeAndWriteProjectPackageFile(input: Parameters<
  ProjectPackageWritePort['encodeAndWrite']
>[0]): Promise<ProjectFileCommandSuccess> {
  return projectPackageWritePort.encodeAndWrite(input)
}
