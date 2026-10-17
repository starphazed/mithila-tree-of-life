# Development

## Repository layout

```text
 dist/                 Editable HTML, CSS and JavaScript
   diagnostics/        Browser performance fixture and preserved baseline
 docs/                 Generation, validation, references and images
 scripts/              Contact-sheet generation
 tests/                Node engine tests
 server.mjs            Local static preview server
 package.json          Version and convenience commands
```

`dist/` is the source of the application. There is no bundler, dependency installation or build step. The app uses ES modules, SVG and Canvas 2D, with system fonts and a procedural favicon.

## Preview and tests

Run commands from the repository root:

```sh
node server.mjs
node --test
```

`npm start` and `npm test` are equivalent conveniences if npm is installed. The local server defaults to port 4173 and binds to `127.0.0.1`.

To use another port in PowerShell:

```powershell
$env:MITHILA_PREVIEW_PORT = '4176'
node server.mjs
```

On macOS/Linux:

```sh
MITHILA_PREVIEW_PORT=4176 node server.mjs
```

Reload the browser after editing. No rebuild is required. The server sends `Cache-Control: no-cache` and serves only `dist/`.

## Static hosting

Upload the contents of `dist/` to a static host. Relative asset paths allow the app to live beneath a repository subpath. No server-side application, environment secret or API key is required.

For GitHub Pages, use a static publishing workflow whose uploaded artifact is `dist/`; this repository does not include an automatic deployment workflow. Selecting the repository root as a Pages source would not serve the app's nested entry point. `dist/diagnostics/` is a developer fixture and can be omitted from a public site while remaining in the source repository.

## Storage and exports

The current session is stored under `mithila-seeds-v4`; named seeds use `mithila-seeds-v4-studies`. Storage is local to the browser and origin, so changing hostname or port creates a separate store. Earlier v1 browser keys remain available as migration fallbacks.

Session JSON contains `application`, generator `version`, `motionVersion`, `seed`, drawing `time`, `paused`, `motionTime` and `motionPlaying`. Version 1 and 4 session imports are accepted and use current motion calibration. Legacy artistic settings are ignored in favor of the seed. Import size is limited to 1 MB. Named seeds are capped at 30; reusing a name replaces that entry. A session file is the portable backup when browser storage is unavailable or cleared.

SVG exports retain the full vector drawing, current pose and metadata. PNG exports rasterize that SVG in the browser. Export size, transparency and playback position are user choices; they do not change the seed. Large PNGs and detailed SVGs can take longer to create on weaker hardware.

## Rendering

Growing branches reuse SVG elements and extend their path prefixes. Stroke cursors update active and newly finished marks. Completed hatch geometry is batched, and branch junctions use geometric clipping. Once a motif has finished, a temporary SVG image can display its completed marks during the remaining growth. This avoids repainting thousands of clipped strokes. No PNG encoding is used for these temporary images; exports restore the retained vector geometry.

After growth, paper, border and ground stay in a stationary SVG layer. The transparent canvas above it uses oversampled foliage textures, cached rigid twigs and deformed primary branch paths, drawn directly without a second low-resolution sprite cache. Moving animal and lotus parts use separate texture layers, including nested head/blink transforms. Painter order, inherited colors and clipping are retained. Close zoom returns to the vector view. Exports restore retained vectors and sample the current pose, without embedding the screen cache. Replay disposes the previous canvas, stationary layer, textures and temporary image URLs.

Composition runs in a cancellable module worker, with a main-thread fallback if workers are unavailable. Conservative bounding-box checks skip impossible collisions before running the original geometric tests. The seed results are unchanged. The playback scheduler does not keep requesting frames when paused, hidden, inspecting motifs or displaying a dialog; completed motion does not repeatedly rewrite the status panel.

`?performance=pi4` selects a display policy for constrained hardware. It targets 20 drawing/wind updates per second, respects native pixel ratio up to 2 within a 4-megapixel surface budget, sizes caches for the displayed artwork and updates primary contours at up to 10 Hz. The same motion field drives all attachments. ARM devices and low reported core/memory counts select the constrained policy automatically. `?performance=quality` overrides that choice. These are display policies, not artistic parameters. See [Raspberry Pi 4 setup and validation](RASPBERRY_PI.md).

The fixture at `/diagnostics/performance.html` accepts `seed`, `interval` in milliseconds, and `engine=baseline` or `engine=optimized`. Set `interval=40` to match current drawing cadence. It measures one drawing and six seconds of motion. The baseline is a frozen pre-optimization implementation for comparison; it is not an alternate app entry point. Changes to current modules should not be copied into that baseline.

`/diagnostics/pi4.html` is the current device benchmark. It accepts `engine=before` for the frozen 4.0.3 renderer or `engine=after` for current code, `performance=pi4`, `size=880` and `seed`. It measures drawing, the first ten seconds of wind and ten more seconds of settled motion. Download report saves the measurements locally. `still=1` skips timing to inspect the finished canvas and vector export at a fixed pose. Enter a Wind time and select **Show cached painting** to apply it; the status confirms the rendered time. Keep the page visible and stop other animation while comparing runs. Canvas texture estimates exclude retained SVG, browser/driver image copies and other process memory.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Blank page or module errors | Serve `dist/` over HTTP instead of opening a file URL. |
| Port already in use | Use the existing preview or choose another port. |
| Drawing starts paused | Check reduced-motion settings and select Resume drawing. |
| Wind seems absent | Wait for drawing to finish and select **Resume motion** if shown. Wind builds over 2.5 seconds; leaves and outer shoots move more than the trunk. Reduced-motion preferences start wind disabled. |
| Motion stops during inspection | Motif view, dialogs and hidden tabs intentionally suspend time. |
| Completed artwork looks softer than the drawing | Reload the current 4.1.1 files if using an older copy. This release removes the extra low-resolution resampling and respects native display density within its pixel budget. Moving textures still have different antialiasing from SVG; close zoom and exports use vectors. |
| Stalls around the end of drawing | Dense seeds can still spend time preparing display caches. Compare the initial and settled wind samples in the device report. This transition remains a performance limit. |
| Saved seeds seem missing | Use the same browser, hostname and port, or open a session file. |
| Slow motion or export | Fit the artwork, pause wind, or choose a smaller PNG. Device benchmarking remains incomplete. |

## Preparing a source upload

Include `dist/`, `docs/`, `scripts/`, `tests/`, `server.mjs`, `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md` and `.gitignore`. The README and package metadata identify the MIT license. `dist/` also includes the license and deployment notices so static hosting retains them. Keep `artifacts/`, `.openai/`, environment files and dependency folders local; `.gitignore` excludes them. The curated documentation images and validation records under `docs/` are intended for the repository.

The project uses the [MIT License](../LICENSE). [Licensing and distribution](LICENSING.md) explains its scope and the notices to retain. The project references are documented separately from the application source. No reference artwork or the supplied branching diagram is bundled. The package's `private: true` prevents accidental npm publication; it does not control GitHub repository visibility.
