# Desktop Scaling Acceptance

> Status: Candidate native acceptance matrix and current source evidence for #374; not a supported-platform claim.
> Purpose: Separate CSS diagnostics from physical display, OS text scaling and monitor-change acceptance.
> Read when: Changing native minimum sizes, sidebar/ribbon containment or desktop scaling policy.
> Authority: The SDD and text-editor contract retain geometry/layout authority; #382 owns final platform support claims.
> Source baseline: `923f7b7fcbfa6569439e26ba049c265816a1db65` plus this focused contrast-value repair.

## Current limits and required native evidence

`src-tauri/tauri.conf.json` declares a 1000×720 default and 900×650 minimum window. These are source configuration values, not proof that the window fits every desktop. The candidate matrix below includes the cases raised by #374. Logical-space arithmetic excludes taskbar, window chrome and display work-area reservations; actual usable work area must be recorded in the native run.

| Physical display | OS display scale | Approximate logical display before chrome | Native result |
| --- | --- | --- | --- |
| 1920×1080 | 100% | 1920×1080 | PENDING |
| 1920×1080 | 125% | 1536×864 | PENDING |
| 1920×1080 | 150% | 1280×720 | PENDING |
| 1920×1080 | 175% | 1097×617 | PENDING; below current 650 minimum height |
| 1920×1080 | 200% | 960×540 | PENDING; below current 650 minimum height |
| 1366×768 | 125% | 1093×614 | PENDING; below current 650 minimum height |

For each available environment, record OS/version, display work area, display scale, independent OS text scale, actual native client dimensions and artifact/commit. Check minimum, default, maximized and restored windows. Then move the same window between monitors with different scales and repeat focus, fit/zoom and scroll checks. Environments without evidence remain UNVERIFIED. A lower native minimum or a supported-display cutoff requires evidence and an explicit support decision; this repair changes neither.

## Focused contrast-value repair

The shared Artistic > Contrast select previously had two container-query overrides that fixed its width to 34 CSS pixels and made its text transparent. Mounted diagnostics reproduced zero-alpha text and only 14 pixels of usable text width at ribbon widths 320, 519, 719 and 1200. The nearest query container meant the hiding rule was not confined to an overall narrow ribbon.

The overrides are removed. The existing ribbon width-profile owner now reserves a fixed 220-pixel Contrast card, accounting for its heading/divider, the longest existing `Stroke + shadow` option and select chrome. Existing column packing makes the stacked Text Color card match that width. The shared native select keeps its normal text color, padding and chevron. Current values do not determine card width.

Mounted tests use the real ribbon host, renderer, column-packing behavior and shared Disc/Case contrast catalog. Every existing option must fit within the select's measured text space and card boundaries, have nontransparent text, retain equal stacked card width, and leave the preview's top position unchanged. Mixed selection and the original onChange selection range are also covered. These are CSS/DOM diagnostics, not native visual, font-fallback or DPI acceptance.

## Remaining acceptance

#374 remains open. Native verification on the final integrated source is required before claiming:

- All Project/Game/Template/role controls are reachable at every declared supported size/scale.
- Window minimums fit the real work area after taskbar and chrome.
- Contextual controls, tabs and Done/Delete remain readable and reachable, including long labels and independent OS text enlargement.
- Keyboard focus reveals off-screen controls, and native select popups remain usable.
- Monitor changes preserve deterministic layout and fit/zoom without changing physical export geometry.
- Sidebar, inspector and ribbon scrolling compose without clipped controls or inaccessible partial columns.

The existing ≤319-pixel Font/Paragraph compact rules also hide selected text; they are separate remaining narrow-ribbon cases to audit against the text contract. The broader equal-card expansion, internal group allocation and interaction-freeze requirements remain owned by #265. #380's shallow-inspector changes require revalidation when integrated. #375 owns application-wide keyboard/contrast/assistive-technology acceptance, and #376/#382 require packaged evidence before support claims.

Native acceptance must use the authorized primary-checkout Tauri window as required by `AGENTS.md` and [`TEXT_EDITOR_SMOKE_AUTOMATION.md`](TEXT_EDITOR_SMOKE_AUTOMATION.md). No native application or packaged artifact was launched for this source checkpoint.
