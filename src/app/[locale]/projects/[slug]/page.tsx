import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import GiantTitle from "@/components/giant-title";
import CaseMedia from "@/components/case/case-media";
import CaseToc from "@/components/case/case-toc";
import OtherProjects from "@/components/case/other-projects";
import ReportWorkflow from "@/components/case/report-workflow";
import styles from "@/components/case/case.module.css";
import {
  caseSections,
  getProject,
  getProjects,
  headingIds,
  isLocale,
  sharedFacts,
} from "@/lib/content";
import { pageMetadata } from "@/lib/site";
import { editorialModified, editorialPublished } from "@/lib/editorial";
import { caseStudyStructuredData } from "@/lib/structured-data";
import JsonLd from "@/components/json-ld";
import Breadcrumbs from "@/components/site/breadcrumbs";
import { trails } from "@/lib/breadcrumbs";

// Every case study is built ahead; any other slug is a 404.
export const dynamicParams = false;
export function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) return [];
  return getProjects(params.locale)
    .filter((project) => project.caseStudy && project.body)
    .map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const project = getProject(locale, slug);
  return project
    ? pageMetadata(
        locale,
        `/projects/${slug}`,
        project.searchTitle ?? project.title,
        project.description ?? project.summary,
        {
          article: {
            modifiedTime: editorialModified(`/projects/${slug}`),
            publishedTime: editorialPublished(`/projects/${slug}`),
          },
        },
      )
    : {};
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const project = getProject(locale, slug);
  if (!project?.caseStudy || !project.body) notFound();
  const en = locale === "en";
  const sections = caseSections(locale, slug);
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <JsonLd data={caseStudyStructuredData(locale, project)} />
      <header className={styles.hero}>
        <Breadcrumbs
          locale={locale}
          trail={trails.caseStudy(locale, project.title, project.slug)}
        />
        <p className={styles.category}>{project.category}</p>
        <GiantTitle
          as="h1"
          // Case studies are named products: keep their English capitals.
          text={`[${project.title}]`}
          locale={locale}
          fill={94}
          max={168}
          className={styles.title}
        />
        <p className={styles.summary}>{project.summary}</p>
        <p className={styles.byline}>
          {en ? "By " : "Hazırlayan: "}
          <Link href={`/${locale}#about`} rel="author">
            {sharedFacts.name}
          </Link>
          {" · "}
          <a href={sharedFacts.github} rel="me">
            GitHub: {sharedFacts.githubLogin}
          </a>
        </p>
        {project.role ? (
          <p className={styles.role}>
            <span>{en ? "My role" : "Rolüm"}</span>
            {project.role}
          </p>
        ) : null}
      </header>
      <CaseMedia project={project} locale={locale} />
      <div className={styles.layout}>
        <aside className={styles.aside}>
          <div>
            <h2>{en ? "Built with" : "Kullandıklarım"}</h2>
            <ul className={styles.chips}>
              {project.stack.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>{en ? "Source" : "Kaynak"}</h2>
            {project.repoUrl ? (
              <a
                className={styles.source}
                href={project.repoUrl}
                data-source-of={project.slug}
              >
                {new URL(project.repoUrl).pathname.slice(1)}
                <span aria-hidden="true"> ↗</span>
              </a>
            ) : (
              <p>{en ? "Closed-source project" : "Kapalı kaynak proje"}</p>
            )}
          </div>
          <CaseToc
            label={en ? "On this page" : "Bu sayfada"}
            sections={sections}
          />
        </aside>
        <article className={styles.prose}>
          <MDXRemote
            source={project.body}
            // Headings take their language-independent ids by position.
            options={{
              mdxOptions: {
                rehypePlugins: [headingIds(sections.map(({ id }) => id))],
              },
            }}
            components={{
              ReportWorkflow: () => <ReportWorkflow locale={locale} />,
            }}
          />
        </article>
      </div>
      <OtherProjects locale={locale} current={slug} />
    </main>
  );
}
