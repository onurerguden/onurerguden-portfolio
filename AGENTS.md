# Portfolio working agreement

- Work only on feature branches and reviewable pull requests after the initial main commit. Do not merge without Onur's instruction.
- All commits use author and committer onurerguden <119923881+onurerguden@users.noreply.github.com>. Never add Co-authored-by trailers.
- Keep commit boundaries meaningful; 6–10 commits in a PR are acceptable, not a quota.
- Preserve English and Turkish parity, verified shared facts, keyboard access and reduced motion.
- User's approved brief takes precedence over stylistic defaults in skills. First person and sentence case are intentional.
- No secrets, raw CVs, private project source, or unreviewed customer screenshots in this public repository.
- Run typecheck, lint, tests, content validation and production build for relevant changes. UI changes require browser and accessibility review.
- See docs/design.md, docs/skills/manifest.json and docs/release.md for design and release decisions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
