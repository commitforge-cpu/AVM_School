"use client";

/**
 * Clouds and rain over the island.
 * Clouds are built from many soft, noisy puffs that always face the camera, shaded bright on
 * top and grey underneath; they roll in, darken into rain clouds, then part for the sun.
 * Rain is thousands of fine streaks animated on the GPU (each a motion-blurred drop), with
 * droplets splashing up where they hit the soil.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ISLAND_R } from "./Island";
import { hash, makeNoise, pixelTexture, rainAmount, rng, smooth, storminess, sunAmount, useOwned, type Story } from "./sceneKit";

// ---------------------------------------------------------------- clouds

type CloudDef = { p: [number, number, number]; s: number; side: number; d: number; stay: boolean };
const CLOUDS: CloudDef[] = [
  { p: [-4.4, 7.0, -2.6], s: 1.2, side: -1, d: 0.0, stay: false },
  { p: [-1.2, 7.7, -4.2], s: 1.5, side: -1, d: 0.08, stay: false },
  { p: [2.2, 7.3, -3.2], s: 1.35, side: 1, d: 0.04, stay: false },
  { p: [5.0, 6.9, -1.6], s: 1.1, side: 1, d: 0.12, stay: false },
  { p: [0.5, 6.7, 0.6], s: 1.0, side: 1, d: 0.16, stay: false },
  { p: [-2.6, 6.6, 1.0], s: 0.95, side: -1, d: 0.2, stay: false },
  { p: [6.8, 8.0, -5.6], s: 1.4, side: 1, d: 0.1, stay: true },
  { p: [-7.2, 7.6, -5.2], s: 1.4, side: -1, d: 0.06, stay: false },
];
const PUFFS = 26;

const CLOUD_VERT = /* glsl */ `
attribute vec3 aOffset;
attribute float aSize;
attribute float aShade;
attribute float aSpin;
attribute float aCloud;
uniform vec3 uPos[${CLOUDS.length}];
uniform float uScale[${CLOUDS.length}];
uniform float uAlpha[${CLOUDS.length}];
varying vec2 vUv;
varying float vShade;
varying float vAlpha;
varying float vSide;
void main() {
  int ci = int(aCloud + 0.5);
  if (uAlpha[ci] < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; } // hidden clouds cost nothing
  vec3 centre = uPos[ci] + aOffset * uScale[ci];
  vec4 mv = modelViewMatrix * vec4(centre, 1.0);
  float c = cos(aSpin), s = sin(aSpin);
  mv.xy += vec2(c * position.x - s * position.y, s * position.x + c * position.y) * aSize * uScale[ci];
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vShade = aShade;
  vAlpha = uAlpha[ci];
  vSide = aOffset.x;
}`;

const CLOUD_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uSunTint;
uniform float uSun;
varying vec2 vUv;
varying float vShade;
varying float vAlpha;
varying float vSide;
void main() {
  vec4 t = texture2D(uMap, vUv);
  float a = t.a * vAlpha;
  if (a < 0.004) discard;
  float shade = clamp(vShade + (t.r - 0.5) * 0.5, 0.0, 1.0);
  vec3 col = mix(uBottom, uTop, shade);
  col += uSunTint * uSun * smoothstep(0.5, -1.5, vSide) * shade * 0.45; // the side facing the sun glows
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** One soft cloud puff: billowy noise inside a round falloff. Red channel carries the billows. */
function puffTexture() {
  const n = makeNoise(61);
  return pixelTexture(128, 128, (u, v, px) => {
    const d = Math.hypot(u - 0.5, v - 0.5) * 2;
    const billow = n.fbm(u * 4 + 3, v * 4 + 7, 5);
    const a = Math.max(0, 1 - d * d) * smooth(0.25, 0.6, billow + (1 - d) * 0.35);
    px[0] = px[1] = px[2] = 255 * billow;
    px[3] = 255 * Math.min(1, a * 1.25);
  });
}

function Clouds({ story }: { story: Story }) {
  const tex = useOwned(puffTexture);
  const geo = useOwned(() => {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute("position", base.attributes.position);
    g.setAttribute("uv", base.attributes.uv);
    const r = rng(71);
    type Puff = { o: number[]; size: number; shade: number; spin: number; cloud: number };
    const puffs: Puff[] = [];
    CLOUDS.forEach((_, k) => {
      for (let i = 0; i < PUFFS; i++) {
        // a flat-bottomed heap: wide at the base, piling up in the middle
        const x = (r() - 0.5) * 3.4;
        const z = (r() - 0.5) * 1.6;
        const hump = Math.max(0, 1 - Math.abs(x) / 1.9);
        const y = r() * (0.25 + hump * 0.95);
        puffs.push({ o: [x, y, z], size: 0.9 + r() * 0.9 * (0.6 + hump), shade: Math.min(1, y / 1.0 + 0.1), spin: r() * 6.28, cloud: k });
      }
    });
    puffs.sort((a, b) => a.o[2] - b.o[2]); // draw the far puffs first
    g.setAttribute("aOffset", new THREE.InstancedBufferAttribute(Float32Array.from(puffs.flatMap((p) => p.o)), 3));
    g.setAttribute("aSize", new THREE.InstancedBufferAttribute(Float32Array.from(puffs.map((p) => p.size)), 1));
    g.setAttribute("aShade", new THREE.InstancedBufferAttribute(Float32Array.from(puffs.map((p) => p.shade)), 1));
    g.setAttribute("aSpin", new THREE.InstancedBufferAttribute(Float32Array.from(puffs.map((p) => p.spin)), 1));
    g.setAttribute("aCloud", new THREE.InstancedBufferAttribute(Float32Array.from(puffs.map((p) => p.cloud)), 1));
    g.instanceCount = puffs.length;
    return g;
  });
  const uniforms = useMemo(
    () => ({
      uPos: { value: CLOUDS.map((c) => new THREE.Vector3(...c.p)) },
      uScale: { value: CLOUDS.map(() => 1) },
      uAlpha: { value: CLOUDS.map(() => 0) },
      uMap: { value: tex },
      uTop: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uSunTint: { value: new THREE.Color("#ffb46b") },
      uSun: { value: 0 },
    }),
    [tex],
  );
  const mat = useOwned(() => new THREE.ShaderMaterial({ uniforms, vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false }));
  const mesh = useRef<THREE.Mesh>(null);
  const tones = useMemo(
    () => ({
      top: new THREE.Color("#f3f1f0"), bottom: new THREE.Color("#a7a8b4"),
      stormTop: new THREE.Color("#8d909b"), stormBottom: new THREE.Color("#3a3c46"),
      warmTop: new THREE.Color("#fff0dc"), warmBottom: new THREE.Color("#b89485"),
    }),
    [],
  );

  useFrame(() => {
    const { u, time } = story.current;
    const storm = storminess(u);
    const sun = sunAmount(u);
    uniforms.uTop.value.copy(tones.top).lerp(tones.stormTop, storm).lerp(tones.warmTop, sun * 0.8);
    uniforms.uBottom.value.copy(tones.bottom).lerp(tones.stormBottom, storm).lerp(tones.warmBottom, sun * 0.8);
    uniforms.uSun.value = sun;
    let shown = 0;
    CLOUDS.forEach((c, k) => {
      const arrive = smooth(0.75 + c.d, 1.3 + c.d, u);
      // after the rain the clouds part; those on the sun's side (left) linger, so the sunbeams
      // pour through the gaps between them, and drift off as the tree grows
      const part = smooth(1.95 + c.d * 0.6, 2.5 + c.d * 0.6, u);
      const leave = c.side < 0 ? part * 0.3 + smooth(3.2 + c.d, 3.8 + c.d, u) * 0.7 : part * (c.stay ? 0.35 : 1);
      const away = 1 - arrive + leave;
      uniforms.uPos.value[k].set(c.p[0] + c.side * away * 12 + Math.sin(time * 0.06 + k) * 0.4, c.p[1], c.p[2]);
      uniforms.uScale.value[k] = c.s * (0.7 + 0.3 * arrive) * (1 + storm * 0.15);
      uniforms.uAlpha.value[k] = arrive * (1 - 0.6 * leave) * 0.92;
      shown = Math.max(shown, uniforms.uAlpha.value[k]);
    });
    if (mesh.current) mesh.current.visible = shown > 0.004;
  });

  return <mesh ref={mesh} geometry={geo} material={mat} frustumCulled={false} renderOrder={2} />;
}

// ---------------------------------------------------------------- rain

const DROPS = 2600;
const RAIN_TOP = 6.4;

const RAIN_VERT = /* glsl */ `
attribute vec4 aDrop;   // x, z, phase, speed
attribute vec3 aShape;  // length, width, brightness
attribute float aIndex; // 0..1, so light rain shows fewer drops
uniform float uTime;
uniform float uAmount;
uniform float uR2;
varying vec2 vUv;
varying float vBright;
void main() {
  if (aIndex > uAmount) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec2 xz = aDrop.xy;
  float floorY = dot(xz, xz) < uR2 ? 0.04 : -4.5; // drops stop at the soil
  float h = ${RAIN_TOP.toFixed(2)} - floorY;
  float y = ${RAIN_TOP.toFixed(2)} - mod(uTime * aDrop.w + aDrop.z * h, h);
  vec3 dir = normalize(vec3(0.07, 1.0, 0.02)); // a little wind
  vec3 head = vec3(xz.x - dir.x * (${RAIN_TOP.toFixed(2)} - y), y, xz.y);
  vec3 centre = head + dir * aShape.x * 0.5;
  vec3 side = normalize(cross(dir, cameraPosition - centre));
  vec3 p = centre + side * position.x * aShape.y + dir * position.y * aShape.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  vUv = uv;
  vBright = aShape.z;
}`;

const RAIN_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying float vBright;
void main() {
  float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float along = pow(1.0 - vUv.y, 1.3) * smoothstep(0.0, 0.06, vUv.y); // bright drop, fading streak above it
  gl_FragColor = vec4(uColor * vBright, across * across * along * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const SPLASH_VERT = /* glsl */ `
attribute float aSeed;
attribute float aK;
uniform float uTime;
uniform float uAmount;
uniform float uRadius;
uniform float uSize;
varying float vFade;
float h1(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
void main() {
  float cyc = uTime * 1.7 + h1(aSeed) * 10.0;
  float n = floor(cyc);
  float t = fract(cyc) / 0.32; // a splash lasts a third of each cycle
  float r = sqrt(h1(aSeed * 7.1 + n * 1.3)) * uRadius;
  float a = h1(aSeed * 3.7 + n * 2.9) * 6.2832;
  vec2 site = vec2(cos(a), sin(a)) * r;
  float ang = aK * 1.2566 + h1(aSeed + n) * 6.2832;
  float rr = r / ${ISLAND_R.toFixed(2)};
  float ground = 0.06 * (1.0 - rr * rr) + 0.015;
  float up = sin(min(t, 1.0) * 3.1416) * (0.05 + 0.06 * h1(aSeed * 5.3 + n + aK));
  vec3 p = vec3(site.x + cos(ang) * t * 0.09, ground + up, site.y + sin(ang) * t * 0.09);
  vFade = (t < 1.0 && h1(aSeed * 1.7 + n) < uAmount) ? (1.0 - t) : 0.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize / -mv.z;
}`;

const SPLASH_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vFade;
void main() {
  if (vFade <= 0.0) discard;
  float d = length(gl_PointCoord - 0.5);
  gl_FragColor = vec4(uColor, smoothstep(0.5, 0.15, d) * vFade * 0.8);
  #include <colorspace_fragment>
}`;

function Rain({ story, animate }: { story: Story; animate: boolean }) {
  const dpr = typeof window === "undefined" ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
  const drops = useOwned(() => {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute("position", base.attributes.position);
    g.setAttribute("uv", base.attributes.uv);
    const drop = new Float32Array(DROPS * 4);
    const shape = new Float32Array(DROPS * 3);
    const index = new Float32Array(DROPS);
    for (let i = 0; i < DROPS; i++) {
      drop.set([(hash(i, 1) - 0.5) * 14, (hash(i, 2) - 0.5) * 9 - 0.5, hash(i, 3), 11 + hash(i, 4) * 6], i * 4);
      shape.set([0.28 + hash(i, 5) * 0.35, 0.008 + hash(i, 6) * 0.01, 0.6 + hash(i, 7) * 0.5], i * 3);
      index[i] = hash(i, 8);
    }
    g.setAttribute("aDrop", new THREE.InstancedBufferAttribute(drop, 4));
    g.setAttribute("aShape", new THREE.InstancedBufferAttribute(shape, 3));
    g.setAttribute("aIndex", new THREE.InstancedBufferAttribute(index, 1));
    g.instanceCount = DROPS;
    return g;
  });
  const dropUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uAmount: { value: 0 }, uR2: { value: (ISLAND_R * 0.97) ** 2 }, uColor: { value: new THREE.Color("#c9d3e6") }, uOpacity: { value: 0 } }),
    [],
  );
  const dropMat = useOwned(() => new THREE.ShaderMaterial({ uniforms: dropUniforms, vertexShader: RAIN_VERT, fragmentShader: RAIN_FRAG, transparent: true, depthWrite: false }));

  const splashes = useOwned(() => {
    const n = 150 * 5;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => Math.floor(i / 5) + 1), 1));
    g.setAttribute("aK", new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => i % 5), 1));
    return g;
  });
  const splashUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uAmount: { value: 0 }, uRadius: { value: ISLAND_R - 0.35 }, uSize: { value: 26 * dpr }, uColor: { value: new THREE.Color("#d9e2f2") } }),
    [dpr],
  );
  const splashMat = useOwned(() => new THREE.ShaderMaterial({ uniforms: splashUniforms, vertexShader: SPLASH_VERT, fragmentShader: SPLASH_FRAG, transparent: true, depthWrite: false }));
  const clock = useMemo(() => ({ t: 0 }), []);
  const dropMesh = useRef<THREE.Mesh>(null);
  const splashPoints = useRef<THREE.Points>(null);

  useFrame((_, dt) => {
    const { u } = story.current;
    const amount = rainAmount(u);
    if (dropMesh.current) dropMesh.current.visible = amount > 0.004;
    if (splashPoints.current) splashPoints.current.visible = amount > 0.004;
    if (animate) clock.t += Math.min(dt, 0.05);
    dropUniforms.uTime.value = clock.t;
    dropUniforms.uAmount.value = Math.sqrt(amount);
    dropUniforms.uOpacity.value = 0.55 * smooth(0, 0.3, amount);
    splashUniforms.uTime.value = clock.t;
    splashUniforms.uAmount.value = amount;
  });

  return (
    <>
      <mesh ref={dropMesh} geometry={drops} material={dropMat} frustumCulled={false} renderOrder={3} />
      <points ref={splashPoints} geometry={splashes} material={splashMat} frustumCulled={false} renderOrder={3} />
    </>
  );
}

export default function Weather({ story, animate }: { story: Story; animate: boolean }) {
  return (
    <>
      <Clouds story={story} />
      <Rain story={story} animate={animate} />
    </>
  );
}
