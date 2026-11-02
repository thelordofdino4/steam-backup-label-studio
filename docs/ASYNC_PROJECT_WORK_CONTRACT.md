# Async Project Work Contract

> Status: Implemented source contract; integration and native acceptance pending.
> Purpose: Prevent late import/discovery/image work from changing another session or overwriting newer work.
> Read when: Adding async project mutations, image imports, discovery results, or deferred Case branding reconciliation.
> Authoritative source: Request ownership in this document; committed document/lifecycle semantics defer to the SDD and application lifecycle contract.
> Reviewed: 2026-11-01, issue #367, based on integrated main `923f7b7f` with #304's search-generation changes.

## Ownership and completion

`src/app/applicationLifecycleRuntime.ts` installs one `ProjectAsyncWork` next to its existing lifecycle root. `src/lifecycle/projectAsyncWork.ts` owns pending request authority only. It reads the root's session and content revision; it stores no editable document, asset bytes, renderer state, or second project snapshot. `useProjectAsyncWork` exposes this existing runtime owner to feature hooks and subscribes loading indicators to invalidation.

Each request has an immutable numeric ID, typed semantic destination lane, session ID, content revision, captured lifecycle generation, and local mutation generation. Private request and navigation identity prevents forged/replayed tickets and a Home/Resume round trip from reviving old work. The lifecycle generation is diagnostic; Save path/baseline-only changes do not revoke a same-content request. Content changes, replacement, navigation, Reset, disposal, or a newer request for the same destination retire applicable authority. Reset/Clear explicitly invalidate even when the resulting document is already at its default.

Preparation may download, decode, analyze, and produce a candidate. It must not call project setters. Immediately before application, `commit` checks the current authoritative session/content revision and consumes the request. Application is synchronous, with no further await. A local mutation generation retires competing old-revision work before React's committed-render lifecycle synchronization runs. `publish` consumes a current discovery/feedback completion without claiming a document mutation. Current synchronous application failures can report once without regaining mutation authority; later work retires that feedback permission too.

Accepted discovery arrays retain their originating session and input identity. Starting a search for a different identity clears the previous candidates and source statuses before publishing loading or failure state; refreshing the same identity may keep its accepted proposals while pending. An image loader returning no prepared image completes without a document mutation: it must not advance mutation generation or revoke valid work in other lanes.

This is an authorization boundary around existing owners, not a rollback transaction. It does not claim that arbitrary throwing React setters can be rolled back. #366 replaces the final application adapter with document transactions while preserving these request and session preconditions. No external project schema or package codec changes are introduced here.

## Current owner inventory

| Work | Preparation and checked application |
| --- | --- |
| Steam search | #304 remains the sole query-generation owner in `useSteamImport`; no duplicate search implementation. |
| Steam game import | `useSteamImport` fetches/normalizes the game and awaits a prepared synchronous callback. `App` uses the existing pure metadata plan; `prepareSteamDiscVisualDefaultImport` prepares title artwork before applying any Disc text/title owners. Case title download and back-cover copy planning also finish before application. |
| Metadata discovery/auto-apply | `useSteamMetadataAssistance` publishes candidates and performs requested auto-application within the same checked completion. Imported metadata supersedes older discovery. |
| Logo and web artwork discovery | `useLogoAssetDiscovery` and `useWebArtworkDiscovery` guard candidates, loading/error state, and feedback. Accepted candidates are scoped to the originating session as well as their input key. |
| Disc background, local screenshots, web background | All background selection transports use the same `background-artwork` lane; changing transport does not create a second mutation authority. Local screenshot discovery uses a separate proposal lane. Thumbnail cache work keeps its existing cleanup cancellation and cannot mutate project content. |
| Disc title, additional artwork, logos, rating, media, platform, technical marks, banner | Existing feature hooks stage imported image assets, then apply through the checked boundary. Destination IDs distinguish additional elements/marks; reset, clear and remove paths revoke pending authority. |
| Case cover, tray, left/right spine images | Existing source-apply helper receives a checked synchronous commit adapter. Source loaders are deferred until the request begins, including failure feedback. Uploads and remote sources share destination lanes for each surface/slot. Existing placement, custom title source, active-pixel analysis and disabled-state semantics remain owned by the same domain helpers. |
| Case primary logos and Steam banners | Existing cover/tray/spine hooks use the same prepared-image/checked-application pattern. |
| Case branding uploads | Shared rating/media/platform/technical owners invoke accepted companion callbacks synchronously inside their checked completion. No Promise continuation or timer can reapply an old upload to a new Case session. |
| Case branding reconciliation | `useCaseInsertBrandingSyncQueue` replaces unowned timers. A typed session/navigation continuation protects queued derived work across the parent render; it reads current committed branding sources, acquires a fresh revision-bound request, and reconciles in one synchronous completion. This continuation is only for derived current-owner reconciliation, never permission to accept a late external result. |
| New/Open/Save/package operations | Existing application-command busy/session/revision owners remain authoritative. Package jobs do not acquire a new parallel scheduler here. Future background image/package mutations must prepare first and use the same request/document transaction preconditions. |

UI-only clipboard/folder actions do not write project content. Raw image caches may finish stale work; only publication and project mutation authority are revoked. No mandatory network cancellation, debounce redesign, service changes, or persistent asset-store migration is introduced.

## Preservation and validation

Behavioral oracles remain the current import/source, preset fit, disabled-state preservation, schema/restore, lifecycle, preview and export tests. Native visual acceptance still follows `AGENTS.md`; headless fixtures are race diagnostics only.

Focused coverage includes real lifecycle New/Open/content/navigation transitions, exact-once/replay/forged tickets, Save baseline preservation, cross-lane competing commits, stale failure suppression, real React Steam preparation races, real PNG decode through upload owners, all four Case surfaces, metadata auto-apply, accepted branding companion callbacks, and queued reconciliation revocation. Full build, lint, Node, Rust and cycle checks are required alongside focused ownership tests.

Integration with #357/#358/#359/#360/#362 requires reconciliation and revalidation against the existing lifecycle and continuous-edit contracts. Native Steam/discovery, image control, preview/export, and lifecycle smoke remain required for acceptance. This document does not close #367 or claim that #363/#365/#366 document migration is implemented.

## Diagnostic observation

The reconciled source stack lets Steam search/import report bounded timing and typed outcomes to the existing application runtime collector. Observation is outside request authorization: it cannot acquire, renew, commit or publish a request. Import success still requires `commit` to return true; current failure copy still uses `publish`; retired completions record cancellation without changing current UI feedback. See [RELEASE_DIAGNOSTICS.md](RELEASE_DIAGNOSTICS.md) for the allowlisted fields and coarse stages. Diagnostic observation does not establish native acceptance or implement #366 transactions.
