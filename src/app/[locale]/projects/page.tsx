import Link from "next/link";
import { notFound } from "next/navigation";
import GiantTitle from "@/components/giant-title";
import { getProjects, isLocale, sharedFacts } from "@/lib/content";
import { getPublicProjects } from "@/lib/github";
import { pageMetadata } from "@/lib/site";
import styles from "./archive.module.css";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata(
    locale,
    "/projects",
    locale === "en" ? "Projects" : "Projeler",
    locale === "en"
      ? "AI products, machine learning experiments and software engineering projects."
      : "AI ürünleri, makine öğrenmesi deneyleri ve yazılım mühendisliği projeleri.",
  );
}
export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  const projects = getProjects(locale);
  const github = await getPublicProjects();
  const date = (value: string) =>
    new Intl.DateTimeFormat(en ? "en-GB" : "tr-TR", {
      dateStyle: "medium",
      timeZone: "Europe/Istanbul",
    }).format(new Date(value));
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>
          {en ? "The project archive" : "Proje arşivi"}
        </p>
        <GiantTitle
          as="h1"
          text={en ? "All projects" : "Tüm projeler"}
          locale={locale}
          fill={94}
        />
        <p className={styles.lede}>
          {en
            ? "A collection of product work, research and engineering explorations. Each project starts with a different question."
            : "Ürünler, araştırmalar ve mühendislik çalışmaları. Her proje farklı bir soruyla başlıyor."}
        </p>
      </header>
      <ol className={styles.grid}>
        {projects.map((p, i) => (
          <li
            className={styles.entry}
            id={p.slug}
            key={p.slug}
            data-linked={p.featured ? "" : undefined}
          >
            <span className={styles.number} aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className={styles.category}>{p.category}</p>
            <h2>
              {p.featured ? (
                <Link
                  className={styles.cover}
                  href={`/${locale}/projects/${p.slug}`}
                >
                  {p.title}
                </Link>
              ) : (
                p.title
              )}
            </h2>
            <p className={styles.summary}>{p.summary}</p>
            {p.metric ? (
              <p className={styles.metric}>
                <strong>{p.metric.value}</strong> {p.metric.label}
              </p>
            ) : null}
            <ul
              className={styles.chips}
              aria-label={en ? "Built with" : "Kullandıklarım"}
            >
              {p.stack.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className={styles.action}>
              {p.featured ? (
                <span aria-hidden="true">
                  {en ? "Read the case study" : "Vaka çalışmasını oku"} →
                </span>
              ) : p.repoUrl ? (
                <a href={p.repoUrl}>
                  {en ? "Source on GitHub" : "GitHub’da kaynak kod"}
                  <span aria-hidden="true"> ↗</span>
                </a>
              ) : null}
            </p>
          </li>
        ))}
      </ol>
      <section className={styles.github} aria-labelledby="github-title">
        <div className={styles.githubHead}>
          <h2 id="github-title">{en ? "On GitHub" : "GitHub’da"}</h2>
          <a href={sharedFacts.github}>
            {en ? "Visit profile" : "Profili ziyaret et"}
            <span aria-hidden="true"> ↗</span>
          </a>
        </div>
        {github.repos.length ? (
          <>
            <p className={styles.synced}>
              {en
                ? "Repository metadata from GitHub"
                : "GitHub’dan depo bilgileri"}
              {github.syncedAt ? ` · ${date(github.syncedAt)}` : ""}
            </p>
            <ul className={styles.repos}>
              {github.repos.map((repo) => (
                <li key={repo.id}>
                  <div>
                    <h3>
                      <a href={repo.url}>
                        {repo.name}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                    </h3>
                    {repo.description ? <p>{repo.description}</p> : null}
                  </div>
                  <p className={styles.repoMeta}>
                    {repo.language ? <span>{repo.language}</span> : null}
                    {repo.fork ? <span>Fork</span> : null}
                    {repo.archived ? (
                      <span>{en ? "Archived" : "Arşivlendi"}</span>
                    ) : null}
                    {repo.pushedAt ? (
                      <span>
                        {en ? "Last push: " : "Son push: "}
                        {date(repo.pushedAt)}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.synced}>
            {en
              ? "More experiments and source code live on my GitHub profile."
              : "Diğer deneyler ve kaynak kodlar GitHub profilimde."}
          </p>
        )}
      </section>
    </main>
  );
}
