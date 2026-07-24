import {
  getDiscTextHtmlSource,
  isDiscTextHtmlEnabled,
} from './index.ts'
import type {
  DiscTextHtmlSources,
  DiscTextKey,
} from './types.ts'
import {
  parseHtmlText,
  type RichTextDocument,
  type RichTextRun,
} from '../text/htmlText.ts'
import { RICH_TEXT_BOLD_FONT_WEIGHT } from '../text/richTextWeights.ts'

export type DiscTextRenderableContent = Readonly<{
  plainText: string
  richText?: RichTextDocument
}>

type DiscTextMeasurementRun = {
  // Null means the run inherits that field. Because ambient style/template
  // values are deliberately outside this content-only comparison, an
  // inherited field remains distinct from an explicit value.
  fontFamily: string | null
  fontSize: number | null
  fontSizeUnit: 'pt' | 'px' | null
  fontStyle: 'normal' | 'italic' | null
  fontWeight: number | null
  text: string
}

function getMeasurementRun(run: RichTextRun): DiscTextMeasurementRun {
  const hasPointSize = typeof run.fontSizePt === 'number'
  const hasPixelSize = typeof run.fontSizePx === 'number'

  // Keep override precedence aligned with getDiscTextRunFontString in
  // straightTextWrapping.ts; these are relative fields, not ambient values.
  return {
    fontFamily: run.fontFamily ?? null,
    fontSize: hasPixelSize
      ? run.fontSizePx ?? null
      : hasPointSize
        ? run.fontSizePt ?? null
        : null,
    fontSizeUnit: hasPixelSize ? 'px' : hasPointSize ? 'pt' : null,
    fontStyle: run.italic ? 'italic' : run.fontStyle ?? null,
    fontWeight: run.bold
      ? RICH_TEXT_BOLD_FONT_WEIGHT
      : run.fontWeight ?? null,
    text: run.text,
  }
}

function measurementRunFontsEqual(
  first: DiscTextMeasurementRun,
  second: DiscTextMeasurementRun,
) {
  return first.fontFamily === second.fontFamily &&
    first.fontSize === second.fontSize &&
    first.fontSizeUnit === second.fontSizeUnit &&
    first.fontStyle === second.fontStyle &&
    first.fontWeight === second.fontWeight
}

function getMeasurementTokens(
  runs: readonly RichTextRun[],
  fallbackText: string,
) {
  const sourceRuns = runs.length > 0
    ? runs
    : fallbackText
      ? [{ text: fallbackText }]
      : []
  const measurementTokens: DiscTextMeasurementRun[] = []

  for (const run of sourceRuns) {
    // Keep token boundaries aligned with straightTextWrapping.ts. Even a
    // paint-only run split inside a word can create a different wrap point.
    for (const text of run.text.match(/\s+|\S+/g) ?? []) {
      measurementTokens.push(getMeasurementRun({ ...run, text }))
    }
  }

  return measurementTokens
}

function getMeasurementLines(content: DiscTextRenderableContent) {
  if (!content.richText) {
    return content.plainText.split('\n').map((line) =>
      getMeasurementTokens([], line),
    )
  }

  return content.richText.lines.map((line) =>
    getMeasurementTokens(line.runs, line.text),
  )
}

function measurementLinesEqual(
  first: readonly DiscTextMeasurementRun[][],
  second: readonly DiscTextMeasurementRun[][],
) {
  if (first.length !== second.length) return false

  return first.every((firstLine, lineIndex) => {
    const secondLine = second[lineIndex]

    return firstLine.length === secondLine.length &&
      firstLine.every((firstRun, runIndex) => {
        const secondRun = secondLine[runIndex]

        return firstRun.text === secondRun.text &&
          measurementRunFontsEqual(firstRun, secondRun)
      })
  })
}

export function areDiscTextRenderableContentsMeasurementEquivalent(
  first: DiscTextRenderableContent,
  second: DiscTextRenderableContent,
) {
  if (first.plainText !== second.plainText) return false

  return measurementLinesEqual(
    getMeasurementLines(first),
    getMeasurementLines(second),
  )
}

export function getDiscTextRenderableContent({
  fallbackText,
  htmlSources,
  key,
}: Readonly<{
  fallbackText: string
  htmlSources: DiscTextHtmlSources
  key: DiscTextKey
}>): DiscTextRenderableContent {
  if (!isDiscTextHtmlEnabled(htmlSources, key)) {
    return Object.freeze({ plainText: fallbackText })
  }

  const richText = parseHtmlText(
    getDiscTextHtmlSource(htmlSources, key, fallbackText),
  )

  return Object.freeze({
    plainText: richText.plainText,
    richText,
  })
}
