"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

type SiteBits = { schoolName: string; shortName: string; descriptor: string; logoUrl: string };

/** Same structure as avmschoolindia.com, plus Gallery, Login and Register. */
const NAV: { label: string; href: string; children?: { label: string; href: string }[] }[] = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/leadership", children: [{ label: "Leadership", href: "/leadership" }, { label: "Faculty", href: "/leadership#faculty" }] },
  {
    label: "School life", href: "/school-life",
    children: [
      { label: "Our approach", href: "/school-life#approach" },
      { label: "Learning partners", href: "/school-life#partners" },
      { label: "Activities", href: "/school-life#activities" },
      { label: "Student council", href: "/school-life#council" },
      { label: "Sports", href: "/school-life#sports" },
      { label: "Visual arts", href: "/school-life#arts" },
    ],
  },
  { label: "Alumni", href: "/alumni" },
  {
    label: "Admission", href: "/admission",
    children: [
      { label: "Process", href: "/admission#process" },
      { label: "Uniform", href: "/admission#uniform" },
      { label: "Attendance", href: "/admission#attendance" },
    ],
  },
  {
    label: "Media", href: "/media",
    children: [
      { label: "Events", href: "/media#events" },
      { label: "Read & reflect", href: "/media#read" },
      { label: "Press", href: "/media#press" },
      { label: "Gallery", href: "/gallery" },
    ],
  },
  { label: "Gallery", href: "/gallery" },
  {
    label: "Connect", href: "/contact",
    children: [
      { label: "Career", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

function AccountActions({ onNavigate }: { onNavigate?: () => void }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  if (loading) return <div className="nav-actions" aria-hidden="true" />;
  if (!user)
    return (
      <div className="nav-actions">
        <Link className="btn btn-ghost btn-sm" href="/login" onClick={onNavigate}>Log in</Link>
        <Link className="btn btn-primary btn-sm" href="/register" onClick={onNavigate}>Register</Link>
      </div>
    );
  return (
    <div className="nav-actions">
      <Link className="btn btn-quiet btn-sm" href={user.role === "Admin" ? "/admin" : "/dashboard"} onClick={onNavigate}>
        {user.role === "Admin" ? "Admin" : "My application"}
      </Link>
      <button className="btn btn-ghost btn-sm" onClick={() => { logout(); onNavigate?.(); router.push("/"); }}>Log out</button>
    </div>
  );
}

export default function Navbar({ site }: { site: SiteBits }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.split("#")[0]));

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link className="brand" href="/" aria-label={`${site.schoolName}, home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.logoUrl} alt="" />
          <span className="brand-text">
            <span className="brand-name">{site.shortName}</span>
            <span className="brand-sub">{site.schoolName}</span>
          </span>
        </Link>

        <nav aria-label="Main">
          <ul className="nav-links">
            {NAV.map((item) => (
              <li key={item.label}>
                <Link className="nav-link" href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>
                  {item.label}
                </Link>
                {item.children && (
                  <ul className="nav-menu">
                    {item.children.map((c) => (
                      <li key={c.href + c.label}><Link href={c.href}>{c.label}</Link></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <AccountActions />

        <button
          className="btn btn-quiet btn-sm nav-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <div id="mobile-menu" className="mobile-menu" data-open={open}>
        <ul>
          {NAV.map((item) => (
            <li key={item.label}>
              <Link href={item.href}>{item.label}</Link>
              {item.children && (
                <ul className="sub">
                  {item.children.map((c) => <li key={c.href + c.label}><Link href={c.href}>{c.label}</Link></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <AccountActions onNavigate={() => setOpen(false)} />
      </div>
    </header>
  );
}
