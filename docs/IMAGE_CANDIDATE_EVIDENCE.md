# Image candidate dimension evidence

> Status: Focused implementation reference for issue #169.
> Owner: `src/editor/imageCandidateRanking.ts`; source adapters remain in `src/components/editor/editorImageSourcePickerItems.ts`.

Candidate dimensions describe evidence available before import. They do not certify
physical print quality or successful image decoding.

- **Measured:** positive safe-integer dimensions explicitly identified by a caller
  as decoded source pixels. The picker says `Measured dimensions`; the existing
  target-profile assessment is labeled `Print quality estimate`. Measuring pixels
  does not measure physical-slot DPI, print output or image sharpness.
- **Estimated:** valid numeric dimensions from Steam kind defaults, labels, URLs,
  HTML attributes or other discovery metadata. Unspecified provenance defaults to
  this state. Dimensions and aspect are labeled estimated, the badge is neutral
  `Resolution estimated`, and print quality is unverified. Discovery reasons that
  depend on dimensions also identify estimates.
- **Unknown:** absent, incomplete, nonpositive, fractional, nonfinite or unsafe
  integer dimensions. A measured/estimated claim cannot promote invalid values.
  Raster candidates remain neutral with `Resolution unknown`.

Steam and web discovery currently supply estimates, not measured pixel evidence.
Local screenshots currently supply no dimension evidence. No adapter decodes or
fetches extra images to manufacture measurements. Vector candidates without pixel
metadata retain the existing format-based logo suitability behavior; that is not
measured raster resolution or an import-format acceptance guarantee.

The existing target profiles, numerical ranking weights, stable tie ordering,
selected candidate IDs, preview URLs, source switching and import owners remain
unchanged. This evidence is ephemeral picker data; it adds no project schema field.

Tests call the production ranking owner, Steam/local/web adapters and HTML discovery
pipeline. They cover all three evidence states, invalid inputs, metadata provenance,
unchanged score fixtures, stable ordering and import identity. Native picker display,
source switching and import acceptance still require native verification. Broader
physical-destination/DPI assessment remains part of #169, outside this label repair.
