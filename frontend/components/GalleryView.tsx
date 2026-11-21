"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import type { GalleryPhoto } from "@/lib/types";

/** Public gallery: a 3D carousel of the latest photos, then every photo by category. */
export default function GalleryView() {
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const [turn, setTurn] = useState(0);
  const [itemW, setItemW] = useState(320);

  useEffect(() => {
    const size = () => setItemW(Math.round(Math.min(440, Math.max(200, window.innerWidth * 0.32))));
    size();
    window.addEventListener("resize", size);
    return () => window.removeEventListener("resize", size);
  }, []);

  useEffect(() => {
    api<GalleryPhoto[]>("/api/gallery").then(setPhotos).catch((e: ApiError) => { setError(e.message); setPhotos([]); });
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set((photos ?? []).map((p) => p.category)))], [photos]);
  const shown = useMemo(() => (photos ?? []).filter((p) => category === "All" || p.category === category), [photos, category]);
  const ring = shown.slice(0, 12);
  const step = ring.length ? 360 / ring.length : 0;
  // distance from the centre so neighbouring photos just touch
  const radius = ring.length ? Math.round(itemW / (2 * Math.tan(Math.PI / ring.length)) + 24) : 0;

  const close = useCallback(() => setOpen(null), []);
  const move = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + shown.length) % shown.length)), [shown.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, move]);

  useEffect(() => setTurn(0), [category]);

  if (photos === null) return <p className="muted">Loading photos…</p>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!photos.length)
    return (
      <div className="empty">
        <p>No photos yet. Admins can add photos from <Link className="text-link" href="/admin/gallery">Admin → Gallery</Link>.</p>
      </div>
    );

  const current = open !== null ? shown[open] : null;

  return (
    <>
      {ring.length >= 3 && (
        <div aria-label="Featured photos">
          <div className="ring-stage">
            <div className="ring" style={{ width: itemW, transform: `translateZ(-${radius}px) rotateY(${-turn * step}deg)` }}>
              {ring.map((p, i) => (
                <button
                  key={p.id}
                  className="ring-item"
                  style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}
                  onClick={() => setOpen(shown.indexOf(p))}
                  tabIndex={((turn % ring.length) + ring.length) % ring.length === i ? 0 : -1}
                  aria-label={`Open ${p.title}`}
                >
                  <img src={assetUrl(p.url)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
          <div className="ring-controls">
            <button className="btn btn-quiet btn-sm" onClick={() => setTurn((t) => t - 1)}>Previous</button>
            <button className="btn btn-quiet btn-sm" onClick={() => setTurn((t) => t + 1)}>Next</button>
          </div>
        </div>
      )}

      <div className="filter-bar" role="group" aria-label="Filter by category">
        {categories.map((c) => (
          <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      <div className="masonry">
        {shown.map((p, i) => (
          <button key={p.id} onClick={() => setOpen(i)} aria-label={`Open ${p.title}`}>
            <img src={assetUrl(p.url)} alt="" loading="lazy" />
            <span>{p.title}</span>
          </button>
        ))}
      </div>

      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={current.title} onClick={(e) => e.target === e.currentTarget && close()}>
          <button className="btn btn-quiet btn-sm lightbox-close" onClick={close} autoFocus>Close</button>
          <img src={assetUrl(current.url)} alt={current.description || current.title} />
          <div className="lightbox-bar">
            <div>
              <strong>{current.title}</strong>
              <div className="muted">{[current.category, current.description].filter(Boolean).join(". ")}</div>
            </div>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <button className="btn btn-quiet btn-sm" onClick={() => move(-1)}>Previous</button>
              <button className="btn btn-quiet btn-sm" onClick={() => move(1)}>Next</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
