# Roadmap

## Phase 0: Planning Foundation

Goal: Make the repository understandable and ready for implementation.

Tasks:

- Add README
- Add PRD
- Add roadmap
- Add template notes
- Add project file notes
- Add starter GitHub issues

## Phase 1: Project Scaffold

Goal: Create a basic desktop app that launches on Windows and Linux.

Tasks:

- Scaffold Tauri + React + TypeScript app
- Set app name to Steam Backup Label Studio
- Add basic app shell
- Add development setup instructions
- Confirm app runs locally

## Phase 2: Blank Disc Preview

Goal: Render the first disc label template.

Tasks:

- Add standard printable disc template data
- Draw outer disc boundary
- Draw center hole mask
- Draw safe zone guide
- Draw bleed guide
- Scale preview to fit window

## Phase 3: Basic Editor

Goal: Add the first editable design layers.

Tasks:

- Add background image layer
- Add Steam Backup logo layer
- Allow selecting layers
- Allow dragging layers
- Allow resizing layers
- Add basic layer properties panel

## Phase 4: Project Save and Load

Goal: Make work persistent.

Tasks:

- Define project file schema
- Save project to local file
- Load project from local file
- Restore template choice
- Restore layers

## Phase 5: Export

Goal: Produce a usable print file.

Tasks:

- Export 300 DPI PNG
- Hide editor-only guides during export
- Preserve physical template dimensions
- Add basic export dialog

## Phase 6: Steam Import

Goal: Bring in basic Steam metadata and artwork.

Tasks:

- Add game search UI
- Add manual Steam App ID input
- Import title and basic metadata
- Import artwork options when available
- Allow manual overrides

## Phase 7: Alpha Release

Goal: Package the first testable build.

Tasks:

- Add GitHub Actions build workflow
- Build Windows package
- Build Linux package
- Add known issues list
- Create first alpha release

## Future Phases

- Jewel case templates
- DVD/Amaray case templates
- Blu-ray case templates
- Screenshots and back-cover layouts
- Rating badges
- Curved disc text
- Multi-disc projects
- Print calibration sheet
- Direct printer support
