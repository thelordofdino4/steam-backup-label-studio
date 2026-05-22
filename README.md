# Steam Backup Label Studio

A cross-platform desktop app for designing print-ready Steam backup disc labels and case artwork.

## Project Goal

Steam Backup Label Studio is intended to help users create consistent, good-looking labels and case inserts for personal Steam game backup media.

The app will let users choose a physical template, import Steam game metadata and artwork where available, manually override any field, arrange artwork in a visual editor, and export print-ready files.

## Planned Platforms

- Windows
- Linux

## Planned Tech Stack

- Tauri for the desktop shell
- React for the user interface
- TypeScript for safer app code
- Konva or React Konva for the visual label editor
- Rust through Tauri for native desktop features

## Initial MVP

The first version will focus on a single useful path:

1. Create a new disc label project.
2. Choose a standard printable disc template.
3. Choose Steam Backup logo placement: top, bottom, or none.
4. Add game title and artwork.
5. Preview the disc label in a visual editor.
6. Drag and resize artwork.
7. Save and reopen the project.
8. Export a 300 DPI PNG suitable for printing.

## Documentation

See the `docs/` folder for the product requirements, roadmap, template notes, and project file notes.

## Status

Planning / pre-alpha.

## Disclaimer

Steam Backup Label Studio is an unofficial personal backup labeling tool. It is not affiliated with Valve Corporation or Steam. Game artwork, logos, ratings, and trademarks belong to their respective owners. Users are responsible for ensuring they have the right to use imported or uploaded assets.

## License

License not chosen yet.
