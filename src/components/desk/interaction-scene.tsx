"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Color,
  CanvasTexture,
  AdditiveBlending,
  Sprite,
  SpriteMaterial,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  SpotLight,
  type WebGLRenderer,
} from "three";
import contract from "@/lib/desk-interactions.json";
import {
  accessoryPose,
  drawerIds,
  drawerOffset,
  drawerWave,
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
  "drawers",
]);
const animated = ["headphones", "mouse", "tablet"] as const;
function actionFor(object: Object3D): DeskAction | undefined {
  const id = object.userData.interaction;
  if (drawerIds.includes(id)) return "drawers";
  return actions.has(id) ? (id as DeskAction) : undefined;
}
const shadowVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
const shadowFragment = `varying vec2 vUv; void main(){float r=length((vUv-.5)*2.);gl_FragColor=vec4(0.,0.,0.,.22*pow(max(0.,1.-r),2.));}`;

// Three.js owns these mutable GPU resources, outside React's state model.
function cacheShadows(renderer: WebGLRenderer, cached: boolean) {
  renderer.shadowMap.autoUpdate = !cached;
  renderer.shadowMap.needsUpdate = true;
}
function dirtyShadows(renderer: WebGLRenderer) {
  renderer.shadowMap.needsUpdate = true;
}

export default function InteractionScene({
  model,
  controls,
}: {
  model: Group;
  controls: DeskInteractions;
}) {
  const { gl, invalidate } = useThree();
  const { active, reduced, registerMotion } = controls;
  const lights = useRef<(PointLight | SpotLight | null)[]>([]);
  const ring = useRef<Mesh>(null);
  const biasStrip = useRef<Mesh>(null);
  const glow = useRef<Sprite>(null);
  const glowMap = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,0.6)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.22)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => glowMap.dispose(), [glowMap]);
  const lampTarget = useMemo(() => {
    const target = new Object3D();
    target.position.set(0.58, 0, -0.22);
    return target;
  }, []);
  const shadows = useRef<InstancedMesh>(null);
  const shadowTransform = useMemo(() => {
    const transform = new Object3D();
    transform.rotation.x = -Math.PI / 2;
    return transform;
  }, []);
  const running = useRef<
    Partial<Record<AnimatedObject, { start: number; variant: number }>>
  >({});
  const nextMouse = useRef(0);
  const drawerStart = useRef<number | null>(null);
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
  // Light positions are fixed. Rebuild depth maps only when a caster moves.
  useEffect(() => {
    cacheShadows(gl, true);
    invalidate();
    return () => {
      cacheShadows(gl, false);
    };
  }, [gl, invalidate]);
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
      if (!active || reduced) return;
      if (id === "drawers") {
        if (drawerStart.current === null) {
          drawerStart.current = performance.now();
          invalidate();
        }
        return;
      }
      if (!animated.includes(id as AnimatedObject)) return;
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
      drawerStart.current = null;
      dirtyShadows(gl);
      for (const id of drawerIds) nodes[id].position.copy(origins[id].position);
      gl.domElement.setAttribute("data-drawers-motion", "idle");
      gl.domElement.setAttribute(
        "data-drawer-offsets",
        "0.000,0.000,0.000,0.000",
      );
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
    const movingCasters =
      drawerStart.current !== null ||
      animated.some((id) => running.current[id]);
    if (movingCasters) dirtyShadows(gl);
    // A final clean frame also makes idle metrics exclude the last depth update.
    if (gl.shadowMap.needsUpdate) invalidate();
    const now = performance.now();
    const elapsed = now - transition.current.start;
    const ct = controls.reduced ? 1 : Math.min(1, elapsed / 350);
    const lt = controls.reduced ? 1 : Math.min(1, elapsed / 250);
    const ease = (t: number) => t * t * (3 - 2 * t);
    color.current
      .copy(transition.current.colorStart)
      .lerp(targetColor, ease(ct));
    if (glow.current)
      (glow.current.material as SpriteMaterial).color.copy(color.current);
    lampMaterials.forEach((material) => {
      material.color.copy(color.current);
      material.emissive.copy(color.current);
      material.emissiveIntensity = 9;
      material.roughness = 1;
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
    if (biasStrip.current) {
      const material = biasStrip.current.material as MeshStandardMaterial;
      material.emissiveIntensity = 4 * light;
      material.color.setScalar(0.04 + 0.8 * light);
    }
    lights.current.forEach((lamp, i) => {
      if (lamp) {
        if (i === 3) lamp.color.copy(color.current);
        else lamp.intensity = [0.22, 0.35, 0.65][i] * light;
      }
    });
    let busy = ct < 1 || lt < 1;
    const drawerElapsed =
      drawerStart.current === null
        ? drawerWave.duration
        : now - drawerStart.current;
    const drawersMoving = drawerElapsed < drawerWave.duration;
    const offsets = drawerIds.map((id, index) => {
      const offset = drawerOffset(drawerElapsed, index);
      nodes[id].position.z = origins[id].position.z + offset;
      return offset.toFixed(3);
    });
    gl.domElement.setAttribute("data-drawer-offsets", offsets.join(","));
    gl.domElement.setAttribute(
      "data-drawers-motion",
      drawersMoving ? "running" : "idle",
    );
    if (drawersMoving) busy = true;
    else drawerStart.current = null;
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
      if (shadows.current) {
        shadowTransform.position.set(
          nodes[key].position.x,
          0.0043,
          nodes[key].position.z,
        );
        const size =
          id === "headphones"
            ? [0.15, 0.1]
            : id === "mouse"
              ? [0.11, 0.15]
              : [0.016, 0.175];
        shadowTransform.scale.set(size[0], size[1], 1);
        shadowTransform.updateMatrix();
        shadows.current.setMatrixAt(index, shadowTransform.matrix);
        shadows.current.instanceMatrix.needsUpdate = true;
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
            visible={false}
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
        position={[0.08, 0.2, -0.36]}
        intensity={0.65}
        distance={0.9}
        color="#ffb774"
      />
      <sprite ref={glow} position={[0.673, 0.12, -0.33]} scale={[0.3, 0.38, 1]}>
        <spriteMaterial
          map={glowMap}
          blending={AdditiveBlending}
          transparent
          opacity={0.8}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <primitive object={lampTarget} />
      <spotLight
        castShadow
        target={lampTarget}
        angle={1.25}
        penumbra={0.8}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.02}
        shadow-camera-far={1.5}
        shadow-bias={-0.0002}
        shadow-normalBias={0.001}
        ref={(node) => {
          lights.current[3] = node;
        }}
        position={[0.673, 0.16, -0.33]}
        intensity={3}
        distance={1.2}
      />
      <mesh ref={biasStrip} position={[0.09, 0.3, -0.322]}>
        <boxGeometry args={[0.61, 0.006, 0.006]} />
        <meshStandardMaterial
          color="#ffe0b0"
          emissive="#ffb774"
          emissiveIntensity={4}
        />
      </mesh>
      <instancedMesh
        ref={shadows}
        args={[undefined, undefined, 3]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader={shadowVertex}
          fragmentShader={shadowFragment}
        />
      </instancedMesh>
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
