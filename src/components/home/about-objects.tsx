"use client";
import { useMemo } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  Quaternion,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural objects for the About scene. Everything is built from geometry
 * and small canvas textures: no model downloads. Materials follow the site's
 * 3D language: glossy clay, felt and a little chrome.
 */
export const palette = {
  paper: "#f5f6f8",
  ink: "#17212b",
  cobalt: "#1947e5",
  volt: "#d8f23c",
  basketball: "#e8762b",
} as const;

export function clay(color: string, extra: Partial<MeshPhysicalMaterial> = {}) {
  return new MeshPhysicalMaterial({
    color,
    roughness: 0.38,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
    ...extra,
  });
}

/**
 * Seams drawn from the object-space normal, so no texture is needed. `seam` is
 * the body of `float seamDistance(vec3 n)`, which gets the unit normal and
 * returns its distance to the nearest seam; `width` is the seam's half width.
 */
function withSeams(
  material: MeshPhysicalMaterial,
  seam: string,
  seamColor: string,
  width = 0.022,
) {
  const color = new Color(seamColor);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSeamColor = { value: color };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vObjectNormal;",
      )
      .replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\nvObjectNormal = objectNormal;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vObjectNormal;
        uniform vec3 uSeamColor;
        float seamDistance(vec3 n) {${seam}}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float seam = seamDistance(normalize(vObjectNormal));
        float seamSoftness = fwidth(seam) + 0.012;
        diffuseColor.rgb = mix(uSeamColor, diffuseColor.rgb, smoothstep(${width.toFixed(3)}, ${width.toFixed(3)} + seamSoftness, seam));`,
      );
  };
  material.customProgramCacheKey = () => seam;
  return material;
}

export function basketball() {
  const material = withSeams(
    clay(palette.basketball, { roughness: 0.62, clearcoat: 0.25 }),
    // An eight-panel ball: the equator (y = 0), one meridian (x = 0) and a
    // curved seam around each pole. The curved seam dips to 13° latitude where
    // it crosses the meridian and rises to 46° halfway between. Its distance is
    // divided by the curve's slope so the line keeps one width all the way round.
    `float lines = min(abs(n.y), abs(n.x));
    float ring = max(length(n.xz), 1e-3);
    float latitude = atan(abs(n.y), ring);
    float cos2 = (n.z * n.z - n.x * n.x) / (ring * ring);
    float sin2 = 2.0 * n.x * n.z / (ring * ring);
    float slope = 0.58 * sin2 / ring;
    float curve = abs(latitude - (0.515 - 0.29 * cos2)) / sqrt(1.0 + slope * slope);
    return min(lines, curve);`,
    "#1f1109",
    0.016,
  );
  return { geometry: new SphereGeometry(1, 64, 48), material };
}

export function tennisBall() {
  const material = withSeams(
    new MeshPhysicalMaterial({
      color: palette.volt,
      roughness: 0.9,
      sheen: 1,
      sheenRoughness: 0.6,
      sheenColor: new Color("#f7ffc4"),
    }),
    // The saddle curve of a tennis ball's seam.
    "return abs(n.y - 0.62 * (n.x * n.x - n.z * n.z));",
    "#fbfbf2",
  );
  return { geometry: new SphereGeometry(1, 48, 36), material };
}

function tube(
  points: [number, number, number][],
  radius: number,
  closed = false,
) {
  return new TubeGeometry(
    new CatmullRomCurve3(
      points.map((p) => new Vector3(...p)),
      closed,
      "centripetal",
    ),
    closed ? 120 : 24,
    radius,
    12,
    closed,
  );
}

/** A tennis racket: tube frame, throat and handle, strings as one instanced mesh. */
export function racket() {
  const a = 0.42;
  const b = 0.55;
  const head = Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2;
    return [Math.cos(t) * a, Math.sin(t) * b, 0] as [number, number, number];
  });
  const frame = tube(head, 0.042, true);
  const throatLeft = tube(
    [
      [-0.2, -0.49, 0],
      [-0.1, -0.72, 0],
      [0, -0.9, 0],
    ],
    0.034,
  );
  const throatRight = tube(
    [
      [0.2, -0.49, 0],
      [0.1, -0.72, 0],
      [0, -0.9, 0],
    ],
    0.034,
  );
  const handle = new CylinderGeometry(0.058, 0.066, 0.72, 20);
  handle.translate(0, -1.26, 0);
  const strings = new InstancedMesh(
    new BoxGeometry(1, 1, 1),
    new MeshPhysicalMaterial({ color: "#e8edf3", roughness: 0.5 }),
    24,
  );
  const matrix = new Matrix4();
  const identity = new Quaternion();
  let index = 0;
  for (let i = 0; i < 12; i++) {
    const x = -a + ((i + 1) * 2 * a) / 13;
    const length = 2 * b * Math.sqrt(1 - (x / a) ** 2);
    matrix.compose(
      new Vector3(x, 0, 0),
      identity,
      new Vector3(0.01, length, 0.01),
    );
    strings.setMatrixAt(index++, matrix);
  }
  for (let i = 0; i < 12; i++) {
    const y = -b + ((i + 1) * 2 * b) / 13;
    const length = 2 * a * Math.sqrt(1 - (y / b) ** 2);
    matrix.compose(
      new Vector3(0, y, 0),
      identity,
      new Vector3(length, 0.01, 0.01),
    );
    strings.setMatrixAt(index++, matrix);
  }
  return {
    // One mesh for the whole frame keeps the scene's draw calls low.
    frame: mergeGeometries([frame, throatLeft, throatRight])!,
    handle,
    strings,
    frameMaterial: clay(palette.cobalt),
    handleMaterial: clay(palette.ink, { roughness: 0.7, clearcoat: 0.2 }),
  };
}

/** A small canvas texture with centred text, for keycaps, the chip and the terminal. */
export function labelTexture(
  draw: (context: CanvasRenderingContext2D, size: number) => void,
  size = 256,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  draw(context, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function terminal() {
  const body = new RoundedBoxGeometry(1.36, 0.94, 0.12, 4, 0.07);
  const screen = labelTexture((c, s) => {
    c.fillStyle = palette.ink;
    c.fillRect(0, 0, s, s);
    c.fillStyle = "#2a3644";
    c.fillRect(0, 0, s, s * 0.16);
    ["#ff6b5f", "#ffc84a", "#39c46b"].forEach((color, i) => {
      c.fillStyle = color;
      c.beginPath();
      c.arc(s * (0.09 + i * 0.07), s * 0.08, s * 0.025, 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = palette.volt;
    c.font = `700 ${s * 0.15}px ui-monospace, Menlo, monospace`;
    c.fillText(">_ build", s * 0.08, s * 0.42);
    c.fillStyle = "#8fa1b8";
    c.font = `600 ${s * 0.09}px ui-monospace, Menlo, monospace`;
    c.fillText("> evaluate", s * 0.08, s * 0.62);
    c.fillText("> ship", s * 0.08, s * 0.78);
  });
  return {
    body,
    bodyMaterial: clay(palette.paper),
    screenMaterial: new MeshPhysicalMaterial({
      map: screen,
      roughness: 0.3,
      clearcoat: 1,
    }),
  };
}

/** The `</>` glyph as three puffy extrusions. */
export function braces() {
  const chevron = new Shape();
  const points = [
    [0.32, 0.52],
    [0.46, 0.4],
    [0.12, 0],
    [0.46, -0.4],
    [0.32, -0.52],
    [-0.08, 0],
  ];
  chevron.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => chevron.lineTo(x, y));
  const slash = new Shape();
  slash.moveTo(0.1, 0.56);
  slash.lineTo(0.24, 0.56);
  slash.lineTo(-0.1, -0.56);
  slash.lineTo(-0.24, -0.56);
  const settings = {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 5,
  };
  const left = new ExtrudeGeometry(chevron, settings);
  left.translate(-0.62, 0, 0);
  const right = new ExtrudeGeometry(chevron, settings);
  right.rotateY(Math.PI);
  right.translate(0.62, 0, 0.14);
  const middle = new ExtrudeGeometry(slash, settings);
  return {
    geometry: mergeGeometries([left, middle, right])!,
    material: clay(palette.cobalt),
  };
}

/** An AI chip: rounded die, chrome pins, a printed label. */
export function chip() {
  const die = new RoundedBoxGeometry(0.82, 0.82, 0.16, 4, 0.06);
  const pins = new InstancedMesh(
    new BoxGeometry(0.07, 0.16, 0.04),
    new MeshPhysicalMaterial({
      color: "#c9d2dc",
      metalness: 1,
      roughness: 0.22,
    }),
    20,
  );
  const matrix = new Matrix4();
  let index = 0;
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2;
    const rotation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 0, 1),
      angle,
    );
    for (let i = 0; i < 5; i++) {
      const along = -0.28 + i * 0.14;
      const position = new Vector3(along, 0.48, 0).applyQuaternion(rotation);
      matrix.compose(position, rotation, new Vector3(1, 1, 1));
      pins.setMatrixAt(index++, matrix);
    }
  }
  const label = labelTexture((c, s) => {
    c.fillStyle = palette.ink;
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#33414f";
    c.lineWidth = s * 0.03;
    c.strokeRect(s * 0.14, s * 0.14, s * 0.72, s * 0.72);
    c.fillStyle = palette.volt;
    c.font = `900 ${s * 0.3}px "Portfolio Display", system-ui, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("AI", s / 2, s * 0.52);
  });
  return {
    die,
    pins,
    dieMaterial: clay(palette.ink, { roughness: 0.5, clearcoat: 0.6 }),
    labelMaterial: new MeshPhysicalMaterial({ map: label, roughness: 0.45 }),
  };
}

/** A three-layer network: node spheres and edges, two instanced meshes. */
export function network() {
  const layers = [3, 4, 2];
  const nodes: Vector3[][] = layers.map((count, layer) =>
    Array.from(
      { length: count },
      (_, i) =>
        new Vector3((layer - 1) * 0.55, (i - (count - 1) / 2) * 0.32, 0),
    ),
  );
  const flat = nodes.flat();
  const spheres = new InstancedMesh(
    new SphereGeometry(0.075, 24, 16),
    clay(palette.volt),
    flat.length,
  );
  const matrix = new Matrix4();
  const identity = new Quaternion();
  flat.forEach((node, i) => {
    matrix.compose(node, identity, new Vector3(1, 1, 1));
    spheres.setMatrixAt(i, matrix);
  });
  const edges: [Vector3, Vector3][] = [];
  for (let layer = 0; layer < layers.length - 1; layer++)
    for (const from of nodes[layer])
      for (const to of nodes[layer + 1]) edges.push([from, to]);
  const links = new InstancedMesh(
    new CylinderGeometry(1, 1, 1, 6),
    new MeshPhysicalMaterial({
      color: "#dce5f5",
      roughness: 0.4,
      transparent: true,
      opacity: 0.55,
    }),
    edges.length,
  );
  const up = new Vector3(0, 1, 0);
  edges.forEach(([from, to], i) => {
    const direction = to.clone().sub(from);
    const rotation = new Quaternion().setFromUnitVectors(
      up,
      direction.clone().normalize(),
    );
    matrix.compose(
      from.clone().add(to).multiplyScalar(0.5),
      rotation,
      new Vector3(0.012, direction.length(), 0.012),
    );
    links.setMatrixAt(i, matrix);
  });
  return { spheres, links };
}

/** Two keycaps with printed legends. */
export function keycaps() {
  const geometry = new RoundedBoxGeometry(0.46, 0.46, 0.24, 4, 0.08);
  const legends = ["ML", "⌘"].map((legend) =>
    labelTexture((c, s) => {
      c.fillStyle = palette.paper;
      c.fillRect(0, 0, s, s);
      c.fillStyle = palette.ink;
      c.font = `800 ${s * 0.34}px "Manrope Variable", system-ui, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(legend, s / 2, s * 0.53);
    }, 128),
  );
  return {
    geometry,
    capMaterial: clay(palette.paper, { roughness: 0.45 }),
    legendMaterials: legends.map(
      (map) => new MeshPhysicalMaterial({ map, roughness: 0.45 }),
    ),
  };
}

/** A brand mark from simple-icons, extruded into a puffy clay badge. */
export function useLogoGeometry(path: string) {
  return useMemo(() => {
    const svg = new SVGLoader().parse(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}"/></svg>`,
    );
    const shapes = svg.paths.flatMap((item) => SVGLoader.createShapes(item));
    const geometry = new ExtrudeGeometry(shapes, {
      depth: 2.2,
      bevelEnabled: true,
      bevelThickness: 0.9,
      bevelSize: 0.55,
      bevelSegments: 4,
      curveSegments: 10,
    });
    geometry.center();
    geometry.scale(1 / 24, 1 / 24, 1 / 24);
    return geometry;
  }, [path]);
}
