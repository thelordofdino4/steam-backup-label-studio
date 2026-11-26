export type InteractionKind = 'disc-title-artwork-scale' | 'disc-custom-note-plain'
export type InteractionOutcome = 'preview-commit' | 'no-op' | 'superseded' | 'coalesced' | 'session-changed' | 'unmatched-commit' | 'hidden' | 'expired' | 'preview-unmounted'
export type InteractionTicket = Readonly<{ sequence: number; kind: InteractionKind }>
export type InteractionSample = InteractionTicket & Readonly<{ outcome: InteractionOutcome; elapsedMs: number | null }>
export function isInteractionTimingEnabled(development: boolean, flag: unknown) {
  return development && flag === '1'
}
/** Diagnostic failures, including injected implementations, never reach owners. */
export function observeInteraction<T>(action: () => T): T | undefined {
  try { return action() } catch { return undefined }
}
/** Weak identity association never copies/serializes content or retains assets. */
export function createInteractionPerformanceObserver(now: () => number = () => performance.now()) {
  const pending = new Map<InteractionKind, { ticket: InteractionTicket; start: number; coalesced: boolean }>()
  const expected = new WeakMap<object, number>()
  const samples: InteractionSample[] = []
  let sequence = 0, dropped = 0, invalid = 0
  const readClock = () => {
    try { const value = now(); if (Number.isFinite(value)) return value } catch { /* isolated */ }
    invalid += 1
    return undefined
  }
  const finish = (ticket: InteractionTicket, outcome: InteractionOutcome, elapsedMs: number | null = null) => {
    if (pending.get(ticket.kind)?.ticket !== ticket) return
    pending.delete(ticket.kind)
    if (samples.length === 256) { samples.shift(); dropped += 1 }
    samples.push(Object.freeze({ ...ticket, outcome, elapsedMs }))
  }
  return Object.freeze({
    begin(kind: InteractionKind): InteractionTicket | undefined {
      const previous = pending.get(kind)
      if (previous) finish(previous.ticket, 'superseded')
      const start = readClock()
      if (start === undefined) return
      const ticket = Object.freeze({ sequence: ++sequence, kind })
      pending.set(kind, { ticket, start, coalesced: Boolean(previous) })
      return ticket
    },
    expect(ticket: InteractionTicket | undefined, identity: object, changed: boolean) {
      if (!ticket || pending.get(ticket.kind)?.ticket !== ticket) return
      if (!changed) { finish(ticket, 'no-op'); return }
      expected.set(identity, ticket.sequence)
    },
    commit(kind: InteractionKind, identity: object, visible: boolean) {
      const entry = pending.get(kind)
      if (!entry) return
      if (expected.get(identity) !== entry.ticket.sequence) { finish(entry.ticket, 'unmatched-commit'); return }
      if (!visible) { finish(entry.ticket, 'hidden'); return }
      if (entry.coalesced) { finish(entry.ticket, 'coalesced'); return }
      const end = readClock()
      if (end === undefined || end < entry.start) {
        if (end !== undefined) invalid += 1
        pending.delete(kind)
        return
      }
      const elapsed = end - entry.start
      finish(entry.ticket, elapsed > 5000 ? 'expired' : 'preview-commit', elapsed > 5000 ? null : elapsed)
    },
    unmount() {
      for (const { ticket } of pending.values()) finish(ticket, 'preview-unmounted')
    },
    invalidateSession() {
      for (const { ticket } of pending.values()) finish(ticket, 'session-changed')
    },
    snapshot() {
      return Object.freeze({ capacity: 256, dropped, invalid, pending: pending.size,
        samples: Object.freeze([...samples]) })
    },
  })
}
export type InteractionPerformanceObserver = ReturnType<typeof createInteractionPerformanceObserver>
