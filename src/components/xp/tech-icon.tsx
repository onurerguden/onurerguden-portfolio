import techIcons from "@/lib/tech-icons.generated.json";
import type { TechEntry } from "@/lib/home-content";
import { staticAsset } from "@/lib/static-asset-urls";
import { logoColor } from "./logo-color";
import styles from "./xp.module.css";

const icons = techIcons.icons as Record<string, { path: string; hex: string }>;

const sprite = staticAsset("images/tech/icons.svg");

/**
 * A technology's logo from the generated Simple Icons sprite, or its
 * monogram where there is no official mark. The paths stay in the sprite,
 * one cached file, instead of in every page's HTML and RSC payload, where
 * they were over half of the home page's compressed bytes.
 */
export default function TechIcon({
  item,
}: {
  item: Pick<TechEntry, "icon" | "name">;
}) {
  const slug = "simpleIcons" in item.icon ? item.icon.simpleIcons : null;
  if (!slug || !icons[slug])
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
      <use href={`${sprite}#${slug}`} />
    </svg>
  );
}
