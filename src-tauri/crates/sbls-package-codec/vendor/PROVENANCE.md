# Pinned native codec provenance

Retrieved and verified on 2026-07-27 for the runtime-disconnected
`sbls-package-codec` crate. These archives are source inputs, not prebuilt
libraries. The build verifies their digests, extracts into Cargo `OUT_DIR`, and
compiles the decoder-only file lists in `build.rs` with the checked-in SBLS
overlays. System-installed codecs are never discovered or substituted.

## libjpeg-turbo

| Field | Value |
| --- | --- |
| Upstream project | `https://github.com/libjpeg-turbo/libjpeg-turbo` |
| Release/tag | `3.1.4.1` |
| Tag commit | `9217719d3a58633923b096af4c1d50d304768a64` |
| Official archive | `https://github.com/libjpeg-turbo/libjpeg-turbo/releases/download/3.1.4.1/libjpeg-turbo-3.1.4.1.tar.gz` |
| Vendored archive | `vendor/upstream/libjpeg-turbo-3.1.4.1.tar.gz` |
| SHA-256 | `ecae8008e2cc9ade2f2c1bb9d5e6d4fb73e7c433866a056bd82980741571a022` |
| Archive root | `libjpeg-turbo-3.1.4.1/` |
| Licenses | IJG license for the libjpeg API sources; Modified BSD for project/build-system code; SIMD zlib code is not compiled |
| Checked-in notices | `vendor/LICENSES/libjpeg-turbo-LICENSE.md`, `vendor/LICENSES/libjpeg-turbo-README.ijg` |

The source archive's published digest is also displayed on the upstream GitHub
release. The decoder uses the classic libjpeg API only; TurboJPEG, SIMD,
compression, tools, file adapters, arithmetic coding, 12/16-bit wrappers, and
transcode helpers are excluded from the build. A package-owned guard
translation unit terminates any unreachable 12/16-bit controller branch through
the contained libjpeg error frame instead of linking those wrapper
implementations. The package JPEG configuration defines `NO_GETENV`, so
libjpeg-turbo cannot consult `JPEGMEM` or any other process environment value.
The package-private validation ABI entropy-decodes native-decodable 8-bit
Huffman SOF0/SOF1/SOF2 streams before returning a v1 profile rejection, so
unsupported component or sampling layouts cannot hide corrupt entropy. The
excluded arithmetic, lossless, hierarchical, differential, and 12/16-bit paths
remain bounded structural-validation cases and are never entered through the
vendored decoder.

Required product attribution: **This software is based in part on the work of
the Independent JPEG Group.**

## libwebp

| Field | Value |
| --- | --- |
| Upstream project | `https://chromium.googlesource.com/webm/libwebp` |
| Release/tag | `v1.6.0` |
| Annotated tag object | `b7e29b9d75bd31422b00c2a446d49d7af06c328d` |
| Tagged commit | `4fa21912338357f89e4fd51cf2368325b59e9bd9` |
| Official archive | `https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.6.0.tar.gz` |
| Vendored archive | `vendor/upstream/libwebp-1.6.0.tar.gz` |
| SHA-256 | `e4ab7009bf0629fd11982d4c2aa83964cf244cffba7347ecd39019a9e38c4564` |
| Archive root | `libwebp-1.6.0/` |
| License | Modified BSD (3-clause) plus the upstream patent grant |
| Checked-in notices | `vendor/LICENSES/libwebp-COPYING`, `vendor/LICENSES/libwebp-PATENTS` |

The tag object and tagged commit are recorded by the official Gitiles tag page.
The build contains generic single-threaded decoder, DSP, and utility sources
only. Encoders, mux/demux convenience libraries, compositing APIs, tools,
examples, platform SIMD, and native worker threads are excluded. The checked-in
minimal `HAVE_CONFIG_H` input and verified `src/dsp/cpu.h` overlay suppress both
compiler-based and target-based SSE, AVX, NEON, and MIPS auto-detection when
`SBLS_WEBP_GENERIC_ONLY=1`, including MSVC ARM, ARM64, and ARM64EC paths that
would otherwise re-enable NEON after command-line undefines. A package-owned
immutable synchronous worker adapter replaces upstream `thread_utils.c`; no
worker setter, OS thread API, or heap-backed worker object is linked.

## Verified overlays and build boundary

| Source input | Pristine SHA-256 | Compiled overlay SHA-256 | Review patch SHA-256 |
| --- | --- | --- | --- |
| `libjpeg-turbo-3.1.4.1/src/jmemnobs.c` | `328ff841f437fa7c2de846c4e295e9145cc628b9041aed718a06eb087c55786c` | `vendor/overlays/libjpeg-turbo/src/jmemnobs.c` — `4670e58975779b5a423ac6a796d8d22e162aab3e5cb7725e806ff3054f55e4c8` | `vendor/patches/0001-libjpeg-turbo-operation-ledger.patch` — `afedbb8b44eb9594f3aa05adac3c3c84032c7a14100e64b0ef84768e5ab272f3` |
| `libwebp-1.6.0/src/utils/utils.c` | `c8d90b4ccd536136ac710321c2632912a1f6ee2492a423e14ab9deb159490a56` | `vendor/overlays/libwebp/src/utils/utils.c` — `31e838dba1b69e2ef0de0df455298a12cedaf75bec33ab54658db4819a7a1469` | `vendor/patches/0002-libwebp-operation-ledger.patch` — `419bc50edfb90dda1db4194fa06ff1b2ccdf1ea3add06556a6786be744a4a0cf` |
| `libwebp-1.6.0/src/dsp/cpu.h` | `272cb2a8aa81d6355afecdea7ea344c90c2df58e6f51e01aa8bc4bf866d0be59` | `vendor/overlays/libwebp/src/dsp/cpu.h` — `8f077d3bb09747cd796aa94b2be789d04a881a116b044a579ce4fed0d710d369` | `vendor/patches/0003-libwebp-generic-c-only.patch` — `7dda5f0cd8ab1555471f0bdaebeecd6bd8e5754d94cfaf67d77b74e9c3f52c56` |

`build.rs` verifies all nine source/overlay/patch digests before compilation.
`vendor/.gitattributes` fixes all hashed text inputs to LF and treats the
archives as binary, so Git line-ending conversion cannot change a pinned digest
between Windows and Unix checkouts.
Package-owned C is first compiled under warnings-as-errors (`/W4 /WX /sdl` on
the exercised MSVC target; the `cc` crate's warning and error settings on
GCC/Clang), then compiled with the audited upstream units into one static
archive to avoid cross-platform cyclic-archive ordering. The crate is not
published. The root `LICENSE` contains MIT text, while the root `README.md`
says a license has not been chosen and the application manifest leaves its
license empty; this vendoring record does not resolve that repository-level
conflict. The child crate manifest currently declares
`MIT AND BSD-3-Clause AND IJG`. The checked-in BSD/IJG notices remain the
authoritative upstream license and attribution text for compiled vendored
sources.

The Rust module consumes only the package validation/ledger ABI. The private
static archive necessarily retains additional internal link symbols from the
selected libjpeg/libwebp units and deterministic test probes. On GNU/Clang,
`WEBP_EXTERN=extern` plus hidden visibility prevents upstream declarations from
requesting default dynamic visibility; MSVC static linking uses no DLL export
directive. These controls do not rename or localize the archive's internal
static-link symbol names, so this document does not characterize the complete
archive namespace as validation-only.

Windows x64 compilation is directly exercised for this checkpoint. The
Windows ARM/ARM64/ARM64EC and normal macOS/Linux behavior described here is
established from the checked-in preprocessor/configuration path; an actual
cross-target build matrix remains required before claiming those targets were
compiled.

## Reproduction commands

Run from the codec crate's `vendor/upstream` directory. These commands download
new temporary files for comparison; they do not authorize replacing the pinned
archives without review and updating every digest/overlay check.

```powershell
Invoke-WebRequest `
  -Uri 'https://github.com/libjpeg-turbo/libjpeg-turbo/releases/download/3.1.4.1/libjpeg-turbo-3.1.4.1.tar.gz' `
  -OutFile 'libjpeg-turbo-3.1.4.1.comparison-download.tar.gz'
Get-FileHash -Algorithm SHA256 -LiteralPath 'libjpeg-turbo-3.1.4.1.comparison-download.tar.gz'
git ls-remote 'https://github.com/libjpeg-turbo/libjpeg-turbo.git' 'refs/tags/3.1.4.1' 'refs/tags/3.1.4.1^{}'

Invoke-WebRequest `
  -Uri 'https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.6.0.tar.gz' `
  -OutFile 'libwebp-1.6.0.comparison-download.tar.gz'
Get-FileHash -Algorithm SHA256 -LiteralPath 'libwebp-1.6.0.comparison-download.tar.gz'
git ls-remote 'https://chromium.googlesource.com/webm/libwebp' 'refs/tags/v1.6.0' 'refs/tags/v1.6.0^{}'
```

See [`patches/PATCHES.md`](patches/PATCHES.md) for the allocation-overlay audit,
compiled exclusions, fatal-error containment, and cleanup invariants.
