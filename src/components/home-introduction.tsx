import Link from "next/link";
export default function HomeIntroduction({ locale }: { locale: "en" | "tr" }) {
  const en = locale === "en";
  const cv = process.env.NEXT_PUBLIC_CV_URL;
  return (
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
  );
}
