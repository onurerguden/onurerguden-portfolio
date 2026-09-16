"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { MotionValue } from "motion/react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  ShaderMaterial,
  Vector2,
} from "three";
import { journeyAt } from "@/lib/desk-journey";

export type CosmicPointer = {
  x: number;
  y: number;
  currentX: number;
  currentY: number;
  targetInfluence: number;
  influence: number;
};

export type CosmicPointerRef = RefObject<CosmicPointer>;

const gridVertexShader = `
  uniform vec2 uPointer;
  uniform float uInfluence;
  varying vec2 vUv;
  varying float vDeformation;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float distanceToPointer = distance(uv, uPointer);
    float deformation = exp(-distanceToPointer * distanceToPointer * 34.0) * uInfluence;

    transformed.z -= 0.16 * pow(position.x / 4.0, 2.0);
    transformed.z -= deformation * 0.32;
    vDeformation = deformation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const gridFragmentShader = `
  uniform float uReveal;
  varying vec2 vUv;
  varying float vDeformation;

  void main() {
    vec2 cells = vUv * vec2(30.0, 38.0);
    vec2 lines = abs(fract(cells - 0.5) - 0.5) / fwidth(cells);
    float grid = 1.0 - min(min(lines.x, lines.y), 1.0);
    vec2 edgeDistance = min(vUv, 1.0 - vUv);
    float edgeFade = smoothstep(0.0, 0.16, edgeDistance.x);
    float alpha = grid * edgeFade * uReveal
      * (0.13 + 0.07 * vDeformation);

    if (alpha < 0.003) discard;
    gl_FragColor = vec4(vec3(0.447, 0.525, 0.678), alpha);
  }
`;

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createStars(count: number) {
  const random = seededRandom(0x0e8d2026);
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = (random() - 0.5) * 14;
    positions[offset + 1] = (random() - 0.44) * 7;
    positions[offset + 2] = -3.4 - random() * 12;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}

function roomReveal(distance: number) {
  const step = journeyAt(distance);
  const from = step.from === "room" ? 1 : 0;
  const to = step.to === "room" ? 1 : 0;
  return from + (to - from) * step.travel;
}

export default function CosmicEnvironment({
  distance,
  pointer,
}: {
  distance: MotionValue<number>;
  pointer: CosmicPointerRef;
}) {
  const mobile = useThree((state) => state.size.width < 700);
  const gridMaterial = useRef<ShaderMaterial | null>(null);
  const starMaterial = useRef<PointsMaterial | null>(null);
  const stars = useMemo(() => createStars(mobile ? 130 : 240), [mobile]);
  const uniforms = useMemo(
    () => ({
      uPointer: { value: new Vector2(0.5, 0.5) },
      uInfluence: { value: 0 },
      uReveal: { value: 0 },
    }),
    [],
  );

  useEffect(() => () => stars.dispose(), [stars]);

  useFrame(({ gl }) => {
    const material = gridMaterial.current;
    const points = starMaterial.current;
    if (!material || !points) return;

    const state = pointer.current;
    const reveal = roomReveal(distance.get());
    const influence = state.influence * reveal;
    material.uniforms.uPointer.value.set(
      0.5 + state.currentX * 0.36,
      0.5 - state.currentY * 0.34,
    );
    material.uniforms.uInfluence.value = influence;
    material.uniforms.uReveal.value = reveal;
    points.opacity = 0.04 + reveal * 0.5;
    gl.domElement.dataset.gridInfluence = influence.toFixed(3);
    gl.domElement.dataset.cosmicReveal = reveal.toFixed(3);
  });

  return (
    <group name="Cosmic environment">
      <points geometry={stars} frustumCulled={false}>
        <pointsMaterial
          ref={starMaterial}
          color="#dce5f5"
          size={mobile ? 0.013 : 0.016}
          sizeAttenuation
          transparent
          opacity={0.04}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      <mesh
        name="Deformable grid curtain"
        position={[0, 0, -3]}
        rotation={[0.025, -0.035, -0.012]}
      >
        <planeGeometry args={[8, 10, mobile ? 36 : 48, mobile ? 32 : 40]} />
        <shaderMaterial
          ref={gridMaterial}
          uniforms={uniforms}
          vertexShader={gridVertexShader}
          fragmentShader={gridFragmentShader}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
