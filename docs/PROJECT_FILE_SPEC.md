# Project File Specification
> Status: Authoritative save/load schema reference.
> Purpose: Hydrated `SavedProject` schema, current/legacy JSON compatibility, validation, normalization, and migrations.
> Read when: Save/load, schema, migration, project-file, or package-format work.
> Authoritative source: This document for hydrated saved-project fields and migrations; `PROJECT_PACKAGE_FORMAT_CONTRACT.md` for target package/container behavior; SDD for architecture boundaries.
> Last reviewed against commit: `42c58821ad355a0cbc3ee602c94ec67ac7345de0` plus the dormant package Open staging checkpoint documented below.


Last refreshed: 2026-07-28.

## Purpose

Project files let users save and reopen disc-label designs. The same JSON
project format also stores active jewel case insert projects for the current
case insert editor surface.

A project file should store enough state to restore the current editor state
without depending on the original local files after reload when assets have been
embedded.

Application-session metadata is outside this schema. A native current path,
in-memory session ID, clean baseline, revision, derived dirty state, lifecycle
busy state, feedback, focus, and dialog state must not become serialized merely
to implement the draft target lifecycle in
[`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md).
That contract owns target command/session semantics; this specification remains
authoritative for every persisted field and migration, including current
case-editor metadata.

The draft target
[`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md)
owns the package manifest, projection, bindings, hydration, and container
rules. Those are transport-only codec artifacts. Only a fully hydrated,
schema-accepted, normalized `SavedProject` is editor content and the lifecycle
project/baseline authority. Package v1 does not change schema `0.2.0`.
The package contract's target canonical data-URL spelling is a package-snapshot
normalization rule shared with canonical dirty comparison, not a new field or a
claim about current plain-JSON normalization. Implementing it must preserve
legacy reads and cannot mutate live editor content merely because Save ran.

Game search queries, result sets, candidates, request generations, busy state,
and immutable import plans are also session-only or ephemeral and are not added
to this schema by the draft target
[`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md).
Only accepted atomic Game workflow changes flow into the existing persisted
project fields owned by this specification; any future new persisted field still
requires an explicit schema and migration decision here.

Raw custom-dimension drafts, field diagnostics, immutable geometry plans,
last-valid session drafts, review state, recovery tokens, and transient
template-resolved preset geometry are likewise session-only or ephemeral under
the draft target
[`DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`](DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md).
Only a successful atomic geometry apply changes the existing persisted selected
template/custom-dimension and feature-owner layout fields. Any future attempt to
persist draft or recovery state requires an explicit schema and migration
decision in this specification.

The draft target
[`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md)
defines which applied/customized/detached Disc preset configuration semantics
would affect later editing. This specification still owns any eventual JSON
shape, schema version, validation, normalization, and migration. No such
generic preset configuration is present in schema `0.2.0`, and a migration must
never infer it from owner coordinates or Guided progress.

## Current Format

The current implementation saves plain JSON project files. User-facing filenames are commonly named `.sbls.json`.

The current source-of-truth type is `SavedProject` in `src/project/projectTypes.ts`.
It is a union of `SavedDiscProject` and `SavedCaseInsertProject`.

Schema/version constants and JSON parsing live in
`src/project/projectSchema.ts`. The older `src/project/normalizeProject.ts`
entry point remains as a compatibility adapter for callers that already import
`normalizeParsedProject`.

Disc snapshot creation lives in `src/project/createProjectSnapshot.ts`, and disc
restoration/normalization lives in `src/project/restoreProjectState.ts` plus
related project modules. Case insert saved-project adapters remain available
through `src/project/projectCaseInsert.ts`, while case-owned defaults,
normalization, state transitions, source helpers, and focused action modules
live under `src/caseInsert/`.

The bounded package-domain codec exists as a Rust workspace member. A dormant
native command now composes the dedicated bounded binary project reader with
that codec and returns only hydrated JSON bytes; a strict dormant TypeScript
port performs fatal UTF-8 decoding and delegates to the same mutation-free
parse/migrate/normalize/route/restore staging owner as legacy Open. The Tauri
application links the codec only for that registered but uncalled adapter.
Production `.sbls` Open, Save, Save As, dialog filters, content recognition,
lifecycle format adoption, and legacy conversion are not implemented.
Documentation and UI must not imply that application-connected package support
exists today. Exact target behavior is defined by
[`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md); the
closed #56 rationale is preserved in
[`PROJECT_PACKAGE_FORMAT_DECISION.md`](PROJECT_PACKAGE_FORMAT_DECISION.md).

## Current Native Project Persistence Boundaries

The Tauri `write_project_file(path: String, contents: String)` command preserves
its existing frontend interface and treats `contents.as_bytes()` as opaque
UTF-8 bytes. It does not parse, normalize, migrate, or otherwise change Disc or
Case Insert JSON. Schema and load compatibility therefore remain owned by the
TypeScript project adapters described above.

Native text-project writes now route through `src-tauri/src/project_file.rs`.
The writer validates the destination filename, creates a uniquely named file in
the destination directory with exclusive create semantics and bounded collision
retries, then performs `write_all`, `flush`, and `sync_all`. It closes the
temporary handle before one namespace commit. Every handled creation, partial
write, flush, sync, close, or replacement failure leaves an existing destination
unchanged (or an absent destination absent) and attempts to remove only the
temporary file created by that operation. A cleanup failure is appended to the
primary phase error instead of replacing it. Colliding files are neither opened
for overwrite nor removed.

On Windows, the commit uses the documented Unicode
[`MoveFileExW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw)
primitive with `MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH`. The
temporary file is adjacent, so the move remains on the same volume, and
`MOVEFILE_COPY_ALLOWED` is deliberately not used. Windows tests exercise
existing and absent destinations, Unicode paths, and a real sharing-lock
replacement failure that preserves the previous bytes. Linux and macOS use
their same-filesystem rename primitive through `std::fs::rename`; unsupported
non-Windows/non-Unix targets fail explicitly rather than falling back to a
non-atomic copy or direct overwrite.

The durability boundary is intentionally narrow: all temporary-file content and
metadata supported by `File::sync_all` are synchronized before the namespace
commit, and Windows requests write-through for the move. The implementation does
not perform a fallible parent-directory synchronization after commit and does
not claim power-loss durability for the directory entry beyond the operating
system and filesystem guarantees. A successful replacement is the last fallible
operation. Handled failures clean their owned temporary file when the filesystem
allows it; process termination and a filesystem that rejects cleanup can still
leave an identifiable adjacent temporary artifact.

The dedicated `read_binary_project_file` and `write_binary_project_file`
commands form a separate dormant project-byte boundary. They carry one
canonical percent-encoded UTF-8 path in the bounded
`x-sbls-project-path-v1` request header. Read accepts only an empty raw request
body and returns Tauri's raw octet-stream response; write accepts only a raw
body and returns a small structured success object. Both native and frontend
adapters enforce the exact 268,435,456-byte raw-project cap. The reader uses
metadata only as an early rejection hint, reads through a fixed-size scratch
buffer with fallible checked `Vec` growth, and probes through cap + 1 so stale or
lying metadata cannot bypass the observed limit. The writer rejects over-limit
input before path processing or temporary-file creation and then delegates the
borrowed exact bytes to the same `project_file::write` primitive described
above.

Command failures are structured safe objects. They preserve
`project.file-too-large`, `project.read-failed`, `project.write-failed`, and
each exact `project.atomic-write.*` phase code without parsing display text.
Optional causes contain only stable categories, operations, numeric platform
codes, and safe secondary cleanup categories; paths, payloads, and raw OS error
strings are excluded.

The legacy UTF-8 JSON read/write commands remain production Open/Save owners.
The raw binary TypeScript ports have no production application, lifecycle,
dialog, menu, or export caller. The application staging module exports a
separate package entry that accepts an injected dormant decode command, but no
production composition root supplies or calls it. The native package adapter
shares the bounded Rust reader owner directly; the package codec does not
consume TypeScript ports or filesystem paths.
`write_binary_file` and PNG export behavior are unchanged; that direct writer
is not an atomic project-package writer. These infrastructure boundaries add no
schema fields, session state, current path, dirty baseline, Save/Save As
distinction, or lifecycle command behavior; those remain under #308 and
[`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md).

## Current Saved State

Current disc project files use schema version `0.2.0` and include:

- top-level title and saved timestamp
- selected Steam game data and manual title
- project-owned metadata
- background artwork enabled state, embedded image data, source/provenance, size, scale, and offset
- template type, selected built-in template, or custom disc dimensions
- Steam banner placement, colors, lockup image data/source/size, lockup layout, and optional text fallback
- export guide settings
- developer/publisher/additional logo assets
- title/logo artwork state
- disc-number artwork state
- additional artwork elements
- rating badge state
- media mark state, including the built-in light/dark theme where supported
- operating-system mark state, including platform-specific built-in styles where supported, and inference metadata
- technical mark state
- disc text enabled state, values, metadata/manual value sources, title override, layout, and styles
- optional Disc guided-layout identity/version plus independent canonical
  omitted and completed slot IDs

## Asset Embedding And Provenance

Current saved projects generally embed image data as data URLs for assets that need to reload without the original source file.

Where supported, image assets also store provenance/status metadata:

- source kind, such as built-in, placeholder/generic, Steam artwork, web artwork, logo candidate, local Steam screenshot, uploaded, custom, or embedded
- source ID where safe/useful
- sanitized source label
- source URL for remote candidates where safe/useful

Local path details should not be stored as the durable identity for uploaded/local Steam screenshot assets. The project should be reloadable from embedded data without requiring the original local path.

## Current Disc Schema Sketch

This sketch is intentionally descriptive. `src/project/projectTypes.ts` remains the exact source of truth.

```ts
type SavedDiscProject = {
  schemaVersion: '0.2.0'
  title: string
  savedAt: string
  game: {
    manualTitle: string
    selectedSteamGame: SteamImportedGame | null
  }
  metadata?: ProjectMetadata
  editor?: {
    guidedLayout?: {
      id: string
      version: number
      omittedSlotIds: string[]
      completedSlotIds: string[]
    }
  }
  logoAssets?: ProjectLogoAssetsInput
  titleArtwork?: Partial<ProjectTitleArtwork>
  discNumberArtwork?: Partial<ProjectDiscNumberArtwork>
  additionalArtwork?: ProjectAdditionalArtworkInput
  ratingBadge?: ProjectRatingBadge
  mediaMark?: ProjectMediaMark
  platformMarks?: ProjectPlatformMarks
  technicalMarks?: ProjectTechnicalMarksInput
  template: {
    type: 'disc'
    variant: SelectedDiscTemplateId
    customDimensions?: DiscTemplate | null
  }
  steamBackupLogo: {
    placement: SteamLogoPlacement
    bannerColors?: SteamBannerColors
    lockupImageDataUrl?: string | null
    lockupImageSource?: ProjectImageAssetProvenance | null
    lockupImageSize?: BackgroundImageSize | null
    lockupLayout?: SteamBannerLockupLayout
    useTextFallback?: boolean
    fallbackText?: string
  }
  export?: {
    guideMode?: ExportGuideMode
    guides?: ExportGuideSelection
  }
  background: {
    enabled?: boolean
    scale: number
    offset: BackgroundOffset
    imageDataUrl: string | null
    imageSource?: ProjectImageAssetProvenance | null
    imageSize?: BackgroundImageSize | null
    note: string
  }
  discText?: {
    settings?: Partial<DiscTextSettings>
    values?: Partial<DiscTextValues>
    valueSources?: Partial<DiscTextValueSources>
    titleValue?: string
    layout?: Partial<Record<DiscTextKey, Partial<DiscTextLayout>>>
    styles?: Partial<Record<DiscTextKey, Partial<DiscTextStyle>>>
  }
}
```

## Current Case Insert State

Jewel case projects are active current JSON projects in the same `0.2.0`
project family. The case insert editor supports cover, tray, left spine, and
right spine state, preview, save/load, guide settings, and PNG export paths.
This does not mean jewel case alpha is complete; #126 and #149 still track the
broader finish-line and structured layout work.

Current case insert project files use `projectType: 'caseInsert'` and normalize
to `template.type: 'caseInsert'` plus `template.variant: 'jewelCase'`. Older
or sparse shells that used `template.type: 'jewelCase'` are routed and
normalized as jewel case projects.

The jewel case state stores:

- front surface background, title artwork, artwork slots, callout text, logo slots, mark slots, and text blocks
- back surface background, title artwork, additional artwork slots, description, feature bullets, minimum/recommended requirements, legal text, logo slots, mark slots, and text blocks
- left and right spine settings, including background, title text, logo slots, and mark slots
- case export settings, including selected surfaces and guide IDs
- editor-only state, including the active case insert pane, so reopening returns
  to Cover Sheet or Tray Card without changing saved design content
- image asset data, image size, fit/layout settings, and provenance where present
- update helpers that can disable optional visual/text elements without dropping their remembered values or uploaded assets
- focused cover/tray/spine action state covered by
  `src/project/projectCaseInsert*.test.ts`,
  `src/project/restoreProject*.test.ts`, and
  `src/diagnostics/projectParityHarness*.test.ts`

The current descriptive shape is:

```ts
type SavedCaseInsertProject = {
  schemaVersion: '0.2.0'
  projectType: 'caseInsert'
  title: string
  savedAt: string
  game: {
    manualTitle: string
    selectedSteamGame: SteamImportedGame | null
  }
  metadata?: ProjectMetadata
  template: {
    type: 'caseInsert'
    variant: 'jewelCase'
  }
  editor?: {
    activeCaseInsertTemplatePane?: 'cover' | 'tray'
  }
  caseInsert: {
    templateType: 'jewelCase'
    front: ProjectJewelCaseFrontState
    back: ProjectJewelCaseBackState
    spine: ProjectJewelCaseSpineState
    export: ProjectJewelCaseExportSettings
  }
}
```

## Normalization Rules

Project loading now has a small schema validation and migration gate before
editor restoration. The parser checks that the file is valid JSON, that the root
is an object, that the schema version is either current or has a registered
migration path to the current version, and that the top-level saved project shape
has the required current sections for its editor type. It remains intentionally
shallow; feature-specific normalization still belongs to the existing
project/domain modules so sparse migrated data can be restored safely.

Loader normalization should:

- tolerate sparse legacy `0.1.0` project data
- apply safe defaults for missing current fields
- preserve user-provided assets and layout state where possible
- clamp visual element layouts to the selected template safe zone where required
- infer legacy embedded asset provenance safely
- avoid treating missing future fields as fatal
- route case insert projects away from the disc restore path
- normalize sparse jewel case data to safe front/back/spine defaults
- preserve case image asset provenance and embedded data where present
- preserve optional case image, text, artwork, logo, mark, and export state when controls are toggled off

### Guided Workflow Metadata

Disc projects may store `editor.guidedLayout`. The compact persisted contract is
the stable guided layout ID, its positive contract version, stable omitted slot
IDs, and stable completed slot IDs in canonical layout order. The two arrays are
independent and may contain the same semantic slot ID. An inactive workflow
omits `editor` rather than writing an empty no-op object. An active supported
layout remains active when both progress arrays are empty. A valid `0.2.0`
payload that predates completion and omits `completedSlotIds` normalizes it to
an empty array.

Loading translates persistence-boundary strings through the pure Disc guided
workflow normalizer. Unknown layout IDs, unsupported future versions, and
malformed guided metadata deactivate guidance without rejecting the project.
Unknown, duplicate, removed, cross-layout, and non-omittable slot IDs are
discarded from omission; surviving IDs are ordered by the supported layout
definition. Completion is normalized separately: non-array and non-string
values are ignored, duplicates and IDs outside the active catalog are removed,
and surviving IDs are canonically ordered without requiring `omittable`.
Runtime support status does not erase either stored flag.

Omission and completion suppress guidance only. Completion records that a user
handled a setup prompt; it is not inferred from owner coordinates or duplicated
owner content. Neither flag disables an owner, removes content, changes
geometry, or alters preview/render/export behavior. Real owner state continues
to save, restore, render, and export through its existing feature contract.
Canonical preset identity/revision, template-resolved definitions, setup menus,
selected/focused placeholders, role-focus requests, open panels, hover state,
labels, copied geometry, DOM IDs, and array indexes are never stored in
`editor.guidedLayout`.

After load, valid guided identity is mapped back to the canonical reusable
preset and resolved transiently for the restored Disc template and owner state.
That reconstruction restores guidance and targeted OS/Legal behavior without
reapplying placement to any restored owner. The resulting preset reference and
resolved geometry remain runtime-only.

### Schema 0.1.0 Migration

`src/project/projectSchema.ts` registers the explicit migration `0.1.0 ->
0.2.0`. It preserves all existing project fields and changes only
`schemaVersion`. It does not add `editor`, infer Classic Top Title from current
coordinates, create omissions or completions, enable owners, or change
rendering/export.
Legacy `0.1.0` JSON remains accepted through this migration; new snapshots use
`0.2.0`.

## Future Package Direction

The target ZIP-compatible single-file package is specified by
[`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md).
That contract owns the exact layout, content-addressed asset paths, mandatory
digests, manifest bindings, hydration, security limits, legacy conversion, and
binary persistence boundary. The decision rationale remains in
[`PROJECT_PACKAGE_FORMAT_DECISION.md`](PROJECT_PACKAGE_FORMAT_DECISION.md).

Existing `.json` and `.sbls.json` data-URL projects remain readable legacy
imports. A package projection with null asset leaves is not a new saved-project
schema: package loading must hydrate those leaves before this specification's
parser and migrations run. Any future typed package reference that reaches a
hydrated `SavedProject` would require a new schema version and migration here;
package v1 authorizes no such union.

## Future Schema Work

- The semantic packaging role taxonomy is documented in [`PACKAGING_ROLE_MODEL.md`](PACKAGING_ROLE_MODEL.md), the role-based preset definition/model vocabulary is documented in [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md), and target application-level configuration semantics are documented in [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md). Schema `0.2.0` adds only the focused Disc guided-workflow identity plus omission/completion metadata described above; broader role, preset, or role-layout persistence still requires explicit schema and migration work in this spec.
- Register focused project schema migrations in `src/project/projectSchema.ts`
  before changing saved-project semantics.
- Keep migrations one version step at a time and make each migration produce the
  declared target `schemaVersion`; the loader rejects missing, looping, or
  mismatched migration chains before editor restoration.
- Keep explicit schema validation limited to raw JSON safety and current
  top-level saved-project contracts. Feature-specific defaults, sparse restore
  behavior, and layout clamping should remain in the existing project/domain
  normalizers.
- Keep backward compatibility for current fixed systems during any future flexible visual-element migration.
- Keep user-facing documentation clear that the active jewel case project path
  exists, while jewel case alpha remains incomplete until #126/#149 finish-line
  work is explicitly completed.
