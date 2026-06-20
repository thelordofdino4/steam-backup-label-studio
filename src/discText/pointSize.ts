import type { DiscTextKey, DiscTextLayout } from './types.ts'
import { DISC_TEXT_RENDER_STYLES } from './styles.ts'
import type { DiscTemplate } from '../types/template.ts'
import {
  DEFAULT_TEMPLATE_EXPORT_DPI,
  TEMPLATE_MM_PER_INCH,
} from '../templates/templateModel.ts'

export const DISC_TEXT_POINT_SIZE_MIN = 1
export const DISC_TEXT_POINT_SIZE_MAX = 96
export const DISC_TEXT_POINT_SIZE_STEP = 0.25

export const DISC_TEXT_POINT_SIZE_PRESETS = [
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

function clampPointSize(value: number) {
  return Math.min(
    DISC_TEXT_POINT_SIZE_MAX,
    Math.max(DISC_TEXT_POINT_SIZE_MIN, value),
  )
}

export function getDiscTemplateExportDpi(template?: DiscTemplate) {
  if (!template || !Number.isFinite(template.outerDiameterMm) || template.outerDiameterMm <= 0) {
    return DEFAULT_TEMPLATE_EXPORT_DPI
  }

  const exportDiameterPx = Math.round(
    (template.outerDiameterMm / TEMPLATE_MM_PER_INCH) *
      DEFAULT_TEMPLATE_EXPORT_DPI,
  )

  return exportDiameterPx / (template.outerDiameterMm / TEMPLATE_MM_PER_INCH)
}

export function discTextPointSizeToExportPx(
  pointSizePt: number,
  template?: DiscTemplate,
) {
  return (pointSizePt * getDiscTemplateExportDpi(template)) / 72
}

export function discTextExportPxToPointSize(
  exportPx: number,
  template?: DiscTemplate,
) {
  return (exportPx * 72) / getDiscTemplateExportDpi(template)
}

export function discTextExportPxToSvgPercent(
  exportPx: number,
  template?: DiscTemplate,
) {
  const templateDpi = getDiscTemplateExportDpi(template)
  const outerDiameterMm = template?.outerDiameterMm ?? 120
  const exportDiameterPx = (outerDiameterMm / TEMPLATE_MM_PER_INCH) * templateDpi

  return (exportPx / exportDiameterPx) * 100
}

export function discTextPointSizeToSvgPercent(
  pointSizePt: number,
  template?: DiscTemplate,
) {
  return discTextExportPxToSvgPercent(
    discTextPointSizeToExportPx(pointSizePt, template),
    template,
  )
}

export function getDefaultDiscTextPointSize(
  key: DiscTextKey,
  scale = 1,
  template?: DiscTemplate,
  mode: DiscTextLayout['mode'] = 'straight',
) {
  const fontSizePercent =
    key === 'copyright' && mode === 'curved'
      ? 1.55 * Math.max(scale, 0.72)
      : DISC_TEXT_RENDER_STYLES[key].fontSizePercent * Math.max(0, scale)

  return clampPointSize(
    discTextExportPxToPointSize(
      fontSizePercent *
        ((template?.outerDiameterMm ?? 120) / TEMPLATE_MM_PER_INCH) *
        getDiscTemplateExportDpi(template) /
        100,
      template,
    ),
  )
}

export function normalizeDiscTextPointSize(
  pointSizePt: unknown,
  key: DiscTextKey,
  layout: Pick<DiscTextLayout, 'mode' | 'scale'>,
  template?: DiscTemplate,
) {
  if (typeof pointSizePt === 'number' && Number.isFinite(pointSizePt)) {
    return clampPointSize(pointSizePt)
  }

  return getDefaultDiscTextPointSize(key, layout.scale, template, layout.mode)
}

export function getResolvedDiscTextFontSizePercent(
  layout: Pick<DiscTextLayout, 'fontSizePt' | 'mode' | 'scale'>,
  key: DiscTextKey,
  template?: DiscTemplate,
) {
  return discTextPointSizeToSvgPercent(
    normalizeDiscTextPointSize(layout.fontSizePt, key, layout, template),
    template,
  )
}
