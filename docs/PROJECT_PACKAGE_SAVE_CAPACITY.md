# Project package save capacity

Status: Implementation, source validation, and bounded Windows debug native
WebView/IPC and representative memory receipts are recorded for #357. Final
publication and CI verification remain pending. Broader maximum-envelope and
cross-platform memory activation gates remain open under
[the package contract](PROJECT_PACKAGE_FORMAT_CONTRACT.md), which owns
package-format policy.

## Boundary and compatibility

Four references to a valid 1024 x 1024, 24-bit BI_RGB bitmap reproduce the former
boundary. The bitmap is 3,145,782 bytes; its canonical data URL is 4,194,398 ASCII
bytes. The four strings alone occupy 16,777,592 bytes, before JSON metadata.
The codec admits and reopens both normalized Disc and Case fixtures as one
asset with four bindings. The old `SBLSPSV1` request rejects their hydrated JSON
at 16,777,216 bytes. The `SBLSPSV2` native command writes byte-for-byte identical
package output using one borrowed image payload. The fixtures include retained
disabled artwork and built-in compatibility decisions.

The package format, schema, raster allowlist, legacy conversion, and atomic
writer are unchanged. Native code still accepts strict V1 requests, with their
original bounds. New saves use V2. This does not impose a new reject-on-Open
policy or resolve the image-format decisions in #358.

## Reconciled limits

| Boundary | Exact bound | V2 treatment |
| --- | ---: | --- |
| Raw archive and total uncompressed entries | 268,435,456 bytes each | Unchanged codec checks |
| Individual encoded image | 67,108,864 bytes | Unchanged canonical URL decoder and asset staging checks |
| Externalized project metadata | 16,777,216 bytes | Separate request span; codec checks its canonical output independently |
| Manifest / capture-plan JSON | 2,097,152 bytes each | Separate independent limits |
| Unique assets / bindings | 512 / 4,096 | Pool has at most 512 entries; complete closed capture plan and codec binding limits remain authoritative |
| One hydrated data URL | 89,478,511 bytes | Checked before request allocation and again natively / in the codec |
| Hydrated data-URL fan-out | 268,435,456 bytes | Repeated owners count repeatedly even when transport and package bytes deduplicate |
| Pool of unique data URLs | 268,435,456 bytes | Cannot exceed the fan-out envelope; native parser checks the aggregate separately |
| All hydrated strings | 536,870,912 UTF-8 bytes and 268,435,456 UTF-16 code units | Both codec counters remain independent of byte deduplication |
| Ordinary JSON string | 1,048,576 bytes | Unchanged; arbitrary asset-looking properties get no registry exemption |
| Direct hydrated-source parser envelope | 536,870,912 input bytes | Existing borrowed/owned encoder unchanged; V2 parses metadata only, not the image pool |
| Retained JSON parse graph phase ledger | 536,870,912 bytes | Unchanged; this is not a whole-process cap |
| Decoded samples | 268,435,456 per asset / 536,870,912 aggregate | Unchanged; exact duplicate assets decode once |
| Native raster working ledger | 536,870,912 bytes | Unchanged; one active raster validator per operation |
| Hydrated read response static transport ceiling | 671,096,832 bytes | Unchanged; decoder still applies tighter operation-specific output preflight |
| V1 complete request | 18,874,384 bytes | Retained only for V1 compatibility |
| V2 complete request | 287,311,892 bytes | 20-byte header + plan + metadata + at most 512 four-byte pool lengths + bounded pool |

The read response ceiling includes conservative canonical number expansion;
it is not an image or metadata allowance. Save serializes normalized JavaScript
metadata separately from registered assets. The codec still rejects candidates
whose canonical metadata exceeds the package metadata limit. V2 removes the
smaller *hydrated-image transport* ceiling; it does not promise that arbitrary
legacy JSON outside package metadata or image policy becomes saveable.

## Raw V2 framing

All lengths and indices are unsigned big-endian 32-bit integers. The body is:

1. Eight ASCII magic bytes `SBLSPSV2`.
2. Plan byte length, metadata byte length, and unique data-URL count.
3. Exact UTF-8 plan JSON, then exact UTF-8 metadata JSON.
4. For each pool entry, its byte length followed by its exact UTF-8 string bytes.

The plan has version 2. A project-owned capture uses
`{kind:"project-owned-data-url-part",dataUrlIndex:N}`. Other capture kinds retain
their existing meaning. V1 uses version 1 and the original index-free
`project-owned-data-url` decision. The native adapter rejects cross-version
decisions, unknown fields, invalid indices, missing/unused entries, invalid
UTF-8, truncated spans, trailing bytes, and overflowing or oversized lengths.

The existing TypeScript closed owner walk supplies leaf locations and capture
decisions. Only those leaves can be projected to null; equal strings in ordinary
metadata remain ordinary metadata. The provided plan must match the same
immutable snapshot. Qualified built-in leaf omission is checked against that
walk and remains validated by the Rust compatibility registry.

The pure codec's `encode_project_package_from_parts` adapter requires exactly
one owner-addressed payload for every project-owned capture and a null leaf at
each registered metadata location. Missing, duplicate, extra, wrong-owner, or
inline substitutions fail. All payloads then pass through the existing canonical
data-URL decoder, raster validation, exact-byte deduplication, binding accounting,
projection, manifest, and archive writer. `CapturedBytes` remains built-in-only.

There is no asset-handle registry, temporary asset store, fetch, editor mutation,
JSON numeric byte array, or extra binary-to-base64 conversion. The pool carries
the data URLs already held by the normalized editor snapshot. The command still
returns only structured success/failure; package output never enters TypeScript.

## Allocation and lifetime analysis

Previously, save first created a full hydrated JSON string, including one copy
of each repeated image reference, then encoded it into a full raw request. Rust
parsed those strings into its operation-owned JSON graph before extracting the
assets. Raising the old 16 MiB constant would retain that multiplicative path.

V2 builds a metadata string and a small plan, while its pool holds references to
existing image strings. It measures all spans before allocating one final raw
request and writes directly into that buffer with `TextEncoder.encodeInto`.
It never creates intermediate image byte arrays or a hydrated JSON serialization.
The native parser borrows pool slices from the request; its owner/payload table
contains references, not string copies. The codec parses only metadata and
decodes assets sequentially through the existing bounded staging path.

For the repeated-bitmap regression, the request is below 4,300,000 bytes instead
of more than 16,777,592 bytes. Four bindings borrow the same native span. A
separate compact-budget test proves two references to one 1-pixel BMP consume
one pixel / four decoded sample bytes, while charging both URL bindings and both
UTF-8/UTF-16 hydrated-string totals.

This is a source-level allocation/lifetime argument and executed buffer-size
evidence, **not a measured whole-process memory envelope**. The editor snapshot,
metadata/plan strings, final request, WebView/IPC copies, native metadata graph,
active raster working memory, staged encoded assets, and final archive can
overlap. Neither existing 512 MiB phase ledger accounts for all those lifetimes.
The maximum admitted raw request is larger, and actual Windows WebView/IPC copy
behavior and representative peak RSS have not been measured. Native GUI and
memory acceptance remain gates before calling #357 complete. Browser-only or
headless tests do not satisfy that gate.

## Validation and remaining observations

- Shared, path-independent normalized Disc/Case fixtures exercise codec
  admission, old framing rejection, native atomic replacement, decode, and
  byte-identical package output.
- Compact `PackageLimits` tests independently exercise encoded asset size,
  unique assets, binding count, individual URL size, fan-out, UTF-8, UTF-16,
  metadata, archive, uncompressed aggregate, and raster aggregate limits.
- Malformed V2 requests and codec failure preserve the destination and legacy
  source. Existing V1, default built-in, conversion, and atomic-write suites
  remain in the workspace test gate.
- Save lifecycle tests preserve snapshot R as the clean baseline while an edit
  at R+1 remains current and dirty. Capacity rejection preserves the session and
  gives recovery guidance.
- Historical observation (2026-11-01): the first factory-derived Disc fixture
  exposed a separate `disc.rating.custom` unsupported decision for the unrated
  default. The capacity fixture still selects the supported ESRB T metadata state.
  The #307 integration through PR #409 subsequently resolved that default-save
  defect: the capture planner checks `rating?.customImageSize` as accepted
  evidence, not the empty rating settings object. The focused regression and
  native blank-Disc save/reopen receipt are recorded in `SOFTWARE_NAVIGATION.md`.
  This correction does not complete the broader asset-policy work in #358 or
  the capacity native and memory acceptance gates for #357.

Full source checks and any later native acceptance must be recorded with their
actual results; this document does not imply an unperformed GUI test passed.


## Executed automated checks (2026-11-01)

- `npm test`: passed; 2,390 Node tests, 82 Windows application tests, and
  243 codec tests, zero failures. This includes existing V1, legacy, built-in,
  atomic-write, disabled-state, and save-revision behavior.
- `npm run lint`, `npm run check:cycles`, and `npm run build`: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml --workspace --locked`: passed.
- `git diff --check`: passed.

These are source and native headless test results. No native GUI launch,
WebView/IPC peak-memory measurement, packaged-platform test, or visual acceptance
was performed. The issue remains open for those required gates and integration.

## Windows primary native receipt (2026-11-15 UTC)

The earlier unperformed-native statements above describe the 2026-11-01
checkpoint. The following later receipt covers Windows debug execution only.
Primary `b739cce325604d32c5758b2843cdcea25dc73cf5` preserves the local Case
commits and integrates capacity with #307. The native tester reported successful
legacy load, Save As to a new `.sbls`, package reopen, and repeat Save for both
bounded fixtures. No native navigation failure occurred. Original legacy JSON
files remained unchanged. This is representative acceptance, not a worst-case
memory envelope, release-build measurement, or cross-platform claim.

| Evidence | Disc | Case |
| --- | ---: | ---: |
| Legacy hydrated JSON bytes | 16,786,232 | 16,806,572 |
| V2 request bytes from production helper | 4,204,823 | 4,224,994 |
| Native saved package bytes | 3,156,071 | 3,176,522 |
| Exact BMP assets / registered bindings | 1 / 4 | 1 / 4 |

Native package SHA-256:
- Disc: `2d786d76132cdcbb5ca49de4b1169610fbce9a8c2e11e1595e27dc6c6ef52d46`.
- Case: `5b1b6474fd287f9bdb3dd25cca3fcc8e249c6f09694f1a698eb96bec0138c507`.

Each package retained the exact 3,145,782-byte BMP with SHA-256
`852b27f8d01fd6fda67512989e20e14679b73d65c9fdadaf9d21b84e09b22d7b`.
Disc disabled title/additional-artwork state survived; Case retained the four
background owners. Package inspection confirmed deduplication and all bindings.

Source checks: isolated integration `49b7d870` passed 2,422 Node and 325 Rust
(82 application + 243 codec) tests, build, lint, cycles, discovery, locked Cargo
check, and diff-check. Refresh `756678ac` has the identical source tree. Primary
`b739cce3` passed 2,505 Node tests, build, lint, cycles (963 files), discovery
(3/3), and diff-check, with zero failed/cancelled/skipped/todo tests. Primary
Rust content exactly matched the 325-test isolated tree; this is source identity
evidence, not a new primary Rust test run.

### Representative native process-tree memory

Sampling covered the verified native app and six WebView descendants, the same
seven members throughout. The Disc-only interval was 03:20:54.5257862 through
03:23:27.2495562 UTC; the Case interval was 03:23:27.2495562 through
03:28:27.5976369 UTC. The first recorder continued into Case testing, so its full
run is not attributed to Disc: Disc statistics stop exactly at Case start.

| Measurement (MiB) | Disc-only | Case |
| --- | ---: | ---: |
| Peak simultaneous-sample private bytes | 567.762 | 590.191 |
| Peak simultaneous-sample summed working set | 679.246 | 769.086 |
| First 10 seconds mean private bytes | 312.350 | 395.892 |
| First 10 seconds mean summed working set | 488.492 | 591.711 |
| Final 10 seconds mean private bytes | 360.600 | 422.162 |
| Final 10 seconds mean summed working set | 584.849 | 645.938 |
| Complete samples / interval samples | 301 / 301 | 590 / 590 |
| Maximum observed sampling gap (milliseconds) | 564.2 | 528.6 |

The Disc peaks both occurred at 03:21:17.9812058 UTC (595,341,312 private bytes;
712,241,152 summed working-set bytes). Case private bytes peaked at
03:25:00.3522718 UTC (618,860,544 bytes); its summed working set peaked at
03:24:59.8368682 UTC (806,445,056 bytes). The first-window means use 20 samples
per project. The final Disc window uses 20 pre-Case samples; the settled final
Case window uses 19 samples. Both full 300-second recorders produced 590 samples
rather than the nominal 600 because sampling includes collection/cadence time.
No incomplete samples or collection errors were reported. Package and original
legacy hashes were rechecked unchanged at 03:28:33 UTC.

These are sequential, near-simultaneous process-tree observations, not sums of
independent lifetime peaks. Summed working set can double-count shared pages;
private committed bytes are not RSS. Inter-sample peaks and short-lived processes
can be missed. These measurements are neither leak proof nor a worst-case memory
envelope. They support the tested bounded #357 regression on Windows debug only,
not release builds or other platforms. The broader format-contract activation
gates for maximum-envelope, whole-process memory and other-platform evidence
remain explicitly open. This receipt does not waive those gates or close #358.
