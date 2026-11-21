import type { Metadata } from "next";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "Admission" };

export default async function AdmissionPage() {
  const c = await getContent("admission");
  return (
    <>
      <PageHead title={c.title} intro={c.intro} />
      <div className="panel">
        <section className="section" id="process" aria-labelledby="process-h">
          <div className="wrap split">
            <div>
              <h2 id="process-h">{c.stepsHeading}</h2>
              <ul className="plain-list">{c.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              <p style={{ marginTop: "1.6rem" }}><Link className="btn btn-primary" href="/register">Register for admission</Link></p>
            </div>
            <ol className="steps">
              {c.steps.map((s) => (
                <li key={s.title}>
                  <div>
                    <h3>{s.title}</h3>
                    <p className="muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section" id="uniform" aria-labelledby="uniform-h">
          <div className="wrap split">
            <div>
              <h2 id="uniform-h">{c.uniform.heading}</h2>
              <p className="section-lede">{c.uniform.body}</p>
            </div>
            <ul className="plain-list">{c.uniform.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        </section>

        <section className="section" id="attendance" aria-labelledby="attendance-h">
          <div className="wrap split">
            <h2 id="attendance-h">{c.attendance.heading}</h2>
            <p className="section-lede prose">{c.attendance.body}</p>
          </div>
        </section>
      </div>
    </>
  );
}
