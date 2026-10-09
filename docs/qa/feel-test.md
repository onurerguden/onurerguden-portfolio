# How the site feels: a five-minute test for friends

The lab numbers (`docs/qa/perf`) say whether frames arrive on time. They can't say whether scrolling _feels_ smooth on someone else's computer. This is the test Onur sends to friends after a change to the desk's motion (butter series, October 2026). Each part is in Turkish and English; send the one that suits.

## Türkçe

Merhaba! Sitemi farklı cihazlarda deniyorum, 5 dakikanı ayırabilir misin?

1. **Gizli pencerede** aç: https://onurerguden.dev
2. Sayfa açılır açılmaz **hemen aşağı kaydır**; bekleme.
3. Masanın içinde **normal hızda** aşağı, sonra biraz yukarı kaydır.
4. Faren varsa tekerleği **tek tek çentik çentik** çevir (açılıştaki ilk hareket boyunca).
5. Bir kez **sert savur** (trackpad'de hızlı fiske, ya da tekerleği hızlı çevir).
6. **Boşluk** ve **Page Down** tuşlarıyla ilerle.
7. En üste dön, menüden **Teknolojiler**'e tıkla.
8. Fareyi **masanın üzerinde gezdir**, lambaya tıkla.
9. Aynı şeyi bir de bu adresle dene ve farkı söyle: https://onurerguden.dev/en?story=raw

Bana şunları yazman yeterli:

- 1–5 arası puan: **"elimi takip ediyor"**, **"zıplama ya da flaş var"** (5 = hiç yok), **"imleç yapışık"**
- Kaydırdığın halde **hiçbir şey olmadığını** hissettiğin an oldu mu, nerede?
- 2. adresteki (`?story=raw`) his daha mı iyi, daha mı kötü, aynı mı?
- Cihaz, tarayıcı ve sürümü; ekran 60 Hz mi 120 Hz mi (bilmiyorsan model yeter); fare mi trackpad mi, faren çentikli mi serbest dönen mi
- Mümkünse ekran kaydı (Mac: Cmd+Shift+5)

## English

Hi! I'm testing my site on different devices. Could you spare five minutes?

1. Open it **in a private window**: https://onurerguden.dev
2. **Scroll down straight away** as it opens; don't wait.
3. Inside the desk, scroll down **at a normal speed**, then up a little.
4. With a mouse, turn the wheel **one notch at a time** through the first move.
5. **Flick hard** once (a fast trackpad swipe, or spin the wheel).
6. Move on with **Space** and **Page Down**.
7. Go back to the top and click **Tech stack** in the menu.
8. **Move the mouse over the desk** and click the lamp.
9. Try the same at this address and tell me the difference: https://onurerguden.dev/en?story=raw

Please send me:

- Scores from 1 to 5: **"it follows my hand"**, **"jumps or flashes"** (5 = none), **"the cursor sticks to the mouse"**
- Was there a moment when you scrolled and **nothing happened**? Where?
- Does the second address (`?story=raw`) feel better, worse or the same?
- Device, browser and version; a 60 Hz or 120 Hz screen (the model is enough if unsure); mouse or trackpad, and a notched or free-spinning wheel
- A screen recording if you can (Mac: Cmd+Shift+5)

## Reading the answers

- **`?story=raw`** follows the scroll one-to-one: the camera as it was before the story clock (`src/lib/desk-story/clock.ts`). A friend who prefers it on a notched wheel is the signal to shorten the clock's 80 ms half-life; one who finds the default laggy on a trackpad, its 35 ms one.
- **Safari on a 120 Hz Mac** draws pages at 60 frames per second unless Develop › Feature Flags › "Prefer Page Rendering Updates near 60fps" is off; the desk then draws at 60 while the page scrolls at 120. Ask before blaming the site.
- **"Nothing happened"** moments point at holds and reading stops in `src/lib/desk-story/timeline.ts`.
- **A jump or flash** with the device named: reproduce it with `npm run perf -- --device "<device>"` or `--input notch|trackpad` (`docs/qa/perf/README.md`).
- A week after sharing, compare Vercel Speed Insights at the 75th percentile with `docs/release.md`'s targets (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1).
