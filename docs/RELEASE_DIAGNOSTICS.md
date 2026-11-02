# Local Release Diagnostics

> Status: CURRENT source checkpoint for the command-observation slice of #379; TARGET for remaining workflow, readiness, export-surface and packaged acceptance.
> Baseline: diagnostics extend the existing command and async-request owners; project/schema and native acceptance requirements remain independent.

## Current ownership

The existing application dispatcher remains the sole command execution, authorization, busy-scope and typed-result owner. Its optional execution observer starts only after scope acquisition and sees the original terminal result after scope release. Joined dispatches share one execution and one observation. Observer failures cannot replace business outcomes, publish feedback or retain scopes. Rejected/disabled/unknown dispatch attempts are not execution records.

One [application runtime](../src/app/applicationLifecycleRuntime.ts) owns one [bounded diagnostic collector](../src/diagnostics/applicationCommandDiagnostics.ts). It records existing command executions, including Open, Save/Save As, PNG export and available Case preset commands, without storing or mutating a project/session snapshot. Disposal clears records; late completions cannot revive cleared or evicted records.

The collector retains 100 executions by default, with a hard configurable maximum of 200. Each record has a sequence, allowlisted command identity, a canonical generated operation ID when available, running/terminal status and monotonic elapsed milliseconds. Elapsed values cap at 24 hours with an explicit cap flag. Snapshots of pending records show current elapsed time without polling or adding a second job scheduler.

Failure codes are copied only from exact known-code sets, including the existing package and project-file registries. Unknown codes are `unclassified`. Package stages reuse the native registry; other known stages come from exact failure-code mappings. The report never copies user messages, diagnostic strings, arbitrary causes, success values, feedback, project/asset bytes, filenames, paths, queries, credentials, custom operation IDs or wall-clock timestamps. It serializes a new allowlisted projection rather than filtering a serialized exception/project after the fact.

`runtime.diagnostics.snapshot()` and `toJson()` expose a local in-memory report API. **No user-facing export surface, file persistence, telemetry or report upload is implemented by this slice.** The existing Help menu contract still governs Help/About and the omitted future external Report an Issue target.

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
| Startup/menu readiness | [entry point](../src/main.tsx), existing menu runtime | Required prerequisite-specific failures and report access before/after startup failure remain. |
| Local report delivery | Existing Help/menu and application dialog contracts | In-memory JSON API only. Accessible export surface, failure handling, focus restoration and packaged evidence remain. |

## Executed source checks

Focused behavioral tests verify shared observation for joined commands, isolation from throwing observers, scope release, actual runtime Open cancellation, bounded eviction, late completions, disposal, invalid/backwards clocks, duration caps, immutable records, known native provenance and omission of private-looking strings/payloads. Disc and Case export tests preserve exact workflow ordering and typed failures while rejecting raw exception contents in user feedback.

This is not a complete #379 diagnostic path and does not satisfy #376 packaged acceptance. Keep #379 open until the remaining workflow/readiness/report-surface requirements and authorized native release smoke pass. Follow [APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) and [APPLICATION_MENU_BAR_CONTRACT.md](APPLICATION_MENU_BAR_CONTRACT.md); diagnostics must never become a second command, result, feedback or document owner.
