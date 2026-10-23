/**
 * The last significant editorial review of each portfolio page, shared by its
 * English and Turkish versions. Update a value only when that page's profile,
 * copy, evidence or metadata changes, never for a build, activity sync or deploy.
 * Unknown dates are omitted; these are page dates, not project/paper dates.
 */
const changes: Readonly<Record<string, string>> = Object.freeze({
  "": "2026-10-23T11:20:00Z",
  "/about": "2026-10-23T12:00:00Z",
  "/projects": "2026-10-23T14:00:00Z",
  "/research": "2026-10-22T15:47:00Z",
  "/projects/carbonpilot": "2026-10-23T14:00:00Z",
  "/projects/course-intelligence": "2026-10-13T12:41:00Z",
  "/projects/gymrap-ai-coach": "2026-10-13T12:41:00Z",
  "/projects/kuyumcum": "2026-10-13T12:41:00Z",
  "/projects/water-safety": "2026-10-13T12:41:00Z",
});

/** A recorded ISO 8601 DateTime, or no date when the edit is unknown. */
export function editorialModified(path: string): string | undefined {
  return Object.hasOwn(changes, path) ? changes[path] : undefined;
}
