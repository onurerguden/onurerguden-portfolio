"use client";

import dynamic from "next/dynamic";
import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./system-visual.module.css";

const Scene = dynamic(() => import("./system-scene"), { ssr: false });

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Poster() {
  return (
    <svg
      viewBox="0 0 600 550"
      className={styles.poster}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        cx="306"
        cy="433"
        rx="172"
        ry="38"
        fill="#193a76"
        opacity=".055"
      />
      {[320, 257, 194, 131].map((y, index) => (
        <g key={y}>
          <path
            d={`M112 ${y} 322 ${y - 63} 499 ${y + 20} 289 ${y + 87}Z`}
            fill={index === 0 || index === 3 ? "#365ed4" : "#dce5f8"}
            stroke="#7998dc"
            strokeWidth="1"
          />
          <path
            d={`M112 ${y}v9l177 87 210-67v-9L289 ${y + 87}Z`}
            fill={index === 0 || index === 3 ? "#2147b6" : "#bccce9"}
          />
          <path
            d={`M148 ${y + 1} 320 ${y - 50} 462 ${y + 20} 289 ${y + 73}Z`}
            fill={index === 3 ? "#294ec8" : "#eef0ea"}
          />
          <path
            d={`M229 ${y + 5} 318 ${y - 21} 389 ${y + 14} 299 ${y + 42}Z`}
            fill={index === 3 ? "#e2eafd" : "#416ddd"}
          />
          <circle cx="132" cy={y + 1} r="3" fill="#a9bddc" />
          <circle cx="477" cy={y + 20} r="3" fill="#a9bddc" />
        </g>
      ))}
    </svg>
  );
}

export default function SystemVisual({ locale }: { locale: "en" | "tr" }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onFailure = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (!entry.isIntersecting) setReady(false);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let idle: number | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const cancel = () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timeout !== undefined) clearTimeout(timeout);
    };
    const update = () => {
      cancel();
      if (media.matches) {
        setEnabled(false);
        setReady(false);
        return;
      }
      const start = () => {
        if (!cancelled && !media.matches) setEnabled(true);
      };
      if ("requestIdleCallback" in window)
        idle = window.requestIdleCallback(start, { timeout: 1800 });
      else timeout = setTimeout(start, 250);
    };
    // A frame followed by an idle callback lets the server-rendered content paint first.
    const frame = requestAnimationFrame(update);
    media.addEventListener("change", update);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cancel();
      media.removeEventListener("change", update);
    };
  }, [visible]);

  const layers =
    locale === "tr"
      ? ["Veri", "Bilgi erişimi", "Orkestrasyon", "Ürün"]
      : ["Data", "Retrieval", "Orchestration", "Product"];
  return (
    <div ref={container} className={styles.visual}>
      <div className={styles.stage} aria-hidden="true">
        <div
          className={styles.posterWrap}
          style={{ opacity: ready && !failed ? 0 : 1 }}
        >
          <Poster />
        </div>
        {visible && enabled && !failed ? (
          <div className={styles.canvas}>
            <SceneBoundary onFailure={onFailure}>
              <Scene onFailure={onFailure} onReady={onReady} />
            </SceneBoundary>
          </div>
        ) : null}
      </div>
      <div className={styles.caption}>
        <p>
          {locale === "tr"
            ? "Veriden çalışan bir sisteme."
            : "From data to a working system."}
        </p>
        <ol className={styles.layers}>
          {layers.map((layer) => (
            <li key={layer}>{layer}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
