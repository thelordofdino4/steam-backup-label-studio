# `.sbls` Project Package Format Contract

> Status: Draft target-state normative contract.
> Purpose: Define the implementation-ready version 1 `.sbls` package, its portability and security invariants, and its integration with the existing project schema and application lifecycle.
> Read when: Implementing or reviewing project package encoding, decoding, asset collection, binary persistence, legacy conversion, Open, Save, or Save As.
> Authoritative source: This contract for target package/container behavior; [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) for hydrated saved-project fields and migrations; [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) for session, command, path, baseline, revision, dirty, and commit semantics.
> Current implementation: Plain JSON project files remain the only implemented project representation. No `.sbls` package codec, package reader, package writer, or binary project IPC exists at the evidence baseline.
> Evidence baseline: `a104825583a1cc03e145a9e460e9abccf4483bf7` on 2026-07-27.

## 1. Status, purpose, authority, and document relationships

**TARGET REQUIREMENT.** This document is the normative target contract for the
version 1 `.sbls` container. It specifies the package identity, archive layout,
manifest, asset projection and hydration, resource budgets, compatibility,
failure taxonomy, and package-specific persistence boundary. It does not make
the target format implemented.

| Claim | Authority | Boundary |
| --- | --- | --- |
| TARGET REQUIREMENT | This contract | Package bytes, ZIP profile, manifest, bindings, asset inclusion, package recognition, package validation, and package failure codes. |
| CURRENT FACT | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md), the SDD, and current source | Implemented plain-JSON representation and the fields accepted by the current application. |
| TARGET REQUIREMENT | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) | Hydrated `SavedProject` schema, schema versions, normalization, and migrations. This package contract must not become a second editor schema. |
| TARGET REQUIREMENT | [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) | Session identity, current path, persistence-format identity, canonical baseline, revision, derived dirty state, busy scopes, replacement authorization, and atomic application commit. |
| CURRENT FACT / TARGET REQUIREMENT | Native persistence owner, [issue #312](https://github.com/thelordofdino4/steam-backup-label-studio/issues/312), and [`project_file.rs`](../src-tauri/src/project_file.rs) | Atomic filesystem commit mechanics and platform guarantees; the package contract constrains the required binary project boundary but does not move package semantics into filesystem code. |
| TARGET REQUIREMENT | [`APPLICATION_MENU_BAR_CONTRACT.md`](APPLICATION_MENU_BAR_CONTRACT.md) | Native File-menu presentation and invocation adapters; menu items consume lifecycle commands and never own package decisions. |
| CURRENT FACT / TARGET REQUIREMENT | [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md) | As-built architecture and continuing preview/edit/export/save/load parity boundaries. |
| CURRENT FACT | [`PROJECT_PACKAGE_FORMAT_DECISION.md`](PROJECT_PACKAGE_FORMAT_DECISION.md) | Historical rationale that selected a ZIP-compatible single-file package. This contract supersedes its conceptual paths, optional integrity metadata, and unresolved target details. |
| TARGET REQUIREMENT | [`AGENTS.md`](../AGENTS.md) | Agent safety, preservation, and validation rules remain controlling. |

**TARGET REQUIREMENT.** If these documents appear to conflict, package transport
defers to this contract, hydrated persisted content defers to the project-file
specification, lifecycle effects defer to the lifecycle contract, atomic
filesystem mechanics defer to the native persistence owner under both
contracts, menu presentation defers to the menu contract, current behavior
defers to source, and agent behavior defers to `AGENTS.md`.

**TARGET REQUIREMENT.** Scope includes Disc and Case projects, enabled content,
disabled remembered content, legacy JSON import, package Save/Save As, and the
native binary persistence boundary. It excludes editor feature redesign,
project-schema changes, package implementation, and removal of legacy reads.

## 2. Terminology and claim classifications

| Claim | Meaning in this contract |
| --- | --- |
| CURRENT FACT | Verified behavior or repository state at the evidence baseline. |
| TARGET REQUIREMENT | Mandatory behavior for a conforming implementation. |
| FUTURE EXTENSION | Deliberately excluded from version 1 and unimplemented. |
| OPEN QUESTION | A narrow implementation choice that may vary without changing product semantics or safety invariants. |

| Term | Claim | Exact meaning |
| --- | --- | --- |
| package | TARGET REQUIREMENT | One ZIP-compatible file whose filename normally ends in `.sbls` and whose contents conform to this contract. |
| package version | TARGET REQUIREMENT | The integer version of this container protocol. It is independent of project schema and application version. |
| projection | TARGET REQUIREMENT | A copy of one canonical `SavedProject` snapshot in which every externalized asset-bearing leaf is exactly `null`. It is stored as `project.json` and is not editor state. |
| binding | TARGET REQUIREMENT | A manifest record that maps one approved RFC 6901 JSON Pointer in the projection to one content-addressed package asset. |
| hydration | TARGET REQUIREMENT | Validated reconstruction of canonical data URLs into a projection before the existing schema parser, migrator, normalizer, router, or editor restore path runs. |
| package asset | TARGET REQUIREMENT | Validated raster bytes stored once under `assets/sha256/` and referenced by one or more bindings. |
| project-owned asset | TARGET REQUIREMENT | Accepted, persistent image bytes required to reproduce persisted enabled or remembered owner state without the original file, cache, URL, account, or network. |
| built-in asset | TARGET REQUIREMENT | Application-supplied bytes that may be omitted only through a stable, versioned compatibility identity guaranteed for the supported schema. |
| legacy JSON | CURRENT FACT | A UTF-8 plain-JSON project, normally named `.json` or `.sbls.json`, parsed through the current schema and migration path. |
| canonical baseline | TARGET REQUIREMENT | The normalized hydrated `SavedProject` used by the lifecycle owner for dirty comparison; never the ZIP bytes, manifest, projection, compression, or package buffers. |

**TARGET REQUIREMENT.** “Open,” “Save,” “package,” and “asset” below use these
definitions. File extension, provenance ID, source URL, record ID, Steam artwork
ID, and package asset ID are distinct concepts.

## 3. Evidence-backed current-state baseline

| Claim | Current behavior at the evidence baseline | Evidence |
| --- | --- | --- |
| CURRENT FACT | Frontend package metadata, Tauri configuration, and Rust crate metadata report application version `0.1.0`; this value is diagnostic and independent of package/project schema versions. | [`package.json`](../package.json), [`tauri.conf.json`](../src-tauri/tauri.conf.json), [`Cargo.toml`](../src-tauri/Cargo.toml) |
| CURRENT FACT | Projects use schema `0.2.0`; schema `0.1.0` has an explicit migration to `0.2.0`. | [`projectSchema.ts`](../src/project/projectSchema.ts) |
| CURRENT FACT | Save and Open expose JSON filters and current Save As defaults use `.sbls.json`; Open reads text and parses JSON. | [`appProjectSave.ts`](../src/app/appProjectSave.ts), [`appProjectLoad.ts`](../src/app/appProjectLoad.ts), [`fileSystem.ts`](../src/tauri/fileSystem.ts) |
| CURRENT FACT | Two-phase Open stages file selection, read, parse, migrate, normalize, route, and restore before the lifecycle compare-and-swap/apply step. | [`appProjectLoad.ts`](../src/app/appProjectLoad.ts), [`applicationLifecycleStateStore.ts`](../src/lifecycle/applicationLifecycleStateStore.ts) |
| CURRENT FACT | The native `write_project_file` command accepts a UTF-8 `String`; `read_project_file` uses text decoding. The current boundary cannot carry arbitrary ZIP bytes. | [`files.rs`](../src-tauri/src/commands/files.rs) |
| CURRENT FACT | The internal Rust `project_file::write` accepts arbitrary byte slices and atomically commits them through an adjacent exclusive temporary file. The current legacy Save path already reaches this atomic writer through the text command. | [`project_file.rs`](../src-tauri/src/project_file.rs), [`files.rs`](../src-tauri/src/commands/files.rs), [`appProjectSave.ts`](../src/app/appProjectSave.ts) |
| CURRENT FACT | `write_binary_file` is a separate direct `std::fs::write` adapter used for PNG output. It is not the atomic project writer, and no native binary project reader exists. | [`files.rs`](../src-tauri/src/commands/files.rs), [`appPngExport.ts`](../src/app/appPngExport.ts) |
| CURRENT FACT | Saved visual payload fields are nullable strings, normally data URLs; no current field carries a package asset ID, package path, byte length, digest, or independently validated MIME. | [`projectTypes.ts`](../src/project/projectTypes.ts), [`savedProjectNormalization.ts`](../src/project/savedProjectNormalization.ts) |
| CURRENT FACT | Current local image import recognizes JPEG, PNG, WebP, GIF, and BMP. Browser and remote import paths primarily trust `image/*` declarations and browser decoding; there is no package-grade signature/MIME validator. | [`local_images.rs`](../src-tauri/src/commands/local_images.rs), [`importedImageAsset.ts`](../src/utils/importedImageAsset.ts), [`steam.rs`](../src-tauri/src/commands/steam.rs) |
| CURRENT FACT | No direct application dependency currently owns ZIP encoding/decoding, SHA-256 package identity, archive-path validation, or package resource budgets. | [`package.json`](../package.json), [`Cargo.toml`](../src-tauri/Cargo.toml) |
| CURRENT FACT | Application session state has no persistence-format discriminator. Open exists through the command dispatcher, while target Save/Save As and dirty-aware replacement work under issue #308 remain incomplete. | [`projectSession.ts`](../src/lifecycle/projectSession.ts), [`applicationCommandRegistry.ts`](../src/lifecycle/applicationCommandRegistry.ts) |

### Current-versus-target behavior matrix

| Concern | Claim | Current | Target |
| --- | --- | --- | --- |
| container | CURRENT FACT / TARGET REQUIREMENT | Plain UTF-8 JSON | Strict ZIP-compatible `.sbls` v1 |
| asset storage | CURRENT FACT / TARGET REQUIREMENT | Data URLs in JSON; selected built-ins app-routed | Content-addressed package bytes plus reversible bindings; qualified built-ins remain app-routed |
| recognition | CURRENT FACT / TARGET REQUIREMENT | File dialog plus text/JSON parse | Bounded raw bytes, content sniffing, then package or legacy decoder |
| native read | CURRENT FACT / TARGET REQUIREMENT | UTF-8 string | Bounded binary project read |
| native write | CURRENT FACT / TARGET REQUIREMENT | Atomic bytes reached through a string command | Atomic binary project command reusing the existing byte writer |
| lifecycle format | CURRENT FACT / TARGET REQUIREMENT | Not represented | Session-only `legacy-json` or `sbls-package-v1` identity |
| new saves | CURRENT FACT / TARGET REQUIREMENT | `.sbls.json` | `.sbls` only |
| compatibility | CURRENT FACT / TARGET REQUIREMENT | JSON `0.1.0` and `0.2.0` read support | Preserve those reads; hydrate supported packages before schema migration |

**CURRENT FACT.** Static audit also found two pre-existing fidelity risks that a
container cannot silently repair: deselected primary Platform/Technical custom
assets may be dropped by current restore normalization, and some Case mark
visibility consults shared state not fully represented by the saved Case
aggregate. A package implementation must resolve or explicitly gate those
owner-level parity cases before claiming full hidden-state round-trip coverage;
this contract does not add fields or change their owners.

## 4. Product decision and v1 invariants

**TARGET REQUIREMENT.** Version 1 is a portable single-file package. A conforming
package contains every non-reconstructible project-owned byte and opens without
the original upload, Steam cache, screenshot path, remote URL, user account, or
network.

**TARGET REQUIREMENT.** All of the following invariants are mandatory:

1. New Save and Save As operations write package bytes under an eligible `.sbls` path; they never write new transitional JSON.
2. Existing safety-eligible `.json` and `.sbls.json` projects remain readable alpha imports subject to section 10's bounded legacy gate; unsafe or over-budget inputs are rejected without mutation.
3. The package is not renamed JSON, a loose folder, an opaque custom binary, a file with sibling assets, or a ZIP that redundantly retains authoritative data URLs.
4. `SavedProject` remains the only persisted editor model. The manifest and projection are transport forms, not competing schema or domain owners.
5. One immutable normalized snapshot supplies the projection, bindings, package assets, write bytes, and post-commit baseline.
6. SHA-256 is computed over exact uncompressed asset bytes. Identical bytes have one ID and one archive path, even across different owners.
7. Enabled, disabled, hidden, fallback, and remembered accepted assets are collected from saved owner state rather than current rendering visibility.
8. A package never needs a source filename, absolute path, URL, credential, cache, or network fetch to restore accepted visual state.
9. Package parsing, hashing, image validation, hydration, schema migration, and candidate construction finish before lifecycle mutation begins.
10. Successful encoding is not successful Save. Save succeeds only after the native atomic commit, and only then may lifecycle path, format, and baseline change.
11. Package presentation state, buffers, bindings, archive order, current path, session ID, clean baseline, revision, dirty state, busy state, feedback, focus, dialog state, and menu state are never project content.
12. Unsupported or unsafe content is rejected with a stable typed result; required content is never silently dropped, flattened, fetched, or substituted.

**TARGET REQUIREMENT.** Version 1 guarantees structural self-consistency,
accidental-corruption detection, offline portability of accepted project-owned
bytes, supported-schema readability or migration, and the same preview/export
inputs as the accepted hydrated project. CRC-32 and in-package SHA-256 values do
not provide authenticity, trust, signatures, or tamper resistance because a
writer can recompute them. V1 also does not promise universal pixel identity
across application, browser, font, graphics, or operating-system versions.

## 5. Package identity and exact archive layout

**TARGET REQUIREMENT.** The exact manifest identity is
`sbls/project-package`, and the exact container version is integer `1`.

```text
<user-selected-name>.sbls
├── manifest.json
├── project.json
└── assets/
    └── sha256/
        └── <64-lowercase-hex-digest><canonical-extension>
```

**TARGET REQUIREMENT.** Directory nodes in the diagram are conceptual. Writers
emit no explicit directory entries. A zero-asset package contains exactly
`manifest.json` and `project.json`.

| Rule | Claim | Exact v1 behavior |
| --- | --- | --- |
| required roots | TARGET REQUIREMENT | Exactly one `manifest.json` and exactly one `project.json`, with this ASCII casing. |
| asset entries | TARGET REQUIREMENT | Zero or more regular files whose paths exactly match `assets/sha256/<digest><canonical-extension>`, where the canonical extension includes its leading dot, and whose manifest records match. |
| extra entries | TARGET REQUIREMENT | Rejected. Every archive entry is one of the two roots or one referenced asset; every asset entry is referenced by at least one binding. |
| path syntax | TARGET REQUIREMENT | ASCII, forward slashes, no leading slash, no trailing slash, and no empty, `.`, or `..` segment. Backslashes, drive prefixes, UNC-like names, NUL, and controls are rejected. |
| entry types | TARGET REQUIREMENT | Regular files only. Directory, symlink, hardlink, device, FIFO, socket, or other special entries are rejected. |
| archive profile | TARGET REQUIREMENT | Single-disk ZIP only; no encryption, comments, prepended bytes, data descriptors, or self-extracting prefix. No record or data may occur between the declared central directory and the sole EOCD, and no byte may follow that EOCD. |
| compression | TARGET REQUIREMENT | Writer uses Store method 0 for every entry. Reader accepts only Store 0 or Deflate 8 for permitted entries; all Deflate inputs remain subject to expansion budgets. |
| ZIP64 | TARGET REQUIREMENT | Prohibited. V1 byte/count budgets fit classic ZIP; ZIP64 markers or fields are rejected. |
| flags and versions | TARGET REQUIREMENT | Writer general-purpose flags are `0` and central-directory version-made-by is exactly `0x0014` (MS-DOS/FAT host `0`, ZIP 2.0). Reader permits only flags `0` or UTF-8-name bit `0x0800`, requires version-made-by `0x0014`, and requires local and central flags and version-needed fields to agree. Store requires version-needed `10` (1.0), Deflate requires `20` (2.0), and no record may advertise ZIP64. |
| extra fields | TARGET REQUIREMENT | Writer emits none and reader rejects archive/entry extra fields, including host-time and ZIP64 extensions. |
| metadata | TARGET REQUIREMENT | Writer and reader require empty archive/file comments, no source filenames, internal attributes `0`, external attributes `0`, disk-start `0`, DOS time `0x0000`, and DOS date `0x0021` (`1980-01-01 00:00:00`) for every entry. These exact values, together with the fixed MS-DOS/FAT host, classify entries as ordinary files without preserving host permissions or timestamps. |
| record agreement | TARGET REQUIREMENT | For every entry, local and central name, flags, version-needed, method, DOS time/date, CRC-32, compressed size, and uncompressed size agree. Checked spans do not overlap and have no unexplained gap. |
| end records | TARGET REQUIREMENT | Exactly one EOCD ends at EOF; its disk fields are zero. Central-directory archive-extra records, digital signatures, and any record outside the declared v1 sequence are rejected. |
| ordering | TARGET REQUIREMENT | Local records and central-directory records are ordered `manifest.json`, `project.json`, then asset paths in ascending Unicode code-point order. |
| duplicate policy | TARGET REQUIREMENT | Duplicate raw names, duplicate normalized names, duplicate required roots, duplicate asset paths, and case-only collisions are rejected. |
| JSON emission | TARGET REQUIREMENT | UTF-8 without BOM, compact RFC 8785 JSON Canonicalization Scheme form, and no trailing newline. |
| JSON reading | TARGET REQUIREMENT | Strict UTF-8 without BOM, no duplicate object keys, and bounded JSON. Insignificant whitespace is accepted; canonical input formatting is not required. |
| CRC and digest | TARGET REQUIREMENT | ZIP CRC-32 must validate. Manifest SHA-256 and byte lengths remain mandatory independent self-consistency and accidental-corruption checks over exact uncompressed bytes; they are not authenticity controls. |
| reproducibility | TARGET REQUIREMENT | Paths, JSON bytes, digests, ordering, and metadata are deterministic. Byte-identical ZIP output is not a cross-library or cross-application-version compatibility promise. |

**TARGET REQUIREMENT.** A `.sbls` extension is presentation metadata, not proof
of this identity. An arbitrary ZIP, even one containing similarly named files,
is not a project package unless every v1 rule validates.

## 6. Exact manifest v1 schema with complete JSON example

**TARGET REQUIREMENT.** `manifest.json` is one JSON object with exactly the seven
top-level fields shown below. Unknown fields are rejected at every object level.
All JSON integers are non-negative base-10 values represented as JSON numbers,
without fractions or exponent notation.

```json
{
  "assets": [
    {
      "byteLength": 245760,
      "height": 1200,
      "id": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "mimeType": "image/png",
      "path": "assets/sha256/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png",
      "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "width": 1200
    }
  ],
  "bindings": [
    {
      "assetId": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "pointer": "/background/imageDataUrl"
    }
  ],
  "createdBy": {
    "application": "steam-backup-label-studio",
    "version": "0.1.0"
  },
  "format": "sbls/project-package",
  "packageVersion": 1,
  "project": {
    "byteLength": 982,
    "path": "project.json",
    "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  },
  "projectSchemaVersion": "0.2.0"
}
```

**TARGET REQUIREMENT.** The example is a complete logical manifest with one
asset; its illustrative lengths and digests do not describe a repository
fixture. The emitted representation uses the compact canonical policy in
section 5.

**TARGET REQUIREMENT.** After bounded ZIP structural checks have located exactly
one safe `manifest.json` entry, manifest decision precedence is fixed: perform
only its bounded duplicate-key-rejecting JSON parse; a parsed object whose
`format` is not exactly `sbls/project-package` is
`project.format.unsupported`; a recognized identity whose `packageVersion` is
not integer `1` is `project.package.version-unsupported`; only then apply the
complete closed v1 field schema. A ZIP candidate with no exact
`manifest.json` is `project.format.unsupported` at the safe entry-inventory
stage. Duplicate manifests and other structural violations remain archive/path
failures. This prevents a future-version field from being misreported as a v1
unknown-field failure.

### Manifest field registry

| Field | Required | Type and bound | Exact validation / authority |
| --- | --- | --- | --- |
| `/format` | yes | string | Must equal `sbls/project-package`. |
| `/packageVersion` | yes | integer | Must equal `1`. |
| `/projectSchemaVersion` | yes | string matching `[0-9A-Za-z][0-9A-Za-z._+-]{0,31}` | Must equal projection-level `/schemaVersion` before hydration and the hydrated top-level version afterward. Support is checked separately before binding/hydration; an unsupported value is `project.schema.unsupported`, not `project.package.manifest-invalid`. |
| `/createdBy` | yes | object | Exactly `application` and `version`; diagnostic only. |
| `/createdBy/application` | yes | string | Must equal `steam-backup-label-studio` for packages written by this application; readers accept 1-64 printable ASCII characters from other writers. |
| `/createdBy/version` | yes | string | 1-128 printable ASCII characters; never used to choose schema or package compatibility. |
| `/project` | yes | object | Exactly `path`, `byteLength`, and `sha256`. |
| `/project/path` | yes | string | Must equal `project.json`. |
| `/project/byteLength` | yes | integer, 2 to 16,777,216 | Exact uncompressed byte length. |
| `/project/sha256` | yes | string | Exactly 64 lowercase hexadecimal characters over exact `project.json` bytes. |
| `/assets` | yes | array, 0-512 records | Sorted by `path`; record IDs and paths are unique. |
| `/bindings` | yes | array, 0-4,096 records | Sorted first by `pointer`, then `assetId`; pointers are unique. |

### Asset-record registry

| Field | Required | Type and bound | Exact validation / authority |
| --- | --- | --- | --- |
| `id` | yes | string | Exactly `sha256:<digest>`, where `<digest>` is the record's lowercase `sha256`. |
| `path` | yes | string | Exactly `assets/sha256/<sha256><canonical-extension>`, where the section 9 extension includes its leading dot. |
| `mimeType` | yes | string enum | One of the five canonical MIME values in section 9. |
| `byteLength` | yes | integer, 1 to 67,108,864 | Exact uncompressed asset byte length. Empty image assets are invalid. |
| `sha256` | yes | string | Exactly 64 lowercase hexadecimal characters over exact uncompressed asset bytes. |
| `width` | yes | integer, 1 to 16,384 | Validated encoded canvas width; integrity metadata, not an editor-layout override. |
| `height` | yes | integer, 1 to 16,384 | Validated encoded canvas height; integrity metadata, not an editor-layout override. |

**TARGET REQUIREMENT.** Asset records contain no provenance. Provenance remains
with its hydrated project owner. Two records with the same digest are invalid,
even if the duplicated metadata is identical; two records with the same ID but
different metadata are also invalid.

### Binding-record registry

| Field | Required | Type and bound | Exact validation / authority |
| --- | --- | --- | --- |
| `pointer` | yes | RFC 6901 string, 1-1,024 UTF-8 bytes | Must be one exact concrete path admitted by section 7, resolve to an existing leaf in the projection, and find the value exactly `null`. |
| `assetId` | yes | string | Must resolve to exactly one manifest asset record. |

**TARGET REQUIREMENT.** A pointer may occur once only. One asset may be bound to
many pointers. Every asset must have at least one binding. Manifest metadata is
authoritative for package self-consistency; hydrated project fields remain
authoritative for feature provenance, layout, visibility, and editor meaning.

## 7. Project projection, asset bindings, and hydration

### Encoding projection

**TARGET REQUIREMENT.** Encoding performs this exact mutation-free sequence:

1. Capture one immutable normalized persistable Save snapshot under lifecycle revision authorization.
2. Traverse every concrete location admitted by the explicit typed registry below, including present `null` leaves, in deterministic owner and array order.
3. Require that location's schema/feature owner to classify it as exactly one of: no accepted asset, qualified built-in identity, or project-owned byte payload. A `null` value is not by itself evidence of absence because some current built-ins deliberately persist `null` plus a semantic discriminator. A missing owner classification is a contract/test failure.
4. For every project-owned payload, decode the owned data URL; for every qualified built-in, apply section 8's omission/capture policy. Complete all classification and capture before any write.
5. Validate MIME, signature, structure, dimensions, animation budgets, and bytes; compute SHA-256; after a digest match compare length and exact bytes before deduplicating. Different bytes with one digest fail `project.package.asset-hash-collision`.
6. Deep-copy the snapshot into a projection and replace every externalized leaf with JSON `null`.
7. Add one concrete pointer-to-asset binding for each replaced leaf.
8. Canonically serialize `project.json`; digest its exact bytes; build and validate the manifest.
9. Encode the complete archive in memory or another bounded owned staging representation. Do not invoke the native writer until the full write plan is valid.

**TARGET REQUIREMENT.** Asset capture uses the canonical normalized snapshot, not
piecemeal live React state. It must not change the source snapshot, editor,
history, current path, session format, revision, or baseline.

### Approved asset-bearing pointer registry

**TARGET REQUIREMENT.** `{i}` denotes a concrete zero-based decimal array index
without leading zeros. `{platform}` is exactly `pc`, `windows`, `linux`,
`steamDeck`, or `macos`. `{technical}` is exactly `audio`, `surround`, `codec`,
`middleware`, or `technology`. `{surface}` expands to exactly one of
`templates/cover`, `templates/tray`, `spine/left`, or `spine/right` under
`/caseInsert/`.

| Project kind | Owner | Approved pointer pattern |
| --- | --- | --- |
| Disc | Background | `/background/imageDataUrl` |
| Disc | Steam banner custom lockup | `/steamBackupLogo/lockupImageDataUrl` |
| Disc | Primary developer/publisher logos | `/logoAssets/developerLogoDataUrl`; `/logoAssets/publisherLogoDataUrl` |
| Disc | Additional developer/publisher logos | `/logoAssets/additionalDeveloperLogos/{i}/imageDataUrl`; `/logoAssets/additionalPublisherLogos/{i}/imageDataUrl` |
| Disc | Active and remembered title artwork | `/titleArtwork/imageDataUrl`; `/titleArtwork/defaultSteamLogo/imageDataUrl` |
| Disc | Additional artwork | `/additionalArtwork/elements/{i}/imageDataUrl` |
| Disc | Rating and media custom assets | `/ratingBadge/customImageDataUrl`; `/mediaMark/customImageDataUrl` |
| Disc | Platform custom assets | `/platformMarks/assets/{platform}/customImageDataUrl` |
| Disc | Technical custom assets | `/technicalMarks/assets/{technical}/customImageDataUrl`; `/technicalMarks/additionalAssets/{technical}/{i}/customImageDataUrl` |
| Case | Surface banner | `/caseInsert/{surface}/steamBanner/lockupImageDataUrl` |
| Case | Surface background and title | `/caseInsert/{surface}/background/imageDataUrl`; `/caseInsert/{surface}/titleArtwork/imageDataUrl`; `/caseInsert/{surface}/titleArtwork/defaultSteamLogo/imageDataUrl` |
| Case | Surface artwork slots | `/caseInsert/{surface}/artworkSlots/{i}/imageDataUrl` |
| Case | Surface logo slots | `/caseInsert/{surface}/logoSlots/{i}/imageDataUrl` |
| Case | Surface mark slots | `/caseInsert/{surface}/markSlots/{i}/imageDataUrl` |

**TARGET REQUIREMENT.** This registry is closed. A new saved asset-bearing field
requires an intentional registry update and traversal/round-trip/security tests;
generic recursion over names such as `imageDataUrl` is prohibited. Logical
record IDs, Steam artwork IDs, provenance source IDs, map keys, and array indices
must not be repurposed as package asset identities.

**TARGET REQUIREMENT.** Every concrete registered location is owner-classified
even when its current value is `null` or the optional leaf is absent. Only an
owner rule for the declared schema may classify that location as having no
accepted asset. A semantic built-in selector plus `null` leaf must enter the
built-in compatibility policy; it must never disappear through a generic
"null means absent" shortcut.

**TARGET REQUIREMENT.** Package v1 applies this same registry to declared schema
`0.1.0` and `0.2.0` because the registered `0.1.0` to `0.2.0` migration changes
only `schemaVersion` and introduces no alternate asset-bearing path. V1 writers
emit only the current schema. Supporting any other schema requires an explicit
schema-specific pointer/built-in registry before that package can be accepted.

### Hydration

**TARGET REQUIREMENT.** Package load performs the inverse only after the archive,
manifest, project digest, assets, and bindings validate:

1. Parse `project.json` as a bounded JSON object and verify its top-level schema version agrees with the manifest.
2. Clone the projection into an isolated candidate.
3. Resolve each binding only through the closed pointer registry and RFC 6901 own-property traversal; require canonical `~0`/`~1` escaping and array indices, reject `__proto__`, `prototype`, and `constructor` segments, never create a container, and require that the concrete leaf exists and is exactly `null`.
4. Reconstruct `data:<canonical-mime>;base64,<canonical-padded-RFC4648-base64>` from the already validated exact asset bytes and assign it to that leaf.
5. Resolve every qualified built-in through the frozen compatibility registry to the exact canonical internal value expected by that supported schema/owner, including an owner-approved application URL only when that is the schema's canonical value, or retain `null` only where `null` is canonical. Then verify every manifest asset was consumed, every bound leaf is a canonical hydrated data URL, and every unbound registered built-in leaf is the registry's exact value or a valid canonical null/absent value.
6. Reject `sbls://`, `asset://`, filesystem paths, blob URLs, unresolved package references, and any placeholder token before calling the schema layer.
7. Pass the complete hydrated object to the existing parse, migrate, normalize, project-kind route, and restore-candidate path.
8. Use the accepted normalized hydrated `SavedProject` as the only content identity and clean baseline.

**TARGET REQUIREMENT.** Hydration never overwrites feature provenance, size,
layout, enablement, selection, or fallback metadata with manifest values.
Manifest width and height verify the bytes; the hydrated project owner's image
size remains subject to existing schema/normalization rules.

**TARGET REQUIREMENT.** The decoder rejects missing leaves, non-null projection
values at bound leaves, duplicate or conflicting pointers, out-of-registry
pointers, missing or unreferenced assets, digest mismatches, and any state in
which the schema parser could observe an unresolved package reference.

## 8. Asset inclusion/exclusion and ownership rules

**TARGET REQUIREMENT.** A byte sequence becomes project-owned when the user has
accepted it into a persisted visual owner and exact reopen depends on those
bytes. Acceptance, not current visibility or provenance label, controls
inclusion.

| Asset/state class | Claim | V1 rule |
| --- | --- | --- |
| uploaded and local images | TARGET REQUIREMENT | Include accepted data bytes; never re-read the original path. |
| accepted Steam store/library art and Steam screenshots | TARGET REQUIREMENT | Include the downloaded accepted bytes. Candidate URL inventories remain metadata, not package files. |
| accepted local Steam screenshots | TARGET REQUIREMENT | Include accepted bytes; omit cache paths and account identity. |
| accepted web/official-site images | TARGET REQUIREMENT | Include accepted bytes. A sanitized existing provenance URL may remain in project JSON but is never a load dependency. |
| custom banners, backgrounds, title art, additional art, logos, rating/media/platform/technical marks | TARGET REQUIREMENT | Include each non-null accepted payload, including hidden or disabled remembered state. |
| Case cover/tray/left-spine/right-spine owners | TARGET REQUIREMENT | Traverse every surface and include backgrounds, title/current default art, artwork/logo/mark slots, and custom banner bytes. |
| remembered alternatives and fallbacks | TARGET REQUIREMENT | Include accepted bytes even when another source currently renders; hash-deduplicate identical payloads. |
| disabled collections and deselected maps | TARGET REQUIREMENT | Include bytes retained in the normalized saved aggregate, whether or not preview/export currently selects them. |
| built-in assets | TARGET REQUIREMENT | Omit only when `{projectSchemaVersion, owner pointer pattern, persisted semantic discriminator}` resolves through an application compatibility registry that guarantees equivalent bytes for as long as that schema is supported. |
| built-in with no guaranteed identity | TARGET REQUIREMENT | Capture only if the current saved owner can truthfully accept a bound data URL without changing its semantic state; otherwise fail before write. Never silently omit or invent a binding. |
| selected-game artwork catalog | TARGET REQUIREMENT | Keep only owner-validated sanitized metadata in `project.json`; do not download or package unaccepted candidate URLs. Restored URL descriptors are network-inert and cannot be assigned to an image/source-fetching adapter until a later explicit user selection invokes the owning import workflow. |
| runtime preview/export caches, thumbnails, DOM/canvas output, generated text bitmaps | TARGET REQUIREMENT | Exclude. They are derived adapters, not project content. |
| unaccepted search/screenshot/web results | TARGET REQUIREMENT | Exclude. Search generations, candidates, plans, and caches remain ephemeral. |
| system fonts | TARGET REQUIREMENT | Exclude. Merely rendering a system font does not make it a project asset. |
| provenance paths, headers, tokens, cookies, Steam identity, machine data | TARGET REQUIREMENT | Exclude and reject if introduced as package metadata. |

**CURRENT FACT.** The current Disc built-in banner is deliberately saved without
its bytes, generic primary logo fallbacks and rating/media/platform/technical
art are app-routed, the Disc number badge is a semantic built-in selector, and
the rocky artwork frame uses a bundled texture. These cases may be omitted only
through the target compatibility-registry guarantee, not simply because current
source happens to contain a similarly named asset.

### Built-in compatibility registry

**TARGET REQUIREMENT.** This document authorizes zero concrete built-in omission
mappings by itself. Before any v1 Save may omit application-owned bytes, a
checked-in, versioned normative compatibility registry must publish each exact
tuple below together with its exact SHA-256 digest and reconstructible bytes,
and focused tests must prove the tuple resolves to those bytes for every
supported schema. No current filename, URL, source label, or incidental asset
availability is grandfathered into that registry. Until a required mapping
exists, the encoder must package the bytes when doing so preserves the hydrated
owner semantics; otherwise it fails
`project.package.built-in-capture-required`.
Third-party conforming readers must consume equivalent published registry data;
an implementation-private lookup is not a portability contract.

**TARGET REQUIREMENT.** A built-in compatibility key is the canonical tuple
`[projectSchemaVersion, projectKind, approvedOwnerPointerPattern,
persistedSemanticDiscriminator]`. The final element is an owner-specific
canonical object containing every persisted value that selects the bytes, such
as source/source ID, rating system/value, mark family/value/theme, badge set, or
frame style. The registry freezes that exact tuple to one SHA-256 digest and
equivalent application-owned bytes for the lifetime of schema support. A schema
version alone, a source label, or a current asset filename is not sufficient.

| Built-in owner family | Claim | Required discriminator input |
| --- | --- | --- |
| Disc/Case Steam banner | TARGET REQUIREMENT | Exact owner pointer plus persisted built-in source and source ID/fallback mode that selects the lockup. |
| primary Developer/Publisher fallback and Case built-in slots | TARGET REQUIREMENT | Exact owner/slot pointer plus persisted source/source ID and any owner role/value needed to select bytes. |
| rating, media, platform, and technical marks | TARGET REQUIREMENT | Exact owner pointer plus persisted system/family, value, theme, source, and source ID that participate in render selection. |
| Disc number badge | TARGET REQUIREMENT | Disc project, semantic owner, and persisted `badgeSet`; it has no asset binding because the schema already stores only the selector. |
| rocky artwork frame | TARGET REQUIREMENT | Disc project, frame owner, and persisted frame style; it has no asset binding while the versioned renderer contract supplies equivalent texture behavior. |

**TARGET REQUIREMENT.** During projection, a qualified app-owned asset leaf is
set to `null` without a binding while its semantic discriminator remains in
`project.json`; an app asset URL is never emitted into the package projection.
During hydration, the registered feature resolver must reconstruct the exact
canonical value expected by the supported schema/owner before the normalized
baseline is accepted, or preserve `null` only where `null` is itself that
owner's canonical built-in representation. A missing/mismatched registry entry
fails with `project.package.built-in-unavailable`. It never falls back to a
similar current asset.

**TARGET REQUIREMENT.** A non-null asset leaf that is neither a valid supported
data URL nor a qualified built-in identity is a nonportable required asset.
Save fails with `project.package.asset-capture-failed` before archive encoding;
it does not fetch a URL, dereference a path/blob, discard the value, or write an
incomplete package.

**TARGET REQUIREMENT.** Legacy and package Open must normalize through the
existing feature owners before a later Save traversal. Legacy aliases are not
added to the binding registry; package v1 is written only from the current
canonical schema.

**FUTURE EXTENSION.** Custom fonts require a separate asset class, licensing
policy, schema representation, MIME validation, and renderer support. Future
external WebGL material textures are package assets only after their material
contract exists; procedural parameters belong in hydrated schema, while
shaders, caches, and generated bitmaps do not automatically become assets.

## 9. MIME/image validation and archive security budgets

### Raster allowlist

**TARGET REQUIREMENT.** V1 preserves exact validated raster bytes without
transcoding. Declared data-URL MIME, sniffed signature, full structural decode,
manifest MIME, canonical extension, byte length, digest, and dimensions must
agree.

| Canonical MIME | Canonical extension | Required signature/decoder class | Animation rule |
| --- | --- | --- | --- |
| `image/png` | `.png` | PNG signature and complete PNG structural decode | APNG frames count toward frame/pixel budgets. |
| `image/jpeg` | `.jpg` | JPEG SOI plus complete JPEG structural decode | Static only by format. |
| `image/webp` | `.webp` | RIFF/WEBP signature and complete WebP decode | Animated WebP is allowed only within all frame/pixel budgets. |
| `image/gif` | `.gif` | GIF87a/GIF89a signature and complete GIF decode | Animation is allowed only within all frame/pixel budgets. |
| `image/bmp` | `.bmp` | BMP signature and complete BMP decode | Static only by format. |

**TARGET REQUIREMENT.** `image/jpg` normalizes to `image/jpeg`; no other MIME
alias is emitted. The validator rejects MIME/signature polyglots, structurally
invalid images, unsupported trailing payloads, HTML, XML active content, script,
and packaged SVG. Current generic upload acceptance is not evidence of a
deliberate safe SVG package policy.

**TARGET REQUIREMENT.** Manifest `width` and `height` are the encoded raster or
animation logical-canvas dimensions before EXIF/display-orientation transforms.
For animation limits, decoded pixels equal
`canvasWidth × canvasHeight × frameCount`, not the sum of changed frame
rectangles. Checked arithmetic must reject overflow. These dimensions verify
bytes only and never replace owner `imageSize`, content bounds, layout, or
orientation semantics in the hydrated project.

**TARGET REQUIREMENT.** Before projection, canonical persistable-snapshot
normalization rewrites every valid externalizable leaf to exactly
`data:<canonical-mime>;base64,<canonical-padded-RFC4648-base64>`. Canonical dirty
comparison applies the same normalization, so this lexical normalization is not
an editor mutation and cannot make a just-saved project dirty. The package codec
accepts only that normalized form. It rejects MIME aliases such as `image/jpg`,
percent-encoded payloads, extra/ambiguous parameters, whitespace, URL-safe
base64, invalid padding, and decoded mismatch. Legacy parsing may accept older
spellings only when the shared normalization can deterministically produce this
canonical value before the package snapshot/baseline boundary.

### V1 resource-limit registry

| Resource | Exact maximum | Claim | Rationale / enforcement |
| --- | ---: | --- | --- |
| raw archive bytes | 268,435,456 (256 MiB) | TARGET REQUIREMENT | Bound before ZIP parsing or allocation. Large enough for current raster-heavy projects while finite for desktop IPC. |
| total uncompressed entry bytes | 268,435,456 (256 MiB) | TARGET REQUIREMENT | Sum from checked 64-bit arithmetic and enforce again while streaming/decompressing. |
| archive entries | 514 | TARGET REQUIREMENT | Exactly two roots plus at most 512 assets; explicit directory entries are forbidden. |
| assets | 512 | TARGET REQUIREMENT | Bounds traversal, manifest, hashing, and decode work independently of ZIP count. |
| individual asset bytes | 67,108,864 (64 MiB) | TARGET REQUIREMENT | Applies to decoded data-URL payload, the manifest asset record's declared `byteLength`, and streamed archive output. |
| `manifest.json` bytes | 2,097,152 (2 MiB) | TARGET REQUIREMENT | Supports 512 assets and 4,096 bindings without unbounded metadata. |
| `project.json` bytes | 16,777,216 (16 MiB) | TARGET REQUIREMENT | Projection removes large asset payloads while leaving bounded project metadata/text. |
| bindings | 4,096 | TARGET REQUIREMENT | Permits extensive deduplication across repeated Disc/Case owners while bounding pointer work. |
| image width | 16,384 pixels | TARGET REQUIREMENT | Reject before full decode/allocation when headers permit. |
| image height | 16,384 pixels | TARGET REQUIREMENT | Reject before full decode/allocation when headers permit. |
| decoded pixels per asset across all frames | 67,108,864 | TARGET REQUIREMENT | Checked multiplication/sum; prevents large-canvas and animation bombs. |
| decoded pixels across all assets | 134,217,728 | TARGET REQUIREMENT | Decode sequentially where possible and cap aggregate validation work. |
| decoded sample bytes per asset | 268,435,456 (256 MiB) | TARGET REQUIREMENT | Checked sum of `canvasWidth × canvasHeight × frameCount × channelCount × ceil(bitDepth / 8)`, with a minimum charge of four bytes per pixel. At most four decoded color/alpha channels and 16 bits per channel are accepted. |
| decoded sample bytes across all assets | 536,870,912 (512 MiB) | TARGET REQUIREMENT | Aggregate validation-work budget; decoders should release per-asset sample buffers before validating the next asset. |
| expanded ancillary image metadata | 8,388,608 (8 MiB) per asset; 33,554,432 (32 MiB) aggregate | TARGET REQUIREMENT | Includes decompressed text, EXIF/XMP, ICC profiles, comments, thumbnails, and equivalent chunks/segments. Enforce during expansion, not after allocation. |
| image structural records | 16,384 per asset; 65,536 aggregate | TARGET REQUIREMENT | Count PNG/WebP chunks, JPEG marker segments, GIF blocks/sub-blocks, BMP profile/header records, and equivalent decoder-visible structures with checked addition before retaining metadata. |
| image-decoder owned working allocation and concurrency | 536,870,912 (512 MiB) aggregate per package operation; at most one active asset decode at a time | TARGET REQUIREMENT | Includes decoded samples, expanded ancillary metadata, codec tables, and scratch space, excluding the one immutable encoded input already bounded above. The next asset decode cannot start until the prior decoder releases its working allocation. A decoder that cannot enforce or demonstrate the aggregate ceiling and single-decode rule is not a conforming adapter. |
| animation frames per asset | 256 | TARGET REQUIREMENT | Additional bound for GIF/APNG/WebP metadata and timing tables. |
| Deflate expansion ratio | 200:1 per entry and aggregate | TARGET REQUIREMENT | Ratio is `uncompressed / max(compressed, 1)` using checked integers; reject when declared or observed values exceed the cap. Store entries have ratio 1 for nonempty v1 entries. |
| entry path | 83 ASCII bytes | TARGET REQUIREMENT | The longest valid v1 name is a `.webp` content-addressed asset path; any longer name is outside the closed grammar. |
| path segment | 69 ASCII bytes | TARGET REQUIREMENT | The longest valid segment is `<64-hex>.webp`; empty segments are forbidden. |
| binding pointer | 1,024 UTF-8 bytes | TARGET REQUIREMENT | Validate before RFC 6901 parsing/resolution. |
| JSON nesting depth | 64 | TARGET REQUIREMENT | Applies separately to manifest and projection during bounded parsing. |
| one parsed manifest/projection JSON string | 1,048,576 UTF-8 bytes | TARGET REQUIREMENT | Applies before materializing a decoded string from `manifest.json` or `project.json`. Asset data is not stored in the projection. |
| one constructed hydrated asset data URL | 89,478,511 ASCII bytes/code units | TARGET REQUIREMENT | Exact maximum for a 67,108,864-byte asset encoded as padded RFC 4648 base64 with the longest v1 canonical `data:<mime>;base64,` prefix. This constructed string is not subject to the 1 MiB parsed-string limit. |
| hydrated data-URL fan-out | 268,435,456 ASCII bytes/code units | TARGET REQUIREMENT | Before allocation, sum `canonicalPrefixLength + 4 × ceil(assetByteLength / 3)` once for every binding, including repeated bindings to one deduplicated asset. Reject if the checked sum exceeds this bound. |
| all strings in one hydrated project | 536,870,912 UTF-8 bytes and 268,435,456 UTF-16 code units | TARGET REQUIREMENT | Sum every string after hydration, counting repeated values separately. Non-asset strings retain the 1 MiB individual bound; reject before an assignment crosses either aggregate. |
| one JSON array | 4,096 members | TARGET REQUIREMENT | Manifest arrays have stricter limits above; applies to all parsed arrays. |
| one JSON object | 4,096 properties | TARGET REQUIREMENT | Reject duplicate keys and excessive property maps. |

**TARGET REQUIREMENT.** These are protocol limits, not statements that current
permissive data-URL paths already enforce them. They deliberately bound a format
that otherwise handles in-memory images and archive expansion. Implementations
may use lower transient allocation thresholds only if they do not reject a
contract-valid package on a supported platform.

**TARGET REQUIREMENT.** All limits are conjunctive; their maxima need not be
simultaneously achievable. Implementations must enforce budgets at compressed,
uncompressed, decoded-image, canonical-base64, hydrated-JSON, and IPC
representations and verify measured peak memory with worst-case conforming
fixtures. A frontend/full-buffer design is nonconforming if duplicate archive,
asset, base64, and hydrated-project copies can exceed the supported platform's
measured memory envelope; it must stream or use an owned bounded staging area.

### Archive validation order

| Order | Claim | Validation stage | Failure boundary |
| ---: | --- | --- | --- |
| 1 | TARGET REQUIREMENT | Bound raw file length and sniff bytes. | No ZIP or JSON parser allocation before recognition. |
| 2 | TARGET REQUIREMENT | Parse end/central structures with checked offsets; reject multi-disk, ZIP64, encryption, comments, extras, unsupported flags/methods, and out-of-range spans. | No entry decompression. |
| 3 | TARGET REQUIREMENT | Validate raw/normalized names, entry types, counts, and uniqueness sufficiently to locate exactly one safe `manifest.json`; absence is `project.format.unsupported`, while a duplicate or forbidden manifest path is an archive/path failure. | No filesystem extraction; names are never joined to a user path. |
| 4 | TARGET REQUIREMENT | Stream/bound `manifest.json`; verify CRC, UTF-8, JSON budgets, duplicate keys, identity/version precedence, exact v1 schema, ordering, identifiers, internal uniqueness, permitted roots/assets, and absence of extra entries. | No project or asset trust. |
| 5 | TARGET REQUIREMENT | Stream/bound `project.json`; verify length, CRC, digest, UTF-8/JSON budgets, object shape, projection version, and manifest agreement. | No hydration. |
| 6 | TARGET REQUIREMENT | Stream each referenced asset once; enforce compressed/uncompressed limits, CRC, digest, MIME/signature, structure, dimensions, frames, and pixel budgets. | No lifecycle/editor mutation. |
| 7 | TARGET REQUIREMENT | Validate binding registry, placeholders, completeness, conflicts, and asset reachability; hydrate isolated JSON. | No schema parser sees unresolved state. |
| 8 | TARGET REQUIREMENT | Run existing parse/migrate/normalize/route/restore-candidate pipeline. | Still staging; active session unchanged. |
| 9 | TARGET REQUIREMENT | Re-read lifecycle authorization and perform one aggregate compare-and-swap/apply. | Only accepted candidate can mutate. |

**TARGET REQUIREMENT.** The decoder never extracts entries to arbitrary
filesystem locations. A bounded in-memory/streaming decoder or an owned
temporary area with explicit create/cleanup rules may be used, but archive names
never determine native output paths.

## 10. Package/legacy content sniffing

**TARGET REQUIREMENT.** Open recognizes content in this exact order:

1. Read at most 268,435,457 raw bytes through the bounded binary project reader; the extra byte exists only to detect an over-limit file and returns `project.file-too-large` before its format is trusted.
2. If the first four bytes are exactly `50 4b 03 04` (`PK\u0003\u0004`), treat the file as a package candidate and run all package validation. No fallback to JSON follows a package-parse failure.
3. Otherwise, for legacy recognition only, consume at most one UTF-8 BOM, then JSON whitespace (`0x20`, tab, CR, LF). If the next byte is `{`, require strict bounded UTF-8 and pass the result to the legacy JSON parser.
4. Reject every other sequence as `project.format.unsupported`. Empty ZIP signatures, spanned signatures, self-extracting prefixes, JSON arrays, UTF-16/UTF-32 text, and ambiguous content are unsupported.

**TARGET REQUIREMENT.** The legacy branch does not bypass resource safety. Before
the existing schema parser runs, a duplicate-key-rejecting bounded JSON reader
enforces the same 256 MiB raw-file, depth `64`, array-member `4,096`, and
object-property `4,096` limits; each non-asset string is at most 1,048,576 UTF-8
bytes. The schema-specific asset-pointer registry may classify at most 4,096
non-null asset leaves before that per-string rule. Each decoded legacy asset is
at most 67,108,864 bytes, no more than 512 distinct byte payloads are accepted,
their checked decoded-byte sum is at most 268,435,456, and every raster also
satisfies the dimensions, frame, pixel, sample, metadata, and decoder-work
budgets in section 9. A data-URL source string remains bounded by the raw-file
cap and is decoded incrementally; the reader never materializes an additional
unbounded copy. A violation is
`project.legacy.resource-limit-exceeded`, not a package-parse fallback.

**TARGET REQUIREMENT.** Legacy compatibility alone admits a passive SVG subset
needed by current checked-in fixtures: UTF-8 SVG with the standard SVG namespace;
only `svg`, `g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`,
`path`, `text`, and `tspan` elements; and only `xmlns`, `version`, `width`,
`height`, `viewBox`, `preserveAspectRatio`, `x`, `y`, `x1`, `y1`, `x2`, `y2`,
`cx`, `cy`, `r`, `rx`, `ry`, `dx`, `dy`, `d`, `points`, `transform`, `fill`,
`fill-opacity`, `fill-rule`, `stroke`, `stroke-width`, `stroke-linecap`,
`stroke-linejoin`, `stroke-miterlimit`, `stroke-dasharray`, `stroke-dashoffset`,
`stroke-opacity`, `opacity`, `font-family`, `font-size`, `font-style`,
`font-weight`, `text-anchor`, `dominant-baseline`, and `letter-spacing`
attributes. The `xmlns` value must be exactly `http://www.w3.org/2000/svg`;
numeric/path/transform values must parse completely as their SVG scalar/list
grammar; paint values are `none`, `currentColor`, or a literal color and never a
URL; font-family is bounded inert text, not a URL or font source.
DOCTYPEs, entities, processing instructions, comments, additional namespaces,
`script`, `style`, `foreignObject`, `use`, `image`, animation, event attributes,
`href`/`xlink:href`, `url(...)`, `@import`, external references, and unknown
elements or attributes are rejected as `project.legacy.asset-unsafe`. SVG depth,
element/property counts, decoded bytes, dimensions, and logical pixels use the
same numeric budgets above. This is not package SVG support: a passive legacy
SVG may open, but conversion remains visibly blocked by
`project.package.asset-type-unsupported` until the user replaces it with an
accepted v1 raster asset.

**TARGET REQUIREMENT.** Before either package or legacy candidate commit, every
persisted URL-bearing provenance or candidate record is validated by its owner
and restored as network-inert metadata. No restored URL may be assigned to
`src`, `href`, CSS, a preload, or a fetch adapter automatically. A later explicit
user selection may invoke the owner-backed import workflow and its URL/host
policy. Production package Open remains gated until this post-restore adapter
boundary is enforced and tested; an unsafe or auto-fetch-capable candidate fails
`project.restored-metadata-unsafe` before lifecycle commit.

**TARGET REQUIREMENT.** The extension never selects the decoder. A valid package
under `.json` or `.sbls.json` opens truthfully as package format but its current
path is not eligible for ordinary package overwrite; Save routes to Save As. A
valid legacy JSON file named `.sbls` opens truthfully as legacy format and also
routes Save to Save As.

| Selected suffix | Sniffed content | Claim | Open format identity | Ordinary Save eligibility |
| --- | --- | --- | --- | --- |
| `.sbls` (any ASCII case) | valid package v1 | TARGET REQUIREMENT | `sbls-package-v1` | eligible |
| any other suffix | valid package v1 | TARGET REQUIREMENT | `sbls-package-v1` | ineligible; Save As required |
| `.json`, `.sbls.json`, `.sbls`, or other | valid legacy JSON | TARGET REQUIREMENT | `legacy-json` | ineligible; Save As required |
| any | arbitrary/invalid ZIP or unsupported bytes | TARGET REQUIREMENT | none | not applicable |

**TARGET REQUIREMENT.** An eligible package destination has a final filename
whose suffix is `.sbls` under ASCII case-insensitive comparison. User-selected
casing is preserved. The application never silently appends, replaces, or
changes a selected suffix; an ineligible destination produces a typed
validation result while the Save As workflow remains recoverable.

**TARGET REQUIREMENT.** The target Open chooser exposes `.sbls` and `.json`
inputs (`.json` includes legacy `.sbls.json` names), but content still decides
format. The target Save As chooser exposes only `.sbls`. Existing Disc/Case
basename ownership may choose the stem, but every generated default Disc and
Case project filename must end exactly in `.sbls` rather than `.json` or
`.sbls.json`.

## 11. Legacy JSON import and conversion behavior

**CURRENT FACT.** Plain `.json` and `.sbls.json` projects are the implemented
format, including the `0.1.0` to `0.2.0` schema migration.

**TARGET REQUIREMENT.** Legacy JSON remains a read-only import representation
during alpha. No command writes new legacy JSON, no “Export legacy JSON” command
is introduced, and no background conversion occurs.

| Event | Claim | Required result |
| --- | --- | --- |
| legacy Open succeeds | TARGET REQUIREMENT | Adopt the exact selected source path for diagnostics/UI, `legacy-json` format identity, a new root session identity, revision `0`, and a clean baseline equal to the accepted normalized project. Open itself does not edit content. |
| Save from legacy session | TARGET REQUIREMENT | Enter Save As for an eligible `.sbls` destination, even when the source path exists and the project is clean. |
| conversion Save As succeeds | TARGET REQUIREMENT | After atomic package commit only, adopt the new path, `sbls-package-v1`, and the exact written normalized snapshot as baseline. Preserve newer edits as dirty. |
| conversion dialog cancels | TARGET REQUIREMENT | Return typed cancellation; retain legacy source path, format identity, baseline, content, revision, route, and dirty state. |
| conversion fails | TARGET REQUIREMENT | Retain all existing session/editor state and the original JSON bytes; report the specific typed package/persistence failure. |
| source has `.sbls` suffix | TARGET REQUIREMENT | Content sniffing still marks it legacy; neither ordinary Save nor conversion Save As may overwrite that active legacy source with ZIP bytes. |

**TARGET REQUIREMENT.** Before conversion encoding, Save As must prove that the
candidate destination is not the active legacy source. Comparison uses the
platform's normalized path identity and, when the destination exists, native
same-file identity so case aliases, links, and alternate spellings cannot bypass
the guard. An equal, aliased, or indeterminate candidate fails
`project.legacy-conversion.destination-conflicts-source`; the writer is not
invoked and the user may choose another destination. The protected source
identity is rechecked at the native commit boundary so a path race cannot turn a
validated new destination into replacement of the active legacy file.

**TARGET REQUIREMENT.** File-format identity is session metadata and must not be
added to `SavedProject`, `project.json`, or the dirty comparison. The target
field is exactly
`persistenceFormat: 'legacy-json' | 'sbls-package-v1' | null`; `null` means a
pathless New project has not adopted a persistence format. Successful package
Save As adopts `sbls-package-v1`.

## 12. Two-phase Open integration

**TARGET REQUIREMENT.** Package support extends the existing mutation-free Open
staging boundary; it does not create a second Open sequence.

| Phase | Claim | Required operation | Active-session effect |
| --- | --- | --- | --- |
| selection | TARGET REQUIREMENT | Select exactly one candidate path; cancellation is a typed non-failure. | none |
| raw read | TARGET REQUIREMENT | Read bounded bytes without UTF-8 conversion. | none |
| recognition | TARGET REQUIREMENT | Sniff package versus legacy using section 10. | none |
| package decode | TARGET REQUIREMENT | Validate archive, manifest, projection, digests, images, budgets, and bindings; hydrate one JSON object. | none |
| legacy decode | TARGET REQUIREMENT | Strict bounded UTF-8 decode, with the legacy-only BOM policy. | none |
| shared project staging | TARGET REQUIREMENT | Existing parse, supported migration, normalization, project-kind route, and complete restore candidate from the same accepted source. | none |
| latest-state authorization | TARGET REQUIREMENT | Re-read lifecycle session/revision; run the replacement guard when required. | none unless authorized |
| aggregate commit | TARGET REQUIREMENT | One compare-and-swap/equivalent transition installs content, path, format, root session identity, revision `0`, route, and matching baseline. | one observable commit |
| feedback/focus | TARGET REQUIREMENT | Emit one typed result and route focus through the shared application owner. | no project-content mutation |

**TARGET REQUIREMENT.** All file reads, archive operations, hashes, image decodes,
schema migrations, normalization, and restore construction finish before commit
starts. Cancellation, invalid content, a stale compare-and-swap, declined guard,
or apply precondition failure preserves the complete prior lifecycle/editor
aggregate.

**TARGET REQUIREMENT.** The normalized project and the Disc/Case restore
candidate must derive from one accepted hydrated object. The implementation may
not validate one object but restore a separately reparsed or partially hydrated
object.

**TARGET REQUIREMENT.** Pure decoder and dormant staging integration may land
before package writing, but production Open filters, sniff dispatch, and session
adoption must not expose `.sbls` package Open until lifecycle-owned package Save
and Save As are enabled in the same releasable slice. This prevents the current
legacy JSON Save adapter from serializing a package-opened session back over a
package path. No temporary callback may bypass that activation gate.

## 13. Save/Save As snapshot and baseline integration

**TARGET REQUIREMENT.** Save and Save As use the lifecycle owner and the exact
sequence below:

1. Authorize the command and capture session ID, revision `R`, current path/format, and one immutable normalized persistable snapshot.
2. Resolve whether ordinary Save is eligible: an adopted `sbls-package-v1` session with an eligible `.sbls` path. Otherwise enter Save As.
3. If Save As is needed, select and validate an eligible destination without adopting it.
4. Traverse and validate every required asset from the snapshot; build an immutable projection, asset set, bindings, manifest, and full archive byte plan.
5. Recheck the relevant lifecycle/busy authorization and atomically commit the exact archive bytes.
6. Only after the successful documented atomic commit boundary, adopt the destination and `sbls-package-v1` format if needed, and set the clean baseline to the exact snapshot written at revision `R`.
7. If current content advanced to `R+1` or later, preserve those edits and derive dirty against the written baseline; never mark newer unequal content clean.
8. Emit one shared result/feedback outcome and restore or move focus through the lifecycle workflow owner.

### Save behavior matrix

| Session state | Claim | Save | Save As |
| --- | --- | --- | --- |
| pathless new Disc/Case | TARGET REQUIREMENT | Routes to Save As | Prompts for eligible `.sbls`; adopts only after commit |
| package format + eligible path | TARGET REQUIREMENT | Writes current path without dialog | Prompts for another eligible `.sbls` |
| package format + wrong-suffix path | TARGET REQUIREMENT | Routes to Save As | Prompts for eligible `.sbls` |
| legacy JSON format | TARGET REQUIREMENT | Routes to conversion Save As | Prompts for an eligible `.sbls` that is not the active legacy source; never overwrites that source |
| no active project | TARGET REQUIREMENT | Unavailable/safely rejected by lifecycle capability | Unavailable/safely rejected |
| busy/conflicting modal | TARGET REQUIREMENT | Central capability/busy policy disables or rejects; no local bypass | Same |
| encode/asset/limit/dialog/write failure | TARGET REQUIREMENT | The Save operation never mutates or rolls back live content/revision; preserve the latest content and revision, and leave Save-owned path, format, baseline, dirty derivation, and previous destination bytes unchanged | Same; do not adopt candidate path |

**TARGET REQUIREMENT.** No live React reads occur after the snapshot boundary.
No package buffer, projection, or manifest becomes a clean baseline. Package
encoding cannot itself emit success or update session state.

**TARGET REQUIREMENT.** The lifecycle owner must construct and validate the
complete post-write adoption transition before invoking the native writer. The
exclusive Save commit scope prevents session replacement between the final
same-session authorization, filesystem commit, and adoption; later content edits
within that same session may still advance beyond `R`. After the native commit
returns success, adoption is one synchronous, total, non-throwing lifecycle
transition that preserves the current content/revision, adopts path/format when
required, and installs the snapshot-at-`R` baseline. It performs no parsing,
I/O, resource acquisition, adapter callback, validation, or other externally
fallible work; ordinary immutable state construction remains internal to the
total transition. If the transition cannot be proven applicable before the
write, the writer is not invoked and the command returns
`project.commit-failed`. A design with a normal failure branch
after destination bytes commit is nonconforming.

## 14. Atomic binary persistence boundary

### Current and target boundary

| Concern | Claim | Current | Target requirement |
| --- | --- | --- | --- |
| project read IPC | CURRENT FACT / TARGET REQUIREMENT | `read_project_file` returns UTF-8 text | Dedicated bounded raw-byte project read; binary bytes never pass through `read_to_string` |
| project write IPC | CURRENT FACT / TARGET REQUIREMENT | `write_project_file` accepts `String` and delegates UTF-8 bytes to the atomic writer | Dedicated atomic binary project write carrying exact pre-encoded bytes and structured typed errors |
| native atomic primitive | CURRENT FACT / TARGET REQUIREMENT | `project_file::write(&[u8])` already performs adjacent-temp atomic replacement | Reuse/generalize it without weakening any create/write/flush/sync/close/replace/cleanup invariant |
| direct binary command | CURRENT FACT / TARGET REQUIREMENT | `write_binary_file` directly writes and serves PNG export | Package Save must not call it; PNG behavior stays unchanged |
| package semantics | TARGET REQUIREMENT | none | Application/package-domain codec owns manifest, registry, projection/hydration, budgets, compatibility, and typed package results; native filesystem code does not own editor or lifecycle decisions |

**TARGET REQUIREMENT.** The binary project writer retains the #312 invariants:
exclusive adjacent temporary creation with bounded collisions, exact byte write,
flush, file synchronization, close, one same-volume namespace replacement,
Windows `MoveFileExW` replace-existing plus write-through flags, Unix
same-filesystem rename, no copy/delete fallback, previous-destination
preservation on every returned precommit/commit failure, and cleanup restricted
to the writer-owned temporary file.

**TARGET REQUIREMENT.** Package encoding/finalization completes before invoking
the atomic writer. Native success means the exact archive bytes reached the
successful documented atomic commit boundary. As in the lifecycle contract,
file synchronization and same-volume namespace replacement do not claim
parent-directory synchronization or absolute power-loss durability. Structured
IPC must preserve stable
`project.atomic-write.*` codes and safe causes; frontend code must not parse a
display string.

**TARGET REQUIREMENT.** Byte transport must enforce the section 9 budgets without
avoidable duplicate full-archive copies. Base64 transport or JSON arrays of byte
numbers are prohibited unless a documented implementation analysis proves peak
memory and copies remain within those budgets on every supported platform.

**OPEN QUESTION.** The exact ZIP library and whether the replaceable archive
adapter executes in TypeScript or Rust remain bounded implementation choices.
The package-domain port and every semantic/security invariant above remain fixed.

**OPEN QUESTION.** The exact Tauri binary IPC representation may be a bounded
typed-byte payload, resource/stream handle, or native-owned codec call after
measurement. It may not expose arbitrary paths to the codec or move lifecycle,
schema, asset-ownership, or Save decisions into Rust.

## 15. Versioning, compatibility, and migration order

### Version authority matrix

| Version | Claim | Owner | V1 behavior |
| --- | --- | --- | --- |
| `packageVersion` | TARGET REQUIREMENT | This contract/package decoder | Exact integer `1`; any other value is `project.package.version-unsupported`. It is not derived from PR number or app semver. |
| `projectSchemaVersion` | TARGET REQUIREMENT | Project-file schema/migration owner | Must agree between manifest and hydrated project. Current or explicitly supported older versions proceed; unsupported future versions fail. |
| `createdBy.version` | TARGET REQUIREMENT | Build/application metadata | Diagnostic only; it neither authorizes nor rejects a package. |
| built-in compatibility identity | TARGET REQUIREMENT | Versioned app-asset compatibility registry | Keyed at least by supported project schema plus exact owner/discriminator; guarantees equivalent reconstructible bytes or prevents omission. |

### Compatibility decision matrix

| Input | Claim | Required behavior |
| --- | --- | --- |
| package v1 + current schema | TARGET REQUIREMENT | Validate package, hydrate, parse/normalize, stage, then lifecycle commit. |
| package v1 + supported older schema | TARGET REQUIREMENT | Validate/hydrate under that schema's approved binding/asset registry, then run existing schema migration and normalization. |
| package v1 + unsupported future schema | TARGET REQUIREMENT | Reject `project.schema.unsupported`; do not guess or partially restore. |
| unknown package version | TARGET REQUIREMENT | Reject before interpreting its manifest/project semantics. |
| safety-eligible legacy schema `0.2.0` | TARGET REQUIREMENT | Preserve current legacy import behavior after section 10's bounded duplicate-key, resource, asset, and network-inertness gate. |
| legacy schema `0.1.0` | TARGET REQUIREMENT | Preserve explicit migration to `0.2.0`; later Save converts through Save As to package v1. |
| package made by another app version | TARGET REQUIREMENT | Ignore creating version for gating; use package and project schema versions only. |
| unknown manifest field in v1 | TARGET REQUIREMENT | Reject; additive fields require a future package-version contract. |
| unsupported required future feature | TARGET REQUIREMENT | Reject with the version/manifest/schema-specific typed code; never ignore required semantics. |

**TARGET REQUIREMENT.** Load order is container recognition and v1 validation,
projection hydration under the declared supported schema, then project-schema
migration and normalization. Container migration and project-schema migration
are separate operations; v1 defines no container migration.

**TARGET REQUIREMENT.** A v1 re-save preserves normalized semantic content and
exact accepted asset bytes, not original ZIP order, compression bytes, comments,
timestamps, source data-URL spelling, or manifest formatting. Project digest is
always over exact emitted projection bytes, and asset identity is always over
exact uncompressed asset bytes.

## 16. Privacy/provenance/legal rules

| Rule | Claim | Required behavior |
| --- | --- | --- |
| native paths | TARGET REQUIREMENT | No absolute path, cache path, account directory, drive/UNC prefix, or original filename is written into archive metadata or package asset paths. Existing schema fields are sanitized through their current owner. |
| authentication | TARGET REQUIREMENT | No headers, cookies, tokens, credentials, Steam account IDs, or request state. |
| provenance labels | TARGET REQUIREMENT | Preserve only bounded sanitized labels already accepted by the project schema/owner; labels never determine asset paths. |
| provenance URLs | TARGET REQUIREMENT | Preserve only existing owner-approved sanitized HTTP(S) provenance. They are inert information: package/legacy Open and automatic post-commit rendering never bind or fetch them. |
| candidate data | TARGET REQUIREMENT | Do not bundle unaccepted search, Steam, screenshot, or web candidates merely because metadata can locate them. Any retained selected-game URL catalog is restored network-inert and becomes fetchable only after explicit user selection through its owner. |
| network | TARGET REQUIREMENT | Package Open and automatic restoration/rendering perform no network request. Valid package preview/export uses hydrated bytes or qualified built-ins and does not require one. |
| embedded image metadata | TARGET REQUIREMENT | V1 preserves accepted raster bytes exactly and therefore may preserve EXIF/XMP, ICC profiles, comments, thumbnails, GPS, author/device data, or filenames already embedded in those bytes. The encoder adds none, but v1 does not claim to scrub them; user-facing package guidance must disclose this privacy boundary. |
| third-party rights | TARGET REQUIREMENT | Packaging user-accepted bytes does not change ownership, trademark, copyright, or licensing status. The application makes no new redistribution-rights claim. |
| product role | TARGET REQUIREMENT | `.sbls` is a user project container, not an official artwork catalog, marketplace, redistribution channel, or asset exchange format. |

**TARGET REQUIREMENT.** ZIP-owned host metadata is normalized as section 5
specifies so the container itself adds no user names, machine names, source
timestamps, native permissions, or original filenames. This does not erase
metadata already inside exact preserved asset bytes. Diagnostic logs may retain
safe operation correlation data but must not put private paths or raw
parser/filesystem exceptions into user copy or package-owned metadata.

## 17. Stable failure taxonomy

**TARGET REQUIREMENT.** Package commands return typed status, stable code, safe
user copy, and an optional safe diagnostic cause. Raw archive, JSON, decoder, or
filesystem exception text is never user copy. Cancellation has status
`cancelled`, not `failure`.

**TARGET REQUIREMENT.** `recoverable: true` means the application/session remains
usable and the workflow may offer retry, another file/destination, or a
content-correction action; it does not promise that the unchanged artifact will
succeed. `false` suppresses an unchanged retry until a compatible application,
registry, or implementation correction exists. Every mapping below supplies the
literal boolean required by `ApplicationCommandError`.

### Shared lifecycle pass-through mappings

**TARGET REQUIREMENT.** Package adapters preserve these established application
codes rather than inventing package-local aliases. A lower-level native detail
may be retained only as the safe structured `cause` of the application code.

| Condition/stage | Stable code | Recoverable | Mapping and preservation rule |
| --- | --- | --- | --- |
| Open/Save As dialog port throws | `dialog.project-file-failed` | `true` | Preserve session and destination; retry may reopen the chooser. |
| Dialog returns a non-null value that is not one valid path | `dialog.project-file-invalid-selection` | `true` | Preserve session; do not read or write. |
| Bounded raw-byte project read fails | `project.read-failed` | `true` | Preserve session. Native binary-read detail is a cause, never a replacement public code. |
| Legacy candidate is malformed JSON | `project.parse-failed` | `true` | Preserve session; do not enter migration or restore. |
| Project-kind route resolution fails | `project.route-failed` | `true` | Preserve session; discard the staged candidate. |
| Disc restore staging fails | `project.disc-restore-failed` | `true` | Preserve session; apply no partial Disc state. |
| Case restore staging fails | `project.case-restore-failed` | `true` | Preserve session; apply no partial Case state. |
| Legacy Disc background inspection fails during staging | `project.background-image-resolution-failed` | `true` | Preserve session. Keep the current shared code during migration; package assets must already have completed bounded image validation and cannot introduce a late decoder dependency. |
| Immutable staged-candidate capture fails | `project.staging-capture-failed` | `true` | Preserve session; discard all isolated staged state before lifecycle authorization. |
| Immutable Save snapshot capture fails | `project.snapshot-failed` | `true` | Do not encode or invoke the writer. |
| Open lifecycle compare-and-swap is stale | `project.open-stale-state` | `true` | Preserve the latest aggregate; discard the staged candidate and allow a fresh Open. |
| Open aggregate commit throws | `project.open-commit-failed` | `true` | Preserve the prior aggregate; no staged editor setters run. |
| Open aggregate commit returns a non-committed, non-stale result | `project.open-commit-not-applied` | `true` | Preserve the prior aggregate and report the unexpected non-application. |
| Save cannot construct/authorize its total adoption transition before write | `project.commit-failed` | `true` | Do not invoke the writer; preserve path, format, baseline, and destination. |
| Native write fails without a recognized structured atomic code | `project.write-failed` | `true` | Preserve prior destination/session; retain the lower-level cause. Recognized atomic codes below take precedence. |
| Truly unexpected application exception outside a named boundary | `application.unexpected` | `false` | Preserve state where possible and do not collapse a known package/lifecycle code into this fallback. |

### Package, compatibility, and persistence mappings

| Stable code | Status | Recoverable | Stage/category | Safe meaning and preservation/retry rule |
| --- | --- | --- | --- | --- |
| `project.file-too-large` | failure | `true` | pre-recognition read | Selected file exceeds the 256 MiB raw-file cap before its format can be trusted. Preserve session; no parser allocation. |
| `project.format.unsupported` | failure | `true` | recognition | File is neither a supported package nor legacy JSON. Preserve session; choose another file. |
| `project.legacy.resource-limit-exceeded` | failure | `true` | legacy preflight | Legacy JSON, asset-leaf, decoded-byte, image, or structural budget is exceeded. Preserve session; do not invoke the existing schema parser. |
| `project.legacy.asset-unsafe` | failure | `true` | legacy asset preflight | A legacy asset contains active/external SVG content or otherwise violates the closed legacy compatibility gate. Preserve session and identify the owner safely. |
| `project.restored-metadata-unsafe` | failure | `true` | shared pre-restore safety | Package or legacy provenance/candidate metadata violates its owner policy or could trigger automatic external access. Preserve session; no URL is bound or fetched. |
| `project.package.version-unsupported` | failure | `false` | manifest/version | Package version is not 1. Preserve session; a compatible future application is required for that package. |
| `project.package.archive-too-large` | failure | `true` | ZIP structure | Recognized package structure declares or spans archive data beyond the v1 archive cap. Preserve session; do not decompress entries. |
| `project.package.resource-limit-exceeded` | failure | `true` | parse/decode/encode | A declared or observed count, byte, ratio, JSON, hydration, structural-record, frame, pixel, sample, metadata, decoder-work, or concurrency limit was exceeded. Preserve session/destination. |
| `project.package.archive-invalid` | failure | `true` | ZIP structure | ZIP header/offset/flag/method/profile or manifest-entry CRC is invalid. Project and asset entry CRC failures use their specialized digest-mismatch codes. Preserve session. |
| `project.package.entry-path-invalid` | failure | `true` | ZIP names | Entry path/type is forbidden, colliding, duplicate, or out of profile. Preserve session. |
| `project.package.manifest-invalid` | failure | `true` | manifest | A recognized v1 manifest has malformed, missing-required, duplicate-key, unknown-field, unsorted, or internally inconsistent non-specialized data. Preserve session. |
| `project.package.project-missing` | failure | `true` | projection | Exactly one permitted `project.json` is not present. Preserve session. |
| `project.package.project-digest-mismatch` | failure | `true` | projection self-consistency | Project length, CRC, or SHA-256 does not match. Preserve session. |
| `project.package.asset-missing` | failure | `true` | asset graph | Referenced asset/entry/record is absent or an entry is unreferenced. Preserve session. |
| `project.package.asset-digest-mismatch` | failure | `true` | asset self-consistency | Asset length, CRC, ID, path digest, or SHA-256 does not match exact bytes. Preserve session. |
| `project.package.asset-hash-collision` | failure | `false` | asset identity | Two captured byte sequences share a SHA-256 value but differ in length or exact bytes. Abort deterministically; never merge or write them. |
| `project.package.asset-type-invalid` | failure | `true` | asset validation | MIME, extension, signature, or decoded structure disagrees. Preserve session. |
| `project.package.asset-type-unsupported` | failure | `true` | capture/decode | Required payload is a type outside the v1 raster allowlist. Save/Open does not transcode it; replace it with an accepted raster. |
| `project.package.asset-dimensions-invalid` | failure | `true` | asset validation | Width/height/frame/pixel metadata is invalid or disagrees with decoded bytes. Preserve session. |
| `project.package.binding-invalid` | failure | `true` | binding | Pointer syntax/path/placeholder/asset reference is invalid or outside registry. Preserve session. |
| `project.package.binding-conflict` | failure | `true` | binding | Multiple bindings target one pointer or otherwise disagree. Preserve session. |
| `project.package.binding-unresolved` | failure | `true` | hydration | Required asset/placeholder/reference remains unresolved. Schema parser is not invoked. |
| `project.package.built-in-unavailable` | failure | `false` | Open hydration | A package omitted a qualified built-in for which this application has no exact frozen compatibility-registry match. Never substitute; a compatible registry/application is required. |
| `project.package.built-in-capture-required` | failure | `true` | Save capture | The current owner has no frozen omission mapping and cannot truthfully accept a bound copy of the app-owned bytes. Do not write; the workflow may offer replacement with an accepted owned raster. |
| `project.package.hydrated-json-invalid` | failure | `true` | hydration/project parse | Projection or hydrated object cannot enter the schema pipeline as bounded JSON. Preserve session. |
| `project.schema.unsupported` | failure | `false` | project version | Manifest and projection agree on a schema with no supported parser/registry/migration. Preserve session; a compatible application is required. |
| `project.validation-failed` | failure | `true` | project validation | A syntactically valid current-schema hydrated or legacy object fails the existing field/schema validator. Preserve session. |
| `project.migration-failed` | failure | `true` | project migration | A declared supported migration could not produce a valid normalized candidate. Preserve session. |
| `project.package.asset-capture-failed` | failure | `true` | Save staging | Required owned bytes are missing, external-only, unreadable, or not safely reconstructible. Writer is not invoked. |
| `project.package.encode-failed` | failure | `true` | Save staging | Complete archive could not be built/validated. Writer is not invoked. |
| `project.package.destination-extension-invalid` | failure | `true` | Save As validation | Selected destination does not end in `.sbls`; do not alter/adopt it and allow retry. |
| `project.legacy-conversion.destination-conflicts-source` | failure | `true` | Save As validation/native commit guard | Candidate equals, aliases, or cannot be proven distinct from the active legacy source. Do not invoke/complete replacement; retain source and allow another destination. |
| `project.atomic-write.validate-destination` | failure | `true` | native write | Destination is invalid; preserve session and prior destination. |
| `project.atomic-write.create-temporary` | failure | `true` | native write | Owned adjacent temporary file could not be created; prior destination preserved. |
| `project.atomic-write.collision-exhausted` | failure | `true` | native write | Bounded temporary-name attempts were exhausted; prior destination preserved. |
| `project.atomic-write.write-temporary` | failure | `true` | native write | Exact bytes could not be written; prior destination preserved and owned temp cleaned when safe. |
| `project.atomic-write.flush-temporary` | failure | `true` | native write | Temporary data could not be flushed; prior destination preserved. |
| `project.atomic-write.sync-temporary` | failure | `true` | native write | Declared file synchronization failed; prior destination preserved. |
| `project.atomic-write.close-temporary` | failure | `true` | native write | Temporary file could not be closed before commit; prior destination preserved. |
| `project.atomic-write.replace-destination` | failure | `true` | native commit | Single namespace replacement failed; prior destination remains the authoritative file. |
| `project.legacy-conversion.failed` | failure | `true` | conversion orchestration | Conversion could not complete for a safely wrapped orchestration reason not covered by a more specific code; retain legacy session/source. |

### Deterministic validation precedence

**TARGET REQUIREMENT.** Validation reports the first failure in the normative
stage order from section 9. Within one stage or one record, the leftmost
applicable rule below wins. Budget enforcement happens before allocating or
retaining the over-limit value and therefore takes precedence at the stage where
the limit is observed.

| Scope | Within-stage precedence and exact mapping |
| --- | --- |
| raw input and recognition | dialog/read pass-through code, then `project.file-too-large`, then `project.format.unsupported`; a recognized package never falls back to legacy parsing. |
| ZIP end/central envelope | `project.package.archive-too-large` when a declared or planned compressed archive span/overall ZIP range exceeds 268,435,456 bytes; then `project.package.resource-limit-exceeded` for any other numeric envelope budget; then `project.package.archive-invalid` for headers, offsets, disk/ZIP64/encryption/flag/method/profile faults, overlap, gaps, or out-of-range spans. |
| ZIP safe inventory and entry content | `project.package.resource-limit-exceeded` for entry-count/name-length or observed stream budgets; then `project.package.entry-path-invalid` for raw/normalized name, duplicate-name, or forbidden entry-type faults. After safe inventory, a manifest-entry CRC/stream fault is `project.package.archive-invalid`; project-entry CRC is `project.package.project-digest-mismatch`; asset-entry CRC is `project.package.asset-digest-mismatch`. |
| manifest identity and shape | bounded-JSON excess is `project.package.resource-limit-exceeded`; then `project.format.unsupported`; then `project.package.version-unsupported`; then `project.package.manifest-invalid` for closed-object shape, required/unknown fields, duplicate keys, and ordering. A manifest asset `byteLength` or dimension over budget is `project.package.resource-limit-exceeded`; a well-formed but unsupported MIME is `project.package.asset-type-unsupported`; malformed or disagreeing MIME/extension is `project.package.asset-type-invalid`; a noninteger, zero, or internally disagreeing dimension is `project.package.asset-dimensions-invalid`; inconsistent ID/SHA/path digest is `project.package.asset-digest-mismatch`. These specialized conditions are never collapsed into `project.package.manifest-invalid`. |
| project entry and schema gate | `project.package.project-missing`; then `project.package.resource-limit-exceeded`; then `project.package.project-digest-mismatch` for length, project-entry CRC, or SHA; then `project.package.hydrated-json-invalid` for bounded projection JSON syntax/shape; then manifest/projection version disagreement is `project.package.manifest-invalid`; then an agreed unsupported schema is `project.schema.unsupported` before any schema-specific binding traversal. |
| asset records and bytes | `project.package.resource-limit-exceeded`; then `project.package.asset-missing` for absent referenced entry/record or any unreferenced asset; then `project.package.asset-digest-mismatch` for length, asset-entry CRC, ID/path digest, or SHA; then `project.package.asset-type-unsupported`; then `project.package.asset-type-invalid`; then `project.package.asset-dimensions-invalid`. Encoder-only unequal-byte digest collision is `project.package.asset-hash-collision` before deduplication. |
| bindings and hydration | missing referenced asset remains `project.package.asset-missing`; then duplicate-pointer or multi-binding disagreement is `project.package.binding-conflict`; then syntax, forbidden/out-of-registry path, non-null placeholder, or invalid reference is `project.package.binding-invalid`; then missing Open-time built-in registry identity is `project.package.built-in-unavailable`; then any residual placeholder/reference is `project.package.binding-unresolved`; then hydrated aggregate-budget/shape failure is resource-limit or `project.package.hydrated-json-invalid`, respectively. Save-time missing built-in capture identity is `project.package.built-in-capture-required`. |
| shared schema and restore | `project.schema.unsupported`; then `project.migration-failed` for a declared supported older-schema migration; then `project.validation-failed` for current-schema field validation; then `project.route-failed`; then `project.restored-metadata-unsafe` before any URL-capable owner adapter runs; then `project.background-image-resolution-failed` for the current legacy Disc inspection path; then the project-kind-specific restore code; then `project.staging-capture-failed`. |
| lifecycle and persistence | the most specific package or atomic code wins; otherwise use the shared snapshot/read/write/commit pass-through code above. Stale Open CAS is `project.open-stale-state`; thrown and non-applied Open commits remain distinct. `application.unexpected` is last-resort only. |

**TARGET REQUIREMENT.** A dismissed legacy-conversion Save As returns the shared
command result `{ status: 'cancelled', reason: 'file-dialog-dismissed' }`; it is
not assigned a failure code. More specific package or atomic codes take
precedence over `project.legacy-conversion.failed`. Cleanup failure may be
preserved as a secondary structured diagnostic but must not replace the primary
failure. A failure or cancellation emits no success feedback and never adopts a
path, format, or baseline.

## 18. Testable invariants and required implementation test layers

| Test layer | Claim | Required coverage |
| --- | --- | --- |
| pure codec/unit | TARGET REQUIREMENT | Disc and Case canonical round trips; exact hashes; identical-byte deduplication; unequal-byte separation; canonical paths/order/JSON; manifest rules; no unresolved placeholder at schema boundary; package metadata excluded from dirty comparison. |
| traversal registry | TARGET REQUIREMENT | Every Disc pointer; Case cover/tray/left/right pointers; deterministic arrays/maps; hidden/disabled/default assets included; every present-null or absent registered location receives an owner classification; only owner-confirmed absence, registry-qualified built-ins, and unaccepted candidates are omitted; test fails when a new asset field lacks an explicit registry decision. |
| MIME/image security | TARGET REQUIREMENT | Every allowed signature; aliases; exact bytes; malformed/polyglot/HTML/packaged-SVG rejection; passive legacy-SVG allowlist and active/external rejection; width/height/frame/pixel/sample/metadata/decoder-work bounds; at most one active asset decoder and aggregate working-allocation enforcement; decoder failure before lifecycle commit. |
| archive and allocation security | TARGET REQUIREMENT | Traversal, absolute/drive/UNC/backslash/control paths; normalized/case duplicates; symlinks/devices/directories; exact host/attribute/time metadata; encryption; multi-disk; ZIP64; unsupported compression; descriptors/extras/comments; extra/duplicate roots; malformed offsets/CRC/JSON; every byte/count/ratio/depth/string/array/object and hydrated fan-out budget. |
| binding/hydration | TARGET REQUIREMENT | Approved and forbidden pointers; exact-null placeholder; missing/conflicting/duplicate/unreferenced assets; digest/length/MIME/extension/dimension mismatch; canonical data URL; schema/version agreement. |
| compatibility | TARGET REQUIREMENT | `.json`/`.sbls.json` current fixtures; `0.1.0` migration; package v1/current schema; package v1/supported older schema hydrates then migrates; package/schema/version/field-validation failures remain distinct; conversion cancellation/failure preserves the legacy file and complete session; no new JSON writes. |
| lifecycle/Open integration | TARGET REQUIREMENT | All package work before mutation; normalized project and restore candidate share one source; no external path/URL/network lookup is needed; cancellation/failure/decline/stale CAS preserves aggregate; success installs exact path/format/root identity/revision `0`/route/baseline/complete Disc or Case state; production package Open remains unexposed until package Save/Save As activates in the same release slice. |
| lifecycle/Save integration | TARGET REQUIREMENT | One snapshot supplies projection/assets/bindings/baseline; eligible Save has no dialog; pathless/legacy/wrong-suffix uses Save As; conversion rejects same-source/alias destinations at preflight and commit; cancellation/failure preserves the legacy file/session; write failure leaves live content/revision and Save-owned path/format/baseline unchanged; adoption only after commit; `R+1` remains dirty; encoding failure never invokes writer. |
| Rust/native adapter | TARGET REQUIREMENT | Non-UTF-8/NUL/large bounded binary reads; exact binary writes; injected create/write/flush/sync/close/replace failures; existing/absent destinations; Unicode paths; collisions; cleanup; Windows replace/sharing-lock behavior; package path never uses direct writer; PNG export unchanged. |
| application integration | TARGET REQUIREMENT | Typed results/feedback once; capability/busy/modal gating; retry/cancel; guard-nested Save; Home/editor path and format truth; restored provenance/candidate URLs remain network-inert until explicit owner action; no package transport state in project/history. |
| parity fixtures | CURRENT FACT / TARGET REQUIREMENT | The current `full-branding.sbls.json` remains a required legacy-Open fixture, but its percent-encoded SVG payloads are outside package v1 and conversion must reject them without mutation. A raster-v1-eligible fixture with the same full Disc feature coverage, plus a full Case fixture, must retain every v1-accepted asset and equivalent preview/export input state after package and legacy restore; current owner-specific hidden-state gaps are resolved or explicitly blocked before parity claim. |
| native Tauri manual acceptance | TARGET REQUIREMENT | Real native Open/Save/Save As dialogs, `.sbls` filters, wrong-suffix retry, legacy conversion, replacement preservation, and Windows/Linux filesystem behavior under `AGENTS.md`; browser-only evidence is insufficient. macOS joins this matrix only if it becomes a supported platform. |

**TARGET REQUIREMENT.** UI snapshots are not the principal codec strategy. Tests
compare normalized hydrated project state, exact asset bytes, package invariants,
lifecycle transitions, and preview/export inputs. Native/manual verification is
required only during implementation, not for this documentation task.

## 19. Issue/dependency mapping and bounded implementation sequence

### Issue and authority matrix

| Issue/PR | Claim | Relationship |
| --- | --- | --- |
| [#56](https://github.com/thelordofdino4/steam-backup-label-studio/issues/56) | CURRENT FACT | Closed decision owner that selected a ZIP-compatible package; this contract supplies the unimplemented normative details. |
| [#58](https://github.com/thelordofdino4/steam-backup-label-studio/issues/58) | CURRENT FACT | Closed duplicate of #56; not a second format owner. |
| [#48](https://github.com/thelordofdino4/steam-backup-label-studio/issues/48) | CURRENT FACT | Closed schema-validation/migration work that established the current `0.2.0` parser and `0.1.0` migration consumed after hydration. |
| [#308](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308) | CURRENT FACT / TARGET REQUIREMENT | Open lifecycle parent for session/path/baseline/dirty, target Save/Save As, replacement guards, and Resume. Package work must consume that owner. |
| [#312](https://github.com/thelordofdino4/steam-backup-label-studio/issues/312) | CURRENT FACT / TARGET REQUIREMENT | Issue remains open, but its atomic byte writer was merged by PR #317 and is consumed by the current text Save chain. Package work generalizes only the binary IPC/read boundary and reuses the primitive. |
| [PR #320](https://github.com/thelordofdino4/steam-backup-label-studio/pull/320) | CURRENT FACT | Merged two-phase Open integration at the evidence baseline; package decoding extends its staging phase. |

**CURRENT FACT.** Searches of open and closed issues and current pull requests on
2026-07-27 found no separate open implementation owner for the `.sbls` codec.
This contract records relationships only and does not mutate issue state.

### Bounded implementation sequence

1. **TARGET REQUIREMENT:** Implement a pure package-domain manifest, typed asset registry, budgets, validation, data-URL decode, projection/hydration, hashing, deterministic encoder/decoder ports, and focused tests without UI or lifecycle mutation.
2. **TARGET REQUIREMENT:** Add bounded binary project read and structured atomic binary project write by generalizing the #312 command boundary; retain the existing atomic primitive and Rust/platform test matrix; leave PNG export unchanged.
3. **TARGET REQUIREMENT:** Integrate package decode behind the mutation-free staging seam while retaining legacy JSON, but keep production `.sbls` filters, sniff dispatch, and package-session adoption unexposed until step 4; pure decoder and dormant integration tests may land independently.
4. **TARGET REQUIREMENT:** Integrate the encoder/write plan with lifecycle Save and Save As, revision/baseline rules, `.sbls` destination eligibility, same-source legacy-conversion protection, and explicit legacy conversion; activate production package Open and package Save/Save As together in this releasable slice.
5. **TARGET REQUIREMENT:** Implement the dirty-aware replacement guard only after working package Save/Save As can satisfy its Save branch.
6. **TARGET REQUIREMENT:** Complete Home Resume/global feedback, then add native menu or shortcut presentation adapters through the lifecycle root.
7. **TARGET REQUIREMENT:** Consider retiring alpha JSON reads only at a separately approved beta boundary after real compatibility evidence; no retirement is authorized here.

**TARGET REQUIREMENT.** Contract precedes codec; reader precedes a portable Open
claim; atomic binary commit precedes safe package Save; working Save/Save As
precedes the dirty guard; lifecycle semantic owners precede menu presentation.
Each slice must be independently reviewable and preserve Disc/Case schema,
preview/export parity, and legacy reads.

## 20. Non-goals, future extensions, and narrowly unresolved implementation questions

### Non-goals of this contract task

**TARGET REQUIREMENT.** This documentation checkpoint does not implement ZIP,
change TypeScript/TSX/Rust/tests/fixtures/configuration/dependencies/lockfiles,
change `SavedProject` or its schema version, add binary commands, change dialogs,
wire Open/Save/guards/menus, remove legacy/data-URL compatibility, alter pixels,
or mutate GitHub, commits, staging, pushes, pull requests, releases, runtime, or
generated output.

### Explicitly unimplemented future extensions

| Extension | Claim | V1 boundary |
| --- | --- | --- |
| thumbnails and previews | FUTURE EXTENSION | Derived caches are excluded. |
| custom fonts | FUTURE EXTENSION | Requires schema, licensing, MIME, and renderer contract. |
| audio and video | FUTURE EXTENSION | Not a v1 asset class. |
| WebGL textures and material versioning | FUTURE EXTENSION | Requires renderer/material compatibility authority. |
| shared in-memory content-addressed store | FUTURE EXTENSION | Optimization only; not required for correct traversal. |
| compaction and garbage collection | FUTURE EXTENSION | V1 writer already emits only reachable assets. |
| autosave and recovery packages | FUTURE EXTENSION | Requires separate lifecycle/storage policy. |
| cloud collaboration | FUTURE EXTENSION | Outside the single-user local package. |
| signatures, encryption, passwords, certificates | FUTURE EXTENSION | V1 explicitly rejects encryption and defines structural self-consistency/accidental-corruption detection, not authenticity, trust, or tamper resistance. |
| opt-in image-metadata scrubbing | FUTURE EXTENSION | Requires explicit user intent, format-aware transformation, preview/export parity tests, and a new byte-identity/baseline decision because v1 otherwise preserves accepted bytes exactly. |
| streaming beyond v1 limits | FUTURE EXTENSION | Requires a new bounded protocol/version decision. |
| lazy or partial Open | FUTURE EXTENSION | V1 validates and hydrates the complete candidate before commit. |
| editing assets inside ZIP | FUTURE EXTENSION | Editor operates on hydrated owner state, never an open archive. |
| marketplace behavior | FUTURE EXTENSION | Package is not a distribution catalog. |
| linked external assets | FUTURE EXTENSION | Contradicts v1 portability unless separately modeled and approved. |
| delta or incremental Save | FUTURE EXTENSION | V1 writes one complete atomic archive snapshot. |
| multi-document packages | FUTURE EXTENSION | V1 contains exactly one project. |

### Narrow implementation questions

1. **OPEN QUESTION:** Which maintained ZIP/SHA/image-validation libraries satisfy the exact profile and budgets without moving package policy out of the package-domain port?
2. **OPEN QUESTION:** Which Tauri byte-transport mechanism minimizes peak copies while preserving structured errors and the raw/archive limits?
3. **OPEN QUESTION:** Whether bounded decode staging is wholly in memory or uses an application-owned temporary area; either choice must prevent path-directed extraction and guarantee cleanup.

**TARGET REQUIREMENT.** These questions cannot change the identifier, version,
layout, manifest, pointer registry, MIME allowlist, budgets, portability,
validation order, lifecycle semantics, failure preservation, or atomic-write
invariants. No speculative manifest field is reserved for a future consumer.

## 21. Evidence index

### Repository evidence

| Claim | Evidence |
| --- | --- |
| CURRENT FACT | Project types and all persisted Disc/Case visual leaves: [`projectTypes.ts`](../src/project/projectTypes.ts) |
| CURRENT FACT | Schema `0.2.0`, validation, and migration routing: [`projectSchema.ts`](../src/project/projectSchema.ts) |
| CURRENT FACT | Canonical project normalization/baseline behavior: [`canonicalProject.ts`](../src/lifecycle/canonicalProject.ts), [`projectSession.ts`](../src/lifecycle/projectSession.ts) |
| CURRENT FACT | Snapshot and restore ownership: [`createProjectSnapshot.ts`](../src/project/createProjectSnapshot.ts), [`restoreProjectState.ts`](../src/project/restoreProjectState.ts), [`caseInsertProjectAdapters.ts`](../src/project/caseInsertProjectAdapters.ts) |
| CURRENT FACT | Disc visual owner normalization: [`projectLogoAssets.ts`](../src/project/projectLogoAssets.ts), [`projectTitleArtwork.ts`](../src/project/projectTitleArtwork.ts), [`projectAdditionalArtwork.ts`](../src/project/projectAdditionalArtwork.ts), [`projectPlatformMarks.ts`](../src/project/projectPlatformMarks.ts), [`projectTechnicalMarks.ts`](../src/project/projectTechnicalMarks.ts) |
| CURRENT FACT | Case surfaces and normalization: [`templateSurfaces.ts`](../src/caseInsert/templateSurfaces.ts), [`normalization.ts`](../src/caseInsert/normalization.ts) |
| CURRENT FACT | Built-in asset routing: [`assetManifest.ts`](../src/assets/assetManifest.ts) |
| CURRENT FACT | Current data-URL/import behavior: [`projectAssetStatus.ts`](../src/project/projectAssetStatus.ts), [`importedImageAsset.ts`](../src/utils/importedImageAsset.ts), [`local_images.rs`](../src-tauri/src/commands/local_images.rs), [`steam.rs`](../src-tauri/src/commands/steam.rs) |
| CURRENT FACT | Current Save and two-phase Open adapters: [`appProjectSave.ts`](../src/app/appProjectSave.ts), [`appProjectLoad.ts`](../src/app/appProjectLoad.ts) |
| CURRENT FACT | Current native IPC and atomic byte writer: [`fileSystem.ts`](../src/tauri/fileSystem.ts), [`files.rs`](../src-tauri/src/commands/files.rs), [`project_file.rs`](../src-tauri/src/project_file.rs) |
| CURRENT FACT | Current dependency declarations: [`package.json`](../package.json), [`Cargo.toml`](../src-tauri/Cargo.toml) |

### Document and issue evidence

| Claim | Evidence |
| --- | --- |
| CURRENT FACT | Current schema authority: [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) |
| TARGET REQUIREMENT | Lifecycle/session/atomic command invariants: [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) |
| CURRENT FACT / TARGET REQUIREMENT | As-built boundaries and documented future package status: [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md) |
| CURRENT FACT | Historical package choice and rationale: [`PROJECT_PACKAGE_FORMAT_DECISION.md`](PROJECT_PACKAGE_FORMAT_DECISION.md), [issue #56](https://github.com/thelordofdino4/steam-backup-label-studio/issues/56) |
| CURRENT FACT | Schema work: [issue #48](https://github.com/thelordofdino4/steam-backup-label-studio/issues/48) |
| CURRENT FACT / TARGET REQUIREMENT | Lifecycle implementation parent: [issue #308](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308) |
| CURRENT FACT / TARGET REQUIREMENT | Atomic persistence issue and implementation: [issue #312](https://github.com/thelordofdino4/steam-backup-label-studio/issues/312), [PR #317](https://github.com/thelordofdino4/steam-backup-label-studio/pull/317) |
| CURRENT FACT | Two-phase Open integration: [PR #320](https://github.com/thelordofdino4/steam-backup-label-studio/pull/320) |
| TARGET REQUIREMENT | ZIP record vocabulary and method/flag/version semantics: [PKWARE ZIP Application Note](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT) |
| TARGET REQUIREMENT | Binding pointer syntax: [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901) |
| TARGET REQUIREMENT | Canonical writer JSON: [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) |

**CURRENT FACT.** Evidence review was static and documentation-focused. No build,
lint, application tests, browser automation, screenshot, or native Tauri runtime
verification was performed or is claimed by this contract task.
