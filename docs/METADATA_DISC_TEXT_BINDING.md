# Metadata-Bound Disc Text

Last refreshed: 2026-05-31.

The disc text system keeps the flexible Text panel controls, but rendered text elements can resolve obvious Game metadata fields before preview/export rendering.

The source of truth is `src/project/metadataDiscText.ts`.

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

The Text panel exposes a "Use Game metadata value" action for manual overrides where appropriate.

## Preview/Export Parity

Both live preview and PNG export resolve through `src/project/metadataDiscText.ts`, so metadata-bound text should match between what the user sees and the exported PNG.

If future text elements bind to metadata, add the mapping in `src/project/metadataDiscText.ts`, update save/load normalization if needed, and update this document.
