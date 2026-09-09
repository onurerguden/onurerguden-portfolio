"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
} from "three";
import contract from "@/lib/desk-interactions.json";
import {
  accessoryPose,
  animationDuration,
  lampColors,
  type AnimatedObject,
} from "@/lib/desk-interaction-motion";
import type { DeskAction, DeskInteractions } from "./interactions";

const actions = new Set<string>([
  "dial",
  "headphones",
  "lamp",
  "mouse",
  "tablet",
]);
const animated = ["headphones", "mouse", "tablet"] as const;
function actionFor(object: Object3D): DeskAction | undefined {
  const id = object.userData.interaction;
  return actions.has(id) ? (id as DeskAction) : undefined;
}
const shadowVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const shadowFragment = `varying vec2 vUv; void main(){float r=length((vUv-.5)*2.);gl_FragColor=vec4(0.,0.,0.,.22*pow(max(0.,1.-r),2.));}`;

export default function InteractionScene({
  model,
  controls,
}: {
  model: Group;
  controls: DeskInteractions;
}) {
  const { scene, gl, invalidate } = useThree();
  const { active, reduced, registerMotion } = controls;
  const lights = useRef<(PointLight | null)[]>([]);
  const ring = useRef<Mesh>(null);
  const shadows = useRef<(Mesh | null)[]>([]);
  const running = useRef<
    Partial<Record<AnimatedObject, { start: number; variant: number }>>
  >({});
  const nextMouse = useRef(0);
  const color = useRef(new Color(lampColors[1]));
  const transition = useRef({
    start: 0,
    colorStart: new Color(lampColors[1]),
    lightStart: 1,
    light: 1,
  });
  const nodes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(contract.objects).map(([id, item]) => [
          id,
          model.getObjectByName(item.node)!,
        ]),
      ),
    [model],
  );
  const origins = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(nodes).map(([id, node]) => {
          if (!node) throw new Error(`Missing desk interaction node: ${id}`);
          return [
            id,
            {
              position: node.position.clone(),
              quaternion: node.quaternion.clone(),
            },
          ];
        }),
      ),
    [nodes],
  );
  const targetColor = useMemo(
    () => new Color(lampColors[controls.colorIndex]),
    [controls.colorIndex],
  );
  const taskMaterials = useMemo(() => {
    const result: MeshStandardMaterial[] = [];
    nodes.taskLights.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial)
        result.push(o.material);
    });
    return result;
  }, [nodes]);
  const lampMaterials = useMemo(() => {
    const result: MeshStandardMaterial[] = [];
    nodes.lamp.traverse((o) => {
      if (
        o instanceof Mesh &&
        o.material instanceof MeshStandardMaterial &&
        o.material.name === "Rose opal diffuser"
      ) {
        result.push(o.material);
      }
    });
    return result;
  }, [nodes]);
  useEffect(() => {
    transition.current = {
      ...transition.current,
      start: performance.now(),
      colorStart: color.current.clone(),
      lightStart: transition.current.light,
    };
    invalidate();
  }, [controls.lights, controls.colorIndex, controls.reduced, invalidate]);
  useEffect(() => {
    return registerMotion((id, point) => {
      if (!active || reduced || !animated.includes(id as AnimatedObject))
        return;
      const key = id as AnimatedObject;
      if (running.current[key]) return;
      running.current[key] = {
        start: performance.now(),
        variant: id === "mouse" ? nextMouse.current++ % 5 : 0,
      };
      if (id === "mouse" && ring.current) {
        const pivot = contract.targets.mouse.position;
        ring.current.position.set(
          point?.[0] ?? pivot[0],
          0.005,
          point?.[2] ?? pivot[2],
        );
      }
      invalidate();
    });
  }, [active, reduced, registerMotion, invalidate]);
  useEffect(() => {
    if (!controls.active || controls.reduced) {
      running.current = {};
      for (const id of animated) {
        const key = id === "tablet" ? "pencil" : id;
        nodes[key].position.copy(origins[key].position);
        nodes[key].quaternion.copy(origins[key].quaternion);
      }
      if (ring.current) ring.current.visible = false;
      gl.domElement.style.removeProperty("cursor");
      invalidate();
    }
  }, [controls.active, controls.reduced, nodes, origins, gl, invalidate]);
  useEffect(
    () => () => {
      gl.domElement.style.removeProperty("cursor");
    },
    [gl],
  );
  useFrame(() => {
    if (!controls.active) return;
    const now = performance.now();
    const elapsed = now - transition.current.start;
    const ct = controls.reduced ? 1 : Math.min(1, elapsed / 350);
    const lt = controls.reduced ? 1 : Math.min(1, elapsed / 250);
    const ease = (t: number) => t * t * (3 - 2 * t);
    color.current
      .copy(transition.current.colorStart)
      .lerp(targetColor, ease(ct));
    if (scene.background instanceof Color) scene.background.copy(color.current);
    lampMaterials.forEach((material) => {
      material.color.copy(color.current);
      material.emissive.copy(color.current);
      material.emissiveIntensity = 0.65;
    });
    const light =
      transition.current.lightStart +
      ((controls.lights ? 1 : 0) - transition.current.lightStart) * ease(lt);
    transition.current.light = light;
    taskMaterials.forEach((material) => {
      material.emissiveIntensity = 2 * light;
      material.color.setRGB(
        0.08 + 0.87 * light,
        0.08 + 0.64 * light,
        0.08 + 0.32 * light,
      );
    });
    lights.current.forEach((lamp, i) => {
      if (lamp) {
        if (i === 3) lamp.color.copy(color.current);
        else lamp.intensity = [0.22, 0.35, 0.22][i] * light;
      }
    });
    let busy = ct < 1 || lt < 1;
    for (const [index, id] of animated.entries()) {
      const key = id === "tablet" ? "pencil" : id;
      const job = running.current[id];
      const t = job
        ? Math.min(1, (now - job.start) / animationDuration[id])
        : 1;
      const pose = accessoryPose(id, t, job?.variant);
      const origin = origins[key].position;
      nodes[key].position.set(
        origin.x + pose.x,
        origin.y + pose.y,
        origin.z + pose.z,
      );
      nodes[key].quaternion.copy(origins[key].quaternion);
      if (id === "tablet") nodes[key].rotateZ(pose.rotation);
      else nodes[key].rotateY(pose.rotation);
      const shadow = shadows.current[index];
      if (shadow) {
        shadow.position.x = nodes[key].position.x;
        shadow.position.z = nodes[key].position.z;
      }
      if (id === "mouse" && ring.current) {
        ring.current.visible = !!job && t < 0.6;
        ring.current.scale.setScalar(0.7 + t * 2);
        (ring.current.material as MeshBasicMaterial).opacity =
          0.5 * Math.max(0, 1 - t / 0.6);
      }
      if (job && t < 1) busy = true;
      else delete running.current[id];
      gl.domElement.setAttribute(
        `data-${id}-motion`,
        job && t < 1 ? "running" : "idle",
      );
    }
    gl.domElement.setAttribute("data-lights", light.toFixed(3));
    gl.domElement.setAttribute("data-lamp-color", color.current.getHexString());
    gl.domElement.setAttribute(
      "data-mouse-variant",
      String((nextMouse.current + 4) % 5),
    );
    if (busy) invalidate();
  });
  const click = (event: ThreeEvent<MouseEvent>, id?: DeskAction) => {
    event.stopPropagation();
    if (event.delta > 5) return;
    const action = id ?? actionFor(event.object);
    if (action) controls.activate(action, event.point.toArray());
  };
  const over = (event: ThreeEvent<PointerEvent>, id?: DeskAction) => {
    event.stopPropagation();
    gl.domElement.style.setProperty(
      "cursor",
      id || actionFor(event.object) ? "pointer" : "",
    );
  };
  return (
    <>
      <primitive
        object={model}
        dispose={null}
        onClick={click}
        onPointerOver={over}
        onPointerOut={() => {
          gl.domElement.style.removeProperty("cursor");
        }}
      />
      {Object.entries(contract.targets).map(([id, target]) => (
        <mesh
          key={id}
          position={target.position as [number, number, number]}
          onClick={(event) => click(event, id as DeskAction)}
          onPointerOver={(event) => over(event, id as DeskAction)}
          onPointerOut={() => {
            gl.domElement.style.removeProperty("cursor");
          }}
        >
          <boxGeometry args={target.size as [number, number, number]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>
      ))}
      <pointLight
        ref={(node) => {
          lights.current[0] = node;
        }}
        position={[-0.72, 0.3, -0.43]}
        intensity={0.22}
        distance={1.1}
        color="#ffbc78"
      />
      <pointLight
        ref={(node) => {
          lights.current[1] = node;
        }}
        position={[0.09, 0.53, -0.24]}
        intensity={0.35}
        distance={1.2}
        color="#ffe1b0"
      />
      <pointLight
        ref={(node) => {
          lights.current[2] = node;
        }}
        position={[0.08, 0.34, -0.4]}
        intensity={0.22}
        distance={0.9}
        color="#ffb774"
      />
      <pointLight
        ref={(node) => {
          lights.current[3] = node;
        }}
        position={[0.673, 0.16, -0.33]}
        intensity={0.16}
        distance={0.7}
      />
      {animated.map((id, index) => (
        <mesh
          key={id}
          ref={(node) => {
            shadows.current[index] = node;
          }}
          position={[0, 0.0043, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry
            args={
              id === "headphones"
                ? [0.15, 0.1]
                : id === "mouse"
                  ? [0.11, 0.15]
                  : [0.016, 0.175]
            }
          />
          <shaderMaterial
            transparent
            depthWrite={false}
            vertexShader={shadowVertex}
            fragmentShader={shadowFragment}
          />
        </mesh>
      ))}
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.01, 0.011, 40]} />
        <meshBasicMaterial
          color="#e9ddd0"
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
