/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "School life" };

export default async function SchoolLifePage() {
  const c = await getContent("schoolLife");
  return (
    <>
      <PageHead title={c.title} intro={c.intro} />
      <div className="panel">
        <section className="section" id="approach" aria-labelledby="approach-h">
          <div className="wrap split">
            <div>
              <h2 id="approach-h">{c.approach.heading}</h2>
              <ul className="chips" aria-label="Teaching methods">
                {c.approach.methods.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
            <div className="prose section-lede">
              {c.approach.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </section>

        <section className="section" id="partners" aria-labelledby="partners-h">
          <div className="wrap split">
            <div>
              <h2 id="partners-h">{c.partners.heading}</h2>
              <p className="section-lede">{c.partners.body}</p>
            </div>
            <ul className="index-list" style={{ columns: 1 }}>
              {c.partners.items.map((i) => (
                <li key={i.name}><div><strong>{i.name}</strong><span>{i.description}</span></div></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" id="activities" aria-labelledby="activities-h">
          <div className="wrap split">
            <div>
              <h2 id="activities-h">{c.activities.heading}</h2>
              <ul className="chips">{c.activities.items.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
            <div className="image-pair">
              {c.activities.images.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}
            </div>
          </div>
        </section>

        <section className="section" id="council" aria-labelledby="council-h">
          <div className="wrap split">
            <h2 id="council-h">{c.council.heading}</h2>
            <p className="section-lede prose">{c.council.body}</p>
          </div>
        </section>
      </div>

      <div className="panel-deep">
        <section className="section" id="sports" aria-labelledby="sports-h">
          <div className="wrap">
            <div className="split">
              <h2 id="sports-h">{c.sports.heading}</h2>
              <ul className="plain-list">{c.sports.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
            <div className="image-pair" style={{ marginTop: "2.5rem" }}>
              {c.sports.images.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}
            </div>
          </div>
        </section>

        <section className="section" id="arts" aria-labelledby="arts-h">
          <div className="wrap split">
            <div>
              <h2 id="arts-h">{c.arts.heading}</h2>
              <p className="section-lede">{c.arts.body}</p>
            </div>
            <div className="image-pair">
              {c.arts.images.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
