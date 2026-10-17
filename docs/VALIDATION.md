# Validation

Application 4.1.1 keeps generator version 4 and uses motion version 2. Performance work changes collision checking, background composition, screen caching and frame scheduling. Complete compositions remain identical to 4.0.3 across the reviewed seeds. The interface cleanup and documentation review below were completed for 4.0.2; attribution was completed in 4.0.3. Historical timing records are labeled by release.

## Engine checks

Run `node --test` from the repository root. The 18 tests cover:

- Repeatable seeds, distinct compositions and independent random streams.
- Finite geometry, bounded capacity and complete growth within 10–15 seconds.
- Branch order, taper, exact parent attachments and node emergence timing.
- Sampled woody intersection checks across 24 seeds.
- Controlled motif layering, secondary-shoot foliage and larger lower leaves.
- Palette contrast and constructed lotus, peacock and fish variation.
- Border repeatability and coverage of all twelve families across 150 seeds.
- Seed-only session behavior and bounded hierarchical motion, including long simulation times and perceptible fitted-size leaf silhouettes across the six crown recipes.
- Exact composition parity against the retained generator, native HiDPI sharpness within a display-pixel budget, worker cancellation races and a worker-free fallback.

These are structural checks on a sample, not proof that every possible seed has an equally successful composition.

## Visual samples

`MITHILA-001` through `MITHILA-024` cover six recipes, 12 palette families, 15 dark backgrounds, six monochrome paintings, nine limited palettes and nine multicolor paintings. Motif counts range from 171 to 296. All 24 sampled lotuses, peacocks and fish differ in actual path construction.

- [24-seed contact sheet](images/seed-contact-sheet.jpg)
- [Lotus, peacock and fish comparison](images/motif-families.jpg)
- [Twelve border families](images/border-families.jpg)
- [Seed inventory and motif traits](validation/seeds.json)

The seed contact sheet and motif comparison were recorded before the twelve-border update. They remain a record of the unchanged canopy and motif rules. The separate border sheet shows all current border families. Fine linework is easier to evaluate in the generated SVGs than in these compressed overview images.

To regenerate current paintings and an inventory:

```sh
node scripts/validate-seeds.mjs
```

Outputs go to ignored `artifacts/seed-validation/`. SVG output needs only Node.js. PNGs and contact sheets additionally need Sharp installed separately; set `MITHILA_SHARP_MODULE` to the absolute path of its JavaScript entry module before running. Sharp is an optional review tool, not an app dependency.

## Browser checks

Earlier Chromium checks cover replay, deterministic motif geometry, holding/resuming motion, seed changes, zoom, motif inspection, session handling and SVG export. A downloaded SVG parsed with a full viewBox, finite coordinates and seed/version metadata. The later optimized renderer's export also parsed, retained border references and contained no raster images.

For the interface cleanup, desktop and 390 × 844 / 320 × 640 responsive layouts are checked again, including About, export options, motif navigation, replay and the Studio drawer. These are browser viewport checks, not physical phone tests. PNG rendering was previously checked from a saved SVG; a fresh native PNG download was not part of the copy cleanup.

## Recorded performance

The renderer comparison used dense seed `MITHILA-005`, 296 motifs, a 620 × 620 artwork and the local Chromium preview. It was recorded during the 4.0.1 rendering work.

| Measurement | Baseline | Optimized |
| --- | --- | --- |
| Wind updates in six seconds | 19 | 127 |
| Mean animation-frame gap during wind | 328.78 ms | 18.14 ms |
| Mean drawing update | 27.62 ms | 7.04 ms |
| Drawing update, 95th percentile | 96.8 ms | 20.6 ms |
| Long tasks in sample | 24 | 2 |

[Baseline record](validation/rendering-baseline.json) · [Optimized record](validation/rendering-optimized.json)

Baseline drawing checkpoints were 100 ms; the optimized run used the current 40 ms cadence. Both requested wind updates every 32 ms. This is a local workload comparison with different drawing cadences, not a frame-rate guarantee. Some texture preparation occurs during drawing and the transition into wind. Screen caching changes antialiasing; close zoom and exports use the retained vectors.

## Remaining limits

Safari, Firefox, physical mobile devices and Raspberry Pi hardware have not been benchmarked. Raspberry Pi suitability remains unverified. Dense seeds, large viewports and high-resolution PNG export need device testing. Seeded quality constraints reduce collisions but do not establish that every composition is visually successful. Future generator changes require another sample review and a decision about versioned reproducibility.


## Pi 4 rendering work — 4.1.0

The local comparison below uses the same dense seed (`MITHILA-005`), 880 × 880 artwork, approximately 1920 × 1080 browser viewport and device pixel ratio 1. Both fixtures request 50 ms drawing/wind cadence. These are desktop Chromium results, not measurements from ARM hardware. They exercise the renderer rather than all studio interactions.

| Measurement | 4.0.3 | 4.1.0 / Pi 4 policy |
| --- | --- | --- |
| Composition on the calling thread | 806.9 ms | 91.6 ms |
| Mean drawing update | 7.86 ms | 7.67 ms |
| Drawing update, 95th percentile | 21.7 ms | 23.7 ms |
| Mean settled-wind update | 4.37 ms | 3.08 ms |
| Settled-wind update, 95th percentile | 5.7 ms | 6.6 ms |
| Wind updates in the settled ten-second sample | 183 | 184 |
| Estimated canvas textures | 48.28 MiB | 18.97 MiB |

[Before record](validation/pi4-before-desktop.json) · [After record](validation/pi4-after-desktop.json) · [Second seed](validation/pi4-second-seed-desktop.json)

The application now performs composition in a worker; the current fixture additionally verifies that the real worker returns exactly the same model (94 ms including its startup in this sample). Separately, comparing all 24 seeds against the retained implementation found identical complete models; total planning time was 14.2 seconds before and 0.75 seconds after conservative collision bounds. Timing varies with warm-up and machine load. Some individual update percentiles did not improve; the main gains are planning cost, mean motion work, reduced texture memory and eliminating repeated studio updates when idle.

Texture estimates cover canvas pixel buffers only. Browser image caches, retained SVG, driver copies and process memory are excluded. The old record lists seven animated motifs without caches because that renderer intentionally left them in an SVG overlay. Current runs have no missing motif caches. Both policies preserve the full vectors for close inspection and exports.

Cached and vector screenshots were compared at the same wind time. At native size, 3.81% of pixels differ by more than 30 channel values, with mean absolute channel difference 5.53/255. This historical comparison did not prevent visible softening of fine marks at fitted size, especially on HiDPI screens; the 4.1.1 changes below address that quality regression. A completed export contains 4,004 paths, no image elements or blob references, no invalid coordinates and no unresolved clip references. A mid-growth export was also checked with 22 temporary proxies present: its exported SVG has zero image elements, a full viewBox and no parsing errors.

`MITHILA-007` was checked as a second crown/palette structure: worker/model parity, no missing caches, 16.32 MiB estimated textures and 2.47 ms mean settled-wind update. Real Pi 4 acceptance remains the [on-device procedure](RASPBERRY_PI.md).

## Sharpness and visible wind — 4.1.1

The 1× display cap and second low-resolution sprite resampling softened the completed artwork on HiDPI screens. The stationary paper, border and ground now remain SVG. Moving textures draw directly to a native-density surface, within the display pixel budget. At a 614px fitted size and device pixel ratio 1.5, the moving surface is 921 × 921 rather than 614 × 614. Native 1080p Pi displays with pixel ratio 1 keep the same surface dimensions.

Matched 880px cached/vector captures retain the border at native vector quality: top, left and right 45px strips are pixel-identical; the bottom strip has mean absolute channel difference 0.003/255. The moving layer still has different raster antialiasing from SVG. It is not pixel-identical, and close zoom and exports continue to use full vectors. A completed export was checked again: 4,004 paths, zero images or duplicate IDs, finite coordinates, no blob URLs and motion version 2 metadata.

Motion version 2 strengthens outer-shoot bending and individual leaf flutter, with a 2.5-second smooth onset. The trunk stays nearly stationary, attachments remain exact, and animals retain their small independent movements. The fitted-size regression check measures leaf-tip travel across six crown recipes: the median must exceed one pixel at 614px, while maximum travel stays below 15px over the sampled interval. Deterministic poses, smooth adjacent frames and long-time bounds are checked separately.

A fresh dense-seed desktop run at 880px/DPR 1 recorded 9.93ms mean settled-wind work, 17.7ms at the 95th percentile, 156 updates in ten seconds and 14.81 MiB estimated canvas textures. A same-session run of the retained 4.0.3 renderer recorded 12.97ms, 18.1ms, 57 updates and 48.28 MiB respectively. These runs were slower than the historical measurements above, so they should not be compared across sessions. The first ten seconds of wind delivered only 62 updates while caches settled; a consistent 20 updates per second, especially through the transition and on physical Pi hardware, remains unverified.

[Current record](validation/pi4-sharpness-desktop.json) · [Same-session retained renderer](validation/pi4-sharpness-baseline-desktop.json) · [Second crown](validation/pi4-sharpness-second-seed-desktop.json)

The second crown (`MITHILA-007`) retained all motif caches and worker parity, with 7.28ms mean settled-wind work, 179 updates in ten seconds and 10.78 MiB estimated textures. Fixed poses at 7 and 13 seconds were captured for motion comparison. This is also a desktop measurement, not a Pi result.

The studio was checked again at its native 1.5× display density, including the switch to full vectors at 169% zoom and back to the fitted cached view. Two paused captures were pixel-identical; resuming wind changed the actual canvas image. The current seed was preserved, wind was left on, and no browser warnings or errors were reported.
