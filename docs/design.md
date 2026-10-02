# Design contract

Onur is an AI engineer who develops products and evaluates models. The homepage helps a recruiter find evidence quickly. Research has a dedicated route.

## Tokens and composition

- Paper #f5f6f8, ink #17212b, cobalt #1947e5, muted #536171, line #dce2e9, white #ffffff.
- Manrope variable for navigation, body and precise UI; Portfolio Display (an Archivo subset) for giant titles. Both self-hosted under SIL OFL (licenses in `public/licenses`). Newsreader was removed in October 2026.
- Left-aligned compact navigation. Hero: a large, asymmetric two-column composition, strong headline on the left and a custom layered system on the right. Projects use wide technical illustrations and editorial text, never invented screenshots.
- One memorable scroll-controlled 3D system. The rest is quiet, native navigation. No invented sequence numbering, decorative eyebrows on every heading, generic gradient-card wall, scroll hijack or custom cursor.
- English/Turkish body copy in first person and sentence case; no unverified availability claim.

## Content and rollout

Three detailed cases: Kuyumcum, water safety, course intelligence. Three shorter archive entries: TaskFoo, urban mobility, PAM. No fake screenshots, team counts, baselines, dates or DOI. Missing supplied media does not become a fabricated product UI. See release checklist for unavailable inputs.

## September 11: room entrance

The approved room entrance supersedes the original two-column schematic hero. The initial viewport is the blank ultrawide surface with a small localized scroll cue. A native scroll-controlled perspective camera reveals the tabletop, visits the portrait screen and MacBook, then withdraws into a smoke-gray room with a reflective pale marble floor. A final viewport of scroll allows desk-object interactions before normal HTML resumes. The original title, introduction and CV action follow the scene; research is retained in HTML. Fine-pointer parallax is bounded to 2° horizontally / 1° vertically, absent in the opening and reduced at reading stops. Mobile uses fitted camera positions; reduced motion uses the room poster and HTML. See `docs/qa/room/README.md` for timing, measurements and limitations.

## September 16: cosmic platform

The room shell is replaced by a quiet cosmic setting while the approved screen journey, content and object interactions remain unchanged. The desk stands on a close-fitting 1.86 × 1.16 m elliptical marble platform with a 6 cm visible edge. A sparse star field and a low-contrast curved grid curtain appear as the camera withdraws; the curtain extends beyond the viewport vertically so the guide field has no visible top or bottom boundary. The palette is space `#080e1c`, distant atmosphere `#152039`, grid `#7286ad` and stars `#dce5f5`. The final desktop camera sits at 2.15 m with an elevated downward angle, keeping the tabletop and its objects dominant while the supports recede. Narrow viewports fit around the desk itself so the platform edge can crop slightly instead of pushing the subject into the distance.

The grid is the one expressive effect. It remains behind every camera stop, bends locally under a fine pointer, ignores screens and controls, and returns to rest without a continuous animation loop. Desk-object picking and the accessible object-control disclosure also remain available throughout the journey. Touch retains scroll depth without deformation. Reduced motion, no JavaScript and WebGL failure use a capture of the same cosmic composition. The scene remains demand-rendered and keeps the existing 130 draw-call / 210,000 submitted-triangle steady-frame budget.

The final full-desk view holds for 0.35 viewport heights and shows a localized continue cue before native scrolling reaches the HTML introduction. This replaces the previous full-viewport exploration hold while preserving reverse scroll and every camera transition.

## September 23: ultrawide portrait

The opening ultrawide presents Onur's name in large, tightly set Manrope behind a neck-free stylized head portrait, plus a localized AI engineer role on the paper palette. The same identity stays in the existing projected monitor panel as the camera reveals the desk; its content shrinks with the monitor rather than becoming a separate page overlay.

A fine pointer shifts the portrait a few pixels with damped motion and returns it to rest when the pointer leaves. The crisp opening composition aligns with the projected monitor panel and fades during the stationary first part of the scroll, returning smoothly at the top on reverse scroll. The name keeps its heavy weight and proportions in both versions. The portrait image is served at its full resolution to avoid a low-resolution image being enlarged by the monitor projection. Touch, reduced motion, and the static fallback show the still composition. The source is the stylized illustration supplied by Onur; no reference photos or photo-projected textures are shipped. The desk's 3D journey and the accessible HTML continuation retain their existing behavior.

## September 29: cosmic tactile sections

Approved by Onur on 29 September 2026. For the homepage after the journey this replaces three September 5 rules: "one memorable scroll-controlled 3D system", "no invented sequence numbering" and "Newsreader for large titles". Everything else in this contract still applies, including no custom cursor, no scroll hijack and no fabricated evidence.

- **Sequence.** After the introduction: about, tech stack on Bliss, what I do, projects, GitHub activity, certificates, then experience and contact. Backgrounds alternate navy, daylight and paper so every section reads as its own room.
- **Palette.** Dark sections reuse the cosmic scene: space `#080e1c` and atmosphere `#152039`. Light sections stay on paper `#f5f6f8` with ink `#17212b`. Volt `#d8f23c` is a fill and accent only, never text on paper; basketball `#e8762b` appears only in 3D.
- **Type.** Section titles are giant uppercase words in Portfolio Display: an Archivo (SIL OFL) subset pinned to width 125 and weight 800–900, about 9.5 KB. Each title's width is measured on the server from the font's own metrics, so it fills its container without client code or reflow. Manrope stays for body and UI. (October 2026: Newsreader is gone; case studies and research use Manrope too.) Turkish titles rely on `lang` for correct capitals (HİZMETLER); brand names are marked English so GitHub never becomes GİTHUB.
- **Numbering.** The 01–05 markers in "What I do" order a list; they are not rankings, dates or claims.
- **3D.** Several sections may have a scene, but each mounts lazily near the viewport, never under reduced motion or without WebGL2, and at most two WebGL contexts live at once, including the desk. The desk releases its context once it is more than 1.5 viewports away and remounts behind its final-view capture on return. All 3D is decorative; every scene has an HTML equivalent.
- **Motion.** Native scrolling only. Animation is scroll-linked or pointer-driven and plays once where it reveals content. A page-wide "Pause motion" toggle freezes every self-moving scene (WCAG 2.2.2); reduced motion removes WebGL entirely.
- **Bliss.** The tech stack sits on the original Windows XP wallpaper, Microsoft's photograph by Charles O'Rear, shown with a visible credit. Onur chose the original over a redrawn scene and accepts the republication risk. Parallax is made only by separating the photo's own pixels into layers.
- **Evidence.** Projects show real screenshots or artefacts from their own repositories, never invented interfaces. Services describe what I do and link to proof; there is no availability claim. GitHub numbers appear only when synchronized data exists.

## October 2: desk story and the dark system

Approved by Onur on 2 October 2026 (the desk-story plan, six PRs). It replaces the September 29 order and its alternating paper and dark bands.

- **The screens tell the story.** The ultrawide keeps the opening identity. The portrait monitor shows What I do, then Experience, on one still camera. The MacBook shows my tech stack as a Windows XP desktop on Bliss, then an Explorer window rising with every technology. The page flow follows: About, Projects, Research, GitHub activity, certificates (when there are any), contact. What I do, Experience and the stack are not repeated in the flow; without the desk (static view, reduced motion, no JavaScript) the same sections read in the page, in the same order.
- **The desk's displays stay light.** A screen reads as lit only against the dark space around it, so the panels keep the paper palette (ink text, cobalt links and focus, volt only as a fill). Everything else is dark.
- **Tokens.** `--bg #080e1c`, `--surface-1 #0c1426`, `--surface-2 #152039`, `--text #f5f6f8`, `--text-body #d9e1ee`, `--text-muted #b7c2d4` (10.7:1 on bg), `--accent` volt `#d8f23c`, `--accent-ink #080e1c` (15.3:1 on volt), `--hairline #ffffff2e`, `--focus` volt. `color-scheme: dark`.
- **Interaction rule.** A volt fill means "this acts": linked rows, primary actions. An atmosphere fill only informs (an Experience row without a link). Hover fills flow in from the edge the pointer entered and leave through the edge it left (320 ms); keyboard focus fills from the top; touch has no hover fill.
- **Scroll owns the story.** Camera, content offsets, row reveals, Bliss parallax, the Explorer's rise and a screen's takeover are pure functions of scroll distance (`src/lib/desk-story/timeline.ts`), so reversing replays the same frames. Reading lengths are measured: one scroll pixel moves a screen's content one visible pixel. Only the balls' physics runs on time.
- **Takeover.** A screen whose close-up would be shorter than 360 px or narrower than 260 px (a phone's MacBook; both screens on a landscape phone or at high zoom) grows to fill the view after the camera arrives and shrinks back before it leaves; the desk stops drawing behind it.
- **Balls.** No pushing. They drop scattered onto the hill; hovering or tapping a settled ball names it, its category and where it was used in an XP balloon. The Explorer's rise throws them out of the screen; they rain again on the way back.
- **Evidence.** Every technology, role and service links to where it can be checked (a project, a role or this site's source). A tool without a public example shows nothing; nothing is invented to fill it.
- **One h1.** The opening's name, labelled "Onur Ergüden, AI engineer".
