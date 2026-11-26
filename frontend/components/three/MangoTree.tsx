"use client";

/**
 * A mango tree (Mangifera indica) that grows as the visitor scrolls, generated in code.
 * Like a real mango tree it has a short, stout trunk that forks low into a few thick limbs,
 * and a dense, rounded, evergreen dome of a crown made of rosettes of long glossy leaves at
 * the branch tips. Mangoes hang below the leaves in small bunches on long stalks.
 *
 * Branches are grown by "space colonisation": points scattered through the dome-shaped crown
 * attract the growing tips, so the branches fill the crown the way a real tree's do.
 * Growth on screen happens in the shaders: every bark vertex knows the story time (u) at which
 * the growing tip reaches it, so the tree grows out from the trunk to the tips and thickens with
 * age, and leaves unfurl as the tips arrive. Scrolling back up reverses it.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { canvasTexture, easeOutBack, makeNoise, paintBy, pixelTexture, rng, smooth, useOwned, type Story } from "./sceneKit";

export const TREE_BASE_Y = 0.05;
/** Story time (u) at which the trunk starts growing out of the sprout. */
export const TREE_START = 2.75;
/** Story time by which the furthest branch tips have grown. */
const TREE_GROWN = 3.9;

const UP = new THREE.Vector3(0, 1, 0);
const CROWN_CENTER = new THREE.Vector3(0, 3.05, 0);
const CROWN_RADII = new THREE.Vector3(2.75, 1.55, 2.75); // wider than tall: a dome
const CROWN_FLOOR = 1.5; // the crown's underside

type TreeNode = { p: THREE.Vector3; parent: number; kids: number[]; r: number; path: number; birth: number; toTip: number };
type Leaf = { pos: THREE.Vector3; dir: THREE.Vector3; roll: number; size: number; birth: number };
type Mango = { pos: THREE.Vector3; stalk: number; birth: number; spin: number; lean: number };

// ---------------------------------------------------------------- the tree's shape (generated once)

const TREE = (() => {
  const rand = rng(11);
  const nodes: TreeNode[] = [];
  const add = (p: THREE.Vector3, parent: number) => {
    nodes.push({ p, parent, kids: [], r: 0, path: 0, birth: 0, toTip: 0 });
    const i = nodes.length - 1;
    if (parent >= 0) nodes[parent].kids.push(i);
    return i;
  };

  // a short, stout trunk with a slight lean
  const TRUNK_STEPS = 6;
  const base = new THREE.Vector3(0, TREE_BASE_Y - 0.12, 0);
  const top = new THREE.Vector3(0.07, 1.3, 0.05);
  let fork = add(base, -1);
  for (let i = 1; i <= TRUNK_STEPS; i++) {
    const t = i / TRUNK_STEPS;
    fork = add(new THREE.Vector3().lerpVectors(base, top, t).add(new THREE.Vector3(Math.sin(t * 3.2) * 0.04, 0, 0)), fork);
  }
  // it forks low into a few thick limbs spreading outwards
  const LIMBS = 5;
  for (let k = 0; k < LIMBS; k++) {
    const az = (k * Math.PI * 2) / LIMBS + (rand() - 0.5) * 0.7;
    const tilt = 0.7 + rand() * 0.35;
    const dir = new THREE.Vector3(Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az));
    let n = fork;
    for (let s = 0; s < 3; s++) n = add(nodes[n].p.clone().addScaledVector(dir, 0.22), n);
  }

  // points through the crown that pull the growing tips towards them (more near its surface)
  const attractors: THREE.Vector3[] = [];
  while (attractors.length < 1100) {
    const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    const len = v.length();
    if (len > 1 || (len < 0.45 && rand() < 0.75)) continue;
    const p = v.multiply(CROWN_RADII).add(CROWN_CENTER);
    if (p.y < CROWN_FLOOR + rand() * 0.25) continue;
    attractors.push(p);
  }

  const STEP = 0.17, INFLUENCE = 1.5, KILL = 0.3;
  const alive = attractors.map(() => true);
  const nearest = new Int32Array(attractors.length).fill(-1);
  const nearestD = new Float32Array(attractors.length).fill(Infinity);
  const update = (list: number[]) => {
    attractors.forEach((a, k) => {
      if (!alive[k]) return;
      for (const i of list) {
        const d = a.distanceTo(nodes[i].p);
        if (d < KILL) { alive[k] = false; return; }
        if (d < nearestD[k]) { nearestD[k] = d; nearest[k] = i; }
      }
    });
  };
  update(nodes.map((_, i) => i));
  for (let iter = 0; iter < 140; iter++) {
    const pull = new Map<number, THREE.Vector3>();
    attractors.forEach((a, k) => {
      if (!alive[k] || nearest[k] < 0 || nearestD[k] > INFLUENCE) return;
      const i = nearest[k];
      const v = a.clone().sub(nodes[i].p).normalize();
      pull.set(i, (pull.get(i) ?? new THREE.Vector3()).add(v));
    });
    if (!pull.size) break;
    const added: number[] = [];
    pull.forEach((sum, i) => {
      const dir = sum.normalize().add(new THREE.Vector3((rand() - 0.5) * 0.3, 0.1, (rand() - 0.5) * 0.3)).normalize();
      const p = nodes[i].p.clone().addScaledVector(dir, STEP);
      if (nodes[i].kids.some((c) => nodes[c].p.distanceToSquared(p) < (STEP * 0.5) ** 2)) return; // don't grow the same twig twice
      added.push(add(p, i));
    });
    if (!added.length) break;
    update(added);
  }

  // soften the kinks along each branch (branch points and tips stay put)
  for (let pass = 0; pass < 2; pass++) {
    const next = nodes.map((n) => n.p.clone());
    nodes.forEach((n, i) => {
      if (i <= TRUNK_STEPS || n.parent < 0 || n.kids.length !== 1) return;
      next[i].multiplyScalar(0.5).addScaledVector(nodes[n.parent].p, 0.25).addScaledVector(nodes[n.kids[0]].p, 0.25);
    });
    nodes.forEach((n, i) => n.p.copy(next[i]));
  }

  // thickness: a branch is as thick as the twigs it carries ("pipe model"); the trunk flares at its foot
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    n.r = n.kids.length ? Math.pow(n.kids.reduce((s, c) => s + Math.pow(nodes[c].r, 2.3), 0), 1 / 2.3) : 0.016;
    n.toTip = n.kids.length ? 1 + Math.min(...n.kids.map((c) => nodes[c].toTip)) : 0;
  }
  for (let i = 0; i <= TRUNK_STEPS; i++) nodes[i].r *= 1 + 0.9 * Math.pow(1 - i / TRUNK_STEPS, 5);

  // when each point is reached: the tree grows out from the trunk to the tips
  let maxPath = 0;
  nodes.forEach((n) => {
    n.path = n.parent < 0 ? 0 : nodes[n.parent].path + n.p.distanceTo(nodes[n.parent].p);
    maxPath = Math.max(maxPath, n.path);
  });
  nodes.forEach((n) => (n.birth = TREE_START + (TREE_GROWN - TREE_START) * Math.pow(n.path / maxPath, 0.85)));

  // limbs to draw: each follows its thickest child; side branches start a limb of their own
  const chains: number[][] = [];
  const pending: [number, number][] = [];
  const walk = (start: number, from: number) => {
    const chain = from < 0 ? [] : [from];
    let i = start;
    for (;;) {
      chain.push(i);
      const kids = nodes[i].kids;
      if (!kids.length) break;
      const main = kids.reduce((a, b) => (nodes[a].r >= nodes[b].r ? a : b));
      kids.forEach((k) => k !== main && pending.push([k, i]));
      i = main;
    }
    chains.push(chain);
  };
  walk(0, -1);
  while (pending.length) {
    const [k, from] = pending.pop()!;
    walk(k, from);
  }

  // leaves: rosettes at every tip and along the outer twigs, plus a few large clusters filling the
  // inside of the crown, so it reads as one dense, solid mass like a real mango tree
  const rel = (p: THREE.Vector3) => p.clone().sub(CROWN_CENTER).divide(CROWN_RADII);
  const leaves: Leaf[] = [];
  nodes.forEach((n) => {
    if (n.toTip > 8 || n.p.y < CROWN_FLOOR - 0.2) return;
    const inner = n.toTip > 3;
    if (inner && rand() > 0.35) return;
    const copies = n.toTip === 0 ? 2 : 1;
    for (let c = 0; c < copies; c++) {
      if (!inner && n.toTip > 0 && rand() > 0.85) continue;
      const dir = rel(n.p).normalize()
        .add(new THREE.Vector3(rand() - 0.5, rand() - 0.3, rand() - 0.5).multiplyScalar(c ? 1.6 : 0.9))
        .normalize();
      const size = inner ? 0.75 + rand() * 0.3 : n.toTip === 0 ? 0.58 + rand() * 0.2 : 0.48 + rand() * 0.18;
      leaves.push({ pos: n.p.clone(), dir, roll: rand() * Math.PI * 2, size, birth: n.birth + 0.03 });
    }
  });

  // mangoes: small bunches hanging on long stalks from tips on the lower, outer part of the crown
  const candidates = nodes
    .map((n, i) => ({ i, q: rel(n.p) }))
    .filter(({ i, q }) => nodes[i].toTip === 0 && q.y < 0.15 && Math.hypot(q.x, q.z) > 0.55)
    .sort((a, b) => Math.hypot(b.q.x, b.q.z) - b.q.y * 0.5 - (Math.hypot(a.q.x, a.q.z) - a.q.y * 0.5));
  const bunches: THREE.Vector3[] = [];
  for (const c of candidates) {
    const p = nodes[c.i].p;
    if (bunches.every((b) => b.distanceTo(p) > 0.75)) bunches.push(p);
    if (bunches.length >= 13) break;
  }
  const mangoes: Mango[] = [];
  bunches.forEach((p, b) => {
    const count = 2 + Math.floor(rand() * 2.2);
    for (let k = 0; k < count; k++) {
      mangoes.push({ pos: p.clone(), stalk: 0.28 + rand() * 0.2, birth: 4.0 + (b / bunches.length) * 0.2 + k * 0.02, spin: rand() * Math.PI * 2, lean: (k - (count - 1) / 2) * 0.32 });
    }
  });

  // two spots on sturdy branches, on the camera's side of the crown, where parakeets land at the end
  const perchable = nodes
    .map((n, i) => ({ i, q: rel(n.p) }))
    .filter(({ i, q }) => nodes[i].r > 0.035 && nodes[i].r < 0.09 && q.y > -0.6 && q.y < 0.2 && Math.hypot(q.x, q.z) > 0.35)
    .sort((a, b) => nodes[b.i].p.z + 0.5 * nodes[b.i].p.x - (nodes[a.i].p.z + 0.5 * nodes[a.i].p.x));
  const perches: { pos: THREE.Vector3; yaw: number }[] = [];
  for (const c of perchable) {
    const n = nodes[c.i];
    const pos = n.p.clone().addScaledVector(UP, n.r + 0.015);
    if (perches.every((q) => q.pos.distanceTo(pos) > 1.2)) perches.push({ pos, yaw: Math.atan2(-pos.z, pos.x) });
    if (perches.length === 2) break;
  }
  while (perches.length < 2) perches.push({ pos: nodes[TRUNK_STEPS + 3 + perches.length * 3].p.clone().addScaledVector(UP, 0.12), yaw: 0 });

  return { nodes, chains, leaves, mangoes, perches };
})();

export const PERCHES = TREE.perches;

// ---------------------------------------------------------------- geometry

/** All the limbs as one mesh. Each vertex also stores its centre line point and when it grows. */
function limbGeometry() {
  const { nodes, chains } = TREE;
  const radialFor = (r: number) => (r > 0.1 ? 14 : r > 0.045 ? 9 : r > 0.022 ? 6 : 4);
  let verts = 0;
  let tris = 0;
  for (const ch of chains) {
    const R = radialFor(nodes[ch[Math.min(1, ch.length - 1)]].r);
    verts += ch.length * (R + 1);
    tris += (ch.length - 1) * R * 2;
  }
  const position = new Float32Array(verts * 3);
  const normal = new Float32Array(verts * 3);
  const uv = new Float32Array(verts * 2);
  const color = new Float32Array(verts * 3);
  const center = new Float32Array(verts * 3);
  const birth = new Float32Array(verts);
  const indices = new Uint32Array(tris * 3);
  const twig = new THREE.Color("#9a9a78");
  const old = new THREE.Color("#ffffff");
  const c = new THREE.Color();
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), off = new THREE.Vector3();
  let v = 0;
  let ix = 0;

  for (const ch of chains) {
    const n = ch.length - 1;
    const R = radialFor(nodes[ch[Math.min(1, n)]].r);
    const first = v;
    let arc = 0;
    for (let i = 0; i <= n; i++) {
      const node = nodes[ch[i]];
      const p = node.p;
      // a side branch starts inside its parent with its own thickness, not the parent's
      let r = i === 0 && n > 0 ? nodes[ch[1]].r : node.r;
      if (i === n && !node.kids.length) r *= 0.5; // tapered tip
      T.subVectors(nodes[ch[Math.min(i + 1, n)]].p, nodes[ch[Math.max(i - 1, 0)]].p).normalize();
      if (i === 0) N.copy(Math.abs(T.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)).cross(T).normalize();
      else {
        N.addScaledVector(T, -T.dot(N)).normalize(); // parallel transport: no twisting
        arc += p.distanceTo(nodes[ch[i - 1]].p);
      }
      B.crossVectors(T, N);
      const wraps = Math.max(1, Math.round((2 * Math.PI * r) / 0.3));
      c.copy(old).lerp(twig, 1 - smooth(0.015, 0.05, r)); // young twigs are greener
      for (let j = 0; j <= R; j++) {
        const a = (j / R) * Math.PI * 2;
        off.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
        position.set([p.x + off.x * r, p.y + off.y * r, p.z + off.z * r], v * 3);
        normal.set([off.x, off.y, off.z], v * 3);
        uv.set([(j / R) * wraps, arc / 0.5], v * 2);
        color.set([c.r, c.g, c.b], v * 3);
        center.set([p.x, p.y, p.z], v * 3);
        birth[v] = i === 0 && n > 0 ? nodes[ch[0]].birth : node.birth;
        v++;
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < R; j++) {
        const a = first + i * (R + 1) + j;
        const b = a + R + 1;
        indices.set([a, a + 1, b, a + 1, b + 1, b], ix);
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

/** A mango: oblong, broad at the shoulders, narrowing to a small beak at the bottom. */
function mangoGeometry() {
  const g = new THREE.SphereGeometry(1, 24, 18);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const w = 1 + 0.12 * y; // broader shoulders
    x = x * w + 0.16 * (1 - y * y); // fuller on one side
    if (y < -0.5) x -= 0.4 * (-y - 0.5) ** 1.5; // the "beak"
    pos.setXYZ(i, x * 0.07, y * 0.1, z * 0.062 * w);
  }
  g.computeVertexNormals();
  const stalk = new THREE.Color("#6f9a34");
  const gold = new THREE.Color("#f1b32c");
  const blush = new THREE.Color("#d9532a");
  paintBy(g, (p, out) => {
    const y = p.y / 0.1;
    const x = p.x / 0.08;
    out.copy(gold).lerp(blush, THREE.MathUtils.clamp(y * 0.8 + x * 0.5 - 0.1, 0, 1) * 0.75); // blush on the sunny shoulder
    if (y > 0.85) out.lerp(stalk, (y - 0.85) / 0.15);
  });
  g.translate(0, -0.1, 0); // hang from the top
  return g;
}

// ---------------------------------------------------------------- textures

function barkTexture() {
  const n = makeNoise(5);
  const rand = rng(5);
  return pixelTexture(128, 256, (u, v, px) => {
    // rough, dark grey-brown bark with long fissures and scaly plates
    const plates = n.fbm(u * 6, v * 3, 4, 3);
    const fissure = Math.abs(n.fbm(u * 10 + 3, v * 1.5, 3, 10) - 0.5);
    const base = 70 + plates * 55;
    const dark = fissure < 0.03 ? 0.35 : fissure < 0.06 ? 0.7 : 1;
    px[0] = base * 1.02 * dark;
    px[1] = base * 0.9 * dark;
    px[2] = base * 0.8 * dark;
  }, true, (ctx) => {
    for (let i = 0; i < 220; i++) { // lichen and dust
      ctx.fillStyle = rand() < 0.5 ? `rgba(150,155,130,${rand() * 0.16})` : `rgba(60,50,42,${rand() * 0.3})`;
      ctx.fillRect(rand() * 128, rand() * 256, 1 + rand() * 4, 1 + rand() * 3);
    }
  });
}

/** A rosette of mango leaves seen from outside: long, glossy, pointed leaves fanning from a tip. */
function leafTexture() {
  const rand = rng(23);
  return canvasTexture(512, 512, (ctx) => {
    const leaf = (angle: number, len: number, width: number, shade: number, droop: number) => {
      ctx.save();
      ctx.translate(256, 256);
      ctx.rotate(angle);
      const w = width;
      const grad = ctx.createLinearGradient(0, 0, 0, -len);
      grad.addColorStop(0, `rgb(${24 * shade},${58 * shade},${24 * shade})`);
      grad.addColorStop(0.5, `rgb(${34 * shade},${82 * shade},${32 * shade})`);
      grad.addColorStop(1, `rgb(${46 * shade},${98 * shade},${38 * shade})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.08);
      ctx.bezierCurveTo(w + droop, -len * 0.3, w * 0.9 + droop * 1.5, -len * 0.75, droop * 2, -len);
      ctx.bezierCurveTo(-w * 0.9 + droop * 1.5, -len * 0.75, -w + droop, -len * 0.3, 0, -len * 0.08);
      ctx.fill();
      // glossy sheen on one half and a pale midrib
      ctx.fillStyle = "rgba(200,235,170,0.09)";
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.08);
      ctx.bezierCurveTo(w + droop, -len * 0.3, w * 0.9 + droop * 1.5, -len * 0.75, droop * 2, -len);
      ctx.quadraticCurveTo(droop, -len * 0.5, 0, -len * 0.08);
      ctx.fill();
      ctx.strokeStyle = "rgba(205,225,160,0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.08);
      ctx.quadraticCurveTo(droop, -len * 0.5, droop * 2, -len * 0.98);
      ctx.stroke();
      ctx.strokeStyle = "rgba(190,220,150,0.18)";
      ctx.lineWidth = 0.8;
      for (let k = 1; k < 12; k++) {
        const t = k / 12;
        const y = -len * (0.1 + t * 0.85);
        const half = w * 0.85 * Math.sin(t * Math.PI) ** 0.7;
        const x0 = droop * 2 * t * t;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + half, y - len * 0.05);
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 - half, y - len * 0.05);
        ctx.stroke();
      }
      ctx.restore();
    };
    // a back layer of darker leaves, then a front layer, so the rosette has depth
    for (const [count, shade, len] of [[9, 0.72, 225], [8, 1.0, 205]] as const) {
      const turn = rand() * Math.PI;
      for (let k = 0; k < count; k++) {
        const a = turn + (k / count) * Math.PI * 2 + (rand() - 0.5) * 0.35;
        const l = len * (0.8 + rand() * 0.2);
        leaf(a, l, l * (0.19 + rand() * 0.05), shade * (0.85 + rand() * 0.3), (rand() - 0.5) * 30);
      }
    }
    ctx.fillStyle = "#4a3a24"; // the twig tip the leaves grow from
    ctx.beginPath();
    ctx.arc(256, 256, 7, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------------------------------------------------------------- shaders

type GrowUniforms = { uGrow: { value: number }; uTime: { value: number }; uCenter: { value: THREE.Vector3 }; uRadii: { value: THREE.Vector3 } };

const DECLARE = /* glsl */ `#include <common>
attribute float aBirth;
uniform float uGrow;
uniform float uTime;
uniform vec3 uCenter;
uniform vec3 uRadii;`;

/** Branches grow out from the trunk to the tips and thicken with age. */
function growingBark<M extends THREE.Material>(mat: M, uniforms: GrowUniforms, key: string): M {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `${DECLARE}\nattribute vec3 aCenter;`)
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
 * Leaves unfurl from their twig, flutter in the breeze, and are shaded as one rounded crown:
 * lit by the crown's outward direction, and darker deep inside it and underneath.
 */
function growingLeaves<M extends THREE.Material>(mat: M, uniforms: GrowUniforms, key: string, shadeAsCrown: boolean): M {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `${DECLARE}\nvarying float vShadeIn;`)
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
float leafGrow = smoothstep(aBirth, aBirth + 0.14, uGrow);
vec3 leafAt = instanceMatrix[3].xyz;
float flutter = length(position.xy) * leafGrow;
transformed.x += sin(uTime * 1.9 + leafAt.x * 3.1 + leafAt.z * 2.3) * 0.05 * flutter;
transformed.y += cos(uTime * 1.5 + leafAt.y * 2.7 + leafAt.x) * 0.04 * flutter;
transformed *= leafGrow;
vec3 inCrown = (leafAt - uCenter) / uRadii;
vShadeIn = mix(0.42, 1.0, smoothstep(0.3, 1.0, length(inCrown))) * mix(0.7, 1.0, smoothstep(-0.7, 0.3, inCrown.y));`,
      );
    if (shadeAsCrown) {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <defaultnormal_vertex>",
        /* glsl */ `#include <defaultnormal_vertex>
vec3 crownOut = normalize(((instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz - uCenter) / uRadii);
transformedNormal = normalize(mix(transformedNormal, normalMatrix * crownOut, 0.7));`,
      );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vShadeIn;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= vShadeIn;")
        // the normals now point out of the crown on both sides of each leaf card
        .replace("#include <normal_fragment_begin>", THREE.ShaderChunk.normal_fragment_begin.replace("normal *= faceDirection;", ""));
    }
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

/** Fruit colour goes from green to its ripe colours (the vertex colours). */
function ripening(mat: THREE.MeshPhysicalMaterial, ripe: { value: number }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRipe = ripe;
    shader.uniforms.uUnripe = { value: new THREE.Color("#4d8a2c") };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uRipe;\nuniform vec3 uUnripe;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = mix(uUnripe, diffuseColor.rgb, uRipe);");
  };
  mat.customProgramCacheKey = () => "mango";
  return mat;
}

// ---------------------------------------------------------------- component

export default function MangoTree({ story }: { story: Story }) {
  const uniforms = useMemo<GrowUniforms>(
    () => ({ uGrow: { value: 0 }, uTime: { value: 0 }, uCenter: { value: CROWN_CENTER.clone() }, uRadii: { value: CROWN_RADII.clone() } }),
    [],
  );
  const ripe = useMemo(() => ({ value: 0 }), []);

  const limbs = useOwned(limbGeometry);
  const barkTex = useOwned(barkTexture);
  const bark = useOwned(() =>
    growingBark(new THREE.MeshStandardMaterial({ map: barkTex, bumpMap: barkTex, bumpScale: 4, vertexColors: true, roughness: 0.95 }), uniforms, "bark"),
  );
  const barkDepth = useOwned(() => growingBark(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uniforms, "bark-depth"));

  const leafTex = useOwned(leafTexture);
  const leafGeo = useOwned(() => {
    const g = new THREE.PlaneGeometry(1, 1); // the rosette's centre is the twig tip
    g.setAttribute("aBirth", new THREE.InstancedBufferAttribute(Float32Array.from(TREE.leaves.map((l) => l.birth)), 1));
    return g;
  });
  const leafMat = useOwned(() =>
    growingLeaves(
      new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.42, shadowSide: THREE.DoubleSide }),
      uniforms,
      "leaves",
      true,
    ),
  );
  const leafDepth = useOwned(() =>
    growingLeaves(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.5 }), uniforms, "leaves-depth", false),
  );
  const leaves = useRef<THREE.InstancedMesh>(null);

  const mangoGeo = useOwned(mangoGeometry);
  const stalkGeo = useOwned(() => new THREE.CylinderGeometry(0.005, 0.007, 1, 5).translate(0, -0.5, 0));
  const mangoMat = useOwned(() => ripening(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.35 }), ripe));
  const stalkMat = useOwned(() => new THREE.MeshStandardMaterial({ color: "#5d6630", roughness: 0.9 }));
  const fruits = useRef<(THREE.Group | null)[]>([]);

  const group = useRef<THREE.Group>(null);
  const tones = useMemo(
    () => ({
      shoot: new THREE.Color("#9ccf6a"),
      bark: new THREE.Color("#ffffff"),
      flush: new THREE.Color(2.3, 1.15, 0.8), // new mango leaves come out copper-red
      mature: new THREE.Color(1, 1, 1),
    }),
    [],
  );

  useEffect(() => {
    const mesh = leaves.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const roll = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    const r = rng(31);
    const facing = new THREE.Vector3(0, 0, 1);
    TREE.leaves.forEach((l, i) => {
      q.setFromUnitVectors(facing, l.dir);
      roll.setFromAxisAngle(l.dir, l.roll);
      m.compose(l.pos, roll.multiply(q), s.setScalar(l.size));
      mesh.setMatrixAt(i, m);
      const k = 0.85 + r() * 0.3;
      mesh.setColorAt(i, c.setRGB(k * (0.92 + r() * 0.12), k, k * (0.9 + r() * 0.12)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame(() => {
    const { u, time } = story.current;
    uniforms.uGrow.value = u;
    uniforms.uTime.value = time;
    group.current?.scale.setScalar(0.5 + 0.5 * smooth(TREE_START, 3.9, u));
    bark.color.copy(tones.shoot).lerp(tones.bark, smooth(2.9, 3.4, u));
    leafMat.color.copy(tones.flush).lerp(tones.mature, smooth(3.6, 4.25, u));
    ripe.value = smooth(4.15, 4.48, u);

    TREE.mangoes.forEach((f, i) => {
      const g = fruits.current[i];
      if (!g) return;
      const s = easeOutBack(smooth(f.birth, f.birth + 0.15, u));
      g.visible = s > 0.002;
      g.scale.setScalar(Math.max(0.001, s));
      // hang, spread a little within the bunch, and swing gently on the stalk
      g.rotation.set(Math.cos(time * 0.9 + i) * 0.04, f.spin, f.lean + Math.sin(time * 1.1 + i * 1.7) * 0.05, "YXZ");
    });
  });

  return (
    <group ref={group}>
      <mesh geometry={limbs} material={bark} customDepthMaterial={barkDepth} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh
        ref={leaves}
        args={[leafGeo, leafMat, TREE.leaves.length]}
        customDepthMaterial={leafDepth}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      {TREE.mangoes.map((f, i) => (
        <group key={i} ref={(g) => { fruits.current[i] = g; }} position={f.pos}>
          <mesh geometry={stalkGeo} material={stalkMat} scale={[1, f.stalk, 1]} />
          <mesh geometry={mangoGeo} material={mangoMat} position={[0, -f.stalk, 0]} castShadow />
        </group>
      ))}
    </group>
  );
}
