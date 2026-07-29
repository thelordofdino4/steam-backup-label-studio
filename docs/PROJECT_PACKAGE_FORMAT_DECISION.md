# Project Package Format Decision
> Status: Accepted historical decision rationale; issue #56 is closed/completed.
> Purpose: Preserve why the target chose a ZIP-compatible single-file `.sbls` package.
> Read when: Project packaging or future container work.
> Authoritative source: `PROJECT_FILE_SPEC.md` for current/hydrated JSON schema; `PROJECT_PACKAGE_FORMAT_CONTRACT.md` for exact target package behavior.
> Last reviewed against commit: `607ab5ffc73f22f71105ea7e5434c93f3de439ef` plus the focused package Save checkpoint documented below.


Last refreshed: 2026-07-29.

Issue: #56 (closed/completed).

## Decision

At the time of this decision, the implemented project format was plain JSON,
normally saved as `.sbls.json`, with embedded image data URLs for assets that
had to reload without the original local files.

The selected `.sbls` format is a ZIP-compatible single-file package, not a loose
folder bundle and not a custom binary format. The package contains a small
manifest, a project JSON projection, and content-addressed asset files associated
through manifest bindings under the exact target contract.

This historical decision itself implemented no `.sbls` package behavior.
Production Save/Save As and legacy conversion are now implemented, while
package Open remains dormant. The draft target
[`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md)
supersedes this ADR's conceptual layout and optional metadata with exact
normative v1 rules.

## Rationale

- A single package file preserves the current user expectation that a project is
  portable and easy to move between machines.
- ZIP-compatible structure keeps the format inspectable and recoverable without
  inventing a custom container.
- Moving large artwork out of JSON can reduce oversized project files while
  preserving hydrated current-schema semantics through the target
  `project.json` projection and pre-schema hydration boundary.
- At the time of the decision, current `.sbls.json` files already worked; the
  ADR therefore did not authorize background or automatic migration.
- A folder bundle would be easier to corrupt by moving or deleting sibling asset
  files, which conflicts with the app's portability goal.

## Current Asset Strategy

For the retained legacy JSON import format:

- Embed user-provided, Steam-imported, web, local Steam screenshot, and custom
  replacement images as data URLs when they are needed for reload.
- Store provenance/status metadata where supported, including source kind,
  source ID, source label, and source URL when safe/useful.
- Do not depend on original local file paths after save.
- Keep built-in generic assets routed through `src/assets/assetManifest.ts`
  instead of copying those built-ins into every project file.

## Superseded Conceptual Package Detail

This ADR originally sketched numbered asset filenames, optional integrity
hashes, and project fields that might be replaced or supplemented with package
references. Those details were intentionally exploratory and are no longer a
parallel target authority.

The exact v1 contract instead requires content-addressed
`assets/sha256/<hash>.<extension>` paths, mandatory SHA-256 and dimensions,
transport-only null projection leaves plus manifest bindings, and complete
hydration before the saved-project schema parser runs. Feature provenance stays
with its hydrated owner rather than being duplicated as manifest authority. See
[`PROJECT_PACKAGE_FORMAT_CONTRACT.md`](PROJECT_PACKAGE_FORMAT_CONTRACT.md).

## Compatibility And Migration

Target package support must:

- Continue loading existing `.json` and `.sbls.json` projects.
- Treat JSON/data-URL projects as a backward-compatible read/import path.
- Sniff content safely instead of trusting only the file extension.
- Hydrate a package projection before existing schema migration and
  normalization.
- Route Save from a legacy session through Save As to a new `.sbls` destination.
- Never overwrite JSON with ZIP bytes, silently change the legacy source path,
  or write new transitional JSON.
- Keep any future schema change under
  [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md). Issue #48 is closed; its current
  parser and `0.1.0` to `0.2.0` migration are implemented inputs to hydration.

## Historical ADR Scope Exclusions

This ADR did not implement `.sbls` package read/write, change the save/load UI,
remove embedded data-URL compatibility, or create an official third-party
artwork/logo catalog. Current implementation scope, sequencing, non-goals, and
future extensions now defer to the exact package contract and live issue state.
