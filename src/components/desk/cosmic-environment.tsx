"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  ShaderMaterial,
  Vector2,
} from "three";
import { qa } from "@/lib/qa";
import { quality } from "@/lib/quality";
import { seededRandom } from "@/lib/random";

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
  uniform vec2 uCells;
  uniform float uFade;
  varying vec2 vUv;
  varying float vDeformation;

  void main() {
    vec2 cells = vUv * uCells;
    vec2 lines = abs(fract(cells - 0.5) - 0.5) / fwidth(cells);
    float grid = 1.0 - min(min(lines.x, lines.y), 1.0);
    vec2 edgeDistance = min(vUv, 1.0 - vUv);
    float edgeFade = smoothstep(0.0, uFade, edgeDistance.x);
    float alpha = grid * edgeFade * uReveal
      * (0.13 + 0.07 * vDeformation);

    if (alpha < 0.003) discard;
    gl_FragColor = vec4(vec3(0.447, 0.525, 0.678), alpha);
  }
`;

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

export default function CosmicEnvironment({
  pointer,
}: {
  pointer: CosmicPointerRef;
}) {
  const mobile = useThree((state) => state.size.width < 700);
  // Integrated graphics bend a grid of half the density.
  const low = useMemo(() => quality() === "low", []);
  const aspect = useThree((state) => state.size.width / state.size.height);
  // The curtain reaches past the room view's sides at any aspect up to 32:9,
  // so its end never shows. Cells and the side fade keep their size in scene
  // units (30 cells and a 1.28 fade across the original 8 units).
  const gridWidth = Math.max(8, 4.2 * Math.min(aspect, 32 / 9) + 0.6);
  const gridMaterial = useRef<ShaderMaterial | null>(null);
  const starMaterial = useRef<PointsMaterial | null>(null);
  const stars = useMemo(() => createStars(mobile ? 130 : 240), [mobile]);
  const uniforms = useMemo(
    () => ({
      uPointer: { value: new Vector2(0.5, 0.5) },
      uInfluence: { value: 0 },
      uReveal: { value: 0 },
      uCells: { value: new Vector2(30, 38) },
      uFade: { value: 0.16 },
    }),
    [],
  );

  useEffect(() => () => stars.dispose(), [stars]);

  useFrame(({ gl }) => {
    const material = gridMaterial.current;
    const points = starMaterial.current;
    if (!material || !points) return;

    const state = pointer.current;
    const influence = state.influence;
    material.uniforms.uPointer.value.set(
      0.5 + state.currentX * 0.36,
      0.5 - state.currentY * 0.34,
    );
    material.uniforms.uInfluence.value = influence;
    material.uniforms.uCells.value.set((30 * gridWidth) / 8, 38);
    material.uniforms.uFade.value = 1.28 / gridWidth;
    material.uniforms.uReveal.value = 1;
    points.opacity = 0.54;
    if (!qa()) return;
    gl.domElement.dataset.gridInfluence = influence.toFixed(3);
    gl.domElement.dataset.cosmicReveal = "1.000";
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
        <planeGeometry
          args={[
            gridWidth,
            10,
            Math.ceil(((mobile ? 36 : low ? 24 : 48) * gridWidth) / 8),
            mobile ? 32 : low ? 20 : 40,
          ]}
        />
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
