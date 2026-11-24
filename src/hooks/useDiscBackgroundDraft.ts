import { hasDiscBackgroundAsset } from '../image/discBackgroundAsset.ts'
import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import type { ApplicationLifecycleRuntime } from '../app/applicationLifecycleRuntime.ts'
import type { ApplicationCaseInsertContinuousEditFinishResult } from '../app/applicationCaseInsertContinuousEditPort.ts'
import {
  createDiscBackgroundDraftController,
  type DiscBackgroundDraftTicket,
  type DiscBackgroundDraftValue,
} from '../lifecycle/discBackgroundDraft.ts'
import type { DiscProjectSession } from '../lifecycle/projectSession.ts'

const identityOf = (session: DiscProjectSession) => ({ sessionId: session.id, revision: session.revision })

export function createDiscBackgroundDraftBinding(runtime: ApplicationLifecycleRuntime) {
  const root = runtime.root
  const draft = createDiscBackgroundDraftController()
  let participating: { key: string; ticket: DiscBackgroundDraftTicket } | undefined
  const listeners = new Set<() => void>()

  function current() {
    const { activeSession, visibleWorkspace } = root.getLifecycleState()
    return visibleWorkspace === 'disc' && activeSession?.kind === 'disc' ? activeSession : undefined
  }

  function notify() {
    for (const listener of listeners) listener()
  }

  function cannotFinish(): ApplicationCaseInsertContinuousEditFinishResult {
    const message = 'The active background edit could not be completed safely.'
    return { status: 'failure',
      error: { code: 'disc.background-draft-not-committed', userMessage: message, recoverable: true },
      feedback: { kind: 'error', message },
    }
  }

  function finish(key?: string): ApplicationCaseInsertContinuousEditFinishResult {
    if (!participating || (key !== undefined && participating.key !== key)) return { status: 'success', value: undefined }
    const session = current()
    if (session && !root.canCommitDiscBackground()) {
      const original = session.project.background
      const effective = draft.getEffectiveTransform(identityOf(session), original)
      if (original.scale !== effective.scale || original.offset.x !== effective.offset.x ||
          original.offset.y !== effective.offset.y) {
        // The final native-handoff lease deliberately closes mutation
        // admission. Abort this command without consuming a late live edit.
        return cannotFinish()
      }
    }
    const { ticket } = participating
    participating = undefined
    const outcome = draft.finish(ticket, session ? identityOf(session) : null, change =>
      root.commitDiscBackground({
        sessionId: change.sessionId,
        expectedRevision: change.revision,
        operation: { kind: 'transform', scale: change.scale, offset: change.offset },
      }))
    notify()
    if (outcome.status === 'stale' || (outcome.status === 'submitted' &&
        outcome.result !== 'committed' && outcome.result !== 'no-op')) {
      return cannotFinish()
    }
    return { status: 'success', value: undefined }
  }

  return Object.freeze({
    begin(key: string) {
      const session = current()
      if (!session || participating || !(session.project.background.enabled ?? true) ||
          !hasDiscBackgroundAsset(session.project.background.asset)) return false
      const ticket = draft.begin(identityOf(session), session.project.background)
      if (!ticket) return false
      participating = { key, ticket }
      // No notification: until actual input, draft and committed values are identical.
      return true
    },
    update(key: string, transition: (value: DiscBackgroundDraftValue) => DiscBackgroundDraftValue) {
      const session = current()
      if (!participating || participating.key !== key || !session) return
      const identity = identityOf(session)
      const old = draft.getEffectiveTransform(identity, session.project.background)
      const result = draft.update(participating.ticket, identity, transition(old))
      if (result === 'stale') participating = undefined
      if (result === 'updated' || result === 'stale') notify()
    },
    finish,
    cancel(key?: string) {
      if (!participating || (key !== undefined && participating.key !== key)) return
      participating = undefined
      if (draft.cancel()) notify()
    },
    retireStale() {
      const session = current()
      if (!draft.retireStale(session ? identityOf(session) : null)) return
      participating = undefined
      notify()
    },
    read() {
      const session = current()
      if (!session || !participating) return null
      const committed = session.project.background
      const effective = draft.getEffectiveTransform(identityOf(session), committed)
      return effective === committed ? null : effective
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  })
}

export function useDiscBackgroundDraft(runtime: ApplicationLifecycleRuntime) {
  const [binding] = useState(() => createDiscBackgroundDraftBinding(runtime))
  const transform = useSyncExternalStore(binding.subscribe, binding.read, binding.read)
  useLayoutEffect(() => {
    runtime.updateDiscBackgroundContinuousEditPort(binding)
    const unsubscribe = runtime.root.subscribe(binding.retireStale)
    return () => {
      unsubscribe()
      binding.cancel()
      runtime.updateDiscBackgroundContinuousEditPort(null)
    }
  }, [binding, runtime])
  return { binding, transform }
}
