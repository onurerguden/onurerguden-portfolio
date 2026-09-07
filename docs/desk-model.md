# Desk model review

This is the model-first phase approved by Onur. The home page remains unchanged. Local/preview review routes are `/en/lab/desk` and `/tr/lab/desk`; they are noindex, absent from the sitemap and navigation, and return 404 when `VERCEL_ENV=production`. Integration into the portfolio's scroll experience follows visual review.

## Reference hierarchy and corrections

The September 7 unobstructed monitor photo controls monitor and riser placement; the clean full-desk photo controls the remaining arrangement. The five close-ups control component details. User-confirmed desk size is 150 × 80 cm, Samsung portrait display 24 inches, Lenovo ultrawide 29 inches, laptop **MacBook Pro 14 M1 Pro** (explicitly reconfirmed), Xiaomi lightbar, Razer Barracuda and Logitech MX Master 3S.

Onur rejected the initial proportion study as too generic. The revision removes the monitor gap, brings the laptop back toward the ultrawide, moves its wrist rest with it, narrows the riser and drawer, separates the headphone stand/lamp, rebuilds mouse sections and open ear cushions, and adds concealed amber lighting behind the displays. The specific vertical gap remains photo-derived pending the requested ruler measurements. Do not claim manufacturer-CAD accuracy or a verified 1:1 reconstruction.

## Asset research

- The stand visually matches [IKEA BRYTET](https://www.ikea.com.tr/en/p10493515), official dimensions 47 × 27 × 13 cm with 31 cm drawer interior. This identification is inferred from the photo, not a supplied SKU.
- [Logitech's specification](https://hub.sync.logitech.com/mx-master-3s/post/specifications---mx-master-3s-for-business-YAOnlMzTGrkzjuy) gives a 124.9 × 84.3 × 51 mm envelope. The original mouse geometry now uses shaped sections rather than an ellipsoid placeholder.
- [Krystian's MX Master 3S](https://sketchfab.com/3d-models/logitech-mx-master-3s-e3f9cfe03c0e4aa79570cfd2402e65fd) links to a marketplace asset. It was not purchased or imported.
- [chopraz2431's Master 3 scan](https://sketchfab.com/3d-models/logitech-mx-master-3-scan-f0295665d86e4e12afd1398905fc189b) is CC BY 4.0 according to the creator/API, but is the older model and its download endpoint requires authentication (401). No download restrictions were bypassed; the scan is not included.
- The [Barracuda X asset](https://www.cgtrader.com/3d-models/electronics/audio/razer-barracuda-x-multi-platform-wireless-headset) is paid and a different variant. It was not imported. The Barracuda was rebuilt from the supplied close-up and the [manufacturer's guide](https://dl.razerzone.com/master-guides/RazerSynapse3/BARRACUDA-00001340-en.pdf).
- The right lamp resembles [Mi Bedside Lamp 2](https://www.mi.com/de/support/faq/details/KA-01252/); its housing and controls are photo-derived. All accessory geometry remains original.

## Delivery and rendering

Blender 4.5.13 LTS source keeps named editable objects, original procedural textures and lights. `scripts/desk/build.py` writes the source, ten rendered views, a Y-up screen/camera contract and a material-batched Draco GLB. `npm run desk:package` creates WebP review images and hashes. See `assets/desk/README.md` for reproduction.

Static receiver surfaces (desk, mat, wall) bake Cycles diffuse lighting into 1024 px maps. The viewer uses unlit materials for those baked surfaces; device materials remain PBR. JPEG-compressed receiver maps preserve soft contact shadows and concealed wall lighting; the perforated stand retains PNG alpha. No HDRI or remote model request is required. The local Draco decoder is separate runtime code, not part of the model transfer budget.

The review uses four buttons and a reversible range control, not scroll capture. Per-stop camera framing fits the portrait screen correctly on mobile. A flattened HTML projection matches the three screen planes; source text stays HTML, with meaningful descriptions outside the decorative overlay. There are no real project interactions inside these sample screens yet.

3D loads only on explicit request, leaving a static poster until the asset is ready. Reduced motion snaps between views. Idle and offscreen render loops stop. Download errors, context loss or unsupported WebGL preserve static view selection. Scene review includes separate close-ups for the mouse, headphones and riser.

## Audit decisions

Web Interface Guidelines snapshot is `docs/qa/desk/web-interface-guidelines.md`, SHA256 `5a775e6411f790f518dbc9c1fa7c50a89e6873502d9a3530a6eb223a590bcfe8`. Sentence case and first person intentionally follow the user brief. Review controls are native buttons/range input with visible focus and hover states. Review camera progress is ephemeral local state, not a published navigation route.

Final acceptance requires Onur's visual review and any supplied spacing measurements. Physical iPhone GPU testing remains a release prerequisite; desktop WebKit emulation must not be presented as that test.

## September 7 geometry revision

The unchanged MacBook Pro lid is the reference for halving the previous vertical screen clearance. Both monitor tops align. Lenovo foot and neck share the screen center at x=0.09 m; the 47 cm riser center is x=0.025 m, leaving more mesh exposed on the left. The riser now has continuous rounded front/rear transverse rails rather than side-oriented arches. Headband, ear shells and cushion cross-sections are thinner. The left light has a 22 mm housing placed flush inside the rear-left desk corner; the right lamp has no extra square base. Rear monitor mounting plates, screw heads and ventilation slots are separate geometry.

Front, side and right-lamp inspection renders supplement the four review stops and accessory close-ups. Device depths and material finishes remain photo-derived, not verified manufacturer CAD.

## Tablet and headphone fit revision

The tablet lies flat in portrait orientation at (-0.275, -0.170) m on the desk, with zero yaw so its edges are parallel to the desk. Its pencil moves with the tablet; the casing and pencil retain clearance from the laptop wrist rest.

The headphone arch is narrower (70 mm horizontal ellipse radius, 112 mm vertical radius). Earcups tilt inward by 25 degrees, with their centers 73 mm apart. The cushion meshes have a measured 1.216 mm horizontal separation in headphone-local coordinates, producing near-contact without overlap. Recessed adjustment sliders replace the exposed fork assemblies. The stand remains behind the earcups.
