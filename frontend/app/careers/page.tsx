import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import SimpleForm from "@/components/SimpleForm";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "Career" };

export default async function CareersPage() {
  const [c, site] = await Promise.all([getContent("careers"), getContent("site")]);
  return (
    <>
      <PageHead title={c.title} intro={c.intro} />
      <div className="panel">
        <section className="section">
          <div className="wrap split">
            <div>
              <h2 style={{ fontSize: "var(--t-xl)" }}>{c.qualitiesHeading}</h2>
              <ul className="plain-list">{c.qualities.map((q) => <li key={q}>{q}</li>)}</ul>
              <p className="muted" style={{ marginTop: "1.2rem" }}>
                You can also email your CV to <a className="text-link" href={`mailto:${site.email}`}>{site.email}</a>.
              </p>
            </div>
            <div className="form-card">
              <h2 style={{ fontSize: "var(--t-xl)", marginBottom: "1.2rem" }}>Apply</h2>
              <SimpleForm kind="career" positions={c.positions} endpoint="/api/careers" submitLabel="Send application" idPrefix="career" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
