# Case Insert Editor Architecture

Issue context: #126, #127, and #128.

This note records the architecture decision for the jewel case editor foundation. It is intentionally small and should stay close to the first implementation pass. The goal is to keep the working disc-label editor stable while adding a separate case insert editor surface.

## Accepted Direction

Steam Backup Label Studio has separate editor environments that share lower-level systems.

- The Disc Editor owns circular disc-label projects.
- The Case Insert Editor owns rectangular case insert projects.
- Jewel case is the first supported case insert template inside the Case Insert Editor.
- Jewel case is not another disc template in the Disc Editor.
- DVD/Amaray and Blu-ray belong in the Case Insert Editor later, but they should remain unavailable until they have usable template, preview, save/load, and export support.

## Model Boundaries

The app should keep these concepts separate:

- Workspace: the current app surface, such as `home`, `disc`, or `caseInsert`.
- Project type: the saved project family, such as `disc` or `caseInsert`.
- Template or case variant: the concrete physical layout used inside a project type.

Examples:

- A disc project can choose a disc template such as `standardPrintableDisc` or `custom`.
- A case insert project can choose a case insert template such as `jewelCase`.
- Future DVD/Amaray or Blu-ray case variants should be case insert templates, not new disc templates.

The runtime workspace is allowed to be `home`, but `home` is not a project type. Saved projects should eventually route by their project type once #131 adds the case project schema and normalization.

## Shared Systems

Case insert work should reuse existing systems when the existing system owns the behavior:

- Steam/manual metadata and metadata candidates.
- Steam artwork, screenshots, local screenshots, web candidates, and uploaded image import paths.
- Asset provenance/status and future package-format decisions.
- Rating badges, media marks, platform marks, technical marks, and logo helpers where they are region-agnostic.
- Toast/status feedback.
- Save/load plumbing and normalization patterns.
- Export helper patterns, canvas-safe image loading, and preflight patterns.

Shared does not mean the disc editor owns case behavior. Shared systems should remain lower-level helpers or be extracted into focused modules when case work exposes a broader responsibility.

## Editor-Owned Systems

Case insert behavior should live in focused case modules instead of disc-specific owners:

- Case project state and defaults.
- Rectangular template geometry.
- Front, back, and spine region layout.
- Case-specific artwork fitting and safe-zone rules.
- Case preview rendering.
- Case export rendering.
- Case-specific export preflight warnings.
- Case sidebar panels and workflow tabs.

Disc-specific circular geometry, disc text layout, disc export drawing, and disc preview behavior should remain disc-owned.

## Implementation Guardrails

- Keep `App.tsx` as orchestration for workspace routing and top-level wiring.
- Do not add jewel-case state, layout math, renderer logic, upload/import rules, or export drawing to `App.tsx`.
- Do not hide or destabilize the disc editor while the case editor is incomplete.
- Keep `New Case Insert` as the user-facing entry label.
- Blank project entry should remain direct and lightweight.
- Guided Start remains future workflow; it can be represented as planned, but it should not become a required path for case or disc creation.
- Preview/export parity must be explicit from the first real case preview/export pass.

## Next Implementation Path

1. Finish the home/workspace entry point in #128.
2. Generalize the template model for rectangular case layouts in #129.
3. Add the physical jewel case template and guides in #130.
4. Add case project save/load schema and normalization in #131.
5. Continue into focused case state, layout, preview, editor surface, export, and preflight issues.
