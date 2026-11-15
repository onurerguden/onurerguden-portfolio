/**
 * The final view's note's styles (desk-callouts.tsx), shipped as a string
 * with the desk's lazily loaded scene: a CSS module imported there would
 * still ride in the home page's first-load stylesheet. Selected by data
 * attributes, never class names. Volt on the dark space around the desk; a
 * soft dark halo keeps the strokes readable where they cross the light
 * platform. Everything moves by opacity, clip, dash or transform, so none
 * of it lays the page out again.
 *
 * The note is drawn unless a state says otherwise: "rest" is the blank
 * page before it draws in, "in" draws it, "gone" (an object was clicked)
 * ticks every arrow, runs each into its object and lifts the words away;
 * "off" (the view left) fades it as it stands.
 */
export const calloutStyles = `
[data-desk-callouts] {
  position: absolute;
  z-index: 3;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  color: var(--volt, #d8f23c);
  visibility: hidden;
  opacity: 0;
  transition:
    opacity 0.3s ease,
    visibility 0s 0.3s;
}
/* Clicked: it stays while its parts leave, then goes for the visit. */
[data-desk-callouts][data-state="gone"] {
  transition:
    opacity 0.2s ease 0.65s,
    visibility 0s 0.85s;
}
[data-desk-callouts][data-state="rest"],
[data-desk-callouts][data-state="in"] {
  visibility: visible;
  opacity: 1;
  transition: none;
}
[data-desk-callouts][data-mode="none"] {
  display: none;
}

[data-desk-callouts] [data-callout-title],
[data-desk-callouts] [data-callout-note] {
  position: absolute;
  margin: 0;
  font:
    600 32px / 1.02 "Portfolio Hand",
    "Bradley Hand",
    "Segoe Print",
    cursive;
  letter-spacing: 0.01em;
  text-align: center;
  text-shadow: 0 2px 12px #050912cc;
  transform: translateX(-50%) rotate(-4deg);
  transform-origin: 50% 60%;
}
/* The headphones' own note leans the other way, as a second thought. */
[data-desk-callouts] [data-callout-note] {
  white-space: nowrap;
  transform: translateX(-50%) rotate(3deg);
}
[data-desk-callouts][data-state="rest"] [data-callout-title],
[data-desk-callouts][data-state="rest"] [data-callout-note] {
  clip-path: inset(-20% 100% -20% -6%);
}
[data-desk-callouts] [data-callout-title] > span {
  display: block;
  white-space: nowrap;
}
/* Above the desk the note reads on one line. */
[data-desk-callouts][data-mode="compact"] [data-callout-title] > span {
  display: inline;
}

[data-desk-callouts] svg[data-arrow] {
  position: absolute;
  overflow: visible;
}
[data-desk-callouts] [data-halo],
[data-desk-callouts] [data-stroke],
[data-desk-callouts] [data-burst] {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
[data-desk-callouts] [data-halo] {
  stroke: #050912;
  stroke-opacity: 0.55;
  stroke-width: 9;
}
[data-desk-callouts] [data-stroke] {
  stroke: currentColor;
  stroke-width: 3.6;
}
[data-desk-callouts] [data-halo],
[data-desk-callouts] [data-stroke] {
  stroke-dasharray: 1;
}
[data-desk-callouts][data-state="rest"] [data-halo],
[data-desk-callouts][data-state="rest"] [data-stroke] {
  stroke-dashoffset: 1;
}
[data-desk-callouts] [data-burst] {
  stroke: currentColor;
  stroke-width: 2.6;
  opacity: 0;
}

/*
 * Drawn in, within a second: a visitor who scrolls straight through the
 * final view still sees it arrive. The title writes itself, each arrow
 * draws from its tail, the headphones' note last.
 */
[data-desk-callouts][data-state="in"] [data-callout-title] {
  animation: callout-write 0.42s cubic-bezier(0.3, 0, 0.3, 1) 0.04s both;
}
[data-desk-callouts][data-state="in"] [data-callout-note] {
  animation: callout-write 0.3s cubic-bezier(0.3, 0, 0.3, 1) 0.5s both;
}
[data-desk-callouts][data-state="in"] [data-halo],
[data-desk-callouts][data-state="in"] [data-stroke] {
  animation: callout-draw 0.36s cubic-bezier(0.45, 0, 0.2, 1) both;
}
[data-desk-callouts][data-state="in"] svg:nth-of-type(1) path {
  animation-delay: 0.3s;
}
[data-desk-callouts][data-state="in"] svg:nth-of-type(2) path {
  animation-delay: 0.4s;
}
[data-desk-callouts][data-state="in"] svg:nth-of-type(3) path {
  animation-delay: 0.5s;
}
[data-desk-callouts][data-state="in"] svg:nth-of-type(4) path {
  animation-delay: 0.62s;
}
/*
 * Then they sway, slowly, each in its own time, from their tails; and keep
 * swaying as they leave, so none jumps back to rest at the click.
 */
[data-desk-callouts]:is([data-state="in"], [data-state="gone"])
  svg[data-arrow] {
  animation: callout-sway 5.6s ease-in-out 1.1s infinite;
}
[data-desk-callouts]:is([data-state="in"], [data-state="gone"])
  svg:nth-of-type(2) {
  animation-duration: 6.2s;
  animation-delay: 1.7s;
}
[data-desk-callouts]:is([data-state="in"], [data-state="gone"])
  svg:nth-of-type(3) {
  animation-duration: 5.1s;
  animation-delay: 1.4s;
}
[data-desk-callouts]:is([data-state="in"], [data-state="gone"])
  svg:nth-of-type(4) {
  animation-duration: 6.6s;
  animation-delay: 2s;
}
/*
 * Clicked, so the note has done its job: every tip ticks at once, each
 * arrow runs from its tail into its object, and the words lift away.
 */
[data-desk-callouts][data-state="gone"] [data-burst] {
  animation: callout-burst 0.45s cubic-bezier(0.2, 0, 0.3, 1);
}
[data-desk-callouts][data-state="gone"] [data-halo],
[data-desk-callouts][data-state="gone"] [data-stroke] {
  animation: callout-erase 0.5s cubic-bezier(0.5, 0, 0.75, 0.4) 0.1s both;
}
[data-desk-callouts][data-state="gone"] [data-callout-title],
[data-desk-callouts][data-state="gone"] [data-callout-note] {
  animation: callout-lift 0.5s cubic-bezier(0.4, 0, 0.7, 0.2) 0.08s both;
}
/* The fake click at the tip, as its object is tapped. */
[data-desk-callouts] svg[data-arrow][data-click] [data-burst] {
  animation: callout-burst 0.45s cubic-bezier(0.2, 0, 0.3, 1);
}

@keyframes callout-write {
  from {
    clip-path: inset(-20% 100% -20% -6%);
  }
  to {
    clip-path: inset(-20% -6% -20% -6%);
  }
}
@keyframes callout-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}
/* The dash slides off the far end: the line leaves tail first. */
@keyframes callout-erase {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -1;
  }
}
@keyframes callout-lift {
  to {
    opacity: 0;
    translate: 0 -12px;
  }
}
@keyframes callout-sway {
  0%,
  100% {
    rotate: 0deg;
  }
  30% {
    rotate: 1.5deg;
  }
  70% {
    rotate: -1.5deg;
  }
}
@keyframes callout-burst {
  0% {
    opacity: 0;
    scale: 0.5;
  }
  35% {
    opacity: 1;
    scale: 1.05;
  }
  100% {
    opacity: 0;
    scale: 1.2;
  }
}

/* Paused motion: the note is simply there, drawn and still, then fades. */
html[data-motion-paused="true"] [data-desk-callouts] * {
  animation: none !important;
}
html[data-motion-paused="true"] [data-desk-callouts] [data-callout-title],
html[data-motion-paused="true"] [data-desk-callouts] [data-callout-note] {
  clip-path: none !important;
}
html[data-motion-paused="true"] [data-desk-callouts] [data-halo],
html[data-motion-paused="true"] [data-desk-callouts] [data-stroke] {
  stroke-dashoffset: 0 !important;
}
@media print {
  [data-desk-callouts] {
    display: none;
  }
}
`;
