import Image from "next/image";
import Link from "next/link";
import GiantTitle from "@/components/giant-title";
import ProjectArt from "@/components/project-art";
import { getProjects, type Locale, type Project } from "@/lib/content";
import ProjectsStack, { StackCard } from "./projects-stack";
import styles from "./projects.module.css";

type Tile =
  | { kind: "image"; src: string; width: number; height: number; alt: string }
  | { kind: "phones"; project: Project }
  | { kind: "art"; slug: string }
  | { kind: "facts"; label: string; items: string[] }
  | { kind: "metric"; value: string; label: string }
  | { kind: "link"; label: string; href: string };

function tilesFor(project: Project, locale: Locale): Tile[] {
  const en = locale === "en";
  const stack: Tile = {
    kind: "facts",
    label: en ? "Built with" : "Kullandıklarım",
    items: project.stack,
  };
  const metric: Tile | null = project.metric
    ? { kind: "metric", ...project.metric }
    : null;
  const caseStudy: Tile = {
    kind: "link",
    label: en ? "Read the case study" : "Proje incelemesini oku",
    href: `/${locale}/projects/${project.slug}`,
  };
  const images: Tile[] = (project.media ?? []).map((item) => ({
    kind: "image",
    ...item,
  }));
  if (project.slug === "kuyumcum")
    return [{ kind: "phones", project }, stack, caseStudy];
  if (images.length)
    return [...images, metric ?? stack, stack, caseStudy].slice(0, 3);
  return [{ kind: "art", slug: project.slug }, metric ?? stack, caseStudy];
}

function TileView({ tile, locale }: { tile: Tile; locale: Locale }) {
  switch (tile.kind) {
    case "image":
      return (
        <figure className={`${styles.tile} ${styles.figure}`}>
          <Image
            src={tile.src}
            alt={tile.alt}
            width={tile.width}
            height={tile.height}
            sizes="(max-width: 760px) 90vw, 50vw"
          />
        </figure>
      );
    case "phones":
      return (
        <div className={`${styles.tile} ${styles.phones}`}>
          <div className="phone-pair">
            {(tile.project.media ?? []).map((item) => (
              <Image
                key={item.src}
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                sizes="(max-width: 760px) 40vw, 220px"
              />
            ))}
          </div>
        </div>
      );
    case "art":
      return (
        <div className={`${styles.tile} ${styles.art}`}>
          <ProjectArt slug={tile.slug} locale={locale} />
        </div>
      );
    case "facts":
      return (
        <div className={`${styles.tile} ${styles.facts}`}>
          <p>{tile.label}</p>
          <ul>
            {tile.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      );
    case "metric":
      return (
        <div className={`${styles.tile} ${styles.metric}`}>
          <strong>{tile.value}</strong>
          <p>{tile.label}</p>
        </div>
      );
    case "link":
      return (
        <Link className={`${styles.tile} ${styles.linkTile}`} href={tile.href}>
          {tile.label}
          <span aria-hidden="true">↗</span>
        </Link>
      );
  }
}

/** Projects as sticky stacked cards: three case studies, then the archive. */
export default function ProjectsSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const projects = getProjects(locale);
  const featured = projects.filter((project) => project.featured);
  const archive = projects.filter((project) => !project.featured);
  const count = featured.length + 1;
  const archiveImage = archive.flatMap((project) => project.media ?? [])[0];
  return (
    <section
      id="work"
      className={`${styles.section} bleed`}
      aria-labelledby="work-title"
    >
      <div className={styles.inner}>
        <div className={styles.head}>
          <GiantTitle
            id="work-title"
            text={en ? "Projects" : "Projeler"}
            locale={locale}
            fill={78}
          />
          <Link className={styles.all} href={`/${locale}/projects`}>
            {en ? "All projects" : "Tüm projeler"}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <ProjectsStack count={count}>
          {featured.map((project, index) => (
            <StackCard index={index} key={project.slug}>
              <article
                className={styles.card}
                aria-labelledby={`project-${project.slug}`}
              >
                <header className={styles.cardHead}>
                  <span className={styles.number} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className={styles.titles}>
                    <h3 id={`project-${project.slug}`}>
                      <Link href={`/${locale}/projects/${project.slug}`}>
                        {project.title}
                      </Link>
                    </h3>
                    <p>{project.category}</p>
                  </div>
                  <div className={styles.pills}>
                    <Link
                      className={styles.pill}
                      href={`/${locale}/projects/${project.slug}`}
                      aria-label={
                        en
                          ? `${project.title} case study`
                          : `${project.title} proje incelemesi`
                      }
                    >
                      {en ? "Case study" : "Proje incelemesi"}
                    </Link>
                    {project.repoUrl ? (
                      <a
                        className={styles.pill}
                        href={project.repoUrl}
                        aria-label={
                          en
                            ? `${project.title} source code on GitHub`
                            : `${project.title} kaynak kodu GitHub'da`
                        }
                      >
                        {en ? "Source code" : "Kaynak kod"}
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className={`${styles.pill} ${styles.quiet}`}>
                        {en ? "Closed source" : "Kapalı kaynak"}
                      </span>
                    )}
                  </div>
                </header>
                <p className={styles.summary}>{project.summary}</p>
                <div className={styles.media}>
                  {tilesFor(project, locale).map((tile, i) => (
                    <TileView key={i} tile={tile} locale={locale} />
                  ))}
                </div>
              </article>
            </StackCard>
          ))}
          <StackCard index={featured.length}>
            <article className={styles.card} aria-labelledby="project-archive">
              <header className={styles.cardHead}>
                <span className={styles.number} aria-hidden="true">
                  {String(count).padStart(2, "0")}
                </span>
                <div className={styles.titles}>
                  <h3 id="project-archive">
                    <Link href={`/${locale}/projects`}>
                      {en ? "More in the archive" : "Arşivde daha fazlası"}
                    </Link>
                  </h3>
                  <p>
                    {en
                      ? "Shorter projects with their source code"
                      : "Kaynak koduyla daha kısa projeler"}
                  </p>
                </div>
              </header>
              <div className={`${styles.media} ${styles.archive}`}>
                {archiveImage ? (
                  <TileView
                    tile={{ kind: "image", ...archiveImage }}
                    locale={locale}
                  />
                ) : null}
                {archive.map((project) => (
                  <Link
                    key={project.slug}
                    className={`${styles.tile} ${styles.entry}`}
                    href={`/${locale}/projects#${project.slug}`}
                  >
                    <span>{project.category}</span>
                    <strong>{project.title}</strong>
                    <span className={styles.entryStack}>
                      {project.stack.slice(0, 3).join(" · ")}
                    </span>
                  </Link>
                ))}
              </div>
            </article>
          </StackCard>
        </ProjectsStack>
      </div>
    </section>
  );
}
