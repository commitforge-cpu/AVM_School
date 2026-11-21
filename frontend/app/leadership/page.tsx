/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "Leadership" };

export default async function LeadershipPage() {
  const c = await getContent("leadership");
  const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2);

  return (
    <>
      <PageHead title={c.title} intro={c.intro} />
      <div className="panel">
        <section className="section" aria-labelledby="principal-h">
          <div className="wrap split">
            <div>
              <h2 id="principal-h">{c.principal.heading}</h2>
              {c.principal.photoUrl && (
                <img src={c.principal.photoUrl} alt={c.principal.name || "Principal"} style={{ borderRadius: 14, marginTop: "1rem", maxWidth: 320 }} />
              )}
              {c.principal.name && <p className="muted" style={{ marginTop: ".8rem" }}>{c.principal.name}, Principal</p>}
            </div>
            <div>
              <p className="quote"><small>Vision</small>{c.principal.vision}</p>
              <p className="quote"><small>Mission</small>{c.principal.mission}</p>
            </div>
          </div>
        </section>

        <section className="section" id="faculty" aria-labelledby="faculty-h">
          <div className="wrap split">
            <div>
              <h2 id="faculty-h">{c.faculty.heading}</h2>
              <p className="section-lede">{c.faculty.body}</p>
            </div>
            <div className="people">
              {c.faculty.members.map((m) => (
                <div className="person" key={m.name}>
                  {m.photoUrl ? <img src={m.photoUrl} alt="" /> : <div className="avatar" aria-hidden="true">{initials(m.name)}</div>}
                  <h3>{m.name}</h3>
                  <p>{m.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="practices-h">
          <div className="wrap split">
            <h2 id="practices-h">{c.practicesHeading}</h2>
            <ul className="plain-list">
              {c.practices.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
