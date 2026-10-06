import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (value: string): value is Locale =>
  locales.some((locale) => locale === value);

const projectSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  /** A case study's search-result description, short enough not to be cut. */
  description: z.string().min(50).max(160).optional(),
  category: z.string().min(1),
  /** What I did on a case study, from its "my contribution" section. */
  role: z.string().min(1).optional(),
  stack: z.array(z.string().min(1)).min(1),
  year: z.string(),
  featured: z.boolean(),
  repoUrl: z.url().optional(),
  metric: z.object({ value: z.string(), label: z.string() }).optional(),
  media: z
    .array(
      z.object({
        src: z.string().startsWith("/images/"),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        /**
         * phone: an app screen, shown in a device frame; screen: another
         * real screen (an email, a page), shown flat; figure: a chart or
         * plot from the work itself, shown with its caption.
         */
        kind: z.enum(["phone", "screen", "figure"]),
        alt: z.string().min(1),
      }),
    )
    .max(3)
    .optional(),
  body: z.string().optional(),
});
export type Project = z.infer<typeof projectSchema>;

export const sharedFacts = {
  name: "Onur Ergüden",
  email: "onurerguden5@gmail.com",
  github: "https://github.com/onurerguden",
  githubLogin: "onurerguden",
  linkedin: "https://www.linkedin.com/in/onurerguden/",
  work: { company: "Future Is Now", since: "2026-07" },
  academy: {
    name: "Google AI & Technology Academy",
    track: "Deep Learning",
    year: 2026,
  },
  education: {
    university: "İzmir University of Economics",
    degree: "BSc Software Engineering",
    graduation: "2026-06",
    gpa: "3.30 / 4.00",
  },
  publication: {
    title:
      "Two-layered Artificial Intelligence System to Assess and Forecast the Safety Level of Drinking Water Resources",
    authors: [
      "O. Ergüden",
      "B. Ceylani",
      "A. Şengül",
      "S. Yılmaz",
      "E. Yılmaz",
      "M. Y. Kalkan",
      "D. E. Fawzy",
    ],
    journal: "International Journal of Engineering Approaches (IJEA)",
    status: "accepted" as const,
    statusLabel: {
      en: "Accepted · publication pending",
      tr: "Kabul edildi · yayımlanması bekleniyor",
    },
  },
} as const;

/**
 * Counts from the IJEA revision package (izsu_ai_project,
 * paper_revision_deliverables, 6 August 2026). Model scores are deliberately
 * absent: every Risk example in the reactive test set is synthetic, so a
 * headline percentage would overstate what the project shows.
 */
const measurements = {
  waterRecords: 26469,
  waterObservations: 1557,
  waterSites: 76,
  waterDistricts: 11,
} as const;
type Measurement = keyof typeof measurements;
function formatMeasurement(key: Measurement, locale: Locale) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(
    measurements[key],
  );
}
function resolveMeasurements(body: string, locale: Locale) {
  return body.replace(/\[\[metric:([a-zA-Z]+)\]\]/g, (_, key: string) => {
    if (!(key in measurements)) throw new Error(`Unknown measurement: ${key}`);
    return formatMeasurement(key as Measurement, locale);
  });
}

type SharedProject = Pick<
  Project,
  "slug" | "stack" | "year" | "featured" | "repoUrl"
> & {
  /** A shared count shown with its localized label; never a model score. */
  metric?: Measurement;
  /** Real screenshots or repository artefacts only; alt text is localized. */
  media?: {
    src: string;
    width: number;
    height: number;
    kind: "phone" | "screen" | "figure";
  }[];
};
const projects: SharedProject[] = [
  {
    slug: "kuyumcum",
    stack: [
      "Flutter",
      "Dart",
      "Firebase",
      "Python",
      "YOLO11n",
      "TensorFlow Lite",
      "Gemini",
    ],
    year: "",
    featured: true,
    media: [
      {
        src: "/images/kuyumcum/map.webp",
        width: 756,
        height: 1638,
        kind: "phone",
      },
      {
        src: "/images/kuyumcum/ai-reports.webp",
        width: 756,
        height: 1638,
        kind: "phone",
      },
    ],
  },
  {
    slug: "water-safety",
    stack: [
      "Python",
      "scikit-learn",
      "SVM",
      "Random Forest",
      "Feature engineering",
    ],
    year: "",
    featured: true,
    repoUrl: "https://github.com/onurerguden/izsu_ai_project",
    metric: "waterRecords",
    // Rendered from the repository's own data graphs.
    media: [
      {
        src: "/images/projects/water-safety/health-factor-trend.webp",
        width: 1600,
        height: 792,
        kind: "figure",
      },
      {
        src: "/images/projects/water-safety/parameter-correlation.webp",
        width: 1200,
        height: 1026,
        kind: "figure",
      },
    ],
  },
  {
    slug: "course-intelligence",
    stack: ["Llama 3.1", "SBERT", "FAISS", "PyQt6"],
    year: "",
    featured: true,
    repoUrl: "https://github.com/onurerguden/IEU-Chat-Bot",
  },
  {
    slug: "gymrap-ai-coach",
    stack: [
      "MCP",
      "TypeScript",
      "Cloudflare Workers",
      "D1",
      "OAuth 2.1",
      "Kotlin",
    ],
    year: "2026",
    featured: true,
    repoUrl: "https://github.com/onurerguden/GymRap-AI-Coach",
    // The repository's own screenshots, rendered from synthetic data (MIT).
    media: [
      {
        src: "/images/projects/gymrap/daily-email.webp",
        width: 640,
        height: 1520,
        kind: "screen",
      },
      {
        src: "/images/projects/gymrap/workout-email.webp",
        width: 640,
        height: 1680,
        kind: "screen",
      },
      {
        src: "/images/projects/gymrap/workout-heart-volume.webp",
        width: 640,
        height: 1595,
        kind: "screen",
      },
    ],
  },
  // The archive, in the order the home page's archive card lists it.
  {
    slug: "carbonpilot",
    stack: ["LangGraph", "Gemini", "FastAPI", "pgvector", "Docker"],
    year: "2026",
    featured: false,
    repoUrl: "https://github.com/fatmanurdurmus/YZTA-BOOTCAMP-GRUP-9",
  },
  {
    slug: "urban-mobility",
    stack: ["Python", "XGBoost", "Random Forest", "DBSCAN"],
    year: "",
    featured: false,
    repoUrl: "https://github.com/onurerguden/IZMIR-PUBLIC-TRANSPORTATION-ML",
    media: [
      {
        src: "/images/projects/urban-mobility/dbscan-clusters.webp",
        width: 1600,
        height: 1193,
        kind: "figure",
      },
    ],
  },
  {
    slug: "taskfoo",
    stack: ["Spring Boot", "React", "TypeScript", "PostgreSQL"],
    year: "2025",
    featured: false,
    repoUrl: "https://github.com/onurerguden/TaskFoo",
  },
  {
    slug: "voiceops",
    stack: ["FastAPI", "Gemini", "React", "Web Speech API"],
    year: "2026",
    featured: false,
    repoUrl: "https://github.com/fkaanc/voiceops_hackathon_google",
  },
  {
    slug: "pam",
    stack: ["Java", "LDAP", "Kerberos", "Design patterns"],
    year: "",
    featured: false,
    repoUrl: "https://github.com/onurerguden/SE311_PAM",
  },
];
const translationSchema = z
  .object({
    title: z.string().min(1),
    summary: z.string().min(1),
    description: z.string().min(50).max(160).optional(),
    category: z.string().min(1),
    role: z.string().min(1).optional(),
    metricLabel: z.string().min(1).optional(),
    mediaAlt: z.array(z.string().min(1)).max(3).optional(),
  })
  .strict();

export function getProjects(
  locale: Locale,
  contentRoot = path.join(process.cwd(), "src/content"),
): Project[] {
  const summaries = JSON.parse(
    fs.readFileSync(path.join(contentRoot, locale, "projects.json"), "utf8"),
  ) as Record<string, unknown>;
  if (
    Object.keys(summaries).sort().join() !==
    projects
      .map((project) => project.slug)
      .sort()
      .join()
  )
    throw new Error(`Project parity failed: ${locale}`);
  return projects.map(({ metric, media, ...shared }) => {
    const copy = translationSchema.parse(summaries[shared.slug]);
    if ((media?.length ?? 0) !== (copy.mediaAlt?.length ?? 0))
      throw new Error(`Media alt text mismatch: ${locale}/${shared.slug}`);
    let body: string | undefined;
    if (shared.featured) {
      const parsed = matter(
        fs.readFileSync(
          path.join(contentRoot, locale, `${shared.slug}.mdx`),
          "utf8",
        ),
      );
      if (
        parsed.data.slug !== shared.slug ||
        parsed.data.locale !== locale ||
        !parsed.content.trim()
      )
        throw new Error(
          `Missing or mismatched case study: ${locale}/${shared.slug}`,
        );
      body = resolveMeasurements(parsed.content, locale);
    }
    if (metric && !copy.metricLabel)
      throw new Error(`Missing metric context: ${locale}/${shared.slug}`);
    if (shared.featured !== Boolean(copy.role))
      throw new Error(
        `Role belongs to case studies only: ${locale}/${shared.slug}`,
      );
    if (shared.featured !== Boolean(copy.description))
      throw new Error(
        `Search description belongs to case studies only: ${locale}/${shared.slug}`,
      );
    return projectSchema.parse({
      ...shared,
      title: copy.title,
      summary: copy.summary,
      description: copy.description,
      category: copy.category,
      role: copy.role,
      body,
      ...(metric
        ? {
            metric: {
              value: formatMeasurement(metric, locale),
              label: copy.metricLabel,
            },
          }
        : {}),
      ...(media
        ? {
            media: media.map((item, i) => ({
              ...item,
              alt: copy.mediaAlt![i],
            })),
          }
        : {}),
    });
  });
}

export function getProject(locale: Locale, slug: string): Project | undefined {
  return getProjects(locale).find((project) => project.slug === slug);
}

export function validateContent(contentRoot?: string): void {
  const localized = locales.map((locale) => getProjects(locale, contentRoot));
  const shared = (project: Project) =>
    JSON.stringify({
      slug: project.slug,
      stack: project.stack,
      year: project.year,
      featured: project.featured,
      repoUrl: project.repoUrl,
      // The value is one shared number, formatted per locale.
      metric: Boolean(project.metric),
      media: project.media?.map((item) => item.src),
    });
  if (localized[0].map(shared).join() !== localized[1].map(shared).join())
    throw new Error("Shared project facts differ across locales");
  // Case studies keep the same sections in both languages, so a heading's
  // anchor can be shared when the visitor switches language.
  localized[0].forEach((project, index) => {
    const other = localized[1][index];
    if (
      project.body &&
      caseHeadings(project.body).length !==
        caseHeadings(other.body ?? "").length
    )
      throw new Error(`Case study sections differ: ${project.slug}`);
  });
}

/** The level-two headings of a case study, in order. */
export function caseHeadings(body: string): string[] {
  return [...body.matchAll(/^## (.+)$/gm)].map((match) => match[1].trim());
}

/** A URL-safe id from English heading text. */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * A case study's sections in this language, with ids taken from the English
 * headings at the same position, so a heading's anchor survives switching
 * language (validateContent keeps the counts equal).
 */
export function caseSections(locale: Locale, slug: string) {
  const local = getProject(locale, slug)?.body;
  const english = getProject("en", slug)?.body;
  if (!local || !english) return [];
  const ids = caseHeadings(english).map(slugify);
  return caseHeadings(local).map((label, i) => ({ id: ids[i], label }));
}
