"use client";

/**
 * Home page scene. "Achala" means mountain and "Vidya Mandira" a temple of learning, so the
 * hero is a floating low-poly mountain with a lamp of learning glowing on its summit,
 * circled by rings of light. The camera makes one slow cinematic push-in on first visit.
 */

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";

const INK = "#0d1230";
const MARIGOLD = "#f4a81d";
const CRIMSON = "#c8102e";

// Deterministic noise from a position: duplicate vertices on the cone seam move together.
function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

function shapeCone(geo: THREE.BufferGeometry, height: number, strength: number, keepRing: "bottom" | "top") {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const h = (v.y + height / 2) / height; // 0 at base, 1 at apex
    const edge = keepRing === "bottom" ? h < 0.01 : h > 0.99;
    if (!edge) {
      const k = strength * (1 - h * 0.55);
      v.x += (hash(v.x, v.y, v.z) - 0.5) * k;
      v.z += (hash(v.z, v.x, v.y) - 0.5) * k;
      v.y += (hash(v.y, v.z, v.x) - 0.5) * k * 0.5;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function Mountain() {
  const peak = useMemo(() => {
    const height = 3.4;
    const geo = shapeCone(new THREE.ConeGeometry(3.2, height, 11, 7), height, 0.55, "bottom");
    // colour by height: indigo rock → violet → snow
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const low = new THREE.Color("#1c2350");
    const mid = new THREE.Color("#3d4787");
    const snow = new THREE.Color("#ece9f4");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = (pos.getY(i) + height / 2) / height;
      const n = hash(pos.getX(i), pos.getY(i), pos.getZ(i)) * 0.12;
      if (h + n > 0.74) c.copy(snow);
      else c.copy(low).lerp(mid, Math.min(1, h * 1.35));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  const rock = useMemo(() => {
    const geo = shapeCone(new THREE.ConeGeometry(3.2, 2.4, 11, 4), 2.4, 0.7, "bottom");
    geo.rotateX(Math.PI); // apex points down: the underside of a floating island
    return geo;
  }, []);

  return (
    <group>
      <mesh geometry={peak} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh geometry={rock} position={[0, -2.9, 0]}>
        <meshStandardMaterial color="#121736" emissive={CRIMSON} emissiveIntensity={0.08} flatShading roughness={1} />
      </mesh>
    </group>
  );
}

function useGlowTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,226,150,1)");
    g.addColorStop(0.25, "rgba(244,168,29,.55)");
    g.addColorStop(1, "rgba(244,168,29,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** The lamp of learning on the summit. */
function Lamp({ animate }: { animate: boolean }) {
  const glow = useGlowTexture();
  const flame = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime;
    const flicker = 1 + Math.sin(t * 7.3) * 0.04 + Math.sin(t * 13.1) * 0.03;
    flame.current?.scale.setScalar(flicker);
    halo.current?.scale.setScalar(2.6 * flicker);
    if (flame.current) flame.current.rotation.y = t * 0.8;
  });
  return (
    <group position={[0, 1.95, 0]}>
      <mesh ref={flame}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color="#ffd27a" toneMapped={false} />
      </mesh>
      <sprite ref={halo} scale={2.6}>
        <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
      </sprite>
      <pointLight color={MARIGOLD} intensity={14} distance={9} decay={2} />
    </group>
  );
}

/** Rings of light orbiting the mountain. */
function OrbitRing({ radius, count, color, tilt, speed, size, animate }: {
  radius: number; count: number; color: string; tilt: [number, number, number]; speed: number; size: number; animate: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = radius + (hash(i, radius, 1) - 0.5) * 0.35;
      p.set([Math.cos(a) * r, (hash(radius, i, 2) - 0.5) * 0.18, Math.sin(a) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [radius, count]);

  useFrame((_, dt) => {
    if (animate && ref.current) ref.current.rotation.y += dt * speed;
  });

  return (
    <group rotation={tilt}>
      <points ref={ref} geometry={geometry}>
        <pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

const START = new THREE.Vector3(0, 7.5, 24);
const END = new THREE.Vector3(0, 1.4, 15);
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/** One slow push-in, then gentle parallax that follows the pointer and the page scroll. */
function CameraRig({ playIntro, animate }: { playIntro: boolean; animate: boolean }) {
  const { camera, pointer } = useThree();
  const t = useRef(playIntro ? 0 : 10);
  const scroll = useRef(0);
  const target = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const onScroll = () => { scroll.current = Math.min(1.5, window.scrollY / window.innerHeight); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((_, dt) => {
    t.current += dt;
    const k = easeOutCubic(Math.min(1, t.current / 3.4));
    target.lerpVectors(START, END, k);
    if (animate) {
      target.x += pointer.x * 0.9;
      target.y += pointer.y * 0.45;
    }
    // wide screens: mountain sits right of the headline; phones: smaller and above it
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const wide = aspect > 1.2;
    if (!wide) target.z += aspect < 0.8 ? 12 : 6;
    target.y += scroll.current * 2.2;
    target.z += scroll.current * 3;
    camera.position.lerp(target, animate ? Math.min(1, dt * 3) : 1);
    camera.lookAt(wide ? -4.2 : 0, (wide ? 0.3 : -3.4) - scroll.current * 1.2, 0);
  });
  return null;
}

function Scene({ playIntro, animate }: { playIntro: boolean; animate: boolean }) {
  const island = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (!animate || !island.current) return;
    island.current.rotation.y += dt * 0.06;
    island.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.12;
  });

  return (
    <>
      <color attach="background" args={[INK]} />
      <fog attach="fog" args={[INK, 16, 44]} />
      <ambientLight intensity={0.45} color="#8d96d8" />
      <directionalLight position={[-6, 9, 6]} intensity={1.6} color="#ffe6bd" />
      <directionalLight position={[7, 2, -7]} intensity={2.2} color={CRIMSON} />
      <Stars radius={90} depth={50} count={3000} factor={3.2} saturation={0} fade speed={animate ? 0.6 : 0} />
      <group ref={island}>
        <Mountain />
        <Lamp animate={animate} />
        <OrbitRing radius={4.4} count={220} color={MARIGOLD} tilt={[0.32, 0, 0.12]} speed={0.12} size={0.06} animate={animate} />
        <OrbitRing radius={5.3} count={260} color="#f2efe8" tilt={[-0.2, 0, -0.28]} speed={-0.07} size={0.035} animate={animate} />
        <OrbitRing radius={6.4} count={180} color={CRIMSON} tilt={[0.1, 0, 0.45]} speed={0.05} size={0.05} animate={animate} />
      </group>
      <Sparkles count={70} scale={[12, 7, 12]} size={2.2} speed={animate ? 0.35 : 0} color={MARIGOLD} opacity={0.7} />
      <CameraRig playIntro={playIntro} animate={animate} />
    </>
  );
}

export default function MountainScene({ playIntro, reducedMotion }: { playIntro: boolean; reducedMotion: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 38, near: 0.1, far: 200, position: playIntro ? START.toArray() : END.toArray() }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      frameloop={reducedMotion ? "demand" : "always"}
    >
      <Scene playIntro={playIntro && !reducedMotion} animate={!reducedMotion} />
    </Canvas>
  );
}
