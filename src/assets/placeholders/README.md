# Placeholder Assets

This folder contains true temporary or generic fallback visuals used by the disc
editor. Files that no longer have `placeholder` in the filename should live in
the domain folders under `src/assets/`, not here.

The saved-project source value may still be `placeholder` for compatibility,
even when the actual built-in file is now an official replacement asset outside
this folder.

Current placeholder subfolders:

- `logos/` - developer and publisher fallback logo artwork.
- `rating/` - custom rating badge fallback artwork.
- `technical/` - technical/audio/codec/middleware fallback mark artwork.

Update `src/assets/assetManifest.ts` when changing filenames or extensions.
The rest of the editor should reference built-in assets through that manifest
instead of importing asset files directly.

The SVG and PNG files that remain in this folder are replaceable starter or
fallback artwork, not final release-cleared art. Verify source licensing and
trademark suitability before release packaging.
