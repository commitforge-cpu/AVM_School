/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "Media" };

type Item = { title: string; imageUrl: string; date?: string; summary?: string };

function Cards({ items }: { items: Item[] }) {
  return (
    <div className="image-pair">
      {items.map((i) => (
        <figure key={i.title} className="photo-card" style={{ margin: 0 }}>
          <img src={i.imageUrl} alt="" loading="lazy" />
          <figcaption>
            {i.title}
            {(i.date || i.summary) && <small>{[i.date, i.summary].filter(Boolean).join(". ")}</small>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default async function MediaPage() {
  const c = await getContent("media");
  return (
    <>
      <PageHead title={c.title} intro={c.intro} />
      <div className="panel">
        <section className="section" id="events" aria-labelledby="events-h">
          <div className="wrap">
            <div className="cta-band" style={{ marginBottom: "1.5rem" }}>
              <h2 id="events-h" style={{ marginBottom: 0 }}>Events</h2>
              <Link className="text-link" href="/gallery">More photos in the gallery</Link>
            </div>
            <Cards items={c.events} />
          </div>
        </section>
        <section className="section" id="read" aria-labelledby="read-h">
          <div className="wrap">
            <h2 id="read-h">Read & reflect</h2>
            <Cards items={c.readReflect} />
          </div>
        </section>
        <section className="section" id="press" aria-labelledby="press-h">
          <div className="wrap">
            <h2 id="press-h">Press</h2>
            <Cards items={c.press} />
          </div>
        </section>
      </div>
    </>
  );
}
