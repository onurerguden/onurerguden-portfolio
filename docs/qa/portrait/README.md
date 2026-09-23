# Ultrawide portrait QA

The public asset `public/images/avatar/onur-head-v2.webp` is a transparent, neck-free stylized portrait of Onur. Built-in ImageGen edited the supplied illustration using Onur's front-facing photograph for identity and the supplied example for style only. The image is 1254 × 1254 pixels and 352,334 bytes. Source face photographs, the example, the original illustration, and the discarded procedural model are excluded from the repository.

The portrait and localized name are one DOM panel projected onto the ultrawide screen. At the opening camera stop, the same composition is rendered as a flat, full-resolution overlay until the first scroll and is restored when scrolling back to the top. The image is served without Next.js downsampling because the projection enlarges its CSS box beyond the responsive image hint. The image remains decorative in the accessibility tree; the page introduction supplies the semantic identity and work description.

## Checked

- Opening at 2400 × 1000, 1440 × 900, 390 × 844, and 320 × 720.
- Full-resolution source and opening hold after scene readiness, first scroll transition, and reverse scroll restoration.
- Portrait remains within the monitor when scrolling to the full desk and back.
- Fine pointer movement shifts the image left and right and settles after movement ends.
- Reduced motion and JavaScript-disabled flows render the static identity.
- English and Turkish opening text, content validation, typecheck, lint, unit tests, production build, and targeted browser and axe tests.

The portrait is a 2D image. It does not turn its head or eyes.

## Asset edit prompt

The original background extraction used built-in ImageGen with this prompt:

> Use case: background-extraction. Asset type: transparent head cutout for the existing portfolio website. Edit the provided attached image. Remove ONLY its flat gray background and export the existing illustrated head with genuinely transparent alpha around the hair and neck. Preserve the subject pixel-for-pixel as closely as possible: exact facial identity, proportions, expression, eyes, spectacles, earrings, curly hair, color, lighting and framing. Retain fine curls and the soft antialiased outline without gray halos. No added text, objects, torso, shadows, backdrop, or redesign. The head and neck should remain complete and centered.

The final neck-free illustration used built-in ImageGen with three local references (edit target, identity photograph, and style example) and this prompt:

> Use case: identity-preserve edit. Asset type: transparent illustrated head cutout for Onur's developer portfolio hero. Image 1 is the EDIT TARGET and primary identity/art source; image 2 is a supporting identity reference photograph; image 3 is STYLE AND COMPOSITION REFERENCE ONLY, never copy its person. Redraw Onur's existing front-facing head with a tasteful, slightly more three-dimensional premium cartoon illustration finish reminiscent of the reference's polished hair and soft sculpted face, while remaining clearly recognizable as Onur. Preserve his distinctive dense dark curly hair, exact face and nose proportions, warm skin tone, thin round silver metal glasses, small stud earrings, dark eyes, understated calm slight smile, and front-facing gaze. Remove the neck completely: end the isolated head at the actual natural under-chin/jaw silhouette, with no throat, dangling neck, bust, shoulders, clothing, or extra skin below the chin. Leave the entire surrounding canvas truly transparent with clean antialiased edges, including fine curls. Center the whole head with slight breathing room; hair and jaw fully visible. No background, text, props, duplicated facial features, cartoon distortion, or imitation of the person in image 3. The result should work crisply at large desktop size.
