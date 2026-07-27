# Application Command And Project Lifecycle Contract

> Status: Draft target-state normative contract.
> Purpose: Define application-command semantics, the single-project session lifecycle, dirty/baseline rules, lifecycle guards, and shared result/feedback boundaries for future implementation.
> Read when: Application commands, Home/editor navigation, project New/Open/Save/Save As/Close behavior, native close/Quit handling, global shortcuts, or lifecycle feedback are being designed or changed.
> Authoritative source: This document for the target application-command and project-session contract; `PROJECT_FILE_SPEC.md` remains authoritative for serialized project schema, and the SDD remains authoritative for broader architecture and current as-built boundaries.
> Evidence baseline: `main` at `f750a5c4b8721e6de4912a9be5ef26a05cddab5e`.

Last refreshed: 2026-07-25.

Implementation checkpoint, 2026-07-27: one production lifecycle composition
root is now mounted at the React application boundary, and `project.open` is
the first runtime-connected lifecycle command. Open stages one immutable Disc
or Case Insert candidate without live mutation, then commits its path-bearing
clean session and complete editor aggregate in one synchronous React batch.
All other lifecycle operation ports remain explicitly unimplemented. The
dirty-aware replacement guard, Save/Save As migration, Home Resume, Close
Project, native Close Window/Quit, global feedback, and application menu remain
absent.

## 1. Status, Authority, And Document Relationships

This is a **draft target-state normative contract**. Its `must` and `must not`
statements define behavior that future implementation work is required to
satisfy. They do not claim that the behavior is implemented at the evidence
baseline.

This contract owns:

- presentation-neutral application-command semantics;
- the lifecycle of at most one active in-memory project session;
- native path, clean-baseline, revision, and derived dirty semantics;
- replacement, close, and Quit guards;
- shared typed command results, concurrency boundaries, and result-to-feedback
  policy;
- the boundary through which Home actions, editor controls, future menus,
  shortcuts, and native close adapters invoke the same behavior.

Authority remains divided as follows:

| Concern | Authority |
| --- | --- |
| Serialized `.sbls.json` fields, validation, migrations, and compatibility | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) |
| Broader as-built architecture, renderer ownership, and preview/edit/export parity | [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md) |
| Product scope and feature boundaries | [`PRD.md`](PRD.md) |
| Text input, source editing, and contextual text-control behavior | [`TEXT_EDITOR_CONTRACT.md`](TEXT_EDITOR_CONTRACT.md) |
| Target application commands and single-project lifecycle | This contract |
| Detailed Export execution semantics | [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) |
| Detailed Game search, import, and metadata workflow semantics | [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md) |
| Detailed Disc template and physical-geometry workflow semantics | [`DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`](DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md) |
| Detailed Disc Layout Preset selection/plan/apply/reapply/detach semantics | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md) |
| Final native File/Edit/Tools/Window/Help presentation, menu item IDs, platform placement, menu bridge, and workflow-launcher integration | [`APPLICATION_MENU_BAR_CONTRACT.md`](APPLICATION_MENU_BAR_CONTRACT.md) |
| Detailed Guided Workflow sequences | [`GUIDED_PRESET_SLOT_MODEL.md`](GUIDED_PRESET_SLOT_MODEL.md) and future focused Guided Start contract |

This contract does not add fields to the project-file schema. A target session
field described here is not serialized merely because it exists in the session
model. If a future requirement needs a new persisted field, that change must be
made through `PROJECT_FILE_SPEC.md` with the required compatibility and
migration decision.

When documents appear to conflict, first classify the claim. Current source
and tests outrank a dated current-state statement. This contract governs target
command/lifecycle behavior, while the SDD governs current as-built architecture
until implementation satisfies this contract. Schema questions always defer to
`PROJECT_FILE_SPEC.md`.

## 2. Terminology And Claim Classifications

| Term | Meaning |
| --- | --- |
| Project content | The normalized design and editor data that the project schema defines as persistable. |
| Project session | One in-memory aggregate containing project content plus session-only identity, path, baseline, revision, and navigation metadata. |
| Active session | The sole project session currently retained by the application, whether an editor or Home is visible. |
| Canonical persistable snapshot | A complete normalized project-file value suitable for one save or load commit. |
| Clean baseline | The exact normalized snapshot last accepted from a successful load or successful write, plus its deterministic comparison value. |
| Revision | A monotonic in-memory change identity for canonical project-content mutations in one session. |
| Dirty | A derived condition: no clean baseline exists, or current canonical project content differs from the baseline comparison value. |
| Session-only state | State retained while the process/session lives but excluded from project serialization and dirty comparison. |
| Ephemeral state | Short-lived UI or operation state such as focus, an open dialog, busy ownership, or feedback presentation. |
| Command | A stable presentation-neutral application intent registered under an exact ID. |
| Lifecycle transition | An operation that creates, replaces, abandons, saves, or terminates access to the active session. |
| Replacement guard | The shared clean/dirty decision that authorizes or rejects abandonment of an active session. |

Claims in this document use three classes:

| Claim class | Wording | Meaning |
| --- | --- | --- |
| Current fact | “currently,” “at the evidence baseline,” or an evidence table row | Observed in the named source/tests at the reviewed commit. |
| Target invariant | `must`, `must not`, `required`, or “target” | Normative future behavior; not an implementation claim. |
| Future extension | `may`, “future,” or “outside this contract” | A permitted direction that requires a separate decision or contract. |

These classes must not be blended. In particular, target requirements must not
be cited as proof that current Save, Open, close, feedback, or shortcut behavior
already satisfies them.

## 3. Evidence-Backed Current-State Baseline

The Phase 2 findings were re-verified against the evidence baseline. The table
retains those historical runtime findings while the implementation-checkpoint
rows distinguish the later pure foundation and first runtime-connected Open
slice.

| Current fact / later checkpoint correction | Evidence | Architectural consequence |
| --- | --- | --- |
| “Save Project” always opens a save dialog, creates a snapshot, writes it, and discards the selected path after the call. It is Save As behavior, not ordinary Save. | `src/components/sidebar/ProjectPanel.tsx`, `src/app/appProjectSave.ts`, `src/app/appProjectSave.test.ts` | A path-owning session and distinct Save/Save As commands are still missing. |
| A project successfully accepted through `project.open` now receives an authoritative session ID, selected path, exact normalized project and clean baseline, revision zero, and editor route. Legacy New and Save paths do not yet synchronize their editor mutations with that session authority, and ordinary Save is still absent. | `src/app/appProjectOpenCommand.ts`, `src/lifecycle/projectSession.ts`, `src/app/App.tsx` | Issue #308 remains the principal owner for the remaining lifecycle integration. |
| New Disc inside the Disc editor always asks for confirmation; Home New Disc/New Case reset immediately; Return Home asks separately while retaining current hook/App state. | `src/app/App.tsx`, `src/components/home/HomeScreen.tsx` | New/Open/Home do not consume one shared dirty-aware guard. |
| Open now completes dialog, read, parse, validation/migration, route resolution, Disc image inspection, restoration, preset reconstruction, and Case branding projection before returning one immutable discriminated candidate. Its lifecycle CAS and complete editor aggregate are then scheduled inside one React batch; stale CAS applies no editor state. | `src/app/appProjectLoad.ts`, `src/app/appProjectRestore.ts`, `src/app/appProjectOpenCommand.ts`, focused tests | The two-phase Open and atomic application seam is runtime-connected for current Home, Disc, and Case Load controls. |
| `project.open` now returns the shared typed result taxonomy through the dispatcher. A narrow compatibility adapter forwards at most one message to the existing status owner; legacy Save still uses its prior string callback. | `src/app/appProjectOpenFeedback.ts`, `src/app/appProjectSave.ts`, `src/app/App.tsx` | #300 remains applicable because the shared global feedback owner is not implemented. |
| Status toasts are rendered by editor previews. Home has a separate status message, but Home-triggered Open cancellation/failure only calls the preview-oriented announcer. | `src/hooks/useStatusToasts.ts`, `src/components/preview/PreviewToastStack.tsx`, `src/components/home/HomeScreen.tsx`, `src/app/App.tsx` | Home can miss meaningful Open feedback; #300 remains applicable. |
| Rust project writes preserve the existing Tauri signature while delegating opaque JSON bytes to a focused same-directory temporary-write-and-replace owner. | `src-tauri/src/commands/files.rs`, `src-tauri/src/project_file.rs`, focused Rust tests | The #312 native persistence prerequisite is implemented in this checkpoint; the broader #308 session, Save/Save As, baseline, dirty-state, and guard work remains unimplemented. |
| `src/main.tsx` constructs one application-scoped lifecycle runtime outside React Strict Mode and gives its boundary disposal ownership. A dependency-ref hook supplies current committed Open adapters without recreating the root. Only the Open production port is implemented; every other lifecycle port remains disabled, and native Tauri/application-menu adapters do not consume the root. | `src/main.tsx`, `src/app/ApplicationLifecycleBoundary.tsx`, `src/app/applicationLifecycleRuntime.ts`, `src/app/useApplicationLifecycleRoot.ts`, focused tests | The first runtime slice is implemented without claiming complete lifecycle, native menu, termination, recovery, or history ownership. |
| Text controls have browser/native editing behavior, but no application-level project history owner exists. | `src/text`, preview text adapters, repository search | Native text undo must not be described as application Undo/Redo. |
| PNG export asks for a destination, then builds preflight, then always opens a confirmation dialog, including when no warning exists. | `src/app/appPngExport.ts`, `src/app/appPngExport.test.ts` | [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) owns the stricter target order, with #302 as focused implementation work; this lifecycle contract supplies shared vocabulary only. |
| The runtime case navigation identity is Front/Back/Spine, while saved project data stores only the coarser Cover/Tray pane. Back versus Spine is not restorable. | `src/editor/editorNavigationShell.ts`, `src/app/App.tsx`, `src/project/caseInsertProjectAdapters.ts`, `src/project/projectTypes.ts` | Full navigation identity is session/UI state. The existing coarse persisted pane remains a schema compatibility fact until separately changed. |
| The Guide Legend is currently a collapsed preview-local panel for both Disc and Case Insert previews, not a Disc sidebar panel. | `src/components/preview/DiscPreview.tsx`, `src/components/preview/CaseInsertPreview.tsx` | Stale sidebar descriptions must not be copied into command or menu design. |
| Preview Space handling is window-level and excludes form-editing targets, but interactive control activation remains the focused gap in #298. | `src/components/preview/PreviewViewport.tsx` | A future shortcut router needs explicit focus precedence. |
| Tauri registration contains file/network/platform commands but no window-close lifecycle adapter. | `src-tauri/src/lib.rs` | Native close and Quit integration remain target behavior. |

This implementation checkpoint was validated through focused and repository
tests plus static build/lint/cycle checks; no browser or native Tauri runtime
verification was performed.

## 4. Target Lifecycle State Model

The application must retain at most one project session:

```ts
type ProjectSession = {
  id: ProjectSessionId
  kind: 'disc' | 'caseInsert'
  currentPath: NativeProjectPath | null
  displayName: string
  project: NormalizedPersistableProject
  cleanBaseline: {
    exactSnapshot: NormalizedPersistableProject
    comparisonValue: CanonicalProjectComparisonValue
  } | null
  revision: ProjectRevision
  lastEditorRoute: SessionEditorRoute
}

type ApplicationLifecycleState = {
  activeSession: ProjectSession | null
  visibleWorkspace: 'home' | 'disc' | 'caseInsert'
}
```

The names are illustrative; the state relationships are normative.

Target invariants:

1. `activeSession` is either `null` or one complete Disc/Case Insert aggregate.
2. A session ID is created by New or a committed Open and remains stable across
   edits, Save, Save As, Return Home, and Resume.
3. Replacing or closing a session retires its ID. A later project receives a
   new ID even if it loads the same native path.
4. `currentPath` is optional session metadata. It is never inferred from the
   saved JSON payload.
5. `visibleWorkspace` is navigation state, not proof that a session was
   abandoned. Home may be visible while `activeSession` remains present.
6. `lastEditorRoute` allows Resume to return to the retained Disc or Case
   Insert surface without reload or normalization.
7. Project content is committed as one aggregate for lifecycle transitions.
   The target architecture must not expose a hybrid of old and new project
   slices between independent setters.

## 5. Persisted, Session-Only, And Ephemeral State

| State category | Examples | Serialized? | Affects dirty? |
| --- | --- | --- | --- |
| Project content | Fields owned by `SavedDiscProject` or `SavedCaseInsertProject`, including assets, geometry, text, metadata, and explicit export settings | Only as defined by `PROJECT_FILE_SPEC.md` | Yes, through canonical comparison |
| Session-only | Session ID, native path, display name derived from path/session, clean baseline, revision, retained Home/Resume route, full Front/Back/Spine navigation surface | No | No |
| Ephemeral application state | Busy scopes, pending command, dialog state, guard authorization, feedback queue, logging context | No | No |
| Ephemeral UI state | Focus, hover, selection, open popovers, toast timers, modal focus return target, viewport interaction state | No, unless a separate schema contract explicitly says otherwise | No |
| Future process-persistent state | Recent projects, autosave/recovery records, resumable drafts, window geometry | Not defined here | Requires separate contracts |

The target full Case Insert navigation surface is session-only: Front, Back,
and Spine selection must survive Return Home/Resume while the active in-memory
session lives, but must not become dirty or be serialized by this contract.
The current schema does contain `editor.activeCaseInsertTemplatePane` for the
coarser Cover/Tray pane. That is a current compatibility fact under
`PROJECT_FILE_SPEC.md`, not evidence that Back/Spine identity is persisted and
not authority for adding more navigation fields. Any future decision to retain,
remove, or expand that persisted editor field requires schema/migration work.
Until that decision is made, a compatibility serializer may continue to read
or emit the coarse field, but lifecycle dirty comparison must treat navigation
as session-only rather than as changed design content.

## 6. Dirty State, Canonicalization, And Baseline Rules

Dirty state must be derived, never maintained by scattered `setDirty(true)` or
`setDirty(false)` calls:

```text
dirty = cleanBaseline is null
     OR canonicalize(current project) != cleanBaseline.comparisonValue
```

Canonical comparison must:

- start from a complete project snapshot normalized through the same schema and
  domain boundaries used for persistence;
- be deterministic for semantically identical project content;
- define stable ordering or a stable hash over the normalized value;
- exclude session-only and ephemeral state, including native path, session ID,
  display name, baseline, revision, busy state, feedback, focus, dialogs, and
  Home/editor navigation;
- exclude or stabilize volatile persistence-envelope metadata generated by the
  act of saving, such as `savedAt`, so regenerating a timestamp cannot make an
  otherwise unchanged project dirty;
- retain every schema-owned design/content field whose serialized value affects
  a future reload, preview, or export; explicitly session-only compatibility
  fields such as the current coarse Case Insert pane are excluded from dirty
  comparison pending their separate schema decision.

The implementation may choose deterministic serialization, structural
comparison, or hashing. It must prove that the comparison value comes from the
normalized semantic project content and that collisions or omissions cannot
silently mark changed content clean.

| Event | Path after success | Clean baseline after success | Derived dirty |
| --- | --- | --- | --- |
| New Disc/New Case | `null` | `null` | `true`, including untouched blank defaults |
| Committed Open | selected path | exact normalized candidate accepted into the session | `false` |
| Edit canonical project content | unchanged | unchanged | Recomputed; normally `true` |
| Change only session/UI state | as applicable | unchanged | Unchanged |
| Successful Save | current path | exact snapshot actually written | Compare current content with written snapshot |
| Successful Save As | selected path | exact snapshot actually written | Compare current content with written snapshot |
| Cancelled/failed save | unchanged | unchanged | Unchanged |
| Return Home/Resume | unchanged | unchanged | Unchanged |
| Close/replacement commit | old session retired | belongs to new session or none | Recomputed for new state |

Every canonical content mutation increments or otherwise advances `revision`.
A save captures one immutable normalized snapshot `S` at revision `R`. If the
write succeeds, the baseline becomes exactly `S`. If current revision/content
advanced while `S` was being written, current content is compared with `S` and
the session remains dirty. Save success must never blindly force dirty to
false.

## 7. Command Definition And Dispatch Contract

Command IDs use lowercase ASCII namespaces separated by `.`, with multiword
terms inside a namespace segment separated by `-`:

```text
<domain>.<verb-or-verb-object>
```

IDs are stable API-like identifiers. Labels, button copy, menu placement,
icons, and shortcuts may change without changing the ID.

A command definition must provide the equivalent of:

```ts
type ApplicationCommandDefinition<Input, Output> = {
  id: ApplicationCommandId
  canExecute(
    context: ApplicationCommandContext,
    input: Input,
  ): CommandCapability
  acquireScopes(
    context: ApplicationCommandContext,
    input: Input,
  ): readonly CommandBusyScope[]
  repeatPolicy: 'reject-while-busy' | 'join-identical'
  execute(
    context: ApplicationCommandContext,
    input: Input,
    operation: CommandOperationToken,
  ): Promise<ApplicationCommandResult<Output>>
  feedbackPolicy: CommandFeedbackPolicy
}

type CommandCapability =
  | { canExecute: true }
  | { canExecute: false; reasonCode: string; userMessage?: string }
```

The execution context supplies current session access, atomic session
transitions, canonical snapshot services, dialog and persistence ports, the
shared replacement guard, application feedback/logging, and native termination
ports. It must not contain presentation-component callbacks as the command's
business implementation.

Dispatch requirements:

1. Resolve the exact registered ID.
2. Re-run `canExecute` against current state at dispatch time. UI rendering of
   a disabled state is advisory and is never the only guard.
3. Atomically acquire all conflicting busy scopes in a stable order.
4. Execute once with an operation token that may be reused by an explicitly
   nested guard/save child workflow.
5. Convert expected outcomes to the typed result model.
6. Publish feedback once according to the command's policy.
7. Release all scopes in `finally` for success, cancellation, decline, and
   failure.

Home cards, editor controls, native adapters, future menus, and shortcut
routers must dispatch these IDs. Presentation adapters may provide labels,
placement, icons, accelerators, confirmation copy, or disabled explanations;
they must not copy a sidebar callback into a second workflow or own independent
capability predicates.

Busy scopes are application/lifecycle state:

| Scope | Ownership and conflict rule |
| --- | --- |
| `lifecycle.transition` | Exclusive across New, Open, Save, Save As, Close Project, Close Window, and Quit. Conflicts with workspace navigation. |
| `workspace.navigation` | Exclusive for Return Home/Resume and conflicts with `lifecycle.transition`. |
| `dialog.project-file` | Exclusive child scope while a project Open/Save As dialog is active. |
| `persistence.read` | Child scope for one project read/parse/normalize operation. |
| `persistence.write` | Child scope for one project write/commit operation. |
| `application.termination` | Exclusive final native close/Quit handoff after lifecycle permission. |

Focused workflow contracts may add namespaced child/root scopes while reusing
this dispatcher. In particular, the Export contract defines
`export.execution` and its conflicts with lifecycle transitions; it does not
create a parallel busy or dispatch framework.

A nested Save selected from a replacement guard reuses the parent lifecycle
operation token rather than attempting to acquire `lifecycle.transition` a
second time. Arbitrary reentrant dispatch with the same scope is rejected.

## 8. Exact Minimum Command Catalog

| Stable ID | Semantic command | Central capability | Busy scopes | Successful effect |
| --- | --- | --- | --- | --- |
| `project.new-disc` | New Disc Project | Application can enter a lifecycle transition | `lifecycle.transition` | After the shared guard, replace with a new pathless, baseline-less Disc session and show its editor |
| `project.new-case` | New Case Project | Application can enter a lifecycle transition | `lifecycle.transition` | After the shared guard, replace with a new pathless, baseline-less Case Insert session and show its editor |
| `project.open` | Open Project | Application can enter a lifecycle transition | `lifecycle.transition`, then `dialog.project-file` and `persistence.read` as used | Stage a complete candidate, guard replacement, atomically commit a new clean session, and show its editor |
| `project.save` | Save | An active session exists | `lifecycle.transition`, `persistence.write`; add `dialog.project-file` when no current path exists | Write one snapshot to the current path, or delegate to the Save As destination flow when pathless; update baseline only on successful commit |
| `project.save-as` | Save As | An active session exists | `lifecycle.transition`, `dialog.project-file`, `persistence.write` | Ask for a destination, write one snapshot, then adopt path and baseline on success |
| `workspace.return-home` | Return Home | An active session exists and an editor is visible | `workspace.navigation` | Show Home while retaining the complete session, path, baseline, dirty state, revision, and resume route |
| `project.resume` | Resume Project | An active session exists and Home is visible | `workspace.navigation` | Return to the retained editor route without load, normalization, replacement, or baseline change |
| `project.close` | Close Project | An active session exists | `lifecycle.transition` | After the shared guard, retire the active session and show Home |
| `application.close-window` | Close Window | The target window is open and no termination handoff is already committed | `lifecycle.transition`, then `application.termination` | After the shared guard, grant one native close and close the target window |
| `application.quit` | Quit | The application is running and no termination handoff is already committed | `lifecycle.transition`, then `application.termination` | After the shared guard, grant one application termination and request Quit |

These commands define semantics, not menu presentation. The final target
File/Edit/Tools/Window/Help hierarchy and native adapter boundary are defined in
[`APPLICATION_MENU_BAR_CONTRACT.md`](APPLICATION_MENU_BAR_CONTRACT.md). The focused
[`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) defines the exact
`export.png` descriptor and workflow while reusing this section's command and
result vocabulary. Game, Disc Template/physical-geometry, and Disc Layout
Preset commands remain with their focused workflow contracts; Guided Workflow
commands remain with the Guided model or a future focused Guided Start
contract. No presentation adapter may clone the
current sidebar export callback as independent behavior.

## 9. Typed Results, Cancellation, And Errors

Every executed asynchronous application command must resolve to this
four-outcome model or an equivalent exhaustively discriminated union:

```ts
type ApplicationCommandResult<T> =
  | { status: 'success'; value: T; feedback?: FeedbackIntent }
  | {
      status: 'cancelled'
      reason: 'file-dialog-dismissed' | 'dialog-dismissed' | 'operation-cancelled'
      feedback?: FeedbackIntent
    }
  | {
      status: 'declined'
      reason:
        | 'replacement-not-authorized'
        | 'close-not-authorized'
        | 'export-warning-not-authorized'
      feedback?: FeedbackIntent
    }
  | { status: 'failure'; error: ApplicationCommandError }

type ApplicationCommandError = {
  code: string
  userMessage: string
  diagnosticMessage?: string
  cause?: unknown
  recoverable: boolean
}
```

`cancelled` represents a normal user dismissal such as closing a file dialog.
`declined` represents an explicit decision not to authorize a replacement,
close, or warned export. Neither cancellation nor decline is a failure, and
neither should be represented by throwing an exception. Ports may throw
unexpected technical failures; the command boundary must convert them to
`failure` before returning to a caller.

Error codes use lowercase namespaces and lower-kebab detail, for example:

- `dialog.project-file-failed`
- `project.read-failed`
- `project.parse-failed`
- `project.validation-failed`
- `project.migration-failed`
- `project.snapshot-failed`
- `project.write-failed`
- `project.commit-failed`
- `application.termination-failed`
- `application.unexpected`

`userMessage` contains safe, actionable copy. `diagnosticMessage` and `cause`
are for logs/telemetry and must not be interpolated unfiltered into the UI.
Tests may inspect stable codes and typed payloads; they must not depend on raw
platform exception strings.

An unavailable command is prevented before execution:

```ts
type CommandDispatchResult<T> =
  | {
      disposition: 'not-executed'
      reason: 'unknown-command' | 'disabled' | 'busy'
      commandId: string
      userMessage?: string
    }
  | {
      disposition: 'executed'
      commandId: ApplicationCommandId
      result: ApplicationCommandResult<T>
    }
```

This outer result lets all surfaces handle stale capabilities and repeated
activation consistently without opening overlapping dialogs.

## 10. Lifecycle Transition Tables

### 10.1 Command Outcomes

| Command | Success | Cancellation | Decline | Failure |
| --- | --- | --- | --- | --- |
| New Disc/New Case | New unsaved, dirty session replaces the authorized old session | Any dismissed guard leaves session/navigation unchanged | Guard Cancel leaves session/navigation unchanged | Session construction/commit failure leaves old session intact |
| Open | Complete staged candidate atomically replaces the authorized old session; selected path and clean baseline are established | File-dialog dismissal leaves old session intact | Dirty replacement not authorized; candidate is discarded and old session remains | Read/parse/migration/validation/commit failure leaves old session intact |
| Save | Snapshot commits to current path, or pathless Save completes the Save As flow; baseline becomes written snapshot | Destination dismissal changes nothing | Not normally applicable | Snapshot/write/commit failure changes no path or baseline |
| Save As | Snapshot commits, then destination becomes current path and baseline becomes written snapshot | Destination dismissal changes nothing | Not normally applicable | Snapshot/write/commit failure changes no path or baseline |
| Return Home | Home becomes visible; session is retained exactly | Not normally applicable | Not normally applicable | Navigation failure leaves editor/session unchanged |
| Resume | Retained editor route becomes visible without reload | Not normally applicable | Not normally applicable | Navigation failure leaves Home/session unchanged |
| Close Project | Authorized session is retired and Home is shown | A dismissed guard leaves session/navigation unchanged | Guard Cancel keeps session/navigation unchanged | Close commit failure keeps session/navigation unchanged |
| Close Window | Authorized native close executes once | A dismissed guard leaves the window/session open | Guard Cancel keeps the window/session open | Native handoff failure keeps the app open and reports failure |
| Quit | Authorized native Quit executes once | A dismissed guard leaves the app/session open | Guard Cancel keeps the app/session open | Native handoff failure keeps the app open and reports failure |

### 10.2 Path, Baseline, And History Effects

| Transition | Session identity | Project content | Path/baseline | Future application history |
| --- | --- | --- | --- | --- |
| New/Open committed | New ID | Replaced as one aggregate | New establishes none; Open establishes selected path and clean baseline | Reset |
| Save/Save As committed | Preserved | Unchanged by the save command | Updated to written snapshot; Save As also adopts path | No content-history entry |
| Return Home/Resume | Preserved | Preserved | Preserved | Preserved |
| Close Project committed | Retired | Removed with session | Removed with session | Removed with session |
| Close Window/Quit committed | Retired by process/window lifecycle | No further in-process mutation required | No synthetic save | Ends with process/window lifecycle |

## 11. Shared Dirty-Aware Replacement Guard

New Disc, New Case, Open, Close Project, Close Window, and Quit must use one
guard when they would abandon an active session. Return Home must not use it
because Return Home retains a truthful Resume path.

| Current state | Guard behavior |
| --- | --- |
| No active session | Authorize the pending transition immediately |
| Active clean session | Authorize without a save prompt |
| Active dirty/unsaved session | Present truthful `Save`, `Discard`, and `Cancel` choices |

Choice semantics:

- **Save** runs Save against the exact current session. The pending transition
  may continue only after a successful save that leaves the latest current
  project clean. If a newer edit occurs while the written snapshot is in
  flight, the baseline becomes the written snapshot, dirty remains true, and
  the guard must re-evaluate rather than discard the newer edit.
- **Discard** authorizes only the already-described pending transition for the
  captured session ID and revision. It is not reusable permission for later
  edits or a different command.
- **Cancel** returns `declined` and leaves session and navigation unchanged.
- A cancelled or failed Save/Save As aborts the pending transition.

Immediately before destructive commit, the guard must compare the current
session ID and revision with the authorization token. If either changed, it
must re-evaluate the current session; stale clean status, Save success, or
Discard permission cannot authorize loss of newer state.

This is the long-term dirty-aware lifecycle. It supersedes the architectural
direction of #303's temporary always-prompt proposal; #303 remains useful
historical/focused issue context but must not be implemented as the final
policy.

## 12. Atomic Save And Atomic Open Invariants

### 12.1 Save And Save As

The user-visible persistence invariant is:

- if a previously valid destination exists, it remains recoverable when a new
  write fails before commit;
- success is not reported until destination commit/replacement completes;
- temporary data is created in the destination directory when same-filesystem
  replacement requires it;
- partial temporary files are cleaned up after handled failure when cleanup is
  safe and does not endanger the prior valid file;
- Save As does not adopt its selected path until write/commit succeeds;
- a failed write changes neither current path nor clean baseline;
- the write consumes one immutable normalized snapshot, not live mutable state.

This contract owns those invariants. The focused #312 implementation selects an
adjacent exclusive temporary file followed by one platform namespace commit:
Windows uses `MoveFileExW` with replace-existing and write-through flags but no
copy fallback, while Linux/macOS use same-filesystem rename. The temporary file
is written, flushed, synchronized, and closed first. Focused tests cover actual
Windows replace-existing and sharing-lock failure behavior. No fallible
parent-directory sync follows commit, so this contract still does not promise
power-loss durability for the directory entry, antivirus behavior, or stronger
filesystem guarantees than the documented host primitive provides.

### 12.2 Open As A Two-Phase Transition

Open must execute in this order:

1. Ask for a candidate path.
2. Read, parse, validate, migrate, and normalize a complete candidate without
   mutating the active session.
3. If an active session would be replaced, run the shared replacement guard
   against the latest session state.
4. Commit the complete candidate through one atomic project/session transition.
5. Only after commit succeeds, establish the selected path, a new session ID,
   the clean baseline corresponding to the exact accepted normalized
   candidate, the editor route, and success feedback.

File-dialog cancellation, invalid input, read failure, migration failure,
validation failure, declined replacement, or commit failure must leave the
existing session intact. A load commit must not depend on a visible sequence of
independent React setters that can expose mixed old/new state.

Open captures the active session ID/revision before staging for diagnostics,
but guard authorization is based on the latest state after staging. The final
commit uses compare-and-swap or an equivalent aggregate-transition check. If
the session changes during staging or after authorization, the command must
re-run the guard/commit decision; it must not apply a candidate under stale
permission.

Ordinary non-conflicting editing may continue while an immutable save snapshot
is written or an Open candidate is staged. Lifecycle/file commands remain
blocked by their scopes. Correctness is preserved by immutable snapshots,
session ID/revision checks, derived dirty comparison, and guard re-evaluation.
An implementation may temporarily block editing instead, but it must do so
centrally and accessibly rather than relying on individual buttons.

## 13. Global Feedback Ownership

The application must have one feedback boundary that remains available on
Home, in either editor, around dialogs, and for future menu/shortcut/native
invocations. It may render a toast, persistent alert, or initiating-surface
status, but command semantics cannot depend on a preview toast being mounted.

Feedback rules:

1. Commands return typed results; the dispatcher/feedback policy decides what
   to announce.
2. Failures produce accessible user-facing feedback with a stable error code
   available to diagnostics.
3. Cancellation and decline are not failures. Open/Save dialog cancellation
   may produce intentional neutral feedback such as “Open cancelled”; a guard
   decline may remain quiet when unchanged state is self-evident.
4. Home-triggered Open cancellation and failure must be visible and
   understandable on Home, closing the gap tracked by #300.
5. Success feedback is intentional and emitted once. A button and dispatcher
   must not both announce the same result.
6. User copy excludes raw platform exception details. Diagnostic logs may
   retain safe cause chains and operation/session correlation IDs.
7. Failure feedback remains available long enough to perceive and must not be
   lost merely because a successful command changed workspace.

Presentation components may subscribe to the global boundary and choose a
surface-appropriate rendering. They must not reinterpret a failure as success
or maintain a second command-result taxonomy.

## 14. Dialogs, Reentrancy, Focus, And Shortcut Arbitration

At most one conflicting lifecycle/file-dialog workflow may own the transition
at a time. Repeated activation while its scopes are busy returns a central
`not-executed/busy` dispatch result and must not open a second Tauri dialog,
show a duplicate guard, perform a duplicate write, or apply the same transition
twice. All normal and exceptional exits release ownership.

Custom confirmation dialogs must follow the modal lifecycle tracked by #309:
focus enters the modal, stays within it, exposes an accessible name and choices,
handles Escape according to the result model, and returns focus to a sensible
initiating control when no transition replaces that surface.

Future shortcut routing uses this precedence:

1. active modal/dialog;
2. focused editable/native control, including applicable `input`, `textarea`,
   `select`, `contenteditable`, and source editor;
3. preview-owned interaction shortcuts;
4. global application commands.

Application Undo/Redo must not steal browser/native editing undo from a focused
text or source field. Space activation and preview panning must respect focused
interactive controls; #298 remains the focused implementation tracker. A
future native menu and keyboard router must dispatch the same command IDs as
visible controls.

Native close/Quit adapters must prevent reentrant close loops. After the shared
guard grants termination, the adapter issues one close/Quit with a one-use
permit or bypass token; the resulting native close event consumes that permit
instead of re-opening the guard. Failure to hand off clears the permit and
returns a typed failure.

## 15. Future Undo/Redo Integration Boundary

Application Undo/Redo is not implemented and is not specified in detail here.
Future history work must satisfy these lifecycle boundaries:

- project mutations declare transaction and coalescing boundaries;
- New and Open replace the document aggregate and reset history;
- Save and Save As change session metadata/baseline only and create no content
  history entry;
- dirty after Undo/Redo remains derived by comparing current canonical project
  content with the saved baseline;
- returning exactly to the baseline through Undo may therefore become clean;
- focused browser/native text undo remains distinct from application history;
- future `canExecute` for Undo/Redo comes from the history owner, never from a
  toolbar, menu, or shortcut component.

## 16. Testable Invariants And Future Validation Layers

An implementation is not conformant unless tests demonstrate at least these
invariants:

1. At most one complete project session exists.
2. New blank projects are pathless, baseline-less, and dirty.
3. Loaded projects receive the selected path and start clean.
4. Dirty is derived from canonical project comparison; UI-only changes do not
   affect it.
5. Save with a path opens no destination dialog; pathless Save uses Save As.
6. Save As adopts no path before successful write commit.
7. Save failure preserves the old path, old baseline, current content, and
   previous valid destination.
8. A save of revision `R` cannot mark revision `R+1` clean unless canonical
   content actually equals the written snapshot.
9. Open failure/cancellation/decline cannot mutate any active-session slice.
10. Open commits all normalized content, identity, route, path, and baseline in
    one observable transition.
11. A clean session closes/replaces without a save prompt; a dirty session gets
    Save/Discard/Cancel.
12. Guard authorization is bound to current session ID/revision.
13. Return Home retains the session and opens no replacement guard.
14. Resume performs no read, normalization, baseline change, or new identity.
15. Repeated activation cannot open overlapping dialogs or duplicate a
    lifecycle transition.
16. Every executed async command returns success, cancellation, decline, or
    failure; every non-executed dispatch is centrally disabled/busy/unknown.
17. Home receives Open cancellation/failure feedback without an editor preview.
18. Native close/Quit invokes the guard once and terminates once after approval.
19. Shortcut precedence preserves modal, editable-control, and preview
    ownership ahead of global commands.
20. Case Front/Back/Spine navigation and other session-only state do not affect
    dirty comparison under this contract.

Future validation layers:

| Layer | Required focus |
| --- | --- |
| Pure unit tests | Canonical comparison, dirty derivation, guard decisions, command capabilities, result mapping, scope conflicts, and revision authorization |
| Session/reducer tests | Aggregate New/Open/Close commits, Home/Resume retention, Save baseline transitions, history-reset boundaries |
| Command integration tests | Dialog/read/write ordering, cancellation/decline/failure preservation, repeated dispatch, global feedback, nested guard Save |
| Project compatibility tests | Current schema parsing/migration and canonical comparison across Disc/Case fixtures without adding session metadata to JSON |
| Rust persistence tests | Same-directory temporary writes, replacement failure recovery, cleanup, Windows replace-existing behavior, declared durability level |
| UI accessibility tests | Capability presentation, modal focus lifecycle, global feedback on Home/editor, initiating-focus restoration |
| Native/manual tests | Tauri file dialogs, native Close Window/Quit interception, no reentrant close loop, platform-specific persistence behavior |

Source tests cannot by themselves establish native dialog, filesystem, or
window-event correctness. Runtime claims must distinguish automated source
validation from actual native verification.

## 17. Issue Mapping And Implementation Dependencies

Open issue bodies and comments were reviewed on 2026-07-25. No newer open
issue was found that supersedes the following ownership:

| Issue | Relationship to this contract |
| --- | --- |
| [#308](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308) | Principal implementation parent for session identity, current path, clean baseline, derived dirty state, Save/Save As, replacement guards, and Home Resume. |
| [#312](https://github.com/thelordofdino4/steam-backup-label-studio/issues/312) | Atomic project-write implementation owner, including Windows replacement and recovery semantics. The focused native implementation is present in this checkpoint; the issue remains open pending normal review/merge workflow. |
| [#300](https://github.com/thelordofdino4/steam-backup-label-studio/issues/300) | Focused Home Open cancellation/failure feedback gap; should consume the global result/feedback boundary rather than invent a local taxonomy. |
| [#303](https://github.com/thelordofdino4/steam-backup-label-studio/issues/303) | Temporary conservative always-prompt proposal. Its final architectural direction is superseded by this dirty-aware guard; useful wording/tests may still inform implementation. |
| [#298](https://github.com/thelordofdino4/steam-backup-label-studio/issues/298) | Focused Space activation/focus prerequisite for shortcut arbitration. It does not by itself implement an app-wide shortcut system. |
| [#309](https://github.com/thelordofdino4/steam-backup-label-studio/issues/309) | Shared custom-modal focus lifecycle required by replacement/close confirmations. |
| [#302](https://github.com/thelordofdino4/steam-backup-label-studio/issues/302) | Focused Export ordering implementation. Exact `export.png` sequencing, including conditional warning confirmation, is owned by [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md); this lifecycle contract supplies the shared vocabulary. |

No open issue found in searches for command registry, application lifecycle,
project session, close/Quit, global feedback, shortcuts, Undo/Redo, recent
projects, autosave, or recovery establishes a newer command/lifecycle owner.
Issue #168 mentions undo only within layout-preset concerns and is not an
application-history owner.

Dependency-focused implementation order:

1. Project-session aggregate, deterministic canonical baseline comparison, and
   the lifecycle state store/composition root are present; one production root
   is mounted at the React application boundary.
2. Typed command results, registry/dispatcher, centralized state and
   implementation-aware predicates, and lifecycle busy ownership are present;
   `project.open` is the sole production operation port.
3. The atomic persistence primitive implemented under #312 is present but not
   yet consumed by the legacy Save path.
4. Two-phase Open and atomic aggregate load/apply transition are present.
5. Save/Save As and the dirty-aware replacement guard under #308.
6. Home Resume and global feedback, including #300.
7. Native Close Window/Quit adapter with one-use termination authorization.
8. Shortcut router, #298 focus behavior, and future menu adapters.
9. Transaction/history owner when separately designed.

## 18. Exclusions And Explicitly Unresolved Questions

Beyond the implementation checkpoint above, this contract does not claim
current support for:

- native application-menu rendering; the final target hierarchy and adapter
  boundary are defined in
  [`APPLICATION_MENU_BAR_CONTRACT.md`](APPLICATION_MENU_BAR_CONTRACT.md);
- recent projects;
- autosave, crash recovery, or resumable drafts across process restarts;
- multi-document editing;
- application Undo/Redo implementation;
- native window geometry/state persistence;
- Help/About/version/documentation-link implementation; presentation-neutral
  targets and menu placement are defined in
  [`APPLICATION_MENU_BAR_CONTRACT.md`](APPLICATION_MENU_BAR_CONTRACT.md);
- detailed Export, Game, Disc Template/physical-geometry, Layout Preset, or
  Guided Workflow behavior;
- schema reconstruction or new persisted fields beyond the authority boundary
  stated here.

The #312 primitive and durability question is now resolved by section 12.1. The
following questions remain for focused implementation or product decisions
without weakening the invariants above:

1. How native path identity handles Windows case, UNC paths, symlinks, and
   path-display normalization while keeping the user-selected destination
   truthful.
2. Whether the current serialized coarse Case Cover/Tray pane should remain for
   compatibility, be removed in a future schema version, or expand through a
   separately approved navigation-persistence decision. This contract still
   treats the full Front/Back/Spine route as session-only.
3. Whether non-conflicting editing is enabled during each platform's native
   dialog and long file operation. If enabled, the snapshot/revision rules in
   this contract are mandatory.
4. Exact feedback retention, notification presentation, and diagnostic storage
   policy, provided Home/editor accessibility and non-duplication remain true.
5. Multi-window semantics if the product ever grows beyond the current
   single-session model; such a change requires a replacement lifecycle
   contract rather than weakening “at most one session” implicitly.
