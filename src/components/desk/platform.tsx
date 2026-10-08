"use client";

import { useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { RepeatWrapping, SRGBColorSpace, TextureLoader } from "three";

const PLATFORM_TOP = -0.694;
const PLATFORM_THICKNESS = 0.06;

/** A close-fitting ellipse keeps the desk dominant in the final composition. */
export const PLATFORM_RADIUS_X = 0.93;
export const PLATFORM_RADIUS_Z = 0.58;

export default function DeskPlatform() {
  const mobile = useThree((state) => state.size.width < 700);
  const source = useLoader(TextureLoader, "/images/desk/room-marble.svg");
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
        {/* Glossy marble lit by the studio environment. A live mirror of the
            desk redrew the whole scene and five blur passes every frame and
            doubled the shader programs to compile. */}
        <meshStandardMaterial
          map={marble}
          color="#ffffff"
          roughness={0.3}
          metalness={0.06}
          envMapIntensity={1.4}
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
