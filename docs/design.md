# Design contract

Onur is an AI engineer who develops products and evaluates models. The homepage helps a recruiter find evidence quickly. Research has a dedicated route.

## Tokens and composition
- Paper #f5f6f8, ink #17212b, cobalt #1947e5, muted #536171, line #dce2e9, white #ffffff.
- Manrope variable for navigation, body, and precise UI; Newsreader variable for large titles. Both self-hosted under SIL OFL (licenses copied from packages).
- Left-aligned compact navigation. Hero: a large, asymmetric two-column composition, strong headline on the left and a custom layered system on the right. Projects use wide technical illustrations and editorial text, never invented screenshots.
- One memorable scroll-controlled 3D system. The rest is quiet, native navigation. No invented sequence numbering, decorative eyebrows on every heading, generic gradient-card wall, scroll hijack or custom cursor.
- English/Turkish body copy in first person and sentence case; no unverified availability claim.

## Content and rollout
Three detailed cases: Kuyumcum, water safety, course intelligence. Three shorter archive entries: TaskFoo, urban mobility, PAM. No fake screenshots, team counts, baselines, dates or DOI. Missing supplied media does not become a fabricated product UI. See release checklist for unavailable inputs.

## September 11: room entrance

The approved room entrance supersedes the original two-column schematic hero. The initial viewport is the blank ultrawide surface with a small localized scroll cue. A native scroll-controlled perspective camera reveals the tabletop, visits the portrait screen and MacBook, then withdraws into a smoke-gray room with a reflective pale marble floor. A final viewport of scroll allows desk-object interactions before normal HTML resumes. The original title, introduction and CV action follow the scene; research is retained in HTML. Fine-pointer parallax is bounded to 2° horizontally / 1° vertically, absent in the opening and reduced at reading stops. Mobile uses fitted camera positions; reduced motion uses the room poster and HTML. See `docs/qa/room/README.md` for timing, measurements and limitations.

## September 16: cosmic platform

The room shell is replaced by a quiet cosmic setting while the approved screen journey, content and object interactions remain unchanged. The desk stands on a close-fitting 1.86 × 1.16 m elliptical marble platform with a 6 cm visible edge. A sparse star field and a low-contrast curved grid curtain appear as the camera withdraws; the curtain extends beyond the viewport vertically so the guide field has no visible top or bottom boundary. The palette is space `#080e1c`, distant atmosphere `#152039`, grid `#7286ad` and stars `#dce5f5`. The final desktop camera sits at 2.15 m with an elevated downward angle, keeping the tabletop and its objects dominant while the supports recede. Narrow viewports fit around the desk itself so the platform edge can crop slightly instead of pushing the subject into the distance.

The grid is the one expressive effect. It bends locally under a fine pointer only in the final exploration view, ignores screens and controls, and returns to rest without a continuous animation loop. Touch retains scroll depth without deformation. Reduced motion, no JavaScript and WebGL failure use a capture of the same cosmic composition. The scene remains demand-rendered and keeps the existing 130 draw-call / 210,000 submitted-triangle steady-frame budget.
