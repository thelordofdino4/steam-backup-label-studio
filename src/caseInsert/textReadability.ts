import type { JewelCasePixelRect } from '../layout/jewelCaseLayout.ts'
import type {
  ProjectCaseInsertTextBlock,
} from '../project/projectTypes.ts'

export type CaseInsertBackTextBlockRole =
  | 'description'
  | 'minimumRequirements'
  | 'recommendedRequirements'
  | 'legalText'

export type CaseInsertTextReadabilityRole =
  | 'callout'
  | 'description'
  | 'features'
  | 'requirements'
  | 'legal'
  | 'spine'

export type CaseInsertTextLayout = {
  bounds: JewelCasePixelRect
  reservedBounds?: JewelCasePixelRect
  fontSizePx: number
  lineHeightPx: number
}

export type CaseInsertTextFitEstimate = {
  maxCharactersPerLine: number
  maxLines: number
  requiredLines: number
  fillRatio: number
}

type TextWarningOptions = {
  minReadableFontSizePx: number
  textKind: string
}

const TEXT_WARNING_OPTIONS_BY_ROLE: Record<
  CaseInsertTextReadabilityRole,
  TextWarningOptions
> = {
  callout: { minReadableFontSizePx: 24, textKind: 'custom note text' },
  description: { minReadableFontSizePx: 18, textKind: 'description text' },
  features: { minReadableFontSizePx: 18, textKind: 'feature text' },
  requirements: { minReadableFontSizePx: 14, textKind: 'requirements text' },
  legal: { minReadableFontSizePx: 10, textKind: 'legal text' },
  spine: { minReadableFontSizePx: 18, textKind: 'game title text' },
}

const TEXT_CROWDING_THRESHOLD = 0.9

export function getCaseInsertBackTextBlockRole(
  textBlock: Pick<ProjectCaseInsertTextBlock, 'id'>,
): CaseInsertBackTextBlockRole {
  if (textBlock.id.includes('minimum')) return 'minimumRequirements'
  if (textBlock.id.includes('recommended')) return 'recommendedRequirements'
  if (textBlock.id.includes('legal') || textBlock.id.includes('copyright')) {
    return 'legalText'
  }

  return 'description'
}

export function getCaseInsertBackTextBlockReadabilityRole(
  role: CaseInsertBackTextBlockRole,
): CaseInsertTextReadabilityRole {
  if (role === 'legalText') return 'legal'
  if (role === 'minimumRequirements' || role === 'recommendedRequirements') {
    return 'requirements'
  }

  return 'description'
}

export function getCaseInsertTextReadabilityWarnings(params: {
  label: string
  text: string
  layout: CaseInsertTextLayout
  role: CaseInsertTextReadabilityRole
}) {
  const options = TEXT_WARNING_OPTIONS_BY_ROLE[params.role]
  const warnings: string[] = []

  if (params.layout.fontSizePx < options.minReadableFontSizePx) {
    warnings.push(
      `${params.label} uses ${formatPixels(params.layout.fontSizePx)}px ${options.textKind}, which may be too small to read at print size.`,
    )
  }

  const textFit = estimateCaseInsertTextFit(params.text, params.layout)

  if (textFit.requiredLines > textFit.maxLines) {
    warnings.push(
      `${params.label} may overflow its text box (${textFit.requiredLines} estimated lines for ${textFit.maxLines} visible lines) and can be clipped.`,
    )
  } else if (textFit.fillRatio >= TEXT_CROWDING_THRESHOLD) {
    warnings.push(
      `${params.label} nearly fills its text box and may look crowded in print.`,
    )
  }

  return warnings
}

export function estimateCaseInsertTextFit(
  text: string,
  layout: CaseInsertTextLayout,
): CaseInsertTextFitEstimate {
  const padding = Math.max(2, Math.round(layout.fontSizePx * 0.55))
  const innerWidth = Math.max(1, layout.bounds.width - padding * 2)
  const innerHeight = Math.max(1, layout.bounds.height - padding * 2)
  const maxLines = Math.max(1, Math.floor(innerHeight / layout.lineHeightPx))
  const averageCharacterWidth = Math.max(1, layout.fontSizePx * 0.56)
  const maxCharactersPerLine = Math.max(
    1,
    Math.floor(innerWidth / averageCharacterWidth),
  )
  const requiredLines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .reduce(
      (lineCount, line) =>
        lineCount + estimateLineCount(line, maxCharactersPerLine),
      0,
    )
  const normalizedRequiredLines = Math.max(1, requiredLines)

  return {
    maxCharactersPerLine,
    maxLines,
    requiredLines: normalizedRequiredLines,
    fillRatio: normalizedRequiredLines / maxLines,
  }
}

function estimateLineCount(line: string, maxCharactersPerLine: number) {
  const words = line.split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return 1
  }

  let lines = 1
  let currentLineLength = 0

  for (const word of words) {
    if (word.length > maxCharactersPerLine) {
      if (currentLineLength > 0) {
        lines += 1
      }

      const segmentCount = Math.max(1, Math.ceil(word.length / maxCharactersPerLine))
      lines += segmentCount - 1
      currentLineLength = word.length % maxCharactersPerLine || maxCharactersPerLine
    } else {
      const candidateLength = currentLineLength === 0
        ? word.length
        : currentLineLength + 1 + word.length

      if (candidateLength > maxCharactersPerLine) {
        lines += 1
        currentLineLength = word.length
      } else {
        currentLineLength = candidateLength
      }
    }
  }

  return lines
}

function formatPixels(value: number) {
  return String(Math.round(value))
}
