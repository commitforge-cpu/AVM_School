import type { ContentMap } from "@/lib/defaultContent";

/**
 * Home page captions that scroll over the 3D story (components/three/GrowthScene.tsx).
 * Each chapter is one screen tall; the scene times its animation by this section's position.
 */
export default function Story({ story }: { story: ContentMap["home"]["story"] }) {
  return (
    <section id="story" className="story" aria-label="How a child grows at AVM">
      {story.chapters.map((c, i) => (
        <div key={i} className="story-beat">
          <div className="wrap">
            <div className="story-card">
              <span className="story-step" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <h2>{c.title}</h2>
              <p>{c.text}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
