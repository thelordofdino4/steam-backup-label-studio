# Project Package Format Decision
> Status: Conditional ADR.
> Purpose: Decision record for future .sbls package/container format.
> Read when: Project packaging or future container work.
> Authoritative source: PROJECT_FILE_SPEC.md for current JSON format.
> Last reviewed against commit: `408bd68f2a13998a54e14c72930628993c5cdcfb`.


Last refreshed: 2026-06-12.

Issue: #56.

## Decision

The current implemented project format remains plain JSON, normally saved as
`.sbls.json`, with embedded image data URLs for assets that must reload without
the original local files.

The future `.sbls` format should be a ZIP-compatible single-file package, not a
loose folder bundle and not a custom binary format. The package should contain a
small manifest, the saved project JSON, and asset files referenced from that
JSON by stable package asset IDs.

No `.sbls` package read/write behavior is implemented by this decision. The
current JSON format stays the compatibility baseline until package support is
explicitly implemented and validated.

## Rationale

- A single package file preserves the current user expectation that a project is
  portable and easy to move between machines.
- ZIP-compatible structure keeps the format inspectable and recoverable without
  inventing a custom container.
- Moving large artwork out of JSON can reduce oversized project files while
  preserving the current schema as `project.json`.
- Current `.sbls.json` files already work and should not be migrated until there
  is a concrete save/load limitation or release need.
- A folder bundle would be easier to corrupt by moving or deleting sibling asset
  files, which conflicts with the app's portability goal.

## Current Asset Strategy

For the current JSON format:

- Embed user-provided, Steam-imported, web, local Steam screenshot, and custom
  replacement images as data URLs when they are needed for reload.
- Store provenance/status metadata where supported, including source kind,
  source ID, source label, and source URL when safe/useful.
- Do not depend on original local file paths after save.
- Keep built-in generic assets routed through `src/assets/assetManifest.ts`
  instead of copying those built-ins into every project file.

## Future Package Layout

A future package should use this conceptual layout:

```text
project.sbls
  manifest.json
  project.json
  assets/
    asset-0001.png
    asset-0002.jpg
    asset-0003.webp
```

`manifest.json` should identify the package format version, project schema
version, creating app version when available, and the packaged asset index.

`project.json` should keep the same project model as the current saved-project
schema, with image data URL fields replaced or supplemented by package asset
references only after migration behavior exists.

Packaged asset records should include, at minimum:

- stable package asset ID
- relative path inside `assets/`
- MIME type
- byte length
- optional SHA-256 or equivalent integrity hash
- optional image dimensions
- current provenance/status metadata

## Compatibility And Migration

Future package support should:

- Continue loading existing `.sbls.json` projects.
- Treat JSON/data-URL projects as the canonical backward-compatible import path.
- Sniff content safely instead of trusting only the file extension.
- Add package loading before package saving if necessary, so recovery and
  backward compatibility can be validated early.
- Avoid rewriting an existing JSON project as `.sbls` unless the user explicitly
  saves or exports to the package format.
- Keep project schema migration work coordinated with #48.

## Non-Goals

- Implementing `.sbls` package read/write in the current batch.
- Changing the current save/load UI.
- Removing embedded data URL support.
- Bundling official third-party game artwork or trademarked logo packs.
- Making package support a blocker for the disc-label alpha path.
