import type { BackgroundOffset } from '../project/projectTypes.ts'
import type { ProjectSessionId } from './projectSession.ts'

export type DiscBackgroundDraftIdentity = Readonly<{
  sessionId: ProjectSessionId
  revision: number
}>

declare const ticketBrand: unique symbol
export type DiscBackgroundDraftTicket = Readonly<{ [ticketBrand]: true }>

export type DiscBackgroundDraftValue = Readonly<{
  scale: number
  offset: Readonly<BackgroundOffset>
}>

export type DiscBackgroundDraftTransform = Readonly<DiscBackgroundDraftIdentity &
  DiscBackgroundDraftValue>

type DraftUpdateResult = 'updated' | 'no-op' | 'inactive' | 'stale' | 'invalid'
type DraftFinishResult<Result> =
  | Readonly<{ status: 'inactive' | 'stale' | 'no-op' }>
  | Readonly<{ status: 'submitted'; result: Result }>

function sameTransform(a: DiscBackgroundDraftValue, b: DiscBackgroundDraftValue) {
  return a.scale === b.scale && a.offset.x === b.offset.x && a.offset.y === b.offset.y
}

function isValidTransform(value: DiscBackgroundDraftValue) {
  return Number.isFinite(value.scale) && value.scale > 0 &&
    Number.isFinite(value.offset.x) && Number.isFinite(value.offset.y)
}

function copyTransform(value: DiscBackgroundDraftValue): DiscBackgroundDraftValue {
  return Object.freeze({
    scale: value.scale,
    offset: Object.freeze({ x: value.offset.x, y: value.offset.y }),
  })
}

/** One transient transform. The caller owns geometry and the final checked transaction. */
export function createDiscBackgroundDraftController() {
  let active: {
    ticket: DiscBackgroundDraftTicket
    identity: DiscBackgroundDraftIdentity
    original: DiscBackgroundDraftValue
    value: DiscBackgroundDraftValue
  } | undefined

  function matchingDraft(current: DiscBackgroundDraftIdentity | null) {
    return active && current?.sessionId === active.identity.sessionId &&
      current.revision === active.identity.revision ? active : undefined
  }

  function retireStale(current: DiscBackgroundDraftIdentity | null) {
    if (!active || matchingDraft(current)) return false
    active = undefined
    return true
  }

  return Object.freeze({
    begin(identity: DiscBackgroundDraftIdentity, initial: DiscBackgroundDraftValue) {
      active = undefined
      if (!identity.sessionId || !Number.isSafeInteger(identity.revision) ||
        identity.revision < 0 || !isValidTransform(initial)) return null

      const ticket = Object.freeze({}) as DiscBackgroundDraftTicket
      const original = copyTransform(initial)
      active = {
        ticket,
        identity: Object.freeze({ sessionId: identity.sessionId, revision: identity.revision }),
        original,
        value: original,
      }
      return ticket
    },

    update(ticket: DiscBackgroundDraftTicket, current: DiscBackgroundDraftIdentity | null,
      value: DiscBackgroundDraftValue): DraftUpdateResult {
      if (active?.ticket !== ticket) return 'inactive'
      const draft = matchingDraft(current)
      if (!draft) {
        retireStale(current)
        return 'stale'
      }
      if (!isValidTransform(value)) return 'invalid'
      if (sameTransform(draft.value, value)) return 'no-op'
      draft.value = copyTransform(value)
      return 'updated'
    },

    getEffectiveTransform(current: DiscBackgroundDraftIdentity | null,
      committed: DiscBackgroundDraftValue): DiscBackgroundDraftValue {
      return matchingDraft(current)?.value ?? committed
    },

    getActiveTicket(): DiscBackgroundDraftTicket | undefined {
      return active?.ticket
    },

    finish<Result>(ticket: DiscBackgroundDraftTicket, current: DiscBackgroundDraftIdentity | null,
      publish: (input: DiscBackgroundDraftTransform) => Result): DraftFinishResult<Result> {
      if (active?.ticket !== ticket) return { status: 'inactive' }
      const draft = matchingDraft(current)
      if (!draft) {
        retireStale(current)
        return { status: 'stale' }
      }
      // Consume before handing off; reentrancy, rejection or exceptions cannot retry a draft.
      active = undefined
      if (sameTransform(draft.original, draft.value)) return { status: 'no-op' }
      return {
        status: 'submitted',
        result: publish(Object.freeze({ ...draft.identity, ...draft.value })),
      }
    },

    retireStale,

    cancel(ticket?: DiscBackgroundDraftTicket) {
      if (!active || (ticket && active.ticket !== ticket)) return false
      active = undefined
      return true
    },
  })
}
