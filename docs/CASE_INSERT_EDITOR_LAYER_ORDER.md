# Case Insert Editor Layer Order

Issue context: #134 and #141.

The case insert editor uses a separate layer-order path from the disc editor. The order lives in `src/editor/layerOrder.ts` so preview and export can share the same visual stack as the jewel case editor fills in.

Preview layers currently render in this order:

1. Case insert surface base.
2. Case background artwork.
3. Back cover screenshots.
4. Case callout artwork.
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
