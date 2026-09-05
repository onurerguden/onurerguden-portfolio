import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjects, isLocale } from "@/lib/content";
import { pageMetadata } from "@/lib/site";
import SystemVisual from "@/components/system-visual";
import WorkReveal from "@/components/work-reveal";
import ProjectArt from "@/components/project-art";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata(
    locale,
    "",
    "AI engineering & research",
    locale === "en"
      ? "Onur Ergüden builds AI products, retrieval systems and applied machine learning research."
      : "Onur Ergüden: AI ürünleri, bilgi erişim sistemleri ve uygulamalı makine öğrenmesi araştırmaları.",
  );
}
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  const projects = getProjects(locale).filter((p) => p.featured);
  const cv = process.env.NEXT_PUBLIC_CV_URL;
  return (
    <main id="main" tabIndex={-1}>
      <section className="hero">
        <div className="hero-copy">
          <p className="intro-line">
            <span className="status-dot" />
            {en ? "AI engineer, based in İzmir" : "İzmir’de bir AI mühendisi"}
          </p>
          <h1>
            {en ? (
              <>
                Intelligence,
                <br />
                put to work.
              </>
            ) : (
              <>
                Fikirden
                <br />
                çalışan zekâya.
              </>
            )}
          </h1>
          <p className="hero-description">
            {en
              ? "I build AI systems that connect models, data and real products. Curious about what works—and why."
              : "Modelleri, veriyi ve gerçek ürünleri bir araya getiren AI sistemleri geliştiriyorum. Neyin, neden çalıştığını araştırıyorum."}
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="#work">
              {en ? "Explore my work" : "Projelerimi keşfet"}
              <span aria-hidden="true">↗</span>
            </Link>
            <a
              className="text-link"
              href={cv || "mailto:onurerguden5@gmail.com?subject=CV%20request"}
            >
              {cv
                ? en
                  ? "Download CV"
                  : "CV’yi indir"
                : en
                  ? "Request my CV"
                  : "CV’mi iste"}
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <SystemVisual locale={locale} />
        </div>
        <div className="hero-bottom">
          <p>
            {en
              ? "Currently building AI products at"
              : "AI ürünleri geliştirdiğim yer"}
            <strong>Future Is Now</strong>
          </p>
          <a href="#work" className="scroll-hint">
            {en ? "A closer look" : "Daha yakından"}
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
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
      <section id="about" className="about-section">
        <div>
          <p className="section-kicker">
            {en ? "A little about me" : "Biraz kendimden"}
          </p>
          <h2>
            {en ? (
              <>
                An engineer’s mindset.
                <br />A researcher’s curiosity.
              </>
            ) : (
              <>
                Mühendislik yaklaşımı.
                <br />
                Araştırma merakı.
              </>
            )}
          </h2>
        </div>
        <div className="about-copy">
          <p>
            {en
              ? "I’m Onur, a software engineering graduate working at the intersection of AI and product development. My work spans agentic workflows, retrieval systems and applied machine learning."
              : "Ben Onur. Yazılım mühendisliği mezunuyum; AI ile ürün geliştirmenin kesişiminde çalışıyorum. Agentic iş akışları, bilgi erişim sistemleri ve uygulamalı makine öğrenmesi geliştiriyorum."}
          </p>
          <p>
            {en
              ? "I care about the decisions behind a system: how it handles uncertainty, how it is evaluated, and how people actually use it."
              : "Bir sistemin arkasındaki kararlarla ilgileniyorum: belirsizliği nasıl ele aldığı, nasıl değerlendirildiği ve insanların onu nasıl kullandığı."}
          </p>
          <Link className="text-link" href={`/${locale}/research`}>
            {en ? "My research interests" : "Araştırma alanlarım"}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section
        className="experience-section"
        aria-label={en ? "Experience" : "Deneyim"}
      >
        <h2>
          {en ? "Where I’ve been building." : "Deneyim kazandığım yerler."}
        </h2>
        <div className="experience-list">
          {[
            {
              company: "Future Is Now",
              role: en ? "AI Engineer" : "AI mühendisi",
              date: en ? "Jul 2026 — present" : "Tem 2026 — devam",
              description: en
                ? "Full-stack AI products, agentic workflows and RAG pipelines."
                : "Full-stack AI ürünleri, agentic iş akışları ve RAG pipeline’ları.",
            },
            {
              company: "Future Is Now",
              role: en ? "AI Engineer Intern" : "AI mühendisliği stajyeri",
              date: en ? "Apr — Jun 2026" : "Nis — Haz 2026",
              description: en
                ? "AI prototypes and retrieval-based application features."
                : "AI prototipleri ve bilgi erişimi tabanlı uygulama özellikleri.",
            },
            {
              company: "VBT Software",
              role: en
                ? "Software Engineering Intern"
                : "Yazılım mühendisliği stajyeri",
              date: en ? "Aug — Sep 2025" : "Ağu — Eyl 2025",
              description: en
                ? "TaskFoo: Spring Boot, React and PostgreSQL."
                : "TaskFoo: Spring Boot, React ve PostgreSQL.",
            },
            {
              company: "BMC Otomotiv",
              role: en
                ? "Software Engineering Intern"
                : "Yazılım mühendisliği stajyeri",
              date: en ? "Jul — Aug 2025" : "Tem — Ağu 2025",
              description: en
                ? "SAP ABAP applications and warehouse inventory workflows."
                : "SAP ABAP uygulamaları ve depo envanter iş akışları.",
            },
          ].map((job) => (
            <div className="experience-row" key={job.company + job.role}>
              <p className="experience-date">{job.date}</p>
              <div>
                <h3>{job.company}</h3>
                <p>{job.role}</p>
              </div>
              <p>{job.description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="contact-section">
        <p>
          {en
            ? "Good work starts with a conversation."
            : "İyi işler bir sohbetle başlar."}
        </p>
        <h2>{en ? "Let’s connect." : "Tanışalım."}</h2>
        <a href="mailto:onurerguden5@gmail.com">
          onurerguden5@gmail.com <span aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}
