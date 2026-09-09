"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { OrthographicCamera } from "@react-three/drei";
import type { Group } from "three";

type SceneProps = { onFailure: () => void; onReady: () => void };

function Architecture() {
  const layers = useRef<(Group | null)[]>([]);
  const system = useRef<Group>(null);
  const progress = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const update = () => {
      progress.current = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 1.5)));
      invalidate();
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [invalidate]);

  useFrame(() => {
    layers.current.forEach((layer, index) => {
      if (layer) {
        layer.position.y = (index - 1.5) * (0.62 + progress.current * 0.55);
        layer.position.x = (index - 1.5) * progress.current * 0.14;
      }
    });
    if (system.current) system.current.rotation.y = -0.17 + progress.current * 0.17;
  });

  return (
    <group ref={system} rotation={[0, -0.17, -0.06]}>
      {[0, 1, 2, 3].map((layer) => (
        <group key={layer} ref={(node) => { layers.current[layer] = node; }} position={[0, (layer - 1.5) * 0.62, 0]}>
          <mesh>
            <boxGeometry args={[3.7, 0.095, 2.65]} />
            <meshPhysicalMaterial color={layer === 0 || layer === 3 ? "#315cd9" : "#dbe4f7"} metalness={0.18} roughness={0.24} clearcoat={1} transparent opacity={layer === 0 || layer === 3 ? 0.94 : 0.76} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.065, 0]}>
            <boxGeometry args={[3.28, 0.025, 2.23]} />
            <meshStandardMaterial color={layer === 3 ? "#244ccc" : "#eff0e9"} roughness={0.68} metalness={0.12} />
          </mesh>
          {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
            <mesh key={`${x}-${z}`} position={[x * 1.64, 0.09, z * 1.13]}>
              <cylinderGeometry args={[0.047, 0.047, 0.12, 12]} />
              <meshStandardMaterial color="#b8c6dc" roughness={0.23} metalness={0.8} />
            </mesh>
          )))}
          <mesh position={[layer === 1 ? -0.65 : 0, 0.16, 0]}>
            <boxGeometry args={layer === 2 ? [2.2, 0.12, 0.18] : layer === 1 ? [0.8, 0.14, 1.36] : [1.5, 0.14, 1.1]} />
            <meshStandardMaterial color={layer === 3 ? "#e4ebfc" : "#3260df"} roughness={0.3} metalness={0.25} />
          </mesh>
          {layer === 1 ? <mesh position={[0.65, 0.16, 0]}><boxGeometry args={[0.8, 0.14, 1.36]} /><meshStandardMaterial color="#3260df" roughness={0.3} metalness={0.25} /></mesh> : null}
        </group>
      ))}
    </group>
  );
}

function Lifecycle({ onFailure, onReady }: SceneProps) {
  const gl = useThree((state) => state.gl);
  const rendered = useRef(false);
  const size = useThree((state) => state.size);
  useFrame(() => {
    gl.domElement.setAttribute("data-draw-calls", String(gl.info.render.calls));
    gl.domElement.setAttribute("data-triangles", String(gl.info.render.triangles));
    if (!rendered.current) {
      rendered.current = true;
      onReady();
    }
  });
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.setAttribute("tabindex", "-1");
    canvas.setAttribute("aria-hidden", "true");
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  return <OrthographicCamera makeDefault position={[6, 5, 8]} zoom={Math.min(74, size.width / 6.3, size.height / 6.1)} near={0.1} far={40} onUpdate={(camera) => camera.lookAt(0, 0, 0)} />;
}

export default function SystemScene(props: SceneProps) {
  return (
    <Canvas orthographic camera={{ position: [6, 5, 8], zoom: 74, near: 0.1, far: 40 }} dpr={[1, 1.5]} frameloop="demand" gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} style={{ pointerEvents: "none" }} aria-hidden="true">
      <ambientLight intensity={1.7} />
      <directionalLight position={[3, 7, 5]} intensity={3.4} color="#ffffff" />
      <directionalLight position={[-5, 2, -2]} intensity={1.8} color="#a8baff" />
      <Architecture />
      <Lifecycle {...props} />
    </Canvas>
  );
}
