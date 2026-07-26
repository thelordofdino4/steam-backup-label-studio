# Metadata-Bound Disc Text
> Status: Conditional disc metadata text reference.
> Purpose: Metadata-bound disc text defaults and fallback semantics.
> Read when: Disc text metadata/default-source behavior or mapping accepted Game workflow metadata into Disc text.
> Authoritative source: This document for Disc metadata binding; the Game workflow contract owns search/discovery/application semantics; the Disc Layout Preset workflow contract owns whether an accepted bound-content change participates in an attached preset assignment; TEXT_EDITOR_CONTRACT.md owns text editing and fitting.
> Last reviewed against commit: `408bd68f2a13998a54e14c72930628993c5cdcfb`.


Last refreshed: 2026-05-31.

The disc text system keeps the flexible Text panel controls, but rendered text elements can resolve obvious Game metadata fields before preview/export rendering.

The source of truth is `src/project/metadataDiscText.ts`.

The draft target [`GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md`](GAME_SEARCH_IMPORT_AND_METADATA_WORKFLOW_CONTRACT.md)
owns how imported or discovered metadata is reviewed and atomically accepted.
After acceptance, this reference remains authoritative for how Disc text resolves
that canonical metadata and preserves manual overrides.

If a bound value changes while a future generic Disc preset configuration is
present, [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md)
decides whether the exact attached, uncustomized assignment may use a declared
focused refit response or must preserve customized placement pending reviewed
Reapply. Metadata binding never performs a full preset reapplication.

## Bound Fields

The following rendered text values use Game metadata when the text element is still set to its metadata/default source:

- Game title text uses `projectMetadata.title`.
- Subtitle / edition text uses `projectMetadata.subtitle`.
- Steam App ID text uses `projectMetadata.steamAppId`.
- Backup date text uses `projectMetadata.backupDate`.
- Disc number text derives from `projectMetadata.discNumber` and `projectMetadata.discTotal`.
- Developer text uses `projectMetadata.developer`.
- Publisher text uses `projectMetadata.publisher`.
- Install notes text uses `projectMetadata.installNotes`.
- Copyright/legal text uses `projectMetadata.copyrightText`.

`customNote` remains manual-only.

## Disc Number Formatting

Disc number text resolves as follows:

- `discNumber` and `discTotal`: `Disc X of Y`.
- `discNumber` only: `Disc X`.
- `discTotal` only: `Disc 1 of Y`.
- Neither field: fall back to the existing rendered disc text value.

## Manual Override Behavior

Metadata-backed text shows the Game metadata/default as input placeholder text until edited in the Text panel.

When a user types a non-empty value into a metadata-backed text input, that element switches to a manual override. Clearing the manual override returns that element to the Game metadata/default value.

The contextual ribbon Utilities `Source` card exposes a "Use Game metadata value" action for selected manual overrides where appropriate.

## Preview/Export Parity

Both live preview and PNG export resolve through `src/project/metadataDiscText.ts`, so metadata-bound text should match between what the user sees and the exported PNG.

If future text elements bind to metadata, add the mapping in `src/project/metadataDiscText.ts`, update save/load normalization if needed, and update this document.
