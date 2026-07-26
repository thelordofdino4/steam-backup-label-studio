# Editor Navigation And Control Ownership Reference

> Status: Draft target-state normative reference, grounded in the current implementation at `f750a5c4b8721e6de4912a9be5ef26a05cddab5e`.
> Purpose: Define semantic control classes, ownership boundaries, editor navigation destinations, focus routing, state lifetimes, and migration constraints without prescribing a final menu or panel design.
> Read when: Changing application/editor navigation, moving or adding controls, routing preview selections to controls, extending Disc or Case surfaces, changing contextual controls, or implementing workflow entry points.
> Authoritative source: This document is normative for target editor-navigation and control-ownership semantics. Current as-built facts defer to source and the SDD; shared application-command IDs and lifecycle behavior defer to `APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`; focused `export.png` execution semantics defer to `EXPORT_WORKFLOW_CONTRACT.md`; serialized schema defers to `PROJECT_FILE_SPEC.md`; rich-text and source-editing behavior defers to `TEXT_EDITOR_CONTRACT.md`.
> Last reviewed against commit: `f750a5c4b8721e6de4912a9be5ef26a05cddab5e`.

## 1. Status, Scope, And Authority

This is a draft target-state contract, not a claim that the target navigation service, destination catalog, or host categories already exist. It records verified current owners so future UI work can migrate presentation without creating parallel semantics.

This document owns:

- the semantic classification of editor controls;
- the distinction between a presentation adapter and a semantic owner;
- target ownership and host-category boundaries;
- typed editor destinations and focus-routing results;
- editor-navigation state and dirty-state rules; and
- the migration constraints and testable invariants for control relocation.

It does not own final menu names, visual hierarchy, panel styling, native command lifecycle, project schema, rich-text behavior, feature-specific renderer behavior, or an issue implementation plan. A “target host category” in this reference is an ownership category, not a promise that a command will live in a menu, toolbar, ribbon, sidebar, dialog, or preview rail.

Conflict order is:

1. `AGENTS.md` for agent safety and workflow.
2. `SOFTWARE_DESIGN_DOCUMENT.md` for implemented architecture and global renderer/state contracts.
3. `APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md` for target application-command IDs, lifecycle, guards, busy scopes, and command results.
4. `EXPORT_WORKFLOW_CONTRACT.md` for target application-level export execution semantics and Disc/Case export adapters.
5. [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md) for target Game search, import planning/apply, metadata operations, stale-result, and Disc/Case workflow semantics.
6. [`DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`](DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md) for target Disc template choice, custom-dimension validation, geometry planning/apply, and recovery semantics.
7. This reference for target editor navigation, control classification, destination routing, and semantic ownership.
8. `PROJECT_FILE_SPEC.md` for serialized fields and compatibility.
9. `TEXT_EDITOR_CONTRACT.md` for selected-text editing and source-mode behavior.
10. Other focused workflow/model references for their owned domains.

## 2. Claim Classes And Terminology

Every claim in this document uses one of these three classes:

| Claim class | Meaning |
| --- | --- |
| **Current fact** | Verified in source, tests, or an authoritative current-state document at the reviewed commit. A verified mismatch is labeled “Current fact (gap).” |
| **Target ownership rule** | Required architecture or product boundary that later implementation must satisfy; it is not a claim that the target exists now. |
| **Future or unresolved** | Intentionally deferred behavior, placement, policy, or implementation owned by focused follow-up work. |

Terms:

- **Semantic owner**: the domain module, state owner, or workflow boundary that decides what an action means and applies its state transition or side effect.
- **Presentation adapter**: a component that exposes a control, forwards a typed intent, renders owner state, and may manage only local presentation state.
- **Target host category**: a semantic placement class used to keep unlike responsibilities separate. It is explicitly not a final menu design.
- **Workspace**: the active editor kind: Disc or Case.
- **Physical surface**: the edited printable surface, including individual Case spine sides even when a current pane renders more than one.
- **Domain area**: a stable semantic destination such as Export, Game, Disc Template, or Layout Presets.
- **Feature owner**: the owner of the data or workflow reached within a domain area.
- **Control destination**: an optional stable semantic target within a feature owner. It is not a DOM ID, selector, label, component name, or visual coordinate.
- **Navigation**: revealing and focusing an owner. Navigation never implies that the owner action or mutation succeeded.
- **Mutation**: a project-state transition performed by the applicable feature owner.
- **Dirty**: divergence of project content from the lifecycle baseline, as defined by the lifecycle contract. Merely visiting, revealing, selecting, focusing, zooming, panning, or opening an informational overlay is not dirty.

## 3. Evidence And Current Baseline

The baseline was audited against the clean synchronized source commit named in the header, while preserving the separate uncommitted lifecycle-contract documentation work. Evidence included:

- `App.tsx`, project save/load/export and Steam import plans, and project snapshot/restore adapters;
- `editorNavigationShell.ts`, `templateSurfaces.ts`, `EditorNavigationShell.tsx`, and the Disc role-focus request/controller;
- Disc and Case Project, Export, Game, Template, Layout Preset, Guided Progress, and role panels;
- `PreviewViewport`, preview Guide Legend panels, the stable contextual ribbon bridge/header, and preview-mounted text editing;
- project type/schema helpers and the Disc/Case layout, guided, template, packaging-role, and text contracts;
- focused navigation, role-focus, ribbon, viewport, project, import, preset, and guided-workflow tests; and
- open issues listed in section 18, including searches for newer ownership or relocation work. No superseding control-ownership contract was found.

Verified baseline summary:

- `App.tsx` currently orchestrates an app route of Home, Disc, or Case and delegates most feature mutations to focused owners.
- The current shared navigation shell distinguishes Disc and Case workspaces. Case exposes Front, Back, and a combined Spine route over compatibility panes `cover` and `tray`.
- The saved Case editor state still contains `activeCaseInsertTemplatePane`; this is compatibility schema, not a sufficient target representation of physical surface navigation.
- Project File controls are duplicated as presentation in Disc and Case shells, with Home exposing New Disc, New Case Insert, and Load Project.
- Disc and Case Export Options control persisted guide inclusion. Immediate PNG export is currently exposed in Project File.
- Game search state is transient; importing a selected result and applying metadata mutate project content. Current stale-request and import-feedback gaps are tracked.
- Disc template geometry and layout-preset application have focused owners. The current Case “Template” selector actually switches Cover Sheet/Tray Card navigation panes.
- Disc guided focus is already typed and semantic, opens ancestors through callbacks, avoids DOM queries, and reports one-time consumption; its catalog is Disc-role-specific rather than an application-wide destination contract.
- The stable contextual text ribbon is an app-shell presentation adapter. Selected preview text remains the editing and rendering owner.
- Preview zoom, pan, and Guide Legend expansion are transient app-shell state and do not affect export or project dirty state.
- Case Back `additional-artwork` and Case Spine `steam-backup-branding` navigation entries are stale and ownerless under issue #301.

## 4. Semantic Control Taxonomy

Every exposed control or navigable destination must have exactly one primary semantic class:

| Class | Definition | Examples | Required owner |
| --- | --- | --- | --- |
| **1. Application command** | Acts on the application or active project session rather than one editor feature. | New, Open, Save, Save As, Return Home, Resume, Close Project, close window, Quit. | Application-command/lifecycle owner. |
| **2. Editor navigation** | Activates a workspace, physical surface, domain area, owner, or optional control without applying that control. | Disc, Case Front, Case Back, left/right spine, go to Game, reveal selected text controls. | Typed editor destination router plus retained session navigation state. |
| **3. Project configuration** | Mutates persisted configuration that determines project content or export behavior. | Disc template dimensions, export guide inclusion, metadata fields. | Focused project/domain owner and project snapshot adapters. |
| **4. Domain workflow** | Runs a multi-step or asynchronous feature workflow with its own validation, status, cancellation, or result. | Steam search/import, metadata candidate discovery, export execution, preset application, guided setup. | Focused workflow owner; presentation only submits typed inputs and renders results. |
| **5. Contextual editing** | Edits the currently selected preview object through controls whose meaning depends on the selected owner. | Text style, layout, source, Done, Delete. | Selected feature owner and its established contract; ribbon is an adapter. |
| **6. Direct preview interaction** | Manipulates viewport or a selected preview object directly. | Zoom, pan, drag, selection, preview-to-owner routing. | Viewport owner for camera state; feature owner for content/layout mutation. |
| **7. Informational overlay** | Reveals derived guidance or status and has no project mutation semantics. | Guide Legend content, selected-game summary, workflow status. | Local/derived presentation owner or focused workflow status model. |

Ownership behavior by class:

| Class | Allowed adapters | May mutate project content | Dirty participation | Dialog/workflow host | Focus and accessibility | Persistence boundary | Future menu/shortcut invocation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Application command | Home, editor, application chrome, native event, accelerator | Only through the lifecycle command’s owned transition | Per lifecycle baseline/result | May open lifecycle-owned chooser/guard; adapters do not own it | Shared capability, busy, focus-return, and result semantics | Session/path/baseline only as lifecycle contract permits | Dispatch exact command ID |
| Editor navigation | Workspace/surface control, preview affordance, guided action, inspector/context action | No | Never | May reveal a nonmodal host; a modal host follows lifecycle/modal policy | Router exposes current state, renders ancestors, and focuses only when requested | Retained session state; not project content | Submit exact `EditorDestination` |
| Project configuration | Panel, dedicated view, workflow field, contextual adapter | Yes, through focused owner | Yes when accepted value differs from baseline | May be presented in a workflow host; validation stays with owner | Adapter exposes label, value, validation, and focus registration | Project spec/domain adapters | Navigate to owner, then submit typed configuration intent |
| Domain workflow | Panel, dedicated view, dialog, command entry, preview action | Only through explicit workflow/domain transitions | Only accepted project mutations | Yes; workflow owns drafts, validation, cancel, busy, and result | Host owns modal mechanics; workflow exposes capability/progress/result | Draft/status ephemeral; accepted project output uses project owners | Navigate/open workflow or invoke its typed operation, never copy its sequence |
| Contextual editing | Stable ribbon, preview-mounted editor, future shared contextual command | Yes, through selected feature owner | Yes on committed content/layout/style changes | May use owner-defined chooser; global hosts do not clone context | Selection owner supplies capabilities; adapter exposes active category/state | Project content through feature owner; selection/category ephemeral | Dispatch selected-owner command only when capability is true |
| Direct preview interaction | Preview surface, viewport rail, keyboard/pointer gesture | Camera: no; object action: only via feature owner | Camera/selection: no; delegated object mutation: yes | No independent workflow policy; may request an owner workflow | Preview owns gesture arbitration and visible focus; selected owner owns edit semantics | Camera/gesture/selection ephemeral; delegated content uses project owner | Dispatch viewport action, feature intent, or typed destination |
| Informational overlay | Preview overlay, status region, workflow summary | No | Never | May be contained in a host but cannot become its workflow owner | Toggle/current state and status announcements are programmatic | Derived or ephemeral; never project content absent explicit schema decision | Reveal/focus typed overlay or status destination; never convert content to a command |

A control cannot change class merely because it moves. For example, placing Export in application chrome would not turn guide-selection settings into application commands, and placing Save in an editor panel would not make it editor configuration.

## 5. Presentation Adapters Versus Semantic Owners

Presentation adapters may:

- render owner-provided state, capabilities, validation, progress, and results;
- submit a typed command, navigation destination, configuration intent, or workflow input;
- manage local expansion, active visual tab, hover, or focus-restoration details; and
- adapt current compatibility routes to a typed target destination.

Presentation adapters must not:

- duplicate command guards, dirty checks, import policies, export order, template validation, layout math, save/load normalization, or feature defaults;
- infer semantic targets from visible labels, DOM structure, CSS selectors, component names, or panel order;
- mutate project state merely to make a destination visible;
- claim navigation completion when a separate workflow or mutation failed; or
- become the persisted source of truth for feature state.

| Adapter responsibility | Required behavior | Prohibited ownership |
| --- | --- | --- |
| Render | Project owner state, capability, validation, progress, and results | Recomputing domain truth from labels, order, or local defaults |
| Dispatch | Exact lifecycle command, typed destination, configuration intent, or workflow input | Cloned callbacks, guards, confirmations, validation, or mutation sequences |
| Reveal/focus | Registered semantic owner/control after it renders | DOM selectors, translated labels, component names, proxy clicks, or timing guesses |
| Local presentation | Expansion, visual category, hover, focus return, and responsive layout | Persisted project truth, workflow generation, or feature transition policy |
| Feedback | Render the shared command/workflow/navigation result | Treating a navigation result as mutation success or inventing a competing status model |

Semantic owners must expose typed state and operations sufficient for any authorized presentation host. A single semantic operation may have more than one presentation adapter, but all adapters must call the same owner. `App.tsx` may coordinate owners and routing; it must not absorb the domain policy being coordinated.

The target host categories used below are: **application chrome**, **workspace navigation**, **project configuration**, **domain workflow**, **contextual editing**, **preview interaction**, and **preview overlay**. They establish responsibility boundaries only.

## 6. Complete Audited Control Ownership Matrix

The matrix records every audited setup, navigation, contextual, viewport, legend, and immediate-export control required by this reference. “Target host category” never fixes final visual placement. “P” means serialized project content, “S” retained in-memory session state, “E” ephemeral presentation/workflow state, “D” derived read-only state, and “X” external side effect/result.

### Project File and application-entry controls

| Action | Current editor/surface | Verified source owner | Class | Target owner | Target host category (not final menu) | Effect | State class | Dirty | Capability | Busy/modal/reentrancy | Typed destination/focus | Issue/future contract | Claim status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Main Menu / Return Home | Disc and Case Project File | `App.tsx`; duplicated `ProjectPanel` adapters | Application command | Lifecycle command `workspace.return-home` | Application chrome | Retain active session and navigation; show Home | S | No | Active session | Lifecycle guard/modal/busy rules | Home is not an editor destination; retained destination remains unchanged | Lifecycle contract | Current fact; target ownership rule |
| New Disc | Home, Disc, Case | `App.tsx`; Home/Project adapters | Application command | `project.new-disc` | Application chrome | Replace/create Disc session | S/P baseline | Command-dependent | App available | Lifecycle replacement guard and busy scope | On success activate `workspace.disc` / `surface.disc` | Lifecycle contract | Current fact; target ownership rule |
| New Case Insert | Home, Disc, Case | `App.tsx`; Home/Project adapters | Application command | `project.new-case` | Application chrome | Replace/create Case session | S/P baseline | Command-dependent | App available | Lifecycle replacement guard and busy scope | On success activate `workspace.case` / `surface.case.front` | Lifecycle contract | Current fact; target ownership rule |
| Load Project | Home, Disc, Case | `appProjectLoad.ts`, `App.tsx`; adapters | Application command | `project.open` | Application chrome | Choose, read, normalize, and activate project | X/S/P baseline | No after successful baseline | App available | Lifecycle replacement guard; open busy scope; cancel distinct from failure | Successful load supplies workspace/surface restoration; navigation result is separate | Lifecycle contract; #300 | Current fact; target ownership rule |
| Save Project | Disc and Case | `appProjectSave.ts`, project snapshot adapters, `App.tsx` | Application command | `project.save` | Application chrome | Write active project to known or chosen path | X/P baseline | Clears only on verified success | Active session | Lifecycle save busy scope; no overlap | No editor destination | Lifecycle contract | Current fact; target ownership rule |
| Save Project As | Not separately exposed | Save helper/path orchestration | Application command | `project.save-as` | Application chrome | Choose a new destination and write snapshot | X/P baseline | Clears only on verified success | Active session | Lifecycle save busy scope | No editor destination | Lifecycle contract | Future or unresolved |
| Export PNG | Disc Project File | `App.tsx`, `appPngExport.ts`, `exportPng.ts` | Domain workflow | Shared `export.png` workflow with Disc adapter | Domain workflow | Preflight, conditionally confirm warnings, choose destination, render/encode/write Disc PNG | X | No by itself | Active Disc session | Export busy scope; exact order belongs to focused contract | Disc `area.export` may reveal settings; invoking export is separate | #302; [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) | Current fact; target ownership rule |
| Export PNG | Case Project File | `App.tsx`, `appPngExport.ts`, `exportCaseInsertPng.ts` | Domain workflow | Shared `export.png` workflow with Case adapter | Domain workflow | Preflight, conditionally confirm warnings, choose destination, render/encode/write active physical Case output | X | No by itself | Active compatible Case surface/session | Export busy scope; exact order belongs to focused contract | Case `area.export` may reveal settings; invoking export is separate | #302; [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) | Current fact; target ownership rule |
| Resume | Home target only; retained session currently resumed by editor return paths | `App.tsx` route/session state | Application command | `project.resume` | Application chrome | Return to retained editor destination | S | No | Retained session | Lifecycle modal/busy rules | Replays retained typed destination without mutation | Lifecycle contract | Target ownership rule |
| Close Project / close window / Quit | Native/application boundary | Tauri window plus current app orchestration | Application command | `project.close`, `application.close-window`, `application.quit` | Application chrome | Close session/window/application | X/S | No mutation; guard may save first | Platform/session dependent | Lifecycle contract owns guards, modal priority, and reentrancy | No editor destination | Lifecycle contract | Target ownership rule |

### Export Options

| Action | Current editor/surface | Verified source owner | Class | Target owner | Target host category (not final menu) | Effect | State class | Dirty | Capability | Busy/modal/reentrancy | Typed destination/focus | Issue/future contract | Claim status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Physical center hole guide | Disc | `exportGuides` state; `ExportOptionsPanel` adapter | Project configuration | Disc export-guide owner, key `centerHole` | Project configuration | Include/exclude guide in next PNG | P | Yes | Disc session | Synchronous; blocked only by lifecycle replacement/modal policy | `area.export` + `owner.export.disc-guides` + `control.export.disc.center-hole` | Project file spec | Current fact; target ownership rule |
| Outer cut/edge guide | Disc | Same, key `outerEdge` | Project configuration | Disc export-guide owner | Project configuration | Include/exclude guide | P | Yes | Disc session | Same | `control.export.disc.outer-edge` | Project file spec | Current fact; target ownership rule |
| Printable area guides | Disc | Same, key `printableArea` | Project configuration | Disc export-guide owner | Project configuration | Include/exclude guides | P | Yes | Disc session | Same | `control.export.disc.printable-area` | Project file spec | Current fact; target ownership rule |
| Safe zone guide | Disc | Same, key `safeZone` | Project configuration | Disc export-guide owner | Project configuration | Include/exclude guide | P | Yes | Disc session | Same | `control.export.disc.safe-zone` | Project file spec | Current fact; target ownership rule |
| Show trim bounds | Case Front/Cover | `exportGuideOptions.ts`; Case export state | Project configuration | Case export-guide owner, option `cover-trim` | Project configuration | Toggle `frontTrimBounds` | P | Yes | Case Front | Synchronous | `area.export` + `owner.export.case-guides` + `control.export.case.cover-trim` | Project file spec | Current fact; target ownership rule |
| Show safe zone | Case Front/Cover | Same, option `cover-safe` | Project configuration | Case export-guide owner | Project configuration | Toggle `frontSafeBounds` | P | Yes | Case Front | Synchronous | `control.export.case.cover-safe` | Project file spec | Current fact; target ownership rule |
| Show trim bounds | Case Back/Tray | Same, option `tray-trim` | Project configuration | Case export-guide owner | Project configuration | Toggle back trim/panel bounds | P | Yes | Case Back/Spines | Synchronous | `control.export.case.tray-trim` | Project file spec | Current fact; target ownership rule |
| Show tray safe zone | Case Back/Tray | Same, option `tray-safe` | Project configuration | Case export-guide owner | Project configuration | Toggle `backPanelSafeBounds` | P | Yes | Case Back/Spines | Synchronous | `control.export.case.tray-safe` | Project file spec | Current fact; target ownership rule |
| Show spine bounds | Case Tray | Same, option `tray-spine-bounds` | Project configuration | Case export-guide owner | Project configuration | Toggle both spine bounds | P | Yes | Spine-capable Case template | Synchronous; unavailable if template lacks spines | `control.export.case.spine-bounds` | Project file spec | Current fact; target ownership rule |
| Show spine safe zones | Case Tray | Same, option `tray-spine-safe` | Project configuration | Case export-guide owner | Project configuration | Toggle both spine safe bounds | P | Yes | Spine-capable Case template | Same | `control.export.case.spine-safe` | Project file spec | Current fact; target ownership rule |

### Game, metadata, and assistance controls

| Action | Current editor/surface | Verified source owner | Class | Target owner | Target host category (not final menu) | Effect | State class | Dirty | Capability | Busy/modal/reentrancy | Typed destination/focus | Issue/future contract | Claim status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Edit Steam search query | Disc and Case | `useSteamImport` via `GamePanel` | Domain workflow | Steam search workflow input | Domain workflow | Change query only | E | No | Steam workflow available | Allowed while idle; owner defines behavior while searching | `area.game` + `owner.game.search` + `control.game.query` | #304 | Current fact; target ownership rule |
| Search | Disc and Case | `useSteamImport` | Domain workflow | Steam search workflow | Domain workflow | Start async search | E/X | No | Valid query/network | Single active generation; stale completion cannot replace newer result | `control.game.search` focuses; activation is a separate workflow result | #304 | Current fact (gap); target ownership rule |
| Choose Steam result (current import trigger) | Disc and Case | Result button in `GamePanel`; `useSteamImport` callback | Domain workflow | Steam result-selection input to import workflow | Domain workflow | Current click immediately supplies `appId` to Import; a target host may separate selection from application | E until Import accepts | No by selection alone | Search result and compatible session | Disabled while Import is busy; selected candidate must belong to current search generation | `control.game.results` focuses the result collection; navigation never chooses an item | #304 | Current fact; target ownership rule |
| Apply Steam import plan | Disc and Case; currently continuation of result click | `useSteamImport`, `appSteamImportPlan`, `App.tsx` owner adapters | Domain workflow | Steam import workflow delegating an atomic typed plan to feature owners | Domain workflow | Import selected game, metadata, and available assets | P/X | Yes on accepted changes | Compatible result/session and successful fetch | Import busy scope; stale/failed result cannot partially masquerade as success; feedback required | No navigation destination invokes this operation; workflow result is separate | #304, #310 | Current fact; target ownership rule |
| Imported-game summary | Disc and Case | `selectedSteamGame` projection in `GamePanel` | Informational overlay | Game workflow status/selection projection | Domain workflow | Display selected game | D from P | No | Imported game exists | Read-only | `area.game` + `owner.game.import-status` | #310 | Current fact; target ownership rule |
| Manual metadata fields: title, subtitle, App ID, developer, publisher, release date, backup date, disc number/total, install notes, copyright/legal | Disc and Case | Project metadata owner via `App.tsx` setters; `GamePanel` adapter | Project configuration | Project metadata owner, exact field key | Project configuration | Mutate field value | P | Yes | Active session | Synchronous; field validation belongs to metadata owner | `owner.game.metadata` + the exact per-field `control.game.metadata.*` ID enumerated in section 14 | Project file spec; #310 | Current fact; target ownership rule |
| Rating system and rating value | Disc and Case | Project metadata/rating owners; `GamePanel` adapter | Project configuration | Rating metadata/feature owner | Project configuration | Mutate rating metadata used by rating feature | P | Yes | Active session | Synchronous; candidate apply is separate | `control.game.metadata.rating-system` / `.rating-value` | #149 | Current fact; target ownership rule |
| Find and currently auto-apply metadata candidates | Disc and Case | `useSteamMetadataAssistance`; `handleFindAndApplySteamMetadataCandidates` in `App.tsx` | Domain workflow | Target discovery owner returns candidates; explicit apply owner performs mutations | Domain workflow | Current action discovers and may immediately apply candidates; target ownership separates discovery result from accepted application | E/X plus conditional P | Conditional Yes in current flow; target discovery alone No | Sufficient imported/manual identity | One request generation per input key; stale results rejected; application result distinct | `owner.game.metadata-assistance` + `control.game.find-candidates`; navigation never starts discovery | #304, #310 | Current fact (mixed responsibility); target ownership rule |
| Apply rating candidate | Disc and Case | Candidate plan plus rating/metadata setters | Domain workflow | Metadata-assistance apply operation delegating to rating owner | Domain workflow | Apply selected rating candidate | P | Yes | Applicable candidate | Explicit operation result; no implicit navigation mutation | `control.game.apply-rating-candidate` | #149, #310 | Current fact; target ownership rule |
| Apply legal candidate | Disc and Case | Candidate plan plus metadata/text setters | Domain workflow | Metadata-assistance apply operation delegating to legal/text owner | Domain workflow | Apply selected legal candidate | P | Yes | Applicable candidate | Explicit operation result | `control.game.apply-legal-candidate` | #310 | Current fact; target ownership rule |
| Copy legal candidate | Disc and Case | Metadata assistance/presentation clipboard path | Domain workflow | Copy workflow; no navigation ownership | Domain workflow | Copy candidate text to clipboard | X | No | Candidate and clipboard available | Feedback required; no editor mutation | `control.game.copy-legal-candidate` | #181 | Current fact; target ownership rule |
| Search/import/candidate status and errors | Disc and Case | Workflow hook results rendered by `GamePanel` | Informational overlay | Respective workflow result models | Domain workflow | Report busy, empty, canceled, success, stale, or failure state | E/D | No | Workflow-specific | Must match operation generation and survive enough for comprehension | `area.game` status is revealable; status is not an action | #304, #310 | Current fact (gap); target ownership rule |

### Template, surface, preset, guided, ribbon, preview, and stale controls

| Action | Current editor/surface | Verified source owner | Class | Target owner | Target host category (not final menu) | Effect | State class | Dirty | Capability | Busy/modal/reentrancy | Typed destination/focus | Issue/future contract | Claim status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Disc template selection | Disc | `useDiscTemplate`; `TemplatePanel` adapter | Project configuration | Disc template owner | Project configuration | Select built-in/custom geometry and clamp owned layouts | P | Yes | Disc session | Validation/recovery owner; no overlapping geometry transition | `area.template.disc` + `owner.disc-template` + `control.disc-template.selector` | #307, #311 | Current fact; target ownership rule |
| Custom outer diameter | Disc Custom | Disc template owner, `outerDiameterMm` | Project configuration | Disc template owner | Project configuration | Validate geometry and clamp on accepted value | P | Yes on accepted change | Custom Disc template | Invalid input remains recoverable; no silent destructive clamp | `control.disc-template.outer-diameter` | #307, #311 | Current fact (gap); target ownership rule |
| Custom physical center-hole diameter | Disc Custom | Same, `physicalCenterHoleDiameterMm` | Project configuration | Disc template owner | Project configuration | Same | P | Yes on accepted change | Custom Disc template | Same | `control.disc-template.physical-center-hole` | #307, #311 | Current fact (gap); target ownership rule |
| Custom inner-hole diameter | Disc Custom | Same, `innerHoleDiameterMm` | Project configuration | Disc template owner | Project configuration | Same | P | Yes on accepted change | Custom Disc template | Same | `control.disc-template.inner-hole` | #307, #311 | Current fact (gap); target ownership rule |
| Custom printable diameter | Disc Custom | Same, `printableDiameterMm` | Project configuration | Disc template owner | Project configuration | Same | P | Yes on accepted change | Custom Disc template | Same | `control.disc-template.printable-diameter` | #307, #311 | Current fact (gap); target ownership rule |
| Custom safe diameter | Disc Custom | Same, `safeDiameterMm` | Project configuration | Disc template owner | Project configuration | Same | P | Yes on accepted change | Custom Disc template | Same | `control.disc-template.safe-diameter` | #307, #311 | Current fact (gap); target ownership rule |
| Select Cover Sheet in Case “Template” | Case | Case shell adapter; `templateSurfaces.ts` | Editor navigation | Typed Case surface router; project template owner remains separate | Workspace navigation | Switch compatibility pane to `cover` and normalize surface to Front | Current P compatibility; target S | Target: No | Case session | No mutation busy scope; modal navigation policy applies | Maps to `workspace.case` + `surface.case.front` | #306; project file spec compatibility | Current fact; target ownership rule |
| Select Tray Card in Case “Template” | Case | Case shell adapter; `templateSurfaces.ts` | Editor navigation | Typed Case surface router; project template owner remains separate | Workspace navigation | Switch compatibility pane to `tray` and retain/normalize Back or Spine context | Current P compatibility; target S | Target: No | Case session | No mutation busy scope; modal navigation policy applies | Maps to `surface.case.back` or retained compatible spine destination | #306; project file spec compatibility | Current fact; target ownership rule |
| Disc workspace | App shell | `activeWorkspace`, `editorNavigationShell.ts` | Editor navigation | Typed editor destination router | Workspace navigation | Activate Disc editor | S | No | Active/creatable Disc session | Lifecycle/modal rules | `workspace.disc` + `surface.disc` | #175 | Current fact; target ownership rule |
| Case Front | Case tabs | `editorNavigationShell.ts`, `templateSurfaces.ts` | Editor navigation | Typed editor destination router | Workspace navigation | Activate Case Front/cover | S; current compatibility field P | No | Case session | No owner mutation | `workspace.case` + `surface.case.front` | #306 | Current fact; target ownership rule |
| Case Back | Case tabs | Same | Editor navigation | Typed editor destination router | Workspace navigation | Activate Case Back/tray | S; current compatibility field P | No | Case session | No owner mutation | `surface.case.back` | #306 | Current fact; target ownership rule |
| Case left spine | Current combined Spine tab/tray pane | Same plus spine-side feature owners | Editor navigation | Typed editor destination router | Workspace navigation | Activate/focus left physical spine context | S | No | Spine-capable Case session | No owner mutation | `surface.case.spine.left` | #306, #168 | Current fact (coarse route); target ownership rule |
| Case right spine | Current combined Spine tab/tray pane | Same plus spine-side feature owners | Editor navigation | Typed editor destination router | Workspace navigation | Activate/focus right physical spine context | S | No | Spine-capable Case session | No owner mutation | `surface.case.spine.right` | #306, #168 | Current fact (coarse route); target ownership rule |
| Disc Layout Preset selection | Disc | local `DiscLayoutPresetsPanel` state | Domain workflow | Disc preset chooser state | Domain workflow | Select candidate preset only | E | No | Applicable Disc presets | May change while idle; does not apply | `area.layout-presets.disc` + `owner.disc-layout-presets` + `control.disc-layout-presets.selector` | #168, #281 | Current fact; target ownership rule |
| Apply Disc Layout Preset | Disc | registered preset application boundary plus feature owners | Domain workflow | Disc preset application owner delegating typed updates | Domain workflow | Apply preset to ordinary feature owners | P | Yes | Compatible exact preset/template | One application at a time; structured no-update result | `control.disc-layout-presets.apply`; navigation success precedes apply result | #168, #281 | Current fact; target ownership rule |
| Include again / Show guide again | Disc Guided Progress | `discGuidedWorkflow.ts`; panel adapter | Domain workflow | Guided workflow owner | Domain workflow | Change omission/completion guidance only | P | Yes | Active guided layout/slot | Synchronous; never changes feature content/layout | `area.guided.disc` + owner + exact `control.disc-guided.include-again` / `.show-again`; slot identity comes from the guided registry | #281 | Current fact; target ownership rule |
| Reset guided progress | Disc Guided Progress | Same | Domain workflow | Guided workflow owner | Domain workflow | Clear guided progress flags, not owner content | P | Yes | Active guided layout | Explicit reset; modal only if focused issue requires it | `control.disc-guided.reset-progress` | #281 | Current fact; target ownership rule |
| Guided placeholder action / focus owner | Disc preview | Guided lifecycle resolver and typed role-focus controller | Editor navigation | General typed destination router adapted to existing role-focus owner | Preview interaction | Reveal/focus the exact owner; never fill/apply automatically | S/E | No | Reachable current slot and compatible owner | One request/one result; no timers, selector retries, or mutation | Typed `domain-area`/`selected-owner` destination; existing Disc focus IDs adapt underneath | #17, #175, #281 | Current fact; target ownership rule |
| Guided Start setup | Future Home/workspace entry | No complete current owner | Domain workflow | Focused Guided Start workflow, using lifecycle commands and typed destinations | Domain workflow | Create/choose session, collect setup, route to first owner | S/P depending accepted setup | Only accepted project mutations | Lifecycle and preset capability | Must not bypass replacement guard; workflow result separate from navigation | `area.guided.disc` or future compatible Case destination | #17 | Future or unresolved |
| Guide Legend toggle | Disc and Case preview rail | `PreviewGuideLegendPanel.tsx`; local state in `DiscPreview.tsx` / `CaseInsertPreview.tsx` | Informational overlay | Preview overlay owner | Preview overlay | Expand/collapse legend without moving preview | E | No | Active preview | Reentrant local toggle; modal-independent | `area.guide-legend` + `owner.preview-guide-legend` + `control.guide-legend.toggle` | #167 | Current fact; target ownership rule |
| Guide Legend content | Disc or active Case surface | `PreviewGuideLegendPanel.tsx` static/derived definitions | Informational overlay | Preview overlay projection for active workspace/surface | Preview overlay | Explain current visual guides | D | No | Compatible preview | Read-only | `owner.preview-guide-legend`; optional item control only if future accessibility requires | #167 | Current fact; target ownership rule |
| Contextual ribbon category: Presets, Text, Artistic, Utilities, HTML | Selected text | `PreviewHeader.tsx`/ribbon bridge adapter; `InlinePreviewTextEditor.tsx` owns active target | Contextual editing | Selected text owner plus ribbon presentation state | Contextual editing | Change visible contextual control group | E | No | Compatible selected text | No action during blocking modal; restore selected-owner focus | `area.contextual-text` + `owner.contextual-text` + category control ID | #265, #299 | Current fact; target ownership rule |
| Contextual text/style/layout controls | Selected text | Preview-mounted text editor and text domain owners | Contextual editing | Selected text feature owner | Contextual editing | Mutate text content/style/layout through established owner | P | Yes | Compatible selected text/control | Text contract owns edit/commit rules | Selected-owner destination with exact text target and optional control ID | #172, #174, #175, #176; text contract | Current fact; target ownership rule |
| Contextual source controls / HTML category | Selected text | Preview-mounted source editor | Contextual editing | Selected text/source owner | Contextual editing | Edit source under text contract | P after contract commit | Yes on committed change | Source-capable selected text | Text contract owns draft, commit, leave-category, and error behavior | `control.contextual-text.source` and category `category.contextual-text.html` | Text contract | Current fact; target ownership rule |
| Done / Delete selected text | Selected text | Preview-mounted text editor/feature owner | Contextual editing | Selected text owner | Contextual editing | End context or remove owned text | E for Done; P for Delete | No / Yes | Selected editable/deletable text | Modal/selection rules; result separate from navigation | `control.contextual-text.done` / `.delete` | #175; text contract | Current fact; target ownership rule |
| Zoom In, Zoom Out, Fit | Disc and Case preview | `PreviewViewport`/viewport model | Direct preview interaction | Preview viewport owner | Preview interaction | Change camera transform only | E | No | Active preview | Local, reentrant; disabled at limits as applicable | No domain destination; viewport controls may have registered control IDs | #167 | Current fact; target ownership rule |
| Mouse-wheel zoom | Disc and Case preview | `PreviewViewport` | Direct preview interaction | Preview viewport owner | Preview interaction | Change camera transform | E | No | Active preview and accepted modifier | Must not steal editor input behavior | Preview surface interaction, not owner navigation | #167 | Current fact; target ownership rule |
| Pan buttons, middle-drag, Space+drag | Disc and Case preview | `PreviewViewport` | Direct preview interaction | Preview viewport owner | Preview interaction | Change camera translation only | E | No | Zoomed/pannable preview | Input/modal precedence; Space must not hijack interactive controls | Preview surface interaction | #167, #298 | Current fact (gap); target ownership rule |
| Preview selection to owning control | Selected preview object | Existing registries/selection owners; Disc role focus is partial precedent | Editor navigation | Typed destination router plus feature-owner registry | Preview interaction | Reveal/focus exact semantic owner | S/E | No | Registered compatible owner | One result; hidden/unavailable explicit; no auto-enable or mutation | Selected-owner destination | #172, #174, #175, #176 | Future or unresolved |
| Case Back `additional-artwork` entry | Case Back navigation model | `editorNavigationShell.ts` stale role list; no Back owner | Editor navigation | Remove from current route unless a real Back owner is implemented | Workspace navigation | Currently routes to no semantic owner | E | No | None | Must return `unavailable` during migration, never fabricate owner | No valid target destination today | #301 | Current fact (gap) |
| Case Spine `steam-backup-branding` entry | Case Spine navigation model | `editorNavigationShell.ts` stale role list; dedicated branding panel exists elsewhere | Editor navigation | Remove duplicate stale entry; route only to the real branding owner if explicitly requested | Workspace navigation | Currently duplicates/misstates ownership | E | No | Real shared branding owner only | Must not create Spine-local branding state | No valid Spine-role destination today | #301 | Current fact (gap) |

## 7. Application-Command Boundary

Application command IDs, lifecycle states, baseline/dirty calculation, path semantics, unsaved-change guards, native close/Quit interception, busy scopes, reentrancy, and shared command results are wholly owned by `APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`. This reference must not redefine them.

The editor may expose presentation adapters for those commands, but it must dispatch the exact lifecycle command ID. In particular:

- `workspace.return-home` and `project.resume` change application presentation while retaining the active in-memory session and its editor destination. They do not serialize navigation and do not make the project dirty.
- `project.new-disc`, `project.new-case`, and `project.open` may establish an initial typed editor destination only after the lifecycle operation succeeds.
- `project.save` and `project.save-as` update the lifecycle baseline only after verified write success; navigation state is excluded from the content snapshot unless the project spec explicitly owns a compatibility field.
- `project.close`, `application.close-window`, and `application.quit` do not have editor destinations.
- Export is an editor-domain workflow registered as `export.png` in the shared application-command system, not an application lifecycle command. The lifecycle contract supplies shared dispatch/session/result rules, while [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) owns its internal order, adapters, and result specialization.

No future menu, toolbar, shortcut, Home control, editor panel, or native event handler may implement a parallel dirty guard or command sequence.

## 8. Editor Navigation Contract

Editor navigation has one responsibility: make a compatible semantic destination active, visible, and focusable. It must not apply the destination control, enable a disabled feature, change source data, accept a candidate, choose a preset, run export, or mark guided work complete.

The router owns retained session navigation:

- active workspace;
- active physical surface;
- last active domain area per compatible workspace/surface where useful;
- selected feature-owner identity needed to restore context; and
- a pending one-shot focus request and its result.

Presentation adapters may request navigation from Home, workspace tabs, surface tabs, guided placeholders, preview selection, future inspector/context actions, accessibility shortcuts, or workflow completion. All use the same destination validator and activation sequence in section 14.

Return Home retains this state in memory. Resume replays it after validating that the destination is still compatible with the retained session. If the former destination is now hidden or unavailable, Resume activates the nearest valid workspace/surface and reports the routing result; it must not mutate project content to reconstruct visibility.

## 9. Disc Navigation And Ownership

Disc has one physical surface, `surface.disc`, under `workspace.disc`. Disc domain areas include Export, Game, Disc Template, Disc Layout Presets, Disc Guided Workflow, contextual text, and the Guide Legend.

Existing Disc role navigation is a valid lower-level adapter precedent: requests use exact typed role/focus identities, validate owner compatibility, open the semantic ancestor, focus by registered references, consume once, and avoid runtime DOM discovery. The target application-wide router must reuse or adapt that behavior rather than replace it with selectors or visible-label matching.

Disc template selection remains configuration owned by the template domain. Layout-preset selection and application remain workflow-owned. Guided focus remains navigation-only. Guided omission/completion remain persisted workflow state, independent of feature content and placement. A destination may reveal any of those owners, but only an explicit owner operation may change them.

## 10. Case Navigation And Ownership

Case uses `workspace.case` and four physical surface identities:

- `surface.case.front`;
- `surface.case.back`;
- `surface.case.spine.left`; and
- `surface.case.spine.right`.

Disc and Case navigation identity map:

| Workspace ID | Physical surface ID | Audited current presentation/adapter | Current compatibility state | Target navigation owner |
| --- | --- | --- | --- | --- |
| `workspace.disc` | `surface.disc` | Disc editor route and single Disc preview | `activeWorkspace = 'disc'`; no separate physical-surface field | Typed destination router; session-only |
| `workspace.case` | `surface.case.front` | Front surface tab; Cover Sheet pane | `activeCaseInsertNavigationSurface = 'front'`; saved pane `cover` | Typed destination router; full identity session-only |
| `workspace.case` | `surface.case.back` | Back surface tab; Tray Card pane | `activeCaseInsertNavigationSurface = 'back'`; saved pane `tray` | Typed destination router; full identity session-only |
| `workspace.case` | `surface.case.spine.left` | Combined Spine surface tab; Tray Card pane; left-side owner within preview | Current navigation retains only `spine`, while the project model has left-side content | Typed destination router preserves left physical-side identity |
| `workspace.case` | `surface.case.spine.right` | Combined Spine surface tab; Tray Card pane; right-side owner within preview | Current navigation retains only `spine`, while the project model has right-side content | Typed destination router preserves right physical-side identity |

The current `cover`/`tray` pane model is a compatibility/rendering adapter: Front activates `cover`; Back and either spine side activate `tray`. The current combined Spine tab may continue presenting both sides, but semantic destinations and selected-owner identities must preserve which physical side was requested. Mirrored spine editing is a feature-owner operation, not navigation.

Full target Case navigation is retained session state and does not become dirty. `editor.activeCaseInsertTemplatePane` remains governed by the project-file compatibility contract until a schema migration explicitly changes it; code must not infer from that legacy field that all future navigation belongs in project JSON.

Issue #306 owns discoverability gaps in the current conditional surface tabs. Issue #301 owns removal or replacement of stale ownerless Back/Spine entries. No navigation migration may create Case-only duplicate feature state to make those entries appear functional.

## 11. Export, Game, Template, Layout, And Guided Boundaries

These areas are navigable but are not navigation owners:

- **Export**: guide inclusion is project configuration; immediate export is a focused workflow. Exact preflight/conditional-confirmation/destination/render/write ordering is owned by [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md), with #302 as the focused ordering implementation issue.
- **Game**: query/results/status are transient workflow state; importing and explicit candidate application delegate typed mutations to established project/feature owners. Exact search generation, immutable planning, atomic apply, metadata-operation, Disc/Case mapping, and #304/#310 semantics are owned by [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md).
- **Disc Template**: template choice, raw custom-dimension validation, immutable impact planning, atomic apply, and recovery belong to the Disc geometry workflow in [`DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`](DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md). This reference still owns the control classification, exact destination/control IDs, adapters, and focus routing. Invalid/recoverable behavior is grounded in #307/#311.
- **Case Template**: the supported case template type is project content, while the current Cover Sheet/Tray Card selector is navigation. They must not share an ambiguous target operation.
- **Layout Presets**: selecting a candidate is transient; applying it is an explicit domain workflow that updates existing feature owners. A destination may focus Apply but never invoke it.
- **Guided Progress**: omission/completion are persisted workflow state; guide visibility and placeholder availability are projections. Guided navigation never changes owner content, placement, omission, or completion.
- **Guided Start**: #17 must compose lifecycle commands, project configuration, preset/guided workflows, and typed destinations. It must not own duplicate New/Open logic or use panel order as a routing API.

Packaging roles do not include Project File, Export Options, Steam/Game import, template geometry, surface navigation, or guided setup. Moving those controls into a role hierarchy would misclassify their semantics.

The audited implementation has coordinated Disc presets only. A coordinated Case preset workflow is not implemented and must not be inferred from Case navigation, individual role controls, #149, or #168.

## 12. Contextual Ribbon And Selected-Owner Contract

The app-shell ribbon is a stable presentation host. It does not become the owner of selected text because it renders the controls. The preview-mounted selected text owner remains responsible for rendered editing, selection/caret behavior, source drafts and commits, style/layout changes, Done, Delete, and preview/export/save-load parity under `TEXT_EDITOR_CONTRACT.md`.

The current categories remain exact semantic category IDs beneath the selected text owner:

- `category.contextual-text.presets`;
- `category.contextual-text.text`;
- `category.contextual-text.artistic`;
- `category.contextual-text.utilities`; and
- `category.contextual-text.html`.

Changing category is ephemeral and not dirty. Editing through a category may be dirty when the selected owner commits project content. The router may restore a category and focus a registered control only after the selected owner is mounted. It must never reconstruct selection from DOM position or component identity.

Issue #265 governs responsive ribbon presentation, and #299 governs programmatic active-category semantics. #172, #174, and #176 are future consumers of the same selected-owner registry; #175 is the central navigation-to-owner bridge. They must not fork the ribbon or feature-owner state.

## 13. Preview, Viewport, And Guide Legend

Preview viewport state is camera state. Zoom level, pan offset, Fit state, expanded rail state, wheel/drag gesture state, and control focus are ephemeral, non-serialized, and non-dirty. They do not alter PNG output. Issue #167 remains the focused viewport acceptance owner, while #298 owns Space/focus interception gaps.

Direct preview content interactions divide by effect:

- camera motion stays with the viewport owner;
- selection stays with the selection/registry owner;
- object movement or editing delegates to the selected feature owner; and
- “show me the control for this object” dispatches a typed navigation destination and performs no mutation.

The Guide Legend is a preview-local informational overlay in the audited implementation, not project content and not a required sidebar owner. Both Disc and Case preview owners initialize it collapsed. Its expansion state is ephemeral; its content is derived from the active editor/surface guide vocabulary. Opening it must not resize, refit, or move the preview stage. Its target destination exists so guided help, accessibility, or future commands can reveal and focus the toggle without treating legend items as editor configuration.

## 14. Typed Destinations And Focus Routing

The target catalog uses exact semantic IDs and discriminated unions. The names below are normative vocabulary; implementations may split the types across focused modules while preserving their values and relationships.

```ts
type EditorWorkspaceId = 'workspace.disc' | 'workspace.case'

type EditorPhysicalSurfaceId =
  | 'surface.disc'
  | 'surface.case.front'
  | 'surface.case.back'
  | 'surface.case.spine.left'
  | 'surface.case.spine.right'

type EditorDomainAreaId =
  | 'area.project-session'
  | 'area.export'
  | 'area.game'
  | 'area.template.disc'
  | 'area.layout-presets.disc'
  | 'area.guided.disc'
  | 'area.contextual-text'
  | 'area.guide-legend'

type EditorFeatureOwnerId =
  | 'owner.project-session-info'
  | 'owner.export.workflow'
  | 'owner.export.disc-guides'
  | 'owner.export.case-guides'
  | 'owner.game.search'
  | 'owner.game.import'
  | 'owner.game.metadata'
  | 'owner.game.metadata-assistance'
  | 'owner.disc-template'
  | 'owner.disc-layout-presets'
  | 'owner.disc-guided-workflow'
  | 'owner.contextual-text'
  | 'owner.preview-guide-legend'
  | EditorRegisteredFeatureOwnerId

type EditorContextualCategoryId =
  | 'category.contextual-text.presets'
  | 'category.contextual-text.text'
  | 'category.contextual-text.artistic'
  | 'category.contextual-text.utilities'
  | 'category.contextual-text.html'

type EditorRegisteredControlId =
  | 'control.project-session.summary'
  | 'control.export.run'
  | 'control.export.disc.center-hole'
  | 'control.export.disc.outer-edge'
  | 'control.export.disc.printable-area'
  | 'control.export.disc.safe-zone'
  | 'control.export.case.cover-trim'
  | 'control.export.case.cover-safe'
  | 'control.export.case.tray-trim'
  | 'control.export.case.tray-safe'
  | 'control.export.case.spine-bounds'
  | 'control.export.case.spine-safe'
  | 'control.game.query'
  | 'control.game.search'
  | 'control.game.results'
  | 'control.game.find-candidates'
  | 'control.game.apply-rating-candidate'
  | 'control.game.apply-legal-candidate'
  | 'control.game.copy-legal-candidate'
  | 'control.game.metadata.title'
  | 'control.game.metadata.subtitle'
  | 'control.game.metadata.steam-app-id'
  | 'control.game.metadata.developer'
  | 'control.game.metadata.publisher'
  | 'control.game.metadata.release-date'
  | 'control.game.metadata.backup-date'
  | 'control.game.metadata.disc-number'
  | 'control.game.metadata.disc-total'
  | 'control.game.metadata.rating-system'
  | 'control.game.metadata.rating-value'
  | 'control.game.metadata.install-notes'
  | 'control.game.metadata.copyright-legal'
  | 'control.disc-template.selector'
  | 'control.disc-template.outer-diameter'
  | 'control.disc-template.physical-center-hole'
  | 'control.disc-template.inner-hole'
  | 'control.disc-template.printable-diameter'
  | 'control.disc-template.safe-diameter'
  | 'control.disc-layout-presets.selector'
  | 'control.disc-layout-presets.apply'
  | 'control.disc-guided.include-again'
  | 'control.disc-guided.show-again'
  | 'control.disc-guided.reset-progress'
  | 'control.disc-guided.focus-owner'
  | 'control.contextual-text.source'
  | 'control.contextual-text.done'
  | 'control.contextual-text.delete'
  | 'control.guide-legend.toggle'
  | EditorFeatureRegisteredControlId

type EditorDestination =
  | {
      kind: 'workspace'
      workspaceId: EditorWorkspaceId
      surfaceId: EditorPhysicalSurfaceId
    }
  | {
      kind: 'domain-area'
      workspaceId: EditorWorkspaceId
      surfaceId: EditorPhysicalSurfaceId
      areaId: EditorDomainAreaId
      ownerId: EditorFeatureOwnerId
      controlId?: EditorRegisteredControlId
    }
  | {
      kind: 'selected-owner'
      workspaceId: EditorWorkspaceId
      surfaceId: EditorPhysicalSurfaceId
      areaId: 'area.contextual-text'
      ownerId: 'owner.contextual-text'
      selection: EditorSelectedOwnerRef
      categoryId?: EditorContextualCategoryId
      controlId?: EditorRegisteredControlId
    }
  | {
      kind: 'overlay'
      workspaceId: EditorWorkspaceId
      surfaceId: EditorPhysicalSurfaceId
      areaId: 'area.guide-legend'
      ownerId: 'owner.preview-guide-legend'
      controlId?: 'control.guide-legend.toggle'
    }

type EditorNavigationRequest = {
  requestId: number
  behavior: 'reveal' | 'focus'
  destination: EditorDestination
}
```

Minimum destination catalog:

| Destination purpose | `kind` | Workspace | Physical surface | Domain area | Feature owner | Optional exact control/example | Availability/result note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Disc editor | `workspace` | `workspace.disc` | `surface.disc` | — | — | — | Requires a Disc session; otherwise `editor-incompatible` or `unavailable` |
| Case Front | `workspace` | `workspace.case` | `surface.case.front` | — | — | — | Adapts to current `cover` pane |
| Case Back | `workspace` | `workspace.case` | `surface.case.back` | — | — | — | Adapts to current `tray` pane |
| Case left spine | `workspace` | `workspace.case` | `surface.case.spine.left` | — | — | — | Adapts to `tray` while preserving left identity |
| Case right spine | `workspace` | `workspace.case` | `surface.case.spine.right` | — | — | — | Adapts to `tray` while preserving right identity |
| Project/session information | `domain-area` | Active workspace | Active surface | `area.project-session` | `owner.project-session-info` | Future registered status control | Future presentation only; lifecycle commands remain separate |
| Export configuration | `domain-area` | Active workspace | Active surface | `area.export` | `owner.export.disc-guides` or `owner.export.case-guides` | Exact guide control from section 6 | Owner must match workspace/surface |
| Export workflow | `domain-area` | Active workspace | Active surface | `area.export` | `owner.export.workflow` | `control.export.run` | Focusing succeeds separately from export result |
| Game workflow | `domain-area` | Active workspace | Active surface | `area.game` | `owner.game.search`, `.import`, `.metadata`, or `.metadata-assistance` | `control.game.query`, `.search`, or exact candidate control | Search/import/candidate generations remain workflow-owned |
| Disc Template | `domain-area` | `workspace.disc` | `surface.disc` | `area.template.disc` | `owner.disc-template` | `control.disc-template.selector` or exact dimension control | Case returns `editor-incompatible` |
| Disc Layout Presets | `domain-area` | `workspace.disc` | `surface.disc` | `area.layout-presets.disc` | `owner.disc-layout-presets` | `control.disc-layout-presets.selector` or `.apply` | Focus does not apply preset |
| Disc Guided Workflow | `domain-area` | `workspace.disc` | `surface.disc` | `area.guided.disc` | `owner.disc-guided-workflow` | Exact registered slot/progress control | Focus does not change omission/completion/content |
| Contextual text | `selected-owner` | Active compatible workspace | Selection’s surface | `area.contextual-text` | `owner.contextual-text` | Category and exact control IDs | Requires matching selected-owner reference; otherwise `hidden` |
| Guide Legend | `overlay` | Active workspace | Active surface | `area.guide-legend` | `owner.preview-guide-legend` | `control.guide-legend.toggle` | Reveal/focus only; no project mutation |

`EditorRegisteredFeatureOwnerId`, `EditorRegisteredControlId`, and `EditorSelectedOwnerRef` are closed registry-backed unions assembled from feature modules; they are not arbitrary strings. The minimum registered control catalog includes the exact controls named in section 6, including `control.game.search`, `control.disc-template.selector`, `control.disc-layout-presets.selector`, `control.contextual-text.source`, the contextual category IDs, and `control.guide-legend.toggle`.

`behavior: 'reveal'` changes semantic navigation state without moving focus and returns `focus: 'not-requested'`. `behavior: 'focus'` moves focus only after the registered target renders. The request ID provides one-shot stale/consumption ordering; it is session-only and not a DOM identity.

Relationship validation is mandatory:

- `workspace.disc` accepts only `surface.disc`.
- `workspace.case` accepts only the four Case surfaces.
- Disc Template, Layout Presets, and Disc Guided destinations are editor-incompatible with Case.
- Project/session information, Export, Game, contextual text, and Guide Legend require a compatible owner registered for the requested workspace/surface.
- A selected-owner destination requires a valid current selection identity on that physical surface.
- A left/right spine destination may adapt to the current tray pane, but the side identity must not be discarded.

Navigation results are separate from command or mutation results:

```ts
type EditorNavigationResult =
  | { status: 'completed'; destination: EditorDestination; focus: 'focused' | 'revealed' | 'not-requested' }
  | { status: 'unavailable'; destination: EditorDestination; reason: 'no-active-session' | 'owner-not-mounted' | 'capability-disabled' }
  | { status: 'invalid'; reason: 'unknown-destination' | 'invalid-owner-control' | 'invalid-relationship' }
  | { status: 'hidden'; destination: EditorDestination; reason: 'feature-disabled' | 'selection-required'; fallback?: EditorDestination }
  | { status: 'editor-incompatible'; destination: EditorDestination; actualWorkspaceId: EditorWorkspaceId }
```

`completed` means routing/reveal/focus completed. It never means that Search, Import, Apply, Export, Save, Delete, or another mutation ran successfully. `hidden` must not auto-enable the feature; a registered enable control or safe owner summary may be returned as a fallback. `unavailable` ends the one-shot request and must not trigger retry loops.

Disc Layout Preset navigation and control classification remain owned here;
the five presentation-neutral Select/Plan/Apply/Reapply/Detach operations and
their project effects are owned by
[`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md).
Revealing or focusing the preset area never selects, plans, applies, reapplies,
or detaches a preset.

Activation and focus order is fixed:

1. Parse the discriminated union and validate registry relationships.
2. Check active-session, editor, feature, and control capabilities.
3. Activate the workspace/editor kind.
4. Activate the physical surface; current adapters may map it to `cover`/`tray` only here.
5. Reveal the domain area, owner, and contextual category.
6. Wait for the registered owner/control to report mounted after the render commit.
7. For `behavior: 'focus'`, focus the exact registered control or declared safe fallback; for `reveal`, leave focus unchanged.
8. Consume the request once and return one `EditorNavigationResult`.

The implementation must not query labels, click proxy controls, inspect component names, use DOM selectors as identities, use arbitrary timeouts, or retry indefinitely.

## 15. Persistence, In-Memory State, Ephemeral State, And Dirty Rules

| State | Class/lifetime | Serialized in project | Survives Return Home/Resume | Survives Open/New | Dirty | Future schema/policy owner |
| --- | --- | --- | --- | --- | --- | --- |
| Project content/configuration, accepted import/metadata changes, Disc template geometry, export-guide inclusion, applied layout updates | Persistable project content | Yes | Yes | Open restores incoming value; New establishes defaults | Yes when different from lifecycle baseline | `PROJECT_FILE_SPEC.md` plus focused domain owner |
| Selected imported game and manual project metadata | Persistable project content | Yes | Yes | Open restores; New clears/defaults | Yes when different from baseline | `PROJECT_FILE_SPEC.md`; future Game workflow contract owns interaction policy |
| Guided layout identity and omission/completion | Persistable guided workflow content | Yes | Yes | Open restores; New clears/defaults | Yes when different from baseline | `PROJECT_FILE_SPEC.md` and `GUIDED_PRESET_SLOT_MODEL.md` |
| Active project-session identity, path, lifecycle phase, saved baseline, and command status | Active session metadata | Not in project JSON | Yes where lifecycle contract permits | Replaced/rebased by successful Open/New | Path/navigation/status do not; content-baseline comparison determines dirty | Lifecycle contract; never add native path/status to project schema through this reference |
| Active workspace, full physical surface, last domain area, retained owner destination | Resumable in-memory navigation | No | Yes for same retained session | No; new/open session chooses/restores its own valid initial destination | No | This reference; any proposed serialization requires separate product/schema decision |
| Current `activeCaseInsertTemplatePane` compatibility field | Current coarse Case adapter state | Currently yes | Yes | Open restores `cover`/`tray`; New defaults | Target navigation rule: No; current snapshot compatibility requires a focused migration decision | `PROJECT_FILE_SPEC.md` only |
| Steam search query/results and metadata candidates | In-memory workflow state | No | Owner-defined within same retained session; not a project guarantee | No; clear/re-key for new/open project | No until an explicit accepted apply/import mutation | Future Game workflow contract |
| Search/import/candidate busy generation, errors, status, and feedback | Ephemeral workflow operation | No | No operation may be silently continued through Home; retained feedback policy is workflow-owned | No | No | Lifecycle busy boundary plus future Game workflow contract |
| Selected layout-preset candidate before Apply | Ephemeral presentation/workflow choice | No | No guarantee; current local panel state remounts | No | No | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md); project spec only if explicitly changed |
| Contextual ribbon category, selected owner, text selection/caret, panel expansion, pending focus request | Ephemeral contextual/navigation state | No | Category/focus/caret need not survive; retained semantic destination may | No | No | This reference and `TEXT_EDITOR_CONTRACT.md`; no schema change implied |
| Preview zoom/pan/Fit, rail expansion, hover, and gesture state | Ephemeral viewport state | No | No guarantee; may reinitialize on remount | No | No | Preview viewport owner; no project schema role |
| Guide Legend expansion (currently collapsed by default) | Ephemeral overlay state | No | No guarantee; may reinitialize collapsed | No | No | Preview overlay owner; any future persistence requires explicit product/schema decision |
| Active modal/dialog, open menu, busy flag, toast, focus target, and opener reference | Ephemeral application/presentation state | No | No; a blocking operation follows lifecycle policy instead of being serialized | No | No | Lifecycle/modal or focused workflow contract; never project schema |
| Derived legend content, selected-game summary, validation, capability, and status projections | Derived read-only state | No | Recomputed from retained owners as applicable | Recomputed | No | Underlying semantic owner; no independent schema |

Return Home and Resume retain in-memory navigation without changing the project snapshot or dirty state. Project schema additions, removals, migrations, or reinterpretation of the current Case pane field require `PROJECT_FILE_SPEC.md` changes; this reference cannot authorize them.

## 16. Accessibility, Modal, And Shortcut Rules

Shortcut and key-handling precedence is:

1. active modal/dialog;
2. focused editable, native text, or source control;
3. preview-owned interaction; and
4. global application command.

- Workspace, surface, contextual category, toggle, and selection states must expose programmatic state in addition to visual styling. Issue #299 specifically tracks current active-category semantics.
- Native buttons and established keyboard activation are preferred. Enter and Space activation must follow the control role; viewport Space handling must ignore all interactive/editable targets and respect modal state (#298).
- A blocking modal owns focus and shortcut precedence. Navigation requests may be rejected or queued by explicit policy, but must not move focus behind the modal.
- On modal close, focus returns to the exact invoking registered control when it remains compatible and mounted; otherwise it returns to the declared semantic fallback. Issue #309 is the current concrete modal-lifecycle precedent.
- Global application shortcuts dispatch lifecycle command IDs. Editor shortcuts dispatch typed navigation or feature-owner operations. The same key must not cause both layers to act.
- Focus routing must make hidden ancestors visible before focusing, preserve a visible focus indicator, avoid surprise scrolling outside the requested alignment, and announce meaningful unavailable/invalid results where a user initiated the route.
- Responsive relocation may change the presentation adapter, but tab order, accessible name, state, capability, owner, and keyboard result must remain equivalent (#265).

## 17. Testable Invariants And Future Validation

Future implementation is incomplete unless focused tests prove:

1. Every control adapter maps to one taxonomy class and one semantic owner.
2. Application adapters dispatch exact lifecycle command IDs and do not duplicate guards.
3. Each destination parses as a closed discriminated union and rejects invalid workspace/surface/area/owner/control combinations.
4. Disc, Case Front, Case Back, left spine, and right spine route distinctly; compatibility pane adaptation does not erase physical-side identity.
5. Routing follows workspace → surface → render/reveal → focus and consumes once without selector queries, proxy clicks, timers, or retry loops.
6. Results distinguish `completed`, `unavailable`, `invalid`, `hidden`, and `editor-incompatible`.
7. Navigation completion cannot satisfy or replace a command/workflow/mutation result.
8. Return Home/Resume retains navigation without serialization or dirty-state change.
9. Merely selecting a preset, contextual category, preview object, zoom, pan, or Guide Legend state is non-dirty.
10. Explicit configuration/workflow mutations update only their established feature owners and dirty state follows lifecycle baseline comparison.
11. Hidden optional features remain disabled and preserved; navigation returns `hidden` or focuses an explicit enable fallback without enabling them.
12. Modal focus is trapped and restored semantically; Space and other shortcuts respect interactive targets and layer precedence.
13. Responsive or relocated adapters preserve accessible state and call the same owner.
14. Preview-to-control, guided focus, future inspector, and context actions converge on one destination registry.
15. The stale #301 Case entries have no successful destination until removed or backed by a real semantic owner.

Documentation-only validation for this draft consists of heading/order checks, local-link checks, required-term and issue-map checks, whitespace/diff checks, and verification that only intended documentation files changed. Future code implementation requires the repository’s focused tests plus lint/build/cycle checks as applicable. User-visible navigation, focus, modal, and responsive behavior requires native Tauri manual/runtime verification; browser diagnostics alone cannot establish acceptance.

## 18. Issue And Dependency Mapping, Exclusions, And Unresolved Decisions

| Issue(s) | Relationship to this contract |
| --- | --- |
| #306 | Owns persistent Case surface discoverability; must use the physical-surface IDs here. |
| #301 | Owns only the two verified stale/ownerless Case entries; it is not a general navigation redesign. |
| #175 | Primary typed destination/preview-to-owner bridge; must not encode permanent sidebar location. |
| #172, #174, #176 | Selection, inspector, and context-action consumers of the same selected-owner/destination registry. |
| #265 | Responsive ribbon host behavior without ownership migration. |
| #299 | Programmatic active contextual-category state. |
| #298 | Space/focus arbitration for viewport interaction. |
| #309 | Current modal lifecycle/focus-restoration precedent; generalized modal rules remain lifecycle-owned. |
| #307, #311 | Disc template validation and reversible recovery are specified by `DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`; navigation only reveals and focuses that owner. |
| #304, #310 | Stale Game search/import generation and visible import/result feedback; target semantics defer to [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md). |
| #168, #149, #281 | Preset, structured mark/case residual, and guided-workflow contracts that remain with focused feature owners. |
| #17 | Guided Start depends on lifecycle commands and typed destinations; it must not duplicate either. |
| #181 | Remaining Case back-copy chooser/feedback scope; it is not a navigation owner. |
| #167 | Preview viewport and preview-local rail/overlay acceptance. |
| #300 | Home load cancel/failure feedback; command result remains lifecycle-owned. |
| #302 | Focused Export ordering implementation; this reference classifies Export, while [`EXPORT_WORKFLOW_CONTRACT.md`](EXPORT_WORKFLOW_CONTRACT.md) settles the target sequence. |

Explicit exclusions:

- no final menu, toolbar, ribbon, panel, dialog, or sidebar design;
- no new project schema or migration;
- no new application command IDs or lifecycle semantics;
- no redefinition of rich text, HTML/source editing, renderer/export parity, packaging roles, or preset data;
- no relocation implementation, DOM targeting strategy, CSS plan, or component refactor;
- no GitHub issue creation, closure, reprioritization, or claim that open acceptance work is complete.

Unresolved decisions that require focused issue work:

- the final presentation hosts and responsive breakpoints for each host category;
- whether a future Case UI presents left/right spines as separate top-level surface controls or as side-specific destinations within one Spine adapter;
- the implementation mechanism for the already-defined Export workflow and native destination safety (#302 and the Export contract);
- the eventual schema treatment of the compatibility Case pane field;
- the full registered owner/control catalog beyond the minimum defined here;
- whether navigation requests during a blocking modal are rejected or explicitly queued by the lifecycle/modal owner;
- the detailed Guided Start sequence and its supported editor/template combinations (#17); and
- the user-facing copy and announcement policy for navigation failures and workflow results.
