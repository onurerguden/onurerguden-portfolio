"use client";
import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { RepeatWrapping, SRGBColorSpace } from "three";

/** The desk's measured support floor is -0.692 m in its Y-up contract. */
export default function Room() {
  const mobile = useThree((state) => state.size.width < 700);
  const source = useTexture("/images/desk/room-marble.svg");
  const marble = useMemo(() => {
    const map = source.clone();
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(3, 4);
    map.colorSpace = SRGBColorSpace;
    map.needsUpdate = true;
    return map;
  }, [source]);
  useEffect(() => () => marble.dispose(), [marble]);
  return (
    <group name="Room">
      <mesh
        position={[0, -0.694, 3]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[4.8, 14]} />
        <MeshReflectorMaterial
          map={marble}
          color="#ffffff"
          resolution={mobile ? 256 : 512}
          blur={mobile ? [128, 64] : [256, 128]}
          mixBlur={1}
          mixStrength={0.75}
          roughness={0.48}
          metalness={0.08}
          mirror={0.35}
          depthScale={0}
        />
      </mesh>
      <mesh position={[0, 0.428, -1.5]} receiveShadow>
        <planeGeometry args={[4.8, 2.244]} />
        <meshStandardMaterial color="#505257" roughness={0.96} />
      </mesh>
      <mesh
        position={[-2.4, 0.428, 4]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[11, 2.244]} />
        <meshStandardMaterial color="#505257" roughness={0.96} />
      </mesh>
      <mesh
        position={[2.4, 0.428, 4]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[11, 2.244]} />
        <meshStandardMaterial color="#505257" roughness={0.96} />
      </mesh>
      <mesh position={[0, 1.55, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.8, 11]} />
        <meshStandardMaterial color="#e8e9e6" roughness={1} />
      </mesh>
      <directionalLight
        position={[-3, 2.4, 1]}
        intensity={2.4}
        color="#fff8ed"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-normalBias={0.015}
        shadow-bias={-0.0001}
        shadow-radius={4}
      />
      <hemisphereLight args={["#e8edf4", "#a3a29d", 0.7]} />
    </group>
  );
}
