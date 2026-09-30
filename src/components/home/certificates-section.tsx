import GiantTitle from "@/components/giant-title";
import type { Locale } from "@/lib/content";
import { getCertificates } from "@/lib/home-content";
import CertificateGallery from "./certificate-gallery";
import styles from "./certificates.module.css";

/** Selected certificates; the section does not exist until one is added. */
export default function CertificatesSection({ locale }: { locale: Locale }) {
  const items = getCertificates(locale);
  if (!items.length) return null;
  const en = locale === "en";
  return (
    <section
      id="certificates"
      className={`${styles.section} bleed`}
      aria-labelledby="certificates-title"
    >
      <div className={styles.inner}>
        <GiantTitle
          id="certificates-title"
          text={en ? "Certificates" : "Sertifikalar"}
          locale={locale}
          fill={80}
          max={176}
        />
        <CertificateGallery
          locale={locale}
          items={items.map((item) => ({
            id: item.id,
            title: item.title,
            issuer: item.issuer,
            issued: item.issued,
            issuedLabel: item.issuedLabel,
            description: item.description,
            alt: item.alt,
            credentialUrl: item.credentialUrl,
            image: item.image,
          }))}
        />
      </div>
    </section>
  );
}
