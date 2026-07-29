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

// Derived from the package-v1 maxima used by the codec's per-operation
// canonical-output envelope: 16 MiB project input + 256 MiB hydrated data-URL
// fan-out + two quote bytes for 4,096 bindings + the worst-case 23-byte growth
// for at most one source number token per project-input byte.
export const MAX_PACKAGE_HYDRATED_JSON_BYTES = 671_096_832

export const PROJECT_PACKAGE_FAILURE_REGISTRY = Object.freeze({
  'project.file-too-large': Object.freeze({
    recoverable: true,
    message: 'The project input exceeds the supported size limit.',
  }),
  'project.format.unsupported': Object.freeze({
    recoverable: true,
    message: 'The input is not a supported project package.',
  }),
  'project.package.version-unsupported': Object.freeze({
    recoverable: false,
    message: 'This project package version is not supported.',
  }),
  'project.package.archive-too-large': Object.freeze({
    recoverable: true,
    message: 'The project package archive is too large.',
  }),
  'project.package.resource-limit-exceeded': Object.freeze({
    recoverable: true,
    message: 'The project package exceeds a supported resource limit.',
  }),
  'project.package.archive-invalid': Object.freeze({
    recoverable: true,
    message: 'The project package archive is invalid.',
  }),
  'project.package.entry-path-invalid': Object.freeze({
    recoverable: true,
    message: 'The project package contains an invalid archive entry.',
  }),
  'project.package.manifest-invalid': Object.freeze({
    recoverable: true,
    message: 'The project package manifest is invalid.',
  }),
  'project.package.project-missing': Object.freeze({
    recoverable: true,
    message: 'The project package is missing its project data.',
  }),
  'project.package.project-digest-mismatch': Object.freeze({
    recoverable: true,
    message: 'The packaged project data failed its integrity check.',
  }),
  'project.package.asset-missing': Object.freeze({
    recoverable: true,
    message: 'The project package is missing a required asset.',
  }),
  'project.package.asset-digest-mismatch': Object.freeze({
    recoverable: true,
    message: 'A packaged asset failed its integrity check.',
  }),
  'project.package.asset-hash-collision': Object.freeze({
    recoverable: false,
    message: 'Two different assets produced the same package identity.',
  }),
  'project.package.asset-type-invalid': Object.freeze({
    recoverable: true,
    message: 'A packaged image has invalid or inconsistent data.',
  }),
  'project.package.asset-type-unsupported': Object.freeze({
    recoverable: true,
    message: 'A required image format is not supported by package version 1.',
  }),
  'project.package.asset-jpeg-profile-unsupported': Object.freeze({
    recoverable: true,
    message: 'A JPEG image uses a profile not supported by package version 1.',
  }),
  'project.package.asset-bmp-profile-unsupported': Object.freeze({
    recoverable: true,
    message: 'A BMP image uses a profile not supported by package version 1.',
  }),
  'project.package.asset-dimensions-invalid': Object.freeze({
    recoverable: true,
    message: 'A packaged image has invalid or inconsistent dimensions.',
  }),
  'project.package.binding-invalid': Object.freeze({
    recoverable: true,
    message: 'The project package contains an invalid asset binding.',
  }),
  'project.package.binding-conflict': Object.freeze({
    recoverable: true,
    message: 'The project package contains conflicting asset bindings.',
  }),
  'project.package.binding-unresolved': Object.freeze({
    recoverable: true,
    message: 'The project package contains an unresolved asset binding.',
  }),
  'project.package.built-in-unavailable': Object.freeze({
    recoverable: false,
    message: 'A required built-in asset is unavailable in this application version.',
  }),
  'project.package.built-in-capture-required': Object.freeze({
    recoverable: true,
    message: 'A built-in asset must be captured before this project can be packaged.',
  }),
  'project.package.hydrated-json-invalid': Object.freeze({
    recoverable: true,
    message: 'The hydrated project data is invalid or exceeds supported limits.',
  }),
  'project.schema.unsupported': Object.freeze({
    recoverable: false,
    message: 'This project schema version is not supported.',
  }),
  'project.package.asset-capture-failed': Object.freeze({
    recoverable: true,
    message: 'A required project asset could not be captured safely.',
  }),
  'project.package.encode-failed': Object.freeze({
    recoverable: true,
    message: 'The project package could not be encoded.',
  }),
} as const)

export const PROJECT_PACKAGE_FAILURE_STAGES = Object.freeze([
  'raw-input',
  'archive-envelope',
  'entry-inventory',
  'manifest',
  'project',
  'asset-capture',
  'asset-validation',
  'binding-hydration',
  'encoding',
] as const)

export type ProjectPackageFailureCode =
  keyof typeof PROJECT_PACKAGE_FAILURE_REGISTRY
export type ProjectPackageFailureStage =
  typeof PROJECT_PACKAGE_FAILURE_STAGES[number]

export type ProjectPackageCommandFailure = Readonly<{
  status: 'failure'
  code: ProjectPackageFailureCode
  recoverable: boolean
  message: string
  cause: Readonly<{ stage: ProjectPackageFailureStage }>
}>

export type PackageProjectFileFailure =
  | ProjectFileCommandFailure
  | ProjectPackageCommandFailure

export type PackageProjectFilePort = Readonly<{
  decode(path: string): Promise<Uint8Array>
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index])
}

function isProjectPackageFailureStage(
  value: unknown,
): value is ProjectPackageFailureStage {
  return typeof value === 'string' &&
    PROJECT_PACKAGE_FAILURE_STAGES.includes(value as ProjectPackageFailureStage)
}

export function isProjectPackageCommandFailure(
  value: unknown,
): value is ProjectPackageCommandFailure {
  if (!isRecord(value) || !hasExactKeys(
    value,
    ['status', 'code', 'recoverable', 'message', 'cause'],
  )) {
    return false
  }
  if (value.status !== 'failure' || typeof value.code !== 'string' ||
    !(value.code in PROJECT_PACKAGE_FAILURE_REGISTRY)) {
    return false
  }
  const definition = PROJECT_PACKAGE_FAILURE_REGISTRY[
    value.code as ProjectPackageFailureCode
  ]
  if (value.recoverable !== definition.recoverable ||
    value.message !== definition.message || !isRecord(value.cause) ||
    !hasExactKeys(value.cause, ['stage'])) {
    return false
  }
  return isProjectPackageFailureStage(value.cause.stage)
}

export function createProjectPackageCommandFailure(
  code: ProjectPackageFailureCode,
  stage: ProjectPackageFailureStage,
): ProjectPackageCommandFailure {
  const definition = PROJECT_PACKAGE_FAILURE_REGISTRY[code]
  return Object.freeze({
    status: 'failure',
    code,
    recoverable: definition.recoverable,
    message: definition.message,
    cause: Object.freeze({ stage }),
  })
}

function normalizePackageRejection(value: unknown): PackageProjectFileFailure {
  if (isProjectFileCommandFailure(value) ||
    isProjectPackageCommandFailure(value)) {
    return value
  }
  return createProjectFileCommandFailure(
    'project.read-failed',
    'transport-rejection-invalid',
    'project-package-decode-invoke',
  )
}

export function createPackageProjectFilePort(
  invokeCommand: RawBinaryInvoke = invoke,
  maximumHydratedBytes: number = MAX_PACKAGE_HYDRATED_JSON_BYTES,
): PackageProjectFilePort {
  if (!Number.isSafeInteger(maximumHydratedBytes) ||
    maximumHydratedBytes < 0 ||
    maximumHydratedBytes > MAX_PACKAGE_HYDRATED_JSON_BYTES) {
    throw new RangeError(
      'Package hydration limit must not exceed the derived v1 response cap.',
    )
  }

  return Object.freeze({
    async decode(path: string): Promise<Uint8Array> {
      try {
        const response = await invokeCommand<ArrayBuffer>(
          'decode_project_package_file',
          new Uint8Array(0),
          createBinaryProjectRequestOptions(path, 'read'),
        )
        if (!(response instanceof ArrayBuffer)) {
          throw createProjectFileCommandFailure(
            'project.read-failed',
            'raw-response-required',
            'project-package-decode-response',
          )
        }
        if (response.byteLength > maximumHydratedBytes) {
          throw createProjectPackageCommandFailure(
            'project.package.resource-limit-exceeded',
            'binding-hydration',
          )
        }
        return new Uint8Array(response)
      } catch (error) {
        throw normalizePackageRejection(error)
      }
    },
  })
}

export function decodeProjectPackageFile(path: string): Promise<Uint8Array> {
  return createPackageProjectFilePort().decode(path)
}
