# References and credits

Mithila is a contemporary generative interpretation informed by the artists and painting communities of Mithila. Its double contours, filled pattern panels, botanical subjects and ornamental borders draw on the Madhubani painting tradition. The named works and research below informed development.

## Painting references

- [Sakshi Gambhir / IDC, IIT Bombay — Madhubani Paintings of Bihar: Process](https://www.dsource.in/resource/madhubani-paintings-bihar/process). Reference for Kachni fine lines, hatching and stippling, and Bharni outlined color areas.
- [Prof. Bibhudutta Baral and Manasa K. H. / NID Bengaluru — Jharokha with Madhubani Painting: Making Process](https://www.dsource.in/resource/jharokha-madhubani-painting/making-process). Reference for paired outlines and patterning between them.
- [Asian Art Museum — Painting Is My Everything: Art from India's Mithila Region](https://exhibitions.asianart.org/exhibitions/painting-is-my-everything-art-from-indias-mithila-region/). Context for a living practice shaped by individual artists and contemporary subjects.
- [Ranjan Paswan — Tree of life with Krishna, 2015 / Asian Art Museum](https://searchcollection.asianart.org/objects/21971/tree-of-life-with-krishna). Reference for an inhabited tree composition, curved branches and detailed linework.

The generator's decisions about composition, motif placement and color are software rules for this project. They should not be read as a complete account of Mithila painting or the meanings of its motifs.

## Procedural reference

[Lingdong Huang — {Shan, Shui}*](https://github.com/LingDong-/shan-shui-inf) was an explicit inspiration for this project: reusable drawing primitives, layered vector construction, controlled randomness and coherent composition. Credit belongs to Huang for that reference project. The Mithila drawing engine is a separate implementation; Huang's project is not a bundled library or asset.

## Branching reference

Shucun Sun, Karl J. Niklas, Fei Fang, Shuang Xiang, Xinwei Wu and Xiaocheng Yang (2010). **Is Branching Intensity Interspecifically Related to Biomass Allocation? A Survey of 25 Dicot Shrub Species from an Open-Growing Dry Valley.** *International Journal of Plant Sciences*, 171(6), 615–625. [doi:10.1086/653544](https://doi.org/10.1086/653544).

The supplied A–U diagram is **Figure 1**, showing branch ordering across four crown-architecture categories. [Figure supplied through ResearchGate](https://www.researchgate.net/figure/Scheme-diagram-for-plant-branching-structure-showing-how-branches-are-numerically_fig3_249158746). The figure informed the generator's lateral, bifurcating, fan and tiered structures. Those descriptive grammar names and their artistic combinations belong to this application's implementation; the application does not reproduce the paper's biomass-allocation model or compute its branching-intensity measures. The reference figure is linked, not redistributed.

## Algorithms and code

- **Mulberry32 — Tommy Ettinger (2017)**, with the JavaScript formulation documented by **bryc**. The arithmetic in `random()` follows this generator. [Original implementation and CC0 dedication](https://gist.github.com/tommyettinger/46a874533244883189143505d203312c) · [bryc's JavaScript implementation and public-domain notice](https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32).
- **FNV — Glenn Fowler, Landon Curt Noll and Kiem-Phong Vo.** The string hash uses the FNV-1a recurrence and 32-bit constants with this project's JavaScript character handling. [Authors' algorithm reference and CC0 notice](https://www.isthe.com/chongo/tech/comp/fnv/index.html).

File locations, upstream notices and local adaptations are recorded in [Third-party notices](../THIRD_PARTY_NOTICES.md).

## Assets and licensing

The paintings, borders, favicon and inline interface icons are constructed as vectors in the application. Documentation images show output from this generator and its local interface. No reference paintings, screenshots of third-party artwork, remote fonts or downloaded image assets are included. Sharp is an optional development tool for contact sheets; it is not bundled with the app.

The original application source and associated documentation use the [MIT License](../LICENSE). References do not transfer their source materials' rights to this project. [Licensing and distribution](LICENSING.md) distinguishes that grant from these credits and the rights in reference works.
