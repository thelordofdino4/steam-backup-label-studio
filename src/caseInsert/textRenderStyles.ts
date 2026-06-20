import {
  hexToRgba,
  type CaseInsertTextStyle,
} from './textStyles.ts'

export const CASE_INSERT_TEXT_STROKE_COLOR = 'rgba(0, 0, 0, 0.78)'
export const CASE_INSERT_TEXT_SHADOW_COLOR = 'rgba(0, 0, 0, 0.8)'

export function caseInsertTextUsesStroke(style: CaseInsertTextStyle) {
  return style.contrast === 'stroke' || style.contrast === 'strokeShadow'
}

export function caseInsertTextUsesShadow(style: CaseInsertTextStyle) {
  return style.contrast === 'shadow' || style.contrast === 'strokeShadow'
}

export function getCaseInsertTextBackgroundColor(
  style: CaseInsertTextStyle,
) {
  return style.backgroundEnabled
    ? hexToRgba(style.backgroundColor, style.backgroundOpacity)
    : 'transparent'
}

export function getCaseInsertTextBorderColor(style: CaseInsertTextStyle) {
  return style.backgroundEnabled && style.borderEnabled
    ? hexToRgba(style.borderColor, 0.86)
    : 'transparent'
}

export function getCaseInsertTextBorderCss(style: CaseInsertTextStyle) {
  return style.backgroundEnabled && style.borderEnabled
    ? `1px solid ${getCaseInsertTextBorderColor(style)}`
    : '0'
}

export function getCaseInsertTextShadowCss(style: CaseInsertTextStyle) {
  return caseInsertTextUsesShadow(style)
    ? `0 0.14cqw 0.28cqw ${CASE_INSERT_TEXT_SHADOW_COLOR}`
    : 'none'
}

export function getCaseInsertTextStrokeCss(style: CaseInsertTextStyle) {
  return caseInsertTextUsesStroke(style)
    ? `0.08cqw ${CASE_INSERT_TEXT_STROKE_COLOR}`
    : undefined
}

export function getCaseInsertTextPaddingCss(style: CaseInsertTextStyle) {
  const blockPadding = Math.max(0, style.backgroundPadding * 0.55)
  const inlinePadding = Math.max(0, style.backgroundPadding * 0.82)

  return `${blockPadding}cqw ${inlinePadding}cqw`
}

export function getCaseInsertTextLayoutPaddingRatio(
  style: CaseInsertTextStyle,
) {
  return style.backgroundEnabled
    ? Math.max(0, style.backgroundPadding * 0.68)
    : 0
}

export function getCaseInsertTextPaintSlackPx(
  style: CaseInsertTextStyle,
  fontSizePx: number,
) {
  const strokeSlack = caseInsertTextUsesStroke(style) ? fontSizePx * 0.08 : 0
  const shadowSlack = caseInsertTextUsesShadow(style) ? fontSizePx * 0.42 : 0

  return Math.max(strokeSlack, shadowSlack)
}

export function getCaseInsertTextBorderRadiusCss(style: CaseInsertTextStyle) {
  return `${Math.max(0, style.borderRadius)}cqw`
}
