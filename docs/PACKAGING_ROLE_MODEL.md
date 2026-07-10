# Packaging Role Model
> Status: Implementation design note for issue #267.
> Purpose: Define the semantic packaging role taxonomy and object-role model for current role panels and future role-based layout presets.
> Read when: Working on role hierarchy, role-panel semantics, layout preset modeling, or packaging-surface object ownership.
> Authoritative source: Current source for implemented behavior; `docs/SOFTWARE_DESIGN_DOCUMENT.md` for architecture contracts; `docs/PROJECT_FILE_SPEC.md` for saved-project schema.
> Last reviewed against commit: `4c44a9456d4c74039a2d2a343fd5757c9a3c45a9`.

This document records the semantic role model for GitHub issue #267. It is a
docs-only taxonomy and planning reference. It does not add preset behavior, does
not add saved-project fields, and does not redefine preview, renderer, export,
or save/load ownership.

## 1. Purpose And Scope

Steam Backup Label Studio organizes packaging creation around semantic
packaging roles: game title, background image, company logos, legal info,
screenshots, system requirements, and similar surface-level jobs. A role says
what job an object serves on the printed package. It is separate from the
object or control type used to represent that job.

Current source-of-truth state remains with existing feature and domain owners.
For example, the Disc Label Game Title role currently maps to title artwork and
title text fallback state; it is not itself a persisted `PackagingRole` record.
The case insert Screenshots role currently maps to tray `artworkSlots`; it is
not a distinct `screenshotSlots` schema.

This document covers:

- the current role taxonomy for Disc Label, Case Front, Case Back, and Spine;
- current object/control type families;
- current feature-owner and state mappings where known;
- required, optional, repeatable, fixed-row, and future-only status;
- compatibility boundaries for future role-based layout presets.

This document does not:

- implement presets;
- change save/load schema;
- change renderers or export behavior;
- move controls;
- add persisted project fields;
- describe desired future schema as current implementation.

## 2. Definitions

**Object/control type**: The concrete kind of editor object or control family:
text, image/artwork, logo, mark, screenshot, legal block, requirements block,
setup control, or workflow control. Object type describes how the editor stores
or manipulates something, not what packaging job it serves.

**Semantic packaging role**: The role an object serves on a packaging surface,
such as Game Title, Big Background Image, Game Info Logos, Company Logos, Legal
Info, Screenshots, or System Requirements. Roles are the user/product layer
that future presets should target.

**Feature owner**: The current component, hook, project helper, domain module,
or action module that owns state transitions and behavior for a feature. Role
panels may render controls from feature owners, but role panels do not become
the source of truth.

**Role panel**: A sidebar panel rendered from the current role navigation shell.
Role panels are top-level UI homes for existing controls. They currently use
UI shell ids from `src/editor/editorNavigationShell.ts`; those ids are not
preset-ready persisted domain ids.

**Source-of-truth state**: Runtime and saved-project state owned by existing
feature/domain modules, hooks, and project helpers. For visual output, the
visible preview/final renderer remains the visual source of truth under the
SDD contract.

**Preset slot / future preset target**: A future concept for applying layout
rules to a semantic role, such as "place Game Title near the top" or "place
Company Logos in a bottom row". Preset targets do not exist as a persisted
schema today.

**Design-critical vs export-blocking**: A design-critical role is important for
normal label/insert quality and may produce design-check guidance. It is not
automatically export-blocking. Blank-project workflows remain valid, and export
should not require every design-critical role to be populated.

## 3. Current Implementation Status

The current role lists live in `src/editor/editorNavigationShell.ts`. They
define user-facing role section labels for:

- Disc Label;
- Case Front;
- Case Back;
- Spine.

Disc role panels render in `src/app/App.tsx`. Case Front, Case Back, and Spine
role panels render in `src/components/caseInsert/CaseInsertEditorShell.tsx`.
`src/components/editor/EditorNavigationShell.tsx` and
`src/components/editor/editorNavigationShellViewModel.ts` make the role panels
renderable through shared sidebar panel components and stable smoke ids.

These current ids and labels are UI shell/navigation concepts. They are useful
evidence for the semantic taxonomy, but they are not a persisted object-role
schema and are not yet a preset targeting model.

No central persisted `PackagingRole` or `ObjectRole` type exists today. Current
project files store feature-specific state such as `background`, `titleArtwork`,
`logoAssets`, `discText`, `artworkSlots`, `logoSlots`, `markSlots`,
`textBlocks`, and `textLists`.

Spine mirroring is a surface editing mode. It is visible near the Case Insert
Front / Back / Spine surface tabs and uses existing spine state/actions. It is
outside packaging roles and should not become a role preset slot.

## 4. Object / Control Type Families

| Family | Current examples | Current schema/model status |
| --- | --- | --- |
| Text | Disc title, subtitle, disc number, backup date, App ID, developer, publisher, install notes, custom note, copyright; case text blocks and text lists | Distinct disc text state and case `ProjectCaseInsertTextBlock` / `ProjectCaseInsertTextList` state. Role membership is inferred from known keys or ids. |
| Image/artwork | Disc background, title artwork, additional artwork; case background, title artwork, artwork slots | Distinct feature states and case image slots. Role meaning depends on slot owner and surface. |
| Logo | Developer, publisher, additional company/studio logos | Disc has `ProjectLogoAssets`; case insert uses `logoSlots` and branding slot helpers. |
| Mark / game-info logo | Rating badge, media mark, platform marks, technical marks | Disc has dedicated mark feature state; case insert uses `markSlots` plus branding mark target-source helpers. |
| Screenshot | Back/tray screenshots and supporting art | Current semantic use of tray/back `artworkSlots`, not a distinct screenshot schema type. Other surfaces may use screenshot sources as generic artwork. |
| Legal block | Copyright/legal disc text and case legal text rows | Distinct text rows/blocks by key/id. The Game metadata legal textarea is setup metadata, not the packaging role output control. |
| Requirements block | Minimum and recommended requirements on the case back | Current case text blocks with known ids; not a separate requirements schema type. |
| Setup/editing-mode control | Steam branding setup, surface navigation, spine mirroring, contextual text edit entry | UI/editor controls, not packaging role objects. Some setup controls affect visible output but remain outside preset role slots unless future design explicitly says otherwise. |
| Project/workflow control | Project File, Export Options, Template, Game search/import, metadata fields, metadata assistance | Workflow state and app setup. These are not semantic packaging roles. |

## 5. Disc Roles

| Role | Current UI role id | Purpose | Status | Current object/control types | Current feature owners / components | Source-of-truth state | Preset relevance | Notes / risks / unknowns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Game Title | `game-title` | Identify the game through title/logo artwork and title text fallback. | Design-critical; fixed primary title; title artwork optional but important. | Image/artwork plus text. | `TitleArtworkControls`, `DiscGameTitleTextControls`, `useTitleArtwork`, `useDiscTextState`, title artwork project helpers. | `ProjectTitleArtwork`; disc text `title` value/source/layout/style. | High. Presets should target title/logo treatment and title text fallback together. | Plain Game metadata title remains in the Game setup panel. |
| Big Background Image | `background-artwork` | Provide the dominant disc-face artwork or blank/backdrop. | Design-critical for normal designs; not export-blocking; single primary slot. | Image/artwork. | `BackgroundArtworkControls`, `useBackgroundArtwork`, background restore/snapshot helpers. | Saved disc `background` state: enabled, image data, source, size, scale, offset, note. | High. Presets may target fit, scale, and offset semantics. | User-facing role name is Background Image; internals may still say background artwork. |
| Game Info Logos | `game-info-logos` | Show rating, media, platform, and technical/game-info marks. | Optional group; several fixed families; some families support multiple values/assets. | Mark/game-info logo. | `GameInfoLogoControls`, `RatingBadgeControls`, `MediaMarkControls`, `PlatformMarkControls`, `TechnicalMarkControls`, related hooks/project modules. | `ProjectRatingBadge`, `ProjectMediaMark`, `ProjectPlatformMarks`, `ProjectTechnicalMarks`, rating metadata. | High. Presets need family-specific targeting, not a single generic mark box. | Missing/historical mark families remain tracked by #125. |
| Company Logos | `company-logos` | Show developer, publisher, and additional company/studio/distributor logos. | Optional; repeatable through additional developer/publisher logo arrays. | Logo. | `CompanyLogoControls`, `LogoAssetControls`, `useProjectLogoAssets`, `projectLogoAssets` helpers. | `ProjectLogoAssets`, including primary and additional logo asset state. | High. Presets should distinguish developer/publisher/additional logo intent. | Additional company roles are bounded by current logo feature model, not arbitrary logo layers. |
| Legal Info | `legal-info` with label `Legal Text` | Show copyright/legal text on the disc. | Recommended/design-critical for realistic labels; fixed row. | Legal block / text. | `DiscLegalTextControls`, `DiscTextControl`, disc text helpers. | Disc text `copyright` value/source/layout/style. | Medium. Presets can target legal text placement and curved/straight treatment. | Game panel legal metadata textarea is not this role; it is a source/setup field. |
| Additional Artwork | `additional-artwork` | Add supporting art, icons, screenshots used as art, or other bounded visual elements. | Optional; repeatable through current additional artwork elements. | Image/artwork. | `AdditionalArtworkControls`, `useAdditionalArtwork`, `projectAdditionalArtwork` helpers. | `ProjectAdditionalArtwork.enabled` and `elements`. | High. Presets need bounded repeated-slot targeting. | This must not become a full arbitrary layer manager. |
| Additional Text | `additional-text` | Add known secondary metadata text rows. | Optional; fixed-row, not arbitrary user-created text blocks today. | Text. | `DiscAdditionalTextControls`, `DiscTextControl`, disc text helpers. | Disc text rows for subtitle, disc number, backup date, App ID, developer, publisher, install notes, and custom note. | Medium. Presets can target known rows but should not assume arbitrary text layers. | Disc number badge/artwork mode travels with the disc number control because it shares the existing row. |

## 6. Case Front Roles

| Role | Current UI role id | Purpose | Status | Current object/control types | Current feature owners / components | Source-of-truth state | Preset relevance | Notes / risks / unknowns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Game Title | `game-title` | Identify the game on the front cover through title/logo artwork and title text fallback. | Design-critical; fixed primary title treatment. | Image/artwork plus text. | `CaseInsertTemplateGameTitleControls`, template title artwork controls, template text controls, case insert editor actions. | `caseInsert.templates.cover.titleArtwork`; `cover-title-text` text block. | High. Presets should target both visual logo and title text fallback. | Metadata title fields remain in Game setup. |
| Big Background Image | `background-artwork` | Provide the dominant front cover artwork/backdrop. | Design-critical for normal covers; not export-blocking; single primary slot. | Image/artwork. | `CaseInsertTemplateBackgroundArtworkControls`, template image slot controls, case insert editor actions. | `caseInsert.templates.cover.background`. | High. Presets may target fit/crop/placement. | Current implementation id is background; role label is Background Image. |
| Game Info Logos | `game-info-logos` | Show rating, platform, media, and technical marks where useful. | Optional fixed mark families. | Mark/game-info logo. | `CaseInsertTemplateGameInfoLogoControls`, case insert branding mark controls and sync helpers. | `caseInsert.templates.cover.markSlots` plus shared branding source state. | High. Presets need mark-family awareness. | Current mark slots are not collapsed into one generic mark layer model. |
| Company Logos | `company-logos` | Show developer, publisher, and related company logos. | Optional; repeatable through slots. | Logo. | `CaseInsertTemplateCompanyLogoControls`, `CaseInsertLogoSlotControls`, case insert logo slot helpers. | `caseInsert.templates.cover.logoSlots`. | High. Presets should preserve company-logo semantics. | Developer/publisher identity comes from current logo slot helpers, not a new role schema. |
| Legal Info | `legal-info` | Show front-cover legal/copyright rows when present. | Optional/recommended fixed row. | Legal block / text. | `CaseInsertTemplateLegalInfoControls`, `CaseInsertTemplateTextControls`, legal text predicates. | `cover-copyright-text` text block. | Medium. | Included because the current role list and migration notes include front Legal Info. |
| Additional Artwork | `additional-artwork` | Add bounded extra front-cover artwork slots. | Optional; repeatable through current artwork slots. | Image/artwork. | `CaseInsertTemplateAdditionalArtworkControls`, grouped image slot controls. | `caseInsert.templates.cover.additionalArtworkEnabled`; `caseInsert.templates.cover.artworkSlots`. | High. | Back/tray uses its `artworkSlots` for Screenshots instead of this role today. |
| Additional Text | `additional-text` | Add known secondary front-cover text rows. | Optional; fixed-row. | Text. | `CaseInsertTemplateAdditionalTextControls`, template text controls, additional text predicates. | Cover text blocks for subtitle, disc number, backup date, App ID, developer, publisher, install notes, and custom note. | Medium. | Not arbitrary user-created front text today. |

## 7. Case Back Roles

| Role | Current UI role id | Purpose | Status | Current object/control types | Current feature owners / components | Source-of-truth state | Preset relevance | Notes / risks / unknowns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Game Title | `game-title` | Provide back/tray title identity when used. | Design-critical only for layouts that expose it; fixed row/slot. | Image/artwork plus text. | `CaseInsertTemplateGameTitleControls`; template title artwork/text owners. | `caseInsert.templates.tray.titleArtwork`; `tray-title-text` text block. | Medium. | Current role list includes Game Title even though the back may emphasize description and screenshots. |
| Game Description Text | `game-description-text` | Show descriptive back-cover copy. | Design-critical for normal case backs; fixed row. | Text. | `CaseInsertTemplateGameDescriptionTextControls`, `CaseInsertTemplateTextControls`, text predicates. | `tray-description` text block. | High. | Copy fitting remains active follow-up work under #181. |
| Feature Bullets / Callouts | `feature-bullets-callouts` | Show short feature bullets or callouts. | Optional/design-critical depending on layout; fixed list. | Text list. | `CaseInsertTemplateFeatureBulletsControls`, text list controls. | `tray-feature-bullets` text list. | High. | Current role exists only on back/tray. |
| Big Background Image | `background-artwork` | Provide the back/tray artwork/backdrop. | Design-critical for normal backs; not export-blocking; single primary slot. | Image/artwork. | `CaseInsertTemplateBackgroundArtworkControls`, template image slot controls. | `caseInsert.templates.tray.background`. | High. | Role label is Background Image; internal field is background. |
| Screenshots | `screenshots` | Show screenshots or supporting art on the back cover. | Design-critical for normal backs; repeatable through current artwork slots. | Screenshot as semantic use of image/artwork slots. | `CaseInsertTemplateScreenshotsControls`, grouped image slot controls. | `caseInsert.templates.tray.additionalArtworkEnabled`; `caseInsert.templates.tray.artworkSlots`. | High. | No separate `screenshotSlots` schema exists today. |
| Game Info Logos | `game-info-logos` | Show rating, media, platform, and technical marks on the back cover. | Optional fixed mark families. | Mark/game-info logo. | `CaseInsertTemplateGameInfoLogoControls`, branding mark helpers. | `caseInsert.templates.tray.markSlots` plus shared branding source state. | High. | Mark-family identity should remain explicit. |
| Company Logos | `company-logos` | Show developer, publisher, and related company logos. | Optional; repeatable through slots. | Logo. | `CaseInsertTemplateCompanyLogoControls`, logo slot controls. | `caseInsert.templates.tray.logoSlots`. | High. | Company logos may compete with legal and info mark space. |
| System Requirements | `system-requirements` | Show minimum and recommended requirements. | Design-critical for PC-style back covers; fixed known rows. | Requirements block / text. | `CaseInsertTemplateSystemRequirementsControls`, text predicates. | `tray-minimum-requirements`; `tray-recommended-requirements`. | High. | Not a distinct requirements schema today. |
| Legal Info | `legal-info` | Show copyright/legal/attribution text. | Recommended/design-critical; fixed row. | Legal block / text. | `CaseInsertTemplateLegalInfoControls`, text predicates. | `tray-copyright-text` text block. | Medium. | Game metadata legal textarea remains setup/source metadata. |
| Additional Text | `additional-text` | Add known secondary text rows. | Optional; fixed-row. | Text. | `CaseInsertTemplateAdditionalTextControls`, additional text predicates. | Tray text blocks for subtitle, disc number, backup date, App ID, developer, publisher, install notes, and custom note. | Medium. | Description, feature bullets, requirements, title, and legal rows stay in their dedicated roles. |
| Additional Artwork | `additional-artwork` | Future or non-current role for generic extra back artwork separate from screenshots. | Current UI role id exists, but current visible mapping is unclear/mostly absent because tray `artworkSlots` are Screenshots. Future-only or unknown as a distinct back role. | Image/artwork if added later. | Unknown as a distinct current control owner. | No separate current state beyond tray `artworkSlots`, which are Screenshots. | Potentially high later. | Do not invent schema or duplicate tray artwork slots without #149/#269-era design. |

## 8. Spine Roles

| Role | Current UI role id | Purpose | Status | Current object/control types | Current feature owners / components | Source-of-truth state | Preset relevance | Notes / risks / unknowns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Steam Branding | `steam-backup-branding` | Show Steam Backup / Steam-style spine branding where visible. | Optional setup/branding output role on Spine; still conceptually near setup controls. | Setup/editing-mode control plus image/text fallback output. | `CaseInsertSpineSteamBrandingControls`, spine Steam banner hook/actions. | `caseInsert.spine.left.steamBanner`; `caseInsert.spine.right.steamBanner`; mirrored state affects editing. | Medium. | #271 treats Steam Branding as a setup/program panel generally. This spine role label exists in the current role list; future taxonomy should decide whether it remains a role target or setup-owned output. |
| Vertical Game Logo or Game Title | `vertical-game-logo-title` | Identify the game on the spine through vertical logo/title artwork and title text fallback. | Design-critical; fixed primary title/logo treatment per spine side. | Image/artwork plus text. | `CaseInsertSpineGameTitleControls`, spine image slot controls, spine text controls. | Left/right `titleArtwork`; left/right `title` text block. | High. | Mirrored editing may update both sides, but mirroring is not the role. |
| Company Logo | `company-logo` | Show developer/publisher/additional company logo on the spine. | Optional; repeatable through logo slots when space allows. | Logo. | `CaseInsertSpineCompanyLogoControls`, spine logo slot controls/actions. | Left/right `logoSlots`. | High. | Current singular label reflects constrained spine space, but slots can represent more than one logo. |
| Optional Media Format Type | `optional-media-format-type` | Show only the spine media-format mark controls. | Optional fixed mark family. | Mark/game-info logo. | `CaseInsertSpineOptionalMediaFormatTypeControls`, media mark controls/actions. | Left/right media mark `markSlots` projection. | Medium. | Spine deliberately splits media from other Game Info Logos. |
| Game Info Logos | `game-info-logos` | Show spine rating badge, platform marks, and technical marks. | Optional fixed mark families. | Mark/game-info logo. | `CaseInsertSpineGameInfoLogoControls`, spine mark controls/actions. | Left/right mark slot projections for rating, platform, and technical marks. | High. | Media format is excluded here and owned by Optional Media Format Type. |
| Spine Background / Color / Artwork | `spine-background-artwork` with label `Background Image` | Provide spine backdrop artwork. | Design-critical for normal spine designs; single primary slot per side. | Image/artwork; color-only support is unknown/not distinct. | `CaseInsertSpineBackgroundArtworkControls`, spine image slot controls/actions. | Left/right `background` image slots. | High. | Background image is current. A distinct color-only spine background role may not be separately modeled today. |
| Additional Text | `additional-text` | Add known secondary spine text rows. | Optional; fixed-row. | Text. | `CaseInsertSpineAdditionalTextControls`, spine text controls, additional text predicates. | Left/right spine text blocks for subtitle, disc number, backup date, App ID, developer, publisher, install notes, and custom note. | Medium. | Not arbitrary user-created spine text today. |
| Legal Info | `legal-info` | Show spine copyright/legal text. | Optional/recommended fixed row. | Legal block / text. | `CaseInsertSpineLegalInfoControls`, spine text controls, legal predicates. | Left/right spine copyright text blocks. | Medium. | Current visibility depends on mirrored/side editing state and existing text rows. |

Spine mirroring is a surface-editing mode, not a packaging role. It should stay
outside future role preset slots unless a future issue explicitly designs
editing-mode presets.

## 9. Non-Packaging Workflow Areas

The following areas are not semantic packaging roles and should not become role
preset slots:

- Project File: owns project lifecycle commands such as new, save, load, and export entry points.
- Export Options: owns guide/export settings, not design-object semantics.
- Template geometry: owns physical media dimensions, safe zones, folds, and print regions.
- Steam/game metadata search/import: discovers and imports source data.
- Game metadata fields: source/setup data that may feed visible roles but is not itself a packaging role.
- Metadata assistance: helps find rating/legal candidates and update metadata.
- Surface navigation: switches Disc Label, Case Front, Case Back, and Spine views.
- Spine mirror/editing mode: controls left/right spine editing behavior.

These areas matter to workflow and may influence role content, but a layout
preset should target the visible semantic packaging objects, not project
commands, template setup, or metadata search controls.

## 10. Required / Optional / Repeatable / Future-Only Definitions

**Required/design-critical** means the role is important for a normal polished
design and may be used by design-check guidance. It does not mean export is
blocked when the role is absent. Blank-project workflows remain valid.

**Optional** means the role can be hidden or omitted without invalidating the
project. Optional visual features must preserve disabled state, hide dependent
controls while disabled, and omit disabled content from preview/export.

**Repeatable** means the current model can represent multiple instances through
existing arrays or slots. It does not mean the app has arbitrary layers.

**Fixed-row** means the app exposes known text rows or known block ids, such as
subtitle, disc number, copyright, or tray requirements. It does not mean users
can create arbitrary text blocks in that role today.

**Future-only** means the product role exists as a useful concept, but current
source does not separately model or expose it. Future-only roles must be marked
as future or unknown rather than described as implemented.

## 11. Current Mappings And Unknowns

Current audit findings:

- Game Title maps to title artwork plus title text fallback.
- Big Background Image maps to background slots.
- Game Info Logos maps to rating, media, platform, and technical marks, with spine media split into Optional Media Format Type.
- Company Logos maps to developer, publisher, and additional logo owners.
- Legal Info maps to copyright/legal text rows, not the Game metadata textarea.
- Additional Artwork maps to disc `additionalArtwork.elements` and cover/spine `artworkSlots`.
- Additional Text maps to fixed text rows.
- Screenshots are semantic use of tray/back `artworkSlots`, not a separate schema type.
- System Requirements maps to minimum and recommended requirements text blocks.
- Spine background/color/artwork has background image support; color-only may not be distinctly modeled today.

Unknowns or unresolved taxonomy points:

- Whether Steam Branding should become a true semantic preset target on every surface or remain setup/program-owned output.
- Whether Case Back should later gain generic Additional Artwork distinct from Screenshots.
- Whether future presets need stable non-persisted role descriptors before any persisted schema exists.
- How future arbitrary user-added text should fit without turning Additional Text into a general layer manager.
- Whether future role targeting should distinguish primary, secondary, and repeated instances inside a role.

Unknown mappings should stay documented as unknown until source, tests, or a
focused design issue resolves them.

## 12. Preset Implications

Future role-based layout presets should target semantic roles rather than
project-specific incidental coordinates. A preset should be able to say, for
example, where Game Title, Big Background Image, Screenshots, Company Logos,
Legal Info, or System Requirements belong on a surface without needing to know
every current implementation detail.

However, applying a preset will eventually need role-to-object targeting:

- which current object or slot represents the role;
- whether the role is fixed, repeatable, or optional;
- how repeated slots are ordered or selected;
- how title artwork and title text fallback move together;
- how mark families remain explicit instead of collapsing into one generic mark;
- how blank-project and disabled-state preservation stay intact.

#267 does not implement preset schema or behavior. #168 owns the broader role
hierarchy and preset direction, #269 owns the role-based preset data model and
application contract documented in [`ROLE_BASED_PRESET_MODEL.md`](ROLE_BASED_PRESET_MODEL.md),
and #270 owns starter disc layout presets.

## 13. Compatibility And Invariants

- Existing feature/domain owners remain the source of truth.
- Role panels do not create second visual truths.
- The visible preview/final renderer remains the visual source of truth.
- Hidden inputs, hit targets, measurement layers, and export renderers remain adapters.
- Save/load/export parity must be preserved.
- Existing project JSON compatibility must be preserved.
- Additional Artwork and Additional Text remain flexible but bounded by current feature models.
- The app should not turn into a general-purpose arbitrary layer manager as the first solution.
- Setup/workflow controls should remain outside role preset slots unless a future issue explicitly changes that boundary.
- Unknown mappings should be documented rather than guessed.

## 14. Related Documents And Issues

Related documents:

- `docs/GUIDED_PRESET_SLOT_MODEL.md`
- `docs/ISSUE_271_ROLE_NAVIGATION_SHELL.md`
- `docs/ROLE_BASED_PRESET_MODEL.md`
- `docs/SOFTWARE_DESIGN_DOCUMENT.md`
- `docs/PRD.md`
- `docs/PROJECT_FILE_SPEC.md`
- `docs/REPO_ARCHITECTURE_INVENTORY.md`

Related issues and completed migration context:

- #267: Role hierarchy and object-role model. This document is for that issue.
- #168: Layout presets and role-based editor hierarchy parent direction.
- #269: Role-based preset data model and application contract, documented in
  `docs/ROLE_BASED_PRESET_MODEL.md`.
- #270: Starter disc layout presets.
- #281/#283: Guided layout preset parent track and the Disc slot domain and
  lifecycle contract documented in `docs/GUIDED_PRESET_SLOT_MODEL.md`.
- #272/#274: Completed visible role-panel migration work, with implementation
  evidence in the current role shell and panel mappings.
