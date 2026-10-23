# Projects and Contact in the bar (review 04)

Before and after, the same production build settings, captured with Playwright's Chromium. Pink rules separate the captures.

- `home-1440.webp`: the home bar at 1440 × 900, top to bottom: EN before, EN after, TR before, TR after, and the after bar with keyboard focus on Projects.
- `home-375.webp`: the home bar at 375 × 812, left to right: EN before, EN after, TR before, TR after.
- `research-1440.webp`, `research-375.webp`: the bar on content pages (here /research), in the same order.

Keyboard order on the home page, after the two skip links and the name:

|        | EN                                                  | TR                                                    |
| ------ | --------------------------------------------------- | ----------------------------------------------------- |
| Before | What I do → Experience → Tech stack → Sections → TR | Ne yapıyorum → Deneyim → Teknolojiler → Bölümler → EN |
| After  | Projects → Contact → Sections → TR                  | Projeler → İletişim → Bölümler → EN                   |

The desk chapters stay in the Sections menu, which marks the chapter on screen (`aria-current="location"`, with an accent edge), as the bar did before. On phones, content pages put Projects, Research and Contact on a second row, as the home bar already does; on one row Contact was cut off.
