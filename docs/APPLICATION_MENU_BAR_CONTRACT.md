# Application Menu Bar Contract

> Status: Draft target-state normative contract.
> Purpose: Define the final File/Edit/Tools/Window/Help hierarchy, stable presentation item identities, native Tauri ownership, semantic dispatch, capability projection, workflow launchers, focus behavior, platform placement, and sidebar migration gates.
> Read when: Designing or implementing the application menu, native menu events, menu capabilities, application shortcuts, rich workflow launchers, Help/About, Window actions, or removal of application-level sidebar controls.
> Authoritative source: This document for target application-menu presentation and integration; focused lifecycle, navigation, Export, Game, Disc geometry, Disc Layout Preset, project-file, and SDD authorities retain their semantic domains.
> Evidence baseline: `main` at `32e94b0a343d02bb7dfb74adb6d05d325cd73769`, reviewed 2026-07-26.
> Focused package/save-load facts reviewed against `main` at `a104825583a1cc03e145a9e460e9abccf4483bf7` on 2026-07-27; this does not re-baseline unrelated menu evidence.
> Focused lifecycle/navigation facts reviewed after PR #328 merged at `5e320e8b620bf8184db3e5723d0d26f034195c6e`; the subsequent #298/#309 source checkpoint is recorded without claiming native-menu implementation.
> Focused lifecycle checkpoint: PR #327 merged at `43a6d8f5ca7b1b2e040c68e0a7cace2b111a4172`; the later current-project synchronization, shared New/Open replacement guard, Home Return/Resume, exact route retention, and shared feedback boundary are recorded below without claiming native-menu implementation.
> Focused native-runtime checkpoint: current worktree on 2026-07-30 implements descriptor-driven native construction, conservative state projection, a typed activation bridge, and bridge-scoped teardown without semantic command wiring.
> Focused File-routing checkpoint: current worktree on 2026-07-30 connects the seven implemented File lifecycle targets through the existing lifecycle root and shared feedback owner; Export, Close/termination, Edit, Tools, Window, and Help remain disconnected.

## 1. Status, scope, and authority

**CURRENT FACT —** This remains a draft target-state normative contract. The
lifecycle dispatcher/capability foundation, pure descriptor/projection model,
and first native runtime adapter now exist. The native adapter constructs the
platform hierarchy from the TypeScript-owned descriptor, installs every item
disabled and unchecked, applies validated generation-ordered enabled, checked,
and dynamic-label presentation state, and forwards typed activations to a
frontend ingress. That ingress now resolves the seven implemented File
lifecycle commands from their descriptor semantic targets, dispatches through
the existing lifecycle root, and publishes terminal results through the shared
feedback owner. Export, Close/termination, rich workflow hosts, Edit, Window,
application history, and Help surfaces remain unimplemented.

**TARGET REQUIREMENT —** This contract owns:

- the product-defined top-level order `File`, `Edit`, `Tools`, `Window`, `Help`;
- visible item labels, ellipses, grouping, order, accelerators, platform
  placement, and stable presentation item IDs;
- the boundary between native presentation, semantic dispatch, native window
  roles, focused-edit roles, informational owners, and rich workflow launchers;
- target native-menu construction, event delivery, capability projection,
  teardown, and single-window assumptions; and
- the migration gate for removing Project File, Export Options, Game, Disc
  Template, and Disc Layout Presets from the main editor sidebar.

**TARGET REQUIREMENT —** Authority remains divided as follows.

| Claim | Concern | Authority |
| --- | --- | --- |
| TARGET REQUIREMENT | Application menu hierarchy, item IDs, labels, placement, native bridge, and menu migration | This contract |
| TARGET REQUIREMENT | Application command IDs, session/path/baseline/dirty state, Save/Save As, replacement and close guards, busy scopes, results, feedback, and future history boundary | [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) |
| TARGET REQUIREMENT | `.sbls` package eligibility, legacy-format conversion, and package binary persistence | [`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md) |
| TARGET REQUIREMENT | Typed editor destinations, presentation-adapter rules, control ownership, workflow reveal/focus, ribbon, and preview-local boundaries | [`EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md`](EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md) |
| TARGET REQUIREMENT | `export.png`, target resolution, immutable request, preflight, warning review, destination, rendering, writing, results, and Export busy scope | [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) |
| TARGET REQUIREMENT | Game search, selection, plan/review/apply, metadata operations, stale results, and Disc/Case effects | [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md) |
| TARGET REQUIREMENT | Disc template choice, custom geometry drafts, validation, plan/review/apply, clamp/reflow, and recovery | [`DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`](DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md) |
| TARGET REQUIREMENT | Disc Layout Preset select/plan/apply/reapply/detach and applied-configuration semantics | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md) |
| TARGET REQUIREMENT | Serialized fields, compatibility, validation, and migrations | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) |
| CURRENT FACT | As-built application, editor, renderer, save/load, export, interaction, and Tauri boundaries | Current source and [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md) |
| TARGET REQUIREMENT | Product scope and feature boundaries | [`PRD.md`](PRD.md) |

**TARGET REQUIREMENT —** If claims appear to conflict, classify them before
resolving them. Current behavior defers to source and the SDD. Target workflow
semantics defer to their focused contracts. This contract decides only how the
native application menu presents and reaches those semantics.

**TARGET REQUIREMENT —** Every substantive claim in this document is marked
`CURRENT FACT`, `TARGET REQUIREMENT`, `FUTURE EXTENSION`, or `OPEN QUESTION`.
A table row's `Claim` column classifies every substantive statement in that
row. Mandatory product and semantic decisions are target requirements, not
open questions.

**TARGET REQUIREMENT —** This contract changes no project-file field and makes
menu state non-serializable. No item label, enabled state, checked state,
platform placement, open workflow host, focus-return target, accelerator, or
native invocation token is project content or participates in dirty comparison.

## 2. Product intent and terminology

**TARGET REQUIREMENT —** The application menu is persistent application chrome
for stable application, project, workflow-entry, window, and informational
actions. It is not a second editor, a collection of copied sidebar callbacks,
or a replacement for contextual controls.

**TARGET REQUIREMENT —** The application menu and contextual ribbon are two
different systems. The menu remains present regardless of selected design
element. The ribbon remains contextual to the selected preview element and
continues to adapt the selected owner's text-editing capabilities. Menu work
must not move ribbon categories, contextual setters, Done/Delete behavior, or
HTML/source editing into application menus.

**TARGET REQUIREMENT —** Terms have these exact meanings.

| Claim | Term | Meaning |
| --- | --- | --- |
| TARGET REQUIREMENT | Application menu | The product-defined native `File`, `Edit`, `Tools`, `Window`, and `Help` hierarchy. |
| TARGET REQUIREMENT | macOS application menu | The operating-system-required product-name submenu that precedes the five product menus on macOS. It is platform placement, not a sixth product-defined domain menu. |
| TARGET REQUIREMENT | Contextual ribbon | The stable app-shell host whose contents are supplied by the currently selected editing owner. It is not the application menu. |
| TARGET REQUIREMENT | Presentation item ID | A stable `menu.*` identity used by descriptors, native items, bridge messages, projections, tests, and diagnostics; it is not a semantic command ID. |
| TARGET REQUIREMENT | Semantic target | One lifecycle command, domain operation, typed editor destination, focused-edit role, native-window operation, or informational operation reached by a menu item. |
| TARGET REQUIREMENT | Direct semantic command | A menu activation that dispatches one exact registered command, whose owner may still open its own guard or dialog. |
| TARGET REQUIREMENT | Rich workflow launcher | A navigation-only item that reveals and focuses an owner-backed workflow surface without selecting, planning, applying, or otherwise mutating project content. |
| TARGET REQUIREMENT | Application workflow host | One nonmodal, accessible app-shell region outside the main editor sidebar and contextual ribbon that hosts Game, Export Options, Disc Template, or Disc Layout Presets. |
| TARGET REQUIREMENT | Capability | An owner-computed `canExecute` or navigation-availability result, including a stable unavailable reason. |
| TARGET REQUIREMENT | Capability projection | An ephemeral native-menu view of current semantic and focused-control capabilities. Projection is advisory and must be rechecked at dispatch. |
| TARGET REQUIREMENT | Focused-edit role | Undo, Redo, Cut, Copy, Paste, or Select All delegated to the focused editable/native control; it is distinct from application project history. |
| TARGET REQUIREMENT | Native-window operation | Minimize, maximize/restore/zoom, or full-screen behavior owned by the target Tauri window, not by the project session. |
| TARGET REQUIREMENT | Modal owner | The currently active dialog or modal workflow that has first keyboard, focus, and cancellation priority. |

**TARGET REQUIREMENT —** Menu items, Home cards, React buttons, native close
events, and shortcuts are presentation adapters. Where they express the same
intent, they dispatch the same semantic owner. They must not copy callbacks,
guards, setters, capability predicates, dialog order, renderer selection,
workflow sequences, or feedback rules from current sidebar components.

**TARGET REQUIREMENT —** Dynamic enabled/disabled state comes from semantic
capabilities, focused-control capabilities, or native-window capabilities. The
same capability is rechecked when an activation reaches its owner. A stale
enabled item may therefore return a typed `not-executed/disabled` or
`not-executed/busy` result without performing work.

**TARGET REQUIREMENT —** Revealing or focusing a workflow is navigation only.
It must never be reported as successful Search, Import, Export, template change,
preset selection, plan, Apply, Reapply, Detach, Save, or another mutation.

## 3. Verified current-state behavior

### Current-versus-target behavior matrix

**CURRENT FACT —** The current-versus-target matrix records the focused source
verification performed against the evidence baseline.

| Claim | Concern | Verified current state | Required target state |
| --- | --- | --- | --- |
| CURRENT FACT / TARGET REQUIREMENT | Native application menu | `src-tauri/src/application_menu.rs` constructs the native hierarchy from the TypeScript-owned platform descriptor, retains checkable native item handles, applies enabled/checked/label presentation state, and registers one process-level menu-event handler. Seven lifecycle-routed File items plus `Export PNG…` may become enabled from their owner capabilities; all other items remain conservatively disabled and unchecked. | Rust continues to own only presentation/native-window adaptation. |
| CURRENT FACT / TARGET REQUIREMENT | Windows accelerator delivery | In the real Windows Tauri window, native Ctrl accelerators do not produce menu events even though clicking the same enabled File items reaches the shared ingress. This matches open upstream Tauri #6981 and Wry #451: WebView2 consumes the key message before the Win32 menu accelerator path. A bounded Windows WebView fallback now derives command-owned chords from the authoritative descriptor, consumes only the latest projected-enabled item after earlier key owners, and enters the same validated ingress with cross-source deduplication. | Keep the native menu as presentation authority. Until upstream delivery is fixed and accepted, the Windows fallback must remain descriptor-derived, window-local, capability-rechecked, modal/default/repeat/composition aware, deduplicated against native events, and disconnected on teardown. It must never become a parallel semantic callback registry or system-global shortcut owner. |
| CURRENT FACT / TARGET REQUIREMENT | Custom React application menu | No React menubar, `role="menubar"`, or application-menu component exists. Home “menu cards” are ordinary buttons, not an application menu. | No production React imitation is introduced; the native menu is the default target. |
| CURRENT FACT / TARGET REQUIREMENT | Menu event bridge | One bridge-instance-scoped adapter listens before installation, validates window/bridge/item/invocation identity, rejects duplicate invocations, and forwards typed native envelopes to a frontend ingress. The ingress additionally rechecks bridge/window/projection generation and resolves seven lifecycle targets plus descriptor-owned `export.png`. | Later workflow wiring consumes the same ingress without adding a second native registry or callback path. |
| CURRENT FACT / TARGET REQUIREMENT | Command registry/dispatcher | One application root owns a typed registry/dispatcher and busy coordinator. The lifecycle-only subset stays distinct while `export.png` is registered in the same application catalog. Home, Project File controls, and connected native File items dispatch through one feedback adapter. | Menu, Home, sidebar compatibility adapters, buttons, shortcuts, and native close events share the lifecycle/domain dispatcher. |
| CURRENT FACT / TARGET REQUIREMENT | Central capabilities | A committed React-owned ingress enables the lifecycle and export boundaries only after their dependencies are ready. Seven lifecycle File items and `Export PNG…` consume owner capabilities and recheck at dispatch; unavailable boundaries return during teardown. Workflow launchers, focused edit, native window, Help, Close, and termination remain disabled. | Semantic owners project centralized capabilities to all adapters and recheck at dispatch. |
| CURRENT FACT / TARGET REQUIREMENT | Home | `HomeScreen.tsx` exposes Resume only when one lifecycle session is retained on Home, plus Open, New Disc, and New Case Insert. Its Resume copy projects kind, display name, dirty/clean state, and exact route from the session; its live status surface receives shared command feedback. | Future File items dispatch these same commands and consume the same capabilities; the native menu must not copy Home callbacks. |
| CURRENT FACT / TARGET REQUIREMENT | Disc Project File | `ProjectPanel.tsx` exposes Main Menu, New Disc, Save Project, Load Project, Export PNG, and New Case Insert. | Those application-level actions move to File; the panel remains until replacement parity is proven. |
| CURRENT FACT / TARGET REQUIREMENT | Case Project File | `CaseInsertEditorShell.tsx` duplicates Main Menu, New Case Insert, New Disc, Save, Load, and Export PNG. | The same File adapters serve Disc and Case; no Case-only command copies remain. |
| CURRENT FACT / TARGET REQUIREMENT | Save | `project.save` now writes directly only for a truthful package-v1 session at an eligible `.sbls` path; pathless, legacy-format, and wrong-suffix sessions use Save As. Save captures lifecycle-owned `R`, and post-commit adoption preserves a newer current `R+1` as dirty without editor recapture. | Menu adapters dispatch these same owners; `project.save-as` always chooses an eligible package destination. |
| CURRENT FACT / TARGET REQUIREMENT | New/Open replacement | `project.new-disc`, `project.new-case`, and `project.open` are production owners. No-session and clean replacement proceed without a prompt; dirty/baseline-less replacement uses one accessible Save/Discard Changes/Cancel guard bound to session ID/revision. | File/Home/sidebar adapters continue sharing these owners; Close Project and native Close Window/Quit remain later lifecycle work. |
| CURRENT FACT / TARGET REQUIREMENT | Return Home / Resume | `workspace.return-home` and `project.resume` are production owners. Return Home uses no replacement guard and retains the exact session; Resume performs no read/restore and returns to Disc or the exact Case Front/Back/Spine route. Route synchronization is session-only and does not change project revision or dirty state. | Future File adapters dispatch these owners; Close Project separately retires the session. |
| CURRENT FACT / TARGET REQUIREMENT | Command feedback | Home/sidebar controls and the eight connected File items use one `ApplicationCommandDispatchResult`/`ApplicationCommandFeedbackIntent` owner. The menu runtime publishes each dispatcher result once through the React-committed adapter; active deduplication keys prevent duplicate visible publication, and accepted messages reach editor toasts and the Home live status surface. | Later menu events reuse the same boundary and cannot publish a second result. |
| CURRENT FACT / TARGET REQUIREMENT | Export | Disc and Case Project File buttons plus File `Export PNG…` dispatch one `export.png` owner. It centrally resolves Disc/Cover/complete Tray targets, preserves preflight-before-destination order, owns export busy scopes, and returns typed feedback once. Home remains disabled; direct PNG writing and Disc preview-width coupling remain. | Tools `Export Options…` only reveals owner-backed configuration. |
| CURRENT FACT / TARGET REQUIREMENT | Game | `GamePanel.tsx` combines query, Search, immediate result-import activation, metadata fields, candidate discovery/application, and feedback. | Tools `Game…` opens the rich Game host; explicit selection, immutable planning, review, and owner apply replace immediate target behavior. |
| CURRENT FACT / TARGET REQUIREMENT | Disc Template | `TemplatePanel.tsx` selects and immediately changes built-in/custom Disc geometry; custom fields are direct controlled inputs. | Tools `Disc Template…` opens the Disc geometry owner and its choose/draft/plan/review/apply flow. |
| CURRENT FACT / TARGET REQUIREMENT | Disc Layout Presets | `DiscLayoutPresetsPanel.tsx` owns local selection and an Apply button plus Guided progress controls. | Tools `Disc Layout Presets…` reveals the preset owner; the launcher performs none of the five preset operations. |
| CURRENT FACT / TARGET REQUIREMENT | Case “Template” | The Case shell's current Template panel switches Cover Sheet/Tray Card presentation; it is navigation rather than Disc physical geometry. | It remains a Case surface-navigation concern and is not wired to the Disc Template launcher. |
| CURRENT FACT / TARGET REQUIREMENT | Contextual ribbon | `PreviewHeader.tsx` hosts registered contextual text content; Disc and Case previews mount the provider. | Ribbon ownership and selected-owner behavior remain unchanged by menu migration. |
| CURRENT FACT / TARGET REQUIREMENT | Preview-local controls | `PreviewViewport.tsx` owns zoom, pan, Fit, and Space-pan state; both previews own Guide Legend and Design Check expansion locally. | Those controls remain preview-local and do not move into this menu. |
| CURRENT FACT / TARGET REQUIREMENT | Shortcut ownership | The shared preview's window-level Space listener arms preview pan only from a preview-owned, noninteractive origin. The bounded Windows menu fallback runs at the WebView window bubble boundary; an active application modal, an earlier stopped/default-prevented event, composition, or repeat retains ownership. It excludes focused-edit and native-window roles and forwards only descriptor-owned application/domain command accelerators. No general or system-global shortcut router exists. | Modal, focused editable, preview, then application-command precedence remains authoritative as more owners connect. |
| CURRENT FACT / TARGET REQUIREMENT | Image-candidate modal focus | The shared `ImageCandidatePicker` now owns deterministic selected/first/Close/dialog focus entry, dynamic Tab/Shift+Tab containment, idle Escape/Close, busy-operation protection, and safe opener-or-ancestor restoration. Candidate discovery, ordering, selection, apply, and project mutation remain in existing callers. | Later application-menu and workflow-host modals consume the same precedence requirements without treating this picker-local helper as a general modal framework. |
| CURRENT FACT / TARGET REQUIREMENT | Undo/Redo | No application project-history owner or `canUndo`/`canRedo` capability exists. Browser/native text controls retain their own editing behavior. | Focused text Undo/Redo remains available; application history integration is a later owner-backed extension. |
| CURRENT FACT / TARGET REQUIREMENT | Help/About | No Help, About, version-dialog, documentation resource, issue-reporting, or update command exists. | Informational Help/About targets are defined here without claiming implementation; report-issue remains omitted until a trusted resource is configured. |

**CURRENT FACT —** The repository uses `@tauri-apps/api` 2.11.0-compatible
packages, Tauri CLI 2.11.2, and Rust `tauri = 2.11.2`. `tauri.conf.json`
declares one resizable desktop window and product/version values `Steam Backup
Label Studio` / `0.1.0`; `Cargo.toml` currently has an empty `repository` field.

**CURRENT FACT —** Official Tauri 2 documentation confirms that native desktop
menus can be constructed in Rust, set application-wide, grouped into submenus,
given custom IDs and accelerators, updated, and observed through menu events.
The [`tauri::menu` API](https://docs.rs/tauri/latest/tauri/menu/) describes a
window menu bar on Windows/Linux and a global menu bar on macOS; the official
[Tauri v2 Window Menu guide](https://v2.tauri.app/learn/window-menu/) documents
`MenuBuilder`, `app.set_menu`, and menu-event handling.

**CURRENT FACT —** On Windows with the repository's pinned Tauri/Wry stack,
native menu clicks reach `on_menu_event`, while Ctrl accelerators do not. This
is the same unresolved WebView2 interception reported in
[Tauri #6981](https://github.com/tauri-apps/tauri/issues/6981) and
[Wry #451](https://github.com/tauri-apps/wry/issues/451). The descriptor remains
the authority for accelerator labels and semantic mappings. The bounded
`windowsWebviewApplicationMenuAccelerators.ts` adapter derives only
application/domain-command chords from that descriptor, checks the latest
applied enabled projection before consuming the event, and enters the same
bridge/window/generation-validated runtime ingress. A 100 ms cross-source guard
prevents one keypress from dispatching twice if native delivery later also
fires. It is not a Tauri global-shortcut registration. Linux and macOS
accelerator behavior remains native-acceptance work, not an inferred success
from descriptor tests.

**CURRENT FACT —** Tauri 2's text-only menu APIs require no new crate feature.
Image menu items would require image features, but this design defines no menu
icons. The current dependency line therefore presents no concrete blocker to
the native menu target.

**CURRENT FACT —** Tauri predefined Undo/Redo are unsupported on Windows and
Linux, and several predefined window/Quit roles also have platform limits. The
official [`PredefinedMenuItem` reference](https://docs.rs/tauri/latest/tauri/menu/struct.PredefinedMenuItem.html)
records those limits. Cross-platform target behavior must therefore use the
focused-edit router or explicit native window/application adapters where a
predefined role cannot satisfy this contract.

## 4. Native menu presentation and ownership

**TARGET REQUIREMENT —** Steam Backup Label Studio uses a native Tauri
application menu as its production menu. Rust owns construction, native object
handles, OS placement, accelerator registration, native window actions, state
application, and event forwarding. Rust must not own Save, Export, Game,
Template, Preset, dirty-state, replacement, or workflow decisions.

**TARGET REQUIREMENT —** Native implementation belongs in a focused Rust
application-menu module. `src-tauri/src/lib.rs` may register that module and its
bridge, but must not become a menu logic dump. Frontend integration belongs in
a focused application-menu adapter that maps presentation IDs to existing
semantic commands, typed destinations, focused-edit roles, and informational
owners. `App.tsx` may connect application state to that adapter; it must not
copy menu-specific workflow implementations.

**TARGET REQUIREMENT —** Ownership is exact.

| Claim | Layer | Owns | Must not own |
| --- | --- | --- | --- |
| TARGET REQUIREMENT | Rust descriptor/construction | Native submenus/items/separators, visible labels, accelerators, platform placement, native handles | Project eligibility, dirty guards, Save, Export, Game, geometry, presets, or feedback policy |
| TARGET REQUIREMENT | Rust native-window adapter | Minimize, maximize/restore/zoom, full-screen state/action, actual window identity | Project/session lifecycle or editor navigation |
| TARGET REQUIREMENT | Rust bridge | One invocation envelope per custom item activation; latest state-projection application | Meaning of semantic commands or typed destinations |
| TARGET REQUIREMENT | Frontend menu adapter | Exhaustive mapping for frontend-owned item IDs; projection request; dispatch/focus initiation | Cloned sidebar callbacks, native-window actions, or owner rules |
| TARGET REQUIREMENT | Command dispatcher | Registered command lookup, capability recheck, scopes, execution, typed result | Menu labels, grouping, OS placement |
| TARGET REQUIREMENT | Editor navigation router | Destination validation, reveal/focus, typed navigation result | Applying Game, geometry, preset, or export operations |
| TARGET REQUIREMENT | Focused-edit router | Resolve current editable owner and delegate Undo/Redo/Cut/Copy/Paste/Select All | Project history or arbitrary preview-object editing |
| TARGET REQUIREMENT | Workflow/domain owners | Validation, drafts, plans, mutations, busy state, results | Native menu presentation |
| TARGET REQUIREMENT | Feedback/focus owners | One result projection, announcements, workflow-host focus, restoration/fallback | Re-running or reinterpreting the command |

**TARGET REQUIREMENT —** The presentation descriptor and bridge use these
logical payloads or exhaustively equivalent types.

```ts
type ApplicationMenuInvocation = Readonly<{
  invocationId: string
  itemId: ApplicationMenuItemId
  windowLabel: string
  projectionGeneration: number
}>

type ApplicationMenuItemProjection = Readonly<{
  itemId: ApplicationMenuItemId
  enabled: boolean
  checked: boolean
  visible: boolean
  label?: string
  unavailableReason?: string
}>

type ApplicationMenuProjection = Readonly<{
  generation: number
  windowLabel: string
  sessionId?: string
  workspace: 'home' | 'disc' | 'case'
  items: readonly ApplicationMenuItemProjection[]
}>
```

**TARGET REQUIREMENT —** The native event router classifies stable item IDs,
never labels or native positions. Frontend-owned custom items are forwarded in
the invocation envelope. Native-window and verified predefined responder roles
stay with their true native owner. Unknown IDs produce a diagnostic and no
execution. One forwarded native activation produces one invocation ID; the
frontend consumes it once. Duplicate invocation IDs are ignored and logged.
The dispatcher still applies its own repeat/busy policy.

**TARGET REQUIREMENT —** Native event routing is exact.

| Claim | Item class | Event route |
| --- | --- | --- |
| TARGET REQUIREMENT | File lifecycle and Export items | Rust forwards stable ID/envelope to the frontend application adapter; dispatcher rechecks and owns execution. |
| TARGET REQUIREMENT | Tools launchers | Rust forwards stable ID/envelope; frontend navigation router rechecks and reveals/focuses only. |
| TARGET REQUIREMENT | Edit roles | Use a verified native responder/predefined role where it reaches the focused owner; otherwise forward to the focused-edit router. Never execute both routes. |
| TARGET REQUIREMENT | Window items and macOS Hide/Services/Show roles | Rust/native owner performs the true window/system operation after rechecking target-window state. |
| TARGET REQUIREMENT | Help documentation | Forward to the frontend Help owner. |
| TARGET REQUIREMENT | About | Use one platform About owner backed by runtime package metadata; a native About role may complete it without frontend dispatch. |
| FUTURE EXTENSION | Report an Issue | No route/item exists until configured. |

**TARGET REQUIREMENT —** Menu capability state is a projection, never the
authorization boundary. After session, workspace, project kind, path, baseline,
dirty state, revision, busy scope, modal state, focused-edit capability,
workflow-host availability, or relevant window state changes, the application
computes a new generation and sends it to Rust. Rust applies only a newer
generation for the named window.

**TARGET REQUIREMENT —** Native text items are constructed once and updated
through handle methods such as enabled/text state. No first-release project or
workflow item is dynamically hidden because of Home/Disc/Case state; it stays
visible and becomes disabled with a stable reason. Platform placement and
feature-presence changes are structural: Rust removes/inserts or rebuilds the
affected submenu only when `visible` changes, then preserves exactly one event
registration. Checked state is always `false` in this hierarchy; the projection
field is reserved for a future reviewed check-item requirement.

**TARGET REQUIREMENT —** Dynamic labels are limited to
`Maximize`/`Restore`, `Zoom`, and `Enter Full Screen`/`Exit Full Screen`.
Dirty or pathless state must not rewrite Save labels, append asterisks to menu
items, or replace semantic IDs.

**TARGET REQUIREMENT —** Close Window and Quit use custom guarded items, not a
predefined role that terminates before `application.close-window` or
`application.quit` runs. Title-bar close, Alt+F4, Command+W, and other native
close requests enter the same lifecycle command and one-use termination-permit
protocol. Native handoff after authorization must not re-enter the guard.

**TARGET REQUIREMENT —** The current application is single-window. The app-wide
menu targets the sole main window; macOS events route to the active main window.
The bridge registers once after app setup, unregisters frontend listeners on
teardown/HMR, rejects events for destroyed/unknown windows, and stops applying
state after teardown.

**FUTURE EXTENSION —** Multi-window or multi-document behavior requires a new
window/session routing contract. It must not broadcast one menu activation to
several windows or infer an active project from the last event.

**TARGET REQUIREMENT —** Production browser/Vite execution renders no custom
React imitation of the application menu. Pure descriptor, mapping, and
capability tests use an in-memory menu port. A browser diagnostic may report
`native-menu-unavailable`; it cannot prove native menu acceptance. Packaged and
development Tauri both use the native menu.

## 5. Top-level hierarchy

### Complete target menu hierarchy

**TARGET REQUIREMENT —** The logical product hierarchy is exactly `File`,
`Edit`, `Tools`, `Window`, `Help`, in that order. No View, Project, Game,
Template, Presets, Export, or Guided Start top-level menu is added without a
separate demonstrated product requirement.

**TARGET REQUIREMENT —** The complete target order is:

```text
File
  New Disc Project                         Primary+N
  New Case Project                         Primary+Shift+N
  Open Project…                            Primary+O
  ──────────────────────────────────────
  Save                                    Primary+S
  Save As…                                Primary+Shift+S
  ──────────────────────────────────────
  Export PNG…                             Primary+E
  ──────────────────────────────────────
  Return Home
  Resume Project
  Close Project
  ──────────────────────────────────────
  Close Window                            Primary+W
  Quit Steam Backup Label Studio          Primary+Q  [Windows/Linux]

Edit
  Undo                                    Primary+Z
  Redo                                    Ctrl+Y [Windows/Linux]
                                          Command+Shift+Z [macOS]
  ──────────────────────────────────────
  Cut                                     Primary+X
  Copy                                    Primary+C
  Paste                                   Primary+V
  Select All                              Primary+A

Tools
  Game…
  ──────────────────────────────────────
  Disc Template…
  Disc Layout Presets…
  ──────────────────────────────────────
  Export Options…

Window
  Minimize                                Command+M [macOS]
  Maximize / Restore                      [Windows/Linux]
  Zoom                                    [macOS]
  ──────────────────────────────────────
  Enter Full Screen / Exit Full Screen    F11 [Windows/Linux]
                                          Control+Command+F [macOS]

Help
  Steam Backup Label Studio Help
  Report an Issue                         [future; omitted until configured]
  ──────────────────────────────────────
  About Steam Backup Label Studio         [Windows/Linux]
```

**TARGET REQUIREMENT —** `Primary` means Control on Windows/Linux and Command
on macOS. macOS moves `About Steam Backup Label Studio` and
`Quit Steam Backup Label Studio` into its required application menu while
retaining their product presentation IDs and semantic targets. The implicit
macOS application submenu does not change the five product-menu identities.

**TARGET REQUIREMENT —** Top-level presentation IDs are stable.

| Claim | ID | Visible label | Product order | macOS native mapping |
| --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `menu.file` | File | 1 | Product File submenu after the OS application submenu |
| TARGET REQUIREMENT | `menu.edit` | Edit | 2 | Product Edit submenu |
| TARGET REQUIREMENT | `menu.tools` | Tools | 3 | Product Tools submenu |
| TARGET REQUIREMENT | `menu.window` | Window | 4 | Map to Tauri/macOS Window submenu identity while retaining the product ID in the descriptor |
| TARGET REQUIREMENT | `menu.help` | Help | 5 | Map to Tauri/macOS Help submenu identity while retaining the product ID in the descriptor |

### Menu-item registry: identity, placement, and target

**TARGET REQUIREMENT —** This registry fixes stable IDs, visible labels,
order, separator groups, semantic class, exact target, accelerators, platform
placement, and current implementation status. `—` means intentionally no
accelerator.

| Claim | Presentation item ID | Visible label | Parent/order | Group | Semantic class | Exact semantic target | Windows/Linux accelerator | macOS accelerator | Platform placement | Current implementation status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `menu.file.new-disc` | New Disc Project | File 10 | file-create | Direct command | `project.new-disc` | Ctrl+N | Command+N | File all platforms | Connected; enabled from the shared lifecycle capability |
| TARGET REQUIREMENT | `menu.file.new-case` | New Case Project | File 20 | file-create | Direct command | `project.new-case` | Ctrl+Shift+N | Command+Shift+N | File all platforms | Connected; enabled from the shared lifecycle capability |
| TARGET REQUIREMENT | `menu.file.open` | Open Project… | File 30 | file-create | Direct command | `project.open` | Ctrl+O | Command+O | File all platforms | Connected; enabled from the shared lifecycle capability |
| TARGET REQUIREMENT | `menu.file.save` | Save | File 50 | file-save | Direct command | `project.save` | Ctrl+S | Command+S | File all platforms | Connected; enabled from the shared lifecycle capability |
| TARGET REQUIREMENT | `menu.file.save-as` | Save As… | File 60 | file-save | Direct command | `project.save-as` | Ctrl+Shift+S | Command+Shift+S | File all platforms | Connected; enabled from the shared lifecycle capability |
| TARGET REQUIREMENT | `menu.file.export-png` | Export PNG… | File 80 | file-export | Workflow command execution | `export.png` | Ctrl+E | Command+E | File all platforms | Connected; enabled only for a ready visible Disc/Case target and available export scope |
| TARGET REQUIREMENT | `menu.file.return-home` | Return Home | File 100 | file-session | Direct command | `workspace.return-home` | — | — | File all platforms | Connected; enabled from the shared lifecycle capability |
| TARGET REQUIREMENT | `menu.file.resume-project` | Resume Project | File 110 | file-session | Direct command | `project.resume` | — | — | File all platforms | Connected; enabled from the shared lifecycle capability |
| TARGET REQUIREMENT | `menu.file.close-project` | Close Project | File 120 | file-session | Direct command | `project.close` | — | — | File all platforms | Native item present but disabled; semantic owner not implemented |
| TARGET REQUIREMENT | `menu.file.close-window` | Close Window | File 140 | file-termination | Guarded application command | `application.close-window` | Ctrl+W | Command+W | File all platforms | Native item present but disabled; interception/semantic owner not implemented |
| TARGET REQUIREMENT | `menu.file.quit` | Quit Steam Backup Label Studio | File 150 | file-termination | Guarded application command | `application.quit` | Ctrl+Q | Command+Q | File on Windows/Linux; macOS application menu | Native item present but disabled; interception/semantic owner not implemented |
| TARGET REQUIREMENT | `menu.edit.undo` | Undo | Edit 10 | edit-history | Focused-edit role; future history fallback | `focused-edit.undo`; future `history.undo` | Ctrl+Z | Command+Z | Edit all platforms | Native item present but disabled; focused-edit routing/application history not implemented |
| TARGET REQUIREMENT | `menu.edit.redo` | Redo | Edit 20 | edit-history | Focused-edit role; future history fallback | `focused-edit.redo`; future `history.redo` | Ctrl+Y | Command+Shift+Z | Edit all platforms | Native item present but disabled; focused-edit routing/application history not implemented |
| TARGET REQUIREMENT | `menu.edit.cut` | Cut | Edit 40 | edit-transfer | Focused-edit role | `focused-edit.cut` | Ctrl+X | Command+X | Edit all platforms | Native item present but disabled; focused-edit routing not implemented |
| TARGET REQUIREMENT | `menu.edit.copy` | Copy | Edit 50 | edit-transfer | Focused-edit role | `focused-edit.copy` | Ctrl+C | Command+C | Edit all platforms | Native item present but disabled; focused-edit routing not implemented |
| TARGET REQUIREMENT | `menu.edit.paste` | Paste | Edit 60 | edit-transfer | Focused-edit role | `focused-edit.paste` | Ctrl+V | Command+V | Edit all platforms | Native item present but disabled; focused-edit routing not implemented |
| TARGET REQUIREMENT | `menu.edit.select-all` | Select All | Edit 70 | edit-transfer | Focused-edit role | `focused-edit.select-all` | Ctrl+A | Command+A | Edit all platforms | Native item present but disabled; focused-edit routing not implemented |
| TARGET REQUIREMENT | `menu.tools.game` | Game… | Tools 10 | tools-game | Rich workflow launcher | `area.game` / `owner.game.search` / `control.game.query` | — | — | Tools all platforms | Native item present but disabled; current sidebar exists; target workflow host not implemented |
| TARGET REQUIREMENT | `menu.tools.disc-template` | Disc Template… | Tools 30 | tools-disc | Rich workflow launcher | `area.template.disc` / `owner.disc-template` / `control.disc-template.selector` | — | — | Tools all platforms | Native item present but disabled; current sidebar exists; target workflow host not implemented |
| TARGET REQUIREMENT | `menu.tools.disc-layout-presets` | Disc Layout Presets… | Tools 40 | tools-disc | Rich workflow launcher | `area.layout-presets.disc` / `owner.disc-layout-presets` / `control.disc-layout-presets.selector` | — | — | Tools all platforms | Native item present but disabled; current sidebar exists; target workflow host not implemented |
| TARGET REQUIREMENT | `menu.tools.export-options` | Export Options… | Tools 60 | tools-export | Rich workflow launcher | Disc: `area.export` / `owner.export.disc-guides` / `control.export.disc.center-hole`; Case Cover: `owner.export.case-guides` / `control.export.case.cover-trim`; Case Tray/Back/Spine: same owner / `control.export.case.tray-trim` | — | — | Tools all platforms | Native item present but disabled; current sidebar controls exist; target workflow host not implemented |
| TARGET REQUIREMENT | `menu.window.minimize` | Minimize | Window 10 | window-size | Native-window operation | `native.window.minimize` | — | Command+M | Window all platforms | Native item present but disabled; window action not wired |
| TARGET REQUIREMENT | `menu.window.toggle-maximize` | Maximize or Restore; Zoom on macOS | Window 20 | window-size | Native-window operation | `native.window.toggle-maximize` | — | — | Window all platforms | Native dynamic label present but disabled; window action not wired |
| TARGET REQUIREMENT | `menu.window.toggle-fullscreen` | Enter Full Screen or Exit Full Screen | Window 40 | window-fullscreen | Native-window operation | `native.window.toggle-fullscreen` | F11 | Control+Command+F | Window all platforms | Native dynamic label present but disabled; window action not wired |
| TARGET REQUIREMENT | `menu.help.documentation` | Steam Backup Label Studio Help | Help 10 | help-primary | Informational operation | `help.open-documentation` | — | — | Help all platforms | Native item present but disabled; packaged Help surface not implemented |
| FUTURE EXTENSION | `menu.help.report-issue` | Report an Issue | Help 20 | help-primary | Informational operation | `help.report-issue` | — | — | Omitted on all platforms until a trusted configured target exists | Cargo repository/support target is empty; do not enable or invent a URL |
| TARGET REQUIREMENT | `menu.help.about` | About Steam Backup Label Studio | Help 40 | help-about | Informational/native About operation | `help.show-about` | — | — | Help on Windows/Linux; macOS application menu | Native item present but disabled; About surface not implemented |

**CURRENT FACT —** In this registry, “Connected” means that clicking the native
item dispatches through the shared ingress and that an enabled command-owned
Windows Ctrl chord may enter that same ingress through the bounded fallback.
The upstream native Windows accelerator path itself remains blocked as recorded
in section 3.

### Menu-item registry: capability, state, feedback, and focus

**TARGET REQUIREMENT —** `H0` means Home with no retained session; `H1` means
Home with one retained session; `D` means active Disc editor; `C` means active
Case editor. “Enabled” remains subject to current busy/modal/native capability.

| Claim | Presentation item ID(s) | Capability source | H0 | H1 | D | C | Busy/modal behavior | Feedback owner | Focus result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `menu.file.new-disc`, `.new-case`, `.open` | Lifecycle command capability | Enabled | Enabled; replacement guard if dirty | Enabled; replacement guard if dirty | Enabled; replacement guard if dirty | Disabled by lifecycle conflict or application modal; dispatch rechecks | Shared application feedback | Success focuses new/loaded editor entry; cancel/decline/failure restores prior valid focus |
| TARGET REQUIREMENT | `menu.file.save`, `.save-as` | Active-session lifecycle capability | Disabled | Enabled | Enabled | Enabled | Disabled by lifecycle/export conflict or application modal | Shared application feedback | Restore prior valid focus after dialog/result; fallback to current workspace heading |
| TARGET REQUIREMENT | `menu.file.export-png` | `export.png` capability and target resolver | Disabled | Enabled when retained physical target resolves | Enabled | Enabled for current supported Case physical output | Disabled by export/lifecycle conflict or application modal | Shared application feedback | Warning/destination own focus while open; terminal result restores initiator/fallback |
| TARGET REQUIREMENT | `menu.file.return-home` | `workspace.return-home` | Disabled | Disabled | Enabled | Enabled | Disabled by lifecycle/navigation conflict or modal; allowed during isolated export after dialogs permit | Shared application feedback | Home heading or future Resume affordance |
| TARGET REQUIREMENT | `menu.file.resume-project` | `project.resume` | Disabled | Enabled | Disabled | Disabled | Disabled by lifecycle/navigation conflict or modal | Shared application feedback | Retained editor destination/fallback |
| TARGET REQUIREMENT | `menu.file.close-project` | `project.close` | Disabled | Enabled | Enabled | Enabled | Disabled by lifecycle/export conflict or modal; dirty guard owner decides | Shared application feedback | Success focuses Home heading; decline/failure restores prior focus |
| TARGET REQUIREMENT | `menu.file.close-window`, `.quit` | Lifecycle termination capability | Enabled | Enabled | Enabled | Enabled | Disabled while conflicting scope/modal owns termination; one-use handoff after approval | Shared application feedback | No focus on success; decline/failure restores prior valid focus |
| TARGET REQUIREMENT | `menu.edit.undo`, `.redo` | Focused-edit owner first; future history owner second | Focus-dependent | Focus-dependent | Focus-dependent | Focus-dependent | Active modal's focused editable owner wins; disabled if neither owner can act | Focused control; future history feedback only for failures | Focus remains in owning editable/control |
| TARGET REQUIREMENT | `menu.edit.cut`, `.copy`, `.paste`, `.select-all` | Focused editable/native control capability | Focus-dependent | Focus-dependent | Focus-dependent | Focus-dependent | Act only inside current modal when modal focus owns editing; otherwise focused control | Focused control/native role | Focus remains in owning control |
| TARGET REQUIREMENT | `menu.tools.game`, `.export-options` | Navigation destination and host capability | Disabled | Disabled | Enabled | Enabled | Disabled during lifecycle transition or application modal; own nonmodal workflow busy state remains revealable | Navigation result; workflow owner after later operations | Application workflow host heading, then exact first control |
| TARGET REQUIREMENT | `menu.tools.disc-template`, `.disc-layout-presets` | Disc destination/owner capability | Disabled | Disabled | Enabled | Disabled as editor-incompatible | Same; own nonmodal busy/progress may be focused without duplicate operation | Navigation result; domain owner after later operations | Disc workflow host and exact selector |
| TARGET REQUIREMENT | `menu.window.*` | Native target-window state | Enabled for live main window | Enabled | Enabled | Enabled | Native modal/OS may constrain sizing; semantic busy does not create project ownership | Native adapter diagnostics only | OS retains/restores window focus |
| TARGET REQUIREMENT | `menu.help.documentation` | Help resource/host capability | Enabled only after packaged Help exists | Same | Same | Same | Disabled while an exclusive application modal owns focus | Help owner/global failure feedback | Help heading and first navigation control |
| TARGET REQUIREMENT | `menu.help.about` | About metadata/surface capability | Enabled once implemented | Same | Same | Same | Disabled while another application modal owns focus | About/native diagnostics | About dialog; close restores prior focus |
| FUTURE EXTENSION | `menu.help.report-issue` | Trusted configured issue target | Omitted | Omitted | Omitted | Omitted | No native item exists until configured | Future Help owner | Future external-navigation policy |

## 6. File menu

**TARGET REQUIREMENT —** File order and grouping are exactly the order in
section 5. Project operations are semantic File commands, not controls in a new
“Project File” dialog. Home cards and temporary sidebar adapters may remain as
additional presentations while they dispatch the same command IDs.

**TARGET REQUIREMENT —** File semantic distinctions are fixed.

| Claim | Item | Meaning | Explicit distinction |
| --- | --- | --- | --- |
| TARGET REQUIREMENT | New Disc Project / New Case Project | Dispatch the exact replacement-aware lifecycle command and create a pathless, baseline-less session only after authorization. | They do not navigate to or reset the other current editor through copied callbacks. |
| TARGET REQUIREMENT | Open Project… | Stage, validate, guard, and atomically commit through `project.open`. | It is not “Load” presentation logic and must not partially restore before acceptance. |
| TARGET REQUIREMENT | Save | Write to the current path only for package-v1 with an eligible `.sbls` suffix; if pathless, legacy-format, or wrong-suffix, delegate internally to the Save As destination flow. | It keeps the conventional no-ellipsis label even though Save may open a chooser; the semantic command remains Save. |
| TARGET REQUIREMENT | Save As… | Always ask for an eligible `.sbls` destination, require a conversion destination to be provably distinct from the active legacy source, and adopt path/package format/baseline only after successful write commit. | It is independently exposed and never inferred from menu placement. |
| TARGET REQUIREMENT | Export PNG… | Execute `export.png`, including owner preflight/review/destination/render/write. | It does not open Export Options and does not copy guide setters. |
| TARGET REQUIREMENT | Return Home | Show Home while retaining the complete active session and resume route. | It is not Close Project and opens no replacement guard. |
| TARGET REQUIREMENT | Resume Project | From Home, restore the retained editor destination without read/normalize/replacement/baseline change. | It is Home-only and not ordinary editor navigation. |
| TARGET REQUIREMENT | Close Project | Guard if required, retire the session, and show Home. | It does not close the native window or quit the process. |
| TARGET REQUIREMENT | Close Window | Guard the active session, then close the target window once. | It does not mean Return Home or Close Project; in the current single-window app its visible result may resemble Quit. |
| TARGET REQUIREMENT | Quit Steam Backup Label Studio | Guard the active session, then request application termination once. | It is application-wide and remains distinct from closing one window for future compatibility. |

**TARGET REQUIREMENT —** Ellipses appear on `Open Project…`, `Save As…`, and
`Export PNG…` because completing those invocations necessarily enters a chooser
or review/destination workflow. Conditional replacement/close guards do not add
ellipses to New, Close Project, Close Window, or Quit. Save retains the
conventional label explained above.

**TARGET REQUIREMENT —** File behavior by session condition is exact.

| Claim | Condition | Save | Save As… | New/Open/Close Project | Return Home / Resume | Export PNG… | Close Window / Quit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | No active session on Home | Disabled | Disabled | New/Open enabled; Close Project disabled | Both disabled | Disabled | Enabled, no project guard |
| TARGET REQUIREMENT | Pathless, legacy-format, or wrong-suffix active session | Enabled; delegates to Save As flow | Enabled; legacy conversion rejects the active source and aliases as destinations | Owner guard uses dirty state | Route capability only | Enabled when target resolves | Guard uses session dirty state |
| TARGET REQUIREMENT | Package-v1 session with eligible `.sbls` path | Enabled; no destination chooser | Enabled; chooses replacement path | Owner guard uses dirty state | Route capability only | Enabled when target resolves | Guard uses session dirty state |
| TARGET REQUIREMENT | Clean active session | Enabled by lifecycle's active-session capability | Enabled | Replacement/close proceeds without Save/Discard prompt | No content effect | Enabled when target resolves | Termination proceeds without dirty prompt |
| TARGET REQUIREMENT | Dirty active session | Enabled | Enabled | Shared Save/Discard/Cancel guard; no menu-private confirmation | No guard for Return Home/Resume | Export does not clear dirty state | Shared Save/Discard/Cancel guard |
| TARGET REQUIREMENT | Home with retained session | Enabled | Enabled | New/Open/Close act on retained session | Return Home disabled; Resume enabled | Enabled only when retained target resolves truthfully | Guard retained session on close/Quit |

**TARGET REQUIREMENT —** File items must never call the current ProjectPanel or
Case panel callbacks indirectly, click a hidden button, branch on a visible
label, or create private versions of Save, Open, Export, replacement guards,
Close Window, or Quit.

## 7. Edit menu

**TARGET REQUIREMENT —** Edit presents one conventional focus-aware sequence:
Undo, Redo, separator, Cut, Copy, Paste, Select All. The focused-edit router
resolves the current owner at activation and dispatches no project mutation when
a text/native editor owns focus.

**TARGET REQUIREMENT —** The first menu release includes Undo and Redo for
focused text/HTML/source editing. The unavailable application-history commands
are omitted, not shown as disabled placeholder commands: no application-history
fallback is registered. The visible items are focused-edit roles. Outside a
focused editable owner, they are disabled because no current edit owner can act,
not because application history is being advertised. A future application
history owner may add the fallback only after it reports `canUndo` or `canRedo`.

**TARGET REQUIREMENT —** This first-release decision does not claim application
Undo/Redo works. The same presentation items may later fall through to exact
future IDs `history.undo` and `history.redo` only after a separately designed
`owner.application-history` implements transaction/coalescing, canonical
baseline comparison, capabilities, and typed results.

**TARGET REQUIREMENT —** Edit ownership is exact.

| Claim | Item | First owner | Future fallback | Capability | Project dirty/history effect |
| --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | Undo | Focused text/HTML/source/native editable owner | `history.undo` | Focused owner can undo; future `history.canUndo` otherwise | Focused edit follows that owner's commit semantics; future history compares canonical content to baseline |
| TARGET REQUIREMENT | Redo | Focused text/HTML/source/native editable owner | `history.redo` | Focused owner can redo; future `history.canRedo` otherwise | Same |
| TARGET REQUIREMENT | Cut | Focused editable owner | None | Writable selection exists | Any project effect occurs only through the focused editor's established commit owner |
| TARGET REQUIREMENT | Copy | Focused selectable/editable owner | None | Copyable selection exists | None |
| TARGET REQUIREMENT | Paste | Focused editable owner | None | Editable target and permitted clipboard data | Any project effect occurs only through the focused editor's established commit owner |
| TARGET REQUIREMENT | Select All | Focused editable/selectable owner | None | Owner supports selection | None |

**TARGET REQUIREMENT —** Focus precedence is modal, focused editable/native
control, preview-owned interaction, then future application history. A focused
`input`, `textarea`, effective `contenteditable`, contextual HTML/source editor,
or preview-mounted text editor keeps browser/native Undo/Redo and transfer
ownership. Application history must never steal those shortcuts or menu clicks.

**TARGET REQUIREMENT —** Tauri predefined edit roles may be used where they
truthfully reach the focused webview/native control. Because predefined
Undo/Redo are unsupported on Windows/Linux, the cross-platform adapter must be
proven per platform and must route unsupported roles through the focused-edit
port. It must not use project setters, synthetic keyboard events, or an
unbounded DOM-search fallback.

**FUTURE EXTENSION —** Application history is outside this contract beyond its
menu placement, reserved IDs, capability source, and precedence boundary. No
history stack, transaction system, coalescing policy, or project-schema change
is designed here.

## 8. Tools menu

**TARGET REQUIREMENT —** Tools contains exactly four rich workflow launchers in
this order: `Game…`, separator, `Disc Template…`, `Disc Layout Presets…`,
separator, `Export Options…`. They have no accelerators in the first release.

**TARGET REQUIREMENT —** All four launchers reveal one nonmodal application
workflow host in persistent app-shell space outside the main editor sidebar,
preview-local controls, and contextual ribbon. The host presents one active
workflow at a time, has an accessible region name and visible heading, provides
a close action, records a valid focus-return target, and renders owner-provided
capability, validation, progress, review, results, and controls.

**TARGET REQUIREMENT —** The workflow-host launcher matrix is exact.

| Claim | Item ID | Typed destination / owner | Compatible project kinds | Invocation class | Why no direct mutation | Initial focus | Busy/modal behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `menu.tools.game` | Active workspace/surface + `area.game` + `owner.game.search` + `control.game.query` | Disc, Case | Navigate/reveal/focus Game host | Game requires query, results, explicit selection, immutable plan, review, apply, metadata editing, and feedback | Query control; if a current busy/error/review state is more urgent, its owner-declared heading/status | Own nonmodal Search/plan/apply state remains revealable; lifecycle transition or application modal disables launcher |
| TARGET REQUIREMENT | `menu.tools.export-options` | Disc: `area.export` + `owner.export.disc-guides` + `control.export.disc.center-hole`; Case Cover: `area.export` + `owner.export.case-guides` + `control.export.case.cover-trim`; Case Tray/Back/Spine: same area/owner + `control.export.case.tray-trim` | Disc, Case current physical output | Navigate/reveal/focus Export configuration host | Guide selections are persisted project configuration; they are not export execution or menu checkboxes | The exact control named by the resolved destination | Export execution does not hide the host after snapshot capture; export/lifecycle modal owns focus while open |
| TARGET REQUIREMENT | `menu.tools.disc-template` | `workspace.disc` + `surface.disc` + `area.template.disc` + `owner.disc-template` + `control.disc-template.selector` | Disc only | Navigate/reveal/focus Disc geometry host | Choice/custom drafts may require validation, immutable impact plan, review, atomic apply, clamp/reflow, or recovery | Template selector; owner-declared invalid draft or review target may take precedence | Case is visibly disabled and dispatch-safe `editor-incompatible`; geometry progress remains revealable; lifecycle/modal conflict disables |
| TARGET REQUIREMENT | `menu.tools.disc-layout-presets` | `workspace.disc` + `surface.disc` + `area.layout-presets.disc` + `owner.disc-layout-presets` + `control.disc-layout-presets.selector` | Disc only | Navigate/reveal/focus Disc preset host | Presets require candidate selection, compatibility, plan/review, explicit Apply/Reapply/Detach, and results | Preset selector; current reviewed plan/progress target may take precedence | Case is visibly disabled and dispatch-safe `editor-incompatible`; own busy state remains revealable; lifecycle/modal conflict disables |

**TARGET REQUIREMENT —** Launcher behavior across contexts is fixed.

| Claim | Context | Game… | Export Options… | Disc Template… | Disc Layout Presets… |
| --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | Home, no session | Disabled: no active editor workflow host | Disabled | Disabled | Disabled |
| TARGET REQUIREMENT | Home, retained session | Disabled with “Resume Project to open workflows”; launcher does not auto-resume | Disabled with same rule | Disabled with same rule | Disabled with same rule |
| TARGET REQUIREMENT | Active Disc | Enabled when destination/host capability permits | Enabled for Disc guide owner | Enabled | Enabled |
| TARGET REQUIREMENT | Active Case | Enabled when destination/host capability permits | Enabled for the current Case physical output's guide owner | Disabled; dispatch recheck returns `editor-incompatible` | Disabled; dispatch recheck returns `editor-incompatible` |
| TARGET REQUIREMENT | Incompatible/unknown project kind | Disabled; no guessed adapter | Disabled | Disabled | Disabled |
| TARGET REQUIREMENT | Pathless project | Same as matching Disc/Case; path is irrelevant | Same | Same | Same |
| TARGET REQUIREMENT | Clean project | Same as matching Disc/Case | Same | Same | Same |
| TARGET REQUIREMENT | Dirty project | Same launcher availability; later owner mutation/result keeps lifecycle dirty semantics | Same | Same | Same |
| TARGET REQUIREMENT | Owner busy, host nonmodal | Launcher focuses current owner progress/review; it starts no duplicate operation | Host remains revealable when export snapshot isolation permits | Host remains revealable; controls reflect geometry scopes | Host remains revealable; controls reflect preset scopes |
| TARGET REQUIREMENT | Lifecycle transition or application modal | Disabled; dispatch recheck safely rejects | Disabled | Disabled | Disabled |

**TARGET REQUIREMENT —** Game consumes the six exact operations `game.search`,
`game.import.plan`, `game.import.apply`, `game.metadata.discover`,
`game.metadata.apply`, and `game.metadata.edit`. Activating `Game…` invokes none
of them. In particular, a search result becomes explicit selection and review;
the target menu design must not retain the current immediate-import-on-result
activation behavior.

**TARGET REQUIREMENT —** Disc Template consumes `disc.template.choose`,
`disc.geometry.draft.update`, `disc.geometry.draft.discard`,
`disc.geometry.plan`, `disc.geometry.apply`, and `disc.geometry.restore` through
the Disc geometry owner. The menu does not set `selectedDiscTemplateId`, change
custom dimensions, clamp owners, or switch geometry directly.

**TARGET REQUIREMENT —** Disc Layout Presets consumes
`disc.layoutPreset.select`, `disc.layoutPreset.plan`,
`disc.layoutPreset.apply`, `disc.layoutPreset.reapply`, and
`disc.layoutPreset.detach`. The launcher itself must not silently select, plan,
apply, reapply, detach, reset Guided progress, or change any feature owner.

**TARGET REQUIREMENT —** Export Options is not Export PNG. The launcher reveals
the project-kind-specific guide configuration owner. File `Export PNG…`
executes `export.png` against one immutable request and never toggles guide
settings.

## 9. Window menu

**TARGET REQUIREMENT —** Window contains only useful true native-window
operations for the actual single-window application: Minimize,
Maximize/Restore or macOS Zoom, separator, and Enter/Exit Full Screen. It does
not contain Return Home, Resume, Close Project, editor navigation, or project
workflow launchers.

**TARGET REQUIREMENT —** Window behavior is exact.

| Claim | Item | True owner | Windows behavior | Linux behavior | macOS behavior | Project/session effect |
| --- | --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | Minimize | Native target-window adapter | Minimize main window; no assigned accelerator | Minimize main window through explicit window API when predefined role is unavailable | Native Minimize behavior; Command+M | None |
| TARGET REQUIREMENT | Maximize / Restore / Zoom | Native target-window adapter plus current window-state projection | Label Maximize when restored and Restore when maximized; invoke matching operation | Same target behavior through explicit window API; do not depend on unsupported predefined role | Visible label Zoom; use native-compatible zoom/maximize behavior | None |
| TARGET REQUIREMENT | Enter / Exit Full Screen | Native target-window adapter plus current full-screen state | F11 toggles state and label | F11 toggles through explicit window API | Control+Command+F with native full-screen behavior | None |
| TARGET REQUIREMENT | Close Window | Lifecycle owner `application.close-window`, presented under File | File item and title-bar/Alt+F4 enter shared guard | File item and window-manager close enter shared guard | File item, Command+W, and red close control enter shared guard | May guard/retire access before one native close; not a Window sizing role |

**TARGET REQUIREMENT —** Close Window is intentionally not duplicated under
Window. File owns its single visible menu placement because it is a guarded
application command, while Window remains a compact collection of native
sizing/display actions. Native title-bar close remains another adapter to the
same lifecycle command.

**TARGET REQUIREMENT —** No Restore item is simultaneously displayed beside
Maximize. One stable item changes between `Maximize` and `Restore` on
Windows/Linux. Full screen likewise uses one stable item with an enter/exit
label. These label updates do not change presentation IDs or semantic targets.

**TARGET REQUIREMENT —** “Bring All to Front,” window lists, tiling, and window
arrangement are omitted because the current application has one window. macOS
may retain OS-managed behavior that is mandatory for a native Window menu, but
the product does not add inert fillers.

## 10. Help menu

**TARGET REQUIREMENT —** Help contains a documentation/help target and About;
About includes version information. Report an Issue is an explicitly reserved
future item that is omitted until a trusted configured target exists.

**TARGET REQUIREMENT —** Help ownership is exact.

| Claim | Presentation ID | Informational operation | Required target | Source of truth | Mutation/feedback |
| --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `menu.help.documentation` | `help.open-documentation` | Open an accessible, application-owned Help surface at its landing heading; it must be available offline in packaged builds before the item is enabled | A curated packaged Help resource derived from reviewed product documentation; no unconfigured URL | Informational only; open failure uses global safe feedback and restores focus |
| TARGET REQUIREMENT | `menu.help.about` | `help.show-about` | Show product name and version, with an accessible close action; no update check | Runtime Tauri package metadata derived from configured product/package information, not a hard-coded display string | Informational only; close returns focus |
| FUTURE EXTENSION | `menu.help.report-issue` | `help.report-issue` | Open a trusted issue-reporting target only after an exact destination and external-navigation policy are configured and tested | Future trusted application metadata/configuration | Omitted now; no guessed repository URL or support channel |

**CURRENT FACT —** The current configuration and package manifests consistently
state product version `0.1.0`, but `Cargo.toml` contains no repository target.
That is sufficient evidence for About version presentation and insufficient
evidence for a Report an Issue destination.

**TARGET REQUIREMENT —** Windows/Linux place About after a separator in Help.
macOS places the same `menu.help.about` presentation identity in the native
application menu. The macOS application menu order is: About, separator,
Services, separator, Hide, Hide Others, Show All, separator, guarded Quit.
OS role adapter IDs are `menu.platform.macos.services`,
`menu.platform.macos.hide`, `menu.platform.macos.hide-others`, and
`menu.platform.macos.show-all`; they have no project semantics.

**TARGET REQUIREMENT —** There is no Check for Updates item, release channel,
support email, web documentation URL, license link, or telemetry/report upload
in this contract because the repository provides no implemented owner or
configured target for them.

## 11. Capability, dispatch, feedback, and focus

### Menu item to semantic command/destination/operation matrix

**TARGET REQUIREMENT —** This matrix is the exhaustive presentation-to-semantic
mapping for the first target hierarchy. Platform relocation never changes the
mapping.

| Claim | Menu item(s) | Semantic target kind | Exact owner target | Dispatch effect |
| --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `menu.file.new-disc` | Application command | `project.new-disc` | Dispatch once through lifecycle owner |
| TARGET REQUIREMENT | `menu.file.new-case` | Application command | `project.new-case` | Dispatch once through lifecycle owner |
| TARGET REQUIREMENT | `menu.file.open` | Application command | `project.open` | Dispatch once through lifecycle owner |
| TARGET REQUIREMENT | `menu.file.save` | Application command | `project.save` | Dispatch once through lifecycle owner |
| TARGET REQUIREMENT | `menu.file.save-as` | Application command | `project.save-as` | Dispatch once through lifecycle owner |
| TARGET REQUIREMENT | `menu.file.export-png` | Domain workflow command | `export.png` / `owner.export.workflow` | Execute the registered export workflow once |
| TARGET REQUIREMENT | `menu.file.return-home` | Application command | `workspace.return-home` | Dispatch once through lifecycle owner |
| TARGET REQUIREMENT | `menu.file.resume-project` | Application command | `project.resume` | Dispatch once through lifecycle owner |
| TARGET REQUIREMENT | `menu.file.close-project` | Application command | `project.close` | Dispatch once through lifecycle owner |
| TARGET REQUIREMENT | `menu.file.close-window` | Guarded application command | `application.close-window` | Dispatch once; native handoff follows authorization |
| TARGET REQUIREMENT | `menu.file.quit` | Guarded application command | `application.quit` | Dispatch once; native handoff follows authorization |
| TARGET REQUIREMENT | `menu.edit.undo` | Focused-edit role; future history fallback | `focused-edit.undo`; future `history.undo` | Resolve one current owner and delegate once |
| TARGET REQUIREMENT | `menu.edit.redo` | Focused-edit role; future history fallback | `focused-edit.redo`; future `history.redo` | Resolve one current owner and delegate once |
| TARGET REQUIREMENT | `menu.edit.cut` | Focused-edit/native role | `focused-edit.cut` | Delegate to focused editable owner |
| TARGET REQUIREMENT | `menu.edit.copy` | Focused-edit/native role | `focused-edit.copy` | Delegate to focused selectable/editable owner |
| TARGET REQUIREMENT | `menu.edit.paste` | Focused-edit/native role | `focused-edit.paste` | Delegate to focused editable owner |
| TARGET REQUIREMENT | `menu.edit.select-all` | Focused-edit/native role | `focused-edit.select-all` | Delegate to focused selectable/editable owner |
| TARGET REQUIREMENT | `menu.tools.game` | Typed editor destination | `area.game` / `owner.game.search` / `control.game.query` | Reveal/focus only |
| TARGET REQUIREMENT | `menu.tools.disc-template` | Typed editor destination | `area.template.disc` / `owner.disc-template` / `control.disc-template.selector` | Reveal/focus only |
| TARGET REQUIREMENT | `menu.tools.disc-layout-presets` | Typed editor destination | `area.layout-presets.disc` / `owner.disc-layout-presets` / `control.disc-layout-presets.selector` | Reveal/focus only |
| TARGET REQUIREMENT | `menu.tools.export-options` | Typed editor destination | Disc: `owner.export.disc-guides` / `control.export.disc.center-hole`; Case Cover: `owner.export.case-guides` / `control.export.case.cover-trim`; Case Tray/Back/Spine: same owner / `control.export.case.tray-trim`; all under `area.export` | Reveal/focus only |
| TARGET REQUIREMENT | `menu.window.minimize` | Native-window operation | `native.window.minimize` on main window | Perform native window action only |
| TARGET REQUIREMENT | `menu.window.toggle-maximize` | Native-window operation | `native.window.toggle-maximize` on main window | Perform native window action only |
| TARGET REQUIREMENT | `menu.window.toggle-fullscreen` | Native-window operation | `native.window.toggle-fullscreen` on main window | Perform native window action only |
| TARGET REQUIREMENT | `menu.help.documentation` | Informational operation | `help.open-documentation` | Open Help surface only |
| TARGET REQUIREMENT | `menu.help.about` | Informational/native About operation | `help.show-about` | Open About surface only |
| FUTURE EXTENSION | `menu.help.report-issue` | Informational operation | `help.report-issue` | Omitted until a trusted configured target exists |

### Direct command versus rich-workflow-launcher matrix

**TARGET REQUIREMENT —** Ellipses do not determine semantic class. Exact class
and behavior are:

| Claim | Class | Items | Activation may immediately begin owner workflow | Activation itself may mutate project | Required result boundary |
| --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | Direct application command | File lifecycle commands | Yes, including owner guard/dialog | Only the semantic owner after authorization | Shared command dispatch/result |
| TARGET REQUIREMENT | Domain workflow command execution | Export PNG… | Yes, `export.png` | No project content mutation; external PNG write only | Shared Export result |
| TARGET REQUIREMENT | Rich workflow launcher | All Tools items | No domain operation; navigation only | No | `EditorNavigationResult`; later operations have separate results |
| TARGET REQUIREMENT | Focused-edit role | Edit items | Delegate to focused control | Only through focused editor's established commit boundary | Focused-edit/native result |
| TARGET REQUIREMENT | Native-window operation | Window items | Yes, native action | No | Native adapter result/diagnostic |
| TARGET REQUIREMENT | Informational operation | Help/About | Open information surface | No | Informational navigation/dialog result |

### Home/Disc/Case availability matrix

**TARGET REQUIREMENT —** This compact matrix covers every target item. `Y`
means enabled when no narrower capability/busy/modal constraint applies, `N`
means disabled, and `F` means focus-dependent.

| Claim | Item/group | Home no session | Home retained session | Disc editor | Case editor |
| --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | New Disc, New Case, Open | Y | Y | Y | Y |
| TARGET REQUIREMENT | Save, Save As | N | Y | Y | Y |
| TARGET REQUIREMENT | Export PNG | N | Y if target resolves | Y | Y if Case target resolves |
| TARGET REQUIREMENT | Return Home | N | N | Y | Y |
| TARGET REQUIREMENT | Resume Project | N | Y | N | N |
| TARGET REQUIREMENT | Close Project | N | Y | Y | Y |
| TARGET REQUIREMENT | Close Window, Quit | Y | Y | Y | Y |
| TARGET REQUIREMENT | Undo, Redo, Cut, Copy, Paste, Select All | F | F | F | F |
| TARGET REQUIREMENT | Game…, Export Options… | N | N | Y | Y |
| TARGET REQUIREMENT | Disc Template…, Disc Layout Presets… | N | N | Y | N |
| TARGET REQUIREMENT | Window items | Y for live window | Y | Y | Y |
| TARGET REQUIREMENT | Help, About | Y after their owners exist | Y after their owners exist | Y after their owners exist | Y after their owners exist |
| FUTURE EXTENSION | Report an Issue | N/omitted | N/omitted | N/omitted | N/omitted |

### Capability and busy-state matrix

**TARGET REQUIREMENT —** Capabilities remain owner-derived. Presentation-specific
rules may only combine owner results for display; they cannot replace them.

| Claim | State/scope | File lifecycle | Export PNG | Tools launchers | Edit roles | Window | Help/About |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | `lifecycle.transition` owned | Disabled except the owning invocation | Disabled | Disabled | Focused modal/control only | Sizing may remain OS-available; close/Quit disabled | Disabled if lifecycle modal owns focus |
| TARGET REQUIREMENT | `workspace.navigation` owned | Return Home/Resume disabled; conflicting lifecycle commands follow dispatcher policy | Allowed only if Export capability remains valid | Disabled until navigation completes | Focus-dependent | Unchanged | Unchanged absent modal |
| TARGET REQUIREMENT | `export.execution` owned | New/Open/Save/Save As/Close/Quit disabled by conflict; Return Home/Resume allowed after modal phase | Disabled | Host navigation remains available unless an export dialog modal owns focus | Modal/focus-dependent | Unchanged; close/Quit remain lifecycle-disabled | Disabled only during modal |
| TARGET REQUIREMENT | Game/geometry/preset owner nonmodal busy | Lifecycle capability decides independently | Export snapshot/capability decides independently | Corresponding launcher focuses progress/review and starts nothing | Focus-dependent | Unchanged | Unchanged |
| TARGET REQUIREMENT | Application modal active | Only modal-owned action/cancellation; other File items disabled | Disabled unless modal is Export's own current step | Disabled | Edit roles act only on focused modal control | OS/native modal policy; close/Quit cannot bypass modal owner | Disabled to avoid stacked application modals |
| TARGET REQUIREMENT | Stale native enabled state | Dispatch recheck returns disabled/busy | Same | Navigation recheck returns unavailable/incompatible | Focus router re-resolves owner | Native adapter rechecks window state | Informational capability recheck |
| TARGET REQUIREMENT | Dirty/pathless change | Reproject, but labels remain stable; guard/Save behavior changes semantically | Reproject target only; no baseline effect | No launcher eligibility change by itself | No direct effect | None | None |

**TARGET REQUIREMENT —** A native menu activation closes the native menu,
captures the previously focused semantic destination when possible, and enters
exactly one target. Success, cancellation, decline, failure, and not-executed
results follow the owner contract. The menu bridge itself publishes no terminal
toast and must not convert navigation completion into workflow success.

**TARGET REQUIREMENT —** Shared feedback is visible and programmatically
announced from Home or either editor. Menu-originated commands receive the same
copy/severity/diagnostics as Home or button invocations. A native bridge failure
may report one safe application-level failure; lower layers must not also
publish competing terminal feedback.

**TARGET REQUIREMENT —** Focus restoration uses semantic registrations, not DOM
labels/selectors or coordinates. When a command replaces the surface, its
success target owns focus. When it does not, focus returns to the captured
valid owner or a declared workspace/Home fallback. A rich workflow launcher
focuses the workflow heading and then the exact owner control after render.

## 12. Shortcuts, accessibility, and platform behavior

### Shortcut and focus-precedence matrix

**TARGET REQUIREMENT —** Accelerator registration and key routing use this
order. An earlier owner prevents every later owner from also acting.

| Claim | Priority | Context | Owner | Required behavior |
| --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | 1 | Active native/custom modal or dialog | Modal owner | Own Escape, Enter, Tab cycle, relevant edit roles, and command acceptance/cancellation; block conflicting menu commands |
| TARGET REQUIREMENT | 2 | Focused input, textarea, select, effective contenteditable, HTML/source editor, or native editable | Focused control/edit router | Preserve Undo/Redo/Cut/Copy/Paste/Select All and ordinary character input |
| TARGET REQUIREMENT | 3 | Focused interactive preview/control or preview stage gesture | Preview/selected owner | Preserve Space activation, preview pan/zoom, and selected-owner shortcuts; respect `defaultPrevented` and #298 |
| TARGET REQUIREMENT | 4 | No earlier owner consumed the accelerator | Application command/history/window/help adapter | Dispatch exact target once and recheck capability |

**TARGET REQUIREMENT —** Accelerator values are exactly those in section 5.
Tools, Return Home, Resume, Close Project, Help, About, and Report an Issue have
no first-release accelerators. Native menu keyboard navigation and platform
mnemonics still make them reachable.

**TARGET REQUIREMENT —** Windows/Linux Alt+F4, macOS red close control, and
equivalent window-manager close requests are native adapters to
`application.close-window`. They are not independent shortcuts and cannot
bypass dirty guards. OS session shutdown remains outside this menu contract and
must not be claimed handled without a separate verified policy.

**TARGET REQUIREMENT —** Every visible menu item exposes its native text label,
enabled/disabled state, accelerator, and checked state to platform accessibility
APIs. Disabled rich workflows remain visible so Case users can discover that
Disc-only tools exist without invoking them; an attempted stale activation
returns an accessible reason. No item relies on icon, color, punctuation, or
separator position as its only name.

**TARGET REQUIREMENT —** Workflow hosts use a visible heading, landmark name,
logical reading order, programmatically associated field errors/status, and a
keyboard-reachable close action. Opening moves focus to the owner-declared
initial target; closing restores the launcher origin when valid. Application
modals follow #309 focus entry, containment, Escape, and restoration rules.

### Native-platform behavior matrix

**TARGET REQUIREMENT —** Native-platform behavior is exact.

| Claim | Concern | Windows | Linux | macOS |
| --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | Menu location | Native bar attached to main window | Native bar attached to main window under supported desktop environment | Global system menu bar |
| TARGET REQUIREMENT | Logical product order | File, Edit, Tools, Window, Help | Same | OS application menu, then File, Edit, Tools, Window, Help |
| TARGET REQUIREMENT | Quit placement | File | File | Application menu using `menu.file.quit` semantic identity |
| TARGET REQUIREMENT | About placement | Help | Help | Application menu using `menu.help.about` semantic identity |
| TARGET REQUIREMENT | Edit roles | Focused-edit adapter; predefined roles only where verified | Focused-edit adapter; predefined roles only where verified | Native responder/predefined role where verified, otherwise focused-edit adapter |
| TARGET REQUIREMENT | Window sizing roles | Explicit native window adapter where predefined role lacks required state/label behavior | Explicit native window adapter because several predefined roles are unsupported | Native-compatible Minimize/Zoom/Full Screen behavior |
| TARGET REQUIREMENT | Close Window | File item, Ctrl+W, title-bar/Alt+F4 -> lifecycle command | File item, Ctrl+W, window-manager close -> lifecycle command | File item, Command+W, red close -> lifecycle command |
| TARGET REQUIREMENT | Full Screen | F11, dynamic Enter/Exit label | F11, dynamic Enter/Exit label | Control+Command+F, native full-screen behavior and dynamic label |
| TARGET REQUIREMENT | Application-menu extras | None | None | About, Services, Hide, Hide Others, Show All, guarded Quit in order from section 10 |
| TARGET REQUIREMENT | Browser/WebView fallback | No production React menu; bounded window-local descriptor-derived accelerator adapter for projected-enabled application/domain commands while native WebView2 delivery remains blocked | No production React menu; in-memory test adapter only | Same |

**TARGET REQUIREMENT —** Native/manual acceptance must use the real Tauri
window from the primary checkout under `AGENTS.md`. Browser-only menu rendering,
synthetic events, or screenshots cannot establish native accelerator,
placement, focus, role, or close/Quit acceptance.

## 13. Acceptance criteria and implementation order

### Implementation-ready acceptance criteria

**TARGET REQUIREMENT —** A conforming implementation must satisfy all of these
criteria.

1. The five product menus render in exact order with every stable presentation
   ID, item order, separator group, label, ellipsis, accelerator, and platform
   placement from this contract.
2. Rust constructs the native menu and registers one bridge; no production
   custom React application menu or copied sidebar callback is introduced.
3. Every custom item maps exhaustively to one semantic command, domain command,
   typed destination, focused-edit role, native-window operation, or
   informational owner.
4. Capability projection updates after session, workspace, project kind, path,
   baseline, dirty, busy, modal, focused-edit, workflow-host, and window-state
   changes; dispatch always rechecks.
5. Home/no-session, Home/retained-session, Disc, Case, incompatible-kind,
   pathless, clean, dirty, busy, and modal differences match the matrices.
6. Save writes without a chooser only for package-v1 at an eligible `.sbls`
   path; pathless/legacy/wrong-suffix Save delegates to Save As, Save As always
   chooses an eligible package destination, legacy conversion cannot target the
   active source or an alias, and failed/cancelled writes preserve path, format,
   and baseline.
7. Return Home retains the session, Resume restores it, Close Project retires
   it, Close Window closes one window, and Quit terminates the application only
   through shared guarded commands.
8. Export PNG dispatches `export.png`, follows the Export contract, supports
   Disc/Case target resolution, and never opens or mutates Export Options.
9. Each Tools item only reveals/focuses the shared workflow host. Game,
   geometry, and preset operations require explicit owner controls and typed
   results after navigation.
10. Disc Template and Disc Layout Presets are visibly unavailable in Case and
    are safely rejected if stale activation arrives; no Case owner is guessed.
11. Undo/Redo/Cut/Copy/Paste/Select All respect modal and focused-edit ownership.
    No source or UI claim says application history exists before it does.
12. Menu invocation, workflow-host entry, field errors/status, and modal
    lifecycle expose screen-reader names/state and deterministic focus movement
    and restoration.
13. Windows, Linux, and macOS placement and roles use the native menu;
    platform-unsupported roles use explicit compatible adapters. The bounded
    Windows WebView accelerator adapter remains an allowed delivery fallback
    only while the upstream native path is blocked.
14. Duplicate native invocation IDs, repeated busy activation, bridge
    re-registration, and close/Quit handoff cannot execute work twice.
15. Success, cancellation, decline, failure, retry, and not-executed outcomes
    preserve owner state, release busy scopes, publish feedback once, and return
    focus truthfully.
16. Sidebar Project File, Export Options, Game, Disc Template, and Disc Layout
    Presets are removed only after replacement capability, feedback, focus,
    keyboard, Disc/Case, and native behavior pass equivalent tests.
17. Home New/Open/Resume remain working adapters; no current
    project-creation, load, save, export, Game import, template, preset,
    contextual ribbon, preview, or Guide Legend behavior disappears early.
18. Project schema/save-load compatibility and preview/export parity show no
    regression; all menu/workflow-host state remains ephemeral.

### Required validation layers

**TARGET REQUIREMENT —** Validation responsibilities are separate; success in
one layer cannot be reported as success in another.

| Claim | Layer | Required coverage |
| --- | --- | --- |
| TARGET REQUIREMENT | Unit tests | Descriptor IDs/order/groups/labels/platform projections; exhaustive ID mapping; capability combinations; generation ordering; duplicate invocation rejection; focus precedence; Save/Resume/Close distinctions; launcher non-mutation |
| TARGET REQUIREMENT | Integration tests | Home/Disc/Case adapters share commands; dirty/pathless/busy/modal outcomes; Export versus Export Options; workflow-host routing/focus/result separation; Disc/Case isolation; sidebar parity gates; feedback once |
| TARGET REQUIREMENT | Rust/native adapter tests | Menu construction and platform structure; stable custom IDs; state application; unsupported-role adapters; window state/label changes; bridge payloads; teardown; guarded close/Quit one-use handoff |
| TARGET REQUIREMENT | Native Tauri manual acceptance | Real Windows/Linux/macOS menu placement, accelerators, screen-reader state, text editing roles, modal focus, workflow-host focus, native file dialogs, maximize/restore/full screen, title-bar close, Quit, and no duplicate events in the actual Tauri window |

**TARGET REQUIREMENT —** Browser tests may validate pure mappings and diagnostic
fallbacks only. They cannot establish native application-menu acceptance.

### Dependency-focused implementation order

**TARGET REQUIREMENT —** Implementation proceeds in this dependency order; a
later step must not bypass an incomplete earlier semantic owner.

1. Retain #308's implemented session aggregate, canonical baseline, command
   registry/dispatcher, lifecycle capabilities, busy scopes, exact Save/Save
   As semantics, authoritative current-project synchronization, and shared
   New/Open replacement guard.
2. Retain the implemented bounded binary project read and structured atomic
   binary project-write adapters that reuse #312's byte writer and preserve its
   verified failure behavior.
3. Home Return/Resume, exact session-only route retention, and shared
   Home/editor command feedback are present under #308/#300. Extend the
   implemented dirty-aware guard only when later Close/termination owners are
   implemented, using #303 only as historical wording/test input.
4. Retain the implemented #309 shared image-candidate-picker focus lifecycle and
   #298 preview-Space ownership prerequisites. Their source/browser component
   evidence does not substitute for native Tauri and assistive-technology
   acceptance.
5. Retain the implemented pure menu descriptor model, exhaustive item mapping,
   capability-projection model, and in-memory port.
6. Retain the implemented native Tauri construction, presentation-state
   application, typed event bridge, bridge-scoped teardown, platform placement,
   and conservative disabled-until-routed boundary. Semantic dispatch and
   guarded native close routing remain later work.
7. Wire File commands, including #302-conforming `export.png`, through the
   shared dispatcher and validate Home/Disc/Case/pathless/dirty outcomes.
8. Implement the shared accessible workflow host and Tools launchers, then
   integrate the focused Game, Export Options, Disc geometry, and Disc Layout
   Preset owners without flattening their operations.
9. Remove superseded sidebar Project File, Export Options, Game, Disc Template,
   and Disc Layout Presets adapters only after the migration gates pass.
10. Implement Window native actions and Help/About informational commands.
11. Integrate future application Undo/Redo only after a separate history owner
    and its capabilities/transactions exist.
12. Run focused automated coverage and real native Tauri acceptance on supported
    platforms before claiming the menu implemented.

**CURRENT FACT / TARGET REQUIREMENT —** File command routing for seven lifecycle
owners and `export.png` now uses one typed ingress, dispatch-time capability
rechecks, shared busy arbitration, and exact-once feedback. `export.png`
preserves PR #332's ordering; Home export, full immutable snapshot isolation,
typed diagnostics/blockers, Disc DOM-size independence, filename policy, and
safe PNG replacement remain future work. Close Project, Close Window, Quit,
and all non-File sections remain disabled. No sidebar removal has begun.

## 14. Issue mapping, migration boundaries, non-goals, and evidence index

### Issue and authority matrix

**CURRENT FACT —** Required and adjacent issues were read on 2026-07-26. No
open or closed issue was found under exact searches for “Application Menu Bar,”
“application menu,” “native menu,” “menu bar,” or “menubar.” Issue #176 is a
separate preview context-menu proposal and is not an application-menu owner.

| Claim | Issue/authority | State at review | Relationship |
| --- | --- | --- | --- |
| CURRENT FACT / TARGET REQUIREMENT | [#308](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308) | Open | Principal lifecycle/session/Save/Resume and command foundation; this menu consumes it and does not widen it. |
| CURRENT FACT / TARGET REQUIREMENT | [#312](https://github.com/thelordofdino4/steam-backup-label-studio/issues/312) | Open; atomic byte primitive merged in PR #317 | Current JSON Save already consumes the atomic primitive. Package/menu Save still depends on bounded binary project read and structured atomic binary write adapters, not a second atomic algorithm. |
| CURRENT FACT / TARGET REQUIREMENT | [#302](https://github.com/thelordofdino4/steam-backup-label-studio/issues/302) | Closed; ordering merged in PR #332 | Shared `export.png` preserves the accepted clean/warning/cancel ordering. |
| CURRENT FACT / TARGET REQUIREMENT | [#300](https://github.com/thelordofdino4/steam-backup-label-studio/issues/300) | Open; source acceptance path implemented | Home-originated Open cancellation/failure now uses the shared result/feedback boundary; the issue was not mutated. |
| CURRENT FACT / TARGET REQUIREMENT | [#303](https://github.com/thelordofdino4/steam-backup-label-studio/issues/303) | Open | Temporary conservative replacement direction; lifecycle contract supersedes it as final dirty-aware architecture. |
| CURRENT FACT / TARGET REQUIREMENT | [#298](https://github.com/thelordofdino4/steam-backup-label-studio/issues/298) | Open; focused source checkpoint implemented | Preview Space now defers to interactive/focused-control ownership and rechecks pointer origin; future global accelerators must preserve that precedence. The issue was not mutated. |
| CURRENT FACT / TARGET REQUIREMENT | [#309](https://github.com/thelordofdino4/steam-backup-label-studio/issues/309) | Open; shared picker source checkpoint implemented | The shared image-candidate dialog now owns focus entry, containment, idle closure, busy protection, and safe restoration without absorbing candidate semantics. The issue was not mutated. |
| CURRENT FACT / TARGET REQUIREMENT | [#304](https://github.com/thelordofdino4/steam-backup-label-studio/issues/304) | Open | Game stale-search dependency retained inside the Game owner. |
| CURRENT FACT / TARGET REQUIREMENT | [#310](https://github.com/thelordofdino4/steam-backup-label-studio/issues/310) | Open | Case Game import visibility/feedback dependency retained inside Game apply. |
| CURRENT FACT / TARGET REQUIREMENT | [#307](https://github.com/thelordofdino4/steam-backup-label-studio/issues/307) | Open | Disc custom-dimension draft/error dependency retained inside geometry workflow. |
| CURRENT FACT / TARGET REQUIREMENT | [#311](https://github.com/thelordofdino4/steam-backup-label-studio/issues/311) | Open | Disc template impact/recovery dependency retained inside geometry workflow. |
| CURRENT FACT / TARGET REQUIREMENT | [#168](https://github.com/thelordofdino4/steam-backup-label-studio/issues/168) | Open | Layout-preset product parent; menu launcher consumes the focused preset contract. |
| CURRENT FACT / TARGET REQUIREMENT | [#175](https://github.com/thelordofdino4/steam-backup-label-studio/issues/175) | Open | Adjacent typed navigation consumer; it must use the same owner/destination registry, not menu item IDs. |
| CURRENT FACT | [#176](https://github.com/thelordofdino4/steam-backup-label-studio/issues/176) | Open | Preview context menu only; explicitly outside this application-menu design. |
| TARGET REQUIREMENT | Lifecycle contract | Draft normative | Owns application commands/capabilities/results/guards/history boundary. |
| TARGET REQUIREMENT | Navigation ownership reference | Draft normative | Owns destinations, workflow reveal/focus, ribbon, preview, and migration semantics. |
| TARGET REQUIREMENT | Focused Export/Game/geometry/preset contracts | Draft normative | Own their respective workflows and operation IDs. |
| CURRENT FACT | Exact Application Menu Bar issue | None found | A future implementation issue may reference this contract; this task does not create or mutate one. |

### Sidebar-to-menu/workflow migration matrix

**TARGET REQUIREMENT —** No current control disappears merely because its target
has been documented. Removal is the final step after adapter parity.

| Claim | Current sidebar surface | Replacement presentation | Semantic owner retained | Removal gate |
| --- | --- | --- | --- | --- |
| TARGET REQUIREMENT | Disc Project File | File commands; Home retains New/Open and gains Resume with lifecycle work | Exact lifecycle commands plus `export.png` | All commands have central capability, result, feedback, focus, shortcuts, Disc/Case parity, native close behavior, and tests |
| TARGET REQUIREMENT | Case Project File | Same File commands; no Case command copy | Same | Same, including Case export-target behavior |
| TARGET REQUIREMENT | Disc Export Options | Tools `Export Options…` -> shared workflow host | `owner.export.disc-guides` | Every guide value, save/load, dirty, focus, keyboard, feedback, and export-pixel effect remains equivalent |
| TARGET REQUIREMENT | Case Export Options | Same launcher -> Case guide owner for current physical output | `owner.export.case-guides` | Every supported guide and Cover/Tray/Spine mapping remains equivalent |
| TARGET REQUIREMENT | Disc/Case Game | Tools `Game…` -> shared workflow host | Game search/import/metadata owners | Search, selection, plan/review/apply, manual metadata, candidates, feedback, accessibility, Disc/Case, and save/load parity pass |
| TARGET REQUIREMENT | Disc Template | Tools `Disc Template…` -> Disc geometry host | Disc geometry owner | Built-in/custom drafting, validation, plan/review/apply, recovery, save/load, preview/export parity, and accessibility pass |
| TARGET REQUIREMENT | Disc Layout Presets | Tools `Disc Layout Presets…` -> preset host | Disc preset and Guided progress owners | All five preset operations, Guided progress, configuration, focus, feedback, save/load, preview/export parity, and Case rejection pass |
| TARGET REQUIREMENT | Case “Template” Cover/Tray selector | Case surface-navigation presentation, not Disc Template | Typed Case surface router | Do not remove as part of Disc Template migration; rebaseline only through Case navigation work |
| TARGET REQUIREMENT | Contextual ribbon | No relocation | Selected preview/text owner through existing ribbon bridge | Must remain stable and contextual throughout menu work |
| TARGET REQUIREMENT | Preview viewport, Design Check, Guide Legend | No relocation | Preview-local owners | Must remain preview-local and non-project state |

**TARGET REQUIREMENT —** During migration, existing sidebar adapters may call
the new dispatcher/destination router as compatibility presentations. They must
be deleted when replacement parity is achieved, not preserved as permanent
callbacks that bypass the target owners.

**CURRENT FACT —** Some broad documentation and `AGENTS.md` sidebar-order text
still describes the current sidebar presentation. That remains truthful until
implementation removes controls. The implementation/re-baselining task must
update those current-state descriptions after source migration; this contract
does not rewrite them preemptively.

### Implemented, dependency, and future matrix

**CURRENT FACT —** This matrix prevents target design from being mistaken for
current functionality.

| Claim | Area | Classification | Consequence for menu work |
| --- | --- | --- | --- |
| CURRENT FACT | Tauri 2.11 desktop shell, one window, dialog/file invoke ports, native menu adapter | Implemented dependency/runtime slice | The TypeScript descriptor drives native construction and generation-ordered presentation state; seven File lifecycle actions plus `export.png` are connected. Windows command-owned accelerators use the bounded descriptor-derived WebView fallback because the upstream native path is blocked. |
| CURRENT FACT | Home New/Load, Disc/Case Project buttons, Export Options, Game, Disc Template, Disc presets | Implemented compatibility presentations | Preserve until replacement adapters pass parity gates. |
| CURRENT FACT | Contextual ribbon, preview viewport, Design Check, Guide Legend | Implemented separate systems | Do not relocate or redefine. |
| CURRENT FACT / TARGET REQUIREMENT | Session aggregate, dispatcher, capabilities, dirty/baseline, Save/Save As, Return Home/Resume | Implemented dependency | File menu behavior may consume these semantic owners; Close Project and guarded close/Quit remain unimplemented under #308. |
| CURRENT FACT / TARGET REQUIREMENT | Atomic byte writer plus package-safe binary project adapters | Primitive implemented; adapters required | Reuse the merged #312 writer and add bounded binary read/structured atomic binary write before package-aware target Save is accepted. |
| CURRENT FACT / TARGET REQUIREMENT | Shared result/feedback/focus and modal/shortcut prerequisites | Feedback, Home/editor navigation focus, preview-Space ownership, shared image-candidate-picker focus lifecycle, and bounded Windows command-accelerator fallback implemented | #298/#309 focused source prerequisites are present. Native/assistive-technology acceptance and any broader modal or shortcut owner remain separate. |
| TARGET REQUIREMENT | Export, Game, geometry, preset target workflows | Required dependency for full migration | Menu launchers consume them; they do not make them exist. |
| CURRENT FACT / TARGET REQUIREMENT | Descriptor/projection, native bridge, and workflow host | Descriptor/projection, native runtime bridge, eight-command File routing, and Windows WebView accelerator fallback implemented; workflow host work required | Native construction, projection, typed ingress, lifecycle/export dispatch, shared feedback, accelerator deduplication, and teardown are connected. Non-File semantic owners remain disconnected. |
| TARGET REQUIREMENT | Help and About informational owners | Menu implementation work | IDs and sources are decided here; surfaces remain unimplemented. |
| FUTURE EXTENSION | Application project Undo/Redo | Future owner | Edit placement reserved; history binding omitted until designed/implemented. |
| FUTURE EXTENSION | Report an Issue | Future configured resource | Item omitted until trusted target and external-navigation policy exist. |
| FUTURE EXTENSION | Multi-window, recent projects, updates, custom menu, Guided Start, preview context menus | Outside first target | Require separate product/architecture decisions. |

### Migration boundaries and non-goals

**TARGET REQUIREMENT —** Migration preserves current project creation, load,
save, PNG export, Disc/Case editor parity, Game import, template/preset behavior,
project schema compatibility, preview/export parity, contextual ribbon
ownership, accessibility, and keyboard reachability until an equivalent
replacement is verified.

**TARGET REQUIREMENT —** This documentation task does not:

- change source, tests, Rust, configuration, dependencies, generated artifacts,
  schema, or runtime behavior;
- implement the native menu, shared dispatcher, lifecycle aggregate, binary
  project adapters, global feedback, workflow host, or capability projection;
- implement #308, remaining #312 integration work, #302, #300, #303, #298, or #309;
- implement application Undo/Redo, Game, Disc Template, Disc Layout Preset,
  Export, Guided Start, Help resources, About UI, or Report an Issue;
- remove or reorder sidebar panels or current Home controls;
- redesign the contextual ribbon, preview controls, Guide Legend, Design Check,
  or preview context menus;
- change project schema, preview pixels, export pixels, native window runtime,
  or support/update policy; or
- create, edit, close, label, or comment on GitHub issues, or commit, stage,
  push, open a pull request, merge, release, or delete a branch.

### Narrow implementation questions

**OPEN QUESTION —** Implementation must prove on each supported platform
whether Tauri's predefined Cut/Copy/Paste/Select All and macOS Undo/Redo reach
every relevant webview text/HTML/source owner. A failing role must use the
focused-edit port; the semantic precedence and visible hierarchy are not open.

**OPEN QUESTION —** The Help implementation must choose the build mechanism
that packages curated application help and keeps it version-aligned. The
product decision—offline application-owned Help with no invented external
URL—is not open.

**OPEN QUESTION —** If a later localized or feature-flagged menu requires
dynamic structural visibility, implementation must select and test safe
remove/insert versus submenu rebuild behavior. First-release dynamic
Home/Disc/Case availability uses enabled state, so it does not depend on this
question.

### Evidence index

**CURRENT FACT —** The contract was grounded in these focused authorities and
current sources rather than a new broad architecture audit.

| Claim | Evidence | Use in this contract |
| --- | --- | --- |
| CURRENT FACT | [Root README](../README.md), [Documentation Map](README.md), [`PRD.md`](PRD.md), [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md), [`REPO_ARCHITECTURE_INVENTORY.md`](REPO_ARCHITECTURE_INVENTORY.md) | Product/current architecture and documentation routing |
| TARGET REQUIREMENT | [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) | Exact File command IDs, capabilities, results, guards, busy scopes, feedback, focus precedence, future history |
| TARGET REQUIREMENT | [`EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md`](EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md) | Typed destinations, presentation adapters, workflow reveal/focus, ribbon/preview boundaries |
| TARGET REQUIREMENT | [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) | `export.png`, Export Options separation, busy/focus/result behavior |
| TARGET REQUIREMENT | [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md) | Game operations and non-mutating launcher behavior |
| TARGET REQUIREMENT | [`DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`](DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md) | Disc Template owner and operation sequence |
| TARGET REQUIREMENT | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md) | Five exact preset operations and launcher boundary |
| CURRENT FACT / TARGET REQUIREMENT | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) | Current schema authority and no menu-state persistence |
| CURRENT FACT | `src/app/App.tsx`, `src/components/home/HomeScreen.tsx`, `src/components/sidebar/ProjectPanel.tsx`, `ExportOptionsPanel.tsx`, `GamePanel.tsx`, `TemplatePanel.tsx`, `DiscLayoutPresetsPanel.tsx`, and `src/components/caseInsert/CaseInsertEditorShell.tsx` | Current Home/shell/sidebar adapters and direct callbacks |
| CURRENT FACT | `src/components/preview/PreviewHeader.tsx`, `ContextualTextRibbonBridge.tsx`, `DiscPreview.tsx`, `CaseInsertPreview.tsx`, `PreviewViewport.tsx`, and `PreviewGuideLegendPanel.tsx` | Separate ribbon and preview-local ownership |
| CURRENT FACT | `src/applicationMenu/applicationMenuRuntime.ts`, `nativeApplicationMenuTransport.ts`, `nativeApplicationMenuPort.ts`, `src/app/ApplicationMenuBoundary.tsx`, `src/main.tsx`, `src-tauri/src/application_menu.rs`, and `src-tauri/src/lib.rs` | Descriptor-driven native construction, conservative projection, typed event envelope/ingress, exact-window attachment, generation safety, and teardown without semantic dispatch |
| CURRENT FACT | [Official Tauri v2 Window Menu guide](https://v2.tauri.app/learn/window-menu/), [`tauri::menu`](https://docs.rs/tauri/latest/tauri/menu/), [`PredefinedMenuItem`](https://docs.rs/tauri/latest/tauri/menu/struct.PredefinedMenuItem.html), and [`tauri::window::Window`](https://docs.rs/tauri/latest/tauri/window/struct.Window.html) | Native construction/events/state, platform role limits, and true window operations |
| CURRENT FACT | GitHub issues in the issue matrix, read-only review on 2026-07-26 | Dependencies, adjacent ownership, and confirmation that no exact Application Menu Bar issue exists |
