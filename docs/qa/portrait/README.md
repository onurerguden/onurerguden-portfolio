# Ultrawide portrait QA

The public asset `public/images/avatar/onur-head.webp` is a transparent cutout of the stylized portrait Onur supplied on September 23, 2026. The background was removed with the built-in ImageGen tool. The image is 1254 × 1254 pixels and 238,142 bytes. Source face photographs and the discarded procedural model are excluded from the repository.

The portrait and localized name are one DOM panel projected onto the ultrawide screen. The image remains decorative in the accessibility tree; the page introduction supplies the semantic identity and work description.

## Checked

- Opening at 2400 × 1000, 1440 × 900, 390 × 844, and 320 × 720.
- Portrait remains within the monitor when scrolling to the full desk and back.
- Fine pointer movement shifts the image left and right and settles after movement ends.
- Reduced motion and JavaScript-disabled flows render the static identity.
- English and Turkish opening text, content validation, typecheck, lint, unit tests, production build, and targeted browser and axe tests.

The portrait is a 2D image. It does not turn its head or eyes.

## Asset edit prompt

Built-in ImageGen was used with the supplied stylized illustration and this prompt:

> Use case: background-extraction. Asset type: transparent head cutout for the existing portfolio website. Edit the provided attached image. Remove ONLY its flat gray background and export the existing illustrated head with genuinely transparent alpha around the hair and neck. Preserve the subject pixel-for-pixel as closely as possible: exact facial identity, proportions, expression, eyes, spectacles, earrings, curly hair, color, lighting and framing. Retain fine curls and the soft antialiased outline without gray halos. No added text, objects, torso, shadows, backdrop, or redesign. The head and neck should remain complete and centered.
