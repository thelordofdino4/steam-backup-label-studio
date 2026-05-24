# Agent Instructions

Before implementing new features, refactors, bug fixes, or documentation changes in this repository:

1. Read the project documentation first:
   - `README.md`
   - `docs/CURRENT_STATUS.md`
   - `docs/ROADMAP.md`
   - `docs/MILESTONES.md`
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

4. Prefer small, reviewable changes.
   - Do not combine unrelated refactors, bug fixes, and features in the same change.
   - Run `npm run build` and `npm run lint` after code changes.
   - For visual/editor changes, ask the user to verify with `npm run tauri dev`.

5. Treat `App.tsx` as orchestration/state only where practical.
   - Prefer focused components, hooks, and utility modules over adding large new blocks back into `App.tsx`.

6. Do not delete or overwrite user-created assets or project files unless explicitly instructed.
