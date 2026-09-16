"use client";

import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { RepeatWrapping, SRGBColorSpace } from "three";

const PLATFORM_TOP = -0.694;
const PLATFORM_THICKNESS = 0.06;
const DESK_WIDTH = 1.5;
const DESK_DEPTH = 0.87;

/** The circular platform clears the desk footprint by 25 cm on every side. */
export const PLATFORM_RADIUS =
  Math.hypot(DESK_WIDTH / 2, DESK_DEPTH / 2) + 0.25;

export default function DeskPlatform() {
  const mobile = useThree((state) => state.size.width < 700);
  const source = useTexture("/images/desk/room-marble.svg");
  const marble = useMemo(() => {
    const map = source.clone();
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(2.5, 2.5);
    map.offset.set(-0.75, -0.75);
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
        receiveShadow
      >
        <circleGeometry args={[PLATFORM_RADIUS, mobile ? 64 : 96]} />
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
        receiveShadow
      >
        <cylinderGeometry
          args={[
            PLATFORM_RADIUS,
            PLATFORM_RADIUS,
            PLATFORM_THICKNESS,
            mobile ? 64 : 96,
            1,
            true,
          ]}
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
