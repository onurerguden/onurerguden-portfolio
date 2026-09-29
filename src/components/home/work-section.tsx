import Link from "next/link";
import { getProjects, type Locale } from "@/lib/content";
import WorkReveal from "@/components/work-reveal";
import ProjectArt from "@/components/project-art";

/** Selected work; replaced by the stacked project cards in the next PR. */
export default function WorkSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const projects = getProjects(locale).filter((p) => p.featured);
  return (
    <section id="work" className="work-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">
            {en ? "Selected work" : "Seçili çalışmalar"}
          </p>
          <h2>{en ? "Ideas made tangible." : "Fikirlerin çalışan hâli."}</h2>
        </div>
        <Link className="text-link" href={`/${locale}/projects`}>
          {en ? "All projects" : "Tüm projeler"}{" "}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <WorkReveal>
        <div className="project-grid">
          {projects.map((project, i) => (
            <article
              className={`project-card ${i === 0 ? "project-featured" : ""}`}
              key={project.slug}
            >
              <Link
                className="project-image-link"
                href={`/${locale}/projects/${project.slug}`}
                aria-label={
                  en
                    ? `Read ${project.title} case study`
                    : `${project.title} proje incelemesini oku`
                }
              >
                <ProjectArt slug={project.slug} locale={locale} />
              </Link>
              <div className="project-copy">
                <p className="project-category">
                  {project.category.replaceAll(" · ", " / ")}
                </p>
                <h3>
                  <Link href={`/${locale}/projects/${project.slug}`}>
                    {project.title}
                    <span aria-hidden="true">↗</span>
                  </Link>
                </h3>
                <p>{project.summary}</p>
                <ul className="stack">
                  {project.stack.slice(0, 4).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </WorkReveal>
    </section>
  );
}
