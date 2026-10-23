import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { isLocale, sharedFacts } from "@/lib/content";
import { pageMetadata } from "@/lib/site";
import { postStructuredData } from "@/lib/structured-data";
import { formatDay, getPost, getPosts, postSections } from "@/lib/writing";
import { trails } from "@/lib/breadcrumbs";
import JsonLd from "@/components/json-ld";
import Breadcrumbs from "@/components/site/breadcrumbs";
import styles from "../writing.module.css";

// Every article is built ahead; any other slug is a 404.
export const dynamicParams = false;
export function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) return [];
  return getPosts(params.locale).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = getPost(locale, slug);
  return post
    ? pageMetadata(locale, `/writing/${slug}`, post.title, post.description, {
        article: {
          publishedTime: post.published,
          modifiedTime: post.updated,
          tags: post.tags,
        },
      })
    : {};
}

const text = (node: ReactNode): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(text).join("")
      : "";

/** One article: who wrote it, when, and the text. */
export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const post = getPost(locale, slug);
  if (!post) notFound();
  const en = locale === "en";
  const sections = postSections(locale, slug);
  const idFor = (label: string) =>
    sections.find((section) => section.label === label.trim())?.id;
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <JsonLd data={postStructuredData(locale, post)} />
      <article className={styles.article}>
        <header className={styles.postHeader}>
          <Breadcrumbs
            locale={locale}
            trail={trails.post(locale, post.title, post.slug)}
          />
          <h1>{post.title}</h1>
          <p className={styles.byline}>
            {en ? "By " : "Yazan: "}
            <Link href={`/${locale}/about`} rel="author">
              {sharedFacts.name}
            </Link>
            {" · "}
            <time dateTime={post.published}>
              {formatDay(post.published, locale)}
            </time>
            {post.updated !== post.published ? (
              <>
                {" · "}
                {en ? "Updated " : "Güncellendi: "}
                <time dateTime={post.updated}>
                  {formatDay(post.updated, locale)}
                </time>
              </>
            ) : null}
            {" · "}
            {en ? `${post.minutes} min read` : `${post.minutes} dk okuma`}
          </p>
          <ul className={styles.tags} aria-label={en ? "Topics" : "Konular"}>
            {post.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </header>
        <div className={styles.prose}>
          <MDXRemote
            source={post.body}
            components={{
              h2: ({ children }: { children?: ReactNode }) => (
                <h2 id={idFor(text(children))}>{children}</h2>
              ),
            }}
          />
        </div>
      </article>
      <p className={styles.more}>
        <Link href={`/${locale}/writing`}>
          {en ? "All writing" : "Bütün yazılar"}
          <span aria-hidden="true"> →</span>
        </Link>
      </p>
    </main>
  );
}
