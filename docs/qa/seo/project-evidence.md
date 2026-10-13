# Project evidence review — 13 October 2026

The four case-study headers now identify their author, link to the localized
profile and name the exact GitHub account. Repository links show their owner
and repository. Course Intelligence and GymRap link to the implementation and
tests at immutable commits, in both languages; the existing Markdown feed
carries the same author and evidence. No client dependency is added.

## Source review

- Course Intelligence: `onurerguden/IEU-Chat-Bot` at
  `7a6f90e40a2c560d4dd0197c46a12e6a17cf91fd`. Reviewed the RAG module,
  evaluation script and GUI worker. The script defines 60 English questions
  across five categories (10/10/10/10/20). Labels inspect answer text, numbers,
  course codes and refusal phrases; they do not establish reference-answer
  correctness. The copy describes that limitation and reports no accuracy.
- GymRap: `onurerguden/GymRap-AI-Coach` at
  `8f35eba6c5b1e3a9335fb4ece2c74c75ba70bdef`. Reviewed MCP tool definitions,
  OAuth/owner authorization, the test directory and Workers/D1 configuration.
  This review does not claim to have rerun the project's backend tests.
- IJEA's public journal page still lists the water-safety manuscript and the
  seven authors under accepted articles. Publication remains pending; the
  existing label, author order and absent DOI/publication date are preserved.
  The water-safety case now links directly to that listing and the localized
  research page, distinguishing the publisher's evidence from the source repo.

## Validation

- Node 24: `npm run check`, `npm run format:check`, then typecheck/lint after
  adding the browser test. 345 unit tests in 48 files; content validation,
  production build, static/trace/asset checks pass.
- 33 affected browser tests pass across desktop Chromium, mobile Chromium and
  mobile WebKit: case evidence, project links and crawler/SEO checks. Case
  evidence verifies all four cases in both languages without JavaScript,
  keyboard focus, source links and overflow. axe checks the same routes with
  scripts enabled (its execution requires timers), with no automated findings
  in the main content. This is not a complete WCAG or physical Safari audit.
- Chrome visual review: EN/TR case headers on desktop and 390 × 844 mobile;
  RAG/MCP proof links, wrapping and readable source account. Captures and logs
  stay in ignored `work/seo/geo-evidence-2026-10-13/`.

## Measurement boundaries

Current Search Console URL inspections for the six priority URLs were captured
privately; URL inspections and delayed aggregate coverage reports must be kept
distinct. Indexability does not prove recommendations or citations. Consumer
responses, private dashboards and screenshots are never committed. The existing
prompt version stays unchanged; source-URL completeness is reported separately
from completed responses. Claude is excluded from the current consumer run.
