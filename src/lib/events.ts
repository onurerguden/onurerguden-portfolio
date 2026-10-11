import { z } from "zod";
import projects from "@/content/en/projects.json";
import { homeSectionIds } from "./home-sections";

/**
 * The conversion events the site counts, and every value a property may
 * take. Anything else is dropped, so the store only ever holds these few
 * counters per day (src/app/api/event/route.ts). No identifier, address or
 * free text is ever sent.
 */
export const eventLocations = [
  ...homeSectionIds,
  "footer",
  "desk",
  "case",
  "research",
  "archive",
  "page",
] as const;
const location = z.enum(eventLocations);
const slug = z.enum(Object.keys(projects) as [string, ...string[]]);

export const eventSchema = z.discriminatedUnion("name", [
  z.object({ name: z.literal("email_click"), location }).strict(),
  z.object({ name: z.literal("cv_request"), location }).strict(),
  z.object({ name: z.literal("email_copy"), location }).strict(),
  z.object({ name: z.literal("linkedin_click"), location }).strict(),
  z.object({ name: z.literal("github_click"), location }).strict(),
  z.object({ name: z.literal("source_click"), project: slug }).strict(),
  z
    .object({ name: z.literal("language_switch"), to: z.enum(["en", "tr"]) })
    .strict(),
  z.object({ name: z.literal("case_study_read"), project: slug }).strict(),
]);
export type SiteEvent = z.infer<typeof eventSchema>;
export type EventLocation = (typeof eventLocations)[number];

/** One hash field per event and property value, e.g. `email_click:contact`. */
export const eventField = (event: SiteEvent) =>
  `${event.name}:${Object.entries(event)
    .filter(([key]) => key !== "name")
    .map(([, value]) => value)
    .join(":")}`;
