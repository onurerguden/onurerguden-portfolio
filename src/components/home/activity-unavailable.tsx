import styles from "./activity.module.css";

/** Public repositories worth opening while live activity is unavailable. */
const featured = [
  {
    name: "GymRap-AI-Coach",
    href: "https://github.com/onurerguden/GymRap-AI-Coach",
    en: "MCP server and AI coach on Cloudflare",
    tr: "Cloudflare üzerinde MCP sunucusu ve AI koç",
  },
  {
    name: "CarbonPilot AI",
    href: "https://github.com/fatmanurdurmus/YZTA-BOOTCAMP-GRUP-9",
    en: "Guarded LangGraph agent (team project)",
    tr: "Korumalı LangGraph ajanı (ekip projesi)",
  },
  {
    name: "IEU-Chat-Bot",
    href: "https://github.com/onurerguden/IEU-Chat-Bot",
    en: "Course Intelligence RAG",
    tr: "Course Intelligence RAG",
  },
  {
    name: "izsu_ai_project",
    href: "https://github.com/onurerguden/izsu_ai_project",
    en: "HealthFactor-AI water safety",
    tr: "HealthFactor-AI su güvenliği",
  },
] as const;

/** Said instead of numbers whenever live activity can't be shown. */
export default function ActivityUnavailable({
  locale,
  profile,
}: {
  locale: "en" | "tr";
  profile: string;
}) {
  const en = locale === "en";
  return (
    <div className={styles.unavailable}>
      <p>
        {en
          ? "Live GitHub activity is unavailable right now. "
          : "Canlı GitHub aktivitesi şu anda kullanılamıyor. "}
        <a href={profile}>
          {en ? "See my profile on GitHub" : "GitHub profilime bak"}
          <span aria-hidden="true"> ↗</span>
        </a>
      </p>
      <h3 className={styles.subhead}>
        {en ? "Featured repositories" : "Öne çıkan depolar"}
      </h3>
      <ul className={styles.featured}>
        {featured.map((repo) => (
          <li key={repo.name}>
            <a href={repo.href}>
              <span className={styles.repo}>{repo.name}</span>
              <span className={styles.action}>{repo[locale]}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
