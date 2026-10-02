import type { CSSProperties } from "react";
import GiantTitle from "@/components/giant-title";
import { sharedFacts, type Locale } from "@/lib/content";
import {
  getCertificates,
  getTechStack,
  readTechStack,
} from "@/lib/home-content";
import { homeSectionLinks } from "@/lib/home-sections";
import { cvLink } from "@/lib/site";
import { blissSrcSet, layerBox, type BlissLayer } from "@/lib/bliss-geometry";
import XpBalls from "./xp-balls";
import XpDrop from "./xp-drop";
import XpExplorer from "./xp-explorer";
import XpTaskbar from "./xp-taskbar";
import type { BallItem } from "./tech-atlas";
import styles from "./xp.module.css";

const SIZES = "(max-width: 700px) 100vw, 1280px";

function Layer({ layer }: { layer: BlissLayer }) {
  return (
    <picture
      className={`${styles.layer} ${styles[layer]}`}
      style={layerBox(layer) as CSSProperties}
    >
      <source
        type="image/avif"
        srcSet={blissSrcSet(layer, "avif")}
        sizes={SIZES}
      />
      <img
        srcSet={blissSrcSet(layer, "webp")}
        sizes={SIZES}
        alt=""
        loading="lazy"
        decoding="async"
        fetchPriority="low"
      />
    </picture>
  );
}

/**
 * My tech stack as a Windows XP desktop on the original Bliss wallpaper.
 * On the MacBook the photo is split into sky, hill and foreground layers
 * with the balls between them, and an Explorer window rises with the full
 * list. In the page (static view, reduced motion, no JavaScript) it is the
 * original photograph with the same dialog, taskbar and list.
 */
export default function XpDesktop({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const categories = getTechStack(locale);
  const entries = new Map(
    categories.flatMap((category) =>
      category.items.map((item) => [item.id, { item, category }] as const),
    ),
  );
  const balls: BallItem[] = readTechStack()
    .items.filter((item) => item.priority <= 2)
    .map(({ id, name, icon, ball, priority }) => ({
      id,
      name,
      icon,
      ball,
      priority,
      category: entries.get(id)!.category.label,
      evidence: entries.get(id)!.item.evidence,
    }));
  const cv = cvLink(locale, sharedFacts.email);
  return (
    <div className={styles.desktop} data-xp>
      <div className={styles.frame}>
        <Layer layer="sky" />
        <Layer layer="hill" />
        <XpBalls items={balls} locale={locale} />
        <Layer layer="foreground" />
        <picture className={styles.original}>
          <source
            type="image/avif"
            srcSet={blissSrcSet("original", "avif")}
            sizes={SIZES}
          />
          <img
            srcSet={blissSrcSet("original", "webp")}
            sizes={SIZES}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
      <div className={styles.head}>
        <div className={styles.window} data-no-physics>
          <div className={styles.titlebar}>
            <span>my_tech_stack.exe</span>
            <span className={styles.controls}>
              <span className={styles.minimize} aria-hidden="true" />
              <span className={styles.maximize} aria-hidden="true" />
              <span className={styles.close} aria-hidden="true" />
              <XpDrop
                label={en ? "Drop the balls again" : "Topları yeniden düşür"}
              />
            </span>
          </div>
          <p className={styles.withBalls}>
            {en
              ? "Every ball is a tool from my own projects. Hover over one to see which."
              : "Her top kendi projelerimde kullandığım bir araç. Üzerine gel, hangisi olduğunu gör."}
          </p>
          <p className={styles.withoutBalls}>
            {en
              ? "Every tool here comes from my own projects; the list says where."
              : "Buradaki her araç kendi projelerimden; listede nerede kullandığım yazıyor."}
          </p>
        </div>
        <GiantTitle
          id="stack-title"
          text={en ? "My tech stack" : "Teknolojilerim"}
          locale={locale}
          fill={80}
          max={176}
          className={styles.title}
        />
      </div>
      <XpExplorer locale={locale} categories={categories} />
      <div className={styles.overlay} data-xp-overlay />
      <XpTaskbar
        locale={locale}
        sections={homeSectionLinks(locale, {
          certificates: getCertificates(locale).length > 0,
        })}
        links={[
          { label: "GitHub", href: sharedFacts.github },
          { label: "LinkedIn", href: sharedFacts.linkedin },
          {
            label: en ? "Email" : "E-posta",
            href: `mailto:${sharedFacts.email}`,
          },
          { label: cv.label, href: cv.href },
        ]}
      />
    </div>
  );
}
