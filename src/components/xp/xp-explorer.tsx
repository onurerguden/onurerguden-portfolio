import type { getTechStack } from "@/lib/home-content";
import TechIcon from "./tech-icon";
import styles from "./xp.module.css";

/**
 * "All technologies" as an XP Explorer window in Details view, grouped by
 * category. Each row says where the technology can be checked: a project, a
 * role or this site's source. Tools without a public example say nothing.
 */
export default function XpExplorer({
  locale,
  categories,
}: {
  locale: "en" | "tr";
  categories: ReturnType<typeof getTechStack>;
}) {
  const en = locale === "en";
  const count = categories.reduce((sum, c) => sum + c.items.length, 0);
  return (
    <div className={styles.explorer} data-explorer data-no-physics>
      <div className={styles.titlebar}>
        <h3 className={styles.explorerTitle}>
          <span className={styles.folder} aria-hidden="true" />
          {en ? `All technologies (${count})` : `Tüm teknolojiler (${count})`}
        </h3>
        <span className={styles.controls} aria-hidden="true">
          <span className={styles.minimize} />
          <span className={styles.maximize} />
          <span className={styles.close} />
        </span>
      </div>
      <div className={styles.address} aria-hidden="true">
        <span>{en ? "Address" : "Adres"}</span>
        <span className={styles.path}>
          {en ? "C:\\Onur\\Tech stack" : "C:\\Onur\\Teknolojiler"}
        </span>
      </div>
      <div className={styles.explorerBody} data-explorer-body>
        <div className={styles.explorerList} data-explorer-list>
          <div className={styles.columns} aria-hidden="true">
            <span>{en ? "Name" : "Ad"}</span>
            <span>{en ? "Used in" : "Kullanıldığı yer"}</span>
          </div>
          {categories.map((category) => (
            <div className={styles.group} key={category.id}>
              <h4>{category.label}</h4>
              <ul>
                {category.items.map((item) => (
                  <li key={item.id} className={styles.entry}>
                    <span className={styles.entryIcon}>
                      <TechIcon item={item} />
                    </span>
                    <span className={styles.entryName}>{item.name}</span>
                    {item.evidence.length ? (
                      <span className={styles.used}>
                        <span className="visually-hidden">
                          {en ? "Used in: " : "Kullanıldığı yer: "}
                        </span>
                        {item.evidence.map((proof, i) => (
                          <span key={proof.href}>
                            {i ? ", " : null}
                            <a href={proof.href}>
                              {proof.label}
                              {proof.external ? (
                                <span aria-hidden="true"> ↗</span>
                              ) : null}
                            </a>
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.status} aria-hidden="true">
        {en ? `${count} objects` : `${count} nesne`}
      </div>
    </div>
  );
}
