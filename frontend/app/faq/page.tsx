import type { Metadata } from "next";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqPage() {
  const c = await getContent("faq");
  return (
    <>
      <PageHead title={c.title} intro={c.intro} />
      <div className="panel">
        <section className="section">
          <div className="wrap split">
            <div>
              <p className="section-lede">Still have a question?</p>
              <p style={{ marginTop: "1rem" }}><Link className="btn btn-ghost" href="/contact">Contact the school</Link></p>
            </div>
            <div className="faq">
              {c.items.map((i) => (
                <details key={i.q}>
                  <summary>{i.q}</summary>
                  <p>{i.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
