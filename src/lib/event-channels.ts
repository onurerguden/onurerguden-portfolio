/** Coarse conversion sources only; raw URLs and query values never leave this classifier. */
export const eventChannels = [
  "chatgpt",
  "claude",
  "perplexity",
  "google",
  "bing",
  "other_referral",
  "internal",
  "direct_or_unknown",
] as const;
export type EventChannel = (typeof eventChannels)[number];

const referrerDomains: readonly [EventChannel, readonly string[]][] = [
  ["chatgpt", ["chatgpt.com", "chat.openai.com"]],
  ["claude", ["claude.ai"]],
  ["perplexity", ["perplexity.ai", "perplexity.com"]],
  ["bing", ["bing.com", "copilot.microsoft.com"]],
  [
    "google",
    [
      "google.com",
      "google.com.tr",
      "google.co.uk",
      "google.de",
      "google.fr",
      "google.es",
      "google.it",
      "google.nl",
      "google.ca",
      "google.com.au",
      "google.co.in",
      "google.co.jp",
      "google.com.br",
    ],
  ],
];
const campaignSources: Readonly<Record<string, EventChannel>> = {
  chatgpt: "chatgpt",
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  claude: "claude",
  "claude.ai": "claude",
  perplexity: "perplexity",
  "perplexity.ai": "perplexity",
  "perplexity.com": "perplexity",
  google: "google",
  "google.com": "google",
  "google.com.tr": "google",
  bing: "bing",
  "bing.com": "bing",
  copilot: "bing",
  "copilot.microsoft.com": "bing",
};

function webUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A document's observable entry source, not a visitor's first touch.
 * Known external referrers outrank allowlisted utm_source values; all
 * unknown values are discarded. Same-origin referrers mean internal.
 */
export function classifyEventChannel({
  url,
  referrer,
}: {
  url: string;
  referrer: string;
}): EventChannel {
  const entry = webUrl(url);
  if (!entry) return "direct_or_unknown";
  const from = webUrl(referrer);
  const external = from && from.origin !== entry.origin;
  if (external) {
    for (const [channel, domains] of referrerDomains) {
      if (
        domains.some(
          (domain) =>
            from.hostname === domain || from.hostname.endsWith(`.${domain}`),
        )
      )
        return channel;
    }
  }
  const campaign = entry.searchParams.get("utm_source")?.toLowerCase();
  if (campaign && Object.hasOwn(campaignSources, campaign))
    return campaignSources[campaign];
  if (external) return "other_referral";
  if (from) return "internal";
  return "direct_or_unknown";
}
