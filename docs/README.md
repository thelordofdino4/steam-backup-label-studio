# Documentation Map

> Status: Authoritative documentation index.
> Purpose: Identify the active, conditional, historical, and merged documentation for this repository.
> Read when: Always read this after the root `README.md` before repository work.
> Authoritative source: This file is authoritative for documentation routing; domain documents listed below are authoritative for their own scopes.
> Last reviewed against commit: `6feb262bed2abd36b1371e5c0674013018132d16`.

This map is the entry point for repository documentation. If two documents disagree, use the conflict rule listed here rather than treating older status reports, audits, or implementation plans as current truth.

## Always Read

| Document | Status | Purpose | Read when | Conflict rule |
| --- | --- | --- | --- | --- |
| [`../README.md`](../README.md) | Authoritative overview | Product summary, current feature surface, validation expectations, and top-level workflow context. | Always, before repository work. | Product summary conflicts defer to `docs/PRD.md`; architecture conflicts defer to `docs/SOFTWARE_DESIGN_DOCUMENT.md`. |
| [`../AGENTS.md`](../AGENTS.md) | Authoritative agent rules | Required safety, preservation, validation, parity, and workflow guardrails for agents. | Always, before agent work. | Agent workflow and safety conflicts defer to `AGENTS.md`; architecture details defer to the SDD. |
| [`README.md`](README.md) | Authoritative documentation map | Which documents are active, conditional, historical, or merged. | Always, after the root `README.md`. | Documentation routing conflicts defer to this file. |

## Active Authoritative Documents

| Document | Status | Purpose | Read when | Conflict rule |
| --- | --- | --- | --- | --- |
| [`SOFTWARE_DESIGN_DOCUMENT.md`](SOFTWARE_DESIGN_DOCUMENT.md) | Authoritative | As-built architecture contracts for preview/edit/export parity, state ownership, save/load/export behavior, and subsystem boundaries. | Architecture-sensitive work, renderer/editor/export changes, save/load serialization, drag/selection, case/disc surfaces, hidden inputs, or parity work. | Architecture conflicts defer to the SDD unless `AGENTS.md` is stricter about agent behavior. |
| [`PRD.md`](PRD.md) | Authoritative | Product scope, goals, non-goals, and product direction. | Product decisions, scope tradeoffs, UX direction, or feature prioritization. | Product/scope conflicts defer to the PRD; implemented architecture conflicts defer to the SDD. |
| [`PROJECT_FILE_SPEC.md`](PROJECT_FILE_SPEC.md) | Authoritative | Current project JSON save/load schema, compatibility behavior, and future package notes. | Save/load, schema, migration, compatibility, or project-file work. | Schema conflicts defer to this spec; architecture boundary conflicts defer to the SDD. |
| [`TEXT_EDITOR_CONTRACT.md`](TEXT_EDITOR_CONTRACT.md) | Authoritative subsystem contract | Required text editor behavior, renderer ownership, parity, and regression gates. | Text-editor behavior, formatting, selection, source editing, contextual controls, or text smoke checks. | Text-editor behavior conflicts defer to this contract unless the SDD is stricter. |
| [`ARTWORK_FRAME_MATERIAL_CONTRACT.md`](ARTWORK_FRAME_MATERIAL_CONTRACT.md) | Authoritative subsystem contract | Failed artwork-frame material branch postmortem, restart guardrails, and future material-rendering merge gates. | Artwork-frame material rendering, steel/metal frame rendering, material texture generation, preview/export material parity, or issue #165 restart work. | Material-rendering conflicts defer to this contract unless the SDD or `AGENTS.md` is stricter. |

## Conditional Reference Documents

| Document | Status | Purpose | Read when | Conflict rule |
| --- | --- | --- | --- | --- |
| [`REPO_ARCHITECTURE_INVENTORY.md`](REPO_ARCHITECTURE_INVENTORY.md) | Conditional reference | As-built file and ownership inventory. It is a map of current code ownership, not a second SDD. | Finding owners before code changes, refactors, or architecture-sensitive edits. | Ownership facts defer to current source if stale; architecture rules defer to the SDD. |
| [`TEXT_EDITOR_SMOKE_AUTOMATION.md`](TEXT_EDITOR_SMOKE_AUTOMATION.md) | Conditional reference | Native Tauri text-editor smoke pilot guide plus diagnostic-only browser automation notes. | Before Any App/native smoke, browser diagnostics, or text-editor smoke/capture script updates. | Automation-process conflicts defer to this guide; behavioral contracts defer to `TEXT_EDITOR_CONTRACT.md`. |
| [`MANUAL_SMOKE_CHECKLISTS.md`](MANUAL_SMOKE_CHECKLISTS.md) | Conditional reference | Manual runtime checks for visual/editor behavior that cannot be proven by unit tests alone. | Manual/Tauri smoke planning, release checks, or user-visible visual verification. | Runtime-check conflicts defer to current feature contracts and the SDD. |
| [`VISUAL_REGRESSION_WORKFLOW.md`](VISUAL_REGRESSION_WORKFLOW.md) | Conditional reference | Fixture-based visual regression workflow and limitations. | Visual regression fixture updates or export-preview comparisons. | Visual parity conflicts defer to the SDD. |
| [`TEMPLATE_SPEC.md`](TEMPLATE_SPEC.md) | Conditional reference | Physical template concepts and template-specific data notes. | Template geometry, supported media forms, or physical output definitions. | Template implementation conflicts defer to current source plus the SDD. |
| [`DISC_EDITOR_LAYER_ORDER.md`](DISC_EDITOR_LAYER_ORDER.md) | Conditional reference | Disc preview/export layer order policy. | Disc renderer, export, or layer-order work. | Disc layer conflicts defer to this file unless the SDD establishes a stricter parity rule. |
| [`CASE_INSERT_EDITOR_LAYER_ORDER.md`](CASE_INSERT_EDITOR_LAYER_ORDER.md) | Conditional reference | Case insert layer order policy. | Case insert preview/export or layer-order work. | Case layer conflicts defer to this file unless the SDD establishes a stricter parity rule. |
| [`CSS_STYLE_OWNERSHIP.md`](CSS_STYLE_OWNERSHIP.md) | Conditional reference | CSS ownership map and style-boundary guidance. | CSS refactors, style-file moves, or design-system cleanup. | Style ownership conflicts defer to this file; component behavior conflicts defer to source and SDD. |
| [`METADATA_DISC_TEXT_BINDING.md`](METADATA_DISC_TEXT_BINDING.md) | Conditional reference | Metadata-bound disc text behavior and fallback semantics. | Disc text metadata/default-source work. | Disc metadata text conflicts defer to this file unless superseded by text-editor contract changes. |
| [`PROJECT_PACKAGE_FORMAT_DECISION.md`](PROJECT_PACKAGE_FORMAT_DECISION.md) | Conditional reference / ADR | Decision record for future `.sbls` package/container format. | Project packaging decisions or future container work. | Current JSON schema conflicts defer to `PROJECT_FILE_SPEC.md`. |
| [`refactor-audit-working-log.md`](refactor-audit-working-log.md) | Conditional evidence log | Chronological notes from the large-file refactor/audit loop that ended at merge commit `6feb262bed2abd36b1371e5c0674013018132d16`. | Understanding why oversized files were split or why a refactor stopped. | It is historical evidence only; current behavior and contracts defer to source, tests, SDD, and subsystem contracts. |

## Local Asset And Fixture References

These files remain active for their local folders but are not general repository guidance:

- [`../fixtures/projects/README.md`](../fixtures/projects/README.md)
- [`../src/assets/README.md`](../src/assets/README.md)
- [`../src/assets/placeholders/README.md`](../src/assets/placeholders/README.md)
- [`../src/assets/rating/usk/README.md`](../src/assets/rating/usk/README.md)

## Historical / Archive

Archived documents live under [`archive/`](archive/). They preserve audit history, implementation reasoning, and superseded planning context. They are not authoritative for new work.

| Document | Status | Replacement / current authority |
| --- | --- | --- |
| [`archive/ARCHITECTURE_GUARDRAILS.md`](archive/ARCHITECTURE_GUARDRAILS.md) | Historical/archive | `AGENTS.md` for agent behavior; `SOFTWARE_DESIGN_DOCUMENT.md` for architecture contracts. |
| [`archive/CASE_INSERT_EDITOR_ARCHITECTURE.md`](archive/CASE_INSERT_EDITOR_ARCHITECTURE.md) | Historical/archive | `SOFTWARE_DESIGN_DOCUMENT.md`, `REPO_ARCHITECTURE_INVENTORY.md`, and `CASE_INSERT_EDITOR_LAYER_ORDER.md`. |
| [`archive/CURRENT_STATUS.md`](archive/CURRENT_STATUS.md) | Historical/archive | Root `README.md`, `PRD.md`, and active issue/PR state. |
| [`archive/ROADMAP.md`](archive/ROADMAP.md) | Historical/archive | `PRD.md` for product direction and GitHub issues for current planning. |
| [`archive/MILESTONES.md`](archive/MILESTONES.md) | Historical/archive | `PRD.md`, root `README.md`, and GitHub issues. |
| [`archive/REFACTOR_STATUS.md`](archive/REFACTOR_STATUS.md) | Historical/archive | `SOFTWARE_DESIGN_DOCUMENT.md` and `REPO_ARCHITECTURE_INVENTORY.md`. |
| [`archive/EDITOR_UNIFICATION_FINAL_AUDIT.md`](archive/EDITOR_UNIFICATION_FINAL_AUDIT.md) | Historical/archive | `SOFTWARE_DESIGN_DOCUMENT.md`, `REPO_ARCHITECTURE_INVENTORY.md`, and current source. |
| [`archive/EDITOR_UNIFICATION_PROMPTS.md`](archive/EDITOR_UNIFICATION_PROMPTS.md) | Historical/archive | Current issues/PRs and active contracts. |
| [`archive/JEWEL_CASE_EDITOR_ISSUE_DRAFT.md`](archive/JEWEL_CASE_EDITOR_ISSUE_DRAFT.md) | Historical/archive | `PRD.md`, SDD case-insert sections, and current GitHub issues. |
| [`archive/RENDER_ARCHITECTURE_AUDIT.md`](archive/RENDER_ARCHITECTURE_AUDIT.md) | Historical/archive | `SOFTWARE_DESIGN_DOCUMENT.md` renderer/export contracts. |
| [`archive/SPAGHETTI_AUDIT.md`](archive/SPAGHETTI_AUDIT.md) | Historical/archive | `SOFTWARE_DESIGN_DOCUMENT.md` and `REPO_ARCHITECTURE_INVENTORY.md`. |

## Obsolete / Merged Guidance

- Architecture guardrails that were unique enough to keep have been preserved in `AGENTS.md` and the SDD. The old standalone guardrail document is now historical.
- Current status, roadmap, and milestone notes are merged into the root `README.md`, `PRD.md`, and live issue tracking. Old validation notes are historical and do not prove the current checkout has been manually smoked.
- Completed editor/render audits and implementation prompts are historical evidence only. They must not override the SDD, text-editor contract, repo inventory, current source, or current issues.

