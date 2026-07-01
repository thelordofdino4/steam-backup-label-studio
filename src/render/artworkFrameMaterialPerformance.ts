export const ARTWORK_FRAME_MATERIAL_PERFORMANCE_PHASES = [
  'descriptor-material-plan',
  'steel-finish-field',
  'steel-derived-maps',
  'corrosion-field',
  'corrosion-derived-maps',
  'normal-generation',
  'final-shading',
  'self-shadow-pass',
  'image-canvas-output-conversion',
] as const

export type ArtworkFrameMaterialPerformancePhase =
  typeof ARTWORK_FRAME_MATERIAL_PERFORMANCE_PHASES[number]

export type ArtworkFrameMaterialPerformanceEntry = {
  durationMs: number
  phase: ArtworkFrameMaterialPerformancePhase
}

export type ArtworkFrameMaterialPerformanceSummaryEntry = {
  count: number
  maxMs: number
  phase: ArtworkFrameMaterialPerformancePhase
  totalMs: number
}

export type ArtworkFrameMaterialPerformanceRecorder = {
  record: (entry: ArtworkFrameMaterialPerformanceEntry) => void
}

export type ArtworkFrameMaterialPerformanceClock = () => number

function getDefaultPerformanceNow() {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now()
  }

  return Date.now()
}

export function measureArtworkFrameMaterialPerformance<T>(
  recorder: ArtworkFrameMaterialPerformanceRecorder | null | undefined,
  phase: ArtworkFrameMaterialPerformancePhase,
  callback: () => T,
  clock: ArtworkFrameMaterialPerformanceClock = getDefaultPerformanceNow,
) {
  if (!recorder) {
    return callback()
  }

  const start = clock()

  try {
    return callback()
  } finally {
    recorder.record({
      durationMs: Math.max(0, clock() - start),
      phase,
    })
  }
}

export function summarizeArtworkFrameMaterialPerformance(
  entries: readonly ArtworkFrameMaterialPerformanceEntry[],
): ArtworkFrameMaterialPerformanceSummaryEntry[] {
  const summaries = new Map<
    ArtworkFrameMaterialPerformancePhase,
    ArtworkFrameMaterialPerformanceSummaryEntry
  >()

  for (const entry of entries) {
    const existing = summaries.get(entry.phase)

    if (existing) {
      existing.count += 1
      existing.maxMs = Math.max(existing.maxMs, entry.durationMs)
      existing.totalMs += entry.durationMs
      continue
    }

    summaries.set(entry.phase, {
      count: 1,
      maxMs: entry.durationMs,
      phase: entry.phase,
      totalMs: entry.durationMs,
    })
  }

  return ARTWORK_FRAME_MATERIAL_PERFORMANCE_PHASES.flatMap((phase) => {
    const summary = summaries.get(phase)

    return summary ? [summary] : []
  })
}

export function createArtworkFrameMaterialPerformanceCollector() {
  const entries: ArtworkFrameMaterialPerformanceEntry[] = []

  return {
    entries,
    getSummary: () => summarizeArtworkFrameMaterialPerformance(entries),
    record: (entry: ArtworkFrameMaterialPerformanceEntry) => {
      entries.push(entry)
    },
  } satisfies ArtworkFrameMaterialPerformanceRecorder & {
    entries: ArtworkFrameMaterialPerformanceEntry[]
    getSummary: () => ArtworkFrameMaterialPerformanceSummaryEntry[]
  }
}
