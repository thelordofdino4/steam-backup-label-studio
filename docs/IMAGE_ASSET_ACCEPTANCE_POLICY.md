# Image asset acceptance policy

Status: Implemented source policy for issue #358; native interaction acceptance remains required.
Related: roadmap #355, baseline #356, package save transport #357.

## Policy and ownership

Ordinary image imports preserve supported raster bytes. Unsupported formats and
unsupported JPEG/BMP profiles are rejected before image adoption, with guidance
to convert the source to PNG or choose another supported raster. SBLS does not
silently rasterize SVG, resize images, flatten transparency, or change animation.
`image/jpg` and MIME casing normalize to the canonical spelling; payload bytes do
not change. Existing package limits and format profiles remain authoritative in
[the package contract, section 9](PROJECT_PACKAGE_FORMAT_CONTRACT.md#9-mimeimage-validation-and-archive-security-budgets).

`utils/importedImageAsset.ts` is the shared adoption boundary for Disc and Case
uploads, Steam artwork, local screenshots/library cache, and web/logo candidates.
It validates first, then calls the existing browser decoder and active-pixel
inspection owner. Owners adopt its complete result only after success. Filename,
source URL/ID/label provenance, display-oriented dimensions, content bounds and
layout behavior stay with their existing owners. Encoded dimensions returned by
the codec do not replace display dimensions or active-pixel bounds.

`tauri/importedImageValidation.ts` sends one bounded raw UTF-8 data URL to the
read-only `validate_imported_image_asset` command. It accepts only a matching
structured success; unavailable validation never falls back to browser-only
acceptance. The command performs no network, path, file-write or lifecycle work.
`asset_validation.rs` reuses the package codec's canonical base64 parser, strict
signature/full structural decoders, JPEG/BMP profiles and per-image budgets.
The encoder shares the same error mapping. There is no second image decoder.

Local file reads reject files above 64 MiB before FileReader allocation. Raw
validation is capped at 89,478,511 bytes (one maximum canonical image URL).
Package-wide asset count, aggregate bytes/pixels, owner fan-out, metadata, archive
and save transport limits remain independent: accepting one image does not promise
that an arbitrarily large project fits every aggregate limit. This boundary is
not a whole-process/WebView memory measurement.

## Format matrix

| Input format | Ordinary upload/Steam/web/local import | Preview and PNG export after acceptance | Package Save and package Open |
| --- | --- | --- | --- |
| PNG / APNG | Exact bytes after package PNG validation and budgets | Existing browser decode and canvas rendering; alpha/content bounds unchanged | Exact validated bytes; APNG frame/pixel budgets retained |
| JPEG (`image/jpeg`, import alias `image/jpg`) | Exact bytes, existing bounded supported JPEG profiles only | Existing browser display orientation and image sizing | Exact bytes; canonical MIME `image/jpeg`; package profiles unchanged |
| WebP | Exact bytes, static/animated package profiles and budgets | Existing browser/canvas frame behavior | Exact bytes; animation budgets retained |
| GIF | Exact bytes, package frame/pixel budgets | Existing browser/canvas frame behavior | Exact bytes; animation budgets retained |
| BMP | Exact bytes, closed Windows BMP v1 subprofile | Existing browser decode/content bounds | Exact bytes; unsupported BMP profiles fail before ordinary adoption |
| User SVG, including passive SVG | Rejected before browser decoding/adoption; convert externally to PNG | No newly imported SVG is rendered | Project-owned SVG remains unsupported |
| AVIF, TIFF, ICO, HTML/XML, other types | Rejected before adoption | No newly imported unsupported payload is rendered | Unsupported by package v1 |
| Declared raster with mismatched signature, malformed/truncated bytes, unsupported profile or exceeded image budget | Rejected by the existing codec before browser decoding/adoption | Previous accepted image remains | Same package rejection rules; no relaxed validators |

Animated formats retain their bytes. This issue does not establish a deterministic
animation frame-selection policy for preview versus exported still PNGs.

## Ingress matrix and compatibility exceptions

| Ingress | Owner and acceptance behavior | Persistence behavior |
| --- | --- | --- |
| Disc uploads: background, title, additional artwork, developer/publisher/additional logos, banner, ratings, media/platform/technical marks | `imageFile.ts` bounds the file read; `importedImageAsset.ts` validates before decode/adoption | Supported exact raster data URLs; picker hints use the same MIME families |
| Case uploads: cover, tray, both spines, titles, artwork/logos/marks and banner lockups | `imageSlotSourceImport.ts` delegates to the same importer | Same policy, including retained disabled assets |
| Steam artwork and automatic title/logo seeding | Downloads feed the shared importer; format rejection retains existing title/default/placement | Existing source provenance retained on successful adoption |
| Local screenshots/library cache | Native `local_images.rs` identifies the five raster families; adoption still uses shared validation | Exact bytes validated again at package Save/Open |
| Web artwork and official/Steam logo candidates | Existing download/URL policy, then shared image validation; candidate thumbnails are discovery UI, not adopted project assets | Existing source provenance retained; no new URL-fetch path |
| Legacy project Open | Existing parse/migrate/restore pipeline remains compatible; registered unsupported image MIME types add a visible conversion warning to Open's result | Original legacy file remains protected. Replace unsupported images before package conversion; Save failure repeats actionable guidance and leaves session/path/baseline intact |
| Package Open | Existing Rust package decoder validates every bound raster before hydration/staging | All current package checks and aggregate lifecycle adoption remain unchanged |
| Qualified built-ins, including app-owned SVG marks/logos/banners | Existing closed compatibility registry and reconstruction; not ordinary upload input | Reconstructible built-in bytes may be omitted by package projection. A custom data URL cannot claim this exception |
| Generated SVG text/guide/render artifacts | Existing SVG/canvas renderer adapters; not adopted project-owned image payloads | Persist their existing semantic settings; render to PNG on export. No generic generated-SVG upload exception |

SVG active content is never enabled by this change. New ordinary SVG imports are
rejected even if apparently passive. Qualified built-ins remain app-controlled.
Legacy Open is explicitly a compatibility exception, not a claim that the target
passive-SVG validator described in package contract section 10 has been newly
implemented. No SVG parser/runtime, sanitizer, external-resource support or
legacy blanket-reject policy is added here.

The checked-in `full-branding.sbls.json` fixture still stages with its original SVG
bytes. Its Open result now says conversion is blocked and how to replace the
images. The warning uses the same registered owner traversal as package Save,
including disabled remembered images; data-looking ordinary metadata strings do
not trigger it. Source files and project state are never rewritten by the warning.

Default Disc no-rating settings also classify as no accepted image, matching the
Rust registry. A settings object alone is not evidence of a missing custom image;
retained custom data or custom dimensions still require the normal asset path.

## Validation and remaining native acceptance

Behavioral tests cover import rejection before decode/adoption, original-image
preservation, exact MIME alias/byte handling, active-pixel inspection ownership,
file-size preflight, unavailable/malformed native responses, retained Case assets,
legacy SVG fixture staging and conversion feedback, and Steam title fallback.
Rust tests exercise the raw command and an independent real-image catalog through
both import validation and complete Disc/Case package round trips for all five
families. Rejected vector/unknown types, spoofed PNG, truncated rasters and
unsupported JPEG/BMP profiles use the same stable codec failures.

Native GUI testing remains required to verify actual file pickers, upload errors,
Steam/web/local adoption, disabled-state preservation, preview/export appearance
and package Save/Open through WebView IPC. Headless tests and builds do not prove
native interaction acceptance or process-memory behavior.
