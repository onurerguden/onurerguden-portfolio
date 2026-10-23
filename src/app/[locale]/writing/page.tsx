import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { pageMetadata } from "@/lib/site";
import { writingStructuredData } from "@/lib/structured-data";
import { formatDay, getPosts } from "@/lib/writing";
import { feedUrl } from "@/lib/feed";
import { trails } from "@/lib/breadcrumbs";
import JsonLd from "@/components/json-ld";
import GiantTitle from "@/components/giant-title";
import Breadcrumbs from "@/components/site/breadcrumbs";
import styles from "./writing.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const en = locale === "en";
  return pageMetadata(
    locale,
    "/writing",
    en ? "Writing on AI engineering" : "Yapay zekâ mühendisliği yazıları",
    en
      ? "Articles by Onur Ergüden, AI engineer, from his own work: agents, MCP, RAG and the software around them, in English and Turkish."
      : "Yapay zekâ mühendisi Onur Ergüden’in kendi işlerinden yazıları: ajanlar, MCP, RAG ve etraflarındaki yazılım; Türkçe ve İngilizce.",
    {
      feed: {
        title: en ? "Onur Ergüden — Writing" : "Onur Ergüden — Yazılar",
        url: feedUrl(locale),
      },
    },
  );
}

/** Every article in this language, newest first. */
export default async function WritingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  const posts = getPosts(locale);
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <JsonLd data={writingStructuredData(locale, posts)} />
      <header className={styles.hero}>
        <Breadcrumbs locale={locale} trail={trails.writing(locale)} />
        <GiantTitle
          as="h1"
          text={en ? "Writing" : "Yazılar"}
          locale={locale}
          fill={94}
        />
        <p className={styles.lede}>
          {en
            ? "Notes from my own work: what I built, what broke and what I would keep. Every article is in English and Turkish."
            : "Kendi işlerimden notlar: ne geliştirdim, ne bozuldu ve neyi korurdum. Her yazı Türkçe ve İngilizce."}
        </p>
      </header>
      <ol className={styles.list}>
        {posts.map((post) => (
          <li key={post.slug}>
            <time dateTime={post.published}>
              {formatDay(post.published, locale)}
            </time>
            <h2>
              <Link href={`/${locale}/writing/${post.slug}`}>{post.title}</Link>
            </h2>
            <p>{post.description}</p>
          </li>
        ))}
      </ol>
      <p className={styles.feed}>
        <a href={feedUrl(locale)} type="application/atom+xml">
          {en ? "Atom feed" : "Atom akışı"}
        </a>
      </p>
    </main>
  );
}
