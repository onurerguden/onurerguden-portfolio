/**
 * True when the visitor asks not to be tracked, with Global Privacy Control
 * or Do Not Track. Neither page views nor conversion events are counted then.
 */
export function optedOut() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}
