# Performance baseline (#368)

> Status: Partial measured baseline and repeatable diagnostic harness.
> Authority: Existing production owners define behavior; this document defines measurement scope.
> Native acceptance: Input-to-preview, actual committed edits, WebView IPC and whole-app memory remain unmeasured.

## Reproduce

Run from the repository root. The generator creates a fresh private temporary
run directory, prints its path, and preserves generated fixtures and reports.
No existing projects are read or overwritten. Each stage refuses to overwrite
its report. Use a newly generated directory for a complete repeat.

```powershell
node --experimental-strip-types scripts/performance/project-baseline.mjs
$env:SBLS_PERFORMANCE_DIR = '<directory printed above>'
cargo test --manifest-path src-tauri/Cargo.toml --package app --locked project_package_performance_baseline -- --ignored --nocapture --test-threads=1
node --experimental-strip-types scripts/performance/browser-baseline.mjs $env:SBLS_PERFORMANCE_DIR
```

The native benchmark is explicitly ignored by ordinary `npm test`; performance
numbers are not CI pass/fail thresholds. Its code still compiles in the full
Rust test suite. No Tauri app window is launched. Browser work is headless
Chromium diagnostic evidence only, not native UI, visual or physical acceptance.
Run stages sequentially with unrelated CPU-heavy work stopped. Record compiler,
Node/browser versions, hardware, source commit, working changes and build profile.
Repeat an entire run before comparing small differences; five samples are not
a statistically established percentile distribution.

## Fixtures and boundaries

Six fixtures cover Disc and Case Insert at three image sizes. Each starts from
its existing complete blank-project constructor and enables background and title
artwork. One deterministic 24-bit BI_RGB BMP is retained at both registered
owners. Case uses Cover owners; Tray is also exported to retain its path in the
benchmark. Disabled/default state and qualified built-ins remain present. Disc explicitly
uses the published ESRB E metadata tuple (badge stays disabled). The initial
blank `ratingSystem=none` fixture was rejected by the existing capture-plan
owner as `unsupported-nonportable-asset` at `disc.rating.custom`, despite null
custom image/size and disabled placeholder state. The separate #358 image-policy work addresses this by checking actual
custom-image evidence. The gap remains present on the measured main baseline.
The benchmark does not duplicate that fix or bypass the production capture plan.
Saved time and backup dates are pinned. Built-in URLs use stable repository
asset paths. Deterministic xorshift pixel noise avoids compression-ratio artifacts.
These are controlled workloads, not a claim about a typical user's project mix.

| Size | Pixels | Unique BMP bytes | Logical repeated data-URL bytes | Unique RGBA bytes |
| --- | --- | ---: | ---: | ---: |
| Small | 128 x 128 | 49,206 | 131,260 | 65,536 |
| Normal | 512 x 512 | 786,486 | 2,097,340 | 1,048,576 |
| Large | 1400 x 1400 | 5,880,054 | 15,680,188 | 7,840,000 |

The large fixture fits the integrated 16 MiB hydrated save request limit.
Actual native round-trip success, rather than byte arithmetic alone, determines
supported-fixture acceptance. Native checks verify schema/kind and both exact
asset leaves; package bytes and hydrated output size are recorded. Qualified
built-in URL omission follows current package behavior.

The Node stage measures synchronous source helpers: fresh normalized capture /
validation / freeze, schema validation alone, uncached and cached canonical
comparison, serialization, capture planning and raw request framing. The scalar
successor capture-plus-comparison measurement is explicitly a **proxy**, not
an actual lifecycle commit or input-to-preview result. Capture input is fresh
relative to the weak-set cache; canonical comparison setup is outside its timer.
Each timed boundary has one warm-up and five individually recorded samples.

The native stage separately measures frame parsing, codec encode, codec decode,
complete native Save (including atomic filesystem commit), and native Open
(read plus decode). These exclude frontend framing, WebView transport, dialogs,
session adoption and UI. Warm filesystem caches and the debug build profile must
not be described as cold-storage or release performance. Timings are wall time.

The browser stage calls actual image loading, active-pixel/content-shape analysis
and Disc/Cover/Tray PNG exporters at their existing 300 DPI defaults, with guides
off. It uses a fresh page per fixture and warm image/URL caches per stage. Export
timings include awaited render/encode and current byte conversion; they do not
include native PNG destination writes. They are wall time, not a main-thread CPU
profile. Native Tauri may have different decoder, scheduling and memory behavior.

## Memory and duplication method

Each Node fixture runs in a fresh child process. Reports record endpoint
`process.memoryUsage()` bytes and process-wide peak RSS from
[`process.resourceUsage().maxRSS`](https://nodejs.org/api/process.html#processresourceusage)
in KiB. Peak includes module loading, fixture generation, repeated samples,
retained benchmark inputs, temporary allocations and garbage-collector behavior.
It cannot isolate one operation and is **not SBLS/WebView/native process memory**.
Native and browser process-tree peak measurements remain pending.

The fixture ledger reports exact BMP, ASCII data-URL, JSON UTF-8, request,
package and hydrated sizes. Repeating a string in JSON duplicates encoded bytes;
JavaScript may share string storage across object/snapshot references. The ledger
therefore does not claim physical heap copies, live IPC copy count or a measured
whole-app peak. Do not add these independent maxima as if simultaneously live.

## Recorded diagnostic baseline - 2026-11-01

Production source: `923f7b7fcbfa6569439e26ba049c265816a1db65`, plus this
benchmark-only harness. Hardware: Ryzen 9 7950X, 32 logical CPUs, about 31.2 GiB
RAM; Windows x64, Node v24.16.0, Rust 1.95.0, native debug test profile.
Harness hashes cover CRLF checkout bytes. Raw samples, environment/browser
version, fixture hashes and harness hashes:
[`2026-11-01-baseline.json`](performance/2026-11-01-baseline.json).
All six frames passed production native codec, exact asset-leaf round-trip,
atomic Save and read/decode validation. All browser exports returned PNG bytes.
No native application UI was launched. Timing stages ran sequentially.

Median milliseconds from five samples (one warm-up excluded):

| Fixture | Capture/validate/freeze | Uncached comparison | JSON serialization | Raw framing | Native Save | Native Open | Browser active-pixel analysis | Browser primary PNG export |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| disc-small | 0.27 | 0.11 | 0.10 | 0.39 | 27.72 | 14.47 | 0.30 | 97.30 |
| disc-normal | 0.25 | 1.49 | 1.48 | 5.67 | 333.29 | 201.57 | 3.60 | 98.30 |
| disc-large | 0.24 | 10.76 | 8.43 | 31.29 | 2599.06 | 1535.09 | 26.50 | 104.40 |
| case-small | 0.75 | 0.12 | 0.11 | 0.45 | 32.61 | 18.97 | 0.30 | 107.70 |
| case-normal | 0.75 | 1.13 | 1.14 | 5.50 | 358.98 | 204.95 | 3.60 | 121.50 |
| case-large | 0.73 | 7.29 | 8.64 | 35.42 | 2547.07 | 1495.00 | 28.70 | 138.20 |

Node-only process peak RSS ranged from about 77 to 428 MiB across these runs.
This includes fixture generation and repeated benchmark allocations; it is not
an app memory estimate. Sub-millisecond cached decode/comparison samples can
round to zero; that means below measurement resolution, not zero work. Raw
samples show variability and must be retained when comparing future runs.

## Remaining required native baseline

Before architecture migration is accepted, record native pointer/slider event to
visible-preview latency, actual committed scalar edits, production snapshot-owner
capture, end-to-end Save/Open and export, and whole-process-tree memory on the
same fixtures. Use the primary checkout and explicitly authorized native Tauri
route from AGENTS.md and record the exact integrated source baseline. Record Tauri host plus WebView renderer process identities, sampling
interval, working/private bytes and observed peaks; sampling misses shorter
spikes and RSS includes shared pages. Keep measurements separate by boundary and
profile. Include ordinary drag/slider, text, retained disabled artwork and more
than one real project before treating these controlled fixtures as representative.

#363/#365 and subsequent document migrations still need that pre-migration native
evidence. No cache, GPU/WebGL rewrite, asset-store redesign or optimization is
justified by this harness alone. #368 remains open.
