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

/** Tilt and foil follow a fine pointer; nothing animates at rest. */
function tilt(event: React.PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse") return;
  const node = event.currentTarget;
  const rect = node.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  node.style.setProperty("--px", x.toFixed(3));
  node.style.setProperty("--py", y.toFixed(3));
  node.style.setProperty("--ry", `${((x - 0.5) * 16).toFixed(2)}deg`);
  node.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
  node.dataset.tilting = "true";
}
function rest(event: React.PointerEvent<HTMLElement>) {
  const node = event.currentTarget;
  node.dataset.tilting = "false";
  node.style.setProperty("--rx", "0deg");
  node.style.setProperty("--ry", "0deg");
}

export default function CertificateGallery({
  items,
  locale,
}: {
  items: CertificateCard[];
  locale: "en" | "tr";
}) {
  const en = locale === "en";
  const { paused, reduced } = useMotionPreference();
  const still = paused || reduced;
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
      <ul className={styles.grid}>
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.card}
              onPointerMove={still ? undefined : tilt}
              onPointerLeave={rest}
              onClick={(event) => show(index, event.currentTarget)}
              aria-haspopup="dialog"
            >
              <span className={styles.media}>
                <Image
                  src={item.image.src}
                  alt={item.alt}
                  width={item.image.width}
                  height={item.image.height}
                  sizes="(max-width: 700px) 90vw, 360px"
                />
                <span className={styles.foil} aria-hidden="true" />
                <span className={styles.glare} aria-hidden="true" />
              </span>
              <span className={styles.meta}>
                <strong>{item.title}</strong>
                <span>
                  {item.issuer} ·{" "}
                  <time dateTime={item.issued}>{item.issuedLabel}</time>
                </span>
              </span>
            </button>
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
