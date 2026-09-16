"use client";

import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { RepeatWrapping, SRGBColorSpace } from "three";

const PLATFORM_TOP = -0.694;
const PLATFORM_THICKNESS = 0.06;

/** A close-fitting ellipse keeps the desk dominant in the final composition. */
export const PLATFORM_RADIUS_X = 0.93;
export const PLATFORM_RADIUS_Z = 0.58;

export default function DeskPlatform() {
  const mobile = useThree((state) => state.size.width < 700);
  const source = useTexture("/images/desk/room-marble.svg");
  const marble = useMemo(() => {
    const map = source.clone();
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(2.4, 1.5);
    map.offset.set(-0.7, -0.25);
    map.colorSpace = SRGBColorSpace;
    map.needsUpdate = true;
    return map;
  }, [source]);

  useEffect(() => () => marble.dispose(), [marble]);

  return (
    <group name="Desk platform">
      <mesh
        position={[0, PLATFORM_TOP, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[PLATFORM_RADIUS_X, PLATFORM_RADIUS_Z, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, mobile ? 64 : 96]} />
        <MeshReflectorMaterial
          map={marble}
          color="#ffffff"
          resolution={mobile ? 256 : 512}
          blur={mobile ? [128, 64] : [256, 128]}
          mixBlur={1}
          mixStrength={0.72}
          roughness={0.5}
          metalness={0.06}
          mirror={0.32}
          depthScale={0}
        />
      </mesh>
      <mesh
        position={[0, PLATFORM_TOP - PLATFORM_THICKNESS / 2, 0]}
        scale={[PLATFORM_RADIUS_X, 1, PLATFORM_RADIUS_Z]}
        receiveShadow
      >
        <cylinderGeometry
          args={[1, 1, PLATFORM_THICKNESS, mobile ? 64 : 96, 1, true]}
        />
        <meshStandardMaterial
          color="#aeb6c3"
          roughness={0.76}
          metalness={0.08}
        />
      </mesh>
    </group>
  );
}
