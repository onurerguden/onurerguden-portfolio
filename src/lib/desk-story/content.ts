import { sharedFacts, type Locale } from "../content";
import { getIdentity } from "../identity";

/** What the desk's opening and ultrawide screen show. */
export type JourneyContent = { name: string; role: string; city: string };

export function getJourneyContent(locale: Locale): JourneyContent {
  const identity = getIdentity(locale);
  return {
    name: sharedFacts.name,
    role: identity.role,
    city: identity.city,
  };
}
