# Case Insert Editor Layer Order
> Status: Conditional case insert layer-order reference.
> Purpose: Case insert preview/export layer order policy.
> Read when: Case insert renderer, export, or layer-order work.
> Authoritative source: This document for case layer order; SDD for global parity.
> Last reviewed against commit: `408bd68f2a13998a54e14c72930628993c5cdcfb`.


Issue context: #134 and #141.

The case insert editor uses a separate layer-order path from the disc editor. The order lives in `src/editor/layerOrder.ts` so preview and export can share the same visual stack as the jewel case editor fills in.

Preview layers currently render in this order:

1. Case insert surface base.
2. Case background artwork.
3. Case additional artwork.
4. Case artwork.
5. Case title artwork.
6. Case logos.
7. Case rating badges.
8. Case media marks.
9. Case operating system marks.
10. Case technical marks.
11. Case text.
12. Spine content.
13. Case editor guide overlay.

The export path should use the same content ordering, then draw optional case export guides after normal content. Guide geometry should continue to come from the rectangular template model and focused case layout helpers, not duplicated CSS.
