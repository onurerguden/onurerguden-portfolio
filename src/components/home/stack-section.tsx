import type { CSSProperties } from "react";
import GiantTitle from "@/components/giant-title";
import { sharedFacts, type Locale } from "@/lib/content";
import { getTechStack, readTechStack } from "@/lib/home-content";
import { homeSectionLinks } from "@/lib/home-sections";
import { blissSrcSet, layerBox, type BlissLayer } from "@/lib/bliss-geometry";
import StackBalls from "./stack-balls";
import StackParallax from "./stack-parallax";
import XpToss from "./xp-toss";
import XpTaskbar from "./xp-taskbar";
import styles from "./stack.module.css";

const SIZES = "(max-aspect-ratio: 8/5) 160vh, 100vw";

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
 * The tech stack on the original Bliss wallpaper. The photo is split into
 * sky, hill and foreground layers that separate slightly as the section
 * scrolls; the balls (added separately) land on the hill between them.
 */
export default function StackSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const categories = getTechStack(locale);
  const balls = readTechStack().items.map(
    ({ id, name, icon, ball, priority }) => ({
      id,
      name,
      icon,
      ball,
      priority,
    }),
  );
  const count = categories.reduce((sum, c) => sum + c.items.length, 0);
  return (
    <section
      id="stack"
      className={`${styles.section} bleed`}
      aria-labelledby="stack-title"
    >
      <StackParallax>
        <div className={styles.stage} data-stack-stage>
          <div className={styles.frame}>
            <Layer layer="sky" />
            <Layer layer="hill" />
            <div className={styles.balls}>
              <StackBalls items={balls} />
            </div>
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
                  <XpToss label={en ? "Toss the balls" : "Topları fırlat"} />
                </span>
              </div>
              <p>
                {en
                  ? "Every ball is a tool from my own projects. Push them around, then scroll on."
                  : "Her top kendi projelerimde kullandığım bir araç. Onları itip kaydırmaya devam et."}
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
          <XpTaskbar
            locale={locale}
            sections={homeSectionLinks(locale)}
            links={[
              { label: "GitHub", href: sharedFacts.github },
              { label: "LinkedIn", href: sharedFacts.linkedin },
            ]}
          />
        </div>
      </StackParallax>
      <div className={styles.listWindow}>
        <h3 className={styles.listTitle}>
          {en ? `All technologies (${count})` : `Tüm teknolojiler (${count})`}
        </h3>
        <div className={styles.groups}>
          {categories.map((category) => (
            <div key={category.id}>
              <h4>{category.label}</h4>
              <ul>
                {category.items.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
