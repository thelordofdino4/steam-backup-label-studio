export function isLifecycleTimingEnabled(development: boolean, flag: unknown): boolean {
  return development && flag === '1'
}

/** Local opt-in diagnostics. No project data, identifiers, paths or error text. */
export type LifecyclePerformanceBoundary =
  | 'project.open' | 'project.save' | 'project.save-as' | 'export.png'
  | 'synchronize-current-project'
export type LifecyclePerformanceOutcome =
  | 'success' | 'cancelled' | 'declined' | 'failure' | 'not-executed' | 'threw'
  | 'synchronized' | 'no-op' | 'stale-session' | 'wrong-kind' | 'invalid'
export type LifecyclePerformanceSample = Readonly<{
  sequence: number
  boundary: LifecyclePerformanceBoundary
  outcome: LifecyclePerformanceOutcome
  elapsedMs: number
  generationBefore: number
  generationAfter: number
}>

export function createLifecyclePerformanceObserver(now: () => number = () => performance.now()) {
  const samples: LifecyclePerformanceSample[] = []
  let sequence = 0
  let dropped = 0
  let invalid = 0
  return Object.freeze({
    begin(boundary: LifecyclePerformanceBoundary, generationBefore: number) {
      let start: number
      try { start = now() } catch { invalid += 1; return undefined }
      let finished = false
      return (outcome: LifecyclePerformanceOutcome, generationAfter: number) => {
        if (finished) return
        finished = true
        try {
          const elapsedMs = now() - start
          if (!Number.isFinite(elapsedMs) || elapsedMs < 0) { invalid += 1; return }
          // Fixed-size retained history; no subscriptions or rendering on record.
          if (samples.length === 256) { samples.shift(); dropped += 1 }
          samples.push(Object.freeze({ sequence: ++sequence, boundary, outcome,
            elapsedMs, generationBefore, generationAfter }))
        } catch { invalid += 1 }
      }
    },
    snapshot() {
      return Object.freeze({ schemaVersion: 1, capacity: 256, dropped, invalid,
        samples: Object.freeze([...samples]) })
    },
  })
}
export type LifecyclePerformanceObserver = ReturnType<typeof createLifecyclePerformanceObserver>

/** An injected observer must never affect application control flow. */
export function beginLifecyclePerformanceSample(
  observer: LifecyclePerformanceObserver | undefined,
  boundary: LifecyclePerformanceBoundary,
  generation: number,
) {
  if (!observer) return undefined
  try {
    const finish = observer.begin(boundary, generation)
    if (!finish) return undefined
    return (outcome: LifecyclePerformanceOutcome, after: number) => {
      try { finish(outcome, after) } catch { /* Diagnostic failures are isolated. */ }
    }
  } catch { return undefined }
}
