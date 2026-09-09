# Release checklist

## External inputs
- [ ] Onur supplies approved Kuyumcum screenshots; inspect for personal/merchant data before publishing.
- [ ] Onur supplies updated publication-ready CV (July file has outdated publication status and personal phone).
- [ ] Confirm per-project contribution details and current LinkedIn text against drafts.
- [ ] Link own Vercel account/project and Upstash Redis; configure secrets outside source control.
- [ ] Configure public repository webhooks and daily reconciliation.
- [ ] Choose and connect domain. Set NEXT_PUBLIC_SITE_URL to its canonical HTTPS origin.
- [ ] Enable Vercel Speed Insights. Field p75 metrics remain unmeasured until sufficient visits exist.
- [ ] Confirm actual iOS Safari on a physical device, not just Playwright WebKit.
- [ ] Only after content and domain review: SITE_INDEXABLE=true on production, false on previews.

## PR order
Foundation -> design -> content -> 3D -> GitHub synchronization -> release QA. Stacked branches preserve reviewable changes without merging ahead of approval. Retarget the next PR to main after its prerequisite is merged, preserving commits.

## Targets
LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 at the 75th percentile of real visits. Laboratory results do not substitute for field measurements.
