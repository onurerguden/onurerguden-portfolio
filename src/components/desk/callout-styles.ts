/**
 * The final view's note's styles (desk-callouts.tsx), shipped as a string
 * with the desk's lazily loaded scene: a CSS module imported there would
 * still ride in the home page's first-load stylesheet. Selected by data
 * attributes, never class names. Volt on the dark space around the desk; a
 * soft dark halo keeps the strokes readable where they cross the light
 * platform. Everything moves by opacity, clip, dash or transform, so none
 * of it lays the page out again.
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
    opacity 0.4s ease,
    visibility 0s 0.4s;
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

[data-desk-callouts] [data-callout-title] {
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
  stroke-dashoffset: 1;
}
[data-desk-callouts] [data-burst] {
  stroke: currentColor;
  stroke-width: 2.6;
  opacity: 0;
}

/* Drawn in: the title writes itself, then each arrow draws from its tail. */
[data-desk-callouts][data-state="in"] [data-callout-title] {
  animation: callout-write 0.6s cubic-bezier(0.3, 0, 0.3, 1) 0.1s both;
}
[data-desk-callouts][data-state="in"] [data-halo],
[data-desk-callouts][data-state="in"] [data-stroke] {
  animation: callout-draw 0.5s cubic-bezier(0.45, 0, 0.2, 1) both;
}
[data-desk-callouts][data-state="in"] svg:nth-of-type(1) path {
  animation-delay: 0.6s;
}
[data-desk-callouts][data-state="in"] svg:nth-of-type(2) path {
  animation-delay: 0.75s;
}
[data-desk-callouts][data-state="in"] svg:nth-of-type(3) path {
  animation-delay: 0.9s;
}
/* Then they sway, slowly, each in its own time, from their tails. */
[data-desk-callouts][data-state="in"] svg[data-arrow] {
  animation: callout-sway 5.6s ease-in-out 1.5s infinite;
}
[data-desk-callouts][data-state="in"] svg:nth-of-type(2) {
  animation-duration: 6.2s;
  animation-delay: 2.1s;
}
[data-desk-callouts][data-state="in"] svg:nth-of-type(3) {
  animation-duration: 5.1s;
  animation-delay: 1.8s;
}
/* The fake click at the tip, as its object is tapped. */
[data-desk-callouts] svg[data-arrow][data-click] [data-burst] {
  animation: callout-burst 0.45s cubic-bezier(0.2, 0, 0.3, 1);
}

@keyframes callout-write {
  to {
    clip-path: inset(-20% -6% -20% -6%);
  }
}
@keyframes callout-draw {
  to {
    stroke-dashoffset: 0;
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

/* Paused motion: the note is simply there, drawn and still. */
html[data-motion-paused="true"] [data-desk-callouts] * {
  animation: none !important;
}
html[data-motion-paused="true"] [data-callout-title] {
  clip-path: none;
}
html[data-motion-paused="true"] [data-halo],
html[data-motion-paused="true"] [data-stroke] {
  stroke-dashoffset: 0;
}
@media print {
  [data-desk-callouts] {
    display: none;
  }
}
`;
