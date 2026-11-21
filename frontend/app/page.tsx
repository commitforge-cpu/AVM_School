/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Hero from "@/components/Hero";
import { getContent } from "@/lib/content";

export default async function HomePage() {
  const [home, site] = await Promise.all([getContent("home"), getContent("site")]);

  return (
    <>
      <Hero hero={home.hero} />

      <div className="panel">
        <section className="section" id="our-school" aria-labelledby="our-school-h">
          <div className="wrap split">
            <div>
              <h2 id="our-school-h">{home.ourSchool.heading}</h2>
              <dl className="facts">
                {home.ourSchool.facts.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="prose section-lede">
              {home.ourSchool.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="beanstalk-h">
          <div className="wrap beanstalk">
            {site.beanstalkLogoUrl && <img className="beanstalk-logo" src={site.beanstalkLogoUrl} alt="Beanstalk logo" />}
            <div className="prose">
              <h2 id="beanstalk-h" style={{ marginBottom: ".4rem" }}>{home.beanstalk.heading}</h2>
              <p className="tagline">{home.beanstalk.tagline}</p>
              <p className="section-lede">{home.beanstalk.body}</p>
              <p style={{ marginTop: "1.2rem" }}>
                <strong>{home.beanstalk.ages}.</strong>{" "}
                <Link className="text-link" href={home.beanstalk.linkHref}>{home.beanstalk.linkLabel}</Link>
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="facilities" aria-labelledby="facilities-h">
          <div className="wrap">
            <h2 id="facilities-h">{home.facilitiesHeading}</h2>
            <p className="section-lede" style={{ marginBottom: "2rem" }}>{home.facilitiesIntro}</p>
            <ul className="index-list">
              {home.facilities.map((f) => (
                <li key={f.name}>
                  <div><strong>{f.name}</strong><span>{f.description}</span></div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="panel-deep">
        <section className="section" aria-labelledby="events-h">
          <div className="wrap">
            <div className="cta-band" style={{ marginBottom: "1.6rem" }}>
              <h2 id="events-h" style={{ marginBottom: 0 }}>{home.eventsHeading}</h2>
              <Link className="text-link" href="/media">All events and press</Link>
            </div>
            <div className="strip">
              {home.events.map((e) => (
                <Link key={e.title} className="photo-card" href={e.href || "/media"}>
                  <img src={e.imageUrl} alt="" loading="lazy" />
                  <span className="caption">{e.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="awards" aria-labelledby="awards-h">
          <div className="wrap split-even">
            <div>
              <h2 id="awards-h">{home.awards.heading}</h2>
              <p className="section-lede">{home.awards.body}</p>
              <p style={{ marginTop: "1.2rem" }}><Link className="text-link" href={home.awards.linkHref}>{home.awards.linkLabel}</Link></p>
            </div>
            <div id="association">
              <h2>{home.associationsHeading}</h2>
              <div className="logo-row">
                {home.associations.map((a) => (
                  <figure key={a.name}>
                    <img src={a.logoUrl} alt="" loading="lazy" />
                    <figcaption>{a.name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="alumni-h">
          <div className="wrap cta-band">
            <div className="prose">
              <h2 id="alumni-h">{home.alumni.heading}</h2>
              <p className="section-lede">{home.alumni.body}</p>
            </div>
            <Link className="btn btn-ghost" href={home.alumni.linkHref}>{home.alumni.linkLabel}</Link>
          </div>
        </section>

        <section className="section" aria-labelledby="cta-h">
          <div className="wrap cta-band">
            <div className="prose">
              <h2 id="cta-h">{home.cta.heading}</h2>
              <p className="section-lede">{home.cta.body}</p>
            </div>
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <Link className="btn btn-primary" href="/register">{home.cta.primaryLabel}</Link>
              <Link className="btn btn-ghost" href="/admission">{home.cta.secondaryLabel}</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
