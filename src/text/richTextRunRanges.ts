import {
  mergeAdjacentRichTextRuns,
  type RichTextLine,
  type RichTextRun,
} from './htmlText.ts'
import {
  clampPlainTextOffset,
} from './richTextSelectionRanges.ts'

export type RichTextRunStyle = Omit<RichTextRun, 'text'>

export function getRichTextRunStyle(
  run: RichTextRun | undefined,
): RichTextRunStyle {
  if (!run) return {}

  return Object.fromEntries(
    Object.entries(run).filter(
      ([key, value]) => key !== 'text' && value !== undefined,
    ),
  ) as RichTextRunStyle
}

export function createRichTextRun(
  text: string,
  style: RichTextRunStyle = {},
) {
  return {
    ...style,
    text,
  } satisfies RichTextRun
}

export function normalizeRichTextLine(
  line: RichTextLine,
  runs: RichTextRun[],
): RichTextLine {
  const mergedRuns = mergeAdjacentRichTextRuns(runs)
  const text = mergedRuns.map((run) => run.text).join('')

  return {
    ...line,
    runs: mergedRuns,
    text,
  }
}

export function splitRichTextRunsAtOffset(
  runs: readonly RichTextRun[],
  offset: number,
) {
  const beforeRuns: RichTextRun[] = []
  const afterRuns: RichTextRun[] = []
  let runStart = 0

  for (const run of runs) {
    const runEnd = runStart + run.text.length

    if (runEnd <= offset) {
      beforeRuns.push({ ...run })
    } else if (runStart >= offset) {
      afterRuns.push({ ...run })
    } else {
      const splitOffset = offset - runStart
      beforeRuns.push({ ...run, text: run.text.slice(0, splitOffset) })
      afterRuns.push({ ...run, text: run.text.slice(splitOffset) })
    }

    runStart = runEnd
  }

  return {
    afterRuns: mergeAdjacentRichTextRuns(afterRuns),
    beforeRuns: mergeAdjacentRichTextRuns(beforeRuns),
  }
}

export function splitRichTextLineAtOffset(
  line: RichTextLine,
  offset: number,
) {
  return splitRichTextRunsAtOffset(
    line.runs.length > 0
      ? line.runs
      : line.text
        ? [{ text: line.text }]
        : [],
    clampPlainTextOffset(offset, line.text.length),
  )
}

export function getRichTextStyleAtLineOffset(
  line: RichTextLine,
  offset: number,
) {
  let runStart = 0
  let previousRun: RichTextRun | undefined

  for (const run of line.runs) {
    const runEnd = runStart + run.text.length

    if (offset > runStart && offset <= runEnd) {
      return getRichTextRunStyle(run)
    }

    if (offset <= runStart) {
      return getRichTextRunStyle(previousRun ?? run)
    }

    previousRun = run
    runStart = runEnd
  }

  return getRichTextRunStyle(previousRun)
}
