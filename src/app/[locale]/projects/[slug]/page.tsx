import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import GiantTitle from "@/components/giant-title";
import CaseMedia from "@/components/case/case-media";
import CaseToc from "@/components/case/case-toc";
import OtherProjects from "@/components/case/other-projects";
import styles from "@/components/case/case.module.css";
import { caseSections, getProject, isLocale } from "@/lib/content";
import { pageMetadata } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const project = getProject(locale, slug);
  return project
    ? pageMetadata(locale, `/projects/${slug}`, project.title, project.summary)
    : {};
}

const text = (node: ReactNode): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(text).join("")
      : "";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const project = getProject(locale, slug);
  if (!project?.featured || !project.body) notFound();
  const en = locale === "en";
  const sections = caseSections(locale, slug);
  // Headings take their language-independent ids by position.
  const idFor = (label: string) =>
    sections.find((section) => section.label === label.trim())?.id;
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <header className={styles.hero}>
        <Link className={styles.back} href={`/${locale}#work`}>
          <span aria-hidden="true">←</span> {en ? "Projects" : "Projeler"}
        </Link>
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
              <a className={styles.source} href={project.repoUrl}>
                {en ? "Explore the source" : "Kaynak kodu incele"}
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
            components={{
              h2: ({ children }: { children?: ReactNode }) => (
                <h2 id={idFor(text(children))}>{children}</h2>
              ),
            }}
          />
        </article>
      </div>
      <OtherProjects locale={locale} current={slug} />
    </main>
  );
}
