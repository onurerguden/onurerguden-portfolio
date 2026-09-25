# Ultrawide portrait QA

The public asset `public/images/avatar/onur-head-v3.webp` is a transparent, neck-free stylized portrait of Onur. Built-in ImageGen edited the supplied illustration using Onur's front-facing photograph for identity and the supplied example for style only. The lower-chin mark was then retouched into a smaller, flatter brown mole matching the photograph. Only that small chin area from the retouch was blended into the prior public portrait; the rest of the composition was preserved. The image is 1254 × 1254 pixels and 394,172 bytes. Source face photographs, the example, the original illustration, and the discarded procedural model are excluded from the repository.

The portrait and localized name are one DOM panel projected onto the ultrawide screen. At the opening camera stop, the same composition is rendered as a flat, full-resolution overlay. Both versions use container-relative typography and align at the opening camera stop; the overlay fades with native scroll before the camera moves and returns on reverse scroll. The projected ultrawide panel uses 2,000 CSS pixels across for sharper text during the handoff. The image is served without Next.js downsampling because the projection enlarges its CSS box beyond the responsive image hint. The image remains decorative in the accessibility tree; the page introduction supplies the semantic identity and work description.

## Checked

- Opening at 2400 × 1000, 1440 × 900, 919 × 807, 390 × 844, and 320 × 720.
- Full-resolution source, aligned opening geometry, continuous first-scroll handoff, and reverse scroll restoration.
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

For the chin detail, built-in ImageGen received the previous public portrait and the local front-facing photograph with this prompt. Only the area around the mark was blended into the previous asset; the full generated image was not used.

> Use case: precise-object-edit. Image 1 is the exact transparent illustrated head to edit. Image 2 is reference for the real small chin mole ONLY. Change precisely one local detail on Image 1: the raised pinkish pimple-like bump on the viewer-left lower chin, below and left of the mouth (approximately x=505, y=1020 in the 1254×1254 image). Make it substantially smaller, about half its current diameter, flatter, and natural warm medium-dark brown like a small mole in the reference photograph. Remove only the bump's pink/red inflammation and exaggerated highlight, blending the immediate surrounding skin invisibly. Preserve every other detail of Image 1 as exactly as possible, including facial identity, expression, lips, freckles, other skin marks, glasses, earrings, curly hair, lighting, color, composition, transparent alpha, and exact head silhouette. Do not change, add, or remove anything else. Keep the full 1254×1254 transparent canvas, no neck, no background, no text.
