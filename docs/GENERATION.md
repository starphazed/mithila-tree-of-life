# Generation

The seed is the only artistic input in the interface. Playback, zoom and export controls do not change the composition.

## From seed to painting

1. `deriveIdentity(seed)` selects a coordinated composition recipe, palette, motif proportions, border and weather.
2. `createSkeleton()` constructs curved branches with parent IDs, branch orders, attachment positions, taper and growth timing.
3. `compose(seed)` places foliage on secondary shoots, fits focal figures and plans the ground and river areas.
4. The vector grammars construct branch contours, motifs, hatching and ornament.
5. The renderer follows the planned growth sequence, then samples the hierarchical motion system. Display policy adapts cache size and frame cadence independently of the seed.

`compose(seed)` returns the identity, settings, nodes, motif capacity and maturity time. `settings` is an internal derived result, rather than a set of user overrides. Seeds are trimmed to 64 characters; an empty seed falls back to `MITHILA-014`. Case and punctuation affect the result.

```js
import {compose} from './dist/js/composition.js';
import {completeSVG} from './dist/js/snapshot.js';

const model = compose('MITHILA-014');
const svg = completeSVG(model, {size: 1000, motionTime: 0});
```

`completeSVG` produces a fully developed painting without a browser. Interactive exports use the renderer to capture the current drawing progress and pose.

## Independent random streams

The composition, palette, motifs, animation and border use separately named seed streams. Consuming random values in one stream does not advance another stream. Motif construction also uses seed, kind and variant keys.

This separation limits accidental coupling. A composition change can still alter motif attachment points or variant selection, so it can legitimately change the painting. Artwork reproducibility is tied to `GENERATOR_VERSION`, currently 4. Animation poses are deterministic for a seed at the same simulation time within `MOTION_VERSION`, currently 2; browser scheduling can affect when a particular pose is displayed. Motion version 2 increases branch and leaf response without changing the seed's weather or composition. Older sessions use the current motion version; historical motion engines are not selected during import.

## Branches and placement

The six recipes are Spreading garden, Rising grove, Candelabra, Forked crown, Unfolding fan and Wandering boughs. Each recipe couples crown shape, leader dominance, internodes, lean, branching and foliage mass. Different branch orders can use different botanical grammars.

Children attach to positions on their parent's cubic curve and begin after that point has developed. Width decreases with branch order and along each branch. Secondary shoots carry irregular leaf clusters, with larger leaves generally lower in the tree. Woody intersection checks keep major contours legible. Motif envelopes allow limited edge layering so the canopy retains density; focal animals receive more space.

The morphology reference guides branching structure. The output remains a stylized illustration, rather than a botanical simulation or scientific reconstruction.

## Motifs, color and borders

The eight motif types are leaf, flower, bud, fruit, bird, lotus, fish and peacock. Their geometry includes paired contours, clipped pattern panels, hatching and stippling. Lotus families vary petal count, layers, opening and contour. Peacocks vary neck, posture, body, tail arrangement and feather construction. Fish vary body depth, fins, tails and scale patterns.

The palette system assigns related pigments to paper, contours, wood, foliage, flowers, animals and borders. Internal detail colors are chosen against their fills. Monochrome, limited and multicolor modes share this role system. Contrast checks cover paper/ink and detail/fill pairs; they do not constitute an accessibility certification of every overlap.

Border families: climbing vine, lotus garland, fish procession, feather eyes, petal scallops, woven braid, paisley pods, diamond lattice, sun wheels, fern fronds, river waves and petal knots. Each has seeded width, repeat count, pigment rhythm, rails and corner ornament. Repeated units share vector definitions.

## Growth and motion

A seed selects a 10–15 second drawing duration. Growth uses elapsed time and increasing prefixes of the actual branch curves. Motif contours draw stroke by stroke; fills and internal marks follow. Objects are not revealed by fading or scaling a finished illustration. Growth completes once and adds no further objects.

Wind bends the trunk very slightly, primary branches slowly and secondary branches and twigs more responsively. Child origins follow positions and tangents on deformed parents. Leaves add individual flutter and twisting; flowers and lotuses bob according to placement and size. Peacock head, tail and blink groups, and fish fins and tails, have independent restrained movement.

Weather intensity, direction, rhythm, gusts and phases come from the seed. After the drawing completes, wind builds over 2.5 seconds rather than jumping immediately to full strength. Hidden tabs, open dialogs and motif inspection suspend the simulation clock. Reduced-motion preferences start drawing paused and wind disabled. Replay resets drawing and motion time; it retains the current wind on/off choice.

The generator and motion versions describe different things. Generator 4 fixes the seed's composition, pigment roles, border, motif construction and growth plan. Motion 2 fixes how that painting responds at a given simulation time. A saved session records both version numbers, but imports use the current motion calibration rather than selecting a historical engine. Keep the matching application release if an exact historical pose needs to be reproduced.

## Modules

All paths below are under `dist/js/`.

| Module | Responsibility |
| --- | --- |
| `random.js` | Hashing, seeded random streams and curve helpers |
| `identity.js` | Coordinated seed recipes and generator version |
| `palette.js` | Pigment roles and contrast adjustments |
| `branching.js` | Branch architectures, attachments, taper and timing |
| `composition.js` | Skeleton-first composition and motif placement |
| `placement.js` | Footprints, conservative collision bounds and controlled layering |
| `grammar.js` | Branch, leaf, flower and ornamental vector construction |
| `motif-families.js` | Procedural lotus, peacock and fish families |
| `borders.js` | Border identity and repeated pattern construction |
| `growth.js` | Node visibility, contour progress and detail timing |
| `motion.js` | Wind field and hierarchical poses |
| `renderer.js` | Progressive SVG, view controls and vector export |
| `canvas-scene.js` | Cached rendering for completed motion |
| `sprite-layers.js` | Ordered texture layers for articulated motifs |
| `performance.js` | Device display policy, independent of artistic identity |
| `composition-task.js` / `composition-worker.js` | Cancellable background composition |
| `snapshot.js` | Complete SVG snapshots for review |
| `state.js` | Seed/session sanitizing and browser storage |
| `app.js` | Interface, playback, navigation and download handling |
