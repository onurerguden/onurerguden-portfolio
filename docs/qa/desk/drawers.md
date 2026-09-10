# Four-drawer desk support

The right cabinet follows the supplied September 10 furniture reference with four drawers, slim metal handles and a recessed plinth. Dimensions are approximations from the existing desk: 34 cm width, 76 cm depth, 65.6 cm support height below the 3.6 cm tabletop. Its left edge is X=0.393 m after the requested 15% narrowing toward the fixed right edge. The left support is a 24 mm white laminate slab with the same depth and floor level. Both supports share the tabletop's white laminate material. No pixels from the reference image are shipped.

Each drawer includes a separate front, open-topped box, bottom and handle. Four exported interaction anchors retain independent transforms. The drawer box is 60 cm deep and travels at most 15 cm; vertical separation remains fixed with 4 mm gaps between fronts. The rear half stays inside the cabinet throughout the wave.

Clicking any drawer or the cabinet's front pick region starts a top-to-bottom wave. Each one-second stroke starts 180 ms after the previous stroke; the complete wave lasts 1540 ms. Repeated clicks during motion are ignored. The exact rest positions are restored after motion, on document/scene visibility loss, and when reduced motion is enabled. The shared English/Turkish HTML button is keyboard and touch accessible. The reduced-motion journey keeps its existing static view.

Only the opening camera moves back to include the supports. Screen reading stops and scroll timing remain unchanged. Invisible picking materials avoid drawing transparent hit boxes; raycasting still tests their geometry. Three moving contact shadows share one instanced draw. Fixed-light shadow maps are cached and invalidated when accessories or drawers move; a final render settles the updated shadows. No new dependencies or per-frame React state were added.

Reproduce the visual evidence with `DESK_REVIEW_URL=http://localhost:3101 node scripts/desk/capture-drawers.mjs`. The capture records the closed pose, upper/lower wave phases and mobile journey.

Model delivery: 97,095 triangles, 496,284 bytes, 44 material batches. Typecheck, lint, 40 unit tests, English/Turkish content validation and production build pass. The unit checks cover drawer ordering, cabinet clearance, limited travel and exact endpoints.

September 11 adjustment: travel reduced 50% to 15 cm, cabinet width reduced 15% to 34 cm, plinth reduced to 3 cm. Both supports now end at Y=-0.692 m. Automated tests were not rerun at the user’s request.
