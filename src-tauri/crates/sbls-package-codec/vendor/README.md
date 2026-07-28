# Vendored native codec sources

This directory contains pinned, pristine upstream source archives and the
small audited overlay/patch set used by the runtime-disconnected package codec.
Exact versions, archive digests, licenses, and patch rationale are documented
in `PROVENANCE.md`. Build scripts never consult system-installed JPEG or WebP
libraries.

- [`PROVENANCE.md`](PROVENANCE.md) records release URLs, commits, archive
  hashes, reproduction commands, and the exact decoder-only boundary.
- [`LICENSES/`](LICENSES/) contains the required upstream license and patent
  notices. This software is based in part on the work of the Independent JPEG
  Group.
- [`patches/PATCHES.md`](patches/PATCHES.md) explains the two allocation-ledger
  translation-unit overlays, the generic-only libwebp CPU-header overlay, and
  deterministic cleanup/fatal-containment rules.
- [`overlays/`](overlays/) contains the only substituted upstream source inputs.
  Their digests and the pristine originals' digests are enforced by the crate
  build.
