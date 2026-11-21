import Link from "next/link";
import type { ContentMap } from "@/lib/defaultContent";

export default function Footer({ site }: { site: ContentMap["site"] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.logoUrl} alt={`${site.shortName} logo`} />
            <p><strong>{site.schoolName}</strong> ({site.shortName})</p>
            <p className="muted">{site.descriptor}, {site.board}. Since {site.established}.</p>
          </div>

          <div>
            <h2>Visit</h2>
            <address style={{ fontStyle: "normal" }}>{site.address}</address>
            <p style={{ marginTop: ".6rem" }}><a className="text-link" href={site.mapUrl} target="_blank" rel="noreferrer">Open in Maps</a></p>
          </div>

          <div>
            <h2>Call or write</h2>
            <ul>
              {site.phones.map((p) => (
                <li key={p}><a href={`tel:${p.replace(/\s/g, "")}`}>{p}</a></li>
              ))}
              <li><a href={`mailto:${site.email}`}>{site.email}</a></li>
              {site.whatsappUrl && <li><a href={site.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a></li>}
              {site.facebookUrl && <li><a href={site.facebookUrl} target="_blank" rel="noreferrer">Facebook</a></li>}
            </ul>
          </div>

          <div>
            <h2>Quick links</h2>
            <ul>
              <li><Link href="/admission">Admission process</Link></li>
              <li><Link href="/register">Register a student</Link></li>
              <li><Link href="/gallery">Gallery</Link></li>
              <li><Link href="/careers">Career opportunities</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/login?as=admin">Admin login</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} {site.shortName}. All rights reserved.</span>
          <span lang="kn">{site.kannadaName}</span>
        </div>
      </div>
    </footer>
  );
}
