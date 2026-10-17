# Third-party notices

These notices cover algorithm implementations in the source repository. Artistic and scientific references are credited in the application's About panel and the source repository's reference documentation.

## Mulberry32

**Algorithm:** Tommy Ettinger, 2017. [Original implementation](https://gist.github.com/tommyettinger/46a874533244883189143505d203312c). Ettinger dedicates the implementation to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), without warranty.

**JavaScript formulation:** [bryc — Pseudorandom number generators](https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32). The source document identifies its implementations as public domain.

**Used in:** `js/random.js`, function `random()`, and the retained copies in `diagnostics/baseline/random.js` and `diagnostics/pre-pi4/random.js`.

**Local adaptation:** the generator is wrapped in an ES module and seeded through the project's string hash. Local naming and state arithmetic are retained to preserve existing seed output. The Mulberry32 arithmetic is credited to its upstream authors, rather than claimed as a new algorithm.

## FNV-1a-style string hashing

**Algorithm:** Glenn Fowler, Landon Curt Noll and Kiem-Phong Vo. [FNV authors' reference](https://www.isthe.com/chongo/tech/comp/fnv/index.html). The authors publish the FNV algorithms and reference code under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

**Used in:** `js/random.js`, function `hash()`, and the retained copies in `diagnostics/baseline/random.js` and `diagnostics/pre-pi4/random.js`.

**Local implementation:** uses the 32-bit FNV offset basis, prime and XOR-then-multiply recurrence over JavaScript character values. This is not a byte-encoding-compatible implementation for all Unicode input. The IETF's C implementation is not bundled.

## Reference projects and assets

Lingdong Huang's [{Shan, Shui}*](https://github.com/LingDong-/shan-shui-inf) is credited as a procedural-art reference. No copy of that project's source or artwork is distributed in this repository. The painting references and Sun et al. branching diagram are linked in the credits; their images are not bundled.

The application has no bundled third-party runtime packages, fonts or image assets. Optional tools used to generate documentation images are installed separately.

These upstream notices apply to the identified components. The original application source and associated documentation are licensed under the [MIT License](LICENSE), copyright (c) 2026 starphazed. Preserve these upstream notices alongside that license.
