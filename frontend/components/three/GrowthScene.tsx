"use client";

/**
 * Home page scene, told by scrolling. Parakeets cross the pre-dawn sky and one carries a seed,
 * which falls onto a floating island of earth. Further down, clouds gather and it rains, then
 * the sun rises and breaks through, the seed sprouts, a mango tree grows and its fruit ripens,
 * and the parakeets come back to it.
 *
 * Everything is a function of one number, `u`: how far the page has scrolled through the
 * #story section, in screen heights (story chapter i sits mid-screen at u = i + 0.5). `u` eases
 * towards the scroll position every frame, so the film plays smoothly forwards and backwards.
 *
 * Parts: Atmosphere (sky, sun, light shafts), Weather (clouds, rain), Island (soil, grass,
 * puddles), MangoTree, Parakeets; the seed, lights and camera are here.
 */

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Atmosphere from "./Atmosphere";
import Island, { surfaceY } from "./Island";
import Beanstalks from "./Beanstalk";
import MangoTree from "./MangoTree";
import Parakeets, { beakPosition } from "./Parakeets";
import Weather from "./Weather";
import {
  SUN_DIR, canvasTexture, colorAt, colors, easeOutBack, easeOutCubic, glowTexture, hash, numberAt, ramp, smooth, sunAmount,
  useOwned, vectorAt, vectors, type Story, type StoryState,
} from "./sceneKit";

const INK = "#0d1230";
const SKY_FILL = "#c2cbd2"; // soft light from the open sky behind the island

const SEED_FALL: [number, number] = [-0.2, 0.62];

/** Turns the scroll position into `u` and eases towards it. */
function Director({ story, animate }: { story: Story; animate: boolean }) {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const s = story.current;
    const measure = () => {
      const vh = Math.max(1, window.innerHeight);
      const el = document.getElementById("story");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        // the film is timed for five chapters; stretch or squeeze it if there are more or fewer
        const beats = Math.max(1, el.children.length);
        s.target = ((window.scrollY + vh / 2 - top) / vh) * (5 / beats);
      } else {
        s.target = window.scrollY / vh - 0.45;
      }
      if (!animate) invalidate();
    };
    const onPointer = (e: PointerEvent) => {
      s.pointer.set((e.clientX / Math.max(1, window.innerWidth)) * 2 - 1, 1 - (e.clientY / Math.max(1, window.innerHeight)) * 2);
    };
    measure();
    s.u = s.target; // start where the page is (e.g. reloaded halfway down)
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [story, animate, invalidate]);

  useFrame((_, dt) => {
    const s = story.current;
    const d = Math.min(dt, 0.1);
    s.u = animate ? THREE.MathUtils.damp(s.u, s.target, 3.2, d) : s.target;
    if (animate) s.time += d;
  });
  return null;
}

// ---------------------------------------------------------------- the seed, its landing and the sprout

const SEED_REST = new THREE.Vector3(0, surfaceY(0, 0) + 0.025, 0);
const TRAIL = 6;

function seedAt(s: number, start: THREE.Vector3, out: THREE.Vector3) {
  const across = easeOutCubic(s); // drifts with the bird's momentum, then drops straight
  return out.set(
    start.x + (SEED_REST.x - start.x) * across,
    start.y + (SEED_REST.y - start.y) * s * s, // falls faster and faster
    start.z + (SEED_REST.z - start.z) * across,
  );
}

/** A young mango leaf for the sprout: narrow, pointed, bronze-green with a pale midrib. */
function seedlingLeafTexture() {
  return canvasTexture(64, 160, (ctx) => {
    const g = ctx.createLinearGradient(0, 160, 0, 0);
    g.addColorStop(0, "#5f7a2c");
    g.addColorStop(1, "#9a6a34");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 158);
    ctx.bezierCurveTo(62, 120, 58, 40, 32, 2);
    ctx.bezierCurveTo(6, 40, 2, 120, 32, 158);
    ctx.fill();
    ctx.strokeStyle = "rgba(220,220,160,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(32, 156);
    ctx.lineTo(32, 6);
    ctx.stroke();
  });
}

function Seed({ story }: { story: Story }) {
  // the seed catches the low light as it falls (a soft glint, so the eye can follow it)
  const glowTex = useOwned(() => glowTexture("rgba(255,240,200,0.9)", "rgba(255,200,120,0.35)"));
  const glowMat = useOwned(() => new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
  const trailMats = useMemo(() => Array.from({ length: TRAIL }, () => glowMat.clone()), [glowMat]);
  useEffect(() => () => trailMats.forEach((m) => m.dispose()), [trailMats]);

  const seedMat = useOwned(() => new THREE.MeshStandardMaterial({ color: "#7a4f2a", roughness: 0.45, emissive: new THREE.Color("#ffb060"), emissiveIntensity: 0.15 }));
  const moundGeo = useOwned(() => {
    const g = new THREE.SphereGeometry(0.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 + (hash(Math.round(pos.getX(i) * 40), Math.round(pos.getZ(i) * 40), 3) - 0.5) * 0.18;
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  });
  const moundMat = useOwned(() => new THREE.MeshStandardMaterial({ color: "#4a3122", roughness: 1 }));
  const stemMat = useOwned(() => new THREE.MeshStandardMaterial({ color: "#7d8a3a", roughness: 0.7 }));
  const leafTex = useOwned(seedlingLeafTexture);
  const leafMat = useOwned(() => new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }));
  const leafGeo = useOwned(() => new THREE.PlaneGeometry(0.11, 0.28).translate(0, 0.14, 0));
  const dustGeo = useOwned(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
    return g;
  });
  const dustTex = useOwned(() => glowTexture("rgba(190,150,110,0.9)", "rgba(160,120,85,0.4)"));
  const dustMat = useOwned(() => new THREE.PointsMaterial({ map: dustTex, color: "#c8a27a", size: 0.16, transparent: true, depthWrite: false, opacity: 0 }));

  const seed = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const trail = useRef<(THREE.Sprite | null)[]>([]);
  const mound = useRef<THREE.Mesh>(null);
  const stem = useRef<THREE.Mesh>(null);
  const leaves = useRef<(THREE.Mesh | null)[]>([]);
  const dust = useRef<THREE.Points>(null);
  const tmp = useMemo(() => ({ start: new THREE.Vector3(), p: new THREE.Vector3() }), []);

  useFrame(({ clock }) => {
    const { u, time } = story.current;
    beakPosition(0, time, u, tmp.start); // held in the lead parakeet's beak

    const s = ramp(SEED_FALL[0], SEED_FALL[1], u);
    const falling = Math.sin(s * Math.PI);
    const sink = smooth(0.66, 0.9, u);
    const gone = smooth(2.7, 3.05, u); // the sprout takes over

    seedAt(s, tmp.start, tmp.p);
    tmp.p.y -= sink * 0.03;
    if (seed.current) {
      seed.current.position.copy(tmp.p);
      seed.current.rotation.set(s * 7, s * 4, sink * 1.2);
      seed.current.visible = gone < 1;
    }

    // glow: brighter while it falls, a faint glow under the soil, then it "wakes" in the sunlight
    const wake = smooth(2.05, 2.4, u) * (1 - smooth(2.6, 2.95, u));
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.06;
    if (glow.current) {
      glow.current.position.copy(tmp.p);
      glow.current.scale.setScalar((0.13 + 0.12 * falling + wake * 0.3) * pulse);
      glowMat.opacity = ((0.22 + 0.25 * falling) * (1 - 0.8 * sink) + wake * 0.3) * (1 - gone);
    }
    trail.current.forEach((sp, k) => {
      if (!sp) return;
      const sk = s - (k + 1) * 0.03;
      sp.visible = s > 0 && s < 1 && sk > 0;
      if (!sp.visible) return;
      seedAt(sk, tmp.start, sp.position);
      sp.scale.setScalar(0.14 * (1 - (k + 1) / (TRAIL + 2)));
      trailMats[k].opacity = falling * 0.18 * (1 - (k + 1) / (TRAIL + 1));
    });

    // a puff of dust where it lands, then a little mound of soil over it
    const l = ramp(SEED_FALL[1] - 0.02, SEED_FALL[1] + 0.3, u);
    if (dust.current) {
      dust.current.visible = l > 0 && l < 1;
      if (dust.current.visible) {
        const a = dustGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < a.count; i++) {
          const ang = (i / a.count) * Math.PI * 2 + hash(i, 31);
          const r = 0.04 + 0.4 * easeOutCubic(l) * (0.4 + 0.6 * hash(i, 32));
          a.setXYZ(i, Math.cos(ang) * r, SEED_REST.y + 0.02 + Math.sin(Math.min(1, l * 1.4) * Math.PI) * 0.18 * hash(i, 33), Math.sin(ang) * r);
        }
        a.needsUpdate = true;
        dustMat.opacity = Math.sin(l * Math.PI) * 0.6;
      }
    }
    const m = easeOutBack(ramp(0.66, 0.92, u)) * (1 - 0.6 * smooth(3.0, 3.4, u));
    if (mound.current) {
      mound.current.scale.set(m, m * 0.45, m);
      mound.current.visible = m > 0.001;
    }

    // the sprout: a stem and two seed leaves, which the young tree then replaces
    const st = smooth(2.35, 2.75, u) * (1 - smooth(2.95, 3.2, u));
    if (stem.current) {
      stem.current.scale.set(1, Math.max(0.001, 0.42 * st), 1);
      stem.current.visible = st > 0.001;
    }
    const lf = easeOutBack(ramp(2.5, 2.8, u)) * (1 - smooth(2.95, 3.25, u));
    leaves.current.forEach((leaf, k) => {
      if (!leaf) return;
      leaf.position.set(0, 0.1 + 0.42 * st, 0);
      leaf.scale.setScalar(Math.max(0.001, lf));
      leaf.rotation.set(0, k * Math.PI + 0.4, 0.9 + Math.sin(time * 1.3 + k) * 0.05, "YXZ"); // two leaves opening to either side
      leaf.visible = lf > 0.001;
    });
  });

  return (
    <group>
      <mesh ref={seed} material={seedMat} castShadow scale={[1, 1.5, 0.8]}>
        <sphereGeometry args={[0.026, 16, 12]} />
      </mesh>
      <sprite ref={glow} material={glowMat} renderOrder={5} />
      {trailMats.map((m, k) => (
        <sprite key={k} ref={(sp) => { trail.current[k] = sp; }} material={m} renderOrder={5} />
      ))}
      <points ref={dust} geometry={dustGeo} material={dustMat} frustumCulled={false} />
      <mesh ref={mound} geometry={moundGeo} material={moundMat} position={[0, SEED_REST.y - 0.06, 0]} receiveShadow />
      <mesh ref={stem} material={stemMat} position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.012, 0.018, 1, 8]} />
      </mesh>
      {[0, 1].map((k) => (
        <mesh key={k} ref={(m) => { leaves.current[k] = m; }} geometry={leafGeo} material={leafMat} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- lights and camera

const LIGHT_AT = [-0.5, 1.0, 1.6, 2.4, 4.5];
const SUN_POS = SUN_DIR.clone().multiplyScalar(14);
const KEY_POS = [...vectors([[-4, 7, 9], [-3, 9, 6], [-3, 9, 6]]), SUN_POS, SUN_POS];
const KEY_COLOR = colors(["#b9c2ff", "#a6aed0", "#8d95b8", "#ffd9a0", "#ffcf8a"]);
const KEY_INTENSITY = [1.7, 0.9, 0.5, 3.1, 2.6];
const AMBIENT = [0.6, 0.5, 0.35, 0.55, 0.6];
const HEMI = [0.85, 0.7, 0.5, 0.85, 0.9];
const RIM = [0.9, 0.6, 0.3, 0.4, 0.35];

function Lights({ story }: { story: Story }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const spot = useRef<THREE.SpotLight>(null);

  useFrame(() => {
    const { u, time } = story.current;
    if (key.current) {
      vectorAt(u, LIGHT_AT, KEY_POS, key.current.position);
      colorAt(u, LIGHT_AT, KEY_COLOR, key.current.color);
      key.current.intensity = numberAt(u, LIGHT_AT, KEY_INTENSITY);
    }
    if (ambient.current) ambient.current.intensity = numberAt(u, LIGHT_AT, AMBIENT);
    if (hemi.current) hemi.current.intensity = numberAt(u, LIGHT_AT, HEMI);
    if (rim.current) rim.current.intensity = numberAt(u, LIGHT_AT, RIM);
    // the pool of sunlight on the soil
    if (spot.current) spot.current.intensity = sunAmount(u) * (3.6 + Math.sin(time * 0.5) * 0.6);
  });

  return (
    <>
      <ambientLight ref={ambient} color="#8d96d8" />
      <hemisphereLight ref={hemi} args={["#9aa4e0", "#5a3a22", 0.85]} />
      <directionalLight
        ref={key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={7}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight ref={rim} position={[7, 2, -7]} color={SKY_FILL} />
      <spotLight ref={spot} position={SUN_POS} angle={0.3} penumbra={0.9} decay={0} color="#ffd38a" intensity={0} />
    </>
  );
}

// Camera keyframes: one per beat of the story (u). The camera eases in and out of each, so it
// holds still while a chapter's caption is mid-screen.
const CAM_AT = [-0.45, 0.15, 0.7, 1.5, 2.5, 3.5, 4.5];
const CAM_POS = vectors([[0, 3.7, 16.5], [0.5, 3.0, 12.5], [1.0, 1.3, 6.6], [-0.6, 3.2, 17], [-2.4, 2.4, 12.5], [1.6, 3.2, 13], [3.4, 4.0, 14.5]]);
const CAM_LOOK = vectors([[0, 3.9, 0], [0, 2.6, 0], [0, 0.4, 0], [0, 3.4, 0], [0, 2.5, 0], [0, 2.7, 0], [0, 3.3, 0]]);
const STILL_POS = new THREE.Vector3(1.5, 3.4, 16);
const STILL_LOOK = new THREE.Vector3(0, 3.0, 0);

function CameraRig({ story, playIntro, animate }: { story: Story; playIntro: boolean; animate: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const intro = useRef(playIntro ? 0 : 10);
  const v = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), parallax: new THREE.Vector2() }), []);

  useFrame((_, dt) => {
    const s = story.current;
    if (animate) {
      vectorAt(s.u, CAM_AT, CAM_POS, v.pos);
      vectorAt(s.u, CAM_AT, CAM_LOOK, v.look);
    } else {
      v.pos.copy(STILL_POS);
      v.look.copy(STILL_LOOK);
    }
    // narrow screens: step back so the island and tree fit
    const aspect = size.width / Math.max(1, size.height);
    const wide = aspect > 1.2;
    const pull = wide ? 1 : aspect < 0.8 ? 1.8 : 1.35;
    v.pos.sub(v.look).multiplyScalar(pull).add(v.look);

    if (animate) {
      intro.current += Math.min(dt, 0.1);
      const k = 1 - easeOutCubic(Math.min(1, intro.current / 3.4)); // first visit: one slow push-in
      v.pos.y += k * 4;
      v.pos.z += k * 9;
      v.parallax.lerp(s.pointer, Math.min(1, dt * 2));
      v.pos.x += v.parallax.x * 0.5;
      v.pos.y += v.parallax.y * 0.25;
    }
    camera.position.copy(v.pos);
    camera.lookAt(v.look);
    // wide screens: the scene sits right of the text; phones: above it
    const w = size.width;
    const h = size.height;
    if (wide) camera.setViewOffset(w, h, -0.2 * w, 0, w, h);
    else camera.setViewOffset(w, h, 0, 0.1 * h, w, h);
  });
  return null;
}

// ---------------------------------------------------------------- scene

function Scene({ playIntro, animate }: { playIntro: boolean; animate: boolean }) {
  const story = useRef<StoryState>({ u: -0.45, target: -0.45, time: 2, pointer: new THREE.Vector2() });
  return (
    <>
      <Director story={story} animate={animate} />
      <color attach="background" args={[INK]} />
      <Atmosphere story={story} animate={animate} />
      <Lights story={story} />
      <Island story={story} animate={animate} />
      <Seed story={story} />
      <MangoTree story={story} />
      <Beanstalks story={story} />
      <Weather story={story} animate={animate} />
      <Parakeets story={story} />
      <CameraRig story={story} playIntro={playIntro} animate={animate} />
    </>
  );
}

export default function GrowthScene({ playIntro, reducedMotion }: { playIntro: boolean; reducedMotion: boolean }) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={{ fov: 38, near: 0.1, far: 220, position: CAM_POS[0].toArray() }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      frameloop={reducedMotion ? "demand" : "always"}
    >
      <Scene playIntro={playIntro && !reducedMotion} animate={!reducedMotion} />
    </Canvas>
  );
}
