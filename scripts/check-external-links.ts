import { getProjects, sharedFacts } from "../src/lib/content";
async function main() {
  const urls = new Set([
    sharedFacts.github,
    sharedFacts.linkedin,
    ...getProjects("en").flatMap((project) =>
      project.repoUrl ? [project.repoUrl] : [],
    ),
  ]);
  let broken = false;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      });
      const status = response.status;
      const kind =
        status === 404 || status === 410
          ? "broken"
          : status >= 400
            ? "blocked-or-transient"
            : "ok";
      if (kind === "broken") broken = true;
      console.log(JSON.stringify({ url, status, kind }));
    } catch {
      console.log(JSON.stringify({ url, kind: "unavailable" }));
    }
  }
  process.exitCode = broken ? 1 : 0;
}
void main();
