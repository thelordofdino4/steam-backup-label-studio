# Game Search, Import, And Metadata Workflow Contract

> Status: Draft target-state normative contract.
> Purpose: Define presentation-neutral Game search, selection, import planning, metadata discovery, explicit application, and manual metadata editing semantics for Disc and Case projects.
> Read when: Changing Steam search/import, Game workflow presentation, metadata assistance, imported Disc/Case defaults, Case imported-text visibility, workflow concurrency, or Game-related project mutation.
> Authoritative source: This contract for target Game workflow semantics; current implementation facts defer to source and tests; application session/lifecycle semantics defer to the lifecycle contract; serialized fields defer to the project-file specification.
> Last reviewed against commit: `f750a5c4b8721e6de4912a9be5ef26a05cddab5e`.

Last refreshed: 2026-07-26.

## 1. Status, scope, and authority

**TARGET REQUIREMENT —** This is a **draft target-state normative contract**. Its requirements define the behavior future implementation must satisfy; they do not claim that the target workflow, immutable plan, transaction boundary, busy registry, or history integration already exists.

**TARGET REQUIREMENT —** This contract owns the target semantics and coordination of these exact operations:

- `game.search`
- `game.import.plan`
- `game.import.apply`
- `game.metadata.discover`
- `game.metadata.apply`
- `game.metadata.edit`

**TARGET REQUIREMENT —** Authority is divided as follows.

| Claim class | Concern | Authority |
| --- | --- | --- |
| **TARGET REQUIREMENT** | Game search, stable selection, immutable import planning, metadata discovery/application/editing, stale-result policy, Game busy scopes, and Disc/Case import coordination | This contract |
| **TARGET REQUIREMENT** | Application command envelope, one active project session, path, baseline, revision, dirty state, Return Home, Resume, replacement, Save, close, and Quit | [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md) |
| **TARGET REQUIREMENT** | Editor destinations, semantic owner/control IDs, presentation adapters, and navigation-result vocabulary | [`EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md`](EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md) |
| **TARGET REQUIREMENT** | Disc template choice, custom-dimension validation, immutable geometry planning, atomic apply, and recovery | [`DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md`](DISC_TEMPLATE_AND_PHYSICAL_GEOMETRY_WORKFLOW_CONTRACT.md) |
| **TARGET REQUIREMENT** | Disc Layout Preset catalog/compatibility, immutable preset impact planning, atomic apply/reapply/detach, configuration, and customization semantics | [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md) |
| **TARGET REQUIREMENT** | Persisted `.sbls.json` fields, validation, normalization, migrations, and compatibility | [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) |
| **TARGET REQUIREMENT** | Current architecture, renderer ownership, and preview/edit/export parity | [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md) |
| **TARGET REQUIREMENT** | Disc metadata-bound text fallback and manual-source semantics after accepted metadata changes | [`METADATA_DISC_TEXT_BINDING.md`](METADATA_DISC_TEXT_BINDING.md) and [`TEXT_EDITOR_CONTRACT.md`](TEXT_EDITOR_CONTRACT.md) |
| **TARGET REQUIREMENT** | Case copy variants and fitting feedback | Issue [#181](https://github.com/thelordofdino4/steam-backup-label-studio/issues/181), within the boundaries in this contract |
| **TARGET REQUIREMENT** | Remaining structured Case composition/layout work | Issue [#149](https://github.com/thelordofdino4/steam-backup-label-studio/issues/149), not this workflow shell |

**TARGET REQUIREMENT —** A more specific authority wins only inside its owned concern. For example, this contract decides when an accepted import may ask a Case adapter to expose text; the Case renderer and project schema still decide how that enabled text is represented, saved, restored, previewed, and exported.

**FUTURE EXTENSION —** A final visual design may host Game as a dedicated route, sheet, dialog, or responsive workspace. That decision must preserve these operation IDs and ownership boundaries.

## 2. Terminology and semantic model

**TARGET REQUIREMENT —** Every substantive claim in this document is identified as one of the following classes.

| Claim class | Meaning |
| --- | --- |
| **CURRENT FACT** | Verified at the reviewed commit in source, focused tests, authoritative current-state documentation, or the named issue evidence. |
| **TARGET REQUIREMENT** | Normative behavior future implementation must satisfy. |
| **FUTURE EXTENSION** | Permitted later capability that is outside the required first implementation. |
| **OPEN QUESTION** | A decision deliberately left to the named owner; it must not be silently resolved by implementation convenience. |

**TARGET REQUIREMENT —** The semantic vocabulary is:

| Term | Meaning |
| --- | --- |
| Game workflow | The rich domain workflow reached through `area.game`; it coordinates operations but does not replace project, feature, renderer, or persistence owners. |
| Search request | One invocation of `game.search` with a normalized query and unique generation identity. |
| Search result identity | A provider-qualified stable identity containing at least Steam App ID and the accepted search generation; display title is not identity. |
| Explicit selection | A user-confirmed search result identity retained independently from visual list order or keyboard focus. |
| Candidate | Normalized, provenance-bearing external information or asset that has not been accepted into project content. |
| Import plan | An immutable, reviewable proposal created by `game.import.plan`, tied to one project session ID and base revision. |
| Impact | One proposed owner-targeted change classified as `add`, `replace`, `clear`, `enable`, `disable`, `preserve`, or `no-op`. |
| Accepted impact | A proposed impact the user has explicitly included in the reviewed plan. |
| Apply | One atomic project-content commit through `game.import.apply` or `game.metadata.apply`. |
| Metadata edit | A user-authored canonical metadata change submitted through `game.metadata.edit`; presentation drafts are not commits. |
| Stale completion | A response whose request generation, input identity, session ID, or revision no longer matches the active consumer. |
| Workflow close | Deactivation of the Game workflow by leaving Game, Return Home, explicit close, or project replacement. |
| Project adapter | A Disc- or Case-specific pure mapping/commit adapter that delegates to established feature owners. |

**TARGET REQUIREMENT —** Search, candidate discovery, explicit selection, plan construction, and plan review are non-mutating. Only the three apply/edit operations may change canonical project content, and only through their registered owner path.

## 3. Verified current-state behavior

**CURRENT FACT —** The current Game panel is a sidebar panel. It combines a Steam query, result buttons that immediately start import, direct metadata inputs, and rating/legal assistance controls in one presentation component. Source: [`GamePanel.tsx`](../src/components/sidebar/GamePanel.tsx).

**CURRENT FACT —** `useSteamImport` has loading booleans but no request generation or stale-completion guard. A new search can be started with Enter while the visible button is disabled, and any older completion may replace results, status, and loading state. This is the gap tracked by [#304](https://github.com/thelordofdino4/steam-backup-label-studio/issues/304). Source: [`useSteamImport.ts`](../src/hooks/useSteamImport.ts).

**CURRENT FACT —** Clicking a current result imports immediately; there is no independent stable selection followed by a reviewable import plan. Source: [`GamePanel.tsx`](../src/components/sidebar/GamePanel.tsx) and [`App.tsx`](../src/app/App.tsx).

**CURRENT FACT —** `createSteamImportMetadataPlan` computes a useful partial metadata decision, including different-game resets and automatic rating/legal candidates, but it is not a session/revision-bound immutable plan and does not enumerate all Disc/Case impacts. Source: [`appSteamImportPlan.ts`](../src/app/appSteamImportPlan.ts) and [`appSteamImportPlan.test.ts`](../src/app/appSteamImportPlan.test.ts).

**CURRENT FACT —** Current Disc “planning” invokes helpers that mutate Disc text and title-artwork state before the later `App.tsx` setter sequence finishes. The overall import then performs multiple independent setters and announcements, so it is not an all-or-nothing commit. Source: [`appSteamDiscVisualImport.ts`](../src/app/appSteamDiscVisualImport.ts), [`useDiscTextState.ts`](../src/hooks/useDiscTextState.ts), and [`useTitleArtwork.ts`](../src/hooks/useTitleArtwork.ts).

**CURRENT FACT —** Metadata assistance exposes candidate Apply/Copy controls, but the current Find handler discovers and then automatically applies eligible rating/legal candidates. Discovery and application are therefore combined despite presentation copy saying candidates are suggestions. Source: [`useSteamMetadataAssistance.ts`](../src/hooks/useSteamMetadataAssistance.ts), [`MetadataAssistanceControls.tsx`](../src/components/sidebar/MetadataAssistanceControls.tsx), and [`App.tsx`](../src/app/App.tsx).

**CURRENT FACT —** Metadata discovery keys visible state to the selected App ID and some metadata input, which hides some mismatched results, but same-input overlapping requests can still race and completions can still announce after their consumer has changed. Source: [`useSteamMetadataAssistance.ts`](../src/hooks/useSteamMetadataAssistance.ts).

**CURRENT FACT —** A full Case import generates a medium description variant, imports available Tray description, requirements, legal copy, feature bullets, title/logo artwork across Cover, Tray, and both spines, and a Cover rating mark. Imported Tray text preserves each target’s prior enabled state because `enableImportedText` defaults to false, while a seeded spine logo disables each spine’s title-text owner. This can store accepted text while rendering none of it and can change an unrelated text owner, gaps bounded by [#310](https://github.com/thelordofdino4/steam-backup-label-studio/issues/310). Sources: [`backCoverCopyFit.ts`](../src/caseInsert/backCoverCopyFit.ts), [`steamBackCoverImport.ts`](../src/caseInsert/steamBackCoverImport.ts), [`titleArtwork.ts`](../src/caseInsert/titleArtwork.ts), [`steamImportDefaults.ts`](../src/caseInsert/steamImportDefaults.ts), and [`steamBackCoverImport.test.ts`](../src/caseInsert/steamBackCoverImport.test.ts).

**CURRENT FACT —** Case copy generation already produces short, medium, and full variants and density warnings, but the current Game panel does not expose variant review/selection. Issue [#181](https://github.com/thelordofdino4/steam-backup-label-studio/issues/181) owns that chooser and fitting feedback.

**CURRENT FACT —** Current project snapshots persist the selected imported Steam game, manual title, project metadata, and the applicable Disc or Case feature state. Search query/results, candidate lists, loading state, and an import plan are not project-file fields. Source: [`projectTypes.ts`](../src/project/projectTypes.ts), [`createProjectSnapshot.ts`](../src/project/createProjectSnapshot.ts), and [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md).

**CURRENT FACT —** Native Steam page and artwork fetching already restricts these remote requests to HTTPS and Steam-hosted URLs, and candidate parsing strips scripts/styles/tags and normalizes candidate values. Source: [`steam.rs`](../src-tauri/src/commands/steam.rs) and [`steamMetadataCandidates.ts`](../src/steam/steamMetadataCandidates.ts).

### Current-versus-target matrix

| Claim class | Concern | Verified current state | Required target state |
| --- | --- | --- | --- |
| **CURRENT FACT / TARGET REQUIREMENT** | Game entry | Sidebar panel mixes search, import, metadata, and assistance | `area.game` is a rich workflow destination with focused semantic operations |
| **CURRENT FACT / TARGET REQUIREMENT** | Search ordering | No generation guard; Enter bypasses disabled button | Latest accepted request wins; all stale completions are discarded |
| **CURRENT FACT / TARGET REQUIREMENT** | Selection | Result activation immediately imports | Selection is explicit, stable, and non-mutating |
| **CURRENT FACT / TARGET REQUIREMENT** | Planning | Partial metadata calculation; Disc helper mutates during calculation | Complete immutable plan; planning has no project setters or feature mutation |
| **CURRENT FACT / TARGET REQUIREMENT** | Apply | Multiple setters and mid-sequence announcements | One validated all-or-nothing commit and one coherent result |
| **CURRENT FACT / TARGET REQUIREMENT** | Metadata assistance | Find may discover and auto-apply | Discover and apply are separate operations |
| **CURRENT FACT / TARGET REQUIREMENT** | Existing work | Different-game logic may reset some scoped values; other behavior varies by adapter | Every impact is reviewed as add/replace/clear/enable/disable/preserve/no-op |
| **CURRENT FACT / TARGET REQUIREMENT** | Case visibility | Imported Tray text may remain disabled | Every accepted non-empty selected Case text is visibly rendered through minimal enablement |
| **CURRENT FACT / TARGET REQUIREMENT** | Feedback | Several independent announcements; success may precede all changes | One typed operation result drives coherent global and local feedback |
| **CURRENT FACT / TARGET REQUIREMENT** | Persistence/history | Project content saves; workflow drafts do not; no shared transaction history | Same persistence boundary; one future history transaction per mutating apply |

## 4. Target workflow overview

**TARGET REQUIREMENT —** Game must be treated as a rich workflow destination, not reduced to a set of menu dropdown controls. Presentation may change, but it must preserve the following top-down state machine.

```text
area.game
  |
  v
[Query] --game.search--> [Latest result set]
                              |
                       explicit selection
                              |
                              v
                    [Stable selected result]
                              |
                    game.import.plan
                              |
                              v
                  [Immutable reviewed plan]
                     |                 |
               revise choices       cancel/close
                     |                 |
                     +-------> [discard]
                     |
              game.import.apply
                     |
          validate session + revision
                /             \
          conflict/failure   atomic commit
                |                 |
            [review]      [one project revision]

Existing project metadata
  |-- game.metadata.discover --> [candidates only]
  |-- game.metadata.apply -----> [one atomic accepted change]
  `-- game.metadata.edit ------> [one canonical manual edit]
```

**TARGET REQUIREMENT —** No arrow into query, results, selection, candidates, or plan may mutate canonical project content. No presentation adapter may skip an arrow by calling project setters, network functions, or feature mutations directly.

**TARGET REQUIREMENT —** Full import populates the active project session. It does not create a new session, replace the session, change the session ID, change the current path, or establish a new clean baseline.

## 5. Workflow entry and semantic operations

**TARGET REQUIREMENT —** Opening `area.game` is editor navigation. It reveals and focuses the workflow without searching, selecting, importing, applying, enabling, clearing, or changing dirty state.

**TARGET REQUIREMENT —** The operation registry is normative.

| Claim class | Operation ID | Semantic owner | Input | Mutability | Busy scope | Stale policy | Result | Allowed adapters |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | `game.search` | `owner.game.search` | Normalized query, provider, request generation | None | Replaceable `busy.game.search` | Latest request generation wins | Shared result envelope containing result set or structured error | Game workflow host, future command/search affordance |
| **TARGET REQUIREMENT** | `game.import.plan` | `owner.game.import` | Stable result identity, session ID, base revision, project kind, user planning preferences | None | Replaceable `busy.game.import.plan` | Matching selection, generation, session, and revision required | Shared result envelope containing immutable plan | Game review workflow only |
| **TARGET REQUIREMENT** | `game.import.apply` | `owner.game.import` plus project adapter | Immutable plan ID/content, session ID, base revision | Atomic project mutation | Exclusive `busy.game.import.apply` and project-mutation lock | Exact session/revision match required at commit | Shared result envelope containing applied/no-op summary | Apply control, future shortcut only while reviewed plan is current |
| **TARGET REQUIREMENT** | `game.metadata.discover` | `owner.game.metadata-assistance` | Stable metadata input identity, session ID, base revision, request generation | None | Replaceable `busy.game.metadata.discover` | Latest matching input/session/revision generation wins | Shared result envelope containing candidates and source statuses | Game metadata-assistance host |
| **TARGET REQUIREMENT** | `game.metadata.apply` | `owner.game.metadata` plus affected feature adapters | Explicit candidate IDs/values, target impacts, session ID, base revision | Atomic project mutation | Exclusive `busy.game.metadata.apply` and project-mutation lock | Exact candidate/input/session/revision match required | Shared result envelope containing applied/no-op summary | Candidate Apply or reviewed batch Apply controls |
| **TARGET REQUIREMENT** | `game.metadata.edit` | `owner.game.metadata` | Committed canonical field patch, session ID, base revision | Atomic project mutation | Synchronous metadata commit; excluded by an active project-mutation lock | Exact session/revision at dispatch | Shared result envelope containing validation and changed fields | Metadata field editor, contextual semantic adapter |

**TARGET REQUIREMENT —** The operation owner must be reachable through one typed registry/dispatcher. A UI host may manage expansion, draft input, and focus return, but it must not own fetch sequencing, plan construction, candidate application, default selection policy, project setter order, or feature enablement.

## 6. Search ownership and stale-result policy

**TARGET REQUIREMENT —** `game.search` owns query normalization, request identity, status, results, error projection, and stale-completion disposal. Search results are read-only external candidates and never project content.

**TARGET REQUIREMENT —** Latest request wins is a correctness rule, not merely a transport optimization. Transport cancellation is optional; the consumer-side stale check is mandatory even when abort is supported.

### Request race and invalidation table

| Claim class | Event | Active identity change | Earlier completion handling | Visible state after event | Project mutation |
| --- | --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Submit query A | Create generation A | None | A busy; prior result set may remain only if clearly marked previous/non-current | None |
| **TARGET REQUIREMENT** | Submit query B before A completes | Create generation B; B supersedes A | A success/failure is discarded without result, error, or success feedback | B busy/current; any retained A display is read-only and explicitly non-current | None |
| **TARGET REQUIREMENT** | Clear query while request runs | Invalidate current generation | Completion discarded | Idle, no current results/selection/plan | None |
| **TARGET REQUIREMENT** | Select result | Retain provider + App ID + accepted generation | Other list focus/order changes cannot alter selection | Stable selection shown | None |
| **TARGET REQUIREMENT** | Search again after selection | New generation invalidates prior result consumer and selection-derived plan | Prior completion/plan discarded | New query busy; selection cleared | None |
| **TARGET REQUIREMENT** | Leave Game or Return Home | Invalidate all active Game request generations | All later completions discarded and staged resources cleaned | Query retained; results, selection, candidates, and plan discarded | None |
| **TARGET REQUIREMENT** | Manual project mutation while plan/discovery exists | Increment project revision | Plan/candidate consumer becomes stale; completion discarded or existing plan marked conflict | User may re-plan/re-discover | Only the manual mutation |
| **TARGET REQUIREMENT** | New/Open/Close replaces active session | Change/remove session ID | All prior Game completions discarded | All Game workflow state cleared | Lifecycle-owned mutation only |
| **TARGET REQUIREMENT** | Same query submitted again | New generation even when normalized text matches | Older same-query completion discarded | Newest generation controls results/loading | None |

**TARGET REQUIREMENT —** A stale completion must not clear a newer request’s busy indicator, replace a newer result set, change selection, construct a plan, announce success/failure, or write project content.

**TARGET REQUIREMENT —** Deduplication and result ordering must use stable provider identity. Title, thumbnail, price, and list index are display data and cannot become selection identity.

## 7. Selection and immutable import planning

**TARGET REQUIREMENT —** Activating a result first creates an explicit stable selection. A separate `game.import.plan` invocation may then retrieve and normalize details, candidates, and staged assets. Selection and planning remain non-mutating.

**TARGET REQUIREMENT —** A plan must be immutable after issuance and contain at least:

- plan ID and creation time;
- session ID, base revision, project kind, and selected result identity;
- normalized imported game identity and provenance;
- each candidate field/feature impact, current value summary, proposed value summary, and one impact classification;
- selected/unselected acceptance state as reviewed by the user;
- Case copy variants and the accepted selected value when applicable;
- Disc/Case target surface and owner for every impact;
- required minimal visibility enablement paired with accepted Case text;
- staged asset identities, sizes/statuses, warnings, blockers, and cleanup handles;
- explicit preset choice or `preserve`/`no-op`; and
- a deterministic commit payload or enough immutable data for pure adapters to produce it.

**TARGET REQUIREMENT —** An import plan cannot contain live setter callbacks, mutable references, DOM nodes, component identities, unresolved list indexes, or an instruction to repeat network discovery during apply.

**TARGET REQUIREMENT —** A reviewed plan is valid only for its exact session ID and base revision. Any canonical project change, project replacement, selection change, relevant planning-preference change, or workflow close invalidates it. Apply must reject an invalid plan without partial mutation.

**TARGET REQUIREMENT —** Network and asset failures discovered during planning become explicit warnings or blockers. The plan must not hide a missing asset behind an eventual partial commit.

## 8. Fresh and existing project behavior

**TARGET REQUIREMENT —** Fresh and existing projects use the same `plan -> review -> apply` pipeline. “Fresh” changes proposed defaults; it does not authorize a separate setter sequence.

**TARGET REQUIREMENT —** A project is pristine for this workflow only when its canonical content equals its clean/new baseline and affected owners retain their baseline/default values. “No selected Steam game” alone is insufficient.

### Fresh/pristine-versus-existing matrix

| Claim class | Concern | Fresh/pristine default proposal | Existing-project default proposal | Required review behavior |
| --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Imported identity and core metadata | `add` non-empty values | `replace` only after current/proposed comparison | Show every changed field |
| **TARGET REQUIREMENT** | Blank optional imported data | `no-op`; never invent value | `preserve` existing value unless explicit clear is proposed and accepted | Clear is separately visible |
| **TARGET REQUIREMENT** | Manual/custom user value | Usually absent; `add` if selected | `preserve` by default | Replacement requires explicit acceptance |
| **TARGET REQUIREMENT** | Prior import-owned value for same game | `no-op` when equal | `replace` only when source value changed and accepted | Show provenance and delta |
| **TARGET REQUIREMENT** | Prior game-scoped value for different game | `add`/`replace` available candidate | Explicit `replace`, `clear`, or `preserve` impact | No silent reset |
| **TARGET REQUIREMENT** | Imported Case text | `add` plus minimal `enable` when non-empty and accepted | `preserve` manual text by default; accepted replace/add includes minimal visibility | Text acceptance and visibility are coupled in plan, not navigation |
| **TARGET REQUIREMENT** | Artwork/marks | Offer supported candidates without silent layout choice | Preserve custom/manual assets and layout by default | Replacing asset and changing layout are separate impacts |
| **TARGET REQUIREMENT** | Preset | `preserve` unless user selects one | `preserve` | Any #168 Case preset is an explicit plan choice |
| **TARGET REQUIREMENT** | No accepted differences | `no-op` | `no-op` | Apply may report success/no-op; no revision increment |

**TARGET REQUIREMENT —** Every existing-project impact must use exactly one of `add`, `replace`, `clear`, `enable`, `disable`, `preserve`, or `no-op`. “Import everything” is not an adequate impact classification.

**TARGET REQUIREMENT —** `game.import.apply` changes the active session’s project content only. Its session ID, project kind, current path, and clean baseline remain unchanged; dirty state is re-derived from the resulting canonical content.

## 9. Metadata discovery, application, and editing

**TARGET REQUIREMENT —** `game.metadata.discover` retrieves and normalizes rating/legal or future metadata candidates and source statuses. It does not apply candidates, enable visuals, update metadata, complete guided slots, or increment revision.

**TARGET REQUIREMENT —** The current combined Find-and-auto-apply handler is a gap. Future presentation text such as “Find candidates” must dispatch only `game.metadata.discover`.

**TARGET REQUIREMENT —** `game.metadata.apply` requires an explicit candidate selection or reviewed batch. It must show the canonical proposed value, provenance/confidence, affected project fields, and any visual enable/disable impacts before atomic apply.

**TARGET REQUIREMENT —** `game.metadata.edit` is the canonical path for manual metadata edits. Manual editing remains available without an import confirmation, candidate discovery, or import plan. A UI may keep an input draft, but only its semantic commit goes through the owner.

**TARGET REQUIREMENT —** Rating-system edits must not silently select or apply a discovered rating. Legal copy, rating value, badges, and Disc/Case text remain distinct owner impacts even when one reviewed metadata application coordinates them.

**TARGET REQUIREMENT —** Copying a candidate to the clipboard is an external utility action, not `game.metadata.apply`. It must not mark the project dirty or imply that the candidate was accepted.

## 10. Atomic apply and project-session effects

**TARGET REQUIREMENT —** `game.import.apply` and `game.metadata.apply` must build or consume a complete next canonical project value through pure owner adapters, validate it, and commit it once. The commit is all-or-nothing.

**TARGET REQUIREMENT —** A mutating apply produces exactly one project revision increment and one future history transaction. A successful semantic no-op produces zero revision increments and no history entry.

**TARGET REQUIREMENT —** Apply must not call the network, open a picker, decode a new remote asset, request a confirmation, or depend on component-local state after commit begins. Those fallible steps belong to planning/review.

**TARGET REQUIREMENT —** The active project path and clean baseline survive full import and metadata apply unchanged. Dirty is derived after commit. Apply does not Save, Save As, create a project, replace a session, or change workspace navigation.

**TARGET REQUIREMENT —** Save snapshot creation cannot observe half an apply. Save/lifecycle replacement either obtains the stable pre-apply state, waits for/rejects against the exclusive project-mutation scope, or obtains the complete post-apply state under lifecycle policy.

**TARGET REQUIREMENT —** Apply feedback is emitted only after the commit succeeds. Failure or conflict leaves canonical content, revision, baseline, path, navigation, and history unchanged.

## 11. Disc and Case target/field ownership

**TARGET REQUIREMENT —** The shared Game workflow owns request/plan/apply coordination. Disc and Case adapters map accepted impacts to existing project and feature owners; they do not clone search, metadata, source, visibility, layout, save/load, or renderer semantics.

### Complete Disc/Case field and feature impact matrix

| Claim class | Field/feature | Canonical owner | Disc target behavior in reviewed plan | Case target behavior in reviewed plan | Default existing-project policy |
| --- | --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Search-result title/App ID/thumbnail/price | Search workflow only | Selection identity may lead to planning; display fields never enter project by themselves | Same | Ephemeral `no-op` for project content |
| **TARGET REQUIREMENT** | Selected Steam game identity/details/artwork catalog | Project game state | Replace accepted imported game aggregate | Replace accepted imported game aggregate | Compare; explicit replace; preserve on cancel/failure |
| **TARGET REQUIREMENT** | Imported genres/categories | Selected imported game aggregate | Retain normalized source data; no direct Disc visual mutation | May supply reviewed feature-bullet candidates; no other silent composition | Preserve existing/manual targets unless accepted |
| **TARGET REQUIREMENT** | Imported short/detailed description | Selected imported game aggregate + #181 copy owner | Retain normalized source data; no direct Disc visual mutation | Supply short/medium/full reviewed Case copy variants | Preserve manual Case copy; selected variant only |
| **TARGET REQUIREMENT** | Imported minimum/recommended requirements | Selected imported game aggregate + Case copy owner | Retain normalized source data; no direct Disc visual mutation | Supply separately reviewed Tray requirement impacts | Preserve manual Case requirements |
| **TARGET REQUIREMENT** | Imported website/store URL | Selected imported game aggregate/provenance | Retain validated provenance; do not render as an implicit Disc element | Retain validated provenance; do not render as an implicit Case element | Preserve; no automatic navigation or remote load |
| **TARGET REQUIREMENT** | Imported raw rating/legal/platform data | Selected imported game aggregate + candidate owners | Feed normalized explicit candidates only | Feed normalized explicit candidates only | Preserve canonical targets until accepted |
| **TARGET REQUIREMENT** | Imported artwork catalog | Selected imported game aggregate + asset candidate owner | Expose candidates to established Disc artwork owners | Expose candidates to each compatible Case image owner | Preserve applied/custom assets until accepted |
| **TARGET REQUIREMENT** | Manual game title | Project game/title owner | Add/replace with accepted imported title | Add/replace with accepted imported title | Preserve manual override by default |
| **TARGET REQUIREMENT** | Metadata title | Project metadata owner | Add/replace; Disc metadata-bound title resolves through binding owner | Add/replace; Case fields using metadata consume canonical value | Preserve manual value unless accepted |
| **TARGET REQUIREMENT** | Subtitle/edition | Project metadata owner | Preserve unless separately supplied/edited | Preserve unless separately supplied/edited | Preserve |
| **TARGET REQUIREMENT** | Steam App ID | Project metadata owner | Add/replace accepted numeric identity | Add/replace accepted numeric identity | Replace only with reviewed game change |
| **TARGET REQUIREMENT** | Developer | Project metadata owner | Add/replace normalized imported names | Add/replace normalized imported names | Preserve manual value by default |
| **TARGET REQUIREMENT** | Publisher | Project metadata owner | Add/replace normalized imported names | Add/replace normalized imported names | Preserve manual value by default |
| **TARGET REQUIREMENT** | Release date | Project metadata owner | Add/replace accepted source date | Add/replace accepted source date | Preserve manual value by default |
| **TARGET REQUIREMENT** | Backup date | Project metadata owner | No import-derived value | No import-derived value | Preserve |
| **TARGET REQUIREMENT** | Disc number / total | Project metadata owner | No import-derived value; metadata binding remains | No import-derived value | Preserve |
| **TARGET REQUIREMENT** | Install notes | Project metadata owner | No import-derived value | May remain separately editable for Case copy | Preserve |
| **TARGET REQUIREMENT** | Rating system/value | Metadata owner | Candidate apply is explicit; accepted visual impact may enable/update Disc badge | Candidate apply is explicit; accepted visual impact may enable/update compatible Case rating target | Preserve manual/custom; clear/replace only when reviewed |
| **TARGET REQUIREMENT** | Copyright/legal metadata | Metadata owner | Explicit candidate can bind accepted value to Disc legal text | Explicit candidate can feed accepted visible Case legal target | Preserve manual value; clear/replace only when reviewed |
| **TARGET REQUIREMENT** | Disc title text values/sources | Disc text owner | Accepted imported title/App ID/source changes use binding transition and clamp rules | Not applicable | Preserve manual sources/layout; only accepted source changes |
| **TARGET REQUIREMENT** | Disc curved legal text | Disc text owner | Accepted non-empty legal visual impact may minimally enable; accepted clear may disable only when shown | Not applicable | Preserve manual text and enabled state by default |
| **TARGET REQUIREMENT** | Disc title/logo artwork | Disc title-artwork owner | Offer staged Steam candidates; accepted replacement preserves layout unless separately selected | Mapped independently to Case surfaces | Preserve custom/manual asset and layout |
| **TARGET REQUIREMENT** | Disc background artwork | Disc background owner | Imported artwork catalog becomes available; no automatic background replacement | Case artwork slots consume candidates through their own owners | Preserve image, source, enabled state, scale, and offset |
| **TARGET REQUIREMENT** | Additional artwork | Existing Disc/Case additional-artwork owner | No silent creation/replacement | No silent creation/replacement on any surface | Preserve |
| **TARGET REQUIREMENT** | Steam banner branding | Steam banner owner | No silent import change | Shared branding adapter only if an accepted target exists | Preserve |
| **TARGET REQUIREMENT** | Developer/publisher/additional logos | Logo asset owners | Names may enable later discovery; no silent logo application | Same shared candidate catalog through Case slot adapters | Preserve assets, sources, visibility, layout |
| **TARGET REQUIREMENT** | Media mark | Media-mark owner | No inferred import change | No inferred import change | Preserve |
| **TARGET REQUIREMENT** | Operating-system/platform marks | Platform-mark owner | Offer normalized Steam inference; apply only accepted eligibility/source impacts | Map accepted shared marks only to compatible Case targets | Preserve manual/custom choices and layouts |
| **TARGET REQUIREMENT** | Technical marks | Technical-mark owner | No inferred import change | No inferred import change | Preserve |
| **TARGET REQUIREMENT** | Disc-number artwork | Disc-number owner | No inferred import change | Not applicable | Preserve |
| **TARGET REQUIREMENT** | Case description variants | #181 copy owner + Case text adapter | Not applicable | Plan exposes short/medium/full and accepted selected value | Preserve manual copy; no silent medium choice |
| **TARGET REQUIREMENT** | Case Tray description | Case Tray text owner | Not applicable | Accepted non-empty value is added/replaced and minimally enabled | Preserve manual value/layout; accepted visibility only |
| **TARGET REQUIREMENT** | Case Tray minimum requirements | Case Tray text owner | Not applicable | Accepted non-empty value is added/replaced and minimally enabled | Preserve manual value/layout |
| **TARGET REQUIREMENT** | Case Tray recommended requirements | Case Tray text owner | Not applicable | Accepted non-empty value is added/replaced and minimally enabled | Preserve manual value/layout |
| **TARGET REQUIREMENT** | Case Tray feature bullets | Case Tray text-list owner | Not applicable | Accepted non-empty items are added/replaced and minimally enabled | Preserve manual items/layout |
| **TARGET REQUIREMENT** | Case Tray legal/copyright text | Case Tray text owner | Not applicable | Accepted non-empty value is added/replaced and minimally enabled | Preserve manual value/layout |
| **TARGET REQUIREMENT** | Case Cover title/logo artwork | Case Cover title-artwork owner | Not applicable | Offer staged title/logo candidate separately | Preserve custom asset, visibility, and layout |
| **TARGET REQUIREMENT** | Case Tray title/logo artwork | Case Tray title-artwork owner | Not applicable | Offer staged title/logo candidate separately | Preserve custom asset, visibility, and layout |
| **TARGET REQUIREMENT** | Case left-spine title/logo artwork and title text | Left-spine owners | Not applicable | Separate accepted impacts; artwork acceptance must not silently disable text | Preserve both owners unless reviewed |
| **TARGET REQUIREMENT** | Case right-spine title/logo artwork and title text | Right-spine owners | Not applicable | Separate accepted impacts; artwork acceptance must not silently disable text | Preserve both owners unless reviewed |
| **TARGET REQUIREMENT** | Case rating mark | Shared rating + Case mark-slot owner | Not applicable | Explicit accepted candidate may enable/update compatible target | Preserve custom/manual mark and layout |
| **TARGET REQUIREMENT** | Case presets/composition/layout | Case preset/layout owners | Not applicable | Only an explicit reviewed #168 preset choice may apply a coordinated preset | Preserve; no silent preset/default layout reset |
| **TARGET REQUIREMENT** | Templates, physical geometry, export guides, navigation, selection, zoom/pan | Respective owners | Import does not change them | Import does not change them | Preserve; any future explicit geometry proposal delegates validation/plan/apply to the Disc geometry workflow contract |

**TARGET REQUIREMENT —** A target marked not applicable cannot be synthesized merely to claim parity. A shared value may feed distinct adapters, but its visible manifestation remains owned per compatible surface. Any explicit Disc preset choice in an import plan must consume a fresh immutable plan from [`DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md`](DISC_LAYOUT_PRESET_WORKFLOW_CONTRACT.md) and join the same atomic Game after-state; Game does not call a private preset setter sequence or own preset compatibility.

## 12. Case text visibility and copy/layout boundaries

**TARGET REQUIREMENT —** For [#310](https://github.com/thelordofdino4/steam-backup-label-studio/issues/310), any selected non-empty Case text value accepted in an import plan must be visibly rendered after successful apply. The plan must include the minimum necessary `enable` impact for that exact text owner.

**TARGET REQUIREMENT —** Visibility is not navigation. Enabling an accepted Case text owner makes it render; navigating to `surface.case.back` or focusing its control merely reveals the owner. Neither action may stand in for the other.

**TARGET REQUIREMENT —** Minimal enablement must not enable unrelated text, clear another owner, reset a layout, move a surface, select a preset, change a source not shown in the plan, or replace manual content. Empty/unselected imported values remain `preserve` or `no-op` and are not enabled.

**TARGET REQUIREMENT —** Issue [#181](https://github.com/thelordofdino4/steam-backup-label-studio/issues/181) owns the short/medium/full Case back-copy chooser, the precise fitting feedback, and manual-override preservation. `game.import.plan` must expose those variants and record the selected accepted value; it must not silently choose medium in the target workflow.

**TARGET REQUIREMENT —** Issue [#149](https://github.com/thelordofdino4/steam-backup-label-studio/issues/149) owns the remaining structured Case composition and layout work. This contract does not authorize full-box composition, overlap resolution, bulk layout reset, or a new Case rendering model.

**TARGET REQUIREMENT —** Issue [#168](https://github.com/thelordofdino4/steam-backup-label-studio/issues/168) owns Case preset definitions. A preset may participate only as an explicit reviewed plan choice and can never be inferred silently from Steam data or fresh-project status.

## 13. Busy scopes, cancellation, and reentrancy

**TARGET REQUIREMENT —** Busy state is operation-specific. One global `isLoading` flag must not decide unrelated capabilities.

| Claim class | Busy scope | Reentrancy | What remains available | Conflicts |
| --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | `busy.game.search` | Replaceable; newest search supersedes older | Query editing, leaving Game, metadata editing when no project lock | Cannot let older completion change current state |
| **TARGET REQUIREMENT** | `busy.game.import.plan` | Replaceable by new selection/re-plan; cancellable | Plan cancellation, leaving Game; project edits invalidate plan | Must not mutate project or overlap another active plan for same consumer |
| **TARGET REQUIREMENT** | `busy.game.metadata.discover` | Replaceable; newest matching discovery wins | Manual metadata editing, leaving Game | Project edit invalidates result consumer |
| **TARGET REQUIREMENT** | `busy.game.import.apply` | Non-reentrant and exclusive | Read-only progress/cancel only before commit boundary | Conflicts with other project mutation, replacement, and unstable Save snapshot |
| **TARGET REQUIREMENT** | `busy.game.metadata.apply` | Non-reentrant and exclusive | Read-only progress | Same project-mutation conflicts as import apply |
| **TARGET REQUIREMENT** | `game.metadata.edit` commit | Synchronous; one semantic commit | Input drafting outside commit | Rejected while exclusive project mutation owns commit lock |

**TARGET REQUIREMENT —** Cancellation before commit returns the shared `cancelled` result and cleans staged resources. After the synchronous atomic commit begins, cancellation cannot expose a partial state; it either has no effect on the completed commit or is unavailable.

**TARGET REQUIREMENT —** Search/discovery transport abort may be implemented, but abort is not relied on for correctness. Workflow close, session replacement, and supersession must invalidate consumers immediately.

## 14. Typed outcomes, diagnostics, and feedback

**TARGET REQUIREMENT —** Game operations reuse `ApplicationCommandResult<T>` from the lifecycle contract with the exact outer statuses `success`, `cancelled`, `declined`, and `failure`. They must not introduce a second generic success/error envelope.

**TARGET REQUIREMENT —** Operation-specific detail lives in the typed success value, feedback intent, or structured `ApplicationCommandError` details. Supersession/cancellation uses `cancelled` with `reason: 'operation-cancelled'` and an operation detail such as `superseded`; a session/revision conflict uses `failure` with a recoverable workflow-conflict code and exact conflict detail. Existing lifecycle decline reasons are not broadened casually.

### Failure, cancellation, and cleanup matrix

| Claim class | Situation | Required outer status | Project effect | Cleanup requirement | Feedback/diagnostic policy |
| --- | --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Search/plan/discovery succeeds | `success` | None | Release request-only handles; retain only resources owned by the current result/plan | Render current results/plan/candidates and accessible status |
| **TARGET REQUIREMENT** | Apply succeeds with changes | `success` | One atomic revision | Transfer accepted assets to project owners; release all unaccepted/staged resources | One coherent summary of applied and preserved impacts |
| **TARGET REQUIREMENT** | Apply succeeds with no accepted differences | `success` | None | Release all plan resources | Explicit no-op summary; no false “updated” claim |
| **TARGET REQUIREMENT** | User cancels plan/apply before commit | `cancelled` | None | Abort when supported; release staged assets, buffers, handles, and plan state | Neutral feedback; restore initiating focus when appropriate |
| **TARGET REQUIREMENT** | Older request is superseded | `cancelled` internally | None | Discard response and release its transport/result resources | No stale success/error toast; optional quiet current-state indication |
| **TARGET REQUIREMENT** | Session/revision/selection no longer matches | `failure` recoverable conflict | None | Invalidate plan/candidates and release their staged resources | Explain that review is stale and offer re-plan/re-discover |
| **TARGET REQUIREMENT** | Validation fails | `failure` validation | None | Retain safe review state needed to correct input; release unusable resources | Field/impact-specific diagnostic and focus target |
| **TARGET REQUIREMENT** | Remote/source partially unavailable during planning | `success` with warnings or `failure` if blocker | None | Release failed-source resources; retain only valid current candidates | Preserve per-source status and identify omitted impacts |
| **TARGET REQUIREMENT** | Atomic commit fails | `failure` | None | Roll back/avoid ownership transfer and release staged resources | Global failure plus diagnostic correlation; no success announcement |

**TARGET REQUIREMENT —** Feedback must be globally perceivable when Game is hidden or Home is visible and locally contextual when the workflow is visible. Multiple owner diagnostics may appear in the review, but adapters must not emit contradictory independent success toasts.

**TARGET REQUIREMENT —** Diagnostics must identify operation ID, request/plan ID, session ID, base/current revision when relevant, source status, affected owner/target, recoverability, and cleanup status without logging raw sensitive or unbounded external content.

## 15. Navigation, focus, accessibility, and presentation adapters

**TARGET REQUIREMENT —** Game uses the ownership-reference vocabulary `area.game`, `owner.game.search`, `owner.game.import`, `owner.game.metadata`, and `owner.game.metadata-assistance`, plus its registered `control.game.*` destinations. Navigation reports its own typed result and never claims mutation success.

### Focus and accessibility matrix

| Claim class | Event | Required focus behavior | Announcement/status behavior | Mutation boundary |
| --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Navigate to Game | Reveal ancestors and focus requested Game destination or workflow heading | Identify Game workflow without starting it | None |
| **TARGET REQUIREMENT** | Search begins | Keep query/trigger context stable unless user moves focus | Announce busy once through current live status | None |
| **TARGET REQUIREMENT** | Search succeeds | Do not steal focus; expose result count and keyboard-reachable result collection | Announce current result count | None |
| **TARGET REQUIREMENT** | Select result | Move/retain focus according to explicit activation; identify selected identity | Announce selection and availability of review | None |
| **TARGET REQUIREMENT** | Plan ready | Focus review heading only when the initiating action opened/replaced the review step | Announce warnings/blockers and changed-impact count | None |
| **TARGET REQUIREMENT** | Validation/conflict | Focus first actionable invalid impact or review summary | Announce concise recoverable reason | None |
| **TARGET REQUIREMENT** | Apply succeeds | Keep focus in stable summary/action region; do not force preview navigation | Announce coherent applied/preserved result | One atomic commit |
| **TARGET REQUIREMENT** | “View affected target” action | Dispatch typed editor destination after apply | Navigation result is separate from apply result | None |
| **TARGET REQUIREMENT** | Cancel/close | Return focus to stable invoker when it still exists; otherwise workflow/navigation fallback | Neutral cancellation/close status as appropriate | None |
| **TARGET REQUIREMENT** | Return Home | Home focus follows lifecycle contract; no hidden Game host receives focus | Invalidate pending Game consumers without stale feedback | None |

**TARGET REQUIREMENT —** Result rows, candidates, impact choices, warnings, blockers, progress, and current selection must have programmatic names/state and keyboard access. Color, list position, thumbnail, or toast alone cannot convey selection, conflict, or success.

**TARGET REQUIREMENT —** Presentation adapters may render, group, expand, and focus workflow state; dispatch typed operations; and render typed results. They may not own result identity, latest-wins logic, candidate acceptance, impact classification, plan validity, project mapping, feature enablement, or setter order.

**OPEN QUESTION —** Final Game host placement, responsive layout, and visual stepper design remain presentation decisions. They must be evaluated without weakening the rich-workflow, focus, or semantic-owner requirements.

## 16. Persistence, lifecycle, security, and future-history boundaries

### Persistence, dirty, and history matrix

| Claim class | State/effect | Project-file persistence | Dirty effect | Revision/history effect | Lifecycle rule |
| --- | --- | --- | --- | --- | --- |
| **TARGET REQUIREMENT** | Query string | No | None | None | Retain across leave-Game/Return Home/Resume in same session; clear on project replacement/close |
| **TARGET REQUIREMENT** | Results, selection, candidates, warnings, plan | No | None | None | Discard on leave-Game/Return Home and invalidate on project mutation/replacement |
| **TARGET REQUIREMENT** | Request generations, busy, abort handles, focus | No | None | None | Ephemeral; invalidate/clean on workflow close or session change |
| **TARGET REQUIREMENT** | Staged remote assets/temp resources | No until accepted canonical embedding/provenance | None before apply | None before apply | Clean on stale/cancel/failure/close; accepted assets follow project asset owner |
| **TARGET REQUIREMENT** | Successful mutating import apply | Existing schema fields only | Re-derived against unchanged baseline | Exactly one revision; one future history transaction | Same session/path/project kind |
| **TARGET REQUIREMENT** | Successful metadata apply/edit | Existing schema fields only | Re-derived against unchanged baseline | One revision per semantic mutation; one future history transaction | Same session/path/project kind |
| **TARGET REQUIREMENT** | No-op/cancel/failure/conflict | No content change | None | No revision/history entry | Session unchanged |
| **FUTURE EXTENSION** | Undo/redo | Persist only if a separately approved schema requires it | Per restored canonical state | Apply is one transaction | Lifecycle contract remains authoritative |

**TARGET REQUIREMENT —** Return Home is non-destructive and Resume returns to the same active session and retained editor destination under the lifecycle contract. As an explicit Game ephemeral-state rule, leaving Game or Return Home retains only the normalized query string; it invalidates requests and discards results, selection, candidates, plan, errors, and staged resources. Project replacement or close clears even the query.

**TARGET REQUIREMENT —** External Steam/API/page/asset data is untrusted. Before it reaches review or project owners, adapters must validate provider identity and URLs, normalize/cap strings and arrays, strip unsafe markup, preserve safe provenance, reject unsupported data shapes, and prevent executable content from becoming renderer input.

**TARGET REQUIREMENT —** Remote-resource owners must enforce HTTPS/host policy, redirect policy, response-size/time limits, media validation, and cleanup of temporary files, object URLs, buffers, and abort handles on success, stale completion, cancellation, failure, workflow close, and session replacement.

**TARGET REQUIREMENT —** Search/import diagnostics must not expose credentials, local library paths, unbounded HTML, data URLs, or full binary payloads. Project persistence of accepted assets/provenance remains governed by the project and asset owners.

**FUTURE EXTENSION —** A history system may later undo one import apply as one transaction and one metadata apply/edit as its own transaction. This contract defines transaction granularity but does not introduce a history stack or schema.

## 17. Acceptance criteria and implementation order

**TARGET REQUIREMENT —** The first conforming implementation must satisfy all of these acceptance criteria:

- all six exact operation IDs dispatch through focused semantic owners;
- Game is navigable as `area.game` and no navigation action applies project data;
- Search, selection, discovery, and planning are proven non-mutating;
- same-query and different-query races prove latest-request-wins behavior, including Enter/reentrancy paths;
- result selection remains stable by provider/App ID rather than list position;
- the immutable plan contains session ID, base revision, complete impacts, accepted choices, warnings/blockers, and cleanup ownership;
- fresh and existing projects exercise the same planning/apply code path;
- a stale session/revision plan is rejected with zero project mutation;
- mutating apply produces one revision and one future history transaction boundary;
- Save cannot snapshot a half-applied state;
- metadata discovery never applies, and manual metadata edit never requires import confirmation;
- Disc and Case adapters cover every applicable field/feature row in section 11 without parallel feature state;
- every accepted non-empty Case text target is visible after apply through only its paired minimal enablement;
- Case copy variants and selected accepted copy integrate with #181 without absorbing #149 composition work;
- Case presets are applied only by explicit reviewed choice under #168;
- cancellation, stale completion, failure, and workflow close clean staged resources and emit no false success;
- typed result, focus, live-status, keyboard, and global-feedback behavior meets sections 14 and 15; and
- save/load, preview/export parity, current path, baseline, project kind, and user-created assets remain preserved.

**TARGET REQUIREMENT —** Implementation order is:

1. Introduce focused workflow types, exact operation registry, request generations, and tests without changing current project mutation.
2. Separate `game.metadata.discover` from `game.metadata.apply`, route manual commits through `game.metadata.edit`, and remove combined auto-apply semantics.
3. Extract pure Disc/Case planning adapters and a complete immutable plan; remove project setters from planning helpers.
4. Add the exclusive atomic commit boundary, session/revision validation, one-revision semantics, and lifecycle/save interlock.
5. Implement the rich Game review adapter, stable selection, focus/live-status behavior, and #304 race coverage.
6. Integrate #310 minimal Case visibility and #181 variant selection while preserving #149/#168 ownership boundaries.
7. Add end-to-end source, project snapshot/restore, preview/export parity, accessibility, cancellation, cleanup, and user-visible native Tauri verification required by repository policy.

**TARGET REQUIREMENT —** No step may bypass the focused owner by temporarily adding setter/network logic to `App.tsx` or presentation components. Migration shims must still dispatch the semantic operation and be removed once their adapter is replaced.

## 18. Issue mapping, non-goals, open questions, and evidence index

### Issue, dependency, and ownership matrix

| Claim class | Issue | Relationship to this contract | Primary owner/dependency |
| --- | --- | --- | --- |
| **TARGET REQUIREMENT** | [#304](https://github.com/thelordofdino4/steam-backup-label-studio/issues/304) | Principal search generation/latest-wins implementation issue | `game.search`; request identity and stale disposal |
| **TARGET REQUIREMENT** | [#310](https://github.com/thelordofdino4/steam-backup-label-studio/issues/310) | Principal Case imported-text visibility implementation issue | Import plan + Case text owners; minimal enablement |
| **TARGET REQUIREMENT** | [#181](https://github.com/thelordofdino4/steam-backup-label-studio/issues/181) | Owns Case copy variant chooser and fitting feedback | Case copy owner consumed by `game.import.plan` |
| **TARGET REQUIREMENT** | [#149](https://github.com/thelordofdino4/steam-backup-label-studio/issues/149) | Owns remaining Case structured composition/layout only | Case layout/composition owners, outside shared workflow shell |
| **TARGET REQUIREMENT** | [#281](https://github.com/thelordofdino4/steam-backup-label-studio/issues/281) | Guided slot consumer of accepted changes; does not authorize silent Game mutation | Guided workflow owner after canonical commit |
| **FUTURE EXTENSION** | [#17](https://github.com/thelordofdino4/steam-backup-label-studio/issues/17) | Guided Start may enter Game and consume its operations | Compose lifecycle, Game operations, guided workflow, navigation |
| **TARGET REQUIREMENT** | [#168](https://github.com/thelordofdino4/steam-backup-label-studio/issues/168) | Owns Case preset definitions; presets require explicit plan selection | Preset/layout owner |
| **TARGET REQUIREMENT** | [#298](https://github.com/thelordofdino4/steam-backup-label-studio/issues/298) | Keyboard/focus prerequisite; Space behavior must not hijack Game controls | Input arbitration/accessibility owner |
| **TARGET REQUIREMENT** | [#300](https://github.com/thelordofdino4/steam-backup-label-studio/issues/300) | Global feedback precedent, including when Home is visible | Shared feedback host/result projection |
| **TARGET REQUIREMENT** | [#308](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308) | Supplies session ID, revision, path, baseline, dirty, Return Home/Resume, and lifecycle interlocks | Lifecycle contract/implementation |
| **TARGET REQUIREMENT** | [#309](https://github.com/thelordofdino4/steam-backup-label-studio/issues/309) | Supplies modal focus lifecycle if review/confirmation uses a modal host | Shared modal/focus owner |

**TARGET REQUIREMENT —** Non-goals are: implementing the workflow; changing source, tests, runtime behavior, or schema in this documentation pass; choosing final Game presentation; creating a generic workflow framework; replacing Disc/Case feature owners; adding a new renderer; defining full Case composition; defining Case presets; implementing Guided Start; introducing undo/redo; changing export semantics; or mutating GitHub issues.

**OPEN QUESTION —** #281 contains broader safe-role auto-fill direction. Before Game/import consumes it, the guided-workflow owner must reconcile that direction with this contract’s explicit reviewed apply boundary. Until then, discovery may recommend guided impacts but cannot silently apply them.

**OPEN QUESTION —** #181 must settle the final user-facing variant labels, fit thresholds, and warning presentation. The stable integration requirement is only that planning exposes all supported variants and persists the selected accepted value in the immutable plan.

**OPEN QUESTION —** #168 must define which coordinated Case presets exist and their exact impact sets. Absence of that definition means `preserve`, not a hidden default preset.

**OPEN QUESTION —** Final nonmodal/modal host choice and responsive layout remain presentation work, subject to the navigation, focus, cancellation, and ownership rules here.

### Evidence index

| Claim class | Evidence | Supports |
| --- | --- | --- |
| **CURRENT FACT** | [`useSteamImport.ts`](../src/hooks/useSteamImport.ts), [`GamePanel.tsx`](../src/components/sidebar/GamePanel.tsx) | Search state, Enter path, immediate result import, lack of generation identity |
| **CURRENT FACT** | [`steamApi.ts`](../src/steam/steamApi.ts), [`steam.rs`](../src-tauri/src/commands/steam.rs) | Search/import transport, normalized imported aggregate, Steam HTTPS/host restrictions |
| **CURRENT FACT** | [`appSteamImportPlan.ts`](../src/app/appSteamImportPlan.ts), [`appSteamImportPlan.test.ts`](../src/app/appSteamImportPlan.test.ts) | Current partial metadata plan and automatic candidate behavior |
| **CURRENT FACT** | [`App.tsx`](../src/app/App.tsx), [`appSteamDiscVisualImport.ts`](../src/app/appSteamDiscVisualImport.ts), [`useDiscTextState.ts`](../src/hooks/useDiscTextState.ts), [`useTitleArtwork.ts`](../src/hooks/useTitleArtwork.ts) | Current sequential mutation and mutation-during-calculation gap |
| **CURRENT FACT** | [`useSteamMetadataAssistance.ts`](../src/hooks/useSteamMetadataAssistance.ts), [`steamMetadataCandidates.ts`](../src/steam/steamMetadataCandidates.ts), [`steamMetadataCandidates.test.ts`](../src/steam/steamMetadataCandidates.test.ts) | Candidate discovery, source statuses, normalization, limited input-key projection |
| **CURRENT FACT** | [`backCoverCopyFit.ts`](../src/caseInsert/backCoverCopyFit.ts), [`steamBackCoverImport.ts`](../src/caseInsert/steamBackCoverImport.ts), [`steamImportDefaults.ts`](../src/caseInsert/steamImportDefaults.ts), [`steamBackCoverImport.test.ts`](../src/caseInsert/steamBackCoverImport.test.ts) | Case variants, imported fields, current visibility/layout/default behavior |
| **CURRENT FACT** | [`titleArtwork.ts`](../src/caseInsert/titleArtwork.ts), [`steamImportBrandingDefaults.ts`](../src/caseInsert/steamImportBrandingDefaults.ts) | Current Case multi-surface title-artwork seeding and rating branding defaults |
| **CURRENT FACT** | [`projectTypes.ts`](../src/project/projectTypes.ts), [`projectSchema.ts`](../src/project/projectSchema.ts), [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) | Current persistence boundary and selected Steam game/metadata/feature state |
| **TARGET REQUIREMENT** | [`APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md`](APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md), [`EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md`](EDITOR_NAVIGATION_AND_CONTROL_OWNERSHIP.md) | Shared result/session/revision/dirty and navigation/owner vocabulary |
| **TARGET REQUIREMENT** | GitHub issues linked in the matrix above, reviewed open on 2026-07-26 | Scope, dependencies, unresolved ownership, and absence of a newer focused Game workflow owner |
