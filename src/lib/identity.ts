import { sharedFacts, type Locale } from "./content";

/** Public identity shared by the visible page, search metadata and text feeds. */
export function getIdentity(locale: Locale) {
  const en = locale === "en";
  const { name, location } = sharedFacts;
  const firstName = name.split(" ")[0];
  const place = `${location.city}, ${location.country}`;
  // One term in each language, everywhere: the opening, titles, the graph.
  const role = en ? "AI engineer" : "yapay zekâ mühendisi";
  const occupation = role;
  // The opening shows the role alone, as a job title (23 October).
  const headline = en ? "AI Engineer" : "Yapay Zekâ Mühendisi";
  // The city stays in the title: it is the one place-based answer the
  // 22 October baseline found us in. The visible h1 does not carry it.
  const title = en
    ? `${name} — ${role} in ${location.city}: LLM apps, RAG and agents`
    : `${name} — ${location.city}’de ${role}: LLM, RAG ve ajanlar`;
  const introduction = en
    ? `I’m ${firstName}, an ${occupation} based in ${place}.`
    : `Ben ${firstName}, ${place}’de yaşayan bir ${occupation}yim.`;
  const expertise = en
    ? "I build LLM applications end to end: retrieval, tool-calling agents with LangGraph and MCP, and the software around them, mostly in Python, TypeScript and Java."
    : "LLM uygulamalarını uçtan uca geliştiriyorum: bilgi erişimi, LangGraph ve MCP ile araç çağıran ajanlar ve bunların etrafındaki yazılım; çoğunlukla Python, TypeScript ve Java ile.";
  // I have a job; the contact line invites a message, not offers.
  const invitation = en
    ? "If you’d like to get in touch, feel free to write."
    : "Ulaşmak isterseniz çekinmeden yazabilirsiniz.";
  const description = en
    ? `${name}, an AI engineer. LLM apps, RAG, LangGraph and MCP agents, and the software around them. Based in ${place}.`
    : `${name}, yapay zekâ mühendisi. LLM uygulamaları, RAG, LangGraph ve MCP ajanları ve etraflarındaki yazılım. ${place}.`;

  return {
    name,
    role,
    headline,
    // The opening h1 as written and read: name, then the role.
    heading: `${name} ${headline}`,
    occupation,
    city: location.city,
    location: place,
    title,
    introduction,
    bio: `${introduction} ${expertise}`,
    description,
    invitation,
  };
}
