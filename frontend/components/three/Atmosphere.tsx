"use client";

/**
 * Sky, sun and light. The sky is three.js's physically based sky (Preetham scattering with a
 * procedural cloud layer): pre-dawn twilight with fading stars in the opening, an overcast sky
 * in the rain, then sunrise and a warm morning. Shafts of sunlight fall through the gap in the
 * clouds onto the soil, with dust glinting in them.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Sky as PhysicalSky } from "three/examples/jsm/objects/Sky.js";
import { ISLAND_R } from "./Island";
import { SUN_DIR, colorAt, colors, hash, numberAt, smooth, sunAmount, useOwned, type Story } from "./sceneKit";

const INK = "#0d1230";

// Sky keyframes by story time u: opening (pre-dawn), seed landed, rain, sun breaks through, growing, fruit.
const SKY_AT = [-0.5, 0.8, 1.5, 2.4, 3.4, 4.5];
const SUN_ELEVATION = [-4.5, -2.5, 1.5, 5, 8, 10]; // degrees above the horizon
const TURBIDITY = [3, 4, 10, 8, 7, 7]; // morning haze warms the low sun
const RAYLEIGH = [2.2, 2, 1.2, 1.1, 1.2, 1.3];
const COVERAGE = [0.22, 0.28, 0.95, 0.5, 0.35, 0.3];
const EXPOSURE = [1.6, 1.2, 0.55, 0.62, 0.55, 0.45];
const NIGHT = [1, 0.75, 0.25, 0.08, 0, 0]; // pre-dawn twilight, before the sun's light takes over
const OVERCAST = [0, 0.05, 0.85, 0.2, 0, 0];
const FOG = colors(["#1d2142", "#252b4a", "#4d525e", "#8f9aa6", "#a9b2bb", "#b8bcc0"]);

/** Added to three's sky shader: twilight before sunrise, an overcast sky, and haze below the horizon. */
const SKY_EXTRA = /* glsl */ `
uniform float uExposure;
uniform float uNight;
uniform float uOvercast;
uniform vec3 uNightTop;
uniform vec3 uNightHorizon;
uniform vec3 uDawnGlow;
uniform vec3 uOvercastTop;
uniform vec3 uHaze;`;
const SKY_OUT = /* glsl */ `
vec3 col = texColor * uExposure;
float hh = clamp(direction.y * 1.5, 0.0, 1.0);
vec3 night = mix(uNightHorizon, uNightTop, pow(hh, 0.6));
vec2 flatDir = direction.xz / max(length(direction.xz), 1e-4);
vec2 flatSun = vSunDirection.xz / max(length(vSunDirection.xz), 1e-4);
night += uDawnGlow * pow(max(dot(flatDir, flatSun), 0.0), 3.0) * pow(1.0 - hh, 3.0);
col += night * uNight;
col = mix(col, mix(uHaze, uOvercastTop, pow(hh, 0.7)), uOvercast);
col = mix(col, uHaze, smoothstep(0.02, -0.25, direction.y));
gl_FragColor = vec4(col, 1.0);`;
const FOG_NEAR = [22, 22, 14, 22, 24, 24];
const FOG_FAR = [62, 62, 40, 62, 66, 66];

/** Horizontal direction of the sun (from the left), raised to the given elevation. */
function sunPosition(elevationDeg: number, out: THREE.Vector3) {
  const flat = new THREE.Vector2(SUN_DIR.x, SUN_DIR.z).normalize();
  const e = THREE.MathUtils.degToRad(elevationDeg);
  return out.set(flat.x * Math.cos(e), Math.sin(e), flat.y * Math.cos(e));
}

function Sky({ story, animate }: { story: Story; animate: boolean }) {
  const scene = useThree((s) => s.scene);
  const sky = useMemo(() => {
    const s = new PhysicalSky();
    s.scale.setScalar(180); // the sky box must sit inside the camera's far plane
    const m = s.material as THREE.ShaderMaterial;
    Object.assign(m.uniforms, {
      uExposure: { value: 1 },
      uNight: { value: 1 },
      uOvercast: { value: 0 },
      uNightTop: { value: new THREE.Color("#0a0e2c") },
      uNightHorizon: { value: new THREE.Color("#2a2456") },
      uDawnGlow: { value: new THREE.Color("#6a2f22") },
      uOvercastTop: { value: new THREE.Color("#3e424e") },
      uHaze: { value: new THREE.Color() },
    });
    m.uniforms.mieCoefficient.value = 0.005;
    m.uniforms.mieDirectionalG.value = 0.8;
    m.uniforms.cloudDensity.value = 0.55;
    m.uniforms.cloudElevation.value = 0.55;
    m.uniforms.cloudScale.value = 0.00025;
    m.fragmentShader = m.fragmentShader
      .replace("uniform float showSunDisc;", `uniform float showSunDisc;${SKY_EXTRA}`)
      .replace("gl_FragColor = vec4( texColor, 1.0 );", SKY_OUT);
    s.frustumCulled = false;
    s.renderOrder = -10;
    return s;
  }, []);
  useEffect(() => () => { sky.geometry.dispose(); (sky.material as THREE.Material).dispose(); }, [sky]);

  const stars = useOwned(() => {
    const n = 1400;
    const p = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.set(hash(i, 1) - 0.5, hash(i, 2) * 0.9 + 0.08, hash(i, 3) - 0.5).normalize().multiplyScalar(80);
      p.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  });
  const starMat = useOwned(() => new THREE.PointsMaterial({ color: "#f2efe8", size: 1.5, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false }));
  const group = useRef<THREE.Group>(null);
  const fog = useMemo(() => new THREE.Fog(INK, 22, 62), []);
  const sun = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    scene.fog = fog;
    return () => { scene.fog = null; };
  }, [scene, fog]);

  useFrame(({ camera }) => {
    const { u, time } = story.current;
    const m = sky.material as THREE.ShaderMaterial;
    sky.position.copy(camera.position);
    group.current?.position.copy(camera.position);
    sunPosition(numberAt(u, SKY_AT, SUN_ELEVATION), sun);
    m.uniforms.sunPosition.value.copy(sun);
    m.uniforms.turbidity.value = numberAt(u, SKY_AT, TURBIDITY);
    m.uniforms.rayleigh.value = numberAt(u, SKY_AT, RAYLEIGH);
    m.uniforms.cloudCoverage.value = numberAt(u, SKY_AT, COVERAGE);
    m.uniforms.time.value = animate ? time * 25 : 0;
    m.uniforms.uExposure.value = numberAt(u, SKY_AT, EXPOSURE);
    m.uniforms.uNight.value = numberAt(u, SKY_AT, NIGHT);
    m.uniforms.uOvercast.value = numberAt(u, SKY_AT, OVERCAST);
    colorAt(u, SKY_AT, FOG, fog.color);
    m.uniforms.uHaze.value.copy(fog.color); // the haze below the horizon matches the fog on the island
    fog.near = numberAt(u, SKY_AT, FOG_NEAR);
    fog.far = numberAt(u, SKY_AT, FOG_FAR);
    starMat.opacity = 0.85 * (1 - smooth(0.1, 1.0, u));
  });

  return (
    <>
      <primitive object={sky} />
      <group ref={group}>
        <points geometry={stars} material={starMat} renderOrder={-9} frustumCulled={false} />
      </group>
    </>
  );
}

// ---------------------------------------------------------------- shafts of sunlight

const RAY_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const RAY_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 3.0);
  float along = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
  // light thickens and thins as haze drifts through the beam
  float haze = 0.75 + 0.25 * sin(vUv.y * 9.0 - uTime * 0.4 + uSeed) * sin(vUv.x * 25.0 + uSeed * 3.0);
  gl_FragColor = vec4(uColor, edge * along * haze * uOpacity);
}`;

const RAYS = [
  { to: [0.2, 0, 0.3], w: 0.9, k: 1 },
  { to: [-0.8, 0, -0.5], w: 0.55, k: 0.7 },
  { to: [1.0, 0, -0.7], w: 0.6, k: 0.8 },
  { to: [-0.3, 0, 1.1], w: 0.45, k: 0.6 },
  { to: [0.7, 0, 0.9], w: 0.35, k: 0.5 },
  { to: [-1.4, 0, 0.4], w: 0.4, k: 0.45 },
  { to: [1.6, 0, 0.2], w: 0.3, k: 0.4 },
];
const RAY_LENGTH = 12.5;
const UP = new THREE.Vector3(0, 1, 0);

function SunRays({ story, animate }: { story: Story; animate: boolean }) {
  const geos = useOwned(() => {
    const list = RAYS.map((r) => new THREE.CylinderGeometry(r.w * 0.7, r.w, RAY_LENGTH, 24, 1, true));
    return Object.assign(list, { dispose: () => list.forEach((g) => g.dispose()) });
  });
  const mats = useMemo(
    () =>
      RAYS.map(
        (_, i) =>
          new THREE.ShaderMaterial({
            uniforms: { uColor: { value: new THREE.Color("#fff1dc") }, uOpacity: { value: 0 }, uTime: { value: 0 }, uSeed: { value: i * 1.7 } },
            vertexShader: RAY_VERT,
            fragmentShader: RAY_FRAG,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  const placement = useMemo(
    () =>
      RAYS.map((r) => ({
        position: new THREE.Vector3(...(r.to as [number, number, number])).addScaledVector(SUN_DIR, RAY_LENGTH / 2),
        quaternion: new THREE.Quaternion().setFromUnitVectors(UP, SUN_DIR),
      })),
    [],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const { u, time } = story.current;
    const sun = sunAmount(u) * (1 - 0.45 * smooth(3.4, 4.4, u));
    mats.forEach((m, i) => {
      m.uniforms.uOpacity.value = sun * 0.09 * RAYS[i].k * (0.65 + 0.35 * (0.5 + 0.5 * Math.sin(time * 0.45 + i * 1.9)));
      m.uniforms.uTime.value = animate ? time : 0;
      const r = refs.current[i];
      if (r) r.visible = sun > 0.003;
    });
  });

  return (
    <>
      {geos.map((g, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} geometry={g} material={mats[i]} position={placement[i].position} quaternion={placement[i].quaternion} renderOrder={4} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- dust in the sunlight

const DUST = 420;
const DUST_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uSize;
uniform vec3 uSunDir;
varying float vGlow;
void main() {
  vec3 p = aSeed.xyz + vec3(sin(uTime * 0.13 + aSeed.w * 6.0), sin(uTime * 0.09 + aSeed.w * 4.0) * 0.6, cos(uTime * 0.11 + aSeed.w * 5.0)) * 0.35;
  // only motes inside the sunbeam catch the light
  float d = length(cross(p, uSunDir));
  vGlow = smoothstep(1.7, 0.5, d) * (0.5 + 0.5 * sin(uTime * 1.3 + aSeed.w * 20.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize / -mv.z;
}`;
const DUST_FRAG = /* glsl */ `
uniform float uOpacity;
varying float vGlow;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vGlow * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vec3(1.0, 0.9, 0.72), a);
}`;

function Dust({ story, animate }: { story: Story; animate: boolean }) {
  const dpr = typeof window === "undefined" ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
  const geo = useOwned(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
    const seed = new Float32Array(DUST * 4);
    for (let i = 0; i < DUST; i++) {
      seed.set([(hash(i, 81) - 0.5) * ISLAND_R * 2.4, hash(i, 82) * 6, (hash(i, 83) - 0.5) * ISLAND_R * 2, hash(i, 84)], i * 4);
    }
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    return g;
  });
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSize: { value: 30 * dpr }, uSunDir: { value: SUN_DIR.clone() }, uOpacity: { value: 0 } }), [dpr]);
  const mat = useOwned(() => new THREE.ShaderMaterial({ uniforms, vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const points = useRef<THREE.Points>(null);

  useFrame(() => {
    const { u, time } = story.current;
    uniforms.uTime.value = animate ? time : 0;
    uniforms.uOpacity.value = sunAmount(u) * 0.55;
    if (points.current) points.current.visible = uniforms.uOpacity.value > 0.005;
  });

  return <points ref={points} geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

export default function Atmosphere({ story, animate }: { story: Story; animate: boolean }) {
  return (
    <>
      <Sky story={story} animate={animate} />
      <SunRays story={story} animate={animate} />
      <Dust story={story} animate={animate} />
    </>
  );
}
