"use client";

/**
 * Beanstalk plants (Castanospermum australe) at the foot of the mango tree, a nod to AVM's
 * Beanstalk pre-school. Grown from a seed, the plant is unmistakable: the big seed splits into
 * two glossy, chestnut-like halves that stay on the soil, and an upright stem rises between them
 * carrying arching compound leaves of glossy, oblong leaflets.
 *
 * They grow while the mango tree grows: the seed halves appear as the mango sprouts, then the
 * stems rise and the leaves unfold from the bottom up, timed with the tree.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { surfaceY } from "./Island";
import { SUN_DIR, easeOutBack, paintBy, rng, smooth, sunAmount, useOwned, type Story } from "./sceneKit";
import {
  UP, branchGeometry, fillLeaves, growUniforms, growingBark, leafFrame, leafMaterials, leafSetGeometry,
  rampColor, updateLeafLight, type Branch, type LeafSpec,
} from "./treeKit";

/** Where they stand: beside and in front of the trunk, under the edge of the crown. */
const PLANTS = [
  { x: -1.75, z: 0.55, height: 1.02, turn: 0.3, delay: 0.0 },
  { x: 1.62, z: 0.92, height: 0.9, turn: 2.1, delay: 0.08 },
  { x: -0.72, z: 1.85, height: 0.74, turn: 4.0, delay: 0.15 },
];
const GROW_FROM = 2.8; // with the mango tree (it starts at 2.75 and is grown by 3.9)
const GROW_TO = 3.85;

const GLOSSY: [number, [number, number, number]][] = [[0, [0.02, 0.07, 0.015]], [0.6, [0.035, 0.1, 0.022]], [1, [0.06, 0.13, 0.03]]];
const NEW_GROWTH: [number, [number, number, number]][] = [[0, [0.07, 0.16, 0.035]], [1, [0.11, 0.2, 0.04]]];

type Seed = { pos: THREE.Vector3; quat: THREE.Quaternion; birth: number };

const BEANSTALKS = (() => {
  const rand = rng(41);
  const U = (a: number, b: number) => a + (b - a) * rand();
  const branches: Branch[] = [];
  const leaves: LeafSpec[] = [];
  const seeds: Seed[] = [];
  const stemTint = new THREE.Color(0.2, 0.28, 0.09); // smooth green stems
  const rachisTint = new THREE.Color(0.16, 0.3, 0.07);
  const col = new THREE.Color();

  for (const pl of PLANTS) {
    const t0 = GROW_FROM + pl.delay;
    const t1 = GROW_TO + pl.delay * 0.3;
    const base = new THREE.Vector3(pl.x, surfaceY(pl.x, pl.z) - 0.015, pl.z);

    // the two seed halves, parted, with the stem coming up between them
    for (const s of [1, -1]) {
      // each half's rounded back faces outwards and leans out a little: the seed split open
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, pl.turn + (s > 0 ? 0 : Math.PI), 0, "YXZ"));
      const pos = base.clone().add(new THREE.Vector3(Math.sin(pl.turn) * 0.024 * s, 0.035, Math.cos(pl.turn) * 0.024 * s));
      seeds.push({ pos, quat: q, birth: t0 - 0.25 });
    }

    // the stem: upright, leaning and curving a little, woody at the foot
    const n = 12;
    const stem: THREE.Vector3[] = [];
    const radii: number[] = [];
    const births: number[] = [];
    const lean = new THREE.Vector3(U(-0.12, 0.12), 1, U(-0.12, 0.12)).normalize();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      stem.push(base.clone().addScaledVector(lean, t * pl.height).add(new THREE.Vector3(Math.sin(t * 3 + pl.turn) * 0.025, 0, Math.cos(t * 2.5 + pl.turn) * 0.02)));
      radii.push(0.022 * (1 - 0.6 * t) + 0.005);
      births.push(t0 + t * (t1 - t0) * 0.7);
    }
    branches.push({ pts: stem, radii, births, tint: stemTint });

    // compound leaves, spiralling up the stem; each an arching stalk with oblong leaflets
    const count = 10;
    for (let j = 0; j < count; j++) {
      const t = 0.25 + (0.75 * j) / (count - 1);
      const at = stem[Math.round(t * n)];
      const born = t0 + t * (t1 - t0) * 0.7 + 0.04;
      const az = pl.turn + j * 2.39996;
      const up = THREE.MathUtils.degToRad(U(30, 50) + t * 18); // upper leaves stand more upright
      const len = pl.height * U(0.5, 0.6) * (1 - 0.3 * Math.abs(t - 0.6));
      const d = new THREE.Vector3(Math.cos(az) * Math.cos(up), Math.sin(up), Math.sin(az) * Math.cos(up));
      const rachis: THREE.Vector3[] = [at.clone()];
      const rr: number[] = [];
      const rb: number[] = [];
      const steps = 7;
      const p = at.clone();
      for (let k = 1; k <= steps; k++) {
        d.add(new THREE.Vector3(0, -0.16, 0)).normalize(); // arching over
        p.addScaledVector(d, len / steps);
        rachis.push(p.clone());
      }
      rachis.forEach((_, k) => {
        rr.push(0.008 * (1 - (0.65 * k) / steps));
        rb.push(born + (k / steps) * 0.18);
      });
      branches.push({ pts: rachis, radii: rr, births: rb, tint: rachisTint });

      // leaflets: alternate pairs along the stalk, and one at the tip
      const young = j >= count - 2;
      const pairs = 6;
      for (let k = 0; k <= pairs * 2; k++) {
        const terminal = k === pairs * 2;
        const s = terminal ? 1 : 0.22 + 0.74 * (Math.floor(k / 2) / (pairs - 1)) + (k % 2 ? 0.04 : -0.02);
        const fi = Math.min(steps - 1, Math.floor(s * steps));
        const pos = rachis[fi].clone().lerp(rachis[fi + 1], s * steps - fi);
        const along = rachis[fi + 1].clone().sub(rachis[fi]).normalize();
        const out = along.clone().cross(UP).normalize().multiplyScalar(k % 2 ? 1 : -1);
        const dir = terminal
          ? along.clone()
          : along.clone().multiplyScalar(Math.cos(1.0)).addScaledVector(out, Math.sin(1.0)).add(new THREE.Vector3(0, -0.15, 0)).normalize();
        const { side, nrm } = leafFrame(dir, rand);
        const L = pl.height * U(0.17, 0.21) * (1 - 0.3 * Math.abs(s - 0.6)) * (young ? 0.85 : 1);
        rampColor(rand(), young ? NEW_GROWTH : GLOSSY, col).multiplyScalar(1.6);
        leaves.push({ pos, dir, side, nrm, length: L, width: L * U(0.3, 0.36), depth: L * U(0.25, 0.6), color: col.clone(), birth: born + 0.05 + s * 0.15 });
      }
    }
  }
  return { branches, leaves, seeds };
})();

/** One half of the split seed: a thick, rounded half-ellipsoid with a paler cut face. */
function seedHalfGeometry() {
  const dome = new THREE.SphereGeometry(1, 22, 14, 0, Math.PI); // half a sphere, open on z = 0
  const cut = new THREE.CircleGeometry(1, 22).rotateY(Math.PI); // closes it, facing -z
  const g = mergeGeometries([dome, cut])!;
  dome.dispose();
  cut.dispose();
  g.scale(0.075, 0.08, 0.052);
  g.computeVertexNormals();
  const skin = new THREE.Color(0.28, 0.32, 0.08);
  const brown = new THREE.Color(0.22, 0.12, 0.05);
  const face = new THREE.Color(0.62, 0.62, 0.3);
  return paintBy(g, (p, c) => {
    if (p.z < 0.004) c.copy(face); // the cut face of the seed
    else c.copy(skin).lerp(brown, smooth(0.0, -0.05, p.y) * 0.6); // a little of the brown seed coat near the soil
  });
}

export default function Beanstalks({ story }: { story: Story }) {
  const camera = useThree((s) => s.camera);
  const uniforms = useMemo(() => growUniforms(new THREE.Vector3(0, -50, 0), new THREE.Vector3(1, 1, 1)), []);
  const stems = useOwned(() => branchGeometry(BEANSTALKS.branches));
  // smooth green stems, without the bark texture
  const stemMat = useOwned(() =>
    growingBark(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), uniforms, "beanstalk-stem"),
  );
  const stemDepth = useOwned(() => growingBark(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uniforms, "beanstalk-stem-depth"));
  const leafGeo = useOwned(() => leafSetGeometry(BEANSTALKS.leaves));
  const leafMats = useMemo(() => leafMaterials(uniforms, "beanstalk-leaves", 0.3), [uniforms]);
  useEffect(() => () => { leafMats.color.dispose(); leafMats.depth.dispose(); }, [leafMats]);
  const seedGeo = useOwned(seedHalfGeometry);
  const seedMat = useOwned(() => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.3 }));
  const leaves = useRef<THREE.InstancedMesh>(null);
  const seeds = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), s: new THREE.Vector3() }), []);

  useEffect(() => {
    if (leaves.current) fillLeaves(leaves.current, BEANSTALKS.leaves);
  }, []);

  useFrame(() => {
    const { u, time } = story.current;
    uniforms.uGrow.value = u;
    uniforms.uTime.value = time;
    updateLeafLight(uniforms, SUN_DIR, camera, 0.12 + 0.3 * sunAmount(u));
    const sd = seeds.current;
    if (sd) {
      BEANSTALKS.seeds.forEach((s, i) => {
        const g = Math.max(0.001, easeOutBack(smooth(s.birth, s.birth + 0.2, u)));
        sd.setMatrixAt(i, tmp.m.compose(s.pos, s.quat, tmp.s.setScalar(g)));
      });
      sd.instanceMatrix.needsUpdate = true;
      sd.visible = u > BEANSTALKS.seeds[0].birth - 0.05;
    }
  });

  return (
    <>
      <mesh geometry={stems} material={stemMat} customDepthMaterial={stemDepth} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={leaves} args={[leafGeo, leafMats.color, BEANSTALKS.leaves.length]} customDepthMaterial={leafMats.depth} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={seeds} args={[seedGeo, seedMat, BEANSTALKS.seeds.length]} castShadow receiveShadow frustumCulled={false} />
    </>
  );
}
