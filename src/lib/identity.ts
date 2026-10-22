import { sharedFacts, type Locale } from "./content";

/** Public identity shared by the visible page, search metadata and text feeds. */
export function getIdentity(locale: Locale) {
  const en = locale === "en";
  const { name, location } = sharedFacts;
  const firstName = name.split(" ")[0];
  const place = `${location.city}, ${location.country}`;
  const role = en ? "AI engineer" : "AI mühendisi";
  const occupation = en ? role : "yapay zekâ mühendisi";
  const title = en
    ? `${name} — ${occupation} in ${place}`
    : `${name} — ${location.city}’de ${occupation}`;
  const introduction = en
    ? `I’m ${firstName}, an ${occupation} based in ${place}.`
    : `Ben ${firstName}, ${place}’de yaşayan bir ${occupation}yim.`;
  const expertise = en
    ? "I build LLM applications end to end: retrieval, tool-calling agents with LangGraph and MCP, and the product around them, mostly in Python, TypeScript and Java."
    : "LLM uygulamalarını uçtan uca geliştiriyorum: bilgi erişimi, LangGraph ve MCP ile araç çağıran ajanlar ve bunların etrafındaki ürün; çoğunlukla Python, TypeScript ve Java ile.";
  const availability = en
    ? `I’m open to remote job and project opportunities in ${location.country} and internationally.`
    : `${location.country}’deki ve uluslararası uzaktan iş ve proje fırsatlarına açığım.`;
  const description = en
    ? `${name}, an ${occupation} in ${place}. RAG, LLM apps, LangGraph and MCP agents. Open to remote roles and projects.`
    : `${name}, ${location.city}’de ${occupation}. RAG ve LLM uygulamaları, LangGraph ve MCP ajanları. Uzaktan iş ve proje fırsatlarına açığım.`;

  return {
    name,
    role,
    // The opening h1 as written and read: name, role, then the second line.
    heading: `${name} ${role} ${location.city}`,
    occupation,
    city: location.city,
    location: place,
    title,
    introduction,
    bio: `${introduction} ${expertise}`,
    description,
    availability,
  };
}
