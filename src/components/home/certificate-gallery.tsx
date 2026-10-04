"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { useMotionPreference } from "@/lib/motion-preference";
import styles from "./certificates.module.css";

export type CertificateCard = {
  id: string;
  title: string;
  issuer: string;
  issuedLabel: string;
  issued: string;
  description?: string;
  alt: string;
  credentialUrl?: string;
  image: { src: string; width: number; height: number };
};

export default function CertificateGallery({
  items,
  locale,
}: {
  items: CertificateCard[];
  locale: "en" | "tr";
}) {
  const en = locale === "en";
  const { paused, reduced, hydrated } = useMotionPreference();
  const still = !hydrated || paused || reduced;
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(0);
  const show = (index: number, button: HTMLButtonElement) => {
    opener.current = button;
    setOpen(index);
    dialog.current?.showModal();
  };
  const current = items[open];
  const step = (delta: number) =>
    setOpen((index) => (index + delta + items.length) % items.length);
  return (
    <>
      <ul className={styles.grid} data-motion-still={still}>
        {items.map((item, index) => (
          <li key={item.id} className={styles.item}>
            <button
              type="button"
              className={styles.card}
              onClick={(event) => show(index, event.currentTarget)}
              aria-haspopup="dialog"
              aria-describedby={
                item.description
                  ? `certificate-${item.id}-description`
                  : undefined
              }
            >
              <span className={styles.stack} data-certificate-stack>
                <span className={styles.layers}>
                  {/* Blank backing sheets add depth, without implying more credentials. */}
                  <span
                    className={`${styles.sheet} ${styles.rear}`}
                    data-certificate-sheet="rear"
                    aria-hidden="true"
                  />
                  <span
                    className={`${styles.sheet} ${styles.middle}`}
                    data-certificate-sheet="middle"
                    aria-hidden="true"
                  />
                  <span
                    className={`${styles.sheet} ${styles.front}`}
                    data-certificate-sheet="front"
                  >
                    {/* The title names the button; the lightbox carries the alt text. */}
                    <Image
                      src={item.image.src}
                      alt=""
                      width={item.image.width}
                      height={item.image.height}
                      sizes="(min-width: 1467px) 371px, (min-width: 1100px) calc(30vw - 70px), (min-width: 700px) calc(45vw - 62px), (min-width: 534px) 432px, calc(90vw - 48px)"
                    />
                  </span>
                </span>
              </span>
              <span className={styles.meta} data-certificate-meta>
                <strong>{item.title}</strong>
                <span>
                  {item.issuer} ·{" "}
                  <time dateTime={item.issued}>{item.issuedLabel}</time>
                </span>
              </span>
            </button>
            {item.description ? (
              <p
                id={`certificate-${item.id}-description`}
                className={styles.description}
              >
                {item.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="certificate-title"
        onClose={() => opener.current?.focus()}
        onClick={(event) => {
          // A click on the backdrop (the dialog box itself) closes it.
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step(1);
          if (event.key === "ArrowLeft") step(-1);
        }}
      >
        {current ? (
          <div className={styles.dialogBody}>
            <Image
              src={current.image.src}
              alt={current.alt}
              width={current.image.width}
              height={current.image.height}
              sizes="(max-width: 900px) 92vw, 900px"
            />
            <div className={styles.dialogText}>
              <h3 id="certificate-title">{current.title}</h3>
              <p>
                {current.issuer} ·{" "}
                <time dateTime={current.issued}>{current.issuedLabel}</time>
              </p>
              {current.description ? <p>{current.description}</p> : null}
              <div className={styles.dialogActions}>
                <a
                  href={current.image.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={
                    en
                      ? "Open full-size image (opens in a new tab)"
                      : "Tam boy görseli aç (yeni sekmede açılır)"
                  }
                >
                  {en ? "Open full-size image" : "Tam boy görseli aç"}
                  <span aria-hidden="true"> ↗</span>
                </a>
                {current.credentialUrl ? (
                  <a href={current.credentialUrl}>
                    {en ? "Verify credential" : "Belgeyi doğrula"}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                ) : null}
                {items.length > 1 ? (
                  <>
                    <button type="button" onClick={() => step(-1)}>
                      {en ? "Previous" : "Önceki"}
                    </button>
                    <button type="button" onClick={() => step(1)}>
                      {en ? "Next" : "Sonraki"}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => dialog.current?.close()}
                  autoFocus
                >
                  {en ? "Close" : "Kapat"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
