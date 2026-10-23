import { getProjects, sharedFacts, type Locale } from "./content";
import {
  getAbout,
  getCertificates,
  getExperience,
  getServices,
} from "./home-content";
import { reportWorkflow } from "./report-workflow";
import { getResearch } from "./research";
import { siteOrigin } from "./site";
import { getIdentity } from "./identity";

/**
 * /llms.txt and /llms-full.txt (llmstxt.org): the site as Markdown for AI
 * assistants and answer engines, built from the same content as the pages so
 * the two cannot drift. English, with a Turkish section for the Turkish pages.
 */
const locale: Locale = "en";

const absolute = (href: string) =>
  href.startsWith("/") ? `${siteOrigin()}${href}` : href;

function intro() {
  const origin = siteOrigin();
  const { education } = sharedFacts;
  const identity = getIdentity(locale);
  return [
    `# ${sharedFacts.name}`,
    "",
    `> ${sharedFacts.name} is an ${identity.occupation} based in ${identity.location}. He builds LLM applications end to end: retrieval, tool-calling agents with LangGraph and MCP, and the software around them. ${education.degree}, ${education.university}.`,
    "",
    `This is his portfolio, in English (${origin}/en) and Turkish (${origin}/tr). Contact: ${sharedFacts.email}. Profiles: ${sharedFacts.profiles.map((profile) => `${profile.name} ${profile.url}`).join(", ")}. The site is written in his own words, so the sections below speak in the first person.`,
  ];
}

/** The Turkish pages, introduced in Turkish, so either language finds them. */
function turkish() {
  const origin = siteOrigin();
  const identity = getIdentity("tr");
  const page = (path: string) => `${origin}/tr${path}`;
  return [
    "## Türkçe",
    "",
    `${identity.lead} ${identity.expertise}`,
    "",
    `- [Ana sayfa](${page("")})`,
    `- [Hakkımda](${page("/about")})`,
    `- [Projeler](${page("/projects")})`,
    `- [Araştırma](${page("/research")})`,
    ...getProjects("tr")
      .filter((project) => project.caseStudy)
      .map(
        (project) =>
          `- [${project.title}](${page(`/projects/${project.slug}`)}): ${project.summary}`,
      ),
  ];
}

export function llmsIndex() {
  const origin = siteOrigin();
  const projects = getProjects(locale);
  const page = (path: string) => `${origin}/${locale}${path}`;
  return [
    ...intro(),
    "",
    "## Pages",
    "",
    `- [Home](${page("")}): about, what I do, experience, technologies, projects, certificates and contact`,
    `- [About](${page("/about")}): who I am, my roles, education, timeline and how to reach me`,
    `- [Projects](${page("/projects")}): every project, with case studies and public repositories`,
    `- [Research](${page("/research")}): the accepted paper and a course project`,
    "",
    "## Case studies",
    "",
    ...projects
      .filter((project) => project.caseStudy)
      .map(
        (project) =>
          `- [${project.title}](${page(`/projects/${project.slug}`)}): ${project.summary}`,
      ),
    "",
    ...turkish(),
    "",
    "## Optional",
    "",
    `- [Full text](${origin}/llms-full.txt): this summary with the case studies, experience and certificates in full`,
    ...projects
      .filter((project) => !project.caseStudy && project.repoUrl)
      .map(
        (project) =>
          `- [${project.title}](${project.repoUrl}): ${project.summary}`,
      ),
    "",
  ].join("\n");
}

/** The text a case study's figures carry on the page, as Markdown. */
const figures: Record<string, () => string> = {
  ReportWorkflow: () =>
    [
      reportWorkflow[locale].caption,
      "",
      ...reportWorkflow[locale].steps.map((step, i) => `${i + 1}. ${step}`),
    ].join("\n"),
};

/** Case-study Markdown with each MDX component replaced by its text, if any. */
const prose = (body: string) =>
  body
    .split("\n")
    .flatMap((line) => {
      const component = line.match(/^\s*<([A-Z]\w*)[^>]*\/>\s*$/)?.[1];
      if (!component) return [line];
      return figures[component] ? [figures[component]()] : [];
    })
    .join("\n")
    .replace(/^## /gm, "### ")
    .trim();

export function llmsFull() {
  const origin = siteOrigin();
  const projects = getProjects(locale);
  const research = getResearch(locale);
  const { publication } = sharedFacts;
  return [
    ...intro(),
    "",
    "## About",
    "",
    ...getAbout(locale).paragraphs.flatMap((paragraph) => [paragraph, ""]),
    "## What I do",
    "",
    ...getServices(locale).flatMap((service) => [
      `- **${service.title}**: ${service.description} (${service.tech.join(", ")}; proof: ${absolute(service.href)}${service.supportingProof ? `; ${service.supportingProof.label}: ${absolute(service.supportingProof.href)}` : ""})`,
    ]),
    "",
    "## Experience",
    "",
    ...getExperience(locale).flatMap((entry) => [
      `### ${entry.role}, ${entry.company} (${entry.period})`,
      "",
      ...entry.highlights.map((highlight) => `- ${highlight}`),
      ...(entry.tools.length ? [`- Tools: ${entry.tools.join(", ")}`] : []),
      "",
    ]),
    "## Research",
    "",
    research.approach,
    "",
    `- **${publication.title}**. ${publication.authors.join(", ")}. ${publication.journal}. ${publication.statusLabel.en}. ${research.publicationSummary} Publisher’s accepted-paper listing: ${publication.sourceUrl}`,
    "",
    `- **${research.study.title}**. ${research.study.status}. ${research.study.team}. ${research.study.data} ${research.study.method} Source: ${research.study.repoUrl}`,
    "",
    "### Questions I’m exploring",
    "",
    ...research.questions.map((question) => `- ${question}`),
    "",
    research.interests,
    "",
    ...projects
      .filter((project) => project.caseStudy && project.body)
      .flatMap((project) => [
        `## Case study: ${project.title}`,
        "",
        `${project.summary}`,
        "",
        `- Page: ${origin}/${locale}/projects/${project.slug}`,
        `- Author: ${sharedFacts.name}; GitHub: ${sharedFacts.github}`,
        ...(project.role ? [`- My role: ${project.role}`] : []),
        `- Built with: ${project.stack.join(", ")}`,
        ...(project.repoUrl ? [`- Source: ${project.repoUrl}`] : []),
        "",
        prose(project.body ?? ""),
        "",
      ]),
    "## Other projects",
    "",
    ...projects
      .filter((project) => !project.caseStudy)
      .map(
        (project) =>
          `- **${project.title}** (${project.stack.join(", ")}): ${project.summary}${project.repoUrl ? ` Source: ${project.repoUrl}` : ""}`,
      ),
    "",
    "## Certificates",
    "",
    ...getCertificates(locale).map(
      (certificate) =>
        `- ${certificate.title}, ${certificate.issuer} (${certificate.issuedLabel})${certificate.credentialUrl ? `: ${certificate.credentialUrl}` : ""}`,
    ),
    "",
  ].join("\n");
}
