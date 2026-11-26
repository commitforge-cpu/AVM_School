"use client";

import Link from "next/link";
import { useEffect } from "react";
import { INTRO_KEY } from "./three/Backdrop";
import type { ContentMap } from "@/lib/defaultContent";

/** Home page headline over the 3D story (birds and a falling seed). Plays the letterbox intro once per visit. */
export default function Hero({ hero }: { hero: ContentMap["home"]["hero"] }) {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("intro-play")) return;
    const done = window.setTimeout(() => {
      try { sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* ignore */ }
      root.classList.remove("intro-play");
    }, 3700);
    return () => window.clearTimeout(done);
  }, []);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="letterbox top" aria-hidden="true" />
      <div className="letterbox bottom" aria-hidden="true" />
      <div className="wrap">
        <div className="hero-copy">
          <h1 id="hero-title">{hero.title}</h1>
          {hero.kannada && <p className="hero-kannada" lang="kn">{hero.kannada}</p>}
          <p className="hero-intro">{hero.intro}</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href={hero.primaryCtaHref}>{hero.primaryCtaLabel}</Link>
            <Link className="btn btn-ghost" href={hero.secondaryCtaHref}>{hero.secondaryCtaLabel}</Link>
          </div>
        </div>
      </div>
      <a className="scroll-cue" href="#story">Scroll to explore</a>
    </section>
  );
}
