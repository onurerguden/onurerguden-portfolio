"use client";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import DeskLighting from "./lighting";
import { DeskObjectControls, useDeskInteractions } from "./interactions";
import ProjectArt from "@/components/project-art";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3, PerspectiveCamera } from "three";
import type { MotionValue } from "motion/react";
import { Model } from "./scene";
import occluders from "@/lib/desk-occluders.json";
import { createScreenOcclusion, screenMaskImage } from "@/lib/desk-occlusion";
import contract from "@/lib/desk-scene.json";
import { createScreenProjection, projectScreen } from "@/lib/desk-projection";
import { journeyAt, pageOffset, type JourneyContent } from "@/lib/desk-journey";
import styles from "./journey.module.css";
export type JourneySceneProps = {
  distance: MotionValue<number>;
  active: boolean;
  content: JourneyContent;
  locale: "en" | "tr";
  onReady: () => void;
  onFailure: () => void;
  onFocusCard: (screen: number, card: number) => void;
};
const screens = Object.values(contract.screens);
function Driver({
  distance,
  active,
  onFailure,
  panels,
  content,
}: JourneySceneProps & { panels: RefObject<HTMLDivElement | null> }) {
  const { camera, gl, size, invalidate, setFrameloop } = useThree();
  const projections = useMemo(() => screens.map(createScreenProjection), []);
  const masks = useMemo(
    () => screens.map((s) => createScreenOcclusion(s, occluders)),
    [],
  );
  const frames = useRef(0);
  const temp = useMemo(
    () => ({
      position: new Vector3(),
      target: new Vector3(),
      a: new Vector3(),
      b: new Vector3(),
      c: new Vector3(),
      d: new Vector3(),
    }),
    [],
  );
  const anchors = useMemo(() => {
    const aspect = size.width / size.height;
    const mobile = size.width < 700;
    const tangent = Math.tan((43 * Math.PI) / 360);
    const wide = contract.cameras[0];
    const wideTarget = new Vector3(...wide.target);
    const widePosition = new Vector3(...wide.position);
    const imageHeight = Math.min(size.height, size.width * 0.75);
    const wideFov =
      (2 * Math.atan((tangent * size.height) / imageHeight) * 180) / Math.PI;
    return [
      { position: widePosition, target: wideTarget, fov: wideFov },
      ...screens.map((s, i) => {
        const target = new Vector3(...s.position);
        const width = mobile && i === 1 ? 0.36 : s.width * 1.16;
        const height = i === 0 ? s.height * 1.22 : s.height * 1.3;
        const distance = Math.max(width / aspect, height) / (2 * tangent);
        return {
          target,
          fov: 43,
          position: target
            .clone()
            .addScaledVector(new Vector3(...s.normal), distance),
        };
      }),
    ];
  }, [size.width, size.height]);
  useEffect(() => {
    setFrameloop(active ? "demand" : "never");
    gl.domElement.setAttribute("data-active", String(active));
    if (active) invalidate();
  }, [active, invalidate, setFrameloop, gl]);
  useEffect(
    () =>
      distance.on("change", () => {
        if (active) invalidate();
      }),
    [distance, active, invalidate],
  );
  useEffect(() => {
    invalidate();
  }, [anchors, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.setAttribute("tabindex", "-1");
    canvas.setAttribute("aria-hidden", "true");
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  useFrame((state) => {
    const step = journeyAt(distance.get());
    const a = anchors[step.from],
      b = anchors[step.to],
      t = step.travel;
    if (step.from === step.to) {
      temp.position.copy(a.position);
      temp.target.copy(a.target);
    } else {
      // A forward-facing arc clears the desk and adds parallax; zero endpoint velocity.
      temp.a.copy(a.position);
      temp.b
        .copy(a.position)
        .lerp(b.position, 0.3)
        .add(new Vector3(step.to === 1 ? -0.2 : 0.15, 0.1, 0.25));
      temp.c
        .copy(a.position)
        .lerp(b.position, 0.7)
        .add(new Vector3(step.to === 3 ? 0.13 : -0.045, 0.045, 0.15));
      temp.d.copy(b.position);
      const u = 1 - t;
      temp.position
        .copy(temp.a)
        .multiplyScalar(u * u * u)
        .addScaledVector(temp.b, 3 * u * u * t)
        .addScaledVector(temp.c, 3 * u * t * t)
        .addScaledVector(temp.d, t * t * t);
      temp.target.copy(a.target).lerp(b.target, t);
    }
    if (step.exit)
      temp.position.addScaledVector(
        temp.a.copy(temp.position).sub(temp.target),
        step.exit * 0.18,
      );
    if (camera instanceof PerspectiveCamera) {
      const fov =
        a.fov +
        (b.fov - a.fov) * t +
        (step.from !== step.to ? 3 * Math.sin(Math.PI * t) : 0);
      camera.setFocalLength(
        camera.getFilmHeight() / (2 * Math.tan((fov * Math.PI) / 360)),
      );
    }
    camera.position.copy(temp.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(temp.target);
    if (step.from !== step.to)
      camera.rotateZ(
        ((Math.sin(t * Math.PI) * Math.PI) / 180) *
          (step.to === 2 ? -1.9 : 1.6),
      );
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    projections.forEach((projection, index) => {
      const panel = panels.current?.children[index] as HTMLElement | undefined;
      if (!panel) return;
      const matrix = projectScreen(projection, camera, size.width, size.height);
      panel.style.visibility = matrix ? "visible" : "hidden";
      if (matrix) panel.style.transform = `matrix3d(${matrix.join(",")})`;
      const maskPath = masks[index](camera.position);
      const maskHeight = (1000 * screens[index].height) / screens[index].width;
      panel.style.maskImage = screenMaskImage(maskPath, maskHeight);
      const track = panel.firstElementChild as HTMLElement;
      const height = (1000 * screens[index].height) / screens[index].width;
      const offset = pageOffset(
        step.reading[index],
        content.screens[index].length,
      );
      track.style.transform = `translateY(${-offset * height - step.preview}px)`;
      panel.dataset.page = String(offset);
      const fromEmphasis = step.from === 0 || step.from === index + 1 ? 1 : 0;
      const toEmphasis = step.to === 0 || step.to === index + 1 ? 1 : 0;
      panel.style.setProperty(
        "--screen-shade",
        String(0.35 * (1 - fromEmphasis - (toEmphasis - fromEmphasis) * t)),
      );
    });
    gl.render(state.scene, camera);
    const canvas = gl.domElement;
    canvas.setAttribute("data-frames", String(++frames.current));
    canvas.setAttribute("data-distance", String(step.distance));
    canvas.setAttribute("data-camera", camera.position.toArray().join(","));
    canvas.setAttribute("data-draw-calls", String(gl.info.render.calls));
    canvas.setAttribute("data-triangles", String(gl.info.render.triangles));
  }, 1);
  return null;
}
export default function JourneyScene(props: JourneySceneProps) {
  const panels = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const controls = useDeskInteractions(props.active, false);
  const readyCallback = props.onReady;
  const onReady = useCallback(() => {
    if (wrapper.current) wrapper.current.style.opacity = "1";
    readyCallback();
  }, [readyCallback]);
  return (
    <div className={styles.scene} ref={wrapper} style={{ opacity: 0 }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ fov: 43, near: 0.01, far: 15 }}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      >
        <color attach="background" args={["#000000"]} />
        <DeskLighting />
        <ambientLight intensity={0.45} color="#cad6ef" />
        <directionalLight
          position={[-0.65, 1.45, 0.6]}
          intensity={1.8}
          color="#ffdcad"
        />
        <directionalLight
          position={[0.9, 0.7, 0.7]}
          intensity={0.8}
          color="#adccff"
        />
        <Suspense fallback={null}>
          <Model onReady={onReady} controls={controls} />
        </Suspense>
        <Driver {...props} active={controls.active} panels={panels} />
      </Canvas>
      <DeskObjectControls controls={controls} locale={props.locale} journey />
      <div className={styles.screenLayer} ref={panels}>
        {screens.map((screen, i) => {
          const height = (1000 * screen.height) / screen.width;
          return (
            <div
              key={i}
              className={styles.screen}
              data-screen={i}
              style={{ width: 1000, height }}
              aria-label={props.content.labels[i]}
            >
              <div className={styles.track}>
                {props.content.screens[i].map((card, j) => (
                  <article
                    key={card.title}
                    style={{ height }}
                    className={styles.card}
                  >
                    <span className={styles.label}>
                      {props.content.labels[i]}
                    </span>
                    {card.visual ? (
                      <div className={styles.screenVisual}>
                        <ProjectArt slug={card.visual} locale={props.locale} />
                      </div>
                    ) : null}
                    <h2>{card.title}</h2>
                    <p>{card.body}</p>
                    <a href={card.href} onFocus={() => props.onFocusCard(i, j)}>
                      {card.action}
                      <span aria-hidden="true"> ↗</span>
                    </a>
                    <span className={styles.page}>
                      {String(j + 1).padStart(2, "0")} /{" "}
                      {String(props.content.screens[i].length).padStart(2, "0")}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
