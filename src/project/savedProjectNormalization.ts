import type { BackgroundImageSize } from './projectTypes.ts'

export type JsonRecord = Record<string, unknown>

export function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null
}

export function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

export function normalizeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export function normalizeTextValue(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

export function normalizeNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function normalizePositiveNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback
}

export function normalizeImageSize(value: unknown): BackgroundImageSize | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const width = normalizePositiveNumber(record.width, 0)
  const height = normalizePositiveNumber(record.height, 0)

  return width > 0 && height > 0 ? { width, height } : null
}
