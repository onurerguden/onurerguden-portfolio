import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getProjects, locales, type Locale, type Project } from "./content";
import { homeSectionIds } from "./home-sections";
import { siteRepository } from "./site";
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

/* Evidence --------------------------------------------------------------- */

/**
 * Where a claim can be checked: a project, a role, a home section or this
 * site's own public source. Services, roles and technologies share it.
 */
const proofSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("project"), slug: id }).strict(),
  z.object({ kind: z.literal("experience"), id }).strict(),
  z.object({ kind: z.literal("section"), id }).strict(),
  z.object({ kind: z.literal("site") }).strict(),
]);
export type Proof = z.infer<typeof proofSchema>;
export type ProofLink = {
  kind: Proof["kind"];
  href: string;
  label: string;
  /** Leaves the site (the public repository). */
  external: boolean;
};

type ProofContext = {
  locale: Locale;
  projects: Project[];
  experience: { id: string; company: string }[];
};

function resolveProof(proof: Proof, context: ProofContext): ProofLink {
  const { locale } = context;
  switch (proof.kind) {
    case "project": {
      const project = context.projects.find((p) => p.slug === proof.slug);
      if (!project) throw new Error(`Unknown proof project: ${proof.slug}`);
      // Featured projects have a case study; archive entries are anchors.
      return {
        kind: "project",
        href: project.featured
          ? `/${locale}/projects/${project.slug}`
          : `/${locale}/projects#${project.slug}`,
        label: project.title,
        external: false,
      };
    }
    case "experience": {
      const role = context.experience.find((entry) => entry.id === proof.id);
      if (!role) throw new Error(`Unknown proof role: ${proof.id}`);
      return {
        kind: "experience",
        href: "#experience",
        label: role.company,
        external: false,
      };
    }
    case "section": {
      if (!homeSectionIds.some((section) => section === proof.id))
        throw new Error(`Unknown proof section: ${proof.id}`);
      return {
        kind: "section",
        href: `#${proof.id}`,
        label: proof.id,
        external: false,
      };
    }
    case "site":
      return {
        kind: "site",
        href: siteRepository,
        label: locale === "en" ? "This site" : "Bu site",
        external: true,
      };
  }
}

function proofContext(locale: Locale, root: string): ProofContext {
  return {
    locale,
    projects: getProjects(locale, root),
    experience: readExperience(root),
  };
}

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
            evidence: z.array(proofSchema).optional(),
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
  const context = proofContext("en", root);
  for (const item of data.items) {
    if (seen.has(item.id)) throw new Error(`Duplicate technology: ${item.id}`);
    seen.add(item.id);
    if (!categories.has(item.category))
      throw new Error(`Unknown technology category: ${item.category}`);
    if ("simpleIcons" in item.icon && !iconSlugs.has(item.icon.simpleIcons))
      throw new Error(`Missing generated icon: ${item.icon.simpleIcons}`);
    for (const proof of item.evidence ?? []) {
      if (proof.kind === "section")
        throw new Error(`Technology evidence cannot be a section: ${item.id}`);
      try {
        resolveProof(proof, context);
      } catch {
        throw new Error(`Unknown technology evidence: ${item.id}`);
      }
    }
  }
  return data;
}

export type TechEntry = {
  id: string;
  name: string;
  icon: TechItem["icon"];
  evidence: ProofLink[];
};

export function getTechStack(locale: Locale, root = defaultRoot()) {
  const data = readTechStack(root);
  const context = proofContext(locale, root);
  return data.categories.map((category) => ({
    id: category.id,
    label: category.label[locale],
    items: data.items
      .filter((item) => item.category === category.id)
      .map((item): TechEntry => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        evidence: (item.evidence ?? []).map((proof) =>
          resolveProof(proof, context),
        ),
      })),
  }));
}

/* Services --------------------------------------------------------------- */

const serviceSchema = z
  .object({
    id,
    proof: proofSchema,
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
  const context = proofContext(locale, root);
  const tech = techNames(root);
  return services.map((service) => {
    let href: string;
    try {
      href = resolveProof(service.proof, context).href;
    } catch {
      throw new Error(`Unknown service proof: ${service.id}`);
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

/** Technology names by id, read without resolving their evidence. */
function techNames(root: string) {
  const data = techFileSchema.parse(read(root, "tech-stack.json"));
  return new Map(data.items.map((item) => [item.id, item.name]));
}

/* Experience ------------------------------------------------------------- */

const experienceSchema = z
  .object({
    id,
    company: z.string().min(1),
    start: month,
    end: month.nullable(),
    /** Technology ids from tech-stack.json. */
    tools: z.array(id).optional(),
    proof: proofSchema.optional(),
  })
  .strict();
const experienceCopySchema = z
  .object({
    role: z.string().min(1),
    /** One to three contributions, written from verified sources only. */
    highlights: z.array(z.string().min(1)).min(1).max(3),
    /** The link text for the role's proof, when it has one. */
    proofLabel: z.string().min(1).optional(),
  })
  .strict();

export type Experience = {
  id: string;
  company: string;
  role: string;
  highlights: string[];
  tools: string[];
  proof: (ProofLink & { action: string }) | null;
  start: string;
  end: string | null;
  period: string;
};

function readExperience(root: string) {
  return z.array(experienceSchema).min(1).parse(read(root, "experience.json"));
}

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
  const entries = readExperience(root);
  const copy = z
    .record(z.string(), experienceCopySchema)
    .parse(read(root, locale, "experience.json"));
  parity(
    "Experience",
    locale,
    entries.map((entry) => entry.id),
    copy,
  );
  const tech = techNames(root);
  const context = proofContext(locale, root);
  return entries.map((entry) => {
    const proof = entry.proof ? resolveProof(entry.proof, context) : null;
    const action = copy[entry.id].proofLabel;
    if (Boolean(proof) !== Boolean(action))
      throw new Error(`Experience proof and its label differ: ${entry.id}`);
    return {
      id: entry.id,
      company: entry.company,
      role: copy[entry.id].role,
      highlights: copy[entry.id].highlights,
      tools: (entry.tools ?? []).map((techId) => {
        const name = tech.get(techId);
        if (!name) throw new Error(`Unknown experience tool: ${techId}`);
        return name;
      }),
      proof: proof && action ? { ...proof, action } : null,
      start: entry.start,
      end: entry.end,
      period: formatPeriod(entry.start, entry.end, locale),
    };
  });
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
  // Each role lists the same number of contributions in both languages.
  const [en, tr] = locales.map((locale) => getExperience(locale, root));
  en.forEach((entry, index) => {
    if (entry.highlights.length !== tr[index].highlights.length)
      throw new Error(`Experience highlight parity failed: ${entry.id}`);
  });
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
