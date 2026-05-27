# Agent Instructions

Before implementing new features, refactors, bug fixes, or documentation changes in this repository:

1. Read the project documentation first:
   - `README.md`
   - `docs/CURRENT_STATUS.md`
   - `docs/ROADMAP.md`
   - `docs/MILESTONES.md`
   - `docs/ARCHITECTURE_GUARDRAILS.md`
   - `docs/REFACTOR_STATUS.md` if the task touches architecture or refactoring
   - `docs/PRD.md` if the task affects product direction or scope

2. Review open GitHub issues before starting work.
   - Check whether the requested task already has an issue.
   - If related issues exist, mention them in the work summary.
   - Do not duplicate already-tracked work unless asked.

3. Preserve current working behavior unless explicitly asked to change it.
   - Steam search/import should keep working.
   - Artwork import and local screenshot behavior should keep working.
   - Save/load should keep working.
   - PNG export should keep working.
   - Disc text preview/export behavior should keep matching.
   - Drag, slider/manual positioning, upload/custom image, reset/clear, and save/load behavior for existing visual elements should keep working.
   - Treat the current disc editor systems as working launchpad infrastructure. Extend and migrate them carefully instead of replacing the editor wholesale unless a specific replacement path has been planned and reviewed.

4. Prefer small, reviewable changes.
   - Do not combine unrelated refactors, bug fixes, and features in the same change.
   - Run `npm run build` and `npm run lint` after code changes.
   - For visual/editor changes, ask the user to verify with `npm run tauri dev`.

5. Follow the architecture guardrails. This is a hard rule, not a preference.
   - New logic must not be crammed into existing unrelated structures.
   - If a change does something new, create a focused new `.ts` or `.tsx` module for it.
   - If an existing feature needs updating, update it where that feature belongs.
   - If an update grows into a new feature or new responsibility, extract it into a new `.ts` or `.tsx` module.
   - No more logic dumping grounds: do not add feature-specific state transitions, renderers, export drawing, upload/import logic, pointer math, layout/clamp math, or serialization logic to `App.tsx` or other catch-all files.
   - When a regression exposes hidden coupling, refactor the ownership boundary first, then fix the symptom in the correct module.

6. Treat `App.tsx` as orchestration/state only where practical.
   - Prefer focused components, hooks, domain modules, and utility modules over adding large new blocks back into `App.tsx`.
   - If a handler needs more than trivial orchestration, create or update a focused hook/domain module and call it from `App.tsx`.

7. Do not delete or overwrite user-created assets or project files unless explicitly instructed.

8. Follow the editor UI hierarchy rules for optional visual features.
   - Optional visual features should expose only their top-level show/enable checkbox when disabled.
   - When disabled, dependent controls should be hidden from view, not merely greyed out.
   - Disabled visual features should not render in preview or PNG export.
   - Disabling a feature must not destroy its saved state; re-enabling should restore previous selections, uploaded assets, layout, scale, source choices, custom images, and other settings.
   - Inside an enabled feature section, prefer this control order:
     1. Show/enable checkbox.
     2. Subordinate optional checkboxes, visually grouped under the enabled feature.
     3. Source/type/value controls, including dropdowns or compact single-choice controls.
     4. Text/value inputs.
     5. Upload/custom asset controls, placed near the source/type choice they depend on.
     6. Placement/alignment presets.
     7. Sliders and fine-tuning controls.
     8. Reset/clear actions.
   - Keep related subordinate controls visually grouped so users can tell which controls belong to the enabled feature.
   - Apply this pattern especially to branding/artwork systems such as developer logo, publisher logo, rating badge, media mark, platform marks, and future optional metadata text elements.
   - For rating badges, the top-level show/enable checkbox is the user-facing “no rating badge” control. Do not expose a redundant visible “none” rating system option inside enabled rating controls unless explicitly requested for backward-compatibility UI.

9. For Codex or other agent-driven validation, do not run `npm run tauri dev` unless the user explicitly asks.
   - Run `npm run lint` and `npm run build` after code changes.
   - Leave interactive UI, drag, preview/export parity, and desktop-window checks for the user to verify manually.
