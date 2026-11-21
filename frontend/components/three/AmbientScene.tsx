"use client";

/** Quiet night-sky backdrop for inner pages: stars, drifting lamp-light motes, a far-off peak. */

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";

function Drift({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ pointer }, dt) => {
    if (!animate || !group.current) return;
    group.current.rotation.y += dt * 0.015;
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * 0.05, 0.03);
  });
  return (
    <group ref={group}>
      <Stars radius={70} depth={40} count={2200} factor={3} saturation={0} fade speed={animate ? 0.4 : 0} />
      <Sparkles count={90} scale={[26, 14, 16]} size={2.4} speed={animate ? 0.25 : 0} color="#f4a81d" opacity={0.55} />
      <Sparkles count={40} scale={[26, 14, 16]} size={1.6} speed={animate ? 0.2 : 0} color="#c8102e" opacity={0.6} />
    </group>
  );
}

function FarPeak() {
  return (
    <mesh position={[9, -6.5, -22]}>
      <coneGeometry args={[9, 9, 7, 1]} />
      <meshBasicMaterial color="#141a40" />
    </mesh>
  );
}

export default function AmbientScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 50, position: [0, 0, 12] }} frameloop={reducedMotion ? "demand" : "always"}>
      <color attach="background" args={["#0d1230"]} />
      <fog attach="fog" args={["#0d1230", 18, 40]} />
      <FarPeak />
      <Drift animate={!reducedMotion} />
    </Canvas>
  );
}
