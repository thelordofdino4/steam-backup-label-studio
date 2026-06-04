# Visual Regression Workflow

This workflow is the manual process for checking live preview and PNG export parity across saved project fixtures. It supports the closed issue #65 workflow and is intentionally documentation-only unless a separate issue asks for fixture or rendering fixes. Do not treat a mismatch found here as part of an unrelated docs task.

Last refreshed: 2026-06-03.

## Purpose

Use this pass when visual rendering changes, project fixtures change, export behavior changes, or a release candidate needs a manual disc-editor smoke check.

The workflow checks:

- Background artwork placement and scale.
- Additional artwork elements.
- Steam Backup banner placement, colors, and lockup.
- Game title/logo artwork.
- Developer and publisher logos.
- Additional developer/publisher/studio-style logos.
- Rating badge.
- Media format mark.
- Platform marks.
- Technical/audio/codec marks.
- Straight metadata-bound text.
- Curved copyright/legal text.
- Export preflight warnings.
- Optional exported guide marks.
- Standard and custom disc dimensions.

Use `docs/MANUAL_SMOKE_CHECKLISTS.md` beside this fixture workflow when the
change also affects editor interaction, artwork controls, branding controls,
save/load/export flows, or case insert flows. This document focuses on
preview/export fixture comparison; the smoke checklist covers broader runtime
behavior.

## Preparation

1. Start from a clean, current `main`.
2. Confirm the working tree is clean with `git status --short --branch`.
3. Update main with `git fetch origin main` and the normal local main update flow.
4. Record the commit SHA with `git rev-parse HEAD`.
5. Confirm runtime freshness before judging app behavior:
   - Confirm the primary checkout is at the commit being tested.
   - Check whether an old Vite, Tauri, or other dev-server process is still serving stale code for this repository.
   - If testing a built/static runtime path, rebuild ignored generated output such as `dist/` before comparing behavior.
   - If a stale process is found, stop it only when it is clearly tied to this repository runtime, then relaunch through the approved manual path.
6. Run the non-interactive validation baseline:

```powershell
npm run test
npm run lint
npm run build
```

7. Launch the desktop app manually only when doing the visual pass:

```powershell
npm run tauri dev
```

Agents should not run `npm run tauri dev` unless the user explicitly asks for interactive app verification.

## Fixture Projects

Primary fixture projects live in `fixtures/projects/`.

| Fixture | Main coverage |
| --- | --- |
| `blank-project.sbls.json` | Blank project defaults, disabled optional visuals, clean export without guides. |
| `background-only.sbls.json` | Background image placement, scale, offset, center-hole clipping, clean export. |
| `full-branding.sbls.json` | Background, top Steam banner, developer/publisher logos, rating badge, media mark, platform marks, straight text, curved copyright text, guide export. |
| `custom-dimensions.sbls.json` | Custom geometry, bottom Steam banner, custom export dimensions, guide export, text placement. |
| `legacy-minimal-0.1.0.sbls.json` | Loader normalization for sparse older project data before visual comparison. |

The current fixtures predate some real-disc-art alpha work. They do not fully cover title artwork, additional artwork, technical marks, disc-number badge mode, or all export preflight warnings. If these cases matter for the current change, manually create a project and record it in the run notes. Do not commit new fixtures unless the fixture data is safe placeholder/generic content and the change is intentionally scoped to fixture maintenance.

## Export Output Location

Save manual exports outside source-controlled fixture input files unless the export is being intentionally promoted to a reviewed expected image. A practical local layout is:

```text
manual-visual-runs/
  2026-05-28-<short-sha>/
    blank-project.clean.png
    background-only.clean.png
    full-branding.guides.png
    custom-dimensions.guides.png
    run-notes.md
```

Expected export PNGs may be added later when the image baseline policy is settled. Until then, use manual exports as run artifacts and compare them visually against the live preview and any previously recorded expected outputs.

## Manual Comparison Checklist

For each fixture:

1. Load the fixture project through the app's project load flow.
2. Confirm the preview visible state before export:
   - The project title and metadata loaded as expected.
   - Enabled visual layers are visible.
   - Disabled visual layers remain hidden.
   - The disc template or custom dimensions match the fixture intent.
3. Export a PNG with the fixture's current guide settings.
4. If guide behavior is part of the case, export a second PNG with guides toggled the opposite way.
5. Open the exported PNG beside the app preview.
6. Compare the expected layers:
   - Background placement, scale, clipping, and center-hole treatment.
   - Additional artwork image, frame, placement, scale, and visibility.
   - Steam banner placement, color, lockup scale, and top/bottom alignment.
   - Game title/logo artwork source, placement, scale, and visibility.
   - Developer and publisher logo placement, scale, and visibility.
   - Additional logo placement, scale, and visibility when present.
   - Rating badge placement, scale, label/value, and visibility.
   - Media and platform mark placement, scale, labels, and visibility.
   - Technical mark placement, scale, labels, and visibility.
   - Straight text content, alignment, width, scale, and placement.
   - Curved copyright/legal text content, arc side, inset, wrapping, and placement.
   - Export preflight warnings match enabled/missing/generic visual state.
   - Guide export behavior for outer edge, physical center hole, inner print boundary, printable boundary, and safe zone.
   - Safe-zone constrained elements remain inside the intended bounds.
7. If an expected export PNG already exists, compare the new PNG against it and record whether the difference is intentional.
8. Save a run record using the template below.

## Mismatch Severity

Use one of these severities for every mismatch:

| Severity | Meaning |
| --- | --- |
| `blocker` | Export is visibly wrong, missing a required layer, contradicts preview, breaks print geometry, or makes the fixture unusable. |
| `visible but acceptable` | Difference is visible, but does not change layer intent, print usefulness, or user-facing meaning for the current alpha-capable disc-editor baseline. |
| `expected/known difference` | Difference is already documented below or linked to an existing issue. |
| `no issue` | Preview, export, and expected output agree for the checked layer. |

## Known Acceptable Differences

Record new known differences here only when they are expected and acceptable for manual comparison. Link a follow-up issue if the difference should eventually be removed.

| Difference | Applies to | Status |
| --- | --- | --- |
| Preview is scaled to fit the editor pane while PNG export is full 300 DPI output. | All fixtures | Expected. Compare relative placement and layer order, not raw pixel dimensions against the on-screen preview. |
| Preview guide overlay is editor-only. Clean PNG exports should not include guides unless export guide options are enabled. | All fixtures | Expected per `docs/DISC_EDITOR_LAYER_ORDER.md`. |
| Minor anti-aliasing differences may appear around text, SVG placeholder edges, and circular clipping. | Text, logo, badge, mark, and guide layers | Acceptable only when content, placement, scale, and layer order still match. |
| Optional exported guides draw last and may cover artwork or text in proof exports. | Guide-enabled exports | Expected proof behavior. Clean exports should be checked separately when artwork visibility matters. |

## Run Record Template

Copy this template into the run notes for each fixture or export file.

```markdown
## Visual Regression Run

- Date:
- Tester:
- Commit SHA:
- Project/fixture:
- Export filename:
- App launch command:
- Baseline commands run:
  - [ ] npm run test
  - [ ] npm run lint
  - [ ] npm run build

### Checked Layers

| Layer | Severity | Notes |
| --- | --- | --- |
| Background artwork |  |  |
| Steam banner |  |  |
| Developer logo |  |  |
| Publisher logo |  |  |
| Rating badge |  |  |
| Media mark |  |  |
| Platform marks |  |  |
| Technical marks |  |  |
| Title/logo artwork |  |  |
| Additional artwork |  |  |
| Straight text |  |  |
| Curved copyright/legal text |  |  |
| Export preflight |  |  |
| Export guides |  |  |
| Safe-zone constraints |  |  |
| Custom dimensions |  |  |

### Mismatches Found

-

### Follow-Up Issue Links

-

### Manual Smoke Notes

- Load result:
- Preview state before export:
- Export result:
- Save/reload notes:
- Anything intentionally not checked:
```

## Later Automation Path

This manual workflow can grow into automated visual regression testing once the fixture and baseline policy is stable:

1. Keep project fixtures in `fixtures/projects/`.
2. Add reviewed expected PNG outputs in a dedicated expected-output directory.
3. Add a deterministic export harness that loads a fixture and writes PNG output without manual UI steps.
4. Compare generated PNGs against expected PNGs with a configured pixel-difference threshold.
5. Store diff images as CI artifacts when a comparison fails.
6. Keep manual review for intentional baseline updates and for interactions that automation does not cover, such as direct dragging and upload controls.

Do not add full automation until the render/export surfaces are stable enough that image diffs reduce noise instead of adding churn.
