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
  category: z.string().min(1),
  stack: z.array(z.string().min(1)).min(1),
  year: z.string(),
  featured: z.boolean(),
  repoUrl: z.url().optional(),
  metric: z.object({ value: z.string(), label: z.string() }).optional(),
  body: z.string().optional(),
});
export type Project = z.infer<typeof projectSchema>;

export const sharedFacts = {
  name: "Onur Ergüden",
  email: "onurerguden5@gmail.com",
  github: "https://github.com/onurerguden",
  linkedin: "https://www.linkedin.com/in/onurerguden/",
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

const measurements = {
  waterRecords: { value: 30000, percent: false },
  waterRecall: { value: 0.963, percent: true },
  waterForecast: { value: 0.8, percent: true },
  waterScenarios: { value: 3000, percent: false },
  ragAccuracy: { value: 1, percent: true },
} as const;
function resolveMeasurements(body: string, locale: Locale) {
  return body.replace(/\[\[metric:([a-zA-Z]+)\]\]/g, (_, key: string) => {
    if (!(key in measurements)) throw new Error(`Unknown measurement: ${key}`);
    const metric = measurements[key as keyof typeof measurements];
    return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
      style: metric.percent ? "percent" : "decimal",
      maximumFractionDigits: 1,
    }).format(metric.value);
  });
}

type SharedProject = Pick<
  Project,
  "slug" | "stack" | "year" | "featured" | "repoUrl"
> & { metricValue?: string };
const projects: SharedProject[] = [
  {
    slug: "kuyumcum",
    stack: ["Flutter", "Dart", "Firebase", "Python", "TensorFlow", "Gemini"],
    year: "",
    featured: true,
  },
  {
    slug: "water-safety",
    stack: ["Python", "SVM", "Extra Trees", "Feature engineering"],
    year: "",
    featured: true,
    repoUrl: "https://github.com/onurerguden/izsu_ai_project",
    metricValue: "96.3%",
  },
  {
    slug: "course-intelligence",
    stack: ["Llama 3.1", "SBERT", "FAISS", "PyQt6"],
    year: "",
    featured: true,
    repoUrl: "https://github.com/onurerguden/IEU-Chat-Bot",
  },
  {
    slug: "taskfoo",
    stack: ["Spring Boot", "React", "TypeScript", "PostgreSQL", "Docker"],
    year: "2025",
    featured: false,
    repoUrl: "https://github.com/onurerguden/TaskFoo",
  },
  {
    slug: "urban-mobility",
    stack: ["Python", "XGBoost", "Random Forest", "DBSCAN"],
    year: "",
    featured: false,
    repoUrl: "https://github.com/onurerguden/IZMIR-PUBLIC-TRANSPORTATION-ML",
    metricValue: "5.77%",
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
    category: z.string().min(1),
    metricLabel: z.string().min(1).optional(),
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
  return projects.map(({ metricValue, ...shared }) => {
    const copy = translationSchema.parse(summaries[shared.slug]);
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
    if (metricValue && !copy.metricLabel)
      throw new Error(`Missing metric context: ${locale}/${shared.slug}`);
    return projectSchema.parse({
      ...shared,
      title: copy.title,
      summary: copy.summary,
      category: copy.category,
      body,
      ...(metricValue
        ? { metric: { value: metricValue, label: copy.metricLabel } }
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
      metric: project.metric?.value,
    });
  if (localized[0].map(shared).join() !== localized[1].map(shared).join())
    throw new Error("Shared project facts differ across locales");
}
