/** Small helpers shared by the home page's 3D story (GrowthScene, MangoTree, Parakeets). */

import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";

/**
 * The story clock. `u` is how far the page has scrolled through the #story section, in screen
 * heights (story chapter i is mid-screen at u = i + 0.5); `time` is seconds of animation.
 */
export type StoryState = { u: number; target: number; time: number; pointer: THREE.Vector2 };
export type Story = RefObject<StoryState>;

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const ramp = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const smooth = (a: number, b: number, x: number) => {
  const t = ramp(a, b, x);
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeOutBack = (x: number) =>
  x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
export const wrap = (x: number, half: number) => ((((x + half) % (2 * half)) + 2 * half) % (2 * half)) - half;

/** Deterministic noise, so the scene looks the same on every visit. */
export function hash(a: number, b = 0, c = 0) {
  const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

/** Seeded random numbers (mulberry32), for things generated once such as the tree. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise and fractal noise; `period` makes it tile (for textures that repeat). */
export function makeNoise(seed: number) {
  const r = rng(seed);
  const vals = Float32Array.from({ length: 256 }, () => r());
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const at = (ix: number, iy: number) => vals[perm[(ix & 255) + perm[iy & 255]]];
  const mod = (a: number, m: number) => ((a % m) + m) % m;

  function noise(x: number, y: number, period = 0) {
    let x0 = Math.floor(x);
    let y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    let x1 = x0 + 1;
    let y1 = y0 + 1;
    if (period) {
      x0 = mod(x0, period); x1 = mod(x1, period); y0 = mod(y0, period); y1 = mod(y1, period);
    }
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(x0, y0), b = at(x1, y0), c = at(x0, y1), d = at(x1, y1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(x: number, y: number, octaves = 4, period = 0) {
    let sum = 0, amp = 0.5, f = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * f, y * f, period ? period * f : 0);
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  }
  return { noise, fbm };
}

/** A texture painted pixel by pixel: `paint(u, v, rgba)` with u, v in 0..1 and rgba in 0..255. */
export function pixelTexture(width: number, height: number, paint: (u: number, v: number, rgba: number[]) => void, repeat = false, extra?: (ctx: CanvasRenderingContext2D) => void) {
  return canvasTexture(width, height, (ctx) => {
    const img = ctx.createImageData(width, height);
    const px = [0, 0, 0, 255];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        px[3] = 255;
        paint(x / width, y / height, px);
        img.data.set(px, (y * width + x) * 4);
      }
    }
    ctx.putImageData(img, 0, 0);
    extra?.(ctx);
  }, repeat);
}

// ---------------------------------------------------------------- the story's weather and light, by story time u

export const rainAmount = (u: number) => smooth(1.0, 1.35, u) * (1 - smooth(1.85, 2.2, u));
export const storminess = (u: number) => smooth(0.95, 1.4, u) * (1 - smooth(1.9, 2.35, u));
export const sunAmount = (u: number) => smooth(1.95, 2.5, u);
export const wetness = (u: number) => smooth(1.15, 1.7, u) * (1 - 0.45 * smooth(2.6, 3.6, u));
/** Direction the sunlight comes from (from the left, so the tree is side-lit). */
export const SUN_DIR = new THREE.Vector3(-0.78, 0.6, 0.12).normalize();

/** Index of the keyframe segment `u` is in, and the eased position within it. */
function segment(u: number, at: number[]): [number, number] {
  const n = at.length - 1;
  if (u <= at[0]) return [0, 0];
  if (u >= at[n]) return [n - 1, 1];
  let i = 0;
  while (u > at[i + 1]) i++;
  return [i, smooth(at[i], at[i + 1], u)];
}
export function numberAt(u: number, at: number[], v: number[]) {
  const [i, t] = segment(u, at);
  return v[i] + (v[i + 1] - v[i]) * t;
}
export function colorAt(u: number, at: number[], v: THREE.Color[], out: THREE.Color) {
  const [i, t] = segment(u, at);
  return out.copy(v[i]).lerp(v[i + 1], t);
}
export function vectorAt(u: number, at: number[], v: THREE.Vector3[], out: THREE.Vector3) {
  const [i, t] = segment(u, at);
  return out.lerpVectors(v[i], v[i + 1], t);
}
export const colors = (hex: string[]) => hex.map((h) => new THREE.Color(h));
export const vectors = (p: [number, number, number][]) => p.map(([x, y, z]) => new THREE.Vector3(x, y, z));

/** Lets a double-sided card be lit by the normals we give it on both faces (leaves, grass). */
export const NO_FACE_FLIP = THREE.ShaderChunk.normal_fragment_begin.replace("normal *= faceDirection;", "");

/** Creates a three.js object once and frees its GPU memory when the scene unmounts. */
export function useOwned<T extends { dispose: () => void }>(make: () => T): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(make, []);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

/** A texture drawn on a canvas. */
export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function glowTexture(inner: string, mid: string) {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(0.3, mid);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

/** Gives a geometry vertex colours from a function of each vertex position. */
export function paintBy(geo: THREE.BufferGeometry, color: (p: THREE.Vector3, out: THREE.Color) => void) {
  const pos = geo.attributes.position;
  const a = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    color(p, c);
    a.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return geo;
}

/** Gives a geometry one flat vertex colour (for materials that use vertex colours). */
export function paint(geo: THREE.BufferGeometry, hex: string) {
  const c = new THREE.Color(hex);
  return paintBy(geo, (_, out) => out.copy(c));
}
