# Editor Inspector Structure

> Status: Current source structure and native acceptance checklist for #380.
> Purpose: Record the role/feature hierarchy, presentation ownership, and remaining validation.
> Read when: Changing role panels, nested feature groups, or inspector sizing and focus.
> Authority: SDD and feature contracts retain domain/renderer authority; this document describes presentation structure.
> Baseline: integrated main `923f7b7fcbfa6569439e26ba049c265816a1db65`, with #301's role cleanup.

## Hierarchy audit

An expansion step means a native `details` disclosure, not an arbitrary React component or DOM ancestor. Top-level Project File, Export Options, Game, Template, and Guide Legend workflow owners are outside the role inspector. Case surface tabs remain owned by `EditorNavigationShell`; #306 retains its native layout review gate.

| Surface / role | Earlier expansion path | Semantic owners retained |
| --- | --- | --- |
| Disc Background Image | Role → imported/web/screenshot/local source group | `DiscBackgroundArtworkRoleControls`, source controls and existing background hook |
| Disc Game Title / Additional Artwork | Role → artwork/source groups; repeated items may add their own card | Existing title/artwork controls and each repeated asset's identity/actions |
| Disc Game Info Logos | Role → Rating / Media / Operating System / Technical group | `DiscGameInfoLogoRoleControls`, shared branding controls, typed focus registrations |
| Disc Company Logos | Role → Developer / publisher group → repeated additional logo cards | `DiscCompanyLogosRoleControls`, `LogoAssetControls`, repeated logo owners |
| Case Front / Back image roles | Role → image group → source group | `CaseInsertTemplateImageSlotControls`, shared image source controls and template editor actions |
| Case Front / Back company roles | Role → company group → additional developer/publisher group → repeated card | `CaseInsertTemplateCompanyLogoControls`, existing slot/branding owners |
| Case unmirrored Spine | Role → Left / Right Spine group → feature group → source or additional-logo group; repeated cards remain independent | `CaseInsertSpineControlSections`, side-specific feature controls and spine editor actions |
| Case Back text roles; Disc text roles | Role → existing text controls, with feature-specific internals where applicable | Existing text editor/renderer/selection owners; no new generic text editor |

These paths are source hierarchy observations, not native visual acceptance. For example, an unmirrored Spine logo path could require four grouping disclosures before an additional card; mirrored Spine omits the side grouping. The source inventory found 38 `EditorFeaturePanel` call sites including integration fixtures. Grouping depth must not be confused with the number of saved feature owners.

## Shallow role content

`EditorNavigationRolePanel` remains the outer native disclosure and supplies presentation-only `EditorInspectorDepthContext`. Role labels expose heading level 2. Within that boundary, ordinary `EditorFeaturePanel` groups become `EditorInspectorSection` sections with generated heading IDs and levels 3–6. Opening a role exposes its primary group controls without further group expansion.

`EditorInspectorSection.css` owns the new section heading, divider, wrapping and spacing. Sections add no horizontal padding, fixed width, maximum height or overflow clipping, so additional semantic groups do not progressively narrow the control area. Existing feature-specific controls retain their own styles. The stylesheet does not copy or reorder the global CSS manifest; #46 remains the broader cleanup owner.

Left and Right Spine still have distinct labelled sections. Mirroring continues to use the existing left-side editor adapter and saved two-side state. It creates no second navigation model or project state. Native role open state, active surface, feature values, uploaded images, reset/clear handlers, preview, export and persistence remain with their current owners.

Repeated asset cards retain their native disclosure: they represent distinct editable items with enablement, identity and delete actions, rather than extra navigation groups. Their nested source groups become sections. Outside a role inspector, feature panels retain the native details/summary contract. Explicit `detailsRef` or `summaryRef` callers also retain that native DOM contract. No production feature grouping inside a role currently needs that exception.

`open`/`onOpenChange` remain supported for standalone feature panels. They do not collapse a section inside a role. Existing feature-local open callbacks used by guided focus are harmless in this presentation; the canonical outer role controller still owns reveal/focus requests. No new open-state store is introduced.

## Focus and optional features

Media and Operating System scroll alignment targets now register real `HTMLElement` section refs through `inspectorSectionRef`, instead of claiming an `HTMLDetailsElement`. The role controller retains its actual details/summary refs. The same typed destination registrations, disabled-feature fallback controls, and section alignment behavior remain in use; there are no selector lookups, hidden mirror controls, timers or fabricated refs.

Feature owners still decide whether their dependent controls render. The shared `OptionalFeatureSection` and existing specialized branding controls continue to show the enable checkbox while disabled and preserve saved values. Opening or closing a role cannot enable a feature or clear its data. No new normalization or transition rules belong in these presentation wrappers.

#301's removal of Back Additional Artwork and Spine Steam Backup Branding placeholder roles is a separate prerequisite commit. Existing Front/Spine artwork and dedicated Steam Branding controls remain. The new presentation does not hide placeholder content or manufacture owners for unresolved roles.

## Validation and remaining acceptance

Mounted diagnostics exercise real role/feature wrappers, optional sections, repeated cards, and Spine side grouping. They check one role expansion, accessible heading levels, direct keyboard order, real ref targets, disabled-data preservation, mirroring, standalone disclosure compatibility, and equal available widths through nested sections at 240, 380 and 720 CSS pixels. The existing guided-placeholder integration suite exercises exact typed focus routes and unchanged feature snapshots.

Browser diagnostics establish DOM and state behavior only. They do not establish native visual acceptance, operating-system DPI behavior or physical pointer sizing.

Before closing #380, verify the integrated primary checkout in the authorized native Tauri window:

- Disc and Case Front, Back and Spine: expand each role; reach primary enable/source controls without a grouping expansion chain.
- Exercise upload, source switching, reset/clear and repeated-item disclosure; disable/re-enable without losing saved values.
- Guided preview actions: focus Rating, Media, Operating System, developer and publisher targets; confirm section scroll alignment and keyboard order.
- Mirrored/unmirrored Spine: separate side labels and edits, no lost saved side state.
- Minimum/default window sizes and supported high-DPI/multi-monitor configurations from #374: readable controls, no cumulative narrowing, clipped menus or trapped scrolling.
- Confirm unchanged preview/export and Save/Open behavior for representative optional features.

Integration and native acceptance remain required. This source work does not close #380, #374, #46, or #306.
