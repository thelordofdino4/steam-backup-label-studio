import {
  DEFAULT_TEMPLATE_EXPORT_DPI,
} from '../templates/templateModel.ts'
import {
  clampLayoutNumber,
} from '../layout/layoutRangeMath.ts'
import type {
  ProjectCaseInsertLayout,
} from '../project/projectTypes.ts'

export const CASE_INSERT_TEXT_FONT_SIZE_PT_PRESETS = [
  8,
  9,
  10,
  11,
  12,
  14,
  16,
  18,
  20,
  22,
  24,
  26,
  28,
  32,
  36,
  40,
  48,
  54,
  60,
  66,
  72,
] as const

export const CASE_INSERT_TEXT_FONT_SIZE_PT_MIN = 6
export const CASE_INSERT_TEXT_FONT_SIZE_PT_MAX = 96
export const DEFAULT_CASE_INSERT_TEXT_FONT_SIZE_PT = 12
export const DEFAULT_SPINE_TITLE_FONT_SIZE_PT = 16

export type CaseInsertTextSizeRole =
  | 'coverTitle'
  | 'coverSubtitle'
  | 'coverCallout'
  | 'coverLegal'
  | 'trayTitle'
  | 'traySubtitle'
  | 'trayMetadata'
  | 'trayDescription'
  | 'trayRequirements'
  | 'trayFeatures'
  | 'trayLegal'
  | 'spineTitle'
  | 'spineSecondary'
  | 'spineLegal'

const DEFAULT_FONT_SIZE_PT_BY_ROLE: Record<CaseInsertTextSizeRole, number> = {
  coverTitle: 36,
  coverSubtitle: 20,
  coverCallout: 14,
  coverLegal: 8,
  trayTitle: 24,
  traySubtitle: 16,
  trayMetadata: 12,
  trayDescription: 12,
  trayRequirements: 10,
  trayFeatures: 12,
  trayLegal: 8,
  spineTitle: DEFAULT_SPINE_TITLE_FONT_SIZE_PT,
  spineSecondary: 10,
  spineLegal: 8,
}

// Approximate the old export-pixel scale model for loading projects saved before
// explicit point sizes existed. New defaults use DEFAULT_FONT_SIZE_PT_BY_ROLE.
const LEGACY_SCALE_BASE_PT_BY_ROLE: Record<CaseInsertTextSizeRole, number> = {
  coverTitle: 20,
  coverSubtitle: 11,
  coverCallout: 13,
  coverLegal: 4.2,
  trayTitle: 7.2,
  traySubtitle: 7.2,
  trayMetadata: 7.2,
  trayDescription: 7.2,
  trayRequirements: 4.8,
  trayFeatures: 6.4,
  trayLegal: 3.6,
  spineTitle: 7.7,
  spineSecondary: 7.7,
  spineLegal: 7.7,
}

export function normalizeCaseInsertFontSizePt(
  value: unknown,
  fallback = DEFAULT_CASE_INSERT_TEXT_FONT_SIZE_PT,
) {
  const normalizedFallback = clampLayoutNumber(
    fallback,
    CASE_INSERT_TEXT_FONT_SIZE_PT_MIN,
    CASE_INSERT_TEXT_FONT_SIZE_PT_MAX,
  )

  return typeof value === 'number' && Number.isFinite(value)
    ? clampLayoutNumber(
        value,
        CASE_INSERT_TEXT_FONT_SIZE_PT_MIN,
        CASE_INSERT_TEXT_FONT_SIZE_PT_MAX,
      )
    : normalizedFallback
}

export function caseInsertFontSizePtToExportPx(
  fontSizePt: number,
  exportDpi = DEFAULT_TEMPLATE_EXPORT_DPI,
) {
  return normalizeCaseInsertFontSizePt(fontSizePt) * exportDpi / 72
}

export function caseInsertExportPxToFontSizePt(
  fontSizePx: number,
  exportDpi = DEFAULT_TEMPLATE_EXPORT_DPI,
) {
  return typeof fontSizePx === 'number' && Number.isFinite(fontSizePx)
    ? fontSizePx * 72 / exportDpi
    : DEFAULT_CASE_INSERT_TEXT_FONT_SIZE_PT
}

export function getDefaultCaseInsertFontSizePt(
  role: CaseInsertTextSizeRole,
) {
  return DEFAULT_FONT_SIZE_PT_BY_ROLE[role]
}

export function getCaseInsertLayoutFontSizePt(
  layout: Pick<ProjectCaseInsertLayout, 'fontSizePt'>,
  role: CaseInsertTextSizeRole,
) {
  return normalizeCaseInsertFontSizePt(
    layout.fontSizePt,
    getDefaultCaseInsertFontSizePt(role),
  )
}

export function getCaseInsertLayoutFontSizePx(
  layout: Pick<ProjectCaseInsertLayout, 'fontSizePt'>,
  role: CaseInsertTextSizeRole,
) {
  return caseInsertFontSizePtToExportPx(
    getCaseInsertLayoutFontSizePt(layout, role),
  )
}

export function getLegacyCaseInsertScaleFontSizePt(
  role: CaseInsertTextSizeRole,
  legacyScale: unknown,
  fallback = getDefaultCaseInsertFontSizePt(role),
) {
  if (typeof legacyScale !== 'number' || !Number.isFinite(legacyScale)) {
    return fallback
  }

  return normalizeCaseInsertFontSizePt(
    LEGACY_SCALE_BASE_PT_BY_ROLE[role] * legacyScale,
    fallback,
  )
}

export function getCaseInsertTextSizeRoleFromId(
  id: string,
  fallback: CaseInsertTextSizeRole = 'coverCallout',
): CaseInsertTextSizeRole {
  if (id.startsWith('cover-')) {
    if (id.endsWith('-title-text')) return 'coverTitle'
    if (id.endsWith('-subtitle-text')) return 'coverSubtitle'
    if (id.includes('legal') || id.includes('copyright')) return 'coverLegal'
    return 'coverCallout'
  }

  if (id.startsWith('tray-')) {
    if (id === 'tray-title-text') return 'trayTitle'
    if (id === 'tray-subtitle-text') return 'traySubtitle'
    if (id === 'tray-feature-bullets') return 'trayFeatures'
    if (id.includes('minimum') || id.includes('recommended')) {
      return 'trayRequirements'
    }
    if (id.includes('legal') || id.includes('copyright')) return 'trayLegal'
    if (id.includes('description')) return 'trayDescription'
    return 'trayMetadata'
  }

  if (id.includes('spine')) {
    if (id.endsWith('-title-text')) return 'spineTitle'
    if (id.includes('legal') || id.includes('copyright')) return 'spineLegal'
    return 'spineSecondary'
  }

  return fallback
}
