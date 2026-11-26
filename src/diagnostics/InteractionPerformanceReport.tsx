import { useState } from 'react'
import type { InteractionPerformanceObserver } from './interactionPerformanceObserver.ts'
export function InteractionPerformanceReport({ observer }: { observer: InteractionPerformanceObserver }) {
  const [report, setReport] = useState<ReturnType<typeof observer.snapshot> | null>(null)
  return <details style={{ position: 'fixed', top: 0, right: 0, zIndex: 10000,
    maxHeight: '50vh', overflow: 'auto', maxWidth: '44rem', background: '#fff', color: '#111' }}>
    <summary>Development interaction timing report</summary>
    <p>Handler entry to first matching DiscPreview layout commit. Not displayed pixels,
      image decode completion, lifecycle revision, native work or release performance.
      Only Disc title-artwork scale and plain custom-note input are observed.</p>
    <button type="button" onClick={() => setReport(observer.snapshot())}>Refresh interaction timing report</button>
    {report && <section aria-label="Interaction timing samples">
      <p>Capacity {report.capacity}; dropped {report.dropped}; invalid {report.invalid};
        pending without observed commit {report.pending}; retained {report.samples.length}.</p>
      <ol>{report.samples.map(sample => <li key={sample.sequence}>
        {sample.sequence}: {sample.kind}, {sample.outcome},
        {sample.elapsedMs === null ? ' excluded from latency' : ' ' + sample.elapsedMs.toFixed(3) + ' ms'}.
      </li>)}</ol>
    </section>}
  </details>
}
