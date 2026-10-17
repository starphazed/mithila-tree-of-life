# Raspberry Pi 4

Target configuration: Raspberry Pi 4 with 4 GB RAM, Raspberry Pi OS 64-bit, Chromium and a single 1920 × 1080 display. This is a tuning target; no physical Pi benchmark has been run yet.

## Run

Copy the project folder to the Pi. Serve `dist/` over HTTP. Python can provide a preview without installing Node.js:

```sh
cd /path/to/mithila
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open this address in Chromium:

```text
http://127.0.0.1:4173/?performance=pi4
```

For a full-screen display, launch another terminal command:

```sh
chromium --kiosk "http://127.0.0.1:4173/?performance=pi4"
```

This starts a browser session; it does not install a boot service or change desktop settings. The regular Node preview server also works. Keep graphics acceleration enabled and start with the display set to 1080p rather than 4K. Use a stable power supply and cooling that avoids throttling during a long session.

[Raspberry Pi 4 specifications](https://www.raspberrypi.com/products/raspberry-pi-4-model-b/) · [Official kiosk setup](https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode/)

## Rendering policy

The Pi 4 URL changes display work, not seed identity:

- Target cadence is 20 updates per second. Drawing still completes in the seed's 10–15 second timeline; slower frames may skip intermediate stroke positions.
- Native screen pixel ratio is respected up to 2, within a 4,194,304-pixel moving-surface budget. A normal 1080p Pi display with pixel ratio 1 still renders at its native resolution; previewing Pi mode on a HiDPI laptop no longer forces a blurry 1× surface.
- Paper, border and ground stay in a stationary SVG layer. Motif and rigid-twig textures carry extra samples for a single moving draw pass, without the former second low-resolution cache. Separate layers preserve leaf flutter, lotus movement, peacock head/tail/blinking and fish fins/tails.
- Primary contours are rebuilt at up to 10 Hz; attached objects sample the hierarchical wind field at the 20-update target. The trunk remains nearly stationary while outer shoots and leaves move visibly at fitted size.
- Completed motifs are cheap to display during growth. Drawing strokes remain vector paths until completed.
- Close zoom and exports use full vector geometry. SVG/PNG downloads do not contain the display cache.
- Composition is planned in a background worker. Paused, hidden and dialog views stop requesting animation frames.

Low reported memory/core counts and ARM user agents also select this policy automatically. The explicit URL is more reliable for a dedicated installation. `?performance=quality` selects the higher-density policy for comparison. No artwork controls are added.

## Current performance limits

The 20-update cadence is a target, not a measured Pi frame rate. The latest retained 4.1.1 desktop samples used an 880px painting in a 1920 × 1080 viewport at pixel ratio 1:

| Seed | Initial wind updates in 10s | Settled wind updates in 10s | Mean settled update work | Estimated canvas textures |
| --- | --- | --- | --- | --- |
| `MITHILA-005` | 62 | 156 | 9.93ms | 14.81 MiB |
| `MITHILA-007` | 165 | 179 | 7.28ms | 10.78 MiB |

The dense first seed still stuttered while caches settled. Canvas estimates exclude retained vectors, browser/graphics copies and total process memory. These records establish neither smooth 1080p playback nor whole-browser memory use on a 4 GB Pi. [Measurements and source JSON](VALIDATION.md#sharpness-and-visible-wind--411) are retained for comparison with actual device reports.

## Measure on the Pi

Close other animated tabs and open:

```text
http://127.0.0.1:4173/diagnostics/pi4.html?engine=after&performance=pi4&size=880&seed=MITHILA-005
```

Keep this tab visible. It measures composition, drawing, the first ten seconds of wind and ten seconds of settled motion. Use **Download report** to retain JSON measurements. **Show vector export** and **Show cached painting** allow a still comparison at the same motion time.

For a visual check without the timed run, add `&still=1`. Enter a **Wind time**, select **Show cached painting**, and check that the status confirms the applied time. Compare 7 and 13 seconds to inspect motion and attachments, then compare the cached and vector views at one time to inspect detail. This still view is not a frame-rate benchmark.

Repeat with `MITHILA-004` and `MITHILA-007` for other palette and crown structures. A comparison run can use `engine=before`, which loads the retained 4.0.3 renderer. Run comparisons at the same display dimensions and pixel ratio. The report is written locally; there is no telemetry or automatic upload.

Check that:

- The complete artwork is present, with no missing caches or console errors.
- Controls respond while a seed is planned, and replay finishes once.
- Settled wind stays near the 20-update target without recurring long stalls. The report distinguishes update cost from browser frame spacing.
- Cached and vector views retain leaf veins, double contours, hatching, branch junctions and anatomical layers.
- Pause holds the image, and leaving the tab or opening About suspends motion.
- The system remains responsive over an extended session. Check thermal throttling and whole-browser memory on the Pi; canvas texture estimates do not measure either.

If 1080p still stutters, compare a 720p display before changing artwork rules. Avoid overclocking or disabling browser protections as a substitute for measurement. Record the Pi OS/browser versions, display size, seed and report with any issue.

## Validation status

Local desktop measurements and visual comparisons are recorded in [Validation](VALIDATION.md). They are not Pi 4 frame-rate or memory guarantees. The on-device reports above are the remaining acceptance check.
