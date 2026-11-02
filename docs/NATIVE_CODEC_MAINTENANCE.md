# Native Codec Maintenance

> Status: Maintenance contract with an executed same-version rehearsal; release-artifact acceptance remains open under #377/#376.
> Purpose: Own native decoder provenance, update review, advisory mapping and toolchain evidence.
> Read when: Updating decoder archives, overlays, native shims, compiler configuration or release tooling.
> Authority: Build inputs remain owned by the codec crate's `build.rs`; this document defines the maintenance workflow, not a new decoder policy.
> Reviewed source baseline: `923f7b7fcbfa6569439e26ba049c265816a1db65`, 2026-11-01.

## Current inventory and ownership

The runtime-connected codec is [`sbls-package-codec`](../src-tauri/crates/sbls-package-codec/Cargo.toml). Native package commands in [`project_packages.rs`](../src-tauri/src/commands/project_packages.rs) invoke its encoder/decoder. The vendor intake documents' original runtime-disconnected checkpoint is historical, not the current runtime boundary.

| Decoder | Pinned source | License/notices | Local adaptation |
| --- | --- | --- | --- |
| libjpeg-turbo | Official 3.1.4.1 tarball; tag commit `9217719d3a58633923b096af4c1d50d304768a64` | IJG API-source terms and project BSD notice; checked-in LICENSE.md and README.ijg copies | `jmemnobs.c` allocation-ledger overlay; package JPEG validation/precision guards; decoder configuration |
| libwebp | Official 1.6.0 tarball; tagged commit `4fa21912338357f89e4fd51cf2368325b59e9bd9` | BSD COPYING and PATENTS notices | `utils.c` allocation-ledger overlay; `cpu.h` generic-only overlay; package validator/synchronous worker/configuration |

Exact archive/source/overlay/review-patch/license hashes are enforced in [`build.rs`](../src-tauri/crates/sbls-package-codec/build.rs) and inventoried in [`vendor/PROVENANCE.md`](../src-tauri/crates/sbls-package-codec/vendor/PROVENANCE.md). [`PATCHES.md`](../src-tauri/crates/sbls-package-codec/vendor/patches/PATCHES.md) records the exclusions and allocation/fatal-containment invariants. The build compiles an explicit decoder-only source list into one static archive. It does not discover a system JPEG/WebP package or run upstream CMake. The Rust dependency versions are locked by [`Cargo.lock`](../src-tauri/Cargo.lock); PNG/GIF/BMP validation is not a third vendored C decoder.

Vendoring keeps the runtime decoder set deterministic and makes the per-operation allocation ledger, generic-only WebP configuration and synchronous worker behavior reviewable. End users do not install a separate JPEG/WebP decoder package. Developer builds still need Rust/Cargo and the target C compiler/SDK; WebView2 and desktop/installer prerequisites remain separate #376 concerns.

The author of a codec/toolchain change prepares the evidence below. Repository maintainers review the source and release disposition. Release review must identify an accountable owner for advisory monitoring and updates; an unstaffed responsibility remains an explicit release gap.

## Upstream and advisory review

Before a release or decoder update, and during a periodic maintenance review, check the pinned series against:

- [libjpeg-turbo security policy/advisories](https://github.com/libjpeg-turbo/libjpeg-turbo/security), [release history](https://github.com/libjpeg-turbo/libjpeg-turbo/releases), and the [pinned official release](https://github.com/libjpeg-turbo/libjpeg-turbo/releases/tag/3.1.4.1).
- [libwebp NEWS](https://chromium.googlesource.com/webm/libwebp/+/refs/heads/main/NEWS), [upstream history](https://chromium.googlesource.com/webm/libwebp/+log), and the [pinned source tree](https://chromium.googlesource.com/webm/libwebp/+/refs/tags/v1.6.0/).

Record the review date and immutable release/fix commits. A missing advisory entry is not a clean security result. Search release notes and upstream fixes as well as advisory IDs; distinguish supported-branch policy from an assertion that this application is unaffected. A routine review is a documented maintenance action, not an automatic network service or scheduled task installed by this change.

For each relevant item record: advisory/upstream issue ID and URL, affected/fixed versions or commits, the shipped archive hash/tag, affected source path/API, whether that unit and path are compiled/reachable here, and disposition (`FIX_REQUIRED`, `NOT_AFFECTED_WITH_EVIDENCE`, or `UNRESOLVED`). Exclusion from the compiled list requires specific source evidence; generic-only/static linking alone does not establish immunity. Do not claim a fix from version text alone when local overlays replace the affected function. Keep unresolved items visible in release review; do not auto-update dependencies or send reports upstream without authorization.

The 2026-11-01 work verified maintenance source locations and the existing pins. It is not an exhaustive advisory clearance or vulnerability scan. No new decoder release was installed or selected.

## Update procedure

1. Preserve the current pinned archives, overlay diffs, source allowlists, generated-equivalent configuration, notices and last passing receipt. Select a proposed upstream release and retrieve its official source artifact; verify its published signature/digest through upstream instructions. For JPEG use the official tarball, not GitHub's automatic Source code archive.
2. Compare old pristine → new pristine for every compiled unit/header and old pristine → old overlay for every substituted unit. Review complete diffs, including removed code and license headers. The first two checked-in review patches deliberately use abbreviated `@@` hunks; they are explanatory notes, **not executable patches**. Never blindly rebase them.
3. Re-derive each necessary overlay against the new source. Review allocation entry/exit paths, overflow and peak-budget accounting, error/longjmp containment, precision exclusions, backing-store prohibition, generic-only flags, worker behavior, and any newly introduced allocation/thread/SIMD path. Explicitly decide whether each old adaptation is retained, changed or made unnecessary upstream.
4. Update all build-owned hashes, source allowlists/configuration as required, provenance, license copies and patch rationale together. Preserve LF for hashed text. Do not relax archive containment, native budgets, unsupported-format checks or failure cleanup to make an upgrade pass.
5. Use a fresh target directory and a locked dependency graph. Run debug and release codec conformance/hostile-input tests, allocation-denial iteration and ABI checks; run full application Rust and Node tests, lint, cycles, frontend build and workspace Cargo check. Run relevant upstream regression/fuzz corpora when a change touches their paths and record the actual harness/duration/results. The current repository has deterministic hostile-input tests, not a claim of a continuous fuzz service.
6. Review complete output provenance and verify the intended archive is linked into the final packaged application. Test accepted/rejected formats, Save/Open compatibility, typed failure/budget behavior and cleanup in the final release artifact. Keep Windows, Linux, macOS and other architectures separate; a Windows x64 build proves no other target.
7. Publish only through the repository's existing review/approval path. Preserve the previous known-good source/build receipt so a failed candidate can be abandoned without overwriting users' projects or assets.

## Repeatable same-version overlay rehearsal

[`scripts/rehearse-native-codec-overlays.mjs`](../scripts/rehearse-native-codec-overlays.mjs) reads the existing build-owned hashes and a pristine extraction produced by a verified Cargo build. It verifies archive, original-unit, overlay and review-patch hashes; generates complete diffs; checks and applies those diffs to scratch copies; and requires exact replay hashes. Git line-ending options are scoped to those subprocesses. It never rewrites vendor files or applies a patch to the repository. Its report destination must be new; existing reports are preserved.

Run a fresh release codec build, locate its one `out/sbls-pinned-native-codecs` directory, then run:

```powershell
cargo test --manifest-path src-tauri/crates/sbls-package-codec/Cargo.toml --release --locked --offline
node scripts/rehearse-native-codec-overlays.mjs '<verified extraction directory>' '<new report directory>'
```

For freshness, set `CARGO_TARGET_DIR` to a newly created task-specific temporary directory before Cargo. The offline command requires dependencies already cached; a cache miss is not permission to change the lockfile or substitute a system codec. The report contains complete reviewable patches and `report.json`. Inspect the complete diffs; exact mechanical replay is necessary but cannot establish correctness against a different upstream version.

The executed [2026-11-01 receipt](maintenance/2026-11-01-native-codec-rehearsal.json) records three matching replays, all eleven package-native input hashes, Cargo lock/build-script/archive hashes, and the resulting native static archive hash. A fresh Windows x64 release-profile codec run passed **241 tests**, with zero failures. Negative checks rejected a modified JPEG pristine digest before output creation and preserved an existing report. Initial rehearsal caught default Windows Git CRLF conversion; explicitly scoped LF settings made the replay byte-exact. No compiled source or pinned hash changed. The complete generated diffs were reviewed locally and their hashes are recorded in the receipt; regenerate them with the command above. The allocator diffs include removed debug/encoder-only code as well as redirected allocation/free calls; the CPU diff covers compiler- and target-specific SIMD paths. Generated rehearsal patches are evidence, not replacement build inputs.

## Toolchain and release provenance

The receipt observed Rust/Cargo **1.95.0** and MSVC compiler file version **19.51.36244.0** (product **14.51.36244.0**). These are actual local build observations. The manifests' `rust-version = 1.77.2` is a minimum-version declaration, not proof that the current lockfile builds with that toolchain. Current CI uses floating `stable` and `windows-latest`; the repository has no exact Rust toolchain file. A release must record or pin the actual compiler, Rust/Cargo, target, C SDK/runtime, build profile/flags and lockfile before making reproducibility claims. This change installs or upgrades none of them.

The release evidence bundle must associate the source commit and input digests with the native static archive, final executable/installer hashes, link/dependency inspection, platform prerequisites, test logs and signing state. Exclude developer home paths, credentials and raw environment dumps from published receipts. Compiler debug logs used locally may contain paths and require review before sharing.

The current receipt proves a fresh codec release-profile build and deterministic source replay. It does **not** prove bit-for-bit identical builds, packaged application linkage/dependency inspection, installer behavior, production signing, a tested MSRV or cross-platform acceptance. Those remaining #377/#376/#382 obligations must be completed before closing the maintenance/release issues.
