# Contextual Ribbon Expansion

> Status: CURRENT implementation checkpoint for the column/cap/interaction slice of #265; TARGET CONTRACT for the remaining inner-group allocation and native acceptance.
> Baseline: `923f7b7f` plus #374's contrast-value correction. The full issue remains open. This is app-shell layout only; text rendering, saved project state, and export owners are unchanged.

## Ownership And Implemented Slice

[contextualTextRibbonModel.ts](../src/components/preview/contextualTextRibbonModel.ts) owns deterministic column-first packing, the shared minimum, equal peer allocation, and the overflow viewport. Stacked cards share their column width. Once every column fits, available width after gaps is divided equally without integer rounding or a column cap. Useful control limits no longer stop card expansion.

[contextualTextRibbonDomLayout.ts](../src/components/preview/contextualTextRibbonDomLayout.ts) is the focused measurement/application adapter extracted from the host. It measures the remaining region after shell/action chrome, applies column positions, caps each card's control body using its existing declared useful maximum, and centers surplus space. Number fields, buttons, color wells and existing group-specific CSS retain their current dimensions. HTML retains its full-row source-editor exception.

When the shared minimum for all columns does not fit, the viewport exposes whole minimum-width columns and snaps horizontal scrolling to column starts. Card widths stay at the usable floor. If an externally constrained viewport is narrower than one whole minimum card, the adapter preserves the card floor and permits scrolling; this is an explicit constrained-width fallback, not evidence that the viewport meets #265's supported-size acceptance.

[contextualTextRibbonInteractionLock.ts](../src/components/preview/contextualTextRibbonInteractionLock.ts) owns transient presentation locking during pointer/key edits. The host defers measurement while locked, retains scroll position, releases button/checkbox/range holds at their end, and keeps text/number/select/color editing stable until focus leaves. Tab navigation releases the edit lock so the next control can be revealed. Controlled value text changes alone do not trigger a new packing measurement. No project mutation/revision/selection owner is added.

## Source Evidence And Limits

Mounted headless diagnostics use the actual host, production ribbon, shared Disc/Case contrast catalogs and application CSS. They cover all contrast values at 320/519/719/1200 ribbon pixels, equal multi-card expansion, useful body caps, stacked alignment, disabled/value stability, unchanged preview vertical position, numeric editing through resize, whole-column overflow and retained scroll offset. Pure tests cover fractional widths, shared minimums, packing and constrained viewport behavior. These checks are not native visual, platform, assistive-technology or DPI acceptance.

## Remaining Issue 265 Work

- Inventory every internal group and its minimum/preferred/maximum useful widths, growth weight/priority and number-field character capacities. Current card profiles are reused; this slice does not claim that a uniform internal-group sizing contract exists.
- Implement smaller-first equalization across eligible internal groups, with capped groups removed from growth and fixed gaps preserved. The current body cap/centering is not a substitute for this algorithm.
- Extend mounted diagnostics across complete Presets/Text/Artistic/Utilities/HTML control sets, curved/straight Disc and Case targets, and long/maximum formatted values. Prove no child overlap, lost value/unit or unusable hit target for every supported combination.
- Verify every active interaction, especially native select/color picker focus behavior and HTML source editing; numeric editing is the executed mounted interaction case. Check resizing smaller than the retained layout does not obscure essential controls or cross the Live Preview label boundary.
- Run the authorized native Tauri app from the primary checkout at minimum, default and fullscreen dimensions, plus the platform/DPI obligations in [DESKTOP_SCALING_ACCEPTANCE.md](DESKTOP_SCALING_ACCEPTANCE.md). Preview geometry and export parity must remain stable.

Do not close #265 or call its full expansion contract implemented from this slice. Follow [TEXT_EDITOR_CONTRACT.md](TEXT_EDITOR_CONTRACT.md) and [TEXT_EDITOR_SMOKE_AUTOMATION.md](TEXT_EDITOR_SMOKE_AUTOMATION.md); browser diagnostics do not replace native acceptance.
