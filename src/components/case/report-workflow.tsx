import Image from "next/image";
import styles from "./case.module.css";

import {
  reportWorkflow as copy,
  reportWorkflowSrc as src,
} from "@/lib/report-workflow";

/**
 * The Kuyumcum team's report workflow chart, published with their approval,
 * with a text equivalent for screen readers and for phones, where the chart's
 * labels are too small to read.
 */
export default function ReportWorkflow({ locale }: { locale: "en" | "tr" }) {
  const text = copy[locale];
  return (
    <figure className={styles.workflow}>
      <Image
        src={src}
        alt={text.alt}
        width={1800}
        height={2800}
        sizes="(max-width: 900px) 92vw, 680px"
      />
      <figcaption>
        {text.caption} <a href={src}>{text.open}</a>
      </figcaption>
      <details>
        <summary>{text.summary}</summary>
        <ol>
          {text.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
