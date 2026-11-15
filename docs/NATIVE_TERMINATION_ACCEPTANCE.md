# Native Close and Quit reconciliation

Status: isolated source candidate for #360; native acceptance and publication pending.
Base: current main `fc1cd4dd`, including #304 and #367. Reuses draft #388's
`d98c6ed2`, focused admission-retirement ideas from `3d6f2e85`, and the
once-only cleanup helper from `e2ece750`. No #411 diagnostics, startup recovery
UI, Case preset implementation, renderer, schema, or package changes are included.

## Ownership and safety

The existing lifecycle dispatcher, busy scopes, replacement guard, Save owner,
session revision and clean baseline remain authoritative. Native X/Alt+F4 and
Close Window/Quit menu requests share those owners. The Rust adapter holds only
bridge identity, request sequence and one-use native termination authority.

After the preservation guard succeeds, a captured handoff lease blocks #367
async admission before retiring requests, failure feedback and derived session
continuations. Work begun during that barrier is permanently unauthorized,
even if the handoff later fails. Guard Cancel never begins this barrier.
The final synchronous interaction preparation and narrow Case finish port run
before comparing the original guard authorization with current session/revision.
The authorization is never refreshed to hide a late edit. Failed finish or a
changed revision prevents native commit and restores fresh admission only.

The Case port, shared-guard finish calls and Save capture boundary reuse the
existing primary contract. Main supplies no continuous-edit coordinator. A
separate primary-preserving integration must connect the existing adapter and
prove painted/unpainted scheduling behavior before native Case acceptance.

The native commit protocol returns `success`, `rejected`, or `uncertain`.
`rejected` positively proves the Rust gate has no permit, authorized window
close or termination in progress. Only that response permits interaction and
fresh async admission to resume. Old tickets never revive. A generic IPC
rejection, malformed response, lost acknowledgement, poisoned gate or already
committed gate cannot establish safe rejection. These outcomes remain paused
and report `application.termination-outcome-uncertain` rather than claiming the
window did not close. No abort/recovery protocol is introduced here.

This distinction is necessary because the pinned Tauri Windows runtime's
`close()` queues `WindowMessage::Close`; acknowledgement and actual native
termination are different observations. Quit can also fall back to process
exit if native event dispatch fails. Do not unlock editing based on a guessed
timeout or treat browser diagnostics as proof of native event ordering.

Cleanup publishes one shared Promise before callbacks can reenter. Lifecycle,
termination runtime and transport disposal revoke admission synchronously,
release listeners once, and await a late installation's own cleanup. Interaction
leases reject overlap and stale cleanup cannot unlock another preparation.

## Automated evidence

The old reconciled source passed its existing 50 focused cases, but the new
deferred-commit baseline failed nine ownership/cleanup cases while two Cancel
controls passed. Corrected tests cover old and during-handoff mutation,
proposal/failure publication, reentrant admission, derived continuations,
known versus uncertain native outcomes, Case finish/Save/final authorization,
and delayed/reentrant cleanup. Native Rust tests cover identity, permit kind,
single use, rollback, startup/disconnect, sequence exhaustion, last-window exit
and explicit acknowledgement classification. Final receipts must identify the
immutable candidate and completed aggregate checks; this document is not a
claim that the current worktree has passed all gates.

## Required primary integration and Windows acceptance

1. Preserve primary `893e0ee9` and both untracked fixture folders. Reconcile in
   another isolated worktree first. Retain one-shot Case preset behavior,
   source-only cover/tray helpers, spine semantics, framing and finish ports.
2. Use the real existing Case coordinator to test painted/unpainted edits
   staged after guard authorization, finish failure, Save R/newer R+1, stale
   queued branding and blocked `beginPrepared` admission. Run full checks and
   independent review before primary integration.
3. Announce each deliberate native close/restart in advance. Use disposable
   projects and verified-new output destinations; hash original fixtures.
4. Verify clean Disc/Case and no-project X, Alt+F4, File Close Window and Quit;
   each action should terminate once without a false warning or duplicate guard.
5. Verify dirty Disc/Case and retained Home sessions: Cancel preserves content,
   path and baseline; Discard closes only the authorized revision; Save writes
   the expected package then closes. Reopen saved output to inspect content.
6. Verify cancelled Save As and a known safe save failure prevent abandonment.
   Repeated native/menu activation and active modal/Open/Save/export ownership
   must not start another prompt, write or native permit.
7. Verify the existing Case edit finish boundary and observable pending imports
   without inventing response ordering. Deterministic overlap proofs remain
   automated unless real native timing is observed.
8. Record actual process/window closure and fresh launch separately from API
   acknowledgement. Preserve exact source/output hashes and disclose any
   unobserved native outcomes. Linux/macOS remain separate under #333/#334.

Forced termination, crash/power-loss recovery, autosave, multi-document support,
and unknown-outcome abort recovery are outside this bounded implementation.
Issue #360 remains open. No publication or issue/roadmap update is implied.
