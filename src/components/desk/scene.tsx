"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { createScreenProjection, projectScreen } from "@/lib/desk-projection";
import contract from "@/lib/desk-scene.json";
import occluders from "@/lib/desk-occluders.json";
import { createScreenOcclusion, screenMaskImage } from "@/lib/desk-occlusion";
import assets from "@/lib/desk-assets.json";
import styles from "./review.module.css";
import DeskLighting from "./lighting";
import InteractionScene from "./interaction-scene";
import {
  DeskObjectControls,
  useDeskInteractions,
  type DeskInteractions,
} from "./interactions";

type Props = {
  revealed: boolean;
  progress: number;
  reduced: boolean;
  active: boolean;
  locale: "en" | "tr";
  onReady: () => void;
  onFailure: () => void;
};
const screenCopy = {
  en: [
    [
      "Selected work",
      "Kuyumcum",
      "Software for a real trade.",
      "HealthFactor AI",
      "Machine learning for water safety.",
      "Course Intelligence",
      "Retrieval, with context.",
    ],
    [
      "AI & research",
      "Questions worth testing.",
      "Applied machine learning · Retrieval · Data science",
      "From an experiment to a useful system.",
    ],
    [
      "Onur Ergüden",
      "Software engineer",
      "I build, evaluate and keep learning.",
      "İzmir, Türkiye",
    ],
  ],
  tr: [
    [
      "Seçili çalışmalar",
      "Kuyumcum",
      "Gerçek bir iş için yazılım.",
      "HealthFactor AI",
      "Su güvenliği için makine öğrenmesi.",
      "Course Intelligence",
      "Bağlamıyla birlikte bilgi.",
    ],
    [
      "AI ve araştırma",
      "Sınanmaya değer sorular.",
      "Uygulamalı makine öğrenmesi · Retrieval · Veri bilimi",
      "Deneyden kullanışlı bir sisteme.",
    ],
    [
      "Onur Ergüden",
      "Yazılım mühendisi",
      "Geliştiriyor, değerlendiriyor ve öğreniyorum.",
      "İzmir, Türkiye",
    ],
  ],
};

function Screens({
  locale,
  container,
}: {
  locale: Props["locale"];
  container: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={container} className={styles.screenLayer} aria-hidden="true">
      {Object.values(contract.screens).map((screen, index) => (
        <div
          key={index}
          data-screen={index}
          className={`${styles.screen} ${index === 0 ? styles.portraitScreen : index === 2 ? styles.macbookScreen : ""}`}
          style={{ width: 1000, height: (1000 * screen.height) / screen.width }}
        >
          {screenCopy[locale][index].map((line, i) =>
            i === 0 ? (
              <div className={styles.screenLabel} key={line}>
                {line}
              </div>
            ) : (
              <p key={line}>{line}</p>
            ),
          )}
          <span className={styles.screenFooter}>onurerguden</span>
        </div>
      ))}
    </div>
  );
}

export function Model({
  onReady,
  controls,
}: Pick<Props, "onReady"> & { controls: DeskInteractions }) {
  const invalidate = useThree((state) => state.invalidate);
  const { scene } = useGLTF(
    `/models/desk/onur-desk.glb?v=${assets.revision}`,
    "/decoders/draco/",
  );
  // useGLTF caches the source. Each mounted view owns transforms and materials.
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.material = Array.isArray(object.material)
          ? object.material.map((m) => m.clone())
          : object.material.clone();
        object.castShadow = object.userData.interaction !== "lamp";
        object.receiveShadow = true;
        if (object.userData.interaction === "backdrop") object.visible = false;
      }
    });
    return clone;
  }, [scene]);
  useEffect(() => {
    onReady();
    invalidate();
  }, [onReady, invalidate]);
  useEffect(
    () => () => {
      model.traverse((object) => {
        if (object instanceof Mesh) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    },
    [model],
  );
  return <InteractionScene model={model} controls={controls} />;
}

function CameraJourney({
  progress,
  reduced,
  active,
  onFailure,
  panels,
}: Props & { panels: RefObject<HTMLDivElement | null> }) {
  const { camera, gl, size, invalidate, setFrameloop } = useThree();
  const current = useRef(progress);
  const transition = useRef({ from: progress, started: 0 });
  const projections = useMemo(
    () => Object.values(contract.screens).map(createScreenProjection),
    [],
  );
  const masks = useMemo(
    () =>
      Object.values(contract.screens).map((s) =>
        createScreenOcclusion(s, occluders),
      ),
    [],
  );
  const rendered = useRef(0);
  const vectors = useMemo(
    () => ({
      position: new Vector3(),
      target: new Vector3(),
      a: new Vector3(),
      b: new Vector3(),
    }),
    [],
  );

  useEffect(() => {
    setFrameloop(active ? "demand" : "never");
    gl.domElement.setAttribute("data-active", String(active));
    if (active) invalidate();
  }, [active, setFrameloop, invalidate, gl]);
  useEffect(() => {
    transition.current = { from: current.current, started: performance.now() };
    invalidate();
  }, [progress, reduced, invalidate]);
  useEffect(() => {
    invalidate();
  }, [size, invalidate]);
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
    const elapsed = Math.min(
      1,
      Math.max(0, (performance.now() - transition.current.started) / 650),
    );
    const easing = 1 - Math.pow(1 - elapsed, 3);
    current.current =
      reduced || elapsed === 1
        ? progress
        : transition.current.from +
          (progress - transition.current.from) * easing;
    if (current.current !== progress) invalidate();
    const value = current.current;
    const i = Math.min(2, Math.floor(value));
    const t = value - i;
    const smooth = t * t * (3 - 2 * t);
    const first = contract.cameras[i],
      second = contract.cameras[i + 1];
    const aspect = size.width / size.height;
    const framingWidths = [1.7, 0.34, 0.75, 0.34];
    const framingHeights = [1.6, 0.59, 0.35, 0.22];
    const tangent = Math.tan((43 * Math.PI) / 360);
    const distanceFor = (index: number) =>
      Math.max(framingWidths[index] / aspect, framingHeights[index]) /
      (2 * tangent);
    vectors.position
      .fromArray(first.position)
      .sub(vectors.a.fromArray(first.target));
    vectors.position
      .multiplyScalar(Math.max(1, distanceFor(i) / vectors.position.length()))
      .add(vectors.a);
    vectors.b
      .fromArray(second.position)
      .sub(vectors.target.fromArray(second.target));
    vectors.b
      .multiplyScalar(Math.max(1, distanceFor(i + 1) / vectors.b.length()))
      .add(vectors.target);
    vectors.position.lerp(vectors.b, smooth);
    vectors.target
      .fromArray(first.target)
      .lerp(vectors.a.fromArray(second.target), smooth);
    camera.position.copy(vectors.position);
    camera.lookAt(vectors.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // Project each HTML plane into viewport pixels. Using one flattened CSS
    // homography avoids nested CSS perspective/compositor offsets on Chrome.
    projections.forEach((projection, index) => {
      const panel = panels.current?.children[index] as HTMLElement | undefined;
      if (!panel) return;
      const css = projectScreen(projection, camera, size.width, size.height);
      panel.style.visibility = css ? "visible" : "hidden";
      if (css) panel.style.transform = `matrix3d(${css.join(",")})`;
      const screen = Object.values(contract.screens)[index];
      panel.style.maskImage = screenMaskImage(
        masks[index](camera.position),
        (1000 * screen.height) / screen.width,
      );
    });
    gl.render(state.scene, camera);
    gl.domElement.setAttribute(
      "data-peak-draw-calls",
      String(
        Math.max(
          Number(gl.domElement.dataset.peakDrawCalls || 0),
          gl.info.render.calls,
        ),
      ),
    );
    gl.domElement.setAttribute("data-draw-calls", String(gl.info.render.calls));
    gl.domElement.setAttribute(
      "data-triangles",
      String(gl.info.render.triangles),
    );
    gl.domElement.setAttribute("data-frames", String(++rendered.current));
    gl.domElement.setAttribute("data-progress", String(value));
  }, 1);
  return null;
}

export default function DeskScene(props: Props) {
  const panels = useRef<HTMLDivElement>(null);
  const controls = useDeskInteractions(props.active, props.reduced);
  return (
    <div className={styles.canvas} style={{ opacity: props.revealed ? 1 : 0 }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0.12, 0.69, 1.48], fov: 43, near: 0.01, far: 12 }}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      >
        <color attach="background" args={["#17191c"]} />
        <DeskLighting />
        <ambientLight intensity={0.55} color="#cad6ef" />
        <directionalLight
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-1}
          shadow-camera-right={1}
          shadow-camera-top={1}
          shadow-camera-bottom={-1}
          shadow-camera-near={0.1}
          shadow-camera-far={4}
          shadow-bias={-0.0001}
          shadow-normalBias={0.002}
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
          <Model onReady={props.onReady} controls={controls} />
        </Suspense>
        <CameraJourney {...props} active={controls.active} panels={panels} />
      </Canvas>
      <Screens locale={props.locale} container={panels} />
      {props.revealed ? (
        <DeskObjectControls controls={controls} locale={props.locale} />
      ) : null}
    </div>
  );
}
