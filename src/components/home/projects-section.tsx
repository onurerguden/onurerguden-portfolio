import Image from "next/image";
import type { CSSProperties } from "react";
import Link from "next/link";
import GiantTitle from "@/components/giant-title";
import ProjectArt from "@/components/project-art";
import { getProjects, type Locale, type Project } from "@/lib/content";
import ProjectsStack, { StackCard } from "./projects-stack";
import styles from "./projects.module.css";

type Media = NonNullable<Project["media"]>[number];
type Tile =
  | { kind: "image"; image: Media }
  | { kind: "shots"; variant: "phone" | "screen"; images: Media[] }
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
  const media = project.media ?? [];
  // App and email screens sit side by side in one tile; figures get a tile each.
  const shots = media.filter((item) => item.kind !== "figure");
  if (shots.length)
    return [
      {
        kind: "shots",
        variant: shots[0].kind as "phone" | "screen",
        images: shots,
      },
      metric ?? stack,
      caseStudy,
    ];
  const images: Tile[] = media.map((image) => ({ kind: "image", image }));
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
            src={tile.image.src}
            alt={tile.image.alt}
            width={tile.image.width}
            height={tile.image.height}
            sizes="(max-width: 760px) 90vw, 50vw"
          />
        </figure>
      );
    case "shots":
      return (
        <div
          className={`${styles.tile} ${
            tile.variant === "phone" ? styles.phones : styles.screens
          }`}
        >
          <div
            className={
              tile.variant === "phone" ? "phone-pair" : styles.screenRow
            }
          >
            {tile.images.map((item) => (
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

/** Projects as sticky stacked cards: the case studies, then the archive. */
export default function ProjectsSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const projects = getProjects(locale);
  const featured = projects.filter((project) => project.featured);
  const archive = projects.filter((project) => !project.featured);
  const count = featured.length + 1;
  // The card lists the first four archive entries; /projects lists them all.
  const archiveEntries = archive.slice(0, 4);
  const archiveImage = archive
    .flatMap((project) => project.media ?? [])
    .find((item) => item.kind === "figure");
  return (
    <section className={`${styles.section} bleed`} aria-labelledby="work-title">
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
              <div
                className={`${styles.media} ${styles.archive}`}
                style={{ "--rows": archiveEntries.length } as CSSProperties}
                data-rows={archiveEntries.length}
              >
                {archiveImage ? (
                  <TileView
                    tile={{ kind: "image", image: archiveImage }}
                    locale={locale}
                  />
                ) : null}
                {archiveEntries.map((project) => (
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
