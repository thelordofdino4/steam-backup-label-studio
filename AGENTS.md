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
   - Before creating new behavior or a new module, do a light search for existing owners: nearby domain modules, hooks, renderers, layout helpers, export helpers, project/schema helpers, and utilities.
   - If an existing feature or module already owns that behavior, update the existing owner instead of creating a parallel implementation.
   - If a change does something genuinely new, create a focused new `.ts` or `.tsx` module for it.
   - If an existing feature needs updating, update it where that feature belongs.
   - If an update grows into a new feature or new responsibility, extract it into a new `.ts` or `.tsx` module.
   - Presentation components may call domain helpers/selectors, but must not own domain decisions, mapping rules, layout/clamp math, upload/import rules, or state transition rules.
   - New logic must not be crammed into existing unrelated structures.
   - No more logic dumping grounds: do not add feature-specific state transitions, renderers, export drawing, upload/import logic, pointer math, layout/clamp math, or serialization logic to `App.tsx` or other catch-all files.
   - When a regression exposes hidden coupling, refactor the ownership boundary first, then fix the symptom in the correct module.

6. Treat `App.tsx` as orchestration/state only where practical.
   - Prefer focused components, hooks, domain modules, and utility modules over adding large new blocks back into `App.tsx`.
   - If a handler needs more than trivial orchestration, create or update a focused hook/domain module and call it from `App.tsx`.

7. Keep presentation components presentational.
   - Sidebar and preview components may render controls/artifacts and call imported domain helpers or selectors.
   - They should not contain feature-specific branching that decides what a value means, where state comes from, how layout is clamped, how uploads are interpreted, or how project data is normalized.
   - If a component needs that kind of decision, move the decision into the feature's domain module, a focused selector/view-model helper, or a hook, then pass the result into the component.

8. Do not delete or overwrite user-created assets or project files unless explicitly instructed.

9. Follow the editor UI hierarchy rules for optional visual features.
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

10. Follow the primary checkout and runtime verification rule for user-visible fixes.
   - Primary checkout: `C:\Users\John Paul Keller\steam-backup-label-studio`.
   - Pushing a fix to `origin/main` is not enough when the user is testing from the primary checkout. The primary checkout must either be synced to the fixed commit or reported as blocked with exact dirty/conflicting files.
   - When the user reports that the app still behaves incorrectly after a claimed fix, do not immediately make another code change. First verify the actual checkout and runtime state:
     - `git status --short`
     - `git branch --show-current`
     - `git rev-parse HEAD`
     - `git fetch origin`
     - `git rev-parse origin/main`
     - whether the primary checkout contains the claimed fix commit
     - whether a stale Vite, Tauri, or other dev-server process is still serving old code
     - whether ignored generated output such as `dist/` is stale
   - Kill stale dev-server processes only when it is safe and clearly tied to this repository runtime.
   - Rebuild generated or ignored runtime output such as `dist/` when the user is testing a built/static runtime path, then retest or ask the user to retest.
   - Clean side worktrees are allowed to protect dirty WIP, but they are not enough for final user-facing verification when the user tests from the primary checkout. A clean worktree can prove the source builds; it does not prove the user's running app has updated.
   - Do not claim a live UI/runtime regression is fixed solely from helper or unit tests. The final report for user-visible fixes must distinguish source validation passed, primary checkout synced, runtime rebuilt/restarted, live/browser/Tauri/manual behavior verified, and anything explicitly left for the user.
   - If the primary checkout is dirty, do not overwrite user work. Inspect dirty files and incoming files. If they do not overlap, safely stash/reapply or report the exact safe action. If they overlap, stop and report exact conflicting files. Do not leave the primary checkout stale without a concrete blocker.
   - Final reports for user-visible fixes must include: `origin/main` SHA, primary checkout SHA, whether the primary checkout is clean or dirty, whether it is synced to the fix, whether stale dev processes were found or stopped, whether `dist/` or other generated runtime output was rebuilt, validation commands run, what was actually verified in the running app, and what remains for the user to verify.

11. For Codex or other agent-driven validation, do not run `npm run tauri dev` unless the user explicitly asks.
   - Run `npm run lint` and `npm run build` after code changes.
   - Leave interactive UI, drag, preview/export parity, and desktop-window checks for the user to verify manually.
   - The primary checkout/runtime verification rule does not grant blanket permission to run Tauri; it requires stale runtime and build-output state to be detected and reported instead of repeatedly patching source code blindly.
