import { useState } from 'react'
import type { LifecyclePerformanceObserver } from '../lifecycle/lifecyclePerformanceObserver.ts'

/** Explicit refresh only: recording samples never schedules React work. */
export function LifecyclePerformanceReport({ observer }: {
  observer: LifecyclePerformanceObserver
}) {
  const [report, setReport] = useState<ReturnType<typeof observer.snapshot> | null>(null)
  return <details style={{ position: 'fixed', bottom: 0, right: 0, zIndex: 10000,
    maxHeight: '50vh', overflow: 'auto', maxWidth: '44rem', background: '#fff', color: '#111' }}>
    <summary>Development lifecycle timing report</summary>
    <p>Dispatch includes dialog waiting. Synchronization includes subscribers.
      Neither measures displayed pixels or native-only work. Generations are lifecycle state generations.</p>
    <button type="button" onClick={() => setReport(observer.snapshot())}>Refresh timing report</button>
    {report && <section aria-label="Lifecycle timing samples">
      <p>Capacity {report.capacity}; dropped {report.dropped}; invalid {report.invalid}.
        Retained samples {report.samples.length}. Times in milliseconds.</p>
      <ol>{report.samples.map(sample => <li key={sample.sequence}>
        {sample.sequence}: {sample.boundary}, {sample.outcome}, {sample.elapsedMs.toFixed(3)} ms,
        state generation {sample.generationBefore} to {sample.generationAfter}.
      </li>)}</ol>
    </section>}
  </details>
}
