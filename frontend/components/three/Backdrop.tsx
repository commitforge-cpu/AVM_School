"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const MountainScene = dynamic(() => import("./MountainScene"), { ssr: false });
const AmbientScene = dynamic(() => import("./AmbientScene"), { ssr: false });

export const INTRO_KEY = "avm_intro_seen";

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Fixed 3D layer behind every public page. Hidden in the admin area. */
export default function Backdrop() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    setWebgl(supportsWebGL());
    setReady(true);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // The camera push-in plays only with the first-visit intro (set up by the script in layout.tsx).
  const playIntro = useMemo(() => {
    if (!ready || pathname !== "/") return false;
    return document.documentElement.classList.contains("intro-play");
  }, [ready, pathname]);

  if (!ready || !webgl || pathname.startsWith("/admin")) return null;

  return (
    <div className="backdrop" aria-hidden="true">
      {pathname === "/" ? (
        <MountainScene playIntro={playIntro} reducedMotion={reduced} />
      ) : (
        <AmbientScene reducedMotion={reduced} />
      )}
    </div>
  );
}
