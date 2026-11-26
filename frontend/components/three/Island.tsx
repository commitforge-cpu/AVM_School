"use client";

/**
 * The floating island of earth the story happens on: a crumbly soil surface, a cut-away side
 * showing Bengaluru's red earth in layers with stones and roots, a rocky underside with roots
 * hanging from it, grass that sways and springs up after the rain, pebbles, and puddles that
 * form in the rain (with raindrop ripples) and soak away in the sun.
 * All textures are painted in code from noise, so there are no image files.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { NO_FACE_FLIP, makeNoise, paintBy, pixelTexture, rng, smooth, useOwned, wetness, type Story } from "./sceneKit";

export const ISLAND_R = 3.3;
const SEG = 128;
const DEPTH = 0.75; // thickness of the soil layer shown in the cut-away side
const noise = makeNoise(17);

/** The island's outline: a gently irregular circle (the same for the top and the sides). */
const rim = (angle: number) => 1 + (noise.fbm(Math.cos(angle) * 1.6 + 5, Math.sin(angle) * 1.6 + 5, 3) - 0.5) * 0.12;

/** Height of the soil surface at (x, z): a low dome with clods and furrows. Things are placed with this. */
export function surfaceY(x: number, z: number) {
  const rr = Math.hypot(x, z) / (ISLAND_R * rim(Math.atan2(z, x)));
  if (rr >= 1) return 0;
  const r2 = rr * rr;
  const clods = (noise.fbm(x * 2.2 + 11, z * 2.2 + 3, 4) - 0.5) * 0.08 + (noise.noise(x * 9 + 2, z * 9 + 7) - 0.5) * 0.015;
  return 0.06 * (1 - r2) + clods * (1 - r2 * r2);
}

// ---------------------------------------------------------------- textures

function soilTexture() {
  const n = makeNoise(41);
  const dark = [58, 39, 27], mid = [112, 76, 50], red = [138, 70, 42];
  return pixelTexture(256, 256, (u, v, px) => {
    const big = n.fbm(u * 6, v * 6, 4, 6);
    const grain = n.fbm(u * 40 + 3, v * 40 + 1, 2, 40);
    const tint = smooth(0.5, 0.75, n.fbm(u * 3 + 9, v * 3 + 4, 3, 3)) * 0.55;
    for (let k = 0; k < 3; k++) {
      const base = dark[k] + (mid[k] - dark[k]) * big;
      px[k] = (base + (red[k] - base) * tint) * (0.72 + 0.5 * grain);
    }
    const h = n.noise(u * 256, v * 256, 256);
    if (h > 0.985) px[0] = px[1] = px[2] = 105 + h * 25; // grit and tiny stones
    else if (h < 0.02) { px[0] *= 0.45; px[1] *= 0.45; px[2] *= 0.45; } // bits of humus
  }, true, (ctx) => {
    const r = rng(9);
    for (let i = 0; i < 70; i++) { // small pebbles pressed into the soil
      const x = r() * 256, y = r() * 256, s = 1.5 + r() * 3.5;
      ctx.fillStyle = `rgba(${112 + r() * 30},${100 + r() * 24},${88 + r() * 20},0.85)`;
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(40,28,20,0.35)";
      ctx.beginPath();
      ctx.ellipse(x + 0.8, y + 1, s, s * 0.5, 0, 0, Math.PI);
      ctx.fill();
    }
  });
}

/** The cut-away side: dark topsoil with roots, red laterite earth, then weathered rock. */
function strataTexture() {
  const n = makeNoise(43);
  const W = 512, H = 256;
  return pixelTexture(W, H, (u, v, px) => {
    const wob = (n.fbm(u * 6, v * 2, 3, 6) - 0.5) * 0.08;
    const d = v + wob;
    const mottle = n.fbm(u * 14 + 2, v * 7, 4, 14);
    const fine = n.fbm(u * 60, v * 30, 2, 60);
    let c: number[];
    if (d < 0.17) c = [54, 37, 26];
    else if (d < 0.62) {
      const laterite = [139, 64, 38], light = [176, 100, 56], deep = [104, 46, 30];
      c = laterite.map((x, k) => x + (mottle > 0.55 ? (light[k] - x) * (mottle - 0.55) * 2.4 : (deep[k] - x) * (0.55 - mottle) * 1.6));
      if (d < 0.22) c = c.map((x, k) => x + ([54, 37, 26][k] - x) * (1 - (d - 0.17) / 0.05));
    } else {
      const rock = [104, 88, 76], grey = [132, 126, 118];
      c = rock.map((x, k) => x + (grey[k] - x) * smooth(0.45, 0.7, mottle));
    }
    for (let k = 0; k < 3; k++) px[k] = c[k] * (0.78 + 0.4 * fine);
  }, true, (ctx) => {
    const r = rng(12);
    const wrapDraw = (draw: (dx: number) => void) => [0, -W, W].forEach(draw);
    for (let i = 0; i < 46; i++) { // stones in the lower layers
      const x = r() * W, y = H * (0.35 + r() * 0.62), s = 3 + r() * 9;
      const g = 110 + r() * 50;
      wrapDraw((dx) => {
        ctx.fillStyle = `rgb(${g},${g - 6},${g - 14})`;
        ctx.beginPath();
        ctx.ellipse(x + dx, y, s, s * (0.55 + r() * 0.3), r() * 0.6 - 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.ellipse(x + dx - s * 0.25, y - s * 0.2, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    for (let i = 0; i < 30; i++) { // fine roots reaching down from the topsoil
      let x = r() * W;
      let y = H * 0.02;
      const len = H * (0.15 + r() * 0.4);
      ctx.strokeStyle = `rgba(${150 + r() * 30},${110 + r() * 20},${75},${0.5 + r() * 0.3})`;
      ctx.lineWidth = 0.6 + r() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      while (y < len) {
        x += (r() - 0.5) * 6;
        y += 3 + r() * 4;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

function rockTexture() {
  const n = makeNoise(47);
  return pixelTexture(256, 256, (u, v, px) => {
    const a = n.fbm(u * 5, v * 5, 5, 5);
    const crack = Math.abs(n.fbm(u * 8 + 4, v * 8 + 1, 4, 8) - 0.5);
    const base = [92 + a * 50, 80 + a * 42, 70 + a * 34];
    const dark = crack < 0.02 ? 0.45 : crack < 0.04 ? 0.75 : 1;
    for (let k = 0; k < 3; k++) px[k] = base[k] * dark;
  }, true);
}

function puddleShape() {
  const n = makeNoise(53);
  return pixelTexture(128, 128, (u, v, px) => {
    const d = Math.hypot(u - 0.5, v - 0.5) + (n.fbm(u * 5, v * 5, 3) - 0.5) * 0.22;
    const a = 255 * smooth(0.44, 0.36, d);
    px[0] = px[1] = px[2] = a;
  });
}

// ---------------------------------------------------------------- geometry

function topGeometry() {
  const g = new THREE.RingGeometry(0.001, ISLAND_R, SEG, 40);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = rim(Math.atan2(pos.getZ(i), pos.getX(i)));
    const x = pos.getX(i) * k;
    const z = pos.getZ(i) * k;
    pos.setXYZ(i, x, surfaceY(x, z), z);
    uv.setXY(i, x / 2.2, z / 2.2);
  }
  g.computeVertexNormals();
  return g;
}

function sideGeometry() {
  const g = new THREE.CylinderGeometry(ISLAND_R, ISLAND_R * 0.92, DEPTH, SEG, 12, true);
  g.translate(0, -DEPTH / 2, 0);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const lumps = y < -0.01 ? 1 + (noise.fbm(Math.cos(a) * 4 + 1, y * 5 + Math.sin(a) * 4, 3) - 0.5) * 0.06 : 1;
    const k = rim(a) * lumps;
    pos.setXYZ(i, x * k, y, z * k);
    uv.setXY(i, uv.getX(i) * 6, 1 + y / DEPTH);
  }
  g.computeVertexNormals();
  return g;
}

function undersideGeometry() {
  const h = 2.8;
  const g = new THREE.ConeGeometry(ISLAND_R * 0.93, h, 72, 16);
  g.rotateX(Math.PI); // apex down
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (h / 2 - y) / h; // 0 at the top, 1 at the bottom point
    const a = Math.atan2(z, x);
    const bulge = 1 + (noise.fbm(Math.cos(a) * 2.5 + 7, Math.sin(a) * 2.5 + t * 3, 4) - 0.5) * 0.7 * t;
    const k = rim(a) * bulge;
    pos.setXYZ(i, x * k, y + (noise.noise(x * 3, z * 3) - 0.5) * 0.25 * t, z * k);
    uv.setXY(i, uv.getX(i) * 4, t * 3);
  }
  g.computeVertexNormals();
  const top = new THREE.Color("#7a5a44");
  const bottom = new THREE.Color("#2b2630");
  return paintBy(g, (p, c) => c.copy(top).lerp(bottom, smooth(h / 2, -h / 2, p.y)));
}

/** Roots hanging from the underside, tapering to fine tips. */
function rootGeometry() {
  const r = rng(77);
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 8; k++) {
    const a = k * 0.79 + r() * 0.5;
    const rad = ISLAND_R * (0.6 + r() * 0.25);
    const len = 1.2 + r() * 1.6;
    const pts = [0, 0.25, 0.55, 0.8, 1].map((t) => {
      const rr = rad * (1 - 0.55 * Math.min(1, t * 1.3));
      return new THREE.Vector3(Math.cos(a) * rr + (r() - 0.5) * 0.3 * t, -DEPTH - 0.1 - t * len - t * t * 0.6, Math.sin(a) * rr + (r() - 0.5) * 0.3 * t);
    });
    const curve = new THREE.CatmullRomCurve3(pts);
    const segs = 24, radial = 5;
    const tube = new THREE.TubeGeometry(curve, segs, 0.035 + r() * 0.02, radial, false);
    const pos = tube.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= segs; i++) {
      const c = curve.getPointAt(i / segs);
      const taper = 1 - 0.85 * (i / segs);
      for (let j = 0; j <= radial; j++) {
        const idx = i * (radial + 1) + j;
        pos.setXYZ(idx, c.x + (pos.getX(idx) - c.x) * taper, c.y + (pos.getY(idx) - c.y) * taper, c.z + (pos.getZ(idx) - c.z) * taper);
      }
    }
    tube.computeVertexNormals();
    parts.push(tube);
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

/** One blade of grass: narrow, tapering, curving over; darker at the base, paler at the tip. */
function bladeGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 1, 5);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const normal = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const s = pos.getY(i) + 0.5;
    pos.setXYZ(i, pos.getX(i) * 0.03 * Math.pow(1 - s, 0.8), s, s * s * 0.25);
    normal.setXYZ(i, 0, 1, 0.3); // lit like the ground around it, which reads as a meadow
  }
  const base = new THREE.Color("#2b4519");
  const mid = new THREE.Color("#4e7c2b");
  const tip = new THREE.Color("#a6b65a");
  return paintBy(g, (p, c) => c.copy(base).lerp(mid, smooth(0, 0.45, p.y)).lerp(tip, smooth(0.6, 1, p.y)));
}

// ---------------------------------------------------------------- component

const PUDDLES = [
  { x: 1.55, z: 1.0, r: 0.55 },
  { x: -1.35, z: 1.55, r: 0.45 },
  { x: -0.6, z: -1.85, r: 0.62 },
  { x: 2.1, z: -1.05, r: 0.38 },
];

const RIPPLES = /* glsl */ `
float rainRipples(vec2 p, float t) {
  float acc = 0.0;
  for (int layer = 0; layer < 2; layer++) {
    vec2 q = p * 5.0 + float(layer) * 3.7;
    vec2 cell = floor(q);
    vec2 f = fract(q);
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 c = cell + vec2(x, y);
        float h = fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453);
        vec2 centre = vec2(x, y) + vec2(fract(h * 13.1), fract(h * 7.7));
        float phase = fract(t * 1.1 + h);
        float d = length(f - centre);
        acc += (1.0 - phase) * smoothstep(0.05, 0.0, abs(d - phase * 0.8));
      }
    }
  }
  return acc;
}`;

export default function Island({ story, animate }: { story: Story; animate: boolean }) {
  const top = useOwned(topGeometry);
  const side = useOwned(sideGeometry);
  const under = useOwned(undersideGeometry);
  const roots = useOwned(rootGeometry);

  const soilTex = useOwned(soilTexture);
  const strataTex = useOwned(strataTexture);
  const rockTex = useOwned(rockTexture);
  const puddleTex = useOwned(puddleShape);

  const soil = useOwned(() => new THREE.MeshStandardMaterial({ map: soilTex, bumpMap: soilTex, bumpScale: 2.5, roughness: 1 }));
  const strata = useOwned(() => new THREE.MeshStandardMaterial({ map: strataTex, bumpMap: strataTex, bumpScale: 3, roughness: 1 }));
  const rock = useOwned(() => new THREE.MeshStandardMaterial({ map: rockTex, bumpMap: rockTex, bumpScale: 3, roughness: 0.95, vertexColors: true }));
  const rootMat = useOwned(() => new THREE.MeshStandardMaterial({ color: "#4a3626", roughness: 1 }));

  // grass: ~1300 blades in tufts, swaying in the wind; they grow after the rain
  const grassUniforms = useMemo(() => ({ uTime: { value: 0 }, uGrow: { value: 0.35 } }), []);
  const blade = useOwned(bladeGeometry);
  const grassMat = useOwned(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, grassUniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uGrow;")
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `#include <begin_vertex>
transformed.yz *= uGrow;
float bend = transformed.y * transformed.y;
vec3 at = instanceMatrix[3].xyz;
transformed.x += sin(uTime * 2.1 + at.x * 1.7 + at.z * 1.3) * 0.18 * bend;
transformed.z += cos(uTime * 1.7 + at.z * 2.0 + at.x) * 0.12 * bend;`,
        );
      shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_begin>", NO_FACE_FLIP);
    };
    m.customProgramCacheKey = () => "grass";
    return m;
  });
  const grass = useRef<THREE.InstancedMesh>(null);
  const blades = useMemo(() => {
    const r = rng(19);
    const list: { p: THREE.Vector3; q: THREE.Quaternion; h: number }[] = [];
    for (let t = 0; t < 150; t++) {
      const a = r() * Math.PI * 2;
      const rad = 0.6 + Math.sqrt(r()) * (ISLAND_R - 0.75);
      const cx = Math.cos(a) * rad, cz = Math.sin(a) * rad;
      const n = 5 + Math.floor(r() * 8);
      for (let b = 0; b < n; b++) {
        const x = cx + (r() - 0.5) * 0.16, z = cz + (r() - 0.5) * 0.16;
        const lean = new THREE.Euler((r() - 0.5) * 0.6, r() * Math.PI * 2, (r() - 0.5) * 0.6, "YXZ");
        list.push({ p: new THREE.Vector3(x, surfaceY(x, z) - 0.01, z), q: new THREE.Quaternion().setFromEuler(lean), h: 0.12 + r() * 0.22 });
      }
    }
    return list;
  }, []);

  const pebbleGeo = useOwned(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = 1 + (noise.noise(x * 1.7 + 3, y * 1.7 + z * 1.3) - 0.5) * 0.45;
      pos.setXYZ(i, x * k, y * k * 0.7, z * k);
    }
    g.computeVertexNormals();
    return g;
  });
  const pebbleMat = useOwned(() => new THREE.MeshStandardMaterial({ roughness: 0.9 }));
  const pebbles = useRef<THREE.InstancedMesh>(null);
  const PEBBLES = 46;

  // puddles: dark, glossy water with raindrop ripples
  const rain = useMemo(() => ({ uTime: { value: 0 }, uRain: { value: 0 } }), []);
  const puddleMat = useOwned(() => {
    const m = new THREE.MeshStandardMaterial({ color: "#211b17", roughness: 0.05, metalness: 0.1, alphaMap: puddleTex, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, rain);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\nuniform float uTime;\nuniform float uRain;\n${RIPPLES}`)
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.5, 0.55, 0.62) * rainRipples(vAlphaMapUv * 2.0, uTime) * uRain * 0.35;",
        );
    };
    m.customProgramCacheKey = () => "puddle";
    return m;
  });
  const puddles = useMemo(
    () =>
      PUDDLES.map((p) => {
        let y = -1; // water fills the dip: sit just above the highest bump under it
        for (let i = 0; i < 25; i++) {
          const a = (i / 25) * Math.PI * 2;
          const rr = p.r * 0.7 * ((i % 5) / 4);
          y = Math.max(y, surfaceY(p.x + Math.cos(a) * rr, p.z + Math.sin(a) * rr));
        }
        return { ...p, y: y + 0.004 };
      }),
    [],
  );
  const puddleRefs = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(() => {
    const g = grass.current;
    if (g) {
      const m = new THREE.Matrix4();
      const s = new THREE.Vector3();
      blades.forEach((b, i) => g.setMatrixAt(i, m.compose(b.p, b.q, s.set(1, b.h, b.h))));
      g.instanceMatrix.needsUpdate = true;
    }
    const pb = pebbles.current;
    if (pb) {
      const r = rng(29);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const c = new THREE.Color();
      for (let i = 0; i < PEBBLES; i++) {
        const a = r() * Math.PI * 2;
        const rad = 0.5 + Math.sqrt(r()) * (ISLAND_R - 0.6);
        const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
        const k = 0.025 + r() * r() * 0.1;
        q.setFromEuler(new THREE.Euler(r() * 0.5, r() * 6, r() * 0.5));
        pb.setMatrixAt(i, m.compose(new THREE.Vector3(x, surfaceY(x, z) - k * 0.25, z), q, new THREE.Vector3(k, k, k)));
        const grey = 0.16 + r() * 0.16; // weathered granite and laterite pebbles
        pb.setColorAt(i, c.setRGB(grey * (1.15 + r() * 0.25), grey, grey * (0.8 + r() * 0.1)));
      }
      pb.instanceMatrix.needsUpdate = true;
      if (pb.instanceColor) pb.instanceColor.needsUpdate = true;
    }
  }, [blades]);

  const tones = useMemo(() => ({ dry: new THREE.Color(1.15, 1.0, 0.72), lush: new THREE.Color(0.9, 1.15, 0.85) }), []);

  useFrame(() => {
    const { u, time } = story.current;
    const wet = wetness(u);
    for (const m of [soil, strata]) {
      m.color.setScalar(1 - 0.42 * wet); // darker and glossier when wet
      m.roughness = 1 - 0.45 * wet;
    }
    grassUniforms.uTime.value = animate ? time : 0;
    grassUniforms.uGrow.value = 0.35 + 0.65 * smooth(1.5, 3.2, u);
    grassMat.color.copy(tones.dry).lerp(tones.lush, smooth(1.4, 2.8, u));

    rain.uTime.value = time;
    rain.uRain.value = smooth(1.0, 1.35, u) * (1 - smooth(1.85, 2.2, u));
    puddleMat.opacity = 0.88 * smooth(1.3, 1.8, u) * (1 - smooth(2.6, 3.4, u)); // they soak away in the sun
    puddleRefs.current.forEach((p) => p && (p.visible = puddleMat.opacity > 0.01));
  });

  return (
    <group>
      <mesh geometry={top} material={soil} receiveShadow />
      <mesh geometry={side} material={strata} receiveShadow />
      <mesh geometry={under} material={rock} position={[0, -DEPTH - 1.4 + 0.04, 0]} />
      <mesh geometry={roots} material={rootMat} />
      <instancedMesh ref={grass} args={[blade, grassMat, blades.length]} frustumCulled={false} receiveShadow />
      <instancedMesh ref={pebbles} args={[pebbleGeo, pebbleMat, PEBBLES]} frustumCulled={false} castShadow receiveShadow />
      {puddles.map((p, i) => (
        <mesh key={i} ref={(m) => { puddleRefs.current[i] = m; }} material={puddleMat} position={[p.x, p.y, p.z]} rotation={[-Math.PI / 2, 0, i * 1.3]} receiveShadow>
          <planeGeometry args={[p.r * 2, p.r * 2]} />
        </mesh>
      ))}
    </group>
  );
}
