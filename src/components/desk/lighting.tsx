import { Environment, Lightformer } from "@react-three/drei";

/** One local reflection capture; no HDR download or continuous environment rendering. */
export default function DeskLighting() {
  return (
    <Environment frames={1} resolution={128} environmentIntensity={0.55}>
      <Lightformer
        form="rect"
        intensity={3}
        color="#fff3df"
        position={[-2, 2, 1]}
        scale={[1.5, 3, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.5}
        color="#dce8ff"
        position={[2, 1, 0]}
        scale={[1, 2, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1}
        color="#ffe6cf"
        position={[0, 3, -1]}
        scale={[3, 1, 1]}
        target={[0, 0, 0]}
      />
    </Environment>
  );
}
