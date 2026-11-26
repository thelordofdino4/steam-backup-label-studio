# Bounded Windows PNG acceptance and inspection correction

> Status: Representative Windows saved-output evidence; physical calibration and other platforms remain open.
> Scope: #359 density metadata, six native saved outputs, and correction of an unsupported Tray artwork-loss inference.
> Authority: Encoding and calibration requirements remain in `PNG_PHYSICAL_OUTPUT_CONTRACT.md`; these observations do not close #359.

## Runtime and scope

On 2026-11-15, the primary native Tauri application at `a36e2a40` exported Disc,
Jewel Cover and complete Tray with guides off/on into new disposable destinations.
That primary includes preserved, unpublished Case work as well as the main-only
#359 metadata candidate `3a610ece`; the receipt does not publish or separately
approve that Case work. Actual native actions were performed through the app,
not a browser substitute. Exact inputs, destinations and hashes are retained in
`sbls-359-native-evidence-20261115-01` under the local temporary evidence directory.

All six PNGs have valid signatures/chunk boundaries/CRCs, exactly one `pHYs`
immediately after IHDR, X=Y=11811 pixels/metre, and unit=1. Dimensions are unchanged
between guide settings. The default filename was retained in each numbered folder
under Desktop `sbls-359-native-output-20261115-01`.

| Output | Pixels | Bytes | SHA-256 |
| --- | --- | --- | --- |
| 01 Tray/off | 1780 x 1390 | 328325 | `312198480121756e0b682600d4addec170d8d8666476207598d37c84fcab29be` |
| 02 Tray/on | 1780 x 1390 | 348907 | `671dcb9c497f1350869e4444cd49827fc975ae8579e33ea2889d743486c8baf3` |
| 03 Cover/off | 1414 x 1414 | 114558 | `b1eb5b309a088fb60f41d2a80cd543749ec145cc9bcfa942610ee71cd64a5603` |
| 04 Cover/on | 1414 x 1414 | 119663 | `196f1944e00076c83fdad6ab4209f446e7f642e5437bb73748040f2f8f53fb68` |
| 05 Disc/off | 1423 x 1423 | 146405 | `632f5fdcd2e9fd2f1b0b006176010beb1db82fcbd6bcd4db4475ee13781c31d5` |
| 06 Disc/on | 1423 x 1423 | 331671 | `f22b54e322e44e9e0ca9645d58a98ccea767138c2894b1df8f1021565dff564e` |

The exact matched pre-change Tray/off PNG is SHA-256
`1ccf603cfb47e072702f1ff246e21500a8a32a8682fe9634ea4d4c4dec8e394b`.
Removing only the new 21-byte pHYs reproduces that entire PNG byte-for-byte, with
independently decoded pixels identical. This is not a matched pre-change native
comparison for the Cover, Disc or guide-on variants. Cover and Disc image
inspection retained the expected imagery and selected guide overlays.

## Correction: original Tray/on did not lose its screenshot

Initial displayed-image inspection appeared to omit the BG3 screenshot in Tray/on.
The earlier native receipt and diagnostic report therefore asserted saved-content
loss. **That inference was incorrect for the preserved files and is superseded by
direct pixel decoding.** The earlier records remain unchanged as historical
evidence; they must not be used to claim an unresolved PNG content-loss defect.

After read-only replay did not reproduce a loss, a separately authorized temporary
observer ran on primary `8401de95`. It recorded actual resolver/image/draw facts and
fixed-region fingerprints without changing renderer state. Exactly one off and one
on PNG were written. Both are byte-identical to their respective original outputs.
Both output-bound traces were complete, with unchanged source/framing, resolved
geometry, a loaded 3840 x 2119 image and a returned true draw result.

Fresh independent Node decoding of the ORIGINAL pair establishes byte-identical
RGBA pixels in x=184, y=954, width=400, height=206: 82,115 non-black pixels in each,
SHA-256 `65430fd12c3f66f72b1e000d274fd2066ad8ab4d142868b2c622f314b843759d`.
All three trace stages (after artwork, after all layers, decoded final PNG) match
that hash. Windows System.Drawing independently confirms identical BGRA bytes,
SHA-256 `ecb7ad3e47ff20eb9ebb427f106ae6595b838dae42abb6fad4c724ebc4385f27`.
Across the full original images, 58,349 pixels differ and zero differences occur
outside expected guide-stroke bands with a one-pixel antialias allowance. Thus the
questioned original pair preserves non-guide content, not just the sampled region.

The earlier replay JSON already contained identical original native ROI hashes;
that comparison was overlooked while displayed images and headless-to-native
comparisons were considered. This was an analysis error, not evidence of an app
defect. The later native preview observations also alternated between apparent
presence/absence without new input. Their visual/capture/display cause remains
unknown; it is not attributed to the application, user or tool without evidence.

No causal production fix was made. The observer's source-hash await, GPU readback
and final PNG decode change timing, so an observed successful run alone would not
prove a fix. Here, original-byte identity and independent decoding of the original
files provide the correction. Temporary instrumentation is removed separately;
normal application source returns exactly to its pre-diagnostic state.

## Evidence and remaining gates

The original receipt (`native-acceptance-receipt.md`, SHA-256
`71d2ca1ef9b52256b50760db676361013b53d070fd474541fe2e8a87f503edab`)
and original diagnostic interpretation (`tray-content-diagnostic-result.md`,
`7c89ceaa13675cf8805757631456548c131dd62e14cb3c1d4fcd7f0f60676433`)
remain preserved. The correction is in `sbls-359-native-diagnostic-20261115-01`:

- `native-diagnostic-receipt.md`: `d8d190399f8868d06612b5b8075cf5aa85d3d69060729d44b66de8e02fe3897f`.
- `independent-original-roi-and-guides.json`: `af32fba28b7d076fc799beff4720fc0a1244780442e2a930220281e4b76b8619`, with its reproducible read-only script.
- Original/diagnostic PNGs, two UUID-bound sidecars, independent System.Drawing
  ROI results and chronological native observations are retained. No source asset
  was overwritten; all 13 fixture hashes and all six original PNG hashes stayed unchanged.

This passes the inspected Windows metadata/content samples, not every possible
preview behavior or a broad release/print claim. No printer, driver or print
software was exercised. Physical calibration, a declared product tolerance, and
Linux/macOS validation remain open. The proposed 0.5 mm tolerance is still
unapproved. OS/WebView versions were not captured in this bounded receipt; record
them in any platform/calibration release matrix. #359 remains open.
