/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "Alumni" };

export default async function AlumniPage() {
  const c = await getContent("alumni");
  return (
    <>
      <PageHead title={c.title} intro={c.intro} />
      <div className="panel">
        <section className="section" aria-label="Alumni">
          <div className="wrap people">
            {c.people.map((p) => {
              const card = (
                <>
                  <img src={p.imageUrl} alt="" loading="lazy" />
                  <h3>{p.name}</h3>
                  {p.videoUrl && <p>Watch video</p>}
                </>
              );
              return p.videoUrl ? (
                <a key={p.name} className="person" href={p.videoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{card}</a>
              ) : (
                <div key={p.name} className="person">{card}</div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
