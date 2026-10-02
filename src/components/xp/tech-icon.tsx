import techIcons from "@/lib/tech-icons.generated.json";
import type { TechEntry } from "@/lib/home-content";
import { logoColor } from "./logo-color";
import styles from "./xp.module.css";

const icons = techIcons.icons as Record<string, { path: string; hex: string }>;

/**
 * A technology's logo as inline SVG from the generated Simple Icons paths,
 * or its monogram where there is no official mark. Rendered on the server,
 * so the paths never reach the client bundle.
 */
export default function TechIcon({
  item,
}: {
  item: Pick<TechEntry, "icon" | "name">;
}) {
  const icon = "simpleIcons" in item.icon ? icons[item.icon.simpleIcons] : null;
  if (!icon)
    return (
      <span className={styles.monogram} aria-hidden="true">
        {("monogram" in item.icon ? item.icon.monogram : item.name).charAt(0)}
      </span>
    );
  return (
    <svg
      className={styles.techIcon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={logoColor({ ball: "white", icon: item.icon })}
    >
      <path d={icon.path} />
    </svg>
  );
}
