# Native codec overlay audit

The checked-in upstream archives are pristine. The crate build extracts them
only under Cargo `OUT_DIR`, verifies their SHA-256 digests, and compiles an
explicit decoder-only source list. It substitutes exactly two translation
units and one header with checked-in overlays:

| Upstream unit | Verified upstream SHA-256 | Compiled overlay and SHA-256 | Reason |
| --- | --- | --- | --- |
| `libjpeg-turbo-3.1.4.1/src/jmemnobs.c` | `328ff841f437fa7c2de846c4e295e9145cc628b9041aed718a06eb087c55786c` | `vendor/overlays/libjpeg-turbo/src/jmemnobs.c` — `4670e58975779b5a423ac6a796d8d22e162aab3e5cb7725e806ff3054f55e4c8` | Route every small/large allocation and free through the active package operation and report only its remaining budget. Backing stores remain prohibited. |
| `libwebp-1.6.0/src/utils/utils.c` | `c8d90b4ccd536136ac710321c2632912a1f6ee2492a423e14ab9deb159490a56` | `vendor/overlays/libwebp/src/utils/utils.c` — `31e838dba1b69e2ef0de0df455298a12cedaf75bec33ab54658db4819a7a1469` | Route `WebPSafeMalloc`, `WebPSafeCalloc`, `WebPSafeFree`, `WebPMalloc`, and `WebPFree` through the same ledger; omit encoder/debug-only utility code. |
| `libwebp-1.6.0/src/dsp/cpu.h` | `272cb2a8aa81d6355afecdea7ea344c90c2df58e6f51e01aa8bc4bf866d0be59` | `vendor/overlays/libwebp/src/dsp/cpu.h` — `8f077d3bb09747cd796aa94b2be789d04a881a116b044a579ce4fed0d710d369` | Require `SBLS_WEBP_GENERIC_ONLY` before enabling SSE2, SSE4.1, AVX2, NEON, MIPS32/DSP, or MSA, then fail compilation if any platform/thread path is present. This closes the MSVC ARM/ARM64/ARM64EC and MIPS post-`-U` redefinition paths as well as ordinary compiler auto-detection. |

The `.patch` files in this directory show the security-significant source
changes in familiar unified-diff form. The overlays are the build inputs and
retain the upstream copyright/license headers. `build.rs` verifies both the
pristine source-unit digests and compiled overlay digests before invoking the C
compiler. The generic-only review patch is
`0003-libwebp-generic-c-only.patch` with SHA-256
`7dda5f0cd8ab1555471f0bdaebeecd6bd8e5754d94cfaf67d77b74e9c3f52c56`.
The vendor-local `.gitattributes` forces LF for hashed text inputs and binary
treatment for archives, preventing checkout conversion from invalidating these
byte-level pins.
No patch utility, CMake project, package manager, `pkg-config`,
system codec, or dynamic library participates in the build.

The only cleaned/extracted directory is the fixed
`$OUT_DIR/sbls-pinned-native-codecs` child. Before removal, `build.rs` rejects
files, symlinks, or a canonical path outside the canonical Cargo `OUT_DIR`.
Archive extraction accepts only relative normal-component regular-file and
directory entries plus non-materialized PAX metadata, and requires
`tar::Entry::unpack_in()` to confirm containment; links and special entries are
rejected.

Checked-in package-owned compile guards complete the decoder boundary:

- `native/src/jpeg_rejected_precision_guards.c` supplies only fatal guards for
  libjpeg-turbo 3.x's otherwise unresolved 12/16-bit controller references.
  The actual unsupported-precision wrappers are not compiled, and every guard
  routes through the same contained `setjmp`/`longjmp` frame.
- `native/config/libjpeg-turbo/jconfig.h` defines `NO_GETENV`; the compiled
  libjpeg memory manager cannot read `JPEGMEM`, invoke `getenv`/`getenv_s`, or
  perform environment-derived signed memory-limit arithmetic.
- `native/config/libwebp/src/webp/config.h`, selected by `HAVE_CONFIG_H`, leaves
  all SIMD and native-thread feature macros undefined. This prevents upstream
  compiler auto-detection from creating references to excluded platform
  objects. The verified `cpu.h` overlay additionally gates target-specific
  definitions that upstream would otherwise add later.
- `native/src/webp_single_thread_worker.c` supplies an immutable, synchronous
  `WebPGetWorkerInterface()`. The upstream `thread_utils.c` translation unit,
  its OS thread APIs, heap-backed worker implementation, and mutable
  `WebPSetWorkerInterface()` process-global hook are not compiled.

Package-owned C is compiled once under warnings-as-errors before the combined
archive is built. Windows uses `/W4 /WX /sdl`; warning C4324 is suppressed only
around the deliberately `jmp_buf`-aligned error structure. GCC/Clang use the
`cc` crate's warnings and warnings-into-errors configuration. Upstream units
retain warning suppression because warnings in pinned third-party code are not
owned here. The final linked copy remains a single archive to avoid cyclic
static-library ordering differences across MSVC, GNU, and Apple linkers.

## Ledger invariants

- The production hard ceiling is 536,870,912 bytes; a test may request a lower
  ceiling, never a higher one.
- Payload plus the platform ABI's exact `sizeof(SblsAllocationHeader)` charge
  is checked before `malloc`; multiply and addition overflow reject before
  allocation. Before `realloc`, the ledger conservatively precharges the full
  old allocation plus the complete replacement allocation, including both
  headers, because the system allocator may hold both blocks transiently. That
  old-plus-replacement total is rejected before `realloc` if it exceeds the
  ceiling and is included in peak accounting; only after success does live
  accounting become the replacement charge. Tests obtain the header charge
  through `sbls_codec_allocation_header_size()` instead of assuming a
  host-specific byte count.
- The allocation header is a fixed 64-byte union. On the supported 32/64-bit
  Windows, macOS, and Linux C ABIs, `malloc()` alignment is at most 16 bytes;
  advancing by 64 preserves that alignment for codec state, including the
  ledger-owned libjpeg decompressor/error context. A compile-time assertion and
  the ABI size query enforce the assumption.
- A process-wide atomic lease permits one active native validator. A TLS owner
  prevents nested or cross-operation allocation on that thread.
- Every allocation is linked to its operation. Codec destructors run first;
  operation finalization then drains any remaining node deterministically,
  clears the lease, and leaves zero live bytes. A residual node is an internal
  failure unless an allocation denial already requires the more-specific
  resource-limit result.
- Allocation rejection, CRT exhaustion, libjpeg backing-store demand, and
  libwebp `VP8_STATUS_OUT_OF_MEMORY` become the resource-limit status.
- JPEG fatal errors and warnings `longjmp` only to a `setjmp` in the same C
  wrapper frame. The decompressor, jump buffer, and error code live in one
  ledger-owned context allocated before `setjmp`; the unchanged local pointer
  is the only automatic value read after `longjmp`. No jump crosses Rust. All
  upstream `assert()` paths are removed by the decoder build's `NDEBUG`
  definition.

If allocator metadata has itself been corrupted, finalization stops traversal,
clears accounting/ownership, and returns an internal failure; it cannot promise
physical reclamation of an untrustworthy remainder. Ordinary success, typed
codec rejection, injected allocation denial, and decoder failure paths retain
valid metadata and are deterministically drained.

## Mechanical surface audit

The exact compiled source lists were searched after the worker and CPU-overlay
changes:

- Raw `malloc`, `realloc`, and `free` occur only in
  `native/src/allocation_ledger.c`; no compiled decoder source uses another CRT
  allocator, `alloca`, OS heap, memory map, or aligned allocator.
- Every compiled JPEG physical allocation terminates in the verified
  `jpeg_get_small`/`jpeg_get_large` overlay, and every release terminates in its
  paired free. Backing-store demand raises the contained codec error.
- Every compiled WebP allocation terminates in the verified
  `WebPSafeMalloc`/`WebPSafeCalloc`/`WebPFree` overlay. The validator's external
  RGBA buffer also uses the operation ledger.
- No native codec thread, worker heap, worker setter, file adapter, dynamic
  loader, process execution, or system-library discovery is compiled. The only
  upstream `abort()` occurrence is excluded by `BITTRACE=0`; libjpeg's default
  terminating error implementation is not compiled.
- JPEG's `longjmp` target remains in the same C wrapper frame and never crosses
  Rust. WebP has no nonlocal-jump path.

This checkpoint compiled on Windows x64. Generic behavior on Windows
ARM/ARM64/ARM64EC and on macOS/Linux is established by checked-in source and
configuration guards, not by an executed cross-target build matrix.

The Rust-consumed ABI is package-private and limited to validation, accounting,
and deterministic test probes. The private static archive also contains global
symbols from selected upstream objects and low-level ledger hooks. Unix hidden
visibility and `WEBP_EXTERN=extern` avoid default dynamic exports, and the MSVC
build creates no DLL exports, but neither control prefixes or localizes the
archive's static-link symbol namespace. Accordingly, the complete archive is
not described as a validation-only link namespace.

## Deliberately excluded upstream code

- libjpeg compression, TurboJPEG, tools, file source/destination adapters,
  arithmetic coding, 12/16-bit wrappers, ICC extraction helpers, coefficient
  transcode APIs, SIMD, and backing-store files;
- libwebp encoders, mux/demux convenience libraries, animation compositing,
  tools, examples, platform SIMD, upstream worker override hooks, and thread
  creation.

Animated WebP is parsed by the strict shim and each `ANMF` fragment is decoded
and released sequentially. The original encoded bytes are validation input
only; no transcoded bytes or native-owned decoded buffer cross the ABI.
