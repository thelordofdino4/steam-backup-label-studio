import { invoke } from '@tauri-apps/api/core'

import {
  createBinaryProjectRequestOptions,
  type RawBinaryInvoke,
} from './binaryProjectFile.ts'
import {
  createProjectFileCommandFailure,
  isProjectFileCommandFailure,
  type ProjectFileCommandFailure,
} from './projectFileFailure.ts'

export const PROJECT_RECOGNIZED_FILE_FORMATS = Object.freeze([
  'legacy-json',
  'sbls-package-v1',
] as const)

export type ProjectRecognizedFileFormat =
  typeof PROJECT_RECOGNIZED_FILE_FORMATS[number]

export type ProjectFormatRecognitionFailure = Readonly<{
  status: 'failure'
  code: 'project.format.unsupported'
  recoverable: true
  message: 'The selected file is not a supported project format.'
  cause: Readonly<{ stage: 'content-recognition' }>
}>

export type ProjectFormatRecognitionPort = Readonly<{
  recognize(path: string): Promise<ProjectRecognizedFileFormat>
}>

type ProjectFormatRecognitionSuccess = Readonly<{
  status: 'success'
  format: ProjectRecognizedFileFormat
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

function isProjectRecognizedFileFormat(
  value: unknown,
): value is ProjectRecognizedFileFormat {
  return typeof value === 'string' &&
    PROJECT_RECOGNIZED_FILE_FORMATS.includes(
      value as ProjectRecognizedFileFormat,
    )
}

function isProjectFormatRecognitionSuccess(
  value: unknown,
): value is ProjectFormatRecognitionSuccess {
  return isRecord(value) &&
    hasExactKeys(value, ['status', 'format']) &&
    value.status === 'success' &&
    isProjectRecognizedFileFormat(value.format)
}

export function isProjectFormatRecognitionFailure(
  value: unknown,
): value is ProjectFormatRecognitionFailure {
  return isRecord(value) &&
    hasExactKeys(
      value,
      ['status', 'code', 'recoverable', 'message', 'cause'],
    ) &&
    value.status === 'failure' &&
    value.code === 'project.format.unsupported' &&
    value.recoverable === true &&
    value.message === 'The selected file is not a supported project format.' &&
    isRecord(value.cause) &&
    hasExactKeys(value.cause, ['stage']) &&
    value.cause.stage === 'content-recognition'
}

export function createProjectFormatRecognitionFailure(): ProjectFormatRecognitionFailure {
  return Object.freeze({
    status: 'failure',
    code: 'project.format.unsupported',
    recoverable: true,
    message: 'The selected file is not a supported project format.',
    cause: Object.freeze({ stage: 'content-recognition' }),
  })
}

function normalizeRecognitionRejection(
  value: unknown,
): ProjectFileCommandFailure | ProjectFormatRecognitionFailure {
  if (isProjectFileCommandFailure(value) ||
    isProjectFormatRecognitionFailure(value)) {
    return value
  }
  return createProjectFileCommandFailure(
    'project.read-failed',
    'transport-rejection-invalid',
    'project-format-recognition-invoke',
  )
}

export function createProjectFormatRecognitionPort(
  invokeCommand: RawBinaryInvoke = invoke,
): ProjectFormatRecognitionPort {
  return Object.freeze({
    async recognize(path: string): Promise<ProjectRecognizedFileFormat> {
      try {
        const response = await invokeCommand<unknown>(
          'recognize_project_file_format',
          new Uint8Array(0),
          createBinaryProjectRequestOptions(path, 'read'),
        )
        if (!isProjectFormatRecognitionSuccess(response)) {
          throw createProjectFileCommandFailure(
            'project.read-failed',
            'success-response-invalid',
            'project-format-recognition-response',
          )
        }
        return response.format
      } catch (error) {
        throw normalizeRecognitionRejection(error)
      }
    },
  })
}

const projectFormatRecognitionPort = createProjectFormatRecognitionPort()

export function recognizeProjectFileFormat(
  path: string,
): Promise<ProjectRecognizedFileFormat> {
  return projectFormatRecognitionPort.recognize(path)
}
