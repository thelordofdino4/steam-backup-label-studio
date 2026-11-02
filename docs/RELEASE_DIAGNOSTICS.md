# Local Release Diagnostics

> Status: CURRENT source checkpoint for the command-observation and menu-readiness slices of #379; TARGET for remaining workflow, startup, export-surface and packaged acceptance.
> Baseline: diagnostics extend the existing command and async-request owners; project/schema and native acceptance requirements remain independent.

## Current ownership

The existing application dispatcher remains the sole command execution, authorization, busy-scope and typed-result owner. Its optional execution observer starts only after scope acquisition and sees the original terminal result after scope release. Joined dispatches share one execution and one observation. Observer failures cannot replace business outcomes, publish feedback or retain scopes. Rejected/disabled/unknown dispatch attempts are not execution records.

One [application runtime](../src/app/applicationLifecycleRuntime.ts) owns one [bounded diagnostic collector](../src/diagnostics/applicationCommandDiagnostics.ts). It records existing command executions, including Open, Save/Save As, PNG export and available Case preset commands, without storing or mutating a project/session snapshot. Disposal clears records; late completions cannot revive cleared or evicted records.

The collector retains 100 records by default, with a hard configurable maximum of 200 shared by commands, menu startup and menu diagnostics. Each record has a sequence, allowlisted identity, running/terminal status and monotonic elapsed milliseconds. Command records include the canonical generated operation ID when available. Elapsed values cap at 24 hours with an explicit cap flag. Snapshots of pending records show current elapsed time without polling or adding a second job scheduler.

Failure codes are copied only from exact known-code sets, including the existing package and project-file registries. Unknown codes are `unclassified`. Package stages reuse the native registry; other known stages come from exact failure-code mappings. The report never copies user messages, diagnostic strings, arbitrary causes, success values, feedback, project/asset bytes, filenames, paths, queries, credentials, custom operation IDs or wall-clock timestamps. It serializes a new allowlisted projection rather than filtering a serialized exception/project after the fact.

The [menu diagnostic contract](../src/applicationMenu/applicationMenuDiagnostics.ts) names native availability, window identity, platform lookup, native event subscription, menu installation, Windows accelerators and lifecycle/window subscription prerequisites. The existing menu runtime start result remains authoritative: `unavailable` is not failure, and `started` means registration/subscriptions completed and initial projection was scheduled, not that every semantic owner or the whole application is ready. Asynchronous projection failures identify window-state capture, capability projection or native apply separately. A pending startup record shows the current prerequisite and elapsed time; no timeout, cancellation or retry policy is introduced.

The [native port](../src/applicationMenu/nativeApplicationMenuPort.ts) supplies stage notifications without wrapping/replacing its original errors. Callback failures cannot change startup, dispatch or native outcomes. Disposing during pending window subscription cleans up its eventual listener without reporting a false startup failure. Default menu console logging prints only allowlisted codes/stages; raw `detail` remains internal to explicitly injected diagnostic callbacks and is never projected into report JSON. There is no global console interception.

`runtime.diagnostics.snapshot()` and `toJson()` expose a local in-memory report API. Report version 2 adds optional `component`/`event` identities for menu startup and diagnostic entries while preserving command records. Command `failure` and the menu owner's existing `failed` start result retain their distinct owner vocabulary; an event's `reported` status does not label ordinary duplicate/rejected invocation diagnostics as command failures. **No user-facing export surface, file persistence, telemetry or report upload is implemented by this slice.** The existing Help menu contract still governs Help/About and the omitted future external Report an Issue target.

PNG export continues returning its existing `export.<stage>-failed` typed codes and internal provenance. Its user/feedback messages now identify the failed stage and an action without interpolating raw platform exception text.

## Workflow inventory and remaining work

| Boundary | Existing owner | Current evidence / remaining work |
| --- | --- | --- |
| Application commands | [dispatcher](../src/lifecycle/applicationCommandRegistry.ts), [result contract](../src/lifecycle/applicationCommandTypes.ts) | Execution observation connected; dispatch rejection/readiness records still needed. |
| Open | [staging](../src/app/appProjectLoad.ts), [command](../src/app/appProjectOpenCommand.ts) | Existing structured package/file failures reused; live staged/native behavior still needs acceptance. |
| Save / Save As | [save command](../src/app/appProjectSaveCommand.ts), existing package/file ports | Terminal outcome/timing observed; finer nested stage timing and native acceptance remain. |
| PNG export | [export adapter](../src/app/appPngExport.ts), [command](../src/app/appPngExportCommand.ts) | Typed stages retained, safe feedback tested; native render/write/report acceptance remains. |
| Steam search/import | [existing hook](../src/hooks/useSteamImport.ts) and domain import owners | Still contains legacy String(error) feedback; the existing search and async-request owners remain authoritative. |
| Image/discovery jobs | Existing feature hooks and native image/Steam/official-site commands | Not yet connected to this command-only observer; reuse their result/request owners rather than logging raw inputs. |
| Startup/menu readiness | [entry point](../src/main.tsx), existing menu runtime | Menu prerequisites and safe projection-failure categories connected in production. React mount/lifecycle construction, native process startup before WebView, finer readiness timing and report access before/after startup failure remain. |
| Local report delivery | Existing Help/menu and application dialog contracts | In-memory JSON API only. Accessible export surface, failure handling, focus restoration and packaged evidence remain. |

## Executed source checks

Focused behavioral tests verify shared observation for joined commands, isolation from throwing observers, scope release, actual runtime Open cancellation, bounded eviction, late completions, disposal, invalid/backwards clocks, duration caps, immutable records, known native provenance and omission of private-looking strings/payloads. Disc and Case export tests preserve exact workflow ordering and typed failures while rejecting raw exception contents in user feedback. Menu tests exercise each named native and runtime prerequisite, pending startup timing, non-native fallback, disposal during startup, projection phases, original native errors, throwing observation callbacks, safe default console output and the shared bounded report budget.

This is not a complete #379 diagnostic path and does not satisfy #376 packaged acceptance. Keep #379 open until the remaining workflow/readiness/report-surface requirements and authorized native release smoke pass. Follow [APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) and [APPLICATION_MENU_BAR_CONTRACT.md](APPLICATION_MENU_BAR_CONTRACT.md); diagnostics must never become a second command, result, feedback or document owner.
