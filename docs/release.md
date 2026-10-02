# Release checklist

## External inputs

- [ ] Refresh GitHub CLI with workflow scope and activate docs/ci/validate-portfolio.yml under .github/workflows/ci.yml. The current token cannot upload workflow files.
- [ ] Refresh the expired Vercel CLI login before creating the remote preview.
- [x] Onur supplied Kuyumcum screenshots. Merchant map and AI report list are included; balance/holdings screens are excluded.
- [ ] Onur supplies updated publication-ready CV (July file has outdated publication status and personal phone).
- [ ] Confirm per-project contribution details and current LinkedIn text against drafts.
- [ ] Link own Vercel account/project and Upstash Redis; configure secrets outside source control.
- [ ] Configure public repository webhooks and daily reconciliation.
- [ ] Choose and connect domain. Set NEXT_PUBLIC_SITE_URL to its canonical HTTPS origin.
- [ ] Enable Vercel Speed Insights. Field p75 metrics remain unmeasured until sufficient visits exist.
- [ ] Confirm actual iOS Safari on a physical device, not just Playwright WebKit.
- [ ] Only after content and domain review: SITE_INDEXABLE=true on production, false on previews.
- [x] Bliss: Onur chose the original Microsoft photograph with a visible credit and accepts the republication risk (29 September 2026, see docs/bliss.md). Revisit if Microsoft objects; the pipeline can swap the source.

## S+ home page inputs

- [ ] Onur reviews the About paragraph and the five What I do rows (EN/TR), including the basketball and tennis line.
- [ ] Onur confirms the technology list in `src/content/tech-stack.json`.
- [ ] Onur supplies the certificates folder; each image goes through `npm run certificate` and a personal-data review before `personalDataReviewed: true`.
- [x] Course Intelligence: the unconfirmed "100% on the quantitative set" sentence was removed (2 October 2026); the case study now describes the evaluation approach. The repository's own 5 / 4 / 1 rating can be added later with Onur's approval.
- [ ] Optional: TaskFoo and ScoreStack screenshots for the archive card.
- [ ] Vercel: `GITHUB_TOKEN` (fine-grained, public read-only) and Upstash credentials; call `/api/cron/github` once, then check the activity totals against the GitHub profile.
- [ ] Physical iPhone Safari pass: About objects, balls, desk release and restore, memory and context loss.

## Desk story (October 2026)

- [x] Onur approved the desk-story plan and its copy (`docs/content-review.md`), and asked for each PR to be merged once checked (2 October 2026).
- [x] The AVIF opening portrait passed its gate (PSNR 43.28 dB at the same 1254 px) and replaced the WebP for browsers that support it; the WebP stays as the fallback.
- [ ] Physical iPhone Safari pass for the desk story: monitor reading, MacBook takeover, balls, two contexts, context loss, LinkedIn in-app browser.

## PR order

Foundation -> design -> content -> 3D -> GitHub synchronization -> release QA. Stacked branches preserve reviewable changes without merging ahead of approval. Retarget the next PR to main after its prerequisite is merged, preserving commits.

## Targets

LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 at the 75th percentile of real visits. Laboratory results do not substitute for field measurements.
