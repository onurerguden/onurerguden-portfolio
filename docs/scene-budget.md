# Hero scene budget

The four-layer object is an original schematic of data becoming a working system. It is not presented as the literal architecture of any project. Ceramic inserts and cobalt acrylic plates are drawn from primitives; the fallback SVG is the same conceptual diagram.

- **Model and texture requests: 0 bytes.** No GLTF, external textures, environment maps, shadow maps, or post-processing.
- **Geometry: 29 meshes / approximately 1,000 triangles**, below 100,000 triangles and 50 draw calls. Transparent plate materials can affect render ordering; verify actual renderer counters in the production scene when changing materials.
- **DPR: capped at 1.5**, low-power renderer preference, orthographic camera. No continuous rotation or animation loop. Demand frames are invalidated by scroll, resizing, and initial scene setup.
- The separate dynamic scene chunk mounts at browser idle only while visible. Offscreen canvas unmounts, removing scroll listeners and releasing renderer resources. Reduced motion never needs WebGL. Preference changes and context loss return to the SVG.
- The scene is decorative and unfocusable. The meaningful layer labels remain HTML. No interactions require waiting for a model or moving a pointer.

## Verification

Run a production build and inspect the browser Network panel with cache disabled: record compressed size of the lazy Three/R3F chunks separately from route JavaScript. The 1.5 MB cap applies to models/textures, not the JS runtime. Confirm no 3D chunks load with reduced motion, and that their load starts after the initial document/content paint. Record device, browser, viewport, and network profile alongside results.

In React Three Fiber's development renderer inspect `gl.info.render.calls` and `gl.info.render.triangles` after a settled frame; these are the measured values and supersede the primitive estimate above. Use browser Performance/GPU tooling to confirm idle frames stop after scroll and the canvas disappears offscreen. Simulate `WEBGL_lose_context` and confirm poster replacement with no lost content. Resize from 320 px to desktop and check labels, crop, and shape legibility.

Test an actual iPhone Safari before production release; desktop device emulation does not validate mobile GPU memory or WebGL behavior. No iOS measurement is claimed by this document.
