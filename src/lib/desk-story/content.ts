import { sharedFacts, type Locale } from "../content";

/** What the desk's opening and ultrawide screen show. */
export type JourneyContent = { name: string; role: string };

export function getJourneyContent(locale: Locale): JourneyContent {
  return {
    name: sharedFacts.name,
    role: locale === "en" ? "AI engineer" : "AI mühendisi",
  };
}
