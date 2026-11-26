"use client";

/**
 * Rose-ringed parakeets, the green parrots seen all over Bengaluru (and fond of mangoes).
 * Built in code: a smooth body and head with a red hooked beak and neck ring, a long tapering
 * tail, and feathered wings with a shoulder and a wrist joint, so each wingbeat sweeps down
 * fully spread and folds back on the way up. Two of them land on the tree at the end.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { canvasTexture, clamp01, paintBy, rng, smooth, useOwned, wrap, type Story } from "./sceneKit";
import { PERCHES } from "./MangoTree";

type BirdDef = { lead?: boolean; perch?: number; x0: number; speed: number; y: number; z: number; slot: [number, number, number]; size: number };
const FLOCK = { x0: -8, speed: 1.9, y: 8.7, z: -4, size: 1 };
const BIRDS: BirdDef[] = [
  { lead: true, x0: 0, speed: 0, y: 0, z: 0, slot: [0, 0, 0], size: 1.1 }, // carries the seed
  { ...FLOCK, slot: [0, 0, 0] },
  { ...FLOCK, slot: [-0.8, -0.15, 0.7] },
  { ...FLOCK, slot: [-0.9, 0.1, -0.8] },
  { ...FLOCK, slot: [-1.7, -0.25, 1.3] },
  { ...FLOCK, slot: [-1.9, 0.05, -1.5] },
  { x0: 10, speed: -1.6, y: 6.3, z: -1.2, slot: [0, 0, 0], size: 1, perch: 0 },
  { x0: 3, speed: -2.1, y: 7.7, z: 0.8, slot: [0, 0, 0], size: 0.95, perch: 1 },
  { x0: -14, speed: -1.4, y: 9.3, z: -6, slot: [0, 0, 0], size: 1.05 },
];

/** How far into landing on its perch a bird is (0 flying, 1 sitting). */
const landing = (b: BirdDef, u: number) => (b.perch === undefined ? 0 : smooth(4.15, 4.5, u));

/**
 * Where bird i is. Before the rain the flock crosses the top of the sky (the lead bird circles
 * over the island holding the seed); after the seed drops they climb out of sight, and in the
 * last chapter they glide back in and circle the grown tree. Returns how visible the bird is.
 */
export function birdPosition(i: number, t: number, u: number, out: THREE.Vector3): number {
  const b = BIRDS[i];
  if (u < 2.5) {
    let visible = 1;
    if (b.lead) {
      const a = t * 0.42 + 1.2;
      out.set(Math.cos(a) * 1.7, 7.1 + Math.sin(t * 0.8) * 0.15, Math.sin(a) * 1.1 - 0.4);
    } else {
      const x = wrap(b.x0 + b.speed * t, 24);
      visible = 1 - smooth(19, 23.5, Math.abs(x)); // shrink away at the far edges where the path loops
      out.set(x + b.slot[0], b.y + b.slot[1] + Math.sin(t * 0.9 + i) * 0.12, b.z + b.slot[2]);
    }
    out.y += smooth(0.7, 1.4, u) * 11;
    return visible;
  }
  const back = 1 - smooth(3.85, 4.5, u);
  const k = back * back;
  const a = t * 0.3 + i * 0.7;
  const r = 3.9 + (i % 3) * 0.5; // clear of the crown
  out.set(Math.cos(a) * r + (i % 2 ? 16 : -16) * k, 3.9 + (i % 4) * 0.4 + Math.sin(t * 0.8 + i) * 0.15 + 11 * k, Math.sin(a) * r * 0.8 - 5 * k);
  const land = landing(b, u);
  if (land > 0) out.lerp(PERCHES[b.perch!].pos, land);
  return 1;
}

/**
 * Birds are drawn a little larger while high in the sky (before u = 2.5), so they read from far
 * away. They are out of sight when u passes 2.5, so the change never shows.
 */
const sizeAt = (b: BirdDef, u: number) => b.size * (u < 2.5 ? 1.4 : 1);

const ahead = new THREE.Vector3();
/** The tip of bird i's beak (where the seed is held). */
export function beakPosition(i: number, t: number, u: number, out: THREE.Vector3) {
  birdPosition(i, t, u, out);
  birdPosition(i, t + 0.04, u, ahead);
  ahead.sub(out).setY(0);
  const k = sizeAt(BIRDS[i], u);
  if (ahead.lengthSq() > 1e-8) out.addScaledVector(ahead.normalize(), 0.2 * k);
  out.y -= 0.02 * k;
  return out;
}

// ---------------------------------------------------------------- body parts

function bodyGeometry() {
  // body: a lathe from the tail end to the neck, laid along +x (the bird faces +x)
  const profile = [
    [0.001, -0.16], [0.02, -0.145], [0.036, -0.1], [0.048, -0.04], [0.052, 0.01], [0.047, 0.06], [0.036, 0.095], [0.028, 0.11], [0.001, 0.125],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.LatheGeometry(profile, 18).rotateZ(-Math.PI / 2).scale(1, 1, 0.92);
  const back = new THREE.Color("#3c8f31");
  const belly = new THREE.Color("#9bd662");
  const ring = new THREE.Color("#1a1a1a");
  const rose = new THREE.Color("#e48aa3");
  paintBy(body, (p, c) => {
    c.copy(belly).lerp(back, smooth(-0.035, 0.03, p.y));
    if (p.x > 0.088 && p.x < 0.104) c.copy(p.y > 0.012 ? rose : ring); // the neck ring
  });

  const head = new THREE.SphereGeometry(0.041, 18, 14).translate(0.135, 0.022, 0);
  const crown = new THREE.Color("#66cf45");
  const nape = new THREE.Color("#6eb4a7");
  const eye = new THREE.Color("#121212");
  const eyeRing = new THREE.Color("#e7d36a");
  paintBy(head, (p, c) => {
    c.copy(crown);
    if (p.x < 0.128 && p.y > 0.03) c.lerp(nape, 0.7); // blue-grey wash on the back of the head
    const d = Math.min(p.distanceTo(new THREE.Vector3(0.152, 0.034, 0.03)), p.distanceTo(new THREE.Vector3(0.152, 0.034, -0.03)));
    if (d < 0.008) c.copy(eye);
    else if (d < 0.012) c.copy(eyeRing);
  });

  // the hooked red beak
  const beak = new THREE.ConeGeometry(0.017, 0.046, 12).rotateZ(-Math.PI / 2 - 0.6).translate(0.172, 0.006, 0);
  const red = new THREE.Color("#d22f2a");
  const tip = new THREE.Color("#7a1d1a");
  paintBy(beak, (p, c) => c.copy(red).lerp(tip, smooth(-0.005, -0.02, p.y)));

  return mergeGeometries([body, head, beak])!;
}

function tailGeometry() {
  // two long central tail feathers, narrowing to a point and drooping slightly
  const g = new THREE.PlaneGeometry(1, 1, 6, 1).rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const s = pos.getX(i) + 0.5; // 0 at the body, 1 at the tip
    const across = pos.getZ(i);
    pos.setXYZ(i, -s * 0.38, -s * s * 0.04, across * (0.05 * (1 - s) + 0.008));
  }
  g.computeVertexNormals();
  const base = new THREE.Color("#4a9c3b");
  const mid = new THREE.Color("#3a8f86");
  const end = new THREE.Color("#9fbe4f");
  return paintBy(g, (p, c) => {
    const s = -p.x / 0.38;
    c.copy(base).lerp(mid, smooth(0.1, 0.6, s)).lerp(end, smooth(0.75, 1, s));
  });
}

/** Wing card: inner part (shoulder to wrist) and outer part (wrist to tip) share one texture. */
const WRIST_U = 0.42;
function wingGeometry(inner: boolean) {
  const span = inner ? 0.14 : 0.21;
  const sweep = inner ? 0 : -0.03;
  const u0 = inner ? 0 : WRIST_U;
  const u1 = inner ? WRIST_U : 1;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0.06, 0, 0, -0.075, 0, 0, 0.06 + sweep, 0, span, -0.075 + sweep, 0, span], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, 1, u0, 0, u1, 1, u1, 0], 2));
  g.setIndex([0, 2, 1, 2, 3, 1]);
  return g;
}

function wingTexture() {
  const rand = rng(3);
  // u (x) runs along the span from shoulder to tip; v (y) across the chord from the leading edge
  return canvasTexture(256, 128, (ctx) => {
    const W = 256;
    const wrist = W * WRIST_U;
    const outline = new Path2D();
    outline.moveTo(0, 12);
    outline.quadraticCurveTo(wrist * 0.6, 2, wrist, 8); // leading edge
    outline.quadraticCurveTo(200, 20, 252, 54); // to the pointed tip
    const tips = 9; // primary feather tips back towards the wrist
    for (let k = 1; k <= tips; k++) {
      const t = k / tips;
      const x = 252 - t * (252 - wrist);
      const y = 54 + t * 56;
      outline.lineTo(x + 6, y - 4);
      outline.lineTo(x, y + 2);
    }
    for (let k = 1; k <= 7; k++) { // secondaries, rounded tips
      const x = wrist - (k / 7) * wrist;
      outline.quadraticCurveTo(x + wrist / 14, 118, x, 112);
    }
    outline.lineTo(0, 12);
    ctx.save();
    ctx.clip(outline);

    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "#63bb47");
    g.addColorStop(0.35, "#4ea53b");
    g.addColorStop(0.65, "#358a3a");
    g.addColorStop(1, "#2a6d3c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 128);
    // primaries are darker and bluer
    const pg = ctx.createLinearGradient(wrist, 0, W, 0);
    pg.addColorStop(0, "rgba(30,80,90,0)");
    pg.addColorStop(0.35, "rgba(30,80,90,0.55)");
    pg.addColorStop(1, "rgba(25,60,75,0.8)");
    ctx.fillStyle = pg;
    ctx.fillRect(wrist, 30, W - wrist, 98);
    // rows of covert feathers near the leading edge
    for (let row = 0; row < 3; row++) {
      for (let x = row * 6; x < W; x += 12) {
        ctx.strokeStyle = `rgba(20,60,25,${0.25 + rand() * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, 18 + row * 11, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
    }
    // flight feather shafts and edges
    for (let k = 0; k < 22; k++) {
      const x = 6 + (k / 21) * 244;
      const outer = x > wrist;
      ctx.strokeStyle = `rgba(15,40,30,${0.45 + rand() * 0.2})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, 44);
      ctx.lineTo(outer ? x + (x - wrist) * 0.12 : x - 2, 124);
      ctx.stroke();
      ctx.strokeStyle = "rgba(170,220,150,0.18)";
      ctx.beginPath();
      ctx.moveTo(x + 3, 46);
      ctx.lineTo(outer ? x + 3 + (x - wrist) * 0.12 : x + 1, 124);
      ctx.stroke();
    }
    ctx.restore();
  });
}

// ---------------------------------------------------------------- component

type Rig = {
  root: THREE.Group | null;
  tail: THREE.Group | null;
  shoulders: (THREE.Group | null)[];
  wrists: (THREE.Group | null)[];
};

export default function Parakeets({ story }: { story: Story }) {
  const body = useOwned(bodyGeometry);
  const tail = useOwned(tailGeometry);
  const inner = useOwned(() => wingGeometry(true));
  const outer = useOwned(() => wingGeometry(false));
  const wingTex = useOwned(wingTexture);
  const bodyMat = useOwned(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 }));
  const tailMat = useOwned(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }));
  const wingMat = useOwned(() => new THREE.MeshStandardMaterial({ map: wingTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.72 }));
  const rigs = useRef<Rig[]>(BIRDS.map(() => ({ root: null, tail: null, shoulders: [null, null], wrists: [null, null] })));
  const v = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Vector3() }), []);

  useFrame(() => {
    const { u, time } = story.current;
    BIRDS.forEach((b, i) => {
      const rig = rigs.current[i];
      if (!rig.root) return;
      const vis = birdPosition(i, time, u, v.p);
      birdPosition(i, time + 0.04, u, v.q);
      v.q.sub(v.p);
      const land = landing(b, u);

      // heading from the flight path; when landing, turn to face out from the tree and sit up
      let yaw = v.q.lengthSq() > 1e-8 ? Math.atan2(-v.q.z, v.q.x) : 0;
      let pitch = THREE.MathUtils.clamp(Math.atan2(v.q.y, Math.hypot(v.q.x, v.q.z)), -0.45, 0.45);
      let bank = b.lead || u >= 2.5 ? -0.32 : 0;
      if (land > 0) {
        const target = PERCHES[b.perch!].yaw;
        yaw += Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw)) * land;
        pitch += (0.5 - pitch) * land;
        bank *= 1 - land;
      }

      // wingbeats: flap, with now and then a short glide
      const beat = time * (23 + (i % 3) * 2.5) + i * 1.3;
      const s = Math.sin(beat);
      const c = Math.cos(beat);
      const glide = clamp01(1.4 * Math.sin(time * 0.33 + i * 2.1) - 0.7);
      const amp = (1 - land) * (1 - 0.85 * glide);
      const up = Math.max(0, c); // on the upstroke the wing bends at the wrist and sweeps back

      rig.root.position.copy(v.p);
      rig.root.position.y += 0.012 * s * amp;
      rig.root.rotation.set(bank, yaw, pitch, "YZX");
      rig.root.scale.setScalar(Math.max(0.0001, sizeAt(b, u) * vis));
      rig.root.visible = vis > 0.01;

      for (let k = 0; k < 2; k++) {
        const sh = rig.shoulders[k];
        const wr = rig.wrists[k];
        if (sh) sh.rotation.set(-(0.1 + 0.85 * s) * amp - 0.12 * glide + 0.25 * land, -0.15 * up * amp - 1.35 * land, 0);
        if (wr) wr.rotation.set(-0.45 * Math.sin(beat - 0.9) * amp, -0.6 * up * amp - 1.9 * land, 0);
      }
      if (rig.tail) rig.tail.rotation.z = 0.05 * Math.sin(beat + 1) * amp + 0.85 * land; // tail hangs down when perched
    });
  });

  return (
    <>
      {BIRDS.map((_, i) => (
        <group key={i} ref={(g) => { rigs.current[i].root = g; }}>
          <mesh geometry={body} material={bodyMat} />
          <group position={[-0.14, 0.005, 0]} ref={(g) => { rigs.current[i].tail = g; }}>
            <mesh geometry={tail} material={tailMat} />
          </group>
          {[1, -1].map((side, k) => (
            <group key={side} position={[0.02, 0.028, 0]} scale={[1, 1, side]}>
              <group position={[0, 0, 0.03]} ref={(g) => { rigs.current[i].shoulders[k] = g; }}>
                <mesh geometry={inner} material={wingMat} />
                <group position={[0, 0, 0.14]} ref={(g) => { rigs.current[i].wrists[k] = g; }}>
                  <mesh geometry={outer} material={wingMat} />
                </group>
              </group>
            </group>
          ))}
        </group>
      ))}
    </>
  );
}
