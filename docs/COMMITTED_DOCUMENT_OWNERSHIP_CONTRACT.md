# Committed document ownership contract (#363)

> Status: Target architecture and current-source inventory; runtime migration is pending.
> Purpose: Define one committed document owner, the transient UI boundary, and the first deletion-proven migration slice.
> Evidence: integrated production source `923f7b7fcbfa6569439e26ba049c265816a1db65`.
> Authority: SDD owns current architecture; this contract owns the proposed #363/#365 document boundary. Existing schema, lifecycle, text, geometry and package contracts remain binding.

## 1. Scope and current status

This is the design portion of #363. It does not claim that a new document owner
is installed, that React feature state has been migrated, or that #365 is done.
The chosen implementation direction evolves the existing lifecycle runtime and
its store. It must not add a permanently synchronized second project store.
Actual installation, selector/transaction implementation and deletion proof belong
together with the first complete workflow migration; unused parallel runtime
infrastructure is not a completion artifact.

The [#368 baseline](PERFORMANCE_BASELINE.md) measures source helpers, headless
native package work and browser export diagnostics. Native input-to-preview,
actual committed-edit and whole-app memory evidence is still missing. Capture
that evidence before accepting a production ownership migration. Integrate and
revalidate the separate preservation fixes #357/#358/#359/#360/#362 under their
own integration/native gates; do not treat unmerged work as integrated behavior.

## 2. Current ownership and synchronization map

The following are current source facts, not target-state claims. A historical
immutable baseline or an operation-owned candidate is not itself another editable
owner. The duplication is the *current* editable value being maintained in both
React feature state and the lifecycle project projection.

| Representation | Current owner and direction | Role and migration consequence |
| --- | --- | --- |
| Disc editable feature state | [App](../src/app/App.tsx), `src/hooks/useBackgroundImage.ts`, `useTitleArtwork.ts`, `useProjectLogoAssets.ts`, `useAdditionalArtwork.ts`, `useDiscTextEditor.ts` / `useDiscTextState.ts`, mark/banner/template hooks | Event handlers and imports mutate React state; preview reads these values. Migrate one domain's committed values at a time, retaining only presentation/draft state in its hook. |
| Case editable aggregate | `App.projectJewelCase`; `useCaseInsertTemplateEditor` / `useJewelCaseSpineEditor`; `src/caseInsert/*Transitions.ts` and focused actions | React holds one complete `ProjectJewelCaseState`; template/spine helpers return successor aggregates. This remains unmigrated until its own slice. |
| Full saved-project projection | [appProjectSave.ts](../src/app/appProjectSave.ts), [createProjectSnapshot.ts](../src/project/createProjectSnapshot.ts), [caseInsertProjectAdapters.ts](../src/project/caseInsertProjectAdapters.ts) | `App.captureCurrentSavedProject` assembles feature state. It is transport/schema data, not the target hot document model. |
| Current lifecycle project | [projectSession.ts](../src/lifecycle/projectSession.ts): `ProjectSession.project`, `revision`; [applicationLifecycleStateStore.ts](../src/lifecycle/applicationLifecycleStateStore.ts) | App layout effect calls `synchronizeCurrentProject`; normalization, semantic equality and store CAS install a current immutable projection. This mirror must cease being required for migrated-domain edits. |
| Clean baseline | `ProjectCleanBaseline.exactSnapshot` and `comparisonValue` in `projectSession.ts` | Historical accepted Save/Open state, not editable current state. Preserve exact dirty semantics and R versus R+1. |
| Canonical capture/comparison | [canonicalProject.ts](../src/lifecycle/canonicalProject.ts) | Clone/validate/freeze and canonical comparison, with weak-set/weak-map reuse. Keep compatibility authority; remove full serialization from migrated scalar-edit paths. |
| Application shell/command owner | [applicationLifecycleRuntime.ts](../src/app/applicationLifecycleRuntime.ts), [useApplicationLifecycleRoot.ts](../src/app/useApplicationLifecycleRoot.ts), [applicationLifecycleCompositionRoot.ts](../src/lifecycle/applicationLifecycleCompositionRoot.ts) | Stable runtime outside React receives committed callback dependencies; busy scopes, semantic commands and lifecycle store are already centralized. Evolve this installation point. |
| Open/New candidates and restore adapters | [appProjectLoad.ts](../src/app/appProjectLoad.ts), [appProjectRestore.ts](../src/app/appProjectRestore.ts), [appProjectNewCommand.ts](../src/app/appProjectNewCommand.ts) | Open stages without mutation, then applies a complete editor aggregate and lifecycle successor atomically. Replace feature setters for migrated fields with one document installation; retain failure preservation. |
| Save operation | [appProjectSaveCommand.ts](../src/app/appProjectSaveCommand.ts), [projectPackageCapturePlan.ts](../src/package/projectPackageCapturePlan.ts), [projectPackageWrite.ts](../src/tauri/projectPackageWrite.ts) | Pins session snapshot R, captures portable assets, frames native request, writes, then adopts exact R baseline. No post-write recapture. Preserve this ordering while sourcing R from the document owner. |
| Case preset application companion | [caseInsertPresetSessionApplication.ts](../src/lifecycle/caseInsertPresetSessionApplication.ts), `src/caseInsert/presetAssignmentSnapshot.ts`, `src/presets/caseInsertPresetConfigurationAdoptionModel.ts` | Session companion holds attachment/revision/identities, not a second Case aggregate. Assignment/application snapshots are derived validation/planning artifacts. Do not misclassify all of them as editable stores or delete compatibility blindly. |
| Preset plans/configuration/adoption | `src/presets/`, Case workflow owner/controller and [caseInsertPresetProjectPersistence.ts](../src/project/caseInsertPresetProjectPersistence.ts); Disc `useActiveDiscPreset` | Planned values, retained applied-field evidence and restoration metadata currently coordinate with feature state and lifecycle. They must submit document operations for migrated fields; later #373 simplifies only after compatibility is accounted for. |
| Preview/hit-test/export inputs | `src/components/preview/`, `src/interaction/`, `src/layout/`, `src/export/` | Derived consumer inputs, not committed owners. Visible preview/final renderer remains visual authority; shared geometry work belongs to #371. No renderer replacement is implied. |
| Hydrated/project-package data | [projectTypes.ts](../src/project/projectTypes.ts), schema/normalizers, Rust package codec and atomic writer | Explicit external compatibility boundary. Schema 0.4.0 and package v1 remain unchanged by this ownership design. |

### Root-field coverage

Every persisted field group has a migration destination; no catch-all App store
is retained as the final owner.

| Current serialized fields | Current editable source | Target classification |
| --- | --- | --- |
| `schemaVersion`, `projectType`, `savedAt` | Snapshot/schema adapters | Compatibility envelope; kind also constrains the document. Save timestamp is not an edit or dirty change. |
| `title`, `game`, `metadata` | App manual title/metadata; `useSteamImport` selected game | Committed semantic content and provenance. Search queries/results/loading remain UI/request state. Imported artwork bytes move behind asset references through #364, not into every revision. |
| Disc `template` | `useDiscTemplate` / `useDiscTemplateState` | Committed physical/template identity and existing canonical dimensions. |
| Disc `background` | `useBackgroundImage` (`useBackgroundArtwork` is its alias) | First migrated domain: content/source, enabled state, scale/offset and validated asset metadata/reference. |
| Disc `titleArtwork`, `logoAssets`, `additionalArtwork` | Dedicated artwork/logo hooks | Committed domain values and stable element IDs, then asset references. |
| Disc `discText`, `discNumberArtwork` | `useDiscTextEditor` / `useDiscTextState` and existing text/domain owners | Committed content, sources, runs/styles and layout; composition, caret and selection remain transient under the text contract. |
| Disc `ratingBadge`, `mediaMark`, `platformMarks`, `technicalMarks`, `steamBackupLogo` | Corresponding mark/banner hooks plus metadata/banner placement | Committed semantic values, visibility and geometry. Preserve disabled custom assets and source selection. |
| Disc `export` and Case `caseInsert.export` | Export-guide/domain owners | Existing saved output configuration. Preview-only guide visibility remains distinct from exported proof guides. |
| Case `caseInsert` | App aggregate + template/spine feature actions | Committed Cover/Tray/left/right content, text, branding, framing and layout. Artwork crop/reserved viewport is document content, not UI pan/zoom. |
| Case `editor.activeCaseInsertTemplatePane` | App route state | Compatibility/UI sidecar. Keep current load/save behavior without letting pane navigation advance document content revision. |
| Disc `editor.guidedLayout` | App guided workflow + completion owners | Existing persisted semantic guided choices/completion remain a compatibility domain. Do not classify them as disposable merely because the key is named `editor`. |
| Case `caseInsertLayoutPreset` | Preset persistence projection | Compatibility/application metadata with existing dirty exclusions; do not silently turn attachment-only changes into content edits. |
| Accepted unknown/legacy fields | Existing normalization/compatibility adapters | Preserve current accepted behavior; ownership migration does not authorize dropping fields or relaxing schema validation. |

### Case continuous-edit integration boundary

Case gesture coordination is a separate integration concern. A gesture
coordinator stages transient Case edits, a command-boundary port flushes or
retires them, and whole-project synchronization must respect an active gesture.
Save, replacement, navigation and export consume that barrier. Preserve these
semantics when integrating a document migration; they are an interaction
contract, not proof that the proposed document owner has been installed.
The one-shot Case Apply UI does not complete #373's architectural removal.
Native acceptance remains required for the integrated workflow.

## 3. Chosen target: one runtime installation with document and lifecycle ports

Evolve the existing `ApplicationLifecycleStateStore` installation inside the
stable application runtime. Its active session slot holds one immutable
`DocumentHead` plus lifecycle metadata. Expose two focused ports over that same
installation: document read/transaction/selector operations, and lifecycle
path/baseline/route/guard operations. There is no second independently writable
current aggregate in `ProjectSession`, React context or a preset store.

A read-only lifecycle projection may reference the exact same `DocumentHead`
object for compatibility. It must not clone it into a separately mutable source,
accept feature setters, or require a synchronization effect after a document
commit. New/Open/Close install or retire document and lifecycle metadata through
one existing store-generation CAS, so subscribers cannot observe a new document
with the old session/path or the reverse.

Target boundary vocabulary (design, not an implemented exported API):

```ts
type DocumentHead = Readonly<{
  documentId: DocumentId
  contentRevision: ContentRevision
  kind: 'disc' | 'caseInsert'
  domains: CommittedDomains
}>
type DocumentOperation =
  | BackgroundAssetAdoption
  | BackgroundVisibilityChange
  | BackgroundTransformCommit
  | BackgroundLayoutReset
  | BackgroundClear
  | LegacyUnmigratedDomainsReplace // temporary, closed allowed-field set

type DocumentTransaction = Readonly<{
  sessionId: ProjectSessionId
  documentId: DocumentId
  expectedContentRevision: ContentRevision
  operationId: OperationId
  operation: DocumentOperation
}>
type CommitResult =
  | { status: 'committed'; head: DocumentHead; changedDomains: readonly DomainId[] }
  | { status: 'no-op'; head: DocumentHead }
  | { status: 'stale' | 'invalid' | 'unavailable'; reason: string }
```

IDs and revisions must be validated, bounded and opaque to presentation. A
revision is a safe monotonic integer; exhaustion fails without mutation. No
arbitrary JSON-patch path, callback with write access, or generic property bag is
an application-facing operation. Existing typed pure feature transitions remain
the domain decisions behind the narrow operation variants.

A transaction checks session/document identity, expected content revision, owner
field footprint, current capability/busy scope and asset availability before
publishing. It prepares one immutable successor or nothing. A real semantic
change increments content revision once and notifies once; no-op, cancellation,
stale request and failure do not advance it. Stale operations do not silently
rebase. Async work stages outside the commit; commit contains no await, I/O or
asset decode. Subscriber exceptions cannot undo or partially publish a commit.
Operation replay is owned by the existing bounded command/operation lifecycle,
not an unbounded event log or independent history database.

Selectors read stable immutable snapshots and subscribe by affected domain;
unchanged selected values keep identity. `useSyncExternalStore` adapters must
return the cached current snapshot, not allocate or normalize on every read.
Presentation may own focus, expansion, selection, hover, viewport zoom/pan and
in-progress drafts, but not a second committed background value. Rendering
adapters resolve document plus an explicit active draft; geometry/domain helpers
still decide clamp/fit and current coordinate interpretation.

## 4. Assets, baseline and compatibility

A target asset reference identifies immutable validated content or a published
semantic built-in identity. Bytes, decoded images, object URLs and thumbnails
belong to the asset boundary in #364. Content identity and provenance are distinct;
changing a source label must not invent different image bytes. Geometry-only
operations retain the same asset reference without encoding/copying its bytes.
#365 may use a focused internal compatibility handle for its one migrated asset
owner, but it must have explicit staged/current/in-flight-save lifetimes and a
#364 replacement path. An inline-data-URL clone in every document revision does
not satisfy this contract.

The current document, an in-flight Save R, and any retained historical state that
must reconstruct R pin the necessary asset handles until released. Cancelled or
stale import candidates release their staged resources. Disabling a visual
feature keeps its asset and layout; Return Home retains the active document.
Asset lifetime changes do not permit deletion of user files.

Save materializes the existing normalized `SavedProject` schema and package
capture plan from one pinned document revision plus the required compatibility
sidecars. Rust remains the package/registry/codec authority. Open first recognizes,
decodes, validates and restores into an uninstalled candidate; failed staging
leaves the entire active installation unchanged. Successful Open/New publishes
one complete document/lifecycle installation and updates UI projections from it.

The clean baseline is an immutable historical checkpoint, not another editable
head. Save R succeeding while R+1 is current adopts baseline R and leaves R+1
current and dirty. Dirty means exact semantic content inequality, not merely
revision inequality: undo or an equal-value edit back to baseline must be clean.
Preserve current exclusions (for example saved timestamp, route and Case preset
attachment metadata) through explicit compatibility selectors.

For the first mixed migration, compare the changed background domain exactly and
reuse a cached semantic comparison for the unchanged legacy remainder. Do not
reserialize all retained assets to compare one scale/offset edit. Hashes may
index cached evidence but cannot replace the existing exact semantic contract
with a probabilistic clean decision. Unknown accepted legacy fields remain under
the compatibility comparator until their owner migrates.

Persisted artwork crop/fit/rotation and reserved viewport frames are document
content. UI camera pan/zoom, focus, drag anchors and text composition are not.
Preserve current serialized route/guided/preset compatibility fields in explicit
sidecars; do not drop them or change file versions to simplify internal state.
Coordinate-unit changes require their own parity migration under #371/#311;
this design alone does not authorize converting stored background offsets.

## 5. Continuous edits and command barriers

Begin captures session/document/revision, target identity and original domain
value. Pointer/slider updates create bounded transient draft values through the
existing clamp/fit owner; they do not publish document revisions or serialize
assets. The visible preview may render the draft; hit targets use the same
resolved draft geometry. A normal completion submits one transform transaction.
A duplicate pointer-up or range completion cannot commit twice.

Cancellation, lost ownership, project replacement or unmount retires the draft
without resurrecting it in a later session. Current text composition and the
Case gesture coordination keep their established completion/cancellation rules;
reuse their proven semantics instead of changing them incidentally.

Save, export, replacement and navigation use one explicit draft barrier before
capturing document R. Finalize the current permitted draft once, or return a
blocked/cancelled result; never silently save a visually newer draft as an older
committed image. The resulting command captures the post-barrier head. Do not
add duplicate flush logic independently in each component or renderer.

## 6. First migration slice: Disc background artwork (#365)

Disc background is mature and exercises upload/Steam selection, on/off state,
scale/offset, pointer movement, fit/reset, preview, PNG, save/load, guided-slot
completion and active preset placement. Preserve all of those routes in one slice.
The existing [background hook](../src/hooks/useBackgroundImage.ts),
[image domain](../src/image/backgroundImage.ts),
[import owner](../src/image/backgroundImageImport.ts),
[fit helper](../src/layout/backgroundArtworkFit.ts),
[preview layer](../src/components/preview/BackgroundLayer.tsx),
[exporter](../src/export/exportPng.ts) and preset/guided owners remain the algorithm
sources. A new store must not reimplement their geometry, source or image policy.

### Required removal and adaptation ledger

| Current path | Required #365 result | Evidence that prevents a cosmetic migration |
| --- | --- | --- |
| Six committed background `useState` values in `useBackgroundImage` (asset URL/source/size, scale/offset, enabled; selected candidate is separate) | Hook selects document values and dispatches typed operations; candidate/loading and active drafts stay transient. | No committed background setter remains as an alternate write authority. |
| `applyBackgroundImageImport`, visibility, scale/offset, fit and reset setter sequences | Existing pure decisions prepare one checked domain operation, including dependent preset/guided effects. | One revision/publication or none; failed image import preserves old content/source/layout. |
| Background fields in `App.captureCurrentSavedProject` and effect dependencies | Migrated background is absent from ordinary legacy synchronization input/dependencies. | Background scalar edit does not call whole-project capture/canonical serialization or resynchronize that same field. |
| Full-project legacy synchronization accepting background | Replace with a closed unmigrated-field adapter; reject migrated-field writes. | An older React projection cannot overwrite a newer document background. No permanent both-direction bridge. |
| Open/New `restoreBackgroundImageState` / reset setters | Staged document installation supplies the background; hook reads the new head. | Failure leaves all owners unchanged; success publishes matching session/document once. |
| Preview, pointer adapter and export parameter assembly | Select the same committed background or explicit draft/resolved adapter; export after the command barrier. | Same source/visibility/offset/fit behavior, no clone of the old committed feature state. |
| Active Disc preset placement, guided completion, template/Steam import touching background | Submit through the same transaction or a named temporary compatibility adapter with owner footprint. | They cannot bypass the document commit or partially publish dependent state. |
| Save/package projection | Materialize migrated background exactly once at the persistence boundary using its pinned asset handle. | Legacy/schema/package round trip retains bytes, disabled state, layout and provenance. |

Do not count `selectedArtworkId` or loading as committed content. During the first
slice, other domains may retain their explicitly listed legacy React owners.
The single document head has a migrated-background partition and an unmigrated
remainder with disjoint fields. That temporary adapter is owned by #372 and must
not evolve into another permanent aggregate store. #365 is not complete if its
own background field still depends on the old synchronization loop.

## 7. Behavioral oracles and acceptance gates

Reuse existing behavior, not source-file shape, as the oracle:

- [backgroundImage.test.ts](../src/image/backgroundImage.test.ts),
  [backgroundArtworkSource.test.ts](../src/image/backgroundArtworkSource.test.ts)
  and [backgroundArtworkFit.test.ts](../src/layout/backgroundArtworkFit.test.ts):
  source behavior, clamping, banner-aware fitting and layout preservation.
- [canonicalProject.test.ts](../src/lifecycle/canonicalProject.test.ts),
  [projectSession.test.ts](../src/lifecycle/projectSession.test.ts),
  [appProjectSaveCommand.test.ts](../src/app/appProjectSaveCommand.test.ts),
  [appProjectOpenCommand.test.ts](../src/app/appProjectOpenCommand.test.ts),
  [appProjectRestore.test.ts](../src/app/appProjectRestore.test.ts): exact no-op,
  session/revision/CAS, staging preservation, R versus R+1 and atomic restoration.
- [canvasImage.test.ts](../src/export/canvasImage.test.ts), current preflight tests,
  native codec conformance and the legacy project fixtures: active pixels,
  bounds, portable assets, disabled-state retention, recognition and schema parity.
- [TEXT_EDITOR_CONTRACT.md](TEXT_EDITOR_CONTRACT.md),
  [PROJECT_FILE_SPEC.md](PROJECT_FILE_SPEC.md),
  [PROJECT_PACKAGE_FORMAT_CONTRACT.md](PROJECT_PACKAGE_FORMAT_CONTRACT.md),
  [APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md),
  [DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md),
  [CASE_INSERT_LAYOUT_PRESET_WORKFLOW_CONTRACT.md](CASE_INSERT_LAYOUT_PRESET_WORKFLOW_CONTRACT.md),
  [SOFTWARE_DESIGN_DOCUMENT.md](SOFTWARE_DESIGN_DOCUMENT.md): subsystem authority.

Add behavioral tests for stale session/revision rejection, no partial commit,
selector identity, one completion per gesture, equal-value no-op, failed import,
disabled assets, stale legacy-projection overwrite attempts, Save during draft,
R/R+1, close/reopen lifecycle and resource release. Instrument calls in real owner
composition to prove that background scalar edits do not enter whole-project
capture; a regex asserting a helper name vanished is insufficient.

Rerun #368 before/after on the same fixtures and environment. Required native
workflow acceptance covers local and Steam assets, off/on retention, drag and
slider/manual edits, reset/clear, guided/preset/template interactions, save/reopen,
failed Open, export and preview equivalence. The primary checkout must include
both the reviewed migration and applicable Case continuous-edit changes; headless/browser tests
cannot substitute for it. Record exact source/primary commits and package/platform
limits. #363/#365 remain open until their integration and acceptance obligations
are satisfied; this contract is not a closure receipt.
