/**
 * Building blocks shared by the plants in the home page story (MangoTree, Beanstalks):
 * branches drawn as tapering tubes, a real curved leaf blade drawn thousands of times, and
 * shaders that let both grow on screen as the visitor scrolls.
 *
 * Growth works the same way for everything: each bark vertex and each leaf carries the story
 * time (u) at which it appears, so the shaders can grow a branch out from its base and open a
 * leaf from its stalk. Scrolling back up runs it in reverse.
 */

import * as THREE from "three";
import { makeNoise, pixelTexture, rng, smooth } from "./sceneKit";

export const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

/** A branch, stem or leaf stalk: its centre line, thickness, when each point grows, and a tint. */
export type Branch = { pts: THREE.Vector3[]; radii: number[]; births: number[]; tint: THREE.Color };

/** One leaf blade: base point, the directions it points along / across / faces, size, colour, and when it opens. */
export type LeafSpec = {
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  side: THREE.Vector3;
  nrm: THREE.Vector3;
  length: number;
  width: number;
  depth: number; // how strongly the blade droops and folds
  color: THREE.Color;
  birth: number;
};

export type Rand = () => number;

export function randUnit(rand: Rand) {
  const v = new THREE.Vector3();
  for (;;) {
    v.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    const l = v.length();
    if (l > 0.05 && l <= 1) return v.normalize();
  }
}

/** Two directions at right angles to `d` (and to each other). */
export function perpBasis(d: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const a = Math.abs(d.y) < 0.9 ? UP : X_AXIS;
  const u = d.clone().cross(a).normalize();
  const v = d.clone().cross(u).normalize();
  return [u, v];
}

/** Across and facing directions for a leaf pointing along `dir`, rolled a little at random. */
export function leafFrame(dir: THREE.Vector3, rand: Rand) {
  const side = dir.clone().cross(UP);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  const nrm = side.clone().cross(dir).normalize();
  const roll = (rand() - 0.5) * 0.9;
  return {
    side: side.clone().multiplyScalar(Math.cos(roll)).addScaledVector(nrm, Math.sin(roll)),
    nrm: nrm.clone().multiplyScalar(Math.cos(roll)).addScaledVector(side, -Math.sin(roll)),
  };
}

/** Colour from a ramp of [position, linear rgb] stops. */
export function rampColor(t: number, stops: [number, [number, number, number]][], out: THREE.Color) {
  if (t <= stops[0][0]) return out.setRGB(...stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      const k = (t - p0) / (p1 - p0);
      return out.setRGB(c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k);
    }
  }
  return out.setRGB(...stops[stops.length - 1][1]);
}

/** Matrix that places the unit leaf blade (see leafGeometry) as described by a LeafSpec. */
export function leafMatrix(l: LeafSpec, out = new THREE.Matrix4()) {
  const x = l.side.clone().multiplyScalar(l.width);
  const y = l.dir.clone().multiplyScalar(l.length);
  const z = l.nrm.clone().multiplyScalar(l.depth);
  return out.makeBasis(x, y, z).setPosition(l.pos);
}

// ---------------------------------------------------------------- geometry

/** Smooths thick branches into gentle curves (thin twigs stay as they are). */
function smoothed(b: Branch): Branch {
  if (b.pts.length < 3 || b.radii[0] < 0.025) return b;
  const curve = new THREE.CatmullRomCurve3(b.pts, false, "centripetal");
  const n = (b.pts.length - 1) * 2;
  const pts: THREE.Vector3[] = [];
  const radii: number[] = [];
  const births: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(curve.getPoint(t));
    const f = t * (b.pts.length - 1);
    const k = Math.min(b.pts.length - 2, Math.floor(f));
    const w = f - k;
    radii.push(b.radii[k] + (b.radii[k + 1] - b.radii[k]) * w);
    births.push(b.births[k] + (b.births[k + 1] - b.births[k]) * w);
  }
  return { pts, radii, births, tint: b.tint };
}

/**
 * All branches as one mesh of tapering tubes. Each vertex also stores its point on the centre
 * line (aCenter) and when it grows (aBirth), for the growing shader.
 */
export function branchGeometry(input: Branch[]) {
  const branches = input.map(smoothed);
  const radialFor = (r: number) => (r > 0.08 ? 14 : r > 0.035 ? 10 : r > 0.015 ? 7 : r > 0.006 ? 5 : 3);
  let verts = 0;
  let tris = 0;
  for (const b of branches) {
    const R = radialFor(b.radii[0]);
    verts += b.pts.length * (R + 1);
    tris += (b.pts.length - 1) * R * 2;
  }
  const position = new Float32Array(verts * 3);
  const normal = new Float32Array(verts * 3);
  const uv = new Float32Array(verts * 2);
  const color = new Float32Array(verts * 3);
  const center = new Float32Array(verts * 3);
  const birth = new Float32Array(verts);
  const indices = new Uint32Array(tris * 3);
  const green = new THREE.Color(0.62, 0.72, 0.45);
  const c = new THREE.Color();
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), off = new THREE.Vector3();
  let v = 0;
  let ix = 0;

  for (const b of branches) {
    const n = b.pts.length - 1;
    const R = radialFor(b.radii[0]);
    const first = v;
    let arc = 0;
    for (let i = 0; i <= n; i++) {
      const p = b.pts[i];
      const r = b.radii[i];
      T.subVectors(b.pts[Math.min(i + 1, n)], b.pts[Math.max(i - 1, 0)]).normalize();
      if (i === 0) N.copy(Math.abs(T.y) < 0.9 ? UP : X_AXIS).cross(T).normalize();
      else {
        N.addScaledVector(T, -T.dot(N)).normalize(); // parallel transport: the tube doesn't twist
        arc += p.distanceTo(b.pts[i - 1]);
      }
      B.crossVectors(T, N);
      const wraps = Math.max(1, Math.round((2 * Math.PI * r) / 0.25));
      c.copy(b.tint).multiply(new THREE.Color(1, 1, 1).lerp(green, 1 - smooth(0.004, 0.02, r))); // young shoots are green
      for (let j = 0; j <= R; j++) {
        const a = (j / R) * Math.PI * 2;
        off.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
        position.set([p.x + off.x * r, p.y + off.y * r, p.z + off.z * r], v * 3);
        normal.set([off.x, off.y, off.z], v * 3);
        uv.set([(j / R) * wraps, arc / 0.45], v * 2);
        color.set([c.r, c.g, c.b], v * 3);
        center.set([p.x, p.y, p.z], v * 3);
        birth[v] = b.births[i];
        v++;
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < R; j++) {
        const a = first + i * (R + 1) + j;
        const bb = a + R + 1;
        indices.set([a, a + 1, bb, a + 1, bb + 1, bb], ix);
        ix += 6;
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(position, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.BufferAttribute(color, 3));
  g.setAttribute("aCenter", new THREE.BufferAttribute(center, 3));
  g.setAttribute("aBirth", new THREE.BufferAttribute(birth, 1));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  return g;
}

/**
 * One leaf blade, 1 long and 1 wide, from its stalk (origin) along +y, facing +z: lance-shaped
 * with a pointed tip, folded slightly along the midrib, and drooping towards the tip.
 */
export function leafGeometry(rows = 5) {
  const pos: number[] = [0, 0, 0];
  for (let k = 1; k <= rows; k++) {
    const t = k / (rows + 1);
    const w = 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.85);
    const zc = -0.14 * t * t; // droop
    const edge = zc + 0.035 * (w / 0.5) + 0.012 * Math.sin(t * 15); // fold and a slight wave
    pos.push(-w, t, edge, 0, t, zc, w, t, edge - 0.024 * Math.sin(t * 15));
  }
  pos.push(0, 1, -0.14);
  const row = (k: number) => [1 + 3 * (k - 1), 2 + 3 * (k - 1), 3 + 3 * (k - 1)];
  const tip = 1 + 3 * rows;
  const idx: number[] = [];
  const [l1, m1, r1] = row(1);
  idx.push(0, m1, l1, 0, r1, m1);
  for (let k = 1; k < rows; k++) {
    const [la, ma, ra] = row(k);
    const [lb, mb, rb] = row(k + 1);
    idx.push(la, ma, mb, la, mb, lb, ma, ra, rb, ma, rb, mb);
  }
  const [lr, mr, rr] = row(rows);
  idx.push(lr, mr, tip, mr, rr, tip);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- textures

/** Rough, dark grey-brown bark with long vertical fissures, scaly plates and lichen. */
export function barkTexture() {
  const n = makeNoise(5);
  const rand = rng(5);
  return pixelTexture(128, 256, (u, v, px) => {
    const streaks = n.fbm(u * 10, v * 2, 5, 10);
    const plates = n.fbm(u * 6 + 3, v * 3, 4, 3);
    const fissure = Math.abs(n.fbm(u * 12 + 7, v * 1.6, 3, 12) - 0.5);
    const h = streaks * 0.6 + plates * 0.25 + 0.1;
    const dark = fissure < 0.025 ? 0.35 : fissure < 0.05 ? 0.7 : 1;
    const lichen = smooth(0.55, 0.72, n.fbm(u * 2 + 9, v * 2 + 4, 4, 2)) * 0.35;
    const base = [40 + h * 85, 33 + h * 70, 26 + h * 56];
    const tint = [120, 122, 96];
    for (let k = 0; k < 3; k++) px[k] = (base[k] + (tint[k] - base[k]) * lichen) * dark;
  }, true, (ctx) => {
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(40,30,22,${rand() * 0.35})`;
      ctx.fillRect(rand() * 128, rand() * 256, 1 + rand() * 3, 1 + rand() * 5);
    }
  });
}

// ---------------------------------------------------------------- shaders

export type GrowUniforms = {
  uGrow: { value: number };
  uTime: { value: number };
  uCenter: { value: THREE.Vector3 };
  uRadii: { value: THREE.Vector3 };
  uSunView: { value: THREE.Vector3 };
  uTranslucency: { value: number };
};

/** `center`/`radii`: the crown, inside which leaves are shaded darker (use a huge radius for none). */
export function growUniforms(center: THREE.Vector3, radii: THREE.Vector3): GrowUniforms {
  return {
    uGrow: { value: 0 },
    uTime: { value: 0 },
    uCenter: { value: center.clone() },
    uRadii: { value: radii.clone() },
    uSunView: { value: new THREE.Vector3(0, 1, 0) },
    uTranslucency: { value: 0 },
  };
}

/** Branches grow out from their base and thicken with age. */
export function growingBark<M extends THREE.Material>(mat: M, uniforms: GrowUniforms, key: string): M {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 aCenter;\nattribute float aBirth;\nuniform float uGrow;")
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
float tipGrow = smoothstep(aBirth, aBirth + 0.05, uGrow);
float girth = mix(0.35, 1.0, smoothstep(aBirth, aBirth + 0.8, uGrow));
transformed = aCenter + (transformed - aCenter) * tipGrow * girth;`,
      );
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

/**
 * Leaves open from their stalk when their time comes and flutter in the breeze. The full
 * (non-shadow) version also draws the pale midrib and lighter underside, darkens leaves deep
 * inside the crown, and lets sunlight glow through a leaf when the sun is behind it.
 */
export function growingLeaves<M extends THREE.Material>(mat: M, uniforms: GrowUniforms, key: string, shadowOnly: boolean): M {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
attribute float aBirth;
uniform float uGrow;
uniform float uTime;
uniform vec3 uCenter;
uniform vec3 uRadii;
varying float vShadeIn;
varying float vAcross;`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
float open = smoothstep(aBirth, aBirth + 0.12, uGrow);
vAcross = position.x * 2.0;
vec3 leafAt = instanceMatrix[3].xyz;
transformed.z += sin(uTime * 2.3 + leafAt.x * 7.0 + leafAt.z * 5.0 + leafAt.y * 3.0) * 0.1 * position.y * position.y * open;
transformed.x *= open * open; // the blade unrolls as it grows
transformed.yz *= open;
vec3 inCrown = (leafAt - uCenter) / uRadii;
vShadeIn = mix(0.5, 1.0, smoothstep(0.35, 1.0, length(inCrown))) * mix(0.72, 1.0, smoothstep(-0.8, 0.3, inCrown.y));`,
      );
    if (!shadowOnly) {
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uSunView;\nuniform float uTranslucency;\nvarying float vShadeIn;\nvarying float vAcross;")
        .replace(
          "#include <color_fragment>",
          /* glsl */ `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.26, 0.08), (1.0 - smoothstep(0.0, 0.07, abs(vAcross))) * 0.5);
if (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.11, 0.19, 0.07), 0.45);
diffuseColor.rgb *= vShadeIn;`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          /* glsl */ `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * vec3(1.5, 1.9, 1.1) * max(-dot(normal, uSunView), 0.0) * uTranslucency;`,
        );
    }
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

/** Leaf material pair (colour + shadow) for an InstancedMesh of leafGeometry blades. */
export function leafMaterials(uniforms: GrowUniforms, key: string, roughness = 0.38) {
  const color = growingLeaves(
    new THREE.MeshStandardMaterial({ roughness, side: THREE.DoubleSide, shadowSide: THREE.DoubleSide }),
    uniforms,
    key,
    false,
  );
  const depth = growingLeaves(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uniforms, `${key}-depth`, true);
  return { color, depth };
}

/** Fills an InstancedMesh of leaves (matrices, colours) and its per-leaf birth times. */
export function fillLeaves(mesh: THREE.InstancedMesh, leaves: LeafSpec[]) {
  const m = new THREE.Matrix4();
  leaves.forEach((l, i) => {
    mesh.setMatrixAt(i, leafMatrix(l, m));
    mesh.setColorAt(i, l.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** The leaf blade geometry with each leaf's birth time attached. */
export function leafSetGeometry(leaves: LeafSpec[]) {
  const g = leafGeometry();
  g.setAttribute("aBirth", new THREE.InstancedBufferAttribute(Float32Array.from(leaves.map((l) => l.birth)), 1));
  return g;
}

/** Keeps the translucency's sun direction in camera space and its strength in step with the daylight. */
export function updateLeafLight(uniforms: GrowUniforms, sunDir: THREE.Vector3, camera: THREE.Camera, strength: number) {
  uniforms.uSunView.value.copy(sunDir).transformDirection(camera.matrixWorldInverse);
  uniforms.uTranslucency.value = strength;
}
