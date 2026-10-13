# Dependency release #125

Playwright moves from 1.63.0 to 1.64.0 and Node types from 24.19.1 to
24.19.2. Production dependencies and site content are unchanged.

The custom Chromium phone viewport is 390 × 844. Spreading the Pixel 7
descriptor previously retained its 412 × 915 screen. With Chromium 156,
the first-load test downloaded both the 1254 px portrait (146,143 bytes)
and the 1080 px portrait (106,337 bytes). The original CI trace and a local
production-build reproduction both measured 252,480 image bytes.

Setting the emulated screen to the custom viewport dimensions makes this
test device consistent. The same build and test then measured 106,337
image bytes. This is a test-environment correction, not a measured
production performance improvement. The image budget remains 160,000
bytes, the test still counts both downloads if they occur, and no test
or required CI job is disabled. The user has deferred additional mobile
optimization; this release makes no mobile UI changes.

Validation: `npm run check` passed with the updated dependencies (345 unit
tests, typecheck, lint, content validation, production build, static output,
trace and asset checks). The existing first-load regression test failed
before the screen correction and passed afterward. Full PR CI remains the
merge gate. Raw logs and downloaded traces stay in ignored `work/seo/`.

Playwright exposes screen size independently of viewport size:
[Browser context options](https://playwright.dev/docs/api/class-browser#browser-new-context-option-screen).
