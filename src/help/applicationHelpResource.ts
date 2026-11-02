// Packaged offline content, derived from README.md (current workflow),
// PROJECT_PACKAGE_FORMAT_CONTRACT.md (Save/Open) and RELEASE_DIAGNOSTICS.md.
// Keep this resource aligned with implemented behavior; do not promise target features.
export const APPLICATION_HELP_SECTIONS = Object.freeze([
  { heading: 'Start a project', text: 'Choose New Disc or New Case Insert from Home. You can start with a blank project and upload your own artwork; Steam import is optional.' },
  { heading: 'Save and reopen', text: 'Save your editable project as an .sbls file. Use Save As to choose another destination, and Open to reload a saved project. Keep the project file as well as your exported PNG.' },
  { heading: 'Export a PNG', text: 'Export PNG creates printable artwork. Review the export checks and guide options before saving. PNG export does not save your editable project.' },
] as const)
