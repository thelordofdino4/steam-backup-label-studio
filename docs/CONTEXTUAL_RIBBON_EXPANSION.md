# Contextual Ribbon Expansion

> Status: CURRENT implementation checkpoint for the column/cap/interaction and utility-group slices of #265; TARGET CONTRACT for remaining full-control coverage and native acceptance.
> Baseline: `923f7b7f` plus #374's contrast-value correction. The full issue remains open. This is app-shell layout only; text rendering, saved project state, and export owners are unchanged.

## Ownership And Implemented Slice

[contextualTextRibbonModel.ts](../src/components/preview/contextualTextRibbonModel.ts) owns deterministic column-first packing, the shared minimum, equal peer allocation, and the overflow viewport. Stacked cards share their column width. Once every column fits, available width after gaps is divided equally without integer rounding or a column cap. Useful control limits no longer stop card expansion.

[contextualTextRibbonDomLayout.ts](../src/components/preview/contextualTextRibbonDomLayout.ts) is the focused measurement/application adapter extracted from the host. It measures the remaining region after shell/action chrome, applies column positions, caps each card's control body using its existing declared useful maximum, and centers surplus space. Number fields, buttons, color wells and existing group-specific CSS retain their current dimensions. HTML retains its full-row source-editor exception.

When the shared minimum for all columns does not fit, the viewport exposes whole minimum-width columns and snaps horizontal scrolling to column starts. Card widths stay at the usable floor. If an externally constrained viewport is narrower than one whole minimum card, the adapter preserves the card floor and permits scrolling; this is an explicit constrained-width fallback, not evidence that the viewport meets #265's supported-size acceptance.

[contextualTextRibbonInteractionLock.ts](../src/components/preview/contextualTextRibbonInteractionLock.ts) owns transient presentation locking during pointer/key edits. The host defers measurement while locked, retains scroll position, releases button/checkbox/range holds at their end, and keeps text/number/select/color editing stable until focus leaves. Tab navigation releases the edit lock so the next control can be revealed. Controlled value text changes alone do not trigger a new packing measurement. No project mutation/revision/selection owner is added.

## Utility Subgroups And Field Capacity

[contextualTextRibbonInnerGroups.ts](../src/components/preview/contextualTextRibbonInnerGroups.ts) owns the pure smaller-first allocator. Eligible groups grow from their minimum to the next group's width, grow equally once matched, and leave allocation when capped. Fixed gaps are deducted first. The DOM adapter applies this to the Position and Layout utility stacks, including curved Layout. A stack's range floor/cap includes its measured fixed labels, number fields, checkbox labels, units, padding, dividers and existing slider CSS limits. The option stack retains its existing 154px straight / 160px curved floor and expands to a 220px useful cap. The card floor includes these requirements; remaining body space centers the complete arrangement. These profiles use growth weight 0/1 and uniform priority 0. Other intrinsic and vertical groups still use their existing layout owners.

Curved number fields reserve sign, integer digits and up to two supported fractional digits from the bounds and step before editing. The current value no longer participates in sizing, and large supported values are not truncated by a seven-character cap. Native spinner/chrome and the other number-field families remain part of the full capacity audit.

Measured header and subgroup overrides are cleared before reading a different semantic card, because React can reuse their DOM nodes across tabs. This prevents an artistic header's full-width override from consuming a later utility card's control area. Artistic sliders explicitly remove browser block margins while preserving the existing 24px input height, so the background card's third row fits its two-row card.

## Source Evidence And Limits

Mounted headless diagnostics use the actual host, production ribbon, shared Disc/Case contrast catalogs and application CSS. They cover all contrast values at 320/519/719/1200 ribbon pixels, equal multi-card expansion, useful body caps, stacked alignment, disabled/value stability, unchanged preview vertical position, numeric editing through resize, whole-column overflow and retained scroll offset. The expanded fixture mounts all five tabs, including all three background rows and straight/curved utility groups, at 519/719/1200/1600 ribbon pixels. It checks control bounds and pairwise overlap (excluding the intentional point-size preset overlay), subgroup caps/centering, smaller-first growth and stable curved numeric capacity across negative/fractional values. Pure tests cover fractional widths, shared minimums, packing, constrained viewport behavior, capped equalization and supported numeric capacity. These checks are not native visual, platform, assistive-technology or DPI acceptance.

## Remaining Issue 265 Work

- Finish the inventory of every non-utility internal group and number-field family, including maximum formatted values, native chrome and units. Semantic card row span and growth metadata are explicit; this checkpoint does not claim every child family has migrated to a uniform sizing contract.
- Extend the shared allocator where other horizontal groups contain multiple eligible flexible controls. Utility groups execute the allocator; intrinsic text/button groups and vertical artistic rows still retain their existing owners.
- Extend the representative all-tab diagnostic to actual curved/straight Disc and every Case target, all catalogs and long/maximum formatted values. The shared control fixture is not a full application/target matrix. Prove no lost value/unit or unusable hit target for every supported combination.
- Verify every active interaction, especially native select/color picker focus behavior and HTML source editing; numeric editing is the executed mounted interaction case. Check resizing smaller than the retained layout does not obscure essential controls or cross the Live Preview label boundary.
- Run the authorized native Tauri app from the primary checkout at minimum, default and fullscreen dimensions, plus the platform/DPI obligations in [DESKTOP_SCALING_ACCEPTANCE.md](DESKTOP_SCALING_ACCEPTANCE.md). Preview geometry and export parity must remain stable.

Do not close #265 or call its full expansion contract implemented from this slice. Follow [TEXT_EDITOR_CONTRACT.md](TEXT_EDITOR_CONTRACT.md) and [TEXT_EDITOR_SMOKE_AUTOMATION.md](TEXT_EDITOR_SMOKE_AUTOMATION.md); browser diagnostics do not replace native acceptance.
