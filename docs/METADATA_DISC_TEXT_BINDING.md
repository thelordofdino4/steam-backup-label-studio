# Metadata-bound Disc Text

The disc text system keeps the existing flexible Text panel controls, but several rendered text elements now resolve obvious Game metadata fields before preview/export rendering.

## Bound fields

The following rendered text values use Game metadata when the metadata value is present:

- Steam App ID text uses `projectMetadata.steamAppId`.
- Backup date text uses `projectMetadata.backupDate`.
- Disc number text derives from `projectMetadata.discNumber` and `projectMetadata.discTotal`.
- Copyright/legal text uses `projectMetadata.copyrightText`.

## Disc number formatting

Disc number text resolves as follows:

- `discNumber` and `discTotal`: `Disc X of Y`.
- `discNumber` only: `Disc X`.
- `discTotal` only: `Disc 1 of Y`.
- Neither field: fall back to the existing rendered disc text value.

## Fallback behavior

If a metadata field is blank, the existing rendered text value is used. This preserves existing saved project behavior and keeps the current Text panel useful for manual labels.

This is intentionally not a full text-system rewrite. Subtitle, edition, install notes, developer text, and publisher text remain covered by existing manual/custom text behavior until a later design decision adds dedicated rendered elements or presets.

## Preview/export parity

Both live preview and PNG export resolve through `src/project/metadataDiscText.ts`, so metadata-bound text should match between what the user sees and the exported PNG.
