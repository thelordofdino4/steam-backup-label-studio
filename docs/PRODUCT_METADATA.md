# Product Metadata And Capability Copy

> Status: CURRENT / AS-BUILT AUTHORITY for established source identity; TARGET CONTRACT for packaged acceptance under #381/#376.
> Baseline: `923f7b7fcbfa6569439e26ba049c265816a1db65` plus the focused #381 metadata/copy correction. No new release version, publisher, licensing policy, or lifecycle behavior is introduced.

## Established Identity

| Field | Owner | Value and boundary |
| --- | --- | --- |
| Product/window name | [Tauri configuration](../src-tauri/tauri.conf.json) | Steam Backup Label Studio; already established. |
| Application identifier | [Tauri configuration](../src-tauri/tauri.conf.json) | `com.thelordofdino4.steam-backup-label-studio`; preserved for installation identity. |
| Version | Tauri configuration, [Cargo manifest](../src-tauri/Cargo.toml), [frontend manifest](../package.json) | All retain `0.1.0`; this is source metadata, not a new release or versioning decision. |
| Description | Cargo manifest | Create Steam backup disc labels and jewel case inserts. Replaces the scaffold description. |
| Repository | Cargo manifest | The established `thelordofdino4/steam-backup-label-studio` GitHub repository. |
| Internal Cargo package/library | Cargo manifest | `app` / `app_lib` retained as build identifiers; renaming them is not necessary for truthful product identity and is outside this copy change. |
| About menu descriptor | [Menu registry](../src/applicationMenu/applicationMenuRegistry.ts) | Existing “About Steam Backup Label Studio” label; its descriptor does not establish an implemented About workflow. |
| Publisher/authors | Cargo and bundle metadata | Unknown release publisher is intentionally not supplied. Removed scaffold `authors = ["you"]`; do not derive a publisher from a username or copyright attribution. |
| License metadata | [Root license text](../LICENSE), Cargo manifest, vendored notices | Root MIT text exists. Empty application manifest license scaffolding is omitted; the release decision must reconcile first-party metadata and preserved third-party notices. This change does not alter legal text or select a license. |

The frontend package is private and keeps its established name. No installer format, signing identity, updater, bundle target, icon, application identifier, dependency or executable name changes here.

## Home Capability Copy

[HomeScreen](../src/components/home/HomeScreen.tsx) now describes Load as accepting Disc and jewel case projects, and New Case as the available cover/tray/spine editor in development. [Shared Open staging](../src/app/appProjectLoad.ts) already restores either project kind. The existing conditional Resume card still receives its title, status and exact session/route behavior from the lifecycle owner. No command, state transition, route, control order, or layout changed.

The Case editor remains short of alpha completion under #126/#149. DVD/Amaray, Blu-ray case editors and Guided Start are not advertised as implemented. Home copy is not proof of native or packaged acceptance.

## Packaged Acceptance Still Required

Under #376, inspect the Windows executable/installer display name, description, version, publisher and notices from the actual packaged artifact; verify the chosen publisher/license policy before filling those fields. Confirm Home Load/New/Resume wording in the authorized native Tauri run and exercise both project kinds. `cargo metadata`, source tests and build success cannot substitute for those observations. Linux/macOS packaging and support remain separate gates.
