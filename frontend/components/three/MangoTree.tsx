"use client";

/**
 * A mango tree (Mangifera indica) that grows as the visitor scrolls. The design follows a
 * procedural Blender model of a mango tree, adapted to run live in the browser:
 *  - a short trunk with a root flare and surface roots, forking into five big limbs;
 *  - branches that split again and again inside a lumpy dome-shaped crown, each reaching part of
 *    the way to the crown's edge, with side shoots filling the inside;
 *  - tufts of long glossy leaves in a spiral at every twig tip (some copper-red new flush that
 *    hangs limp), with pale midribs, lighter undersides and sunlight glowing through;
 *  - mangoes hanging on long stalks, one to three each, from green to yellow-orange with a red
 *    blush on the sunny side; and fallen leaves gathering underneath.
 *
 * Sizes are taken from the model in metres and scaled to the island (S). Growth spreads out from
 * the trunk to the twig tips, leaves open as the tips arrive, then the fruit sets and ripens.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { surfaceY } from "./Island";
import { SUN_DIR, easeOutBack, rng, smooth, sunAmount, useOwned, type Story } from "./sceneKit";
import {
  UP, barkTexture, branchGeometry, fillLeaves, growUniforms, growingBark, leafFrame, leafMaterials, leafSetGeometry,
  perpBasis, rampColor, randUnit, updateLeafLight, type Branch, type LeafSpec,
} from "./treeKit";

export const TREE_BASE_Y = 0.05;
/** Story time (u) at which the trunk starts growing out of the sprout. */
export const TREE_START = 2.75;
/** Story time by which the furthest twig tips have grown. */
const TREE_GROWN = 3.9;

// The model, in metres
const S = 0.53; // metres -> scene units (the crown just fits the island)
const LEAF_SCALE = 1.7; // leaves and fruit drawn larger than life, as there are fewer of them than on a real tree
const TRUNK_HEIGHT = 1.7;
const TRUNK_RADIUS = 0.3;
const CANOPY_RADIUS = 5.2;
const CANOPY_HALF_HEIGHT = 3.3;
const CANOPY_CENTER_Y = 4.9;
const SCAFFOLD_LIMBS = 5;
const BRANCH_LEVELS = 5; // one fewer than the offline model, to keep the leaf count real-time friendly
const LEAVES_PER_TUFT: [number, number] = [11, 16];
const LEAF_LENGTH: [number, number] = [0.2, 0.31];
const YOUNG_FLUSH_CHANCE = 0.045;
const FRUIT_CLUSTERS = 36;
const MAXLEN = [3.0, 2.2, 1.6, 1.2, 0.9, 0.7, 0.55, 0.45];

/** Scene-space crown, for shading leaves darker inside it. */
export const CROWN_CENTER = new THREE.Vector3(0, CANOPY_CENTER_Y * S + TREE_BASE_Y, 0);
export const CROWN_RADII = new THREE.Vector3(CANOPY_RADIUS * S, CANOPY_HALF_HEIGHT * S, CANOPY_RADIUS * S);

type Tuft = { pos: THREE.Vector3; dir: THREE.Vector3; kind: 0 | 1; path: number };
type Mango = { attach: THREE.Vector3; hang: THREE.Vector3; stalk: number; size: number; spin: number; tilt: THREE.Euler; birth: number; skin: THREE.Color; blush: number };

const LEAF_GREEN: [number, [number, number, number]][] = [[0, [0.012, 0.04, 0.009]], [0.45, [0.024, 0.068, 0.015]], [0.85, [0.045, 0.1, 0.02]], [1, [0.085, 0.125, 0.03]]];
const LEAF_FLUSH: [number, [number, number, number]][] = [[0, [0.18, 0.035, 0.03]], [0.5, [0.26, 0.07, 0.04]], [1, [0.24, 0.13, 0.05]]];
const MANGO_SKIN: [number, [number, number, number]][] = [[0, [0.09, 0.25, 0.03]], [0.5, [0.2, 0.36, 0.05]], [0.75, [0.55, 0.52, 0.07]], [0.92, [0.85, 0.52, 0.06]], [1, [0.88, 0.36, 0.05]]];
const FALLEN: [number, [number, number, number]][] = [[0, [0.08, 0.045, 0.02]], [0.4, [0.16, 0.09, 0.035]], [0.75, [0.26, 0.17, 0.05]], [1, [0.12, 0.12, 0.04]]];
const LEAF_BRIGHTNESS = 1.6; // the model's colours are tuned for a brighter renderer

// ---------------------------------------------------------------- the tree (generated once, in metres, y up)

const TREE = (() => {
  const rand = rng(3);
  const U = (a: number, b: number) => a + (b - a) * rand();
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const C = new THREE.Vector3(0, CANOPY_CENTER_Y, 0);
  const RAD = new THREE.Vector3(CANOPY_RADIUS, CANOPY_HALF_HEIGHT, CANOPY_RADIUS);
  const BUMPS = Array.from({ length: 12 }, () => ({ n: randUnit(rand), a: U(0.05, 0.15) }));
  const lump = (d: THREE.Vector3) => BUMPS.reduce((f, b) => f + b.a * Math.max(0, d.dot(b.n)) ** 6, 0.94);

  /** How far from p, going along d, until the (lumpy) crown edge. */
  function exitDist(p: THREE.Vector3, d: THREE.Vector3) {
    const q = p.clone().sub(C).divide(RAD);
    const e = d.clone().divide(RAD);
    const a = e.dot(e), b = 2 * q.dot(e), c = q.dot(q) - 1;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return 0.1;
    let t = Math.max(0, (-b + Math.sqrt(disc)) / (2 * a));
    const dv = p.clone().addScaledVector(d, t).sub(C);
    if (dv.length() > 1e-6) {
      const dn = dv.clone().normalize();
      t += (lump(dn) - 1) * dv.length() * Math.max(0.25, d.dot(dn));
    }
    return Math.max(0.1, t);
  }

  const raw: { pts: THREE.Vector3[]; radii: number[]; start: number; level: number }[] = [];
  const tufts: Tuft[] = [];
  const pathLen = (pts: THREE.Vector3[], start: number) => {
    const out = [start];
    for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + pts[i].distanceTo(pts[i - 1]));
    return out;
  };

  /** A wobbling, drooping path of length L from p0 along d0. */
  function path(p0: THREE.Vector3, d0: THREE.Vector3, L: number, r0: number, r1: number, wobble: number, droop: number) {
    const n = Math.max(3, Math.min(10, Math.floor(L / 0.2) + 2));
    const pts = [p0.clone()];
    const radii = [r0];
    const d = d0.clone();
    const p = p0.clone();
    for (let i = 1; i <= n; i++) {
      d.addScaledVector(randUnit(rand), wobble).add(new THREE.Vector3(0, -droop, 0)).normalize();
      p.addScaledVector(d, L / n);
      pts.push(p.clone());
      radii.push(r0 + ((r1 - r0) * i) / n);
    }
    return { pts, radii, dEnd: d.clone() };
  }

  function grow(p: THREE.Vector3, d: THREE.Vector3, r: number, level: number, startPath: number) {
    const t = exitDist(p, d);
    const last = level >= BRANCH_LEVELS;
    const frac = last ? U(0.75, 1) : U(0.32, 0.48);
    const L = Math.min(Math.max(0.15, t * frac), MAXLEN[Math.min(level, MAXLEN.length - 1)]);
    const rEnd = Math.max(0.004, r * U(0.7, 0.82));
    const { pts, radii, dEnd } = path(p, d, L, r, rEnd, 0.1 + 0.03 * level, 0.018 * level);
    raw.push({ pts, radii, start: startPath, level });
    const lens = pathLen(pts, startPath);
    const end = pts[pts.length - 1];
    const endPath = lens[lens.length - 1];
    if (last) {
      tufts.push({ pos: end, dir: dEnd, kind: 0, path: endPath });
      return;
    }
    if (level >= BRANCH_LEVELS - 1) tufts.push({ pos: end, dir: dEnd, kind: 1, path: endPath });
    const k = level < 2 ? pick([2, 3, 3, 3, 4]) : pick([2, 2, 3, 3, 4]);
    const [u, v] = perpBasis(dEnd);
    const phi0 = rand() * Math.PI * 2;
    const rc = rEnd * Math.pow(1 / k, 1 / 2.4);
    const oy = 1.2 + (C.y - 1.2) * Math.min(1, level / BRANCH_LEVELS) * 0.9; // outer shoots spread out and down
    const radial = end.clone().sub(new THREE.Vector3(0, oy, 0)).normalize();
    for (let i = 0; i < k; i++) {
      const phi = phi0 + (Math.PI * 2 * i) / k + U(-0.4, 0.4);
      const ang = THREE.MathUtils.degToRad(U(25, 50));
      const nd = dEnd.clone().multiplyScalar(Math.cos(ang))
        .add(u.clone().multiplyScalar(Math.cos(phi)).addScaledVector(v, Math.sin(phi)).multiplyScalar(Math.sin(ang)))
        .addScaledVector(radial, 0.45)
        .normalize();
      grow(end.clone().addScaledVector(dEnd, -rc * 0.6), nd, rc * U(0.9, 1.05), level + 1, endPath);
    }
    // a side shoot along the branch fills the inner and lower crown
    if (level <= BRANCH_LEVELS - 3 && rand() < 0.7) {
      const idx = 1 + Math.floor(rand() * (pts.length - 2));
      const [su, sv] = perpBasis(d);
      const phi = rand() * Math.PI * 2;
      const ang = THREE.MathUtils.degToRad(U(45, 70));
      const nd = d.clone().multiplyScalar(Math.cos(ang))
        .add(su.clone().multiplyScalar(Math.cos(phi)).addScaledVector(sv, Math.sin(phi)).multiplyScalar(Math.sin(ang)))
        .addScaledVector(radial, 0.3)
        .normalize();
      grow(pts[idx].clone(), nd, radii[idx] * 0.45, level + 2, lens[idx]);
    }
  }

  // trunk with a root flare
  const trunkPts: THREE.Vector3[] = [];
  const trunkR: number[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = -0.25 + (TRUNK_HEIGHT + 0.4) * t;
    trunkPts.push(new THREE.Vector3(0.07 * Math.sin(t * 2.2), y, 0.04 * t * t));
    trunkR.push(TRUNK_RADIUS * (1 + 0.6 * Math.exp(-Math.max(y, 0) / 0.22)) * (1 - 0.15 * t));
  }
  raw.push({ pts: trunkPts, radii: trunkR, start: 0, level: -1 });
  const trunkLens = pathLen(trunkPts, 0);
  const trunkPathAt = (y: number) => trunkLens[Math.max(0, Math.min(10, Math.round(((y + 0.25) / (TRUNK_HEIGHT + 0.4)) * 10)))];
  // surface roots
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 + U(-0.3, 0.3);
    const dd = new THREE.Vector3(Math.cos(a), -0.25, Math.sin(a)).normalize();
    const { pts, radii } = path(new THREE.Vector3(0, 0.12, 0), dd, U(0.9, 1.6), TRUNK_RADIUS * 0.45, 0.02, 0.06, 0.04);
    raw.push({ pts, radii, start: 0.1, level: -1 });
  }
  // scaffold limbs
  const phi0 = rand() * Math.PI * 2;
  for (let i = 0; i < SCAFFOLD_LIMBS; i++) {
    const phi = phi0 + (Math.PI * 2 * i) / SCAFFOLD_LIMBS + U(-0.3, 0.3);
    const elev = THREE.MathUtils.degToRad(i === 0 ? 75 : U(28, 52));
    const d = new THREE.Vector3(Math.cos(phi) * Math.cos(elev), Math.sin(elev), Math.sin(phi) * Math.cos(elev));
    const hy = TRUNK_HEIGHT - U(0, 0.4);
    const start = new THREE.Vector3(0.07 * Math.sin((2.2 * hy) / TRUNK_HEIGHT), hy, 0).addScaledVector(d, 0.05);
    grow(start, d, TRUNK_RADIUS * U(0.55, 0.68), 0, trunkPathAt(hy));
  }

  // ---- to scene units, with growth times: the tree grows out from the trunk to the tips
  const maxPath = Math.max(...tufts.map((t) => t.path));
  const birthAt = (pathM: number) => TREE_START + (TREE_GROWN - TREE_START) * Math.pow(Math.min(1, pathM / maxPath), 0.85);
  const toScene = (p: THREE.Vector3) => p.clone().multiplyScalar(S).add(new THREE.Vector3(0, TREE_BASE_Y, 0));
  const white = new THREE.Color(1, 1, 1);
  const branches: Branch[] = raw.map((b) => ({
    pts: b.pts.map(toScene),
    radii: b.radii.map((r) => r * S),
    births: pathLen(b.pts, b.start).map(birthAt),
    tint: white,
  }));

  // ---- leaves: a spiral tuft at every twig tip, smaller tufts a little further in
  const leaves: LeafSpec[] = [];
  const col = new THREE.Color();
  for (const tf of tufts) {
    const young = tf.kind === 0 && rand() < YOUNG_FLUSH_CHANCE;
    const n = tf.kind === 0 ? Math.round(U(...LEAVES_PER_TUFT)) : Math.round(U(5, 8));
    const [u, v] = perpBasis(tf.dir);
    const tint = rand();
    const birth = birthAt(tf.path) + 0.03;
    for (let i = 0; i < n; i++) {
      const phi = i * 2.39996 + U(-0.3, 0.3); // golden-angle spiral
      const ang = THREE.MathUtils.degToRad(tf.kind === 0 ? U(30, 80) : U(60, 105));
      const dl = tf.dir.clone().multiplyScalar(Math.cos(ang))
        .add(u.clone().multiplyScalar(Math.cos(phi)).addScaledVector(v, Math.sin(phi)).multiplyScalar(Math.sin(ang)))
        .add(new THREE.Vector3(0, young ? -1.6 : -0.25, 0)) // young flush hangs limp
        .normalize();
      const { side, nrm } = leafFrame(dl, rand);
      const L = U(...LEAF_LENGTH) * (young ? 0.85 : 1) * (tf.kind ? 1.08 : 1) * S * LEAF_SCALE;
      const base = tf.pos.clone().addScaledVector(tf.dir, U(-0.07, 0.02)).addScaledVector(dl, 0.035);
      const shade = (tint + rand()) / 2;
      rampColor(shade, young ? LEAF_FLUSH : LEAF_GREEN, col).multiplyScalar(LEAF_BRIGHTNESS);
      if (tf.kind) col.multiply(new THREE.Color(0.75, 0.79, 0.71)); // older leaves further in are duller
      leaves.push({
        pos: toScene(base), dir: dl, side, nrm,
        length: L, width: L * U(0.19, 0.25), depth: L * U(0.5, 1.6),
        color: col.clone(), birth: birth + i * 0.004,
      });
    }
  }
  // shuffle, so drawing only the first part of the list (on phones) thins the crown evenly
  for (let i = leaves.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [leaves[i], leaves[j]] = [leaves[j], leaves[i]];
  }

  // ---- mangoes: on long stalks from twig tips in the middle and outer crown, 1 to 3 each
  const candidates = tufts.filter((t) => t.kind === 0 && t.pos.y > 2.0 && t.pos.y < C.y + 0.6 && Math.hypot(t.pos.x, t.pos.z) > 2.0);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mangoes: Mango[] = [];
  candidates.slice(0, FRUIT_CLUSTERS).forEach((tf, ci) => {
    const stalk = U(0.22, 0.55) * S * 1.3;
    const k = rand() < 0.55 ? 1 : rand() < 0.67 ? 2 : 3;
    const a0 = rand() * Math.PI * 2;
    const hang = tf.dir.clone().multiplyScalar(0.25).add(new THREE.Vector3(0, -1, 0)).normalize();
    for (let j = 0; j < k; j++) {
      const a = a0 + (Math.PI * 2 * j) / k;
      const r = 0.4 + 0.6 * rand(); // mostly ripening (some still green)
      const tilt = k > 1 ? 0.25 : 0.08;
      mangoes.push({
        attach: toScene(tf.pos),
        hang,
        stalk: stalk + (k > 1 ? 0.03 + j * 0.015 : 0),
        size: U(0.11, 0.15) * S * LEAF_SCALE * 1.5, // a little larger than life so they read among the leaves
        spin: rand() * Math.PI * 2,
        tilt: new THREE.Euler(Math.sin(a) * tilt + U(-0.08, 0.08), 0, -Math.cos(a) * tilt + U(-0.08, 0.08)),
        birth: 4.0 + (ci / FRUIT_CLUSTERS) * 0.2 + j * 0.02,
        skin: rampColor(r, MANGO_SKIN, new THREE.Color()).multiplyScalar(1.25),
        blush: THREE.MathUtils.clamp((r - 0.45) / 0.5, 0, 1) * 0.85,
      });
    }
  });

  // ---- fallen leaves gathering under the tree once it is grown
  const litter: LeafSpec[] = [];
  for (let i = 0; i < 160; i++) {
    const rr = CANOPY_RADIUS * 0.95 * Math.sqrt(rand()) * S;
    const a = rand() * Math.PI * 2;
    const x = rr * Math.cos(a), z = rr * Math.sin(a);
    if (Math.hypot(x, z) < 0.25) continue;
    const h = rand() * Math.PI * 2;
    const dl = new THREE.Vector3(Math.cos(h), U(-0.05, 0.05), Math.sin(h)).normalize();
    const { side, nrm } = leafFrame(dl, rand);
    const L = U(...LEAF_LENGTH) * S * LEAF_SCALE;
    litter.push({
      pos: new THREE.Vector3(x, surfaceY(x, z) + 0.012, z), dir: dl, side, nrm,
      length: L, width: L * 0.22, depth: L * (rand() < 0.5 ? -1 : 1) * U(0.1, 0.35), // curled up or down, never flat (keeps normals valid)
      color: rampColor(rand(), FALLEN, new THREE.Color()).multiplyScalar(1.4),
      birth: 4.2 + rand() * 0.3,
    });
  }

  // ---- two spots on sturdy branches, on the camera's side of the crown, where parakeets land
  const perches: { pos: THREE.Vector3; yaw: number }[] = [];
  const sturdy = branches
    .flatMap((b) => b.pts.map((p, i) => ({ p, r: b.radii[i] })))
    .filter(({ p, r }) => r > 0.018 && r < 0.05 && p.y > CROWN_CENTER.y - CROWN_RADII.y * 0.55 && p.y < CROWN_CENTER.y && p.z > 0.6 && Math.hypot(p.x, p.z) > 0.9)
    .sort((a, b) => b.p.z + 0.4 * b.p.x - (a.p.z + 0.4 * a.p.x));
  for (const s of sturdy) {
    const pos = s.p.clone().addScaledVector(UP, s.r + 0.015);
    if (perches.every((q) => q.pos.distanceTo(pos) > 1.1)) perches.push({ pos, yaw: Math.atan2(-pos.z, pos.x) });
    if (perches.length === 2) break;
  }
  while (perches.length < 2) perches.push({ pos: toScene(new THREE.Vector3(perches.length ? -1.5 : 1.5, 3.0, 1.2)), yaw: 0 });

  return { branches, leaves, mangoes, litter, perches };
})();

export const PERCHES = TREE.perches;

// ---------------------------------------------------------------- the fruit

/** A mango, 1 long from its stalk (origin) downwards: plump shoulders tapering to the "beak". */
function mangoGeometry() {
  const g = new THREE.SphereGeometry(1, 28, 18);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const side = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const s = (1 - y) / 2; // 0 at the stalk end, 1 at the tip
    const taper = 1 - 0.3 * s ** 2.2 + 0.06 * Math.sin(Math.PI * s);
    let ny = y * 0.5 - 0.5;
    if (y > 0.9) ny -= (0.03 * (y - 0.9)) / 0.1; // stalk cavity
    const nx = x * 0.36 * taper + 0.11 * s ** 2.5; // the beak
    pos.setXYZ(i, nx, ny, z * 0.31 * taper);
    side[i] = smooth(-0.05, 0.3, nx + 0.25 * (ny + 0.5)); // the sun-facing shoulder that blushes
  }
  g.computeVertexNormals();
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  return g;
}

/** Mango skin: each fruit's own colour, a red blush on its shoulder, and green until it ripens. */
function mangoMaterial(ripe: { value: number }) {
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRipe = ripe;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aSide;\nattribute float aBlush;\nvarying float vBlush;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBlush = aSide * aBlush;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uRipe;\nvarying float vBlush;")
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.07, 0.04), vBlush * uRipe);
diffuseColor.rgb = mix(vec3(0.08, 0.24, 0.03), diffuseColor.rgb, uRipe);`,
      );
  };
  mat.customProgramCacheKey = () => "mango";
  return mat;
}

// ---------------------------------------------------------------- component

export default function MangoTree({ story }: { story: Story }) {
  const camera = useThree((s) => s.camera);
  const uniforms = useMemo(() => growUniforms(CROWN_CENTER, CROWN_RADII), []);
  const litterUniforms = useMemo(() => growUniforms(new THREE.Vector3(0, -50, 0), new THREE.Vector3(1, 1, 1)), []);
  const ripe = useMemo(() => ({ value: 0 }), []);

  const limbs = useOwned(() => branchGeometry(TREE.branches));
  const barkTex = useOwned(barkTexture);
  const bark = useOwned(() =>
    growingBark(new THREE.MeshStandardMaterial({ map: barkTex, bumpMap: barkTex, bumpScale: 4, vertexColors: true, roughness: 0.95 }), uniforms, "mango-bark"),
  );
  const barkDepth = useOwned(() => growingBark(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uniforms, "mango-bark-depth"));

  const leafGeo = useOwned(() => leafSetGeometry(TREE.leaves));
  const leafMats = useMemo(() => leafMaterials(uniforms, "mango-leaves"), [uniforms]);
  const litterGeo = useOwned(() => leafSetGeometry(TREE.litter));
  const litterMats = useMemo(() => leafMaterials(litterUniforms, "mango-litter", 0.75), [litterUniforms]);
  useEffect(() => () => [leafMats, litterMats].forEach((m) => { m.color.dispose(); m.depth.dispose(); }), [leafMats, litterMats]);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const litter = useRef<THREE.InstancedMesh>(null);

  const mangoGeo = useOwned(() => {
    const g = mangoGeometry();
    g.setAttribute("aBlush", new THREE.InstancedBufferAttribute(Float32Array.from(TREE.mangoes.map((m) => m.blush)), 1));
    return g;
  });
  const mangoMat = useOwned(() => mangoMaterial(ripe));
  const stalkGeo = useOwned(() => new THREE.CylinderGeometry(0.004, 0.005, 1, 5).translate(0, -0.5, 0));
  const stalkMat = useOwned(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.12, 0.04).multiplyScalar(1.6), roughness: 0.6 }));
  const fruits = useRef<THREE.InstancedMesh>(null);
  const stalks = useRef<THREE.InstancedMesh>(null);

  const group = useRef<THREE.Group>(null);
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3(), down: new THREE.Vector3(0, -1, 0) }),
    [],
  );

  useEffect(() => {
    const l = leaves.current;
    if (l) {
      fillLeaves(l, TREE.leaves);
      // phones and small screens draw part of the (shuffled) leaves, so scrolling stays smooth
      const lite = window.innerWidth < 820 || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4;
      l.count = lite ? Math.floor(TREE.leaves.length * 0.55) : TREE.leaves.length;
    }
    if (litter.current) fillLeaves(litter.current, TREE.litter);
    const f = fruits.current;
    if (f) {
      TREE.mangoes.forEach((m, i) => f.setColorAt(i, m.skin));
      if (f.instanceColor) f.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame(() => {
    const { u, time } = story.current;
    for (const un of [uniforms, litterUniforms]) {
      un.uGrow.value = u;
      updateLeafLight(un, SUN_DIR, camera, 0.12 + 0.3 * sunAmount(u));
    }
    uniforms.uTime.value = time;
    group.current?.scale.setScalar(0.5 + 0.5 * smooth(TREE_START, 3.9, u));
    bark.color.setScalar(1).lerp(new THREE.Color("#a6cf72"), 1 - smooth(2.9, 3.4, u)); // a green shoot that turns to bark
    ripe.value = smooth(4.15, 4.48, u);

    // mangoes swing gently on their stalks
    const f = fruits.current;
    const st = stalks.current;
    if (f && st) {
      TREE.mangoes.forEach((m, i) => {
        const g = easeOutBack(smooth(m.birth, m.birth + 0.15, u));
        tmp.e.set(m.tilt.x + Math.cos(time * 0.9 + i) * 0.05, 0, m.tilt.z + Math.sin(time * 1.1 + i * 1.7) * 0.06);
        tmp.q.setFromUnitVectors(tmp.down, m.hang).multiply(tmp.q2.setFromEuler(tmp.e));
        st.setMatrixAt(i, tmp.m.compose(m.attach, tmp.q, tmp.s.set(Math.max(0.001, g), Math.max(0.001, m.stalk * g), Math.max(0.001, g))));
        tmp.p.set(0, -m.stalk * g, 0).applyQuaternion(tmp.q).add(m.attach);
        tmp.q2.setFromAxisAngle(UP, m.spin);
        f.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q.clone().multiply(tmp.q2), tmp.s.setScalar(Math.max(0.001, m.size * g))));
      });
      f.instanceMatrix.needsUpdate = true;
      st.instanceMatrix.needsUpdate = true;
      f.visible = st.visible = u > 3.95;
    }
  });

  return (
    <>
      <group ref={group}>
        <mesh geometry={limbs} material={bark} customDepthMaterial={barkDepth} castShadow receiveShadow frustumCulled={false} />
        <instancedMesh ref={leaves} args={[leafGeo, leafMats.color, TREE.leaves.length]} customDepthMaterial={leafMats.depth} castShadow receiveShadow frustumCulled={false} />
        <instancedMesh ref={fruits} args={[mangoGeo, mangoMat, TREE.mangoes.length]} castShadow frustumCulled={false} />
        <instancedMesh ref={stalks} args={[stalkGeo, stalkMat, TREE.mangoes.length]} frustumCulled={false} />
      </group>
      <instancedMesh ref={litter} args={[litterGeo, litterMats.color, TREE.litter.length]} receiveShadow frustumCulled={false} />
    </>
  );
}
