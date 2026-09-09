"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from "three";
import { createScreenProjection, projectScreen } from "@/lib/desk-projection";
import contract from "@/lib/desk-scene.json";
import assets from "@/lib/desk-assets.json";
import styles from "./review.module.css";

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

function Model({ onReady }: Pick<Props, "onReady">) {
  const invalidate = useThree((state) => state.invalidate);
  const { scene } = useGLTF(
    `/models/desk/onur-desk.glb?v=${assets.revision}`,
    "/decoders/draco/",
  );
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        const material = object.material;
        if (
          material instanceof MeshStandardMaterial &&
          material.name.startsWith("Baked ")
        ) {
          const baked = new MeshBasicMaterial({ map: material.map });
          baked.name = material.name;
          object.material = baked;
        }
        const baked =
          !Array.isArray(object.material) &&
          object.material.name.startsWith("Baked ");
        object.castShadow = !baked;
        object.receiveShadow = !baked;
      }
    });
    onReady();
    invalidate();
  }, [scene, onReady, invalidate]);
  return <primitive object={scene} dispose={null} />;
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
    if (active) invalidate();
  }, [active, setFrameloop, invalidate]);
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
    const framingHeights = [0.85, 0.59, 0.35, 0.22];
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
    });
    gl.render(state.scene, camera);
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
  return (
    <div className={styles.canvas} style={{ opacity: props.revealed ? 1 : 0 }}>
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0.12, 0.69, 1.48], fov: 43, near: 0.01, far: 12 }}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      >
        <color attach="background" args={["#171719"]} />
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
        <pointLight
          position={[-0.65, 0.3, -0.22]}
          intensity={0.18}
          distance={1}
          color="#ffab5f"
        />
        <pointLight
          position={[0.66, 0.19, -0.26]}
          intensity={0.12}
          distance={0.8}
          color="#ff8095"
        />
        <Suspense fallback={null}>
          <Model onReady={props.onReady} />
        </Suspense>
        <CameraJourney {...props} panels={panels} />
      </Canvas>
      <Screens locale={props.locale} container={panels} />
    </div>
  );
}
