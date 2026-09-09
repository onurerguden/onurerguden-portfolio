import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjects, isLocale } from "@/lib/content";
import { getPublicProjects } from "@/lib/github";
import { pageMetadata } from "@/lib/site";
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
  return (
    <main id="main" tabIndex={-1}>
      <div className="page-intro">
        <p className="section-kicker">
          {en ? "The project archive" : "Proje arşivi"}
        </p>
        <h1>
          {en ? "Built. Tested. Learned." : "Geliştirdim. Denedim. Öğrendim."}
        </h1>
        <p>
          {en
            ? "A collection of product work, research and engineering explorations. Each project starts with a different question."
            : "Ürünler, araştırmalar ve mühendislik çalışmaları. Her proje farklı bir soruyla başlıyor."}
        </p>
      </div>
      <div className="archive-grid">
        {projects.map((p) => (
          <article className="archive-entry" key={p.slug}>
            <p className="project-category">{p.category}</p>
            <h2>
              {p.featured ? (
                <Link href={`/${locale}/projects/${p.slug}`}>{p.title} ↗</Link>
              ) : (
                p.title
              )}
            </h2>
            <p>{p.summary}</p>
            {p.metric ? (
              <p>
                <strong>{p.metric.value}</strong> — {p.metric.label}
              </p>
            ) : null}
            <ul className="stack">
              {p.stack.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {!p.featured && p.repoUrl ? (
              <p>
                <a className="text-link" href={p.repoUrl}>
                  {en ? "Source on GitHub" : "GitHub’da kaynak kod"} ↗
                </a>
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <section className="github-section">
        <div className="section-heading">
          <h2>{en ? "On GitHub" : "GitHub’da"}</h2>
          <a className="text-link" href="https://github.com/onurerguden">
            {en ? "Visit profile" : "Profili ziyaret et"} ↗
          </a>
        </div>
        {github.repos.length ? (
          <>
            <p className="section-kicker">
              {en
                ? "Repository metadata from GitHub"
                : "GitHub’dan depo bilgileri"}
              {github.syncedAt
                ? ` / ${new Intl.DateTimeFormat(en ? "en-GB" : "tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(github.syncedAt))}`
                : ""}
            </p>
            <div className="repo-list">
              {github.repos.map((repo) => (
                <article className="repo-row" key={repo.id}>
                  <div>
                    <h3>
                      <a href={repo.url}>{repo.name} ↗</a>
                    </h3>
                    {repo.description ? <p>{repo.description}</p> : null}
                  </div>
                  <div className="repo-meta">
                    {repo.language ? <span>{repo.language}</span> : null}
                    {repo.fork ? <span>Fork</span> : null}
                    {repo.archived ? (
                      <span>{en ? "Archived" : "Arşivlendi"}</span>
                    ) : null}
                    {repo.pushedAt ? (
                      <span>
                        {en ? "Last push: " : "Son push: "}
                        {new Intl.DateTimeFormat(en ? "en-GB" : "tr-TR", {
                          dateStyle: "medium",
                          timeZone: "Europe/Istanbul",
                        }).format(new Date(repo.pushedAt))}
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="empty-note">
            {en
              ? "More experiments and source code live on my GitHub profile."
              : "Diğer deneyler ve kaynak kodlar GitHub profilimde."}
          </p>
        )}
      </section>
    </main>
  );
}
