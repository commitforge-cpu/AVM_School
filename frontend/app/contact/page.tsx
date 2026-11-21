import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import SimpleForm from "@/components/SimpleForm";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "Connect" };

export default async function ContactPage() {
  const [c, site] = await Promise.all([getContent("contact"), getContent("site")]);
  return (
    <>
      <PageHead title={c.title} intro={c.intro} />
      <div className="panel">
        <section className="section">
          <div className="wrap split">
            <div>
              <h2 style={{ fontSize: "var(--t-xl)" }}>{site.schoolName}</h2>
              <address style={{ fontStyle: "normal", marginTop: ".6rem" }} className="section-lede">{site.address}</address>
              <ul className="plain-list" style={{ marginTop: "1.5rem" }}>
                {site.phones.map((p) => <li key={p}><a href={`tel:${p.replace(/\s/g, "")}`}>{p}</a></li>)}
                <li><a href={`mailto:${site.email}`}>{site.email}</a></li>
                {site.whatsappUrl && <li><a href={site.whatsappUrl} target="_blank" rel="noreferrer">Chat on WhatsApp</a></li>}
                {c.hours && <li>{c.hours}</li>}
              </ul>
              <p style={{ marginTop: "1.2rem" }}><a className="text-link" href={site.mapUrl} target="_blank" rel="noreferrer">Get directions</a></p>
            </div>
            <div className="form-card">
              <h2 style={{ fontSize: "var(--t-xl)", marginBottom: "1.2rem" }}>{c.formHeading}</h2>
              <SimpleForm kind="contact" endpoint="/api/enquiries" submitLabel="Send message" idPrefix="contact" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
