"use client";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import Room from "./room";
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
import {
  journeyAt,
  pageOffset,
  screenIds,
  screenStops,
  type CameraStop,
  type JourneyContent,
} from "@/lib/desk-journey";
import styles from "./journey.module.css";
export type JourneySceneProps = {
  poster?: boolean;
  distance: MotionValue<number>;
  active: boolean;
  content: JourneyContent;
  locale: "en" | "tr";
  onReady: () => void;
  onFailure: () => void;
  onFocusCard: (screen: number, card: number) => void;
};
const screens = screenIds.map((id) => contract.screens[id]);
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
      arc: new Vector3(),
    }),
    [],
  );
  const anchors = useMemo(() => {
    const aspect = size.width / size.height;
    const mobile = size.width < 700;
    const tangent = Math.tan((43 * Math.PI) / 360);
    const closeup = (s: (typeof screens)[number]) => {
      const target = new Vector3(...s.position);
      const distance =
        Math.max((s.width * 1.16) / aspect, s.height * 1.3) / (2 * tangent);
      return {
        target,
        fov: 43,
        position: target
          .clone()
          .addScaledVector(new Vector3(...s.normal), distance),
      };
    };
    const opening = contract.screens.UltrawideScreen;
    const openingTarget = new Vector3(...opening.position);
    const openingDistance =
      (Math.min(opening.width / aspect, opening.height) * 0.92) / (2 * tangent);
    const roomDistance = Math.max(3.3, 1.95 / aspect / (2 * tangent));
    return {
      opening: {
        target: openingTarget,
        position: openingTarget.clone().add(new Vector3(0, 0, openingDistance)),
        fov: 43,
      },
      desktop: {
        target: new Vector3(-0.04, mobile ? 0.26 : 0.34, -0.1),
        position: new Vector3(
          mobile ? 0.02 : 0.18,
          mobile ? 0.48 : 0.56,
          mobile ? 1.05 : 1.25,
        ),
        fov: 43,
      },
      portrait: closeup(contract.screens.PortraitScreen),
      macbook: closeup(contract.screens.MacBookScreen),
      room: {
        target: new Vector3(0, -0.02, -0.1),
        position: new Vector3(0.1, 0.48, roomDistance),
        fov: 43,
      },
    } satisfies Record<
      CameraStop,
      { target: Vector3; position: Vector3; fov: number }
    >;
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
      console.error("Desk WebGL context lost");
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  const pointer = useRef({ x: 0, y: 0, currentX: 0, currentY: 0 });
  useEffect(() => {
    const surface = gl.domElement.parentElement?.parentElement;
    if (!surface || !matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    const move = (event: PointerEvent) => {
      const rect = surface.getBoundingClientRect();
      pointer.current.x = Math.max(
        -1,
        Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
      );
      pointer.current.y = Math.max(
        -1,
        Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1),
      );
      if (active) invalidate();
    };
    const leave = () => {
      pointer.current.x = pointer.current.y = 0;
      if (active) invalidate();
    };
    surface.addEventListener("pointermove", move, { passive: true });
    surface.addEventListener("pointerleave", leave);
    return () => {
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerleave", leave);
    };
  }, [active, gl, invalidate]);
  useFrame((_state, delta) => {
    if (!active) return;
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
        .add(temp.arc.set(step.to === "portrait" ? -0.2 : 0.15, 0.1, 0.25));
      temp.c
        .copy(a.position)
        .lerp(b.position, 0.7)
        .add(temp.arc.set(step.to === "room" ? 0.13 : -0.045, 0.045, 0.15));
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
          (step.to === "macbook" ? -1.9 : 1.6),
      );
    const p = pointer.current;
    const damping = 1 - Math.exp(-8 * Math.min(delta, 0.05));
    p.currentX += (p.x - p.currentX) * damping;
    p.currentY += (p.y - p.currentY) * damping;
    const strength = (stop: CameraStop) =>
      stop === "opening"
        ? 0
        : stop === "room"
          ? 1
          : stop === "desktop"
            ? 0.6
            : 0.08;
    const amount =
      strength(step.from) + (strength(step.to) - strength(step.from)) * t;
    camera.rotateY((-p.currentX * amount * Math.PI) / 90);
    camera.rotateX((-p.currentY * amount * Math.PI) / 180);
    if (
      active &&
      amount > 0 &&
      Math.abs(p.x - p.currentX) + Math.abs(p.y - p.currentY) > 0.001
    )
      invalidate();
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
      panel.inert = step.active !== index;
      panel.style.pointerEvents = step.active === index ? "auto" : "none";
      const fromEmphasis =
        step.from === "room" || step.from === screenStops[index] ? 1 : 0;
      const toEmphasis =
        step.to === "room" || step.to === screenStops[index] ? 1 : 0;
      panel.style.setProperty(
        "--screen-shade",
        String(0.35 * (1 - fromEmphasis - (toEmphasis - fromEmphasis) * t)),
      );
    });

    const canvas = gl.domElement;
    canvas.setAttribute("data-frames", String(++frames.current));
    canvas.setAttribute("data-distance", String(step.distance));
    canvas.setAttribute("data-camera", camera.position.toArray().join(","));
  }, -1);
  return null;
}
/** Include reflection and shadow passes in the reported per-frame cost. */
function RenderFrame() {
  useFrame(({ gl }) => {
    gl.info.autoReset = false;
    gl.info.reset();
  }, -2);
  useFrame(({ scene, camera, gl }) => {
    if (gl.domElement.dataset.active === "false") return;
    gl.render(scene, camera);
    const canvas = gl.domElement;
    canvas.setAttribute("data-draw-calls", String(gl.info.render.calls));
    canvas.setAttribute("data-triangles", String(gl.info.render.triangles));
    canvas.setAttribute(
      "data-peak-draw-calls",
      String(
        Math.max(
          Number(canvas.dataset.peakDrawCalls || 0),
          gl.info.render.calls,
        ),
      ),
    );
  }, 1);
  return null;
}
export default function JourneyScene(props: JourneySceneProps) {
  const panels = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [exploring, setExploring] = useState(
    journeyAt(props.distance.get()).explore,
  );
  useEffect(
    () =>
      props.distance.on("change", (d) => setExploring(journeyAt(d).explore)),
    [props.distance],
  );
  const controls = useDeskInteractions(props.active, false);
  const modelControls = {
    ...controls,
    activate: (...args: Parameters<typeof controls.activate>) => {
      if (exploring) controls.activate(...args);
    },
  };
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
        camera={{ fov: 43, near: 0.01, far: 30 }}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      >
        <color attach="background" args={["#505257"]} />
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
          <Room />
          <Model onReady={onReady} controls={modelControls} />
        </Suspense>
        <RenderFrame />
        <Driver {...props} active={controls.active} panels={panels} />
      </Canvas>
      {exploring && !props.poster ? (
        <DeskObjectControls controls={controls} locale={props.locale} journey />
      ) : null}
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
                {(screenIds[i] === "UltrawideScreen" || props.poster
                  ? []
                  : props.content.screens[i]
                ).map((card, j) => (
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
