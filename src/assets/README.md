# Built-In Asset Layout

Built-in assets are organized by what they represent. Files without
`placeholder` in the filename are treated as official built-in replacement
assets for the current editor, even when project/source state still uses the
legacy `placeholder` source value for compatibility.

Current domain folders:

- `app-shell/` - editor shell UI assets such as panel toggles and non-disc artwork.
- `disc-number-badges/` - built-in disc-number badge artwork.
- `media-format/` - media marks such as Blu-ray, CD-ROM, DVD, data disc, and install disc.
- `operating-system/` - platform and operating-system marks, grouped by Linux, macOS, PC, SteamOS, and Windows.
- `rating/` - rating badge artwork, grouped by rating board.
- `scaffold/` - retained scaffold/source assets that are not part of the disc editor surface.
- `steam-banner/` - built-in Steam Backup banner lockup artwork.
- `toast-icons/` - preview toast status icons.
- `placeholders/` - true temporary or generic fallback files that still include `placeholder` in the filename.

Update `src/discPlaceholderAssets.ts` when changing filenames or extensions.
The rest of the editor should reference built-in assets through that manifest
instead of importing asset files directly.
