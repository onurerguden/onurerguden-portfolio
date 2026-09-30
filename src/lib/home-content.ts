import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getProjects, locales, type Locale } from "./content";
import techIcons from "./tech-icons.generated.json";

/**
 * Home-page sections beyond the projects: technologies, services, experience
 * and certificates. Language-neutral facts live in `src/content/*.json`;
 * translated copy lives in `src/content/{en,tr}/*.json` and must match keys.
 */
const defaultRoot = () => path.join(process.cwd(), "src/content");
function read(root: string, ...parts: string[]): unknown {
  return JSON.parse(fs.readFileSync(path.join(root, ...parts), "utf8"));
}
function parity(
  name: string,
  locale: Locale,
  ids: readonly string[],
  copy: Record<string, unknown>,
) {
  if ([...ids].sort().join() !== Object.keys(copy).sort().join())
    throw new Error(`${name} parity failed: ${locale}`);
}
const id = z.string().regex(/^[a-z0-9-]+$/);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/* Technologies ----------------------------------------------------------- */

const techFileSchema = z
  .object({
    categories: z
      .array(
        z
          .object({
            id,
            label: z.object({ en: z.string().min(1), tr: z.string().min(1) }),
          })
          .strict(),
      )
      .min(1),
    items: z
      .array(
        z
          .object({
            id,
            name: z.string().min(1),
            category: id,
            icon: z.union([
              z.object({ simpleIcons: z.string().min(1) }).strict(),
              // Technologies without an official icon get lettering, never a
              // look-alike logo from another brand.
              z.object({ monogram: z.string().min(1).max(6) }).strict(),
            ]),
            ball: z.enum(["white", "yellow"]),
            priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            aboutLogo: z.boolean().optional(),
            evidence: z.array(id).optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type TechFile = z.infer<typeof techFileSchema>;
export type TechItem = TechFile["items"][number];
const iconSlugs = new Set(Object.keys(techIcons.icons));

export function readTechStack(root = defaultRoot()): TechFile {
  const data = techFileSchema.parse(read(root, "tech-stack.json"));
  const categories = new Set(data.categories.map((category) => category.id));
  const seen = new Set<string>();
  const projects = new Set(getProjects("en", root).map((p) => p.slug));
  for (const item of data.items) {
    if (seen.has(item.id)) throw new Error(`Duplicate technology: ${item.id}`);
    seen.add(item.id);
    if (!categories.has(item.category))
      throw new Error(`Unknown technology category: ${item.category}`);
    if ("simpleIcons" in item.icon && !iconSlugs.has(item.icon.simpleIcons))
      throw new Error(`Missing generated icon: ${item.icon.simpleIcons}`);
    for (const slug of item.evidence ?? [])
      if (!projects.has(slug))
        throw new Error(`Unknown technology evidence: ${item.id} → ${slug}`);
  }
  return data;
}

export function getTechStack(locale: Locale, root = defaultRoot()) {
  const data = readTechStack(root);
  return data.categories.map((category) => ({
    id: category.id,
    label: category.label[locale],
    items: data.items
      .filter((item) => item.category === category.id)
      .map(({ id: itemId, name }) => ({ id: itemId, name })),
  }));
}

/* Services --------------------------------------------------------------- */

const serviceSchema = z
  .object({
    id,
    proof: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("project"), slug: id }).strict(),
      z.object({ kind: z.literal("section"), id }).strict(),
    ]),
    tech: z.array(id).min(1),
  })
  .strict();
const serviceCopySchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    proofLabel: z.string().min(1),
  })
  .strict();
const serviceSections = new Set(["experience"]);

export type Service = {
  id: string;
  title: string;
  description: string;
  proofLabel: string;
  href: string;
  tech: string[];
};

export function getServices(locale: Locale, root = defaultRoot()): Service[] {
  const services = z
    .array(serviceSchema)
    .min(1)
    .parse(read(root, "services.json"));
  const copy = z
    .record(z.string(), serviceCopySchema)
    .parse(read(root, locale, "services.json"));
  parity(
    "Services",
    locale,
    services.map((service) => service.id),
    copy,
  );
  const projects = getProjects(locale, root);
  const tech = new Map(
    readTechStack(root).items.map((item) => [item.id, item.name]),
  );
  return services.map((service) => {
    let href: string;
    if (service.proof.kind === "project") {
      const slug = service.proof.slug;
      const project = projects.find((p) => p.slug === slug);
      if (!project) throw new Error(`Unknown service proof: ${slug}`);
      // Featured projects have a case study; archive entries are anchors.
      href = project.featured
        ? `/${locale}/projects/${slug}`
        : `/${locale}/projects#${slug}`;
    } else {
      if (!serviceSections.has(service.proof.id))
        throw new Error(`Unknown service section: ${service.proof.id}`);
      href = `#${service.proof.id}`;
    }
    return {
      id: service.id,
      ...copy[service.id],
      href,
      tech: service.tech.map((techId) => {
        const name = tech.get(techId);
        if (!name) throw new Error(`Unknown service technology: ${techId}`);
        return name;
      }),
    };
  });
}

/* Experience ------------------------------------------------------------- */

const experienceSchema = z
  .object({
    id,
    company: z.string().min(1),
    start: month,
    end: month.nullable(),
  })
  .strict();
const experienceCopySchema = z
  .object({ role: z.string().min(1), description: z.string().min(1) })
  .strict();

export type Experience = {
  id: string;
  company: string;
  role: string;
  description: string;
  start: string;
  end: string | null;
  period: string;
};

function formatMonth(value: string, locale: Locale, year: boolean) {
  const [y, m] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    month: "short",
    ...(year ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
export function formatPeriod(
  start: string,
  end: string | null,
  locale: Locale,
) {
  const present = locale === "tr" ? "devam" : "present";
  if (!end) return `${formatMonth(start, locale, true)} — ${present}`;
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatMonth(start, locale, !sameYear)} — ${formatMonth(end, locale, true)}`;
}

export function getExperience(
  locale: Locale,
  root = defaultRoot(),
): Experience[] {
  const entries = z
    .array(experienceSchema)
    .min(1)
    .parse(read(root, "experience.json"));
  const copy = z
    .record(z.string(), experienceCopySchema)
    .parse(read(root, locale, "experience.json"));
  parity(
    "Experience",
    locale,
    entries.map((entry) => entry.id),
    copy,
  );
  return entries.map((entry) => ({
    ...entry,
    ...copy[entry.id],
    period: formatPeriod(entry.start, entry.end, locale),
  }));
}

/* Certificates ----------------------------------------------------------- */

const certificateSchema = z
  .object({
    id,
    issuer: z.string().min(1),
    issued: month,
    credentialUrl: z.url({ protocol: /^https$/ }).optional(),
    image: z
      .object({
        src: z.string().regex(/^\/images\/certificates\/[a-z0-9-]+\.webp$/),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict(),
    // Every image is checked for ID numbers, birth dates and signatures first.
    personalDataReviewed: z.literal(true),
    order: z.number().int(),
  })
  .strict();
const certificateCopySchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    alt: z.string().min(1),
  })
  .strict();

export type Certificate = z.infer<typeof certificateSchema> &
  z.infer<typeof certificateCopySchema> & { issuedLabel: string };

export function getCertificates(
  locale: Locale,
  root = defaultRoot(),
): Certificate[] {
  const entries = z
    .array(certificateSchema)
    .parse(read(root, "certificates.json"));
  const copy = z
    .record(z.string(), certificateCopySchema)
    .parse(read(root, locale, "certificates.json"));
  parity(
    "Certificate",
    locale,
    entries.map((entry) => entry.id),
    copy,
  );
  return entries
    .toSorted((a, b) => a.order - b.order)
    .map((entry) => ({
      ...entry,
      ...copy[entry.id],
      issuedLabel: formatMonth(entry.issued, locale, true),
    }));
}

/** Loads every home section in both locales so any drift fails the build. */
export function validateHomeContent(root?: string): void {
  for (const locale of locales) {
    getTechStack(locale, root);
    getServices(locale, root);
    getExperience(locale, root);
    getCertificates(locale, root);
    getAbout(locale, root);
  }
}

/* About ------------------------------------------------------------------ */

const aboutSchema = z
  .object({ paragraphs: z.array(z.string().min(1)).min(1).max(4) })
  .strict();

export function getAbout(locale: Locale, root = defaultRoot()) {
  const about = aboutSchema.parse(read(root, locale, "about.json"));
  const other = aboutSchema.parse(
    read(root, locale === "en" ? "tr" : "en", "about.json"),
  );
  if (about.paragraphs.length !== other.paragraphs.length)
    throw new Error(`About parity failed: ${locale}`);
  return about;
}
