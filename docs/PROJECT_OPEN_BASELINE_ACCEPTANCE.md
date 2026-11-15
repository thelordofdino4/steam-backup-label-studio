# Project Open baseline acceptance

> Status: Focused #308 source repair and acceptance boundary.
> Baseline: main `5a899b88e0c4137c6b15839ca0a4cc0e2bbb32c1`.
> Authority: `APPLICATION_COMMAND_AND_PROJECT_LIFECYCLE_CONTRACT.md` owns session semantics; `PROJECT_FILE_SPEC.md` owns restoration policy.

## Bounded defect and repair

[Issue #308 evidence](https://github.com/thelordofdino4/steam-backup-label-studio/issues/308#issuecomment-6889060855)
identified a legacy full-branding Disc that became dirty at revision 1 during
its first editor synchronization without an edit. The parsed snapshot preceded
restoration defaults, embedded-logo provenance, the snapshot owner's background
note, and safe-zone clamping of the PC mark from `(24, 82)` to
`(24.122868755624978, 81.84877691615388)`. Failed conversion Save did not cause
that initial transition.

`appProjectLoad.ts` now captures the accepted Disc snapshot after restoration
and final preset reconstruction/fallback. It uses `createProjectSnapshot`, the
same persistence projection as editor capture, retaining the source `savedAt`
timestamp. The existing lifecycle Open owner atomically installs that prepared
aggregate and its clean baseline. The first canonically equal editor capture
is a revision, state, and publication no-op. A real edit still becomes dirty.

This is shared Disc staging for both legacy JSON and hydrated package input.
The Case staging owner is unchanged. Restoration/clamping policy, asset bytes,
schema, dirty comparison, replacement guard, Save failure behavior, and native
I/O are unchanged. No design fields are excluded from dirty comparison and no
post-Open effect clears dirty state. Close/Quit, history, crash recovery, broader
lifecycle work, and banner-provenance policy are outside this repair.

## Automated acceptance

`src/app/appProjectOpenBaseline.test.ts` runs the production runtime, Open
staging, aggregate applier, normal workspace snapshot, synchronization, shared
guard, and Save owners. Native I/O and React setter ports are supplied by the
test. This is stronger than candidate-to-candidate equality, but does not mount
React or establish native visual acceptance.

The 15 regressions cover:

- All five tracked legacy fixtures, including full branding, minimal schema
  migration, custom geometry, disabled defaults, and background-only content.
- Canonical baseline equality, revision zero, repeated synchronization with
  no state/publication changes, source timestamp, path, and format preservation.
- Full-branding embedded assets/provenance and existing PC safe-zone clamping.
- Hydrated package Disc input and a Case Back/Tray control.
- Successful guided reconstruction and a browser-measurement failure after
  restoration that deactivates guidance before baseline capture.
- A genuine title edit that advances once, preserves the clean baseline, and
  still activates the replacement guard.
- Failed and cancelled legacy conversion from both clean and edited sessions,
  preserving exact state, identity, path, format, baseline, content, and dirty
  status. The failed write port models the native invalid-image rejection;
  it does not prove filesystem atomicity.
- A later invalid Open preserving both the session and applied editor state.

The first run on unchanged production source failed 12 of 13 tests; the Case
control passed. Final guided cases were then added. An initial post-fix test
used the wrong provenance property name; correcting that test gave 15/15.
The broader package staging test initially matched valid
`titleArtwork.steamArtworkAssetId` against a substring prohibition on package
`assetId`. Its assertion now checks exact JSON metadata keys rather than
rejecting a valid restored design field.

## Remaining native acceptance

From the synchronized primary checkout, Open a disposable copy of the legacy
full-branding fixture, confirm clean Home/Resume and prompt-free clean
replacement, then make a real edit and confirm the guard. Verify cancelled and
invalid-image conversion failures retain the displayed design and correct
clean/dirty status without writing the legacy source. Repeat a representative
minimal migration, valid package, and Case control. Record actual native
observations separately; automated results do not close the broader #308 issue.
